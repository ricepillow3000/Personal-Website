import { gsap } from 'gsap';
import { esc, reducedMotion, timeOfDay } from '../core/util.js';
import { store, SLOTS } from '../core/store.js';
import { progress } from '../core/progress.js';
import { cutType } from '../ui/cuttype.js';
import { sfx } from '../audio/audio.js';
import { SECTION_TITLES } from './sections.js';

/* SAVE DATA (Nov 19, John's save-screen reference: "remove the save line under the button... they press
   continue and get redirected to a section where they can create a new save data or continue, and they
   have multiple sections to save the data"). An original screen in our system (no game screen copied):
   black, a tall red band on the left with a black notched edge like a film strip, SAVE DATA in cut
   type over it, and the files as slanted paper slips fanned down the screen. A slip shows its number on
   a black tab, the day it was last saved (big red date, the weekday on a black chip, the time of day),
   where it was left, and how much is cleared. The picked slip becomes a big red slab, larger, with its
   play time and what it will do (CONTINUE or START NEW GAME); a finished file carries a COMPLETED stamp
   with a burst. An empty file is a NEW GAME. Mouse: point to pick, click to play. Touch: tap to pick,
   tap again to play. Keys: arrows (W/S) to pick, Enter to play, Esc to go back. A file's CLEAR DATA
   tag takes two presses. Picking a file closes the screen and the train comes in, as PRESS START always did. */

const WD = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const PLACES = { ...SECTION_TITLES, board: 'THE PLAN', quick: 'QUICK VIEW', '': 'THE STATION' };
const place = (id) => PLACES[id] || 'THE STATION';
const playTime = (ms) => { const m = Math.floor(ms / 60000); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; };

let root = null;
let opts = null;
let lastPointer = 'mouse';

/* the stack (Nov 19, John: "stacked... the other cards peeking out... hovering, the rest moves to make
   room"): saves.css lays every card over the lower part of the one above */
const pile = (i) => `--i:${i}`; // (the stack's shape lives in saves.css: overlap, size and offset by --i)
/* two points pinned to each card's left end (top and bottom), so the red L can be drawn to meet it exactly */
const MK = '<i class="sv-mk" data-mk="a" aria-hidden="true"></i><i class="sv-mk" data-mk="b" aria-hidden="true"></i>';
function slip(s, i) {
  const no = `<span class="sv-no" aria-hidden="true"><small>No.</small>${i + 1}</span>`;
  if (!s) {
    return `<li class="sv-li" style="${pile(i)}"><button class="sv-slot sv-empty" type="button" data-i="${i}" aria-label="File ${i + 1}: empty. Start a new game.">${MK}
      ${no}<span class="sv-new" aria-hidden="true">${cutType('NEW GAME', 60 + i)}</span><span class="sv-hint" aria-hidden="true">EMPTY FILE</span>
      <span class="sv-more" aria-hidden="true"><span class="sv-go">START NEW GAME ▸</span></span></button></li>`;
  }
  const p = progress(s);
  const d = new Date(s.meta.saved || s.meta.created || Date.now());
  const tod = timeOfDay(d).label;
  const where = place(s.meta.last);
  const label = `File ${i + 1}: ${where}, ${p.done} of ${p.total} cleared${p.all ? ', completed' : ''}. Saved ${MONTHS[d.getMonth()]} ${d.getDate()}, ${tod}. Play time ${playTime(s.meta.playMs)}. Continue.`;
  const time = playTime(s.meta.playMs);
  if (p.all) { // a finished file: the whole slip is COMPLETED (Nov 19, John: "the whole saved data will say completed")
    return `<li class="sv-li" style="${pile(i)}"><button class="sv-slot sv-complete" type="button" data-i="${i}" aria-label="${esc(label)}">${MK}
    ${no}
    <span class="sv-done" aria-hidden="true"><svg class="sv-burst" viewBox="-50 -50 100 100"><polygon points="${burst()}"/></svg>${cutType('COMPLETED', 77)}</span>
    <span class="sv-ctime" aria-hidden="true"><small>PLAY TIME</small><b>${time}</b></span>
    <span class="sv-more" aria-hidden="true"><span class="sv-go">CONTINUE ▸</span></span>
  </button>${chip(i)}</li>`;
  }
  return `<li class="sv-li" style="${pile(i)}"><button class="sv-slot" type="button" data-i="${i}" aria-label="${esc(label)}">${MK}
    ${no}
    <span class="sv-date" aria-hidden="true"><b>${d.getMonth() + 1}/${String(d.getDate()).padStart(2, '0')}</b><i>${WD[d.getDay()]}</i><em>${esc(tod)}</em></span>
    <span class="sv-place" aria-hidden="true"><span>${esc(where)}</span><span class="sv-pips">${p.items.map((it) => `<i${it.done ? ' class="on"' : ''}></i>`).join('')}</span></span>
    <span class="sv-lv" aria-hidden="true"><small>CLEARED</small><b>${p.done}</b><i>/${p.total}</i></span>
    <span class="sv-more" aria-hidden="true"><span class="sv-time"><small>PLAY TIME</small><b>${time}</b></span><span class="sv-go">CONTINUE ▸</span></span>
  </button>${chip(i)}</li>`;
}
/* CLEAR DATA (Nov 19, John: "don't make the clear data its own box... every box has a clear data box inside
   that data saving box... bottom right side, pretty small"): a small black tag in the bottom-right corner of
   every file that holds a game, always there; the first press asks (SURE?), the second clears that file */
