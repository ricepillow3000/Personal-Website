import { gsap } from 'gsap';
import { seeded, reducedMotion } from '../core/util.js';

const COLORS = ['c-black', 'c-white', 'c-red', 'c-paper', 'c-black', 'c-white'];

/** Seed for John's name so it looks identical everywhere (title, board, cut-ins). */
export const NAME_SEED = 11;

/** Builds cut-out "ransom note" letters into el. Medium chaos: ±12° tilt, small hops, 5 fonts. */
export function ransom(el, text, seed = 7) {
  const rnd = seeded(seed * 9973 + text.length * 31);
  el.setAttribute('aria-label', text);
  el.innerHTML = '';
  text.split(' ').forEach((word) => {
    const w = document.createElement('span');
    w.className = 'rw';
    w.setAttribute('aria-hidden', 'true');
    [...word].forEach((ch) => {
      const l = document.createElement('span');
      l.className = `rl f${Math.floor(rnd() * 5)} ${COLORS[Math.floor(rnd() * COLORS.length)]}`;
      l.style.setProperty('--r', `${(rnd() * 24 - 12).toFixed(1)}deg`);
      l.style.setProperty('--y', `${(rnd() * 0.16 - 0.08).toFixed(2)}em`);
      l.textContent = ch;
      w.appendChild(l);
    });
    el.appendChild(w);
  });
  el.onpointerenter = () => shiver(el);
  return el;
}

/** Letters drop in from above at random tilts. Returns a timeline. */
export function dropIn(el, delay = 0) {
  const letters = el.querySelectorAll('.rl');
  if (reducedMotion() || !letters.length) return gsap.timeline();
  return gsap.timeline({ delay }).from(letters, {
    y: -70,
    rotation: () => gsap.utils.random(-40, 40),
    opacity: 0,
    duration: 0.38,
    ease: 'back.out(2.2)',
    stagger: 0.035
  });
}

/** Hover shiver: tiny random shake that settles (hover only, never idle). */
export function shiver(el) {
  if (reducedMotion() || el.dataset.shivering) return;
  el.dataset.shivering = '1';
  const letters = el.querySelectorAll('.rl');
  const r = () => gsap.utils.random(-3, 3);
  gsap.to(letters, {
    keyframes: [{ x: r, y: r }, { x: r, y: r }, { x: r, y: r }, { x: 0, y: 0 }],
    duration: 0.22,
    ease: 'none',
    stagger: 0.008,
    onComplete: () => delete el.dataset.shivering
  });
}
