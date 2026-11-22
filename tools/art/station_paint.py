"""The painted pass over the station's master (after the geometry build, before the export).
Nothing is added or moved: the same station, lit by its one row of tubes and drawn with a hand's line.
  1. the tubes' light on the floor: brightest under the row, falling away to the sides (a line of light 3.35 m up)
  2. each pillar's soft shadow, thrown AWAY from the row, on the floor behind it and up the wall
  3. shade is cooler than light
  4. lost-and-found line: tile joints fade where the light is strong and come and go along their length
  5. a brushed surface: slow uneven value, grime where things meet the floor
  6. the far end sits in a little haze, the corners of the frame a little darker
usage: paint.py in.png out.png [strength 0..1]"""
import sys, numpy as np, cv2
src, dst = sys.argv[1], sys.argv[2]
ST = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
im = cv2.imread(src, cv2.IMREAD_COLOR).astype(np.float32)  # BGR
H, W = im.shape[:2]; K = W / 1600.0
h, w = 914, 1600
VPX, VPY, F, E, HCE, WALLX = 870.0, 548.0, 1040.0, 1.6, 1.75, 6.6
X0, HL = -0.26, E + HCE  # the row of tubes: metres right of the eye, metres over the floor
Y, X = np.mgrid[0:h, 0:w].astype(np.float32)
def poly(pts):
    m = np.zeros((h, w), np.uint8); cv2.fillPoly(m, [np.int32(np.array(pts))], 1); return m.astype(bool)
pillars = [(1335, 1398, 1572, 118, 737, 690), (1108, 1126, 1210, 57, 639, 612), (1032, 1039, 1094, 38, 609, 592), (992, 995, 1032, 26, 590, 580), (962, 968, 994, 18, 577, 570)]
fl = lambda x: VPY + (x - VPX) * E / WALLX
ce = lambda x: VPY - (x - VPX) * HCE / WALLX
pm = np.zeros((h, w), bool)
for (sx0, fx0, fx1, s, yf, yb) in pillars: pm |= poly([(sx0 - 2, 0), (fx1 + 3, 0), (fx1 + 3, yf + 3), (fx0, yf + 3), (sx0 - 2, yb + 2)])
dy = np.maximum(Y - VPY, 0.5)
xw = (X - VPX) * E / dy; zw = F * E / dy  # the floor's metres under each pixel
edge = VPX - 2.633 * (Y - VPY) / E
floor = (Y > 575.5) & (X > edge + 1) & (X < VPX + (Y - VPY) * WALLX / E) & ~pm
rwall = (X > 982) & (Y > ce(X)) & (Y < fl(X) - 1) & ~pm
# pillars in metres: x from xa to xb, depth from zf to zb
P = []
for (sx0, fx0, fx1, s, yf, yb) in pillars:
    xa, xb = (fx0 - VPX) / s, (fx1 - VPX) / s; zf = F / s; zb = F / (s * (sx0 - VPX) / (fx0 - VPX)); P.append((xa, xb, zf, zb))
def seen(xp, zp, D2):
    """how much of the row of tubes a point sees past the pillars (1 all of it, 0 none)"""
    G = lambda t: t / np.sqrt(D2 + t * t)
    v = np.ones_like(xp)
    for (xa, xb, zf, zb) in P:
        with np.errstate(divide='ignore', invalid='ignore'):
            ta = lambda xc, zc: (zc - zp) * (xp - X0) / np.maximum(xp - xc, 1e-3)
            t1, t2, t3, t4 = ta(xa, zf), ta(xa, zb), ta(xb, zf), ta(xb, zb)
            beyond = xp > xb + 1e-3
            lo = np.where(beyond, np.minimum(np.minimum(t1, t2), np.minimum(t3, t4)), np.where(zp < zf, t1, -1e9))
            hi = np.where(beyond, np.maximum(np.maximum(t1, t2), np.maximum(t3, t4)), np.where(zp < zf, 1e9, t2))
            cut = np.clip((G(hi) - G(lo)) / 2, 0, 1)
        cut = np.where((xp > xa + 1e-3) & ~((xp <= xb) & (zp >= zf) & (zp <= zb)), cut, 0)
        v *= 1 - cut
    return v
