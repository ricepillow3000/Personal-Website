/* Chapter entrances from the heist-movie world (a case file, comic panels, breaking glass, a night
   street, a security monitor). Each chapter plays its own one however the visitor arrives.
   ~0.7-0.85s each, one beat each, sound on the frame of impact. Every one is skippable (it runs
   through track) and is an instant swap with reduced motion. */
import { gsap } from 'gsap';
import { reducedMotion } from '../core/util.js';
import { ransom } from '../ui/ransom.js';
import { sfx } from '../audio/audio.js';
import { track, shake, snapshotScreen } from './transitions.js';
import { artSrc } from './art.js';

function scene(cls, html, label) {
  const el = document.createElement('div');
  el.className = `fxw mw ${cls}`;
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = html;
  el.querySelectorAll('[data-label]').forEach((s) => ransom(s, label, label.length + 7));
  document.body.appendChild(el);
  return el;
}
const instant = (swap) => {
  swap();
  return Promise.resolve();
};

/** MISSIONS: a black case file is slammed onto the lens, a red stamp hits it, the cover flips
    open like a folder and the page is inside. */
export function caseWipe(swap, label = 'MISSIONS') {
  if (reducedMotion()) return instant(swap);
  const el = scene('casefile', `<div class="cf-cover"><span class="cf-tab">CASE FILE</span><span class="cf-dots"></span>
      <span class="cf-label ransom" data-label></span><span class="cf-code">FILE 01 · EYES ONLY</span><span class="cf-stamp">CASE OPEN</span></div>`, label);
  const cover = el.firstElementChild;
  const stamp = el.querySelector('.cf-stamp');
  const tl = gsap.timeline({ onComplete: () => el.remove() });
  tl.set(el, { visibility: 'visible' })
    .add(() => sfx('whoosh'), 0)
    // tossed onto the table (the lens) from below, spinning a little
    .fromTo(cover, { yPercent: 120, xPercent: 18, rotation: 14, scale: 0.8 }, { yPercent: 0, xPercent: 0, rotation: -2, scale: 1, duration: 0.26, ease: 'power3.in' }, 0)
    .add(() => {
      sfx('thwack');
      shake(cover);
    }, 0.26)
    .add(swap, 0.3)
    // the stamp: a whip-fast slam
    .fromTo(stamp, { scale: 2.6, opacity: 0, rotation: -24 }, { scale: 1, opacity: 1, rotation: -12, duration: 0.12, ease: 'power4.in' }, 0.3)
    .add(() => sfx('stamp'), 0.42)
    // the folder opens: the cover swings away on its spine
    .to(cover, { rotationY: -100, transformPerspective: 1400, duration: 0.34, ease: 'power3.in' }, 0.55)
    .add(() => sfx('flip'), 0.56);
  return track(tl);
}

/** MY EDGE (the comic page): the screen breaks into slanted comic panels that punch in one after
    another, the title in the middle, then they fly apart to show the page. */
export function panelsWipe(swap, label = 'MY EDGE') {
  if (reducedMotion()) return instant(swap);
  const el = scene('panels', `<i class="pn-gut"></i><i class="pn p1"></i><i class="pn p2"></i><i class="pn p3"></i><i class="pn p4"></i>
      <span class="pn-title ransom" data-label></span>`, label);
  const gut = el.querySelector('.pn-gut');
  const pans = el.querySelectorAll('.pn');
  const title = el.querySelector('.pn-title');
  const from = [[-60, -40], [60, -40], [-60, 40], [60, 40]];
  const tl = gsap.timeline({ onComplete: () => el.remove() });
  tl.set(el, { visibility: 'visible' })
    .fromTo(gut, { opacity: 0 }, { opacity: 1, duration: 0.08 }, 0.12)
    .fromTo(pans, { x: (i) => `${from[i][0]}vw`, y: (i) => `${from[i][1]}vh`, scale: 1.3, rotation: (i) => (i % 2 ? 8 : -8) },
      { x: 0, y: 0, scale: 1, rotation: 0, duration: 0.18, ease: 'power3.in', stagger: 0.05 }, 0)
    .add(() => sfx('thwack', 0.6), 0.18)
    .add(() => sfx('thwack', 0.8), 0.33)
    .fromTo(title, { scale: 2.4, opacity: 0, rotation: -14 }, { scale: 1, opacity: 1, rotation: -5, duration: 0.14, ease: 'back.out(2)' }, 0.32)
    .add(swap, 0.36)
    .add(() => sfx('whoosh'), 0.56)
    .to(title, { scale: 0.6, opacity: 0, duration: 0.12, ease: 'power2.in' }, 0.56)
    .set(gut, { opacity: 0 }, 0.58)
    .to(pans, { x: (i) => `${from[i][0] * 1.4}vw`, y: (i) => `${from[i][1] * 1.4}vh`, rotation: (i) => (i % 2 ? -10 : 10), duration: 0.26, ease: 'power3.in', stagger: 0.03 }, 0.56);
  return track(tl);
}

