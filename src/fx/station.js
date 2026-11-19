import { fontsReady } from '../core/util.js';

/* The station's own life, laid over the platform art in its pixel space (1600 x 914, placed exactly
   like the <img>): the ceiling's fluorescent lights, the graffiti on the big pillar and the departure board.

   LIGHTS (Nov 19, John: "make them look more realistic, like actual lights and how they behave, and
   have some of them flicker, but not all at the same time... randomly, like the subway has been aging").
   Each painted panel gets a cool bloom ADDED around it (screen blend), the way a fluorescent tube
   glows through its diffuser and lights the ceiling. Old tubes misbehave on their own clock: a
   quick blip off, a stutter (the starter retrying), now and then a long drop-out and a re-strike.
   Two tired tubes do it more often and sometimes hang dim. Only one healthy tube acts up at a time,
   so it never reads as the whole station blinking. Off, a tube is a dull grey diffuser and the glow
   painted round it is multiplied away (fading to nothing: the art never gets a grey ring). Paused
   when the platform isn't on screen; steady with reduced motion.

   GRAFFITI (Nov 19, John: "on the right side, the wall that's pretty empty, a Persona-style graffiti
   that says TAKE YOUR NETWORK, with a cat at the end"; now TAKE YOUR TIME, the site's motto). An original piece sprayed on a pillar's front
   face on the right (a flat face square to the camera, so it needs no perspective): chunky slanted red
   letters sprayed by hand (Nov 19, John: "not a font pasted onto the pillar... like someone shook a
   spray can and wrote it"), see tools/draw-graffiti.mjs. Its own design (no game's logo, mascot or lettering). */

const NS = 'http://www.w3.org/2000/svg';
// the panels, measured on the art: [x, y] corners (centre strip), or a slanted bar [x1, y1, x2, y2, width]
const PANELS = [
  [[824, 0], [874, 0], [873, 94], [832, 94]],
  [[836, 127], [873, 126], [873, 189], [841, 190]],
  [[844, 211], [873, 211], [873, 252], [847, 252]],
  [[849, 267], [873, 267], [873, 295], [851, 295]],
  [[852, 307], [873, 307], [873, 327], [854, 327]],
  [[855, 336], [872, 336], [872, 352], [856, 351]],
  [[857, 359], [872, 359], [872, 371], [857, 370]],
  [[858, 377], [872, 377], [872, 386], [859, 386]],
  [[860, 391], [871, 391], [872, 399], [860, 400]],
  [[860, 404], [871, 404], [871, 410], [861, 410]],
  [[862, 415], [871, 415], [872, 420], [862, 420]],
  [[862, 424], [871, 424], [871, 428], [862, 428]],
  [1268, 178, 1331, 124, 13],
  [1207, 240, 1268, 205, 11],
  [1092, 352, 1109, 333, 9],
];
const TIRED = new Set([3, 13]); // two old tubes that act up more often
const shape = (p, grow = 0) => {
  if (Array.isArray(p[0])) {
    const cx = p.reduce((a, q) => a + q[0], 0) / 4;
    const cy = p.reduce((a, q) => a + q[1], 0) / 4;
    const pts = p.map(([x, y]) => [x + Math.sign(x - cx) * grow, y + Math.sign(y - cy) * grow]);
    return `<path d="M${pts.map((q) => q.join(' ')).join('L')}Z"`;
  }
  const [x1, y1, x2, y2, w] = p;
  return `<path d="M${x1} ${y1}L${x2} ${y2}" stroke-width="${w + grow * 2}" stroke-linecap="round" fill="none"`;
};
const centre = (p) => (Array.isArray(p[0]) ? [p.reduce((a, q) => a + q[0], 0) / 4, p.reduce((a, q) => a + q[1], 0) / 4] : [(p[0] + p[2]) / 2, (p[1] + p[3]) / 2]);
const size = (p) => (Array.isArray(p[0]) ? Math.max(p[1][0] - p[0][0], p[2][1] - p[1][1]) : Math.hypot(p[2] - p[0], p[3] - p[1]));

