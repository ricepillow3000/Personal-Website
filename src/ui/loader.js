/* The lock (Nov 19, John asked for a loading screen that fills like a progress bar and then opens like
   a doorway into the subway; then: "we overuse the star... find other shapes that match our design,
   in our resume theme"). The site is a heist (the calling card, "consider it stolen", TAKE YOUR
   NETWORK), so the visitor picks a lock: a cut-paper lock plate (white ink edge, red misprint) with a
   keyhole that fills with red as the page really loads, and four pins that snap up into place one by
   one (25, 50, 75, 100%). At 100% the key turns, the keyhole flashes white, and the keyhole itself
   is the doorway: a keyhole-shaped hole in the black that grows past the screen while the station
   settles from a push-in. Original shapes (no game's logo or mascot).

   It is in app.html, so it is on screen from the very first paint (no flash of the title, no black
   screen). Progress is real: the code running, the brand fonts, the platform's sharp picture, the
   page's load event; the number eases toward it (never backward, never faster than it can be read).

   Heard (Nov 19, John: "sound on by default so users can hear the loading bar until 100, the clicks
   of the 4 pins, the lock unlocking and the zoom into the subway"): browsers play no sound before
   the visitor's first tap, so the lock waits for one, TAP TO PICK THE LOCK (any tap, click or key),
   while the page loads quietly behind it; that tap turns the sound on and the pick plays with it.
   Never a trap: nobody tapping, it opens by itself GRACE ms after the page has loaded (silently);
   if the script fails a CSS fallback hides it, and with reduced motion it simply fades. Automated
   test browsers skip it unless the URL asks for it (?intro), so the other tests see the page at once. */
import { reducedMotion, fontsReady } from '../core/util.js';
import { stationReady } from '../fx/backdrop.js';
import { sfx, holdMusic } from '../audio/audio.js';

let opened;
/** resolves the moment the doorway opens (at once when there is no lock screen): the title's own
    landing punch waits for it, so it plays where it can be seen */
export const introOpen = new Promise((r) => { opened = r; });
// the keyhole's outline in units of its round top's radius (y down): an arc over the top, a neck that
// widens to the foot (the same shape as the lock in app.html, there at radius 28)
const KEYHOLE = [[0.527, 0.85], [0.697, 0.718], [0.834, 0.552], [0.933, 0.361], [0.988, 0.153], [0.998, -0.062], [0.962, -0.274], [0.881, -0.473], [0.759, -0.651], [0.603, -0.798], [0.418, -0.909], [0.214, -0.977], [0, -1], [-0.214, -0.977], [-0.418, -0.909], [-0.603, -0.798], [-0.759, -0.651], [-0.881, -0.473], [-0.962, -0.274], [-0.998, -0.062], [-0.988, 0.153], [-0.933, 0.361], [-0.834, 0.552], [-0.697, 0.718], [-0.527, 0.85], [-0.8, 2.2], [0.8, 2.2]];
const CAP = 6000; // ms: counted as loaded by then whatever is still coming
const GRACE = 5000; // ms after loading: nobody tapped, so the lock opens by itself (silently)
const PICK = 1400; // ms: the shortest pick, 0 to 100 (so every tick and pin is heard)

