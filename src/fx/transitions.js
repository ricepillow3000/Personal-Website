import { gsap } from 'gsap';
import { $, reducedMotion } from '../core/util.js';
import { ransom, NAME_SEED } from '../ui/ransom.js';
import { burst } from './impact.js';
import { sfx } from '../audio/audio.js';

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

/** Whip-pan landing: the new screen arrives from the side with skew, overshoots and settles. */
function whipIn(el, dir) {
  if (!el || el.id === 'screen-board') return; // the board has its own slam-in reveal
  gsap.fromTo(el, { x: 90 * dir, skewX: -10 * dir, scale: 1.04, transformOrigin: '50% 50%' },
    { x: 0, skewX: 0, scale: 1, duration: 0.42, ease: 'back.out(1.7)', clearProps: 'transform' });
}

/** Layered depth during a whip: wall, graffiti and shards slide at different speeds
    (separate `translate` property, so pointer parallax transforms are untouched). */
function parallaxWhip(dir) {
  const layers = document.querySelectorAll('#backdrop .bd-layer');
  [40, 110, 220].forEach((px, i) => {
    layers[i]?.animate?.(
      [{ translate: '0 0' }, { translate: `${-px * dir}px 0` }, { translate: `${px * 0.12 * dir}px 0` }, { translate: '0 0' }],
      { duration: 620, easing: 'cubic-bezier(.2,.8,.2,1)', offsets: [0, 0.38, 0.75, 1] }
    );
  });
}

let wipeDir = 1;
/** Three-layer diagonal slash (red lead, black cover, white streak) + a spinning star riding
    the leading edge. The eye follows the star while the screen swaps underneath (misdirection);
    the old screen whips out, the new one whips in, the wall moves in depth layers. (~0.6s) */
