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
export const PANELS = [
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
   with the floor's own tone, soft-edged, in the same group as the tube, so the two can never disagree.
   (Nov 21, the lighting pass: the cover was an opaque cool grey from the old dark floor; on today's lighter, warm
   floor a tube going off punched a dark oval into the tiles, and both judges flagged it: "a dark oval blob not tied
   to any object". It is a soft warm shade now, just enough to take the streak down to the floor beside it (about
   130 to 90), and the tile joints show through it.) */
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
   cross beam; and one more, its own sign on its own rods (see cityAt): a white sign pointing left to THE CITY (the next
   scene: where the train goes), with our line's red JN tile. (The yellow EXIT sign of Nov 21 was taken down on Nov 22:
   John wanted two signs, not three.) Our own words and layout; arrows are drawn, not characters. */
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
/* (Nov 21, John: "the sign is a little out of place, doesn't really look like it is part of the train station...
   full, drawn out designs that match our current design"). The signs are now built from the station's own stuff:
   WARM steel (the pillar bases' dark warm grey, not the cool charcoal they had), lit from above by the warm tubes
   (a cream line along every top edge, the faces darker toward the bottom where dust gathers), and fully fitted
   out like real platform signage: framed faces held by corner screws, the LED housing in three bolted modules with
   the station's yellow line along its lower lip and the LEDs' amber on it, a junction box on top and a conduit
   clipped up the rod into the ceiling. */
const STEEL = { rod: '#4B463C', lit: '#B9AC8E', plate: '#36322B', bolt: '#978D78', side: '#454036', under: '#12110F', frame: '#24221D', rim: '#F3DFB4' };
/* two rods from a sign's top up into the ceiling, each with a plate and two bolts where it meets it; lit: which
   side of the rod faces the light strip (-1 left, 1 right) */
function rodsSVG(xs, top, d, lit = -1, glow = '') {
  const by = VP[1] - CEIL_U * d; // the ceiling at this depth
  let g = '';
  xs.forEach((x) => {
    g += `<rect x="${f2(x - 0.9 * d)}" y="${f2(by)}" width="${f2(1.8 * d)}" height="${f2(top - by)}" fill="${STEEL.rod}" stroke="${INK}" stroke-width="${f2(0.45 * d)}"/>`;
    g += `<line x1="${f2(x + lit * 0.45 * d)}" y1="${f2(by + 2.6 * d)}" x2="${f2(x + lit * 0.45 * d)}" y2="${f2(top - 0.6 * d)}" stroke="${STEEL.lit}" stroke-opacity=".7" stroke-width="${f2(0.4 * d)}"/>`;
    // the plate's shadow on the ceiling, thrown away from the light strip, then the plate
    g += `<polygon points="${pts([[x - 5.5 * d - lit * 2.6 * d, by - 0.6 * d], [x + 5.5 * d - lit * 2.6 * d, by - 0.6 * d], [x + 5 * d - lit * 2.2 * d, by + 3.4 * d], [x - 5 * d - lit * 2.2 * d, by + 3.4 * d]])}" fill="#020203" fill-opacity=".62"/>`;
    g += `<polygon points="${pts([[x - 5.5 * d, by - 0.6 * d], [x + 5.5 * d, by - 0.6 * d], [x + 5 * d, by + 2.2 * d], [x - 5 * d, by + 2.2 * d]])}" fill="${STEEL.plate}" stroke="${INK}" stroke-width="${f2(0.6 * d)}" stroke-linejoin="round"/>`;
    g += `<line x1="${f2(x - 4.6 * d)}" y1="${f2(by + 1.9 * d)}" x2="${f2(x + 4.6 * d)}" y2="${f2(by + 1.9 * d)}" stroke="${STEEL.lit}" stroke-opacity=".45" stroke-width="${f2(0.35 * d)}"/>`; // the tubes on its lower lip
    [-1, 1].forEach((q) => { g += `<circle cx="${f2(x + q * 3.2 * d)}" cy="${f2(by + 0.8 * d)}" r="${f2(1 * d)}" fill="${STEEL.bolt}" stroke="${INK}" stroke-width="${f2(0.35 * d)}"/>`; });
    // the collar where the rod meets the sign
    g += `<rect x="${f2(x - 1.9 * d)}" y="${f2(top - 1.6 * d)}" width="${f2(3.8 * d)}" height="${f2(1.6 * d)}" fill="${STEEL.plate}" stroke="${INK}" stroke-width="${f2(0.4 * d)}"/>`;
    // a lit sign throws its own colour up onto its hangers: on the collar, and fading a little way up the rod
    if (glow) g += `<rect x="${f2(x - 1.5 * d)}" y="${f2(top - 1.25 * d)}" width="${f2(3 * d)}" height="${f2(0.9 * d)}" fill="${glow}" fill-opacity=".5"/><rect x="${f2(x - 0.7 * d)}" y="${f2(top - 5.2 * d)}" width="${f2(1.4 * d)}" height="${f2(3.6 * d)}" fill="${glow}" fill-opacity=".2"/>`;
  });
  return g;
}
/* a sign box facing down the platform: its front rectangle, the underside and the side toward the middle
   (the box recedes toward the vanishing point), lit from above by the tubes. o.frame: a dark steel frame round
   the face, that thick (art px at depth 1), with a screw in each corner */
