/* The title's subway platform, alive: trash lying on the platform floor, and the PRESS START
   train that bursts out of the tunnel and roars past along the track, blowing the trash away.

   Everything is drawn on one canvas that sits exactly on top of the platform art (same box,
   same camera push), in the art's own pixel space (1600 x 914), so the train lines up with the
   tunnel and the platform edge on every screen size. The train is a real perspective plane:
   its side is cut into thin vertical strips (one per few screen pixels), each scaled for its
   depth, like an old raycaster. Its nose is our cut-out of Nano Banana's subway-car front. */

import { createSideRenderer } from './sidegl.js';
import { sharpArt } from './art.js';

const IW = 1600;
const IH = 914;
// the shot's geometry, measured on the art: vanishing point on the platform-edge line inside the
// tunnel, the train's side runs along the platform edge, the tunnel mouth is at depth 1000
const VP = { x: 863, y: 520 };
const F = 1000; // depth of the tunnel mouth; at that depth 1 world unit = 1 art pixel
const SIDE_X = -63; // the train's platform-side wall
const ROOF = -62;
const SKIRT = 54; // platform level
const WIDE = 100; // the train's width
const LEN = 5200; // the whole train
const MOUTH = 1000;
const START = 2700; // where the nose is when the shot opens (deep in the dark tunnel)
/* How it moves (Nov 19, John: "I want it to feel real"). It used to blast through at a constant 3600
   units a second (the car is 116 units, about 3.6 m, tall: that was ~400 km/h, gone in 0.7 s).
   Now it arrives like a real train: out of the tunnel fast, braking hard, so the nose passes the
   camera at about a third of that and the cars roll by heavily. Constant deceleration, never below
   CRAWL. leadAt(t) is where the nose is; timeAt(d) is when it gets to depth d. */
const V0 = 3400; // world units a second, deep in the tunnel
const BRAKE = 1950; // units a second, per second
const CRAWL = 700; // it keeps rolling past (the cut comes first)
const T_CRAWL = (V0 - CRAWL) / BRAKE;
const D_CRAWL = V0 * T_CRAWL - 0.5 * BRAKE * T_CRAWL * T_CRAWL;
export const speedAt = (t) => (t < T_CRAWL ? V0 - BRAKE * t : CRAWL);
const leadAt = (t) => START - (t < T_CRAWL ? V0 * t - 0.5 * BRAKE * t * t : D_CRAWL + CRAWL * (t - T_CRAWL));
function timeAt(d) {
  const x = START - d; // distance travelled
  if (x <= 0) return 0;
  if (x < D_CRAWL) return (V0 - Math.sqrt(V0 * V0 - 2 * BRAKE * x)) / BRAKE;
  return T_CRAWL + (x - D_CRAWL) / CRAWL;
}

const NOSE = 'assets/film/trainnose.webp';
const SIDE = 'assets/film/train.webp';

// trash on the platform floor: [x, y] on the art (where it touches the floor), kind, size, tilt.
// The pieces are Nano Banana art (toon ink outlines, halftone shading): one strip, cells below.
const TRASH_ART = 'assets/film/trash.webp';
const TRASH_W = 1550; // CELLS below are measured on a 1550x200 strip (the file can be any multiple)
const CELLS = { news: [0, 200, 111], bag: [204, 200, 167], can: [408, 130, 190], cup: [542, 200, 140], flyer: [746, 200, 139], wrapper: [950, 200, 126], receipt: [1154, 200, 141], ball: [1358, 188, 190] };
// Flat pieces (paper, wrapper) lie ON the floor: they turn in the floor's plane and are squashed
// by the floor's perspective, centered on their spot. Solid pieces (can, cup, bag, ball) stand on
// it: their lowest painted pixel touches the spot, upright, never tilted off their base.
const FLAT = new Set(['news', 'receipt', 'flyer', 'wrapper']);
const TRASH = [
  [600, 838, 'news', 1.2, -6],
  [700, 776, 'receipt', 0.7, 8],
  [790, 902, 'can', 0.6, 0],
  [915, 708, 'wrapper', 0.55, 5],
  [1000, 814, 'flyer', 0.95, -7],
  [1150, 905, 'cup', 0.85, 0],
  [858, 664, 'ball', 0.42, 0],
  [1260, 790, 'bag', 0.7, 0],
  [655, 687, 'news', 0.65, 9],
  [1060, 645, 'receipt', 0.5, -5],
];

const reduce = () => document.body.classList.contains('reduce-motion') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const load = (src) => {
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  return img;
};
/* Decoded copies (ImageBitmaps) of the train and litter pictures, made OFF the main thread from the
   cached file (no second download). Drawing an <img> into a canvas decodes it again ON the main
   thread: ~200 ms a picture on a slow phone, three times while the title loaded (Nov 19, the speed
   pass). pic(img) is what to draw: the bitmap when it's there, else the <img> as before. */
const bmps = new Map();
const pic = (img) => bmps.get(img) || img;
async function bitmapOf(img) {
  if (bmps.has(img)) return bmps.get(img);
  if (urgent || !window.createImageBitmap || !img?.currentSrc) return null; // the visitor is waiting: no background work
  try {
    const blob = await (await fetch(img.currentSrc, { cache: 'force-cache' })).blob();
    const b = await createImageBitmap(blob, { premultiplyAlpha: 'premultiply' }); // premultiplied: right for the canvas and the GPU upload alike
    if (urgent) { b.close(); return null; } // START was pressed meanwhile: the <img> is already in use
    bmps.set(img, b);
    return b;
  } catch {
    return null;
  }
}

