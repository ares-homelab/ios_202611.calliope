"""app icons and splash from the amphora in assets/icon.svg (the light icon): dark = aegean light blue on the dark
radial background, tinted = grey on black, splash = the dark amphora on the splash colour, no background.
docker run --rm -v "$PWD:/app" -w /app python:3.14-slim sh -c "apt-get -qq update && apt-get -qq install -y libcairo2 >/dev/null && pip -q install cairosvg && python scripts/icons.py" """
import re

import cairosvg

LIGHT = open("assets/icon.svg").read()
FG = "#2C5A85"


def variant(fg, defs, rect=True):
    svg = re.sub(r"<defs>.*</defs>", f"<defs>{defs}</defs>", LIGHT.replace(FG, fg))
    return svg if rect else re.sub(r"<rect [^>]*/>\n", "", svg)


def solid(c):
    return f'<linearGradient id="bg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="96"><stop offset="0" stop-color="{c}"/><stop offset="1" stop-color="{c}"/></linearGradient>'


RADIAL = ('<radialGradient id="bg" gradientUnits="userSpaceOnUse" cx="48" cy="40" r="68">'
          '<stop offset="0" stop-color="#242428"/><stop offset="1" stop-color="#0E0E10"/></radialGradient>')

out = {
    "icon.png": (LIGHT, 1024),
    "icon-dark.png": (variant("#8FB8E0", RADIAL), 1024),
    "icon-tinted.png": (variant("#F2F2F2", solid("#000000")), 1024),
    "splash.png": (variant("#8FB8E0", solid("#0D0D0F"), rect=False), 512),
}
for name, (svg, size) in out.items():
    cairosvg.svg2png(bytestring=svg.encode(), write_to=f"assets/{name}", output_width=size, output_height=size)
