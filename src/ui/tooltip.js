/* Comic tooltips (pattern from Watermelon UI's Tooltip): hover or keyboard-focus a
   [data-tip] control and a black slab with its name and shortcut drops in under it.
   Mouse and keyboard only; on touch the buttons already say what they do. */
export function initTooltips() {
  const tip = document.createElement('div');
  tip.className = 'tip';
  tip.setAttribute('role', 'tooltip');
  tip.id = 'tip';
  document.body.appendChild(tip);
  let owner = null;
  const hide = () => {
    if (!owner) return;
    owner.removeAttribute('aria-describedby');
    owner = null;
    tip.classList.remove('on');
  };
  const show = (el) => {
    if (owner === el) return;
    hide();
    owner = el;
    tip.textContent = el.dataset.tip;
    el.setAttribute('aria-describedby', 'tip');
    const r = el.getBoundingClientRect();
    tip.classList.add('on');
    const w = tip.offsetWidth;
    const left = Math.min(window.innerWidth - w - 8, Math.max(8, r.left + r.width / 2 - w / 2));
    tip.style.left = `${left}px`;
    tip.style.top = `${r.bottom + 10}px`;
    tip.style.setProperty('--arrow', `${r.left + r.width / 2 - left}px`);
  };
  const fine = window.matchMedia('(pointer: fine)');
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse' || !fine.matches) return;
    const el = e.target.closest?.('[data-tip]');
    if (el) show(el);
    else hide();
  });
  document.addEventListener('focusin', (e) => {
    const el = e.target.closest?.('[data-tip]');
    if (el && el.matches(':focus-visible')) show(el);
    else hide();
  });
  document.addEventListener('focusout', hide);
  document.addEventListener('pointerdown', hide);
  document.addEventListener('keydown', (e) => e.key === 'Escape' && hide());
  document.addEventListener('scroll', hide, { capture: true, passive: true });
}
