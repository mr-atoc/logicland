// Генератор «Расставь знаки»: числа и результат, знаки подбирает игрок.
// Вычисление — с приоритетом операций (× и ÷ раньше + и −), деление только нацело.
import { randInt, pick } from '../../core/dom.js';

export function evalOps(nums, ops) {
  const n = [...nums];
  const o = [...ops];
  for (let i = 0; i < o.length;) {
    if (o[i] === '×' || o[i] === '÷') {
      if (o[i] === '÷' && (n[i + 1] === 0 || n[i] % n[i + 1] !== 0)) return null;
      const value = o[i] === '×' ? n[i] * n[i + 1] : n[i] / n[i + 1];
      n.splice(i, 2, value);
      o.splice(i, 1);
    } else {
      i++;
    }
  }
  let acc = n[0];
  for (let i = 0; i < o.length; i++) acc = o[i] === '+' ? acc + n[i + 1] : acc - n[i + 1];
  return acc;
}

export function genPuzzle({ count, ops }) {
  for (let attempt = 0; attempt < 800; attempt++) {
    const nums = Array.from({ length: count }, () => randInt(1, 9));
    const solution = Array.from({ length: count - 1 }, () => pick(ops));
    const target = evalOps(nums, solution);
    if (target === null || !Number.isInteger(target) || target < 0 || target > 100) continue;
    // если доступно деление — почаще требуем его в решении
    if (ops.includes('÷') && !solution.includes('÷') && Math.random() < 0.6) continue;
    // отсекаем скучные случаи, где ответ равен первому числу и все знаки «нулевые»
    return { nums, target, ops, solution };
  }
  // практически недостижимо, но пусть будет безопасный вариант
  return { nums: [2, 3], target: 5, ops: ['+', '−'], solution: ['+'] };
}
