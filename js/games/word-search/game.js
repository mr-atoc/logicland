import { el, pick } from '../../core/dom.js';
import { sound } from '../../core/sound.js';
import { confetti, starsEl } from '../../core/fx.js';
import { generateBoard } from './generator.js';

function pluralWords(n) {
  if (n % 10 === 1 && n % 100 !== 11) return `${n} слово`;
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return `${n} слова`;
  return `${n} слов`;
}

const LEVELS = [
  { n: 1, size: 6, words: 4, title: 'Разминка', hint: 'поле 6×6, 4 слова' },
  { n: 2, size: 8, words: 6, title: 'Искатель', hint: 'поле 8×8, 6 слов' },
  { n: 3, size: 10, words: 8, title: 'Следопыт', hint: 'поле 10×10, 8 слов' },
];

export default {
  mount(root, api) {
    const state = api.loadState() ?? { solved: {}, wordsFound: 0 };

    function save() {
      api.saveState(state);
      api.reportResult({ score: state.wordsFound, summary: `найдено слов: ${state.wordsFound}` });
    }

    function showMenu() {
      root.replaceChildren(
        el('div', { class: 'level-select' },
          el('p', { class: 'game-intro' },
            `${api.profile.emoji} ${api.profile.name}, слова спрятались в сетке — по строкам и столбцам! Нажми на первую букву слова, потом на последнюю, чтобы поймать его.`),
          el('div', { class: 'level-grid' },
            ...LEVELS.map((level) =>
              el('button', { class: 'level-card', onclick: () => startRound(level) },
                el('div', { class: 'level-icon' }, '🔍'),
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

    function startRound(level) {
      const board = generateBoard(level.size, level.words);
      const found = new Set();
      const foundCells = new Set();
      let hints = 0;
      let start = null;

      const gridEl = el('div', {
        class: 'ws-grid',
        style: `grid-template-columns: repeat(${level.size}, 1fr)`,
      });
      const chipsEl = el('div', { class: 'word-chips' });

      function renderChips() {
        chipsEl.replaceChildren(
          ...board.words.map((word) =>
            el('span', { class: `word-chip${found.has(word) ? ' done' : ''}` }, word)),
        );
      }

      function renderGrid(extra = {}) {
        gridEl.replaceChildren(
          ...board.grid.flatMap((row, r) =>
            row.map((letter, c) => {
              const key = `${r},${c}`;
              const classes = ['ws-cell'];
              if (foundCells.has(key)) classes.push('found');
              if (start && start.r === r && start.c === c) classes.push('sel');
              if (extra[key]) classes.push(extra[key]);
              return el('button', {
                class: classes.join(' '),
                'data-r': r,
                'data-c': c,
                onclick: () => onCell(r, c),
              }, letter);
            }),
          ),
        );
      }

      function pathBetween(a, b) {
        if (a.r !== b.r && a.c !== b.c) return null;
        const dr = Math.sign(b.r - a.r);
        const dc = Math.sign(b.c - a.c);
        const cells = [];
        let { r, c } = a;
        for (;;) {
          cells.push([r, c]);
          if (r === b.r && c === b.c) break;
          r += dr;
          c += dc;
        }
        return cells;
      }

      function onCell(r, c) {
        if (!start) {
          sound.tap();
          start = { r, c };
          renderGrid();
          return;
        }
        if (start.r === r && start.c === c) {
          start = null;
          renderGrid();
          return;
        }
        const path = pathBetween(start, { r, c });
        start = null;
        if (!path) {
          renderGrid();
          return;
        }
        const letters = path.map(([pr, pc]) => board.grid[pr][pc]).join('');
        const reversed = [...letters].reverse().join('');
        const word = board.words.find((w) => !found.has(w) && (w === letters || w === reversed));
        if (word) {
          sound.right();
          found.add(word);
          const extra = {};
          path.forEach(([pr, pc]) => {
            foundCells.add(`${pr},${pc}`);
            extra[`${pr},${pc}`] = 'just-found';
          });
          renderGrid(extra);
          renderChips();
          if (found.size === board.words.length) {
            setTimeout(finishRound, 500);
          } else {
            setTimeout(() => renderGrid(), 500);
          }
        } else {
          sound.wrong();
          const extra = {};
          path.forEach(([pr, pc]) => { extra[`${pr},${pc}`] = 'wrongflash'; });
          renderGrid(extra);
          setTimeout(() => renderGrid(), 600);
        }
      }

      function hint() {
        const remaining = board.words.filter((w) => !found.has(w));
        if (!remaining.length) return;
        const word = pick(remaining);
        const spot = board.placements[word];
        sound.unlock();
        hints += 1;
        renderGrid({ [`${spot.r},${spot.c}`]: 'hintflash' });
        setTimeout(() => renderGrid(), 1500);
      }

      function finishRound() {
        const stars = hints === 0 ? 3 : hints <= 2 ? 2 : 1;
        state.solved[level.n] = (state.solved[level.n] ?? 0) + 1;
        state.wordsFound += board.words.length;
        save();
        sound.win();
        confetti(110);
        root.replaceChildren(
          el('div', { class: 'results' },
            starsEl(stars),
            el('h2', {}, 'Все слова найдены!'),
            el('p', { class: 'results-score' }, `Тема «${board.category}» разгадана: ${pluralWords(board.words.length)}.`),
            el('div', { class: 'results-actions' },
              el('button', { class: 'btn btn-primary', onclick: () => startRound(level) }, 'Ещё раз 🔁'),
              el('button', { class: 'btn', onclick: showMenu }, 'К уровням 🔍'),
            ),
          ),
        );
      }

      root.replaceChildren(
        el('div', { class: 'ws-wrap' },
          el('div', { class: 'ws-topic' }, `Тема: ${board.category}`),
          chipsEl,
          gridEl,
          el('div', { class: 'game-toolbar' },
            el('button', { class: 'btn', onclick: hint }, '💡 Подсказка'),
            el('button', { class: 'btn', onclick: showMenu }, '🚪 К уровням'),
          ),
          el('p', { class: 'ws-help' }, 'Нажми на первую букву слова, потом на последнюю.'),
        ),
      );
      renderChips();
      renderGrid();
    }

    showMenu();
  },

  unmount() {},
};