function boxSVG(x, y, w, h, flip, face, d, id, o = {}) {
  const fr = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  const bk = toVP(fr, 0.968);
  const sideI = flip ? [1, 2] : [0, 3]; // the side edge toward the middle
  let g = `<polygon points="${pts([fr[3], fr[2], bk[2], bk[3]])}" fill="${STEEL.under}" stroke="${INK}" stroke-width="${f2(0.6 * d)}" stroke-linejoin="round"/>`;
  g += `<polygon points="${pts([fr[sideI[0]], fr[sideI[1]], bk[sideI[1]], bk[sideI[0]]])}" fill="${STEEL.side}" stroke="${INK}" stroke-width="${f2(0.6 * d)}" stroke-linejoin="round"/>`;
  const lx = flip ? x + w : x; const dx = flip ? x : x + w; // lit edge -> dark edge
  g += `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f2(lx)}" y1="0" x2="${f2(dx)}" y2="0">${face}</linearGradient>`
    + `<linearGradient id="${id}V" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".5" stop-color="#000" stop-opacity=".04"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient></defs>`;
  g += `<rect x="${f2(x)}" y="${f2(y)}" width="${f2(w)}" height="${f2(h)}" fill="url(#${id})" stroke="${INK}" stroke-width="${f2(0.7 * d)}"/>`;
  g += `<rect x="${f2(x)}" y="${f2(y)}" width="${f2(w)}" height="${f2(h)}" fill="url(#${id}V)"/>`; // dust and shade low down
  if (o.frame) {
    const t = o.frame * d;
    g += `<rect x="${f2(x + t / 2)}" y="${f2(y + t / 2)}" width="${f2(w - t)}" height="${f2(h - t)}" fill="none" stroke="${STEEL.frame}" stroke-width="${f2(t)}"/>`;
    g += `<rect x="${f2(x + t)}" y="${f2(y + t)}" width="${f2(w - 2 * t)}" height="${f2(h - 2 * t)}" fill="none" stroke="${INK}" stroke-width="${f2(0.4 * d)}"/>`;
    [[x + t / 2, y + t / 2], [x + w - t / 2, y + t / 2], [x + w - t / 2, y + h - t / 2], [x + t / 2, y + h - t / 2]].forEach(([cx, cy]) => { g += `<circle cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(t * 0.26)}" fill="${STEEL.bolt}"/>`; });
  }
  g += `<line x1="${f2(x + 0.8 * d)}" y1="${f2(y + 0.6 * d)}" x2="${f2(x + w - 0.8 * d)}" y2="${f2(y + 0.6 * d)}" stroke="${STEEL.rim}" stroke-opacity=".5" stroke-width="${f2(0.6 * d)}"/>`; // the tubes on its top edge
  return g;
}
const arrow = (cx, cy, sz, dir, fill) => { // a drawn arrow (no arrow characters), pointing left or right
  const m = dir === 'right' ? -1 : 1;
  const a = [[-1, 0], [-0.1, -0.75], [-0.1, -0.28], [1, -0.28], [1, 0.28], [-0.1, 0.28], [-0.1, 0.75]].map(([u, v]) => [u * m, v]);
  return `<polygon points="${pts(a.map(([u, v]) => [cx + u * sz, cy + v * sz]))}" fill="${fill}"/>`;
};
/* THE CITY SIGN IS ITS OWN SIGN (Nov 22, John: "remove the exit sign so we can have a total of 2 signs... only the city and
   the main sign. And for the city sign, try to make it its own separate sign. It kind of looks like they're connected
   together... Separate them. A big sign and the smaller sign, which is the city pointing to the train"; then, the same day:
   "right now it looks like one sign or three signs that is fit into one... it doesn't look cramped. Try to make it
   Japanese style, Persona 5 style in our design... find the root cause of why it looks weird... make sure the city sign is
   not on top of the lights").
   Why it looked weird, three causes: (1) ONE SPAN: the second hang (THE CITY and EXIT) was laid out on the big board's own
   lateral span, further down the platform, so on screen the small signs sat exactly under the board, edge to edge with it,
   a lower row of the same unit. (2) ON THE LIGHTS: moved out from under the board, it was still hung by the board's
   position, and that put it across the ceiling's light strip (the tubes run 2 to 30 units left of the vanishing point):
   a pale sign in front of a row of lamps, glare behind it, its edge lost. (3) A BADGE, NOT A SIGN: a white box with a small
   arrow, a tile and words in a row is a web label; nothing in it says platform sign.
   Now: two signs, one each side of the light strip, hung at the same depth and height like a pair on one platform. The big
   LED board on the hall side; THE CITY on the track side, over the platform's edge half (so it clears the train, whose
   side runs 174 units out), its right end 8 units short of the tubes and their glow at every depth. It is placed by the
   STATION (fixed lateral lines), not by the board. Its face is a Japanese platform direction sign in our red, black and
   white: a red block at the track end with the white arrow (cut on our slant), the line's roundel (a red ring, JN), the
   destination in heavy caps, and the line's red band along the bottom, the way a running-in board carries its line colour. */
