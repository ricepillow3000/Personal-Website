import { $, esc } from '../core/util.js';

export function toast(title, kicker = 'ACHIEVEMENT UNLOCKED') {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<div><small>${esc(kicker)}</small><b>${esc(title)}</b></div>`;
  $('#toasts').appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 320);
  }, 3200);
}