export function slashWipe(swap) {
  if (reducedMotion()) {
    swap();
    return Promise.resolve();
  }
  const dir = (wipeDir *= -1) * -1; // alternate direction each time
  const wipe = $('.wipe');
  const black = $('.wipe-black');
  const red = $('.wipe-red');
  const white = $('.wipe-white');
  const star = $('.wipe-star');
  const old = $('.screen.active');
  wipe.classList.toggle('rev', dir < 0);
  const X = (v) => v * dir;
  const tl = gsap.timeline();
  tl.set(wipe, { visibility: 'visible' })
    .add(() => {
      sfx('swish');
      parallaxWhip(dir);
    }, 0)
    .to(old, { x: X(-120), skewX: X(12), duration: 0.22, ease: 'power3.in' }, 0)
    .fromTo(red, { xPercent: X(-140) }, { xPercent: X(4), duration: 0.2, ease: 'expo.in' }, 0)
    .fromTo(black, { xPercent: X(-120) }, { xPercent: 0, duration: 0.22, ease: 'expo.in' }, 0.04)
    .fromTo(star, { x: X(-0.7) * window.innerWidth, y: window.innerHeight * 0.18, rotation: 0, scale: 0.6 },
      { x: X(0.75) * window.innerWidth, y: -window.innerHeight * 0.12, rotation: X(720), scale: 1.25, duration: 0.5, ease: 'power2.inOut' }, 0.02)
    .fromTo(white, { xPercent: X(-150) }, { xPercent: X(150), duration: 0.24, ease: 'power2.inOut' }, 0.12)
    .add(() => {
      if (old) gsap.set(old, { clearProps: 'transform' });
      swap();
      sfx('thwack', 0.6);
      whipIn($('.screen.active'), dir);
    }, 0.27)
    .to(black, { xPercent: X(120), duration: 0.3, ease: 'expo.out' }, 0.31)
    .to(red, { xPercent: X(140), duration: 0.34, ease: 'expo.out' }, 0.34)
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
    .set(rays, { opacity: 1, scaleY: 1 }, 0)
    .fromTo(star, { scale: 0.1, rotation: -40 }, { scale: 1, rotation: 0, duration: 0.14, ease: 'expo.out' }, 0.03)
    .fromTo('#punchText', { scale: 3.2, rotation: -22, x: 0 }, { scale: 1, rotation: -8, duration: 0.14, ease: 'power4.in' }, 0.06)
    .add(() => {
      sfx('thwack');
      shake(punch);
    }, 0.2)
    .to('#punchText', { scale: 1.08, duration: 0.06, ease: 'power2.out' }, 0.2)
    .to('#punchText', { scale: 1, duration: 0.12, ease: 'back.out(3)' }, 0.26)
    // exit: text whips off, star collapses, rays snap shut. No fades.
    .to('#punchText', { x: -window.innerWidth, skewX: 25, duration: 0.16, ease: 'power3.in' }, 0.44)
    .to(star, { scale: 0, rotation: 60, duration: 0.15, ease: 'power3.in' }, 0.46)
    .to(rays, { scaleY: 0, duration: 0.12, ease: 'power3.in' }, 0.5)
    .set(punch, { visibility: 'hidden' })
    .set('#punchText', { x: 0, skewX: 0 });
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
    .add(() => {
      sfx('thwack', 0.8);
      shake($('.screen.active') || document.body);
    }, 0.12)
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
    const MOVING = '.bd-drift, .spin-slow, .press-start';
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

/** Jagged tear path in px: right edge → the ATL tape → diagonally up to the top-left.
    Each point carries s (0..1 along the tear) and a ragged paper-fibre width. */
function tearPath(W, H, tape) {
  // Lightning-bolt shape: big sharp kinks that snap left/right of the straight path,
  // with uneven segment lengths, on the way from the tape to the top-left corner.
  const end0 = [0, H * gsap.utils.random(0.04, 0.09)];
  const ux = end0[0] - tape.x;
  const uy = end0[1] - tape.y;
  const ul = Math.hypot(ux, uy);
  const px = -uy / ul;
  const py = ux / ul;
  const amp = Math.max(50, Math.min(W, H) * 0.15);
  const corners = [[W, tape.y + gsap.utils.random(-10, 10)], [tape.x, tape.y]];
  const kinks = 5;
  let side = Math.random() < 0.5 ? 1 : -1;
  for (let i = 1; i <= kinks; i++) {
    // uneven spacing: short snap, long run, short snap... like a bolt
    const t = (i - (i % 2 ? gsap.utils.random(0.55, 0.75) : gsap.utils.random(0.05, 0.2))) / (kinks + 0.3);
    const off = side * amp * gsap.utils.random(0.7, 1.2);
    corners.push([Math.min(W - 8, Math.max(8, tape.x + ux * t + px * off)), Math.min(H - 8, Math.max(8, tape.y + uy * t + py * off))]);
    side *= -1;
  }
  corners.push(end0);
  const legs = [];
  let total = 0;
  for (let i = 0; i < corners.length - 1; i++) {
    const [ax, ay] = corners[i];
    const [bx, by] = corners[i + 1];
    const len = Math.hypot(bx - ax, by - ay);
    legs.push({ ax, ay, bx, by, len, from: total });
    total += len;
  }
  const end = corners[corners.length - 1];
  const dx = (end[0] - W) / Math.hypot(end[0] - W, end[1] - corners[0][1]);
  const dy = (end[1] - corners[0][1]) / Math.hypot(end[0] - W, end[1] - corners[0][1]);
  const n = { x: dy, y: -dx }; // normal pointing at the lower piece
  if (n.y < 0) (n.x *= -1), (n.y *= -1);
  const pts = [];
  let flip = 1;
  legs.forEach((leg) => {
    // every bolt corner is an exact point, so the kinks stay razor sharp
    for (let d = 0; d < leg.len; d += gsap.utils.random(14, 34)) {
      const k = d / leg.len;
      const jag = d === 0 ? 0 : flip * gsap.utils.random(2, 6);
      pts.push({ x: leg.ax + (leg.bx - leg.ax) * k + n.x * jag, y: leg.ay + (leg.by - leg.ay) * k + n.y * jag, s: (leg.from + d) / total, f: gsap.utils.random(3, 8) });
      flip *= -1;
    }
  });
  pts.push({ x: end[0], y: end[1], s: 1, f: 4 });
  return { pts, n };
}

/** PRESS START: the ATL tape pops, the page tears diagonally from the right side up to the
    top-left in three visible tugs, then the two pieces are yanked away and the board is underneath. (~1.6s) */
export function ripTransition(swap) {
  if (reducedMotion()) {
    swap();
    return Promise.resolve();
  }
  const W = window.innerWidth;
  const H = window.innerHeight;
  const tapeEl = document.querySelector('#backdrop .atl-tape');
  const tr = tapeEl?.getBoundingClientRect();
  const tape = tr && tr.width ? { x: Math.min(W - 40, tr.left + tr.width / 2), y: tr.top + tr.height / 2 } : { x: W * 0.84, y: H * 0.46 };
  const { pts, n } = tearPath(W, H, tape);
  const G = 24; // widest opening of the tear, px

  const layer = document.createElement('div');
  layer.className = 'rip';
  layer.setAttribute('aria-hidden', 'true');
  const piece = (cls) => {
    const wrap = document.createElement('div');
    wrap.className = `rip-piece ${cls}`;
    const edge = document.createElement('div'); // white torn-paper fibre (cheap: no filters)
    edge.className = 'rip-edge';
    const clip = document.createElement('div');
    clip.className = 'rip-clip';
    clip.appendChild(snapshotTitle());
    wrap.append(edge, clip);
    return { wrap, edge, clip };
  };
  const up = piece('rip-top');
  const low = piece('rip-bottom');
  const tip = document.createElement('div');
  tip.className = 'rip-tip';
  layer.append(low.wrap, up.wrap, tip);
  document.body.appendChild(layer);
  swap(); // the board is live underneath; the torn gap shows it

  const st = { p: 0, g: 1 };
  const P = (x, y) => `${x.toFixed(1)}px ${y.toFixed(1)}px`;
  const draw = () => {
    const off = pts.map((q) => G * st.g * Math.min(1, Math.max(0, (st.p - q.s) / 0.16)));
    const line = (sign, fibre) => pts.map((q, i) => {
      const o = sign * Math.max(0, off[i] - (fibre ? Math.min(q.f, off[i]) : 0));
      return P(q.x + n.x * o, q.y + n.y * o);
    }).join(', ');
    up.clip.style.clipPath = `polygon(${line(-1, false)}, 0px 0px, ${W}px 0px)`;
    up.edge.style.clipPath = `polygon(${line(-1, true)}, 0px 0px, ${W}px 0px)`;
    low.clip.style.clipPath = `polygon(${line(1, false)}, 0px ${H}px, ${W}px ${H}px)`;
    low.edge.style.clipPath = `polygon(${line(1, true)}, 0px ${H}px, ${W}px ${H}px)`;
    const j = pts.findIndex((q) => q.s >= st.p);
    const q = pts[j < 0 ? pts.length - 1 : j];
    gsap.set(tip, { x: q.x, y: q.y });
  };
  draw();

  const tug = (to, dur, at) => {
    tl.add(() => {
      sfx('tear', dur + 0.05);
      shake(layer);
    }, at).to(st, { p: to, duration: dur, ease: 'power3.out', onUpdate: draw }, at);
  };
  const tl = gsap.timeline({ onComplete: () => layer.remove() });
  tl.add(() => burst(tape.x, tape.y, 1.8), 0)
    .fromTo(tip, { scale: 0, rotation: 0 }, { scale: 1, rotation: 360, duration: 0.2, ease: 'back.out(3)' }, 0.04)
    .to(tip, { rotation: '+=900', duration: 1.1, ease: 'none' }, 0.24);
  tug(0.14, 0.16, 0.12); // tape rips off
  tug(0.5, 0.32, 0.4); //  tug
  tug(1, 0.38, 0.84); //   all the way to the top-left
  tl.to(tip, { scale: 0, duration: 0.1, ease: 'power2.in' }, 1.22)
    .to(st, { g: 1.9, duration: 0.08, ease: 'power2.out', onUpdate: draw }, 1.22) // anticipation: pieces pull apart
    .add(() => sfx('zip'), 1.26)
    .add(() => sfx('thwack'), 1.42)
    .to(up.wrap, { x: W * 0.12, y: -H * 0.95, rotation: 13, transformOrigin: '0% 0%', duration: 0.38, ease: 'power4.in' }, 1.3)
    .to(low.wrap, { x: -W * 0.06, y: H * 1.05, rotation: -7, transformOrigin: '100% 100%', duration: 0.42, ease: 'power4.in' }, 1.33);
  return track(tl);
}

/** Stagger children marked [data-in] into view. */
export function enter(root) {
  const items = root.querySelectorAll('[data-in]');
  if (reducedMotion() || !items.length) return gsap.timeline();
  return gsap.from(items, { y: 80, x: -60, scale: 0.85, rotation: -5, autoAlpha: 0, duration: 0.3, ease: 'back.out(2.6)', stagger: 0.05, clearProps: 'transform,opacity,visibility' });
}

/** Small screen shake. */
export function shake(el = document.body) {
  if (reducedMotion()) return;
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
}



/* ---------------------------------------------------------------------------------
   Variety: not every move uses the slash. Each kind of destination has its own wipe.
   --------------------------------------------------------------------------------- */
function layer(cls, html) {
  let el = document.querySelector(`.${cls}`);
  if (!el) {
    el = document.createElement('div');
    el.className = `fxw ${cls}`;
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = html;
    document.body.appendChild(el);
  }
  return el;
}

/** BLINDS (menu + settings): slanted slats snap shut from alternating sides, then open. (~0.6s) */
export function blindsWipe(swap) {
  if (reducedMotion()) {
    swap();
    return Promise.resolve();
  }
  const N = 7;
  const el = layer('blinds', Array.from({ length: N }, (_, i) => `<i style="--i:${i}"></i>`).join(''));
  const slats = [...el.children];
  const tl = gsap.timeline();
  tl.set(el, { visibility: 'visible' })
    .add(() => sfx('rip', 0.3), 0)
    .fromTo(slats, { xPercent: (i) => (i % 2 ? 110 : -110) }, { xPercent: 0, duration: 0.2, ease: 'power4.in', stagger: 0.025 }, 0)
    .add(() => {
      swap();
      sfx('thunk');
      shake(el);
    }, 0.36)
    .to(slats, { xPercent: (i) => (i % 2 ? -110 : 110), duration: 0.24, ease: 'expo.out', stagger: { each: 0.025, from: 'end' } }, 0.42)
    .set(el, { visibility: 'hidden' });
  return track(tl);
}

/** PAPER (Quick View): a white sheet with a torn top edge slides up over the screen and off. (~0.65s) */
export function paperWipe(swap) {
  if (reducedMotion()) {
    swap();
    return Promise.resolve();
  }
  const el = layer('paperw', '<div class="paperw-sheet"><span class="paperw-lines"></span></div>');
  const sheet = el.firstElementChild;
  const tl = gsap.timeline();
  tl.set(el, { visibility: 'visible' })
    .add(() => sfx('paper'), 0)
    .fromTo(sheet, { yPercent: 115, rotation: 4 }, { yPercent: 0, rotation: 0, duration: 0.26, ease: 'power3.in' }, 0)
    .add(() => {
      swap();
      sfx('thunk');
    }, 0.27)
    .to(sheet, { yPercent: -120, rotation: -3, duration: 0.32, ease: 'expo.in' }, 0.34)
    .set(el, { visibility: 'hidden' });
  return track(tl);
}

/** STAR IRIS (back to the board): a black star spins open over the screen, then spins away. (~0.6s) */
export function irisWipe(swap) {
  if (reducedMotion()) {
    swap();
    return Promise.resolve();
  }
  const el = layer('iris', '<div class="iris-star"></div><div class="iris-star red"></div>');
  const [black, red] = el.children;
  const tl = gsap.timeline();
  tl.set(el, { visibility: 'visible' })
    .add(() => sfx('back'), 0)
    .fromTo(red, { scale: 0, rotation: -90 }, { scale: 1.15, rotation: 0, duration: 0.22, ease: 'power3.in' }, 0)
    .fromTo(black, { scale: 0, rotation: -120 }, { scale: 1, rotation: 0, duration: 0.24, ease: 'power3.in' }, 0.04)
    .add(() => {
      swap();
      sfx('thwack', 0.7);
    }, 0.29)
    .to([black, red], { scale: 0, rotation: 140, duration: 0.26, ease: 'power3.out', stagger: 0.03 }, 0.31) // opens right away: no long red hold
    .set(el, { visibility: 'hidden' });
  return track(tl);
}


/** SHATTER (menu: Missions): glass shards fly in, lock together, then blow apart. (~0.7s) */
export function shatterWipe(swap) {
  if (reducedMotion()) {
    swap();
    return Promise.resolve();
  }
  const cols = 4;
  const rows = 3;
  const html = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x0 = (c / cols) * 100;
      const x1 = ((c + 1) / cols) * 100;
      const y0 = (r / rows) * 100;
      const y1 = ((r + 1) / rows) * 100;
      const pad = 0.6; // overlap so no hairline gaps
      html.push(`<i style="clip-path:polygon(${x0 - pad}% ${y0 - pad}%, ${x1 + pad}% ${y0 - pad}%, ${x0 - pad}% ${y1 + pad}%)"></i>`);
      html.push(`<i style="clip-path:polygon(${x1 + pad}% ${y0 - pad}%, ${x1 + pad}% ${y1 + pad}%, ${x0 - pad}% ${y1 + pad}%)"></i>`);
    }
  }
  const el = layer('shatter', html.join(''));
  const shards = [...el.children];
  const W = window.innerWidth;
  const H = window.innerHeight;
  const tl = gsap.timeline();
  tl.set(el, { visibility: 'visible' })
    .add(() => sfx('rip', 0.36), 0)
    .fromTo(shards, { x: () => gsap.utils.random(-1, 1) * W * 0.6, y: () => gsap.utils.random(-1, 1) * H * 0.6, rotation: () => gsap.utils.random(-90, 90), autoAlpha: 0 },
      { x: 0, y: 0, rotation: 0, autoAlpha: 1, duration: 0.22, ease: 'power4.in', stagger: { each: 0.008, from: 'random' } }, 0)
    .add(() => {
      swap();
      sfx('rip', 0.22);
      shake(el);
    }, 0.4)
    .to(shards, { x: () => gsap.utils.random(-1, 1) * W, y: () => gsap.utils.random(0.2, 1.2) * H, rotation: () => gsap.utils.random(-200, 200), duration: 0.38, ease: 'power3.in', stagger: { each: 0.006, from: 'center' } }, 0.48)
    .set(el, { visibility: 'hidden' })
    .set(shards, { clearProps: 'transform,opacity,visibility' });
  return track(tl);
}

