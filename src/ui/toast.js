import { $, esc } from '../core/util.js';

export function toast(title, kicker = 'ACHIEVEMENT UNLOCKED') {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<div><small>${esc(kicker)}</small><b>${esc(title)}</b></div>`;
  $('#toasts').appendChild(el);
  const dismiss = () => {
    if (el.classList.contains('out')) return;
    el.classList.add('out');
    setTimeout(() => el.remove(), 320);
  };
  el.addEventListener('click', dismiss); // tap to dismiss (phones)
  setTimeout(dismiss, 3200);
}
