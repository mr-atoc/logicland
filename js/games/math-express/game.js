import { el, shuffle, randInt, pick } from '../../core/dom.js';
import { sound } from '../../core/sound.js';
import { confetti, starsEl } from '../../core/fx.js';

const QUESTIONS_PER_ROUND = 10;
const GOOD_SCORE = 8; // с какого результата хвалим особо

function genAddSub20() {
  if (Math.random() < 0.5) {
    const a = randInt(2, 18);
    const b = randInt(1, 20 - a);
    return { text: `${a} + ${b} = ?`, answer: a + b };
  }
  const a = randInt(5, 20);
  const b = randInt(1, a - 1);
  return { text: `${a} − ${b} = ?`, answer: a - b };
}

function genAddSub100() {
  if (Math.random() < 0.5) {
    const a = randInt(10, 89);
    const b = randInt(10, 99 - a);
    return { text: `${a} + ${b} = ?`, answer: a + b };
  }
  const a = randInt(30, 99);
  const b = randInt(10, a - 5);
  return { text: `${a} − ${b} = ?`, answer: a - b };
}

function genMul() {
  const a = randInt(2, 9);
  const b = randInt(2, 9);
  return { text: `${a} × ${b} = ?`, answer: a * b };
}

function genMissing() {
  const kind = pick(['add', 'sub', 'mul']);
  if (kind === 'add') {
    const a = randInt(2, 40);
    const b = randInt(2, 40);
    return { text: `${a} + ? = ${a + b}`, answer: b };
  }
  if (kind === 'sub') {
    const a = randInt(20, 80);
    const b = randInt(2, a - 2);
    return { text: `${a} − ? = ${a - b}`, answer: b };
  }
  const a = randInt(2, 9);
  const b = randInt(2, 9);
  return { text: `${a} × ? = ${a * b}`, answer: b };
}

// Деление: обычное и с пропущенным числом (всё делится нацело).
function genDiv() {
  const a = randInt(2, 9);
  const b = randInt(2, 9);
  const prod = a * b;
  const kind = pick(['plain', 'plain', 'missDividend', 'missDivisor']);
  if (kind === 'plain') return { text: `${prod} ÷ ${b} = ?`, answer: a };
  if (kind === 'missDividend') return { text: `? ÷ ${b} = ${a}`, answer: prod };
  return { text: `${prod} ÷ ? = ${a}`, answer: b };
}

// Примеры в два действия — с приоритетом операций и скобками.
function genTwoOps() {
  const a = randInt(2, 9);
  const b = randInt(2, 9);
  const kind = pick(['mulAdd', 'addMul', 'mulSub', 'subMul', 'divAdd', 'divSub', 'brackets']);
  if (kind === 'mulAdd') {
    const c = randInt(2, 20);
    return { text: `${a} × ${b} + ${c} = ?`, answer: a * b + c };
  }
  if (kind === 'addMul') {
    const c = randInt(2, 20);
    return { text: `${c} + ${a} × ${b} = ?`, answer: c + a * b };
  }
  if (kind === 'mulSub') {
    const c = randInt(2, a * b - 1);
    return { text: `${a} × ${b} − ${c} = ?`, answer: a * b - c };
  }
  if (kind === 'subMul') {
    const k = a * b + randInt(2, 20);
    return { text: `${k} − ${a} × ${b} = ?`, answer: k - a * b };
  }
  if (kind === 'divAdd') {
    const c = randInt(2, 20);
    return { text: `${a * b} ÷ ${b} + ${c} = ?`, answer: a + c };
  }
  if (kind === 'divSub') {
    const c = randInt(1, a - 1);
    return { text: `${a * b} ÷ ${b} − ${c} = ?`, answer: a - c };
  }
  const c = randInt(2, 5);
  return { text: `(${a} + ${b}) × ${c} = ?`, answer: (a + b) * c };
}

