import { gsap } from 'gsap';
import { $, esc, reducedMotion } from '../core/util.js';
import { store } from '../core/store.js';
import { menuTeasers } from '../data/script.js';
import { sfx } from '../audio/audio.js';
import { scramble } from '../fx/kinetic.js';
import { cutType } from '../ui/cuttype.js';

/* The menu (opened from the MENU button), Nov 19, from John's command-select reference (an
   original design: no character, no hand, our own shapes and words), its background redrawn the same
   day from his red themed-poster reference (see art()): the items in cut type stepping down a
   diagonal on the left, a big red jagged lightning bolt, a MAIN MENU tag and the picked item's number
   in big cut-out digits top-right, and the picked item's name huge at the bottom with its one-line
   teaser under it. Bottom-left: how many chapters you've read. */
export const MENU_ITEMS = [
  { id: 'stats', label: 'STATS' },
  { id: 'missions', label: 'MISSIONS' },
  { id: 'skills', label: 'SKILLS' },
  { id: 'side-quests', label: 'SIDE QUESTS' },
  { id: 'different', label: 'MY EDGE' },
  { id: 'contact', label: 'CONTACT' },
  { id: 'system', label: 'SETTINGS' }
];

const pt = (cx, cy, r, a) => `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
/** a star outline with n points (inner = how deep the valleys go) */
function starPts(cx, cy, r, inner, n, rotDeg) {
  const out = [];
  for (let i = 0; i < n * 2; i++) out.push(pt(cx, cy, i % 2 ? r * inner : r, ((rotDeg + (i * 180) / n) * Math.PI) / 180));
  return out.join(' ');
}
/* the art behind the menu (Nov 19, John: "I want the menu to have this design somewhat, obviously no
   characters or names... implement this background design", a deep-red poster with tonal swirls,
   halftone, a lightning bolt, outlined stars and torn paper). An original composition, all flat (no
   soft gradients): a deep crimson field; darker red swirls laid over it like a printed pattern; patches
   of darker halftone cut with hard edges; a black torn-paper corner with a white ripped rim across the
   top; the big jagged lightning bolt (bright red, a dark ink edge and a dark offset shadow); white stars
   with a black outline and a grey offset; one four-point sparkle. Drawn once, on the first open. */
function spiral(cx, cy, r, turns, rot) {
  const pts = [];
  const n = Math.round(turns * 48);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = rot + t * turns * Math.PI * 2;
    const rr = r * (0.12 + 0.88 * t);
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join(' L')}`;
}
function art() {
  const swirl = (cx, cy, r, turns, rot, w) => `<path d="${spiral(cx, cy, r, turns, rot)}" fill="none" stroke="#6E0A0E" stroke-width="${w}" stroke-linecap="round"/>`
    + `<path d="${spiral(cx, cy, r, turns, rot)}" fill="none" stroke="#9C161B" stroke-width="${(w * 0.18).toFixed(1)}" stroke-linecap="round" transform="translate(${-w * 0.42} ${-w * 0.42})"/>`;
  const star = (cx, cy, r, rot = -90) => `<polygon points="${starPts(cx + r * 0.14, cy + r * 0.14, r, 0.44, 5, rot)}" fill="#8A8A86"/>`
    + `<polygon points="${starPts(cx, cy, r, 0.44, 5, rot)}" fill="#F5F5F0" stroke="#0B0B0B" stroke-width="${(r * 0.16).toFixed(1)}" stroke-linejoin="miter"/>`;
  const sparkle = (cx, cy, r) => `<path d="M${cx} ${cy - r} Q${cx + r * 0.12} ${cy - r * 0.12} ${cx + r} ${cy} Q${cx + r * 0.12} ${cy + r * 0.12} ${cx} ${cy + r} Q${cx - r * 0.12} ${cy + r * 0.12} ${cx - r} ${cy} Q${cx - r * 0.12} ${cy - r * 0.12} ${cx} ${cy - r}Z" fill="#F5F5F0" stroke="#0B0B0B" stroke-width="4"/>`;
  const bolt = '880,-40 1010,-40 900,300 1010,262 812,620 902,590 700,940 586,940 742,540 646,568 818,250 720,282';
  const torn = '0,0 900,0 900,0 844,15 788,4 731,33 675,20 619,40 562,31 506,57 450,44 394,71 338,58 281,83 225,75 169,94 112,90 56,108 0,101';
  const tornRim = '0,0 930,0 911,13 855,33 798,22 742,51 686,38 630,58 573,49 517,75 461,62 405,89 348,76 292,101 236,93 180,112 123,108 67,126 11,119';
  return `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
    <defs>
      <pattern id="mnDots" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="8" cy="8" r="3.4" fill="#5A070B"/></pattern>
      <clipPath id="mnDotA"><polygon points="0,330 330,250 410,520 120,640 0,600"/></clipPath>
      <clipPath id="mnDotB"><polygon points="1180,900 1300,560 1600,470 1600,900"/></clipPath>
      <clipPath id="mnDotC"><polygon points="980,-10 1380,-10 1290,190 1050,230"/></clipPath>
    </defs>
    <rect width="1600" height="900" fill="#8E1217"/>
    ${swirl(250, 660, 300, 3.2, 0.4, 30)}${swirl(1330, 700, 330, 3.4, 2.1, 34)}${swirl(1200, 120, 230, 2.8, 4, 26)}
    ${swirl(470, 170, 180, 2.6, 1.2, 22)}${swirl(760, 470, 150, 2.4, 3.3, 20)}${swirl(1560, 260, 170, 2.6, 5.2, 22)}
    <rect width="1600" height="900" fill="url(#mnDots)" clip-path="url(#mnDotA)"/>
    <rect width="1600" height="900" fill="url(#mnDots)" clip-path="url(#mnDotB)"/>
    <rect width="1600" height="900" fill="url(#mnDots)" clip-path="url(#mnDotC)"/>
    <polygon points="${tornRim}" fill="#F5F5F0"/>
    <polygon points="${torn}" fill="#0B0B0B"/>
    <polygon points="${bolt}" fill="#3A0306" transform="translate(22 16)"/>
    <polygon class="mn-slash" points="${bolt}" fill="#E5191C" stroke="#2A0204" stroke-width="10" stroke-linejoin="miter"/>
    ${star(1040, 250, 36, -80)}${star(1470, 470, 30, -100)}${star(700, 130, 24, -94)}${star(560, 770, 32, -84)}${star(1490, 850, 26, -90)}
    ${sparkle(410, 850, 44)}${sparkle(1110, 610, 22)}
  </svg>`;
}

