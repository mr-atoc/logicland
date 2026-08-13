import { el, shuffle, randInt, pick } from '../../core/dom.js';
import { sound } from '../../core/sound.js';
import { confetti, starsEl } from '../../core/fx.js';

const QUESTIONS_PER_ROUND = 8;
const GOOD_SCORE = 6; // с какого результата хвалим особо

const EMOJI_SETS = [
  ['🔴', '🔵', '🟢', '🟡'],
  ['⭐', '🌙', '☀️', '☁️'],
  ['🍎', '🍌', '🍇', '🍓'],
  ['🐱', '🐶', '🐭', '🐰'],
  ['🔺', '🔷', '🟧', '⬛'],
];

// Повторяющийся узор из фигур: показываем начало, спрашиваем следующий элемент.
function genShapes(patternLength) {
  const set = pick(EMOJI_SETS);
  const symbols = shuffle(set).slice(0, Math.min(patternLength, 3));
  let pattern;
  if (patternLength <= 2) {
    pattern = [symbols[0], symbols[1]];
  } else if (Math.random() < 0.5 && symbols.length >= 3) {
    pattern = [symbols[0], symbols[1], symbols[2]];
  } else {
    pattern = [symbols[0], symbols[0], symbols[1]];
  }
  const shown = pattern.length * 2 + randInt(0, pattern.length - 1);
  const sequence = Array.from({ length: shown }, (_, i) => pattern[i % pattern.length]);
  const answer = pattern[shown % pattern.length];
  const options = shuffle(set.includes(answer) ? set : [answer, ...set.slice(0, 3)]);
  return { sequence, answer, options };
}

// Числовые ряды: +d, −d или ×2.
function genNumbers() {
  const kind = pick(['plus', 'minus', 'double']);
  let start;
  let step;
  let terms;
  if (kind === 'plus') {
    start = randInt(1, 15);
    step = randInt(2, 9);
    terms = Array.from({ length: 4 }, (_, i) => start + step * i);
  } else if (kind === 'minus') {
    step = randInt(2, 9);
    start = randInt(step * 5, 60);
    terms = Array.from({ length: 4 }, (_, i) => start - step * i);
  } else {
    start = randInt(2, 5);
    terms = Array.from({ length: 4 }, (_, i) => start * 2 ** i);
  }
  const answer = kind === 'plus' ? terms[3] + step
    : kind === 'minus' ? terms[3] - step
      : terms[3] * 2;
  return { sequence: terms, answer, options: numberOptions(answer, kind === 'double' ? answer / 2 : step) };
}

// Хитрые ряды: шаг растёт (+1, +2, +3...) — для самых внимательных.
function genTricky() {
  if (Math.random() < 0.5) {
    const start = randInt(1, 6);
    const firstStep = randInt(1, 3);
    const terms = [start];
    for (let i = 0; i < 3; i++) terms.push(terms[terms.length - 1] + firstStep + i);
    const answer = terms[3] + firstStep + 3;
    return { sequence: terms, answer, options: numberOptions(answer, firstStep + 3) };
  }
  const set = pick(EMOJI_SETS);
  const [a, b, c] = shuffle(set).slice(0, 3);
  const pattern = [a, b, c, b]; // узор-«зеркало» с периодом 4
  const shown = 4 + randInt(3, 5);
  const sequence = Array.from({ length: shown }, (_, i) => pattern[i % pattern.length]);
  const answer = pattern[shown % pattern.length];
  return { sequence, answer, options: shuffle(set) };
}

function numberOptions(answer, step) {
  const options = new Set([answer]);
  const candidates = shuffle([answer + step, answer - step, answer + 1, answer - 1, answer + 2, answer + step * 2]);
  for (const candidate of candidates) {
    if (options.size >= 4) break;
    if (candidate >= 0 && !options.has(candidate)) options.add(candidate);
  }
  return shuffle([...options]);
}

