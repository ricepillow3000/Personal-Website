/* Paints the platform's graffiti the way a spray can does, and saves it as public/assets/film/graffiti.webp.

   Nov 19, John: "make the graffiti feel like actual graffiti, not a font pasted onto the pillar...
   like someone shook a spray can and wrote TAKE YOUR NETWORK, with a cat"; the words became TAKE YOUR
   NOTES the same day, the site's catchphrase). So nothing here is a font:
   every letter is a hand-drawn stroke (a few points per letter, nudged by an unsteady hand), and
   every stroke is sprayed: thousands of paint droplets scattered round a moving nozzle (a dense wet
   core, a soft mist of overspray), more paint where the hand slows at a corner or stops at a stroke's
   end, runs of paint dripping down from the heavy spots, and a burst of spatter where a freshly
   shaken can first fires. Two passes like a real piece: a black drop shadow sprayed first, the red
   letters over it, a few quick white highlight flicks, then the cat doodled in white with a star eye.
   Original design (no game lettering, logo or mascot). Seeded, so the same piece comes out every time.

   Run: node tools/draw-graffiti.mjs   (needs the Playwright Chromium that the tests use)
   The image is 4x the pillar face it is painted on (76 x 230 art px), so it stays crisp on big screens. */
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const W = 304;
const H = 920;

