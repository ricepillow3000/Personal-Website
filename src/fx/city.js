import { reducedMotion, seeded, isPhone } from '../core/util.js';

/* Title-screen street layer (original artwork): crosswalk, a grey crowd walking,
   John in red. Sits on top of the SVG skyline (fx/skyline.js); clears itself on other screens. */

const PALETTES = {
  title: { sky: ['#3B0709', '#9E0F12', '#E5191C', '#FF6A2B'], sun: '#FFD9A0', far: '#5C0A0D', near: '#1A0405', win: 'rgba(255,214,140,.55)', street: '#050505', walk: 'rgba(255,255,255,.9)' }
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
  let crowd = [];
  let raf = 0;
  let last = 0;
  let t = 0;

  const scale = () => Math.max(0.55, Math.min(1.4, h / 820));
  const streetTop = () => h * (isPhone() ? 0.74 : 0.76);

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    crowd = buildCrowd(seeded(404), w, isPhone() ? 16 : 34);
    draw();
  }

  function rect(c, x, y, ww, hh) {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, ww, hh);
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
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    // The sky + skyline is the SVG layer (fx/skyline.js). The canvas only adds the
    // title-screen street, crosswalk and walking crowd on top of it.
    if (mode !== 'title') return;
    const pal = greyPalette(PALETTES.title, gray);

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
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, st - 8, w, 3);

    const back = st + (h - st) * 0.28;
    const front = st + (h - st) * 0.78;
    crowd.filter((p) => p.row === 0).forEach((p) => drawPerson(p, back, `rgb(${p.shade},${p.shade},${p.shade - 4})`));
    drawJohn(st + (h - st) * 0.55);
    crowd.filter((p) => p.row === 1).forEach((p) => {
      if (Math.abs(p.x - johnX()) < 34 * scale()) return; // keep John visible
      drawPerson(p, front, `rgb(${p.shade},${p.shade},${p.shade - 4})`);
    });
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
    if (reducedMotion() || mode !== 'title') {
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
