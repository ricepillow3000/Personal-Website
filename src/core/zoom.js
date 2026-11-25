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

/* ZOOM LOCK (Nov 25, John: "On my iPhone, I was using my website, and when I zoomed in, it crashed the entire site. I used
   it on Instagram, I used it on Google... The goal is to have it where when zooming in, it does not affect the website").
   The still state above was not enough: under a pinch the phone redraws the whole page at the zoom's scale, and the city
   backdrop (a full-screen picture, its canvases and glow layers, behind every screen) is too much to draw at x3 on a 3x
   iPhone, so the system kills the page (Instagram reloads it, Safari and the Google app show a crash). Now the page does
   not zoom at all, like a game or a map: the viewport says so (in-app browsers and Android obey it), every element allows
   only scrolling (touch-action, which iPhone Safari obeys), Apple's pinch gesture events and two-finger moves are refused,
   and on a computer Ctrl/Cmd + wheel, trackpad pinch and Ctrl/Cmd + plus, minus, 0 are refused. The still state stays as
   a backstop for a zoom nothing could refuse (the browser's own menu, an old browser). The privacy page and the PDF still
   zoom: they are plain documents. */
function lockZoom() {
  const stop = (e) => { if (e.cancelable) e.preventDefault(); };
  ['gesturestart', 'gesturechange', 'gestureend'].forEach((t) => document.addEventListener(t, stop, { passive: false }));
  document.addEventListener('touchmove', (e) => { if (e.touches && e.touches.length > 1) stop(e); }, { passive: false });
  window.addEventListener('wheel', (e) => { if (e.ctrlKey || e.metaKey) stop(e); }, { passive: false }); // (a trackpad pinch arrives as Ctrl + wheel)
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && ['+', '=', '-', '_', '0'].includes(e.key)) stop(e);
  }, { capture: true });
}

/** Start watching the visual viewport (once, at boot), and lock zoom. */
export function initZoom() {
  lockZoom();
  if (!vv) return;
  vv.addEventListener('resize', update, { passive: true });
  update();
}
