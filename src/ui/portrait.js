import { gsap } from 'gsap';
import { resume } from '../data/resume.js';
import { reducedMotion } from '../core/util.js';

/* Original cel-shaded character portrait of John (not based on any existing character) used until
   John's ink-filtered photos exist. Same API either way, so the swap is one flag:
   resume.assets.photoPortraits = true  →  /assets/portrait/{expr}_{closed|open}.webp */

const EXPRS = ['neutral', 'smirk', 'excited', 'thinking', 'panicked'];

const INK = 'stroke="#0B0B0B" stroke-linecap="round" stroke-linejoin="round"';

/* ---------- palette for the character ---------- */
const SKIN_C = '#F6F0E4'; // skin base
const SKIN_S = '#DCCDB6'; // cel shadow (hard edge)
const SKIN_D = '#BCA88C'; // deep shadow (under the jaw)
const HAIR_LINE = '#3C3C3C'; // strand separation lines on black hair
const IRIS = '#3A1E17';
const IRIS_L = '#82402B';
let uid = 0;

/* ---------- eyes: thick tapered upper lash with an outer flick, two-tone iris,
   twin highlights, lid shadow, thin lower lash, lid crease. Built for the LEFT
   eye; the right eye is the same drawing mirrored around x = 160. ---------- */
const EYE = {
  neutral: { h: 9, look: [0, 0], iris: 1 },
  smirk: { h: 6.5, look: [1, 1], iris: 1 },
  excited: { h: 10.5, look: [0, -1], iris: 1.05, sparkle: true },
  thinking: { h: 8, look: [4, -3], iris: 0.95 },
  panicked: { h: 12.5, look: [0, 0], iris: 0.55 }
};
const EYE_CY = 152;

function eye(p, blink, id) {
  const cy = EYE_CY;
  const h = p.h;
  const crease = `<path d="M120 ${cy - h - 7} C 130 ${cy - h - 11}, 145 ${cy - h - 10}, 154 ${cy - h - 5}" fill="none" stroke="#0B0B0B" stroke-width="1.4" stroke-linecap="round" opacity=".6"/>`;
  if (blink) {
    return `<path d="M115 ${cy + 1} C 125 ${cy + 7}, 147 ${cy + 7}, 159 ${cy}" fill="none" stroke="#0B0B0B" stroke-width="3.4" stroke-linecap="round"/>
      <path d="M116 ${cy + 1} L 108 ${cy - 3} L 118 ${cy - 2} Z" fill="#0B0B0B"/>${crease}`;
  }
  const shape = `M117 153 C 121 ${cy - h}, 132 ${cy - h - 2}, 141 ${cy - h - 1} C 150 ${cy - h}, 156 ${cy - h * 0.5}, 158 ${cy - 1} C 152 ${cy + h * 0.8}, 142 ${cy + h * 0.95}, 135 ${cy + h * 0.9} C 126 ${cy + h * 0.85}, 120 ${cy + h * 0.5}, 117 153 Z`;
  const s = p.iris;
  const ix = 139 + p.look[0];
  const iy = cy + p.look[1];
  const sparkle = p.sparkle ? `<path d="M${ix + 4} ${iy - 8} l 1.4 3.6 l 3.6 1.4 l -3.6 1.4 l -1.4 3.6 l -1.4 -3.6 l -3.6 -1.4 l 3.6 -1.4 Z" fill="#FFFFFF"/>` : `<circle cx="${ix + 3 * s}" cy="${iy - 4 * s}" r="${2.8 * s}" fill="#FFFFFF"/>`;
  return `<clipPath id="${id}"><path d="${shape}"/></clipPath>
    <path d="${shape}" fill="#FFFFFF"/>
    <g clip-path="url(#${id})">
      <ellipse cx="${ix}" cy="${iy}" rx="${8.6 * s}" ry="${10 * s}" fill="${IRIS}"/>
      <ellipse cx="${ix}" cy="${iy + 3.4 * s}" rx="${6.2 * s}" ry="${5.4 * s}" fill="${IRIS_L}"/>
      <ellipse cx="${ix}" cy="${iy - 0.5}" rx="${3.6 * s}" ry="${4.6 * s}" fill="#0B0B0B"/>
      <ellipse cx="${ix}" cy="${iy}" rx="${8.6 * s}" ry="${10 * s}" fill="none" stroke="#0B0B0B" stroke-width="1.4"/>
      ${sparkle}<circle cx="${ix - 3 * s}" cy="${iy + 4.5 * s}" r="${1.3 * s}" fill="#FFFFFF"/>
      <path d="M110 ${cy - h - 8} H 164 V ${cy - h + 2.5} C 150 ${cy - h + 5}, 128 ${cy - h + 5}, 110 ${cy - h + 3} Z" fill="#0B0B0B" opacity=".22"/>
    </g>
    <path d="M114 ${cy + 2} C 118 ${cy - h - 1}, 130 ${cy - h - 4.5}, 141 ${cy - h - 3.5} C 151 ${cy - h - 3}, 157 ${cy - h * 0.55}, 160 ${cy - 1.5} L 157 ${cy} C 154 ${cy - h * 0.45}, 149 ${cy - h + 0.2}, 141 ${cy - h - 0.6} C 131 ${cy - h - 1.2}, 121 ${cy - h + 1.5}, 117 ${cy + 1} Z" fill="#0B0B0B"/>
    <path d="M117 ${cy + 1} L 107 ${cy - 4} L 119 ${cy - 3.5} Z" fill="#0B0B0B"/>
    <path d="M121 ${cy + h * 0.62} C 128 ${cy + h * 0.98}, 142 ${cy + h * 1.02}, 152 ${cy + h * 0.66}" fill="none" stroke="#0B0B0B" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>
    ${crease}`;
}