const CITY_O = [-142, -38]; // its lateral span at depth 1, art px from the vanishing point (the tubes: -30 to -2; the platform's edge: -160)
function cityAt(bd) {
  const { d } = bd;
  const x0 = VP[0] + CITY_O[0] * d; const x1 = VP[0] + CITY_O[1] * d;
  const top = VP[1] - 82 * d; const hh = 28 * d; // (its top a little under the board's: hung from the same ceiling)
  return { x0, x1, top, hh, box: { l: x0 - 3 * d, r: x1 + 3 * d, t: VP[1] - CEIL_U * d, b: top + hh + 4 * d } };
}
function signsSVG(bd, city = true) { // city: false where THE CITY has no clear room of its own on this screen (the board hangs alone)
  const { d, flip } = bd;
  let back = '';
  if (city) {
    const { x0, x1, top, hh } = cityAt(bd);
    const w = x1 - x0;
    back += rodsSVG([x0 + w * 0.2, x0 + w * 0.8], top, d, 1); // (lit from its right: the strip is on that side of it)
    back += `<rect x="${f2(x0 - 2 * d)}" y="${f2(top - 2 * d)}" width="${f2(w + 4 * d)}" height="${f2(hh + 4 * d)}" fill="#EDE0C0" opacity=".1" filter="url(#slBloom)"/>`;
    back += boxSVG(x0, top, w, hh, true, '<stop offset="0" stop-color="#F0EADA"/><stop offset="1" stop-color="#A39A86"/>', d, 'ssDiF', { frame: 1.5 });
    const m = 3.2 * d; // the frame's width: everything sits inside it
    const band = 3.6 * d; // the line's red band along the bottom
    const cy0 = top + m; const ch = hh - 2 * m - band - 1 * d; // the row the block, the roundel and the words stand in
    // the line band (its track end cut on our slant), and a thin ink line over it
    back += `<polygon points="${pts([[x0 + m, top + hh - m - band], [x1 - m, top + hh - m - band], [x1 - m, top + hh - m], [x0 + m, top + hh - m]])}" fill="#C8161A"/>`;
    back += `<line x1="${f2(x0 + m)}" y1="${f2(top + hh - m - band)}" x2="${f2(x1 - m)}" y2="${f2(top + hh - m - band)}" stroke="${INK}" stroke-width="${f2(0.35 * d)}"/>`;
    // the red block at the track end, its inner edge on our slant, the white arrow pointing at the trains
    const bw = ch * 1.25;
    back += `<polygon points="${pts([[x0 + m, cy0], [x0 + m + bw + ch * 0.21, cy0], [x0 + m + bw, cy0 + ch], [x0 + m, cy0 + ch]])}" fill="#C8161A" stroke="${INK}" stroke-width="${f2(0.35 * d)}" stroke-linejoin="round"/>`;
    back += arrow(x0 + m + bw * 0.5, cy0 + ch / 2, ch * 0.4, 'left', '#F5F5F0');
    // the line's roundel: a red ring on white, JN in it
    const rr = ch * 0.5; const rx = x0 + m + bw + ch * 0.21 + rr + 2.2 * d;
    back += `<circle cx="${f2(rx)}" cy="${f2(cy0 + ch / 2)}" r="${f2(rr - 0.8 * d)}" fill="#F5F5F0" stroke="#C8161A" stroke-width="${f2(1.6 * d)}"/>`;
    back += `<text x="${f2(rx)}" y="${f2(cy0 + ch / 2 + rr * 0.3)}" font-size="${(rr * 0.9).toFixed(1)}" fill="#0B0B0B" text-anchor="middle" style="font-family:var(--f-head)">JN</text>`;
    // the destination
    back += `<text x="${f2(rx + rr + 2.6 * d)}" y="${f2(cy0 + ch * 0.86)}" font-size="${(ch * 1.02).toFixed(1)}" fill="#0B0B0B" style="font-family:var(--f-menu);letter-spacing:.04em">THE CITY</text>`;
  }
  // the LED board itself: a slim warm-steel housing in three bolted modules, the screen inset in it
  const lit = flip ? 1 : -1;
  const rodX = [bd.x + bd.w * 0.16, bd.x + bd.w * 0.84];
  const far = flip ? rodX[0] : rodX[1]; // the rod away from the light strip carries the power
  back += rodsSVG(rodX, bd.y, d, lit, '#FFB23E'); // (the LEDs' amber on the board's own hangers)
  // the LEDs' light spilling round the housing onto the dark ceiling behind it (faint: the board is small and dim)
  back += `<rect x="${f2(bd.x + bd.w * 0.08)}" y="${f2(bd.y - 1.5 * d)}" width="${f2(bd.w * 0.84)}" height="${f2(bd.h + 3 * d)}" fill="#FFB23E" opacity=".1" filter="url(#slBloom)"/>`;
  // its power: a conduit clipped up that rod into the ceiling, from a junction box on the housing's top
  const cx = far - lit * 2.3 * d; const cTop = VP[1] - CEIL_U * d + 2.2 * d;
  back += `<rect x="${f2(cx - 0.55 * d)}" y="${f2(cTop)}" width="${f2(1.1 * d)}" height="${f2(bd.y - cTop - 3 * d)}" fill="#1B1A17" stroke="${INK}" stroke-width="${f2(0.3 * d)}"/>`;
  [0.3, 0.7].forEach((t) => { const y = cTop + (bd.y - cTop) * t; back += `<rect x="${f2(Math.min(cx, far) - 1.2 * d)}" y="${f2(y)}" width="${f2(Math.abs(cx - far) + 2.4 * d)}" height="${f2(1.1 * d)}" fill="${STEEL.bolt}" stroke="${INK}" stroke-width="${f2(0.3 * d)}"/>`; });
  back += `<rect x="${f2(cx - 2.6 * d)}" y="${f2(bd.y - 3.4 * d)}" width="${f2(5.2 * d)}" height="${f2(3.4 * d)}" fill="${STEEL.plate}" stroke="${INK}" stroke-width="${f2(0.45 * d)}"/>`;
  back += `<line x1="${f2(cx - 2 * d)}" y1="${f2(bd.y - 2.8 * d)}" x2="${f2(cx + 2 * d)}" y2="${f2(bd.y - 2.8 * d)}" stroke="${STEEL.rim}" stroke-opacity=".45" stroke-width="${f2(0.4 * d)}"/>`;
  back += boxSVG(bd.x, bd.y, bd.w, bd.h, flip, '<stop offset="0" stop-color="#4C473D"/><stop offset=".6" stop-color="#2B2823"/><stop offset="1" stop-color="#1B1A16"/>', d, 'ssBdF');
  const [q0, , q2] = bd.quad;
  const bz = q0[0] - bd.x; // the housing's frame round the screen
  // module joints across the frame (above and below the screen), and a screw in each corner and by each joint
  [1 / 3, 2 / 3].forEach((t) => {
    const x = bd.x + bd.w * t;
    [[bd.y + 0.5 * d, q0[1]], [q2[1], bd.y + bd.h - 0.5 * d]].forEach(([y0, y1]) => { back += `<line x1="${f2(x)}" y1="${f2(y0)}" x2="${f2(x)}" y2="${f2(y1)}" stroke="${INK}" stroke-width="${f2(0.45 * d)}"/>`; });
  });
  [0, 1 / 3, 2 / 3, 1].forEach((t, i) => {
    const xs = i === 0 ? [bd.x + bz / 2] : i === 3 ? [bd.x + bd.w - bz / 2] : [bd.x + bd.w * t - 1.5 * d, bd.x + bd.w * t + 1.5 * d];
    xs.forEach((x) => [bd.y + bz / 2, bd.y + bd.h - bz / 2].forEach((y) => { back += `<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(0.55 * d)}" fill="${STEEL.bolt}" stroke="${INK}" stroke-width="${f2(0.2 * d)}"/>`; }));
  });
  // the station's yellow line along the housing's lower lip (the wall band's colour), under the screws' row
  back += `<rect x="${f2(bd.x + 0.5 * d)}" y="${f2(bd.y + bd.h - 1.15 * d)}" width="${f2(bd.w - d)}" height="${f2(0.75 * d)}" fill="#C79A1C"/>`;
  back += `<rect x="${f2(q0[0])}" y="${f2(q0[1])}" width="${f2(q2[0] - q0[0])}" height="${f2(q2[1] - q0[1])}" fill="#08080A" stroke="${INK}" stroke-width="${f2(0.5 * d)}"/>`;
  // the LEDs' amber on the frame's inner lip under the screen
  back += `<line x1="${f2(q0[0] + d)}" y1="${f2(q2[1] + 0.45 * d)}" x2="${f2(q2[0] - d)}" y2="${f2(q2[1] + 0.45 * d)}" stroke="#FFB23E" stroke-opacity=".3" stroke-width="${f2(0.5 * d)}"/>`;
  return back;
}
const SIGN_LINE = 'LET US START THE GAME';
/* (Nov 22: the line ran past as one long ticker, wider than its window, so at any moment the board showed a cut
   piece of it: both judges, on every frame of the station, read "LET US START TI" or "JS START THE GAN" as garbled,
   half-made text. A real platform board that is too short for its message pages it. So does this one: each page
   slides in from the right, stops whole, then slides out as the next comes in.) */
