import { el } from '../../core/dom.js';
import { sound } from '../../core/sound.js';
import { confetti, starsEl } from '../../core/fx.js';
import { renderCell } from './shapes.js';
import { genPairGrid, genHouseGrid, genSizeGrid, genTripleGrid } from './generator.js';

const QUESTIONS_PER_ROUND = 6;
const GOOD_SCORE = 5;

const LEVELS = [
  { n: 1, title: 'Пары фигур', hint: 'запомни обе фигуры в клетке', gen: genPairGrid },
  { n: 2, title: 'Домики', hint: 'крыша и окошко меняются по-своему', gen: genHouseGrid },
  { n: 3, title: 'Ряд по размеру', hint: 'фигура растёт или уменьшается', gen: genSizeGrid },
  { n: 4, title: 'Тройная логика', hint: 'три признака сразу', gen: genTripleGrid },
];

function starsFor(correct) {
  if (correct >= QUESTIONS_PER_ROUND) return 3;
  if (correct >= QUESTIONS_PER_ROUND - 1) return 2;
  if (correct >= QUESTIONS_PER_ROUND - 2) return 1;
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
            `${api.profile.emoji} ${api.profile.name}, в таблице спряталось правило — реши, что должно быть в пустой клетке!`),
          el('div', { class: 'level-grid' },
            ...LEVELS.map((level) => {
              const best = state.best[level.n];
              return el('button', { class: 'level-card', onclick: () => startRound(level) },
                el('div', { class: 'level-icon' }, '🗂️'),
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
        const puzzle = level.gen();
        index += 1;

        const boardEl = el('div', { class: 'matrix-board' });
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            const isTarget = r === puzzle.target.r && c === puzzle.target.c;
            boardEl.append(
              isTarget
                ? el('div', { class: 'matrix-cell matrix-target' }, '?')
                : el('div', { class: 'matrix-cell' }, renderCell(puzzle.grid[r][c])),
            );
          }
        }

        const optionsEl = el('div', { class: `matrix-options${puzzle.type === 'pair' ? ' wide' : ''}` },
          ...puzzle.options.map((option) =>
            el('button', {
              class: 'answer-btn matrix-option-btn',
              onclick: (event) => onAnswer(event.currentTarget, option),
            }, renderCell(option))),
        );

        function onAnswer(button, option) {
          optionsEl.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const isRight = option.key === puzzle.answer.key;
          if (isRight) correct += 1;
          (isRight ? sound.right : sound.wrong)();
          button.classList.add(isRight ? 'right' : 'wrong');
          if (!isRight) {
            const correctIdx = puzzle.options.findIndex((o) => o.key === puzzle.answer.key);
            optionsEl.children[correctIdx]?.classList.add('right');
          }
          setTimeout(nextQuestion, isRight ? 900 : 1800);
        }

        root.replaceChildren(
          el('div', { class: 'round matrix-round' },
            el('div', { class: 'round-top' },
              el('span', {}, `🗂️ ${level.title}`),
              el('span', {}, `Вопрос ${index} из ${QUESTIONS_PER_ROUND} · ✅ ${correct}`),
            ),
            el('div', { class: 'progress-track' },
              el('div', { class: 'progress-fill', style: `width:${((index - 1) / QUESTIONS_PER_ROUND) * 100}%` }),
            ),
            el('p', { class: 'matrix-question' }, 'Отметь картинку, которая должна быть в пустой ячейке.'),
            boardEl,
            optionsEl,
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
          el('h2', {}, correct >= GOOD_SCORE ? 'Ты разгадал правило!' : 'Хорошая попытка!'),
          el('p', { class: 'results-score' }, `Правильных ответов: ${correct} из ${QUESTIONS_PER_ROUND}`),
          el('div', { class: 'results-actions' },
            el('button', { class: 'btn btn-primary', onclick: () => startRound(level) }, 'Ещё раз 🔁'),
            nextLevel
              ? el('button', { class: 'btn btn-primary', onclick: () => startRound(nextLevel) }, 'Дальше ▶')
              : '',
            el('button', { class: 'btn', onclick: showMenu }, 'К уровням 🗂️'),
          ),
        ),
      );
    }

    showMenu();
  },

  unmount() {},
};
