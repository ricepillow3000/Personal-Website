import { gsap } from 'gsap';
import { reducedMotion } from '../core/util.js';

/* Click "hit" effects: a sharp starburst, flying shards and a ring at the click point,
   plus a squash-and-spring on the button itself. One shared layer, nodes recycled. */

let layer = null;
function getLayer() {
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'fx-hit-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
  }
  return layer;
}

const STAR = '50,0 59,33 92,14 70,43 100,52 68,62 84,96 52,72 30,100 34,66 0,70 26,46 4,18 40,30';
const PALETTES = [
  { fill: '#FFE11A', edge: '#0B0B0B', shard: '#0B0B0B', ring: '#E5191C' },
  { fill: '#F5F5F0', edge: '#0B0B0B', shard: '#E5191C', ring: '#0B0B0B' },
  { fill: '#E5191C', edge: '#0B0B0B', shard: '#0B0B0B', ring: '#F5F5F0' }
];
let pick = 0;

/** Starburst hit at (x, y) in viewport px. size scales everything (1 = button click). */
export function burst(x, y, size = 1) {
  if (reducedMotion()) return;
  const p = PALETTES[pick++ % PALETTES.length];
  const hit = document.createElement('div');
  hit.className = 'fx-hit';
  hit.style.left = `${x}px`;
  hit.style.top = `${y}px`;
  hit.style.setProperty('--s', size);
  const shards = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * 360 + gsap.utils.random(-14, 14);
    return `<i class="fx-shard" style="--a:${a.toFixed(0)}deg;background:${p.shard}"></i>`;
  }).join('');
  hit.innerHTML = `<i class="fx-ring" style="border-color:${p.ring}"></i>${shards}
    <svg class="fx-star" viewBox="0 0 100 100"><polygon points="${STAR}" fill="${p.fill}" stroke="${p.edge}" stroke-width="6" stroke-linejoin="miter"/></svg>`;
  getLayer().appendChild(hit);

  const tl = gsap.timeline({ onComplete: () => hit.remove() });
  tl.fromTo(hit.querySelector('.fx-star'),
    { scale: 0.15, rotation: gsap.utils.random(-50, -20) },
    { scale: 1, rotation: gsap.utils.random(-6, 6), duration: 0.11, ease: 'expo.out' }, 0)
    .to(hit.querySelector('.fx-star'), { scale: 0, rotation: '+=40', duration: 0.18, ease: 'power3.in' }, 0.13)
    .fromTo(hit.querySelector('.fx-ring'), { scale: 0.2, opacity: 1 }, { scale: 1.6, opacity: 0, duration: 0.34, ease: 'expo.out' }, 0)
    .fromTo(hit.querySelectorAll('.fx-shard'),
      { x: 0, scaleX: 0.2 },
      { x: () => gsap.utils.random(46, 78) * size, scaleX: 1, duration: 0.3, ease: 'expo.out' }, 0)
    .to(hit.querySelectorAll('.fx-shard'), { scaleY: 0, opacity: 0, duration: 0.14, ease: 'power2.in' }, 0.16);
}

/** Squash + spring on the pressed element. Uses the separate `scale` property,
    so the element's own skew/translate transforms (hover states) stay intact. */
export function squash(el) {
  if (reducedMotion() || !el.animate) return;
  el.animate(
    [{ scale: '1' }, { scale: '0.86 0.8' }, { scale: '1.08 1.1' }, { scale: '0.98' }, { scale: '1' }],
    { duration: 380, easing: 'cubic-bezier(.2,.9,.3,1)', offsets: [0, 0.18, 0.45, 0.72, 1] }
  );
}

const PRESSABLE = 'button, a[href], [role="button"], [role="menuitem"], .skill, .case-open';

/** Every click on something pressable gets the hit + squash. */
export function initClickFx() {
  document.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const el = e.target.closest?.(PRESSABLE);
    if (!el || el.disabled) return;
    squash(el);
    burst(e.clientX, e.clientY, el.matches('.btn-primary, .cta, #pressStart') ? 1.35 : 1);
  }, { passive: true });

  // Keyboard presses (Enter/Space) fire click with detail 0: burst from the element's center.
  document.addEventListener('click', (e) => {
    if (e.detail !== 0) return;
    const el = e.target.closest?.(PRESSABLE);
    if (!el) return;
    const r = el.getBoundingClientRect();
    squash(el);
    burst(r.left + r.width / 2, r.top + r.height / 2, 1);
  });
}
