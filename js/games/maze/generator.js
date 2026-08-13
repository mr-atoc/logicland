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
