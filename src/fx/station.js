/* The station's own life, laid over the platform art in its pixel space (1600 x 914, placed exactly
   like the <img>): the ceiling's fluorescent lights, the graffiti on the big pillar and the departure board.

   LIGHTS (Nov 19, John: "make them look more realistic, like actual lights and how they behave, and
   have some of them flicker, but not all at the same time... randomly, like the subway has been aging").
   Each painted panel gets a cool bloom ADDED around it (screen blend), the way a fluorescent tube
   glows through its diffuser and lights the ceiling. Old tubes misbehave on their own clock: a
   quick blip off, a stutter (the starter retrying), now and then a long drop-out and a re-strike.
   Two tired tubes do it more often and sometimes hang dim. Only one healthy tube acts up at a time,
   so it never reads as the whole station blinking. Off, a tube is a dull grey diffuser and the glow
   painted round it is multiplied away (fading to nothing: the art never gets a grey ring). Paused
   when the platform isn't on screen; steady with reduced motion.

   GRAFFITI (Nov 19, John: "on the right side, the wall that's pretty empty, a Persona-style graffiti
   that says TAKE YOUR NETWORK, with a cat at the end"; now TAKE YOUR TIME, the site's motto). An original piece sprayed on a pillar's front
   face on the right (a flat face square to the camera, so it needs no perspective): chunky slanted red
   letters sprayed by hand (Nov 19, John: "not a font pasted onto the pillar... like someone shook a
   spray can and wrote it"), see tools/draw-graffiti.mjs. Its own design (no game's logo, mascot or lettering). */

const NS = 'http://www.w3.org/2000/svg';
// the panels, measured on the art: [x, y] corners (centre strip), or a slanted bar [x1, y1, x2, y2, width]
// (Nov 21, the roof lowered to 3.35 m: John, "make the subway station roof lower"): the tubes are on the new
// ceiling, 1.75 m over the eye, every 4.05 m along the strip (each 2.9 m long), plus one over the back of the platform
const PANELS = [
  [[735, 75], [859, 75], [864, 278], [793, 278]],
  [[804, 318], [865, 318], [866, 379], [822, 379]],
  [[826, 396], [867, 396], [867, 425], [835, 425]],
  [[838, 434], [867, 434], [868, 452], [842, 452]],
  [[844, 457], [868, 457], [868, 469], [847, 469]],
  [[848, 472], [868, 472], [868, 481], [851, 481]],
  [[852, 483], [869, 483], [869, 489], [853, 489]],
  [[854, 491], [869, 491], [869, 496], [855, 496]],
  [[856, 498], [869, 498], [869, 502], [857, 502]],
  [[857, 503], [869, 503], [869, 506], [858, 506]],
  [[858, 507], [869, 507], [869, 509], [859, 509]],
  [[859, 510], [869, 510], [869, 513], [860, 513]],
  [[860, 513], [869, 513], [869, 515], [861, 515]],
  [[861, 516], [869, 516], [869, 517], [861, 517]],
  [[1254, 434], [1286, 434], [1222, 452], [1195, 452]]
];
const TIRED = new Set([2, 9]); // two old tubes that act up more often
const shape = (p, grow = 0) => {
  if (Array.isArray(p[0])) {
    const cx = p.reduce((a, q) => a + q[0], 0) / 4;
    const cy = p.reduce((a, q) => a + q[1], 0) / 4;
    const pts = p.map(([x, y]) => [x + Math.sign(x - cx) * grow, y + Math.sign(y - cy) * grow]);
    return `<path d="M${pts.map((q) => q.join(' ')).join('L')}Z"`;
  }
  const [x1, y1, x2, y2, w] = p;
  return `<path d="M${x1} ${y1}L${x2} ${y2}" stroke-width="${w + grow * 2}" stroke-linecap="round" fill="none"`;
};
const centre = (p) => (Array.isArray(p[0]) ? [p.reduce((a, q) => a + q[0], 0) / 4, p.reduce((a, q) => a + q[1], 0) / 4] : [(p[0] + p[2]) / 2, (p[1] + p[3]) / 2]);
const size = (p) => (Array.isArray(p[0]) ? Math.max(p[1][0] - p[0][0], p[2][1] - p[1][1]) : Math.hypot(p[2] - p[0], p[3] - p[1]));

function lightsDim() { // multiplied: puts out the glow painted round a tube that is off
  return PANELS.map((p, i) => {
    const [x, y] = centre(p);
    const r = size(p) * 0.9 + 6;
    return `<g class="sl" data-l="${i}"><g class="sl-off"><ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.8}" fill="url(#slDim)"/></g></g>`;
  }).join('');
}
/* ---- the glossy floor mirrors the tubes (Nov 19, John: "if the light is flickering and the reflection is
   there, make sure the reflection on the floor expresses that"). The floor's streak under the centre
   strip is the tubes' reflection: each tube lights the stretch of streak straight below it, mirrored
   through the horizon (y 540): y = 540 + (540 - tube y) x 1.15, measured on the art (the streak starts
   at y ~690 under the far tubes and runs off the bottom under the near ones). The small right tube (14)
   lights the patch at (1101, 860). When a tube goes off (or dims), its stretch of reflection is covered
   with the floor's own tone, soft-edged, in the same group as the tube, so the two can never disagree. */
