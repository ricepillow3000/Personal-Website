/* The title's subway platform, alive: trash lying on the platform floor, and the PRESS START
   train that bursts out of the tunnel and roars past along the track, blowing the trash away.

   Everything is drawn on one canvas that sits exactly on top of the platform art (same box,
   same camera push), in the art's own pixel space (1600 x 914), so the train lines up with the
   tunnel and the platform edge on every screen size. The train is a real perspective plane:
   its side is cut into thin vertical strips (one per few screen pixels), each scaled for its
   depth, like an old raycaster. Its nose is our cut-out of Nano Banana's subway-car front. */

import { createSideRenderer } from './sidegl.js';
import { sharpArt } from './art.js';
import { mountStation } from './station.js';

const IW = 1600;
const IH = 914;
/* The shot's geometry (Nov 19, re-measured on the art: John, "make sure the train actually looks like
   it's intact with the train tracks"). The floor's own lines (the platform edge, the tactile strip,
   the back wall's base, the painted rails) all meet at (870, 548): that is the vanishing point. The
   old one (863, 520) came from the ceiling, so the train sat on the platform edge with the painted
   rails off to one side. Now the car runs on its own rails, centred under it, with a "mind the gap"
   opening between its side and the platform edge. World units: about 34 to a metre (the camera's
   eye is 54 above the platform, ~1.6 m; the car is 100 wide and 116 tall, ~3 m x 3.4 m). */
const VP = { x: 870, y: 548 };
const F = 1000; // at depth F, 1 world unit = 1 art pixel
const EDGE_X = -88.7; // the platform's edge (its coping), at platform level: measured on the art
const SIDE_X = -97; // the train's platform-side wall: a hand's width off the edge
/* (Nov 21, John: the tunnel "looks too skinny for the train to come out of"). The train was TALLER than the station: its
   side stood 62 over the eye and its nose was drawn stretched 9% past its own picture, to 70, while the ceiling John
   had lowered is 59 over the eye, so the roof poked through the ceiling all along the platform and filled the tunnel's
   whole height. A real subway car is ~3.6 m over the rail: the side's roof is now 50 over the eye (3.6 m over the
   rail), the nose is drawn at its picture's own shape (its dome 57), and a car is as much shorter as it is lower, so
   the art keeps its proportions. It now clears the ceiling, and the tunnel's top edge, by a hand. */
const ROOF = -50;
const SKIRT = 54; // platform level (the car's floor and the bottom of its body)
const WIDE = 100; // the train's width
const LEN = 5200; // the whole train
const RAIL_Y = 72; // the rails' heads, on the slab's sleepers
const RAILS = [SIDE_X - 27, SIDE_X - 73]; // near rail, far rail: standard gauge, centred under the car
const TIE_Y = 75; // the sleepers' top (cast into the slab: they stand only a little proud of it)
const BED_Y = 77; // the track bed
const WALL_X = -273; // where the bed meets the far wall (measured on the art)
/* (Nov 21, John: "the hole where the train comes out looks too skinny for the train"). The picture's tunnel opening is
   61.2 m down the line (1985 here), but the train used to finish fading in 7.5 m nearer (1730), so by the time it was
   fully lit it was already drawn bigger than the opening it had "come out of". Now it is whole AT the opening (where
   it is 50 px wide in a 78 px mouth) and sinks into the dark within 5.5 m behind it. */
const MOUTH = 1985; // the tunnel mouth: the portal in the art (17 art px per metre there)
const FADE = 185; // past the mouth the train and the track are lost in the tunnel's dark within this far
const TUN_X = -243; // the tunnel's own wall (7.2 m out; the station's is WALL_X): the bed inside stops at it
const START = 3430; // where the nose is when the shot opens (deep in the dark tunnel)
/* How it moves (Nov 19, John: "I want it to feel real"). It used to blast through at a constant 3600
   units a second (the car is 116 units, about 3.6 m, tall: that was ~400 km/h, gone in 0.7 s).
   Now it arrives like a real train: out of the tunnel fast, braking hard, so the nose passes the
   camera at about a third of that and the cars roll by heavily. Constant deceleration, never below
   CRAWL. leadAt(t) is where the nose is; timeAt(d) is when it gets to depth d. */
/* (Nov 21, John: "make the train come in slower"). It came out of the tunnel at 4800 a second and the nose passed the
   camera at 0.95 s. Now it enters at 3000 and brakes gently (1000 a second, each second): its lamps show in the dark
   for a third of a second, it reaches the tunnel's mouth at ~0.6 s and the nose passes the camera at ~1.5 s, so the
   eye has time to read the train, its light on the station and the station's light on it. Sounds, wind and the
   paper all follow NOSE_PASS, so they stay in step. */
