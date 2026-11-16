import { gsap } from 'gsap';
import { $, reducedMotion } from '../core/util.js';
import { ransom, NAME_SEED } from '../ui/ransom.js';
import { burst } from './impact.js';

/* Every big animation runs through here so ONE click / Esc can skip it. */
let current = null;

export function skipCurrent() {
  if (current && current.isActive()) {
    current.progress(1);
    return true;
  }
  return false;
}

export const isAnimating = () => Boolean(current && current.isActive());

function track(tl) {
  current = tl;
  return new Promise((resolve) => {
    const own = tl.eventCallback('onComplete');
    tl.eventCallback('onComplete', () => {
      own?.();
      resolve();
    });
    if (tl.progress() === 1) resolve();
  });
}

/** Camera kick: the screen that just appeared lands with a tiny zoom + tilt settle. */
function kick(el) {
  if (!el || el.id === 'screen-board') return; // the board has its own slam-in reveal
  gsap.fromTo(el, { scale: 1.07, rotation: -1.4, transformOrigin: '50% 45%' },
    { scale: 1, rotation: 0, duration: 0.5, ease: 'expo.out', clearProps: 'transform' });
}

/** Three-layer diagonal slash (red lead, black cover, white streak).
    `swap` runs while the screen is fully covered; the new screen kicks in as it clears. (~0.6s) */
export function slashWipe(swap) {
  if (reducedMotion()) {
    swap();
    return Promise.resolve();
  }
  const wipe = $('.wipe');
  const black = $('.wipe-black');
  const red = $('.wipe-red');
  const white = $('.wipe-white');
  const old = $('.screen.active');
  const tl = gsap.timeline();
  tl.set(wipe, { visibility: 'visible' })
    .to(old, { scale: 0.96, x: 30, duration: 0.22, ease: 'power2.in' }, 0)
    .fromTo(red, { xPercent: -140 }, { xPercent: 4, duration: 0.2, ease: 'expo.in' }, 0)
    .fromTo(black, { xPercent: -120 }, { xPercent: 0, duration: 0.22, ease: 'expo.in' }, 0.04)
    .fromTo(white, { xPercent: -150 }, { xPercent: 150, duration: 0.24, ease: 'power2.inOut' }, 0.12)
    .add(() => {
      if (old) gsap.set(old, { clearProps: 'transform' });
      swap();
      kick($('.screen.active'));
    }, 0.27)
    .to(black, { xPercent: 120, duration: 0.3, ease: 'expo.out' }, 0.31)
    .to(red, { xPercent: 140, duration: 0.34, ease: 'expo.out' }, 0.34)
    .set(wipe, { visibility: 'hidden' });
  return track(tl);
}

/** Starburst + rays + huge tilted title that slams in, shakes and zooms away. (~0.55s) */
export function titlePunch(text) {
  if (reducedMotion()) return Promise.resolve();
  const punch = $('.punch');
  const star = $('.punch-star');
  const rays = $('.punch-rays');
  $('#punchText').textContent = text;
  const tl = gsap.timeline();
  tl.set(punch, { visibility: 'visible', opacity: 1, scale: 1 })
    .fromTo(rays, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: 'power2.out' }, 0)
    .fromTo(star, { scale: 0.1, rotation: -40 }, { scale: 1, rotation: 0, duration: 0.16, ease: 'expo.out' }, 0.02)
    .fromTo('#punchText', { scale: 3.2, rotation: -22, opacity: 0 }, { scale: 1, rotation: -8, opacity: 1, duration: 0.15, ease: 'power4.in' }, 0.05)
    .add(() => shake(punch), 0.2)
    .to('#punchText', { scale: 1.06, duration: 0.18, ease: 'power1.out' }, 0.2)
    .to(punch, { opacity: 0, scale: 1.35, duration: 0.17, ease: 'power3.in' }, 0.42)
    .set(punch, { visibility: 'hidden', scale: 1 });
  return track(tl);
}

