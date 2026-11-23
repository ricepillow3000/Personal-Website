import { store } from '../core/store.js';
import { $, esc } from '../core/util.js';
import { toast } from '../ui/toast.js';
import { sfx } from '../audio/audio.js';
import { rollIn } from '../fx/kinetic.js';

export const ACHIEVEMENTS = [
  { id: 'first-words', name: 'First Words', hint: 'Every story starts with a button.' },
  { id: 'case-file', name: 'Case File', hint: 'Open one of the mission files.' },
  { id: 'full-recon', name: 'Full Recon', hint: 'Open all six chapters.' },
  { id: 'bee', name: 'BEE!!', hint: 'Something small and buzzing passes by. Be quick.' },
  { id: 'off-record', name: 'Off the Record', hint: 'That GPA star has a flip side.' },
  { id: 'inspector', name: 'Inspector', hint: 'Developers know where to look. Everyone else, tap my name on the main menu five times.' }
];
/* (Player 2, "use a gamepad", was dropped Nov 22, John: "some ppl dont have controllers... make it just 6
   and people can complete the game without external devices". A controller still drives the site.) */


export function count() {
  return store.get().achievements.filter((id) => ACHIEVEMENTS.some((a) => a.id === id)).length; // (an old save may still hold player-2)
}

export function allFound() {
  return ACHIEVEMENTS.every((a) => store.has('achievements', a.id));
}

let shownCount = null;
export function refreshCounter() {
  const el = $('#achCount');
  const text = `${count()}/${ACHIEVEMENTS.length}`;
  // the reward is easy to find (Nov 23, John: "where do i see directors cut? it does not appear"):
  // the SECRETS button glows yellow from the 6th secret until the director's cut is opened
  $('#achBtn')?.classList.toggle('ach-ready', allFound() && !store.has('visited', 'secret'));
  if (!el || text === shownCount) return;
  const changed = shownCount !== null; // not on first paint
  shownCount = text;
  el.textContent = text;
  if (changed) rollIn(el); // a new star rolls in like a slot machine
}

export function unlock(id) {
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  if (!a || !store.addTo('achievements', id)) return false;
  toast(a.name);
  sfx('treasure');
  refreshCounter();
  if (allFound()) setTimeout(() => toast("Director's cut unlocked. Tap SECRETS at the top right.", 'ALL SECRETS FOUND'), 1200);
  return true;
}

export function listMarkup() {
  return `<ul class="ach-list">${ACHIEVEMENTS.map((a) => {
    const got = store.has('achievements', a.id);
    return `<li class="${got ? 'got' : ''}"><span class="ach-ico" aria-hidden="true">${got ? '★' : '?'}</span>
      <div><strong>${got ? esc(a.name) : '???'}</strong><span class="hint">${esc(a.hint)}</span></div></li>`;
  }).join('')}</ul>`;
}