const V0 = 3000; // world units a second, deep in the tunnel
const BRAKE = 1000; // units a second, per second
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
// it: their lowest painted pixel touches the spot, upright, never tilted off their base (the bag lies on its side).
const FLAT = new Set(['news', 'receipt', 'flyer', 'wrapper']);
const TRASH = [
  [600, 838, 'news', 1.2, -6],
  [700, 776, 'receipt', 0.7, 8],
  [915, 708, 'wrapper', 0.55, 5, 3], // (6th number: the piece's own seed for its flight, its old place in this list, so taking two pieces out changed nobody else's tumble)
  [986, 785, 'flyer', 0.95, -7, 4], // (Nov 22, the outside judge: "sliced by the frame". The camera shows the floor down to about y 812 and pushes in to about 776: the flyer lay ON that edge (half of it, then a sliver). It lies inside the shot now, on the same line to the vanishing point.)
  // (Nov 22: a can at [790, 902] and a cup at [1150, 905] stood below the shot: only the top of each ever poked over
  //  the bottom edge, a lid and part of a cup that read as a cropping mistake. Out, not half in.)
  [858, 664, 'ball', 0.42, 0, 6],
  [1260, 790, 'bag', 0.7, 0, 7],
  [1118, 742, 'news', 0.65, 9, 8], // (Nov 21, the full-scene scan: it lay under a guard rail's foot, half over the platform edge; now on the open floor)
  [1060, 645, 'receipt', 0.5, -5, 9],
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
let under = null; // 2D: floor, trash, light pools, the headlight wash
let over = null; // 2D on top of the GPU side: the nose, sparks, dust, headlights
let cvTop = null;
let glOn = false; // this frame's side went to the GPU layer
let gpuOK = false; // the GPU path passed its self-test on this device (until then: 2D slices)
let box = null;
let station = null; // the lights and the graffiti (src/fx/station.js)
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

/* Get the train ready once the visitor shows signs of life (moves, touches, scrolls, presses a key),
   or after 5 quiet seconds: the platform picture shows from the first moment, but its heavy set-up
   (decoding, the GPU upload) stays out of the page's first seconds (Nov 19). Pressing START
   prepares it at once anyway (hurrySubway). */
const ALIVE = ['pointermove', 'pointerdown', 'touchstart', 'keydown', 'wheel', 'scroll'];
function warmWhenAlive() {
  const go = () => {
    ALIVE.forEach((e) => window.removeEventListener(e, go, true));
    clearTimeout(timer);
    (window.requestIdleCallback || setTimeout)(kick, { timeout: 1500 });
  };
  const timer = setTimeout(go, 5000);
  ALIVE.forEach((e) => window.addEventListener(e, go, { capture: true, passive: true }));
}

/** Mount on the title's camera box (holds the platform <img>). Called once the art has loaded. */
export function mountSubway(camBox, img) {
  if (cv) return;
  box = camBox;
  art = img;
  cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden', 'true');
  box.appendChild(cv);
  // the ceiling lights and the graffiti (under the train's canvases), and the track: each in its own
  // idle moment, never in the task that shows the platform (they cost the mobile Lighthouse score)
  idle(() => { station = mountStation(box, cv); size(); }, 2000);
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
  else warmWhenAlive();
  // (Nov 21, John: "I click continue, the train does not come in"): on a slow connection the train's pictures
  // were only fetched after the tap and often weren't there in time, so the shot played an empty station. They
  // are now fetched quietly a few seconds after the platform shows (the browser keeps them; the set-up still
  // waits for the visitor), so they're usually in hand before anyone taps CONTINUE.
  setTimeout(() => { if (!artReady) { const a = load(NOSE); const b = load(SIDE); a.fetchPriority = b.fetchPriority = 'low'; } }, 2500);
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
    .then(() => slice(windowProfile));
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
  /* the drawn layer's sharpness (Nov 19, John: "keep its quality... high resolution when turning the
     phone sideways"): sideways, the track and the litter fill the bottom of a phone's screen, and at
     1.5x they looked soft on a 3x iPhone. Now up to 2x (1.5x on phones with 3 GB of memory or less) */
  const mem = navigator.deviceMemory;
  const dpr = Math.min(window.devicePixelRatio || 1, mem && mem <= 3 ? 1.5 : 2);
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
  station?.place(k, (w - IW * k) * px, (h - IH * k) * 0.55); // (follows the camera's pan too)
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
  TRASH.forEach(([x0, y0, kind, sz, tilt, seed], n) => {
    const i = seed ?? n;
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
    let grounded = 1; // its shadow's strength: gone a tenth of a second after the wind takes it
    if (state) {
      const st = state.trash[n];
      const shiver = state.rumble;
      rot += Math.sin(t * 61 + i * 7) * 0.04 * shiver; // the rumble rattles it before the wind hits
      lift = Math.abs(Math.sin(t * 47 + i * 3)) * shiver * 1.5;
      if (st.at !== null) {
        const u = t - st.at;
        grounded = Math.max(0, 1 - u * 10); // (a tumbling sheet seen edge-on left its full dark shape on the tiles: it read as a puddle)
        grow = 1 / (1 - Math.min(0.86, u * 0.9)); // swept toward the camera by the train's wind
        gx = VP.x + (x0 - VP.x) * grow - st.push * (u + u * u * 2.2);
        gy = VP.y + (y0 - VP.y) * grow;
        lift = Math.max(0, st.lift * 1.3 * u - 260 * u * u) * grow;
        rot += st.spin * u;
        const flip = Math.cos(st.flip * u);
        squash = Math.max(0.36, Math.abs(flip)); // (Nov 22: a sheet seen dead edge-on shrank to a tenth of its height, its print and ink crushed into a grey smudge with no outline, "half-formed" to the outside judge. A tumbling piece is never thinner than a third now (was 0.14): a sheet stays a drawn sheet, the bag is not a line.)
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
    const shade = fog * (1 - air) + (back && flat ? 0.3 : 0); // (a ball or a cup has no dark back; and in the air a piece is in the tubes' light: it went near black)

    // soft occlusion on the floor under it (stays down there when the piece lifts)
    ctx.save();
    ctx.translate(gx, gy);
    ctx.scale(1, flat ? fs * 0.5 : 0.22);
    const r = w * (flat ? 0.56 : 0.55) * (1 + air * 0.9); // (off the floor its shadow spreads and thins out fast: under a long
    const sh = ctx.createRadialGradient(0, 0, 0, 0, 0, r); //  row of tubes a lifted thing hardly has one. It used to stay a dark oval.)
    /* (Nov 22, the outside judge: the paper ball "hovers with nothing under it". A sheet's shadow still goes the moment the wind
       takes it (edge-on it read as a puddle), but a SOLID piece, the ball or the bag, keeps a faint spread-out shadow on the
       tiles below it, so it reads as thrown into the air over this floor and not as pasted on the picture.) */
    const down = flat ? (1 - air) ** 3 * grounded : Math.max((1 - air) ** 3, 0.45);
    sh.addColorStop(0, `rgba(0,0,0,${(flat ? 0.56 : 0.74) * down})`); sh.addColorStop(0.55, `rgba(0,0,0,${(flat ? 0.2 : 0.3) * down})`);
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
        piece(trash.ink, 0.5 * (1 - air) ** 3 * grounded);
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
      // (Nov 21, John: "the bag kind of looks like it's floating... make sure they're laying down"): the painted
      // bag stood on one tipped corner, so it lies on its SIDE now (turned a quarter, a little flatter), its long
      // side along the floor. Every standing piece also gets a hard contact shadow right where it touches.
      const side = kind === 'bag';
      const ext = side ? w * 0.72 : h; // its height on screen
      const foot = side ? h * 0.92 : w * 0.5; // its contact's width
      if (air < 0.9) {
        ctx.save();
        ctx.translate(gx, gy);
        ctx.fillStyle = `rgba(0, 0, 0, ${0.55 * (1 - air) ** 3})`; // (a solid piece's contact line follows its height alone: it came back to the floor with no shadow at all)
        ctx.beginPath();
        ctx.ellipse(0, 0, foot * 0.5, Math.max(1.2, foot * 0.06), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (side) {
        ctx.save();
        ctx.translate(gx, gy - lift - (ext / 2) * squash + ext * 0.1); // (+0.1: its folded bottom panel is drawn inset; this rests that panel on the floor)
        ctx.rotate(rot + Math.PI / 2 + 0.085); // (+0.085: the painted bag leans; this sets its long side flat on the tiles)
        ctx.scale(0.72 * squash, 1);
        piece(trash.lit, 1);
        if (shade > 0.02) piece(trash.ink, Math.min(0.8, shade));
        ctx.restore();
        ctx.globalAlpha = 1;
        return;
      }
      // standing: its lowest pixel on the spot. (Nov 21, the full-scene scan: the faint mirror image that used to be
      // drawn under it read as a ghost copy on the matt tiles; the contact shadow above grounds it on its own.)
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
const BAY = ((54 + 50) * 2770) / 1828; // one door-to-door repeat of the side art (SKIRT - ROOF tall, the art is 2770 x 1828), in world units
const SIDE_OFF = 0.15; // the side starts on a plain panel of the art (the same number as OFF in sidegl.js)
const CAR = 4 * BAY; // one car: four door bays (18.7 m), so the gangways fall on the art's plain panels
const PASS_D = 40; // a wheel set "passes the camera" at this depth
const AXLES = [];
// (the leading bogie sits right behind the skirt: its first wheels stand under the nose art's two feet)
for (let c = 0; c < 5; c++) for (const b of [c ? 90 : 48, CAR - 90]) for (const a of [-32, 32]) AXLES.push(c * CAR + b + a);
export const NOSE_PASS = timeAt(PASS_D); // when the nose passes the camera (~0.95 s, braking)
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

/* ---------------------------------------------------------------- the track and the running gear
   (Nov 19, John: "make sure the train actually looks like it's intact with the train tracks, and the
   train tracks look fully generated, not half generated"). The painted rails didn't line up with the
   car (and had sleepers on one side only), so the whole track bed is drawn here, in the train's own
   perspective: the bed, concrete sleepers, both rails (a polished head on a dark web) with their
   clips, the far wall's kerb and the shadow under the platform's lip. (Nov 20, John: "fix the
   hallucination part on the train tracks... fully built... you can see the bolts, the two big rails and
   the things holding it down": the ballast is crushed stone now, every tie carries base plates, two
   bolts and spring clips per rail, and the rails have a foot, a web and a head.) Everything below platform level
   is cut to the wedge the platform doesn't hide (left of its edge, as seen from the camera), so the
   near rail shows in the "mind the gap" opening beside the car, where its wheels ride and spark. */
const P = (X, Y, d) => [sx(X, d), sy(Y, d)];
function pitClip(g) {
  const [ax, ay] = P(EDGE_X, SKIRT, 25);
  const [bx, by] = P(WALL_X, BED_Y, 25);
  g.beginPath();
  g.moveTo(VP.x, VP.y);
  g.lineTo(ax, ay);
  g.lineTo(ax, Math.max(ay, by) + 4000);
  g.lineTo(bx - 4000, Math.max(ay, by) + 4000);
  g.lineTo(bx, by);
  g.lineTo(...P(WALL_X, BED_Y, MOUTH)); // the station's wall, to the portal
  g.lineTo(...P(TUN_X, BED_Y, MOUTH)); // the jamb's foot: inside, the bed runs only as far as the tunnel's own wall
  g.closePath();
  g.clip();
}
const quad = (g, pts) => {
  g.beginPath();
  g.moveTo(...pts[0]);
  for (let i = 1; i < pts.length; i++) g.lineTo(...pts[i]);
  g.closePath();
};
const TRACK_FAR = MOUTH + FADE; // past here it is lost in the tunnel's dark
function drawTrack(g, kk) {
  g.save();
  pitClip(g);
  const ink = Math.max(0.6, 0.9 / kk);
  /* (Nov 21, John: "the train tracks look a little bit too simple and too bland... full, drawn out designs that
     match our current design"). The bed is built the way the station's walls and floor are: big flat pieces, each
     its own aged shade of one warm concrete, ink joints, and the wear a real slab track carries. Far wall to
     platform: grime at the wall's foot, a CABLE TROUGH under concrete covers (each cover its own shade, two lifting
     slots), a drain beside it, the slab cast in bays with a construction joint along it, rust washed off each rail
     onto the slab, an oil and brake-dust streak between the rails, a grated drain down the middle, and the
     platform's shadow. Flat cel tones, no noise; the same on every visit (shades are seeded). */
  const MID = (RAILS[0] + RAILS[1]) / 2;
  const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const strip = (xa, xb, d0, d1, y = BED_Y) => quad(g, [P(xa, y, d0), P(xb, y, d0), P(xb, y, d1), P(xa, y, d1)]);
  const tone = (c, f, v = 1) => `rgb(${c.map((n, i) => Math.round([10, 10, 11][i] + (Math.min(255, n * f) - [10, 10, 11][i]) * v)).join(', ')})`;
  const steps = (fn) => { for (let d = 20, n; d < TRACK_FAR; d = n) { n = d * 1.12 + 6; const v = dark(d); if (v > 0.02) fn(d, n + 1, v); } };
  const BAY = 150; // a bay of slab, about 4.4 m, between expansion joints
  const TROUGH = [WALL_X + 3, WALL_X + 21];
  // the slab, bay by bay (each its own shade; inside the tunnel it sinks into the dark in a few steps)
  for (let k = 0, d0 = 20; d0 < TRACK_FAR; k++) {
    const d1 = 30 + BAY * k;
    const parts = d1 > MOUTH ? 4 : 1;
    for (let q = 0; q < parts; q++) {
      const a0 = d0 + ((d1 - d0) * q) / parts; const a1 = d0 + ((d1 - d0) * (q + 1)) / parts;
      const v = dark((a0 + a1) / 2);
      g.fillStyle = tone([56, 53, 47], 0.9 + 0.2 * hash(k), v); // (a step under the platform's floor: it is down in the pit)
      strip(WALL_X, EDGE_X, a0, a1 + 1);
      g.fill();
    }
    d0 = d1;
  }
  // the slab was cast in two strips: a construction joint along it, the wall-side strip a shade darker
  steps((d, n, v) => { g.fillStyle = `rgba(0, 0, 0, ${0.1 * v})`; strip(TROUGH[1], RAILS[1] - 52, d, n); g.fill(); });
  // rust washed off each rail onto the slab, and the oil and brake-dust streak between the rails (two cel steps each)
  steps((d, n, v) => {
    RAILS.forEach((rx) => {
      g.fillStyle = `rgba(126, 66, 32, ${0.15 * v})`; strip(rx - 11, rx + 11, d, n); g.fill();
      g.fillStyle = `rgba(126, 66, 32, ${0.17 * v})`; strip(rx - 6, rx + 6, d, n); g.fill();
    });
    g.fillStyle = `rgba(0, 0, 0, ${0.16 * v})`; strip(MID - 17, MID + 17, d, n); g.fill();
    g.fillStyle = `rgba(0, 0, 0, ${0.16 * v})`; strip(MID - 11, MID + 11, d, n); g.fill();
  });
  // expansion joints straight across the slab, between the bays
  for (let d = 30; d < TRACK_FAR; d += BAY) {
    const v = dark(d);
    if (v <= 0.03) continue;
    g.strokeStyle = `rgba(6, 6, 8, ${0.85 * v})`;
    g.lineWidth = Math.max(ink * 0.8, (F / d) * 0.5);
    g.beginPath(); g.moveTo(...P(TROUGH[1], BED_Y - 0.1, d)); g.lineTo(...P(EDGE_X, BED_Y - 0.1, d)); g.stroke();
  }
  steps((d, n, v) => {
    // the construction joint's ink line
    g.strokeStyle = `rgba(6, 6, 8, ${0.7 * v})`;
    g.lineWidth = Math.max(ink * 0.7, (F / d) * 0.3);
    g.beginPath(); g.moveTo(...P(RAILS[1] - 52, BED_Y - 0.1, d)); g.lineTo(...P(RAILS[1] - 52, BED_Y - 0.1, n)); g.stroke();
    // grime where the slab meets the wall, and the drain beside the trough (a dark gutter, its far lip lit)
    g.fillStyle = `rgba(0, 0, 0, ${0.5 * v})`; strip(WALL_X, TROUGH[0], d, n); g.fill();
    g.fillStyle = `rgba(8, 8, 10, ${0.9 * v})`; strip(TROUGH[1] + 2, TROUGH[1] + 7, d, n, BED_Y - 0.2); g.fill();
    g.fillStyle = `rgba(150, 142, 126, ${0.5 * v})`; strip(TROUGH[1] + 7, TROUGH[1] + 8.2, d, n, BED_Y - 0.3); g.fill();
    // the centre drain between the rails: a gutter with lit lips
    g.fillStyle = `rgba(8, 8, 10, ${0.92 * v})`; strip(MID - 6, MID + 6, d, n, BED_Y - 0.2); g.fill();
    g.fillStyle = `rgba(150, 142, 126, ${0.55 * v})`; strip(MID - 7.5, MID - 6, d, n, BED_Y - 0.3); g.fill();
  });
  // the centre drain's grating (cast-iron bars across it; they drop out far down the line)
  for (let d = 24; d < 1300; d += 9) {
    if (F / d < 0.75) break;
    g.fillStyle = 'rgba(112, 106, 94, 0.85)';
    strip(MID - 5.2, MID + 5.2, d, d + 2.2, BED_Y - 0.4);
    g.fill();
  }
  // the cable trough's covers: precast concrete, one every 0.9 m, each its own shade, two lifting slots, ink joints
  for (let i = 0, d = 20; d < TRACK_FAR; i++, d += 30) {
    const v = dark(d + 15);
    if (v <= 0.02) continue;
    const sc = F / d;
    g.fillStyle = tone([80, 75, 66], 0.88 + 0.24 * hash(i + 7), v);
    strip(TROUGH[0], TROUGH[1], d, d + 31);
    g.fill();
    if (sc > 0.45) {
      g.strokeStyle = `rgba(6, 6, 8, ${0.8 * v})`;
      g.lineWidth = Math.max(ink * 0.7, sc * 0.3);
      g.beginPath(); g.moveTo(...P(TROUGH[0], BED_Y - 0.1, d)); g.lineTo(...P(TROUGH[1], BED_Y - 0.1, d)); g.stroke();
    }
    if (sc > 0.9) {
      g.fillStyle = 'rgba(8, 8, 10, 0.85)';
      [5, 13].forEach((o) => { strip(TROUGH[0] + o - 1.6, TROUGH[0] + o + 1.6, d + 13, d + 18, BED_Y - 0.1); g.fill(); });
    }
  }
  steps((d, n, v) => { // the trough's long edges, inked; a thin light along the edge that faces the tubes
    g.strokeStyle = `rgba(6, 6, 8, ${0.85 * v})`;
    g.lineWidth = Math.max(ink * 0.8, (F / d) * 0.35);
    TROUGH.forEach((x) => { g.beginPath(); g.moveTo(...P(x, BED_Y - 0.1, d)); g.lineTo(...P(x, BED_Y - 0.1, n)); g.stroke(); });
    g.fillStyle = `rgba(170, 160, 140, ${0.35 * v})`; strip(TROUGH[1] - 1.6, TROUGH[1] - 0.4, d, n, BED_Y - 0.15); g.fill();
  });
  // the sleepers: heavy concrete ties every 0.6 m, a lit top, a darker face toward the camera and its end,
  // bold ink edges, a chipped corner now and then; on each, under each rail, a steel base plate held down
  // by two bolts (hex heads with a lit face) and a spring clip over the rail's foot. Close up you see every
  // part; far down the line the small parts drop out before they turn into noise.
  const x0 = RAILS[1] - 22;
  const x1 = RAILS[0] + 22;
  const ties = [];
  for (let d = 18; d < TRACK_FAR; d += 25) ties.push(d); // (a touch wider than real: seen this low, 0.6 m read as a solid stack)
  // (far to near: seen this low, each tie's top lies under the next one out, so the near ones paint last)
  ties.slice().reverse().forEach((d, ri) => {
    const ti = ties.length - 1 - ri;
    const v = dark(d);
    if (v <= 0.02) return;
    const e = d + 8;
    const sc = F / d; // screen px per world unit here
    g.globalAlpha = v;
    const tv = 0.9 + 0.2 * hash(ti + 40); // (each tie its own shade of the same warm concrete, like the tiles)
    g.fillStyle = 'rgba(0, 0, 0, 0.58)'; // its contact shadow on the slab, toward the camera (hard: it sits ON the slab)
    strip(x0 - 1.5, x1, d - 4, d + 0.5, BED_Y - 0.05);
    g.fill();
    g.fillStyle = tone([52, 48, 41], tv); // its front face
    quad(g, [P(x0, TIE_Y, d), P(x1, TIE_Y, d), P(x1, BED_Y, d), P(x0, BED_Y, d)]);
    g.fill();
    g.fillStyle = tone([40, 37, 32], tv); // its end, toward the camera
    quad(g, [P(x1, TIE_Y, d), P(x1, BED_Y, d), P(x1, BED_Y, e), P(x1, TIE_Y, e)]);
    g.fill();
    g.fillStyle = tone([100, 94, 82], tv); // the lit top (down in the pit: clearly dimmer than the platform's floor)
    quad(g, [P(x0, TIE_Y, d), P(x1, TIE_Y, d), P(x1, TIE_Y, e), P(x0, TIE_Y, e)]);
    g.fill();
    g.fillStyle = tone([126, 119, 104], tv); // the light along its near edge
    quad(g, [P(x0, TIE_Y, d), P(x1, TIE_Y, d), P(x1, TIE_Y, d + 1.2), P(x0, TIE_Y, d + 1.2)]);
    g.fill();
    if (ti % 5 === 2 && sc > 1.2) { // a chipped corner
      g.fillStyle = tone([52, 48, 41], tv);
      quad(g, [P(x1 - 7, TIE_Y, d), P(x1, TIE_Y, d), P(x1, TIE_Y, d + 3), P(x1 - 3, TIE_Y, d + 1.6)]);
      g.fill();
    }
    g.strokeStyle = 'rgba(6, 6, 8, 0.9)';
    g.lineWidth = Math.max(ink, sc * 0.35);
    quad(g, [P(x0, TIE_Y, d), P(x1, TIE_Y, d), P(x1, TIE_Y, e), P(x0, TIE_Y, e)]);
    g.stroke();
    quad(g, [P(x0, BED_Y, d), P(x0, TIE_Y, d), P(x1, TIE_Y, d), P(x1, BED_Y, d)]);
    g.stroke();
    // the fastenings (and, under each, the rust the rail has bled onto the tie's top)
    RAILS.forEach((rx) => {
      const y = TIE_Y - 0.5;
      g.fillStyle = 'rgba(126, 66, 32, 0.3)';
      strip(rx - 13, rx + 13, d + 0.6, e - 0.4, TIE_Y - 0.05);
      g.fill();
      g.fillStyle = '#5F5850'; // the base plate: steel gone brown with rust and brake dust, an ink edge, its front edge in shade
      quad(g, [P(rx - 7.5, y, d + 1), P(rx + 7.5, y, d + 1), P(rx + 7.5, y, d + 7), P(rx - 7.5, y, d + 7)]);
      g.fill();
      g.strokeStyle = 'rgba(4, 4, 6, 0.9)';
      g.lineWidth = Math.max(ink * 0.8, sc * 0.25);
      g.stroke();
      g.fillStyle = '#35302B';
      quad(g, [P(rx - 7.5, y, d + 1), P(rx + 7.5, y, d + 1), P(rx + 7.5, y + 0.5, d + 1), P(rx - 7.5, y + 0.5, d + 1)]);
      g.fill();
      if (sc < 0.9) return; // (too far: the bolts would be specks)
      [-5.4, 5.4].forEach((o) => { // two bolts: a washer, then a hex head with a lit top face
        const [bx, by] = P(rx + o, y - 0.4, d + 4);
        const br = sc * 1.55;
        g.fillStyle = '#16171A'; // the washer
        g.beginPath(); g.ellipse(bx, by + br * 0.12, br * 1.25, br * 0.7, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#B5AE9F';
        g.beginPath();
        for (let k = 0; k < 6; k++) { const t = (k / 6) * Math.PI * 2 + Math.PI / 6; g[k ? 'lineTo' : 'moveTo'](bx + Math.cos(t) * br, by - br * 0.25 + Math.sin(t) * br * 0.56); }
        g.closePath(); g.fill();
        g.strokeStyle = 'rgba(4, 4, 6, 0.95)';
        g.lineWidth = Math.max(0.5, sc * 0.22);
        g.stroke();
        g.fillStyle = '#6F685C'; // the head's side, in shade
        quad(g, [[bx - br, by - br * 0.25], [bx + br, by - br * 0.25], [bx + br, by + br * 0.18], [bx - br, by + br * 0.18]]);
        g.fill();
        g.fillStyle = '#F4EEDD'; // a glint
        g.beginPath(); g.ellipse(bx - br * 0.35, by - br * 0.42, br * 0.32, br * 0.16, 0, 0, Math.PI * 2); g.fill();
      });
      [-2.9, 2.9].forEach((o) => { // the spring clips gripping the rail's foot
        const s0 = Math.sign(o);
        g.strokeStyle = '#B4AC9C';
        g.lineWidth = Math.max(0.6, sc * 0.55);
        g.beginPath();
        g.moveTo(...P(rx + o + s0 * 2.4, y - 0.4, d + 2.4));
        g.quadraticCurveTo(...P(rx + o + s0 * 3.4, y - 1.6, d + 4), ...P(rx + o, y - 0.9, d + 5.6));
        g.stroke();
        g.strokeStyle = 'rgba(4, 4, 6, 0.85)';
        g.lineWidth = Math.max(0.4, sc * 0.18);
        g.stroke();
      });
    });
  });
  g.globalAlpha = 1;
  // each rail's own shadow on the ties and the slab, on the side away from the tubes (they hang over the platform,
  // to the right): one hard strip, so the rail stands ON the track instead of lying drawn across it
  /* (Nov 21, John: "the shadows, I can see the layers, make sure it's blended in"). A shadow here is one smooth fall of
     light, never stacked bands. Every line of equal shade on the track runs to the vanishing point, so the shade is a
     matter of ANGLE round that point: one conic gradient, one fill, no steps and no seams at any distance. It only
     darkens what is already drawn (source-atop), so the track's own fade into the tunnel is kept. `stops` are
     [x, y, darkness] across the track, from the edge nearest the platform outward. */
  const cone = (x0, x1, y0, y1, stops) => {
    if (!g.createConicGradient) return false; // (an old browser: the caller draws plain steps)
    const ang = stops.map(([x, y]) => Math.atan2(y, x));
    const gr = g.createConicGradient(ang[0], VP.x, VP.y);
    stops.forEach(([, , a], q) => gr.addColorStop(Math.max(0, Math.min(1, (ang[q] - ang[0]) / (2 * Math.PI))), `rgba(3, 3, 5, ${Math.max(0, a).toFixed(3)})`));
    g.save();
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = gr;
    quad(g, [P(x0, y0, 20), P(x1, y1, 20), P(x1, y1, TRACK_FAR), P(x0, y0, TRACK_FAR)]);
    g.fill();
    g.restore();
    return true;
  };
  // each rail's own shadow on the ties and the slab, on the side away from the tubes (they hang over the platform)
  RAILS.forEach((rx) => {
    const y = TIE_Y - 0.06;
    if (!cone(rx - 2.4, rx - 11, y, y, [[rx - 2.4, y, 0.44], [rx - 6, y, 0.21], [rx - 11, y, 0]])) {
      steps((d, n, v) => { g.fillStyle = `rgba(0, 0, 0, ${0.3 * v})`; strip(rx - 9.5, rx - 2.6, d, n, y); g.fill(); });
    }
  });
  // the rails: a wide foot on the plates, a dark web (its side toward the camera), and a polished head
  // that catches the station's light, inked along both edges. Near the camera they are drawn as solid
  // shapes; far away the head is a stroke never thinner than ~1.6 screen px, so they read all the way
  // into the tunnel (Nov 19, John: "the train tracks look too blended in... fully visible")
  const minHead = 1.6 / kk; // (art px per 1.6 screen px)
  RAILS.forEach((rx) => {
    for (let d = 20, n; d < TRACK_FAR; d = n) {
      n = d * 1.1 + 5;
      const v = dark(d);
      g.globalAlpha = v;
      const sc = F / d;
      g.fillStyle = '#2A1D16'; // the foot (rust-dark)
      quad(g, [P(rx - 2.6, TIE_Y - 1, d), P(rx + 2.8, TIE_Y - 1, d), P(rx + 2.8, TIE_Y - 1, n + 1), P(rx - 2.6, TIE_Y - 1, n + 1)]);
      g.fill();
      g.fillStyle = '#5A3524'; // the web, toward the camera: rail steel is rust-brown everywhere the wheels don't polish it
      quad(g, [P(rx + 1.3, RAIL_Y + 0.6, d), P(rx + 1.3, TIE_Y - 1, d), P(rx + 1.3, TIE_Y - 1, n + 1), P(rx + 1.3, RAIL_Y + 0.6, n + 1)]);
      g.fill();
      if (sc > 0.8) { // the head as a solid bar with ink edges
        g.fillStyle = '#B8B2A3';
        quad(g, [P(rx - 1.3, RAIL_Y, d), P(rx + 1.3, RAIL_Y, d), P(rx + 1.3, RAIL_Y, n + 1), P(rx - 1.3, RAIL_Y, n + 1)]);
        g.fill();
        g.fillStyle = '#857A6A'; // its rounded side, in shade
        quad(g, [P(rx + 1.3, RAIL_Y, d), P(rx + 1.3, RAIL_Y + 0.9, d), P(rx + 1.3, RAIL_Y + 0.9, n + 1), P(rx + 1.3, RAIL_Y, n + 1)]);
        g.fill();
        g.strokeStyle = 'rgba(6, 6, 8, 0.95)';
        g.lineWidth = Math.max(ink, sc * 0.3);
        [[-1.3, 0], [1.3, 0.9], [2.8, 2.9]].forEach(([o, dy]) => {
          g.beginPath();
          g.moveTo(...P(rx + o, RAIL_Y + dy, d));
          g.lineTo(...P(rx + o, RAIL_Y + dy, n + 1));
          g.stroke();
        });
      } else {
        g.strokeStyle = 'rgba(6, 6, 8, 0.95)'; // the ink line along its foot
        g.lineWidth = Math.max(ink, sc * 0.6);
        g.beginPath();
        g.moveTo(...P(rx + 1.6, TIE_Y, d));
        g.lineTo(...P(rx + 1.6, TIE_Y, n + 1));
        g.stroke();
        g.strokeStyle = '#B8B2A3'; // the head (a stroke, so it keeps a visible width far away)
        g.lineWidth = Math.max(minHead, sc * 2.6);
        g.beginPath();
        g.moveTo(...P(rx, RAIL_Y, d));
        g.lineTo(...P(rx, RAIL_Y, n + 1));
        g.stroke();
      }
      g.strokeStyle = '#FFF9EA'; // its shine (the tubes are warm)
      g.lineWidth = Math.max(minHead * 0.45, sc * 0.6);
      g.beginPath();
      g.moveTo(...P(rx - 0.3, RAIL_Y, d));
      g.lineTo(...P(rx - 0.3, RAIL_Y, n));
      g.stroke();
    }
    g.globalAlpha = 1;
  });
  /* (Nov 21, John: "ensure the leveling is absolutely correct, the track bed and the tracks lower than the walking
     platform, and you can see it very clearly"). The track is 0.68 m under the platform in the model (bed 77 against
     the platform's 54), but seen from the platform the near rail lies right past the lip, so it read as lying ON the
     edge. What tells the eye "down there": the platform's own shade falls over everything under its lip, the tie
     ends and the near rail too (not only the slab), deepest right under the edge, in hard cel steps; so the lit
     coping stands bright over a dark drop, and the ties visibly run in under it. The near rail keeps a dim line of
     light on its head so the track still reads whole. */
  // (blended: one smooth fall from deep shade at the lip to the lit slab past the far rail; what the eye sees past the
  // lip starts ~38 out. It was two hard steps, and the steps showed as layers.)
  const lipShade = [[EDGE_X, SKIRT, 0.86], [EDGE_X - 44, BED_Y, 0.82], [EDGE_X - 52, BED_Y, 0.7], [EDGE_X - 61, BED_Y, 0.52],
    [EDGE_X - 71, BED_Y, 0.32], [EDGE_X - 81, BED_Y, 0.15], [EDGE_X - 90, BED_Y, 0.05], [EDGE_X - 97, BED_Y, 0]];
  if (!cone(EDGE_X, EDGE_X - 97, SKIRT, BED_Y, lipShade)) {
    steps((d, n, v) => [[74, 0.34], [51, 0.62]].forEach(([w, al]) => { g.fillStyle = `rgba(4, 4, 6, ${al * v})`; quad(g, [P(EDGE_X, SKIRT, d), P(EDGE_X - w, BED_Y, d), P(EDGE_X - w, BED_Y, n), P(EDGE_X, SKIRT, n)]); g.fill(); }));
  }
  steps((d, n, v) => {
    g.strokeStyle = `rgba(214, 208, 192, ${0.38 * v})`;
    g.lineWidth = Math.max(minHead * 0.5, (F / d) * 0.7);
    g.beginPath(); g.moveTo(...P(RAILS[0] - 0.2, RAIL_Y, d)); g.lineTo(...P(RAILS[0] - 0.2, RAIL_Y, n)); g.stroke();
  });
  g.restore();
}
let trackCache = null;
let trackKey = '';
/** the track, drawn once per screen size / camera framing, then stamped every frame */
let trackIdle = 0; // 0: nothing pending, 1: waiting for an idle moment, 2: that moment has come
function stampTrack(kk) {
  const m = under.getTransform();
  const key = `${cv.width}x${cv.height}:${m.a.toFixed(4)},${m.e.toFixed(1)},${m.f.toFixed(1)}`;
  if (key !== trackKey) {
    if (!state && trackIdle !== 2) { // at rest: draw it in an idle moment (never in the platform's first task)
      if (trackIdle === 0) {
        trackIdle = 1;
        idle(() => { trackIdle = 2; draw(); }, 2000).catch(() => { trackIdle = 0; });
      }
      if (!trackCache) return;
    } else { // the shot needs it now
      trackCache ||= document.createElement('canvas');
      trackCache.width = cv.width;
      trackCache.height = cv.height;
      const g = trackCache.getContext('2d');
      g.setTransform(m);
      drawTrack(g, kk);
      trackKey = key;
      trackIdle = 0;
    }
  }
  under.save();
  under.setTransform(1, 0, 0, 1, 0, 0);
  under.drawImage(trackCache, 0, 0);
  under.restore();
}

/* The running gear: every wheel set is a real solid standing on the rails (a tyre, a face, a hub, an axle between the
   two wheels), drawn before the car so the car's side and its nose cover what they would cover. Through the gap by
   the platform you see the near wheels and the bogie frames from above; under the nose you see the leading wheel set
   from the front, right under the two feet the nose art itself draws below its skirt.
   (Nov 22, John, with a close-up of the nose's underside: "the textures and the dimensions are not matching up to the
   train... no hallucinated art... make sure it looks fully drawn out". What was there: a second coupler, an
   "underframe" slab and a "rail guard" bar on two posts, all flat quads drawn UNDER a nose whose art already has its
   own coupler, underframe and skirt; lit grey, they read as loose boxes floating over the track. All of it is gone.
   What a train has under its skirt is its leading wheel set, so that is what is drawn: two wheels 0.77 m across on
   the two rails (the art's feet sit over them to the centimetre), the far one's flange hanging inside its rail, the
   axle between them; steel in the car's own shade, the art's ink weight round every part.) */
const WHEEL_R = 13; // 0.77 m across
const WHEEL_W = 2.7; // half the tyre's width
const INK = 'rgba(5, 6, 9, 0.96)';
const hull = (pts) => { // the outline of a set of points (a solid's silhouette)
  const p = pts.slice().sort((u, v) => u[0] - v[0] || u[1] - v[1]);
  const cr = (o, u, v) => (u[0] - o[0]) * (v[1] - o[1]) - (u[1] - o[1]) * (v[0] - o[0]);
  const half = (list) => { const h = []; for (const q of list) { while (h.length > 1 && cr(h[h.length - 2], h[h.length - 1], q) <= 0) h.pop(); h.push(q); } h.pop(); return h; };
  return half(p).concat(half(p.reverse()));
};
const ring = (X, cy, dc, r, a0 = 0, a1 = Math.PI * 2, n = 28) => Array.from({ length: n + 1 }, (_, i) => { const th = a0 + ((a1 - a0) * i) / n; return P(X, cy + Math.sin(th) * r, dc + Math.cos(th) * r); });
const path = (pts, close = true) => { ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); if (close) ctx.closePath(); };
/** one wheel on rail rx at depth dc: `lt` is how much of the station's light is on it, `flange` puts the flange on the side we see */
function wheel(rx, dc, lt, flange) {
  const R = WHEEL_R;
  const cy = RAIL_Y - 0.9 - R; // it stands on the rail's head
  const lw = Math.max(0.55, (F / dc) * 0.3); // the nose art's own line weight
  const tone = (r, g, b) => `rgb(${Math.round(r * lt)}, ${Math.round(g * lt)}, ${Math.round(b * lt)})`;
  const xf = rx + WHEEL_W; // the face turned to the platform (the camera stands on it)
  const xb = rx - WHEEL_W;
  const rf = flange ? R + 1.3 : R;
  const face = ring(xf, cy, dc, rf);
  ctx.lineJoin = 'round';
  // the tyre: the whole solid's outline, in polished steel that sits in the car's shade
  path(hull(face.concat(ring(xb, cy, dc, R))));
  ctx.fillStyle = tone(33, 40, 52); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.stroke();
  // the running band the rail keeps bright, round the front of the tyre
  const a0 = Math.PI * 0.52; const a1 = Math.PI * 1.46;
  path(ring(rx + 1.5, cy, dc, R, a0, a1, 16).concat(ring(rx - 0.5, cy, dc, R, a1, a0, 16)));
  ctx.fillStyle = tone(70, 81, 99); ctx.fill();
  // its face: the tyre's rim, the dished web, the hub
  path(face); ctx.fillStyle = tone(28, 34, 45); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.stroke();
  path(ring(xf, cy, dc, R * 0.8)); ctx.fillStyle = tone(15, 19, 26); ctx.fill(); ctx.lineWidth = lw * 0.7; ctx.stroke();
  path(ring(xf, cy, dc, R * 0.8, Math.PI * 0.62, Math.PI * 1.3, 12), false); // the light that gets under the skirt, on the web's front edge
  ctx.strokeStyle = tone(58, 68, 85); ctx.lineWidth = lw * 0.8; ctx.stroke();
  path(ring(xf, cy, dc, R * 0.3)); ctx.fillStyle = tone(34, 41, 54); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = lw * 0.7; ctx.stroke();
  path(ring(xf, cy, dc, R * 0.11, 0, Math.PI * 2, 10)); ctx.fillStyle = tone(12, 14, 19); ctx.fill();
}
/** a whole wheel set seen from the front: the far wheel, the axle, the near wheel */
function wheelSet(dc, lt) {
  const cy = RAIL_Y - 0.9 - WHEEL_R;
  const r = 2.7;
  wheel(RAILS[1], dc, lt, true);
  const x0 = RAILS[1] + WHEEL_W; const x1 = RAILS[0] - WHEEL_W;
  const top = sy(cy - r, dc); const bot = sy(cy + r, dc);
  const g = ctx.createLinearGradient(0, top, 0, bot); // a round bar: lit along its top, dark underneath
  const c = (v, al) => `rgb(${Math.round(v[0] * al)}, ${Math.round(v[1] * al)}, ${Math.round(v[2] * al)})`;
  g.addColorStop(0, c([28, 34, 45], lt)); g.addColorStop(0.2, c([58, 68, 85], lt)); g.addColorStop(0.5, c([26, 32, 42], lt)); g.addColorStop(1, c([9, 11, 15], lt));
  quad(ctx, [P(x0, cy - r, dc), P(x1, cy - r, dc), P(x1, cy + r, dc), P(x0, cy + r, dc)]);
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.55, (F / dc) * 0.3); ctx.stroke();
  wheel(RAILS[0], dc, lt, false);
}
function runningGear(lead) {
  const by = bounce();
  ctx.save();
  pitClip(ctx);
  // the shadow under the car, over the bed and the near rail
  const near = Math.max(lead, 22);
  const far = Math.min(lead + LEN, TRACK_FAR);
  if (far > near) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    quad(ctx, [P(SIDE_X, SKIRT, near), P(SIDE_X - WIDE, BED_Y, near), P(SIDE_X - WIDE, BED_Y, far), P(SIDE_X, SKIRT, far)]);
    ctx.fill();
  }
  const fx = SIDE_X - 5; // the bogies' side frames hang just inside the car's side
  for (let i = AXLES.length - 1; i >= 0; i--) { // far to near, so the nearer covers the farther
    const d = lead + AXLES[i];
    if (d - WHEEL_R < 12 || d > TRACK_FAR) continue;
    const lt = 0.1 + 0.9 * dark(d); // in the tunnel it is in the dark like the rest of the car
    ctx.globalAlpha = seen(d);
    if (i < 2) wheelSet(d, lt); // the leading bogie: both wheels and the axle show under the nose
    else wheel(RAILS[0], d, lt, false);
    if (i % 2 === 0) { // the bogie's side frame between its two axles (once per bogie, over its wheels: it is nearer)
      const e = d + 64;
      const lw = Math.max(0.5, (F / d) * 0.26);
      const tone = (r, g, b) => `rgb(${Math.round(r * lt)}, ${Math.round(g * lt)}, ${Math.round(b * lt)})`;
      const y0 = SKIRT + 1 + by * 0.3;
      quad(ctx, [P(fx, y0, d - 12), P(fx, y0, e + 12), P(fx, SKIRT + 10, e + 8), P(fx, SKIRT + 10, d - 8)]);
      ctx.fillStyle = tone(27, 32, 42); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.stroke();
      [d + 14, e - 14].forEach((q) => { // its two springs: coils, dark steel with a lit turn each
        quad(ctx, [P(fx, SKIRT + 2.4, q - 3.4), P(fx, SKIRT + 2.4, q + 3.4), P(fx, SKIRT + 8.6, q + 3.4), P(fx, SKIRT + 8.6, q - 3.4)]);
        ctx.fillStyle = tone(48, 56, 72); ctx.fill(); ctx.lineWidth = lw * 0.8; ctx.stroke();
        ctx.strokeStyle = tone(98, 110, 130); ctx.lineWidth = lw * 0.7;
        [3.9, 5.5, 7.1].forEach((y) => { ctx.beginPath(); ctx.moveTo(...P(fx, SKIRT + y, q - 3.1)); ctx.lineTo(...P(fx, SKIRT + y, q + 3.1)); ctx.stroke(); });
        ctx.strokeStyle = INK;
      });
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
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
    const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const band = (0.5 + 0.5 * sm(0.015, 0.085, v)) * (1 - 0.58 * sm(0.6, 0.99, v)); // one smooth fall of light down the body (the GPU side's own curve)
    const ra = v > 0.86 ? 0.36 : v > 0.66 ? 0.22 : v > 0.4 ? 0.11 : 0.05;
    const ya = Math.max(0, yy - o) * w;
    const yb = Math.min(h - 1, yy + o) * w;
    for (let x = 0; x < w; x++) {
      const i = (yy * w + x) * 4;
      if (!px[i + 3]) continue;
      const r = px[i], gg = px[i + 1], b = px[i + 2];
      const lum = L[yy * w + x];
      // (Nov 21: a hard brightness step here cut each lit pane's own gradient along a ragged line, and the dim part was
      // shaded as steel: both judges read the windshield as "reflecting a mountain landscape". Soft now.)
      const glass = Math.min(1, Math.max(0, ((Math.min(r, gg) - b) / 255) * 5)) * Math.min(1, Math.max(0, (lum - 0.2) / 0.2));
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
const dark = (d) => Math.max(0, Math.min(1, 1 - (d - MOUTH) / FADE)); // fades into the tunnel's dark
/* (Nov 21, John: "make sure the train comes out realistic"). The car used to fade in see-through, like a ghost, with the
   tunnel showing through it. A train in a dark tunnel is SOLID and unlit: you see its lamps and its lit windows on a
   black body, and the station's light climbs onto it as it reaches the mouth. So `dark` is now how much station
   light is on the body, and `seen` is how solid it is: whole until well past the mouth, lost only deep inside. */
const seen = (d) => Math.max(0, Math.min(1, 1 - (d - MOUTH - 40) / 400));

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
/* motion blur: how far the car slides while a real camera's shutter is open (1/40 s), so at speed
   the windows and doors smear along the car instead of sliding past razor-sharp like a poster
   (opened up from 1/60 when the red/white echoes were removed: the blur now carries the speed) */
const SHUTTER = 1 / 1200; // almost no shutter, the way drawn animation moves (cels do not blur): the car stays a DRAWING as it passes (1/40 until Nov 21: at the slower arrival that much blur buried the art, and the sharp ink lines over a blurred fill read as double images)
/* the GPU gets the full-resolution car art (1828px tall), except on low-memory phones */
const sideTexFor = (tex) => (tex === sideCopy && side?.naturalWidth && sharpArt() ? side : tex);
function sideQuad(lead, alpha, tex, { mat = 0, refl = 0 } = {}) {
  const img = sideTexFor(tex);
  const tw = img.naturalWidth || img.width;
  const th = img.naturalHeight || img.height;
  const near = Math.max(lead, 18);
  const far = Math.min(lead + LEN, MOUTH + 450); // (deeper than that it is lost in the tunnel's dark: `seen`)
  if (far <= near) return true;
  const m = ctx.getTransform(); // art space -> canvas pixels
  const P = (Y, d) => {
    const p = m.transformPoint(new DOMPoint(sx(SIDE_X, d), sy(Y, d)));
    return [p.x, p.y];
  };
  const by = bounce(); // the body riding its springs
  // the reflection is the car mirrored in the floor plane: roof below, skirt on the floor line
  const top = refl ? 2 * SKIRT - (ROOF + by) : ROOF + by;
  const bot = refl ? SKIRT - by : SKIRT + by;
  return sideGL.quad(img, [[...P(top, near), near, near - lead, 0], [...P(bot, near), near, near - lead, 1], [...P(top, far), far, far - lead, 0], [...P(bot, far), far, far - lead, 1]],
    { period: ((SKIRT - ROOF) * tw) / th, alpha, mouth: MOUTH, mat, refl, blur: state ? speedAt(state.t) * SHUTTER : 0, car: CAR });
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
    const u = (((s + SIDE_OFF * period) % period) / period) * tw;
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
    for (let k = -14; k <= 14; k++) t += out[(x + k + 96) % 96] * (15 - Math.abs(k));
    return t / 225;
  });
  const max = Math.max(...soft) || 1;
  glowProfile = soft.map((v) => Math.min(1, (v / max) * 1.15));
  return glowProfile;
}
/* ---- THE TRAIN'S LIGHT ON THE STATION, AND ITS SHADE (Nov 21, John: "make sure lighting is realistic and high
   quality, lighting must react with the environment realistically"). Both judges, asked cold: the headlights "fail to
   project light onto the rails and the wall", the windows "cast no light spill onto the platform", "no contact
   shadows under the front", and the old light was three hard bands. Now every light is smooth and lands on
   what is really around it:
   - HEADLIGHTS: a pool on the track bed ahead of the nose (dim right under the lamps, brightest ~3 m ahead, falling
     off with the square of the distance), the same light up the wall beside the track (the tunnel's own wall while
     it is still inside, so the tunnel glows before the train shows), and a spill on the platform's edge;
   - WINDOWS: each lit window lays warm light on the platform, strongest at the edge, fading across the floor;
   - SHADE: the car's contact shadow on the track under its nose, and the soft dark it keeps along the platform's
     edge beside it (it stands between that strip and half the room).
   A floor is flat, so a line of equal depth is a level line on screen and a line of equal distance from the edge runs
   to the vanishing point: light along the track is a plain vertical gradient, light across the floor a conic one
   round the vanishing point. No steps anywhere. */
const beamAt = (s) => (s <= 0 ? 0 : Math.min(1, s / 70) ** 1.5 / (1 + (s / 300) ** 2) * Math.max(0, 1 - s / 1500)); // light s units ahead of the lamps
const BEAM = 1500;
/** a gradient that follows depth on a floor at height Y (axis 'y') or on a wall at X (axis 'x') */
function depthGradient(c, axis, at, dFar, dNear, rgb, alphaAt) {
  const f = axis === 'y' ? (d) => sy(at, d) : (d) => sx(at, d);
  const a = f(dFar); const b = f(dNear);
  const g = axis === 'y' ? c.createLinearGradient(0, a, 0, b) : c.createLinearGradient(a, 0, b, 0);
  const N = 18;
  for (let i = 0; i <= N; i++) {
    const d = 1 / (1 / dFar + ((1 / dNear - 1 / dFar) * i) / N); // even steps on screen
    g.addColorStop(Math.max(0, Math.min(1, (f(d) - a) / (b - a || 1))), `rgba(${rgb}, ${Math.max(0, Math.min(1, alphaAt(d))).toFixed(3)})`);
  }
  return g;
}
/** a gradient across a floor (height Y): stops [[X, alpha], ...]; null on a browser without conic gradients */
function acrossGradient(c, Y, stops, rgb) {
  if (!c.createConicGradient) return null;
  const q = stops.map(([x, al]) => [Math.atan2(Y, x), al]).sort((m, n) => m[0] - n[0]);
  const g = c.createConicGradient(q[0][0], VP.x, VP.y);
  q.forEach(([ang, al]) => g.addColorStop(Math.max(0, Math.min(1, (ang - q[0][0]) / (2 * Math.PI))), `rgba(${rgb}, ${Math.max(0, al).toFixed(3)})`));
  return g;
}
const flat4 = (c, x0, x1, y, d0, d1) => { c.beginPath(); c.moveTo(sx(x0, d0), sy(y, d0)); c.lineTo(sx(x1, d0), sy(y, d0)); c.lineTo(sx(x1, d1), sy(y, d1)); c.lineTo(sx(x0, d1), sy(y, d1)); c.closePath(); };
const wall4 = (c, x, y0, y1, d0, d1) => { c.beginPath(); c.moveTo(sx(x, d0), sy(y0, d0)); c.lineTo(sx(x, d0), sy(y1, d0)); c.lineTo(sx(x, d1), sy(y1, d1)); c.lineTo(sx(x, d1), sy(y0, d1)); c.closePath(); };
const CEIL_Y = -59; // the lowered ceiling (1.75 m over the eye)
/* the headlights on the track and the wall beside it (drawn under the train) */
function headlightBeam(lead, power) {
  if (power <= 0.02 || lead < 30) return;
  const near = Math.max(18, lead - BEAM);
  const k = power * (0.55 + 0.45 * seen(lead));
  const warm = '255, 232, 190';
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // the bed and the ties
  ctx.save();
  pitClip(ctx);
  ctx.fillStyle = depthGradient(ctx, 'y', TIE_Y, lead, near, warm, (d) => 0.34 * k * beamAt(lead - d));
  flat4(ctx, WALL_X, EDGE_X, TIE_Y, lead, near);
  ctx.fill();
  ctx.restore();
  // the wall beside the track: the station's up to the mouth, the tunnel's own beyond it
  const lit = (x, dA, dB, gain) => {
    if (dA <= dB) return;
    ctx.fillStyle = depthGradient(ctx, 'x', x, dA, dB, warm, (d) => gain * k * beamAt(lead - d + 40));
    wall4(ctx, x, CEIL_Y, BED_Y, dA, dB);
    ctx.fill();
  };
  lit(WALL_X, Math.min(lead, MOUTH), Math.min(near, MOUTH), 0.2);
  lit(TUN_X, Math.min(lead, MOUTH + 440), Math.max(near, MOUTH), 0.3);
  ctx.restore();
}
/* the car's contact shadow on the track under its nose (drawn under the train, over the beam) */
function noseShadow(lead) {
  if (lead < 30) return;
  const v = seen(lead);
  if (v < 0.03) return;
  ctx.save();
  pitClip(ctx);
  ctx.fillStyle = depthGradient(ctx, 'y', BED_Y, lead + 90, Math.max(18, lead - 46), '2, 2, 4', (d) => 0.72 * v * Math.max(0, Math.min(1, (d - (lead - 46)) / 40)));
  flat4(ctx, SIDE_X - WIDE - 8, SIDE_X + 6, BED_Y, lead + 90, Math.max(18, lead - 46));
  ctx.fill();
  ctx.restore();
}
/* the light the train throws on the platform (its windows, and its lamps on the edge), and the shade it keeps
   along the platform's edge. Drawn over the car's layer, on the platform only. The light is built on a half-size
   sheet: a pattern along the depth (where the windows are, how far ahead the lamps reach), then ONE conic gradient
   across the floor cut into it, then added to the scene. */
let lightSheet = null;
function trainLight(lead, power) {
  const prof = windowProfile();
  const tr = ctx.getTransform();
  const W2 = Math.ceil(ctx.canvas.width / 2); const H2 = Math.ceil(ctx.canvas.height / 2);
  const sheet = (lightSheet ||= document.createElement('canvas'));
  if (sheet.width !== W2 || sheet.height !== H2) { sheet.width = W2; sheet.height = H2; }
  const q = sheet.getContext('2d');
  q.setTransform(1, 0, 0, 1, 0, 0);
  q.globalCompositeOperation = 'source-over';
  q.clearRect(0, 0, W2, H2);
  q.setTransform(tr.a / 2, tr.b / 2, tr.c / 2, tr.d / 2, tr.e / 2, tr.f / 2);
  const REACH = 190; // how far across the platform the light gets (world units: ~5.6 m)
  let any = false;
  // the shade along the edge beside the car (straight onto the scene: it only darkens)
  const far = Math.min(lead + LEN, MOUTH);
  if (far > lead + 4) {
    const ao = acrossGradient(ctx, SKIRT, [[EDGE_X, 0.36 * seen(lead)], [EDGE_X + 9, 0.2 * seen(lead)], [EDGE_X + 30, 0]], '3, 3, 5');
    if (ao) { ctx.fillStyle = ao; flat4(ctx, EDGE_X, EDGE_X + 30, SKIRT, far, Math.max(20, lead)); ctx.fill(); }
  }
  // the windows: warm light along the car, by where its lit windows are
  if (prof && side?.naturalWidth) {
    const period = ((SKIRT - ROOF) * side.naturalWidth) / side.naturalHeight;
    const step = period / 16; // (the profile is smooth: sixteen pieces a bay are plenty)
    const end = Math.min(lead + LEN, MOUTH - 10);
    for (let d = Math.max(lead, 22); d < end; d += step) {
      const u = (((d - lead + SIDE_OFF * period) % period) / period) * 96;
      const i0 = Math.floor(u) % 96; const fr = u - Math.floor(u);
      const a = (prof[i0] * (1 - fr) + prof[(i0 + 1) % 96] * fr) * dark(d);
      if (a < 0.02) continue;
      q.fillStyle = `rgba(255, 226, 172, ${(0.46 * (0.35 + 0.65 * a)).toFixed(3)})`; // (lamp-warm, not orange; the windows merge into one band with soft swells)
      flat4(q, EDGE_X, EDGE_X + REACH, SKIRT, d, d + step * 1.04);
      q.fill();
      any = true;
    }
  }
  // the lamps: their light on the platform's edge ahead of the nose
  if (power > 0.02 && lead > 30 && lead < MOUTH + 300) {
    const near = Math.max(18, lead - BEAM);
    q.fillStyle = depthGradient(q, 'y', SKIRT, Math.min(lead, MOUTH), near, '255, 236, 200', (d) => 0.5 * power * beamAt(lead - d + 30));
    flat4(q, EDGE_X, EDGE_X + REACH, SKIRT, Math.min(lead, MOUTH), near);
    q.fill();
    any = true;
  }
  if (!any) return;
  const across = acrossGradient(q, SKIRT, [[EDGE_X, 1], [EDGE_X + 14, 0.74], [EDGE_X + 40, 0.42], [EDGE_X + 80, 0.2], [EDGE_X + 130, 0.07], [EDGE_X + REACH, 0]], '255, 255, 255');
  q.globalCompositeOperation = 'destination-in';
  if (across) { q.fillStyle = across; flat4(q, EDGE_X - 4, EDGE_X + REACH + 4, SKIRT, 4000, 16); q.fill(); }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(sheet, 0, 0, W2, H2, 0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

/* the nose's own shape in near-black, with holes where it glows (the cab's lit windows): laid over the nose while it is
   still in the tunnel. Built once, small (the mask is soft anyway). */
let noseShadeC = null;
let noseTmp = null;
function noseShade() {
  if (noseShadeC || !nose?.complete || !nose.naturalWidth) return noseShadeC;
  const w = 414; const h = Math.round((w * nose.naturalHeight) / nose.naturalWidth);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(pic(nose), 0, 0, w, h);
  const im = g.getImageData(0, 0, w, h); const p = im.data;
  for (let i = 0; i < p.length; i += 4) {
    const lum = (0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]) / 255;
    const glass = Math.max(0, Math.min(1, ((Math.min(p[i], p[i + 1]) - p[i + 2]) / 255) * 5)) * Math.min(1, Math.max(0, (lum - 0.2) / 0.2)); // (a lit window, by its warmth)
    p[i] = 6; p[i + 1] = 6; p[i + 2] = 8; p[i + 3] = Math.round(p[i + 3] * (1 - 0.86 * glass));
  }
  g.putImageData(im, 0, 0);
  noseShadeC = c;
  return c;
}
function noseRect(d) {
  const by = bounce();
  const l = sx(SIDE_X - WIDE, d);
  const r = sx(SIDE_X, d);
  const t = sy(ROOF - 7 + by, d); // (the nose's dome: 115 tall for 100 wide, the picture's own 1.17 within 2%)
  return { l, t, w: r - l, h: sy(SKIRT + 4 + by, d) - t };
}

function trainNose(d, img, alpha) {
  if (d < 14 || !img) return;
  const n = noseRect(d);
  const unlit = 1 - dark(d); // inside the tunnel: the body in the dark, its lit windows still glowing
  const sh = unlit > 0.01 ? noseShade() : null;
  ctx.globalAlpha = alpha * seen(d);
  /* the body's corner behind the skirt: the nose art's lower body is drawn 4 to 9 units narrower than the car (a real
     car tucks in under its windows), and the car's side is a flat wall, so beside the skirt there was a see-through
     slot down to the track, right where the nose meets the side. It is the end of the side wall: steel in the shade. */
  if (alpha >= 1) {
    const by = bounce(); const lt = 0.12 + 0.88 * dark(d);
    quad(ctx, [P(SIDE_X - 12, 29 + by, d), P(SIDE_X, 29 + by, d), P(SIDE_X, SKIRT + by, d), P(SIDE_X - 12, SKIRT + by, d)]);
    ctx.fillStyle = `rgb(${Math.round(20 * lt)}, ${Math.round(25 * lt)}, ${Math.round(34 * lt)})`; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.55, (F / d) * 0.3);
    ctx.beginPath(); ctx.moveTo(...P(SIDE_X - 12, SKIRT + by, d)); ctx.lineTo(...P(SIDE_X, SKIRT + by, d)); ctx.stroke();
  }
  if (sh) {
    // darkened first, on a scratch sheet, THEN faded as one thing (two layers faded separately left it half lit)
    const k = Math.abs(ctx.getTransform().a) || 1;
    const w = Math.max(2, Math.ceil(n.w * k)); const h = Math.max(2, Math.ceil(n.h * k));
    const tc = (noseTmp ||= document.createElement('canvas'));
    if (tc.width < w || tc.height < h) { tc.width = Math.max(tc.width, w); tc.height = Math.max(tc.height, h); }
    const tg = tc.getContext('2d');
    tg.globalCompositeOperation = 'source-over'; tg.globalAlpha = 1;
    tg.clearRect(0, 0, w, h);
    tg.drawImage(pic(img), 0, 0, w, h);
    tg.globalCompositeOperation = 'source-atop'; tg.globalAlpha = unlit * 0.93;
    tg.drawImage(sh, 0, 0, w, h);
    ctx.drawImage(tc, 0, 0, w, h, n.l, n.t, n.w, n.h);
  } else {
    ctx.drawImage(pic(img), n.l, n.t, n.w, n.h);
  }
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
    // (Nov 22: a lamp's glow falls off fast. It ran at a third strength out to a quarter of its reach and then in a
    // straight line to nothing, so close up the two glows together fogged the whole lower nose to one pale grey: the
    // skirt, the coupler and everything under them lost their ink and their shade, "flat grey boxes".)
    g.addColorStop(0, 'rgba(255,252,236,0.95)');
    g.addColorStop(0.1, 'rgba(255,244,214,0.5)');
    g.addColorStop(0.24, 'rgba(255,240,200,0.17)');
    g.addColorStop(0.5, 'rgba(255,240,200,0.045)');
    g.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  });
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

/* Speed and weight, the natural way (Nov 19, John: the red and white trails "I don't really like
   how it looks... make it look natural, moving fast, with weight, heavy"). No drawn trails or
   silhouettes: only what a real heavy train does to the station around it.
   (1) HEADLIGHT WASH: its headlights light the track and the platform edge ahead of it, a warm pool
       that races toward the camera in front of the nose (in the dark tunnel this is what tells you
       it's coming, and how fast). (Since Nov 21 this is `headlightBeam` above: smooth, and on the wall too.)
   (2) BRAKE SPARKS: a braking train grinds steel on steel. Short orange-white sparks spray up out of
       the gap between the car and the platform edge at every wheel set, thrown forward the way the
       train moves, falling back, gone in a blink. Strongest at speed, fewer as it slows.
   (3) DUST: its air wall lifts the platform's dust: soft grey puffs roll out of the gap where the
       nose has just been, swell, drift onto the platform and toward the camera, and fade.
   (4) More motion blur on the car (SHUTTER) and the camera's heavy rumble and wheel-set thumps
       (cameraMotion) carry the rest. */
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }; // steady pseudo-random
/* (Nov 21, John: "make the rails shine as the train comes in"): the headlights catch the polished rail heads ahead
   of the nose. Each rail lights up from the nose toward the camera, brightest just ahead of the train and fading
   with distance, warm like the lamps, getting stronger as the train comes out of the tunnel; a hot glint (the
   lamps' reflection) slides along each rail toward the camera, faster than the train, the way a real specular
   highlight races ahead. Drawn additively in the pit (under the car), so it stops where the car covers the rail. */
function railShine(t, lead, power) {
  if (power <= 0.02 || lead < 30) return;
  const near = Math.max(20, lead - 900);
  const out = Math.max(0, Math.min(1, (MOUTH + 600 - lead) / 900)); // 0 deep in the tunnel, 1 out of it
  const k = power * (0.35 + 0.65 * out);
  ctx.save();
  pitClip(ctx);
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'butt'; // (round caps on a chain of faint segments overlapped into beads of light)
  RAILS.forEach((rx, ri) => {
    for (let d = near, n; d < lead; d = n) {
      n = Math.min(lead, d * 1.08 + 4);
      const f = 1 - (lead - d) / (lead - near + 1); // 1 at the nose, 0 at the near end
      const a = k * (0.08 + 0.5 * f * f) * dark(d) * (ri ? 0.8 : 1);
      if (a < 0.01) continue;
      const w = Math.max(0.8, (F / d) * 2.4);
      ctx.strokeStyle = `rgba(255, 214, 150, ${(a * 0.5).toFixed(3)})`; // the warm bloom on the head
      ctx.lineWidth = w * 2.2;
      ctx.beginPath(); ctx.moveTo(sx(rx, d), sy(RAIL_Y, d)); ctx.lineTo(sx(rx, n), sy(RAIL_Y, n)); ctx.stroke();
      ctx.strokeStyle = `rgba(255, 246, 226, ${a.toFixed(3)})`; // the lit head itself
      ctx.lineWidth = w * 0.7;
      ctx.stroke();
    }
    // the racing glint: the lamps' reflection sliding along the rail's head toward the camera. A thin streak that
    // tapers to nothing at both ends (it was a fat capsule with round ends: it read as a white pill lying on the rail)
    const g = 20 + (lead - 20) * (0.3 + 0.12 * Math.sin(t * 9 + ri * 1.7));
    if (g < lead - 10) {
      const len = Math.max(16, g * 0.3);
      const a = k * dark(g) * (ri ? 0.75 : 1);
      const x0 = sx(rx, g); const y0 = sy(RAIL_Y, g); const x1 = sx(rx, g + len); const y1 = sy(RAIL_Y, g + len);
      const gw = Math.max(0.7, (F / (g + len / 2)) * 1.5);
      const gr = ctx.createLinearGradient(x0, y0, x1, y1);
      gr.addColorStop(0, 'rgba(255, 250, 236, 0)'); gr.addColorStop(0.3, `rgba(255, 252, 240, ${Math.min(1, 0.95 * a).toFixed(3)})`);
      gr.addColorStop(0.55, `rgba(255, 244, 220, ${(0.6 * a).toFixed(3)})`); gr.addColorStop(1, 'rgba(255, 240, 210, 0)');
      ctx.lineCap = 'butt';
      ctx.strokeStyle = gr;
      ctx.lineWidth = gw;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.globalAlpha = 0.3; ctx.lineWidth = gw * 2.6; ctx.stroke(); ctx.globalAlpha = 1; // its soft bloom
    }
  });
  ctx.restore();
}
function brakeSparks(t, lead, power) {
  if (power <= 0.02) return;
  const v = speedAt(t);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  AXLES.forEach((s, ai) => {
    const d = lead + s; // this wheel set's depth
    if (d < 22 || d > MOUTH + FADE) return;
    const vis = dark(d);
    for (let j = 0; j < 6; j++) {
      const seed = ai * 13 + j * 7;
      const life = 0.09 + hash(seed) * 0.08; // each spark lives ~0.1 s, then a new one is thrown
      const born = Math.floor((t + hash(seed + 1) * life) / life);
      const r = hash(seed * 3 + born);
      if (r > 0.35 + 0.6 * power) continue; // fewer sparks as it slows
      const u = (t + hash(seed + 1) * life) / life - born; // 0..1 through its life
      const vx = 0.25 + hash(seed + born * 5) * 0.5; // forward speed, as a share of the train's
      const up = 70 + hash(seed + born * 9) * 110; // how hard it is thrown up
      const age = u * life;
      const dz = -(v * vx * age) - 6; // thrown forward, toward the camera
      const y = RAIL_Y - 1 - up * age + 900 * age * age; // up off the rail, out of the gap, then falling
      const x = RAILS[0] + 3 + hash(seed + born * 11) * 260 * age; // sprayed out over the platform
      const d0 = d + dz;
      const tail = 0.045; // a streak: where it was 45 ms ago (a real spark smears in the eye)
      const d1 = d0 + v * vx * tail;
      const y1 = y + (up - 1800 * age) * tail;
      if (d0 < 16) continue;
      const fade = (1 - u * u) * vis * Math.min(1, power * 1.6);
      const w = Math.max(1, Math.min(3.2, (F / d0) * 0.8));
      const x0 = sx(x, d1); const y0 = sy(y1, d1); const xe = sx(x, d0); const ye = sy(y, d0);
      // a hot glow, then the white-hot core (it cools to orange as it flies)
      ctx.strokeStyle = `rgba(255, 120, 30, ${(0.45 * fade).toFixed(3)})`;
      ctx.lineWidth = w * 2.2;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(xe, ye);
      ctx.stroke();
      ctx.strokeStyle = u < 0.45 ? `rgba(255, 250, 225, ${fade.toFixed(3)})` : `rgba(255, 190, 90, ${fade.toFixed(3)})`;
      ctx.lineWidth = w;
      ctx.stroke();
    }
  });
  ctx.restore();
}
function dust(t, lead) {
  ctx.save();
  for (let i = 0; i < 18; i++) {
    const bd = 170 + i * 50 + hash(i) * 30; // where along the platform this puff is lifted
    const age = t - timeAt(bd); // seconds since the nose passed that spot
    if (age <= 0 || age > 0.9 || bd > MOUTH + 200) continue;
    const u = age / 0.9;
    const d = bd - age * (140 + hash(i + 3) * 80); // dragged along toward the camera
    if (d < 20) continue;
    const X = EDGE_X + 4 + age * (60 + hash(i + 5) * 70); // rolling out over the platform
    const Y = SKIRT - 3 - age * (18 + hash(i + 7) * 22);
    const R = (6 + age * (55 + hash(i + 9) * 40)) * F / d; // swelling
    const x = sx(X, d);
    const y = sy(Y, d);
    const a = 0.2 * Math.sin(Math.PI * Math.min(1, u * 1.6 + 0.05)) * (1 - u) * dark(d); // (0.42 until Nov 21: slower, a puff sat still long enough to read as a grey smudge)
    if (a < 0.01) continue;
    const g = ctx.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(0, `rgba(214, 204, 182, ${a.toFixed(3)})`); // dust caught in the station's warm light
    g.addColorStop(0.55, `rgba(200, 190, 170, ${(a * 0.5).toFixed(3)})`);
    g.addColorStop(1, 'rgba(190, 180, 160, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, R, R * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* MOTION SMEAR: four faint copies of the nose where it was over the last few frames, bridging its
   jump from frame to frame (the nose's own motion blur; the side blurs on the GPU, see SHUTTER) */
function noseSmear(t, img, power) {
  if (power <= 0.02 || !img) return;
  for (let j = 4; j >= 1; j--) trainNose(leadAt(Math.max(0, t - j * 0.012)), img, 0.16 * power);
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
  // (Nov 21, John: "the train does not come in"): every layer is drawn on its own, so one that fails on a
  // visitor's machine (a graphics driver, a canvas limit) costs only that layer, never the train. A failure
  // is kept in window.__trainErrors (and logged once) so it can be found.
  const safe = (name, fn) => {
    try { return fn(); } catch (e) {
      const log = (window.__trainErrors ||= []);
      if (!log.some((x) => x.name === name)) { log.push({ name, msg: String(e && e.message || e) }); console.warn('[train]', name, e); }
      try { ctx.restore(); } catch { /* (nothing saved) */ }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      return undefined;
    }
  };
  const t = state?.t ?? 0;
  safe('track', () => stampTrack(kk)); // the full track, under everything
  if (!state) safe('trash', () => drawTrash(t)); // at rest; during the shot it is drawn in front of the car, below
  // the GPU layer: drawn only while the train runs (made on first use, cleared at rest)
  const r = state && gpuOK ? safe('gpu', () => gpu()) : sideGL;
  try {
    glOn = Boolean(r && gpuOK && r.begin(cv.width, cv.height) && state);
  } catch {
    dropGPU();
  }
  if (!state) return;
  const lead = leadAt(t);
  const img = nose?.complete && nose.naturalWidth ? nose : null;
  // the speed cues are strongest while it storms out of the tunnel, and ease off as it brakes
  const fx = Math.max(0, Math.min(1, (MOUTH + 400 - lead) / 600)) * Math.min(1, speedAt(t) / 1800);
  safe('beam', () => headlightBeam(lead, Math.min(1, t / 0.3))); // the lamps on the track and the wall ahead
  safe('shine', () => railShine(t, lead, Math.min(1, t / 0.3)));
  safe('noseshadow', () => noseShadow(lead)); // its contact shadow on the track
  safe('gear', () => runningGear(lead)); // wheels on the rail, seen through the gap (the car hides their tops)
  safe('reflection', () => trainSide(lead, kk, 1, sideArt(), { mat: 1, refl: 1 })); // mirrored in the glossy floor
  if (safe('side', () => { trainSide(lead, kk, 1, sideArt(), { mat: 1 }); return true; }) !== true) { // the car: heavy cel-shaded steel
    dropGPU(); // (the GPU side failed: draw the car with the plain 2D slices, from the plain art)
    safe('side-2d', () => trainSide(lead, kk, 1, sideArt()));
  }
  if (glOn) ctx = over; // the side is on the GPU layer: everything in front of it goes above
  safe('light', () => trainLight(lead, Math.min(1, t / 0.3))); // its windows and lamps on the platform, its shade along the edge
  // the trash lies on the platform, between the camera and the car, so it is drawn in front of
  // the car; against the nose it goes by depth (in front of it only once it is nearer)
  safe('trash', () => drawTrash(t, (d) => d >= lead));
  safe('sparks', () => brakeSparks(t, lead, Math.min(1, speedAt(t) / 2400) * (t < T_CRAWL ? 1 : 0.3)));
  const heavy = safe('heavynose', () => heavyNose()) || img;
  safe('smear', () => noseSmear(t, heavy, fx * Math.max(0, Math.min(1, (speedAt(t) - 2300) / 700)))); // (only at real speed: slower, the echoes read as a double image)
  if (safe('nose', () => { trainNose(lead, heavy, 1); return true; }) !== true && img) safe('nose-plain', () => trainNose(lead, img, 1));
  safe('trash', () => drawTrash(t, (d) => d < lead));
  safe('dust', () => dust(t, lead));
  safe('lights', () => headlights(lead, 1 + Math.max(0, 1 - lead / MOUTH) * 1.6, Math.min(1, t / 0.3))); // the lights fade up with the horn
  ctx = under;
}

/* ---------------------------------------------------------------- the shot */
/** Start the pass-by. Returns controls for the transition timeline:
    tick(t) to draw time t (seconds), end() to reset to the quiet platform. */
/** true once both train pictures (side and nose) are loaded: the shot never plays without its train */
export const trainArtLoaded = () => Boolean(side?.complete && side.naturalWidth && nose?.complete && nose.naturalWidth);
export function trainShot({ panTo = null } = {}) {
  if (!ctx || reduce() || !trainArtLoaded()) return null;
  state = {
    t: 0,
    rumble: 0,
    trash: TRASH.map(([x, y, , , , seed], n) => { const i = seed ?? n; return {
      at: null,
      when: timeAt(depthOf(y) + 140), // the nose reaches it (a bit early: the air pushes first)
      push: (x < 780 ? -0.45 : 1) * (260 + ((i * 53) % 220)), // (the pieces by the platform's edge are thrown AWAY from the track by the air the nose shoves aside: sliding toward it, a sheet went through a guard rail's post)
      lift: 300 + ((i * 71) % 380),
      spin: (i % 2 ? 1 : -1) * (5 + (i % 4) * 2.5),
      flip: 9 + (i % 3) * 5,
    }; }),
  };
  const startPan = 0.6;
  return {
    /** time in seconds since the shot started; pan 0..1 eases the camera toward the track */
    tick(t, { rumble = 0, panP = 0 } = {}) {
      state.t = t;
      state.rumble = rumble;
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
