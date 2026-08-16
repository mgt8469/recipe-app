// レシピ集 — オフライン対応 Service Worker
// レシピを更新したら、下の CACHE の数字を1つ上げてください（v1 → v2 → v3 ...）
// そうしないとスマホ側に古いページが残り続けます。
const CACHE = 'recipes-v4';

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
      // 新しいSWが動き出したら、開いているページを1回だけリロードさせる。
      // これがないと「古いHTMLのまま1回分ズレる」状態が残ります。
      .then(function () {
        return self.clients.matchAll({ type: 'window' }).then(function (list) {
          list.forEach(function (c) { c.postMessage('reload'); });
        });
      })
  );
});

// ページ本体（HTML）は network-first。
// オンラインなら必ず最新を表示し、取れなかったときだけキャッシュを使う。
// ※ 以前は全部 stale-while-revalidate だったため、更新が1回分遅れて反映されていました。
function networkFirst(req) {
  return fetch(req).then(function (res) {
    if (res && res.status === 200) {
      const copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(req, copy); });
    }
    return res;
  }).catch(function () {
    return caches.match(req).then(function (hit) {
      return hit || caches.match('./index.html');
    });
  });
}

// アイコンなどの静的ファイルは stale-while-revalidate のままでよい。
// （中身が変わらないので、即座に返せるほうが速い）
function staleWhileRevalidate(req) {
  return caches.match(req).then(function (cached) {
    const network = fetch(req).then(function (res) {
      if (res && res.status === 200) {
        const copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () { return cached; });

    return cached || network;
  });
}

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  const isPage =
    e.request.mode === 'navigate' ||
    e.request.destination === 'document' ||
    url.pathname === '/recipe-app/' ||
    url.pathname.endsWith('/index.html');

  e.respondWith(isPage ? networkFirst(e.request) : staleWhileRevalidate(e.request));
});
