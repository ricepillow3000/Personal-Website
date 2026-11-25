"""The vending machine and the trash bin, drawn out (Nov 22, John: "improve it with details, textures... no hallucinated parts
... fully drawn out... as if it was an anime... do that for the vending machine and trash can as well").
Both outside judges, asked twice each, on the corner as a visitor sees it: the drinks were "indistinct blobs", the buttons
and prices "garbled dots and dashes", the payment panel "mushy blobs", the pick-up slot and the bin's opening "flat black
rectangles", the bin "a monolithic grey box" with no lid, seam or base, both "melting into the floor".
Root cause: the two props are 129 x 254 and 44 x 96 px of the 4800-wide station picture, and they were painted (by an image
model, then shaded by the paint pass) with detail finer than that: a bottle's label, a price, a coin slot each got two or
three soft pixels, which is a smear, not a part. Here each part is DRAWN as a closed flat shape at 8 times the size and
scaled down, sized so that the smallest one is still 2 px of the picture: bottles and cans with a cap, a body and a label,
a row of select buttons on each shelf rail (blue cold, red hot), a payment panel of four named parts (bill slot and its
lamp, card pad, coin slot, return knob), a pick-up slot with a frame and a flap, a change cup, a door seam and its lock, a
kick plate; the bin a lid with its top face, a framed opening, a seam, a label plate, a handle, a foot. Nothing moves: each
prop keeps its old outline to the pixel, its old colours, and the light already painted on it (read back from the picture
row by row), and everything outside the two outlines stays pixel for pixel, but for a contact shadow under each.
usage: props.py <painted master in> <out.png>   (the LAST step of the station pipeline, after paint.py)"""
import sys, numpy as np
from PIL import Image, ImageDraw, ImageFilter
src, dst = sys.argv[1], sys.argv[2]
M = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
X0, Y0, W, H, S = 2926, 1536, 192, 280, 8
A = Image.new('RGB', (W * S, H * S), (0, 0, 0)); a = ImageDraw.Draw(A)       # the flat colours
K = Image.new('L', (W * S, H * S), 0); k = ImageDraw.Draw(K)                 # the two props' outlines (what is replaced)
E = Image.new('L', (W * S, H * S), 0); e = ImageDraw.Draw(E)                 # what is lit from inside (the window, the lamp)
INK = (9, 8, 8)
def q(v, o): return (v - o) * S
def R(x0, y0, x1, y1, fill, r=0, on=(a,)):
    for d in on: d.rounded_rectangle([q(x0, X0), q(y0, Y0), q(x1, X0) - 1, q(y1, Y0) - 1], radius=r * S, fill=fill)
def box(x0, y0, x1, y1, fill, r=0, ink=1.0, line=INK):   # a part: its ink line, then its fill inside it
    R(x0, y0, x1, y1, line, r); R(x0 + ink, y0 + ink, x1 - ink, y1 - ink, fill, max(0, r - ink * 0.6))
def C(cx, cy, rr, fill): a.ellipse([q(cx - rr, X0), q(cy - rr, Y0), q(cx + rr, X0), q(cy + rr, Y0)], fill=fill)
def P(pts, fill, on=(a,)):
    for d in on: d.polygon([(q(x, X0), q(y, Y0)) for x, y in pts], fill=fill)
sh = lambda c, f: tuple(int(max(0, min(255, v * f))) for v in c)
# ---------------- the vending machine: outline x 2981..3110, y 1545..1799.5 ----------------
R(2981, 1545, 3110, 1799.5, 255, 0, (k,))
RED, RED_LIT, RED_SHADE, SIDE = (104, 20, 16), (150, 38, 30), (74, 14, 12), (46, 11, 10)
R(2981, 1545, 3110, 1799.5, INK)                                  # everything stands on ink: the gaps between parts are lines
R(2982.2, 1546.2, 3108.8, 1564.8, (33, 32, 28))                   # the cap
R(2982.2, 1546.2, 3108.8, 1548.0, (92, 88, 76))                   # its lit top edge
R(2982.2, 1561.4, 3108.8, 1562.6, (20, 19, 17))                   # and the shadow line under its lip
R(2982.2, 1566, 3100.2, 1790.6, RED)                              # the door
R(2982.2, 1566, 3100.2, 1568.2, RED_LIT)                          # lit along its top, under the cap
R(2982.2, 1566, 2984.4, 1790.6, RED_LIT)                          # and down the edge that faces the light strip
R(3093.4, 1568.2, 3100.2, 1790.6, RED_SHADE)                      # the hinge side, in shade
R(3092.4, 1568.2, 3093.4, 1790.6, INK)                            # the door's seam
R(3101.4, 1566, 3108.8, 1790.6, SIDE)                             # the cabinet's side, away from the light
R(2982.2, 1791.6, 3108.8, 1798.4, (20, 10, 9))                    # the kick plate, set back under the door
R(2982.2, 1791.6, 3108.8, 1792.8, (44, 14, 12))
C(3096.8, 1737.5, 3.0, INK); C(3096.8, 1737.5, 2.1, (150, 146, 132)); R(3096.3, 1736.4, 3097.3, 1738.8, INK)   # the lock
# the window: a dark frame, the lit back, three shelves of drinks, a row of select buttons on each rail
R(2988.5, 1574.5, 3088.5, 1683.5, INK, 2.5)
R(2990, 1576, 3087, 1682, (26, 24, 22), 2)
for i in range(52):                                                # the lit back, warm and a little darker low down
    t = i / 51; c = (238 - 22 * t, 226 - 28 * t, 190 - 40 * t)
    R(2991.5, 1577.5 + i * 103 / 52, 3085.5, 1577.5 + (i + 1) * 103 / 52 + 0.2, tuple(int(v) for v in c))
