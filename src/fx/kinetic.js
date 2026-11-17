import { gsap } from 'gsap';
import { reducedMotion } from '../core/util.js';

/* Small kinetic touches, ported to vanilla JS + GSAP from ideas in Motion Primitives
   (TextScramble, Magnetic, SlidingNumber). No extra libraries. */

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*';

/** Decode effect: letters flicker through random glyphs, then lock in left to right.
    Spaces and punctuation stay put, so the line keeps its shape. */
export function scramble(el, text = el.textContent, { duration = 0.5, speed = 0.035 } = {}) {
  if (!el) return;
  clearInterval(el._scramble);
  if (reducedMotion()) {
    el.textContent = text;
    return;
  }
  const steps = Math.max(1, Math.round(duration / speed));
  let step = 0;
  el._scramble = setInterval(() => {
    const shown = (step / steps) * text.length;
    let out = '';
    for (let i = 0; i < text.length; i++) {
      out += i < shown || !/[A-Za-z0-9]/.test(text[i]) ? text[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }
    el.textContent = out;
    if (++step > steps) {
      clearInterval(el._scramble);
      el.textContent = text;
    }
  }, speed * 1000);
}

/** Magnetic pull: a [data-magnetic] element leans toward the pointer and springs back on leave.
    Uses the separate `translate` property, so its own transform animations keep working. */
export function initMagnetic() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  let el = null;
  // each element keeps its own offset, so leaving one for another never strands it off-centre
  const to = (target, x, y, back) => {
    const pos = (target._mag ||= { x: 0, y: 0 });
    gsap.to(pos, {
      x, y, duration: back ? 0.6 : 0.3, ease: back ? 'elastic.out(1, .35)' : 'power3.out', overwrite: true,
      onUpdate: () => (target.style.translate = `${pos.x.toFixed(1)}px ${pos.y.toFixed(1)}px`)
    });
  };
  document.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || reducedMotion()) return;
    const hit = e.target.closest?.('[data-magnetic]');
    if (hit !== el) {
      if (el) to(el, 0, 0, true);
      el = hit;
    }
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const max = 12;
    to(el, Math.max(-max, Math.min(max, dx * 0.25)), Math.max(-max, Math.min(max, dy * 0.35)));
  }, { passive: true });
  // pointer left the window: let go
  document.documentElement.addEventListener('mouseleave', () => {
    if (el) to(el, 0, 0, true);
    el = null;
  });
}

/** Slot-machine roll for a counter that just changed: the new number drops in from above. */
export function rollIn(el) {
  if (!el || reducedMotion()) return;
  gsap.fromTo(el, { yPercent: -110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.42, ease: 'back.out(2.6)', clearProps: 'transform,opacity' });
}