const MIRROR = 2.83; // (ceiling 1.75 m over the eye, the eye 1.6 m over the floor: (1.75 + 3.2) / 1.75)
const REFLECT = { 14: [1240, 845, 22, 40] }; // the right patch: cx, cy, rx, ry (measured)
function reflection(p, i) {
  if (REFLECT[i]) { const [cx, cy, rx, ry] = REFLECT[i]; return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#slFloor)"/>`; }
  if (!Array.isArray(p[0])) return ''; // (the two near slanted tubes reflect off the bottom of the screen)
  const top = p[0][1];
  const bot = p[2][1];
  const y1 = 548 + (548 - bot) * MIRROR;
  const y2 = 548 + (548 - top) * MIRROR;
  if (y1 > 940) return ''; // (the nearest tubes reflect below the screen)
  const cy = (y1 + y2) / 2;
  const ry = (y2 - y1) / 2 + 16; // (the gloss blurs each one into its neighbours: they overlap)
 const rx = 10 + (cy - 548) * 0.06; // the streak narrows toward the tunnel
  return `<ellipse cx="${centre(p)[0].toFixed(1)}" cy="${cy.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="url(#slFloor)"/>`;
}
function lightsBody() { // normal: the dull diffuser of a tube that is off, and its reflection gone from the floor
  return PANELS.map((p, i) => {
    const s = shape(p, 0.6);
    const paint = Array.isArray(p[0]) ? 'fill="#6B665E"' : 'stroke="#6B665E"';
    return `<g class="sl" data-l="${i}"><g class="sl-off">${s} ${paint}/>${reflection(p, i)}</g></g>`;
  }).join('');
}
function lightsGlow() { // added: the bloom through the diffuser, and its light on the ceiling around it
  return PANELS.map((p, i) => {
    const [x, y] = centre(p);
    const sz = size(p);
    const paint = Array.isArray(p[0]) ? 'fill="#FFE2B0"' : 'stroke="#FFE2B0"';
    return `<g class="sl" data-l="${i}"><g class="sl-on">
      <ellipse cx="${x}" cy="${y}" rx="${sz * 1.6 + 10}" ry="${sz * 1.1 + 8}" fill="url(#slSpill)"/>
      <g filter="url(#slBloom)" opacity=".8">${shape(p, 1)} ${paint}/></g></g></g>`;
  }).join('');
}

/* ---- the graffiti: designed in a 76 x 230 box (pillar 2's front face, measured on the art: fully
   on screen on laptops and desktops); screens that only see the middle of the art (phones) get it on
   a pillar further in instead (place() picks, by what the screen actually shows) ---- */
// (Nov 21, the full-scene scan: the third spot was the far pillar's front, which the vending machine now stands in
// front of, so phones had the graffiti painted ON the machine. Phones see only the art's middle (x 756 to 1075): the
// one clear surface there is the end wall, so that is the third spot.)
const FACES = [{ x: 1128, y: 452, w: 76, h: 156 }, { x: 1046, y: 486, w: 46, h: 104 }, { x: 888, y: 524, w: 22, h: 62 }]; // (under the lowered ceiling, above each plinth; the end wall, below the hanging signs: it stands from y 518 to 575, and the piece's own box is empty in its bottom quarter)
/* the piece itself is painted droplet by droplet by tools/draw-graffiti.mjs (a spray can, not a font:
   hand-drawn strokes, wet cores, overspray mist, spatter, drips, a black shadow pass, a white cat),
   at 4x this 76 x 230 box so it stays crisp; here it is only hung on the pillar */
const graffiti = () => '<image class="gf" href="assets/film/graffiti.webp" width="76" height="230" preserveAspectRatio="none" decoding="async"/>';
const faceTransform = (f, top = f.y) => { // (top: start lower on the face, e.g. under the top bar; it then shrinks to fit, bottom kept)
  const t = Math.max(f.y, Math.min(top, f.y + f.h * 0.45));
  const k = Math.min(f.w / 76, (f.y + f.h - t) / 230);
  return `translate(${(f.x + (f.w - 76 * k) / 2).toFixed(1)} ${(f.y + f.h - 230 * k).toFixed(1)}) scale(${k.toFixed(3)})`;
};

const svg = (cls, defs, body) => `<svg class="st ${cls}" viewBox="0 0 1600 914" preserveAspectRatio="none" aria-hidden="true"><defs>${defs}</defs>${body}</svg>`;

/* ---- the departure board (Nov 19, John: "a train sign where it describes a stop... LET US START THE
   GAME, not static, moving like the billboard, from the right side to the left"; then: "not look like it
   was pasted on... as if it belongs to the scene, 3D, like in the anime... move it a little bit back so
   the Ways to Connect can fit... accurate time, 2:30 p.m. if it's 2:30 p.m., updating constantly").
   A box hung from the ceiling on two rods, built in the station's own perspective: its edges run to the
   vanishing point (870, 548), so from the platform you see its front, its underside and the side that
   faces the middle, like a real board overhead. Cel-shaded like the art: flat tones, bold ink lines, a
   cool rim where the ceiling tubes catch its edges, a thin amber spill from its own LEDs on its lip.
   The screen: the top row scrolls the line in amber LED, right to left, seamless (one composited move);
   the bottom row shows the visitor's own time, 12-hour (2:30 PM), checked every second, in green, and
   our line code JN in red. A fixed grid of dark gaps over the rows reads as LED dots while the text
   slides under it. Original board (no mascot on top); the line is a John-approved homage, like TAKE
   YOUR TIME. ---- */
const VP = [870, 548];
/* where it may hang (its front face, art px; height = SIGN_H x width), in order of preference: back down
   the platform just right of the light strip, a size smaller further back, then the same left of the
   strip (phones on their side crop the ceiling there). The first spot wholly on screen and clear of the
   title's name, the calendar, the contact card and the top bar wins; none fits, no board. */
const SIGN_SPOTS = [
  { x: 900, y: 455, w: 150 }, { x: 896, y: 472, w: 122 },
  { x: 686, y: 455, w: 150 }, { x: 716, y: 472, w: 122 },
  /* then smaller boards further back, for phones held upright (Nov 19, John: "add back the train sign
     hanging from the roof at the back... part of the movie"). Each one keeps the station's perspective:
     at scale sc (1 = the first spot) it hangs at the same real height, so its top sits at
     548 - 334 sc, its rods reach the same ceiling (60 sc long) and it is 150 sc wide; it may sit over
     either side of the platform (o = its left edge from the vanishing point at full size) */
  ...[0.8, 0.7, 0.62, 0.55, 0.5, 0.45, 0.41, 0.37, 0.34].flatMap((sc) => [30, 120, 200, -184, -260]
    .map((o) => ({ x: Math.round(VP[0] + o * sc), y: Math.round(VP[1] - 93 * sc), w: Math.round(150 * sc) }))),
];
/* THE SIGNS, AS A REAL PLATFORM HAS THEM (Nov 21, John, with a reference shot of a Tokyo platform's signs:
   "the textures don't really match the subway background... look at the sign mainly: the exit sign, the
   other sign in back and the digital sign"). The painted board picture (Nano Banana, Nov 20) never matched
   the station: brighter, crisper and grimier than the art round it, with a brass trim the station has
   nowhere; grading it didn't help (a blind judge picked whichever it saw first). Real platform signs are
   plain: a long slim black LED board on two thin rods, a backlit yellow EXIT sign, a white direction sign
   further back. So all three are built in the station's own perspective and light (lit from the strip's
   side, falling off into the dark, thin ink like the art's): the LED board facing down the platform (its
   front a rectangle, its underside and the side toward the middle showing), hung on two rods from the steel
   cross beam; behind it, on rods up into the ceiling, a white sign pointing left to THE CITY (the next scene: where the
   train goes), with our line's red JN tile, and a yellow EXIT sign pointing right, into the station. Our own words and layout; arrows are drawn, not characters. */
const SIGN_H = 34; // the LED board's height at depth 1 (art px): long and slim
const depthOf = (s) => s.w / 150;
const toVP = (pts, r) => pts.map(([x, y]) => [VP[0] + (x - VP[0]) * r, VP[1] + (y - VP[1]) * r]);
/* the board for a spot (art px): its front face, the box behind it, the screen, and the box it needs clear */
function boardAt(s) {
  const d = depthOf(s);
  const flip = s.x + s.w / 2 < VP[0]; // left of the middle: its side face shows on its right
  const w = s.w * 1.12; const x = s.x - s.w * 0.06;
  const y = s.y + 8 * d; const h = SIGN_H * d;
  const bz = 3.2 * d;
  const quad = [[x + bz, y + bz], [x + w - bz, y + bz], [x + w - bz, y + h - bz], [x + bz, y + h - bz]];
  const beamY = VP[1] - CEIL_U * d; // the ceiling over it
  return { x, y, w, h, d, flip, quad, box: { l: x, r: x + w, t: beamY, b: y + h * 1.25 } };
}
/* a CSS matrix3d that maps the rectangle (0,0)-(w,h) onto the quad p (TL TR BR BL) */
export function rectToQuad(w, h, p) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = p;
  const dx1 = x1 - x2; const dx2 = x3 - x2; const dy1 = y1 - y2; const dy2 = y3 - y2;
  const sx = x0 - x1 + x2 - x3; const sy = y0 - y1 + y2 - y3;
  const det = dx1 * dy2 - dx2 * dy1;
  const g = (sx * dy2 - dx2 * sy) / det;
  const hh = (dx1 * sy - sx * dy1) / det;
  const a = x1 - x0 + g * x1; const b = x3 - x0 + hh * x3; const c = x0;
  const d = y1 - y0 + g * y1; const e = y3 - y0 + hh * y3; const f = y0;
  return `matrix3d(${[a / w, d / w, 0, g / w, b / h, e / h, 0, hh / h, 0, 0, 1, 0, c, f, 0, 1].map((n) => +n.toFixed(6)).join(',')})`;
}
/* ---- hung from the roof (Nov 21, John: "the sign is literally just floating in air... connected to the ceiling...
   part of the subway"; and "make the subway station roof lower"). The station's ceiling is now low and lit (the art
   is rebuilt with a panelled ceiling 1.75 m over the eye, see DESIGN.md), so every sign hangs on two short steel rods
   straight up into that ceiling, each ending in a plate with two bolts; the earlier cross beam (needed while the
   ceiling was lost in the dark, 6.5 m up) is gone. In art px at depth d, the ceiling is at y = 548 - 106 d. ---- */
