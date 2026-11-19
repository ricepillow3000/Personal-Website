/* The station's own life, laid over the platform art in its pixel space (1600 x 914, placed exactly
   like the <img>): the ceiling's fluorescent lights and the graffiti on the big pillar.

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
   that says TAKE YOUR NETWORK, with a cat at the end"). An original piece sprayed on a pillar's front
   face on the right (a flat face square to the camera, so it needs no perspective): chunky slanted red
   letters with a black outline, a white misprint, overspray and drips, and a sitting cat with a
   curled tail at the end. Its own design (no game's logo, mascot or lettering). */

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
function graffiti() {
  const word = (txt, x, y, size, rot) => `<g transform="translate(${x} ${y}) rotate(${rot}) skewX(-10)">
      <text class="gf-shadow" x="2" y="2" font-size="${size}">${txt}</text>
      <text class="gf-white" x="-1.2" y="-1.2" font-size="${size}">${txt}</text>
      <text class="gf-red" font-size="${size}">${txt}</text></g>`;
  const drips = [[12, 52, 9], [27, 53, 5], [45, 93, 11], [60, 94, 6], [16, 124, 7], [38, 125, 12], [66, 124, 5]]
    .map(([x, y, l]) => `<path d="M${x} ${y}v${l}" stroke="#B3121A" stroke-width="1.4" stroke-linecap="round"/><circle cx="${x}" cy="${y + l + 0.6}" r="1.1" fill="#B3121A"/>`).join('');
  // an original cat: sitting, seen from the side, tail curled up like a hook, one eye a little star
  const cat = `<g transform="translate(14 140) scale(.56)">
      <path class="gf-cat-edge" d="M14 118c-6-18-4-40 6-56c-6-8-8-20-4-32l6-22l10 18c6-2 14-2 20 0l12-18l2 24c6 12 4 26-4 34c10 16 12 34 6 52c18 0 30-10 32-26c2-16-10-26-20-22c-8 3-8 12-2 14" />
      <path class="gf-cat" d="M14 118c-6-18-4-40 6-56c-6-8-8-20-4-32l6-22l10 18c6-2 14-2 20 0l12-18l2 24c6 12 4 26-4 34c10 16 12 34 6 52Z" />
      <path class="gf-tail" d="M72 118c18 0 30-10 32-26c2-16-10-26-20-22c-8 3-8 12-2 14" />
      <path d="M40 46l3 6l6 1l-5 4l1 6l-5-3l-5 3l1-6l-5-4l6-1Z" fill="#F2F0E8"/>
      <path d="M58 52l9-2" stroke="#F2F0E8" stroke-width="3" stroke-linecap="round"/>
    </g>`;
  return `<g class="gf" filter="url(#gfSpray)">
    ${word('TAKE', 4, 50, 38, -6)}
    ${word('YOUR', 8, 91, 36, -4)}
    ${word('NETWORK', 0, 123, 21, -3)}
    ${drips}
    ${cat}
  </g>`;
}
const faceTransform = (f) => { const k = Math.min(f.w / 76, f.h / 230); return `translate(${f.x + (f.w - 76 * k) / 2} ${f.y}) scale(${k.toFixed(3)})`; };

const svg = (cls, defs, body) => `<svg class="st ${cls}" viewBox="0 0 1600 914" preserveAspectRatio="none" aria-hidden="true"><defs>${defs}</defs>${body}</svg>`;

export function mountStation(box, before) {
  const wrap = document.createElement('div');
  wrap.className = 'st-wrap';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = svg('st-dim', '<radialGradient id="slDim"><stop offset=".25" stop-color="#3A3C40" stop-opacity=".95"/><stop offset=".7" stop-color="#3A3C40" stop-opacity=".45"/><stop offset="1" stop-color="#3A3C40" stop-opacity="0"/></radialGradient>', lightsDim())
    + svg('st-body', `<filter id="gfSpray" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" result="n"/>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" result="rough"/>
        <feGaussianBlur in="rough" stdDeviation="1.6" result="over"/>
        <feComponentTransfer in="over" result="overA"><feFuncA type="linear" slope=".45"/></feComponentTransfer>
        <feTurbulence type="fractalNoise" baseFrequency="2.2" numOctaves="1" seed="3" result="g"/>
        <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.55" result="grain"/>
        <feComposite in="rough" in2="grain" operator="in" result="worn"/>
        <feMerge><feMergeNode in="overA"/><feMergeNode in="worn"/></feMerge>
      </filter>
      <radialGradient id="gfHaze"><stop offset="0" stop-color="#E5191C" stop-opacity=".07"/><stop offset="1" stop-color="#E5191C" stop-opacity="0"/></radialGradient>`, lightsBody() + `<g class="gf-at" transform="${faceTransform(FACES[0])}">${graffiti()}</g>`)
    + svg('st-glow', `<filter id="slBloom" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5" result="a"/><feGaussianBlur in="SourceGraphic" stdDeviation="14" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="a"/></feMerge></filter>
      <radialGradient id="slSpill"><stop offset="0" stop-color="#9FB8D8" stop-opacity=".22"/><stop offset="1" stop-color="#9FB8D8" stop-opacity="0"/></radialGradient>`, lightsGlow());
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
