import { el } from '../../core/dom.js';
import { sound } from '../../core/sound.js';
import { confetti, starsEl } from '../../core/fx.js';
import { genMaze } from './generator.js';

const LEVELS = [
  { n: 1, size: 8, title: 'Мышиная норка', hint: 'лабиринт 8×8' },
  { n: 2, size: 12, title: 'Лисий лес', hint: 'лабиринт 12×12' },
  { n: 3, size: 16, title: 'Драконье подземелье', hint: 'лабиринт 16×16' },
];

export default {
  mount(root, api) {
    const state = api.loadState() ?? { solved: {} };
    let keyHandler = null;

    function detachKeys() {
      if (keyHandler) {
        window.removeEventListener('keydown', keyHandler);
        keyHandler = null;
      }
    }

    function save() {
      api.saveState(state);
      const total = Object.values(state.solved).reduce((a, b) => a + b, 0);
      api.reportResult({ score: total * 10, summary: `пройдено лабиринтов: ${total}` });
    }

    function showMenu() {
      detachKeys();
      root.replaceChildren(
        el('div', { class: 'level-select' },
          el('p', { class: 'game-intro' },
            `${api.profile.emoji} ${api.profile.name}, помоги мышонку 🐭 добраться до сыра 🧀! Управляй стрелками на клавиатуре или кнопками.`),
          el('div', { class: 'level-grid' },
            ...LEVELS.map((level) =>
              el('button', { class: 'level-card', onclick: () => startMaze(level) },
                el('div', { class: 'level-icon' }, '🌀'),
                el('div', { class: 'level-name' }, level.title),
                el('div', { class: 'level-hint' }, level.hint),
                el('div', { class: 'level-best' },
                  state.solved[level.n] ? `пройдено: ${state.solved[level.n]}` : 'Ещё не пройден'),
              ),
            ),
          ),
        ),
      );
    }

    function startMaze(level) {
      detachKeys();
      const n = level.size;
      const maze = genMaze(n);
      let pos = { r: 0, c: 0 };
      let steps = 0;

      const cellEls = [];
      const gridEl = el('div', {
        class: 'maze-grid',
        style: `grid-template-columns: repeat(${n}, 1fr)`,
      });
      for (let r = 0; r < n; r++) {
        cellEls.push([]);
        for (let c = 0; c < n; c++) {
          const cell = maze[r][c];
          const classes = ['maze-cell'];
          if (cell.t) classes.push('wt');
          if (cell.r) classes.push('wr');
          if (cell.b) classes.push('wb');
          if (cell.l) classes.push('wl');
          const node = el('div', { class: classes.join(' ') });
          cellEls[r].push(node);
          gridEl.append(node);
        }
      }
      const stepsEl = el('span', {}, 'Шагов: 0');

      function renderPlayer(prev) {
        if (prev) cellEls[prev.r][prev.c].textContent = '';
        cellEls[n - 1][n - 1].textContent = '🧀';
        cellEls[pos.r][pos.c].textContent = '🐭';
      }

      function move(dr, dc, wall) {
        if (maze[pos.r][pos.c][wall]) return;
        const prev = { ...pos };
        pos = { r: pos.r + dr, c: pos.c + dc };
        steps += 1;
        stepsEl.textContent = `Шагов: ${steps}`;
        renderPlayer(prev);
        if (pos.r === n - 1 && pos.c === n - 1) {
          win();
        }
      }

      const MOVES = {
        ArrowUp: [-1, 0, 't'],
        ArrowDown: [1, 0, 'b'],
        ArrowRight: [0, 1, 'r'],
        ArrowLeft: [0, -1, 'l'],
      };
      keyHandler = (event) => {
        const m = MOVES[event.key];
        if (!m) return;
        event.preventDefault();
        move(...m);
      };
      window.addEventListener('keydown', keyHandler);

      function win() {
        detachKeys();
        state.solved[level.n] = (state.solved[level.n] ?? 0) + 1;
        save();
        sound.win();
        confetti();
        root.replaceChildren(
          el('div', { class: 'results' },
            starsEl(3),
            el('h2', {}, 'Сыр найден!'),
            el('p', { class: 'results-score' }, `Лабиринт пройден за ${steps} шагов.`),
            el('div', { class: 'results-actions' },
              el('button', { class: 'btn btn-primary', onclick: () => startMaze(level) }, 'Ещё раз 🔁'),
              el('button', { class: 'btn', onclick: showMenu }, 'К лабиринтам 🌀'),
            ),
          ),
        );
      }

      const padBtn = (label, dr, dc, wall) =>
        el('button', { class: 'pad-btn maze-pad-btn', onclick: () => move(dr, dc, wall) }, label);

      root.replaceChildren(
        el('div', { class: 'maze-wrap' },
          el('div', { class: 'round-top' },
            el('span', {}, `🌀 ${level.title}`),
            stepsEl,
          ),
          gridEl,
          el('div', { class: 'maze-controls' },
            el('div', { class: 'maze-cluster maze-cluster-v' },
              padBtn('⬆️', -1, 0, 't'),
              padBtn('⬇️', 1, 0, 'b'),
            ),
            el('div', { class: 'maze-cluster' },
              padBtn('⬅️', 0, -1, 'l'),
              padBtn('➡️', 0, 1, 'r'),
            ),
          ),
          el('div', { class: 'game-toolbar' },
            el('button', { class: 'btn', onclick: showMenu }, '🚪 К лабиринтам'),
          ),
        ),
      );
      renderPlayer();
    }

    showMenu();
  },

  unmount() {},
};
