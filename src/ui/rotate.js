/* "Turn your phone" (Nov 19, John: "on the phone, held the normal way, it doesn't really show the
   entire subway... a quick screen reminder that covers the whole screen, fully red, a simple header
   and body, a picture of the phone with an arrow showing which way to turn it, animated, in the
   Persona-ish style"). Our red, a cut-out header, a slanted black strip of body text, a phone that
   tips onto its side under a curved arrow, on a loop.

   A reminder, never a wall: once per visit, only on a phone held upright, after the loading star;
   it leaves by itself the moment the phone is turned, and GOT IT (or Esc) lets anyone carry on
   upright. Only the button closes it, so a stray tap can't hide it before it's read. Automated test browsers skip it unless the URL asks for it (?rotate). */
import { cutType } from './cuttype.js';
import { sfx } from '../audio/audio.js';

const SEEN = 'jn-rotate-seen';
const upright = () => window.matchMedia('(orientation: portrait) and (max-width: 600px) and (pointer: coarse)').matches;

export function maybeRotateHint() {
  if (navigator.webdriver && !/[?&]rotate\b/.test(location.search)) return;
  try { if (sessionStorage.getItem(SEEN)) return; } catch { /* private mode: show it */ }
  if (!upright() && !/[?&]rotate\b/.test(location.search)) return;
  try { sessionStorage.setItem(SEEN, '1'); } catch { /* fine */ }
  const el = document.createElement('div');
  el.className = 'rot';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'rotTitle');
  el.innerHTML = `
    <div class="rot-dots" aria-hidden="true"></div>
    <div class="rot-phone" aria-hidden="true">
      <svg viewBox="-66 -66 132 132">
        <path class="rot-arrow" d="M-50 -24A56 56 0 0 1 24 -51" />
        <path class="rot-head" d="M14 -62L34 -50L15 -38Z" />
        <g class="rot-body"><rect x="-22" y="-40" width="44" height="80" rx="7" /><rect class="rot-screen" x="-16" y="-31" width="32" height="58" rx="2" /><circle class="rot-btn" cx="0" cy="33.5" r="3" /></g>
      </svg>
    </div>
    <h2 class="rot-title" id="rotTitle" aria-label="Turn your phone"><span class="rot-slab">${cutType('TURN YOUR', 41)}</span><span class="rot-slab rot-big">${cutType('PHONE', 77)}</span></h2>
    <p class="rot-body-text">Hold it sideways to see the whole station.</p>
    <button class="rot-ok" type="button">GOT IT <span aria-hidden="true">▸</span></button>`;
  document.body.appendChild(el);
  const prev = document.activeElement;
  const btn = el.querySelector('.rot-ok');
  requestAnimationFrame(() => { el.classList.add('in'); btn.focus({ preventScroll: true }); });
  const mq = window.matchMedia('(orientation: portrait)');
  const close = () => {
    mq.removeEventListener?.('change', turned);
    window.removeEventListener('keydown', key, true);
    el.classList.remove('in');
    el.classList.add('out');
    setTimeout(() => el.remove(), 320);
    if (prev?.focus) prev.focus({ preventScroll: true });
  };
  const turned = () => { if (!mq.matches) close(); };
  const key = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
    if (e.key === 'Tab') { e.preventDefault(); btn.focus(); } // the button is the only thing to reach
  };
  mq.addEventListener?.('change', turned);
  window.addEventListener('keydown', key, true);
  btn.addEventListener('click', () => { sfx('select'); close(); });
}