function lightsDim() { // multiplied: puts out the glow painted round a tube that is off
  return PANELS.map((p, i) => {
    const [x, y] = centre(p);
    const r = size(p) * 0.9 + 6;
    return `<g class="sl" data-l="${i}"><g class="sl-off"><ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.8}" fill="url(#slDim)"/></g></g>`;
  }).join('');
}
function lightsBody() { // normal: the dull diffuser of a tube that is off
  return PANELS.map((p, i) => {
    const s = shape(p, 0.6);
    const paint = Array.isArray(p[0]) ? 'fill="#5E636B"' : 'stroke="#5E636B"';
    return `<g class="sl" data-l="${i}"><g class="sl-off">${s} ${paint}/></g></g>`;
  }).join('');
}
function lightsGlow() { // added: the bloom through the diffuser, and its light on the ceiling around it
  return PANELS.map((p, i) => {
    const [x, y] = centre(p);
    const sz = size(p);
    const paint = Array.isArray(p[0]) ? 'fill="#DCEBFF"' : 'stroke="#DCEBFF"';
    return `<g class="sl" data-l="${i}"><g class="sl-on">
      <ellipse cx="${x}" cy="${y}" rx="${sz * 1.6 + 10}" ry="${sz * 1.1 + 8}" fill="url(#slSpill)"/>
      <g filter="url(#slBloom)" opacity=".8">${shape(p, 1)} ${paint}/></g></g></g>`;
  }).join('');
}

/* ---- the graffiti: designed in a 76 x 230 box (pillar 2's front face, measured on the art: fully
   on screen on laptops and desktops); screens that only see the middle of the art (phones) get it on
   a pillar further in instead (place() picks, by what the screen actually shows) ---- */
const FACES = [{ x: 1128, y: 262, w: 76, h: 230 }, { x: 1046, y: 382, w: 46, h: 124 }, { x: 997, y: 398, w: 32, h: 112 }];
/* the piece itself is painted droplet by droplet by tools/draw-graffiti.mjs (a spray can, not a font:
   hand-drawn strokes, wet cores, overspray mist, spatter, drips, a black shadow pass, a white cat),
   at 4x this 76 x 230 box so it stays crisp; here it is only hung on the pillar */
const graffiti = () => '<image class="gf" href="assets/film/graffiti.webp" width="76" height="230" preserveAspectRatio="none" decoding="async"/>';
const faceTransform = (f) => { const k = Math.min(f.w / 76, f.h / 230); return `translate(${f.x + (f.w - 76 * k) / 2} ${f.y}) scale(${k.toFixed(3)})`; };

const svg = (cls, defs, body) => `<svg class="st ${cls}" viewBox="0 0 1600 914" preserveAspectRatio="none" aria-hidden="true"><defs>${defs}</defs>${body}</svg>`;

/* ---- the departure board (Nov 19, John: "a train sign where it describes a stop... LET US START THE
   GAME, not static, moving like the billboard, from the right side to the left"). A lit LED board hung
   from the ceiling beside the light strip (SIGN_SPOTS, measured on the art: clear of the strip, the
   pillars and the train's path; it picks a spot clear of the title's own text and panels): the top row scrolls the line in
   amber LED, the bottom row shows the visitor's own time in green (the colon blinks) and our line code
   JN in red. A fixed grid of dark gaps over the rows makes them read as LED dots while the text slides
   under it (one composited move, no per-frame script). Original board (no game mascot or logo on it);
   the line itself is a John-approved homage, like TAKE YOUR TIME. ---- */
/* where it may hang (art px), in order of preference: just right of the light strip, or (where the screen
   crops the ceiling or the contact card sits there: phones on their side, small laptops) just left of it,
   each a size smaller if need be. The first spot that is wholly on screen and clear of the title, the
   calendar, the contact card and the top bar wins; none fits, no board. */
