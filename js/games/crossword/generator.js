// Генератор кроссворда. Чистая логика без DOM.
// Слова кладутся по одному, каждое обязательно пересекает уже лежащее
// по совпадающей букве («криcс-кросс», как в детских журналах).
import { shuffle, randInt } from '../../core/dom.js';
import { WORDS } from './words.js';

const DIRS = { across: [0, 1], down: [1, 0] };
const key = (r, c) => `${r},${c}`;

// Можно ли положить слово так, чтобы не появилось «слипшихся» лишних слов.
// Возвращает число пересечений или -1, если нельзя.
function crossingsFor(cells, word, r, c, dir) {
  const [dr, dc] = DIRS[dir];
  const [pr, pc] = dir === 'across' ? [1, 0] : [0, 1]; // поперёк слова

  // перед первой и после последней буквы должно быть пусто
  if (cells.has(key(r - dr, c - dc))) return -1;
  if (cells.has(key(r + dr * word.length, c + dc * word.length))) return -1;

  let crossings = 0;
  for (let i = 0; i < word.length; i++) {
    const rr = r + dr * i;
    const cc = c + dc * i;
    const cell = cells.get(key(rr, cc));
    if (cell) {
      if (cell.letter !== word[i]) return -1;
      if (cell.dirs.has(dir)) return -1; // в этом направлении клетка уже занята словом
      crossings += 1;
    } else if (cells.has(key(rr + pr, cc + pc)) || cells.has(key(rr - pr, cc - pc))) {
      return -1; // слово прилипло бы боком к другому
    }
  }
  return crossings;
}

function place(state, entry) {
  const [dr, dc] = DIRS[entry.dir];
  for (let i = 0; i < entry.word.length; i++) {
    const k = key(entry.r + dr * i, entry.c + dc * i);
    const cell = state.cells.get(k) ?? { letter: entry.word[i], dirs: new Set() };
    cell.dirs.add(entry.dir);
    state.cells.set(k, cell);
  }
  state.placed.push(entry);
  state.used.add(entry.word);
}

function bboxWith(state, entry) {
  const [dr, dc] = DIRS[entry.dir];
  const endR = entry.r + dr * (entry.word.length - 1);
  const endC = entry.c + dc * (entry.word.length - 1);
  return {
    minR: Math.min(state.minR, entry.r), maxR: Math.max(state.maxR, endR),
    minC: Math.min(state.minC, entry.c), maxC: Math.max(state.maxC, endC),
  };
}

// Все допустимые места для слова: оно должно пересечь уже лежащие буквы.
function placementsFor(state, item, maxSize) {
  const found = [];
  for (let i = 0; i < item.w.length; i++) {
    for (const [k, cell] of state.cells) {
      if (cell.letter !== item.w[i]) continue;
      const [cr, cc] = k.split(',').map(Number);
      for (const dir of ['across', 'down']) {
        if (cell.dirs.has(dir)) continue;
        const [dr, dc] = DIRS[dir];
        const r = cr - dr * i;
        const c = cc - dc * i;
        const crossings = crossingsFor(state.cells, item.w, r, c, dir);
        if (crossings < 1) continue;
        const entry = { word: item.w, clue: item.c, r, c, dir };
        const box = bboxWith(state, entry);
        if (box.maxR - box.minR + 1 > maxSize || box.maxC - box.minC + 1 > maxSize) continue;
        const growth = (box.maxR - box.minR) + (box.maxC - box.minC)
          - (state.maxR - state.minR) - (state.maxC - state.minC);
        found.push({ entry, score: crossings * 4 - growth + Math.random() });
      }
    }
  }
  return found;
}

function buildOnce(pool, wordCount, maxSize) {
  const first = pool.find((item) => item.w.length >= 5 && item.w.length <= maxSize) ?? pool[0];
  const state = {
    cells: new Map(), placed: [], used: new Set(),
    minR: 0, maxR: 0, minC: 0, maxC: 0,
  };
  place(state, { word: first.w, clue: first.c, r: 0, c: 0, dir: 'across' });
  state.maxC = first.w.length - 1;

  for (let pass = 0; pass < 3 && state.placed.length < wordCount; pass++) {
    for (const item of pool) {
      if (state.placed.length >= wordCount) break;
      if (state.used.has(item.w)) continue;
      const options = placementsFor(state, item, maxSize);
      if (!options.length) continue;
      options.sort((a, b) => b.score - a.score);
      const chosen = options[randInt(0, Math.min(2, options.length - 1))].entry;
      const box = bboxWith(state, chosen);
      place(state, chosen);
      Object.assign(state, box);
    }
  }
  return state;
}

// Нумерация клеток и список вопросов строятся по готовой сетке —
// так они гарантированно совпадают с тем, что видит игрок.
function describe(state) {
  const rows = state.maxR - state.minR + 1;
  const cols = state.maxC - state.minC + 1;
  const grid = Array.from({ length: rows }, () => Array(cols).fill(null));
  for (const [k, cell] of state.cells) {
    const [r, c] = k.split(',').map(Number);
    grid[r - state.minR][c - state.minC] = cell.letter;
  }

  const clueOf = new Map(state.placed.map((e) => [e.word, e.clue]));
  const numbers = Array.from({ length: rows }, () => Array(cols).fill(null));
  const across = [];
  const down = [];
  let number = 0;

  const runFrom = (r, c, dr, dc) => {
    let word = '';
    let rr = r;
    let cc = c;
    while (rr < rows && cc < cols && grid[rr][cc]) {
      word += grid[rr][cc];
      rr += dr;
      cc += dc;
    }
    return word;
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!grid[r][c]) continue;
      const startsAcross = (c === 0 || !grid[r][c - 1]) && c + 1 < cols && grid[r][c + 1];
      const startsDown = (r === 0 || !grid[r - 1][c]) && r + 1 < rows && grid[r + 1][c];
      if (!startsAcross && !startsDown) continue;
      number += 1;
      numbers[r][c] = number;
      if (startsAcross) {
        const word = runFrom(r, c, 0, 1);
        across.push({ number, row: r, col: c, dir: 'across', word, clue: clueOf.get(word) ?? '' });
      }
      if (startsDown) {
        const word = runFrom(r, c, 1, 0);
        down.push({ number, row: r, col: c, dir: 'down', word, clue: clueOf.get(word) ?? '' });
      }
    }
  }

  return { rows, cols, grid, numbers, across, down, entries: [...across, ...down] };
}

// Собирает кроссворд: wordCount слов на поле не больше maxSize клеток в стороне.
export function genCrossword({ wordCount, maxSize, minLen = 3, maxLen = 9 }) {
  const candidates = WORDS.filter((item) => item.w.length >= minLen && item.w.length <= Math.min(maxLen, maxSize));
  let best = null;

  for (let attempt = 0; attempt < 25; attempt++) {
    // длинные слова вперёд — с них сетка растёт лучше
    const pool = shuffle(candidates).sort((a, b) => b.w.length - a.w.length);
    const state = buildOnce(pool, wordCount, maxSize);
    if (!best || state.placed.length > best.placed.length) best = state;
    if (state.placed.length >= wordCount) break;
  }
  return describe(best);
}
