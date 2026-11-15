import { gsap } from 'gsap';
import { reducedMotion } from '../core/util.js';
import { ransom, shiver } from './ransom.js';

/* John's on-screen name in the conversation: the same cut-out "ransom note"
   letters as the title screen (same seed, so it looks identical) + the PIRATE slab.
   Same API the conversation expects: set(expr), mouth(open), bounce(). */

const MOODS = ['neutral', 'smirk', 'excited', 'thinking', 'panicked'];
export const NAME_SEED = 11;

export function createTag(el) {
  let mood = 'neutral';
  el.innerHTML = `<div class="name-block">
      <div class="ransom name-ransom"></div>
      <div class="slab name-slab"><span>PIRATE</span></div>
    </div>`;
  const word = el.querySelector('.name-ransom');
  ransom(word, 'JOHN', NAME_SEED);
  el.dataset.mood = mood;
  if (!reducedMotion()) {
    gsap.to(el.querySelector('.name-block'), { scale: 1.015, transformOrigin: '0% 100%', duration: 2.4, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  }
  return {
    get expr() {
      return mood;
    },
    set(next) {
      if (!MOODS.includes(next) || next === mood) return;
      mood = next;
      el.dataset.mood = mood;
      if (!reducedMotion()) {
        gsap.fromTo(word.querySelectorAll('.rl'), { y: -14, rotation: () => gsap.utils.random(-14, 14) }, { y: 0, rotation: 0, duration: 0.3, ease: 'back.out(2.5)', stagger: 0.03, clearProps: 'transform' });
      }
    },
    /** While "talking", the letters shiver. */
    mouth(open) {
      if (open) shiver(word);
    },
    bounce() {
      if (reducedMotion()) return;
      gsap.fromTo(el, { y: 0 }, { y: -12, duration: 0.09, yoyo: true, repeat: 1, ease: 'power2.out' });
    }
  };
}
