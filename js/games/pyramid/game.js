import { el } from '../../core/dom.js';
import { sound } from '../../core/sound.js';
import { confetti, starsEl } from '../../core/fx.js';
import { genPyramid, cellOptions, genScales } from './generator.js';

// У высоких башен числа наверху большие, поэтому чем выше башня,
// тем меньше числа в основании (max) и тем ниже прячутся пропуски (minHideRow).
const LEVELS = [
  { n: 1, kind: 'pyramid', icon: '🧱', title: 'Башенка', hint: '3 этажа, 2 пропуска', cfg: { base: 3, max: 9, hide: 2 }, rounds: 3 },
  { n: 2, kind: 'pyramid', icon: '🏠', title: 'Домик', hint: '4 этажа, 4 пропуска', cfg: { base: 4, max: 9, hide: 4 }, rounds: 3 },
  { n: 3, kind: 'pyramid', icon: '🏰', title: 'Крепость', hint: '4 этажа, 6 пропусков', cfg: { base: 4, max: 12, hide: 6 }, rounds: 3 },
  { n: 4, kind: 'pyramid', icon: '🗼', title: 'Маяк', hint: '5 этажей, 6 пропусков', cfg: { base: 5, max: 9, hide: 6 }, rounds: 3 },
  { n: 5, kind: 'pyramid', icon: '🏯', title: 'Замок', hint: '6 этажей, 7 пропусков', cfg: { base: 6, max: 6, hide: 7, minHideRow: 1 }, rounds: 2 },
  { n: 6, kind: 'pyramid', icon: '🕰️', title: 'Часовая башня', hint: '7 этажей, 8 пропусков', cfg: { base: 7, max: 5, hide: 8, minHideRow: 2 }, rounds: 2 },
  { n: 7, kind: 'pyramid', icon: '🛡️', title: 'Сторожевая башня', hint: '8 этажей, 9 пропусков', cfg: { base: 8, max: 4, hide: 9, minHideRow: 3 }, rounds: 2 },
  { n: 8, kind: 'pyramid', icon: '🏢', title: 'Небоскрёб', hint: '9 этажей, 10 пропусков', cfg: { base: 9, max: 3, hide: 10, minHideRow: 4 }, rounds: 2 },
  { n: 9, kind: 'pyramid', icon: '🚀', title: 'Космическая башня', hint: '10 этажей, 12 пропусков', cfg: { base: 10, max: 3, hide: 12, minHideRow: 5 }, rounds: 2 },
  { n: 10, kind: 'scales', icon: '⚖️', title: 'Весы', hint: 'кто тяжелее?', rounds: 6 },
];

function starsFor(mistakes) {
  if (mistakes === 0) return 3;
  if (mistakes <= 2) return 2;
  return 1;
}

const starRow = (stars) => '⭐'.repeat(stars) || '—';

