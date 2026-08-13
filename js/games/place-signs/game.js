import { el } from '../../core/dom.js';
import { sound } from '../../core/sound.js';
import { confetti, starsEl } from '../../core/fx.js';
import { evalOps, genPuzzle } from './generator.js';

const QUESTIONS_PER_ROUND = 6;
const GOOD_SCORE = 5;

const LEVELS = [
  { n: 1, title: 'Плюс и минус', hint: '3 числа, знаки + и −', cfg: { count: 3, ops: ['+', '−'] } },
  { n: 2, title: 'С умножением', hint: '3 числа, ещё и ×', cfg: { count: 3, ops: ['+', '−', '×'] } },
  { n: 3, title: 'Четыре числа', hint: '4 числа, знаки + − ×', cfg: { count: 4, ops: ['+', '−', '×'] } },
  { n: 4, title: 'Полный набор', hint: '4 числа и все знаки', cfg: { count: 4, ops: ['+', '−', '×', '÷'] } },
];

function starsFor(correct) {
  if (correct >= 6) return 3;
  if (correct >= 5) return 2;
  if (correct >= 4) return 1;
  return 0;
}

const starRow = (stars) => '⭐'.repeat(stars) || '—';

export default {
  mount(root, api) {
    const state = api.loadState() ?? { best: {} };

    function save() {
      api.saveState(state);
      const totalStars = LEVELS.reduce((sum, l) => sum + (state.best[l.n]?.stars ?? 0), 0);
      const totalScore = LEVELS.reduce((sum, l) => sum + (state.best[l.n]?.correct ?? 0) * 10, 0);
      api.reportResult({ score: totalScore, summary: `⭐ ${totalStars} из ${LEVELS.length * 3}` });
    }

    function showMenu() {
      root.replaceChildren(
        el('div', { class: 'level-select' },
          el('p', { class: 'game-intro' },
            `${api.profile.emoji} ${api.profile.name}, расставь знаки между числами так, чтобы получился ответ. Помни: × и ÷ выполняются раньше, чем + и −!`),
          el('div', { class: 'level-grid' },
            ...LEVELS.map((level) => {
              const best = state.best[level.n];
              return el('button', { class: 'level-card', onclick: () => startRound(level) },
                el('div', { class: 'level-icon' }, '🧮'),
                el('div', { class: 'level-name' }, level.title),
                el('div', { class: 'level-hint' }, level.hint),
                el('div', { class: 'level-best' },
                  best ? `${starRow(best.stars)} · ${best.correct}/${QUESTIONS_PER_ROUND}` : 'Ещё не пройден'),
              );
            }),
          ),
        ),
      );
    }

    function startRound(level) {
      let index = 0;
      let correct = 0;

      function nextQuestion() {
        if (index >= QUESTIONS_PER_ROUND) {
          showResults(level, correct);
          return;
        }
        const puzzle = genPuzzle(level.cfg);
        index += 1;
        const chosen = Array(puzzle.nums.length - 1).fill(null);
        let answered = false;

        const slotBtns = [];
        const exprEl = el('div', { class: 'signs-expr' });
        puzzle.nums.forEach((num, i) => {
          exprEl.append(el('span', { class: 'signs-num' }, num));
          if (i < puzzle.nums.length - 1) {
            const slot = el('button', {
              class: 'signs-slot',
              onclick: () => {
                if (answered) return;
                sound.tap();
                const cycle = puzzle.ops;
                const cur = chosen[i];
                chosen[i] = cycle[(cycle.indexOf(cur) + 1) % cycle.length] ?? cycle[0];
                slot.textContent = chosen[i];
                slot.classList.add('picked');
                checkBtn.disabled = chosen.some((c) => c === null);
              },
            }, '?');
            slotBtns.push(slot);
            exprEl.append(slot);
          }
        });
        exprEl.append(el('span', { class: 'signs-num' }, `= ${puzzle.target}`));

        const feedbackEl = el('p', { class: 'teaser-feedback' });
        const checkBtn = el('button', {
          class: 'btn btn-primary',
          disabled: '',
          onclick: () => {
            if (answered) return;
            answered = true;
            const result = evalOps(puzzle.nums, chosen);
            const isRight = result === puzzle.target;
            if (isRight) correct += 1;
            (isRight ? sound.right : sound.wrong)();
            if (isRight) {
              feedbackEl.textContent = '✅ Верно!';
              feedbackEl.className = 'teaser-feedback ok';
            } else {
              feedbackEl.textContent = `❌ Решение: ${puzzle.nums.map((n, i) => (i < puzzle.solution.length ? `${n} ${puzzle.solution[i]}` : n)).join(' ')} = ${puzzle.target}`;
              feedbackEl.className = 'teaser-feedback bad';
            }
            checkBtn.disabled = true;
            slotBtns.forEach((b) => { b.disabled = true; });
            setTimeout(nextQuestion, isRight ? 1000 : 2600);
          },
        }, 'Проверить');

        root.replaceChildren(
          el('div', { class: 'round' },
            el('div', { class: 'round-top' },
              el('span', {}, `🧮 ${level.title}`),
              el('span', {}, `Пример ${index} из ${QUESTIONS_PER_ROUND} · ✅ ${correct}`),
            ),
            el('div', { class: 'progress-track' },
              el('div', { class: 'progress-fill', style: `width:${((index - 1) / QUESTIONS_PER_ROUND) * 100}%` }),
            ),
            el('p', { class: 'matrix-question' }, 'Нажимай на «?», чтобы выбрать знак.'),
            exprEl,
            el('div', { class: 'game-toolbar' }, checkBtn),
            feedbackEl,
          ),
        );
      }

      nextQuestion();
    }

    function showResults(level, correct) {
      const stars = starsFor(correct);
      const prev = state.best[level.n];
      if (!prev || correct > prev.correct) {
        state.best[level.n] = { correct, stars };
      }
      save();

      if (stars > 0) sound.win();
      if (stars === 3) confetti();

      const nextLevel = LEVELS.find((l) => l.n === level.n + 1);
      root.replaceChildren(
        el('div', { class: 'results' },
          starsEl(stars),
          el('h2', {}, correct >= GOOD_SCORE ? 'Мастер знаков!' : 'Хорошая попытка!'),
          el('p', { class: 'results-score' }, `Правильных ответов: ${correct} из ${QUESTIONS_PER_ROUND}`),
          el('div', { class: 'results-actions' },
            el('button', { class: 'btn btn-primary', onclick: () => startRound(level) }, 'Ещё раз 🔁'),
            nextLevel
              ? el('button', { class: 'btn btn-primary', onclick: () => startRound(nextLevel) }, 'Дальше ▶')
              : '',
            el('button', { class: 'btn', onclick: showMenu }, 'К уровням 🧮'),
          ),
        ),
      );
    }

    showMenu();
  },

  unmount() {},
};
