import { seeded } from '../core/util.js';

/* =========================================================================
   Atlanta skyline — 3-layer parallax background (pure inline SVG + CSS).
   Original vector artwork. Palette is strictly limited to:
     #050505 pitch black · #D80000 / #E60012 crimson · #FFFFFF white · #1A1A1A charcoal
   No gradients, blurs or drop shadows — only flat shapes, strokes and dot patterns.
   Geometry lives in a 1600×900 box; `xMidYMax slice` makes it cover 100vw × 100vh.
   ========================================================================= */

const C = { black: '#050505', red: '#D80000', red2: '#E60012', white: '#FFFFFF', char: '#1A1A1A' };
const VB = '0 0 1600 900';
const BASE = 1150; // buildings run far below the frame so the Dutch-angle skew never shows gaps

/* ---------- helpers ---------- */
const poly = (pts, fill, extra = '') => `<polygon points="${pts.map((p) => p.join(',')).join(' ')}" fill="${fill}" ${extra}/>`;
const line = (pts, color, w, extra = '') =>
  `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linejoin="miter" stroke-linecap="square" ${extra}/>`;

/** Jagged white rim-light running down an edge (zig-zags ±amp every `step`). */
function rim(x, y1, y2, { amp = 2.5, step = 16, w = 3, side = 1 } = {}) {
  const pts = [];
  let i = 0;
  for (let y = y1; y < y2; y += step, i++) pts.push([x + (i % 2 ? amp : -amp) * side, y]);
  pts.push([x, y2]);
  return line(pts, C.white, w, 'class="rim"');
}

