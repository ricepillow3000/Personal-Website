/* "Turn your phone" (Nov 19, John: "on the phone, held the normal way, it doesn't really show the
   entire subway... a quick screen reminder that covers the whole screen, fully red, a simple header
   and body, a picture of the phone with an arrow showing which way to turn it, animated, in the
   Persona-ish style"; then: "not a static pop-up... a transition where it comes in from the side,
   with that perspective feel, in our design"). Our red, a cut-out header, a slanted black strip of
   body text, a phone that tips onto its side under a curved arrow, on a loop.
   In: a black slab sweeps across and the red wipes in behind it on a slant; then the pieces fly in
   with real perspective (3D, staggered): the phone spins in from the side, TURN YOUR swings in from
   the left and PHONE from the right, the strip tips up into place, the button pops. Out (turning the
   phone or GOT IT): the pieces swing away in 3D and the red wipes off to the right.

   A reminder, never a wall: once per visit, only on a phone held upright, after the loading star;
   it leaves by itself the moment the phone is turned, and GOT IT (or Esc) lets anyone carry on
   upright. Only the button closes it, so a stray tap can't hide it before it's read. Automated test browsers skip it unless the URL asks for it (?rotate). */
import { cutType } from './cuttype.js';
import { sfx } from '../audio/audio.js';
import { reducedMotion } from '../core/util.js';

const SEEN = 'jn-rotate-seen';
/* OPENED INSIDE AN APP (Nov 22, John: "when I click the link on my app, I can't turn my phone unless I redirect it to a browser").
   Root cause: a link tapped in Messages, LinkedIn, Instagram, the Claude app and the like opens in that app's own built-in
   browser, and most of those never turn sideways. A website cannot make an app hand it to Safari (iOS does not allow it),
   so the reminder says what is going on and offers the way out: on Android a link that opens Chrome; on an iPhone the
   Safari link scheme where the app allows it, and the link copied either way with the one step to take. GOT IT still lets
   anyone carry on upright, where the whole site works. */
