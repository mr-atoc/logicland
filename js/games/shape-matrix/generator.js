// Чистая логика генерации «логических таблиц» — без DOM, чтобы можно было
// протестировать в Node. Рисование фигур живёт отдельно, в shapes.js.
import { shuffle, randInt } from '../../core/dom.js';

export const SHAPES = ['circle', 'oval', 'square', 'triangle', 'diamond', 'trapezoid', 'pentagon', 'hexagon'];
const SIZE_SCALES = [1, 0.72, 0.48];
const STYLES = ['outline', 'dashed', 'filled'];

function pickPool(n, exclude = []) {
  return shuffle(SHAPES.filter((s) => !exclude.includes(s))).slice(0, n);
}

// Берёт из всех возможных комбинаций 5 неправильных + правильный ответ.
function pickOptions(allCombos, answer, count = 6) {
  const rest = shuffle(allCombos.filter((c) => c.key !== answer.key)).slice(0, count - 1);
  return shuffle([answer, ...rest]);
}

// То же, но сначала берёт варианты, максимально похожие на ответ, —
// чтобы нельзя было отсечь «явно чужие», не разгадав правило.
function pickCloseOptions(allCombos, answer, distance, count = 6) {
  const groups = new Map();
  for (const combo of allCombos) {
    if (combo.key === answer.key) continue;
    const d = distance(combo);
    if (!groups.has(d)) groups.set(d, []);
    groups.get(d).push(combo);
  }
  const rest = [];
  for (const d of [...groups.keys()].sort((x, y) => x - y)) {
    rest.push(...shuffle(groups.get(d)));
    if (rest.length >= count - 1) break;
  }
  return shuffle([answer, ...rest.slice(0, count - 1)]);
}

// Латинский квадрат 3×3: у каждой строки и каждого столбца — все три значения
// признака по одному разу. Для двух независимых признаков используются формулы
// (r+c)%3 и (r+2c)%3 — обе валидны и не совпадают друг с другом.

// Уровень 1: в каждой клетке — пара фигур (два независимых признака).
export function genPairGrid() {
  const n = 3;
  const poolA = pickPool(n);
  const poolB = pickPool(n, poolA);
  const grid = [];
  for (let r = 0; r < n; r++) {
    const row = [];
    for (let c = 0; c < n; c++) {
      const a = poolA[(r + c) % n];
      const b = poolB[(r + 2 * c) % n];
      row.push({ type: 'pair', a, b, key: `${a}|${b}` });
    }
    grid.push(row);
  }
  const target = { r: randInt(0, n - 1), c: randInt(0, n - 1) };
  const answer = grid[target.r][target.c];
  const allCombos = poolA.flatMap((a) => poolB.map((b) => ({ type: 'pair', a, b, key: `${a}|${b}` })));
  return { type: 'pair', grid, target, answer, options: pickOptions(allCombos, answer) };
}

// Уровень 2: домики — крыша и окошко меняются каждое по своему правилу.
export function genHouseGrid() {
  const n = 3;
  const roofPool = shuffle(['peak', 'hip', 'arch']);
  const windowPool = shuffle(['square', 'arch', 'none']);
  const grid = [];
  for (let r = 0; r < n; r++) {
    const row = [];
    for (let c = 0; c < n; c++) {
      const roof = roofPool[(r + c) % n];
      const win = windowPool[(r + 2 * c) % n];
      row.push({ type: 'house', roof, window: win, key: `${roof}|${win}` });
    }
    grid.push(row);
  }
  const target = { r: randInt(0, n - 1), c: randInt(0, n - 1) };
  const answer = grid[target.r][target.c];
  const allCombos = roofPool.flatMap((roof) => windowPool.map((win) => ({ type: 'house', roof, window: win, key: `${roof}|${win}` })));
  return { type: 'house', grid, target, answer, options: pickOptions(allCombos, answer) };
}

// Уровень 3: фигура постоянна по строке, а размер уменьшается по столбцу.
export function genSizeGrid() {
  const n = 3;
  const rowShapes = pickPool(n);
  const grid = [];
  for (let r = 0; r < n; r++) {
    const row = [];
    for (let c = 0; c < n; c++) {
      row.push({ type: 'size', shape: rowShapes[r], col: c, scale: SIZE_SCALES[c], key: `${rowShapes[r]}@${c}` });
    }
    grid.push(row);
  }
  const target = { r: randInt(0, n - 1), c: randInt(0, n - 1) };
  const answer = grid[target.r][target.c];
  const allCombos = rowShapes.flatMap((shape) =>
    SIZE_SCALES.map((scale, col) => ({ type: 'size', shape, col, scale, key: `${shape}@${col}` })));
  return { type: 'size', grid, target, answer, options: pickOptions(allCombos, answer) };
}

// Уровень 4: три независимых признака сразу — форма, размер и стиль обводки.
export function genTripleGrid() {
  const n = 3;
  const shapePool = pickPool(n);
  const grid = [];
  for (let r = 0; r < n; r++) {
    const row = [];
    for (let c = 0; c < n; c++) {
      const shape = shapePool[(r + c) % n];
      const scaleIdx = (r + 2 * c) % n;
      const style = STYLES[(2 * r + c) % n];
      row.push({
        type: 'triple', shape, scaleIdx, scale: SIZE_SCALES[scaleIdx], style,
        key: `${shape}@${scaleIdx}@${style}`,
      });
    }
    grid.push(row);
  }
  const target = { r: randInt(0, n - 1), c: randInt(0, n - 1) };
  const answer = grid[target.r][target.c];
  const allCombos = shapePool.flatMap((shape) =>
    SIZE_SCALES.flatMap((scale, scaleIdx) =>
      STYLES.map((style) => ({ type: 'triple', shape, scaleIdx, scale, style, key: `${shape}@${scaleIdx}@${style}` }))));
  const distance = (c) =>
    (c.shape !== answer.shape ? 1 : 0)
    + (c.scaleIdx !== answer.scaleIdx ? 1 : 0)
    + (c.style !== answer.style ? 1 : 0);
  return { type: 'triple', grid, target, answer, options: pickCloseOptions(allCombos, answer, distance) };
}
