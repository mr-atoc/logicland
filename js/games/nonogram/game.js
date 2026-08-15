import { el, pick } from '../../core/dom.js';
import { sound } from '../../core/sound.js';
import { confetti, starsEl } from '../../core/fx.js';
import { cluesFor } from './solver.js';
import { genNonogram } from './generator.js';

const LEVELS = [
  { n: 1, size: 5, title: 'Первые шаги', hint: 'поле 5×5', icon: '🟦', pictures: true },
  { n: 2, size: 10, title: 'Картинка', hint: 'поле 10×10', icon: '🖼️', pictures: true },
  { n: 3, size: 15, title: 'Мастер', hint: 'поле 15×15, узор', icon: '🎨', pictures: false },
];

const key = (r, c) => `${r},${c}`;

export default {
  mount(root, api) {
    const state = api.loadState() ?? { solved: {}, lastPicture: {} };
    state.solved ??= {};
    state.lastPicture ??= {};

    function save() {
      api.saveState(state);
      const total = Object.values(state.solved).reduce((a, b) => a + b, 0);
      api.reportResult({ score: total * 20, summary: `разгадано картинок: ${total}` });
    }

    function showMenu() {
      root.replaceChildren(
        el('div', { class: 'level-select' },
          el('p', { class: 'game-intro' },
            `${api.profile.emoji} ${api.profile.name}, числа слева и сверху говорят, сколько клеток закрашено подряд. Закрась нужные — и проявится картинка!`),
          el('div', { class: 'level-grid' },
            ...LEVELS.map((level) =>
              el('button', { class: 'level-card', onclick: () => startPuzzle(level) },
                el('div', { class: 'level-icon' }, level.icon),
                el('div', { class: 'level-name' }, level.title),
                el('div', { class: 'level-hint' }, level.hint),
                el('div', { class: 'level-best' },
                  state.solved[level.n] ? `разгадано: ${state.solved[level.n]}` : 'Ещё не разгадано'),
              ),
            ),
          ),
        ),
      );
    }

    function startPuzzle(level) {
      const size = level.size;
      const puzzle = genNonogram(size, {
        usePictures: level.pictures,
        excludeName: state.lastPicture[level.n] ?? null,
      });
      if (puzzle.name) {
        state.lastPicture[level.n] = puzzle.name;
        api.saveState(state);
      }

      // 0 — не тронута, 1 — закрашена, 2 — помечена пустой
      const marks = Array.from({ length: size }, () => new Array(size).fill(0));
      const cells = new Map();
      let mode = 'fill';
      let hints = 0;
      let finished = false;
      let dragAction = null;
      let dragging = false;

      const gridEl = el('div', { class: 'ng-grid' });
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const classes = ['ng-cell'];
          if ((c + 1) % 5 === 0 && c !== size - 1) classes.push('edge-right');
          if ((r + 1) % 5 === 0 && r !== size - 1) classes.push('edge-bottom');
          const cell = el('div', { class: classes.join(' '), 'data-r': r, 'data-c': c });
          cells.set(key(r, c), cell);
          gridEl.append(cell);
        }
      }

      const rowClueEls = [];
      const colClueEls = [];
      const rowCluesEl = el('div', { class: 'ng-row-clues' },
        ...puzzle.rowClues.map((clue) => {
          const node = el('div', { class: 'ng-clue-line' },
            ...(clue.length ? clue : [0]).map((n) => el('span', {}, n)));
          rowClueEls.push(node);
          return node;
        }),
      );
      const colCluesEl = el('div', { class: 'ng-col-clues' },
        ...puzzle.colClues.map((clue) => {
          const node = el('div', { class: 'ng-clue-line ng-clue-col' },
            ...(clue.length ? clue : [0]).map((n) => el('span', {}, n)));
          colClueEls.push(node);
          return node;
        }),
      );

      const maxRowClue = Math.max(1, ...puzzle.rowClues.map((c) => c.length || 1));
      const maxColClue = Math.max(1, ...puzzle.colClues.map((c) => c.length || 1));

      function renderCell(r, c) {
        const cell = cells.get(key(r, c));
        cell.classList.toggle('filled', marks[r][c] === 1);
        cell.classList.toggle('crossed', marks[r][c] === 2);
      }

      // Подсказка гаснет, когда линия закрашена ровно по ней.
      function refreshClues() {
        for (let r = 0; r < size; r++) {
          const actual = cluesFor(marks[r].map((v) => (v === 1 ? 1 : 0)));
          const done = JSON.stringify(actual) === JSON.stringify(puzzle.rowClues[r]);
          rowClueEls[r].classList.toggle('done', done);
        }
        for (let c = 0; c < size; c++) {
          const line = marks.map((row) => (row[c] === 1 ? 1 : 0));
          const done = JSON.stringify(cluesFor(line)) === JSON.stringify(puzzle.colClues[c]);
          colClueEls[c].classList.toggle('done', done);
        }
      }

      function checkWin() {
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            const shouldFill = puzzle.grid[r][c] === 1;
            if (shouldFill !== (marks[r][c] === 1)) return;
          }
        }
        finish();
      }

      function setMark(r, c, value) {
        if (finished || marks[r][c] === value) return;
        marks[r][c] = value;
        renderCell(r, c);
        refreshClues();
        if (value === 1) checkWin();
      }

      function cellFromPoint(event) {
        const rect = gridEl.getBoundingClientRect();
        const c = Math.floor(((event.clientX - rect.left) / rect.width) * size);
        const r = Math.floor(((event.clientY - rect.top) / rect.height) * size);
        if (r < 0 || r >= size || c < 0 || c >= size) return null;
        return [r, c];
      }

      // Быстрый штрих перепрыгивает клетки — закрашиваем пропущенные по прямой.
      let lastPainted = null;
      function paintTo(r, c) {
        if (dragAction === null) return;
        if (lastPainted && (lastPainted[0] === r || lastPainted[1] === c)) {
          const dr = Math.sign(r - lastPainted[0]);
          const dc = Math.sign(c - lastPainted[1]);
          let [cr, cc] = lastPainted;
          while (cr !== r || cc !== c) {
            cr += dr;
            cc += dc;
            setMark(cr, cc, dragAction);
          }
        } else {
          setMark(r, c, dragAction);
        }
        lastPainted = [r, c];
      }

      gridEl.addEventListener('pointerdown', (event) => {
        const cell = cellFromPoint(event);
        if (!cell || finished) return;
        event.preventDefault();
        try { gridEl.setPointerCapture(event.pointerId); } catch { /* не критично */ }
        const [r, c] = cell;
        const target = mode === 'fill' ? 1 : 2;
        dragAction = marks[r][c] === target ? 0 : target;
        dragging = true;
        lastPainted = null;
        sound.tap();
        paintTo(r, c);
      });

      gridEl.addEventListener('pointermove', (event) => {
        if (!dragging) return;
        const points = event.getCoalescedEvents?.() ?? [];
        for (const point of (points.length ? points : [event])) {
          const cell = cellFromPoint(point);
          if (!cell) continue;
          if (lastPainted && lastPainted[0] === cell[0] && lastPainted[1] === cell[1]) continue;
          paintTo(cell[0], cell[1]);
        }
      });

      const endDrag = () => {
        dragging = false;
        dragAction = null;
        lastPainted = null;
      };
      gridEl.addEventListener('pointerup', endDrag);
      gridEl.addEventListener('pointercancel', endDrag);

      const modeBtn = el('button', {
        class: 'btn',
        onclick: () => {
          mode = mode === 'fill' ? 'cross' : 'fill';
          sound.tap();
          modeBtn.textContent = mode === 'fill' ? '✏️ Закрашиваю' : '✖️ Отмечаю пустые';
          modeBtn.classList.toggle('mode-cross', mode === 'cross');
        },
      }, '✏️ Закрашиваю');

      function hint() {
        if (finished) return;
        const wrong = [];
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            const shouldFill = puzzle.grid[r][c] === 1;
            if (shouldFill && marks[r][c] !== 1) wrong.push([r, c, 1]);
            else if (!shouldFill && marks[r][c] === 1) wrong.push([r, c, 0]);
          }
        }
        if (!wrong.length) return;
        const [r, c, value] = pick(wrong);
        hints += 1;
        sound.unlock();
        setMark(r, c, value);
        cells.get(key(r, c)).classList.add('hinted');
      }

      function finish() {
        finished = true;
        const stars = hints === 0 ? 3 : hints <= 2 ? 2 : 1;
        state.solved[level.n] = (state.solved[level.n] ?? 0) + 1;
        save();
        sound.win();
        confetti(120);
        // даём полюбоваться картинкой, потом показываем результат
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            if (marks[r][c] === 2) cells.get(key(r, c)).classList.remove('crossed');
          }
        }
        setTimeout(() => {
          root.replaceChildren(
            el('div', { class: 'results' },
              starsEl(stars),
              el('h2', {}, puzzle.name ? `Это ${puzzle.name.toLowerCase()}!` : 'Узор проявился!'),
              el('p', { class: 'results-score' },
                hints === 0 ? 'Ни одной подсказки — отлично!' : `Использовано подсказок: ${hints}`),
              el('div', { class: 'ng-preview' },
                ...puzzle.grid.flatMap((row) => row.map((v) =>
                  el('div', { class: `ng-preview-cell${v ? ' filled' : ''}` }))),
              ),
              el('div', { class: 'results-actions' },
                el('button', { class: 'btn btn-primary', onclick: () => startPuzzle(level) }, 'Ещё одну 🔁'),
                el('button', { class: 'btn', onclick: showMenu }, 'К уровням 🟦'),
              ),
            ),
          );
          const preview = root.querySelector('.ng-preview');
          if (preview) preview.style.setProperty('--cols', size);
        }, 1400);
      }

      const boardEl = el('div', {
        class: 'ng-board',
        style: `--cols:${size}; --clue-cols:${maxRowClue}; --clue-rows:${maxColClue}`,
      },
        el('div', { class: 'ng-corner' }),
        colCluesEl,
        rowCluesEl,
        gridEl,
      );

      // Размер клетки считаем сами: поле вместе с подсказками должно влезать
      // и по ширине, и по высоте (иначе на телефоне поле уезжает за экран).
      function layout() {
        const byWidth = Math.min(window.innerWidth * 0.92, 520) / (size + maxRowClue * 0.62);
        const byHeight = (window.innerHeight - 260) / (size + maxColClue * 0.62);
        const cell = Math.max(14, Math.min(34, byWidth, byHeight));
        boardEl.style.setProperty('--cell', `${cell.toFixed(2)}px`);
      }
      const onResize = () => {
        if (!boardEl.isConnected) {
          window.removeEventListener('resize', onResize);
          return;
        }
        layout();
      };
      window.addEventListener('resize', onResize);

      root.replaceChildren(
        el('div', { class: 'ng-wrap' },
          el('div', { class: 'round-top' },
            el('span', {}, `${level.icon} ${level.title}`),
            el('span', {}, `${size}×${size}`),
          ),
          boardEl,
          el('div', { class: 'game-toolbar' },
            modeBtn,
            el('button', { class: 'btn', onclick: hint }, '💡 Подсказка'),
            el('button', { class: 'btn', onclick: showMenu }, '🚪 К уровням'),
          ),
          el('p', { class: 'ws-help' },
            'Числа — это сколько клеток закрашено подряд. Веди пальцем или пером, чтобы закрасить сразу несколько.'),
        ),
      );
      layout();
      refreshClues();
    }

    showMenu();
  },

  unmount() {},
};
