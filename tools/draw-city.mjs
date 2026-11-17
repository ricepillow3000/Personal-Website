/* Draws the film-cut city as SVG (node tools/draw-city.mjs). Original art, built to John's
   references: a low-angle look UP at towers against a flat red sky, buildings in white,
   grays and solid black with thin ink lines, dense window lines that converge toward one
   vanishing point high above (real perspective, never toy blocks), and big dramatic black
   shadow shapes with halftone edges. No text, no logos, no people.
   Writes public/assets/film/{upshot,facade,crown}.svg */
import { writeFileSync } from 'node:fs';

const C = { red: '#E5191C', white: '#F5F5F0', light: '#C9C9C9', mid: '#8A8A8A', dark: '#3A3A3A', black: '#0B0B0B' };
let seed = 5;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const f = (n) => Math.round(n * 10) / 10;
const pts = (a) => a.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
const poly = (a, fill, extra = '') => `<polygon points="${pts(a)}" fill="${fill}"${extra}/>`;
const line = (a, b, w = 1, col = C.black, extra = '') => `<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" stroke="${col}" stroke-width="${w}"${extra}/>`;
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const DEFS = `<defs><pattern id="ht" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="4.5" cy="4.5" r="2.1" fill="${C.black}"/></pattern>
<pattern id="htl" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="4.5" cy="4.5" r="1.6" fill="${C.black}" opacity=".55"/></pattern></defs>`;
const emblem = (cx, cy, r) => {
  const star = Array.from({ length: 10 }, (_, k) => {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const rr = k % 2 ? r * 0.27 : r * 0.62;
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  });
  return `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${C.red}" stroke="${C.black}" stroke-width="4"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 0.8)}" fill="none" stroke="${C.black}" stroke-width="3"/>${poly(star, C.white, ` stroke="${C.black}" stroke-width="2"`)}`;
};