R(2991.5, 1577.5, 3085.5, 1680.5, 255, 0, (e,))
R(2991.5, 1577.5, 3085.5, 1580.5, (176, 160, 122))                 # the frame's shadow on the back, along the top
def bottle(cx, by, h, col, cap=(244, 244, 238)):
    w = 8.0; x = cx - w / 2; top = by - h
    R(cx - 2.3, top - 0.5, cx + 2.3, top + 6.5, sh(col, 0.34), 1)                 # ink: cap and neck
    R(x - 0.6, top + 4.6, x + w + 0.6, by + 0.4, sh(col, 0.34), 2.6)              # ink: body
    R(cx - 1.7, top, cx + 1.7, top + 2.4, cap, 0.6)                               # cap
    R(cx - 1.5, top + 2.6, cx + 1.5, top + 6, sh(col, 1.12), 0.4)                 # neck
    R(x, top + 5.2, x + w, by - 0.2, col, 2.2)                                    # body
    R(x + w - 2.4, top + 6.6, x + w, by - 1.4, sh(col, 0.74), 1.2)                # its shaded side
    R(x, top + 10.0, x + w, top + 15.6, (250, 250, 244))                          # label
    R(x + w - 2.4, top + 10.0, x + w, top + 15.6, (212, 212, 204))
    R(x + 1.6, top + 11.6, x + 4.4, top + 14.0, sh(col, 0.8), 0.4)                # the label's mark: one block of the drink's colour
def can(cx, by, h, col, band=(250, 250, 244), top=(206, 206, 198)):
    w = 8.0; x = cx - w / 2; t = by - h
    R(x - 0.6, t - 0.6, x + w + 0.6, by + 0.4, sh(col, 0.34), 1.8)                # ink
    R(x, t, x + w, by - 0.2, col, 1.4)                                            # body
    R(x + w - 2.4, t + 1.6, x + w, by - 0.8, sh(col, 0.74), 0.8)                  # its shaded side
    R(x, t, x + w, t + 2.0, top, 0.9)                                             # the lid's rim
    R(x, t + h * 0.42, x + w, t + h * 0.42 + 3.6, band)                           # one band round it
    R(x + w - 2.4, t + h * 0.42, x + w, t + h * 0.42 + 3.6, sh(band, 0.84))
BLUE, GRN, TEAL, AMB, ORG, REDD, BRN, BLK, YEL, LIME, CRM, GRY = (112, 184, 226), (146, 202, 84), (96, 196, 184), (232, 170, 60), (240, 128, 44), (214, 62, 48), (128, 86, 54), (44, 40, 38), (240, 204, 64), (176, 214, 70), (232, 226, 208), (150, 152, 150)
ROWS = [('b', [BLUE, BLUE, BLUE, GRN, GRN, LIME, TEAL, AMB]), ('c', [ORG, AMB, BRN, REDD, BLK, GRN, YEL, BLUE]), ('m', [AMB, CRM, TEAL, ORG, REDD, LIME, BLUE, GRY])]   # (the third was a brown bottle: on the bottom shelf both runs of one judge read it as "a brown smudge")
HOT = {(1, 2), (1, 4), (2, 3), (2, 1)}                             # the coffees are hot: a red button under them
for r, (kind, cols) in enumerate(ROWS):
    shelf = 1580.5 + r * 34 + 24.5                                 # the shelf's top: the drinks stand on it
    for i, col in enumerate(cols):
        cx = 2997.6 + i * 11.6
        if kind == 'b' or (kind == 'm' and i % 3 == 2): bottle(cx, shelf, 22 if kind == 'b' else 19, col)
        else: can(cx, shelf, 16 if kind == 'c' else 15, col, band=(232, 200, 90) if col == BLK else (250, 250, 244))
    R(2991.5, shelf, 3085.5, shelf + 1.0, (70, 58, 44))            # the shelf's edge line
    R(2991.5, shelf + 1.0, 3085.5, shelf + 7.2, (250, 245, 224))   # the price rail
    R(2991.5, shelf + 7.2, 3085.5, shelf + 8.2, (120, 104, 78))
    for i in range(8):
        cx = 2997.6 + i * 11.6
        R(cx - 3.2, shelf + 2.4, cx + 3.2, shelf + 5.8, (52, 96, 196) if (r, i) not in HOT else (206, 50, 40), 1.5)
