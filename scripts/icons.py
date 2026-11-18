"""one app icon per palette, recoloured from the coral lyre (assets/icon-dark.png, assets/icon.png): hue moved to the
palette's accent and saturation/brightness scaled from coral's, weighted by each pixel's saturation, so white, grey and
the gradients stay as drawn. Tinted = the dark icon's lyre in grey on black.
docker run --rm -v "$PWD:/app" -w /app python:3.14-slim sh -c "pip -q install pillow numpy && python scripts/icons.py" """
import colorsys

import numpy as np
from PIL import Image

CORAL = ("#F45D73", "#D32F48")  # dark, light accent of the coral palette (src/theme.ts)
PALETTES = {
    "gold": ("#D9BE7E", "#9C7A2A"),
    "olive": ("#AFC28A", "#4E6A2E"),
    "aegean": ("#8FB8E0", "#2C5A85"),
    "wine": ("#E0A1B0", "#8A3346"),
    "bronze": ("#DDA073", "#8A4F22"),
}


def hsv(h):
    return colorsys.rgb_to_hsv(*(int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)))


def recolour(src, ref, target, out):
    im = np.asarray(Image.open(src).convert("RGB").convert("HSV"), float) / 255
    rh, rs, rv = hsv(ref)
    th, ts, tv = hsv(target)
    w = np.clip(im[..., 1] / rs, 0, 1)
    h = np.where(w > 0.05, th, im[..., 0])
    s = np.clip(im[..., 1] * ts / rs, 0, 1)
    v = np.clip(im[..., 2] * (1 + w * (tv / rv - 1)), 0, 1)
    hsvimg = (np.stack([h, s, v], -1) * 255).round().astype(np.uint8)
    Image.fromarray(hsvimg, "HSV").convert("RGB").save(out)


def tinted(src, out):
    im = np.asarray(Image.open(src).convert("RGB").convert("HSV"), float)
    lyre = np.clip(im[..., 1] / (hsv(CORAL[0])[1] * 255), 0, 1) * im[..., 2]
    Image.fromarray(lyre.round().astype(np.uint8), "L").convert("RGB").save(out)


for name, (dark, light) in PALETTES.items():
    recolour("assets/icon-dark.png", CORAL[0], dark, f"assets/icons/{name}-dark.png")
    recolour("assets/icon.png", CORAL[1], light, f"assets/icons/{name}.png")
    tinted("assets/icon-dark.png", f"assets/icons/{name}-tinted.png")
tinted("assets/icon-dark.png", "assets/icon-tinted.png")