/* ------------------------------------------------ UPSHOT: looking up at the towers */
function upshot() {
  const W = 1600, H = 900, B = 960; // base line just below the frame
  const VP = [820, -2600]; // vanishing point far above: verticals converge upward
  const at = (x, y) => [VP[0] + (x - VP[0]) * ((y - VP[1]) / (B - VP[1])), y]; // a vertical edge from (x,B) up to height y
  const out = [];
  let clipN = 0;
  // a tower = front face + one side face (the side facing the centre of the frame)
  const tower = ({ x0, x1, top, depth, face, side, cols, floors, shadow, crown, beacon }) => {
    const bl = [x0, B], br = [x1, B], tl = at(x0, top), tr = at(x1, top);
    const onLeft = (x0 + x1) / 2 < VP[0];
    const sx = onLeft ? x1 : x0;
    const sx2 = sx + (onLeft ? depth : -depth);
    const s1 = [sx, B], s2 = [sx2, B], s3 = at(sx2, top + depth * 0.35), s4 = at(sx, top);
    out.push(poly([s1, s2, s3, s4], side, ` stroke="${C.black}" stroke-width="3"`));
    // side face window lines
    for (let i = 1; i < Math.max(3, cols / 3); i++) {
      const t = i / Math.max(3, cols / 3);
      out.push(line(lerp(s1, s2, t), lerp(s4, s3, t), 1.2));
    }
    out.push(poly([bl, br, tr, tl], face, ` stroke="${C.black}" stroke-width="3.5"`));
    const cid = `face${++clipN}`; // shadows and dark bays stay on this face, never spill into the sky
    out.push(`<clipPath id="${cid}"><polygon points="${pts([bl, br, tr, tl])}"/></clipPath><g clip-path="url(#${cid})">`);
    // mullions: dense, all converging to the vanishing point
    for (let i = 1; i < cols; i++) {
      const t = i / cols;
      out.push(line(lerp(bl, br, t), lerp(tl, tr, t), i % 4 === 0 ? 2.4 : 1.1));
    }
    // floor lines, closer together toward the top (perspective)
    for (let i = 1; i < floors; i++) {
      const t = (i / floors) ** 1.45;
      const y = top + (B - top) * t;
      const L = at(x0, y), R = at(x1, y);
      out.push(line(L, R, i % 5 === 0 ? 2.6 : 1));
    }
    // a few dark window bays
    for (let k = 0; k < cols * 1.2; k++) {
      const c = Math.floor(rnd() * cols), r = 2 + Math.floor(rnd() * (floors - 3));
      const tA = ((r) / floors) ** 1.45, tB = ((r + 1) / floors) ** 1.45;
      const yA = top + (B - top) * tA, yB = top + (B - top) * tB;
      const xa = x0 + ((x1 - x0) * c) / cols, xb = x0 + ((x1 - x0) * (c + 1)) / cols;
      out.push(poly([at(xa, yA), at(xb, yA), at(xb, yB), at(xa, yB)], rnd() < 0.7 ? C.dark : C.mid, ' opacity=".9"'));
    }
    // dramatic cast shadow: a big diagonal black wedge with a halftone fringe
    if (shadow) {
      const [ta, tb, tc] = shadow;
      const yA = top + (B - top) * ta, yB = top + (B - top) * tb;
      const A = at(x0 + (x1 - x0) * tc, yA), Bp = at(x1, yA - (x1 - x0) * 0.5), Cp = at(x1, yB), D = at(x0, yB + (x1 - x0) * 0.35);
      out.push(poly([A, Bp, Cp, D], C.black, ' opacity=".88"'));
      out.push(poly([lerp(A, D, -0.06), lerp(Bp, Cp, -0.06), Bp, A], 'url(#ht)'));
    }
    out.push('</g>');
    if (crown) {
      const cw = (x1 - x0) * 0.55, cx0 = x0 + (x1 - x0 - cw) / 2;
      const ctop = top - (B - top) * 0.06;
      out.push(poly([at(cx0, top), at(cx0 + cw, top), at(cx0 + cw, ctop), at(cx0, ctop)], C.white, ` stroke="${C.black}" stroke-width="3"`));
      for (let i = 1; i < 6; i++) out.push(line(at(cx0 + (cw * i) / 6, top), at(cx0 + (cw * i) / 6, ctop), 1.2));
    }
    if (beacon) {
      const mx = (x0 + x1) / 2, mTop = top - (B - top) * 0.16;
      const a = at(mx, top - (B - top) * (crown ? 0.06 : 0)), b = at(mx, mTop);
      out.push(line(a, b, 4));
      for (let i = 1; i < 5; i++) out.push(line(lerp(a, b, i / 5), lerp(a, b, i / 5).map((v, j) => (j ? v : v + 10)), 2));
      out.push(`<circle cx="${f(b[0])}" cy="${f(b[1])}" r="7" fill="${C.red}" stroke="${C.black}" stroke-width="2.5"/>`);
    }
  };
  // a billboard on a truss, tilted with the perspective
  const billboard = (x, y, w, h, rot) => {
    out.push(`<g transform="rotate(${rot} ${x + w / 2} ${y + h / 2})">`);
    for (let i = 0; i <= 4; i++) out.push(line([x + (w * i) / 4, y + h], [x + (w * i) / 4 + (i % 2 ? 18 : -18), y + h + 70], 3));
    out.push(line([x - 10, y + h + 70], [x + w + 10, y + h + 70], 4));
    out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${C.white}" stroke="${C.black}" stroke-width="5"/>`);
    out.push(`<rect x="${x + 12}" y="${y + 12}" width="${w - 24}" height="${h - 24}" fill="${C.black}"/>`);
    out.push(emblem(x + w / 2, y + h / 2, Math.min(w, h) * 0.36));
    out.push(`</g>`);
  };

  out.push(`<rect width="${W}" height="${H}" fill="${C.red}"/>`);
  // far towers first (thin, lighter), then the big ones in front
  tower({ x0: 600, x1: 700, top: 120, depth: 40, face: C.light, side: C.mid, cols: 10, floors: 26, beacon: true });
  tower({ x0: 960, x1: 1050, top: 180, depth: 36, face: C.light, side: C.mid, cols: 9, floors: 24, beacon: true });
  // right: the huge glass tower with a cast shadow sweeping across it
  tower({ x0: 1040, x1: 1640, top: 60, depth: 170, face: C.light, side: C.dark, cols: 34, floors: 30, shadow: [0.18, 0.7, 0.35], crown: true, beacon: true });
  // left cluster: boxy commercial blocks
  tower({ x0: -120, x1: 260, top: 260, depth: 120, face: C.white, side: C.mid, cols: 14, floors: 14, shadow: [0.45, 0.9, 0.5] });
  tower({ x0: 230, x1: 560, top: 380, depth: 110, face: C.light, side: C.dark, cols: 16, floors: 12, shadow: [0.3, 0.85, 0.2] });
  billboard(40, 120, 260, 170, -14);
  billboard(330, 250, 210, 140, -8);
  // near tower bottom-centre, in deep shadow, framing the shot
  tower({ x0: 560, x1: 1000, top: 560, depth: 90, face: C.mid, side: C.black, cols: 18, floors: 9, shadow: [0.0, 1.0, 0.0] });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">${DEFS}${out.join('')}</svg>`;
}

