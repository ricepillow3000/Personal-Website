import { reducedMotion, seeded, isPhone } from '../core/util.js';

/* Code-drawn backdrop (original artwork):
   - 'title': sunset sky, Atlanta-style skyline, a grey crowd crossing the street, John in red.
   - 'talk' : the same skyline in grey/red tones, no crowd.
   - 'page' : the talk scene, dimmed via CSS.
   Nothing is loaded over the network, so the title paints instantly. */

const PALETTES = {
  title: { sky: ['#3B0709', '#9E0F12', '#E5191C', '#FF6A2B'], sun: '#FFD9A0', far: '#5C0A0D', near: '#1A0405', win: 'rgba(255,214,140,.55)', street: '#120304', walk: 'rgba(245,245,240,.85)' },
  talk: { sky: ['#1C1C1C', '#3D2324', '#7A2224', '#B23A2C'], sun: '#E8B9A0', far: '#3A2627', near: '#121212', win: 'rgba(255,200,150,.35)', street: '#0E0E0E', walk: 'rgba(245,245,240,.5)' }
};

/** Mix a '#rrggbb' or 'rgba()' color toward its own grey by k (0..1). Cheap, unlike ctx.filter. */
function desat(color, k) {
  if (!k) return color;
  let r, g, b, a = 1;
  if (color[0] === '#') {
    r = parseInt(color.slice(1, 3), 16);
    g = parseInt(color.slice(3, 5), 16);
    b = parseInt(color.slice(5, 7), 16);
  } else {
    [r, g, b, a = 1] = color.match(/[\d.]+/g).map(Number);
  }
  const l = 0.3 * r + 0.59 * g + 0.11 * b;
  const m = (c) => Math.round(c + (l - c) * k);
  return `rgba(${m(r)},${m(g)},${m(b)},${a})`;
}

function greyPalette(pal, k) {
  if (!k) return pal;
  const out = {};
  Object.entries(pal).forEach(([key, v]) => (out[key] = Array.isArray(v) ? v.map((c) => desat(c, k)) : desat(v, k)));
  return out;
}

function buildSkyline(rnd, w, h, scale) {
  /* Far layer: generic blocks + a few landmark-style silhouettes (stepped pyramid tower,
     a cylinder hotel tower, a gothic-roof tower). Positions are relative so it scales. */
  const far = [];
  let x = -20;
  while (x < w + 40) {
    const bw = (26 + rnd() * 44) * scale;
    far.push({ x, w: bw, h: (60 + rnd() * 130) * scale, kind: 'block' });
    x += bw + rnd() * 6 * scale;
  }
  const lm = [
    { at: 0.62, w: 46, h: 330, kind: 'pyramid' },
    { at: 0.46, w: 40, h: 250, kind: 'cylinder' },
    { at: 0.77, w: 50, h: 260, kind: 'gothic' },
    { at: 0.3, w: 44, h: 210, kind: 'gothic' },
    { at: 0.14, w: 38, h: 180, kind: 'block' },
    { at: 0.9, w: 40, h: 200, kind: 'block' }
  ];
  lm.forEach((l) => far.push({ x: l.at * w - (l.w * scale) / 2, w: l.w * scale, h: l.h * scale, kind: l.kind }));
  far.forEach((b) => {
    b.windows = [];
    const cols = Math.max(1, Math.floor(b.w / (9 * scale)));
    const rows = Math.floor(b.h / (12 * scale));
    for (let c = 0; c < cols; c++) for (let r = 2; r < rows; r++) if (rnd() < 0.16) b.windows.push([c, r]);
  });
  const near = [];
  x = -30;
  while (x < w + 40) {
    const bw = (60 + rnd() * 90) * scale;
    near.push({ x, w: bw, h: (40 + rnd() * 80) * scale });
    x += bw + (4 + rnd() * 20) * scale;
  }
  return { far, near };
}

function buildCrowd(rnd, w, count) {
  const people = [];
  for (let i = 0; i < count; i++) {
    const row = rnd() < 0.5 ? 0 : 1;
    people.push({
      x: rnd() * w,
      row,
      dir: rnd() < 0.5 ? -1 : 1,
      speed: (18 + rnd() * 26) * (row ? 1.15 : 0.8),
      phase: rnd() * Math.PI * 2,
      shade: row ? 70 + Math.floor(rnd() * 40) : 120 + Math.floor(rnd() * 40),
      size: (row ? 1 : 0.78) * (0.9 + rnd() * 0.22),
      bag: rnd() < 0.3
    });
  }
  return people;
}