function eyes(expr, blink, n) {
  const p = EYE[expr];
  const mirrored = { ...p, look: [-p.look[0], p.look[1]] };
  return eye(p, blink, `eL${n}`) + `<g transform="translate(320 0) scale(-1 1)">${eye(mirrored, blink, `eR${n}`)}</g>`;
}

/* ---------- brows: filled, tapered (thick at the inner end). Drawn over the bangs
   with a white edge so the expression always reads. [innerY, outerY, arch] ---------- */
const BROW = {
  neutral: [[130, 131, 0], [130, 131, 0]],
  smirk: [[133, 134, -1], [127, 121, 2]],
  excited: [[125, 124, 2], [125, 124, 2]],
  thinking: [[134, 128, -1], [126, 121, 2]],
  panicked: [[121, 133, -2], [121, 133, -2]]
};
const browPath = ([yi, yo, a]) =>
  `M156 ${yi} C 146 ${yi - 5 - a}, 128 ${yo - 6 - a}, 113 ${yo} L 115 ${yo + 3.2} C 129 ${yo - 1.6 - a}, 145 ${yi - 0.6 - a}, 156 ${yi + 4.6} Z`;
function brows(expr, over = false) {
  const [l, r] = BROW[expr];
  // under the hair: solid ink. Over the hair: a faint grey outline, the classic
  // anime "see-through bangs" trick, so the expression reads without a hard edge.
  const one = (d) => (over
    ? `<path d="${d}" fill="none" stroke="#9A9A9A" stroke-width="1.1" stroke-linejoin="round" opacity=".7"/>`
    : `<path d="${d}" fill="#0B0B0B"/>`);
  return one(browPath(l)) + `<g transform="translate(320 0) scale(-1 1)">${one(browPath(r))}</g>`;
}