/** STRIPES (menu: Side Quests): diagonal red/black/white bands race across. (~0.65s) */
export function stripesWipe(swap) {
  if (reducedMotion()) {
    swap();
    return Promise.resolve();
  }
  const el = layer('stripes', Array.from({ length: 6 }, (_, i) => `<i style="--i:${i}"></i>`).join(''));
  const bars = [...el.children];
  const tl = gsap.timeline();
  tl.set(el, { visibility: 'visible' })
    .add(() => sfx('rip', 0.4), 0)
    .fromTo(bars, { xPercent: 140 }, { xPercent: 0, duration: 0.22, ease: 'power4.in', stagger: 0.04 }, 0)
    .add(() => {
      swap();
      sfx('thwack', 0.7);
    }, 0.42)
    .to(bars, { xPercent: -140, duration: 0.26, ease: 'expo.in', stagger: 0.035 }, 0.46)
    .set(el, { visibility: 'hidden' });
  return track(tl);
}

/** FLIP (menu: Stats): the whole screen flips over like a card. (~0.6s) */
export function flipWipe(swap) {
  if (reducedMotion()) {
    swap();
    return Promise.resolve();
  }
  const old = $('.screen.active');
  const tl = gsap.timeline();
  tl.add(() => sfx('rip', 0.24), 0)
    .to(old, { rotationY: 90, transformPerspective: 1300, transformOrigin: '50% 50%', scale: 0.92, filter: 'brightness(.5)', duration: 0.24, ease: 'power3.in' }, 0)
    .add(() => {
      gsap.set(old, { clearProps: 'transform,filter' });
      swap();
      const now = $('.screen.active');
      // part of the timeline, so the wipe only counts as done once this has fully settled
      tl.add(gsap.fromTo(now, { rotationY: -90, transformPerspective: 1300, transformOrigin: '50% 50%', scale: 0.92 },
        { rotationY: 0, scale: 1, duration: 0.42, ease: 'back.out(1.6)', clearProps: 'transform' }), 0.25);
      sfx('thunk');
    }, 0.25)
    .to({}, { duration: 0.42 }, 0.25);
  return track(tl);
}

