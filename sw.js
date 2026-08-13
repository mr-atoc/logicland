// Service worker: офлайн-режим. Все файлы сайта кэшируются при установке,
// дальше работает стратегия «кэш сразу, обновление в фоне» (stale-while-revalidate):
// офлайн всё открывается из кэша, а при наличии сети кэш тихо обновляется.
// ВАЖНО: при добавлении новой игры добавь её файлы в ASSETS.
const CACHE = 'logoland-v5';

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
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()),
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
    const network = fetch(request)
      .then((response) => {
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
      .catch(() => cached ?? Response.error());
    return cached ?? network;
  })());
});