const SIGN_PAGES = ['LET US START', 'THE GAME'];
const signHTML = () => `<div class="ss" hidden>
  <svg class="st ss-signs" viewBox="0 0 1600 914" preserveAspectRatio="none" aria-hidden="true"></svg>
  <div class="ss-plane"><div class="ss-screen"><div class="ss-row">
    <b class="ss-time"><span class="ss-h">12</span><span class="ss-colon">:</span><span class="ss-m">00</span><small class="ss-ap">PM</small></b>
    <div class="ss-win"><div class="ss-run">${SIGN_PAGES.concat(SIGN_PAGES[0]).map((t) => `<span>${t}</span>`).join('')}</div></div>
    <b class="ss-code">JN</b>
  </div></div></div>
</div>`;
/* THE BOARD IS HUNG ON THE RESTING TITLE AND NOWHERE ELSE (Nov 22, John: "when I opened it in browser, I didn't see the train
   sign, and then when I... clicked my data save and was about to be transitioned with the train coming in, I see the train
   sign, but it's obstructing the path of the train, which wasn't there to begin with... find the root cause").
   Root cause: the board picks its place by measuring the title's furniture (name, calendar, card, top bar) and taking the
   first spot clear of it, and it was allowed to do that whenever the body's mode said 'title'. But the mode says 'title'
   all through SAVE DATA and the whole train shot. So (1) every time the body's class changed during the shot (the save
   screen closing, a key press), it measured again with the camera panning and the title's furniture blown away, found
   nothing to keep clear of, and jumped to the first spot in its list, out in the open over the track; and (2) a visitor
   who tapped PRESS START before the board had lit up (it waits for the fonts and the title to settle, 2 to 4 s after the
   page opens, longer on a phone) had no board on the title at all, and got its FIRST placement in the middle of the shot.
   Now the board decides only while the title is at rest: the title's mode, no save screen over it, no start under way.
   holdSign(true) is called the moment a file is played and the train shot holds it too; it lets go when the shot ends or
   the visitor leaves the title. A board that was up stays exactly where it was for the shot; a board that was not up
   stays out until the visitor is back on the title. */
