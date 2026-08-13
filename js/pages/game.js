import { getGame } from '../games.manifest.js';
import { getCurrentProfile } from '../core/profiles.js';
import { loadProgress, saveProgress } from '../core/progress.js';
import { registerServiceWorker } from '../core/pwa.js';
import { initHeaderControls } from '../core/header.js';

registerServiceWorker();
initHeaderControls();

const id = new URLSearchParams(location.search).get('id');
const meta = getGame(id);
const profile = getCurrentProfile();

if (!meta || !profile) {
  location.replace('index.html');
} else {
  document.title = `${meta.title} — Логоленд`;
  document.getElementById('gameTitle').textContent = `${meta.icon} ${meta.title}`;
  document.getElementById('profileChip').textContent = `${profile.emoji} ${profile.name}`;

  // API, которое хост передаёт игре. Игра не знает, где хранится прогресс.
  const api = {
    profile: { name: profile.name, emoji: profile.emoji },

    // Внутреннее состояние игры (уровни, рекорды по уровням и т.п.)
    loadState() {
      return loadProgress(profile.id, meta.id)?.state ?? null;
    },
    saveState(state) {
      const current = loadProgress(profile.id, meta.id) ?? {};
      saveProgress(profile.id, meta.id, { ...current, state });
    },

    // Итог для карточки на главной: score сравнивается, summary показывается.
    reportResult({ score = 0, summary } = {}) {
      const current = loadProgress(profile.id, meta.id) ?? {};
      const best = current.best ?? { score: 0 };
      saveProgress(profile.id, meta.id, {
        ...current,
        best: {
          score: Math.max(best.score ?? 0, score),
          summary: summary ?? best.summary,
        },
      });
    },

    exit() {
      location.href = 'index.html';
    },
  };

  const module = await meta.module();
  module.default.mount(document.getElementById('gameRoot'), api);
}
