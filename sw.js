/* 
 * APP: Smart Price
 * FILE: sw.js
 * VERSION: v19.9c-hf12-pwa1
 * DATE(JST): 2026-01-03 10:14 JST
 * TITLE: オフライン用キャッシュ（最小・安全寄り）
 */

const CACHE_NAME = "smart-price-book-cache-v19.9c-hf12-pwa1";
const RUNTIME_CACHE = "smart-price-book-runtime-v19.9c-hf12-pwa1";

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Firebase系など、更新が絡む通信はキャッシュしない（事故防止）
  if (/firebase|googleapis|gstatic|firestore|identitytoolkit/i.test(url.hostname + url.pathname)) {
    return; // そのままブラウザ標準に任せる
  }

  // 画面遷移（HTML）は「ネット優先 → だめならキャッシュ」
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE_NAME);
          cache.put("./index.html", fresh.clone());
          return fresh;
        } catch (e) {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match("./index.html")) || (await cache.match("./")) || Response.error();
        }
      })()
    );
    return;
  }

  // それ以外（画像・CSS・JS等）は「キャッシュ優先 → 裏で更新」
  event.respondWith(
    (async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      const cached = await cache.match(req);
      if (cached) {
        // 裏で更新
        event.waitUntil(
          fetch(req)
            .then((res) => {
              if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
            })
            .catch(() => {})
        );
        return cached;
      }

      try {
        const res = await fetch(req);
        if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
        return res;
      } catch (e) {
        return cached || Response.error();
      }
    })()
  );
});