/* ------------------------------------------------ FACADE: a seamless vertical tile, straight on */
function facade() {
  const W = 1000, H = 1200, SIDE = 120, FW = W - SIDE;
  const out = [`<rect width="${W}" height="${H}" fill="${C.light}"/>`];
  // glass panels: mostly light, some white, a few dark, laid on a 40 x 100 grid
  seed = 21;
  for (let y = 0; y < H; y += 100) {
    for (let x = 0; x < FW; x += 40) {
      const r = rnd();
      if (r < 0.22) out.push(`<rect x="${x}" y="${y + 14}" width="40" height="86" fill="${C.white}"/>`);
      else if (r < 0.3) out.push(`<rect x="${x}" y="${y + 14}" width="40" height="86" fill="${C.mid}"/>`);
      else if (r < 0.34) out.push(`<rect x="${x}" y="${y + 14}" width="40" height="86" fill="${C.dark}"/>`);
    }
  }
  // big black diagonal shadow shapes; each is drawn three times (shifted by the tile height) so the tile wraps cleanly
  const shadows = [
    [[0, 140], [520, 0], [880, 0], [880, 260], [0, 780]],
    [[300, 1200], [880, 900], [880, 1120], [520, 1200]]
  ];
  for (const s of shadows) {
    for (const dy of [-H, 0, H]) {
      const p = s.map(([x, y]) => [x, y + dy]);
      out.push(poly(p, C.black, ' opacity=".86"'));
      out.push(poly(p.map(([x, y]) => [x, y - 26]), 'url(#ht)'));
    }
  }
  // vertical mullions, structural columns, floors
  for (let x = 40; x < FW; x += 40) out.push(line([x, 0], [x, H], x % 200 === 0 ? 0 : 1.6));
  for (let x = 0; x <= FW; x += 200) out.push(`<rect x="${x - 7}" y="0" width="14" height="${H}" fill="${C.dark}"/>`, line([x - 7, 0], [x - 7, H], 1.5), line([x + 7, 0], [x + 7, H], 1.5));
  for (let y = 0; y < H; y += 100) {
    out.push(`<rect x="0" y="${y}" width="${FW}" height="14" fill="${C.mid}"/>`, line([0, y], [FW, y], 3), line([0, y + 14], [FW, y + 14], 1.5));
  }
  out.push(`<rect x="0" y="600" width="${FW}" height="6" fill="${C.red}"/>`); // one thin red accent
  // side face in shadow
  out.push(`<rect x="${FW}" y="0" width="${SIDE}" height="${H}" fill="${C.dark}"/>`, `<rect x="${FW}" y="0" width="${SIDE}" height="${H}" fill="url(#htl)"/>`);
  for (let x = FW + 30; x < W; x += 30) out.push(line([x, 0], [x, H], 1.2));
  for (let y = 0; y < H; y += 100) out.push(line([FW, y], [W, y], 2));
  out.push(line([FW, 0], [FW, H], 5));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${DEFS}${out.join('')}</svg>`;
}

/* ------------------------------------------------ CROWN: the top of the tower, straight on */
function crown() {
  const W = 1000, H = 700, SIDE = 120, FW = W - SIDE;
  const out = [];
  const tiers = [[0.3, 230], [0.58, 360], [1, 520]]; // [width share of the front face, top y]
  // antenna mast with a beacon
  out.push(line([FW / 2, 30], [FW / 2, 230], 6));
  for (let y = 60; y < 230; y += 34) out.push(line([FW / 2 - 14, y], [FW / 2 + 14, y + 20], 2.5), line([FW / 2 + 14, y], [FW / 2 - 14, y + 20], 2.5));
  out.push(`<circle cx="${FW / 2}" cy="28" r="11" fill="${C.red}" stroke="${C.black}" stroke-width="3"/>`);
  tiers.forEach(([share, top], i) => {
    const w = FW * share, x = (FW - w) / 2, n = 18;
    const bottom = i === 2 ? H : tiers[i + 1][1] + 2;
    out.push(`<path d="M${x + n} ${top}H${x + w - n}V${top + n}H${x + w}V${bottom}H${x}V${top + n}H${x + n}Z" fill="${i === 1 ? C.white : C.light}" stroke="${C.black}" stroke-width="4"/>`);
    for (let k = x + 24; k < x + w - 10; k += 24) out.push(line([k, top + n + 4], [k, bottom], k % 96 < 24 ? 2.4 : 1.1));
    for (let y = top + 50; y < bottom; y += 44) out.push(line([x, y], [x + w, y], 1.4));
    out.push(`<rect x="${x}" y="${top + n}" width="${w}" height="7" fill="${C.black}"/>`);
    // the shadow side of each tier
    out.push(`<rect x="${x + w}" y="${top + n}" width="${i === 2 ? SIDE : 40}" height="${bottom - top - n}" fill="${C.dark}" stroke="${C.black}" stroke-width="3"/>`, `<rect x="${x + w}" y="${top + n}" width="${i === 2 ? SIDE : 40}" height="${bottom - top - n}" fill="url(#htl)"/>`);
  });
  // a cast shadow sweeping across the crown, then the emblem
  out.push(poly([[0, 560], [FW * 0.62, 360], [FW * 0.8, 360], [FW * 0.8, 430], [0, H]], C.black, ' opacity=".82"'));
  out.push(poly([[0, 530], [FW * 0.62, 332], [FW * 0.62, 360], [0, 560]], 'url(#ht)'));
  out.push(emblem(FW / 2, 300, 50));
  out.push(`<rect x="0" y="${H - 14}" width="${W}" height="14" fill="${C.mid}"/>`, line([0, H - 14], [W, H - 14], 3));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">${DEFS}${out.join('')}</svg>`;
}

const dir = new URL('../public/assets/film/', import.meta.url);
writeFileSync(new URL('upshot.svg', dir), upshot());
writeFileSync(new URL('facade.svg', dir), facade());
writeFileSync(new URL('crown.svg', dir), crown());
console.log('drew upshot, facade, crown');
