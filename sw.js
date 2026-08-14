// Service worker: офлайн-режим. Все файлы сайта кэшируются при установке,
// дальше работает стратегия «кэш сразу, обновление в фоне» (stale-while-revalidate):
// офлайн всё открывается из кэша, а при наличии сети кэш тихо обновляется.
// ВАЖНО: при добавлении новой игры добавь её файлы в ASSETS.
const CACHE = 'logoland-v16';

const ASSETS = [
  './',
  'index.html',
  'game.html',
  'css/style.css',
  'manifest.webmanifest',
  'icons/icon.svg',
  'js/core/dom.js',
  'js/core/storage.js',
  'js/core/profiles.js',
  'js/core/progress.js',
  'js/core/pwa.js',
  'js/core/theme.js',
  'js/core/sound.js',
  'js/core/fx.js',
  'js/core/header.js',
  'js/pages/index.js',
  'js/pages/game.js',
  'js/games.manifest.js',
  'js/games/math-express/game.js',
  'js/games/pattern-quest/game.js',
  'js/games/sudoku/game.js',
  'js/games/sudoku/generator.js',
  'js/games/word-search/game.js',
  'js/games/word-search/generator.js',
  'js/games/shape-matrix/game.js',
  'js/games/shape-matrix/generator.js',
  'js/games/shape-matrix/shapes.js',
  'js/games/brain-teasers/game.js',
  'js/games/brain-teasers/generator.js',
  'js/games/place-signs/game.js',
  'js/games/place-signs/generator.js',
  'js/games/maze/game.js',
  'js/games/maze/generator.js',
  'js/games/pyramid/game.js',
  'js/games/pyramid/generator.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // cache: 'reload' — берём файлы строго из сети, минуя браузерный HTTP-кэш.
      // Без этого хостинг отдаёт свои 10-минутные копии, и в новый кэш попадает старая версия.
      .then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // ignoreSearch: game.html?id=... должен находиться как game.html
    const cached = await cache.match(request, { ignoreSearch: true });
    // no-cache: фоновое обновление всегда сверяется с сервером, а не с HTTP-кэшем
    const network = fetch(new Request(request.url, { cache: 'no-cache' }))
      .then((response) => {
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
      .catch(() => cached ?? Response.error());
    return cached ?? network;
  })());
});
