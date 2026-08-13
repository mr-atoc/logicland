// Регистрация service worker — включает офлайн-режим.
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {
      // Без SW сайт просто работает онлайн — не критично.
    });
  }
}
