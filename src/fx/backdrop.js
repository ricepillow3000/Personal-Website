/* =========================================================================
   Street-art wall — 3-layer parallax background (pure inline SVG + CSS).
   Original artwork in a graffiti / pop-art / high-contrast style:
   a crimson → black spray-paint fade on concrete, stencil stars,
   torn posters, tape and broken-glass shards.
   Palette: crimson #E60012 / #D80000, black #050505, white #FFFFFF
   (spray fades are the only gradients — they read as aerosol overspray).
   Geometry lives in a 1600×900 box; `xMidYMid slice` covers 100vw × 100vh.
   ========================================================================= */

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
  <path d="M520 420 C 700 330, 900 330, 1040 400 L 1060 360 L 1130 460 L 1010 488 L 1028 446 C 900 392, 720 400, 560 470 Z"
    fill="${C.white}" stroke="${C.black}" stroke-width="10" stroke-linejoin="round" paint-order="stroke"/>

  <!-- crown tag outline -->
  <path d="M1360 120 l 16 -42 l 18 28 l 18 -36 l 18 36 l 18 -28 l 16 42 Z" fill="none" stroke="${C.white}" stroke-width="5" stroke-linejoin="round"/>
</svg>`;
}

/* =========================================================================
   LAYER 3 — FOREGROUND: broken-glass shards in the corners, big halftone,
   white speed slashes. Asymmetric and jagged on purpose.
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
  <g class="slashes">
    ${poly([[-60, 520], [520, 470], [-60, 532]], C.white)}
    ${poly([[1660, 300], [1080, 350], [1660, 312]], C.white)}
    ${poly([[900, 900], [1300, 640], [1312, 650], [930, 900]], C.white, 'opacity=".9"')}
  </g>
</svg>`;
}

/* =========================================================================
   Mount + motion: shared drift (nearer layers move further) + pointer parallax.
   ========================================================================= */
export function mountBackdrop(el, { interactive = true } = {}) {
  el.classList.add('backdrop');
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <div class="bd-layer bd-wall"><div class="bd-drift">${wallLayer()}</div></div>
    <div class="bd-layer bd-graffiti"><div class="bd-drift">${graffitiLayer()}</div></div>
    <div class="bd-layer bd-shards"><div class="bd-drift">${shardLayer()}</div></div>`;

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