const UA = navigator.userAgent || '';
const IOS = /iP(hone|ad|od)/.test(UA);
export const inAppBrowser = () => /FBAN|FBAV|FB_IAB|Instagram|LinkedInApp|Line\/|Twitter|Snapchat|MicroMessenger|TikTok|musical_ly|Pinterest|GSA\/|Claude|; wv\)/i.test(UA)
  || (IOS && !/Safari\//.test(UA)); // (an app's built-in browser on an iPhone does not call itself Safari; Safari, Chrome and Firefox on iOS all do)
/* (Nov 25, John: "Let's say someone opens it on LinkedIn or Instagram. Can we have the button redirect them to their default
   browser? So then they can turn their phone"). Android: an intent with no package named, so the phone opens its DEFAULT
   browser (it named Chrome before), with the page itself as the fallback. iPhone: Apple only lets a page hand a link to Safari
   (x-safari-https, iOS 17 and later), which is the default browser on most iPhones. If the app refuses (the page is still here
   a moment later), the link is already copied and the note says the one step to take in that app. */
const APP = /Instagram/i.test(UA) ? 'Instagram' : /LinkedInApp/i.test(UA) ? 'LinkedIn' : /FBAN|FBAV|FB_IAB/i.test(UA) ? 'Facebook'
  : /Snapchat/i.test(UA) ? 'Snapchat' : /TikTok|musical_ly/i.test(UA) ? 'TikTok' : /Twitter/i.test(UA) ? 'X' : /GSA\//.test(UA) ? 'the Google app' : 'an app';
export const inAppName = () => APP;
export function browserLink(url) {
  const clean = url.replace(/[?&]rotate\b/, '');
  if (/Android/i.test(UA)) return `intent://${clean.replace(/^https?:\/\//, '')}#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;S.browser_fallback_url=${encodeURIComponent(clean)};end`;
  if (IOS) return clean.replace(/^(https?):/, 'x-safari-$1:');
  return clean;
}
export function openInBrowser(note, from) {
  const url = location.href.replace(/[?&]rotate\b/, '');
  let copied = false;
  try { navigator.clipboard?.writeText(url).then(() => { copied = true; }, () => {}); } catch { /* not allowed here: the step below still works */ }
  const link = browserLink(url);
  if (from) from.dataset.link = link; // (tests read where it sent the visitor)
  if (note) note.textContent = '';
  if (link !== url) location.href = link;
  setTimeout(() => { // still here: the app kept the page, so say the one step to take
    if (document.hidden || !note) return;
    const step = IOS ? 'In this app, tap ··· (or the share button), then Open in Safari.' : 'In this app, tap ⋮, then Open in browser.';
    note.textContent = copied ? `Link copied. ${step}` : step;
  }, 1200);
}
const upright = () => window.matchMedia('(orientation: portrait) and (max-width: 600px) and (pointer: coarse)').matches;

export function maybeRotateHint() {
  if (navigator.webdriver && !/[?&]rotate\b/.test(location.search)) return;
  try { if (sessionStorage.getItem(SEEN)) return; } catch { /* private mode: show it */ }
  if (!upright() && !/[?&]rotate\b/.test(location.search)) return;
  try { sessionStorage.setItem(SEEN, '1'); } catch { /* fine */ }
  const inApp = inAppBrowser();
  const el = document.createElement('div');
  el.className = 'rot';
  if (inApp) el.dataset.inapp = '';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'rotTitle');
  el.innerHTML = `
    <div class="rot-band" aria-hidden="true"></div>
    <div class="rot-dots" aria-hidden="true"></div>
    <div class="rot-phone" aria-hidden="true">
      <svg viewBox="-66 -66 132 132">
        <path class="rot-arrow" d="M-50 -24A56 56 0 0 1 24 -51" />
        <path class="rot-head" d="M14 -62L34 -50L15 -38Z" />
        <g class="rot-body"><rect x="-22" y="-40" width="44" height="80" rx="7" /><rect class="rot-screen" x="-16" y="-31" width="32" height="58" rx="2" /><circle class="rot-btn" cx="0" cy="33.5" r="3" /></g>
      </svg>
    </div>
    <h2 class="rot-title" id="rotTitle" aria-label="Turn your phone"><span class="rot-slab">${cutType('TURN YOUR', 41)}</span><span class="rot-slab rot-big">${cutType('PHONE', 77)}</span></h2>
    <p class="rot-body-text">${inApp ? `This opened inside ${APP}, and it won\u2019t turn. Open it in your browser to see the whole station.` : 'Hold it sideways to see the whole station.'}</p>
    ${inApp ? '<button class="rot-open" type="button">OPEN IN BROWSER <span aria-hidden="true">▸</span></button><p class="rot-note" aria-live="polite"></p>' : ''}
    <button class="rot-ok" type="button">GOT IT <span aria-hidden="true">▸</span></button>`;
  document.body.appendChild(el);
  const prev = document.activeElement;
  const btn = el.querySelector('.rot-ok');
  const still = reducedMotion();
  const FULL = 'polygon(0 0, 130% 0, 100% 100%, -30% 100%)';
  const parts = [
    // [element, the 3D place it flies in from, delay ms]
    [el.querySelector('.rot-phone'), { translate: '-70vw 0 -200px', rotate: 'y 75deg', scale: '.55' }, 200],
    [el.querySelectorAll('.rot-slab')[0], { translate: '-90vw 0 -260px', rotate: 'y 55deg' }, 280],
    [el.querySelectorAll('.rot-slab')[1], { translate: '90vw 0 -260px', rotate: 'y -55deg' }, 340],
    [el.querySelector('.rot-body-text'), { translate: '0 40px -120px', rotate: 'x 75deg' }, 420],
    [el.querySelector('.rot-ok'), { scale: '.3', rotate: '-14deg' }, 500],
  ];
  if (still) el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
  else {
    el.animate([{ clipPath: 'polygon(0 0, 0 0, -30% 100%, -30% 100%)' }, { clipPath: FULL }], { duration: 420, easing: 'cubic-bezier(.7, 0, .2, 1)' });
    el.querySelector('.rot-band').animate([{ translate: '-70vw 0' }, { translate: '140vw 0' }], { duration: 560, easing: 'cubic-bezier(.5, 0, .3, 1)', fill: 'forwards' });
    parts.forEach(([p, from, delay]) => p?.animate([{ ...from, opacity: 0 }, { translate: '0 0 0', rotate: 'y 0deg', scale: '1', opacity: 1 }], { duration: 560, delay, easing: 'cubic-bezier(.2, 1.3, .4, 1)', fill: 'backwards' }));
    sfx('swish');
  }
  setTimeout(() => btn.focus({ preventScroll: true }), still ? 0 : 560);
  const mq = window.matchMedia('(orientation: portrait)');
  let closing = false;
  const close = () => {
    mq.removeEventListener?.('change', turned);
    window.removeEventListener('resize', turned);
    window.removeEventListener('keydown', key, true);
    if (closing) return;
    closing = true;
    if (still) {
      el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' });
      setTimeout(() => el.remove(), 190);
    } else {
      // the pieces swing away in 3D, then the red wipes off to the right
      parts.forEach(([p], i) => p?.animate([{ opacity: 1 }, { translate: '60vw 0 -300px', rotate: 'y -80deg', opacity: 0 }], { duration: 300, delay: i * 30, easing: 'cubic-bezier(.6, 0, .9, .4)', fill: 'forwards' }));
      el.animate([{ clipPath: FULL }, { clipPath: 'polygon(130% 0, 130% 0, 100% 100%, 100% 100%)' }], { duration: 380, delay: 160, easing: 'cubic-bezier(.7, 0, .3, 1)', fill: 'forwards' });
      sfx('zip');
      setTimeout(() => el.remove(), 560);
    }
    if (prev?.focus) prev.focus({ preventScroll: true });
  };
  const turned = () => { if (!mq.matches || window.innerWidth > window.innerHeight) close(); }; // (some phone browsers only send a resize)
  const key = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
    if (e.key === 'Tab') { e.preventDefault(); const open = el.querySelector('.rot-open'); (open && document.activeElement === btn ? open : btn).focus(); } // (the buttons are the only things to reach)
  };
  mq.addEventListener?.('change', turned);
  window.addEventListener('resize', turned);
  window.addEventListener('keydown', key, true);
  btn.addEventListener('click', () => { sfx('select'); close(); });
  el.querySelector('.rot-open')?.addEventListener('click', (e) => { sfx('select'); openInBrowser(el.querySelector('.rot-note'), e.currentTarget); });
}