/** Sparse vertical window slits (white or crimson). */
function slits(rnd, x, top, w, { density = 0.18, bottom = 900, red = 0.25 } = {}) {
  let out = '';
  for (let cx = x + 6; cx < x + w - 6; cx += 9) {
    for (let cy = top + 14; cy < bottom; cy += 26) {
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
   LAYER 1 — FAR: crimson sky, tilted shards, sun cutout, halftone wheels
   ========================================================================= */
function farLayer() {
  return `<svg viewBox="${VB}" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <defs>
    ${dotPattern('ht-s', 10, 1.4, C.black)}${dotPattern('ht-m', 10, 2.6, C.black)}${dotPattern('ht-l', 10, 3.8, C.black)}
    ${dotPattern('ht-w', 14, 2.2, C.white)}
    <clipPath id="sunClip"><circle cx="1010" cy="430" r="170"/></clipPath>
  </defs>
  <rect x="-100" y="-100" width="1800" height="1100" fill="${C.red}"/>
  <!-- tilted geometric shards -->
  ${poly([[600, -10], [990, -10], [770, 270]], C.red2)}
  ${poly([[-10, -10], [540, -10], [190, 330], [-10, 440]], C.black)}
  ${poly([[1610, 70], [1610, 380], [1230, 250]], C.black)}
  ${poly([[1170, -10], [1262, -10], [870, 580], [846, 556]], C.white)}
  ${poly([[290, 120], [392, 84], [334, 190]], C.white)}
  ${poly([[1446, 432], [1540, 384], [1494, 486]], C.white)}
  ${poly([[60, 470], [150, 452], [96, 520]], C.white)}
  <!-- stylized sun: white disc cut by crimson bars, offset black ring like a misprint -->
  <circle cx="1024" cy="444" r="178" fill="none" stroke="${C.black}" stroke-width="10"/>
  <g clip-path="url(#sunClip)">
    <rect x="830" y="250" width="360" height="360" fill="${C.white}"/>
    ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="830" y="${452 + i * 26}" width="360" height="${5 + i * 3}" fill="${C.red}"/>`).join('')}
  </g>
  <!-- rotating Ben-Day halftone wheels -->
  <g class="ht-wheel" style="--spin:70s"><circle cx="250" cy="600" r="150" fill="url(#ht-m)"/><circle cx="250" cy="600" r="150" fill="none" stroke="${C.black}" stroke-width="6" stroke-dasharray="22 14"/></g>
  <g class="ht-wheel rev" style="--spin:90s"><circle cx="1420" cy="170" r="112" fill="url(#ht-w)"/><circle cx="1420" cy="170" r="112" fill="none" stroke="${C.white}" stroke-width="4" stroke-dasharray="10 12"/></g>
  <!-- halftone horizon bands: dots grow toward the ground (flat steps, not a gradient) -->
  <rect x="-100" y="520" width="1800" height="70" fill="url(#ht-s)"/>
  <rect x="-100" y="590" width="1800" height="70" fill="url(#ht-m)"/>
  <rect x="-100" y="660" width="1800" height="400" fill="url(#ht-l)"/>
  <!-- streaking speed lines in the sky -->
  <g class="streaks">
    ${[
      [120, 360, 4, 3.2, 0], [260, 220, 3, 4.1, 1.2], [410, 420, 2, 2.7, 2.1], [70, 520, 3, 3.6, 0.6], [330, 300, 2, 5, 2.8]
    ].map(([y, len, h, dur, delay]) => `<polygon class="streak" style="--d:${dur}s;--dl:-${delay}s" points="0,${y} ${len},${y - h * 2} ${len},${y + h} 0,${y + h}" fill="${C.white}"/>`).join('')}
  </g>
</svg>`;
}

/* =========================================================================
   LAYER 2 — MIDGROUND: charcoal Downtown/Midtown with the landmarks
   ========================================================================= */
function midLayer() {
  const rnd = seeded(404);
  let fillers = '';
  // dense generic blocks behind/between the landmarks
  for (let x = -260; x < 1860; ) {
    const w = 46 + Math.floor(rnd() * 70);
    const top = 560 + Math.floor(rnd() * 210);
    const slant = rnd() < 0.35 ? (rnd() < 0.5 ? -1 : 1) * (10 + rnd() * 26) : 0;
    fillers += poly([[x, BASE], [x, top + Math.max(0, slant)], [x + w, top + Math.max(0, -slant)], [x + w, BASE]], C.char);
    fillers += slits(rnd, x, top, w, { density: 0.14 });
    if (rnd() < 0.45) fillers += rim(x + 1, top + 6, top + 120, { w: 2 });
    x += w + Math.floor(rnd() * 8);
  }

  /* Truist Plaza — stepped pyramid crown */
  const tx = 560;
  const truist = poly(
    [[tx, BASE], [tx, 330], [tx + 6, 330], [tx + 6, 304], [tx + 14, 304], [tx + 14, 280], [tx + 22, 280], [tx + 22, 258], [tx + 37, 222],
      [tx + 52, 258], [tx + 52, 280], [tx + 60, 280], [tx + 60, 304], [tx + 68, 304], [tx + 68, 330], [tx + 74, 330], [tx + 74, BASE]],
    C.char
  ) + slits(rnd, tx, 330, 74, { density: 0.3 }) + rim(tx + 1, 334, 700) +
    line([[tx + 6, 330], [tx + 6, 304], [tx + 14, 304], [tx + 14, 280], [tx + 22, 280], [tx + 22, 258], [tx + 37, 222]], C.white, 2.5, 'class="rim"');

  /* Bank of America Plaza — tallest, open-lattice obelisk crown + spire + beacon */
  const bx = 664;
  const latticeLines = [];
  for (let i = 1; i <= 5; i++) {
    const y = 300 - i * 22;
    const half = 36 * (1 - (i * 22) / 125);
    latticeLines.push(`M${700 - half} ${y} L${700 + half} ${y}`);
  }
  const boa =
    poly([[bx, BASE], [bx, 322], [bx + 12, 300], [bx + 60, 300], [bx + 72, 322], [bx + 72, BASE]], C.char) +
    slits(rnd, bx, 320, 72, { density: 0.32, red: 0.35 }) +
    `<g class="lattice" fill="none" stroke="${C.char}" stroke-linejoin="miter">
      <path d="M${bx} 300 L700 175 L${bx + 72} 300 Z" stroke-width="7"/>
      <path d="${latticeLines.join(' ')} M${bx} 300 L700 230 L${bx + 72} 300 M680 300 L700 175 L720 300" stroke-width="3.5"/>
      <path d="M${bx + 12} 286 L700 200 M${bx + 60} 286 L700 200" stroke-width="2.5"/>
    </g>
    <rect x="697" y="96" width="6" height="82" fill="${C.char}"/>
    <rect x="694" y="176" width="12" height="6" fill="${C.char}"/>` +
    line([[bx, 322], [bx + 12, 300], [700, 175]], C.white, 3, 'class="rim"') +
    rim(bx + 1, 326, 760, { w: 3.5 }) +
    `<g class="beacon"><rect class="beacon-r" x="694" y="84" width="12" height="12" fill="${C.red2}"/><rect class="beacon-w" x="694" y="84" width="12" height="12" fill="${C.white}"/></g>`;

  /* 191 Peachtree Tower — twin neo-gothic crowns */
  const px = 788;
  const crown = (x) =>
    poly([[x, 350], [x, 318], [x + 4, 318], [x + 4, 300], [x + 10, 284], [x + 16, 300], [x + 16, 318], [x + 20, 318], [x + 20, 350]], C.char) +
    line([[x, 318], [x + 4, 318], [x + 4, 300], [x + 10, 284]], C.white, 2.5, 'class="rim"');
  const p191 =
    poly([[px, BASE], [px, 350], [px + 68, 350], [px + 68, BASE]], C.char) +
    poly([[px + 22, 350], [px + 22, 338], [px + 46, 338], [px + 46, 350]], C.char) +
    crown(px) + crown(px + 48) +
    slits(rnd, px, 360, 68, { density: 0.3 }) + rim(px + 1, 352, 740);

  /* Westin Peachtree Plaza — sleek glass cylinder with the restaurant ring */
  const wx = 902;
  let glass = '';
  [3, 9, 17, 27, 38, 47, 54, 59].forEach((o, i) => {
    glass += `<rect x="${wx + o}" y="318" width="${i % 3 === 0 ? 2 : 1.5}" height="${BASE - 318}" fill="${i % 4 === 1 ? C.red2 : C.white}" opacity="${i % 2 ? 1 : 1}"/>`;
  });
  const westin =
    `<rect x="${wx}" y="300" width="62" height="${BASE - 300}" fill="${C.char}"/>
     <rect x="${wx - 5}" y="284" width="72" height="28" fill="${C.char}"/>
     <rect x="${wx + 6}" y="266" width="50" height="20" fill="${C.char}"/>
     <rect x="${wx + 26}" y="244" width="10" height="24" fill="${C.char}"/>
     <rect x="${wx - 5}" y="296" width="72" height="3" fill="${C.white}"/>` +
    glass + rim(wx + 1, 316, 780, { amp: 1.5, w: 3 }) + line([[wx - 5, 312], [wx - 5, 284], [wx + 6, 284], [wx + 6, 266]], C.white, 2.5, 'class="rim"');

  /* One Atlantic Center — Midtown's steep pyramid top with corner finials */
  const ox = 1046;
  const oneAtl =
    poly([[ox, BASE], [ox, 344], [ox + 32, 232], [ox + 64, 344], [ox + 64, BASE]], C.char) +
    poly([[ox - 3, 344], [ox - 1, 318], [ox + 3, 344]], C.char) +
    poly([[ox + 61, 344], [ox + 65, 318], [ox + 67, 344]], C.char) +
    `<rect x="${ox + 30}" y="208" width="4" height="26" fill="${C.char}"/>` +
    slits(rnd, ox, 350, 64, { density: 0.3 }) +
    line([[ox, 344], [ox + 32, 232]], C.white, 3, 'class="rim"') + rim(ox + 1, 348, 720);

  /* Mercedes-Benz Stadium — angular origami roof on the lower-left flank */
  const stadium =
    poly([[96, BASE], [118, 800], [196, 764], [300, 752], [404, 768], [452, 816], [470, BASE]], C.char) +
    [
      [[118, 800], [196, 764], [218, 836]],
      [[196, 764], [300, 752], [262, 826]],
      [[300, 752], [404, 768], [342, 822]],
      [[404, 768], [452, 816], [392, 836]],
      [[218, 836], [262, 826], [300, 752]]
    ].map((t) => poly(t, C.char, `stroke="${C.white}" stroke-width="2.5" stroke-linejoin="miter"`)).join('') +
    line([[118, 846], [452, 846]], C.white, 2) + line([[110, 868], [462, 868]], C.red2, 3) +
    line([[118, 800], [196, 764], [300, 752]], C.white, 3.5, 'class="rim"');

  /* SkyView Atlanta — Ferris wheel (spokes + gondolas rotate) */
  const fx = 1268;
  const fy = 664;
  const fr = 96;
  let spokes = '';
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const ex = fx + Math.cos(a) * fr;
    const ey = fy + Math.sin(a) * fr;
    spokes += `<line x1="${fx}" y1="${fy}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="${C.char}" stroke-width="2.5"/>`;
    spokes += `<rect x="${(ex - 6).toFixed(1)}" y="${(ey - 5).toFixed(1)}" width="12" height="11" fill="${i % 4 ? C.char : C.red2}" stroke="${C.white}" stroke-width="1.5"/>`;
  }
  const skyview =
    `<g class="skyview"><circle cx="${fx}" cy="${fy}" r="${fr}" fill="none" stroke="${C.char}" stroke-width="7"/>
      <circle cx="${fx}" cy="${fy}" r="${fr + 4}" fill="none" stroke="${C.white}" stroke-width="2" stroke-dasharray="60 30"/>
      <circle cx="${fx}" cy="${fy}" r="${fr * 0.55}" fill="none" stroke="${C.char}" stroke-width="3"/>${spokes}</g>
     ${poly([[fx - 6, fy], [fx + 6, fy], [fx + 58, BASE], [fx + 40, BASE]], C.char)}
     ${poly([[fx - 6, fy], [fx + 6, fy], [fx - 40, BASE], [fx - 58, BASE]], C.char)}
     <circle cx="${fx}" cy="${fy}" r="12" fill="${C.char}" stroke="${C.white}" stroke-width="2.5"/>`;

  return `<svg viewBox="${VB}" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <defs>${dotPattern('ht-red', 9, 2.2, C.red)}</defs>
  <g transform="translate(800 900) skewY(-7) translate(-800 -900)">
    ${fillers}
    ${truist}${boa}${p191}${westin}${oneAtl}
    ${skyview}<g transform="translate(70 -150) scale(1.08)">${stadium}</g>
    <rect x="-300" y="880" width="2200" height="400" fill="${C.char}"/>
    <rect x="-300" y="880" width="2200" height="120" fill="url(#ht-red)"/>
    <!-- jagged white slashes separating midground from foreground -->
    ${poly([[-300, 836], [900, 812], [-300, 828]], C.white, 'class="slash"')}
    ${poly([[500, 870], [1900, 838], [1900, 848]], C.white, 'class="slash"')}
    ${poly([[1240, 540], [1900, 470], [1900, 478]], C.white, 'class="slash"')}
  </g>
</svg>`;
}