let signHeld = false;
export function holdSign(on) { signHeld = Boolean(on); }
const titleAtRest = () => !signHeld && document.body.dataset.mode === 'title' && !document.body.classList.contains('sv-open');
/* what the board must keep clear of (their boxes on screen, measured on resize and as the title settles) */
const SIGN_KEEP_CLEAR = '#titleName .rl, #hudDate .hud-cal, #contactCard, .hud-tr, #titleRole, #titleHook > span, #pressStart'; // (Nov 22: the role line, the hook and the button were not on this list, so the board could be hung behind them; it was only hidden while the hook's box was see-through) // (the name's letters, not its full-width line)
let clearOf = [];
function measureClear() {
  if (!titleAtRest()) return;
  clearOf = [...document.querySelectorAll(SIGN_KEEP_CLEAR)].filter((el) => getComputedStyle(el).visibility !== 'hidden').map((el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height, slab: el.id === 'titleRole', late: el.id === 'titleRole' || el.id === 'pressStart' || Boolean(el.closest('#titleHook')) }; }).filter((r) => r.width > 0 && r.height > 0);
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
/* How strictly the board keeps clear, tried in order until a spot is found (Nov 22). John wants the board SEEN: a title
   that leaves it no perfectly clear spot must not make it vanish.
   1: clear of everything, with air round it.  2: it may sit against the role slab's top edge (its rods and the slab's empty
   skewed corner overlap by up to 12 px; never the words).  3: the old rule from before the role line, hook and button were
   on the list (clear of the name, calendar, card and top bar; it may tuck behind the others, as it always did on small phones). */
