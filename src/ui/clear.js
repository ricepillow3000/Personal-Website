import { gsap } from 'gsap';
import { store } from '../core/store.js';
import { reducedMotion } from '../core/util.js';
import { ransom } from './ransom.js';
import { burst } from '../fx/impact.js';
import { sfx } from '../audio/audio.js';
import { toast } from './toast.js';

/* A project only counts as CLEARED after the visitor actually goes to it:
   they press its Live/Code link (data-clear="<id>"), leave for the project,
   and come back. On return, a giant CLEARED! stamp slams down full-screen and
   flies onto that project wherever they had it open (file, board card, poster). */

const KEY = 'clear-pending';
let pending = null;
let left = false;

function readPending() {
  try {
    return window.sessionStorage.getItem(KEY);
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

/** Full-screen stamp transition: rays snap in, a giant CLEARED! slams down in the middle,
    the page scrolls to the project behind the rays, then the stamp flies onto it and lands. */
function stampTransition(landOn) {
  return new Promise((resolve) => {
    const fx = document.createElement('div');
    fx.className = 'clear-fx';
    fx.setAttribute('aria-hidden', 'true');
    fx.innerHTML = `<div class="clear-fx-rays"></div><div class="clear-fx-flash"></div>${clearStampMarkup('big')}`;
    document.body.appendChild(fx);
    hydrateStamps(fx);
    const big = fx.querySelector('.clear-stamp');
    const rays = fx.querySelector('.clear-fx-rays');
    const flash = fx.querySelector('.clear-fx-flash');
    if (landOn) gsap.set(landOn, { autoAlpha: 0 });

    const tl = gsap.timeline({
      onComplete: () => {
        fx.remove();
        resolve();
      }
    });
    tl.add(() => sfx('whoosh'), 0)
      .fromTo(rays, { autoAlpha: 0, rotation: -35, scale: 0.6 }, { autoAlpha: 1, rotation: 0, scale: 1, duration: 0.22, ease: 'expo.out' }, 0)
      .fromTo(big, { scale: 4.4, rotation: -48, autoAlpha: 0 }, { scale: 0.9, rotation: -10, autoAlpha: 1, duration: 0.17, ease: 'power4.in' }, 0.05)
      .add(() => {
        sfx('crash');
        burst(window.innerWidth / 2, window.innerHeight / 2, 2.6);
        shakeEl(fx);
      }, 0.22)
      .fromTo(flash, { autoAlpha: 0.85 }, { autoAlpha: 0, duration: 0.18, ease: 'power2.out' }, 0.22)
      .to(big, { scale: 1, duration: 0.35, ease: 'elastic.out(1.5, .4)' }, 0.22)
      .fromTo(big.querySelectorAll('.rl'), { y: -26, rotation: () => gsap.utils.random(-35, 35) }, { y: 0, rotation: 0, duration: 0.3, ease: 'back.out(3)', stagger: 0.03 }, 0.22)
      // the rays cover everything: bring the project into view behind them
      .add(() => landOn?.closest('.case, .poster')?.scrollIntoView({ block: 'center' }), 0.5);

    if (landOn) {
      // the giant stamp flies onto the project's stamp and lands there
      tl.add(() => {
        const a = big.getBoundingClientRect();
        const b = landOn.getBoundingClientRect();
        gsap.to(big, {
          x: b.left + b.width / 2 - (a.left + a.width / 2),
          y: b.top + b.height / 2 - (a.top + a.height / 2),
          scale: Math.max(0.15, b.width / a.width),
          rotation: -10,
          duration: 0.3,
          ease: 'power3.in'
        });
      }, 0.7)
        .to(rays, { scaleY: 0, duration: 0.16, ease: 'power3.in' }, 0.72)
        .add(() => {
          gsap.set(big, { autoAlpha: 0 });
          gsap.set(landOn, { autoAlpha: 1 });
          sfx('snare');
          const r = landOn.getBoundingClientRect();
          burst(r.left + r.width / 2, r.top + r.height / 2, 1.5);
          shakeEl(landOn.closest('.case, .poster, .dossier'));
          gsap.fromTo(landOn, { scale: 1.35 }, { scale: 1, duration: 0.4, ease: 'elastic.out(1.4, .4)' });
        }, 1.0)
        .to({}, { duration: 0.05 }, 1.0);
    } else {
      // this project isn't on screen: the stamp whips away
      tl.to(big, { x: window.innerWidth, skewX: 25, duration: 0.18, ease: 'power3.in' }, 0.8)
        .to(rays, { scaleY: 0, duration: 0.14, ease: 'power3.in' }, 0.84);
    }
  });
}

/** Mark a project cleared and stamp every place it is shown, with the full transition. */
export async function markCleared(id, { animate = true } = {}) {
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
    pending = a.dataset.clear;
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
