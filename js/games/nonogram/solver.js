// Подсказки и решатель нонограмм. Чистая логика без DOM.
// Состояние клетки: 0 — неизвестно, 1 — закрашена, 2 — пустая.

// Подсказка для одной линии: длины подряд идущих закрашенных клеток.
export function cluesFor(line) {
  const clue = [];
  let run = 0;
  for (const value of line) {
    if (value) run += 1;
    else if (run) { clue.push(run); run = 0; }
  }
  if (run) clue.push(run);
  return clue;
}

// Перебирает все расклады линии, совместимые с уже известными клетками,
// и говорит для каждой клетки, может ли она быть закрашенной / пустой.
export function scanLine(clue, state) {
  const n = state.length;
  const canFill = new Array(n).fill(false);
  const canEmpty = new Array(n).fill(false);
  const arrangement = new Array(n).fill(0);
  let found = false;

  // сколько места нужно оставшимся блокам вместе с разделителями
  const tail = clue.map((_, i) => clue.slice(i + 1).reduce((sum, len) => sum + len + 1, 0));

  const record = () => {
    found = true;
    for (let i = 0; i < n; i++) {
      if (arrangement[i] === 1) canFill[i] = true;
      else canEmpty[i] = true;
    }
  };

  const walk = (pos, ci) => {
    if (ci === clue.length) {
      for (let i = pos; i < n; i++) {
        if (state[i] === 1) return;
        arrangement[i] = 2;
      }
      record();
      return;
    }
    const len = clue[ci];
    for (let start = pos; start + len + tail[ci] <= n; start++) {
      // клетки до блока обязаны быть пустыми
      if (start > pos && state[start - 1] === 1) break;
      let fits = true;
      for (let i = start; i < start + len; i++) {
        if (state[i] === 2) { fits = false; break; }
      }
      if (!fits) continue;
      if (start + len < n && state[start + len] === 1) continue;
      for (let i = pos; i < start; i++) arrangement[i] = 2;
      for (let i = start; i < start + len; i++) arrangement[i] = 1;
      if (start + len < n) arrangement[start + len] = 2;
      walk(start + len + 1, ci + 1);
    }
  };

  walk(0, 0);
  return found ? { canFill, canEmpty } : null;
}

// Решает головоломку так же, как человек: смотрит на строки и столбцы
// по одному и выводит только то, что следует наверняка — без угадывания.
export function logicSolve(rowClues, colClues) {
  const rows = rowClues.length;
  const cols = colClues.length;
  const state = Array.from({ length: rows }, () => new Array(cols).fill(0));

  const apply = (res, get, set, length) => {
    let changed = false;
    for (let i = 0; i < length; i++) {
      const value = res.canFill[i] && !res.canEmpty[i] ? 1
        : (!res.canFill[i] && res.canEmpty[i] ? 2 : 0);
      if (value && get(i) !== value) { set(i, value); changed = true; }
    }
    return changed;
  };

  let changed = true;
  while (changed) {
    changed = false;
    for (let r = 0; r < rows; r++) {
      const res = scanLine(rowClues[r], state[r]);
      if (!res) return { solved: false, state, contradiction: true };
      changed = apply(res, (c) => state[r][c], (c, v) => { state[r][c] = v; }, cols) || changed;
    }
    for (let c = 0; c < cols; c++) {
      const column = state.map((row) => row[c]);
      const res = scanLine(colClues[c], column);
      if (!res) return { solved: false, state, contradiction: true };
      changed = apply(res, (r) => state[r][c], (r, v) => { state[r][c] = v; }, rows) || changed;
    }
  }

  const solved = state.every((row) => row.every((v) => v !== 0));
  return { solved, state, contradiction: false };
}
