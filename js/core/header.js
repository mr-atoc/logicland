// Кнопки в шапке: тема, звук и обновление версии (общие для всех страниц).
import { sound } from './sound.js';
import { toggleTheme, effectiveTheme } from './theme.js';
import { hardRefresh } from './pwa.js';

export function initHeaderControls() {
  const themeBtn = document.getElementById('themeBtn');
  const soundBtn = document.getElementById('soundBtn');
  const refreshBtn = document.getElementById('refreshBtn');

  refreshBtn?.addEventListener('click', () => {
    refreshBtn.classList.add('spinning');
    refreshBtn.disabled = true;
    sound.tap();
    hardRefresh();
  });

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
