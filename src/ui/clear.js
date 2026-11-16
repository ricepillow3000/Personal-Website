import { gsap } from 'gsap';
import { store } from '../core/store.js';
import { reducedMotion } from '../core/util.js';
import { ransom } from './ransom.js';
import { burst } from '../fx/impact.js';
import { sfx } from '../audio/audio.js';
import { toast } from './toast.js';
import { resume } from '../data/resume.js';

/* A project only counts as CLEARED after the visitor actually goes to it:
   they press its Live/Code link (data-clear="<id>"), leave for the project,
   and come back. On return, a giant CLEARED! stamp slams down full-screen and
   flies onto that project wherever they had it open (file, board card, poster). */

const KEY = 'clear-pending';
let pending = null;
let left = false;

const MISSION_IDS = new Set(resume.missions.map((m) => m.id));
const validId = (v) => (typeof v === 'string' && MISSION_IDS.has(v) ? v : null);

function readPending() {
  try {
    return validId(window.sessionStorage.getItem(KEY));
  } catch {
    return null;
  }
}
function writePending(v) {
  try {
    if (v) window.sessionStorage.setItem(KEY, v);
    else window.sessionStorage.removeItem(KEY);
  } catch {
    /* storage blocked: memory only */
  }
}

export const isCleared = (id) => store.has('cleared', id);

/** The stamp itself: red torn burst, black slab, white cut-out letters, spinning star. */
export function clearStampMarkup(extra = '') {
  return `<span class="clear-stamp ${extra}" role="img" aria-label="Cleared">
    <span class="cs-burst" aria-hidden="true"></span>
    <span class="cs-slab" aria-hidden="true"><span class="cs-word ransom"></span></span>
    <span class="cs-star" aria-hidden="true"></span>
  </span>`;
}

/** Turn any un-built stamps under root into cut-out letters. */
export function hydrateStamps(root = document) {
  root.querySelectorAll('.clear-stamp .cs-word:empty').forEach((w) => {
    ransom(w, 'CLEARED!', 23);
    w.removeAttribute('aria-label');
    w.onpointerenter = null;
  });
}

const TARGETS = (id) => `.case[data-case="${id}"], .poster[data-mission="${id}"], .dossier[data-id="${id}"]`;

/** Make sure a target carries a (built) stamp; returns the stamp element. */
function ensureStamp(t) {
  let st = t.querySelector(':scope > .clear-stamp');
  if (!st) {
    t.insertAdjacentHTML('beforeend', clearStampMarkup());
    st = t.querySelector(':scope > .clear-stamp');
  }
  hydrateStamps(t);
  const hint = t.querySelector('.dossier-hint');
  if (hint) hint.textContent = 'Case cleared. Thanks for checking it out.';
  return st;
}

/** Where the visitor is looking: the open file first, then the card/poster on the current screen. */
function mainTarget(id) {
  if (!document.getElementById('modal')?.hidden) {
    const d = document.querySelector(`#modalPanel .dossier[data-id="${id}"]`);
    if (d) return d;
  }
  return document.querySelector(`.screen.active .case[data-case="${id}"], .screen.active .poster[data-mission="${id}"]`);
}

function shakeEl(el) {
  if (!el) return;
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
}

