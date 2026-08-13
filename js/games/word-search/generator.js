// Генератор поля «Найди слова». Чистая логика без DOM.
import { shuffle, pick, randInt } from '../../core/dom.js';

export const CATEGORIES = {
  'Животные': ['КОТ', 'ЛИСА', 'ВОЛК', 'ЗАЯЦ', 'СОВА', 'ТИГР', 'СЛОН', 'БЕЛКА', 'ЗЕБРА', 'ПАНДА', 'ЖИРАФ', 'ЕНОТ', 'МЕДВЕДЬ', 'БЕГЕМОТ', 'КРОКОДИЛ'],
  'Фрукты и ягоды': ['СЛИВА', 'ГРУША', 'БАНАН', 'ЛИМОН', 'АРБУЗ', 'ДЫНЯ', 'ВИШНЯ', 'ЯБЛОКО', 'ПЕРСИК', 'АНАНАС', 'МАЛИНА', 'ВИНОГРАД', 'КЛУБНИКА'],
  'Школа': ['УРОК', 'МЕЛ', 'ПАРТА', 'РУЧКА', 'КНИГА', 'ДОСКА', 'ПЕНАЛ', 'АТЛАС', 'ГЛОБУС', 'ТЕТРАДЬ', 'УЧЕБНИК', 'ЛИНЕЙКА', 'КАРАНДАШ', 'ПОРТФЕЛЬ'],
  'Космос': ['ЛУНА', 'МАРС', 'ЗВЕЗДА', 'РАКЕТА', 'КОМЕТА', 'СОЛНЦЕ', 'ОРБИТА', 'ВЕНЕРА', 'ЮПИТЕР', 'САТУРН', 'МЕТЕОР', 'ПЛАНЕТА', 'СПУТНИК'],
};

const FILLER = 'АВЕИКНОРСТЛУМ';

function findSpot(grid, size, word) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const horizontal = Math.random() < 0.5;
    const dr = horizontal ? 0 : 1;
    const dc = horizontal ? 1 : 0;
    const r = randInt(0, size - 1 - dr * (word.length - 1));
    const c = randInt(0, size - 1 - dc * (word.length - 1));
    let ok = true;
    for (let i = 0; i < word.length; i++) {
      const cell = grid[r + dr * i][c + dc * i];
      if (cell && cell !== word[i]) {
        ok = false;
        break;
      }
    }
    if (ok) return { r, c, dr, dc };
  }
  return null;
}

// Слова размещаются по строкам и столбцам (слева направо и сверху вниз),
// пересечения по совпадающим буквам разрешены, остальное — случайные буквы.
export function generateBoard(size, wordCount) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const category = pick(Object.keys(CATEGORIES));
    const pool = shuffle(CATEGORIES[category].filter((w) => w.length <= size && w.length >= 3));
    if (pool.length < wordCount) continue;

    const grid = Array.from({ length: size }, () => Array(size).fill(''));
    const placements = {};
    const placed = [];
    for (const word of pool) {
      if (placed.length >= wordCount) break;
      const spot = findSpot(grid, size, word);
      if (!spot) continue;
      for (let i = 0; i < word.length; i++) {
        grid[spot.r + spot.dr * i][spot.c + spot.dc * i] = word[i];
      }
      placements[word] = spot;
      placed.push(word);
    }
    if (placed.length < wordCount) continue;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!grid[r][c]) grid[r][c] = FILLER[randInt(0, FILLER.length - 1)];
      }
    }
    return { grid, words: placed, placements, category };
  }
  throw new Error('Не удалось сгенерировать поле');
}
