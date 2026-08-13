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
    description: 'Слова спрятались в сетке из букв! Отыщи их все: животные, фрукты, школа и космос.',
    icon: '🔍',
    tags: ['слова'],
    module: () => import('./games/word-search/game.js'),
  },
];

export function getGame(id) {
  return games.find((g) => g.id === id) ?? null;
}