# the payment panel: four parts, each a part
box(3046.5, 1688.5, 3094.5, 1723.5, (46, 45, 42), 2, 1.0)
box(3050.5, 1692.5, 3072.5, 1701.5, (150, 146, 134), 1, 0.8)       # bill slot: a bezel, the slit, its lamp
R(3053, 1696.1, 3066, 1698.0, INK)
R(3067.6, 1695.6, 3070.2, 1698.4, (96, 232, 124), 0.6); R(3067.6, 1695.6, 3070.2, 1698.4, 255, 0.6, (e,))
box(3050.5, 1704.2, 3069.5, 1720.2, (84, 88, 94), 2.2, 0.8)        # card pad: a ring on it
a.ellipse([q(3060 - 5, X0), q(1712.2 - 5, Y0), q(3060 + 5, X0), q(1712.2 + 5, Y0)], outline=(176, 182, 186), width=int(1.3 * S))
C(3060, 1712.2, 1.4, (176, 182, 186))
box(3075.5, 1692, 3088, 1707.5, (150, 146, 134), 1.2, 0.8)         # coin slot: a plate, the slit
R(3080.8, 1694.6, 3082.8, 1705, INK, 0.6)
C(3081.8, 1714.6, 4.4, INK); C(3081.8, 1714.6, 3.5, (168, 162, 146)); C(3080.6, 1713.4, 1.2, (236, 230, 212))   # the return knob
# the pick-up slot: a frame, the flap hinged at its top, the dark under it
box(2994.5, 1746.5, 3065.5, 1775.5, (34, 33, 30), 2, 1.0)
R(2995.5, 1747.5, 3064.5, 1749.0, (100, 96, 86))                   # the frame's lit top lip
R(2998, 1750.5, 3062, 1772.5, (6, 6, 6), 1)
R(2998, 1750.5, 3062, 1766.2, (58, 56, 51), 1)                     # the flap
R(2998, 1765.0, 3062, 1766.4, (132, 127, 114))                     # its lower edge catches the light
C(3004, 1753.4, 1.3, (132, 127, 114)); C(3056, 1753.4, 1.3, (132, 127, 114))
box(3076.5, 1752.5, 3095.5, 1771.5, (122, 118, 106), 2.4, 0.9)     # the change cup
R(3079.2, 1755.2, 3092.8, 1768.8, (8, 8, 8), 1.8)
R(3081, 1766.4, 3091, 1767.6, (88, 86, 78), 0.5)
# ---------------- the bin: outline x 2937..2981, y 1693..1791 ----------------
P([(2940.5, 1693), (2976.5, 1693), (2980, 1697.5), (2937, 1697.5)], 255, (k,)); R(2937, 1697.5, 2980, 1791, 255, 0, (k,))
P([(2940.5, 1693), (2976.5, 1693), (2980, 1697.5), (2937, 1697.5)], INK)
P([(2941.3, 1694), (2975.7, 1694), (2978.2, 1696.9), (2938.8, 1696.9)], (132, 128, 114))  # the lid's top face (the eye is above it), the lightest plane: it faces the tubes
R(2937, 1697.5, 2980, 1791, INK)
R(2938.1, 1698.4, 2978.9, 1721.6, (62, 60, 54))                    # the lid's front
R(2938.1, 1698.4, 2978.9, 1699.8, (104, 100, 88))                  # its lit top edge
R(2938.1, 1722.8, 2978.9, 1786.2, (66, 64, 57))                    # the body
R(2970.6, 1698.4, 2978.9, 1786.2, (50, 49, 44))                    # its side away from the light, one flat tone darker
R(2938.1, 1722.8, 2939.9, 1786.2, (92, 89, 79))                    # the lit edge
R(2938.1, 1721.6, 2978.9, 1722.8, INK)                             # the seam between the lid and the body
box(2941.5, 1701, 2975.5, 1719.5, (150, 146, 132), 2.4, 0.9)       # the opening: a wide pale bezel, the hole, the shadow under the bezel's top
R(2946, 1705.4, 2971, 1715.6, (6, 6, 6), 1.8)
R(2942.6, 1728, 2974.4, 1781.5, INK, 1.2); R(2943.7, 1729.1, 2973.3, 1780.4, (66, 64, 57), 0.8)   # the service door: one inked panel
R(2969.2, 1729.1, 2973.3, 1780.4, (50, 49, 44))                                                       # (its share of the shaded side)
R(2943.7, 1729.1, 2973.3, 1730.4, (96, 93, 83))                                                       # the panel's lit top edge
R(2938.1, 1785.4, 2978.9, 1786.4, INK)                             # the body's bottom edge
R(2941, 1786.4, 2976, 1790.2, (20, 19, 17))                       # the plinth, set in under it
# ---------------- down to the picture's size, the glass, the light that was on them, and into the picture ----------------
G = Image.new('L', (W * S, H * S), 0); gd = ImageDraw.Draw(G)      # the glass: one hard slanted streak of the strip's light
gd.polygon([(q(x, X0), q(y, Y0)) for x, y in [(3004, 1577.5), (3012.5, 1577.5), (2997.5, 1680.5), (2991.5, 1680.5), (2991.5, 1664)]], fill=255)
small = lambda im: np.asarray(im.reduce(S)).astype(np.float32)
alb, mk, em, gl = small(A), small(K) / 255, small(E) / 255, small(G) / 255
alb = alb + (255 - alb) * (0.11 * gl)[..., None]
reg = M[Y0:Y0 + H, X0:X0 + W].copy()
def rowmed(xs, ch=None):
    v = reg[:, [x - X0 for x in xs]]; v = v[..., 0] if ch == 0 else v.mean(-1); return np.median(v, axis=1)
