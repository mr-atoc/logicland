import { storage } from './storage.js';

export function getProfiles() {
  return storage.read('profiles', []);
}

export function addProfile(name, emoji) {
  const profile = {
    id: crypto.randomUUID(),
    name: name.trim(),
    emoji,
    createdAt: Date.now(),
  };
  storage.write('profiles', [...getProfiles(), profile]);
  setCurrentProfile(profile.id);
  return profile;
}

export function getCurrentProfile() {
  const id = storage.read('currentProfile');
  return getProfiles().find((p) => p.id === id) ?? null;
}

export function setCurrentProfile(id) {
  storage.write('currentProfile', id);
}