export function createCity(canvas) {
  const ctx = canvas.getContext('2d');
  let w = 0;
  let h = 0;
  let dpr = 1;
  let mode = 'title';
  let frozen = false;
  let gray = 0; // 0..1 desaturation for the freeze
  let sky = null;
  let crowd = [];
  let raf = 0;
  let last = 0;
  let t = 0;

  const scale = () => Math.max(0.55, Math.min(1.4, h / 820));
  const horizon = () => h * (isPhone() ? 0.58 : 0.62);
  const streetTop = () => h * (isPhone() ? 0.74 : 0.76);

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const rnd = seeded(2029);
    sky = buildSkyline(rnd, w, h, scale());
    crowd = buildCrowd(seeded(404), w, isPhone() ? 16 : 34);
    draw();
  }

  function rect(c, x, y, ww, hh) {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, ww, hh);
  }

  function drawBuilding(b, base, pal) {
    const top = base - b.h;
    ctx.fillStyle = pal.far;
    ctx.beginPath();
    if (b.kind === 'pyramid') {
      ctx.rect(b.x, top, b.w, b.h);
      ctx.moveTo(b.x - 2, top);
      ctx.lineTo(b.x + b.w / 2, top - b.w * 0.9);
      ctx.lineTo(b.x + b.w + 2, top);
      ctx.fill();
      ctx.fillRect(b.x + b.w / 2 - 1.5, top - b.w * 1.5, 3, b.w * 0.7);
    } else if (b.kind === 'cylinder') {
      ctx.rect(b.x, top + b.w * 0.15, b.w, b.h);
      ctx.ellipse(b.x + b.w / 2, top + b.w * 0.15, b.w / 2, b.w * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (b.kind === 'gothic') {
      ctx.rect(b.x, top, b.w, b.h);
      ctx.moveTo(b.x, top);
      ctx.lineTo(b.x + b.w * 0.2, top - b.w * 0.35);
      ctx.lineTo(b.x + b.w * 0.5, top - b.w * 0.75);
      ctx.lineTo(b.x + b.w * 0.8, top - b.w * 0.35);
      ctx.lineTo(b.x + b.w, top);
      ctx.fill();
    } else {
      ctx.fillRect(b.x, top, b.w, b.h);
    }
    const s = scale();
    ctx.fillStyle = pal.win;
    b.windows.forEach(([c, r]) => ctx.fillRect(b.x + 3 * s + c * 9 * s, top + r * 12 * s, 4 * s, 5 * s));
  }

  function drawPerson(p, base, color) {
    const s = scale() * p.size * (isPhone() ? 0.85 : 1);
    const stride = frozen ? Math.sin(p.phase) : Math.sin(t * 6 + p.phase);
    const bob = Math.abs(stride) * 2 * s;
    const x = p.x;
    const y = base - bob;
    ctx.fillStyle = color;
    // legs
    ctx.save();
    ctx.translate(x, y - 34 * s);
    ctx.rotate(stride * 0.35);
    ctx.fillRect(-3 * s, 0, 6 * s, 34 * s);
    ctx.restore();
    ctx.save();
    ctx.translate(x, y - 34 * s);
    ctx.rotate(-stride * 0.35);
    ctx.fillRect(-3 * s, 0, 6 * s, 34 * s);
    ctx.restore();
    // torso (coat)
    ctx.beginPath();
    ctx.moveTo(x - 12 * s, y - 34 * s);
    ctx.lineTo(x - 9 * s, y - 74 * s);
    ctx.quadraticCurveTo(x, y - 80 * s, x + 9 * s, y - 74 * s);
    ctx.lineTo(x + 12 * s, y - 34 * s);
    ctx.fill();
    // head
    ctx.beginPath();
    ctx.arc(x, y - 88 * s, 9.5 * s, 0, Math.PI * 2);
    ctx.fill();
    if (p.bag) ctx.fillRect(x + p.dir * 10 * s, y - 56 * s, 9 * s, 13 * s);
  }

  function drawJohn(base) {
    const s = scale() * 1.25 * (isPhone() ? 0.9 : 1);
    const x = johnX();
    const y = base;
    ctx.save();
    ctx.shadowColor = 'rgba(229,25,28,.85)';
    ctx.shadowBlur = 22 * s;
    ctx.fillStyle = '#E5191C';
    ctx.fillRect(x - 9 * s, y - 36 * s, 7 * s, 36 * s);
    ctx.fillRect(x + 2 * s, y - 36 * s, 7 * s, 36 * s);
    ctx.beginPath();
    ctx.moveTo(x - 15 * s, y - 32 * s);
    ctx.lineTo(x - 13 * s, y - 76 * s);
    ctx.quadraticCurveTo(x, y - 84 * s, x + 13 * s, y - 76 * s);
    ctx.lineTo(x + 15 * s, y - 32 * s);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y - 92 * s, 11 * s, 0, Math.PI * 2);
    ctx.fill();
    // spiky hair (matches the portrait)
    ctx.beginPath();
    ctx.moveTo(x - 12 * s, y - 94 * s);
    for (let i = 0; i <= 6; i++) ctx.lineTo(x - 12 * s + i * 4 * s, y - (i % 2 ? 110 : 102) * s);
    ctx.lineTo(x + 12 * s, y - 94 * s);
    ctx.fill();
    ctx.restore();
    // jacket lapel highlight
    ctx.strokeStyle = '#0B0B0B';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(x - 6 * s, y - 76 * s);
    ctx.lineTo(x, y - 58 * s);
    ctx.lineTo(x + 6 * s, y - 76 * s);
    ctx.stroke();
  }

  const johnX = () => w * (isPhone() ? 0.7 : 0.66);

  function draw() {
    if (!w) return;
    const pal = greyPalette(mode === 'title' ? PALETTES.title : PALETTES.talk, gray);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const hz = horizon();
    const g = ctx.createLinearGradient(0, 0, 0, hz);
    pal.sky.forEach((c, i) => g.addColorStop(i / (pal.sky.length - 1), c));
    rect(g, 0, 0, w, hz + 2);

    // sun with halftone fade
    const sr = Math.min(w, h) * 0.17;
    const sx = w * 0.56;
    ctx.fillStyle = pal.sun;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(sx, hz - sr * 0.15, sr, Math.PI, 0);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = pal.sky[2];
    for (let i = 0; i < 6; i++) ctx.fillRect(sx - sr, hz - sr * 0.15 - i * sr * 0.16 - 3, sr * 2, 2 + i * 0.9);

    // speed-line streaks in the sky
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    for (let i = 0; i < 5; i++) {
      const yy = hz * (0.12 + i * 0.13);
      const off = ((t * 30 * (i + 1)) % (w + 400)) - 200;
      ctx.fillRect(off, yy, 160 + i * 40, 2);
    }

    sky.far.forEach((b) => drawBuilding(b, hz, pal));
    ctx.fillStyle = pal.near;
    sky.near.forEach((b) => ctx.fillRect(b.x, hz + 10 - b.h * 0.6, b.w, b.h * 0.6 + 40));
    rect(pal.near, 0, hz + 8, w, h);

    // street + crosswalk
    const st = streetTop();
    rect(pal.street, 0, st - 6, w, h);
    ctx.fillStyle = pal.walk;
    const stripeW = Math.max(26, w / 26);
    for (let x = -stripeW; x < w + stripeW; x += stripeW * 1.9) {
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.lineTo(x + stripeW, h);
      ctx.lineTo(x + stripeW * 1.25, st + 6);
      ctx.lineTo(x + stripeW * 0.25, st + 6);
      ctx.fill();
    }

    if (mode === 'title') {
      const back = st + (h - st) * 0.28;
      const front = st + (h - st) * 0.78;
      crowd.filter((p) => p.row === 0).forEach((p) => drawPerson(p, back, `rgb(${p.shade},${p.shade},${p.shade - 4})`));
      drawJohn(st + (h - st) * 0.55);
      crowd.filter((p) => p.row === 1).forEach((p) => {
        if (Math.abs(p.x - johnX()) < 34 * scale()) return; // keep John visible
        drawPerson(p, front, `rgb(${p.shade},${p.shade},${p.shade - 4})`);
      });
    }

    // vignette
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,.45)');
    rect(v, 0, 0, w, h);
  }

  function tick(now) {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    if (document.hidden) return;
    if (!frozen) {
      t += dt;
      if (mode === 'title') {
        crowd.forEach((p) => {
          p.x += p.dir * p.speed * dt * scale();
          if (p.x > w + 30) p.x = -30;
          if (p.x < -30) p.x = w + 30;
        });
      }
    }
    draw();
  }

  function start() {
    cancelAnimationFrame(raf);
    if (reducedMotion() || mode === 'page') {
      draw();
      return;
    }
    last = 0;
    raf = requestAnimationFrame(tick);
  }

  window.addEventListener('resize', resize);
  resize();
  start();

  return {
    setMode(next) {
      mode = next;
      frozen = false;
      gray = 0;
      canvas.style.transform = '';
      draw();
      start();
    },
    freeze() {
      frozen = true;
    },
    setGray(v) {
      gray = v;
      draw();
    },
    /** Where John stands, for the camera rush on PRESS START. */
    johnPoint: () => ({ x: johnX(), y: streetTop() + (h - streetTop()) * 0.55 - 60 * scale() }),
    restart: start
  };
}
