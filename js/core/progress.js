import { storage } from './storage.js';

// Прогресс хранится отдельно для каждой пары «профиль + игра»:
// { state: <внутреннее состояние игры>, best: { score, summary }, updatedAt }
const key = (profileId, gameId) => `progress.${profileId}.${gameId}`;

export function loadProgress(profileId, gameId) {
  return storage.read(key(profileId, gameId), null);
}

export function saveProgress(profileId, gameId, data) {
  storage.write(key(profileId, gameId), { ...data, updatedAt: Date.now() });
}
