
/**
 * APP: Smart Price
 * FILE: sw.js
 * VERSION: v19.9c-hf12-pwa2-imgfix4
 * DATE(JST): 2026-01-03 17:38 JST
 * AUTHOR: Yui
 * TITLE: 先祖帰り抑止（HTMLはネット優先）＋古いキャッシュ自動破棄
 */

const BUILD_ID = "2026-01-03_1738_hf12";
const CACHE_PREFIX = "smartprice-cache-";
const CACHE_NAME = `${CACHE_PREFIX}${BUILD_ID}`;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    await caches.open(CACHE_NAME);
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => {
      if (k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME) return caches.delete(k);
    }));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // 画面（HTML）はネット優先：ここで先祖帰りを断つ
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(new Request(req.url, { cache: "reload" }));
        return fresh;
      } catch (e) {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(req);
        return cached || Response.error();
      }
    })());
    return;
  }

  // それ以外は素通し（安定優先）
});