let cv = null;
let ctx = null; // the 2D layer being drawn on right now
let under = null; // 2D: floor, trash, light pools, afterimage noses
let over = null; // 2D on top of the GPU side: the nose, headlights, speed lines
let cvTop = null;
let glOn = false; // this frame's side went to the GPU layer
let gpuOK = false; // the GPU path passed its self-test on this device (until then: 2D slices)
let box = null;
let art = null;
let nose = null;
let side = null;
let trash = null; // { lit, ink } canvases: the art lit like the station, and a black copy for shading
let pan = null; // object-position x while the camera pans (phones), else null
let state = null; // the running shot, or null at rest

/* Ready = the platform is mounted, the train art is decoded and the GPU side is set up (or ruled
   out). PRESS START / CONTINUE waits on this, so the train always plays (Nov 19, John: on phones a
   returning visitor tapped CONTINUE before the scene had loaded and the train was skipped). */
let resolveReady;
const ready = new Promise((r) => { resolveReady = r; });
export const subwayReady = () => ready;
let artReady = null;
let kicked = false;
let urgent = false;
const idle = (fn, timeout = 800) => new Promise((res, rej) => (window.requestIdleCallback || setTimeout)(() => { try { res(fn()); } catch (e) { rej(e); } }, { timeout })); // resolves with fn's result; a throw rejects (never hangs)
/* one piece of the train's set-up per idle moment (never one long freeze), or right away once the
   visitor has pressed START and is waiting */
const waiting = []; // slices still waiting for an idle moment (run at once when START is pressed)
let hurried; // resolves the moment START is pressed: nothing waits on background decoding after that
const hurry = new Promise((r) => { hurried = r; });
const slice = (fn) => new Promise((res, rej) => {
  let ran = false;
  const run = () => {
    if (ran) return;
    ran = true;
    try { res(fn()); } catch (e) { rej(e); }
  };
  if (urgent) return run();
  waiting.push(run);
  (window.requestIdleCallback || setTimeout)(run, { timeout: 400 });
});
function kick() {
  if (kicked || !cv) return;
  kicked = true;
  preloadSubway()
    .then(gpuPrep)
    .then(() => {
      if (urgent) heavyNose(true); // they're waiting on the button: finish the heavy nose now
      resolveReady();
    });
}
/** The visitor pressed START: load the train now instead of in idle time (and finish the heavy
    nose if its idle slices haven't yet, so the train never runs with the plain art). */
export function hurrySubway() {
  urgent = true;
  hurried();
  waiting.splice(0).forEach((run) => run()); // whatever was waiting for idle time runs now
  kick();
  heavyNose(true);
}

/** Mount on the title's camera box (holds the platform <img>). Called once the art has loaded. */
export function mountSubway(camBox, img) {
  if (cv) return;
  box = camBox;
  art = img;
  cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden', 'true');
  box.appendChild(cv);
  ctx = under = cv.getContext('2d');
  cvTop = document.createElement('canvas'); // the GPU side's layer is slotted in between, when made
  cvTop.setAttribute('aria-hidden', 'true');
  box.appendChild(cvTop);
  over = cvTop.getContext('2d');
  const img2 = load(TRASH_ART);
  img2.onload = () => { // the litter's two working copies, one per idle moment, from the decoded copy
    const t = {};
    bitmapOf(img2)
      .then(() => idle(() => { t.lit = litCopy(img2); }))
      .then(() => idle(() => { t.ink = tintCopy(img2, '#0B0B0B'); }))
      .then(() => { t.box = BOXES; trash = t; draw(); bmps.get(img2)?.close(); bmps.delete(img2); }); // only the copies are drawn
  };
  new ResizeObserver(() => size()).observe(box);
  size();
  // the platform is on screen: fetch the train while the visitor reads the title (idle time,
  // after the scene has faded in), or right now if they already pressed START
  if (urgent) kick();
  else (window.requestIdleCallback || setTimeout)(kick, { timeout: 2500 });
}

/** Load the train art (on the first tap/key, with the other film art). Resolves once it is decoded
    and its working copies are built. */
export function preloadSubway() {
  if (artReady) return artReady;
  nose = load(NOSE);
  side = load(SIDE);
  const dec = (img) => (img.decode ? img.decode().catch(() => new Promise((r) => { if (img.complete) r(); else img.onload = img.onerror = r; })) : new Promise((r) => { img.onload = img.onerror = r; }));
  // build the working copies ahead of time (idle), so the shot's first frame doesn't pay for them
  artReady = Promise.all([dec(nose), dec(side)])
    .then(() => Promise.race([Promise.all([bitmapOf(nose), bitmapOf(side)]), hurry])) // (START pressed: draw the <img> as it is)
    .then(() => slice(sideArt))
    .then(() => slice(windowProfile))
    .then(() => slice(() => tinted(sideArt())))
    .then(() => slice(() => tinted(nose)));
  artReady.then(() => idle(heavyNose)); // its own idle turn (the train doesn't wait for it)
  return artReady;
}

