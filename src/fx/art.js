/* Background art comes in three sizes with the same shape (1600:914):
   - name-4800.webp for big desktop screens that need it (4K monitors, 1440p+, retina desktops),
   - name.webp (3200px) for sharp phones, tablets and laptops,
   - name-1600.webp for everything else, low-memory phones and data-saver mode.
   "Need" = how many real pixels the picture covers: object-fit: cover fills the width or the
   height, whichever is larger, times the screen's pixel density. Touch devices never get the
   4800 file: decoded it is ~52 MB of memory, and mobile browsers can drop a tab that uses too much. */
function need() {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  return Math.max(window.innerWidth, window.innerHeight * (1600 / 914)) * dpr;
}
function tier() {
  const mem = navigator.deviceMemory;
  if ((mem && mem <= 2) || navigator.connection?.saveData) return '-1600';
  const n = need();
  const desktop = window.matchMedia('(pointer: fine)').matches && !(mem && mem < 8);
  if (desktop && n > 2800) return '-4800';
  return n > 1200 ? '' : '-1600';
}

export const sharpArt = () => tier() !== '-1600';

/** 'subway' -> assets/film/subway-4800.webp, subway.webp (3200px) or subway-1600.webp */
export const artSrc = (name) => `assets/film/${name}${tier()}.webp`;
