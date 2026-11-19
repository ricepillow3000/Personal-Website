import { esc, seeded } from '../core/util.js';

/* Cut type (THE PLAN's chapter stack, the menu): each letter picks one of the five site fonts, a size and a small
   tilt, and some sit in a box (like letters cut from different magazines). Seeded, so a chapter
   always looks the same. Plain text for screen readers lives on the link's label. */
export function cutType(text, seed, { mixCase = false } = {}) {
  const rnd = seeded(seed * 7919 + 13);
  return [...text].map((ch, i) => {
    if (ch === ' ') return '<span class="ct-gap"> </span>'; // a real space, so the name a screen reader hears matches the words on screen
    const f = [0, 1, 4][Math.floor(rnd() * 3)]; // Anton, Bebas, the heavy serif: still cut-out, quick to read
    const box = rnd() < 0.28 ? ' box' : '';
    const sz = (0.84 + rnd() * 0.3).toFixed(2);
    const r = (rnd() * 12 - 6).toFixed(1);
    const y = (rnd() * 0.12 - 0.06).toFixed(2);
    // the menu (Nov 19, John's reference): a few small lowercase letters among the capitals; never the
    // first letter, and only in fonts that have lowercase (Bebas is capitals only)
    const low = mixCase && i > 0 && f !== 1 && rnd() < 0.3 ? ' low' : '';
    const c = low ? ch.toLowerCase() : ch;
    return `<span class="ct f${f}${box}${low}" style="--s:${sz};--r:${r}deg;--y:${y}em">${esc(c)}</span>`;
  }).join('');
}
