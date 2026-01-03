/* sw.js
 * APP: Smart Price
 * VERSION: v19.9c-hf12 (pwa)
 * DATE(JST): 2026-01-03 10:04 JST
 * TITLE: PWAオフライン対応（コア資産キャッシュ＋?b対応）
 */

const SW_VERSION = "2026-01-03_1004_pwa_hf12";
const CACHE_NAME = `smart-price-book-cache-${SW_VERSION}`;

// ※ 同一オリジン（GitHub Pagesのこのリポジトリ内）だけを事前キャッシュ
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./README.md",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k)))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // GET以外は触らない（安全優先）
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 外部（CDNやFirebaseなど）は触らない（壊しやすいので素通し）
  if (url.origin !== self.location.origin) return;

  // ナビゲーション（画面遷移）は「ネット優先→ダメならキャッシュ」
  const isNavigate = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
  if (isNavigate) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        // ?b=... が付いても効くように、実体のindex.htmlを更新しておく
        cache.put("./index.html", fresh.clone());
        return fresh;
      } catch (e) {
        // ?b=... を無視して拾えるように ignoreSearch を使う
        const cached = await caches.match(req, { ignoreSearch: true });
        return cached || caches.match("./index.html") || new Response("OFFLINE", { status: 503 });
      }
    })());
    return;
  }

  // それ以外（同一オリジンの静的ファイル）は「キャッシュ優先→無ければネット」
  event.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: true });
    if (cached) return cached;

    const fresh = await fetch(req);
    const cache = await caches.open(CACHE_NAME);
    cache.put(req, fresh.clone());
    return fresh;
  })());
});
