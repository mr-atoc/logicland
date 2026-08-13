// Визуальные эффекты: конфетти и звёзды с анимацией.
import { el } from './dom.js';

export function starsEl(stars, fallback = '💪') {
  const wrap = el('div', { class: 'results-stars' });
  if (stars <= 0) {
    wrap.textContent = fallback;
    return wrap;
  }
  for (let i = 0; i < stars; i++) {
    wrap.append(el('span', { class: 'star-pop', style: `animation-delay:${0.15 + i * 0.18}s` }, '⭐'));
  }
  return wrap;
}

export function confetti(count = 90) {
  const colors = ['#ff5d5d', '#ffb84d', '#ffe14d', '#4dd47a', '#4da3ff', '#b06bff'];
  const wrap = document.createElement('div');
  wrap.className = 'confetti';
  for (let i = 0; i < count; i++) {
    const p = document.createElement('i');
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = colors[i % colors.length];
    p.style.width = `${6 + Math.random() * 6}px`;
    p.style.height = `${9 + Math.random() * 7}px`;
    p.style.animationDuration = `${2.2 + Math.random() * 1.8}s`;
    p.style.animationDelay = `${Math.random() * 0.5}s`;
    p.style.setProperty('--dx', `${(Math.random() - 0.5) * 180}px`);
    wrap.append(p);
  }
  document.body.append(wrap);
  setTimeout(() => wrap.remove(), 4500);
}
