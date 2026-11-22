/* ZOOM SAFETY (Nov 22, John: "when on my phone and I zoom in, that artifact automatically restarts or says that it cannot
   reach. So fix that for iPhones, tablets, all devices including desktops and laptops").
   Nothing in the site reloads the page: a restart or "cannot reach" is the phone's browser killing the page for memory.
   Measured in Chromium (.shots/zoom_measure.mjs): on a 3x phone THE PLAN kept 38 layers of half the screen or more, 18 of
   them promoted for motion (running animations, will-change, 3D transforms), including the whole station (its picture, six
   canvases, the light and sign layers) still animating at opacity 0 behind the city. A layer that may move cannot be
   rendered only where the screen looks: a tiled browser covers it whole, and at a pinch zoom its backing is drawn at the
   zoom's scale (x3 zoom on a 3x phone: 9 times the pixels per side squared). On THE PLAN that is 374 MB of moving layers at
   rest, 3.4 GB at x3 and 9.4 GB at x5: far past what an iPhone gives one page.
   So zooming switches the page into a still state, and nothing is turned off: pinch zoom and browser zoom keep working.
   While the visual viewport is scaled (visualViewport.scale over 1.01), <html> carries .zoomed: every CSS animation is
   paused where it is, will-change is dropped, the backdrop's parallax layers lose their (a few px) 3D transform, the
   blurred glow layers are hidden, and the page's own frame loops (the tower's LED crawl, the tube flicker) skip their work.
   Everything then falls back into the browser's one tiled page layer, drawn only where the visitor looks. Zooming back out
   takes the class away and every loop carries on from where it stopped. */
let zoomed = false;
const subs = new Set();
const vv = typeof window !== 'undefined' ? window.visualViewport : null;
const scaled = () => Boolean(vv && vv.scale > 1.01);

function update() {
  const z = scaled();
  if (z === zoomed) return;
  zoomed = z;
  document.documentElement.classList.toggle('zoomed', z);
  subs.forEach((f) => { try { f(z); } catch { /* a listener's trouble never stops the others */ } });
}

/** Is the page pinch-zoomed right now? Frame loops check it and skip their work while it is. */
export const isZoomed = () => zoomed;

/** Call f(zoomed) whenever the page is zoomed in or back out. */
export function onZoom(f) { subs.add(f); }

/** Start watching the visual viewport (once, at boot). */
export function initZoom() {
  if (!vv) return;
  vv.addEventListener('resize', update, { passive: true });
  update();
}