# 1, 2: the floor
D2f = HL * HL + (xw - X0) ** 2
I = HL * HL / D2f
Vf = seen(xw, zw, D2f)
AMB = 0.40; Iref = HL * HL / (HL * HL + 1.6 ** 2)
gf = (AMB + (1 - AMB) * I * Vf) / (AMB + (1 - AMB) * Iref)
gf = np.clip(gf, 0.5, 1.10)
# the wall behind the pillars
sw = np.maximum((X - VPX) / WALLX, 1e-3); zwall = F / sw; yr = (VPY - Y) / sw
D2w = (WALLX - X0) ** 2 + (HCE - yr) ** 2
Vw = seen(np.full_like(X, WALLX), zwall, D2w)
gw = 0.50 + 0.50 * Vw
g = np.ones((h, w), np.float32)
g[floor] = gf[floor]; g[rwall] = gw[rwall]
# a soft edge where the masks end (a mask's hard edge would draw a line)
g = cv2.GaussianBlur(g, (0, 0), 1.2)
g = 1 + (g - 1) * ST
# 5: grime where the pillars and the right wall meet the floor (on the floor and a little way up)
ao = np.zeros((h, w), np.float32)
for (sx0, fx0, fx1, s, yf, yb) in pillars:
    line = np.zeros((h, w), np.uint8); cv2.polylines(line, [np.int32([(sx0, yb), (fx0, yf), (fx1, yf)])], False, 255, max(1, int(round(s * 0.05))))
    ao = np.maximum(ao, cv2.GaussianBlur(line.astype(np.float32) / 255, (0, 0), max(1.5, s * 0.10)) * 2.2)
line = np.zeros((h, w), np.uint8); cv2.line(line, (982, int(fl(982))), (1600, int(fl(1600))), 255, 2)
far = np.clip((X - VPX) / (1600 - VPX), 0.05, 1)
ao = np.maximum(ao, cv2.GaussianBlur(line.astype(np.float32) / 255, (0, 0), 6) * 3.0 * far)
ao = np.clip(ao, 0, 1) * 0.22 * ST
# 6: haze at the far end, darker corners
r = np.sqrt(((X - VPX) / 210) ** 2 + ((Y - VPY) / 120) ** 2)
haze = np.exp(-r * r) * 0.07 * ST
vig = 1 - 0.14 * ST * np.clip((np.sqrt(((X - 800) / 800) ** 2 + ((Y - 457) / 457) ** 2) - 0.72) / 0.7, 0, 1) ** 1.6
# 5: brushed value (slow, uneven), seeded
rs = np.random.RandomState(7)
def noise(cell, seed):
    r_ = np.random.RandomState(seed); a = r_.rand(int(h / cell) + 3, int(w / cell) + 3).astype(np.float32)
    return cv2.resize(a, (w, h), interpolation=cv2.INTER_CUBIC) - 0.5
