/* =========================================================================
   Street-art wall — 3-layer parallax background (pure inline SVG + CSS).
   Original artwork in a graffiti / pop-art / high-contrast style:
   a crimson → black spray-paint fade on concrete, stencil stars,
   torn posters, tape and broken-glass shards.
   Palette: crimson #E60012 / #D80000, black #050505, white #FFFFFF
   (spray fades are the only gradients — they read as aerosol overspray).
   Geometry lives in a 1600×900 box; `xMidYMid slice` covers 100vw × 100vh.
   ========================================================================= */

import { mountSubway } from './subway.js';

const C = { black: '#050505', red: '#D80000', red2: '#E60012', white: '#FFFFFF', blood: '#7A0008' };
const VB = '0 0 1600 900';

const pts = (p) => p.map((q) => q.join(',')).join(' ');
const poly = (p, fill, extra = '') => `<polygon points="${pts(p)}" fill="${fill}" ${extra}/>`;
const star = (cx, cy, r, inner = 0.42, n = 5, rot = -90) => {
  const out = [];
  for (let i = 0; i < n * 2; i++) {
    const a = ((rot + (i * 180) / n) * Math.PI) / 180;
    const rr = i % 2 ? r * inner : r;
    out.push([+(cx + Math.cos(a) * rr).toFixed(1), +(cy + Math.sin(a) * rr).toFixed(1)]);
  }
  return out;
};

/** Torn-edge rectangle (poster paper). */
function torn(x, y, w, h, seed = 3) {
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const p = [];
  for (let i = 0; i <= 12; i++) p.push([x + (w * i) / 12, y + (rnd() * 10 - 5)]);
  for (let i = 1; i <= 8; i++) p.push([x + w + (rnd() * 10 - 5), y + (h * i) / 8]);
  for (let i = 11; i >= 0; i--) p.push([x + (w * i) / 12, y + h + (rnd() * 12 - 6)]);
  for (let i = 7; i >= 1; i--) p.push([x + (rnd() * 10 - 5), y + (h * i) / 8]);
  return p.map(([a, b]) => [+a.toFixed(1), +b.toFixed(1)]);
}

/* =========================================================================
   LAYER 1 — WALL: concrete + crimson→black spray-paint fade + overspray clouds
   ========================================================================= */
function wallLayer() {
  return `<svg viewBox="${VB}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
    <linearGradient id="wallFade" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${C.red2}"/>
      <stop offset=".42" stop-color="${C.red}"/>
      <stop offset=".72" stop-color="${C.blood}"/>
      <stop offset="1" stop-color="${C.black}"/>
    </linearGradient>
    <radialGradient id="glow"><stop offset="0" stop-color="#FF2A36" stop-opacity=".85"/><stop offset=".55" stop-color="${C.red2}" stop-opacity=".35"/><stop offset="1" stop-color="${C.red2}" stop-opacity="0"/></radialGradient>
    <radialGradient id="soot"><stop offset="0" stop-color="${C.black}" stop-opacity=".92"/><stop offset=".6" stop-color="${C.black}" stop-opacity=".45"/><stop offset="1" stop-color="${C.black}" stop-opacity="0"/></radialGradient>
    <pattern id="bricks" width="120" height="44" patternUnits="userSpaceOnUse">
      <path d="M0 .5 H120 M0 22.5 H120 M.5 0 V22 M60.5 22 V44" stroke="${C.black}" stroke-width="1.4" opacity=".14" fill="none"/>
    </pattern>
    <pattern id="dotsK" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="6" cy="6" r="3.2" fill="${C.black}"/></pattern>
    <linearGradient id="dotFade" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <mask id="dotMask"><rect width="1600" height="900" fill="url(#dotFade)"/></mask>
  </defs>
  <rect x="-100" y="-100" width="1800" height="1100" fill="url(#wallFade)"/>
  <ellipse cx="1180" cy="230" rx="560" ry="380" fill="url(#glow)"/>
  <ellipse cx="300" cy="320" rx="380" ry="300" fill="url(#glow)" opacity=".6"/>
  <ellipse cx="180" cy="900" rx="700" ry="420" fill="url(#soot)"/>
  <ellipse cx="1500" cy="980" rx="560" ry="360" fill="url(#soot)"/>
  <rect x="-100" y="-100" width="1800" height="1100" fill="url(#bricks)"/>
  <rect x="-100" y="-100" width="1800" height="1100" fill="url(#dotsK)" mask="url(#dotMask)" opacity=".55"/>
</svg>`;
}