const CEIL_U = 106; // the lowered ceiling, 1.75 m over the eye, in art px at depth 1 (60.6 px per m)
const f2 = (n) => n.toFixed(1);
const pts = (q) => q.map(([x, y]) => `${f2(x)},${f2(y)}`).join(' ');
const INK = '#060607';
/* two rods from a sign's top up to the beam's underside, with a plate and two bolts where they meet it */
function rodsSVG(xs, top, d) {
  const by = VP[1] - CEIL_U * d; // the ceiling at this depth
  let g = '';
  xs.forEach((x) => {
    g += `<rect x="${f2(x - 0.9 * d)}" y="${f2(by)}" width="${f2(1.8 * d)}" height="${f2(top - by)}" fill="#3A3D42" stroke="${INK}" stroke-width="${f2(0.45 * d)}"/>`;
    g += `<polygon points="${pts([[x - 5.5 * d, by - 0.6 * d], [x + 5.5 * d, by - 0.6 * d], [x + 5 * d, by + 2.2 * d], [x - 5 * d, by + 2.2 * d]])}" fill="#2C2F34" stroke="${INK}" stroke-width="${f2(0.6 * d)}" stroke-linejoin="round"/>`;
    [-1, 1].forEach((q) => { g += `<circle cx="${f2(x + q * 3.2 * d)}" cy="${f2(by + 0.8 * d)}" r="${f2(1 * d)}" fill="#6E757E" stroke="${INK}" stroke-width="${f2(0.35 * d)}"/>`; });
  });
  return g;
}
/* a sign box facing down the platform: its front rectangle, the underside and the side toward the middle
   (the box recedes toward the vanishing point), lit from the strip's side */
