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
  { n: 1, size: 6, words: 4, title: 'Разминка', hint: 'поле 6×6, 4 слова', icon: '🔍' },
  { n: 2, size: 8, words: 6, title: 'Искатель', hint: 'поле 8×8, 6 слов', icon: '🔍' },
  { n: 3, size: 10, words: 8, title: 'Следопыт', hint: 'поле 10×10, 8 слов', icon: '🔍' },
  { n: 4, size: 8, words: 5, snake: true, title: 'Змейка', hint: 'слова с поворотами, 8×8', icon: '🐍' },
  { n: 5, size: 10, words: 7, snake: true, title: 'Большая змейка', hint: 'слова с поворотами, 10×10', icon: '🐍' },
];

export default {
  mount(root, api) {
    const state = api.loadState() ?? { solved: {}, wordsFound: 0 };
    // В пределах сессии не повторяем тему прошлого раунда и реже берём те же слова.
    let lastCategory = null;
    const usedWords = new Set();

    function save() {
      api.saveState(state);
      api.reportResult({ score: state.wordsFound, summary: `найдено слов: ${state.wordsFound}` });
    }

    function showMenu() {
      root.replaceChildren(
        el('div', { class: 'level-select' },
          el('p', { class: 'game-intro' },
            `${api.profile.emoji} ${api.profile.name}, слова спрятались в сетке из букв! Проведи пальцем или мышкой по буквам слова — а в «Змейке» слова ещё и поворачивают.`),
          el('div', { class: 'level-grid' },
            ...LEVELS.map((level) =>
              el('button', { class: 'level-card', onclick: () => startRound(level) },
                el('div', { class: 'level-icon' }, level.icon),
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
      const board = generateBoard(level.size, level.words, {
        excludeCategory: lastCategory,
        usedWords,
        snake: level.snake,
      });
      lastCategory = board.category;
      board.words.forEach((w) => usedWords.add(w));
      if (usedWords.size > 120) usedWords.clear();

      const found = new Set();
      const foundCells = new Set();
      let hints = 0;
      let path = [];        // текущая цепочка клеток
      let dragging = false;
      let dragMoved = false;

      const gridEl = el('div', {
        class: 'ws-grid',
        style: `grid-template-columns: repeat(${level.size}, 1fr)`,
      });
      const chipsEl = el('div', { class: 'word-chips' });
      const traceEl = el('div', { class: 'ws-trace' });

      const letterAt = ([r, c]) => board.grid[r][c];
      const pathLetters = () => path.map(letterAt).join('');

      function renderChips() {
        chipsEl.replaceChildren(
          ...board.words.map((word) =>
            el('span', { class: `word-chip${found.has(word) ? ' done' : ''}` }, word)),
        );
      }

      function renderGrid(extra = {}) {
        const selected = new Set(path.map(([r, c]) => `${r},${c}`));
        gridEl.replaceChildren(
          ...board.grid.flatMap((row, r) =>
            row.map((letter, c) => {
              const key = `${r},${c}`;
              const classes = ['ws-cell'];
              if (foundCells.has(key)) classes.push('found');
              if (selected.has(key)) classes.push('sel');
              if (extra[key]) classes.push(extra[key]);
              return el('button', { class: classes.join(' '), 'data-r': r, 'data-c': c }, letter);
            }),
          ),
        );
        traceEl.textContent = path.length ? pathLetters() : '';
      }

      // Слово засчитывается, если цепочка читается вперёд или назад.
      // allowPrefix=false — не засчитываем, пока цепочка может вырасти в другое слово
      // (например, КОТ внутри КОТЛЕТЫ), чтобы не обрывать ведение пальцем.
      function tryMatch(allowPrefix) {
        if (path.length < 2) return false;
        const letters = pathLetters();
        const reversed = [...letters].reverse().join('');
        const word = board.words.find((w) => !found.has(w) && (w === letters || w === reversed));
        if (!word) return false;
        if (!allowPrefix) {
          const canGrow = board.words.some((w) => !found.has(w) && w.length > letters.length
            && (w.startsWith(letters) || w.startsWith(reversed)
              || w.endsWith(letters) || w.endsWith(reversed)));
          if (canGrow) return false;
        }
        acceptWord(word);
        return true;
      }

      function acceptWord(word) {
        sound.right();
        found.add(word);
        const extra = {};
        path.forEach(([r, c]) => {
          foundCells.add(`${r},${c}`);
          extra[`${r},${c}`] = 'just-found';
        });
        path = [];
        renderGrid(extra);
        renderChips();
        if (found.size === board.words.length) setTimeout(finishRound, 600);
        else setTimeout(() => renderGrid(), 500);
      }

      function finalize() {
        if (tryMatch(true)) return;
        if (path.length >= 2) {
          sound.wrong();
          const extra = {};
          path.forEach(([r, c]) => { extra[`${r},${c}`] = 'wrongflash'; });
          path = [];
          renderGrid(extra);
          setTimeout(() => renderGrid(), 500);
        }
      }

      function extendTo(r, c) {
        const last = path[path.length - 1];
        if (last && last[0] === r && last[1] === c) return;
        // шаг назад по цепочке — стираем последнюю букву
        const prev = path[path.length - 2];
        if (prev && prev[0] === r && prev[1] === c) {
          path.pop();
          renderGrid();
          return;
        }
        if (path.some(([pr, pc]) => pr === r && pc === c)) return;
        if (last && Math.abs(last[0] - r) + Math.abs(last[1] - c) !== 1) return;
        path.push([r, c]);
        renderGrid();
        tryMatch(false);
      }

      function cellFromEvent(event) {
        const rect = gridEl.getBoundingClientRect();
        const c = Math.floor(((event.clientX - rect.left) / rect.width) * level.size);
        const r = Math.floor(((event.clientY - rect.top) / rect.height) * level.size);
        if (r < 0 || r >= level.size || c < 0 || c >= level.size) return null;
        return [r, c];
      }

      gridEl.addEventListener('pointerdown', (event) => {
        const cell = cellFromEvent(event);
        if (!cell) return;
        event.preventDefault();
        try { gridEl.setPointerCapture(event.pointerId); } catch { /* не критично */ }
        dragging = true;
        dragMoved = false;
        const [r, c] = cell;
        const last = path[path.length - 1];
        if (last && last[0] === r && last[1] === c) {
          finalize(); // повторное нажатие на последнюю букву — проверить цепочку
          return;
        }
        if (last && Math.abs(last[0] - r) + Math.abs(last[1] - c) === 1) {
          extendTo(r, c);
          return;
        }
        sound.tap();
        path = [[r, c]];
        renderGrid();
      });

      gridEl.addEventListener('pointermove', (event) => {
        if (!dragging) return;
        const cell = cellFromEvent(event);
        if (!cell) return;
        const last = path[path.length - 1];
        if (last && last[0] === cell[0] && last[1] === cell[1]) return;
        dragMoved = true;
        extendTo(cell[0], cell[1]);
      });

      const endDrag = () => {
        if (!dragging) return;
        dragging = false;
        if (dragMoved) finalize(); // вели пальцем и отпустили — проверяем
      };
      gridEl.addEventListener('pointerup', endDrag);
      gridEl.addEventListener('pointercancel', endDrag);

      function hint() {
        const remaining = board.words.filter((w) => !found.has(w));
        if (!remaining.length) return;
        const word = pick(remaining);
        const [r, c] = board.placements[word][0];
        hints += 1;
        sound.unlock();
        renderGrid({ [`${r},${c}`]: 'hintflash' });
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
          traceEl,
          gridEl,
          el('div', { class: 'game-toolbar' },
            el('button', { class: 'btn', onclick: hint }, '💡 Подсказка'),
            el('button', { class: 'btn', onclick: showMenu }, '🚪 К уровням'),
          ),
          el('p', { class: 'ws-help' },
            level.snake
              ? 'Веди пальцем по буквам — слово может поворачивать в любую сторону.'
              : 'Веди пальцем по буквам слова или нажимай их по очереди.'),
        ),
      );
      renderChips();
      renderGrid();
    }

    showMenu();
  },

  unmount() {},
};
