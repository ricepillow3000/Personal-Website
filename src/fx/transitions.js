import { gsap } from 'gsap';
import { $, reducedMotion } from '../core/util.js';
import { eyesMarkup } from '../ui/portrait.js';

/* Every big animation runs through here so ONE click / Esc can skip it. */
let current = null;

export function skipCurrent() {
  if (current && current.isActive()) {
    current.progress(1);
    return true;
  }
  return false;
}

export const isAnimating = () => Boolean(current && current.isActive());

function track(tl) {
  current = tl;
  return new Promise((resolve) => {
    tl.eventCallback('onComplete', resolve);
    if (tl.progress() === 1) resolve();
  });
}

/** Red/black diagonal slash wipe. `swap` runs while the screen is covered. (~0.6s) */
export function slashWipe(swap) {
  if (reducedMotion()) {
    swap();
    return Promise.resolve();
  }
  const wipe = $('.wipe');
  const black = $('.wipe-black');
  const red = $('.wipe-red');
  const tl = gsap.timeline();
  tl.set(wipe, { visibility: 'visible' })
    .fromTo(black, { xPercent: -110 }, { xPercent: 0, duration: 0.24, ease: 'power3.in' }, 0)
    .fromTo(red, { xPercent: -130 }, { xPercent: 10, duration: 0.26, ease: 'power3.in' }, 0.03)
    .add(swap)
    .to(red, { xPercent: 130, duration: 0.26, ease: 'power3.out' }, '+=0.04')
    .to(black, { xPercent: 115, duration: 0.28, ease: 'power3.out' }, '<0.02')
    .set(wipe, { visibility: 'hidden' });
  return track(tl);
}

/** Starburst flash + huge tilted title that punches in and zooms away. (~0.5s) */
export function titlePunch(text) {
  if (reducedMotion()) return Promise.resolve();
  const punch = $('.punch');
  const star = $('.punch-star');
  $('#punchText').textContent = text;
  const tl = gsap.timeline();
  tl.set(punch, { visibility: 'visible', opacity: 1 })
    .fromTo(star, { scale: 0.2, rotation: -30 }, { scale: 1, rotation: 0, duration: 0.18, ease: 'power4.out' })
    .fromTo('#punchText', { scale: 2.6, rotation: -16, opacity: 0 }, { scale: 1, rotation: -8, opacity: 1, duration: 0.18, ease: 'back.out(2.5)' }, 0.04)
    .to(punch, { opacity: 0, scale: 1.2, duration: 0.18, ease: 'power2.in' }, '+=0.12')
    .set(punch, { visibility: 'hidden', scale: 1 });
  return track(tl);
}

/** Eye close-up strip that slashes across for big moments. (~0.5s) */
export function cutIn(text = '', expr = 'smirk') {
  if (reducedMotion()) return Promise.resolve();
  const wrap = $('.cutin');
  $('#cutinEyes').innerHTML = eyesMarkup(expr);
  $('#cutinText').textContent = text;
  const tl = gsap.timeline();
  tl.set(wrap, { visibility: 'visible' })
    .fromTo('.cutin-strip', { xPercent: -120, scaleY: 0.2 }, { xPercent: 0, scaleY: 1, duration: 0.16, ease: 'power4.out' })
    .fromTo('#cutinText', { x: 120, opacity: 0 }, { x: 0, opacity: 1, duration: 0.14 }, 0.08)
    .to('.cutin-strip', { xPercent: 120, duration: 0.16, ease: 'power3.in' }, '+=0.3')
    .set(wrap, { visibility: 'hidden' });
  return track(tl);
}

/** PRESS START: crowd freezes → world goes grey → camera rushes John → slash. (~1.2s) */
export function startSequence(city, swap) {
  if (reducedMotion()) {
    swap();
    return Promise.resolve();
  }
  const canvas = $('#city');
  const p = city.johnPoint();
  const gray = { v: 0 };
  city.freeze();
  const tl = gsap.timeline();
  tl.to('#screen-title .title-block', { x: -60, opacity: 0, duration: 0.25, ease: 'power2.in' }, 0)
    .to(gray, { v: 1, duration: 0.3, onUpdate: () => city.setGray(gray.v) }, 0)
    .to(canvas, { scale: 2.6, transformOrigin: `${p.x}px ${p.y}px`, duration: 0.55, ease: 'power3.in' }, 0.3)
    .add(() => {}, 0.75);
  return track(tl).then(() => slashWipe(() => {
    gsap.set(canvas, { clearProps: 'transform' });
    gsap.set('#screen-title .title-block', { clearProps: 'all' });
    swap();
  }));
}

/** Stagger children marked [data-in] into view. */
export function enter(root) {
  const items = root.querySelectorAll('[data-in]');
  if (reducedMotion() || !items.length) return gsap.timeline();
  return gsap.from(items, { y: 40, x: -20, rotation: -2, opacity: 0, duration: 0.42, ease: 'back.out(1.8)', stagger: 0.07, clearProps: 'transform,opacity' });
}

/** Small screen shake. */
export function shake(el = document.body) {
  if (reducedMotion()) return;
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
}

/** CLEARED!-style stamp slam. */
export function slam(el) {
  if (reducedMotion()) return;
  gsap.fromTo(el, { scale: 3, opacity: 0, rotation: -40 }, { scale: 1, opacity: 1, rotation: -12, duration: 0.25, ease: 'back.out(2)' });
}
