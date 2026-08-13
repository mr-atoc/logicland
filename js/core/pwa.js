// Регистрация service worker (офлайн-режим) и обновление до новой версии сайта.
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  // Первый захват страницы service worker'ом — это не обновление, а установка.
  // А вот последующая смена SW означает, что вышла новая версия сайта.
  let controlled = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!controlled) {
      controlled = true;
      return;
    }
    if (reloading) return;
    reloading = true;
    // На странице игры не прерываем раунд — предлагаем обновиться кнопкой.
    if (location.pathname.endsWith('game.html')) showUpdateBanner();
    else location.reload();
  });

  navigator.serviceWorker.register('sw.js').then((registration) => {
    const check = () => registration.update().catch(() => {});
    check();
    // проверяем обновления при возврате на вкладку
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) check();
    });
  }).catch(() => {
    // Без SW сайт просто работает онлайн — не критично.
  });
}

function showUpdateBanner() {
  if (document.querySelector('.update-banner')) return;
  const banner = document.createElement('div');
  banner.className = 'update-banner';
  banner.innerHTML = '<span>✨ Вышла новая версия!</span>';
  const button = document.createElement('button');
  button.className = 'btn btn-primary';
  button.textContent = 'Обновить';
  button.addEventListener('click', () => location.reload());
  banner.append(button);
  document.body.append(banner);
}

// Принудительное обновление: чистим кэш игр и перезагружаемся с сети.
// Прогресс игроков лежит в localStorage и не затрагивается.
export async function hardRefresh() {
  try {
    const registrations = await navigator.serviceWorker?.getRegistrations?.() ?? [];
    await Promise.all(registrations.map((r) => r.unregister()));
  } catch { /* нечего снимать */ }
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  } catch { /* нечего чистить */ }
  // Параметр времени обходит и браузерный HTTP-кэш тоже
  const url = new URL(location.href);
  url.searchParams.set('fresh', Date.now());
  location.replace(url);
}
