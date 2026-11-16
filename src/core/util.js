import { store } from './store.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Escape text for safe HTML interpolation. */
export function esc(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

/** True when motion should be minimal (OS setting, unless overridden in SYSTEM). */
export function reducedMotion() {
  const pref = store.get().settings.reduceMotion;
  return pref === null ? mq.matches : pref;
}

export const isPhone = () => window.matchMedia('(max-width: 760px)').matches;


export function timeOfDay(date = new Date()) {
  const h = date.getHours();
  if (h >= 5 && h < 12) return { key: 'morning', label: 'DAYTIME', word: 'morning', icon: 'sun' };
  if (h >= 12 && h < 16) return { key: 'daytime', label: 'DAYTIME', word: 'afternoon', icon: 'sun' };
  if (h >= 16 && h < 18) return { key: 'after', label: 'AFTER SCHOOL', word: 'afternoon', icon: 'sun' };
  if (h >= 18 && h < 22) return { key: 'evening', label: 'EVENING', word: 'evening', icon: 'moon' };
  return { key: 'late', label: 'LATE NIGHT', word: 'late at night', icon: 'moon' };
}

/** Seeded random so ransom letters look the same on every visit. */
export function seeded(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
