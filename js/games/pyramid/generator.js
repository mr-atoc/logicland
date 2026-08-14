// Генераторы числовых пирамид и задач с весами. Без DOM.
import { shuffle, randInt, pick } from '../../core/dom.js';

// Пирамида: rows массивов сверху вниз, вершина — один элемент.
// Каждое число равно сумме двух чисел под ним.
// minHideRow — с какого ряда сверху разрешено прятать числа: у высоких башен
// верхние числа большие, поэтому пропуски держим в нижних рядах, где счёт проще.
export function genPyramid(baseCount, maxBase, hideCount, minHideRow = 0) {
  const base = Array.from({ length: baseCount }, () => randInt(1, maxBase));
  const rows = [base];
  while (rows[0].length > 1) {
    const prev = rows[0];
    rows.unshift(prev.slice(1).map((v, i) => v + prev[i]));
  }

  const candidates = [];
  rows.forEach((row, r) => {
    if (r < minHideRow) return;
    row.forEach((_, i) => candidates.push(`${r},${i}`));
  });

  // Прячем числа по одному, откатывая те, из-за которых башня перестаёт решаться.
  const hidden = new Set();
  for (const key of shuffle(candidates)) {
    if (hidden.size >= hideCount) break;
    hidden.add(key);
    if (!isSolvable(rows, hidden)) hidden.delete(key);
  }
  return { rows, hidden };
}

// Пирамида решается, если каждую скрытую клетку можно вывести:
// «родитель = сумма двух детей» или «ребёнок = родитель − второй ребёнок».
export function isSolvable(rows, hidden) {
  const known = rows.map((row, r) => row.map((_, i) => !hidden.has(`${r},${i}`)));
  let changed = true;
  while (changed) {
    changed = false;
    for (let r = 0; r < rows.length - 1; r++) {
      for (let i = 0; i < rows[r].length; i++) {
        const parent = known[r][i];
        const left = known[r + 1][i];
        const right = known[r + 1][i + 1];
        if (!parent && left && right) { known[r][i] = true; changed = true; }
        if (parent && left && !right) { known[r + 1][i + 1] = true; changed = true; }
        if (parent && !left && right) { known[r + 1][i] = true; changed = true; }
      }
    }
  }
  return known.every((row) => row.every(Boolean));
}

// Варианты ответа для клетки: правильный + 3 близких.
export function cellOptions(answer) {
  const options = new Set([answer]);
  const deltas = shuffle([1, -1, 2, -2, 3, -3, 4]);
  for (const d of deltas) {
    if (options.size >= 4) break;
    if (answer + d > 0) options.add(answer + d);
  }
  return shuffle([...options]);
}

// Весы: три предмета с разными весами и два сравнения.
const ITEMS = ['🍎', '🍐', '🍇', '🍉', '🎁', '⚽', '🧸', '📚'];

export function genScales() {
  const items = shuffle(ITEMS).slice(0, 3);
  const order = shuffle(items); // order[0] — самый тяжёлый
  const facts = [];
  // два факта, из которых следует полный порядок: (0>1, 1>2) или (0>1, 0<... ) — берём соседние пары
  for (const [heavy, light] of [[order[0], order[1]], [order[1], order[2]]]) {
    facts.push(Math.random() < 0.5
      ? `${heavy} тяжелее, чем ${light}`
      : `${light} легче, чем ${heavy}`);
  }
  const askHeaviest = Math.random() < 0.5;
  return {
    facts: shuffle(facts),
    question: askHeaviest ? 'Что самое тяжёлое?' : 'Что самое лёгкое?',
    options: shuffle(items),
    answer: askHeaviest ? order[0] : order[2],
  };
}
