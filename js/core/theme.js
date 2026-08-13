// Тёмная/светлая тема. Начальная тема применяется инлайн-скриптом в <head>
// (чтобы не мигало при загрузке), здесь — переключение и сохранение выбора.
import { storage } from './storage.js';

export function effectiveTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function toggleTheme() {
  const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  storage.write('theme', next);
  return next;
}