/** INK (menu: System): a jagged ink blot floods the screen, then slides down off it. (~0.65s) */
export function inkWipe(swap) {
  if (reducedMotion()) {
    swap();
    return Promise.resolve();
  }
  const pts = Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * Math.PI * 2;
    const r = i % 2 ? 50 : 36 + Math.random() * 14;
    return `${(50 + Math.cos(a) * r).toFixed(1)}% ${(50 + Math.sin(a) * r).toFixed(1)}%`;
  }).join(', ');
  const el = layer('inkw', '<div class="ink-blot red"></div><div class="ink-blot"></div>');
  [...el.children].forEach((b) => (b.style.clipPath = `polygon(${pts})`));
  const [red, black] = el.children;
  const tl = gsap.timeline();
  tl.set(el, { visibility: 'visible' })
    .add(() => sfx('rip', 0.3), 0)
    .fromTo(red, { scale: 0, rotation: -40, yPercent: 0 }, { scale: 1.1, rotation: 0, duration: 0.24, ease: 'power3.in' }, 0)
    .fromTo(black, { scale: 0, rotation: 30, yPercent: 0 }, { scale: 1, rotation: 0, duration: 0.24, ease: 'power3.in' }, 0.05)
    .add(() => {
      swap();
      sfx('thwack', 0.8);
    }, 0.3)
    .to([black, red], { yPercent: 130, skewY: 8, duration: 0.32, ease: 'power3.in', stagger: 0.05 }, 0.36)
    .set(el, { visibility: 'hidden' });
  return track(tl);
}