/** Name strip (ransom letters) that slashes across for big moments. (~0.5s) */
export function cutIn(text = '') {
  if (reducedMotion()) return Promise.resolve();
  const wrap = $('.cutin');
  const holder = $('#cutinEyes');
  holder.innerHTML = '<div class="ransom cutin-name"></div>';
  ransom(holder.firstChild, 'JOHN', NAME_SEED);
  $('#cutinText').textContent = text;
  const tl = gsap.timeline();
  tl.set(wrap, { visibility: 'visible' })
    .fromTo('.cutin-strip', { xPercent: -120, scaleY: 0.1 }, { xPercent: 0, scaleY: 1, duration: 0.15, ease: 'expo.out' })
    .fromTo('.cutin-flash', { opacity: 0.9 }, { opacity: 0, duration: 0.2, ease: 'power2.out' }, 0.1)
    .fromTo('#cutinText', { x: 160, skewX: -20, opacity: 0 }, { x: 0, skewX: 0, opacity: 1, duration: 0.16, ease: 'expo.out' }, 0.08)
    .fromTo('#cutinEyes', { x: -30 }, { x: 10, duration: 0.45, ease: 'none' }, 0.1)
    .to('.cutin-strip', { xPercent: 130, scaleY: 0.3, duration: 0.16, ease: 'expo.in' }, '+=0.22')
    .set(wrap, { visibility: 'hidden' });
  return track(tl);
}

/* Copy of the current title page (wall + title + HUD) frozen exactly as it looks, for the rip pieces.
   Fixed-position copies sit inside a transformed piece, so they line up with the real screen. */
function snapshotTitle() {
  const frag = document.createElement('div');
  frag.className = 'rip-page';
  [$('#backdrop'), $('#screen-title'), $('.hud-tl'), $('.hud-tr')].filter(Boolean).forEach((src) => {
    const copy = src.cloneNode(true);
    // only the few things that move or hide by screen state are read (cheap: no full-page style pass)
    const MOVING = '.bd-drift, .spin-slow, .slashes polygon, .press-start';
    const live = src.querySelectorAll(MOVING);
    const dead = copy.querySelectorAll(MOVING);
    live.forEach((el, i) => {
      const t = getComputedStyle(el).transform;
      if (t !== 'none') dead[i].style.transform = t;
    });
    if (src.matches('.hud-tl, .hud-tr')) {
      const liveAll = src.querySelectorAll('*');
      const deadAll = copy.querySelectorAll('*');
      liveAll.forEach((el, i) => {
        if (getComputedStyle(el).display === 'none') deadAll[i].style.display = 'none';
      });
    }
    if (copy.classList.contains('screen')) copy.classList.replace('screen', 'rip-screen'); // stay out of screen switching
    copy.querySelectorAll('button, a').forEach((el) => el.setAttribute('tabindex', '-1'));
    frag.appendChild(copy);
  });
  return frag;
}

/** Jagged tear line, listed right → left, in % of the screen. */
function tearLine() {
  const pts = [];
  let x = 100;
  let flip = 1;
  while (x > 0) {
    pts.push([x, 52 + flip * gsap.utils.random(1, 3.6) + gsap.utils.random(-2.5, 2.5)]);
    flip *= -1;
    x -= gsap.utils.random(2.5, 6.5);
  }
  pts.push([0, 52 + gsap.utils.random(-2, 2)]);
  return pts;
}

/** PRESS START: the title page rips from the right edge to the left,
    the halves fly apart and the board is underneath. (~0.85s) */