let signFit = 0; // (which rule hung it: the tests and the layout checks read it from the sign's data-fit)
function pickSpot(wrap) {
  const pad = window.innerWidth < 600 ? 10 : 22; // (room for the rest of the push-in; less on a phone, where the boards are small)
  const W = window.innerWidth;
  const H = window.innerHeight;
  const map = artToScreen(wrap);
  const boxes = SIGN_SPOTS.map((s) => {
    const { box } = boardAt(s);
    const pts = [[box.l, box.t], [box.r, box.t], [box.r, box.b], [box.l, box.b]].map(map);
    return { s, r: { l: Math.min(...pts.map((q) => q[0])), r: Math.max(...pts.map((q) => q[0])), t: Math.min(...pts.map((q) => q[1])), b: Math.max(...pts.map((q) => q[1])) } };
  }).filter(({ r }) => !(r.l < 6 || r.t < 6 || r.r > W - 6 || r.b > H * 0.6));
  for (const level of [1, 2, 3]) {
    const hit = boxes.find(({ r }) => !clearOf.some((o) => {
      if (level === 3 && o.late) return false;
      const p = level >= 2 && o.slab ? -12 : pad;
      return r.l < o.right + p && r.r > o.left - p && r.t < o.bottom + p && r.b > o.top - p;
    }));
    if (hit) { signFit = level; return hit.s; }
  }
  signFit = 0;
  return null;
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
  /* (Nov 21, John: "make the guardrails look more 3D, they kinda look like PNGs"; and of their shadows: "I can see the
     layers, make sure it's blended in"). The rail was flat navy with two thin lines on it: a cut-out. Same rail (one
     bent tube, five bars, a bottom rail, bolted flanges), now drawn as ROUND STEEL in the station's light:
     - every tube is a cylinder: from its shaded side through its paint's own colour to a light band and a warm glint
       on the side that faces the tubes (they hang over the platform: to the right, and above), six tones, not two;
     - the light falls off down the rail: bright along the top, dimmer toward the floor;
     - the top rail is seen from below (the eye is lower than it), so its underside shows as a darker band;
     - each flange is a disc with a lit top face, a dark rim and its bolts;
     - its shadow is ONE soft shape on the floor, thrown toward the track, darkest where the rail and the posts meet
       the tiles: no stripes, no stacked bands. */
  const F = 1040; const EY = 1.6;
  const P = (X, h, Z) => [VP[0] + (F * X) / Z, VP[1] - (F * (h - EY)) / Z];
  const line = (q) => q.map(([x, y]) => `${f2(x)},${f2(y)}`).join(' ');
  const C = { deep: '#141B2C', navy: '#2C3856', mid: '#415079', lite: '#7483A6', spec: '#E4DCC6', bare: '#A7A294' };
  const TOP = 1.1; const LOW = 0.16; const R = 0.2; const LIP = -2.6;
  const st = (pts, col, sw, op = 1) => `<polyline points="${line(pts)}" fill="none" stroke="${col}" stroke-width="${f2(sw)}" stroke-linejoin="round" stroke-linecap="round"${op < 1 ? ` stroke-opacity="${op}"` : ''}/>`;
  // a tube lit from the direction (lx, ly): ink, its shaded side, the paint, a light band, a glint; then the falloff
  const tube = (q, w, inkw, [lx, ly], fall) => {
    const sh = (t) => q.map(([x, y]) => [x + lx * w * t, y + ly * w * t]);
    return st(q, INK, w + inkw * 2) + st(q, C.deep, w) + st(sh(0.08), C.navy, w * 0.8) + st(sh(0.16), C.mid, w * 0.5)
      + st(sh(0.23), C.lite, w * 0.25) + st(sh(0.28), C.spec, w * 0.09, 0.9) + (fall ? st(q, `url(#${fall})`, w) : '');
  };
  let g = '';
  RAIL_RUNS.forEach(([z0, z1], si) => {
    const zm = (z0 + z1) / 2; const px = F / zm; // px per metre here
    const tw = 0.05 * px; const thin = 0.031 * px; const inkw = Math.max(0.4, 0.008 * px);
    const fine = px > 34; // (near enough for the small parts; far down the platform they would be specks)
    const [, yTop] = P(RAIL_X, TOP, z0); const [, yBot] = P(RAIL_X, 0, z0);
    const [xa] = P(LIP, 0, z0); const [xb] = P(RAIL_X, 0, z1); // (the shadow's reach: the lip at the near post, the far post's foot)
    const fall = `grF${si}`; const soft = `grS${si}`;
    g += `<defs><linearGradient id="${fall}" gradientUnits="userSpaceOnUse" x1="0" y1="${f2(yTop)}" x2="0" y2="${f2(yBot)}"><stop offset="0" stop-color="#05060A" stop-opacity="0"/><stop offset=".45" stop-color="#05060A" stop-opacity=".1"/><stop offset="1" stop-color="#05060A" stop-opacity=".42"/></linearGradient>`
      + `<filter id="${soft}" filterUnits="userSpaceOnUse" x="${f2(xa - 0.2 * px)}" y="${f2(P(RAIL_X, 0, z1)[1] - 0.12 * px)}" width="${f2(xb - xa + 0.5 * px)}" height="${f2(yBot - P(RAIL_X, 0, z1)[1] + 0.3 * px)}"><feGaussianBlur stdDeviation="${f2(Math.max(0.5, 0.016 * px))}"/></filter></defs>`;
    // ---- its shadow: one soft shape from the rail's foot to the lip (the top rail's own shadow lands in the pit)
    const flat = (q, o) => `<polygon points="${line(q)}" fill="#030305" fill-opacity="${o}"/>`;
    const lowS = RAIL_X - (LOW * -RAIL_X) / (3.35 - LOW); // where the bottom rail's shadow lies
    let shd = flat([P(RAIL_X, 0, z1 + 0.04), P(LIP, 0, z1 + 0.04), P(LIP, 0, z0 - 0.04), P(RAIL_X, 0, z0 - 0.04)], 0.24);
    shd += flat([P(lowS - 0.05, 0, z1), P(lowS - 0.05, 0, z0), P(lowS + 0.04, 0, z0), P(lowS + 0.04, 0, z1)], 0.3);
    [z1, z0].forEach((z) => {
      shd += flat([P(RAIL_X, 0, z + 0.05), P(LIP, 0, z + 0.05), P(LIP, 0, z - 0.05), P(RAIL_X, 0, z - 0.05)], 0.3);
      // where the flange sits on the tiles: a small dark patch on its track side only (a ring all round it read as a blob)
      const [cx, cy] = P(RAIL_X - 0.07, 0, z); const rx = 0.085 * px;
      shd += `<ellipse cx="${f2(cx)}" cy="${f2(cy + rx * 0.1)}" rx="${f2(rx)}" ry="${f2(rx * 0.34)}" fill="#030305" fill-opacity=".55"/>`;
    });
    g += `<g filter="url(#${soft})">${shd}</g>`;
    // ---- the flanges: a disc on the floor under each post: dark rim, lit top face, two bolts
    [z1, z0].forEach((z) => {
      const [cx, cy] = P(RAIL_X, 0.014, z); const rx = 0.09 * px; const ry = rx * 0.34;
      g += `<ellipse cx="${f2(cx)}" cy="${f2(cy + ry * 0.55)}" rx="${f2(rx)}" ry="${f2(ry)}" fill="${INK}"/>`; // its thickness
      g += `<ellipse cx="${f2(cx)}" cy="${f2(cy)}" rx="${f2(rx)}" ry="${f2(ry)}" fill="${C.navy}" stroke="${INK}" stroke-width="${f2(inkw)}"/>`;
      g += `<ellipse cx="${f2(cx + rx * 0.14)}" cy="${f2(cy - ry * 0.14)}" rx="${f2(rx * 0.74)}" ry="${f2(ry * 0.7)}" fill="${C.mid}"/>`; // the top face, toward the light
      g += `<path d="M ${f2(cx + rx * 0.2)} ${f2(cy - ry * 0.78)} A ${f2(rx * 0.86)} ${f2(ry * 0.86)} 0 0 1 ${f2(cx + rx * 0.84)} ${f2(cy - ry * 0.1)}" fill="none" stroke="${C.lite}" stroke-width="${f2(inkw * 1.1)}" stroke-linecap="round"/>`;
      if (fine) [-1, 1].forEach((q) => { g += `<ellipse cx="${f2(cx + q * rx * 0.66)}" cy="${f2(cy)}" rx="${f2(rx * 0.15)}" ry="${f2(ry * 0.34)}" fill="${C.bare}" stroke="${INK}" stroke-width="${f2(inkw * 0.6)}"/>`; });
    });
    // ---- the bars and the bottom rail (under the frame)
    const n = 6; // (Nov 21, John: "only 5 bars"): five bars, evenly spaced, from the bottom rail up into the top rail
    for (let k = 1; k < n; k++) {
      const z = z1 - ((z1 - z0) * k) / n;
      g += tube([P(RAIL_X, LOW, z), P(RAIL_X, TOP, z)], thin, inkw, [1, 0], fall);
    }
    const low = [P(RAIL_X, LOW, z1), P(RAIL_X, LOW, z0)];
    g += tube(low, tw, inkw, [0.3, -0.95], fall);
    if (fine) { // the weld collar where each bar stands on the bottom rail
      for (let k = 1; k < n; k++) {
        const z = z1 - ((z1 - z0) * k) / n; const [cx, cy] = P(RAIL_X, LOW + 0.03, z);
        g += `<ellipse cx="${f2(cx)}" cy="${f2(cy)}" rx="${f2(thin * 0.85)}" ry="${f2(thin * 0.4)}" fill="${C.navy}" stroke="${INK}" stroke-width="${f2(inkw * 0.7)}"/>`;
        g += `<ellipse cx="${f2(cx + thin * 0.2)}" cy="${f2(cy - thin * 0.08)}" rx="${f2(thin * 0.4)}" ry="${f2(thin * 0.16)}" fill="${C.lite}" fill-opacity=".8"/>`;
      }
    }
    // ---- the frame: far post up, round corner, top rail, round corner, near post down (one bent tube)
    const fr = [];
    fr.push([z1, 0.02]);
    for (let k = 0; k <= 8; k++) { const t = (Math.PI / 2) * (k / 8); fr.push([z1 - R + R * Math.cos(t), TOP - R + R * Math.sin(t)]); }
    for (let k = 0; k <= 8; k++) { const t = Math.PI / 2 + (Math.PI / 2) * (k / 8); fr.push([z0 + R + R * Math.cos(t), TOP - R + R * Math.sin(t)]); }
    fr.push([z0, 0.02]);
    const frP = fr.map(([z, h]) => P(RAIL_X, h, z));
    g += tube(frP, tw, inkw, [0.62, -0.62], fall);
    // the top rail's underside (the eye is below it): a darker band along it, and the tubes' warm light along its crown
    const topRun = fr.slice(5, -5).map(([z, h]) => P(RAIL_X, h, z));
    g += st(topRun.map(([x, y]) => [x, y + tw * 0.3]), C.deep, tw * 0.3, 0.9);
    g += st(topRun.map(([x, y]) => [x, y - tw * 0.3]), C.spec, tw * 0.12, 0.95);
    [z1, z0].forEach((z) => {
      // the collar at each post's foot, and the paint scuffed to bare steel just above it
      const [cx, cy] = P(RAIL_X, 0.045, z);
      g += `<ellipse cx="${f2(cx)}" cy="${f2(cy)}" rx="${f2(tw * 0.92)}" ry="${f2(tw * 0.4)}" fill="${C.navy}" stroke="${INK}" stroke-width="${f2(inkw * 0.8)}"/>`;
      g += `<ellipse cx="${f2(cx + tw * 0.22)}" cy="${f2(cy - tw * 0.08)}" rx="${f2(tw * 0.44)}" ry="${f2(tw * 0.16)}" fill="${C.lite}" fill-opacity=".8"/>`;
      if (fine) {
        g += st([P(RAIL_X, 0.1, z), P(RAIL_X, 0.16, z)].map(([x, y]) => [x + tw * 0.14, y]), C.bare, tw * 0.3, 0.7);
        g += st([P(RAIL_X, 0.21, z), P(RAIL_X, 0.24, z)].map(([x, y]) => [x - tw * 0.16, y]), C.bare, tw * 0.22, 0.5);
      }
    });
  });
  return g;
}

