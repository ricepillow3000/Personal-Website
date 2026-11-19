/* Phones held sideways get the whole screen (Nov 19, John: "when going sideways, there's no
   borders... everything fits into the frame"). Where the browser allows it (Android Chrome and
   most phone browsers; iPhone Safari doesn't let pages do this, its answer is Add to Home Screen),
   the first tap on a phone held sideways hides the browser's bars. Browsers only allow it inside a
   tap, so it rides the visitor's own tap; never in portrait, never on a desktop. If the visitor
   leaves full screen, it waits until they turn the phone upright and back before offering again. */
const phone = () => window.matchMedia('(pointer: coarse) and (max-height: 600px)').matches;
const sideways = () => window.innerWidth > window.innerHeight;
const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;

export function initFullscreen() {
  const root = document.documentElement;
  const ask = root.requestFullscreen || root.webkitRequestFullscreen;
  if (!ask) return; // (iPhone Safari)
  let armed = true;
  const tap = () => {
    if (!armed || fsEl() || !phone() || !sideways()) return;
    armed = false;
    try {
      const p = ask.call(root, { navigationUI: 'hide' });
      if (p && p.catch) p.catch(() => {}); // (inside a frame that doesn't allow it, or refused)
    } catch { /* not allowed here */ }
  };
  window.addEventListener('pointerup', tap, true);
  window.addEventListener('keydown', tap, true);
  window.addEventListener('resize', () => { if (!sideways()) armed = true; }); // upright again: offer next time
}
