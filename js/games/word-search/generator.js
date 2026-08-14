// Генератор поля «Найди слова». Чистая логика без DOM.
import { shuffle, randInt } from '../../core/dom.js';

// Слова только заглавными и без «ё» (пишем через «е») — так их проще искать в сетке.
export const CATEGORIES = {
  'Животные': ['КОТ', 'ЛИСА', 'ВОЛК', 'ЗАЯЦ', 'СОВА', 'ТИГР', 'СЛОН', 'БЕЛКА', 'ЗЕБРА', 'ПАНДА',
    'ЖИРАФ', 'ЕНОТ', 'БАРСУК', 'ОЛЕНЬ', 'ЛОСЬ', 'РЫСЬ', 'КРОТ', 'БОБР', 'КОЗА', 'ОВЦА',
    'КОНЬ', 'МЫШЬ', 'КРЫСА', 'ХОМЯК', 'СУРОК', 'ПУМА', 'ВЫДРА', 'МОРЖ', 'КИТ', 'АКУЛА',
    'ТЮЛЕНЬ', 'ДЕЛЬФИН', 'МЕДВЕДЬ', 'БЕГЕМОТ', 'ВЕРБЛЮД', 'КЕНГУРУ', 'ЛЕОПАРД', 'НОСОРОГ', 'КРОКОДИЛ'],

  'Птицы': ['УТКА', 'ГУСЬ', 'ГРАЧ', 'АИСТ', 'СОЙКА', 'ГАЛКА', 'СОКОЛ', 'ФИЛИН', 'ДЯТЕЛ', 'ЦАПЛЯ',
    'ЧАЙКА', 'ПЕТУХ', 'ИНДЮК', 'ФАЗАН', 'СИНИЦА', 'ВОРОНА', 'СОРОКА', 'ГОЛУБЬ', 'ЛЕБЕДЬ', 'КУРИЦА',
    'ПАВЛИН', 'СТРАУС', 'ПИНГВИН', 'ПОПУГАЙ', 'ВОРОБЕЙ', 'СНЕГИРЬ'],

  'Фрукты и ягоды': ['СЛИВА', 'ГРУША', 'БАНАН', 'ЛИМОН', 'АРБУЗ', 'ДЫНЯ', 'ВИШНЯ', 'КИВИ', 'МАНГО', 'ХУРМА',
    'АЙВА', 'ИНЖИР', 'ГРАНАТ', 'ЯБЛОКО', 'ПЕРСИК', 'АНАНАС', 'МАЛИНА', 'КЛЮКВА', 'РЯБИНА', 'ЧЕРНИКА',
    'БРУСНИКА', 'ЕЖЕВИКА', 'ОБЛЕПИХА', 'ВИНОГРАД', 'КЛУБНИКА', 'КРЫЖОВНИК'],

  'Овощи': ['ЛУК', 'РЕПА', 'БОБЫ', 'ТЫКВА', 'ПЕРЕЦ', 'ГОРОХ', 'УКРОП', 'САЛАТ', 'ТОМАТ', 'РЕДИС',
    'СВЕКЛА', 'ОГУРЕЦ', 'ФАСОЛЬ', 'ЧЕСНОК', 'КАПУСТА', 'КАБАЧОК', 'МОРКОВЬ', 'ПЕТРУШКА', 'БАКЛАЖАН'],

  'Школа': ['УРОК', 'МЕЛ', 'ПАРТА', 'РУЧКА', 'КНИГА', 'ДОСКА', 'ПЕНАЛ', 'АТЛАС', 'КЛАСС', 'ШКОЛА',
    'КИСТЬ', 'ЛАСТИК', 'АЛЬБОМ', 'ЗВОНОК', 'ЖУРНАЛ', 'ЗАДАЧА', 'ПРИМЕР', 'КРАСКИ', 'ГЛОБУС', 'ТЕТРАДЬ',
    'УЧЕБНИК', 'ЛИНЕЙКА', 'ЦИРКУЛЬ', 'ОТМЕТКА', 'КАРАНДАШ', 'ПОРТФЕЛЬ', 'ПЕРЕМЕНА'],

  'Космос': ['ЛУНА', 'МАРС', 'УРАН', 'КОСМОС', 'ЗВЕЗДА', 'РАКЕТА', 'КОМЕТА', 'СОЛНЦЕ', 'ОРБИТА', 'ВЕНЕРА',
    'ЮПИТЕР', 'САТУРН', 'МЕТЕОР', 'НЕПТУН', 'ПЛУТОН', 'КРАТЕР', 'ПЛАНЕТА', 'СПУТНИК', 'ЛУНОХОД', 'АСТРОНОМ',
    'ТЕЛЕСКОП', 'АСТЕРОИД', 'СКАФАНДР', 'МЕРКУРИЙ', 'ЗАТМЕНИЕ', 'ГАЛАКТИКА'],

  'Транспорт': ['МЕТРО', 'ТАКСИ', 'ПОЕЗД', 'ЛОДКА', 'КАТЕР', 'ЯХТА', 'ПАРОМ', 'САНИ', 'ПЛОТ', 'БАРЖА',
    'ВАГОН', 'МАШИНА', 'ТРАКТОР', 'ПАРОВОЗ', 'АВТОБУС', 'ТРАМВАЙ', 'КОРАБЛЬ', 'САМОЛЕТ', 'ВЕРТОЛЕТ', 'ГРУЗОВИК',
    'МОТОЦИКЛ', 'ВЕЛОСИПЕД'],

  'Одежда': ['ЮБКА', 'ШАРФ', 'ПОЯС', 'КЕПКА', 'МАЙКА', 'ШАПКА', 'БРЮКИ', 'ШОРТЫ', 'НОСКИ', 'КУРТКА',
    'ПАЛЬТО', 'ПЛАТЬЕ', 'САПОГИ', 'СВИТЕР', 'ПИЖАМА', 'КАРМАН', 'ВАРЕЖКИ', 'БОТИНКИ', 'РУБАШКА', 'ПЕРЧАТКИ',
    'ПУГОВИЦА', 'КРОССОВКИ'],

  'Дом и мебель': ['СТОЛ', 'СТУЛ', 'ШКАФ', 'ОКНО', 'ВАЗА', 'ЧАСЫ', 'ПОЛКА', 'ЛАМПА', 'КОВЕР', 'ДВЕРЬ',
    'ТУМБА', 'КУХНЯ', 'ВАННА', 'КРЫША', 'ДИВАН', 'КРЕСЛО', 'БАЛКОН', 'КРОВАТЬ', 'ЗЕРКАЛО', 'ПОДУШКА',
    'ОДЕЯЛО', 'ЛЕСТНИЦА'],

  'Еда': ['СУП', 'СЫР', 'СОК', 'ЧАЙ', 'МЕД', 'КАША', 'ХЛЕБ', 'ТОРТ', 'ПИРОГ', 'БЛИНЫ',
    'БУЛКА', 'БАТОН', 'МАСЛО', 'ОМЛЕТ', 'ВАФЛИ', 'ТВОРОГ', 'ЙОГУРТ', 'СУХАРИ', 'КОТЛЕТА', 'КОНФЕТА',
    'ВАРЕНЬЕ', 'ШОКОЛАД', 'ПЕЧЕНЬЕ', 'МАКАРОНЫ'],

  'Спорт': ['БЕГ', 'МЯЧ', 'ЛЫЖИ', 'БОКС', 'КУБОК', 'ТЕННИС', 'ФУТБОЛ', 'ХОККЕЙ', 'КОНЬКИ', 'ПРЫЖОК',
    'МЕДАЛЬ', 'РЕКОРД', 'ВОРОТА', 'ПОБЕДА', 'ТРЕНЕР', 'КОМАНДА', 'РАКЕТКА', 'СТАДИОН', 'ШАХМАТЫ', 'ПЛАВАНИЕ'],

  'Природа': ['ЛЕС', 'ЛУГ', 'РЕКА', 'ГОРА', 'ПОЛЕ', 'МОРЕ', 'СНЕГ', 'ОЗЕРО', 'СКАЛА', 'ВЕТЕР',
    'ГРОЗА', 'ТУМАН', 'ДОЖДЬ', 'РУЧЕЙ', 'БЕРЕГ', 'ПЕСОК', 'ОСТРОВ', 'БОЛОТО', 'РАДУГА', 'ОБЛАКО',
    'РОДНИК', 'ПЕЩЕРА', 'ДОЛИНА', 'ВОДОПАД'],

  'Профессии': ['ВРАЧ', 'ШВЕЯ', 'ПОВАР', 'ПИЛОТ', 'ПЕВЕЦ', 'АКТЕР', 'МОРЯК', 'ЮРИСТ', 'ПЕКАРЬ', 'ФЕРМЕР',
    'ПАСТУХ', 'ОХОТНИК', 'ИНЖЕНЕР', 'УЧИТЕЛЬ', 'САДОВНИК', 'ХУДОЖНИК', 'ПИСАТЕЛЬ', 'ВОДИТЕЛЬ', 'ПОЖАРНЫЙ'],

  'Музыка': ['ХОР', 'НОТА', 'АРФА', 'ГАММА', 'ТРУБА', 'ПЕСНЯ', 'БУБЕН', 'РОЯЛЬ', 'АККОРД', 'ГИТАРА',
    'ФЛЕЙТА', 'СКРИПКА', 'БАРАБАН', 'ОРКЕСТР', 'МЕЛОДИЯ', 'ГАРМОНЬ', 'КЛАВИШИ', 'ДИРИЖЕР'],

  'Игрушки': ['ЮЛА', 'ПАЗЛ', 'ЛОТО', 'МЯЧИК', 'КУКЛА', 'РОБОТ', 'МИШКА', 'ГОРКА', 'КУБИКИ', 'ДОМИНО',
    'ВОЛЧОК', 'КАЧЕЛИ', 'СВИСТОК', 'МОЗАИКА', 'САМОКАТ', 'СКАКАЛКА'],
};

