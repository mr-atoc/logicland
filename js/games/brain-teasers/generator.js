// Генераторы текстовых задач-смекалок. Без DOM — тестируется в Node.
import { randInt, pick } from '../../core/dom.js';

export const WEEKDAYS = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'];

const yearsWord = (n) => ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'года' : 'лет');
const legsWord = (n) => {
  if (n % 10 === 1 && n % 100 !== 11) return 'нога';
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'ноги';
  return 'ног';
};
const daysWord = (n) => {
  if (n % 10 === 1 && n % 100 !== 11) return 'день';
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'дня';
  return 'дней';
};

// --- Ноги и головы ---

function pairsOfLegs() {
  const { adj, word } = pick([
    { adj: 'лошадиных', word: 'лошадей' },
    { adj: 'коровьих', word: 'коров' },
  ]);
  const count = randInt(2, 6);
  return {
    text: `Из-под забора видно ${count * 2} пар ${adj} ног. Сколько всего ${word} во дворе?`,
    kind: 'number',
    answer: count,
  };
}

function legsAndHeads() {
  const kittens = randInt(2, 6);
  const chicks = randInt(4, 12);
  const legs = kittens * 4 + chicks * 2;
  const heads = kittens + chicks;
  const askChicks = Math.random() < 0.5;
  return {
    text: `Во дворе гуляют цыплята и котята: всего ${legs} ${legsWord(legs)} и ${heads} голов. Сколько во дворе ${askChicks ? 'цыплят' : 'котят'}?`,
    kind: 'number',
    answer: askChicks ? chicks : kittens,
  };
}

function bugsAndSpiders() {
  const bugs = randInt(2, 6);
  const spiders = randInt(2, 5);
  const few = (n, fewWord, manyWord) => ([2, 3, 4].includes(n) ? fewWord : manyWord);
  return {
    text: `У жука 6 ног, а у паука 8. В коробке сидят ${bugs} ${few(bugs, 'жука', 'жуков')} и ${spiders} ${few(spiders, 'паука', 'пауков')}. Сколько всего ног?`,
    kind: 'number',
    answer: bugs * 6 + spiders * 8,
  };
}

function geese() {
  const n = randInt(3, 9);
  return {
    text: `На лугу пасутся гуси — у них всего ${n * 2} ног. Сколько гусей на лугу?`,
    kind: 'number',
    answer: n,
  };
}

// --- Календарь ---

function calendarDate() {
  const d = randInt(1, 15);
  const k = randInt(3, 12);
  const wd = randInt(0, 6);
  const month = pick(['января', 'февраля', 'марта', 'апреля', 'октября', 'ноября']);
  return {
    text: `${d} ${month} — ${WEEKDAYS[wd]}. Какой день недели будет ${d + k} ${month}?`,
    kind: 'weekday',
    answer: WEEKDAYS[(wd + k) % 7],
  };
}

function calendarAfter() {
  const k = randInt(4, 15);
  const wd = randInt(0, 6);
  return {
    text: `Сегодня ${WEEKDAYS[wd]}. Какой день недели будет через ${k} ${daysWord(k)}?`,
    kind: 'weekday',
    answer: WEEKDAYS[(wd + k) % 7],
  };
}

// --- Этажи и лифты ---

function stairsUp() {
  const s = randInt(7, 12);
  const f = randInt(3, 9);
  return {
    text: `Между соседними этажами ${s} ступенек. Сколько ступенек пройдёт Маша, поднимаясь с 1-го этажа на ${f}-й?`,
    kind: 'number',
    answer: s * (f - 1),
  };
}

function liftFrom() {
  const n = randInt(2, 6);
  const x = randInt(n + 2, 14);
  return {
    text: `Лифт поднялся на ${n} этажей вверх и оказался на ${x}-м этаже. С какого этажа он поехал?`,
    kind: 'number',
    answer: x - n,
  };
}

function floorsBetween() {
  const a = randInt(1, 4);
  const b = randInt(a + 3, 14);
  return {
    text: `Петя живёт на ${b}-м этаже, а Ваня — на ${a}-м. На сколько этажей выше живёт Петя?`,
    kind: 'number',
    answer: b - a,
  };
}

// --- Возрасты ---

function ageSibling() {
  const a = randInt(9, 15);
  const b = randInt(2, 5);
  const c = randInt(2, 6);
  return {
    text: `Брату ${a} лет, а сестра на ${b} ${yearsWord(b)} младше. Сколько лет будет сестре через ${c} ${yearsWord(c)}?`,
    kind: 'number',
    answer: a - b + c,
  };
}

function ageTimes() {
  const k = pick([2, 3, 4]);
  const daughter = randInt(6, 10);
  return {
    text: `Маме ${k * daughter} лет, а дочка в ${k} раза младше. Сколько лет дочке?`,
    kind: 'number',
    answer: daughter,
  };
}

function ageFuture() {
  const c = randInt(2, 6);
  const now = randInt(8, 13);
  return {
    text: `Через ${c} ${yearsWord(c)} Косте будет ${now + c} ${yearsWord(now + c)}. Сколько лет ему сейчас?`,
    kind: 'number',
    answer: now,
  };
}

export const LEVEL_TASKS = {
  1: [pairsOfLegs, legsAndHeads, bugsAndSpiders, geese],
  2: [calendarDate, calendarAfter],
  3: [stairsUp, liftFrom, floorsBetween],
  4: [ageSibling, ageTimes, ageFuture],
};

export function genTask(levelN) {
  return pick(LEVEL_TASKS[levelN])();
}
