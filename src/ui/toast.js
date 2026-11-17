import { $, esc } from '../core/util.js';

/* Toasts with a draining timer (pattern from Watermelon UI's Sonner toasts): a yellow fuse
   burns down so you can see how long it stays; hovering pauses it, a tap dismisses it. */
const LIFE = 3200;

export function toast(title, kicker = 'ACHIEVEMENT UNLOCKED') {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<div><small>${esc(kicker)}</small><b>${esc(title)}</b></div><i class="toast-fuse" aria-hidden="true"></i>`;
  $('#toasts').appendChild(el);
  const fuse = el.querySelector('.toast-fuse');
  let left = LIFE;
  let started = performance.now();
  let timer = null;
  const dismiss = () => {
    if (el.classList.contains('out')) return;
    clearTimeout(timer);
    el.classList.add('out');
    setTimeout(() => el.remove(), 320);
  };
  const run = () => {
    started = performance.now();
    timer = setTimeout(dismiss, left);
    fuse.style.transition = `transform ${left}ms linear`;
    fuse.style.transform = 'scaleX(0)';
  };
  const pause = () => {
    clearTimeout(timer);
    left = Math.max(400, left - (performance.now() - started));
    fuse.style.transition = 'none';
    fuse.style.transform = `scaleX(${left / LIFE})`;
  };
  el.addEventListener('click', dismiss); // click to dismiss (on phones taps pass through it instead)
  el.addEventListener('mouseenter', pause);
  el.addEventListener('mouseleave', run);
  requestAnimationFrame(() => requestAnimationFrame(run)); // let the fuse paint full first
}
