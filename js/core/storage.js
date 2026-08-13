// Единая точка доступа к хранилищу. Сейчас — localStorage,
// при переходе на сервер достаточно заменить реализацию здесь.
const NS = 'logoland.';

export const storage = {
  read(key, fallback = null) {
    try {
      const raw = localStorage.getItem(NS + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  write(key, value) {
    localStorage.setItem(NS + key, JSON.stringify(value));
  },
  remove(key) {
    localStorage.removeItem(NS + key);
  },
};