/* ---------------------------------------------------------------------------------
   THE DROP (board -> page, and "next episode"): a short film cut, studied from how
   Lusion stages its scroll story (frame flies at the camera, the world opens up, the
   camera travels through a scene, a title passes, a hard landing).
   1. the screen you are on rushes at you and splits in two along a jagged seam
   2. behind it: a grayed-out city at dusk, you are on a rooftop
   3. you drop: a dark tower of windows streams past, speed lines, the next
      chapter's name rides the fall like a building sign
   4. a white star-flash lands you on the next page, which builds in as it clears
   (~1.3s, skippable with any click or Esc; instant with reduced motion)
   --------------------------------------------------------------------------------- */

/** Copy of whatever is on screen right now (backdrop + active screen + HUD), for splitting. */
function snapshotScreen() {
  const src = document.querySelector('.screen.active');
  const frag = document.createElement('div');
  frag.className = 'rip-page';
  let screenCopy = null;
  [$('#backdrop'), src, $('.hud-tl'), $('.hud-tr')].filter(Boolean).forEach((el) => {
    const copy = el.cloneNode(true);
    if (copy.classList.contains('screen')) {
      copy.classList.replace('screen', 'rip-screen'); // stay out of screen switching
      screenCopy = copy;
    }
    copy.querySelectorAll('button, a').forEach((b) => b.setAttribute('tabindex', '-1'));
    frag.appendChild(copy);
  });
  // a clone starts scrolled to the top: put it where the visitor actually was
  return { frag, settle: () => screenCopy && src && (screenCopy.scrollTop = src.scrollTop) };
}

/* ---- the city set pieces (public/assets/film): original art generated with Google's Nano Banana
   (gemini-2.5-flash-image) to John's brief and approved by him: a low-angle look up at the towers
   against a red sky, the tower's crown, its glass facade, and the subway car. WebP, loaded while idle. */
