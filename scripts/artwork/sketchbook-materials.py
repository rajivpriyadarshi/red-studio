"""Bake three lightweight surfaces for the Soundings sketchbook. Pillow only."""
from math import cos, floor, pi, sin, tau
from pathlib import Path
from random import Random
from PIL import Image, ImageDraw, ImageFilter

out = Path(__file__).resolve().parents[2] / "dist/assets/soundings"
rng = Random("Soundings field book")
size = 384


def mottling(cells):
    """Interpolate a repeating field without a visible tile seam."""
    source = Image.frombytes("L", (cells, cells), rng.randbytes(cells * cells))
    tiled = Image.new("L", (cells * 3, cells * 3))
    for x in range(3):
        for y in range(3):
            tiled.paste(source, (x * cells, y * cells))
    return tiled.resize((size * 3, size * 3), Image.Resampling.BICUBIC).crop(
        (size, size, size * 2, size * 2)
    )


# Broken strands and fine tooth sit on a slower variation in the paper pulp.
paper = Image.blend(mottling(8), mottling(78), .48)
paper = Image.blend(paper, Image.frombytes("L", paper.size, rng.randbytes(size * size)), .42)
pen = ImageDraw.Draw(paper)
for _ in range(1850):
    x, y = rng.randrange(size), rng.randrange(size)
    dx, dy = rng.randrange(-8, 9), rng.randrange(-5, 6)
    tone = rng.randint(50, 195)
    for tx in {0, -size * ((x + dx) // size)}:
        for ty in {0, -size * ((y + dy) // size)}:
            pen.line((x + tx, y + ty, x + dx + tx, y + dy + ty), fill=tone)
paper = Image.merge("RGB", tuple(paper.point(lambda v, base=c: base + (v - 128) * .09)
                                 for c in (245, 239, 221)))
paper.save(out / "rag-paper.webp", quality=91, method=6)

# Each crossing alternates the raised warp and weft; the yarn wanders slightly.
cloud = mottling(6).load()
cloth = Image.new("RGB", (size, size))
yarn = []
for y in range(size):
    for x in range(size):
        u = x / 6 + .105 * sin(tau * y / 96) + .04 * sin(tau * y / 32)
        v = y / 8 + .095 * sin(tau * x / 128)
        warp, weft = cos(tau * (u - .5)), cos(tau * (v - .5))
        over = (floor(u) + floor(v)) % 2
        relief = (warp + .28 * weft) if over else (weft + .28 * warp)
        shade = 9 * relief + .035 * (cloud[x, y] - 128) + rng.uniform(-4, 4)
        yarn.append(tuple(round(c + shade) for c in (52, 72, 58)))
cloth.putdata(yarn)
cloth.save(out / "bookcloth.webp", quality=93, method=6)

# Draw one open wire at print resolution. Both ends enter punched holes.
# The shaped shadow opens out under the high part of the arch.
scale = 6
ring = Image.new("RGBA", (68 * scale, 37 * scale))
def points(coords):
    return [(round(x * scale), round(y * scale)) for x, y in coords]

def arch(t):
    return 33 - 24 * cos(t), 21 + 3.4 * cos(t) - 9.3 * sin(t)

segments = [pi * i / 80 for i in range(81)]
cast = Image.new("RGBA", ring.size)
cast_path = [(arch(t)[0] + 4.5 * sin(t), arch(t)[1] + 13 * sin(t) + 1) for t in segments]
ImageDraw.Draw(cast).line(points(cast_path), fill=(47, 37, 23, 105), width=scale * 3)
ring.alpha_composite(cast.filter(ImageFilter.GaussianBlur(scale * 1.6)))
pen = ImageDraw.Draw(ring)
for t in (0, pi):
    x, y = arch(t)
    for rx, ry, offset, color in [
        (4.5, 3.1, .6, "#e0d3ad"), (4, 2.7, 0, "#a69a7f"), (3.3, 2.1, .1, "#453f34")
    ]:
        pen.ellipse(points([(x-rx, y+offset-ry), (x+rx, y+offset+ry)]), fill=color)

# Paint narrow ribbons across the wire to describe a dark underside and a
# bright reflected window along the crown of the bent nickel.
for i in range(len(segments) - 1):
    t0, t1 = segments[i:i+2]
    def rim(t, fraction):
        x, y = arch(t)
        dx, dy = 24 * sin(t), -3.4 * sin(t) - 9.3 * cos(t)
        length = (dx * dx + dy * dy) ** .5
        return x - 2.05 * fraction * dy / length, y + 2.05 * fraction * dx / length
    for band in range(24):
        lo, hi = -1 + band / 12, -1 + (band + 1) / 12
        f, t = (lo + hi) / 2, (t0 + t1) / 2
        glint = max(0, 1 - abs(f + .40 - .14 * cos(t)) / .36)
        metal = 77 + 45 * (1 - f*f) - 33 * f + 109 * glint + 17 * cos(2*t-.7)
        color = tuple(round(min(255, metal * c)) for c in (1, .975, .89))
        pen.polygon(points([rim(t0, lo), rim(t1, lo), rim(t1, hi), rim(t0, hi)]), fill=color)
ring.resize((204, 111), Image.Resampling.LANCZOS).save(out / "binding-wire.webp", lossless=True, method=6)