// Варианты ответов из заданных «правдоподобных ошибок» (+ добивка ±1, ±2...)
function optionsFrom(answer, candidates) {
  const options = new Set([answer]);
  for (const c of shuffle(candidates)) {
    if (options.size >= 4) break;
    if (c >= 0 && !options.has(c)) options.add(c);
  }
  for (let delta = 1; options.size < 4; delta = delta > 0 ? -delta : -delta + 1) {
    const c = answer + delta;
    if (c >= 0 && !options.has(c)) options.add(c);
  }
  return shuffle([...options]);
}

// Узор с «гостем»: чётные места меняются по кругу, между ними — один и тот же символ.
// Пример: 🔴 ⭐ 🔵 ⭐ 🔴 ⭐ → ?
function genInterleavedShapes() {
  const set = pick(EMOJI_SETS);
  const [a, b, c] = shuffle(set).slice(0, 3);
  const item = (i) => (i % 2 === 1 ? c : Math.floor(i / 2) % 2 === 0 ? a : b);
  const shown = randInt(6, 8);
  return {
    sequence: Array.from({ length: shown }, (_, i) => item(i)),
    answer: item(shown),
    options: shuffle(set),
  };
}

// Растущие группы: А Б · А Б Б · А Б Б Б...
function genGrowingGroups() {
  const set = pick(EMOJI_SETS);
  const [a, b] = shuffle(set).slice(0, 2);
  const flat = [];
  for (let k = 1; k <= 5; k++) {
    flat.push(a);
    for (let i = 0; i < k; i++) flat.push(b);
  }
  const shown = randInt(6, 9);
  return { sequence: flat.slice(0, shown), answer: flat[shown], options: shuffle(set) };
}

// Зигзаг: вверх на одно число, вниз на другое. 5 → 12 → 9 → 16 → 13 → ?
function genZigzag() {
  const up = randInt(4, 9);
  const down = randInt(2, up - 1);
  let value = randInt(3, 15);
  const terms = [value];
  for (let i = 0; i < 4; i++) {
    value += i % 2 === 0 ? up : -down;
    terms.push(value);
  }
  const answer = terms[4] + up;
  return {
    sequence: terms,
    answer,
    options: optionsFrom(answer, [terms[4] - down, answer - 1, answer + 1, answer + down]),
  };
}

// Две перепутанные последовательности: а₀ б₀ а₁ б₁ а₂ б₂ → а₃ (или б₃)
function genInterleavedNumbers() {
  const a0 = randInt(1, 9);
  const da = randInt(2, 5);
  const b0 = randInt(10, 20);
  const db = randInt(5, 10);
  const seqA = (k) => a0 + da * k;
  const seqB = (k) => b0 + db * k;
  const sequence = [];
  for (let k = 0; k < 3; k++) sequence.push(seqA(k), seqB(k));
  if (Math.random() < 0.5) {
    const answer = seqA(3);
    return { sequence, answer, options: optionsFrom(answer, [seqB(3), answer - da, answer + da, answer + 1]) };
  }
  sequence.push(seqA(3));
  const answer = seqB(3);
  return { sequence, answer, options: optionsFrom(answer, [seqA(4), answer - db, answer + db, answer - 1]) };
}

// Каждое число — сумма двух предыдущих: 2 3 5 8 13 → ?
function genFib() {
  const terms = [randInt(1, 3), randInt(2, 4)];
  while (terms.length < 5) terms.push(terms.at(-1) + terms.at(-2));
  const answer = terms.at(-1) + terms.at(-2);
  return {
    sequence: terms,
    answer,
    options: optionsFrom(answer, [answer - 1, answer + 1, terms.at(-1) + 2, answer + 2]),
  };
}

// Квадраты: 1 4 9 16 → 25
function genSquares() {
  const start = randInt(1, 3);
  const terms = Array.from({ length: 4 }, (_, i) => (start + i) ** 2);
  const answer = (start + 4) ** 2;
  return {
    sequence: terms,
    answer,
    options: optionsFrom(answer, [answer + 2, answer - 2, answer + start + 4, answer - start - 4]),
  };
}

