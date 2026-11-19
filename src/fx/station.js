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
/* ---- the glossy floor mirrors the tubes (Nov 19, John: "if the light is flickering and the reflection is
   there, make sure the reflection on the floor expresses that"). The floor's streak under the centre
   strip is the tubes' reflection: each tube lights the stretch of streak straight below it, mirrored
   through the horizon (y 540): y = 540 + (540 - tube y) x 1.15, measured on the art (the streak starts
   at y ~690 under the far tubes and runs off the bottom under the near ones). The small right tube (14)
   lights the patch at (1101, 860). When a tube goes off (or dims), its stretch of reflection is covered
   with the floor's own tone, soft-edged, in the same group as the tube, so the two can never disagree. */
const MIRROR = 1.15;
const REFLECT = { 14: [1101, 860, 21, 62] }; // the right patch: cx, cy, rx, ry (measured)
function reflection(p, i) {
  if (REFLECT[i]) { const [cx, cy, rx, ry] = REFLECT[i]; return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#slFloor)"/>`; }
  if (!Array.isArray(p[0])) return ''; // (the two near slanted tubes reflect off the bottom of the screen)
  const top = p[0][1];
  const bot = p[2][1];
  const y1 = 540 + (540 - bot) * MIRROR;
  const y2 = 540 + (540 - top) * MIRROR;
  if (y1 > 940) return ''; // (the nearest tubes reflect below the screen)
  const cy = (y1 + y2) / 2;
  const ry = (y2 - y1) / 2 + 16; // (the gloss blurs each one into its neighbours: they overlap)
  const rx = 10 + (cy - 540) * 0.06; // the streak narrows toward the tunnel
  return `<ellipse cx="868" cy="${cy.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="url(#slFloor)"/>`;
}
function lightsBody() { // normal: the dull diffuser of a tube that is off, and its reflection gone from the floor
  return PANELS.map((p, i) => {
    const s = shape(p, 0.6);
    const paint = Array.isArray(p[0]) ? 'fill="#5E636B"' : 'stroke="#5E636B"';
    return `<g class="sl" data-l="${i}"><g class="sl-off">${s} ${paint}/>${reflection(p, i)}</g></g>`;
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
   GAME, not static, moving like the billboard, from the right side to the left"; then: "not look like it
   was pasted on... as if it belongs to the scene, 3D, like in the anime... move it a little bit back so
   the Ways to Connect can fit... accurate time, 2:30 p.m. if it's 2:30 p.m., updating constantly").
   A box hung from the ceiling on two rods, built in the station's own perspective: its edges run to the
   vanishing point (870, 548), so from the platform you see its front, its underside and the side that
   faces the middle, like a real board overhead. Cel-shaded like the art: flat tones, bold ink lines, a
   cool rim where the ceiling tubes catch its edges, a thin amber spill from its own LEDs on its lip.
   The screen: the top row scrolls the line in amber LED, right to left, seamless (one composited move);
   the bottom row shows the visitor's own time, 12-hour (2:30 PM), checked every second, in green, and
   our line code JN in red. A fixed grid of dark gaps over the rows reads as LED dots while the text
   slides under it. Original board (no mascot on top); the line is a John-approved homage, like TAKE
   YOUR TIME. ---- */
const VP = [870, 548];
/* where it may hang (its front face, art px; height = SIGN_H x width), in order of preference: back down
   the platform just right of the light strip, a size smaller further back, then the same left of the
   strip (phones on their side crop the ceiling there). The first spot wholly on screen and clear of the
   title's name, the calendar, the contact card and the top bar wins; none fits, no board. */
const SIGN_SPOTS = [
  { x: 900, y: 214, w: 150 }, { x: 896, y: 262, w: 122 },
  { x: 686, y: 204, w: 150 }, { x: 716, y: 258, w: 122 },
];
const SIGN_H = 0.46;
const DEPTH = 0.9; // the back face, scaled toward the vanishing point (the box's thickness)
const toVP = ([x, y]) => [VP[0] + (x - VP[0]) * DEPTH, VP[1] + (y - VP[1]) * DEPTH];
function geom(s) {
  const h = s.w * SIGN_H;
  const f = [[s.x, s.y], [s.x + s.w, s.y], [s.x + s.w, s.y + h], [s.x, s.y + h]]; // TL TR BR BL
  const b = f.map(toVP);
  const right = s.x + s.w / 2 > VP[0]; // right of the middle: its inner (left) side shows, else its right side
  const side = right ? [f[0], b[0], b[3], f[3]] : [f[1], b[1], b[2], f[2]];
  const under = [f[3], f[2], b[2], b[3]];
  const rods = [0.2, 0.8].map((t) => [s.x + s.w * t, s.y]);
  const pts = [...f, ...b];
  const box = { l: Math.min(...pts.map((q) => q[0])), r: Math.max(...pts.map((q) => q[0])), t: s.y - 60, b: Math.max(...pts.map((q) => q[1])) };
  return { f, side, under, rods, box, right, h };
}
const P = (pts) => pts.map((q) => q.map((v) => v.toFixed(1)).join(',')).join(' ');
function housing(s) {
  const g = geom(s);
  const ink = 'stroke="#050506" stroke-width="1.6" stroke-linejoin="round"';
  const [tl, tr, br, bl] = g.f;
  const rimSide = g.right ? [tl, bl] : [tr, br]; // the edge toward the light strip catches the tubes' light
  return `
    ${g.rods.map(([x, y]) => `<path d="M${x} ${y} V${y - 60}" stroke="#050506" stroke-width="3.4"/><path d="M${x} ${y} V${y - 60}" stroke="#4A4D55" stroke-width="1.4"/><rect x="${x - 5}" y="${y - 3}" width="10" height="4" fill="#1A1B1F" ${ink}/>`).join('')}
    <polygon points="${P(g.side)}" fill="#2A2C32" ${ink}/>
    <polygon points="${P(g.under)}" fill="#0C0C0E" ${ink}/>
    <path d="M${P([g.under[0], g.under[1]]).replace(' ', ' L')}" stroke="#FFB52E" stroke-opacity=".45" stroke-width="2.2" transform="translate(0 2.2)"/>
    <polygon points="${P(g.f)}" fill="#1B1C20" ${ink}/>
    <path d="M${P([tl, tr]).replace(' ', ' L')}" stroke="#CFE0F5" stroke-opacity=".75" stroke-width="1.1" transform="translate(0 1.2)"/>
    <path d="M${P(rimSide).replace(' ', ' L')}" stroke="#CFE0F5" stroke-opacity=".55" stroke-width="1.1" transform="translate(${g.right ? 1.2 : -1.2} 0)"/>
    <rect x="${tl[0] + s.w * 0.05 - 1}" y="${tl[1] + g.h * 0.1 - 1}" width="${s.w * 0.9 + 2}" height="${g.h * 0.8 + 2}" fill="#050506" stroke="#2E3036" stroke-width="1"/>`;
}
const SIGN_LINE = 'LET US START THE GAME';
const signHTML = () => `<div class="ss" hidden>
  <svg class="ss-3d" viewBox="0 0 1600 914" preserveAspectRatio="none"></svg>
  <div class="ss-screen">
    <div class="ss-row ss-top"><div class="ss-run"><span>${SIGN_LINE}</span><span>${SIGN_LINE}</span></div></div>
    <div class="ss-row ss-bot"><b class="ss-time"><span class="ss-h">12</span><span class="ss-colon">:</span><span class="ss-m">00</span><small class="ss-ap">PM</small></b><b class="ss-code">JN</b></div>
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
    const { box } = geom(s);
    const r = { l: a.left + box.l * k, r: a.left + box.r * k, t: a.top + (s.y - 4) * k, b: a.top + box.b * k };
    if (r.l < 6 || r.t < 6 || r.r > W - 6 || r.b > H * 0.6) return false;
    return !clearOf.some((o) => r.l < o.right + pad && r.r > o.left - pad && r.t < o.bottom + pad && r.b > o.top - pad);
  }) || null;
}
/* the bottom row's clock: the visitor's own time, 12-hour, checked every second (it only writes when the
   minute turns) and at once when the page comes back into view */
function signClock(wrap) {
  const h = wrap.querySelector('.ss-h');
  const m = wrap.querySelector('.ss-m');
  const ap = wrap.querySelector('.ss-ap');
  let last = '';
  const tick = () => {
    const d = new Date();
    const hr = d.getHours();
    const t = `${hr % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${hr < 12 ? 'AM' : 'PM'}`;
    if (t === last) return;
    last = t;
    h.textContent = String(hr % 12 || 12);
    m.textContent = String(d.getMinutes()).padStart(2, '0');
    ap.textContent = hr < 12 ? 'AM' : 'PM';
  };
  tick();
  setInterval(() => { if (!document.hidden) tick(); }, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
}

export function mountStation(box, before) {
  const wrap = document.createElement('div');
  wrap.className = 'st-wrap';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = svg('st-dim', '<radialGradient id="slDim"><stop offset=".25" stop-color="#3A3C40" stop-opacity=".95"/><stop offset=".7" stop-color="#3A3C40" stop-opacity=".45"/><stop offset="1" stop-color="#3A3C40" stop-opacity="0"/></radialGradient>', lightsDim())
    + svg('st-body', '<radialGradient id="slFloor"><stop offset=".5" stop-color="#313134" stop-opacity=".97"/><stop offset=".8" stop-color="#313134" stop-opacity=".6"/><stop offset="1" stop-color="#313134" stop-opacity="0"/></radialGradient>', lightsBody() + `<g class="gf-at" transform="${faceTransform(FACES[0])}">${graffiti()}</g>`)
    + svg('st-glow', `<filter id="slBloom" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5" result="a"/><feGaussianBlur in="SourceGraphic" stdDeviation="14" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="a"/></feMerge></filter>
      <radialGradient id="slSpill"><stop offset="0" stop-color="#9FB8D8" stop-opacity=".22"/><stop offset="1" stop-color="#9FB8D8" stop-opacity="0"/></radialGradient>`, lightsGlow());
  wrap.insertAdjacentHTML('beforeend', signHTML());
  signClock(wrap);
  const sign = wrap.querySelector('.ss');
  const shell = sign.querySelector('.ss-3d');
  const screen = sign.querySelector('.ss-screen');
  let spot;
  let placedOnce = false;
  const hang = () => {
    if (!placedOnce || !ready) return;
    const s = document.body.dataset.mode === 'title' || !spot ? pickSpot(wrap) : spot; // (it never moves mid-shot)
    if (s === spot) return;
    spot = s;
    sign.hidden = !s;
    if (!s) return;
    shell.innerHTML = housing(s);
    const h = s.w * SIGN_H;
    Object.assign(screen.style, { left: `${((s.x + s.w * 0.05) / 1600) * 100}%`, top: `${((s.y + h * 0.1) / 914) * 100}%`, width: `${((s.w * 0.9) / 1600) * 100}%`, height: `${((h * 0.8) / 914) * 100}%`, fontSize: `calc(var(--k) * ${(s.w * 0.072).toFixed(2)}px)` });
  };
  const remeasure = () => { if (!ready || document.body.dataset.mode !== 'title') return; measureClear(); spot = undefined; hang(); }; // (decided on the title only)
  // it decides once the title has settled (its fonts in, the fit guard done), then fades in; after that
  // it only moves when the screen changes size or the fit guard rearranges the title (body classes)
  let ready = false;
  sign.hidden = true;
  // (waits for the brand fonts itself: this file is also loaded outside a browser by the tests' pure math)
  const fontsIn = Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 3000))]);
  fontsIn.then(() => setTimeout(() => { ready = true; remeasure(); sign.classList.add('in'); }, 600));
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
