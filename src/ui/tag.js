import { gsap } from 'gsap';
import { reducedMotion } from '../core/util.js';

/* Graffiti name tag — John's on-screen presence in the conversation.
   Spray halo, crown stencil, chunky marker letters with a black 3D extrusion,
   white sheen, paint drips and a "PIRATE" stencil strip. Typography only, no face.
   Same API the conversation expects: set(expr), mouth(open), bounce(). */

const MOODS = ['neutral', 'smirk', 'excited', 'thinking', 'panicked'];

export function tagMarkup(viewBox = '0 0 420 330') {
  const dripX = [92, 128, 196, 232, 300, 342];
  const dripLen = [46, 22, 64, 30, 52, 26];
  return `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
  <defs>
    <radialGradient id="tagHalo"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".35"/><stop offset=".5" stop-color="#E60012" stop-opacity=".55"/><stop offset="1" stop-color="#E60012" stop-opacity="0"/></radialGradient>
    <pattern id="tagDots" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="1.6" fill="#050505" opacity=".45"/></pattern>
  </defs>
  <ellipse cx="210" cy="180" rx="210" ry="140" fill="url(#tagHalo)"/>

  <!-- crown stencil -->
  <g class="tag-crown" transform="rotate(-10 120 70)">
    <path d="M70 92 l 14 -50 l 24 32 l 22 -44 l 22 44 l 24 -32 l 14 50 Z" fill="#FFFFFF" stroke="#050505" stroke-width="7" stroke-linejoin="round" paint-order="stroke"/>
    <circle cx="84" cy="38" r="7" fill="#E60012" stroke="#050505" stroke-width="4"/><circle cx="130" cy="26" r="7" fill="#E60012" stroke="#050505" stroke-width="4"/><circle cx="176" cy="38" r="7" fill="#E60012" stroke="#050505" stroke-width="4"/>
  </g>

  <!-- drips under the letters -->
  <g class="tag-drips">${dripX.map((x, i) => `<path d="M${x} 214 v ${dripLen[i]} a 5 5 0 0 0 10 0 v -${dripLen[i]} Z" fill="#E60012" stroke="#050505" stroke-width="3"/>`).join('')}</g>

  <!-- letters: black extrusion, red fill with thick outline, dots, white sheen -->
  <g class="tag-word" transform="rotate(-8 210 170)">
    <text x="214" y="226" text-anchor="middle" font-family="'Permanent Marker', 'Comic Sans MS', cursive" font-size="128" fill="#050505" stroke="#050505" stroke-width="18" stroke-linejoin="round">JOHN</text>
    <text x="206" y="216" text-anchor="middle" font-family="'Permanent Marker', 'Comic Sans MS', cursive" font-size="128" fill="#E60012" stroke="#050505" stroke-width="12" stroke-linejoin="round" paint-order="stroke">JOHN</text>
    <text x="206" y="216" text-anchor="middle" font-family="'Permanent Marker', 'Comic Sans MS', cursive" font-size="128" fill="url(#tagDots)">JOHN</text>
    <text x="200" y="208" text-anchor="middle" font-family="'Permanent Marker', 'Comic Sans MS', cursive" font-size="128" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-dasharray="22 40" opacity=".9">JOHN</text>
  </g>

  <!-- underline swoosh + stencil strip -->
  <path d="M60 268 C 160 246, 280 250, 370 236 L 382 222 L 404 252 L 370 270 L 374 256 C 280 268, 170 272, 66 290 Z" fill="#FFFFFF" stroke="#050505" stroke-width="6" stroke-linejoin="round" paint-order="stroke"/>
  <g transform="rotate(-4 210 306)">
    <rect x="128" y="290" width="168" height="34" fill="#050505"/>
    <text x="212" y="317" text-anchor="middle" font-family="'Bebas Neue', Impact, sans-serif" font-size="30" letter-spacing="8" fill="#FFFFFF">PIRATE</text>
  </g>

  <!-- excited sparkles (shown via CSS) -->
  <g class="tag-sparkle">
    <path d="M378 70 l 7 -22 l 7 22 l 22 7 l -22 7 l -7 22 l -7 -22 l -22 -7 Z" fill="#FFE11A" stroke="#050505" stroke-width="4" stroke-linejoin="round"/>
    <path d="M40 160 l 4 -12 l 4 12 l 12 4 l -12 4 l -4 12 l -4 -12 l -12 -4 Z" fill="#FFFFFF" stroke="#050505" stroke-width="3" stroke-linejoin="round"/>
  </g>
  <!-- panic marks (shown via CSS) -->
  <g class="tag-panic" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round">
    <path d="M28 70 l 30 18 M20 110 l 36 4 M392 120 l -32 14 M404 170 l -36 -2"/>
  </g>
</svg>`;
}

export function createTag(el) {
  let mood = 'neutral';
  el.innerHTML = tagMarkup();
  el.dataset.mood = mood;
  if (!reducedMotion()) {
    gsap.to(el, { scale: 1.015, transformOrigin: '50% 100%', duration: 2.4, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  }
  return {
    get expr() {
      return mood;
    },
    set(next) {
      if (!MOODS.includes(next) || next === mood) return;
      mood = next;
      el.dataset.mood = mood;
      if (!reducedMotion()) gsap.fromTo(el.querySelector('.tag-word'), { scale: 1.08 }, { scale: 1, duration: 0.25, ease: 'back.out(3)', transformOrigin: '50% 50%' });
    },
    /** While "talking", the tag pulses like a speaker cone. */
    mouth(open) {
      el.classList.toggle('talking', open);
    },
    bounce() {
      if (reducedMotion()) return;
      gsap.fromTo(el, { y: 0 }, { y: -12, duration: 0.09, yoyo: true, repeat: 1, ease: 'power2.out' });
    }
  };
}