const chip = (i) => `<button class="sv-erase" type="button" data-erase="${i}" aria-label="Clear data of file ${i + 1}. Press twice.">CLEAR DATA</button>`;
function burst() {
  const pts = [];
  for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2 - Math.PI / 2; const r = k % 2 ? 20 : 48; pts.push(`${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`); }
  return pts.join(' ');
}

function markup() {
  const files = store.slots();
  const full = files.every(Boolean);
  return `<div class="sv-stripes" aria-hidden="true"><i></i><i></i><i></i></div>
    <h2 class="sv-title" id="svTitle"><span class="sr-only">Save data</span><span aria-hidden="true">${cutType('SAVE DATA', 41, { mixCase: true })}</span></h2>
    <p class="sv-sub${full ? ' sv-full' : ''}">${full ? `All ${SLOTS} files are in use. CLEAR DATA on one to start a new game.` : 'Pick a file: your progress saves itself to it. An empty file starts a new game.'}</p>
    <svg class="sv-l" aria-hidden="true"><polygon class="sv-l-red"/><polygon class="sv-l-tear"/><line class="sv-l-dash"/><polygon class="sv-l-glint"/><polyline class="sv-l-edge"/></svg>
    <ol class="sv-list">${files.map(slip).join('')}</ol>
    <div class="sv-keys"><button class="sv-key" type="button" data-sv-back><kbd>Esc</kbd><span>BACK</span></button><span class="sv-key sv-key-ok" aria-hidden="true"><kbd>Enter</kbd><span>CONFIRM</span></span></div>`;
}

/** a picked slip plays its file */
const activate = (btn) => play(btn);

/* the red L (Nov 19, John's close-up of his reference: "make the extension seamless, not a second rectangle,
   part of the shape, and make sure it covers the entire headline"): ONE red shape behind the stack, drawn
   on the screen (not inside the tilted cards) so it can always reach the whole title. Its outer edge is one
   straight slanted line from above the title's left end down to the picked card's bottom-left corner; its
   top runs past the title's right end; it tucks under the picked card, which is the same red, so the card
   and the column read as one L. The cards above lie on top of it. Black film-strip dashes run just inside
   the slanted edge, and a thin white double line sits outside its lower part. Picking a card makes it shoot
   up from the card; the shape follows the card while the stack slides. */
