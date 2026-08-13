import { games } from '../games.manifest.js';
import { getProfiles, addProfile, getCurrentProfile, setCurrentProfile } from '../core/profiles.js';
import { loadProgress } from '../core/progress.js';
import { el } from '../core/dom.js';
import { registerServiceWorker } from '../core/pwa.js';
import { initHeaderControls } from '../core/header.js';

registerServiceWorker();
initHeaderControls();

const AVATARS = ['🦊', '🐼', '🐸', '🦄', '🚀', '🐯', '🐙', '🦖'];

const dialog = document.getElementById('profileDialog');
const profileBtn = document.getElementById('profileBtn');

function renderCards() {
  const profile = getCurrentProfile();
  const grid = document.getElementById('gameList');
  grid.replaceChildren(
    ...games.map((game, i) => {
      const best = profile ? loadProgress(profile.id, game.id)?.best : null;
      return el('a', { class: 'game-card', href: `game.html?id=${game.id}`, style: `--i:${i}` },
        el('div', { class: 'game-icon' }, game.icon),
        el('div', { class: 'game-info' },
          el('h3', {}, game.title),
          el('p', {}, game.description),
          el('div', { class: 'game-meta' },
            el('span', { class: 'tag' }, game.tags.join(' · ')),
            el('span', { class: best ? 'best' : 'best best-empty' },
              best?.summary ?? 'Ещё не играли'),
          ),
        ),
      );
    }),
  );
}

function renderProfileChip() {
  const profile = getCurrentProfile();
  profileBtn.textContent = profile ? `${profile.emoji} ${profile.name}` : '👤 Кто играет?';
}

function renderDialog() {
  const current = getCurrentProfile();
  const list = document.getElementById('profileList');
  list.replaceChildren(
    ...getProfiles().map((p) =>
      el('button', {
        type: 'button',
        class: `profile-item${p.id === current?.id ? ' current' : ''}`,
        onclick: () => {
          setCurrentProfile(p.id);
          dialog.close();
          refresh();
        },
      }, `${p.emoji} ${p.name}`),
    ),
  );

  const avatarRow = document.getElementById('avatarRow');
  avatarRow.replaceChildren(
    ...AVATARS.map((emoji, i) =>
      el('label', { class: 'avatar-option' },
        el('input', { type: 'radio', name: 'avatar', value: emoji, ...(i === 0 ? { checked: '' } : {}) }),
        el('span', {}, emoji),
      ),
    ),
  );
}

function refresh() {
  renderProfileChip();
  renderCards();
}

document.getElementById('newProfileForm').addEventListener('submit', () => {
  const name = document.getElementById('profileName').value.trim();
  const emoji = document.querySelector('input[name="avatar"]:checked')?.value ?? AVATARS[0];
  if (!name) return;
  addProfile(name, emoji);
  document.getElementById('profileName').value = '';
  refresh();
});

profileBtn.addEventListener('click', () => {
  renderDialog();
  dialog.showModal();
});

// Пока нет ни одного профиля — нельзя закрыть диалог клавишей Esc.
dialog.addEventListener('cancel', (event) => {
  if (!getCurrentProfile()) event.preventDefault();
});

refresh();
if (!getCurrentProfile()) {
  renderDialog();
  dialog.showModal();
}