const FILM = { upshot: window.innerWidth <= 900 ? 'assets/film/city-800.webp' : 'assets/film/city.webp', facade: 'assets/film/facade.webp', crown: 'assets/film/crown.webp', train: 'assets/film/train.webp' };
const filmCache = [];
export function preloadFilm() {
  if (filmCache.length) return;
  Object.values(FILM).forEach((src) => {
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    img.decode?.().catch(() => {});
    filmCache.push(img); // keep a reference so the browser keeps it decoded
  });
}

/* Film letterbox: two black bars close in at the start of every film cut and open as it lands,
   so each cut reads as a movie shot, not a page effect. */
const LETTERBOX = '<i class="lb lb-t"></i><i class="lb lb-b"></i>';
const barsIn = (tl, bars) => tl.fromTo(bars, { scaleY: 0 }, { scaleY: 1, duration: 0.16, ease: 'power3.out' }, 0);

/** The city set for THE DROP and THE RISE: the low-angle red-sky city, the tower (crown + facade),
    speed lines, a chapter sign and the white star-flash used to cut to the next screen. */
function citySet(label, extra = '') {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const TW = Math.round(Math.min(W * 0.92, 1100));
  const TH = Math.round(TW * 1.75 + H * 2.4); // the crown art (900x1575) on top, then ~2.4 screens of facade
  const el = document.createElement('div');
  el.className = 'fall';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<div class="fall-city">
      <div class="fall-sky"><img class="fs-art" src="${FILM.upshot}" alt=""></div>
      <div class="fall-tower" style="width:${TW}px;height:${TH}px"><img class="ft-crown" src="${FILM.crown}" alt=""><div class="ft-face" style="background-image:url(${FILM.facade})"></div></div>
      <div class="fall-lines">${'<i></i>'.repeat(14)}</div>
      <div class="fall-sign"><span class="ransom"></span></div>
    </div>${extra}
    <div class="fall-flash"></div>${LETTERBOX}`;
  ransom(el.querySelector('.fall-sign span'), label, label.length);
  const q = (sel) => el.querySelector(sel);
  const lines = el.querySelectorAll('.fall-lines i');
  lines.forEach((l, i) => gsap.set(l, { left: `${6 + ((i * 41) % 88)}%`, height: 60 + ((i * 53) % 140) }));
  return { el, W, H, TW, TH, bars: el.querySelectorAll('.lb'), city: q('.fall-city'), sky: q('.fall-sky'), tower: q('.fall-tower'), lines, sign: q('.fall-sign'), flash: q('.fall-flash') };
}

/** Shared landing: the white star-flash covers everything, the screen swaps, the flash clears. */
function landing(tl, set, swap, at) {
  tl.to(set.city, { y: 10, duration: 0.05, yoyo: true, repeat: 1, ease: 'power1.inOut' }, at - 0.1) // impact jolt
    .to(set.bars, { scaleY: 0, duration: 0.2, ease: 'power2.in' }, at + 0.2)
    .fromTo(set.flash, { scale: 0, rotation: -40, opacity: 1 }, { scale: 3.2, rotation: 0, duration: 0.2, ease: 'power3.in' }, at)
    .add(() => {
      swap();
      sfx('thwack');
      gsap.set(set.city, { visibility: 'hidden' });
    }, at + 0.2)
    .to(set.flash, { opacity: 0, duration: 0.22, ease: 'power2.out' }, at + 0.22);
}

export function fallWipe(swap, label = '') {
  if (reducedMotion()) {
    swap();
    return Promise.resolve();
  }
  const set = citySet(label, '<div class="fall-half left"></div><div class="fall-half right"></div>');
  const { el, W, H, TH, city, sky, tower, lines, sign } = set;
  const left = el.querySelector('.fall-half.left');
  const right = el.querySelector('.fall-half.right');

  // the jagged seam the screen tears along (top to bottom, near the middle)
  const seam = [];
  for (let i = 0; i <= 8; i++) seam.push([W / 2 + (i % 2 ? 1 : -1) * (14 + ((i * 37) % 26)), (H * i) / 8]);
  const s = seam.map(([x, y]) => `${x.toFixed(0)}px ${y.toFixed(0)}px`).join(', ');
  const shots = [[left, `polygon(0 0, ${s}, 0 ${H}px)`], [right, `polygon(${W}px 0, ${s}, ${W}px ${H}px)`]].map(([half, clip]) => {
    const snap = snapshotScreen();
    half.style.clipPath = clip;
    half.appendChild(snap.frag);
    return snap;
  });
  document.body.appendChild(el);
  shots.forEach((shot) => shot.settle());
  gsap.set(tower, { xPercent: -50, y: H * 1.05 }); // starts just below the frame: the tower only rises into view once we're falling

  const tl = gsap.timeline({ onComplete: () => el.remove() });
  tl.set(el, { visibility: 'visible' });
  barsIn(tl, set.bars);
  tl
    // 1. the screen rushes at the camera...
    .add(() => sfx('whoosh'), 0)
    .to([left, right], { scale: 1.07, duration: 0.18, ease: 'power2.in', transformOrigin: '50% 50%' }, 0)
    // ...and splits open on a rooftop over the city
    .add(() => sfx('tear', 0.2), 0.16)
    .to(left, { xPercent: -118, rotation: -9, scale: 1.25, duration: 0.42, ease: 'power3.in' }, 0.18)
    .to(right, { xPercent: 118, rotation: 9, scale: 1.25, duration: 0.42, ease: 'power3.in' }, 0.18)
    .set([left, right], { autoAlpha: 0 }, 0.6) // fully gone before the fall starts
    .fromTo(city, { scale: 1.12 }, { scale: 1, duration: 0.4, ease: 'power2.out' }, 0.18)
    // 2. the jump: the tower face streams up past the camera, faster and faster
    .add(() => sfx('fall'), 0.4)
    .to(tower, { y: -(TH - H), duration: 0.78, ease: 'power2.in' }, 0.38)
    .fromTo(tower, { '--blur': 0 }, { '--blur': 1, duration: 0.55, ease: 'power2.in' }, 0.5) // the faster we fall, the more the windows smear
    .to(sky, { yPercent: -120, duration: 0.5, ease: 'power2.in' }, 0.42)
    .fromTo(city, { rotation: 0 }, { rotation: -1.6, duration: 0.3, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.5)
    .fromTo(lines, { y: H + 40 }, { y: -260, duration: 0.32, ease: 'none', stagger: { each: 0.05, repeat: 1 } }, 0.62)
    // 3. the next chapter's name rides the fall like a building sign
    .fromTo(sign, { y: H * 0.55, opacity: 0, scale: 0.8 }, { y: 0, opacity: 1, scale: 1, duration: 0.34, ease: 'back.out(1.6)' }, 0.6)
    .to(sign, { y: -H * 0.12, duration: 0.24, ease: 'power1.in' }, 0.94);
  // 4. hard landing: white star-flash, swap, the page builds in as it clears
  landing(tl, set, swap, 1.0);
  return track(tl);
}

/* THE RISE (any page -> back to the board): the reverse shot. The page drops away below
   you, you rocket up the tower face, burst over the roof into the red sky, and the board
   lands with the star-flash. (~0.95s, kept short because Back is used a lot) */
export function riseWipe(swap, label = 'THE BOARD') {
  if (reducedMotion()) {
    swap();
    return Promise.resolve();
  }
  const set = citySet(label || 'THE BOARD', '<div class="fall-half whole"></div>');
  const { el, H, TH, city, sky, tower, lines, sign } = set;
  const whole = el.querySelector('.fall-half.whole');
  const snap = snapshotScreen();
  whole.appendChild(snap.frag);
  document.body.appendChild(el);
  snap.settle();
  gsap.set(tower, { xPercent: -50, y: -(TH - H) });
  gsap.set(sky, { yPercent: 60 });

  const tl = gsap.timeline({ onComplete: () => el.remove() });
  tl.set(el, { visibility: 'visible' });
  barsIn(tl, set.bars);
  tl
    // 1. lift-off: the page falls away beneath the camera
    .add(() => sfx('rise'), 0)
    .to(whole, { yPercent: 105, scale: 0.86, rotation: 2, duration: 0.32, ease: 'power3.in' }, 0)
    // 2. up the tower, fastest at the start, braking as the roof comes into view
    .to(tower, { y: H * 0.72, duration: 0.62, ease: 'power3.out' }, 0.12)
    .fromTo(tower, { '--blur': 1 }, { '--blur': 0, duration: 0.5, ease: 'power2.out' }, 0.12) // smeared at launch, sharp as we brake
    .to(sky, { yPercent: 0, duration: 0.5, ease: 'power3.out' }, 0.3)
    .fromTo(lines, { y: -260 }, { y: H + 40, duration: 0.26, ease: 'none', stagger: { each: 0.04, repeat: 1 } }, 0.12)
    .fromTo(city, { rotation: 1.4 }, { rotation: 0, duration: 0.5, ease: 'power2.out' }, 0.12)
    // 3. over the roof: the board's name hangs in the sky for a beat
    .fromTo(sign, { y: -H * 0.4, opacity: 0, scale: 0.85 }, { y: -H * 0.08, opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(1.8)' }, 0.42);
  landing(tl, set, swap, 0.74);
  tl.timeScale(1.35); // Back is the most-used control: the same shot, ~0.85s instead of ~1.15s
  return track(tl);
}

/* NEXT STOP (the NEXT EPISODE card): a subway train pulls in close to the camera, its lead
   car's sign reads the next chapter, it brakes to a stop (the cut happens behind it) and
   pulls away, the gaps between cars flashing the new page like a real pass-by. (~1.3s) */
export function trainWipe(swap, label = '') {
  if (reducedMotion()) {
    swap();
    return Promise.resolve();
  }
  const W = window.innerWidth;
  const carW = Math.round(W * 1.15);
  // each car is Gemini's subway-car art; the lead car's blank middle panel carries the sign
  const car = (cls, inner = '') => `<div class="train-car ${cls}" style="width:${carW}px;background-image:url(${FILM.train})">${inner}</div>`;
  const el = document.createElement('div');
  el.className = 'fall train';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<div class="train-strip">${car('lead', '<div class="tc-sign"><small>NEXT STOP</small><span class="ransom"></span></div>')}${car('mid')}${car('tail')}</div><div class="train-lines">${'<i></i>'.repeat(7)}</div>${LETTERBOX}`;
  ransom(el.querySelector('.tc-sign span'), label, label.length + 3);
  const bars = el.querySelectorAll('.lb');
  const strip = el.firstChild;
  const lines = el.querySelectorAll('.train-lines i');
  lines.forEach((l, i) => gsap.set(l, { top: `${8 + ((i * 29) % 84)}%`, width: 120 + ((i * 67) % 220) }));
  document.body.appendChild(el);
  const stop = W / 2 - carW / 2; // lead car centred: it covers the whole screen
  const gone = -(strip.scrollWidth + 40);

  const tl = gsap.timeline({ onComplete: () => el.remove() });
  tl.set(el, { visibility: 'visible' })
    .set(strip, { x: W })
    .fromTo(bars, { scaleY: 0 }, { scaleY: 1, duration: 0.16, ease: 'power3.out' }, 0)
    .add(() => sfx('train'), 0)
    // 1. pulls in hard and brakes, the cars rocking on the rails
    .to(strip, { x: stop, duration: 0.5, ease: 'power3.out' }, 0)
    .fromTo(strip, { rotation: 0 }, { rotation: -0.8, duration: 0.12, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 0.3)
    .fromTo(lines, { x: W }, { x: -400, duration: 0.3, ease: 'none', stagger: 0.03 }, 0)
    // 2. the cut happens behind the stopped car
    .add(swap, 0.52)
    .from(el.querySelector('.tc-sign'), { scale: 1.25, duration: 0.24, ease: 'back.out(2.4)' }, 0.42)
    // 3. departs, accelerating: gaps between cars flash the new page
    .add(() => sfx('whoosh'), 0.86)
    .to(strip, { x: gone, duration: 0.5, ease: 'power3.in' }, 0.8)
    .to(bars, { scaleY: 0, duration: 0.22, ease: 'power2.in' }, 1.08)
    .fromTo(lines, { x: W }, { x: -400, duration: 0.26, ease: 'none', stagger: 0.03 }, 1.0);
  return track(tl);
}

/* CALLING CARD (into CONTACT): a calling card is thrown at the camera, spinning in from far
   away; it smacks into the lens and fills the screen, then flips away to reveal the page.
   The site's own ending motif, so the finale gets the signature shot. (~1.1s) */
export function cardWipe(swap, label = 'CONTACT') {
  if (reducedMotion()) {
    swap();
    return Promise.resolve();
  }
  const W = window.innerWidth;
  const H = window.innerHeight;
  const el = document.createElement('div');
  el.className = 'fall cardshot';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<div class="cs-dim"></div><div class="cs-card"><span class="cs-seal"></span><small>A calling card for you</small><b></b><em>Consider it stolen.</em></div>${LETTERBOX}`;
  el.querySelector('.cs-card b').textContent = label;
  const [dim, card] = el.children;
  const bars = el.querySelectorAll('.lb');
  document.body.appendChild(el);
  const r = card.getBoundingClientRect();
  const cover = Math.max(W / r.width, H / r.height) * 1.25;

  const tl = gsap.timeline({ onComplete: () => el.remove() });
  tl.set(el, { visibility: 'visible' })
    .fromTo(dim, { opacity: 0 }, { opacity: 1, duration: 0.2 }, 0)
    .fromTo(bars, { scaleY: 0 }, { scaleY: 1, duration: 0.16, ease: 'power3.out' }, 0)
    .to(bars, { scaleY: 0, duration: 0.2, ease: 'power2.in' }, 0.88)
    // 1. flung from deep in the frame, spinning
    .add(() => sfx('whip'), 0.05)
    .fromTo(card, { scale: 0.04, rotation: -540, rotationY: 0, x: W * 0.32, y: -H * 0.3 },
      { scale: 1, rotation: -6, x: 0, y: 0, transformPerspective: 900, duration: 0.5, ease: 'power3.out' }, 0)
    // 2. a beat to read it, then it smacks into the lens
    .to(card, { scale: cover, rotation: 0, duration: 0.24, ease: 'power3.in' }, 0.62)
    .add(() => {
      swap();
      sfx('thwack');
      shake(document.body);
    }, 0.86)
    .set(dim, { opacity: 0 }, 0.86)
    // 3. flips away to reveal the page
    .to(card, { rotationX: 88, y: -H * 0.2, opacity: 0, duration: 0.26, ease: 'power2.in' }, 0.88);
  return track(tl);
}
