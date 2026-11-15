import { seeded } from '../core/util.js';

/* =========================================================================
   Atlanta skyline — 3-layer parallax background (pure inline SVG + CSS).
   Original vector artwork. Palette is strictly limited to:
     #050505 pitch black · #D80000 / #E60012 crimson · #FFFFFF white · #1A1A1A charcoal
   No gradients, blurs or drop shadows — only flat shapes, strokes and dot patterns.

   Composition: symmetrical around x = 800. Bank of America Plaza stands dead
   centre in front of the sun; matched tower pairs flank it. Every building
   stands on ONE shared ground line (GROUND), and towers lean slightly toward
   the centre like a low-angle (worm's-eye) camera — dramatic but balanced.
   Geometry lives in a 1600×900 box; `xMidYMax slice` covers 100vw × 100vh.
   ========================================================================= */

const C = { black: '#050505', red: '#D80000', red2: '#E60012', white: '#FFFFFF', char: '#1A1A1A' };
const VB = '0 0 1600 900';
const CX = 800; // centre line
const GROUND = 868; // shared street level for the whole city
const BASE = 1150; // shapes run below the frame so parallax never reveals an edge

/* ---------- helpers ---------- */
const pts = (p) => p.map((q) => q.join(',')).join(' ');
const poly = (p, fill, extra = '') => `<polygon points="${pts(p)}" fill="${fill}" ${extra}/>`;
const line = (p, color, w, extra = '') =>
  `<polyline points="${pts(p)}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linejoin="miter" stroke-linecap="square" ${extra}/>`;
const mirror = (p) => p.map(([x, y]) => [2 * CX - x, y]);

/** Worm's-eye lean: tops tilt toward the centre line, bases stay on the ground. */
const lean = (cx, body, max = 6) => {
  const a = ((cx - CX) / CX) * max;
  return `<g transform="translate(${cx} ${GROUND}) skewX(${a.toFixed(2)}) translate(${-cx} ${-GROUND})">${body}</g>`;
};

/** Jagged white rim-light running down an edge (zig-zags ±amp every `step`). */
function rim(x, y1, y2, { amp = 2.5, step = 16, w = 3, side = 1 } = {}) {
  const p = [];
  let i = 0;
  for (let y = y1; y < y2; y += step, i++) p.push([x + (i % 2 ? amp : -amp) * side, y]);
  p.push([x, y2]);
  return line(p, C.white, w, 'class="rim"');
}

/** Sparse vertical window slits (white or crimson). */
function slits(rnd, x, top, w, { density = 0.18, bottom = GROUND, red = 0.25 } = {}) {
  let out = '';
  for (let cx = x + 6; cx < x + w - 6; cx += 9) {
    for (let cy = top + 14; cy < bottom - 10; cy += 26) {
      if (rnd() > density) continue;
      const h = 8 + Math.floor(rnd() * 26);
      out += `<rect x="${cx}" y="${cy}" width="${rnd() < 0.5 ? 2 : 3}" height="${h}" fill="${rnd() < red ? C.red2 : C.white}"/>`;
    }
  }
  return out;
}

const dotPattern = (id, size, r, color) =>
  `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="${color}"/></pattern>`;

/* =========================================================================
   LAYER 1 — FAR: crimson sky, mirrored shards, centred sun, twin halftone wheels
   ========================================================================= */