/* Set up the GPU side once the platform is mounted and the art decoded (self-test first). */
async function gpuPrep() {
  const r = gpu();
  if (!r || !cv || !sideArt()) return;
  try {
    // one step per idle moment: upload, self-test, warm-up (never one long freeze)
    const src = sideTexFor(sideArt());
    await slice(() => r.upload(src, bmps.get(src))); // the decoded copy when it's the <img> (a plain copy, no decode)
    if (!(await slice(() => r.selfTest(src, pic(src))))) throw new Error('GPU side failed its self-test');
    await slice(() => r.prepare(src, cv.width, cv.height));
    await slice(() => r.upload(tinted(sideArt())));
    await slice(() => r.prepare(tinted(sideArt()), cv.width, cv.height));
    gpuOK = true;
    box.dataset.trainGpu = 'on'; // visible in devtools, and to tests
  } catch {
    dropGPU(); // this device draws the side with the 2D slices instead
  }
  if (!gpuOK) prepFallback(); // the 2D fallback's shaded copies, in idle slices
  // the side's decoded copy has done its jobs (working copy, window profile, upload): free its memory
  bmps.get(side)?.close();
  bmps.delete(side);
}

function size() {
  if (!cv) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const w = box.offsetWidth;
  const h = box.offsetHeight;
  if (!w || !h) return;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
    cv.width = cvTop.width = Math.round(w * dpr);
    cv.height = cvTop.height = Math.round(h * dpr);
  }
  cv.dataset.dpr = dpr;
  draw();
}

/* object-fit: cover math, so art pixels land where the <img> shows them */
function mapping() {
  const dpr = +cv.dataset.dpr || 1;
  const w = box.offsetWidth;
  const h = box.offsetHeight;
  const k = Math.max(w / IW, h / IH);
  const px = pan ?? 0.6;
  return { k: k * dpr, ox: (w - IW * k) * px * dpr, oy: (h - IH * k) * 0.55 * dpr, kk: k };
}