const LEVELS = [
  { n: 1, title: 'Весёлые фигуры', hint: 'простые узоры', gen: () => genShapes(pick([2, 3])) },
  { n: 2, title: 'Числовые ряды', hint: 'найди правило чисел', gen: genNumbers },
  {
    n: 3,
    title: 'Хитрые ряды',
    hint: 'узоры с секретом',
    gen: () => pick([genTricky, genInterleavedShapes, genGrowingGroups])(),
  },
  {
    n: 4,
    title: 'Мастер логики',
    hint: 'самые хитрые правила',
    gen: () => pick([genZigzag, genInterleavedNumbers, genFib, genSquares])(),
  },
];

// Экспорт генераторов для тестов
export const GENERATORS = {
  genShapes, genNumbers, genTricky, genInterleavedShapes,
  genGrowingGroups, genZigzag, genInterleavedNumbers, genFib, genSquares,
};

function starsFor(correct) {
  if (correct >= 8) return 3;
  if (correct >= 6) return 2;
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
      api.reportResult({
        score: totalScore,
        summary: `⭐ ${totalStars} из ${LEVELS.length * 3}`,
      });
    }

    function showLevels() {
      root.replaceChildren(
        el('div', { class: 'level-select' },
          el('p', { class: 'game-intro' },
            `${api.profile.emoji} ${api.profile.name}, найди закономерность и угадай, что будет дальше! Выбирай любой уровень.`),
          el('div', { class: 'level-grid' },
            ...LEVELS.map((level) => {
              const best = state.best[level.n];
              return el('button', { class: 'level-card', onclick: () => startRound(level) },
                el('div', { class: 'level-icon' }, '🧩'),
                el('div', { class: 'level-name' }, level.title),
                el('div', { class: 'level-hint' }, level.hint),
                el('div', { class: 'level-best' },
                  best ? `${starRow(best.stars)} · ${best.correct}/${QUESTIONS_PER_ROUND}` : 'Не пройден'),
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
        const question = level.gen();
        index += 1;

        const answers = el('div', { class: 'answer-grid' },
          ...question.options.map((option) =>
            el('button', { class: 'answer-btn', onclick: (event) => onAnswer(event.currentTarget, option) }, option),
          ),
        );

        function onAnswer(button, option) {
          answers.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const isRight = String(option) === String(question.answer);
          if (isRight) correct += 1;
          (isRight ? sound.right : sound.wrong)();
          button.classList.add(isRight ? 'right' : 'wrong');
          if (!isRight) {
            answers.querySelectorAll('button').forEach((b) => {
              if (b.textContent === String(question.answer)) b.classList.add('right');
            });
          }
          setTimeout(nextQuestion, isRight ? 700 : 1400);
        }

        root.replaceChildren(
          el('div', { class: 'round' },
            el('div', { class: 'round-top' },
              el('span', {}, `🧩 ${level.title}`),
              el('span', {}, `Ряд ${index} из ${QUESTIONS_PER_ROUND} · ✅ ${correct}`),
            ),
            el('div', { class: 'progress-track' },
              el('div', { class: 'progress-fill', style: `width:${((index - 1) / QUESTIONS_PER_ROUND) * 100}%` }),
            ),
            el('div', { class: 'sequence' },
              ...question.sequence.map((item, i) => el('span', { class: 'seq-chip', style: `--i:${i}` }, item)),
              el('span', { class: 'seq-chip seq-question', style: `--i:${question.sequence.length}` }, '?'),
            ),
            answers,
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
          el('h2', {}, correct >= GOOD_SCORE ? 'Настоящий детектив закономерностей!' : 'Хорошая попытка!'),
          el('p', { class: 'results-score' }, `Правильных ответов: ${correct} из ${QUESTIONS_PER_ROUND}`),
          el('div', { class: 'results-actions' },
            el('button', { class: 'btn btn-primary', onclick: () => startRound(level) }, 'Ещё раз 🔁'),
            nextLevel
              ? el('button', { class: 'btn btn-primary', onclick: () => startRound(nextLevel) }, 'Дальше ▶')
              : '',
            el('button', { class: 'btn', onclick: showLevels }, 'К уровням 🧩'),
          ),
        ),
      );
    }

    showLevels();
  },

  unmount() {},
};
