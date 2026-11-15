"""Turn John's photos into red/black comic-ink portraits for the site.

Usage (from the repo root):
    pip install pillow numpy
    python tools/ink.py tools/photos public/assets/portrait

Expects photos named like the site needs them (any image format):
    neutral_closed.jpg  neutral_open.jpg  neutral_blink.jpg
    smirk_closed.jpg    smirk_open.jpg
    excited_closed.jpg  excited_open.jpg
    thinking_closed.jpg thinking_open.jpg
    panicked_closed.jpg panicked_open.jpg
    full_body.jpg

Steps per photo: crop to 4:5 (portraits) → remove the plain wall background
(flood fill from the edges) → posterize to 3 tones → thick black edge ink →
halftone dots in the mid-tones → write a transparent WebP.
Then flip `photoPortraits: true` in src/data/resume.js.
"""

from __future__ import annotations

import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter, ImageOps

PAPER = (245, 245, 240)
INK = (11, 11, 11)
RED = (229, 25, 28)
PORTRAIT_SIZE = (640, 720)  # matches the site's 320x360 drawing at 2x


def remove_background(img: Image.Image, tolerance: int = 38) -> np.ndarray:
    """Plain-wall cutout: flood fill from the border over pixels close to the wall colour.
    Returns an alpha mask (0 = background, 255 = John)."""
    small = img.convert("RGB").resize((img.width // 4, img.height // 4))
    a = np.asarray(small).astype(np.int16)
    h, w, _ = a.shape
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    wall = np.median(border, axis=0)
    close = np.abs(a - wall).sum(axis=2) < tolerance * 3
    bg = np.zeros((h, w), bool)
    q = deque([(y, x) for y in range(h) for x in (0, w - 1)] + [(y, x) for x in range(w) for y in (0, h - 1)])
    while q:
        y, x = q.popleft()
        if 0 <= y < h and 0 <= x < w and not bg[y, x] and close[y, x]:
            bg[y, x] = True
            q.extend(((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)))
    mask = Image.fromarray(np.where(bg, 0, 255).astype(np.uint8)).resize(img.size)
    return np.asarray(mask.filter(ImageFilter.GaussianBlur(2)).point(lambda v: 255 if v > 128 else 0))


def halftone(gray: np.ndarray, cell: int = 7) -> np.ndarray:
    """Boolean mask of round dots whose size follows darkness."""
    h, w = gray.shape
    yy, xx = np.mgrid[0:h, 0:w]
    cy = (yy // cell) * cell + cell / 2
    cx = (xx // cell) * cell + cell / 2
    darkness = 1 - gray / 255
    radius = darkness * cell * 0.55
    return (yy - cy) ** 2 + (xx - cx) ** 2 < radius**2


def ink(path: Path, out: Path, size: tuple[int, int] | None) -> None:
    img = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    if size:
        img = ImageOps.fit(img, size, centering=(0.5, 0.35))
    alpha = remove_background(img)

    gray = np.asarray(ImageOps.autocontrast(img.convert("L"), cutoff=2)).astype(np.float32)
    edges = np.asarray(img.convert("L").filter(ImageFilter.GaussianBlur(1.2)).filter(ImageFilter.FIND_EDGES))
    edges = np.asarray(Image.fromarray(edges).filter(ImageFilter.MaxFilter(3))) > 28

    out_rgb = np.empty((*gray.shape, 3), np.uint8)
    out_rgb[:] = PAPER
    mid = (gray >= 70) & (gray < 150)
    dark = gray < 70
    dots = halftone(gray) & mid
    out_rgb[dots] = RED
    out_rgb[dark | edges] = INK

    # thick outline around the cut-out silhouette
    sil = Image.fromarray(alpha)
    outline = (np.asarray(sil.filter(ImageFilter.MaxFilter(9))) > 0) & (alpha == 0)
    rgba = np.dstack([out_rgb, alpha])
    rgba[outline] = (*INK, 255)

    out.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(rgba, "RGBA").save(out, "WEBP", quality=82, method=6)
    print(f"✓ {path.name} → {out}")


def main() -> None:
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    src, dst = Path(sys.argv[1]), Path(sys.argv[2])
    photos = sorted(p for p in src.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp", ".heic"})
    if not photos:
        sys.exit(f"No photos found in {src}")
    for p in photos:
        full = p.stem == "full_body"
        ink(p, dst / f"{p.stem}.webp", None if full else PORTRAIT_SIZE)


if __name__ == "__main__":
    main()