let lRaf = 0;
let lUntil = 0;
function drawL() {
  const svg = root.querySelector('.sv-l');
  const on = root.querySelector('.sv-slot.on');
  if (!svg || !on) return;
  const box = root.getBoundingClientRect();
  const pt = (el) => { const r = el.getBoundingClientRect(); return [r.left - box.left, r.top - box.top]; };
  const [ax, ay] = pt(on.querySelector('[data-mk="a"]'));
  const [bx, by] = pt(on.querySelector('[data-mk="b"]'));
  const t = root.querySelector('.sv-title').getBoundingClientRect();
  const top = -12;
  const tl = Math.min(t.left - box.left - 24, bx - (by - top) * 0.3); // (the slanted outer edge, at least as slanted as the reference)
  const tr = Math.max(t.right - box.left + 30, ax + 40);
  const cx = ax + Math.min(160, box.width * 0.12);
  const cy = (ay + by) / 2;
  const f = (n) => n.toFixed(1);
  svg.querySelector('.sv-l-red').setAttribute('points', `${f(tl)},${top} ${f(tr)},${top} ${f(cx)},${f(cy)} ${f(cx)},${f(by - 2)} ${f(bx)},${f(by)}`);
  // the film strip: big black blocks hugging the slanted edge, just inside it
  const len = Math.hypot(bx - tl, by - top); const nx = (by - top) / len; const ny = -(bx - tl) / len; // (the edge's normal, pointing into the red)
  const sw = Math.max(9, Math.min(24, box.width * 0.016)); const d = sw * 0.5 + Math.max(5, sw * 0.45);
  const dash = svg.querySelector('.sv-l-dash');
  dash.setAttribute('x1', f(tl + nx * d)); dash.setAttribute('y1', f(top + ny * d));
  dash.setAttribute('x2', f(bx + nx * d - (bx - tl) * 0.1)); dash.setAttribute('y2', f(by + ny * d - (by - top) * 0.1));
  dash.style.strokeWidth = f(sw);
  dash.style.strokeDasharray = `${f(sw * 3.4)} ${f(sw * 2.2)}`;
  const at = (k, out) => [tl + (bx - tl) * k - nx * out, top + (by - top) * k - ny * out];
  // a thin white sliver along the upper part of the edge (outside), tapering to nothing
  const g0 = at(0.16, 0); const g1 = at(0.44, 0); const g2 = at(0.44, Math.max(5, sw * 0.42));
  const glint = svg.querySelector('.sv-l-glint');
  glint.style.display = g2[0] < 3 ? 'none' : '';
  glint.setAttribute('points', `${f(g0[0])},${f(g0[1])} ${f(g1[0])},${f(g1[1])} ${f(g2[0])},${f(g2[1])}`);
  // the white double line outside the lower part of the edge
  const o = Math.max(10, sw * 1.1); const p0 = at(0.58, o); const p1 = at(0.97, o);
  const w = o * 0.5;
  const edge = svg.querySelector('.sv-l-edge');
  edge.style.display = Math.min(p0[0], p1[0]) - nx * w < 4 ? 'none' : ''; // (only where it fits on screen)
  edge.setAttribute('points', `${f(p0[0])},${f(p0[1])} ${f(p1[0])},${f(p1[1])} ${f(p1[0] - nx * w)},${f(p1[1] - ny * w)} ${f(p0[0] - nx * w)},${f(p0[1] - ny * w)} ${f(p0[0])},${f(p0[1])}`);
  // a torn black strip right under the title, across the red (tilted as the title is)
  const tb = t.bottom - box.top - 2; const tan = Math.tan((5 * Math.PI) / 180);
  const xL = tl + (bx - tl) * ((tb - top) / (by - top)) - 2; const xR = tr + 4;
  const ty = (x) => tb - (x - (t.left - box.left)) * tan;
  const th = Math.max(8, Math.min(18, t.height * 0.16)); const n = 14; const up = []; const dn = [];
  for (let k = 0; k <= n; k++) {
    const x = xL + ((xR - xL) * k) / n; const j = (k % 2 ? 1 : -1) * th * 0.28 * ((k * 7) % 3 / 2 + 0.4);
    up.push(`${f(x)},${f(ty(x) - th * 0.35 + (k % 3 === 1 ? -th * 0.2 : 0))}`); dn.push(`${f(x)},${f(ty(x) + th * 0.65 + j)}`);
  }
  svg.querySelector('.sv-l-tear').setAttribute('points', `${up.join(' ')} ${dn.reverse().join(' ')}`);
  svg.dataset.foot = f(by);
}
/** keep the L on its card for a while (the stack slides when a card opens) */
function followL(ms) {
  lUntil = Math.max(lUntil, performance.now() + ms);
  if (lRaf) return;
  const step = () => { drawL(); lRaf = performance.now() < lUntil ? requestAnimationFrame(step) : 0; };
  lRaf = requestAnimationFrame(step);
}
/** the L shoots up from the picked card's foot */
function shootL() {
  const svg = root.querySelector('.sv-l');
  drawL();
  followL(420);
  if (reducedMotion()) { svg.style.clipPath = ''; return; }
  const from = Math.max(0, Number(svg.dataset.foot || 0) - 60);
  gsap.fromTo(svg, { clipPath: `inset(${from}px 0 0 0)` }, { clipPath: 'inset(0px 0 0 0)', duration: 0.3, ease: 'back.out(1.6)', clearProps: 'clipPath', overwrite: true });
}

