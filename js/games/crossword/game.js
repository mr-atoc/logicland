import { el, pick } from '../../core/dom.js';
import { sound } from '../../core/sound.js';
import { confetti, starsEl } from '../../core/fx.js';
import { genCrossword } from './generator.js';

const LEVELS = [
  { n: 1, title: 'Малый', hint: '6 слов, короткие', icon: '📗', cfg: { wordCount: 6, maxSize: 9, maxLen: 7 } },
  { n: 2, title: 'Средний', hint: '9 слов', icon: '📘', cfg: { wordCount: 9, maxSize: 11, maxLen: 8 } },
  { n: 3, title: 'Большой', hint: '12 слов', icon: '📙', cfg: { wordCount: 12, maxSize: 13, maxLen: 9 } },
  { n: 4, title: 'Огромный', hint: '16 слов, для знатоков', icon: '📕', cfg: { wordCount: 16, maxSize: 15, maxLen: 9 } },
];

const cellKey = (r, c) => `${r},${c}`;
const entryKey = (entry) => `${entry.number}${entry.dir}`;

// Клетки слова по порядку букв.
function entryCells(entry) {
  const [dr, dc] = entry.dir === 'across' ? [0, 1] : [1, 0];
  return Array.from({ length: entry.word.length }, (_, i) => [entry.row + dr * i, entry.col + dc * i]);
}