/* Torn-paper confetti: red, white, black and yellow scraps that burst out and fall with gravity. */
let confettiLayer = null;
function confetti(x, y, n, spread) {
  if (!confettiLayer) {
    confettiLayer = document.createElement('div');
    confettiLayer.className = 'clear-confetti';
    confettiLayer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(confettiLayer);
  }
  const colors = ['#E5191C', '#F5F5F0', '#0B0B0B', '#FFE11A', '#F5F5F0'];
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    const w = gsap.utils.random(8, 22);
    p.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${w * gsap.utils.random(0.35, 0.8)}px;background:${colors[i % colors.length]}`;
    confettiLayer.appendChild(p);
    const ang = gsap.utils.random(0, Math.PI * 2);
    const dist = gsap.utils.random(0.35, 1) * spread;
    const dur = gsap.utils.random(0.8, 1.3);
    gsap.timeline({ onComplete: () => p.remove() })
      .to(p, { x: Math.cos(ang) * dist, duration: dur, ease: 'power2.out' }, 0)
      .to(p, { y: Math.sin(ang) * dist * 0.7 - spread * 0.25, duration: dur * 0.4, ease: 'power2.out' }, 0)
      .to(p, { y: `+=${window.innerHeight * 0.7}`, duration: dur * 0.6, ease: 'power2.in' }, dur * 0.4)
      .to(p, { rotation: gsap.utils.random(-900, 900), duration: dur, ease: 'none' }, 0);
  }
}

/** Full-screen stamp transition (~1.3s):
    1. a rising "whoom", spinning rays and two CASE CLOSED bands sweep in;
    2. a giant cut-out CLEARED! drops and hits: deep boom + metal clang + victory sting,
       white flash, shockwave ring, speed lines, misprint colour split, paper confetti;
    3. while the rays cover everything, the page scrolls to the project;
    4. the bands whip out, the rays snap shut and the stamp zips onto the project
       with a motion trail, landing with a thunk, sparkles and a little confetti. */
function stampTransition(landOn) {
  return new Promise((resolve) => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const band = '<span>CASE CLOSED ★ CASE CLOSED ★ CASE CLOSED ★ CASE CLOSED ★ CASE CLOSED ★ </span>';
    const fx = document.createElement('div');
    fx.className = 'clear-fx';
    fx.setAttribute('aria-hidden', 'true');
    fx.innerHTML = `<div class="clear-fx-rays"></div>
      <div class="clear-fx-band b1">${band}${band}</div><div class="clear-fx-band b2">${band}${band}</div>
      <div class="clear-fx-lines"></div><div class="clear-fx-ring"></div><div class="clear-fx-flash"></div>
      ${clearStampMarkup('big')}`;
    document.body.appendChild(fx);
    hydrateStamps(fx);
    const $f = (c) => fx.querySelector(c);
    const big = $f('.clear-stamp');
    const rays = $f('.clear-fx-rays');
    const bands = [$f('.b1'), $f('.b2')];
    const lines = $f('.clear-fx-lines');
    const ring = $f('.clear-fx-ring');
    const flash = $f('.clear-fx-flash');
    if (landOn) gsap.set(landOn, { autoAlpha: 0 });

    const HIT = 0.27;
    const OUT = 0.88;
    const tl = gsap.timeline({
      onComplete: () => {
        fx.remove();
        resolve();
      }
    });
    // 1. build-up
    tl.add(() => sfx('whipWind'), 0)
      .add(() => sfx('whip'), HIT - 0.11) // the lash cracks exactly on the stamp hit
      .fromTo(rays, { autoAlpha: 0, rotation: -40, scale: 0.55 }, { autoAlpha: 1, rotation: 0, scale: 1, duration: 0.24, ease: 'expo.out' }, 0)
      .to(rays, { rotation: 30, duration: 1, ease: 'none' }, 0.24)
      .fromTo(bands[0], { xPercent: -110 }, { xPercent: 0, duration: 0.22, ease: 'power4.out' }, 0.02)
      .fromTo(bands[1], { xPercent: 110 }, { xPercent: 0, duration: 0.22, ease: 'power4.out' }, 0.06)
      .fromTo(big, { scale: 5.2, rotation: -55, autoAlpha: 0 }, { scale: 0.86, rotation: -10, autoAlpha: 1, duration: HIT - 0.1, ease: 'power4.in' }, 0.1)
      // 2. impact
      .add(() => {
        sfx('stamp');
        burst(W / 2, H / 2, 2.8);
        shakeEl(fx);
        confetti(W / 2, H / 2, 26, Math.min(W, H) * 0.75);
      }, HIT)
      .fromTo(flash, { autoAlpha: 0.9 }, { autoAlpha: 0, duration: 0.2, ease: 'power2.out' }, HIT)
      .fromTo(ring, { scale: 0.2, autoAlpha: 1 }, { scale: 2.6, autoAlpha: 0, duration: 0.5, ease: 'expo.out' }, HIT)
      .fromTo(lines, { scale: 0.45, autoAlpha: 1 }, { scale: 1.35, duration: 0.3, ease: 'expo.out' }, HIT)
      .set(lines, { autoAlpha: 0 }, HIT + 0.3)
      .to(big, { scale: 1, duration: 0.4, ease: 'elastic.out(1.6, .35)' }, HIT)
      .fromTo(big, { '--mx': '20px' }, { '--mx': '0px', duration: 0.55, ease: 'elastic.out(1, .3)' }, HIT)
      .fromTo(big.querySelectorAll('.rl'), { y: -30, rotation: () => gsap.utils.random(-40, 40) }, { y: 0, rotation: 0, duration: 0.32, ease: 'back.out(3.2)', stagger: 0.03 }, HIT)
      // hold: the stamp "boils" like a hand-drawn frame
      .to(big, { rotation: -8.5, duration: 0.08, ease: 'steps(1)', yoyo: true, repeat: 5 }, HIT + 0.3)
      // 3. behind the rays, bring the project into view
      .add(() => landOn?.closest('.case, .poster')?.scrollIntoView({ block: 'center' }), 0.6)
      // 4. exit
      .to(bands[0], { xPercent: 110, duration: 0.18, ease: 'power3.in' }, OUT)
      .to(bands[1], { xPercent: -110, duration: 0.18, ease: 'power3.in' }, OUT + 0.02)
      .to(rays, { scaleY: 0, duration: 0.16, ease: 'power3.in' }, OUT + 0.04);

    if (landOn) {
      tl.add(() => {
        sfx('whipSmall');
        const a = big.getBoundingClientRect();
        const b = landOn.getBoundingClientRect();
        const to = {
          x: b.left + b.width / 2 - (a.left + a.width / 2),
          y: b.top + b.height / 2 - (a.top + a.height / 2),
          scale: Math.max(0.15, b.width / a.width),
          rotation: -10,
          duration: 0.3,
          ease: 'power3.in'
        };
        // motion trail: two fading copies follow a beat behind
        [0.45, 0.22].forEach((op, i) => {
          const g = big.cloneNode(true);
          g.classList.add('ghost');
          g.style.opacity = op;
          g.style.left = `${big.offsetLeft}px`;
          g.style.top = `${big.offsetTop}px`;
          big.before(g);
          gsap.set(g, { x: gsap.getProperty(big, 'x'), y: gsap.getProperty(big, 'y'), scale: gsap.getProperty(big, 'scale'), rotation: gsap.getProperty(big, 'rotation') });
          gsap.to(g, { ...to, delay: 0.035 * (i + 1) });
        });
        gsap.to(big, to);
      }, OUT)
        .add(() => {
          fx.querySelectorAll('.clear-stamp').forEach((n) => (n.style.visibility = 'hidden'));
          gsap.set(landOn, { autoAlpha: 1 });
          sfx('thunk');
          sfx('sparkle');
          const r = landOn.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          burst(cx, cy, 1.6);
          confetti(cx, cy, 10, 160);
          shakeEl(landOn.closest('.case, .poster, .dossier'));
          gsap.fromTo(landOn, { scale: 1.45 }, { scale: 1, duration: 0.45, ease: 'elastic.out(1.4, .4)' });
          gsap.fromTo(landOn, { '--glow': 1 }, { '--glow': 0, duration: 0.6, ease: 'power2.out' });
        }, OUT + 0.3)
        .to({}, { duration: 0.08 }, OUT + 0.3);
    } else {
      // the project isn't on screen: the stamp spins off with the bands
      tl.add(() => sfx('whipSmall'), OUT)
        .to(big, { x: W, rotation: 25, skewX: 20, duration: 0.2, ease: 'power3.in' }, OUT)
        .add(() => sfx('sparkle'), OUT + 0.18);
    }
  });
}

/** Mark a project cleared and stamp every place it is shown, with the full transition. */
export async function markCleared(id, { animate = true } = {}) {
  if (!validId(id)) return false;
  const first = store.addTo('cleared', id);
  const all = [...document.querySelectorAll(TARGETS(id))];
  const target = mainTarget(id);
  const stamps = all.map(ensureStamp);
  const landOn = target ? target.querySelector(':scope > .clear-stamp') : null;
  if (animate && !reducedMotion()) await stampTransition(landOn);
  else stamps.forEach((st) => gsap.set(st, { autoAlpha: 1 }));
  if (first) {
    const name = document.querySelector(`[data-case="${id}"] .case-target`)?.getAttribute('aria-label') || id.toUpperCase();
    toast(`${name} CLEARED`, 'CASE CLOSED');
  }
  return first;
}

let returning = false;
async function onReturn() {
  if (document.visibilityState !== 'visible' || !left || returning) return;
  const id = pending || readPending();
  left = false;
  pending = null;
  writePending(null);
  if (!id) return;
  returning = true;
  try {
    await markCleared(id);
  } finally {
    returning = false;
  }
}

export function initClearing() {
  // pressed a project link: remember which one
  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('a[data-clear]');
    if (!a) return;
    pending = validId(a.dataset.clear);
    if (!pending) return;
    left = false;
    writePending(pending);
  }, true);
  // they left for the project...
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && (pending || readPending())) left = true;
    else onReturn();
  });
  window.addEventListener('blur', () => {
    if (pending || readPending()) left = true;
  });
  // ...and came back (new tab closed/switched, or the back button to this page)
  window.addEventListener('focus', onReturn);
  window.addEventListener('pageshow', (e) => {
    if (readPending() && (e.persisted || performance.getEntriesByType?.('navigation')?.[0]?.type === 'back_forward')) {
      left = true;
      onReturn();
    }
  });
}