export function createMenu(go) {
  const overlay = $('#menu');
  const stair = $('#stair');
  const teaser = $('#menuTeaser');
  const btn = $('#menuBtn');
  const num = $('#menuNum');
  const big = $('#menuBig');
  const count = $('#menuCount');

  function render() {
    stair.innerHTML = MENU_ITEMS.map(
      (m, i) => `<li role="none" style="--i:${i}"><button class="stair-item" role="menuitem" type="button" data-nav data-go="${m.id}" aria-label="${esc(m.label)}">
        <span class="cursor-star" aria-hidden="true"></span><span class="si-text" aria-hidden="true">${cutType(m.label, i + 21, { mixCase: true })}</span>
        ${store.has('visited', m.id) ? '<span class="si-seen" role="img" aria-label="seen"></span>' : ''}</button></li>`
    ).join('');
    const read = MENU_ITEMS.filter((m) => m.id !== 'system' && store.has('visited', m.id)).length;
    count.innerHTML = `<span>READ</span><b>${read}</b><i>/</i><b>6</b>`;
    stair.querySelectorAll('.stair-item').forEach((b) => {
      const on = () => select(b);
      b.addEventListener('pointerenter', on);
      b.addEventListener('focus', on);
      b.addEventListener('click', () => {
        sfx('select');
        go(b.dataset.go); // the page transition closes the menu once it covers the screen
      });
    });
  }

  function select(b, quiet) {
    if (b.classList.contains('on')) return; // already selected (mouse then focus): no second sound
    stair.querySelectorAll('.stair-item').forEach((x) => x.classList.toggle('on', x === b));
    stair.classList.add('has-on');
    const i = MENU_ITEMS.findIndex((m) => m.id === b.dataset.go);
    // the picked item's number in big cut-out digits, and its name huge at the bottom
    num.innerHTML = [...String(i + 1).padStart(2, '0')].map((d, k) => `<span class="mn-d mn-d${k}">${d}</span>`).join('');
    big.innerHTML = cutType(MENU_ITEMS[i].label, i + 61, { mixCase: true });
    scramble(teaser, menuTeasers[b.dataset.go] || '', { duration: 0.3 });
    if (!reducedMotion()) {
      gsap.fromTo(big, { x: 40, scale: 1.12, opacity: 0.4 }, { x: 0, scale: 1, opacity: 1, duration: 0.22, ease: 'back.out(2.4)', overwrite: true });
      gsap.fromTo(num, { rotation: -16, scale: 1.25 }, { rotation: 0, scale: 1, duration: 0.24, ease: 'back.out(3)', overwrite: true });
    }
    if (!quiet) sfx('hover');
  }

  let openState = false;
  let anim = null;
  const SHUT = 'polygon(0% 0%, 0% 0%, 0% 0%)';
  const FULL = 'polygon(0% 0%, 260% 0%, 0% 260%)';

  /* Menu has its own move: the panel unfolds diagonally from the top-left corner,
     items fly in one by one on a rising chime. Closing folds it back. */
  function open() {
    const artBox = overlay.querySelector('.mn-art');
    if (!artBox.firstChild) artBox.innerHTML = art(); // drawn on the first open, not while the title loads
    render();
    openState = true;
    anim?.kill();
    overlay.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    const first = stair.querySelector('.stair-item');
    select(first, true);
    first.focus();
    if (reducedMotion()) return;
    sfx('menuOpen');
    anim = gsap.timeline()
      .fromTo(overlay, { clipPath: SHUT }, { clipPath: FULL, duration: 0.32, ease: 'power3.out' }, 0)
      .fromTo(stair.querySelectorAll('li'), { x: () => -window.innerWidth * 0.6, rotation: -14, opacity: 0 },
        { x: 0, rotation: 0, opacity: 1, duration: 0.3, ease: 'back.out(2.2)', stagger: 0.045, clearProps: 'transform,opacity' }, 0.06)
      .fromTo(overlay.querySelector('.mn-slash'), { scaleY: 0, transformOrigin: '50% 0%' }, { scaleY: 1, duration: 0.26, ease: 'power4.out', clearProps: 'transform' }, 0.04)
      .fromTo(overlay.querySelectorAll('.mn-tag, .mn-num, .mn-count'), { x: 120, rotation: 12, opacity: 0 }, { x: 0, rotation: 0, opacity: 1, duration: 0.28, ease: 'back.out(2.4)', stagger: 0.05, clearProps: 'transform,opacity' }, 0.12)
      .fromTo(teaser, { scale: 0.3, rotation: -12 }, { scale: 1, rotation: 0, duration: 0.3, ease: 'back.out(2.6)', clearProps: 'transform' }, 0.22)
      .add(() => gsap.set(overlay, { clearProps: 'clipPath' }));
  }

  /** animated = false when we are leaving for a page (the page wipe covers it) */
  function close(animated = true) {
    if (!openState) return;
    openState = false;
    anim?.kill();
    btn.setAttribute('aria-expanded', 'false');
    // closed in place (not leaving for a page): focus goes back to the MENU button
    if (animated && overlay.contains(document.activeElement)) btn.focus({ preventScroll: true });
    const done = () => {
      overlay.hidden = true;
      stair.classList.remove('has-on');
      gsap.set([overlay, ...stair.querySelectorAll('li'), big, num], { clearProps: 'all' });
    };
    if (!animated || reducedMotion()) return done();
    sfx('menuClose');
    anim = gsap.timeline({ onComplete: done })
      .to(stair.querySelectorAll('li'), { x: () => window.innerWidth * 0.4, rotation: 10, autoAlpha: 0, duration: 0.16, ease: 'power3.in', stagger: 0.02 }, 0)
      .fromTo(overlay, { clipPath: FULL }, { clipPath: SHUT, duration: 0.22, ease: 'power3.in' }, 0.06);
  }

  overlay.querySelector('[data-close-menu]').addEventListener('click', () => close());

  return { open, close, isOpen: () => openState };
}