export default {
  mount(root, api) {
    const state = api.loadState() ?? { solved: {} };
    state.solved ??= {};

    function save() {
      api.saveState(state);
      const total = Object.values(state.solved).reduce((a, b) => a + b, 0);
      api.reportResult({ score: total * 20, summary: `решено кроссвордов: ${total}` });
    }

    function showMenu() {
      root.replaceChildren(
        el('div', { class: 'level-select' },
          el('p', { class: 'game-intro' },
            `${api.profile.emoji} ${api.profile.name}, разгадай кроссворд! Нажми на клетку и впиши букву — на iPad можно писать пером прямо в клетку.`),
          el('div', { class: 'level-grid' },
            ...LEVELS.map((level) =>
              el('button', { class: 'level-card', onclick: () => startPuzzle(level) },
                el('div', { class: 'level-icon' }, level.icon),
                el('div', { class: 'level-name' }, level.title),
                el('div', { class: 'level-hint' }, level.hint),
                el('div', { class: 'level-best' },
                  state.solved[level.n] ? `решено: ${state.solved[level.n]}` : 'Ещё не решён'),
              ),
            ),
          ),
        ),
      );
    }

    function startPuzzle(level) {
      const puzzle = genCrossword(level.cfg);
      const inputs = new Map();   // "r,c" -> <input>
      const wraps = new Map();    // "r,c" -> клетка
      const solvedEntries = new Set();
      let current = null;         // { entry, index }
      let hints = 0;
      let finished = false;

      const clueEl = el('div', { class: 'cw-current-clue' });

      const gridEl = el('div', { class: 'cw-grid', style: `--cols:${puzzle.cols}` });

      for (let r = 0; r < puzzle.rows; r++) {
        for (let c = 0; c < puzzle.cols; c++) {
          if (!puzzle.grid[r][c]) {
            gridEl.append(el('div', { class: 'cw-block' }));
            continue;
          }
          const input = el('input', {
            class: 'cw-input',
            type: 'text',
            autocapitalize: 'characters',
            autocomplete: 'off',
            autocorrect: 'off',
            spellcheck: 'false',
            'aria-label': `Клетка ${r + 1}, ${c + 1}`,
            oninput: () => onInput(r, c),
            onkeydown: (event) => onKeyDown(event, r, c),
            onfocus: () => focusCell(r, c, { keepDir: true }),
            onpointerdown: () => {
              // повторное нажатие на активную клетку — сменить направление
              if (current && current.entry && isCurrentCell(r, c)) toggleDirection(r, c);
            },
          });
          const wrap = el('div', { class: 'cw-cell' },
            puzzle.numbers[r][c] ? el('span', { class: 'cw-num' }, puzzle.numbers[r][c]) : '',
            input);
          inputs.set(cellKey(r, c), input);
          wraps.set(cellKey(r, c), wrap);
          gridEl.append(wrap);
        }
      }

      const isCurrentCell = (r, c) => {
        if (!current) return false;
        const [cr, cc] = entryCells(current.entry)[current.index];
        return cr === r && cc === c;
      };

      const entriesAt = (r, c) => puzzle.entries.filter((entry) =>
        entryCells(entry).some(([er, ec]) => er === r && ec === c));

      function setCurrent(entry, index) {
        current = { entry, index };
        for (const wrap of wraps.values()) wrap.classList.remove('active', 'in-word');
        entryCells(entry).forEach(([r, c]) => wraps.get(cellKey(r, c))?.classList.add('in-word'));
        const [r, c] = entryCells(entry)[index];
        wraps.get(cellKey(r, c))?.classList.add('active');
        clueEl.textContent = `${entry.number} ${entry.dir === 'across' ? 'по горизонтали' : 'по вертикали'}: ${entry.clue}`;
        for (const item of root.querySelectorAll('.cw-clue')) {
          item.classList.toggle('active', item.dataset.entry === entryKey(entry));
        }
      }

      function focusCell(r, c, { keepDir = false } = {}) {
        const list = entriesAt(r, c);
        if (!list.length) return;
        let entry = list[0];
        if (keepDir && current) {
          const same = list.find((e) => e.dir === current.entry.dir);
          if (same) entry = same;
        }
        const index = entryCells(entry).findIndex(([er, ec]) => er === r && ec === c);
        setCurrent(entry, index);
      }

      function toggleDirection(r, c) {
        const list = entriesAt(r, c);
        if (list.length < 2) return;
        const other = list.find((e) => e.dir !== current.entry.dir);
        if (!other) return;
        const index = entryCells(other).findIndex(([er, ec]) => er === r && ec === c);
        setCurrent(other, index);
      }

      function focusInput(r, c) {
        const input = inputs.get(cellKey(r, c));
        if (input) input.focus();
      }

      function advance() {
        if (!current) return;
        const cells = entryCells(current.entry);
        for (let i = current.index + 1; i < cells.length; i++) {
          const [r, c] = cells[i];
          if (!inputs.get(cellKey(r, c)).readOnly) {
            focusInput(r, c);
            return;
          }
        }
      }

      function stepBack() {
        if (!current || current.index === 0) return;
        const [r, c] = entryCells(current.entry)[current.index - 1];
        focusInput(r, c);
      }

      function onInput(r, c) {
        const input = inputs.get(cellKey(r, c));
        // Перо и автозамена могут прислать несколько символов — берём последнюю букву
        const raw = input.value.replace(/[Ёё]/g, 'Е').toUpperCase();
        const letters = raw.match(/[А-Я]/g);
        const letter = letters ? letters[letters.length - 1] : '';
        input.value = letter;
        wraps.get(cellKey(r, c))?.classList.remove('bad');
        checkAround(r, c);
        if (letter && !finished) advance();
      }

      function onKeyDown(event, r, c) {
        const moves = {
          ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
        };
        if (moves[event.key]) {
          const [dr, dc] = moves[event.key];
          for (let rr = r + dr, cc = c + dc;
            rr >= 0 && rr < puzzle.rows && cc >= 0 && cc < puzzle.cols;
            rr += dr, cc += dc) {
            if (inputs.has(cellKey(rr, cc))) {
              event.preventDefault();
              focusInput(rr, cc);
              return;
            }
          }
          return;
        }
        if (event.key === 'Backspace') {
          const input = inputs.get(cellKey(r, c));
          if (!input.value && !input.readOnly) {
            event.preventDefault();
            stepBack();
          }
        }
      }

      // Проверяем слова, проходящие через клетку: заполнено целиком — сверяем.
      function checkAround(r, c) {
        for (const entry of entriesAt(r, c)) {
          if (solvedEntries.has(entryKey(entry))) continue;
          const cells = entryCells(entry);
          const typed = cells.map(([er, ec]) => inputs.get(cellKey(er, ec)).value).join('');
          if (typed.length < entry.word.length) continue;
          if (typed === entry.word) {
            solvedEntries.add(entryKey(entry));
            sound.right();
            cells.forEach(([er, ec]) => {
              const wrap = wraps.get(cellKey(er, ec));
              wrap.classList.add('done');
              inputs.get(cellKey(er, ec)).readOnly = true;
            });
            for (const item of root.querySelectorAll('.cw-clue')) {
              if (item.dataset.entry === entryKey(entry)) item.classList.add('done');
            }
            if (solvedEntries.size === puzzle.entries.length) finish();
          } else {
            sound.wrong();
            cells.forEach(([er, ec]) => {
              const wrap = wraps.get(cellKey(er, ec));
              if (!wrap.classList.contains('done')) {
                wrap.classList.add('bad');
                setTimeout(() => wrap.classList.remove('bad'), 700);
              }
            });
          }
        }
      }

      function hint() {
        if (finished) return;
        const pending = puzzle.entries.filter((entry) => !solvedEntries.has(entryKey(entry)));
        if (!pending.length) return;
        const entry = current && !solvedEntries.has(entryKey(current.entry)) ? current.entry : pick(pending);
        const wrong = entryCells(entry).filter(([r, c], i) =>
          inputs.get(cellKey(r, c)).value !== entry.word[i]);
        if (!wrong.length) return;
        const [r, c] = pick(wrong);
        const index = entryCells(entry).findIndex(([er, ec]) => er === r && ec === c);
        hints += 1;
        sound.unlock();
        const input = inputs.get(cellKey(r, c));
        input.value = entry.word[index];
        wraps.get(cellKey(r, c))?.classList.add('hinted');
        checkAround(r, c);
      }

      function finish() {
        finished = true;
        const stars = hints === 0 ? 3 : hints <= 2 ? 2 : 1;
        state.solved[level.n] = (state.solved[level.n] ?? 0) + 1;
        save();
        sound.win();
        confetti(120);
        setTimeout(() => {
          root.replaceChildren(
            el('div', { class: 'results' },
              starsEl(stars),
              el('h2', {}, 'Кроссворд разгадан!'),
              el('p', { class: 'results-score' },
                hints === 0 ? 'Ни одной подсказки — отлично!' : `Использовано подсказок: ${hints}`),
              el('div', { class: 'results-actions' },
                el('button', { class: 'btn btn-primary', onclick: () => startPuzzle(level) }, 'Ещё один 🔁'),
                el('button', { class: 'btn', onclick: showMenu }, 'К уровням 📗'),
              ),
            ),
          );
        }, 700);
      }

      const clueList = (title, entries) =>
        el('div', { class: 'cw-clue-col' },
          el('h3', {}, title),
          ...entries.map((entry) =>
            el('button', {
              class: 'cw-clue',
              'data-entry': entryKey(entry),
              onclick: () => {
                const cells = entryCells(entry);
                const target = cells.find(([r, c]) => !inputs.get(cellKey(r, c)).value) ?? cells[0];
                setCurrent(entry, cells.indexOf(target));
                focusInput(target[0], target[1]);
              },
            },
              el('b', {}, `${entry.number}. `),
              entry.clue),
          ),
        );

      root.replaceChildren(
        el('div', { class: 'cw-wrap' },
          el('div', { class: 'round-top' },
            el('span', {}, `${level.icon} Кроссворд «${level.title}»`),
            el('span', {}, `Слов: ${puzzle.entries.length}`),
          ),
          clueEl,
          el('div', { class: 'cw-grid-scroll' }, gridEl),
          el('div', { class: 'game-toolbar' },
            el('button', { class: 'btn', onclick: hint }, '💡 Подсказка'),
            el('button', { class: 'btn', onclick: showMenu }, '🚪 К уровням'),
          ),
          el('div', { class: 'cw-clues' },
            clueList('По горизонтали', puzzle.across),
            clueList('По вертикали', puzzle.down),
          ),
        ),
      );

      if (puzzle.across.length) {
        setCurrent(puzzle.across[0], 0);
      }
    }

    showMenu();
  },

  unmount() {},
};
