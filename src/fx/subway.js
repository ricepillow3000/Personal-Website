/* The title's subway platform, alive: trash lying on the platform floor, and the PRESS START
   train that bursts out of the tunnel and roars past along the track, blowing the trash away.

   Everything is drawn on one canvas that sits exactly on top of the platform art (same box,
   same camera push), in the art's own pixel space (1600 x 914), so the train lines up with the
   tunnel and the platform edge on every screen size. The train is a real perspective plane:
   its side is cut into thin vertical strips (one per few screen pixels), each scaled for its
   depth, like an old raycaster. Its nose is our cut-out of Nano Banana's subway-car front. */

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
const PERIOD = ((SKIRT - ROOF) * 1600) / 914; // one repeat of the car-side art, in world units
const LEN = 5200; // the whole train
const MOUTH = 1000;
const START = 2700; // where the nose is when the shot opens (deep in the dark tunnel)
const SPEED = 3600; // world units a second

const NOSE = 'assets/film/trainnose.webp';
const SIDE = 'assets/film/train.webp';

// trash on the platform floor: [x, y] on the art (where it touches the floor), kind, size, tilt.
// The pieces are Nano Banana art (toon ink outlines, halftone shading): one strip, cells below.
const TRASH_ART = 'assets/film/trash.webp';
const CELLS = { news: [0, 200, 111], bag: [204, 200, 167], can: [408, 130, 190], cup: [542, 200, 140], flyer: [746, 200, 139], wrapper: [950, 200, 126], receipt: [1154, 200, 141], ball: [1358, 188, 190] };
const TRASH = [
  [600, 880, 'news', 1.2, -6],
  [700, 800, 'receipt', 0.7, 8],
  [790, 902, 'can', 0.6, -4],
  [915, 722, 'wrapper', 0.55, 5],
  [1000, 852, 'flyer', 0.95, -7],
  [1150, 905, 'cup', 0.85, 4],
  [858, 664, 'ball', 0.42, 0],
  [1260, 790, 'bag', 0.7, -3],
  [655, 700, 'news', 0.65, 9],
  [1060, 652, 'receipt', 0.5, -5],
];

const reduce = () => document.body.classList.contains('reduce-motion') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const load = (src) => {
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  return img;
};

let cv = null;
let ctx = null;
let box = null;
let art = null;
let nose = null;
let side = null;
let trash = null; // { lit, ink } canvases: the art lit like the station, and a black copy for shading
let pan = null; // object-position x while the camera pans (phones), else null
let state = null; // the running shot, or null at rest

/** Mount on the title's camera box (holds the platform <img>). Called once the art has loaded. */
export function mountSubway(camBox, img) {
  if (cv) return;
  box = camBox;
  art = img;
  cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden', 'true');
  box.appendChild(cv);
  ctx = cv.getContext('2d');
  const img2 = load(TRASH_ART);
  img2.onload = () => {
    trash = { lit: litCopy(img2), ink: tintCopy(img2, '#0B0B0B') };
    draw();
  };
  new ResizeObserver(() => size()).observe(box);
  size();
}

/** Load the train art (on the first tap/key, with the other film art). */
export function preloadSubway() {
  if (nose) return;
  nose = load(NOSE);
  side = load(SIDE);
  nose.decode?.().catch(() => {});
  side.decode?.().catch(() => {});
}

function size() {
  if (!cv) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const w = box.offsetWidth;
  const h = box.offsetHeight;
  if (!w || !h) return;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
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
  g.drawImage(img, 0, 0);
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
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = 'rgba(14, 16, 22, 0.34)';
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

/* where a floor point sits in depth (so trash blows away the moment the nose reaches it) */
const depthOf = (y) => (F * SKIRT) / Math.max(8, y - VP.y);

function drawTrash(t) {
  if (!trash) return;
  TRASH.forEach(([x0, y0, kind, sz, tilt], i) => {
    const [cx, cw, ch] = CELLS[kind];
    const near = Math.max(0.35, (y0 - VP.y) / (IH - VP.y)); // 1 at the bottom of the shot
    let gx = x0; // where it touches the floor
    let gy = y0;
    let lift = 0;
    let w = cw * sz * (0.28 + near * 0.62);
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
        const g = 1 / (1 - Math.min(0.86, u * 0.9)); // swept toward the camera by the train's wind
        gx = VP.x + (x0 - VP.x) * g - st.push * (u + u * u * 2.2);
        gy = VP.y + (y0 - VP.y) * g;
        lift = Math.max(0, st.lift * 1.3 * u - 260 * u * u) * g;
        w *= g;
        rot += st.spin * u;
        const flip = Math.cos(st.flip * u);
        squash = Math.max(0.14, Math.abs(flip));
        back = flip < 0;
      }
    }
    const h = (w * ch) / cw;
    const fog = (1 - near) * 0.45; // farther pieces sink into the gloom
    const air = Math.min(1, lift / (h * 2 + 1)); // 0 on the floor, 1 well off it

    // contact shadow on the floor (it stays down there when the piece lifts)
    ctx.save();
    ctx.translate(gx, gy);
    ctx.scale(1, 0.2);
    const r = w * (0.58 - air * 0.2);
    const sh = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    sh.addColorStop(0, `rgba(0,0,0,${0.62 * (1 - air)})`);
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();

    const piece = (img, alpha) => {
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, cx, 0, cw, ch, -w / 2, -h / 2, w, h);
    };
    // its reflection in the glossy floor tiles, upside down and faint
    if (air < 0.9) {
      ctx.save();
      ctx.translate(gx, gy + lift + h * 0.42 * squash);
      ctx.rotate(-rot);
      ctx.scale(1, -0.6 * squash);
      piece(trash.lit, 0.14 * (1 - air) * (1 - fog));
      ctx.restore();
    }
    // the piece itself, lit like the platform, darker in the distance and on its back side
    ctx.save();
    ctx.translate(gx, gy - lift - h * 0.42 * squash);
    ctx.rotate(rot);
    ctx.scale(1, squash);
    piece(trash.lit, 1);
    const shade = fog + (back ? 0.45 : 0);
    if (shade > 0.02) piece(trash.ink, Math.min(0.8, shade));
    ctx.restore();
    ctx.globalAlpha = 1;
  });
}