def smooth(v, s=5):
    kx = np.exp(-0.5 * (np.arange(-3 * s, 3 * s + 1) / s) ** 2); kx /= kx.sum(); return np.convolve(np.pad(v, 3 * s, mode='edge'), kx, mode='valid')
ys = np.arange(H) + Y0
fm = rowmed(list(range(2987, 2991)) + list(range(3094, 3098)), 0) / 100.0      # the light on the machine's door, row by row
lo, hi = 1572 - Y0, 1786 - Y0; fm[:lo] = fm[lo]; fm[hi:] = fm[hi]; fm = np.clip(smooth(fm), 0.5, 1.3)
fb = rowmed(list(range(2941, 2945))) / 58.0                                     # and on the bin's front
lo, hi = 1724 - Y0, 1784 - Y0; fb[:lo] = fb[lo] * 1.04; fb[hi:] = fb[hi]; fb = np.clip(smooth(fb), 0.5, 1.3)
xs = np.arange(W) + X0
F = np.where(xs[None, :] >= 2981, fm[:, None], fb[:, None])
# the station's own brushed surface on them (the paint pass's slow uneven value), so they are not cleaner than the wall beside them
rs = np.random.RandomState(7)
def noise(sc):
    n = rs.rand(H // sc + 3, W // sc + 3).astype(np.float32); return np.asarray(Image.fromarray(n).resize((W, H), Image.BICUBIC)) - 0.5
F = F * (1 + 0.07 * noise(14) + 0.04 * noise(5))
lit = alb * (em + (1 - em) * F)[..., None]
out = reg * (1 - mk[..., None]) + lit * mk[..., None]
# a contact shadow under each, on the floor in front of it (the only change outside the two outlines)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32); yy += Y0; xx += X0
def under(x0, x1, y, depth, a0):
    return a0 * np.clip(1 - (yy - y) / depth, 0, 1) * (yy >= y) * np.clip((xx - x0 + 3) / 4, 0, 1) * np.clip((x1 + 3 - xx) / 4, 0, 1)
shd = np.maximum(under(2981, 3110, 1799.5, 7, 0.5), under(2937, 2980, 1791, 6, 0.45)) * (1 - mk)
out = out * (1 - shd[..., None])
M[Y0:Y0 + H, X0:X0 + W] = out
Image.fromarray(np.clip(M + 0.5, 0, 255).astype(np.uint8)).save(dst)
c = Image.fromarray(np.clip(out + 0.5, 0, 255).astype(np.uint8)); c.resize((W * 5, H * 5), Image.LANCZOS).save(dst[:-4] + '.props-x5.png')
print('props drawn', dst, 'changed px', int((np.abs(out - reg).max(-1) > 0.5).sum()), 'of', W * H)
