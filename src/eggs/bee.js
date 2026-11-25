import { gsap } from 'gsap';
import { $, reducedMotion } from '../core/util.js';

/* 30–90s after the board opens, a bee buzzes across the screen. Click it before it leaves → onCatch().
   Missed, it comes back 45–90s later, until it is caught (Nov 25 pain-point pass: it used to fly once per visit, so a
   visitor reading a chapter at that moment could never finish the six secrets without reloading). */
let armed = false;
let flying = false;

export function armBee(isOnBoard, onCatch) {
  if (armed) return;
  armed = true;
  const quick = /[?&]bee\b/.test(location.search); // (tests: ?bee shortens the waits to a second)
  const delay = quick ? 1000 : 30000 + Math.random() * 60000;
  const tryFly = () => {
    if (!isOnBoard() || document.hidden) {
      setTimeout(tryFly, 4000);
      return;
    }
    fly(onCatch, () => setTimeout(tryFly, quick ? 1000 : 45000 + Math.random() * 45000)); // (missed: it comes round again)
  };
  setTimeout(tryFly, delay);
}

export function fly(onCatch, onMiss) {
  if (flying) return;
  flying = true;
  const bee = $('#bee');
  bee.hidden = false;
  const W = window.innerWidth;
  const H = window.innerHeight;
  const fromLeft = Math.random() < 0.5;
  const y0 = H * (0.25 + Math.random() * 0.3);
  let caught = false;
  const done = () => {
    if (!caught) onMiss?.();
    bee.hidden = true;
    flying = false;
    bee.onclick = null;
    bee.onpointerdown = null;
  };
  const tl = gsap.timeline({ onComplete: done });
  const dur = reducedMotion() ? 6 : 7.5;
  gsap.set(bee, { x: fromLeft ? -60 : W + 20, y: y0, rotation: 0, scaleX: fromLeft ? -1 : 1 });
  tl.to(bee, { x: fromLeft ? W + 40 : -80, duration: dur, ease: 'none' }, 0);
  if (!reducedMotion()) {
    tl.to(bee, { y: `+=${H * 0.08}`, duration: 0.45, yoyo: true, repeat: Math.floor(dur / 0.45), ease: 'sine.inOut' }, 0);
  }
  // pointerdown, not click: the bee moves, so down and up can land on different spots and
  // the browser drops the click. Keyboard users still trigger it through click (Enter/Space).
  const catchIt = () => {
    if (caught) return;
    caught = true;
    tl.kill();
    gsap.to(bee, { x: fromLeft ? -120 : W + 120, y: -80, rotation: 30, duration: 0.6, ease: 'power2.in', onComplete: done });
    onCatch();
  };
  bee.onpointerdown = catchIt;
  bee.onclick = catchIt;
}
