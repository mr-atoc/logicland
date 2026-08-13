import { el, randInt } from '../../core/dom.js';
import { sound } from '../../core/sound.js';
import { confetti, starsEl } from '../../core/fx.js';
import { genMaze, genPolarMaze, polarPassable } from './generator.js';

const LEVELS = [
  { n: 1, kind: 'square', size: 8, title: 'Мышиная норка', hint: 'квадратный 8×8', icon: '🌀' },
  { n: 2, kind: 'square', size: 12, title: 'Лисий лес', hint: 'квадратный 12×12', icon: '🌀' },
  { n: 3, kind: 'square', size: 16, title: 'Драконье подземелье', hint: 'квадратный 16×16', icon: '🌀' },
  { n: 4, kind: 'square', size: 20, title: 'Пещера великана', hint: 'квадратный 20×20', icon: '🌀' },
  { n: 5, kind: 'square', size: 24, title: 'Королевский лабиринт', hint: 'квадратный 24×24', icon: '🌀' },
  { n: 6, kind: 'polar', rings: 5, sectors: 12, title: 'Улитка', hint: 'круговой, 5 колец', icon: '🐌' },
  { n: 7, kind: 'polar', rings: 7, sectors: 16, title: 'Паутина', hint: 'круговой, 7 колец', icon: '🕸️' },
  { n: 8, kind: 'polar', rings: 9, sectors: 20, title: 'Циклон', hint: 'круговой, 9 колец', icon: '🌪️' },
];

