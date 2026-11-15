import { gsap } from 'gsap';
import { resume } from '../data/resume.js';
import { reducedMotion } from '../core/util.js';

/* Placeholder ink bust (original drawing, not based on any character) used until
   John's ink-filtered photos exist. Same API either way, so the swap is one flag:
   resume.assets.photoPortraits = true  →  /assets/portrait/{expr}_{closed|open}.webp */

const EXPRS = ['neutral', 'smirk', 'excited', 'thinking', 'panicked'];

const INK = 'stroke="#0B0B0B" stroke-linecap="round" stroke-linejoin="round"';

function eyes(expr, blink) {
  if (blink) {
    return `<path d="M118 150 Q135 157 152 150 M168 150 Q185 157 202 150" fill="none" stroke-width="5" ${INK}/>`;
  }
  const almond = (cx, h = 12) => `<path d="M${cx - 17} 149 Q${cx} ${149 - h - 2} ${cx + 17} 149 Q${cx} ${149 + h - 3} ${cx - 17} 149 Z" fill="#F5F5F0" stroke-width="4" ${INK}/>`;
  const iris = (cx, cy, r = 8, hl = true) =>
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#0B0B0B"/>` + (hl ? `<circle cx="${cx + r * 0.35}" cy="${cy - r * 0.4}" r="${Math.max(1.6, r * 0.28)}" fill="#F5F5F0"/>` : '');
  switch (expr) {
    case 'smirk':
      return `${almond(135, 10)}${almond(185, 10)}${iris(138, 150)}${iris(188, 150)}
        <path d="M115 145 L155 143 L154 149 L116 150 Z M165 143 L205 145 L204 150 L166 149 Z" fill="#0B0B0B"/>`;
    case 'excited':
      return `${almond(135, 15)}${almond(185, 15)}${iris(135, 148, 10)}${iris(185, 148, 10)}
        <path d="M128 152 l3 -3 l3 3 l-3 3 Z M178 152 l3 -3 l3 3 l-3 3 Z" fill="#F5F5F0"/>`;
    case 'thinking':
      return `${almond(135, 11)}${almond(185, 11)}${iris(140, 145, 7)}${iris(190, 145, 7)}`;
    case 'panicked':
      return `${almond(135, 17)}${almond(185, 17)}${iris(135, 149, 3, false)}${iris(185, 149, 3, false)}`;
    default:
      return `${almond(135)}${almond(185)}${iris(135, 149)}${iris(185, 149)}`;
  }
}

function brows(expr) {
  const b = {
    neutral: 'M116 130 L152 127 M168 127 L204 130',
    smirk: 'M116 132 L152 130 M168 124 Q186 116 204 124',
    excited: 'M116 126 Q134 116 152 122 M168 122 Q186 116 204 126',
    thinking: 'M116 126 L152 133 M168 124 Q186 114 204 122',
    panicked: 'M116 134 L152 120 M168 120 L204 134'
  }[expr];
  return `<path d="${b}" fill="none" stroke-width="7" ${INK}/>`;
}

