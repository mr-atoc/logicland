// Реестр подключённых игр. Чтобы добавить новую игру:
// 1) создай папку js/games/<id>/ с файлом game.js (контракт описан в README.md);
// 2) добавь сюда одну запись — и игра появится на сайте.
export const games = [
  {
    id: 'math-express',
    title: 'Математический экспресс',
    description: 'Веди поезд от станции к станции, решая примеры: сложение, вычитание, умножение, деление и примеры в два действия.',
    icon: '🚂',
    tags: ['математика'],
    module: () => import('./games/math-express/game.js'),
  },
  {
    id: 'pattern-quest',
    title: 'Что дальше?',
    description: 'Разгадай закономерность и продолжи ряд: фигуры, числа и хитрые последовательности.',
    icon: '🧩',
    tags: ['логика'],
    module: () => import('./games/pattern-quest/game.js'),
  },
  {
    id: 'sudoku',
    title: 'Судоку',
    description: 'Классическая головоломка с числами: заполни поле так, чтобы числа не повторялись. Три размера — 4×4, 6×6 и 9×9.',
    icon: '🔢',
    tags: ['логика', 'числа'],
    module: () => import('./games/sudoku/game.js'),
  },
  {
    id: 'word-search',
    title: 'Найди слова',
    description: 'Слова спрятались в сетке из букв: 15 тем от животных до космоса. А на уровнях «Змейка» слова ещё и поворачивают!',
    icon: '🔍',
    tags: ['слова'],
    module: () => import('./games/word-search/game.js'),
  },
  {
    id: 'crossword',
    title: 'Кроссворд',
    description: 'Настоящий кроссворд с вопросами: впиши слова по горизонтали и вертикали. Каждый раз новый!',
    icon: '📗',
    tags: ['слова', 'эрудиция'],
    module: () => import('./games/crossword/game.js'),
  },
  {
    id: 'shape-matrix',
    title: 'Логические таблицы',
    description: 'В таблице спряталось правило — разгадай его и выбери, что должно быть в пустой клетке.',
    icon: '🗂️',
    tags: ['логика'],
    module: () => import('./games/shape-matrix/game.js'),
  },
  {
    id: 'brain-teasers',
    title: 'Задачи-смекалки',
    description: 'Хитрые текстовые задачки: ноги и головы во дворе, дни недели, этажи и возрасты. Читай внимательно!',
    icon: '🧠',
    tags: ['смекалка'],
    module: () => import('./games/brain-teasers/game.js'),
  },
  {
    id: 'place-signs',
    title: 'Расставь знаки',
    description: 'Расставь + − × ÷ между числами так, чтобы получился нужный ответ.',
    icon: '🧮',
    tags: ['математика'],
    module: () => import('./games/place-signs/game.js'),
  },
  {
    id: 'maze',
    title: 'Лабиринт',
    description: 'Помоги мышонку добраться до сыра! Квадратные и круговые лабиринты — веди дорожку пальцем или мышкой.',
    icon: '🌀',
    tags: ['логика'],
    module: () => import('./games/maze/game.js'),
  },
  {
    id: 'pyramid',
    title: 'Башни и весы',
    description: 'Строй числовые башни от 3 до 10 этажей: каждое число — сумма двух под ним. А ещё рассуди, что тяжелее на весах.',
    icon: '🔺',
    tags: ['математика', 'логика'],
    module: () => import('./games/pyramid/game.js'),
  },
];

export function getGame(id) {
  return games.find((g) => g.id === id) ?? null;
}
