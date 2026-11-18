/* Background art comes in two sizes with the same shape (1600:914): a sharp 3200px file for
   screens that need it (retina laptops, OLED phones, 4K monitors) and a 1600px file for the rest.
   "Need" = how many real pixels the picture covers: object-fit: cover fills the width or the
   height, whichever is larger, times the screen's pixel density. */
export function sharpArt() {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const need = Math.max(window.innerWidth, window.innerHeight * (1600 / 914)) * dpr;
  return need > 1800;
}

/** 'subway' -> assets/film/subway.webp (3200px) or assets/film/subway-1600.webp */
export const artSrc = (name) => `assets/film/${name}${sharpArt() ? '' : '-1600'}.webp`;