export default {
  mount(root, api) {
    const state = api.loadState() ?? { best: {} };
    state.best ??= {};
    // Раньше уровней было 4 и «Весы» шли четвёртыми; теперь между ними
    // добавлены высокие башни, и весы стали десятыми — переносим их звёзды.
    if (!state.v2) {
      if (state.best[4] && !state.best[10]) {
        state.best[10] = state.best[4];
        delete state.best[4];
      }
      state.v2 = true;
      save(); // функция объявлена ниже — поднимается, поэтому доступна здесь
    }

    function save() {
      api.saveState(state);
      const totalStars = LEVELS.reduce((sum, l) => sum + (state.best[l.n]?.stars ?? 0), 0);
      const solved = LEVELS.reduce((sum, l) => sum + (state.best[l.n] ? 1 : 0), 0);
      api.reportResult({ score: totalStars * 10, summary: `⭐ ${totalStars} из ${LEVELS.length * 3}` });
    }

    function showMenu() {
      root.replaceChildren(
        el('div', { class: 'level-select' },
          el('p', { class: 'game-intro' },
            `${api.profile.emoji} ${api.profile.name}, в башне каждое число — сумма двух чисел под ним. Заполни пропуски — от маленькой башенки до 10-этажной! А на весах рассуди, что тяжелее.`),
          el('div', { class: 'level-grid' },
            ...LEVELS.map((level) => {
              const best = state.best[level.n];
              return el('button', { class: 'level-card', onclick: () => startRound(level) },
                el('div', { class: 'level-icon' }, level.icon),
                el('div', { class: 'level-name' }, level.title),
                el('div', { class: 'level-hint' }, level.hint),
                el('div', { class: 'level-best' }, best ? starRow(best.stars) : 'Ещё не пройден'),
              );
            }),
          ),
        ),
      );
    }

    function startRound(level) {
      let round = 0;
      let mistakes = 0;
      let exited = false;

      function next() {
        if (exited) return;
        round += 1;
        if (round > level.rounds) {
          showResults(level, mistakes);
          return;
        }
        if (level.kind === 'scales') showScales();
        else showPyramid();
      }

      function header() {
        return [
          el('div', { class: 'round-top' },
            el('span', {}, `${level.icon} ${level.title}`),
            el('span', {}, `Задание ${round} из ${level.rounds} · ❌ ${mistakes}`),
          ),
          el('div', { class: 'progress-track' },
            el('div', { class: 'progress-fill', style: `width:${((round - 1) / level.rounds) * 100}%` }),
          ),
        ];
      }

      function showPyramid() {
        const { rows, hidden } = genPyramid(
          level.cfg.base, level.cfg.max, level.cfg.hide, level.cfg.minHideRow ?? 0);
        const remaining = new Set(hidden);
        let selected = null;

        const cellEls = new Map();
        // --cols: по числу клеток в основании подбирается размер клетки
        const pyramidEl = el('div', { class: 'pyramid', style: `--cols:${level.cfg.base}` },
          ...rows.map((row, r) =>
            el('div', { class: 'pyramid-row' },
              ...row.map((value, i) => {
                const key = `${r},${i}`;
                const isHidden = hidden.has(key);
                const cell = el('button', {
                  class: `pyramid-cell${isHidden ? ' hidden-cell' : ''}`,
                  disabled: isHidden ? null : '',
                  onclick: () => {
                    if (!remaining.has(key)) return;
                    sound.tap();
                    selected = key;
                    cellEls.forEach((node) => node.classList.remove('sel'));
                    cell.classList.add('sel');
                    renderChoices(value);
                  },
                }, isHidden ? '' : value);
                cellEls.set(key, cell);
                return cell;
              }),
            ),
          ),
        );

        const choicesEl = el('div', { class: 'answer-grid pyramid-choices' });

        function renderChoices(answer) {
          choicesEl.replaceChildren(
            ...cellOptions(answer).map((option) =>
              el('button', {
                class: 'answer-btn',
                onclick: () => {
                  if (!selected) return;
                  const cell = cellEls.get(selected);
                  if (option === answer) {
                    sound.right();
                    cell.textContent = answer;
                    cell.classList.remove('sel', 'hidden-cell');
                    cell.classList.add('solved');
                    remaining.delete(selected);
                    selected = null;
                    choicesEl.replaceChildren();
                    if (remaining.size === 0) setTimeout(next, 700);
                  } else {
                    sound.wrong();
                    mistakes += 1;
                    cell.classList.add('shake');
                    setTimeout(() => cell.classList.remove('shake'), 400);
                  }
                },
              }, option)),
          );
        }

        root.replaceChildren(
          el('div', { class: 'round' },
            ...header(),
            el('p', { class: 'matrix-question' }, 'Нажми на пустую клетку и выбери число.'),
            pyramidEl,
            choicesEl,
            el('div', { class: 'game-toolbar' },
              el('button', { class: 'btn', onclick: () => { exited = true; showMenu(); } }, '🚪 К уровням'),
            ),
          ),
        );
      }

      function showScales() {
        const puzzle = genScales();
        let answered = false;
        root.replaceChildren(
          el('div', { class: 'round' },
            ...header(),
            el('div', { class: 'question scales-facts' },
              ...puzzle.facts.map((f) => el('div', { class: 'scales-fact' }, f)),
              el('div', { class: 'scales-question' }, puzzle.question),
            ),
            el('div', { class: 'answer-grid scales-options' },
              ...puzzle.options.map((option) =>
                el('button', {
                  class: 'answer-btn',
                  onclick: (event) => {
                    if (answered) return;
                    answered = true;
                    const isRight = option === puzzle.answer;
                    if (!isRight) mistakes += 1;
                    (isRight ? sound.right : sound.wrong)();
                    event.currentTarget.classList.add(isRight ? 'right' : 'wrong');
                    if (!isRight) {
                      [...root.querySelectorAll('.answer-btn')]
                        .find((b) => b.textContent === puzzle.answer)?.classList.add('right');
                    }
                    setTimeout(next, isRight ? 800 : 1600);
                  },
                }, option)),
            ),
            el('div', { class: 'game-toolbar' },
              el('button', { class: 'btn', onclick: () => { exited = true; showMenu(); } }, '🚪 К уровням'),
            ),
          ),
        );
      }

      next();
    }

    function showResults(level, mistakes) {
      const stars = starsFor(mistakes);
      const prev = state.best[level.n];
      if (!prev || stars > prev.stars) {
        state.best[level.n] = { stars };
      }
      save();

      sound.win();
      if (stars === 3) confetti();

      const nextLevel = LEVELS.find((l) => l.n === level.n + 1);
      root.replaceChildren(
        el('div', { class: 'results' },
          starsEl(stars),
          el('h2', {}, mistakes === 0 ? 'Ни одной ошибки — блестяще!' : 'Готово!'),
          el('p', { class: 'results-score' }, mistakes === 0 ? 'Всё решено с первого раза.' : `Ошибок по пути: ${mistakes}`),
          el('div', { class: 'results-actions' },
            el('button', { class: 'btn btn-primary', onclick: () => startRound(level) }, 'Ещё раз 🔁'),
            nextLevel
              ? el('button', { class: 'btn btn-primary', onclick: () => startRound(nextLevel) }, 'Дальше ▶')
              : '',
            el('button', { class: 'btn', onclick: showMenu }, 'К уровням 🔺'),
          ),
        ),
      );
    }

    showMenu();
  },

  unmount() {},
};