brush = 1 + (0.060 * noise(140, 1) + 0.035 * noise(46, 2) + 0.020 * noise(15, 3)) * ST
# noise laid ON a surface (sampled by the surface's own metres), so it sits in perspective like paint on it
_t0 = np.tile(np.random.RandomState(21).rand(512, 512).astype(np.float32), (3, 3)); _tex = cv2.GaussianBlur(_t0, (0, 0), 1.2)[512:1024, 512:1024]
_tex = (_tex - _tex.min()) / (_tex.max() - _tex.min())
def on(u, v, su, sv, off=0.0):
    mx = np.mod(u / su * 8 + off, 512).astype(np.float32); my = np.mod(v / sv * 8 + off * 0.37, 512).astype(np.float32)
    return cv2.remap(_tex, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
grime = np.zeros((h, w), np.float32)
def wall_grime(mask, u, v, top):
    """runs of dirty water from the top of a wall, splash dirt at its foot, slow blotches"""
    run = np.clip((on(u, v, 0.16, 3.2, 3.0) - 0.60) / 0.16, 0, 1) * np.clip((on(u, v, 1.4, 6.0, 91.0) - 0.35) / 0.3, 0, 1)
    run *= np.exp(-np.clip(top - v, 0, None) / 1.5)
    foot = np.exp(-np.clip(v, 0, None) / 0.22) * (0.6 + 0.8 * on(u, v, 0.9, 0.9, 40.0))
    blot = np.clip(on(u, v, 2.2, 1.6, 12.0) - 0.5, -0.5, 0.5) * 0.16 + 0.04
    g_ = 0.34 * run + 0.36 * foot + blot * 1.3
    grime[mask] = g_[mask]
# the right wall, the left wall, the pillars' fronts
wall_grime(rwall, zwall, yr + E, HL)
sl = np.maximum((VPX - X) / 8.3, 1e-3); railY = VPY + (806 - VPY) * (VPX - X) / VPX
lwall = (X < 729) & ((VPY - Y) / sl < HCE) & (Y < railY - 6)
wall_grime(lwall, F / sl, (VPY - Y) / sl + E, HL)
for (sx0, fx0, fx1, s, yf, yb) in pillars:
    m_ = (X > fx0) & (X < fx1) & (Y < yf - 0.12 * s) & ((yf - Y) / s < HL)
    wall_grime(m_, (X - VPX) / s + 7.0 * s, (yf - Y) / s, HL)
# the floor: worn and stained in its own plane
fg = (np.clip(on(xw, zw, 1.3, 2.1, 5.0) - 0.5, -0.5, 0.5) * 0.14 + np.clip(on(xw, zw, 0.35, 0.6, 77.0) - 0.5, -0.5, 0.5) * 0.06)
grime[floor] = fg[floor]
grime = cv2.GaussianBlur(grime, (0, 0), 0.8) * ST
up = lambda a: cv2.resize(a.astype(np.float32), (W, H), interpolation=cv2.INTER_LINEAR)
G_, AO_, HZ_, VG_, BR_, GR_ = up(g), up(ao), up(haze), up(vig), up(brush), up(grime)
rad = up(np.sqrt((X - VPX) ** 2 + (Y - VPY) ** 2))  # how far from the vanishing point (far things are near it)
# 4: lost-and-found line. The thin dark lines (tile joints, slats) are what a closing takes out; they are put back at a
# strength that comes and goes along their length and thins out in strong light.
kk = int(round(3.4 * K)) | 1
lum = im.mean(axis=2)
closed = cv2.morphologyEx(lum, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kk, kk)))
delta = np.clip(closed - lum, 0, None)  # how much darker than its surface each thin line is
thin = np.clip(delta / np.maximum(closed, 8), 0, 1)
keep = 0.80 + 1.5 * up(noise(60, 11)) + 0.9 * up(noise(22, 12)) - 0.35 * np.clip(G_ - 0.9, 0, 0.2) / 0.2
keep = np.clip(keep, 0.30, 1.12)
keep *= np.clip(0.50 + 0.75 * rad / 620, 0.5, 1.25)  # a hand's line: thin and pale far away, firm and dark close by
# close by, the line is also wider
thick = cv2.dilate(delta, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(round(1.0 * K)) | 1, int(round(1.0 * K)) | 1)))
nearw = np.clip((rad - 330) / 420, 0, 1) * 0.55 * ST
delta2 = delta + (thick - delta) * nearw
keep = 1 + (keep - 1) * ST
# object outlines (a line darker than 60 percent of its surface is ink round a thing: it stays whole)
keep = np.where(thin > 0.60, 1.0, keep)
add = (delta - delta2 * keep)[..., None]
out = im + add * (im / np.maximum(lum, 1)[..., None]).clip(0, 3)
# light, shade (cooler than the light), grime, brush
shade = np.clip(1 - G_, 0, 0.6)[..., None]
out *= G_[..., None]
out *= np.array([1 + 0.16, 1 + 0.02, 1 - 0.10], np.float32) ** shade  # B up, R down in the shade
out *= (1 - AO_)[..., None] * BR_[..., None] * VG_[..., None]
gr = np.clip(GR_, -0.2, 0.6)[..., None]
out *= np.where(gr > 0, 1 - gr * np.array([1.0, 0.86, 0.74], np.float32), 1 - gr)  # dirt is brown: it takes the blue first
hz = np.array([150, 190, 214], np.float32)  # the tubes' warm air (BGR)
out = out * (1 - HZ_[..., None]) + hz * HZ_[..., None]
# 7: the tubes are fittings, not holes of light: each panel gets its frame (a dark rim, an inked edge), two ribs across
# its diffuser, and a face that is brightest in the middle and a little warmer and dimmer toward its edges
lamp = ((lum > 150) & (up((Y < VPY - 6).astype(np.float32)) > 0.5)).astype(np.uint8)
lamp = cv2.morphologyEx(lamp, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
n, lab, stats, _ = cv2.connectedComponentsWithStats(lamp, 8)
for i in range(1, n):
    x, y, bw, bh, area = stats[i]
    if area < 500 * K or bw < 14 * K: continue
    m = (lab[y:y + bh, x:x + bw] == i).astype(np.uint8)
    pad = int(6 * K); m = cv2.copyMakeBorder(m, pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=0)
    y0, x0 = y - pad, x - pad
    if y0 < 0 or x0 < 0 or y0 + m.shape[0] > H or x0 + m.shape[1] > W: continue
    t = max(1.0, min(bw, bh) * 0.05)  # the frame's width follows the panel's size (the far ones are small)
    dist = cv2.distanceTransform(m, cv2.DIST_L2, 5)
    roi = out[y0:y0 + m.shape[0], x0:x0 + m.shape[1]]
    face = np.clip(dist / (min(bw, bh) * 0.5), 0, 1)
    tone = (0.86 + 0.14 * face ** 0.6)[..., None] * np.array([0.90, 0.97, 1.0], np.float32) ** (1 - face[..., None])
    rim = ((dist > 0) & (dist <= t))
    ribs = np.zeros_like(m, bool)
    ys = np.where(m.any(axis=1))[0]; ya, yb_ = ys[0], ys[-1]
    za, zb_ = 1.0 / max(1.0, (VPY * K - (y0 + ya))), 1.0 / max(1.0, (VPY * K - (y0 + yb_)))  # depth runs as 1 / (distance under the horizon line)
    for f in (1 / 3, 2 / 3):
        yy = int(round(VPY * K - 1.0 / (za + (zb_ - za) * f))) - y0
        hw = max(1, int(round(t * 0.35)))
        ribs[max(0, yy - hw):yy + hw + 1, :] = True
    ribs &= dist > t
    sel = m.astype(bool)
    roi[sel] = (roi * tone)[sel]
    roi[ribs] = roi[ribs] * np.array([0.62, 0.70, 0.74], np.float32)
    roi[rim] = roi[rim] * np.array([0.30, 0.34, 0.38], np.float32)
    edge = cv2.dilate(m, np.ones((3, 3), np.uint8), iterations=max(1, int(round(t * 0.45)))).astype(bool) & ~sel
    roi[edge] = roi[edge] * 0.35
cv2.imwrite(dst, np.clip(out, 0, 255).astype(np.uint8))
print('painted', dst, 'floor light', float(gf[floor].min()), float(gf[floor].max()), 'wall', float(gw[rwall].min()))
