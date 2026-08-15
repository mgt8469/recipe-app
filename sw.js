// レシピ集 — オフライン対応 Service Worker
// レシピを更新したら、下の CACHE の数字を1つ上げてください（v1 → v2 → v3 ...）
// そうしないとスマホ側に古いページが残り続けます。
const CACHE = 'recipes-v2';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './favicon-32.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys.filter(function (k) { return k !== CACHE; })
              .map(function (k) { return caches.delete(k); })
        );
      })
      .then(function () { return self.clients.claim(); })
  );
});

// stale-while-revalidate:
// キャッシュを即座に返しつつ、裏で最新を取りに行って次回に備える。
// → オフラインでも開けて、オンラインなら次に開いたとき最新になる。
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== location.origin) return;

  e.respondWith(
    caches.match(e.request).then(function (cached) {
      const network = fetch(e.request).then(function (res) {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () { return cached; });

      return cached || network;
    })
  );
});
