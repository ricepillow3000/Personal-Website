import { gsap } from 'gsap';
import { $, esc, reducedMotion } from '../core/util.js';
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
        sfx('select');
        close(false);
        go(b.dataset.go);
      });
    });
  }

  function select(b, quiet) {
    stair.querySelectorAll('.stair-item').forEach((x) => x.classList.toggle('on', x === b));
    stair.classList.add('has-on');
    teaser.textContent = menuTeasers[b.dataset.go] || '';
    if (!quiet) sfx('hover');
  }

  let openState = false;
  let anim = null;
  const SHUT = 'polygon(0% 0%, 0% 0%, 0% 0%)';
  const FULL = 'polygon(0% 0%, 260% 0%, 0% 260%)';

  /* Menu has its own move: the panel unfolds diagonally from the top-left corner,
     items fly in one by one on a rising chime. Closing folds it back. */
  function open() {
    render();
    openState = true;
    anim?.kill();
    overlay.hidden = false;
    const first = stair.querySelector('.stair-item');
    first.focus();
    select(first, true);
    if (reducedMotion()) return;
    sfx('menuOpen');
    anim = gsap.timeline()
      .fromTo(overlay, { clipPath: SHUT }, { clipPath: FULL, duration: 0.32, ease: 'power3.out' }, 0)
      .fromTo(stair.querySelectorAll('li'), { x: () => -window.innerWidth * 0.6, rotation: -14, autoAlpha: 0 },
        { x: 0, rotation: 0, autoAlpha: 1, duration: 0.3, ease: 'back.out(2.2)', stagger: 0.045, clearProps: 'transform,opacity,visibility' }, 0.06)
      .fromTo(teaser, { scale: 0.3, rotation: -12 }, { scale: 1, rotation: 0, duration: 0.3, ease: 'back.out(2.6)', clearProps: 'transform' }, 0.22)
      .add(() => gsap.set(overlay, { clearProps: 'clipPath' }));
  }

  /** animated = false when we are leaving for a page (the page wipe covers it) */
  function close(animated = true) {
    if (!openState) return;
    openState = false;
    anim?.kill();
    const done = () => {
      overlay.hidden = true;
      stair.classList.remove('has-on');
      gsap.set([overlay, ...stair.querySelectorAll('li')], { clearProps: 'all' });
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
