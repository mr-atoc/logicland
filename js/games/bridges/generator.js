// Генератор и решатель головоломки «Мосты» (хаси).
// Правила: числа на островах — сколько мостов к ним подходит; мосты идут
// только по горизонтали и вертикали, между парой островов их не больше двух,
// мосты не пересекаются, и все острова должны оказаться связаны.
import { shuffle, randInt, pick } from '../../core/dom.js';

const DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]];
const pairKey = (a, b) => (a.r < b.r || (a.r === b.r && a.c < b.c)
  ? `${a.r},${a.c}|${b.r},${b.c}` : `${b.r},${b.c}|${a.r},${a.c}`);

// Все пары островов, которые вообще можно соединить: по прямой,
// без других островов между ними.
export function possiblePairs(islands, size) {
  const at = new Map(islands.map((isl) => [`${isl.r},${isl.c}`, isl]));
  const pairs = [];
  for (const island of islands) {
    for (const [dr, dc] of [[0, 1], [1, 0]]) { // вправо и вниз — чтобы не дублировать
      const cells = [];
      for (let k = 1; ; k++) {
        const r = island.r + dr * k;
        const c = island.c + dc * k;
        if (r < 0 || r >= size || c < 0 || c >= size) break;
        const other = at.get(`${r},${c}`);
        if (other) {
          if (k > 1) pairs.push({ a: island, b: other, cells: [...cells] });
          break;
        }
        cells.push([r, c]);
      }
    }
  }
  return pairs;
}

// Считает решения (не больше limit) — так проверяется единственность.
export function countSolutions(islands, size, limit = 2) {
  const pairs = possiblePairs(islands, size);
  const index = new Map(islands.map((isl, i) => [isl, i]));
  const need = islands.map((isl) => isl.degree);
  const assigned = new Array(islands.length).fill(0);
  // для каждого острова — сколько пар с ним ещё впереди
  const pairsOf = islands.map(() => []);
  pairs.forEach((pair, i) => {
    pairsOf[index.get(pair.a)].push(i);
    pairsOf[index.get(pair.b)].push(i);
  });
  const remainingAfter = islands.map((_, i) =>
    pairs.map((_, pi) => pairsOf[i].filter((x) => x >= pi).length));

  const busy = Array.from({ length: size }, () => new Array(size).fill(false));
  const chosen = new Array(pairs.length).fill(0);
  let found = 0;

  const feasible = (from) => islands.every((_, i) => {
    if (assigned[i] > need[i]) return false;
    return need[i] - assigned[i] <= 2 * remainingAfter[i][from];
  });

  const connected = () => {
    const seen = new Set([0]);
    const stack = [0];
    while (stack.length) {
      const i = stack.pop();
      for (const pi of pairsOf[i]) {
        if (!chosen[pi]) continue;
        const other = index.get(pairs[pi].a) === i ? index.get(pairs[pi].b) : index.get(pairs[pi].a);
        if (!seen.has(other)) { seen.add(other); stack.push(other); }
      }
    }
    return seen.size === islands.length;
  };

  const walk = (pi) => {
    if (found >= limit) return;
    if (pi === pairs.length) {
      if (islands.every((_, i) => assigned[i] === need[i]) && connected()) found += 1;
      return;
    }
    if (!feasible(pi)) return;
    const pair = pairs[pi];
    const ia = index.get(pair.a);
    const ib = index.get(pair.b);
    const free = pair.cells.every(([r, c]) => !busy[r][c]);
    const maxCount = free ? 2 : 0;
    for (let count = 0; count <= maxCount; count++) {
      if (assigned[ia] + count > need[ia] || assigned[ib] + count > need[ib]) break;
      if (count > 0) pair.cells.forEach(([r, c]) => { busy[r][c] = true; });
      assigned[ia] += count;
      assigned[ib] += count;
      chosen[pi] = count;
      walk(pi + 1);
      chosen[pi] = 0;
      assigned[ia] -= count;
      assigned[ib] -= count;
      if (count > 0) pair.cells.forEach(([r, c]) => { busy[r][c] = false; });
      if (found >= limit) return;
    }
  };

  walk(0);
  return found;
}

// Строит случайное решение: наращивает сеть островов и мостов.
function buildSolution(size, targetIslands) {
  const cell = Array.from({ length: size }, () => new Array(size).fill(null));
  const islands = [];
  const bridges = new Map();

  const addIsland = (r, c) => {
    const island = { r, c, degree: 0 };
    islands.push(island);
    cell[r][c] = 'island';
    return island;
  };
  addIsland(randInt(0, size - 1), randInt(0, size - 1));

  let guard = 0;
  while (islands.length < targetIslands && guard++ < 800) {
    const from = pick(islands);
    const [dr, dc] = pick(DIRS);
    const dist = randInt(2, 4);
    const nr = from.r + dr * dist;
    const nc = from.c + dc * dist;
    if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;

    const path = [];
    let blocked = false;
    for (let k = 1; k < dist; k++) {
      const r = from.r + dr * k;
      const c = from.c + dc * k;
      if (cell[r][c] !== null) { blocked = true; break; }
      path.push([r, c]);
    }
    if (blocked) continue;

    const existing = islands.find((i) => i.r === nr && i.c === nc);
    if (!existing && cell[nr][nc] !== null) continue;

    const target = existing ?? addIsland(nr, nc);
    const key = pairKey(from, target);
    const already = bridges.get(key)?.count ?? 0;
    const count = Math.min(2, already + (Math.random() < 0.3 ? 2 : 1));
    if (count === already) continue;
    if (from.degree + (count - already) > 8 || target.degree + (count - already) > 8) continue;

    from.degree += count - already;
    target.degree += count - already;
    bridges.set(key, { a: from, b: target, count });
    path.forEach(([r, c]) => { cell[r][c] = dr === 0 ? 'h' : 'v'; });
  }

  if (islands.length < 4 || islands.some((i) => i.degree === 0)) return null;
  return { islands, bridges: [...bridges.values()], size };
}

export function genBridges(size, targetIslands) {
  for (let attempt = 0; attempt < 120; attempt++) {
    const solution = buildSolution(size, targetIslands);
    if (!solution) continue;
    if (solution.islands.length < Math.max(4, targetIslands - 2)) continue;
    if (countSolutions(solution.islands, size) === 1) {
      return {
        size,
        islands: solution.islands.map(({ r, c, degree }) => ({ r, c, degree })),
        solution: solution.bridges.map(({ a, b, count }) => ({
          a: { r: a.r, c: a.c }, b: { r: b.r, c: b.c }, count,
        })),
      };
    }
  }
  return null;
}
