// Генератор лабиринта (алгоритм «recursive backtracker»). Без DOM.
// Каждая клетка: { t, r, b, l } — стены (1 есть, 0 нет). Лабиринт связный:
// от любой клетки можно дойти до любой, путь от входа до выхода единственный.
import { shuffle } from '../../core/dom.js';

export function genMaze(n) {
  const cells = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => ({ t: 1, r: 1, b: 1, l: 1, visited: false })));
  const dirs = [
    [-1, 0, 't', 'b'],
    [1, 0, 'b', 't'],
    [0, 1, 'r', 'l'],
    [0, -1, 'l', 'r'],
  ];
  const stack = [[0, 0]];
  cells[0][0].visited = true;
  while (stack.length) {
    const [r, c] = stack[stack.length - 1];
    const options = shuffle(dirs).filter(([dr, dc]) => {
      const nr = r + dr;
      const nc = c + dc;
      return nr >= 0 && nr < n && nc >= 0 && nc < n && !cells[nr][nc].visited;
    });
    if (!options.length) {
      stack.pop();
      continue;
    }
    const [dr, dc, wall, opposite] = options[0];
    const nr = r + dr;
    const nc = c + dc;
    cells[r][c][wall] = 0;
    cells[nr][nc][opposite] = 0;
    cells[nr][nc].visited = true;
    stack.push([nr, nc]);
  }
  for (const row of cells) for (const cell of row) delete cell.visited;
  return cells;
}

// Круговой (полярный) лабиринт: rings колец по sectors секторов.
// inner[r][s] — стена между клеткой (r,s) и (r-1,s); при r=0 это стена к центру (всегда есть).
// cw[r][s]   — стена между (r,s) и соседом по кольцу (r,(s+1)%sectors).
export function genPolarMaze(rings, sectors) {
  const inner = Array.from({ length: rings }, () => Array(sectors).fill(1));
  const cw = Array.from({ length: rings }, () => Array(sectors).fill(1));
  const visited = Array.from({ length: rings }, () => Array(sectors).fill(false));
  const stack = [[0, 0]];
  visited[0][0] = true;
  while (stack.length) {
    const [r, s] = stack[stack.length - 1];
    const neighbors = shuffle([
      [r, (s + 1) % sectors, () => { cw[r][s] = 0; }],
      [r, (s - 1 + sectors) % sectors, () => { cw[r][(s - 1 + sectors) % sectors] = 0; }],
      [r + 1, s, () => { inner[r + 1][s] = 0; }],
      [r - 1, s, () => { inner[r][s] = 0; }],
    ]).filter(([nr, ns]) => nr >= 0 && nr < rings && !visited[nr][ns]);
    if (!neighbors.length) {
      stack.pop();
      continue;
    }
    const [nr, ns, knock] = neighbors[0];
    knock();
    visited[nr][ns] = true;
    stack.push([nr, ns]);
  }
  return { rings, sectors, inner, cw };
}

// Можно ли пройти между соседними клетками полярного лабиринта.
export function polarPassable(maze, a, b) {
  const S = maze.sectors;
  if (a.r === b.r) {
    if ((a.s + 1) % S === b.s) return maze.cw[a.r][a.s] === 0;
    if ((b.s + 1) % S === a.s) return maze.cw[b.r][b.s] === 0;
    return false;
  }
  if (a.s !== b.s) return false;
  if (b.r === a.r + 1) return maze.inner[b.r][b.s] === 0;
  if (a.r === b.r + 1) return maze.inner[a.r][a.s] === 0;
  return false;
}

// Кратчайший путь от центра (0,0) до клетки exit — для тестов.
export function polarShortestPath(maze, exit) {
  const { rings, sectors } = maze;
  const dist = Array.from({ length: rings }, () => Array(sectors).fill(-1));
  dist[0][0] = 0;
  const queue = [[0, 0]];
  while (queue.length) {
    const [r, s] = queue.shift();
    const candidates = [
      { r, s: (s + 1) % sectors },
      { r, s: (s - 1 + sectors) % sectors },
      { r: r + 1, s },
      { r: r - 1, s },
    ];
    for (const nb of candidates) {
      if (nb.r < 0 || nb.r >= rings) continue;
      if (dist[nb.r][nb.s] !== -1) continue;
      if (!polarPassable(maze, { r, s }, nb)) continue;
      dist[nb.r][nb.s] = dist[r][s] + 1;
      queue.push([nb.r, nb.s]);
    }
  }
  return dist[exit.r][exit.s];
}

// Длина кратчайшего пути (BFS) — для тестов и подсчёта оптимума.
export function shortestPath(cells) {
  const n = cells.length;
  const dist = Array.from({ length: n }, () => Array(n).fill(-1));
  dist[0][0] = 0;
  const queue = [[0, 0]];
  const moves = [
    [-1, 0, 't'],
    [1, 0, 'b'],
    [0, 1, 'r'],
    [0, -1, 'l'],
  ];
  while (queue.length) {
    const [r, c] = queue.shift();
    for (const [dr, dc, wall] of moves) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
      if (cells[r][c][wall]) continue;
      if (dist[nr][nc] !== -1) continue;
      dist[nr][nc] = dist[r][c] + 1;
      queue.push([nr, nc]);
    }
  }
  return dist[n - 1][n - 1];
}
