// Звуки синтезируются через Web Audio — без аудиофайлов, работает офлайн.
import { storage } from './storage.js';

let ctx = null;
let muted = storage.read('muted', false);

function ensure() {
  if (muted) return null;
  try {
    ctx ??= new (window.AudioContext ?? window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq, { at = 0, dur = 0.15, type = 'triangle', vol = 0.12, slide } = {}) {
  const audio = ensure();
  if (!audio) return;
  const t0 = audio.currentTime + at;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(audio.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sound = {
  get muted() {
    return muted;
  },
  toggle() {
    muted = !muted;
    storage.write('muted', muted);
    return muted;
  },
  tap() {
    tone(420, { dur: 0.06, vol: 0.07 });
  },
  right() {
    tone(660, { dur: 0.12 });
    tone(880, { at: 0.09, dur: 0.16 });
  },
  wrong() {
    tone(200, { dur: 0.25, type: 'sawtooth', vol: 0.07, slide: 120 });
  },
  unlock() {
    [880, 1175, 1568].forEach((f, i) => tone(f, { at: i * 0.07, dur: 0.12, vol: 0.1 }));
  },
  win() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, { at: i * 0.12, dur: i === 3 ? 0.4 : 0.15 }));
  },
};