export function ripTransition(swap) {
  if (reducedMotion()) {
    swap();
    return Promise.resolve();
  }
  const line = tearLine();
  const poly = (pts) => pts.map(([x, y]) => `${x.toFixed(2)}% ${y.toFixed(2)}%`).join(', ');
  const layer = document.createElement('div');
  layer.className = 'rip';
  layer.setAttribute('aria-hidden', 'true');
  const hingeY = line[line.length - 1][1];
  const piece = (cls, clip, edgeClip) => {
    const wrap = document.createElement('div');
    wrap.className = `rip-piece ${cls}`;
    wrap.style.transformOrigin = `0% ${hingeY}%`;
    const edge = document.createElement('div'); // white torn-paper fibre edge (cheap: no filters)
    edge.className = 'rip-edge';
    edge.style.clipPath = `polygon(${edgeClip})`;
    wrap.appendChild(edge);
    const inner = document.createElement('div');
    inner.className = 'rip-clip';
    inner.style.clipPath = `polygon(${clip})`;
    inner.appendChild(snapshotTitle());
    wrap.appendChild(inner);
    return wrap;
  };
  const shift = (d) => line.map(([x, y]) => [x, y + d * gsap.utils.random(0.5, 1.3)]);
  const top = piece('rip-top', `0% 0%, 100% 0%, ${poly(line)}`, `0% 0%, 100% 0%, ${poly(shift(1))}`);
  const bottom = piece('rip-bottom', `${poly(line)}, 0% 100%, 100% 100%`, `${poly(shift(-1))}, 0% 100%, 100% 100%`);
  const crack = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  crack.setAttribute('class', 'rip-crack');
  crack.setAttribute('viewBox', '0 0 100 100');
  crack.setAttribute('preserveAspectRatio', 'none');
  crack.innerHTML = `<polyline points="${line.map(([x, y]) => `${x},${y}`).join(' ')}" pathLength="1"/>`;
  layer.append(bottom, top, crack);
  document.body.appendChild(layer);
  swap(); // the board is live underneath from the first frame

  const rect = { w: window.innerWidth, h: window.innerHeight };
  const tl = gsap.timeline({ onComplete: () => layer.remove() });
  tl.add(() => burst(rect.w - 8, (line[0][1] / 100) * rect.h, 1.7), 0)
    .fromTo(crack.querySelector('polyline'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.34, ease: 'power1.in' }, 0)
    .fromTo(top, { rotation: 0 }, { rotation: -2.4, y: -8, duration: 0.36, ease: 'power2.in' }, 0)
    .fromTo(bottom, { rotation: 0 }, { rotation: 2.4, y: 8, duration: 0.36, ease: 'power2.in' }, 0)
    .add(() => shake(layer), 0.32)
    .to(crack, { opacity: 0, duration: 0.08 }, 0.36)
    .to(top, { yPercent: -80, rotation: -18, x: -40, duration: 0.45, ease: 'power3.in' }, 0.42)
    .to(bottom, { yPercent: 80, rotation: 13, x: 30, duration: 0.45, ease: 'power3.in' }, 0.44);
  return track(tl);
}

/** Stagger children marked [data-in] into view. */
export function enter(root) {
  const items = root.querySelectorAll('[data-in]');
  if (reducedMotion() || !items.length) return gsap.timeline();
  return gsap.from(items, { y: 70, x: -50, scale: 0.88, rotation: -4, opacity: 0, duration: 0.46, ease: 'back.out(2.4)', stagger: 0.05, clearProps: 'transform,opacity' });
}

/** Small screen shake. */
export function shake(el = document.body) {
  if (reducedMotion()) return;
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
}

/** CLEARED!-style stamp slam. */
export function slam(el) {
  if (reducedMotion()) return;
  gsap.timeline()
    .fromTo(el, { scale: 3.4, opacity: 0, rotation: -40 }, { scale: 0.92, opacity: 1, rotation: -12, duration: 0.16, ease: 'power4.in' })
    .add(() => {
      const r = el.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, 1.1);
      shake(el.parentElement);
    })
    .to(el, { scale: 1, duration: 0.3, ease: 'elastic.out(1.4, .4)' });
}