/* ---------------------------------------------------------------- trash */
function tintCopy(img, color) {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth || img.width;
  c.height = img.naturalHeight || img.height;
  const g = c.getContext('2d');
  g.drawImage(pic(img), 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}
/* the platform is dim, cool fluorescent light: darken and cool the art so it sits in the scene */
function litCopy(img) {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext('2d');
  g.drawImage(pic(img), 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = 'rgba(14, 16, 22, 0.34)';
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

/* Each cell has empty margins around its piece: the painted box of every cell (in the 1550px strip's
   units), so a piece's real edge, not its cell's edge, meets the floor. Measured once from trash.webp's
   alpha (> 60) and stored (Nov 19, the speed pass: scanning the picture's pixels on every visit cost a
   slow phone ~120 ms; the browser's own scan matched these numbers exactly). Re-measure if the art
   changes. */
const BOXES = { news: [27, 0, 173, 110], bag: [268.5, 0, 134.5, 166], can: [409.5, 2.5, 126, 185], cup: [548, 4, 188, 132], flyer: [746, 1, 200, 137], wrapper: [950, 0, 199.5, 126], receipt: [1155, 1.5, 199, 139.5], ball: [1359.5, 2, 184.5, 185] };

/* where a floor point sits in depth (so trash blows away the moment the nose reaches it) */
const depthOf = (y) => (F * SKIRT) / Math.max(8, y - VP.y);

function drawTrash(t, keep = null) {
  if (!trash) return;
  TRASH.forEach(([x0, y0, kind, sz, tilt], i) => {
    const [bx, by, bw, bh] = trash.box[kind];
    const flat = FLAT.has(kind);
    const near = Math.max(0.35, (y0 - VP.y) / (IH - VP.y)); // 1 at the bottom of the shot
    let gx = x0; // where it rests on the floor
    let gy = y0;
    let lift = 0;
    let grow = 1;
    let rot = (tilt * Math.PI) / 180;
    let squash = 1;
    let back = false;
    if (state) {
      const st = state.trash[i];
      const shiver = state.rumble;
      rot += Math.sin(t * 61 + i * 7) * 0.04 * shiver; // the rumble rattles it before the wind hits
      lift = Math.abs(Math.sin(t * 47 + i * 3)) * shiver * 1.5;
      if (st.at !== null) {
        const u = t - st.at;
        grow = 1 / (1 - Math.min(0.86, u * 0.9)); // swept toward the camera by the train's wind
        gx = VP.x + (x0 - VP.x) * grow - st.push * (u + u * u * 2.2);
        gy = VP.y + (y0 - VP.y) * grow;
        lift = Math.max(0, st.lift * 1.3 * u - 260 * u * u) * grow;
        rot += st.spin * u;
        const flip = Math.cos(st.flip * u);
        squash = Math.max(0.14, Math.abs(flip));
        back = flip < 0;
      }
    }
    if (keep && !keep(depthOf(y0) / grow)) return; // drawn in the other pass (in front of / behind the nose)
    const m = sz * (0.28 + near * 0.62) * grow;
    const w = bw * m; // the painted piece, not its cell
    const h = bh * m;
    // a flat piece is seen at the floor's angle: the farther away, the flatter it looks
    const fs = flat ? 0.5 + 0.32 * near : 1;
    const fog = (1 - near) * 0.45; // farther pieces sink into the gloom
    const air = Math.min(1, lift / (h * fs * 2 + 1)); // 0 on the floor, 1 well off it
    const piece = (img, alpha) => {
      ctx.globalAlpha = alpha;
      const s = img.width / TRASH_W; // boxes are in the 1550px strip's pixels; sharper strips scale them
      ctx.drawImage(img, bx * s, by * s, bw * s, bh * s, -w / 2, -h / 2, w, h);
    };
    const shade = fog + (back ? 0.45 : 0);

    // soft occlusion on the floor under it (stays down there when the piece lifts)
    ctx.save();
    ctx.translate(gx, gy);
    ctx.scale(1, flat ? fs * 0.5 : 0.22);
    const r = w * (flat ? 0.56 : 0.55) * (1 - air * 0.3);
    const sh = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    sh.addColorStop(0, `rgba(0,0,0,${(flat ? 0.4 : 0.62) * (1 - air)})`);
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();

    if (flat) {
      // lying down: turned in the floor's plane, then squashed by the floor's perspective.
      // A tight dark copy right under its edge glues it to the tiles.
      if (air < 0.95) {
        ctx.save();
        ctx.translate(gx, gy + Math.max(1, h * fs * 0.05));
        ctx.scale(1, fs);
        ctx.rotate(rot);
        piece(trash.ink, 0.5 * (1 - air));
        ctx.restore();
      }
      ctx.save();
      ctx.translate(gx, gy - lift);
      ctx.scale(1, fs * squash);
      ctx.rotate(rot);
      piece(trash.lit, 1);
      if (shade > 0.02) piece(trash.ink, Math.min(0.8, shade));
      ctx.restore();
    } else {
      // standing: its lowest pixel on the spot, and a faint mirror image in the glossy tiles
      // that starts exactly where it touches
      if (air < 0.9) {
        ctx.save();
        ctx.translate(gx, gy + lift + h * 0.25 * squash);
        ctx.rotate(-rot);
        ctx.scale(1, -0.5 * squash);
        piece(trash.lit, 0.12 * (1 - air) * (1 - fog));
        ctx.restore();
      }
      ctx.save();
      ctx.translate(gx, gy - lift - (h / 2) * squash);
      ctx.rotate(rot);
      ctx.scale(1, squash);
      piece(trash.lit, 1);
      if (shade > 0.02) piece(trash.ink, Math.min(0.8, shade));
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  });
}

/* ---------------------------------------------------------------- weight (Nov 19)
   John: "it looks and feels like a cutout... make it look heavy and feel heavy, like an actual
   subway train". A heavy train is read from small physical cues, so it gets all of them:
   the body rides its springs (slow, small), every wheel set slams the rail joint as it passes
   the camera (a hard thump, not a buzz), its air wall shoves the camera as the nose passes,
   the steel is cel-shaded with station lights sliding along it (src/fx/sidegl.js), it is
   mirrored in the glossy floor, and a dark gap grounds it against the platform edge. */
const CAR = 620; // one car, in world units (about 3.5 door bays of the art)
const PASS_D = 40; // a wheel set "passes the camera" at this depth
const AXLES = [];
for (let c = 0; c < 5; c++) for (const b of [90, CAR - 90]) for (const a of [-32, 32]) AXLES.push(c * CAR + b + a);
export const NOSE_PASS = timeAt(PASS_D); // when the nose passes the camera (~1.2 s, braking)
/** the hard thumps of the wheel sets near the camera: a damped jolt per axle */
function jolts(t) {
  let j = 0;
  for (const s of AXLES) {
    const u = t - timeAt(PASS_D - s); // axle s passes the camera when the nose is s beyond it
    if (u >= 0 && u < 0.25) j += Math.exp(-u * 20) * Math.cos(u * 48);
  }
  return j;
}
/** the car body bouncing on its springs (world units, + is down), and kicked by each joint */
function bounce() {
  if (!state) return 0;
  const t = state.t;
  return 0.9 * Math.sin(t * 10.7) + 0.45 * Math.sin(t * 20.7 + 1.3) + 0.6 * jolts(t);
}
/** Camera motion for time t: a low rumble that swells as the train comes (smooth, not random
    jitter: heavy things shake slow and deep), a thump per wheel set, and the air wall's shove. */
export function cameraMotion(t, near) {
  const swell = 1 + 2 * Math.min(1, t / 0.5) + 5 * near;
  const ry = Math.sin(t * 46) * 0.55 + Math.sin(t * 74.8 + 1.1) * 0.3 + Math.sin(t * 107.4 + 2.3) * 0.15;
  const rx = Math.sin(t * 39.3 + 0.7) * 0.6 + Math.sin(t * 66.1 + 1.9) * 0.4;
  const j = jolts(t);
  const push = Math.exp(-(((t - NOSE_PASS) / 0.07) ** 2)); // the air wall, centered on the nose
  return { x: rx * swell + j * 3.5 - push * 10, y: ry * swell + j * 11, s: 1 + 0.018 * push };
}

/* the dark gap where the car meets the platform edge: grounds it (no daylight under a heavy body) */
function seam(lead) {
  const near = Math.max(lead, 18);
  const far = Math.min(lead + LEN, MOUTH + 420);
  if (far <= near) return;
  const by = bounce();
  ctx.fillStyle = 'rgba(4, 5, 8, 0.78)';
  ctx.beginPath();
  ctx.moveTo(sx(SIDE_X, near), sy(SKIRT + by * 0.3, near));
  ctx.lineTo(sx(SIDE_X, far), sy(SKIRT + by * 0.3, far));
  ctx.lineTo(sx(SIDE_X + 2.4, far), sy(SKIRT, far));
  ctx.lineTo(sx(SIDE_X + 2.4, near), sy(SKIRT, near));
  ctx.closePath();
  ctx.fill();
}

/* The same cel-shaded steel as the GPU shader, baked into working copies for the nose (always 2D)
   and for the 2D fallback side and its reflection: deeper steel, hard shade bands, lit windows kept. */
const STEEL = Array.from({ length: 256 }, (_, i) => Math.round(((i / 255) ** 1.45) * 0.8 * 255));
/** A shading job over a copy (at most maxH tall), done row by row so it can run in idle slices:
    step(ms) works for about that long and returns true when the copy is finished. */
function steelJob(src, refl = false, maxH = 900) {
  const sw = src.naturalWidth || src.width;
  const sh = src.naturalHeight || src.height;
  if (!sw || !sh) return null;
  const k = Math.min(1, maxH / sh);
  const w = Math.round(sw * k);
  const h = Math.round(sh * k);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingQuality = 'high';
  if (refl) {
    g.translate(0, h);
    g.scale(1, -1); // upside down: the roof lands farthest from the floor line
  }
  g.drawImage(pic(src), 0, 0, w, h);
  const im = g.getImageData(0, 0, w, h);
  const px = im.data;
  const L = new Float32Array(w * h); // luminance, filled a few rows ahead, for the ink outlines
  const o = Math.max(1, Math.round(h / 1100)); // ~1.6 texels of the 1828px art
  let lumRow = 0;
  let y = 0;
  let finished = false;
  const row = (yy) => {
    for (; lumRow <= Math.min(h - 1, yy + o); lumRow++) {
      for (let x = 0, i = lumRow * w; x < w; x++, i++) L[i] = (0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]) / 255;
    }
    const v = refl ? 1 - (yy + 0.5) / h : (yy + 0.5) / h; // v of the original art: 0 roof .. 1 skirt
    const band = (v < 0.06 ? 0.5 : 1) * (v > 0.74 ? 0.8 : 1) * (v > 0.86 ? 0.75 : 1) * (v > 0.94 ? 0.7 : 1);
    const ra = v > 0.86 ? 0.36 : v > 0.66 ? 0.22 : v > 0.4 ? 0.11 : 0.05;
    const ya = Math.max(0, yy - o) * w;
    const yb = Math.min(h - 1, yy + o) * w;
    for (let x = 0; x < w; x++) {
      const i = (yy * w + x) * 4;
      if (!px[i + 3]) continue;
      const r = px[i], gg = px[i + 1], b = px[i + 2];
      const lum = L[yy * w + x];
      const glass = lum >= 0.45 ? Math.min(1, Math.max(0, ((Math.min(r, gg) - b) / 255) * 5)) : 0;
      const m = 1 - glass;
      const gx = L[yy * w + Math.min(w - 1, x + o)] - L[yy * w + Math.max(0, x - o)];
      const gy = L[yb + x] - L[ya + x];
      const e = Math.min(1, Math.max(0, (Math.sqrt(gx * gx + gy * gy) - 0.07) / 0.13));
      const ink = e * e * (3 - 2 * e);
      const keep = (1 - 0.7 * ink) * band;
      const dim = 1 - 0.35 * ink * glass;
      let nr = (r + (STEEL[r] * keep - r) * m) * dim;
      let ng = (gg + (STEEL[gg] * keep - gg) * m) * dim;
      let nb = (b + (STEEL[b] * keep - b) * m) * dim;
      if (refl) {
        nr *= 0.82;
        ng *= 0.85;
        nb *= 0.94;
        px[i + 3] *= ra;
      }
      px[i] = nr;
      px[i + 1] = ng;
      px[i + 2] = nb;
    }
  };
  return {
    c,
    step(ms) {
      const end = performance.now() + ms;
      while (y < h) {
        row(y++);
        if ((y & 7) === 0 && performance.now() > end) return false;
      }
      if (!finished) g.putImageData(im, 0, 0);
      finished = true;
      return true;
    },
  };
}
/** Run a job in idle slices (never one long task: the title stays smooth on slow phones). */
function inIdle(job, done) {
  if (!job) return;
  const ric = window.requestIdleCallback || ((f) => setTimeout(() => f({ timeRemaining: () => 8 }), 16));
  const tick = (dl) => {
    if (job.step(Math.max(4, Math.min(12, dl.timeRemaining() - 1)))) done(job.c);
    else ric(tick, { timeout: 200 });
  };
  ric(tick, { timeout: 200 });
}
let noseSteel = null;
let sideSteel = null;
let sideMirror = null;
let noseJob = null;
/** the nose's heavy copy: shaded in idle slices, used once finished (the plain art until then).
    finish = true (the visitor pressed START and is waiting anyway): do what's left right now. */
function heavyNose(finish = false) {
  if (!noseSteel && !noseJob && nose?.complete && nose.naturalWidth) {
    noseJob = steelJob(nose, false, 900); // 900px tall like the side's working copy (a plain canvas draw: cheap)
    inIdle(noseJob, noseDone);
  }
  if (finish && noseJob && !noseSteel && noseJob.step(1e9)) noseDone(noseJob.c);
  return noseSteel;
}
function noseDone(c) {
  if (noseSteel) return;
  noseSteel = c;
  if (box) box.dataset.trainArt = 'heavy'; // devtools and tests can see the heavy nose is ready
}
/* the 2D fallback's copies: built in idle slices after the GPU test fails; if the GPU drops out
   in the middle of a shot they are finished right there (rare) */
const sideJobs = {};
function sideCopyFor(refl) {
  const key = refl ? 'mirror' : 'steel';
  if (!sideJobs[key] && sideArt()) sideJobs[key] = steelJob(sideArt(), refl, sideArt().height);
  return sideJobs[key];
}
function heavySide() {
  if (!sideSteel) { const j = sideCopyFor(false); if (j && j.step(1e9)) sideSteel = j.c; }
  return sideSteel;
}
function reflSide() {
  if (!sideMirror) { const j = sideCopyFor(true); if (j && j.step(1e9)) sideMirror = j.c; }
  return sideMirror;
}
function prepFallback() {
  const a = sideCopyFor(false);
  const b = sideCopyFor(true);
  inIdle(a, (c) => { sideSteel = c; });
  inIdle(b, (c) => { sideMirror = c; });
}

/* ---------------------------------------------------------------- the train */
const sx = (X, d) => VP.x + (X * F) / d;
const sy = (Y, d) => VP.y + (Y * F) / d;
const dark = (d) => Math.max(0, Math.min(1, 1 - (d - MOUTH) / 420)); // fades into the tunnel's dark

/* The car-side art is 2770px wide for sharpness, but the train never covers more than ~900 art
   pixels of height, and drawing hundreds of slices a frame from the full file is slow on phones.
   So the slices come from one cached working copy at most 912px tall. */
let sideCopy = null;
function sideArt() {
  if (sideCopy) return sideCopy;
  if (!side?.complete || !side.naturalWidth) return null;
  const s = Math.min(1, 912 / side.naturalHeight);
  const c = document.createElement('canvas');
  c.width = Math.round(side.naturalWidth * s);
  c.height = Math.round(side.naturalHeight * s);
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(pic(side), 0, 0, c.width, c.height);
  sideCopy = c;
  return c;
}

/* The side is one true-perspective surface on the GPU (src/fx/sidegl.js): a straight roof line and
   straight stripes at any distance. Without WebGL2 it falls back to the 2D slices below. */
let sideGL; // undefined = not tried yet, null = unavailable
function gpu() {
  if (sideGL === undefined && cvTop) { // only once the platform is mounted (a deep link preloads the train first)
    try { sideGL = createSideRenderer(); } catch { sideGL = null; }
    if (sideGL) box.insertBefore(sideGL.canvas, cvTop);
  }
  return sideGL || null;
}
/* Any trouble on the GPU path (failed self-test, an exception, a lost context) drops it for good:
   the train is then drawn with the 2D slices, which work everywhere. */
function dropGPU() {
  sideGL?.canvas?.remove();
  sideGL = null;
  glOn = false;
  gpuOK = false;
  if (box) box.dataset.trainGpu = 'off';
}
/* motion blur: how far the car slides while a real camera's shutter is open (1/60 s), so at speed
   the windows and doors smear along the car instead of sliding past razor-sharp like a poster */
const SHUTTER = 1 / 60;
/* the GPU gets the full-resolution car art (1828px tall), except on low-memory phones */
const sideTexFor = (tex) => (tex === sideCopy && side?.naturalWidth && sharpArt() ? side : tex);
function sideQuad(lead, alpha, tex, { mat = 0, refl = 0 } = {}) {
  const img = sideTexFor(tex);
  const tw = img.naturalWidth || img.width;
  const th = img.naturalHeight || img.height;
  const near = Math.max(lead, 18);
  const far = Math.min(lead + LEN, MOUTH + 430); // past MOUTH + 420 it has faded into the tunnel's dark
  if (far <= near) return true;
  const m = ctx.getTransform(); // art space -> canvas pixels (includes the afterimages' zoom)
  const P = (Y, d) => {
    const p = m.transformPoint(new DOMPoint(sx(SIDE_X, d), sy(Y, d)));
    return [p.x, p.y];
  };
  const by = bounce(); // the body riding its springs
  // the reflection is the car mirrored in the floor plane: roof below, skirt on the floor line
  const top = refl ? 2 * SKIRT - (ROOF + by) : ROOF + by;
  const bot = refl ? SKIRT - by : SKIRT + by;
  return sideGL.quad(img, [[...P(top, near), near, near - lead, 0], [...P(bot, near), near, near - lead, 1], [...P(top, far), far, far - lead, 0], [...P(bot, far), far, far - lead, 1]],
    { period: ((SKIRT - ROOF) * tw) / th, alpha, mouth: MOUTH, mat, refl, blur: state ? speedAt(state.t) * SHUTTER : 0 });
}

function trainSide(lead, kk, alpha = 1, tex = sideArt(), { mat = 0, refl = 0 } = {}) {
  if (!tex) return;
  if (glOn) {
    try {
      if (sideQuad(lead, alpha, tex, { mat, refl })) return;
    } catch {
      dropGPU();
    }
  }
  // 2D slices: the steel material and the reflection are baked into working copies instead
  if (refl) tex = reflSide();
  else if (mat) tex = heavySide() || tex;
  if (!tex) return;
  const by = bounce();
  const yTop = refl ? SKIRT - by : ROOF + by; // the reflection copy is already upside down
  const yBot = refl ? 2 * SKIRT - (ROOF + by) : SKIRT + by;
  const tw = tex.width;
  const th = tex.height;
  const period = ((SKIRT - ROOF) * tw) / th; // one repeat of the car-side art (door to door), in world units
  const tail = lead + LEN;
  const near = Math.max(lead, 18);
  // screen columns from the near end to the far end; step ~3 screen px
  const step = 5 / kk; // 5 screen px per strip: smooth to the eye, 40% fewer draws than 3px (the side is drawn 3x a frame)
  const xNear = Math.max(-200, sx(SIDE_X, near));
  const xFar = sx(SIDE_X, Math.min(tail, 6000));
  for (let x = xNear; x < xFar; x += step) {
    const d = (SIDE_X * F) / (x - VP.x);
    const d2 = (SIDE_X * F) / (x + step - VP.x);
    const a = alpha * dark(d);
    if (a <= 0.01) break;
    const s = d - lead;
    const u = ((s % period) / period) * tw;
    const sw = Math.max(1, Math.min(tw - u, ((d2 - d) / period) * tw));
    const top = sy(yTop, d);
    ctx.globalAlpha = a;
    ctx.drawImage(tex, u, 0, sw, th, x, top, step + 0.8, sy(yBot, d) - top);
  }
  ctx.globalAlpha = 1;
}

/* The cabin light spilling onto the platform (John, Nov 18: warm light-gold, seen reflecting on its
   surroundings): cel-shaded pools beside every window, three hard-edged bands that are brightest at
   the platform edge, moving with the train. Where the windows are comes from the car art itself. */
let glowProfile = null; // how warm (lit window) each slice of one door-to-door repeat is, 0..1
function windowProfile() {
  if (glowProfile || !side?.complete || !side.naturalWidth) return glowProfile;
  const c = document.createElement('canvas');
  c.width = 96;
  c.height = 24;
  const g = c.getContext('2d');
  g.drawImage(pic(side), 0, 0, 96, 24);
  const px = g.getImageData(0, 0, 96, 24).data;
  const out = new Float32Array(96);
  for (let x = 0; x < 96; x++) {
    let w = 0;
    for (let y = 4; y < 12; y++) { const i = (y * 96 + x) * 4; w += Math.max(0, px[i] - px[i + 2]); } // warm = red over blue
    out[x] = w;
  }
  // light spreads: blur around the loop so the windows of a car make broad patches, not stripes
  const soft = out.map((_, x) => {
    let t = 0;
    for (let k = -8; k <= 8; k++) t += out[(x + k + 96) % 96];
    return t / 17;
  });
  const max = Math.max(...soft) || 1;
  glowProfile = soft.map((v) => Math.min(1, (v / max) * 1.15));
  return glowProfile;
}
const POOLS = [[40, 0.16], [90, 0.1], [150, 0.06]]; // width from the platform edge (world units), strength
function cabinLight(lead) {
  const prof = windowProfile();
  if (!prof) return;
  const period = ((SKIRT - ROOF) * side.naturalWidth) / side.naturalHeight;
  const step = period / 24;
  const end = Math.min(lead + LEN, 1900);
  // strength is stepped into 4 levels so each band is a handful of batched fills, not hundreds
  const LEVELS = 4;
  const paths = POOLS.map(() => Array.from({ length: LEVELS }, () => new Path2D()));
  for (let d = Math.max(lead, 26); d < end; d += step) {
    const v = prof[Math.floor((((d - lead) % period) / period) * 96) % 96];
    const a = v * dark(d);
    if (a < 0.04) continue;
    const lv = Math.min(LEVELS - 1, Math.floor(a * LEVELS));
    const d2 = d + step;
    POOLS.forEach(([w], i) => {
      const path = paths[i][lv];
      path.moveTo(sx(SIDE_X, d), sy(SKIRT, d));
      path.lineTo(sx(SIDE_X, d2), sy(SKIRT, d2));
      path.lineTo(sx(SIDE_X + w, d2), sy(SKIRT, d2));
      path.lineTo(sx(SIDE_X + w, d), sy(SKIRT, d));
      path.closePath();
    });
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  POOLS.forEach(([, k], i) => paths[i].forEach((path, lv) => {
    ctx.fillStyle = `rgba(255, 196, 96, ${(k * (lv + 0.5) / LEVELS).toFixed(3)})`;
    ctx.fill(path);
  }));
  ctx.restore();
}

function noseRect(d) {
  const by = bounce();
  const l = sx(SIDE_X - WIDE, d);
  const r = sx(SIDE_X, d);
  const t = sy(ROOF - 8 + by, d);
  return { l, t, w: r - l, h: sy(SKIRT + 4 + by, d) - t };
}

function trainNose(d, img, alpha) {
  if (d < 14 || !img) return;
  const n = noseRect(d);
  ctx.globalAlpha = alpha * dark(d);
  ctx.drawImage(pic(img), n.l, n.t, n.w, n.h);
  ctx.globalAlpha = 1;
}

function headlights(d, glow, alpha = 1) {
  if (d < 14 || alpha <= 0) return;
  const n = noseRect(d);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;
  [0.14, 0.86].forEach((fx) => {
    const x = n.l + n.w * fx;
    const y = n.t + n.h * 0.74;
    const r = Math.max(10, n.w * 0.32) * glow;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,252,236,0.95)');
    g.addColorStop(0.25, 'rgba(255,240,200,0.35)');
    g.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  });
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function speedLines(t, power) {
  if (power <= 0) return;
  ctx.strokeStyle = '#F5F5F0';
  for (let i = 0; i < 22; i++) {
    const a = 2.0 + ((i * 0.37 + t * 9.1) % 1.25); // fanning out over the train and the floor
    const r0 = 90 + ((i * 97 + t * 4100) % 760);
    const r1 = r0 + 180 + (i % 4) * 120;
    ctx.globalAlpha = 0.7 * power;
    ctx.lineWidth = 2 + (i % 3) * 2.2;
    ctx.beginPath();
    ctx.moveTo(VP.x + Math.cos(a) * r0, VP.y + Math.sin(a) * r0 * 0.7);
    ctx.lineTo(VP.x + Math.cos(a) * r1, VP.y + Math.sin(a) * r1 * 0.7);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/* a solid red copy of an image (keeps its shape), for the afterimages */
const reds = new Map();
function tinted(img) {
  const w = img?.naturalWidth || img?.width; // an <img> or a canvas
  if (!w) return null;
  if (reds.has(img)) return reds.get(img);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = img.naturalHeight || img.height;
  const g = c.getContext('2d');
  g.drawImage(pic(img), 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = '#E5191C';
  g.fillRect(0, 0, c.width, c.height);
  reds.set(img, c);
  return c;
}

/* anime afterimages: shaken-loose copies of the train, red then white, a little bigger and
   behind it, so they streak out past its roof and nose like an echo of its speed (the train
   itself stays gray/white with its red stripe: never a red wash) */
function afterimages(lead, kk, img, power) {
  if (power <= 0) return;
  const redSide = tinted(sideArt());
  const redNose = tinted(img);
  [[1.12, sideArt(), img, 0.22], [1.06, redSide, redNose, 0.75]].forEach(([z, tex, im, a]) => {
    ctx.save();
    ctx.translate(VP.x, VP.y);
    ctx.scale(z, z);
    ctx.translate(-VP.x, -VP.y);
    if (tex) trainSide(lead, kk * z, a * power, tex);
    if (im) trainNose(lead, im, a * power);
    ctx.restore();
  });
}

function draw() {
  if (!under) return;
  const { k, ox, oy, kk } = mapping();
  [under, over].forEach((g) => {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, cv.width, cv.height);
    g.setTransform(k, 0, 0, k, ox, oy);
  });
  ctx = under;
  const t = state?.t ?? 0;
  if (!state) drawTrash(t); // at rest; during the shot it is drawn in front of the car, below
  // the GPU layer: drawn only while the train runs (made on first use, cleared at rest)
  const r = state && gpuOK ? gpu() : sideGL;
  try {
    glOn = Boolean(r && gpuOK && r.begin(cv.width, cv.height) && state);
  } catch {
    dropGPU();
  }
  if (!state) return;
  const lead = leadAt(t);
  const img = nose?.complete && nose.naturalWidth ? nose : null;
  afterimages(lead, kk, img, Math.max(0, Math.min(1, (MOUTH + 200 - lead) / 500)));
  trainSide(lead, kk, 1, sideArt(), { mat: 1, refl: 1 }); // mirrored in the glossy floor
  trainSide(lead, kk, 1, sideArt(), { mat: 1 }); // the car: heavy cel-shaded steel
  if (glOn) ctx = over; // the side is on the GPU layer: everything in front of it goes above
  cabinLight(lead); // its warm window light on the floor, on top of the reflection (light adds up)
  seam(lead);
  // the trash lies on the platform, between the camera and the car, so it is drawn in front of
  // the car; against the nose it goes by depth (in front of it only once it is nearer)
  drawTrash(t, (d) => d >= lead);
  trainNose(lead, heavyNose() || img, 1);
  drawTrash(t, (d) => d < lead);
  headlights(lead, 1 + Math.max(0, 1 - lead / MOUTH) * 1.6, Math.min(1, t / 0.3)); // the lights fade up with the horn
  speedLines(t, state.lines);
  ctx = under;
}

/* ---------------------------------------------------------------- the shot */
/** Start the pass-by. Returns controls for the transition timeline:
    tick(t) to draw time t (seconds), end() to reset to the quiet platform. */
export function trainShot({ panTo = null } = {}) {
  if (!ctx || reduce()) return null;
  state = {
    t: 0,
    rumble: 0,
    lines: 0,
    trash: TRASH.map(([, y], i) => ({
      at: null,
      when: timeAt(depthOf(y) + 140), // the nose reaches it (a bit early: the air pushes first)
      push: 260 + ((i * 53) % 220),
      lift: 300 + ((i * 71) % 380),
      spin: (i % 2 ? 1 : -1) * (5 + (i % 4) * 2.5),
      flip: 9 + (i % 3) * 5,
    })),
  };
  const startPan = 0.6;
  return {
    /** time in seconds since the shot started; pan 0..1 eases the camera toward the track */
    tick(t, { rumble = 0, lines = 0, panP = 0 } = {}) {
      state.t = t;
      state.rumble = rumble;
      state.lines = lines;
      state.trash.forEach((s) => { if (s.at === null && t >= s.when) s.at = s.when; });
      pan = panTo === null ? null : startPan + (panTo - startPan) * panP;
      if (art && pan !== null) art.style.objectPosition = `${(pan * 100).toFixed(2)}% 55%`;
      draw();
    },
    /** the camera's motion at time t: {x, y} px and a scale (rumble, wheel-set thumps, air push) */
    motion(t) {
      return cameraMotion(t, this.closeness(t));
    },
    /** where the nose is (screen px), for the camera shake strength */
    closeness(t) {
      const lead = leadAt(t);
      return lead > MOUTH ? 0 : Math.min(1, 1 - (lead - 40) / (MOUTH - 40));
    },
    end() {
      state = null;
      pan = null;
      if (art) art.style.objectPosition = '';
      draw();
    },
  };
}