/* =========================================================================
   LAYER 3 — FOREGROUND: pitch-black framing blocks, elevated MARTA line,
   highway overpass, power lines. Jagged white rim-light outlines.
   ========================================================================= */
function foreLayer() {
  const rnd = seeded(99);
  const B = 1250;
  const leftBlock = [[-300, B], [-300, 470], [-10, 470], [-10, 420], [60, 404], [60, 470], [150, 452], [150, 560], [232, 540], [232, B]];
  const rightBlock = [[1900, B], [1900, 370], [1610, 370], [1540, 392], [1540, 500], [1450, 518], [1450, 620], [1372, 640], [1372, B]];
  let pylons = '';
  for (let x = -120; x < 1800; x += 230) {
    pylons += `<rect x="${x}" y="772" width="28" height="${B - 772}" fill="${C.black}"/>` + rim(x + 1, 780, 1000, { w: 2.5, amp: 1.5 });
    pylons += poly([[x - 18, 772], [x + 46, 772], [x + 28, 798], [x, 798]], C.black);
  }
  let trainWindows = '';
  for (let x = 430; x < 1150; x += 22) if (!(x > 676 && x < 700)) trainWindows += `<rect x="${x}" y="712" width="12" height="9" fill="${rnd() < 0.2 ? C.red2 : C.white}"/>`;

  return `<svg viewBox="${VB}" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <defs>${dotPattern('ht-fw', 12, 1.8, C.white)}</defs>
  <g transform="translate(800 900) skewY(-10) translate(-800 -900)">
    <!-- white speed slashes behind the black silhouettes -->
    ${poly([[-300, 640], [700, 600], [-300, 652]], C.white, 'class="slash"')}
    ${poly([[1000, 560], [1900, 520], [1900, 532]], C.white, 'class="slash"')}

    <!-- power lines -->
    <rect x="300" y="520" width="7" height="260" fill="${C.black}"/><rect x="284" y="530" width="40" height="5" fill="${C.black}"/>
    <rect x="1262" y="470" width="7" height="310" fill="${C.black}"/><rect x="1246" y="480" width="40" height="5" fill="${C.black}"/>
    <path d="M-300 600 Q 0 650 288 534 Q 780 640 1250 484 Q 1500 560 1900 470" fill="none" stroke="${C.black}" stroke-width="3"/>
    <path d="M-300 616 Q 0 670 320 534 Q 800 664 1282 484 Q 1520 586 1900 494" fill="none" stroke="${C.black}" stroke-width="2.5"/>

    <!-- elevated MARTA rail + Downtown Connector deck -->
    <g class="train">
      ${poly([[420, 740], [420, 706], [430, 700], [676, 700], [676, 740]], C.black)}
      ${poly([[700, 740], [700, 700], [1140, 700], [1160, 716], [1160, 740]], C.black)}
      ${trainWindows}
      ${line([[420, 706], [430, 700], [676, 700]], C.white, 2.5, 'class="rim"')}
      ${line([[700, 700], [1140, 700], [1160, 716]], C.white, 2.5, 'class="rim"')}
      <rect x="430" y="726" width="720" height="3" fill="${C.red2}"/>
    </g>
    <rect x="-300" y="740" width="2200" height="34" fill="${C.black}"/>
    ${line([[-300, 738], [1900, 738]], C.white, 3)}
    ${line([[-300, 776], [1900, 776]], C.white, 2)}
    <rect x="-300" y="752" width="2200" height="12" fill="url(#ht-fw)"/>
    ${pylons}

    <!-- heavy framing blocks -->
    ${poly(leftBlock, C.black)}
    ${line(leftBlock.slice(1, -1), C.white, 3.5, 'class="rim"')}
    <rect x="-300" y="480" width="530" height="770" fill="url(#ht-fw)" opacity="0.35"/>
    ${slits(rnd, -10, 480, 230, { density: 0.1, bottom: 900, red: 0.5 })}
    ${poly(rightBlock, C.black)}
    ${line(rightBlock.slice(1, -1), C.white, 3.5, 'class="rim"')}
    ${slits(rnd, 1380, 520, 220, { density: 0.1, bottom: 900, red: 0.5 })}

    <rect x="-300" y="900" width="2200" height="400" fill="${C.black}"/>
    ${line([[-300, 902], [1900, 902]], C.white, 2)}
  </g>
  <!-- Downtown Connector: lower overpass tilted the other way, headlights + taillights streaming -->
  <g transform="translate(800 900) skewY(5) translate(-800 -900)">
    <rect x="-300" y="842" width="2200" height="40" fill="${C.black}"/>
    ${line([[-300, 840], [1900, 840]], C.white, 3.5)}
    ${line([[-300, 884], [1900, 884]], C.white, 2)}
    <line class="traffic fwd" x1="-300" y1="852" x2="1900" y2="852" stroke="${C.white}" stroke-width="4" stroke-dasharray="18 46"/>
    <line class="traffic rev" x1="-300" y1="866" x2="1900" y2="866" stroke="${C.red2}" stroke-width="4" stroke-dasharray="12 52"/>
    ${[ -40, 330, 700, 1070, 1440 ].map((x) => `<rect x="${x}" y="884" width="34" height="200" fill="${C.black}"/>` + rim(x + 1, 890, 1000, { w: 2.5, amp: 1.5 })).join('')}
    ${poly([[-300, 900], [500, 892], [-300, 906]], C.white, 'class="slash"')}
  </g>
</svg>`;
}

/* =========================================================================
   Mount + motion: CSS keyframe drift per layer + pointer parallax (rAF-throttled).
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