/* ---------- mouth: thin ink line + lower-lip hint; open mouths get teeth + tongue ---------- */
const MOUTH_DARK = '#2A0E0E';
const TONGUE = '#B7332B';
const lip = `<path d="M155 213.5 Q 160 215 165 213.5" fill="none" stroke="#0B0B0B" stroke-width="1.3" stroke-linecap="round" opacity=".45"/>`;
function mouth(expr, open) {
  const ink = (d, w = 2.4) => `<path d="${d}" fill="none" stroke="#0B0B0B" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const dark = (d) => `<path d="${d}" fill="${MOUTH_DARK}" stroke="#0B0B0B" stroke-width="2" stroke-linejoin="round"/>`;
  const fill = (d, c) => `<path d="${d}" fill="${c}"/>`;
  const M = {
    neutral: [
      ink('M149 206 Q 160 208.5 171 205.5') + lip,
      dark('M149 205 C 153 202, 167 202, 171 205 C 169 213, 164 216, 160 216 C 156 216, 151 213, 149 205 Z') +
        fill('M151 205.5 C 155 204, 165 204, 169 205.5 L 168 208 C 164 207, 156 207, 152 208 Z', '#FFFFFF') +
        fill('M153 213 C 156 210, 164 210, 167 213 C 165 215.5, 155 215.5, 153 213 Z', TONGUE)
    ],
    smirk: [
      ink('M147 208 C 154 209.5, 165 208, 175 200') + ink('M175 200 L 178 198.5', 1.8) + lip,
      dark('M148 206 C 156 207, 166 205, 175 199 C 172 210, 163 214, 156 213 C 151 212, 149 209, 148 206 Z') +
        fill('M150 206.5 C 157 207.5, 166 205.5, 173 200.5 L 171.5 204 C 165 207.5, 157 209, 151 208.5 Z', '#FFFFFF')
    ],
    excited: [
      ink('M143 201 C 150 214, 170 214, 177 201', 2.6) + ink('M141 200 L 143.5 201.5 M179 200 L 176.5 201.5', 1.8),
      dark('M142 200 C 150 199, 170 199, 178 200 C 175 216, 167 222, 160 222 C 153 222, 145 216, 142 200 Z') +
        fill('M145 201 C 152 200.5, 168 200.5, 175 201 L 173.5 206 C 165 205, 155 205, 146.5 206 Z', '#FFFFFF') +
        fill('M150 215 C 155 211, 165 211, 170 215 C 166 219.5, 154 219.5, 150 215 Z', TONGUE)
    ],
    thinking: [ink('M153 208 C 158 206.5, 164 206.5, 168 207.5', 2.2) + lip, dark('M156.5 208 C 156.5 204, 165.5 204, 165.5 208 C 165.5 212, 156.5 212, 156.5 208 Z')],
    panicked: [
      ink('M146 209 C 150 205, 154 205, 157 209 C 160 213, 164 213, 167 209 C 170 205, 174 205, 176 209', 2.2),
      dark('M145 204 C 152 201, 168 201, 176 204 C 175 214, 168 218, 160 218 C 152 218, 146 214, 145 204 Z') +
        fill('M148 205 L 173 205 L 172 209 L 149 209 Z', '#FFFFFF') + fill('M151 213 L 169 213 L 167.5 216.5 L 152.5 216.5 Z', '#FFFFFF') +
        `<path d="M154 205 V 209 M160 205 V 209 M166 205 V 209 M156 213 V 216.5 M160 213 V 216.5 M164 213 V 216.5" stroke="${MOUTH_DARK}" stroke-width="1"/>`
    ]
  };
  return M[expr][open ? 1 : 0];
}

/* Arms + hands. Sleeves are the black jacket (halftone) with a white cuff; hands are inked.
   Each expression gets its own pose. */
const SLEEVE = (d) => `<path d="${d}" fill="#0B0B0B" stroke="#F5F5F0" stroke-width="2.5" stroke-linejoin="round"/><path d="${d}" fill="url(#dots)"/>`;
const SKIN = (d, w = 4.5) => `<path d="${d}" fill="#F5F5F0" stroke-width="${w}" ${INK}/>`;
// Hand creases: thin, soft and slightly faded so they read as skin lines, not ink slashes.
const LINES = (d) => `<path d="${d}" fill="none" stroke="#0B0B0B" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>`;

function arms(expr) {
  switch (expr) {
    case 'thinking': // forearm up, hand on chin
      return SLEEVE('M84 360 L148 360 L160 266 L116 252 Z') +
        `<path d="M116 252 L160 266 L158 276 L113 262 Z" fill="#F5F5F0" stroke-width="3" ${INK}/>` +
        SKIN('M118 264 C 110 244, 118 224, 138 220 C 152 217, 166 222, 168 231 C 168 236, 160 238, 152 237 C 161 240, 163 248, 156 250 C 163 253, 162 262, 152 263 Z') +
        LINES('M142 232 Q 147 231 151 233 M144 242 Q 149 241 153 243');
    case 'excited': { // thumbs-up: short thumb, four curled fingers as soft bumps, no inner shapes
      const hand = `<g transform="translate(97 278) rotate(-6)">` +
        SKIN('M-16 -38 C -17 -48, -16 -58, -12 -64 C -9 -69, -2 -68, -1 -62 C 0 -54, 0 -46, 2 -38 Z', 4) +
        `<path d="M-10 -63 Q -7 -65.2 -4 -62.5" fill="none" stroke="#0B0B0B" stroke-width="1.4" stroke-linecap="round" opacity=".5"/>` +
        SKIN('M-20 -2 C -26 -14, -25 -32, -16 -40 C -8 -44, 6 -44, 14 -41 C 22 -40, 25 -36, 22 -32 C 26 -29, 26 -24, 21 -22 C 25 -19, 25 -14, 20 -12 C 23 -9, 21 -3, 15 -2 C 8 1, -10 1, -20 -2 Z') +
        LINES('M13 -32 Q 17 -31.6 21 -32 M12 -22 Q 16 -21.6 20 -22 M11 -12 Q 15 -11.6 19 -12 M-13 -39 Q -7.5 -37.2 -2 -39') +
        `</g>`;
      return SLEEVE('M18 360 L82 360 L118 286 L76 270 Z') +
        `<path d="M76 270 L118 286 L114 296 L72 280 Z" fill="#F5F5F0" stroke-width="3" ${INK}/>` + hand;
    }
    case 'panicked': // both hands up, palms out
      return SLEEVE('M8 360 L64 360 L82 244 L46 236 Z') + SLEEVE('M256 360 L312 360 L274 236 L238 244 Z') +
        SKIN('M44 236 C 36 214, 40 196, 52 192 L 50 172 C 50 164, 60 164, 61 172 L 64 190 L 66 166 C 67 158, 77 159, 77 167 L 76 190 L 82 172 C 85 165, 94 168, 92 176 L 86 200 C 92 194, 100 198, 96 206 L 86 230 C 82 240, 60 244, 44 236 Z', 4) +
        SKIN('M276 236 C 284 214, 280 196, 268 192 L 270 172 C 270 164, 260 164, 259 172 L 256 190 L 254 166 C 253 158, 243 159, 243 167 L 244 190 L 238 172 C 235 165, 226 168, 228 176 L 234 200 C 228 194, 220 198, 224 206 L 234 230 C 238 240, 260 244, 276 236 Z', 4);
    default: // neutral + smirk: hand gripping the jacket collar
      return SLEEVE('M318 360 L262 360 L206 290 L236 270 Z') +
        `<path d="M206 290 L236 270 L244 280 L214 302 Z" fill="#F5F5F0" stroke-width="3" ${INK}/>` +
        SKIN('M232 284 C 240 274, 238 260, 228 254 L 210 246 C 202 242, 194 246, 194 252 C 188 254, 188 262, 194 264 C 188 268, 190 276, 197 277 C 194 283, 199 289, 206 288 L 222 290 C 227 290, 230 288, 232 284 Z') +
        LINES('M199 258 Q 203.5 258.5 208 260 M200 270 Q 204.5 270.5 209 272');
  }
}

function extras(expr) {
  let out = arms(expr);
  if (expr === 'panicked') {
    out += `<path d="M214 112 C 206 124, 206 134, 214 134 C 222 134, 222 124, 214 112 Z" fill="#F5F5F0" stroke-width="3" ${INK}/>
      <path d="M118 180 l 6 7 m 4 -9 l 6 8 M190 178 l 6 8 m 4 -9 l 6 7" stroke-width="2.4" ${INK}/>`;
  }
  if (expr === 'excited') {
    out += `<path d="M232 70 l 6 -16 l 4 16 l 16 4 l -16 4 l -4 16 l -4 -16 l -16 -4 Z" fill="#FFE11A" stroke-width="2.5" ${INK}/>`;
  }
  return out;
}

/* ---------- head, hair and outfit (original character design) ----------
   Spiky black hair with bangs past the brows, chin goatee, smart jacket.
   Cel-shaded: hard-edged shadow shapes, light from the upper right. */
const HAIR_BACK =
  'M84 206 C 78 180, 74 150, 78 124 L 66 108 L 82 98 L 72 74 L 100 74 L 100 46 L 126 56 L 140 28 L 162 48 L 186 28 L 198 54 L 228 46 L 226 74 L 254 84 L 240 106 L 250 132 L 240 150 C 244 172, 240 192, 234 206 L 222 190 L 216 150 L 104 150 L 98 190 Z';
const FRINGE =
  'M100 134 C 98 104, 112 80, 132 72 C 150 64, 176 64, 194 72 C 212 80, 222 104, 220 134 L 219 152 L 211 121 L 204 142 L 196 119 L 186 141 L 176 117 L 166 143 L 156 117 L 146 142 L 136 119 L 127 141 L 118 121 L 112 145 L 106 121 Z';
const FACE =
  'M104 118 C 104 86, 128 70, 160 70 C 192 70, 216 86, 216 118 C 217 146, 214 170, 205 190 C 196 208, 180 224, 166 233 C 162 236, 158 236, 154 233 C 140 224, 124 208, 115 190 C 106 170, 103 146, 104 118 Z';
const BODY = 'M14 360 C 26 290, 88 262, 160 258 C 232 262, 294 290, 306 360 Z';
const GOATEE = 'M151 221 C 155 224, 165 224, 169 221 C 168.5 229, 165 234, 160 235.5 C 155 234, 151.5 229, 151 221 Z';
const EAR = 'M107 140 C 96 133, 91 152, 95 164 C 97 172, 102 177, 108 174 Z';

function svgMarkup(expr = 'neutral', open = false, blink = false, viewBox = '0 0 320 360') {
  const n = ++uid;
  const ink = (w) => `stroke="#0B0B0B" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
  const blush = expr === 'excited'
    ? `<path d="M120 182 l 6 -6 M127 184 l 6 -6 M187 184 l 6 -6 M194 182 l 6 -6" stroke="#E5191C" stroke-width="2" stroke-linecap="round"/>`
    : '';
  return `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
  <defs>
    <pattern id="dots" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.4" fill="#F5F5F0" opacity=".28"/></pattern>
    <pattern id="dotsDark" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.2" fill="#0B0B0B" opacity=".55"/></pattern>
    <clipPath id="face${n}"><path d="${FACE}"/></clipPath>
  </defs>

  <!-- red misprint silhouette -->
  <g transform="translate(10 8)" fill="#E5191C"><path d="${BODY}"/><path d="${HAIR_BACK}"/><path d="${FACE}"/></g>

  <!-- jacket: black with a lit right shoulder, halftone in the shade, folds -->
  <path d="${BODY}" fill="#121212" ${ink(3)}/>
  <path d="M196 270 C 238 278, 284 300, 300 340 L 306 360 L 252 360 C 246 326, 228 298, 196 270 Z" fill="#2B2B2B"/>
  <path d="M14 360 C 26 290, 88 262, 140 259 L 120 360 Z" fill="url(#dots)"/>
  <path d="M70 318 Q 86 336 82 360 M98 300 Q 108 318 104 336" fill="none" stroke="#3A3A3A" stroke-width="2"/>
  <path d="M250 316 Q 238 336 240 360" fill="none" stroke="#0B0B0B" stroke-width="2.4"/>

  <!-- neck with jaw shadow + tendons -->
  <path d="M140 210 L 180 210 C 181 230, 183 250, 188 266 L 160 284 L 132 266 C 137 250, 139 230, 140 210 Z" fill="${SKIN_C}" ${ink(3.5)}/>
  <path d="M139 212 L 181 212 L 181 238 C 170 249, 150 249, 139 238 Z" fill="${SKIN_D}"/>
  <path d="M146 250 L 150 268 M174 250 L 170 268" fill="none" stroke="#0B0B0B" stroke-width="1.4" stroke-linecap="round" opacity=".45"/>

  <!-- shirt + collar + lapels with red piping -->
  <path d="M132 262 L160 334 L188 262 L176 258 L160 300 L144 258 Z" fill="#FFFFFF"/>
  <path d="M132 262 L160 334 L160 300 L144 258 Z" fill="#DEDBD2"/>
  <path d="M136 250 L160 280 L146 298 L125 266 Z" fill="#FFFFFF" ${ink(2.6)}/>
  <path d="M184 250 L160 280 L174 298 L195 266 Z" fill="#FFFFFF" ${ink(2.6)}/>
  <path d="M136 250 L160 280 L146 298 L125 266 Z" fill="#D2CFC6" opacity=".55"/>
  <path d="M96 288 L126 266 L150 336 L122 360 L100 360 Z" fill="#0B0B0B"/>
  <path d="M224 288 L194 266 L170 336 L198 360 L220 360 Z" fill="#1E1E1E"/>
  <path d="M126 266 L150 336 M194 266 L170 336" fill="none" stroke="#E5191C" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M96 288 L126 266 M224 288 L194 266" fill="none" stroke="#F5F5F0" stroke-width="2"/>

  <!-- back hair mass frames the face -->
  <path d="${HAIR_BACK}" fill="#0B0B0B"/>
  <path d="M86 196 L 92 160 M236 194 L 230 160" stroke="${HAIR_LINE}" stroke-width="1.6" stroke-linecap="round"/>

  <!-- ears -->
  <path d="${EAR}" fill="${SKIN_C}" ${ink(3)}/>
  <path d="M101 148 C 98 155, 99 163, 104 167" fill="none" stroke="#0B0B0B" stroke-width="1.5" stroke-linecap="round" opacity=".6"/>
  <g transform="translate(320 0) scale(-1 1)"><path d="${EAR}" fill="${SKIN_S}" ${ink(3)}/>
    <path d="M101 148 C 98 155, 99 163, 104 167" fill="none" stroke="#0B0B0B" stroke-width="1.5" stroke-linecap="round" opacity=".6"/></g>

  <!-- face + hard cel shadows (left side, under the bangs) -->
  <path d="${FACE}" fill="${SKIN_C}"/>
  <g clip-path="url(#face${n})">
    <path d="M100 120 C 104 150, 110 172, 118 190 C 127 207, 141 222, 156 236 C 148 222, 139 206, 133 190 C 125 170, 119 148, 117 120 Z" fill="${SKIN_S}"/>
    <path d="M100 120 L 108 160 L 116 132 L 125 154 L 134 130 L 144 154 L 154 128 L 164 156 L 174 128 L 184 154 L 194 130 L 202 154 L 209 132 L 220 160 L 220 110 L 100 110 Z" fill="${SKIN_S}"/>
    <path d="M104 150 C 104 182, 120 210, 148 226 C 128 206, 118 182, 116 150 Z" fill="url(#dotsDark)" opacity=".7"/>
  </g>
  <path d="${FACE}" fill="none" ${ink(4.5)}/>
  <path d="M205 190 C 196 208, 180 224, 166 233" fill="none" stroke="#0B0B0B" stroke-width="6" stroke-linecap="round"/>

  <!-- nose: ink stroke + shadow side + nostril -->
  <path d="M158 170 C 157 178, 155 184, 157 187.5 L 161 187.5 C 160 182, 159 176, 158 170 Z" fill="${SKIN_S}"/>
  <path d="M161 168 C 163 177, 166 183, 161.5 187" fill="none" stroke="#0B0B0B" stroke-width="1.9" stroke-linecap="round"/>
  <path d="M156.5 187.5 Q 158.5 189.2 161 188" fill="none" stroke="#0B0B0B" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>

  ${blush}
  ${brows(expr)}
  ${eyes(expr, blink, n)}
  <path d="${GOATEE}" fill="#151515"/>
  <path d="M154 224 L 155 230 M160 225 L 160 232 M166 224 L 165 230" stroke="#3C3C3C" stroke-width="1.2" stroke-linecap="round"/>
  ${mouth(expr, open)}

  <!-- front hair: bangs past the brows, strand lines, broken "angel ring" shine -->
  <path d="${FRINGE}" fill="#0B0B0B"/>
  <path d="M140 80 Q 124 106 112 145 M150 76 Q 140 104 127 141 M156 74 Q 152 104 146 142 M166 74 Q 166 104 166 143 M176 76 Q 182 104 186 141 M188 80 Q 198 106 204 142 M200 86 Q 212 110 219 152"
    fill="none" stroke="${HAIR_LINE}" stroke-width="1.6" stroke-linecap="round"/>
  <!-- shine: soft curved streaks that follow each strand (glossy black hair) -->
  <path d="M132 90 Q 127 100 123 112 M145 86 Q 141 97 138 109 M159 84 Q 159 95 158 107 M173 85 Q 176 96 178 108 M187 89 Q 192 99 195 111"
    fill="none" stroke="#F5F5F0" stroke-width="2" stroke-linecap="round" opacity=".8"/>
  <path d="M137 92 Q 134 98 132 104 M166 86 Q 167 92 167 98 M195 95 Q 198 100 200 106"
    fill="none" stroke="#8C8C8C" stroke-width="1.4" stroke-linecap="round"/>
  <path d="M118 66 L 140 38 M172 52 L 188 34 M214 64 L 228 52" stroke="#F5F5F0" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>

  ${brows(expr, true)}
  ${extras(expr)}
</svg>`;
}