export function runLoader() {
  const el = document.getElementById('loader');
  if (!el) { opened(); return Promise.resolve(); }
  if (navigator.webdriver && !/[?&]intro\b/.test(location.search)) {
    el.remove();
    opened();
    return Promise.resolve();
  }
  const bar = el.querySelector('[role="progressbar"]');
  const num = el.querySelector('#ldNum');
  const level = el.querySelector('#ldLevel');
  const pins = [...el.querySelectorAll('.ld-pin')];
  const go = el.querySelector('.ld-go');
  let target = 12; // the page's own code is running (loading goes on quietly while the lock waits)
  let shown = 0;
  let last = -1;
  let lastTick = 0;
  let pinsSet = 0;
  let picking = false;
  let done = false;
  let finish;
  const finished = new Promise((r) => { finish = r; });
  let auto = 0;
  const bump = (v) => {
    target = Math.max(target, v);
    // nobody tapped: the lock opens by itself (silently) a few seconds after the page has loaded
    if (target >= 100 && !picking && !auto) auto = setTimeout(start, GRACE);
  };
  fontsReady(3500).then(() => bump(40));
  stationReady().then(() => bump(88));
  const loaded = () => bump(100);
  if (document.readyState === 'complete') loaded();
  else window.addEventListener('load', loaded, { once: true });
  setTimeout(() => bump(100), CAP);

  /* The visitor's tap (or click, or key) picks the lock. Browsers allow a page no sound before one, so
     this tap is what lets the lock be heard: audio.js's own wake-up turns the sound on in the same
     tap, the music waits until the doorway has opened, and every tick, pin and the bolt play. */
  const START = ['pointerup', 'keydown'];
  function start(e) {
    if (picking || (e && e.type === 'keydown' && e.key === 'Escape')) return;
    picking = true;
    clearTimeout(auto);
    START.forEach((t) => window.removeEventListener(t, start));
    el.classList.add('picking');
    if (go) go.disabled = true;
    requestAnimationFrame(tick);
  }
  holdMusic(finished); // (from the start: the page's wake-up runs before this, in the same tap)
  START.forEach((t) => window.addEventListener(t, start));
  if (go) requestAnimationFrame(() => go.focus({ preventScroll: true }));

  // the pick: the fill climbs toward the real progress, never faster than PICK ms from 0 to 100, so
  // every tick and every pin is heard: soft rising ticks as the keyhole fills, a click per pin
  let prev = 0;
  const tick = (now) => {
    if (done) return;
    const dt = Math.min(64, now - (prev || now));
    prev = now;
    shown = Math.min(target, shown + dt * (100 / PICK)); // a steady climb (slower if the page is still loading)
    const n = Math.round(shown);
    if (n !== last) { // (only when the number changes: no work on the frames in between)
      last = n;
      num.textContent = String(n);
      bar.setAttribute('aria-valuenow', String(n));
      level.setAttribute('y', (44 - shown * 0.95).toFixed(1)); // the red rises from the keyhole's foot (y 42) past its top (-48)
      if (n >= lastTick + 5) { lastTick = n - (n % 5); sfx('lockTick', n); } // the tension wrench, rising as it goes
      pins.forEach((p) => p.classList.toggle('set', n >= Number(p.dataset.at))); // each pin snaps up as its step lands
      const now2 = pins.filter((p) => n >= Number(p.dataset.at)).length;
      for (let k = pinsSet; k < now2; k++) setTimeout(() => sfx('lockPin', k), (k - pinsSet) * 90); // a click per pin, never two at once
      pinsSet = Math.max(pinsSet, now2);
    }
    if (shown >= 100) {
      done = true;
      setTimeout(() => door(el).then(finish), 120);
      return;
    }
    requestAnimationFrame(tick);
  };
  return finished;
}

/* 100%: the key turns, a flash, then through the keyhole like a doorway, into the station. The doorway
   is the loader's own black, cut by a keyhole-shaped hole (clip-path, even-odd) that grows past the
   screen's corners;
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
  const core = el.querySelector('.ld-lock');
  const box = core.getBoundingClientRect();
  const u = box.width / 230; // screen px per lock unit (its viewBox is 230 wide)
  const cx = box.left + 115 * u; // the keyhole's round top: centre (0, -20), radius 28 in lock units
  const cy = box.top + 95 * u;
  const R0 = 28 * u;
  const R1 = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) * 1.05; // its round top clears every corner
  const hole = (R) => {
    // turned a quarter, like the key left it (x, y) -> (-y, x)
    const pts = KEYHOLE.map(([x, y]) => `${(cx - y * R).toFixed(1)}px ${(cy + x * R).toFixed(1)}px`);
    return `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${pts.join(', ')}, ${pts[0]}, 0 0)`;
  };
  // the growth eases in (power 3), sampled into keyframes
  const frames = Array.from({ length: 13 }, (_, i) => {
    const t = i / 12;
    return { offset: t, clipPath: hole(R0 + (R1 - R0) * t * t * t) };
  });
  return new Promise((resolve) => {
    el.classList.add('turn'); // the key turns in the lock
    sfx('lockTurn');
    setTimeout(() => el.classList.add('flash'), 260); // the keyhole flashes white
    setTimeout(() => {
      el.classList.add('door'); // the keyhole is a hole now: the station through it
      sfx('doorway');
      opened();
      back.style.transformOrigin = `${cx}px ${cy}px`;
      back.animate([{ transform: 'scale(1.18)' }, { transform: 'none' }], { duration: 1500, easing: 'cubic-bezier(.2, .7, .3, 1)' });
      // gone when the doorway has grown past the screen; and by a timer as well, so no browser that
      // never reports the animation finished can leave an invisible layer over the page
      let gone = false;
      const done = () => { if (gone) return; gone = true; el.remove(); back.style.transformOrigin = ''; resolve(); };
      try { el.animate(frames, { duration: 1000, delay: 140, easing: 'linear', fill: 'forwards' }).finished.then(done, done); } catch { done(); }
      setTimeout(done, 1400);
    }, 430);
  });
}