function boxSVG(x, y, w, h, flip, face, d, id) {
  const fr = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  const bk = toVP(fr, 0.968);
  const sideI = flip ? [1, 2] : [0, 3]; // the side edge toward the middle
  let g = `<polygon points="${pts([fr[3], fr[2], bk[2], bk[3]])}" fill="#0F1012" stroke="${INK}" stroke-width="${f2(0.6 * d)}" stroke-linejoin="round"/>`;
  g += `<polygon points="${pts([fr[sideI[0]], fr[sideI[1]], bk[sideI[1]], bk[sideI[0]]])}" fill="#3B3E44" stroke="${INK}" stroke-width="${f2(0.6 * d)}" stroke-linejoin="round"/>`;
  const lx = flip ? x + w : x; const dx = flip ? x : x + w; // lit edge -> dark edge
  g += `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f2(lx)}" y1="0" x2="${f2(dx)}" y2="0">${face}</linearGradient></defs>`;
  g += `<rect x="${f2(x)}" y="${f2(y)}" width="${f2(w)}" height="${f2(h)}" fill="url(#${id})" stroke="${INK}" stroke-width="${f2(0.7 * d)}"/>`;
  g += `<line x1="${f2(x + 0.8 * d)}" y1="${f2(y + 0.6 * d)}" x2="${f2(x + w - 0.8 * d)}" y2="${f2(y + 0.6 * d)}" stroke="#C9D2DC" stroke-opacity=".28" stroke-width="${f2(0.6 * d)}"/>`;
  return g;
}
const arrow = (cx, cy, sz, dir, fill) => { // a drawn arrow (no arrow characters), pointing left or right
  const m = dir === 'right' ? -1 : 1;
  const a = [[-1, 0], [-0.1, -0.75], [-0.1, -0.28], [1, -0.28], [1, 0.28], [-0.1, 0.28], [-0.1, 0.75]].map(([u, v]) => [u * m, v]);
  return `<polygon points="${pts(a.map(([u, v]) => [cx + u * sz, cy + v * sz]))}" fill="${fill}"/>`;
};
function signsSVG(bd) {
  const { d, flip } = bd;
  let back = '';
  // the second hang, further back: a white sign pointing to THE CITY (the trains) and a backlit yellow EXIT sign
  if (d > 0.45) {
    const d2 = d * 0.6; // (further down the platform: seen just under the board, as in John's reference)
    const L = (o) => VP[0] + o * d2;
    const oa = (bd.x - VP[0]) / d; const ob = (bd.x + bd.w - VP[0]) / d; // the board's lateral span
    const top = VP[1] - 80 * d2; const hh = 23 * d2; // (1.32 m over the eye, just under the ceiling)
    // (Nov 21, John: "it doesn't make sense that the exit sign is pointing to the trains and the city's pointing to
    // the wall"): each sign now points where its thing really is, and hangs on that side. THE CITY is where the train
    // takes you (the next scene), so it hangs on the track side and points LEFT, at the trains; EXIT hangs on the hall
    // side and points RIGHT, away from the tracks, into the station. Same on every screen (the tracks are always left).
    const span = (u0, u1) => [L(oa + (ob - oa) * u0), L(oa + (ob - oa) * u1)];
    const [dx0, dx1] = span(0.02, 0.56); const [ex0, ex1] = span(0.62, 0.98);
    back += rodsSVG([dx0 + (dx1 - dx0) * 0.2, dx0 + (dx1 - dx0) * 0.8, ex0 + (ex1 - ex0) * 0.2, ex0 + (ex1 - ex0) * 0.8], top, d2);
    const fs = (13.5 * d2).toFixed(1);
    // THE CITY: white face, an arrow to the trains, a red JN tile (our line), the words
    back += `<rect x="${f2(dx0 - 2 * d2)}" y="${f2(top - 2 * d2)}" width="${f2(dx1 - dx0 + 4 * d2)}" height="${f2(hh + 4 * d2)}" fill="#DCE3EA" opacity=".12" filter="url(#slBloom)"/>`;
    back += boxSVG(dx0, top, dx1 - dx0, hh, flip, '<stop offset="0" stop-color="#E6EAEE"/><stop offset="1" stop-color="#8E959D"/>', d2, 'ssDiF');
    back += arrow(dx0 + 9 * d2, top + hh / 2, 6 * d2, 'left', '#0B0B0B');
    back += `<rect x="${f2(dx0 + 18 * d2)}" y="${f2(top + 4 * d2)}" width="${f2(14 * d2)}" height="${f2(hh - 8 * d2)}" fill="#C8161A"/>`;
    back += `<text x="${f2(dx0 + 25 * d2)}" y="${f2(top + hh * 0.7)}" font-size="${(9 * d2).toFixed(1)}" fill="#F5F5F0" text-anchor="middle" style="font-family:var(--f-menu)">JN</text>`;
    back += `<text x="${f2(dx0 + 36 * d2)}" y="${f2(top + hh * 0.76)}" font-size="${fs}" fill="#0B0B0B" style="font-family:var(--f-menu);letter-spacing:.05em">THE CITY</text>`;
    // EXIT: a glow round it (it is lit from inside), the yellow face, the word and a black arrow into the station
    back += `<rect x="${f2(ex0 - 3 * d2)}" y="${f2(top - 3 * d2)}" width="${f2(ex1 - ex0 + 6 * d2)}" height="${f2(hh + 6 * d2)}" fill="#E8B923" opacity=".22" filter="url(#slBloom)"/>`;
    back += boxSVG(ex0, top, ex1 - ex0, hh, flip, '<stop offset="0" stop-color="#E9BE24"/><stop offset="1" stop-color="#9E7E12"/>', d2, 'ssExF');
    back += `<text x="${f2(ex0 + 6 * d2)}" y="${f2(top + hh * 0.76)}" font-size="${fs}" fill="#0B0B0B" style="font-family:var(--f-menu);letter-spacing:.06em">EXIT</text>`;
    back += arrow(ex1 - 9 * d2, top + hh / 2, 6.2 * d2, 'right', '#0B0B0B');
  }
  // the LED board itself, on its beam: a slim charcoal box, the screen inset in it
  back += rodsSVG([bd.x + bd.w * 0.16, bd.x + bd.w * 0.84], bd.y, d);
  back += boxSVG(bd.x, bd.y, bd.w, bd.h, flip, '<stop offset="0" stop-color="#3C3F45"/><stop offset=".6" stop-color="#202226"/><stop offset="1" stop-color="#141517"/>', d, 'ssBdF');
  const [q0, , q2] = bd.quad;
  back += `<rect x="${f2(q0[0])}" y="${f2(q0[1])}" width="${f2(q2[0] - q0[0])}" height="${f2(q2[1] - q0[1])}" fill="#08080A" stroke="${INK}" stroke-width="${f2(0.5 * d)}"/>`;
  return back;
}
const SIGN_LINE = 'LET US START THE GAME';
const signHTML = () => `<div class="ss" hidden>
  <svg class="st ss-signs" viewBox="0 0 1600 914" preserveAspectRatio="none" aria-hidden="true"></svg>
  <div class="ss-plane"><div class="ss-screen"><div class="ss-row">
    <b class="ss-time"><span class="ss-h">12</span><span class="ss-colon">:</span><span class="ss-m">00</span><small class="ss-ap">PM</small></b>
    <div class="ss-win"><div class="ss-run"><span>${SIGN_LINE}</span><span>${SIGN_LINE}</span></div></div>
    <b class="ss-code">JN</b>
  </div></div></div>
</div>`;
/* what the board must keep clear of (their boxes on screen, measured on resize and as the title settles) */
const SIGN_KEEP_CLEAR = '#titleName .rl, #hudDate .hud-cal, #contactCard, .hud-tr'; // (the name's letters, not its full-width line)
let clearOf = [];
function measureClear() {
  if (document.body.dataset.mode !== 'title') return;
  clearOf = [...document.querySelectorAll(SIGN_KEEP_CLEAR)].filter((el) => getComputedStyle(el).visibility !== 'hidden').map((el) => el.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0);
}
/* art px -> screen px from the layer's real box on screen (it sits inside the camera's slow push-in) */
/* art px -> screen px, measured: the layer sits inside the camera's tilt (-3deg) and push-in, so its box on
   screen is not a plain scale of the art (the tilt alone moved a board at a phone's left edge ~36 px lower
   than a plain scale put it, onto the name). Three probe points give the exact affine map. */
