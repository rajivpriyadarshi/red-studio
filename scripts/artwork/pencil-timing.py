"""Bake when each part of a study meets the graphite or eraser. The browser
travels the same paths and only changes two numbers while the pencil moves."""
import json
import math
from pathlib import Path
from PIL import Image, ImageFilter

assets = Path(__file__).resolve().parents[2] / "dist/assets/ticket-window"
paths = json.loads((assets / "pencil-paths.json").read_text())
w, h = 112, 144
aspect = 2.38 / 2.82


def timing_map(path):
    segments = []
    distance = 0
    for start, end in zip(path, path[1:]):
        x, y = start[:2]
        dx, dy = (end[0] - x) * aspect, end[1] - y
        length = math.hypot(dx, dy)
        if len(end) == 2:
            segments.append((x * aspect, y, dx, dy, length, distance))
        distance += length
    pixels = bytearray(w * h)
    for py in range(h):
        for px in range(w):
            x, y = (px + 0.5) * 100 * aspect / w, (py + 0.5) * 100 / h
            nearest = math.inf
            when = 0
            for sx, sy, dx, dy, length, passed in segments:
                along = max(0, min(1, ((x-sx)*dx + (y-sy)*dy) / (length*length)))
                gap = (x-sx-along*dx)**2 + (y-sy-along*dy)**2
                if gap < nearest:
                    nearest = gap
                    when = (passed + along * length) / distance
            pixels[py*w+px] = round(5 + 241 * min(1, when + math.sqrt(nearest) * .001))
    return Image.frombytes("L", (w, h), bytes(pixels)).filter(ImageFilter.GaussianBlur(.85))


erase = timing_map(paths["erase"])
atlas = Image.new("RGB", (w*4, h*2))
for index, study in enumerate(paths["studies"]):
    tile = Image.merge("RGB", (timing_map(study), erase, Image.new("L", (w, h))))
    atlas.paste(tile, (index % 4 * w, index // 4 * h))
atlas.save(assets / "pencil-timing.png", optimize=True)