/** Eyes-only crop for cut-ins. */
export const eyesMarkup = (expr = 'smirk') => svgMarkup(expr, false, false, '104 116 112 54');

export function createPortrait(el) {
  let expr = 'neutral';
  let open = false;
  let blink = false;
  let blinkTimer = null;
  const photo = resume.assets.photoPortraits;

  function render() {
    el.dataset.expr = expr;
    if (photo) {
      const file = blink && expr === 'neutral' && !open ? 'neutral_blink' : `${expr}_${open ? 'open' : 'closed'}`;
      el.innerHTML = `<img src="assets/portrait/${file}.webp" alt="" draggable="false">`;
    } else {
      el.innerHTML = svgMarkup(expr, open, blink);
    }
  }

  function scheduleBlink() {
    clearTimeout(blinkTimer);
    blinkTimer = setTimeout(() => {
      if (!open && !reducedMotion()) {
        blink = true;
        render();
        setTimeout(() => {
          blink = false;
          render();
        }, 120);
      }
      scheduleBlink();
    }, 3000 + Math.random() * 3000);
  }

  render();
  scheduleBlink();

  if (!reducedMotion()) {
    gsap.to(el, { scale: 1.012, transformOrigin: '50% 100%', duration: 2.4, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  }

  return {
    get expr() {
      return expr;
    },
    set(next) {
      if (!EXPRS.includes(next) || next === expr) return;
      expr = next;
      render();
      if (!reducedMotion()) gsap.fromTo(el, { scale: 1.06, rotation: -1.5 }, { scale: 1, rotation: 0, duration: 0.25, ease: 'back.out(3)' });
    },
    mouth(isOpen) {
      if (open === isOpen) return;
      open = isOpen;
      render();
    },
    bounce() {
      if (reducedMotion()) return;
      gsap.fromTo(el, { y: 0 }, { y: -10, duration: 0.09, yoyo: true, repeat: 1, ease: 'power2.out' });
    }
  };
}