function artToScreen(wrap) {
  const at = ([x, y]) => {
    const i = document.createElement('i');
    i.style.cssText = `position:absolute;left:${(x / 1600) * 100}%;top:${(y / 914) * 100}%;width:0;height:0`;
    wrap.appendChild(i);
    const r = i.getBoundingClientRect();
    i.remove();
    return [r.left, r.top];
  };
  const o = at([0, 0]); const ex = at([1600, 0]); const ey = at([0, 914]);
  return ([x, y]) => [o[0] + ((ex[0] - o[0]) * x) / 1600 + ((ey[0] - o[0]) * y) / 914, o[1] + ((ex[1] - o[1]) * x) / 1600 + ((ey[1] - o[1]) * y) / 914];
}
function pickSpot(wrap) {
  const pad = window.innerWidth < 600 ? 10 : 22; // (room for the rest of the push-in; less on a phone, where the boards are small)
  const W = window.innerWidth;
  const H = window.innerHeight;
  const map = artToScreen(wrap);
  return SIGN_SPOTS.find((s) => {
    const { box } = boardAt(s);
    const pts = [[box.l, box.t], [box.r, box.t], [box.r, box.b], [box.l, box.b]].map(map);
    const r = { l: Math.min(...pts.map((q) => q[0])), r: Math.max(...pts.map((q) => q[0])), t: Math.min(...pts.map((q) => q[1])), b: Math.max(...pts.map((q) => q[1])) };
    if (r.l < 6 || r.t < 6 || r.r > W - 6 || r.b > H * 0.6) return false;
    return !clearOf.some((o) => r.l < o.right + pad && r.r > o.left - pad && r.t < o.bottom + pad && r.b > o.top - pad);
  }) || null;
}
/* the bottom row's clock: the visitor's own time, 12-hour, checked every second (it only writes when the
   minute turns) and at once when the page comes back into view */
