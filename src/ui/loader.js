/* The loading star (Nov 19, John: "a loading screen... a star in the middle that acts as a progress
   bar, and once it fills up to 100% it looks like you are entering the star, like it's a doorway,
   and then it slowly opens up into the first page where you see the subway").

   The star is in app.html, so it is on screen from the very first paint (no flash of the title, no
   black screen). It fills with red from the bottom as the page really loads: the code running, the
   brand fonts, the platform's sharp picture, the page's load event. The number eases toward the
   real progress (never backward, never faster than it can be read). At 100% the red flashes white,
   the star becomes a hole in the black with the station showing through it, and the camera goes
   through: the star grows past the edges of the screen while the station settles from a push-in.

   Never a trap: a tap or a key skips straight to the doorway, it never waits more than CAP ms,
   if the script fails a CSS fallback hides it, and with reduced motion it simply fades. Automated
   test browsers skip it unless the URL asks for it (?intro), so the other tests see the page at once. */
import { reducedMotion, fontsReady } from '../core/util.js';
import { stationReady } from '../fx/backdrop.js';

let opened;
/** resolves the moment the doorway opens (at once when there is no loading star): the title's own
    slam-in waits for it, so it plays where it can be seen instead of under the star */
export const introOpen = new Promise((r) => { opened = r; });
const CAP = 6000; // ms: the doorway opens by then whatever is still loading
const MIN = 900; // ms: a cached visit still sees the star fill (it is the intro, not a wait)
const STAR = (cx, cy, R) => {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? R * 0.45 : R;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    d += `${i ? 'L' : 'M'}${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
  }
  return `${d}Z`;
};

export function runLoader() {
  const el = document.getElementById('loader');
  if (!el) { opened(); return Promise.resolve(); }
  if (navigator.webdriver && !/[?&]intro\b/.test(location.search)) {
    el.remove();
    opened();
    return Promise.resolve();
  }
  const t0 = performance.now();
  const num = el.querySelector('#ldNum');
  const level = el.querySelector('#ldLevel');
  let target = 12; // the page's own code is running
  let shown = 0;
  let last = -1;
  let done = false;
  let finish;
  const finished = new Promise((r) => { finish = r; });
  const bump = (v) => { target = Math.max(target, v); };
  fontsReady(3500).then(() => bump(40));
  stationReady().then(() => bump(88));
  const loaded = () => bump(100);
  if (document.readyState === 'complete') loaded();
  else window.addEventListener('load', loaded, { once: true });
  const cap = setTimeout(() => bump(100), CAP);
  let skipped = false;
  const skip = () => { skipped = true; bump(100); shown = 100; }; // straight to the doorway
  el.addEventListener('pointerdown', skip);
  window.addEventListener('keydown', skip, { once: true });

  // the fill: eases toward the real progress; 100% only once MIN has passed
  const tick = () => {
    if (done) return;
    const goal = !skipped && performance.now() - t0 < MIN ? Math.min(target, 96) : target;
    shown += Math.max(0.4, (goal - shown) * 0.12);
    shown = Math.min(shown, goal);
    const n = Math.round(shown);
    if (n !== last) { // (only when the number changes: no work on the frames in between)
      last = n;
      num.textContent = String(n);
      el.setAttribute('aria-valuenow', String(n));
      level.setAttribute('y', (100 - shown * 2.1).toFixed(1)); // the red rises from the star's foot (y 100) past its tip (-110)
    }
    if (shown >= 100) {
      done = true;
      clearTimeout(cap);
      window.removeEventListener('keydown', skip);
      door(el).then(finish);
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return finished;
}

/* 100%: flash, then through the star like a doorway, into the station. The doorway is the loader's
   own black, cut by a star-shaped hole (clip-path, even-odd) that grows past the screen's corners;
   the station behind it settles from a push-in. Both run as browser animations (no per-frame
   script), so the phone's main thread stays free while the page comes to life. */
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
  const core = el.querySelector('.ld-star');
  const box = core.getBoundingClientRect();
  const cx = box.left + box.width / 2;
  const cy = box.top + box.height / 2 + box.height * 0.035; // (the star's visual centre sits a little low)
  const R0 = box.width / 2.2;
  const R1 = Math.hypot(W, H) * 1.35; // its inner corners clear the screen's corners
  const hole = (R, rot) => {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? R * 0.45 : R;
      const a = -Math.PI / 2 + (i * Math.PI) / 5 + (rot * Math.PI) / 180;
      pts.push(`${(cx + r * Math.cos(a)).toFixed(1)}px ${(cy + r * Math.sin(a)).toFixed(1)}px`);
    }
    return `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${pts.join(', ')}, ${pts[0]}, 0 0)`;
  };
  // the growth eases in (power 3), sampled into keyframes so the star also turns as it grows
  const frames = Array.from({ length: 13 }, (_, i) => {
    const u = i / 12;
    const e = u * u * u;
    return { offset: u, clipPath: hole(R0 + (R1 - R0) * e, 18 * e) };
  });
  return new Promise((resolve) => {
    el.classList.add('flash'); // the red flashes white
    setTimeout(() => {
      el.classList.add('door'); // the star is a hole now: the station through it
      opened();
      back.style.transformOrigin = `${cx}px ${cy}px`;
      back.animate([{ transform: 'scale(1.18)' }, { transform: 'none' }], { duration: 1500, easing: 'cubic-bezier(.2, .7, .3, 1)' });
      el.animate(frames, { duration: 1000, delay: 140, easing: 'linear', fill: 'forwards' }).finished
        .then(() => { el.remove(); back.style.transformOrigin = ''; resolve(); });
    }, 170);
  });
}
