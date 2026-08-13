import { el } from '../../core/dom.js';
import { sound } from '../../core/sound.js';
import { confetti, starsEl } from '../../core/fx.js';
import { WEEKDAYS, genTask } from './generator.js';

const QUESTIONS_PER_ROUND = 6;
const GOOD_SCORE = 5;

const LEVELS = [
  { n: 1, title: 'Ноги и головы', hint: 'посчитай обитателей двора' },
  { n: 2, title: 'Календарь', hint: 'дни недели и даты' },
  { n: 3, title: 'Этажи и лифты', hint: 'ступеньки и этажи' },
  { n: 4, title: 'Возрасты', hint: 'кто старше и на сколько' },
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
            `${api.profile.emoji} ${api.profile.name}, это задачки на смекалку — читай внимательно, тут есть подвохи!`),
          el('div', { class: 'level-grid' },
            ...LEVELS.map((level) => {
              const best = state.best[level.n];
              return el('button', { class: 'level-card', onclick: () => startRound(level) },
                el('div', { class: 'level-icon' }, '🧠'),
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
      const seen = new Set();

      function nextQuestion() {
        if (index >= QUESTIONS_PER_ROUND) {
          showResults(level, correct);
          return;
        }
        let task = genTask(level.n);
        for (let tries = 0; tries < 10 && seen.has(task.text); tries++) task = genTask(level.n);
        seen.add(task.text);
        index += 1;

        const feedbackEl = el('p', { class: 'teaser-feedback' });
        let answered = false;

        function finish(userAnswer) {
          if (answered) return;
          answered = true;
          const isRight = String(userAnswer).trim().toLowerCase() === String(task.answer).toLowerCase();
          if (isRight) correct += 1;
          (isRight ? sound.right : sound.wrong)();
          feedbackEl.textContent = isRight ? '✅ Верно!' : `❌ Правильный ответ: ${task.answer}`;
          feedbackEl.className = `teaser-feedback ${isRight ? 'ok' : 'bad'}`;
          root.querySelectorAll('button, input').forEach((node) => { node.disabled = true; });
          setTimeout(nextQuestion, isRight ? 1000 : 2200);
        }

        let answerArea;
        if (task.kind === 'weekday') {
          answerArea = el('div', { class: 'weekday-grid' },
            ...WEEKDAYS.map((day) =>
              el('button', { class: 'btn weekday-btn', onclick: () => finish(day) }, day)),
          );
        } else {
          const input = el('input', {
            class: 'teaser-input', type: 'number', inputmode: 'numeric', placeholder: 'Ответ',
            onkeydown: (e) => { if (e.key === 'Enter' && input.value !== '') finish(input.value); },
          });
          answerArea = el('div', { class: 'teaser-answer-row' },
            input,
            el('button', {
              class: 'btn btn-primary',
              onclick: () => { if (input.value !== '') finish(input.value); },
            }, 'Ответить'),
          );
          setTimeout(() => input.focus(), 50);
        }

        root.replaceChildren(
          el('div', { class: 'round' },
            el('div', { class: 'round-top' },
              el('span', {}, `🧠 ${level.title}`),
              el('span', {}, `Задача ${index} из ${QUESTIONS_PER_ROUND} · ✅ ${correct}`),
            ),
            el('div', { class: 'progress-track' },
              el('div', { class: 'progress-fill', style: `width:${((index - 1) / QUESTIONS_PER_ROUND) * 100}%` }),
            ),
            el('div', { class: 'question teaser-question' }, task.text),
            answerArea,
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
          el('h2', {}, correct >= GOOD_SCORE ? 'Вот это смекалка!' : 'Хорошая попытка!'),
          el('p', { class: 'results-score' }, `Правильных ответов: ${correct} из ${QUESTIONS_PER_ROUND}`),
          el('div', { class: 'results-actions' },
            el('button', { class: 'btn btn-primary', onclick: () => startRound(level) }, 'Ещё раз 🔁'),
            nextLevel
              ? el('button', { class: 'btn btn-primary', onclick: () => startRound(nextLevel) }, 'Дальше ▶')
              : '',
            el('button', { class: 'btn', onclick: showMenu }, 'К темам 🧠'),
          ),
        ),
      );
    }

    showMenu();
  },

  unmount() {},
};