function signClock(wrap) {
  const h = wrap.querySelector('.ss-h');
  const m = wrap.querySelector('.ss-m');
  const ap = wrap.querySelector('.ss-ap');
  let last = '';
  const tick = () => {
    const d = new Date();
    const hr = d.getHours();
    const t = `${hr % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${hr < 12 ? 'AM' : 'PM'}`;
    if (t === last) return;
    last = t;
    h.textContent = String(hr % 12 || 12);
    m.textContent = String(d.getMinutes()).padStart(2, '0');
    ap.textContent = hr < 12 ? 'AM' : 'PM';
  };
  tick();
  setInterval(() => { if (!document.hidden) tick(); }, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
}

/* ---- platform guardrails (Nov 21, John, from a reference of a real Tokyo platform: "the hand guardrails near the
   train track"). Steel barrier sections standing on the platform's edge strip, between where the doors would stop:
   a top rail, a low rail, close vertical bars and end posts, in the station's own perspective (floor at 1.6 m below
   the eye; a point X across, Y up, Z deep sits at x = 870 + 1040 X / Z, y = 548 - 1040 Y / Z, 1600-px art), dark
   blue-grey steel catching the tubes along its top, a soft shadow at its foot. They live on a layer ABOVE the
   train's canvases, so the train passes behind them. ---- */
const RAIL_X = -2.22; // on the edge strip, just inside the grip grooves (m)
const RAIL_RUNS = [[9.2, 10.9], [14.6, 16.3], [20.4, 22.1], [27.2, 28.9], [35.6, 37.3], [45.8, 47.5]];
/* (Nov 21, John: "look at the guardrails for this reference photo, make it exactly like that"): each section is one
   bent-tube frame, navy steel, its top corners ROUNDED down into the end posts, a bottom rail just above the floor
   on two small feet, and five evenly spaced vertical bars from the bottom rail up into the top rail; 1.1 m tall. */
function railsSVG() {
  const F = 1040; const EY = 1.6;
  const P = (X, h, Z) => [VP[0] + (F * X) / Z, VP[1] - (F * (h - EY)) / Z];
  const line = (q) => q.map(([x, y]) => `${f2(x)},${f2(y)}`).join(' ');
  const navy = '#34405C'; const lit = '#7F8DAA';
  const TOP = 1.1; const LOW = 0.16; const R = 0.2;
  let g = '';
  RAIL_RUNS.forEach(([z0, z1]) => {
    const zm = (z0 + z1) / 2; const px = F / zm; // px per metre here
    const tube = 0.042 * px; const thin = 0.026 * px; const inkw = Math.max(0.5, 0.012 * px);
    // its shadow on the floor
    g += `<polygon points="${line([P(RAIL_X - 0.03, 0, z0), P(RAIL_X - 0.03, 0, z1), P(RAIL_X + 0.18, 0, z1), P(RAIL_X + 0.18, 0, z0)])}" fill="#000" opacity=".3"/>`;
    // the frame: far post up, round corner, top rail, round corner, near post down (one bent tube)
    const fr = [];
    fr.push([z1, 0.03]);
    for (let k = 0; k <= 8; k++) { const t = (Math.PI / 2) * (k / 8); fr.push([z1 - R + R * Math.cos(t), TOP - R + R * Math.sin(t)]); }
    for (let k = 0; k <= 8; k++) { const t = Math.PI / 2 + (Math.PI / 2) * (k / 8); fr.push([z0 + R + R * Math.cos(t), TOP - R + R * Math.sin(t)]); }
    fr.push([z0, 0.03]);
    const frP = fr.map(([z, h]) => P(RAIL_X, h, z));
    // bars and the bottom rail first (under the frame)
    const n = 6; // (Nov 21, John: "only 5 bars"): five bars, evenly spaced, from the bottom rail up into the top rail
    for (let k = 1; k < n; k++) {
      const z = z1 - ((z1 - z0) * k) / n; const [a1, a2] = [P(RAIL_X, LOW, z), P(RAIL_X, TOP, z)];
      g += `<polyline points="${line([a1, a2])}" fill="none" stroke="${INK}" stroke-width="${f2(thin + inkw * 2)}"/>`;
      g += `<polyline points="${line([a1, a2])}" fill="none" stroke="${navy}" stroke-width="${f2(thin)}"/>`;
    }
    const low = [P(RAIL_X, LOW, z1), P(RAIL_X, LOW, z0)];
    g += `<polyline points="${line(low)}" fill="none" stroke="${INK}" stroke-width="${f2(tube + inkw * 2)}"/><polyline points="${line(low)}" fill="none" stroke="${navy}" stroke-width="${f2(tube)}"/>`;
    g += `<polyline points="${line(frP)}" fill="none" stroke="${INK}" stroke-width="${f2(tube + inkw * 2)}" stroke-linejoin="round"/>`;
    g += `<polyline points="${line(frP)}" fill="none" stroke="${navy}" stroke-width="${f2(tube)}" stroke-linejoin="round"/>`;
    // the tube catches the ceiling light along its top
    const hiP = fr.map(([z, h]) => P(RAIL_X, h + 0.012, z)).slice(1, -1);
    g += `<polyline points="${line(hiP)}" fill="none" stroke="${lit}" stroke-opacity=".7" stroke-width="${f2(tube * 0.32)}" stroke-linejoin="round"/>`;
    // the feet: small plates bolted to the floor under each post
    [z1, z0].forEach((z) => {
      g += `<polygon points="${line([P(RAIL_X - 0.06, 0.015, z - 0.05), P(RAIL_X - 0.06, 0.015, z + 0.05), P(RAIL_X + 0.06, 0.015, z + 0.05), P(RAIL_X + 0.06, 0.015, z - 0.05)])}" fill="#1C2333" stroke="${INK}" stroke-width="${f2(inkw)}"/>`;
    });
  });
  return g;
}

export function mountStation(box, before) {
  const wrap = document.createElement('div');
  wrap.className = 'st-wrap';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = svg('st-dim', '<radialGradient id="slDim"><stop offset=".25" stop-color="#3A3C40" stop-opacity=".95"/><stop offset=".7" stop-color="#3A3C40" stop-opacity=".45"/><stop offset="1" stop-color="#3A3C40" stop-opacity="0"/></radialGradient>', lightsDim())
    + svg('st-body', '<radialGradient id="slFloor"><stop offset=".5" stop-color="#313134" stop-opacity=".97"/><stop offset=".8" stop-color="#313134" stop-opacity=".6"/><stop offset="1" stop-color="#313134" stop-opacity="0"/></radialGradient>', lightsBody() + `<g class="gf-at" transform="${faceTransform(FACES[0])}">${graffiti()}</g>`)
    + svg('st-glow', `<filter id="slBloom" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5" result="a"/><feGaussianBlur in="SourceGraphic" stdDeviation="14" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="a"/></feMerge></filter>
      <radialGradient id="slSpill"><stop offset="0" stop-color="#E8C48A" stop-opacity=".22"/><stop offset="1" stop-color="#E8C48A" stop-opacity="0"/></radialGradient>`, lightsGlow());
  wrap.insertAdjacentHTML('beforeend', signHTML());
  signClock(wrap);
  const sign = wrap.querySelector('.ss');
  const screen = sign.querySelector('.ss-screen');
  const signsEl = sign.querySelector('.ss-signs');
  let spot;
  let placedOnce = false;
  const hang = () => {
    if (!placedOnce || !ready) return;
    const s = document.body.dataset.mode === 'title' || !spot ? pickSpot(wrap) : spot; // (it never moves mid-shot)
    if (s === spot) return;
    spot = s;
    sign.hidden = !s;
    if (!s) return;
    const bd = boardAt(s);
    signsEl.innerHTML = signsSVG(bd);
    const [p0, p1, p2, p3] = bd.quad; // the text box, the screen's own size (art px), mapped onto its corners
    const sw = (Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + Math.hypot(p2[0] - p3[0], p2[1] - p3[1])) / 2;
    const sh = (Math.hypot(p3[0] - p0[0], p3[1] - p0[1]) + Math.hypot(p2[0] - p1[0], p2[1] - p1[1])) / 2;
    Object.assign(screen.style, { width: `${sw.toFixed(2)}px`, height: `${sh.toFixed(2)}px`, fontSize: `${(s.w * 0.072).toFixed(2)}px`, transform: rectToQuad(sw, sh, bd.quad) });
  };
  const remeasure = () => { if (!ready || document.body.dataset.mode !== 'title') return; measureClear(); spot = undefined; hang(); }; // (decided on the title only)
  // it decides once the title has settled (its fonts in, the fit guard done), then fades in; after that
  // it only moves when the screen changes size or the fit guard rearranges the title (body classes)
  let ready = false;
  sign.hidden = true;
  // (waits for the brand fonts itself: this file is also loaded outside a browser by the tests' pure math)
  const fontsIn = Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 3000))]);
  // (1.6 s: the name's letters have dropped in and the fit guard has settled them; measured earlier, the
  // board could land on a name that then moved under it)
  fontsIn.then(() => setTimeout(() => { ready = true; remeasure(); sign.classList.add('in'); }, 1600));
  let rt = 0;
  const later = () => { clearTimeout(rt); rt = setTimeout(remeasure, 200); };
  window.addEventListener('resize', later, { passive: true });
  const nameEl = document.getElementById('titleName');
  if (nameEl && window.ResizeObserver) new ResizeObserver(later).observe(nameEl); // (and again if the name's box changes)
  new MutationObserver(later).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  box.insertBefore(wrap, before);
  // the guardrails, on their own layer above the train (appended last: over its canvases)
  const front = document.createElement('div');
  front.className = 'st-wrap st-front';
  front.setAttribute('aria-hidden', 'true');
  front.innerHTML = svg('st-rails', '', railsSVG());
  box.appendChild(front);
  const gfAt = wrap.querySelector('.gf-at');
  let placed = '';
  const groups = PANELS.map((_, i) => [...wrap.querySelectorAll(`.sl[data-l="${i}"]`)]);
  const set = (i, st) => groups[i].forEach((g) => { g.dataset.st = st; }); // on | off | dim
  PANELS.forEach((_, i) => set(i, 'on'));
  flicker(set);
  return {
    /** place the layer where the <img> shows the art (object-fit cover math, CSS px) */
    place(k, ox, oy) {
      const key = `${k.toFixed(4)} ${ox.toFixed(1)} ${oy.toFixed(1)}`;
      if (key === placed) return; // (called every frame of the train shot: only moves when the camera does)
      placed = key;
      Object.assign(wrap.style, { width: `${1600 * k}px`, height: `${914 * k}px`, left: `${ox}px`, top: `${oy}px` });
      Object.assign(front.style, { width: wrap.style.width, height: wrap.style.height, left: wrap.style.left, top: wrap.style.top });
      wrap.style.setProperty('--k', k.toFixed(4)); // (CSS px per art px: the departure board is sized in art px)
      placedOnce = true;
      if (spot === undefined) hang(); // (the first placement; later ones keep the spot it picked)
      // the graffiti goes on pillar 2 if the screen shows it whole, else on pillar 3 (narrow screens)
      const right = (box.offsetWidth * 0.94 - ox) / k; // the art's x at the visible right edge (the box overhangs 6%)
      // (a margin for the camera's tilt and slow push, which crop a little more)
      const face = FACES.find((f) => f.x + f.w + 40 < right) || FACES[FACES.length - 1];
      // (Nov 21, John's phone held sideways: the top bar covered TAKE. The art's y just under the top bar: the box
      // overhangs the screen by 6%, and a margin for the camera's tilt and push)
      const bar = document.querySelector('.hud-tr')?.getBoundingClientRect();
      const under = bar && bar.width ? (bar.bottom + box.offsetHeight * 0.06 / 1.12 - oy) / k + 26 : 0;
      const tf = faceTransform(face, under);
      if (gfAt.getAttribute('transform') !== tf) gfAt.setAttribute('transform', tf);
    },
  };
}

