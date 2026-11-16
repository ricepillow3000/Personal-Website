import { store } from '../core/store.js';
import { $, esc } from '../core/util.js';
import { toast } from '../ui/toast.js';
import { sfx } from '../audio/audio.js';

export const ACHIEVEMENTS = [
  { id: 'first-words', icon: '▶', name: 'First Words', hint: 'Every story starts with a button.' },
  { id: 'case-file', icon: '📁', name: 'Case File', hint: 'Open one of the mission files.' },
  { id: 'full-recon', icon: '🧵', name: 'Full Recon', hint: 'Light up every red string on the board.' },
  { id: 'bee', icon: '🐝', name: 'BEE!!', hint: 'Something small and buzzing passes by. Be quick.' },
  { id: 'off-record', icon: '↻', name: 'Off the Record', hint: 'Those stat bars have a flip side.' },
  { id: 'inspector', icon: '💻', name: 'Inspector', hint: 'Developers know where to look.' },
  { id: 'player-2', icon: '🎮', name: 'Player 2', hint: 'Bring your own controller.' }
];

const listeners = new Set();
export const onUnlock = (fn) => listeners.add(fn);

export function count() {
  return store.get().achievements.length;
}

export function allFound() {
  return ACHIEVEMENTS.every((a) => store.has('achievements', a.id));
}

export function refreshCounter() {
  const el = $('#achCount');
  if (el) el.textContent = `${count()}/${ACHIEVEMENTS.length}`;
}

export function unlock(id) {
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  if (!a || !store.addTo('achievements', id)) return false;
  toast(a.name);
  sfx('crash');
  refreshCounter();
  listeners.forEach((fn) => fn(a));
  if (allFound()) setTimeout(() => toast('Behind the scenes unlocked — check SYSTEM', 'ALL SECRETS FOUND'), 1200);
  return true;
}

export function listMarkup() {
  return `<ul class="ach-list">${ACHIEVEMENTS.map((a) => {
    const got = store.has('achievements', a.id);
    return `<li class="${got ? 'got' : ''}"><span class="ach-ico" aria-hidden="true">${got ? a.icon : '?'}</span>
      <div><strong>${got ? esc(a.name) : '???'}</strong><span class="hint">${esc(a.hint)}</span></div></li>`;
  }).join('')}</ul>`;
}