const slots = () => [...root.querySelectorAll('.sv-slot')];
function pick(btn, quiet) {
  if (!btn || btn.classList.contains('on')) return;
  slots().forEach((b) => b.classList.toggle('on', b === btn));
  disarm();
  root.querySelector('.sv-list').classList.add('has-on');
  if (quiet) { drawL(); followL(500); } else shootL();
  if (!quiet) sfx('hover');
  if (!reducedMotion() && !quiet) gsap.fromTo(btn, { x: -14 }, { x: 0, duration: 0.22, ease: 'back.out(3)', clearProps: 'transform' });
}

function play(btn) {
  const i = Number(btn.dataset.i);
  const fresh = btn.classList.contains('sv-empty');
  root.classList.add('sv-going');
  sfx('select');
  if (fresh) sfx('stamp');
  const done = () => { close(true); opts.onPick(i, fresh); };
  if (reducedMotion()) { done(); return; }
  const red = root.querySelector('.sv-l-red');
  gsap.timeline({ onComplete: done })
    .fromTo(red, { fill: '#F5F5F0' }, { fill: '#E5191C', duration: 0.18, ease: 'steps(3)', clearProps: 'fill' }, 0)
    .fromTo(btn, { scale: 1.12 }, { scale: 1, duration: 0.2, ease: 'back.out(3)' }, 0)
    .to(root, { xPercent: -110, skewX: 12, duration: 0.32, ease: 'power3.in' }, 0.24);
}

function disarm(keep) {
  root.querySelectorAll('.sv-erase.armed').forEach((e) => { if (e === keep) return; e.classList.remove('armed'); e.textContent = 'CLEAR DATA'; e.setAttribute('aria-label', `Clear data of file ${Number(e.dataset.erase) + 1}. Press twice.`); });
}
function erase(b) {
  if (!b.classList.contains('armed')) {
    disarm(b);
    b.classList.add('armed');
    b.textContent = 'SURE?';
    b.setAttribute('aria-label', `Sure? Press again to clear file ${Number(b.dataset.erase) + 1}.`);
    sfx('toggle');
    if (!reducedMotion()) gsap.fromTo(b, { x: -6 }, { keyframes: [{ x: 5 }, { x: -3 }, { x: 0 }], duration: 0.2, ease: 'steps(4)', clearProps: 'transform' });
    return;
  }
  const i = Number(b.dataset.erase);
  store.eraseSlot(i);
  sfx('shatter');
  sfx('stamp');
  render(i);
}

function render(focusI) {
  root.innerHTML = markup();
  const list = slots();
  const want = list[focusI ?? store.active() ?? 0] || list[0];
  pick(want, true);
  want.focus({ preventScroll: true });
}

