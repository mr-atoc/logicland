import { el, pick } from '../../core/dom.js';
import { sound } from '../../core/sound.js';
import { confetti, starsEl } from '../../core/fx.js';
import { genBridges, possiblePairs } from './generator.js';

const LEVELS = [
  { n: 1, size: 7, islands: 8, title: 'Островки', hint: 'поле 7×7, 8 островов', icon: '🏝️' },
  { n: 2, size: 9, islands: 12, title: 'Архипелаг', hint: 'поле 9×9, 12 островов', icon: '🌊' },
  { n: 3, size: 11, islands: 16, title: 'Большой залив', hint: 'поле 11×11, 16 островов', icon: '⛵' },
];

const SVG_NS = 'http://www.w3.org/2000/svg';
const svgNode = (tag, attrs = {}) => {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
};

const idOf = (island) => `${island.r},${island.c}`;
const pairId = (a, b) => (a.r < b.r || (a.r === b.r && a.c < b.c)
  ? `${idOf(a)}|${idOf(b)}` : `${idOf(b)}|${idOf(a)}`);

export default {
  mount(root, api) {
    const state = api.loadState() ?? { solved: {} };
    state.solved ??= {};

    function save() {
      api.saveState(state);
      const total = Object.values(state.solved).reduce((a, b) => a + b, 0);
      api.reportResult({ score: total * 20, summary: `собрано мостов: ${total}` });
    }

    function showMenu() {
      root.replaceChildren(
        el('div', { class: 'level-select' },
          el('p', { class: 'game-intro' },
            `${api.profile.emoji} ${api.profile.name}, число на острове — сколько мостов к нему подходит. Соедини все острова так, чтобы можно было добраться от любого до любого!`),
          el('div', { class: 'level-grid' },
            ...LEVELS.map((level) =>
              el('button', { class: 'level-card', onclick: () => startPuzzle(level) },
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

    function startPuzzle(level) {
      const puzzle = genBridges(level.size, level.islands)
        ?? genBridges(level.size, Math.max(6, level.islands - 3));
      if (!puzzle) { showMenu(); return; }

      const { size, islands } = puzzle;
      const pairs = possiblePairs(islands, size);
      const pairById = new Map(pairs.map((p) => [pairId(p.a, p.b), p]));
      const counts = new Map();      // pairId -> 0..2
      const busy = new Map();        // "r,c" -> pairId
      let selected = null;
      let dragFrom = null;
      let hints = 0;
      let finished = false;

      const STEP = 100;
      const svg = svgNode('svg', {
        viewBox: `0 0 ${size * STEP} ${size * STEP}`,
        class: 'br-svg',
      });

      const xOf = (c) => c * STEP + STEP / 2;
      const yOf = (r) => r * STEP + STEP / 2;

      const degreeNow = (island) => {
        let sum = 0;
        for (const pair of pairs) {
          if (pair.a === island || pair.b === island) sum += counts.get(pairId(pair.a, pair.b)) ?? 0;
        }
        return sum;
      };

      function allConnected() {
        const seen = new Set([idOf(islands[0])]);
        const stack = [islands[0]];
        while (stack.length) {
          const island = stack.pop();
          for (const pair of pairs) {
            if (!(counts.get(pairId(pair.a, pair.b)) > 0)) continue;
            const other = pair.a === island ? pair.b : (pair.b === island ? pair.a : null);
            if (other && !seen.has(idOf(other))) { seen.add(idOf(other)); stack.push(other); }
          }
        }
        return seen.size === islands.length;
      }

      function render() {
        svg.replaceChildren();
        // мосты
        for (const pair of pairs) {
          const count = counts.get(pairId(pair.a, pair.b)) ?? 0;
          if (!count) continue;
          const horizontal = pair.a.r === pair.b.r;
          const offsets = count === 1 ? [0] : [-11, 11];
          for (const offset of offsets) {
            svg.append(svgNode('line', {
              class: 'br-bridge',
              x1: xOf(pair.a.c) + (horizontal ? 0 : offset),
              y1: yOf(pair.a.r) + (horizontal ? offset : 0),
              x2: xOf(pair.b.c) + (horizontal ? 0 : offset),
              y2: yOf(pair.b.r) + (horizontal ? offset : 0),
            }));
          }
        }
        // острова
        for (const island of islands) {
          const done = degreeNow(island) === island.degree;
          const classes = ['br-island'];
          if (done) classes.push('done');
          if (selected === island) classes.push('sel');
          svg.append(svgNode('circle', {
            class: classes.join(' '),
            cx: xOf(island.c), cy: yOf(island.r), r: STEP * 0.36,
          }));
          const text = svgNode('text', {
            class: `br-num${done ? ' done' : ''}`,
            x: xOf(island.c), y: yOf(island.r),
          });
          text.textContent = island.degree;
          svg.append(text);
        }
      }

      function setCount(pair, count) {
        const id = pairId(pair.a, pair.b);
        const current = counts.get(id) ?? 0;
        if (count === current) return true;
        if (count > 0 && current === 0) {
          // клетки под мостом должны быть свободны
          if (pair.cells.some(([r, c]) => busy.has(`${r},${c}`))) return false;
          pair.cells.forEach(([r, c]) => busy.set(`${r},${c}`, id));
        }
        if (count === 0) pair.cells.forEach(([r, c]) => busy.delete(`${r},${c}`));
        counts.set(id, count);
        return true;
      }

      function toggle(a, b) {
        if (finished) return;
        const pair = pairById.get(pairId(a, b));
        if (!pair) { sound.wrong(); return; }
        const id = pairId(a, b);
        const next = ((counts.get(id) ?? 0) + 1) % 3;
        if (!setCount(pair, next)) { sound.wrong(); return; }
        sound.tap();
        render();
        checkWin();
      }

      function checkWin() {
        if (islands.some((island) => degreeNow(island) !== island.degree)) return;
        if (!allConnected()) return;
        finish();
      }

      function islandAt(event) {
        const rect = svg.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * size * STEP;
        const y = ((event.clientY - rect.top) / rect.height) * size * STEP;
        // зона нажатия шире самого острова — на телефоне пальцем иначе не попасть;
        // острова стоят не ближе чем через клетку, так что перепутать их нельзя
        return islands.find((island) =>
          Math.hypot(x - xOf(island.c), y - yOf(island.r)) <= STEP * 0.8) ?? null;
      }

      svg.addEventListener('pointerdown', (event) => {
        if (finished) return;
        const island = islandAt(event);
        if (!island) { selected = null; render(); return; }
        event.preventDefault();
        try { svg.setPointerCapture(event.pointerId); } catch { /* не критично */ }
        dragFrom = island;
        if (selected && selected !== island) {
          toggle(selected, island);
          selected = null;
        } else {
          selected = selected === island ? null : island;
        }
        render();
      });

      svg.addEventListener('pointerup', (event) => {
        if (finished || !dragFrom) return;
        const island = islandAt(event);
        if (island && island !== dragFrom) {
          toggle(dragFrom, island);
          selected = null;
          render();
        }
        dragFrom = null;
      });

      function hint() {
        if (finished) return;
        const missing = puzzle.solution
          .map((b) => {
            const a = islands.find((i) => i.r === b.a.r && i.c === b.a.c);
            const other = islands.find((i) => i.r === b.b.r && i.c === b.b.c);
            const pair = pairById.get(pairId(a, other));
            return pair && (counts.get(pairId(a, other)) ?? 0) !== b.count ? { pair, count: b.count } : null;
          })
          .filter(Boolean);
        if (!missing.length) return;
        const { pair, count } = pick(missing);
        hints += 1;
        sound.unlock();
        setCount(pair, 0);
        setCount(pair, count);
        selected = null;
        render();
        checkWin();
      }

      function clearAll() {
        for (const pair of pairs) setCount(pair, 0);
        selected = null;
        sound.tap();
        render();
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
              el('h2', {}, 'Все острова соединены!'),
              el('p', { class: 'results-score' },
                hints === 0 ? 'Ни одной подсказки — отлично!' : `Использовано подсказок: ${hints}`),
              el('div', { class: 'results-actions' },
                el('button', { class: 'btn btn-primary', onclick: () => startPuzzle(level) }, 'Ещё одну 🔁'),
                el('button', { class: 'btn', onclick: showMenu }, 'К уровням 🏝️'),
              ),
            ),
          );
        }, 800);
      }

      root.replaceChildren(
        el('div', { class: 'br-wrap' },
          el('div', { class: 'round-top' },
            el('span', {}, `${level.icon} ${level.title}`),
            el('span', {}, `островов: ${islands.length}`),
          ),
          svg,
          el('div', { class: 'game-toolbar' },
            el('button', { class: 'btn', onclick: hint }, '💡 Подсказка'),
            el('button', { class: 'btn', onclick: clearAll }, '🧹 Убрать мосты'),
            el('button', { class: 'btn', onclick: showMenu }, '🚪 К уровням'),
          ),
          el('p', { class: 'ws-help' },
            'Нажми на два острова подряд — между ними появится мост. Ещё раз — второй мост, ещё раз — уберётся.'),
        ),
      );
      render();
    }

    showMenu();
  },

  unmount() {},
};