/** STATS: the screen takes a hit like a pane of glass. Cracks spider out from the impact, then the
    whole page shatters and its pieces fall away, showing the new page behind it. */
export function glassWipe(swap) {
  if (reducedMotion()) return instant(swap);
  const W = window.innerWidth;
  const H = window.innerHeight;
  const c = { x: W * 0.56, y: H * 0.44 }; // the impact
  const R = Math.hypot(W, H);
  const N = 9;
  const ang = Array.from({ length: N }, (_, i) => (i / N) * Math.PI * 2 + ((i * 37) % 10) / 30);
  const at = (a, r) => [c.x + Math.cos(a) * r, c.y + Math.sin(a) * r];
  const P = ([x, y]) => `${x.toFixed(0)}px ${y.toFixed(0)}px`;
  // cracks: rays out from the impact plus two broken rings, drawn as white glints with a dark edge
  const rays = ang.map((a) => `M${c.x.toFixed(0)} ${c.y.toFixed(0)} L${at(a + 0.05, R * 0.3).map((v) => v.toFixed(0)).join(' ')} L${at(a - 0.03, R).map((v) => v.toFixed(0)).join(' ')}`);
  const ring = (r) => `M${ang.map((a, i) => at(a + (i % 2 ? 0.04 : -0.04), r * (0.85 + (i % 3) * 0.12)).map((v) => v.toFixed(0)).join(' ')).join(' L')} Z`;
  const cracks = [...rays, ring(Math.min(W, H) * 0.12), ring(Math.min(W, H) * 0.3)];
  const el = document.createElement('div');
  el.className = 'fxw mw glass';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `${ang.map(() => '<div class="gl-shard"><i class="gl-shine"></i></div>').join('')}
    <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${cracks.map((d) => `<path class="gl-crack" d="${d}"/>`).join('')}</svg><i class="gl-hit"></i>`;
  const shards = [...el.querySelectorAll('.gl-shard')];
  shards.forEach((sh, i) => {
    sh.style.clipPath = `polygon(${P([c.x, c.y])}, ${P(at(ang[i], R))}, ${P(at(ang[(i + 1) % N], R))})`;
    const snap = snapshotScreen();
    sh.prepend(snap.frag);
    sh.settle = snap.settle;
  });
  const hit = el.querySelector('.gl-hit');
  gsap.set(hit, { left: c.x, top: c.y });
  document.body.appendChild(el);
  shards.forEach((sh) => sh.settle());
  const paths = el.querySelectorAll('.gl-crack');
  paths.forEach((p) => {
    const L = p.getTotalLength();
    gsap.set(p, { strokeDasharray: L, strokeDashoffset: L });
  });
  const tl = gsap.timeline({ onComplete: () => el.remove() });
  tl.set(el, { visibility: 'visible' })
    .add(() => sfx('crack'), 0)
    .fromTo(hit, { scale: 0, opacity: 1 }, { scale: 1, duration: 0.08, ease: 'power3.out' }, 0)
    .to(hit, { opacity: 0, duration: 0.12 }, 0.12)
    .to(paths, { strokeDashoffset: 0, duration: 0.16, ease: 'power3.out', stagger: 0.012 }, 0.02)
    .add(() => shake(el), 0.04)
    // a beat with the cracked screen, then it gives way
    .add(swap, 0.34)
    .add(() => sfx('shatter'), 0.34)
    .set(paths, { opacity: 0 }, 0.36)
    .to(shards, {
      x: (i) => Math.cos(ang[i] + Math.PI / N) * W * 0.18,
      y: (i) => H * (0.9 + (i % 3) * 0.25),
      rotation: (i) => (i % 2 ? 1 : -1) * (12 + (i % 4) * 9),
      scale: (i) => 0.92 - (i % 3) * 0.05,
      transformOrigin: () => `${c.x}px ${c.y}px`,
      duration: 0.5,
      ease: 'power2.in',
      stagger: { each: 0.025, from: 'random' },
    }, 0.34);
  return track(tl);
}

/** SIDE QUESTS ("city life"): a hard cut to a night street. Car light trails streak past, a horn,
    a big billboard on the building flickers on with the page name, and the camera pushes into
    the screen until it is the page. */