/* =========================================================================
   LAYER 2 — GRAFFITI: stencil stars,
   torn posters with tape, a swoosh arrow.
   ========================================================================= */
function graffitiLayer() {
  const posterA = torn(1120, 470, 280, 330, 11);
  const posterB = torn(150, 120, 230, 170, 29);
  const tape = (x, y, r) => `<rect x="${x}" y="${y}" width="74" height="22" fill="${C.white}" opacity=".55" transform="rotate(${r} ${x + 37} ${y + 11})"/>`;
  return `<svg viewBox="${VB}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
    <pattern id="dotsR" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="2.6" fill="${C.red2}"/></pattern>
    <pattern id="dotsW" width="11" height="11" patternUnits="userSpaceOnUse"><circle cx="5.5" cy="5.5" r="1.8" fill="${C.white}"/></pattern>
  </defs>

  <!-- giant stencil star with an offset red echo -->
  <g class="spin-slow" style="--spin:120s">
    ${poly(star(330, 560, 250), 'none', `stroke="${C.red2}" stroke-width="16" stroke-linejoin="miter" transform="translate(18 14)"`)}
    ${poly(star(330, 560, 250), 'none', `stroke="${C.white}" stroke-width="16" stroke-linejoin="miter"`)}
  </g>
  ${poly(star(330, 560, 110), C.black)}


  <!-- torn poster A: halftone + bold mark, taped -->
  <g transform="rotate(5 1260 635)">
    ${poly(posterA, C.white)}
    ${poly(posterA, 'url(#dotsR)')}
    ${poly(star(1260, 610, 88), C.black)}
    <text x="1260" y="770" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="64" fill="${C.black}" letter-spacing="4">ATL</text>
    ${tape(1104, 456, -18)}<g class="atl-tape">${tape(1340, 452, 14)}</g>
  </g>
  <!-- torn poster B: black paper, white halftone corner -->
  <g transform="rotate(-7 265 205)">
    ${poly(posterB, C.black)}
    <rect x="160" y="130" width="120" height="150" fill="url(#dotsW)"/>
    <text x="265" y="228" text-anchor="middle" font-family="'Permanent Marker', cursive" font-size="54" fill="${C.red2}">GO!</text>
    ${tape(140, 104, -10)}
  </g>

  <!-- swoosh arrow (wildstyle-ish), white with black outline -->
  <path class="bd-arrow" d="M520 420 C 700 330, 900 330, 1040 400 L 1060 360 L 1130 460 L 1010 488 L 1028 446 C 900 392, 720 400, 560 470 Z"
    fill="${C.white}" stroke="${C.black}" stroke-width="10" stroke-linejoin="round" paint-order="stroke"/>

  <!-- crown tag outline -->
  <path d="M1360 120 l 16 -42 l 18 28 l 18 -36 l 18 36 l 18 -28 l 16 42 Z" fill="none" stroke="${C.white}" stroke-width="5" stroke-linejoin="round"/>
</svg>`;
}

/* =========================================================================
   LAYER 3 — FOREGROUND: broken-glass shards in the corners, big halftone,
   asymmetric and jagged on purpose.
   ========================================================================= */
function shardLayer() {
  const shardTL = [[-20, -20], [380, -20], [120, 130], [-20, 260]];
  const shardBR = [[1620, 920], [1180, 920], [1420, 700], [1620, 580]];
  const shardBL = [[-20, 920], [-20, 700], [220, 920]];
  return `<svg viewBox="${VB}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs><pattern id="dotsB" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="8" cy="8" r="4.6" fill="${C.black}"/></pattern></defs>
  ${poly(shardTL, C.black)}
  <path d="M-20 260 L 120 130 L 380 -20 M 120 130 L 60 -20 M 120 130 L 250 40" fill="none" stroke="${C.white}" stroke-width="3"/>
  ${poly(shardBR, C.black)}
  <path d="M1180 920 L 1420 700 L 1620 580 M1420 700 L 1520 920 M1420 700 L 1600 760" fill="none" stroke="${C.white}" stroke-width="3"/>
  ${poly(shardBL, 'url(#dotsB)')}
</svg>`;
}

/* =========================================================================
   Mount + motion: shared drift (nearer layers move further) + pointer parallax.
   ========================================================================= */