/** the file to play, then onPick(i, isNew) */
export function openSaves(o) {
  opts = o;
  if (!root) {
    root = document.createElement('div');
    root.className = 'sv';
    root.id = 'saves';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'svTitle');
    document.body.appendChild(root);
    root.addEventListener('pointerdown', (e) => { lastPointer = e.pointerType; }, true);
    // the mouse picks a file only once it moves (opening the screen under a resting pointer must not
    // pick whatever slip lands under it: the last file played stays picked)
    root.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') pick(e.target.closest?.('.sv-slot')); });
    root.addEventListener('focusin', (e) => { if (e.target.classList?.contains('sv-slot')) pick(e.target); });
    root.addEventListener('click', (e) => {
      if (root.classList.contains('sv-going')) return;
      const er = e.target.closest('.sv-erase');
      if (er) { erase(er); return; }
      if (e.target.closest('[data-sv-back]')) { close(); return; }
      const btn = e.target.closest('.sv-slot');
      if (!btn) return;
      if (lastPointer !== 'mouse' && e.detail !== 0 && !btn.classList.contains('on')) { pick(btn); return; } // a finger: first tap picks
      activate(btn);
    });
    window.addEventListener('resize', () => { if (savesOpen()) followL(300); });
    root.addEventListener('keydown', (e) => { // keep Tab inside
      if (e.key !== 'Tab') return;
      const f = [...root.querySelectorAll('button:not([hidden])')].filter((b) => b.offsetParent !== null);
      const k = f.indexOf(document.activeElement);
      if (e.shiftKey && k <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && k === f.length - 1) { e.preventDefault(); f[0].focus(); }
    });
  }
  root.hidden = false;
  root.classList.remove('sv-going');
  gsap.set(root, { clearProps: 'all' });
  render();
  document.body.classList.add('sv-open');
  followL(1100); // (the cards fly in; the L rides along)
  sfx('paper');
  if (reducedMotion()) return;
  gsap.timeline()
    .fromTo(root, { clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }, { clipPath: 'polygon(0 0, 130% 0, 100% 100%, 0 100%)', duration: 0.32, ease: 'power3.out', clearProps: 'clipPath' }, 0)
    .fromTo(root.querySelectorAll('.sv-title .ct'), { y: -60, rotation: () => gsap.utils.random(-40, 40), opacity: 0 }, { y: 0, rotation: 0, opacity: 1, duration: 0.3, ease: 'back.out(2.2)', stagger: 0.03, clearProps: 'all' }, 0.1)
    .fromTo(root.querySelectorAll('.sv-li'), { x: () => window.innerWidth, rotation: 8, opacity: 0 }, { x: 0, rotation: 0, opacity: 1, duration: 0.34, ease: 'back.out(1.8)', stagger: 0.06, clearProps: 'transform,opacity' }, 0.12)
    .fromTo(root.querySelector('.sv-keys'), { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.25, ease: 'back.out(2)', clearProps: 'transform,opacity' }, 0.3);
}

export function closeSaves() { close(); }
function close(picked) {
  if (!root || root.hidden) return;
  const end = () => { root.hidden = true; document.body.classList.remove('sv-open'); gsap.set(root, { clearProps: 'all' }); if (!picked) opts?.onClose?.(); };
  if (picked || reducedMotion()) { end(); return; }
  sfx('back');
  gsap.timeline({ onComplete: end })
    .to(root.querySelectorAll('.sv-li'), { x: () => window.innerWidth, rotation: 8, duration: 0.24, ease: 'power3.in', stagger: 0.03 }, 0)
    .to(root, { clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)', duration: 0.26, ease: 'power3.in' }, 0.12);
}
export const savesOpen = () => Boolean(root && !root.hidden);

/** the site's keys while it is open: arrows/W/S pick, Enter plays, Esc goes back */
export function savesKey(action, e) {
  if (root.classList.contains('sv-going')) return true;
  const list = slots();
  const k = list.findIndex((b) => b.classList.contains('on'));
  if (action === 'up' || action === 'down') {
    const n = list[(k + (action === 'up' ? -1 : 1) + list.length) % list.length];
    n.focus({ preventScroll: true });
    pick(n);
    return true;
  }
  if (action === 'back') { close(); return true; }
  if (action === 'confirm') {
    if (e && document.activeElement && root.contains(document.activeElement) && document.activeElement.tagName === 'BUTTON') return false; // (the button's own Enter)
    activate(list[k] || list[0]);
    return true;
  }
  return true; // nothing else while it is open (no number keys, no Quick View)
}