function farLayer() {
  const wedge = [[-10, -10], [470, -10], [170, 320], [-10, 430]];
  const slash = [[352, -10], [404, -10], [640, 600], [618, 612]];
  const chip = [[240, 128], [336, 96], [286, 196]];
  const wheel = (x, cls) =>
    `<g class="ht-wheel ${cls}" style="--spin:80s"><circle cx="${x}" cy="560" r="150" fill="url(#ht-m)"/>
      <circle cx="${x}" cy="560" r="150" fill="none" stroke="${C.black}" stroke-width="6" stroke-dasharray="22 14"/></g>`;
  return `<svg viewBox="${VB}" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <defs>
    ${dotPattern('ht-s', 10, 1.4, C.black)}${dotPattern('ht-m', 10, 2.6, C.black)}${dotPattern('ht-l', 10, 3.8, C.black)}
    <clipPath id="sunClip"><circle cx="${CX}" cy="430" r="190"/></clipPath>
  </defs>
  <rect x="-100" y="-100" width="1800" height="1100" fill="${C.red}"/>
  ${poly([[560, -10], [1040, -10], [CX, 300]], C.red2)}
  ${poly(wedge, C.black)}${poly(mirror(wedge), C.black)}
  ${poly(slash, C.white)}${poly(mirror(slash), C.white)}
  ${poly(chip, C.white)}${poly(mirror(chip), C.white)}
  <!-- centred sun: white disc cut by crimson bars, framed by a black ring -->
  <circle cx="${CX}" cy="430" r="206" fill="none" stroke="${C.black}" stroke-width="10"/>
  <g clip-path="url(#sunClip)">
    <rect x="600" y="230" width="400" height="400" fill="${C.white}"/>
    ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="600" y="${456 + i * 26}" width="400" height="${5 + i * 3}" fill="${C.red}"/>`).join('')}
  </g>
  ${wheel(210, '')}${wheel(1390, 'rev')}
  <!-- halftone horizon bands: dots grow toward the ground (flat steps, not a gradient) -->
  <rect x="-100" y="540" width="1800" height="70" fill="url(#ht-s)"/>
  <rect x="-100" y="610" width="1800" height="70" fill="url(#ht-m)"/>
  <rect x="-100" y="680" width="1800" height="400" fill="url(#ht-l)"/>
  <g class="streaks">
    ${[[120, 360, 4, 3.4, 0], [230, 240, 3, 4.2, 1.6], [70, 300, 2, 5, 2.9]]
      .map(([y, len, h, dur, delay]) => `<polygon class="streak" style="--d:${dur}s;--dl:-${delay}s" points="0,${y} ${len},${y - h * 2} ${len},${y + h} 0,${y + h}" fill="${C.white}"/>`)
      .join('')}
  </g>