export function mountStation(box, before) {
  const wrap = document.createElement('div');
  wrap.className = 'st-wrap';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = svg('st-dim', '<radialGradient id="slDim"><stop offset=".25" stop-color="#3A3C40" stop-opacity=".95"/><stop offset=".7" stop-color="#3A3C40" stop-opacity=".45"/><stop offset="1" stop-color="#3A3C40" stop-opacity="0"/></radialGradient>', lightsDim())
    + svg('st-body', '<radialGradient id="slFloor"><stop offset="0" stop-color="#17140F" stop-opacity=".4"/><stop offset=".45" stop-color="#17140F" stop-opacity=".36"/><stop offset=".8" stop-color="#17140F" stop-opacity=".16"/><stop offset="1" stop-color="#17140F" stop-opacity="0"/></radialGradient>', lightsBody() + `<g class="gf-at" transform="${faceTransform(FACES[0])}">${graffiti()}</g>`)
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
    if (!placedOnce || !ready || !titleAtRest()) return; // (it never moves, and never first appears, away from the resting title)
    const s = pickSpot(wrap);
    if (s === spot) return;
    spot = s;
    sign.hidden = !s;
    sign.dataset.fit = String(signFit);
    if (!s) return;
    const bd = boardAt(s);
    /* THE CITY hangs on the track side of the light strip where it has clear room of its own on this screen and the board
       is on the hall side (a board big enough to read: depth over 0.45); else the board hangs alone. */
    const cb = cityAt(bd).box; const map = artToScreen(wrap);
    const cp = [[cb.l, cb.t], [cb.r, cb.t], [cb.r, cb.b], [cb.l, cb.b]].map(map);
    const cr = { l: Math.min(...cp.map((q) => q[0])), r: Math.max(...cp.map((q) => q[0])), t: Math.min(...cp.map((q) => q[1])), b: Math.max(...cp.map((q) => q[1])) };
    const cityFits = !bd.flip && bd.d > 0.45 && cr.l > 6 && cr.r < window.innerWidth - 6 && cr.t > 6 && !clearOf.some((o) => cr.l < o.right + 6 && cr.r > o.left - 6 && cr.t < o.bottom + 6 && cr.b > o.top - 6);
    signsEl.innerHTML = signsSVG(bd, cityFits);
    const [p0, p1, p2, p3] = bd.quad; // the text box, the screen's own size (art px), mapped onto its corners
    const sw = (Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + Math.hypot(p2[0] - p3[0], p2[1] - p3[1])) / 2;
    const sh = (Math.hypot(p3[0] - p0[0], p3[1] - p0[1]) + Math.hypot(p2[0] - p1[0], p2[1] - p1[1])) / 2;
    Object.assign(screen.style, { width: `${sw.toFixed(2)}px`, height: `${sh.toFixed(2)}px`, fontSize: `${(s.w * 0.072).toFixed(2)}px`, transform: rectToQuad(sw, sh, bd.quad) });
  };
  const remeasure = () => { if (!ready || !titleAtRest()) return; measureClear(); spot = undefined; hang(); }; // (decided on the resting title only)
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
  // (the mode is watched too: leaving the title lets go of a hold, and coming back to it decides again)
  new MutationObserver(() => { if (document.body.dataset.mode !== 'title') signHeld = false; later(); }).observe(document.body, { attributes: true, attributeFilter: ['class', 'data-mode'] });
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