/* the aging tubes' clock: each tube waits its own random time, then misbehaves in one of a few ways */
function flicker(set) {
  const reduce = () => document.body.classList.contains('reduce-motion') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const live = () => document.body.dataset.mode === 'title' && !document.hidden && !reduce();
  const rnd = (a, b) => a + Math.random() * (b - a);
  let busy = false; // a healthy tube is acting up right now
  const run = (i, steps, done) => { // steps: [state, ms] in order
    let k = 0;
    const next = () => {
      if (k >= steps.length) { done(); return; }
      const [st, ms] = steps[k++];
      set(i, st);
      setTimeout(next, ms);
    };
    next();
  };
  const episode = (i) => {
    const tired = TIRED.has(i);
    const r = Math.random();
    if (r < 0.5) return [['off', rnd(40, 110)], ['on', 0]]; // a blip
    if (r < 0.85 || tired) { // a stutter: the starter trying again
      const s = [];
      const n = 3 + Math.floor(Math.random() * 5);
      for (let j = 0; j < n; j++) s.push([j % 2 ? 'on' : (tired && Math.random() < 0.4 ? 'dim' : 'off'), rnd(30, 120)]);
      if (tired && Math.random() < 0.35) s.push(['dim', rnd(700, 2200)]); // and hangs dim for a while
      return [...s, ['on', 0]];
    }
    return [['off', rnd(800, 2000)], ['on', 60], ['off', 80], ['on', 40], ['off', 50], ['on', 0]]; // drops out, re-strikes
  };
  const schedule = (i) => {
    const tired = TIRED.has(i);
    setTimeout(() => {
      if (!live() || (!tired && busy)) { schedule(i); return; } // not on screen, or another tube is mid-flicker
      if (!tired) busy = true;
      run(i, episode(i), () => { if (!tired) busy = false; schedule(i); });
    }, tired ? rnd(1500, 6500) : rnd(6000, 30000));
  };
  PANELS.forEach((_, i) => setTimeout(() => schedule(i), rnd(0, 4000)));
}