</svg>`;
}

/* =========================================================================
   LAYER 2 — MIDGROUND: charcoal Downtown/Midtown, landmarks in mirrored pairs
   ========================================================================= */
function fillersSymmetric() {
  const rnd = seeded(404);
  const left = [];
  for (let x = -280; x < CX - 40; ) {
    const w = 48 + Math.floor(rnd() * 64);
    // shorter toward the edges, taller toward the centre: a gentle symmetric "mountain"
    const near = 1 - Math.abs(x + w / 2 - CX) / 1080;
    const top = Math.round(760 - near * 170 - rnd() * 80);
    left.push({ x, w, top, slant: rnd() < 0.3 ? 12 + rnd() * 20 : 0 });
    x += w + 4 + Math.floor(rnd() * 6);
  }
  const all = [...left, ...left.map((b) => ({ ...b, x: 2 * CX - b.x - b.w, slant: -b.slant }))];
  const srnd = seeded(77);
  return all
    .map((b) => {
      const topL = b.top + Math.max(0, b.slant);
      const topR = b.top + Math.max(0, -b.slant);
      const body =
        poly([[b.x, BASE], [b.x, topL], [b.x + b.w, topR], [b.x + b.w, BASE]], C.char) +
        slits(srnd, b.x, b.top, b.w, { density: 0.13 }) +
        (b.x + b.w / 2 < CX ? rim(b.x + 1, topL + 6, topL + 130, { w: 2 }) : rim(b.x + b.w - 1, topR + 6, topR + 130, { w: 2, side: -1 }));
      return lean(b.x + b.w / 2, body, 5);
    })
    .join('');
}

function midLayer() {
  const rnd = seeded(2029);

  /* CENTRE — Bank of America Plaza: open-lattice obelisk crown, spire, beacon */
  const bx = CX - 36;
  const lat = [];
  for (let i = 1; i <= 5; i++) {
    const y = 300 - i * 22;
    const half = 36 * (1 - (i * 22) / 125);
    lat.push(`M${CX - half} ${y} L${CX + half} ${y}`);
  }
  const boa =
    poly([[bx, BASE], [bx, 322], [bx + 12, 300], [bx + 60, 300], [bx + 72, 322], [bx + 72, BASE]], C.char) +
    slits(rnd, bx, 320, 72, { density: 0.32, red: 0.35 }) +
    `<g fill="none" stroke="${C.char}" stroke-linejoin="miter">
      <path d="M${bx} 300 L${CX} 175 L${bx + 72} 300 Z" stroke-width="7"/>
      <path d="${lat.join(' ')} M${bx} 300 L${CX} 230 L${bx + 72} 300 M${CX - 20} 300 L${CX} 175 L${CX + 20} 300" stroke-width="3.5"/>
      <path d="M${bx + 12} 286 L${CX} 200 M${bx + 60} 286 L${CX} 200" stroke-width="2.5"/>
    </g>
    <rect x="${CX - 3}" y="96" width="6" height="82" fill="${C.char}"/>
    <rect x="${CX - 6}" y="176" width="12" height="6" fill="${C.char}"/>` +
    line([[bx, 322], [bx + 12, 300], [CX, 175]], C.white, 3, 'class="rim"') +
    line([[bx + 72, 322], [bx + 60, 300], [CX, 175]], C.white, 3, 'class="rim"') +
    rim(bx + 1, 326, 780, { w: 3.5 }) + rim(bx + 71, 326, 780, { w: 3.5, side: -1 }) +
    `<g class="beacon"><rect x="${CX - 6}" y="84" width="12" height="12" fill="${C.red2}"/><rect class="beacon-w" x="${CX - 6}" y="84" width="12" height="12" fill="${C.white}"/></g>`;

  /* INNER LEFT — Westin Peachtree Plaza: glass cylinder + restaurant ring */
  const wx = 660;
  let glass = '';
  [3, 9, 17, 27, 38, 47, 54, 59].forEach((o, i) => {
    glass += `<rect x="${wx + o}" y="318" width="${i % 3 === 0 ? 2 : 1.5}" height="${GROUND - 318}" fill="${i % 4 === 1 ? C.red2 : C.white}"/>`;
  });
  const westin =
    `<rect x="${wx}" y="300" width="62" height="${BASE - 300}" fill="${C.char}"/>
     <rect x="${wx - 5}" y="284" width="72" height="28" fill="${C.char}"/>
     <rect x="${wx + 6}" y="266" width="50" height="20" fill="${C.char}"/>
     <rect x="${wx + 26}" y="244" width="10" height="24" fill="${C.char}"/>
     <rect x="${wx - 5}" y="296" width="72" height="3" fill="${C.white}"/>` +
    glass + rim(wx + 1, 316, 800, { amp: 1.5 }) + line([[wx - 5, 312], [wx - 5, 284], [wx + 6, 284], [wx + 6, 266]], C.white, 2.5, 'class="rim"');

  /* INNER RIGHT — 191 Peachtree Tower: twin neo-gothic crowns */
  const px = 878;
  const crown = (x, flip) =>
    poly([[x, 350], [x, 318], [x + 4, 318], [x + 4, 300], [x + 10, 284], [x + 16, 300], [x + 16, 318], [x + 20, 318], [x + 20, 350]], C.char) +
    line(flip ? [[x + 20, 318], [x + 16, 318], [x + 16, 300], [x + 10, 284]] : [[x, 318], [x + 4, 318], [x + 4, 300], [x + 10, 284]], C.white, 2.5, 'class="rim"');
  const p191 =
    poly([[px, BASE], [px, 350], [px + 68, 350], [px + 68, BASE]], C.char) +
    poly([[px + 22, 350], [px + 22, 338], [px + 46, 338], [px + 46, 350]], C.char) +
    crown(px, false) + crown(px + 48, true) +
    slits(rnd, px, 360, 68, { density: 0.3 }) + rim(px + 67, 352, 800, { side: -1 });

  /* OUTER LEFT — Truist Plaza: stepped pyramid crown */
  const tx = 528;
  const truistPts = [[tx, BASE], [tx, 330], [tx + 6, 330], [tx + 6, 304], [tx + 14, 304], [tx + 14, 280], [tx + 22, 280], [tx + 22, 258], [tx + 37, 222],
    [tx + 52, 258], [tx + 52, 280], [tx + 60, 280], [tx + 60, 304], [tx + 68, 304], [tx + 68, 330], [tx + 74, 330], [tx + 74, BASE]];
  const truist = poly(truistPts, C.char) + slits(rnd, tx, 330, 74, { density: 0.3 }) + rim(tx + 1, 334, 780) +
    line(truistPts.slice(1, 9), C.white, 2.5, 'class="rim"');

  /* OUTER RIGHT — One Atlantic Center: steep pyramid top + corner finials */
  const ox = 998;
  const oneAtl =
    poly([[ox, BASE], [ox, 344], [ox + 32, 226], [ox + 64, 344], [ox + 64, BASE]], C.char) +
    poly([[ox - 3, 344], [ox - 1, 318], [ox + 3, 344]], C.char) +
    poly([[ox + 61, 344], [ox + 65, 318], [ox + 67, 344]], C.char) +
    `<rect x="${ox + 30}" y="202" width="4" height="26" fill="${C.char}"/>` +
    slits(rnd, ox, 350, 64, { density: 0.3 }) +
    line([[ox + 64, 344], [ox + 32, 226]], C.white, 3, 'class="rim"') + rim(ox + 63, 348, 780, { side: -1 });

  /* LEFT FLANK — Mercedes-Benz Stadium: big angular origami roof that rises above the MARTA deck */
  const sy = GROUND - 236;
  const L = 112;
  const R = 528;
  const sc = 320;
  const stadium =
    poly([[L, BASE], [L + 20, sy + 62], [L + 92, sy + 18], [sc, sy], [R - 92, sy + 18], [R - 36, sy + 70], [R - 16, BASE]], C.char) +
    [
      [[L + 20, sy + 62], [L + 92, sy + 18], [L + 118, sy + 104]],
      [[L + 92, sy + 18], [sc, sy], [sc - 38, sy + 96]],
      [[sc, sy], [R - 92, sy + 18], [sc + 52, sy + 94]],
      [[R - 92, sy + 18], [R - 36, sy + 70], [R - 112, sy + 104]],
      [[L + 118, sy + 104], [sc - 38, sy + 96], [sc, sy]],
      [[sc, sy], [sc + 52, sy + 94], [R - 112, sy + 104]]
    ].map((t) => poly(t, C.char, `stroke="${C.white}" stroke-width="2.5" stroke-linejoin="miter"`)).join('') +
    line([[L + 14, sy + 124], [R - 22, sy + 124]], C.white, 2.5) +
    line([[L + 12, sy + 142], [R - 20, sy + 142]], C.red2, 3.5) +
    line([[L + 10, sy + 176], [R - 18, sy + 176]], C.white, 1.5) +
    line([[L + 20, sy + 62], [L + 92, sy + 18], [sc, sy]], C.white, 3.5, 'class="rim"') +
    line([[R - 36, sy + 70], [R - 92, sy + 18], [sc, sy]], C.white, 3.5, 'class="rim"');

  /* RIGHT FLANK — SkyView Atlanta Ferris wheel, legs planted on the ground */
  const fx = 2 * CX - 320; // mirrors the stadium's centre
  const fr = 112;
  const fy = GROUND - 286;
  let spokes = '';
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const ex = fx + Math.cos(a) * fr;
    const ey = fy + Math.sin(a) * fr;
    spokes += `<line x1="${fx}" y1="${fy}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="${C.char}" stroke-width="2.5"/>`;
    spokes += `<rect x="${(ex - 6).toFixed(1)}" y="${(ey - 5).toFixed(1)}" width="12" height="11" fill="${i % 4 ? C.char : C.red2}" stroke="${C.white}" stroke-width="1.5"/>`;
  }
  const skyview =
    `${poly([[fx - 6, fy], [fx + 6, fy], [fx + 78, GROUND], [fx + 58, GROUND]], C.char)}
     ${poly([[fx - 6, fy], [fx + 6, fy], [fx - 58, GROUND], [fx - 78, GROUND]], C.char)}
     <g class="skyview"><circle cx="${fx}" cy="${fy}" r="${fr}" fill="none" stroke="${C.char}" stroke-width="7"/>
      <circle cx="${fx}" cy="${fy}" r="${fr + 4}" fill="none" stroke="${C.white}" stroke-width="2" stroke-dasharray="60 30"/>
      <circle cx="${fx}" cy="${fy}" r="${fr * 0.55}" fill="none" stroke="${C.char}" stroke-width="3"/>${spokes}</g>
     <circle cx="${fx}" cy="${fy}" r="12" fill="${C.char}" stroke="${C.white}" stroke-width="2.5"/>
     <rect x="${fx - 80}" y="${GROUND - 14}" width="160" height="14" fill="${C.char}"/>`;

  const chevron = [[-300, 852], [CX, 834], [1900, 852], [1900, 858], [CX, 840], [-300, 858]];
  return `<svg viewBox="${VB}" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <defs>${dotPattern('ht-red', 9, 2.2, C.red)}</defs>
  ${fillersSymmetric()}
  ${lean(tx + 37, truist)}${lean(wx + 31, westin)}${boa}${lean(px + 34, p191)}${lean(ox + 32, oneAtl)}
  ${stadium}${skyview}
  <!-- one shared ground plane for the whole city -->
  <rect x="-300" y="${GROUND}" width="2200" height="400" fill="${C.char}"/>
  ${line([[-300, GROUND], [1900, GROUND]], C.white, 3)}
  <rect x="-300" y="${GROUND + 4}" width="2200" height="120" fill="url(#ht-red)"/>
  ${poly(chevron, C.white, 'class="slash"')}
</svg>`;
}