const SIGN_SPOTS = [
  { x: 872, y: 178, w: 178 }, { x: 872, y: 230, w: 150 },
  { x: 600, y: 160, w: 172 }, { x: 610, y: 225, w: 150 },
];
const SIGN_H = 0.54; // its height, as a share of its width
const SIGN_LINE = 'LET US START THE GAME';
const signHTML = () => `<div class="ss-sign">
  <i class="ss-rod"></i><i class="ss-rod"></i>
  <div class="ss-box">
    <div class="ss-row ss-top"><div class="ss-run"><span>${SIGN_LINE}</span><span>${SIGN_LINE}</span></div></div>
    <div class="ss-row ss-bot"><b class="ss-time"><span class="ss-h">00</span><span class="ss-colon">:</span><span class="ss-m">00</span></b><b class="ss-code">JN</b></div>
  </div>
</div>`;
/* what the board must keep clear of (their boxes on screen, measured on resize and as the title settles) */
const SIGN_KEEP_CLEAR = '#titleName .rl, #hudDate .hud-cal, #contactCard, .hud-tr'; // (the name's letters, not its full-width line)
let clearOf = [];
function measureClear() {
  if (document.body.dataset.mode !== 'title') return;
  clearOf = [...document.querySelectorAll(SIGN_KEEP_CLEAR)].filter((el) => getComputedStyle(el).visibility !== 'hidden').map((el) => el.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0);
}
/* art px -> screen px from the layer's real box on screen (it sits inside the camera's slow push-in) */
function pickSpot(wrap) {
  const pad = 22; // (room for the rest of the push-in)
  const W = window.innerWidth;
  const H = window.innerHeight;
  const a = wrap.getBoundingClientRect();
  const k = a.width / 1600;
  return SIGN_SPOTS.find((s) => {
    const r = { l: a.left + s.x * k, t: a.top + s.y * k, w: s.w * k };
    r.r = r.l + r.w;
    r.b = r.t + r.w * SIGN_H;
    if (r.l < 6 || r.t < 6 || r.r > W - 6 || r.b > H * 0.6) return false;
    return !clearOf.some((o) => r.l < o.right + pad && r.r > o.left - pad && r.t < o.bottom + pad && r.b > o.top - pad);
  }) || null;
}
/* the bottom row's clock: the visitor's own time, checked every 10 s (it only writes when the minute turns) */
function signClock(wrap) {
  const h = wrap.querySelector('.ss-h');
  const m = wrap.querySelector('.ss-m');
  let last = '';
  const tick = () => {
    const d = new Date();
    const t = `${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
    if (t === last) return;
    last = t;
    h.textContent = t.slice(0, 2);
    m.textContent = t.slice(2);
  };
  tick();
  setInterval(() => { if (document.body.dataset.mode === 'title' && !document.hidden) tick(); }, 10000);
}

export function mountStation(box, before) {
  const wrap = document.createElement('div');
  wrap.className = 'st-wrap';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = svg('st-dim', '<radialGradient id="slDim"><stop offset=".25" stop-color="#3A3C40" stop-opacity=".95"/><stop offset=".7" stop-color="#3A3C40" stop-opacity=".45"/><stop offset="1" stop-color="#3A3C40" stop-opacity="0"/></radialGradient>', lightsDim())
    + svg('st-body', '', lightsBody() + `<g class="gf-at" transform="${faceTransform(FACES[0])}">${graffiti()}</g>`)
    + svg('st-glow', `<filter id="slBloom" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5" result="a"/><feGaussianBlur in="SourceGraphic" stdDeviation="14" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="a"/></feMerge></filter>
      <radialGradient id="slSpill"><stop offset="0" stop-color="#9FB8D8" stop-opacity=".22"/><stop offset="1" stop-color="#9FB8D8" stop-opacity="0"/></radialGradient>`, lightsGlow());
  wrap.insertAdjacentHTML('beforeend', signHTML());
  signClock(wrap);
  const sign = wrap.querySelector('.ss-sign');
  let spot;
  let placedOnce = false;
  const hang = () => {
    if (!placedOnce || !ready) return;
    const s = document.body.dataset.mode === 'title' || !spot ? pickSpot(wrap) : spot; // (it never moves mid-shot)
    if (s === spot) return;
    spot = s;
    sign.hidden = !s;
    if (s) Object.assign(sign.style, { left: `${(s.x / 1600) * 100}%`, top: `${(s.y / 914) * 100}%`, width: `${(s.w / 1600) * 100}%`, fontSize: `calc(var(--k) * ${(s.w * 0.084).toFixed(2)}px)` });
  };
  const remeasure = () => { if (!ready || document.body.dataset.mode !== 'title') return; measureClear(); spot = undefined; hang(); }; // (decided on the title only)
  // it decides once the title has settled (its fonts in, the fit guard done), then fades in; after that
  // it only moves when the screen changes size or the fit guard rearranges the title (body classes)
  let ready = false;
  sign.hidden = true;
  fontsReady(3000).then(() => setTimeout(() => { ready = true; remeasure(); sign.classList.add('in'); }, 600));
  let rt = 0;
  const later = () => { clearTimeout(rt); rt = setTimeout(remeasure, 200); };
  window.addEventListener('resize', later, { passive: true });
  new MutationObserver(later).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  box.insertBefore(wrap, before);
  const gfAt = wrap.querySelector('.gf-at');
  let placed = '';
  const groups = PANELS.map((_, i) => [...wrap.querySelectorAll(`.sl[data-l="${i}"]`)]);
  const set = (i, st) => groups[i].forEach((g) => { g.dataset.st = st; }); // on | off | dim
  PANELS.forEach((_, i) => set(i, 'on'));
  flicker(set);
  return {
    /** place the layer where the <img> shows the art (object-fit cover math, CSS px) */
    place(k, ox, oy) {
      const key = `${k.toFixed(4)} ${ox.toFixed(1)} ${oy.toFixed(1)}`;
      if (key === placed) return; // (called every frame of the train shot: only moves when the camera does)
      placed = key;
      Object.assign(wrap.style, { width: `${1600 * k}px`, height: `${914 * k}px`, left: `${ox}px`, top: `${oy}px` });
      wrap.style.setProperty('--k', k.toFixed(4)); // (CSS px per art px: the departure board is sized in art px)
      placedOnce = true;
      if (spot === undefined) hang(); // (the first placement; later ones keep the spot it picked)
      // the graffiti goes on pillar 2 if the screen shows it whole, else on pillar 3 (narrow screens)
      const right = (box.offsetWidth * 0.94 - ox) / k; // the art's x at the visible right edge (the box overhangs 6%)
      // (a margin for the camera's tilt and slow push, which crop a little more)
      const face = FACES.find((f) => f.x + f.w + 40 < right) || FACES[FACES.length - 1];
      if (gfAt.dataset.face !== String(FACES.indexOf(face))) {
        gfAt.dataset.face = String(FACES.indexOf(face));
        gfAt.setAttribute('transform', faceTransform(face));
      }
    },
  };
}

/* the aging tubes' clock: each tube waits its own random time, then misbehaves in one of a few ways */
function flicker(set) {
  const reduce = () => document.body.classList.contains('reduce-motion') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const live = () => document.body.dataset.mode === 'title' && !document.hidden && !reduce();
  const rnd = (a, b) => a + Math.random() * (b - a);
  let busy = false; // a healthy tube is acting up right now
  const run = (i, steps, done) => { // steps: [state, ms] in order
    let k = 0;
    const next = () => {
      if (k >= steps.length) { done(); return; }
      const [st, ms] = steps[k++];
      set(i, st);
      setTimeout(next, ms);
    };
    next();
  };
  const episode = (i) => {
    const tired = TIRED.has(i);
    const r = Math.random();
    if (r < 0.5) return [['off', rnd(40, 110)], ['on', 0]]; // a blip
    if (r < 0.85 || tired) { // a stutter: the starter trying again
      const s = [];
      const n = 3 + Math.floor(Math.random() * 5);
      for (let j = 0; j < n; j++) s.push([j % 2 ? 'on' : (tired && Math.random() < 0.4 ? 'dim' : 'off'), rnd(30, 120)]);
      if (tired && Math.random() < 0.35) s.push(['dim', rnd(700, 2200)]); // and hangs dim for a while
      return [...s, ['on', 0]];
    }
    return [['off', rnd(800, 2000)], ['on', 60], ['off', 80], ['on', 40], ['off', 50], ['on', 0]]; // drops out, re-strikes
  };
  const schedule = (i) => {
    const tired = TIRED.has(i);
    setTimeout(() => {
      if (!live() || (!tired && busy)) { schedule(i); return; } // not on screen, or another tube is mid-flicker
      if (!tired) busy = true;
      run(i, episode(i), () => { if (!tired) busy = false; schedule(i); });
    }, tired ? rnd(1500, 6500) : rnd(6000, 30000));
  };
  PANELS.forEach((_, i) => setTimeout(() => schedule(i), rnd(0, 4000)));
}
