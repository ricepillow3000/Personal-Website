import { gsap } from 'gsap';
import { reducedMotion } from '../core/util.js';

/* Small kinetic touches, ported to vanilla JS + GSAP from Motion Primitives
   (TextScramble, Magnetic, SlidingNumber, Tilt, ScrollProgress), plus one Anime.js
   effect (slam-in on scroll) that loads lazily so the first screen stays fast. */

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

/** Tilt (Motion Primitives "Tilt"): a hovered [data-tilt] card leans toward the mouse in 3D,
    like a card picked up off the board. It only feeds two CSS variables, the hover rule in
    board.css does the rest, so it never fights the cards' own animations. */
export function initTilt() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const MAX = 6; // degrees: enough to feel physical, small enough to keep text crisp
  let card = null;
  const reset = () => {
    if (card) card.style.removeProperty('--rx'), card.style.removeProperty('--ry');
    card = null;
  };
  document.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const hit = reducedMotion() ? null : e.target.closest?.('[data-tilt]');
    if (hit !== card) reset();
    if (!hit) return;
    card = hit;
    const r = hit.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    hit.style.setProperty('--rx', `${(-y * MAX * 2).toFixed(2)}deg`);
    hit.style.setProperty('--ry', `${(x * MAX * 2).toFixed(2)}deg`);
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', reset);
}

/** Scroll meter (Motion Primitives "Scroll Progress"): a red heist-tape bar on top of the
    screen fills as you scroll a long page, so you always know how much is left. */
export function initScrollMeter() {
  const bar = document.createElement('div');
  bar.className = 'scroll-meter';
  bar.setAttribute('aria-hidden', 'true');
  bar.innerHTML = '<i></i>';
  document.body.appendChild(bar);
  const fill = bar.firstChild;
  const setX = gsap.quickTo(fill, 'scaleX', { duration: 0.35, ease: 'power3.out' }); // springy follow
  const sync = () => {
    const sc = document.querySelector('.screen.active');
    const room = sc ? sc.scrollHeight - sc.clientHeight : 0;
    const on = room > 60;
    const sp = on ? Math.min(1, Math.max(0, sc.scrollTop / room)) : 0;
    bar.classList.toggle('on', on);
    setX(sp);
    sc?.style.setProperty('--sp', sp.toFixed(3)); // background layers drift with the story (see pages.css)
  };
  document.addEventListener('scroll', sync, { capture: true, passive: true }); // screens scroll, not the page
  window.addEventListener('resize', sync, { passive: true });
  return sync;
}

/** Slam-in on scroll (Anime.js): blocks that start below the fold punch up into place the
    moment you scroll to them, so a long page keeps the comic energy all the way down.
    Anime.js loads lazily (its own small file) and is skipped entirely with reduced motion.
    It only moves the separate translate/rotate/scale properties through one CSS variable,
    so it can't clash with GSAP entrances or hover lifts. Nothing is ever hidden. */
let animeLib;
export function slamOnScroll(root, selector, onSlam) {
  if (!root) return;
  root._slamIO?.disconnect();
  root.querySelectorAll('.slam-wait').forEach((el) => el.classList.remove('slam-wait'));
  if (reducedMotion() || !('IntersectionObserver' in window)) return;
  (animeLib ||= import('./anime-lite.js')).then(({ animate, stagger }) => {
    if (!root.isConnected || reducedMotion()) return;
    const below = [...root.querySelectorAll(selector)].filter((el) => el.getBoundingClientRect().top > window.innerHeight);
    if (!below.length) return;
    const io = new IntersectionObserver((entries) => {
      const hit = entries.filter((en) => en.isIntersecting).map((en) => en.target);
      if (!hit.length) return;
      hit.forEach((el) => io.unobserve(el));
      // each box is heard as it lands (a page's own voice, see main.js), on the same 70 ms stagger
      if (onSlam) hit.slice(0, 5).forEach((el, k) => setTimeout(() => onSlam(el), k * 70));
      animate(hit, {
        '--slam': [0, 1], duration: 560, ease: 'outBack(1.9)', delay: stagger(70),
        onComplete: () => hit.forEach((el) => { el.classList.remove('slam-wait'); el.style.removeProperty('--slam'); })
      });
    }, { threshold: 0.1 });
    below.forEach((el) => { el.classList.add('slam-wait'); io.observe(el); });
    root._slamIO = io;
  }).catch(() => {}); // no Anime.js, no slam: the page simply stays still
}
