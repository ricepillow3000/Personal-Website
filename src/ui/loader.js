/* The loading screen (Nov 19, John: "instead of a lock, TAKE YOUR NETWORK in the middle... acts as the
   loading bar. Bottom right, a star or banner with the philosophy of our resume, spinning. When the bar fully loads, a button underneath; click it and a transition opens to the
   subway station, seamless, situational: zooming into a word, into the holes of letters, and that
   gateway opens into the station").

   The words (Nov 19, John: "TAKE YOUR NETWORK sounds a bit corny... more in tune with our philosophy";
   then TAKE YOUR NOTES; then "is it safe to use the motto take your time? I really like that one from
   Persona 5... change everything"): TAKE YOUR TIME, a deliberate homage (an everyday phrase; our own
   letters, colours, seal and dive). It asks the visitor to slow down and read, the site's whole point
   against 7-second skims of boring resumes. Over the words, CASE FILE · JOHN NGUYEN in typewriter.

   The words are the bar: twelve cut-out letters, each an empty grey slot that fills with ink from the
   left as the page really loads (the code running, the brand fonts, the platform's sharp picture, the
   load event); a letter pops when it is full, a word clicks when it is complete. At 100% ENTER THE
   STATION slams in under the words (after a red marker underlines TIME). The click dives into the O of YOUR: the camera pushes in, the
   O's hole flashes white, then it is a hole, the station showing through, and the dive carries on
   through it until the hole is bigger than the screen. The spinning seal (bottom right) carries the
   site's philosophy: resumes don't have to be boring; built by directing a crew of AI agents.

   It is in app.html, so it is on screen from the very first paint. Sound: browsers play nothing before
   the visitor's first tap, so the fill is heard only once they have tapped (a tap during it wakes the
   sound); the click on ENTER THE STATION always is (the dive, the doorway), and the music waits until
   the doorway has opened. If the script fails, a CSS fallback hides the screen; with reduced motion it
   simply fades. Automated test browsers skip it unless the URL asks for it (?intro). */
import { reducedMotion, fontsReady } from '../core/util.js';
import { stationReady } from '../fx/backdrop.js';
import { sfx, holdMusic } from '../audio/audio.js';

let opened;
/** resolves the moment the doorway opens (at once when there is no loading screen): the title's own
    landing punch waits for it, so it plays where it can be seen */
export const introOpen = new Promise((r) => { opened = r; });
const CAP = 6000; // ms: counted as loaded by then whatever is still coming
const FILL = 1600; // ms: the shortest fill, 0 to 100 (every letter is seen landing)