const MIN_LEN = 3;
// Базовые буквы для заполнения пустых клеток. К ним всегда добавляются буквы
// самих слов — иначе редкая буква (Ь, Щ, Ю) выдавала бы слово с первого взгляда.
const FILLER_BASE = 'АВЕИКНОРСТЛУМПДЯБГЧШЗХЖЫЦЭЮФЩЬЙ';

const DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]];

function fittingWords(category, size) {
  return CATEGORIES[category].filter((w) => w.length >= MIN_LEN && w.length <= size);
}

function cellFree(grid, r, c, letter) {
  return grid[r][c] === '' || grid[r][c] === letter;
}

// Прямое размещение: по строке или столбцу.
function findStraightPath(grid, size, word) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const horizontal = Math.random() < 0.5;
    const dr = horizontal ? 0 : 1;
    const dc = horizontal ? 1 : 0;
    const r = randInt(0, size - 1 - dr * (word.length - 1));
    const c = randInt(0, size - 1 - dc * (word.length - 1));
    const path = Array.from({ length: word.length }, (_, i) => [r + dr * i, c + dc * i]);
    if (path.every(([pr, pc], i) => cellFree(grid, pr, pc, word[i]))) return path;
  }
  return null;
}

// Размещение «змейкой»: каждая следующая буква — в соседней клетке,
// путь может поворачивать, но не пересекает сам себя.
function findSnakePath(grid, size, word) {
  const starts = shuffle(
    Array.from({ length: size * size }, (_, k) => [Math.floor(k / size), k % size]),
  );

  for (const start of starts) {
    const path = [];
    const visited = new Set();

    const walk = (r, c, index) => {
      if (!cellFree(grid, r, c, word[index])) return false;
      const key = `${r},${c}`;
      if (visited.has(key)) return false;
      path.push([r, c]);
      visited.add(key);
      if (index === word.length - 1) return true;
      for (const [dr, dc] of shuffle(DIRS)) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
        if (walk(nr, nc, index + 1)) return true;
      }
      path.pop();
      visited.delete(key);
      return false;
    };

    if (walk(start[0], start[1], 0)) return path;
  }
  return null;
}