const LEVELS = [
  { n: 1, title: 'Станция «Плюс-Минус»', hint: 'сложение и вычитание до 20', gen: genAddSub20 },
  { n: 2, title: 'Станция «Сотня»', hint: 'сложение и вычитание до 100', gen: genAddSub100 },
  { n: 3, title: 'Станция «Умножайка»', hint: 'таблица умножения', gen: genMul },
  { n: 4, title: 'Станция «Загадка»', hint: 'найди пропущенное число', gen: genMissing },
  { n: 5, title: 'Станция «Делилка»', hint: 'деление нацело', gen: genDiv },
  { n: 6, title: 'Станция «Два действия»', hint: 'умножай и дели по порядку', gen: genTwoOps },
];

// Экспорт генераторов для тестов
export const GENERATORS = { genAddSub20, genAddSub100, genMul, genMissing, genDiv, genTwoOps };

function makeOptions(answer) {
  const options = new Set([answer]);
  while (options.size < 4) {
    const delta = randInt(1, 10) * (Math.random() < 0.5 ? -1 : 1);
    const candidate = answer + delta;
    if (candidate >= 0) options.add(candidate);
  }
  return shuffle([...options]);
}

function starsFor(correct) {
  if (correct >= 10) return 3;
  if (correct >= 8) return 2;
  if (correct >= 6) return 1;
  return 0;
}

const starRow = (stars) => '⭐'.repeat(stars) || '—';

