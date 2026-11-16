import { gsap } from 'gsap';
import { store } from '../core/store.js';
import { reducedMotion } from '../core/util.js';
import { ransom } from './ransom.js';
import { burst } from '../fx/impact.js';
import { sfx } from '../audio/audio.js';
import { toast } from './toast.js';

/* A project only counts as CLEARED after the visitor actually goes to it:
   they press its Live/Code link (data-clear="<id>"), leave for the project,
   and come back. On return, a cut-out stamp slams onto that project. */

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

function slamStamp(stamp) {
  hydrateStamps(stamp.parentElement || document);
  if (reducedMotion()) return;
  const r = () => {
    const b = stamp.getBoundingClientRect();
    return [b.left + b.width / 2, b.top + b.height / 2];
  };
  gsap.timeline()
    .fromTo(stamp, { scale: 3.6, rotation: -40, autoAlpha: 0 }, { scale: 0.9, rotation: -10, autoAlpha: 1, duration: 0.18, ease: 'power4.in' })
    .add(() => {
      sfx('crash');
      const [x, y] = r();
      burst(x, y, 1.5);
      const host = stamp.closest('.case, .poster, .dossier') || stamp.parentElement;
      host.classList.remove('shake');
      void host.offsetWidth;
      host.classList.add('shake');
    })
    .to(stamp, { scale: 1, duration: 0.4, ease: 'elastic.out(1.4, .4)' })
    .fromTo(stamp.querySelectorAll('.rl'), { y: -14, rotation: () => gsap.utils.random(-30, 30) }, { y: 0, rotation: 0, duration: 0.3, ease: 'back.out(3)', stagger: 0.025 }, '<');
}

/** Mark a project cleared and stamp every place it is shown right now. */
export function markCleared(id) {
  if (!store.addTo('cleared', id)) return false;
  const targets = [
    ...document.querySelectorAll(`.case[data-case="${id}"], .poster[data-mission="${id}"], .dossier[data-id="${id}"]`)
  ];
  targets.forEach((t, i) => {
    if (t.querySelector(':scope > .clear-stamp')) return;
    t.insertAdjacentHTML('beforeend', clearStampMarkup());
    setTimeout(() => slamStamp(t.querySelector(':scope > .clear-stamp')), 40 + i * 110);
  });
  const name = document.querySelector(`[data-case="${id}"] .case-target`)?.getAttribute('aria-label') || id.toUpperCase();
  setTimeout(() => toast(`${name} CLEARED`, 'CASE CLOSED'), 300);
  return true;
}

/* main.js hands in the cut-in so this module stays free of scene code */
let returnFx = null;
export const setReturnFx = (fn) => (returnFx = fn);

/** Bring the project into view while the cut-in covers the screen (misdirection). */
function bringIntoView(id) {
  if (!document.getElementById('modal')?.hidden) return; // the open file shows its own stamp
  const el = document.querySelector(`.screen.active .case[data-case="${id}"], .screen.active .poster[data-mission="${id}"]`);
  const r = el?.getBoundingClientRect();
  if (r && (r.top < 80 || r.bottom > window.innerHeight - 40)) el.scrollIntoView({ block: 'center' });
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
    const first = !isCleared(id);
    sfx('whoosh');
    const fx = returnFx?.('WELCOME BACK');
    setTimeout(() => bringIntoView(id), 60);
    await fx;
    if (first) markCleared(id);
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
  // ...and came back (new tab closed/switched, or back button to this page)
  window.addEventListener('focus', onReturn);
  window.addEventListener('pageshow', (e) => {
    if (readPending() && (e.persisted || performance.getEntriesByType?.('navigation')?.[0]?.type === 'back_forward')) {
      left = true;
      onReturn();
    }
  });
}
