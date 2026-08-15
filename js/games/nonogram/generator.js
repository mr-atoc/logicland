// Сборка нонограммы: берём картинку, считаем подсказки и проверяем,
// что её можно решить логикой — без единой догадки.
import { shuffle } from '../../core/dom.js';
import { cluesFor, logicSolve } from './solver.js';
import { PICTURES, pictureGrid } from './pictures.js';

export function cluesOf(grid) {
  const cols = grid[0].length;
  const rowClues = grid.map((row) => cluesFor(row));
  const colClues = [];
  for (let c = 0; c < cols; c++) colClues.push(cluesFor(grid.map((row) => row[c])));
  return { rowClues, colClues };
}

// Головоломка «честная», если решатель дошёл до конца без угадывания.
export function isLogical(grid) {
  const { rowClues, colClues } = cluesOf(grid);
  return logicSolve(rowClues, colClues).solved;
}

// Случайная картинка: симметричная относительно вертикали — выглядит
// как узор или зверёк, а не как случайный шум.
function randomPicture(size, density) {
  const grid = Array.from({ length: size }, () => new Array(size).fill(0));
  const half = Math.ceil(size / 2);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < half; c++) {
      const value = Math.random() < density ? 1 : 0;
      grid[r][c] = value;
      grid[r][size - 1 - c] = value;
    }
  }
  return grid;
}

export function genNonogram(size, { usePictures = true, excludeName = null } = {}) {
  if (usePictures) {
    const library = shuffle(PICTURES[size] ?? []);
    const preferred = library.filter((p) => p.name !== excludeName);
    for (const picture of (preferred.length ? preferred : library)) {
      const grid = pictureGrid(picture);
      if (isLogical(grid)) return { grid, ...cluesOf(grid), name: picture.name, size };
    }
  }

  for (let attempt = 0; attempt < 400; attempt++) {
    const density = 0.4 + Math.random() * 0.25;
    const grid = randomPicture(size, density);
    const filled = grid.flat().reduce((a, b) => a + b, 0);
    if (filled < size * size * 0.2 || filled > size * size * 0.8) continue;
    if (isLogical(grid)) return { grid, ...cluesOf(grid), name: null, size };
  }

  // Совсем крайний случай: «лесенка» — она всегда решается однозначно.
  const grid = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => (c <= r ? 1 : 0)));
  return { grid, ...cluesOf(grid), name: null, size };
}
