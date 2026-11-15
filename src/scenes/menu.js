import { $, esc } from '../core/util.js';
import { store } from '../core/store.js';
import { menuTeasers } from '../data/script.js';
import { sfx } from '../audio/audio.js';

/* The diagonal staircase list menu (opened from the MENU button). */
export const MENU_ITEMS = [
  { id: 'missions', label: 'MISSIONS' },
  { id: 'skills', label: 'SKILLS' },
  { id: 'stats', label: 'STATS' },
  { id: 'side-quests', label: 'SIDE QUESTS' },
  { id: 'system', label: 'SYSTEM' }
];

export function createMenu(go) {
  const overlay = $('#menu');
  const stair = $('#stair');
  const teaser = $('#menuTeaser');

  function render() {
    stair.innerHTML = MENU_ITEMS.map(
      (m, i) => `<li role="none" style="--i:${i}"><button class="stair-item" role="menuitem" type="button" data-nav data-go="${m.id}">
        <span class="cursor-star" aria-hidden="true"></span><span class="si-text">${esc(m.label)}</span>
        ${store.has('visited', m.id) ? '<span class="stamp">CLEARED!</span>' : ''}</button></li>`
    ).join('');
    stair.querySelectorAll('.stair-item').forEach((b) => {
      const on = () => select(b);
      b.addEventListener('pointerenter', on);
      b.addEventListener('focus', on);
      b.addEventListener('click', () => {
        sfx('snare');
        close();
        go(b.dataset.go);
      });
    });
  }

  function select(b) {
    stair.querySelectorAll('.stair-item').forEach((x) => x.classList.toggle('on', x === b));
    stair.classList.add('has-on');
    teaser.textContent = menuTeasers[b.dataset.go] || '';
    sfx('hat');
  }

  function open() {
    render();
    overlay.hidden = false;
    const first = stair.querySelector('.stair-item');
    first.focus();
    select(first);
  }

  function close() {
    overlay.hidden = true;
    stair.classList.remove('has-on');
  }

  overlay.querySelector('[data-close-menu]').addEventListener('click', () => {
    sfx('kick');
    close();
  });

  return { open, close, isOpen: () => !overlay.hidden };
}