// Одна попытка собрать поле из подготовленного набора слов.
function buildBoard(size, wordCount, pool, category, snake) {
  const grid = Array.from({ length: size }, () => Array(size).fill(''));
  const placements = {};
  const placed = [];

  for (const word of pool) {
    if (placed.length >= wordCount) break;
    const path = snake ? findSnakePath(grid, size, word) : findStraightPath(grid, size, word);
    if (!path) continue;
    path.forEach(([r, c], i) => { grid[r][c] = word[i]; });
    placements[word] = path;
    placed.push(word);
  }
  if (placed.length < wordCount) return null;

  const letters = FILLER_BASE + placed.join('');
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c]) grid[r][c] = letters[randInt(0, letters.length - 1)];
    }
  }
  return { grid, words: placed, placements, category, snake };
}

// Собирает поле. excludeCategory — тема прошлого раунда (чтобы не повторяться),
// usedWords — слова, которые уже попадались: они уходят в конец очереди.
export function generateBoard(size, wordCount, { excludeCategory = null, usedWords = new Set(), snake = false } = {}) {
  const usable = Object.keys(CATEGORIES).filter((c) => fittingWords(c, size).length >= wordCount);
  const preferred = usable.filter((c) => c !== excludeCategory);
  const categories = preferred.length ? preferred : usable;

  for (let attempt = 0; attempt < 60; attempt++) {
    const category = categories[randInt(0, categories.length - 1)];
    const all = fittingWords(category, size);
    const fresh = shuffle(all.filter((w) => !usedWords.has(w)));
    const stale = shuffle(all.filter((w) => usedWords.has(w)));
    const board = buildBoard(size, wordCount, [...fresh, ...stale], category, snake);
    if (board) return board;
  }
  // запасной вариант: без учёта свежести и прошлой темы
  for (const category of shuffle(usable)) {
    const board = buildBoard(size, wordCount, shuffle(fittingWords(category, size)), category, snake);
    if (board) return board;
  }
  throw new Error('Не удалось сгенерировать поле');
}
