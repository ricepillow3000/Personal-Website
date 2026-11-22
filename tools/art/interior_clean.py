"""The train-car picture: the leftover shadow plate behind the big window's top and the stray strokes beside it are
painted out with the wall's own colour. Nothing is added or moved; the frame's ink outline and everything inside it stay.
usage: interior_clean.py in.png out.png"""
import sys, numpy as np
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
im = np.asarray(Image.open(src).convert('RGBA')).astype(np.float32)
rgb = im[..., :3].copy(); lum = rgb.mean(axis=2)
X0, X1, Y0, Y1 = 690, 2152, 459, 512          # the strip between the hand rail and the window, a little past both ends
TOP = 477                                     # the frame's top ink line
ref = np.median(rgb[Y0:Y1, 612:690], axis=1)  # the wall's own colour, row by row, from clean wall just left of the strip
rng = np.random.RandomState(7)
out = rgb.copy(); n = 0
for y in range(Y0, Y1):
    row = lum[y]
    if y < TOP: xl, xr = 10**6, -1            # above the frame: the whole row is wall
    else:
        ink = np.nonzero(row[855:1010] < 45)[0]; xl = 855 + ink[0] if len(ink) else 10**6
        ink = np.nonzero(row[1810:1966] < 45)[0]; xr = 1810 + ink[-1] if len(ink) else -1
    for x in range(X0, X1):
        if xl <= x <= xr: continue
        d = min(abs(x - xl), abs(x - xr))
        fill = ref[y - Y0] + rng.normal(0, 0.9, 3)
        if y >= TOP and d == 1:               # the ink's own soft edge: keep its darkness, over wall instead of over the plate
            a = float(np.clip(1 - lum[y, x] / 118.0, 0, 1)); fill = fill * (1 - a)
        out[y, x] = fill; n += 1
# the top ink line's upper edge, softened one pixel so it does not sit as a hard step on the wall
out[TOP - 1, 930:1890] = out[TOP - 1, 930:1890] * 0.72 + rgb[TOP, 930:1890] * 0.28
res = np.dstack([np.clip(out, 0, 255), im[..., 3:]]).astype(np.uint8)
Image.fromarray(res, 'RGBA').save(dst)
print('pixels repainted', n)