/* =========================================================================
   LAYER 3 — FOREGROUND: mirrored black framing blocks, level MARTA deck +
   centred train, Downtown Connector with streaming lights, symmetric power lines.
   ========================================================================= */
function foreLayer() {
  const rnd = seeded(99);
  const B = 1250;
  // edge block steps DOWN toward the centre (low-angle perspective), mirrored on the right
  const leftBlock = [[-300, B], [-300, 400], [-20, 400], [-20, 360], [70, 380], [70, 452], [160, 470], [160, 560], [246, 580], [246, B]];
  const rightBlock = mirror(leftBlock);

  let pylons = '';
  for (let n = -3; n <= 3; n++) {
    const x = CX + n * 236 - 14;
    pylons += `<rect x="${x}" y="776" width="28" height="${B - 776}" fill="${C.black}"/>`;
    pylons += poly([[x - 18, 776], [x + 46, 776], [x + 28, 800], [x, 800]], C.black);
    pylons += n < 0 ? rim(x + 1, 806, 900, { w: 2.5, amp: 1.5 }) : n > 0 ? rim(x + 27, 806, 900, { w: 2.5, amp: 1.5, side: -1 }) : '';
  }

  // centred two-car MARTA train, noses angled outward (mirror image of each other)
  const carL = [[CX - 296, 742], [CX - 296, 712], [CX - 280, 702], [CX - 12, 702], [CX - 12, 742]];
  const carR = mirror(carL);
  let windows = '';
  for (let x = CX - 280; x < CX - 24; x += 22) {
    const red = rnd() < 0.2;
    windows += `<rect x="${x}" y="714" width="12" height="9" fill="${red ? C.red2 : C.white}"/><rect x="${2 * CX - x - 12}" y="714" width="12" height="9" fill="${red ? C.red2 : C.white}"/>`;
  }

  const sideSlash = [[-300, 610], [430, 566], [-300, 620]];
  const wire = (dy, w) => `<path d="M-300 ${560 + dy} Q 20 ${640 + dy} 330 ${520 + dy} Q ${CX} ${640 + dy} 1270 ${520 + dy} Q 1580 ${640 + dy} 1900 ${560 + dy}" fill="none" stroke="${C.black}" stroke-width="${w}"/>`;

  return `<svg viewBox="${VB}" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <defs>${dotPattern('ht-fw', 12, 1.8, C.white)}</defs>
  ${poly(sideSlash, C.white, 'class="slash"')}${poly(mirror(sideSlash), C.white, 'class="slash"')}

  <!-- symmetric power lines -->
  <rect x="326" y="508" width="7" height="270" fill="${C.black}"/><rect x="310" y="516" width="40" height="5" fill="${C.black}"/>
  <rect x="1267" y="508" width="7" height="270" fill="${C.black}"/><rect x="1250" y="516" width="40" height="5" fill="${C.black}"/>
  ${wire(0, 3)}${wire(14, 2.5)}

  <!-- elevated MARTA deck, level and full-width, train centred -->
  <g class="train">
    ${poly(carL, C.black)}${poly(carR, C.black)}${windows}
    ${line(carL.slice(1, 4), C.white, 2.5, 'class="rim"')}${line(carR.slice(1, 4), C.white, 2.5, 'class="rim"')}
    <rect x="${CX - 286}" y="728" width="572" height="3" fill="${C.red2}"/>
  </g>
  <rect x="-300" y="742" width="2200" height="34" fill="${C.black}"/>
  ${line([[-300, 740], [1900, 740]], C.white, 3)}
  ${line([[-300, 778], [1900, 778]], C.white, 2)}
  <rect x="-300" y="754" width="2200" height="12" fill="url(#ht-fw)"/>
  ${pylons}

  <!-- mirrored framing blocks -->
  ${poly(leftBlock, C.black)}${line(leftBlock.slice(1, -1), C.white, 3.5, 'class="rim"')}
  ${poly(rightBlock, C.black)}${line(rightBlock.slice(1, -1), C.white, 3.5, 'class="rim"')}
  ${slits(rnd, -10, 470, 240, { density: 0.1, bottom: 860, red: 0.5 })}
  ${slits(rnd, 1370, 470, 240, { density: 0.1, bottom: 860, red: 0.5 })}

  <!-- Downtown Connector: level overpass along the bottom, lights streaming both ways -->
  <rect x="-300" y="846" width="2200" height="40" fill="${C.black}"/>
  ${line([[-300, 844], [1900, 844]], C.white, 3.5)}
  ${line([[-300, 888], [1900, 888]], C.white, 2)}
  <line class="traffic" x1="-300" y1="856" x2="1900" y2="856" stroke="${C.white}" stroke-width="4" stroke-dasharray="18 46"/>
  <line class="traffic rev" x1="-300" y1="870" x2="1900" y2="870" stroke="${C.red2}" stroke-width="4" stroke-dasharray="12 52"/>
  <rect x="-300" y="888" width="2200" height="400" fill="${C.black}"/>
</svg>`;
}

/* =========================================================================
   Mount + motion: one shared drift (nearer layers move further) + pointer parallax.
   ========================================================================= */
export function mountSkyline(el, { interactive = true } = {}) {
  el.classList.add('skyline');
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <div class="sky-layer sky-far"><div class="sky-drift">${farLayer()}</div></div>
    <div class="sky-layer sky-mid"><div class="sky-drift">${midLayer()}</div></div>
    <div class="sky-layer sky-fore"><div class="sky-drift">${foreLayer()}</div></div>`;

  if (interactive && window.matchMedia('(pointer: fine)').matches) {
    let raf = 0;
    let tx = 0;
    let ty = 0;
    window.addEventListener('pointermove', (e) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        el.style.setProperty('--px', tx.toFixed(3));
        el.style.setProperty('--py', ty.toFixed(3));
      });
    }, { passive: true });
  }

  return {
    el,
    setFrozen(on) {
      el.classList.toggle('frozen', on);
    }
  };
}
