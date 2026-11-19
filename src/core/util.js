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
  // the visitor's own clock, in the words a game calendar uses (Nov 19, John's calendar references)
  if (h >= 4 && h < 7) return { key: 'early', label: 'Early Morning', word: 'early in the morning', icon: 'sun' };
  if (h >= 7 && h < 11) return { key: 'morning', label: 'Morning', word: 'morning', icon: 'sun' };
  if (h >= 11 && h < 13) return { key: 'lunch', label: 'Lunchtime', word: 'lunchtime', icon: 'sun' };
  if (h >= 13 && h < 16) return { key: 'daytime', label: 'Afternoon', word: 'afternoon', icon: 'sun' };
  if (h >= 16 && h < 18) return { key: 'after', label: 'After School', word: 'afternoon', icon: 'sun' };
  if (h >= 18 && h < 21) return { key: 'evening', label: 'Evening', word: 'evening', icon: 'moon' };
  return { key: 'late', label: 'Late Night', word: 'late at night', icon: 'moon' };
}

/** Seeded random so ransom letters look the same on every visit. */
export function seeded(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/* Web fonts load without blocking the first paint (see app.html). Big cut-out titles wait for
   their fonts (never flash in a backup font), but never longer than maxMs after page start. */
const BRAND_FONTS = ['Anton', 'Bebas Neue', 'Permanent Marker', 'Special Elite'];
export function fontsReady(maxMs = 1200) {
  const cap = new Promise((r) => setTimeout(r, Math.max(0, maxMs - performance.now())));
  if (!document.fonts?.load) return Promise.resolve();
  const link = document.getElementById('gfonts');
  const sheet = new Promise((r) => {
    if (!link || link.media === 'all') return r();
    link.addEventListener('load', () => r(), { once: true });
    link.addEventListener('error', () => r(), { once: true });
  });
  const faces = sheet.then(() => Promise.all(BRAND_FONTS.map((f) => document.fonts.load(`40px "${f}"`))));
  return Promise.race([faces, cap]).catch(() => {});
}
