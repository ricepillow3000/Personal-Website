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

/** CLEARED!-style stamp slam. */
export function slam(el) {
  if (reducedMotion()) return;
  gsap.timeline()
    .fromTo(el, { scale: 3.4, opacity: 0, rotation: -40 }, { scale: 0.92, opacity: 1, rotation: -12, duration: 0.16, ease: 'power4.in' })
    .add(() => {
      sfx('thunk');
      const r = el.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, 1.1);
      shake(el.parentElement);
    })
    .to(el, { scale: 1, duration: 0.3, ease: 'elastic.out(1.4, .4)' });
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
    .add(() => sfx('ratchet'), 0)
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
    .to([black, red], { scale: 0, rotation: 140, duration: 0.28, ease: 'expo.in', stagger: 0.04 }, 0.34)
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
    .add(() => sfx('swish'), 0)
    .fromTo(shards, { x: () => gsap.utils.random(-1, 1) * W * 0.6, y: () => gsap.utils.random(-1, 1) * H * 0.6, rotation: () => gsap.utils.random(-90, 90), autoAlpha: 0 },
      { x: 0, y: 0, rotation: 0, autoAlpha: 1, duration: 0.22, ease: 'power4.in', stagger: { each: 0.008, from: 'random' } }, 0)
    .add(() => {
      swap();
      sfx('glass');
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
    .add(() => sfx('swish'), 0)
    .add(() => sfx('swish'), 0.09)
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
  tl.add(() => sfx('paper'), 0)
    .to(old, { rotationY: 90, transformPerspective: 1300, transformOrigin: '50% 50%', scale: 0.92, filter: 'brightness(.5)', duration: 0.24, ease: 'power3.in' }, 0)
    .add(() => {
      gsap.set(old, { clearProps: 'transform,filter' });
      swap();
      const now = $('.screen.active');
      gsap.fromTo(now, { rotationY: -90, transformPerspective: 1300, transformOrigin: '50% 50%', scale: 0.92 },
        { rotationY: 0, scale: 1, duration: 0.42, ease: 'back.out(1.6)', clearProps: 'transform' });
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
    .add(() => sfx('swish'), 0)
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
