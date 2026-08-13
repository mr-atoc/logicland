import { el } from '../../core/dom.js';
import { sound } from '../../core/sound.js';
import { confetti, starsEl } from '../../core/fx.js';
import { SIZES, generatePuzzle, findConflicts } from './generator.js';

const SIZE_LEVELS = [
  { size: 4, name: 'Малыш', hint: 'маленькое поле для разминки' },
  { size: 6, name: 'Умник', hint: 'поле побольше — будь внимательнее' },
  { size: 9, name: 'Мастер', hint: 'классическое судоку' },
];

export default {
  mount(root, api) {
    const state = api.loadState() ?? { solved: {}, current: null };

    function save() {
      api.saveState(state);
      const total = Object.values(state.solved).reduce((a, b) => a + b, 0);
      api.reportResult({ score: total * 20, summary: `решено судоку: ${total}` });
    }

    function showMenu() {
      root.replaceChildren(
        el('div', { class: 'level-select' },
          el('p', { class: 'game-intro' },
            `${api.profile.emoji} ${api.profile.name}, заполни поле числами так, чтобы в каждой строке, каждом столбце и каждом блоке числа не повторялись!`),
          state.current
            ? el('div', { class: 'game-toolbar' },
              el('button', { class: 'btn btn-primary', onclick: showBoard },
                `▶ Продолжить ${state.current.size}×${state.current.size}`))
            : '',
          el('div', { class: 'level-grid' },
            ...SIZE_LEVELS.map(({ size, name, hint }) =>
              el('button', { class: 'level-card', onclick: () => startNew(size) },
                el('div', { class: 'level-icon' }, '🔢'),
                el('div', { class: 'level-name' }, `${size} × ${size} · ${name}`),
                el('div', { class: 'level-hint' }, hint),
                el('div', { class: 'level-best' },
                  state.solved[size] ? `решено: ${state.solved[size]}` : 'Ещё не решена'),
              ),
            ),
          ),
        ),
      );
    }

    function startNew(size) {
      const { puzzle, solution } = generatePuzzle(size);
      state.current = {
        size,
        givens: puzzle.map((row) => [...row]),
        grid: puzzle.map((row) => [...row]),
        solution,
        hints: 0,
      };
      save();
      showBoard();
    }

    function showBoard() {
      const cur = state.current;
      const { size } = cur;
      const { boxW, boxH } = SIZES[size];
      let sel = null;

      const boardEl = el('div', {
        class: `sudoku-board${size === 9 ? ' sudoku-s9' : ''}`,
        style: `grid-template-columns: repeat(${size}, 1fr)`,
      });

      function renderBoard() {
        const conflicts = findConflicts(cur.grid, size);
        boardEl.replaceChildren(
          ...cur.grid.flatMap((row, r) =>
            row.map((value, c) => {
              const given = cur.givens[r][c] !== 0;
              const classes = ['sudoku-cell'];
              if (given) classes.push('given');
              if (sel && sel.r === r && sel.c === c) classes.push('sel');
              if (conflicts.has(`${r},${c}`)) classes.push('conflict');
              if ((c + 1) % boxW === 0 && c !== size - 1) classes.push('box-r');
              if ((r + 1) % boxH === 0 && r !== size - 1) classes.push('box-b');
              return el('button', {
                class: classes.join(' '),
                'data-r': r,
                'data-c': c,
                onclick: () => {
                  if (given) return;
                  sound.tap();
                  sel = sel && sel.r === r && sel.c === c ? null : { r, c };
                  renderBoard();
                },
              }, value || '');
            }),
          ),
        );
      }

      function setCell(value) {
        if (!sel) return;
        cur.grid[sel.r][sel.c] = value;
        if (value !== 0 && findConflicts(cur.grid, size).has(`${sel.r},${sel.c}`)) {
          sound.wrong();
        } else {
          sound.tap();
        }
        save();
        renderBoard();
        checkWin();
      }

      function hint() {
        const wrongOrEmpty = (r, c) => cur.givens[r][c] === 0 && cur.grid[r][c] !== cur.solution[r][c];
        let target = sel && wrongOrEmpty(sel.r, sel.c) ? sel : null;
        if (!target) {
          outer:
          for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
              if (wrongOrEmpty(r, c)) { target = { r, c }; break outer; }
            }
          }
        }
        if (!target) return;
        sound.unlock();
        cur.hints += 1;
        cur.grid[target.r][target.c] = cur.solution[target.r][target.c];
        sel = null;
        save();
        renderBoard();
        checkWin();
      }

      function checkWin() {
        const full = cur.grid.every((row) => row.every((v) => v !== 0));
        if (!full || findConflicts(cur.grid, size).size > 0) return;
        const stars = cur.hints === 0 ? 3 : cur.hints <= 2 ? 2 : 1;
        state.solved[size] = (state.solved[size] ?? 0) + 1;
        state.current = null;
        save();
        sound.win();
        confetti(120);
        showWin(size, stars);
      }

      root.replaceChildren(
        el('div', { class: 'sudoku-wrap' },
          boardEl,
          el('div', { class: 'numpad' },
            ...Array.from({ length: size }, (_, i) =>
              el('button', { class: 'pad-btn', onclick: () => setCell(i + 1) }, i + 1)),
            el('button', { class: 'pad-btn', onclick: () => setCell(0) }, '⌫'),
          ),
          el('div', { class: 'game-toolbar' },
            el('button', { class: 'btn', onclick: hint }, '💡 Подсказка'),
            el('button', { class: 'btn', onclick: showMenu }, '🚪 К размерам'),
          ),
        ),
      );
      renderBoard();
    }

    function showWin(size, stars) {
      root.replaceChildren(
        el('div', { class: 'results' },
          starsEl(stars),
          el('h2', {}, `Судоку ${size}×${size} решено!`),
          el('p', { class: 'results-score' },
            stars === 3 ? 'Без единой подсказки — блестяще!' : 'Отличная работа!'),
          el('div', { class: 'results-actions' },
            el('button', { class: 'btn btn-primary', onclick: () => startNew(size) }, 'Ещё одну 🔁'),
            el('button', { class: 'btn', onclick: showMenu }, 'К размерам 🔢'),
          ),
        ),
      );
    }

    showMenu();
  },

  unmount() {},
};
