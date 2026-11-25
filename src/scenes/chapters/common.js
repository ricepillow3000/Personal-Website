/* What every chapter page shares (src/scenes/chapters/*.js). */
import { gsap } from 'gsap';
import { esc } from '../../core/util.js';
import { clearStampMarkup } from '../../ui/clear.js';

/* an outbound-link arrow drawn as a shape (Nov 21, John: the north-east arrow character showed as a blue emoji tile on his iPhone; no emojis anywhere) */
export const EXT = '<svg class="ext" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 9.5 9 3M4 2.5h5.5V8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="square"/></svg>';

export const back = '<button class="btn back-btn" type="button" data-back>◂ THE PLAN <kbd>ESC</kbd></button>';
export const head = (title, sub = '') => `
  <div class="page-head"><h2 class="ransom ransom-lg" data-ransom="${esc(title)}"></h2></div>
  ${sub ? `<p class="page-sub" data-in>${sub}</p>` : ''}`;
export const cleared = (on) => (on ? clearStampMarkup() : '');

/* Highlight numbers in a sentence with the yellow marker. */
export const mark = (text) =>
  String(text)
    .split(/(\d[\d,.]*\+?(?:%|\s(?:of \d[\d,]*|lines|tests|years|checks|errors|bugs|workflows))?|−\d+%)/g)
    .map((part, i) => (i % 2 ? `<span class="hl">${esc(part)}</span>` : esc(part)))
    .join('');

/* Big outlined word drifting behind each page (background depth layer). */
export const watermark = (word) => `<div class="pg-mark" aria-hidden="true"><span>${word}</span><span>${word}</span></div>`;

/* Shared slam for page-specific intros: offset by ~3 frames, overshoot, settle. */
export const slamIn = (els, from, extra = {}) =>
  gsap.from(els, { ...from, duration: 0.34, ease: 'back.out(2.4)', stagger: 0.05, clearProps: 'transform,opacity,visibility', ...extra });

/* a work story in four beats (setup, tension, pivot, lesson): a hiring manager wants the bets, where it broke and what was learned */
export const storyList = (beats) => `<ol class="story-beats">${beats.map(([k, t]) => `<li><b>${esc(k)}</b><span>${esc(t)}</span></li>`).join('')}</ol>`;