export default {
  mount(root, api) {
    const state = api.loadState() ?? {};
    // best — рекорды режима с вариантами, bestInput — режима с вводом ответа
    state.best ??= {};
    state.bestInput ??= {};
    state.mode ??= 'choice';

    const records = () => (state.mode === 'input' ? state.bestInput : state.best);

    function save() {
      api.saveState(state);
      // в общий зачёт идёт лучший результат из двух режимов
      const bestStars = (n) => Math.max(state.best[n]?.stars ?? 0, state.bestInput[n]?.stars ?? 0);
      const bestCorrect = (n) => Math.max(state.best[n]?.correct ?? 0, state.bestInput[n]?.correct ?? 0);
      const totalStars = LEVELS.reduce((sum, l) => sum + bestStars(l.n), 0);
      const totalScore = LEVELS.reduce((sum, l) => sum + bestCorrect(l.n) * 10, 0);
      api.reportResult({
        score: totalScore,
        summary: `⭐ ${totalStars} из ${LEVELS.length * 3}`,
      });
    }

    function modeSwitch() {
      const option = (mode, label, hint) =>
        el('button', {
          class: `mode-btn${state.mode === mode ? ' active' : ''}`,
          onclick: () => {
            if (state.mode === mode) return;
            state.mode = mode;
            sound.tap();
            save();
            showLevels();
          },
        },
          el('span', { class: 'mode-title' }, label),
          el('span', { class: 'mode-hint' }, hint),
        );
      return el('div', { class: 'mode-switch' },
        option('choice', '🔘 Выбрать ответ', 'из четырёх вариантов'),
        option('input', '⌨️ Вписать ответ', 'посчитай сам, без подсказок'),
      );
    }

    function showLevels() {
      const best = records();
      root.replaceChildren(
        el('div', { class: 'level-select' },
          el('p', { class: 'game-intro' },
            `${api.profile.emoji} Машинист ${api.profile.name}, выбирай любую станцию! Реши ${QUESTIONS_PER_ROUND} примеров и собери звёзды.`),
          modeSwitch(),
          el('div', { class: 'level-grid' },
            ...LEVELS.map((level) => {
              const record = best[level.n];
              return el('button', { class: 'level-card', onclick: () => startRound(level) },
                el('div', { class: 'level-icon' }, '🚉'),
                el('div', { class: 'level-name' }, level.title),
                el('div', { class: 'level-hint' }, level.hint),
                el('div', { class: 'level-best' },
                  record ? `${starRow(record.stars)} · ${record.correct}/${QUESTIONS_PER_ROUND}` : 'Не пройдена'),
              );
            }),
          ),
        ),
      );
    }

    function startRound(level) {
      let index = 0;
      let correct = 0;
      let exited = false;
      const seen = new Set(); // без повторов примеров внутри раунда

      function nextQuestion() {
        if (exited) return;
        if (index >= QUESTIONS_PER_ROUND) {
          showResults(level, correct);
          return;
        }
        let question = level.gen();
        for (let tries = 0; tries < 10 && seen.has(question.text); tries++) {
          question = level.gen();
        }
        seen.add(question.text);
        index += 1;

        const feedbackEl = el('p', { class: 'teaser-feedback' });
        let answerArea;

        if (state.mode === 'input') {
          const input = el('input', {
            class: 'teaser-input', type: 'number', inputmode: 'numeric', placeholder: 'Ответ',
            onkeydown: (event) => { if (event.key === 'Enter' && input.value !== '') submit(input.value); },
          });
          answerArea = el('div', { class: 'teaser-answer-row' },
            input,
            el('button', {
              class: 'btn btn-primary',
              onclick: () => { if (input.value !== '') submit(input.value); },
            }, 'Ответить'),
          );
          setTimeout(() => input.focus(), 50);
        } else {
          answerArea = el('div', { class: 'answer-grid' },
            ...makeOptions(question.answer).map((option) =>
              el('button', { class: 'answer-btn', onclick: (event) => onAnswer(event.currentTarget, option) }, option),
            ),
          );
        }

        let answered = false;

        function submit(value) {
          if (answered) return;
          answered = true;
          const isRight = Number(value) === question.answer;
          if (isRight) correct += 1;
          (isRight ? sound.right : sound.wrong)();
          feedbackEl.textContent = isRight ? '✅ Верно!' : `❌ Правильный ответ: ${question.answer}`;
          feedbackEl.className = `teaser-feedback ${isRight ? 'ok' : 'bad'}`;
          answerArea.querySelectorAll('input, button').forEach((node) => { node.disabled = true; });
          setTimeout(nextQuestion, isRight ? 900 : 2000);
        }

        function onAnswer(button, option) {
          if (answered) return;
          answered = true;
          answerArea.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const isRight = option === question.answer;
          if (isRight) correct += 1;
          (isRight ? sound.right : sound.wrong)();
          button.classList.add(isRight ? 'right' : 'wrong');
          if (!isRight) {
            answerArea.querySelectorAll('button').forEach((b) => {
              if (Number(b.textContent) === question.answer) b.classList.add('right');
            });
          }
          setTimeout(nextQuestion, isRight ? 700 : 1400);
        }

        root.replaceChildren(
          el('div', { class: 'round' },
            el('div', { class: 'round-top' },
              el('span', {}, `🚂 ${level.title}`),
              el('span', {}, `Вопрос ${index} из ${QUESTIONS_PER_ROUND} · ✅ ${correct}`),
            ),
            el('div', { class: 'progress-track' },
              el('div', { class: 'progress-fill', style: `width:${((index - 1) / QUESTIONS_PER_ROUND) * 100}%` }),
            ),
            el('div', { class: 'question' }, question.text),
            answerArea,
            feedbackEl,
            el('div', { class: 'game-toolbar' },
              el('button', { class: 'btn', onclick: () => { exited = true; showLevels(); } }, '🚪 К станциям'),
            ),
          ),
        );
      }

      nextQuestion();
    }

    function showResults(level, correct) {
      const stars = starsFor(correct);
      const best = records();
      const prev = best[level.n];
      if (!prev || correct > prev.correct) {
        best[level.n] = { correct, stars };
      }
      save();

      if (stars > 0) sound.win();
      if (stars === 3) confetti();

      const nextLevel = LEVELS.find((l) => l.n === level.n + 1);
      root.replaceChildren(
        el('div', { class: 'results' },
          starsEl(stars),
          el('h2', {}, correct >= GOOD_SCORE ? 'Отлично, машинист!' : 'Хорошая попытка!'),
          el('p', { class: 'results-score' }, `Правильных ответов: ${correct} из ${QUESTIONS_PER_ROUND}`),
          el('p', { class: 'results-mode' },
            state.mode === 'input' ? '⌨️ Режим: вписать ответ' : '🔘 Режим: выбрать из вариантов'),
          el('div', { class: 'results-actions' },
            el('button', { class: 'btn btn-primary', onclick: () => startRound(level) }, 'Ещё раз 🔁'),
            nextLevel
              ? el('button', { class: 'btn btn-primary', onclick: () => startRound(nextLevel) }, 'Дальше ▶')
              : '',
            el('button', { class: 'btn', onclick: showLevels }, 'К станциям 🚉'),
          ),
        ),
      );
    }

    showLevels();
  },

  unmount() {},
};