const SVG_NS = 'http://www.w3.org/2000/svg';

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
            `${api.profile.emoji} ${api.profile.name}, помоги мышонку 🐭 добраться до сыра 🧀! Веди дорожку пальцем или мышкой — а в квадратных лабиринтах можно и стрелками.`),
          el('div', { class: 'level-grid' },
            ...LEVELS.map((level) =>
              el('button', { class: 'level-card', onclick: () => startMaze(level) },
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

    function win(level, steps) {
      detachKeys();
      state.solved[level.n] = (state.solved[level.n] ?? 0) + 1;
      save();
      sound.win();
      confetti();
      root.replaceChildren(
        el('div', { class: 'results' },
          starsEl(3),
          el('h2', {}, 'Сыр найден!'),
          el('p', { class: 'results-score' }, `Длина пути: ${steps} шагов.`),
          el('div', { class: 'results-actions' },
            el('button', { class: 'btn btn-primary', onclick: () => startMaze(level) }, 'Ещё раз 🔁'),
            el('button', { class: 'btn', onclick: showMenu }, 'К лабиринтам 🌀'),
          ),
        ),
      );
    }

    function startMaze(level) {
      detachKeys();
      if (level.kind === 'polar') startPolar(level);
      else startSquare(level);
    }

    // ---------- Квадратный лабиринт ----------
    function startSquare(level) {
      const n = level.size;
      const maze = genMaze(n);
      const path = [[0, 0]];
      let finished = false;

      const cellEls = [];
      // размер поля и шрифта считаем одной формулой: квадрат, влезающий и по ширине, и по высоте
      const sizeExpr = 'min(92vw, 520px, 100dvh - 210px)';
      const gridEl = el('div', {
        class: 'maze-grid',
        style: `grid-template-columns: repeat(${n}, minmax(0, 1fr)); font-size: calc(${sizeExpr} / ${n} * 0.62)`,
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
      const stepsEl = el('span', {}, 'Путь: 0');

      const endCell = () => path[path.length - 1];

      function refresh(prev) {
        if (prev) cellEls[prev[0]][prev[1]].textContent = '';
        const [er, ec] = endCell();
        cellEls[n - 1][n - 1].textContent = '🧀';
        cellEls[er][ec].textContent = '🐭';
        stepsEl.textContent = `Путь: ${path.length - 1}`;
      }

      function tryCell(r, c) {
        if (finished) return;
        const [er, ec] = endCell();
        if (r === er && c === ec) return;
        if (path.length > 1) {
          const [pr, pc] = path[path.length - 2];
          if (r === pr && c === pc) { // ведём назад — стираем шаг
            const removed = path.pop();
            cellEls[removed[0]][removed[1]].classList.remove('path');
            refresh(removed);
            return;
          }
        }
        const dr = r - er;
        const dc = c - ec;
        if (Math.abs(dr) + Math.abs(dc) !== 1) return;
        const wall = dr === -1 ? 't' : dr === 1 ? 'b' : dc === 1 ? 'r' : 'l';
        if (maze[er][ec][wall]) return;
        path.push([r, c]);
        cellEls[er][ec].classList.add('path');
        cellEls[r][c].classList.add('path');
        refresh([er, ec]);
        if (r === n - 1 && c === n - 1) {
          finished = true;
          win(level, path.length - 1);
        }
      }

      function step(dr, dc) {
        const [er, ec] = endCell();
        const nr = er + dr;
        const nc = ec + dc;
        if (nr < 0 || nr >= n || nc < 0 || nc >= n) return;
        tryCell(nr, nc);
      }

      const MOVES = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowRight: [0, 1], ArrowLeft: [0, -1] };
      keyHandler = (event) => {
        const m = MOVES[event.key];
        if (!m) return;
        event.preventDefault();
        step(...m);
      };
      window.addEventListener('keydown', keyHandler);

      function onPoint(event) {
        const rect = gridEl.getBoundingClientRect();
        const c = Math.floor(((event.clientX - rect.left) / rect.width) * n);
        const r = Math.floor(((event.clientY - rect.top) / rect.height) * n);
        if (r >= 0 && r < n && c >= 0 && c < n) tryCell(r, c);
      }
      gridEl.addEventListener('pointerdown', (event) => {
        try { gridEl.setPointerCapture(event.pointerId); } catch { /* не критично */ }
        onPoint(event);
      });
      gridEl.addEventListener('pointermove', (event) => {
        if (event.buttons) onPoint(event);
      });

      const padBtn = (label, dr, dc) =>
        el('button', { class: 'pad-btn maze-pad-btn', onclick: () => step(dr, dc) }, label);

      root.replaceChildren(
        el('div', { class: 'maze-wrap with-pad' },
          el('div', { class: 'round-top' },
            el('span', {}, `${level.icon} ${level.title}`),
            stepsEl,
          ),
          gridEl,
          el('div', { class: 'game-toolbar' },
            el('button', { class: 'btn', onclick: showMenu }, '🚪 К лабиринтам'),
          ),
        ),
        // кнопки — отдельно от анимированной обёртки, иначе position:fixed
        // прибьётся к трансформированному предку, а не к экрану
        el('div', { class: 'maze-controls' },
          el('div', { class: 'maze-cluster maze-cluster-v' },
            padBtn('⬆️', -1, 0),
            padBtn('⬇️', 1, 0),
          ),
          el('div', { class: 'maze-cluster' },
            padBtn('⬅️', 0, -1),
            padBtn('➡️', 0, 1),
          ),
        ),
      );
      cellEls[0][0].classList.add('path');
      refresh();
    }

    // ---------- Круговой лабиринт ----------
    function startPolar(level) {
      const { rings, sectors } = level;
      const maze = genPolarMaze(rings, sectors);
      const exit = { r: rings - 1, s: randInt(0, sectors - 1) };
      const path = [{ r: 0, s: 0 }];
      let finished = false;

      const SZ = 500;
      const CX = SZ / 2;
      const CY = SZ / 2;
      const R0 = 62;
      const RMAX = 236;
      const t = (RMAX - R0) / rings;
      const astep = (Math.PI * 2) / sectors;
      const ptAt = (radius, angle) => [CX + radius * Math.cos(angle), CY + radius * Math.sin(angle)];
      const cellCenter = ({ r, s }) => ptAt(R0 + t * (r + 0.5), astep * (s + 0.5));

      // стены одной строкой SVG-пути
      let d = '';
      const arc = (radius, s) => {
        const [x0, y0] = ptAt(radius, astep * s);
        const [x1, y1] = ptAt(radius, astep * (s + 1));
        return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${radius} ${radius} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)} `;
      };
      const radial = (s, ringFrom) => {
        const a = astep * s;
        const [x0, y0] = ptAt(R0 + t * ringFrom, a);
        const [x1, y1] = ptAt(R0 + t * (ringFrom + 1), a);
        return `M ${x0.toFixed(1)} ${y0.toFixed(1)} L ${x1.toFixed(1)} ${y1.toFixed(1)} `;
      };
      for (let r = 0; r < rings; r++) {
        for (let s = 0; s < sectors; s++) {
          if (maze.cw[r][s]) d += radial((s + 1) % sectors, r);
          if (r > 0 && maze.inner[r][s]) d += arc(R0 + t * r, s);
        }
      }
      for (let s = 0; s < sectors; s++) {
        if (s !== exit.s) d += arc(RMAX, s); // внешняя стена с выходом
        d += ''; // внутренняя граница ниже отдельным кругом
      }

      const svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('viewBox', `0 0 ${SZ} ${SZ}`);
      svg.setAttribute('class', 'maze-svg');
      const wallsEl = document.createElementNS(SVG_NS, 'path');
      wallsEl.setAttribute('d', d);
      wallsEl.setAttribute('class', 'maze-walls');
      const centerRing = document.createElementNS(SVG_NS, 'circle');
      centerRing.setAttribute('cx', CX);
      centerRing.setAttribute('cy', CY);
      centerRing.setAttribute('r', R0);
      centerRing.setAttribute('class', 'maze-walls');
      centerRing.setAttribute('fill', 'none');
      const trailEl = document.createElementNS(SVG_NS, 'polyline');
      trailEl.setAttribute('class', 'maze-trail');
      const cheeseEl = document.createElementNS(SVG_NS, 'text');
      cheeseEl.setAttribute('class', 'maze-emoji');
      cheeseEl.setAttribute('font-size', Math.max(t * 0.7, 16));
      const mouseEl = document.createElementNS(SVG_NS, 'text');
      mouseEl.setAttribute('class', 'maze-emoji');
      mouseEl.setAttribute('font-size', Math.max(t * 0.8, 18));
      svg.append(wallsEl, centerRing, trailEl, cheeseEl, mouseEl);

      const stepsEl = el('span', {}, 'Путь: 0');
      const endCell = () => path[path.length - 1];

      function placeText(node, cell, label) {
        const [x, y] = cellCenter(cell);
        node.setAttribute('x', x);
        node.setAttribute('y', y);
        node.textContent = label;
      }

      function refresh() {
        trailEl.setAttribute('points', path.map((cell) => cellCenter(cell).map((v) => v.toFixed(1)).join(',')).join(' '));
        placeText(cheeseEl, exit, '🧀');
        placeText(mouseEl, endCell(), '🐭');
        stepsEl.textContent = `Путь: ${path.length - 1}`;
      }

      function tryCell(target) {
        if (finished) return;
        const end = endCell();
        if (target.r === end.r && target.s === end.s) return;
        if (path.length > 1) {
          const prev = path[path.length - 2];
          if (target.r === prev.r && target.s === prev.s) {
            path.pop();
            refresh();
            return;
          }
        }
        if (!polarPassable(maze, end, target)) return;
        path.push(target);
        refresh();
        if (target.r === exit.r && target.s === exit.s) {
          finished = true;
          win(level, path.length - 1);
        }
      }

      function onPoint(event) {
        const rect = svg.getBoundingClientRect();
        const scale = SZ / rect.width;
        const x = (event.clientX - rect.left) * scale - CX;
        const y = (event.clientY - rect.top) * scale - CY;
        const radius = Math.hypot(x, y);
        const angle = (Math.atan2(y, x) + Math.PI * 2) % (Math.PI * 2);
        const r = Math.floor((radius - R0) / t);
        const s = Math.floor(angle / astep);
        if (r >= 0 && r < rings && s >= 0 && s < sectors) tryCell({ r, s });
      }
      svg.addEventListener('pointerdown', (event) => {
        try { svg.setPointerCapture(event.pointerId); } catch { /* не критично */ }
        onPoint(event);
      });
      svg.addEventListener('pointermove', (event) => {
        if (event.buttons) onPoint(event);
      });

      root.replaceChildren(
        el('div', { class: 'maze-wrap' },
          el('div', { class: 'round-top' },
            el('span', {}, `${level.icon} ${level.title}`),
            stepsEl,
          ),
          svg,
          el('p', { class: 'ws-help' }, 'Веди дорожку от центра к выходу наружу.'),
          el('div', { class: 'game-toolbar' },
            el('button', { class: 'btn', onclick: showMenu }, '🚪 К лабиринтам'),
          ),
        ),
      );
      refresh();
    }

    showMenu();
  },

  unmount() {},
};