function mouth(expr, open) {
  const m = {
    neutral: [
      `<path d="M147 199 L173 198" fill="none" stroke-width="4" ${INK}/>`,
      `<ellipse cx="160" cy="200" rx="10" ry="6.5" fill="#0B0B0B"/><path d="M153 203 Q160 206 167 203" stroke="#E5191C" stroke-width="3" fill="none"/>`
    ],
    smirk: [
      `<path d="M145 201 Q162 204 179 192" fill="none" stroke-width="4" ${INK}/>`,
      `<path d="M146 199 Q163 205 179 192 Q172 209 151 205 Z" fill="#0B0B0B"/>`
    ],
    excited: [
      `<path d="M137 192 Q160 214 183 192" fill="none" stroke-width="4.5" ${INK}/>`,
      `<path d="M136 190 Q160 226 184 190 Z" fill="#0B0B0B"/><path d="M141 192 L179 192 L177 198 L143 198 Z" fill="#F5F5F0"/><path d="M150 212 Q160 216 170 212" stroke="#E5191C" stroke-width="4" fill="none"/>`
    ],
    thinking: [
      `<path d="M153 202 L169 199" fill="none" stroke-width="4" ${INK}/>`,
      `<circle cx="161" cy="201" r="5.5" fill="#0B0B0B"/>`
    ],
    panicked: [
      `<path d="M140 203 Q147 196 154 203 Q161 210 168 203 Q175 196 182 203" fill="none" stroke-width="4" ${INK}/>`,
      `<ellipse cx="161" cy="203" rx="15" ry="10" fill="#0B0B0B"/><path d="M148 199 Q154 196 160 199 Q166 196 174 199" stroke="#F5F5F0" stroke-width="3" fill="none"/>`
    ]
  }[expr];
  return m[open ? 1 : 0];
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
      <path d="M120 168 l 8 6 m 4 -8 l 6 8 M184 166 l 6 8 m 4 -8 l 6 8" stroke-width="3" ${INK}/>`;
  }
  if (expr === 'excited') {
    out += `<path d="M232 70 l 6 -16 l 4 16 l 16 4 l -16 4 l -4 16 l -4 -16 l -16 -4 Z" fill="#FFE11A" stroke-width="2.5" ${INK}/>`;
  }
  return out;
}

/* Original spiky look; bangs a little longer than v1, plus a chin goatee. */
const HAIR = 'M96 152 L88 120 L74 104 L92 98 L84 72 L109 76 L111 50 L135 61 L150 34 L167 55 L191 40 L198 63 L226 57 L221 83 L244 92 L229 110 L236 142 L223 124 L218 150 L212 119 L201 127 L192 105 L182 125 L168 103 L157 124 L144 103 L134 125 L122 107 L114 131 L108 114 Z';
const FACE = 'M100 128 C 100 72, 220 72, 220 128 C 222 176, 204 216, 160 234 C 116 216, 98 176, 100 128 Z';
const BODY = 'M14 360 C 26 290, 88 262, 160 258 C 232 262, 294 290, 306 360 Z';
const GOATEE = 'M148 219 Q 160 227 172 219 Q 171 233 160 236 Q 149 233 148 219 Z';

function svgMarkup(expr = 'neutral', open = false, blink = false, viewBox = '0 0 320 360') {
  return `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
  <defs>
    <pattern id="dots" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.4" fill="#F5F5F0" opacity=".28"/></pattern>
    <pattern id="dotsDark" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.2" fill="#0B0B0B" opacity=".55"/></pattern>
  </defs>
  <g transform="translate(10 8)" fill="#E5191C"><path d="${BODY}"/><path d="${HAIR}"/><path d="${FACE}"/></g>
  <path d="${BODY}" fill="#0B0B0B"/>
  <path d="${BODY}" fill="url(#dots)"/>
  <path d="M128 262 L160 330 L192 262 L178 258 L160 300 L142 258 Z" fill="#F5F5F0"/>
  <path d="M96 286 L128 262 L150 330 L120 360 Z M224 286 L192 262 L170 330 L200 360 Z" fill="none" stroke="#F5F5F0" stroke-width="3"/>
  <path d="M138 214 L182 214 L186 266 L160 284 L134 266 Z" fill="#F5F5F0" stroke-width="4" ${INK}/>
  <path d="M138 222 Q160 246 182 222 L182 238 Q160 252 138 238 Z" fill="#0B0B0B"/>
  <ellipse cx="101" cy="154" rx="9" ry="15" fill="#F5F5F0" stroke-width="4" ${INK}/>
  <ellipse cx="219" cy="154" rx="9" ry="15" fill="#F5F5F0" stroke-width="4" ${INK}/>
  <path d="${FACE}" fill="#F5F5F0" stroke-width="5" ${INK}/>
  <path d="M104 150 C 104 182, 120 210, 148 226 C 126 206, 116 182, 116 150 Z" fill="url(#dotsDark)"/>
  <path d="M163 162 L158 180 L165 180" fill="none" stroke-width="3" ${INK}/>
  <path d="M206 150 C 210 178, 196 206, 168 228 C 190 214, 214 190, 216 150 Z" fill="#0B0B0B" opacity=".85"/>
  ${brows(expr)}
  ${eyes(expr, blink)}
  <path d="${GOATEE}" fill="#0B0B0B"/>
  ${mouth(expr, open)}
  <path d="${HAIR}" fill="#0B0B0B"/>
  <path d="M120 70 L150 40 M170 58 L192 44" stroke="#F5F5F0" stroke-width="3" opacity=".7"/>
  ${extras(expr)}
</svg>`;
}

/** Eyes-only crop for cut-ins. */
export const eyesMarkup = (expr = 'smirk') => svgMarkup(expr, false, false, '100 112 120 52');

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
