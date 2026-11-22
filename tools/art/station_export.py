# writes the three served sizes from the remastered master: fine grain added AFTER resizing (so it stays one pixel
# fine at every size and keeps WebP from cutting dark gradients into blocks), quality 88, sharp YUV
import sys, numpy as np
from PIL import Image
m = Image.open(sys.argv[1]).convert('RGB'); out = sys.argv[2]
for suffix, w in [('-4800', 4800), ('', 3200), ('-1600', 1600)]:
    im = m if w == m.width else m.resize((w, round(m.height * w / m.width)), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32); a += np.random.RandomState(w).randn(a.shape[0], a.shape[1], 1) * 1.8
    Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).save(f'{out}/subway{suffix}.webp', 'WEBP', quality=88, method=6, use_sharp_yuv=True)
print('ok')