const paint = () => {
  /* eslint-disable no-undef */
  const cv = document.createElement('canvas');
  cv.width = 304;
  cv.height = 920;
  const g = cv.getContext('2d');
  let seed = 20261119;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const gauss = () => { let u = 0; for (let i = 0; i < 4; i++) u += rnd(); return (u - 2) / 0.58; };
  const RED = [206, 24, 30];
  const DARK = [8, 8, 10];
  const WHITE = [236, 233, 224];

  /* letters as hand strokes in a 10 x 14 cell (y down) */
  const ring = (cx, cy, rx, ry, n = 14, a0 = -Math.PI / 2) => Array.from({ length: n + 1 }, (_, i) => [cx + rx * Math.cos(a0 + (i / n) * Math.PI * 2), cy + ry * Math.sin(a0 + (i / n) * Math.PI * 2)]);
  const L = {
    T: [[[0, 0.5], [10, 0]], [[5, 0.2], [5.2, 14]]],
    A: [[[0, 14], [4.6, 0], [5.4, 0], [10, 14]], [[2.2, 9], [8, 8.6]]],
    K: [[[1, 0], [1, 14]], [[9.5, 0], [1.4, 8.2]], [[3.6, 6.2], [9.8, 14]]],
    E: [[[9.4, 0], [1, 0.3], [1, 13.8], [9.6, 14]], [[1, 7], [7.6, 6.8]]],
    Y: [[[0, 0], [5, 7.2]], [[10, 0], [5, 7.2], [5, 14]]],
    O: [ring(5, 7, 4.8, 7)],
    U: [[[1, 0], [1, 10], [2.2, 13.2], [5, 14], [7.8, 13.2], [9, 10], [9, 0]]],
    R: [[[1, 14], [1, 0], [6.2, 0], [9, 1.8], [9.2, 4.8], [6.4, 7], [1.2, 7]], [[5, 7], [9.8, 14]]],
    N: [[[1, 14], [1, 0], [9, 14], [9, 0]]],
    W: [[[0, 0], [2.4, 14], [5, 4.6], [7.6, 14], [10, 0]]],
    S: [[[9, 1.6], [6.6, 0], [3, 0.2], [1, 2.6], [1.6, 5.4], [5, 7], [8.4, 8.6], [9.2, 11.4], [7.2, 13.8], [3.4, 14], [0.6, 12.2]]],
  };

  // smooth a polyline (Catmull-Rom) and resample it every ~1 px, with the hand's speed at each point
  const smooth = (pts) => {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)]; const p1 = pts[i]; const p2 = pts[i + 1]; const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      const n = Math.max(2, Math.ceil(len));
      for (let k = 0; k < n; k++) {
        const t = k / n; const t2 = t * t; const t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        // the hand slows into each turn and at the ends: more paint lands there
        const slow = Math.min(1, Math.min(k, n - k) / Math.max(2, n * 0.18));
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]), 1.45 - 0.45 * slow]);
      }
    }
    out.push([...pts[pts.length - 1], 1.45]);
    return out;
  };

  const dot = (x, y, r, [cr, cg, cb], a) => {
    g.fillStyle = `rgba(${cr},${cg},${cb},${a})`;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  };
  /* one sprayed stroke: a wet core (overlapping round blots, a little uneven), droplets scattered
     round the nozzle, a wide faint mist; paint gathers where the hand is slow */
  const spray = (pts, w, col, { mist = 1, core = 0.92 } = {}) => {
    const path = smooth(pts);
    path.forEach(([x, y, heavy], i) => {
      const ww = w * (0.88 + 0.24 * Math.sin(i * 0.11 + w)) * (0.9 + 0.1 * heavy);
      if (i % 2 === 0) dot(x + gauss() * 0.4, y + gauss() * 0.4, ww * 0.42, col, core * (0.55 + 0.25 * heavy));
      for (let j = 0; j < Math.round(ww * 1.6 * heavy); j++) dot(x + gauss() * ww * 0.42, y + gauss() * ww * 0.42, 0.35 + rnd() * 0.9, col, 0.35 + rnd() * 0.4);
      for (let j = 0; j < Math.round(ww * 0.7 * mist); j++) dot(x + gauss() * ww * 1.15, y + gauss() * ww * 1.15, 0.3 + rnd() * 0.7, col, 0.08 + rnd() * 0.12);
    });
    return path;
  };
  /* a run of paint: from a heavy spot straight down, thinning, ending in a bead */
  const drip = (x, y, len, w, col) => {
    let ww = w;
    for (let k = 0; k < len; k++) {
      ww = Math.max(w * 0.35, ww * 0.985);
      dot(x + Math.sin(k * 0.21) * 0.35, y + k, ww / 2, col, 0.85);
    }
    dot(x, y + len + w * 0.3, w * 0.62, col, 0.9);
  };
  /* the first burst from a just-shaken can: spatter flecks around where the stroke starts */
  const spatter = (x, y, n, spread, col) => {
    for (let i = 0; i < n; i++) dot(x + gauss() * spread, y + gauss() * spread, 0.4 + rnd() * 1.6, col, 0.3 + rnd() * 0.5);
  };

  /* a word: each letter placed by an unsteady hand (its own tilt, size, baseline, nudged points) */
  const word = (txt, x0, y0, unit, gap, slant, w) => {
    const letters = [];
    let x = x0;
    [...txt].forEach((ch, li) => {
      const rot = (rnd() - 0.5) * 0.12;
      const s = unit * (0.93 + rnd() * 0.14);
      const by = y0 + Math.sin(li * 1.3) * unit * 0.5 + (rnd() - 0.5) * unit * 0.5;
      const strokes = L[ch].map((st) => st.map(([px, py]) => {
        const jx = px + (rnd() - 0.5) * 0.7;
        const jy = py + (rnd() - 0.5) * 0.7;
        const X = jx * s + slant * (14 - jy) * s; // forward lean
        const Y = jy * s;
        return [x + X * Math.cos(rot) - Y * Math.sin(rot), by + X * Math.sin(rot) + Y * Math.cos(rot)];
      }));
      letters.push({ strokes, w });
      x += (10 + gap) * s * (ch === 'W' ? 1.05 : 1);
    });
    return letters;
  };

  const lines = [
    ...word('TAKE', 18, 70, 5.6, 2.2, 0.18, 15),
    ...word('YOUR', 24, 192, 5.0, 2.2, 0.18, 14),
    ...word('NOTES', 14, 318, 4.15, 2.4, 0.2, 11),
  ];

  // 1. the shadow pass: sprayed dark, a few px down-right, a little wider
  lines.forEach(({ strokes, w }) => strokes.forEach((st) => spray(st.map(([x, y]) => [x + 5, y + 6]), w + 5, DARK, { mist: 0.6, core: 0.7 })));
  // 2. the red letters (spatter where each word starts: the can was just shaken)
  spatter(30, 70, 140, 16, RED);
  spatter(44, 196, 90, 14, RED);
  const heavy = [];
  lines.forEach(({ strokes, w }) => strokes.forEach((st) => {
    const path = spray(st, w, RED);
    const end = path[path.length - 1];
    const start = path[0];
    [start, end].forEach((p) => { if (p[1] > Math.min(start[1], end[1]) + 4 || st.length === 2) heavy.push([p[0], p[1], w]); });
  }));
  // 3. drips from about a third of the heavy spots (stroke ends low in a letter)
  heavy.forEach(([x, y, w]) => { if (rnd() < 0.34) drip(x + (rnd() - 0.5) * 3, y + w * 0.3, 12 + rnd() * 46, Math.max(2.6, w * 0.32), RED); });
  // 4. quick white highlight flicks on a few strokes (top-left edge)
  lines.forEach(({ strokes, w }, i) => {
    if (i % 2) return;
    const st = strokes[0];
    const [a, b] = [st[0], st[1]];
    const t0 = 0.15 + rnd() * 0.2;
    const p = (t) => [a[0] + (b[0] - a[0]) * t - w * 0.28, a[1] + (b[1] - a[1]) * t - w * 0.2];
    spray([p(t0), p(t0 + 0.22)], 3.2, WHITE, { mist: 0.3, core: 0.9 });
  });

  // 5. the cat, doodled in white at the end of the line: sitting, side on, tail hooked up, a star eye
  const cx = 150;
  const cy = 500;
  const cat = [
    [[cx - 40, cy + 150], [cx - 46, cy + 100], [cx - 38, cy + 52], [cx - 22, cy + 22]], // back
    [[cx - 22, cy + 22], [cx - 34, cy - 6], [cx - 30, cy - 40], [cx - 24, cy - 62], [cx - 10, cy - 40]], // head, left ear
    [[cx - 10, cy - 40], [cx + 6, cy - 42], [cx + 18, cy - 66], [cx + 22, cy - 34], [cx + 24, cy - 8], [cx + 12, cy + 18]], // right ear, face
    [[cx + 12, cy + 18], [cx + 22, cy + 56], [cx + 26, cy + 104], [cx + 18, cy + 150], [cx - 40, cy + 150]], // chest, paws
    [[cx + 18, cy + 148], [cx + 62, cy + 140], [cx + 82, cy + 104], [cx + 76, cy + 70], [cx + 56, cy + 62], [cx + 50, cy + 80], [cx + 62, cy + 88]], // tail, hooked up
  ];
  cat.forEach((st) => spray(st, 8.5, WHITE, { mist: 0.8, core: 0.95 }));
  // whiskers and a mouth: thin, quick
  [[[cx + 16, cy + 2], [cx + 46, cy - 6]], [[cx + 16, cy + 8], [cx + 46, cy + 12]], [[cx - 22, cy + 2], [cx - 50, cy - 4]]].forEach((st) => spray(st, 2.6, WHITE, { mist: 0.2 }));
  // its eyes: one dot, one red star
  dot(cx - 14, cy - 14, 4.2, WHITE, 0.95);
  const star = [];
  for (let i = 0; i <= 10; i++) { const r = i % 2 ? 4.5 : 11; const a = -Math.PI / 2 + (i / 10) * Math.PI * 2; star.push([cx + 8 + r * Math.cos(a), cy - 16 + r * Math.sin(a)]); }
  spray(star, 3.6, RED, { mist: 0.4 });
  drip(cx + 24, cy + 152, 30, 3.2, WHITE);
  drip(cx - 38, cy + 152, 18, 3, WHITE);
  return cv.toDataURL('image/png');
};

const b = await chromium.launch();
const p = await b.newPage();
const url = await p.evaluate(paint);
await b.close();
const png = new URL('../public/assets/film/graffiti.png', import.meta.url).pathname;
writeFileSync(png, Buffer.from(url.split(',')[1], 'base64'));
// lossy WebP with alpha: the droplets are noise anyway; q 74 keeps them crisp
execFileSync('python3', ['-c', `from PIL import Image; im=Image.open('${png}'); im.save('${png.replace('.png', '.webp')}', 'WEBP', quality=74, alpha_quality=85, method=6)`]);
execFileSync('rm', [png]);
console.log(`graffiti.webp ${W}x${H}`);