export function runLoader() {
  const el = document.getElementById('loader');
  if (!el) { opened(); return Promise.resolve(); }
  if (navigator.webdriver && !/[?&]intro\b/.test(location.search)) {
    el.remove();
    opened();
    return Promise.resolve();
  }
  el.classList.add('ld-live');
  const bar = el.querySelector('[role="progressbar"]');
  const num = el.querySelector('#ldNum');
  const go = el.querySelector('.ld-go');
  const letters = [...el.querySelectorAll('.ld-l')];
  const words = [...el.querySelectorAll('.ld-w')].map((w) => letters.indexOf(w.lastElementChild)); // the last letter of each word
  const N = letters.length;
  const fill = letters.map(() => -1);
  let target = 12; // the page's own code is running
  let shown = 0;
  let last = -1;
  let finish;
  const finished = new Promise((r) => { finish = r; });
  const bump = (v) => { target = Math.max(target, v); };
  fontsReady(3500).then(() => bump(40));
  stationReady().then(() => bump(88));
  const loaded = () => bump(100);
  if (document.readyState === 'complete') loaded();
  else window.addEventListener('load', loaded, { once: true });
  setTimeout(() => bump(100), CAP);
  holdMusic(finished);

  // the fill climbs toward the real progress, never faster than FILL ms from 0 to 100
  let prev = 0;
  const tick = (now) => {
    const dt = Math.min(64, now - (prev || now));
    prev = now;
    shown = Math.min(target, shown + dt * (100 / FILL));
    const n = Math.round(shown);
    if (n !== last || shown >= 100) { // (only when the number changes, and once at the very end: no work in between)
      last = n;
      num.textContent = String(n);
      bar.setAttribute('aria-valuenow', String(n));
      const at = (shown / 100) * N; // how many letters' worth of ink
      letters.forEach((l, k) => {
        const f = Math.max(0, Math.min(1, at - k));
        const q = Math.round(f * 8) / 8; // (eighths: fewer style changes while the page is still busy loading)
        if (q === fill[k]) return;
        fill[k] = q;
        l.style.setProperty('--f', String(q));
        if (q === 1 && !l.classList.contains('in')) {
          l.classList.add('in'); // the letter is full: it pops
          const w = words.indexOf(k);
          if (w >= 0) sfx('wordDone', w); // a word is complete: a click and a knock
          else sfx('lockTick', Math.round(((k + 1) / N) * 100)); // a letter: a soft tick, rising
        }
      });
    }
    if (shown >= 100) {
      ready();
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // 100%: ENTER THE STATION slams in under the words; its click (or Enter) dives into the O
  function ready() {
    el.classList.add('ready', 'inked'); // TIME gets its red underline...
    sfx('underline');
    setTimeout(() => { // ...then ENTER THE STATION slams in under it
      go.hidden = false;
      sfx('hoverBig');
      requestAnimationFrame(() => go.focus({ preventScroll: true }));
    }, reducedMotion() ? 0 : 330);
    go.addEventListener('click', () => {
      if (el.classList.contains('going')) return;
      el.classList.add('going');
      go.disabled = true;
      door(el).then(finish);
    });
  }
  return finished;
}

/* The dive: the whole screen pushes in toward the O of YOUR (a browser animation on the loader, so
   no per-frame script), the O's hole flashes white, then the loader is cut by a hole of exactly the
   O's inner shape (clip-path, even-odd) and the push carries on through it, accelerating, until the
   hole is bigger than the screen; the station behind settles from a push-in. */
function door(el) {
  const back = document.getElementById('backdrop');
  if (reducedMotion()) {
    opened();
    return new Promise((r) => {
      el.classList.add('ld-fade');
      setTimeout(() => { el.remove(); r(); }, 260);
    });
  }
  const W = window.innerWidth;
  const H = window.innerHeight;
  const o = el.querySelector('.ld-o');
  const ring = o.querySelector('.ld-i .ld-ring');
  const box = ring.getBoundingClientRect();
  const cx = box.left + box.width / 2;
  const cy = box.top + box.height / 2;
  const k = parseFloat(getComputedStyle(ring).height) / 80; // screen px per ring unit (its viewBox is 80 tall)
  const rx = (21 - 6.5) * k; // the ring's inner edge (radius minus half the stroke)
  const ry = (28 - 6.5) * k;
  const tilt = ((Number(o.dataset.r) - 3) * Math.PI) / 180; // its own tilt, plus the words' -3deg
  const pts = Array.from({ length: 36 }, (_, i) => {
    const a = (i / 36) * Math.PI * 2;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    return `${(cx + x * Math.cos(tilt) - y * Math.sin(tilt)).toFixed(1)}px ${(cy + x * Math.sin(tilt) + y * Math.cos(tilt)).toFixed(1)}px`;
  });
  const hole = `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${pts.join(', ')}, ${pts[0]}, 0 0)`;
  const far = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy));
  const S = (far / Math.min(rx, ry)) * 1.15; // the hole's narrow side clears every corner
  const PUSH = 2.6;
  const DUR = 1150;
  const OPEN = 0.34; // the moment (of DUR) the hole opens
  return new Promise((resolve) => {
    sfx('portal'); // a rising rush as the camera dives
    el.style.transformOrigin = `${cx}px ${cy}px`;
    let anim;
    try {
      anim = el.animate([
        { offset: 0, transform: 'scale(1) rotate(0deg)', opacity: 1, easing: 'cubic-bezier(.4, 0, .7, 1)' },
        { offset: OPEN, transform: `scale(${PUSH}) rotate(-4deg)`, opacity: 1, easing: 'cubic-bezier(.55, 0, .95, .55)' },
        { offset: 0.8, opacity: 1 },
        { offset: 1, transform: `scale(${S.toFixed(1)}) rotate(-14deg)`, opacity: 0 } // (the last, huge edge melts away)
      ], { duration: DUR, fill: 'forwards' });
    } catch { /* no animation support: the timers below still finish it */ }
    setTimeout(() => el.classList.add('flash'), DUR * OPEN - 70); // the hole flashes white
    setTimeout(() => {
      el.style.clipPath = hole; // ...then it is a hole: the station through it
      el.classList.remove('flash');
      sfx('doorway');
      opened();
      back.style.transformOrigin = `${cx}px ${cy}px`;
      back.animate([{ transform: 'scale(1.25)' }, { transform: 'none' }], { duration: 1500, easing: 'cubic-bezier(.2, .7, .3, 1)' });
    }, DUR * OPEN);
    // gone when the hole has passed the screen; and by a timer as well, so no browser that never
    // reports the animation finished can leave an invisible layer over the page
    let gone = false;
    const done = () => { if (gone) return; gone = true; el.remove(); back.style.transformOrigin = ''; resolve(); };
    anim?.finished.then(done, done);
    setTimeout(done, DUR + 300);
  });
}
