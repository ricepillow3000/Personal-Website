import { $ } from '../core/util.js';

/* The title's fit guard (Nov 19, John: "not crowded, spaced out, nothing overlapping").
   The CONNECT card (right) and the calendar sticker (left) must never touch the title's text, on
   any screen. Fixed breakpoints miss cases (the title's height depends on fonts and screen shape),
   so this measures the real layout boxes (not the animated ones, so an entrance in progress never
   fools it) and:
   - if the card would touch the title, the card steps aside (body.cc-off: invisible, still in the
     layout so it can be measured) and the small top-bar
     contact plate comes back, so the three links are always one tap away;
   - if the calendar would touch it, it shrinks a little (cal-small), then keeps just the date and
     the sky (cal-tiny), then steps aside (cal-off: only a phone on its side gets there).
   Re-checked whenever the title, the card or the calendar changes size (fonts arriving, the
   weather badge, a resize, a rotation) and when the title is shown again. */
const GAP = 24; // the least space kept between them (24, not 16: John, Nov 19, "nothing cramped") (the card's small tilt is inside it)

function box(el, root) {
  let x = 0;
  let y = 0;
  for (let n = el; n && n !== root; n = n.offsetParent) {
    x += n.offsetLeft;
    y += n.offsetTop;
  }
  return { l: x, t: y, r: x + el.offsetWidth, b: y + el.offsetHeight };
}
const near = (a, b) => a.l < b.r + GAP && b.l < a.r + GAP && a.t < b.b + GAP && b.t < a.b + GAP;

export function watchTitleFit() {
  const scr = $('#screen-title');
  const block = scr?.querySelector('.title-block');
  const card = $('#contactCard');
  const cal = $('#hudDate');
  if (!block || !card || !cal) return;
  const body = document.body;
  const parts = () => [...block.querySelectorAll('#titleName, .title-codename, .title-role, .title-hook, #pressStart, .quick-link')]
    .filter((el) => el.offsetWidth)
    .map((el) => box(el, scr));
  const sticker = () => cal.querySelector('.hud-cal');
  // the calendar's visible pieces touch the title? (the HUD is fixed at the screen's corner, so these
  // are screen coordinates)
  const hits = (ps) => [...(sticker()?.children || [])].some((el) => {
    const r = el.getBoundingClientRect();
    return r.width && ps.some((p) => near(p, { l: r.left, t: r.top, r: r.right, b: r.bottom }));
  });
  const STEPS = ['cal-small', 'cal-tiny', 'cal-off'];
  let queued = 0;
  /* No churn: taking every class off <body> and putting it back restyles the whole page, several
     times while the title loads (it cost CI's mobile Lighthouse score). The card stays in the layout
     when it steps aside (it is only made invisible), so it is measured in place and its class only
     flips when the answer changes; the calendar's steps are re-tried only when it touches or has
     already stepped down (a bigger screen may give the room back). */
  const check = () => {
    queued = 0;
    if (body.dataset.screen !== 'title' || !scr.offsetWidth) return;
    const ps = parts();
    const off = ps.some((p) => near(p, box(card, scr)));
    if (off !== body.classList.contains('cc-off')) body.classList.toggle('cc-off', off);
    const stepped = STEPS.some((c) => body.classList.contains(c));
    if (!stepped && !hits(ps)) return;
    body.classList.remove(...STEPS);
    for (const step of STEPS) {
      if (!hits(ps)) break;
      body.classList.add(step);
    }
  };
  const later = () => { if (!queued) queued = requestAnimationFrame(check); };
  const ro = new ResizeObserver(later);
  [block, card, cal].forEach((el) => ro.observe(el));
  window.addEventListener('resize', later);
  window.addEventListener('hashchange', () => setTimeout(later, 50));
  document.fonts?.ready.then(later);
  new MutationObserver(later).observe(body, { attributes: true, attributeFilter: ['data-screen'] });
  later(); // (in the next frame, still before it is painted: measuring while the code first runs forced an extra layout; Nov 21)
}
