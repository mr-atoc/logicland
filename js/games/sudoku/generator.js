// Генератор судоку. Чистая логика без DOM — можно тестировать в Node.
import { shuffle } from '../../core/dom.js';

// Размеры блоков для каждого размера поля: 6×6 — блоки 2 строки × 3 столбца.
export const SIZES = {
  4: { boxW: 2, boxH: 2 },
  6: { boxW: 3, boxH: 2 },
  9: { boxW: 3, boxH: 3 },
};

// Сколько клеток убирать из готового решения (чем больше — тем сложнее).
const REMOVE_TARGET = { 4: 8, 6: 16, 9: 40 };

function makeCanPlace(grid, size) {
  const { boxW, boxH } = SIZES[size];
  return (r, c, v) => {
    for (let i = 0; i < size; i++) {
      if (grid[r][i] === v || grid[i][c] === v) return false;
    }
    const br = Math.floor(r / boxH) * boxH;
    const bc = Math.floor(c / boxW) * boxW;
    for (let i = 0; i < boxH; i++) {
      for (let j = 0; j < boxW; j++) {
        if (grid[br + i][bc + j] === v) return false;
      }
    }
    return true;
  };
}

// Полностью заполненное валидное поле (случайное).
export function generateSolved(size) {
  const grid = Array.from({ length: size }, () => Array(size).fill(0));
  const canPlace = makeCanPlace(grid, size);
  const nums = Array.from({ length: size }, (_, i) => i + 1);

  function fill(pos) {
    if (pos === size * size) return true;
    const r = Math.floor(pos / size);
    const c = pos % size;
    for (const v of shuffle(nums)) {
      if (canPlace(r, c, v)) {
        grid[r][c] = v;
        if (fill(pos + 1)) return true;
        grid[r][c] = 0;
      }
    }
    return false;
  }

  fill(0);
  return grid;
}

// Считает решения головоломки (с ранним выходом на limit) —
// нужно, чтобы гарантировать единственность решения.
export function countSolutions(puzzle, size, limit = 2) {
  const grid = puzzle.map((row) => [...row]);
  const canPlace = makeCanPlace(grid, size);
  let count = 0;

  function walk(pos) {
    while (pos < size * size && grid[Math.floor(pos / size)][pos % size] !== 0) pos++;
    if (pos === size * size) {
      count++;
      return;
    }
    const r = Math.floor(pos / size);
    const c = pos % size;
    for (let v = 1; v <= size; v++) {
      if (canPlace(r, c, v)) {
        grid[r][c] = v;
        walk(pos + 1);
        grid[r][c] = 0;
        if (count >= limit) return;
      }
    }
  }

  walk(0);
  return count;
}

// Головоломка: убираем клетки из решения, пока решение остаётся единственным.
export function generatePuzzle(size) {
  const solution = generateSolved(size);
  const puzzle = solution.map((row) => [...row]);
  let removed = 0;
  for (const pos of shuffle(Array.from({ length: size * size }, (_, i) => i))) {
    if (removed >= REMOVE_TARGET[size]) break;
    const r = Math.floor(pos / size);
    const c = pos % size;
    const saved = puzzle[r][c];
    puzzle[r][c] = 0;
    if (countSolutions(puzzle, size) === 1) removed++;
    else puzzle[r][c] = saved;
  }
  return { puzzle, solution };
}

// Клетки, нарушающие правила (дубли в строке/столбце/блоке), как Set "r,c".
export function findConflicts(grid, size) {
  const { boxW, boxH } = SIZES[size];
  const bad = new Set();
  const groups = [];
  for (let r = 0; r < size; r++) groups.push(Array.from({ length: size }, (_, c) => [r, c]));
  for (let c = 0; c < size; c++) groups.push(Array.from({ length: size }, (_, r) => [r, c]));
  for (let br = 0; br < size; br += boxH) {
    for (let bc = 0; bc < size; bc += boxW) {
      const g = [];
      for (let i = 0; i < boxH; i++) for (let j = 0; j < boxW; j++) g.push([br + i, bc + j]);
      groups.push(g);
    }
  }
  for (const group of groups) {
    const seen = new Map();
    for (const [r, c] of group) {
      const v = grid[r][c];
      if (!v) continue;
      const key = `${r},${c}`;
      if (seen.has(v)) {
        bad.add(key);
        bad.add(seen.get(v));
      } else {
        seen.set(v, key);
      }
    }
  }
  return bad;
}