/* ---------------------------------------------------------------- the train */
const sx = (X, d) => VP.x + (X * F) / d;
const sy = (Y, d) => VP.y + (Y * F) / d;
const dark = (d) => Math.max(0, Math.min(1, 1 - (d - MOUTH) / 420)); // fades into the tunnel's dark

function trainSide(lead, kk, alpha = 1, tex = side) {
  if (!side?.complete || !side.naturalWidth) return;
  const tw = side.naturalWidth;
  const th = side.naturalHeight;
  const tail = lead + LEN;
  const near = Math.max(lead, 18);
  // screen columns from the near end to the far end; step ~3 screen px
  const step = 3 / kk;
  const xNear = Math.max(-200, sx(SIDE_X, near));
  const xFar = sx(SIDE_X, Math.min(tail, 6000));
  for (let x = xNear; x < xFar; x += step) {
    const d = (SIDE_X * F) / (x - VP.x);
    const d2 = (SIDE_X * F) / (x + step - VP.x);
    const a = alpha * dark(d);
    if (a <= 0.01) break;
    const s = d - lead;
    const u = ((s % PERIOD) / PERIOD) * tw;
    const sw = Math.max(1, Math.min(tw - u, ((d2 - d) / PERIOD) * tw));
    const top = sy(ROOF, d);
    ctx.globalAlpha = a;
    ctx.drawImage(tex, u, 0, sw, th, x, top, step + 0.8, sy(SKIRT, d) - top);
  }
  ctx.globalAlpha = 1;
}

function noseRect(d) {
  const l = sx(SIDE_X - WIDE, d);
  const r = sx(SIDE_X, d);
  const t = sy(ROOF - 8, d);
  return { l, t, w: r - l, h: sy(SKIRT + 4, d) - t };
}

function trainNose(d, img, alpha) {
  if (d < 14 || !img) return;
  const n = noseRect(d);
  ctx.globalAlpha = alpha * dark(d);
  ctx.drawImage(img, n.l, n.t, n.w, n.h);
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
  if (!img?.naturalWidth) return null;
  if (reds.has(img)) return reds.get(img);
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
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
  const redSide = tinted(side);
  const redNose = tinted(img);
  [[1.12, side, img, 0.22], [1.06, redSide, redNose, 0.75]].forEach(([z, tex, im, a]) => {
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
  if (!ctx) return;
  const { k, ox, oy, kk } = mapping();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.setTransform(k, 0, 0, k, ox, oy);
  const t = state?.t ?? 0;
  drawTrash(t);
  if (!state) return;
  const lead = START - SPEED * t;
  const img = nose?.complete && nose.naturalWidth ? nose : null;
  afterimages(lead, kk, img, Math.max(0, Math.min(1, (MOUTH + 200 - lead) / 500)));
  trainSide(lead, kk);
  trainNose(lead, img, 1);
  headlights(lead, 1 + Math.max(0, 1 - lead / MOUTH) * 1.6, Math.min(1, t / 0.3)); // the lights fade up with the horn
  speedLines(t, state.lines);
}

/* ---------------------------------------------------------------- the shot */
/** Start the pass-by. Returns controls for the transition timeline:
    tick(t) to draw time t (seconds), end() to reset to the quiet platform. */
export function trainShot({ panTo = null } = {}) {
  if (!ctx || reduce()) return null;
  const lead0 = START;
  state = {
    t: 0,
    rumble: 0,
    lines: 0,
    trash: TRASH.map(([, y], i) => ({
      at: null,
      when: (lead0 - (depthOf(y) + 140)) / SPEED, // the nose reaches it (a bit early: the air pushes first)
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
    /** where the nose is (screen px), for the camera shake strength */
    closeness(t) {
      const lead = START - SPEED * t;
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