export function cityWipe(swap, label = 'SIDE QUESTS') {
  if (reducedMotion()) return instant(swap);
  const city = artSrc('city');
  const el = scene('citylife', `<div class="cl-cam"><img class="cl-city" src="${city}" alt=""><i class="cl-shade"></i>
      <div class="cl-board"><div class="cl-screen"><span class="cl-on">NOW SHOWING</span><span class="cl-label ransom" data-label></span></div></div>
      <div class="cl-trails">${'<i></i>'.repeat(10)}</div></div><i class="cl-flash"></i>`, label);
  const cam = el.querySelector('.cl-cam');
  const board = el.querySelector('.cl-board');
  const screen = el.querySelector('.cl-screen');
  const trails = el.querySelectorAll('.cl-trails i');
  const flash = el.querySelector('.cl-flash');
  trails.forEach((t, i) => {
    gsap.set(t, { top: `${74 + ((i * 7) % 20)}%`, width: `${18 + ((i * 13) % 30)}vw` });
    if (i % 3 === 0) t.classList.add('red'); // taillights; the rest are headlights
  });
  const r = board.getBoundingClientRect();
  const push = Math.max(window.innerWidth / r.width, window.innerHeight / r.height) * 1.1;
  const ox = r.left + r.width / 2;
  const oy = r.top + r.height / 2;
  const tl = gsap.timeline({ onComplete: () => el.remove() });
  tl.set(el, { visibility: 'visible' })
    .add(() => sfx('city'), 0)
    .fromTo(cam, { scale: 1.12, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.14, ease: 'power3.out', transformOrigin: `${ox}px ${oy}px` }, 0)
    // headlights and taillights streaking along the street, both ways
    .fromTo(trails, { x: (i) => (i % 2 ? '-40vw' : '120vw') }, { x: (i) => (i % 2 ? '120vw' : '-40vw'), duration: 0.42, ease: 'none', stagger: 0.03 }, 0)
    // the billboard flickers on
    .fromTo(screen, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: 'steps(4)' }, 0.16)
    .add(() => sfx('buzz'), 0.16)
    // the camera pushes into the screen until it fills the frame
    .to(cam, { scale: push, duration: 0.32, ease: 'power3.in' }, 0.34)
    .fromTo(flash, { opacity: 0 }, { opacity: 1, duration: 0.06 }, 0.62)
    .add(() => {
      swap();
      sfx('thwack', 0.7);
    }, 0.66)
    .set(cam, { opacity: 0 }, 0.66)
    .to(flash, { opacity: 0, duration: 0.22, ease: 'power2.out' }, 0.68);
  return track(tl);
}

/** SETTINGS (the control room): the screen snaps off like an old security monitor (collapse to
    a line, a dot), then switches back on to the new page with a burst of static. */
export function crtWipe(swap, label = 'SETTINGS') {
  if (reducedMotion()) return instant(swap);
  const el = scene('crt', `<i class="crt-t"></i><i class="crt-b"></i><i class="crt-line"></i><i class="crt-static"></i>
      <span class="crt-rec">REC · CAM 07</span><span class="crt-label ransom" data-label></span>`, label);
  const [top, bot, beam, stat, rec, lab] = el.children;
  const tl = gsap.timeline({ onComplete: () => el.remove() });
  tl.set(el, { visibility: 'visible' })
    .add(() => sfx('crtOff'), 0)
    // off: black closes from top and bottom to a bright line, the line to a dot, the dot is gone
    .fromTo([top, bot], { scaleY: 0 }, { scaleY: 1, duration: 0.16, ease: 'power4.in' }, 0)
    .fromTo(beam, { scaleY: 0.2, scaleX: 1, opacity: 1 }, { scaleY: 1, duration: 0.06 }, 0.14)
    .to(beam, { scaleX: 0.004, duration: 0.14, ease: 'power3.in' }, 0.2)
    .to(beam, { opacity: 0, duration: 0.06 }, 0.34)
    .add(swap, 0.36)
    // on: a burst of static and the camera overlay, then the picture opens from the middle
    .add(() => sfx('crtOn'), 0.42)
    .fromTo(stat, { opacity: 0 }, { opacity: 0.85, duration: 0.04, yoyo: true, repeat: 3 }, 0.42)
    .fromTo([rec, lab], { opacity: 0 }, { opacity: 1, duration: 0.02 }, 0.42)
    .to([rec, lab], { opacity: 0, duration: 0.05 }, 0.66)
    .to([top, bot], { scaleY: 0, duration: 0.2, ease: 'power3.out' }, 0.6);
  return track(tl);
}
