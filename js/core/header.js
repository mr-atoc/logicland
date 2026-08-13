// Кнопки в шапке: переключение темы и звука (общие для всех страниц).
import { sound } from './sound.js';
import { toggleTheme, effectiveTheme } from './theme.js';

export function initHeaderControls() {
  const themeBtn = document.getElementById('themeBtn');
  const soundBtn = document.getElementById('soundBtn');
  if (!themeBtn || !soundBtn) return;

  const syncIcons = () => {
    themeBtn.textContent = effectiveTheme() === 'dark' ? '☀️' : '🌙';
    soundBtn.textContent = sound.muted ? '🔇' : '🔊';
  };

  themeBtn.addEventListener('click', () => {
    toggleTheme();
    sound.tap();
    syncIcons();
  });
  soundBtn.addEventListener('click', () => {
    sound.toggle();
    if (!sound.muted) sound.tap();
    syncIcons();
  });
  syncIcons();
}