/* =========================================================================
   LAYER 4 — FOREGROUND TECH CUTOUTS: solid black vector silhouettes (server racks with
   vents and status LEDs, a circuit board with traces and a chip, a cable run) with thin
   white cut edges, like shapes sliced out of black card. They sit at the edges, in front
   of everything in the backdrop, and move the most (parallax), never over the content.
   ========================================================================= */
function techLayer() {
  const K = C.black;
  const rack = (x, y, w, h, depth, leds) => {
    let g = '';
    g += poly([[x + w, y + 10], [x + w + depth, y - 8], [x + w + depth, y + h], [x + w, y + h]], '#151515'); // side face
    g += poly([[x, y + 10], [x + w, y + 10], [x + w + depth, y - 8], [x + depth, y - 8]], '#262626'); // top
    g += `<rect x="${x}" y="${y + 10}" width="${w}" height="${h - 10}" fill="${K}"/>`;
    g += `<path d="M${x} ${y + 10}H${x + w}V${y + h}" fill="none" stroke="${C.white}" stroke-width="2" opacity=".55"/>`; // cut edge catching light
    for (let i = 0, yy = y + 30; yy < y + h - 16; i++, yy += 26) {
      g += `<rect x="${x + 10}" y="${yy}" width="${w - 20}" height="18" fill="none" stroke="#2C2C2C" stroke-width="2"/>`;
      for (let v = x + 18; v < x + w - 40; v += 7) g += `<rect x="${v}" y="${yy + 5}" width="3" height="8" fill="#202020"/>`; // vents
      if (leds) g += `<rect x="${x + w - 30}" y="${yy + 7}" width="5" height="4" fill="${i % 3 ? C.white : C.red2}"/><rect x="${x + w - 21}" y="${yy + 7}" width="5" height="4" fill="${i % 4 ? '#3A3A3A' : C.white}"/>`;
    }
    return g;
  };
  const trace = (d) => `<path d="${d}" fill="none" stroke="${K}" stroke-width="7" stroke-linejoin="miter"/><path d="${d}" fill="none" stroke="${C.white}" stroke-width="1" opacity=".35"/>`;
  const pad = (x, y) => `<circle cx="${x}" cy="${y}" r="9" fill="${K}"/><circle cx="${x}" cy="${y}" r="3.5" fill="${C.red2}"/>`;
  return `<svg viewBox="${VB}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <g class="tech-racks">
    ${rack(-30, 610, 150, 330, 34, true)}
    ${rack(130, 690, 120, 250, 26, true)}
    ${rack(1460, 660, 130, 280, 28, true)}
    <path d="M250 900 C 300 820, 380 860, 430 780 S 520 760, 560 700" fill="none" stroke="${K}" stroke-width="12"/>
    <path d="M250 900 C 300 820, 380 860, 430 780 S 520 760, 560 700" fill="none" stroke="${C.white}" stroke-width="1.4" opacity=".4"/>
  </g>
  <g class="tech-board">
    ${poly([[1240, -10], [1610, -10], [1610, 250], [1490, 300], [1300, 120]], K)}
    <path d="M1300 120 L1490 300 L1610 250" fill="none" stroke="${C.white}" stroke-width="2" opacity=".55"/>
    <rect x="1440" y="40" width="90" height="90" fill="#1C1C1C" stroke="${C.white}" stroke-width="1.5" opacity=".9"/>
    ${Array.from({ length: 6 }, (_, i) => `<rect x="${1448 + i * 14}" y="30" width="6" height="12" fill="#2E2E2E"/><rect x="${1448 + i * 14}" y="128" width="6" height="12" fill="#2E2E2E"/>`).join('')}
    ${trace('M1440 70 H1360 L1320 30 V-10')}${trace('M1530 100 H1580 L1610 70')}${trace('M1480 130 V190 L1520 230')}
    ${pad(1360, 70)}${pad(1580, 100)}${pad(1520, 230)}
  </g>
</svg>`;
}

/* =========================================================================
   LAYER — P5-STYLE GRAPHICS (John: "make it feel like the P5 menus"): bold flat shapes in
   pure black / white / red sitting in front of the scene, never over the content:
   a nested zigzag starburst (rings of jagged stars alternating black and white, turning
   slowly), a tilted block of solid halftone dots, white star cutouts and one red jagged
   slash. Original geometry; no logos, hands or characters.
   ========================================================================= */
