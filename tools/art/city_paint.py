"""The painted pass over the city skyline (the menu's backdrop). Nothing is added or moved:
  1. the red LED bands light what is next to them (their glow on the walls beside, above and below)
  2. a thin cool edge of sky light on each building where it stands against the night (light from upper left)
  3. the night sky is not flat black: the city's own red haze sits low behind the roofs
  4. a brushed surface: slow uneven value, rain streaks down the faces
usage: citypaint.py in out.png [strength]"""
import sys, numpy as np, cv2
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]; ST = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
im = cv2.cvtColor(np.asarray(Image.open(src).convert('RGB')), cv2.COLOR_RGB2BGR).astype(np.float32)
H, W = im.shape[:2]; K = W / 1600.0
b, g, r = im[..., 0], im[..., 1], im[..., 2]
lum = im.mean(axis=2)
# the sky: near-black, joined to the top of the frame
dark = (cv2.GaussianBlur(lum, (0, 0), 2 * K) < 9).astype(np.uint8)
n, lab = cv2.connectedComponents(dark, connectivity=4)
top = np.unique(lab[0, :]); top = top[top > 0]
sky = np.isin(lab, top) & (dark > 0)
sky = cv2.morphologyEx(sky.astype(np.uint8), cv2.MORPH_OPEN, np.ones((int(3 * K) | 1, int(3 * K) | 1), np.uint8)).astype(bool)
bld = ~sky
sm = lambda a, s: cv2.GaussianBlur(a.astype(np.float32), (0, 0), s)
# 1: the red screens' light
red = np.clip((r - np.maximum(g, b) * 1.6 - 40) / 90, 0, 1) * (r / 255)
small = cv2.resize(red, (W // 4, H // 4), interpolation=cv2.INTER_AREA)
glow = cv2.resize(sm(small, 9 * K) * 0.9 + sm(small, 30 * K) * 1.3, (W, H), interpolation=cv2.INTER_LINEAR)
glow = np.clip(glow, 0, 1) * ST
out = im.copy()
onb = (0.25 + 0.75 * bld)  # on the buildings mostly; a little in the air
out[..., 2] += glow * 150 * onb; out[..., 1] += glow * 14 * onb; out[..., 0] += glow * 22 * onb
# 2: the sky's light on the edges that face up and left
skf = sky.astype(np.float32)
d = int(round(4.6 * K))  # (past the building's own ink outline: the light is on its face, inside the line)
M = np.float32([[1, 0, d], [0, 1, d * 0.7]])
shifted = cv2.warpAffine(skf, M, (W, H), borderValue=0)  # the sky, moved down-right: where it lands on a building is that building's upper-left edge
kb = int(7 * K) | 1
big = cv2.morphologyEx(bld.astype(np.uint8), cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kb, kb))).astype(np.float32)  # (not the small roof lights and masts)
face = (cv2.GaussianBlur(lum, (0, 0), 0.8 * K) > 30).astype(np.float32)  # the lit face itself, not the ink
rim = np.clip(sm(shifted * bld * big * face, 0.6 * K), 0, 1) * ST
out += rim[..., None] * np.array([96, 78, 72], np.float32)
# 3: the city's haze low in the sky (strongest right behind the roofs)
dist = cv2.distanceTransform(sky.astype(np.uint8), cv2.DIST_L2, 3)
Y = np.mgrid[0:H, 0:W][0].astype(np.float32) / H
haze = np.exp(-dist / (150 * K)) * (0.35 + 0.65 * Y) * sky * ST
haze = sm(haze, 2 * K)
out[..., 2] += haze * 46; out[..., 1] += haze * 5; out[..., 0] += haze * 10
# 4: brush and rain streaks (on the buildings)
def noise(cw, ch, seed):
    a = np.random.RandomState(seed).rand(int(H / ch) + 3, int(W / cw) + 3).astype(np.float32)
    return cv2.resize(a, (W, H), interpolation=cv2.INTER_CUBIC) - 0.5
br = 1 + (0.07 * noise(150 * K, 150 * K, 1) + 0.035 * noise(40 * K, 40 * K, 2) + 0.05 * noise(5 * K, 110 * K, 3)) * ST
out *= np.where(bld, br, 1)[..., None]
cv2.imwrite(dst, np.clip(out, 0, 255).astype(np.uint8))
print('city painted', dst, 'sky share', float(sky.mean()))