function p5Layer() {
  const ring = (cx, cy, r, n, rot, inner) => star(cx, cy, r, inner, n, rot);
  let burst = '';
  for (let i = 0; i < 9; i++) {
    const r = 420 - i * 46;
    burst += poly(ring(0, 0, r, 16, -90 + i * 6, 0.8), i % 2 ? C.white : C.black, i === 0 ? `stroke="${C.black}" stroke-width="6"` : '');
  }
  const dots = torn(0, 0, 360, 250, 41);
  return `<svg viewBox="${VB}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs><pattern id="p5dots" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="8" cy="8" r="5.2" fill="${C.black}"/></pattern></defs>
  <g class="p5-burst" transform="translate(1540 300)"><g class="spin-slow" style="--spin:140s">${burst}</g></g>
  <g transform="translate(-60 640) rotate(-9)">
    ${poly(dots, C.white, `stroke="${C.black}" stroke-width="7"`)}${poly(dots, 'url(#p5dots)')}
  </g>
  ${poly([[1180, 900], [1290, 690], [1250, 700], [1380, 470], [1335, 640], [1385, 625], [1300, 900]], C.red2, `stroke="${C.black}" stroke-width="6"`)}
  ${poly(star(1460, 760, 70, 0.42), C.white, `stroke="${C.black}" stroke-width="7"`)}
  ${poly(star(90, 90, 46, 0.42, 5, -72), C.white, `stroke="${C.black}" stroke-width="6"`)}
</svg>`;
}

/** The far city: Nano Banana night-city art (cartoon ink style: black sky, gray towers, white
    windows, red only on screens and billboards), tilted to a Dutch angle and pushed back so it
    never fights the content in front. On the title it is printed faintly into the red wall. */
const CITY = 'assets/film/city.webp';
const CITY_SMALL = 'assets/film/city-800.webp';
/** The title's opening shot: an empty night subway platform (Nano Banana, clean toon-shaded 3D like
    a P5 cutscene: dark, glossy floor, red safety lines, fluorescent strips, no people), slow camera push. */
const SUBWAY = 'assets/film/subway.webp';
const SUBWAY_SMALL = 'assets/film/subway-800.webp';

export function mountBackdrop(el) {
  el.classList.add('backdrop');
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <div class="bd-layer bd-wall"><div class="bd-drift">${wallLayer()}</div></div>
    <div class="bd-layer bd-subway"><div class="bd-drift"><div class="bd-cam"><img alt="" decoding="async"></div></div></div>
    <div class="bd-layer bd-city"><div class="bd-drift"><img alt="" decoding="async"></div></div>
    <div class="bd-layer bd-p5"><div class="bd-drift">${p5Layer()}</div></div>
    <div class="bd-layer bd-graffiti"><div class="bd-drift">${graffitiLayer()}</div></div>
    <div class="bd-layer bd-shards"><div class="bd-drift">${shardLayer()}</div></div>
    <div class="bd-layer bd-tech"><div class="bd-drift">${techLayer()}</div></div>`;

  // the city art loads only after the page has painted, sized for the screen, so it never
  // competes with the title text on a phone's first load
  const small = () => window.innerWidth <= 900;
  const loadCity = () => {
    [[el.querySelector('.bd-subway img'), small() ? SUBWAY_SMALL : SUBWAY], [el.querySelector('.bd-city img'), small() ? CITY_SMALL : CITY]].forEach(([img, src]) => {
      img.onload = () => {
        img.classList.add('in'); // fades in once it's ready, never a half-drawn image
        if (img.parentNode.classList.contains('bd-cam')) mountSubway(img.parentNode, img); // trash on the floor + the PRESS START train
      };
      img.src = src;
    });

  };
  // phones wait until the title has finished building in, then the scene fades in like an opening shot
  const later = () => setTimeout(loadCity, small() || !window.matchMedia('(pointer: fine)').matches ? 2500 : 300);
  if (document.readyState === 'complete') later();
  else window.addEventListener('load', later, { once: true });

  // tall screens only see a narrow slice of the wall: show its left side (GO! poster + star)
  // instead of the empty middle
  const tall = window.matchMedia('(max-aspect-ratio: 1/1)');
  const graffiti = el.querySelector('.bd-graffiti svg');
  const fit = () => graffiti.setAttribute('preserveAspectRatio', tall.matches ? 'xMinYMid slice' : 'xMidYMid slice');
  fit();
  tall.addEventListener?.('change', fit);

  if (window.matchMedia('(pointer: fine)').matches) {
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
}
