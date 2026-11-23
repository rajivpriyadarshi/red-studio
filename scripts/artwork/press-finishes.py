"""Bake the press's paint, machined surfaces and paper stock. Pillow only.

Red stores relief; green stores roughness. Kept together so a material only
needs one packed surface texture in addition to its colour.
"""
from pathlib import Path
from random import Random
from PIL import Image, ImageDraw, ImageFilter

out = Path(__file__).resolve().parents[2] / "dist/assets/ticket-window"
rng = Random(1959)
size = 384

def noise(n):
    return Image.frombytes("L", (n, n), rng.randbytes(n*n))

def cloud(n):
    # Repeat the first row and column before bicubic enlargement.
    tile = noise(n)
    pad = Image.new("L", (n+1, n+1))
    pad.paste(tile)
    pad.paste(tile.crop((0,0,1,n)), (n,0))
    pad.paste(pad.crop((0,0,n+1,1)), (0,n))
    return pad.resize((size+size//n,size+size//n), Image.Resampling.BICUBIC).crop((0,0,size,size))

def packed(name, relief, rough):
    Image.merge("RGB", (relief,rough,Image.new("L",relief.size,255))).resize((256,256),Image.Resampling.LANCZOS).save(out/name, "WEBP", lossless=True, method=6)

peel = Image.blend(cloud(98),noise(size),.16)
packed("enamel-relief.webp", peel.point(lambda v: 40+.68*v), Image.blend(cloud(20),peel,.40).point(lambda v: 161+.20*v))

grain = Image.frombytes("L",(42,size),rng.randbytes(42*size)).resize((size,size),Image.Resampling.BILINEAR)
brushed = Image.blend(grain,noise(size),.16)
packed("tool-marks.webp",brushed,Image.blend(brushed,cloud(12),.42).point(lambda v: 95+.54*v))

pulp = Image.blend(noise(size),cloud(90),.36)
draw = ImageDraw.Draw(pulp)
for _ in range(1400):
    x,y=rng.randrange(size),rng.randrange(size)
    draw.line((x,y,x+rng.randrange(-3,6),y+rng.randrange(-2,3)),fill=rng.randrange(67,192))
packed("paper-tooth.webp",pulp.point(lambda v: 74+.42*v),pulp.point(lambda v: 190+.2*v))

# Paint wears through in local clusters along exposed corners and lips.
# Most of the panel is intact. Small chips have a dark primer and a catching edge.
w,h=1024,512
mottle=Image.blend(cloud(12),peel,.74).resize((w,h))
paint=Image.merge("RGB", tuple(mottle.point(lambda x, col=col, swing=swing: col+(x-128)*swing)
     for col,swing in [(166,.052),(32,.020),(26,.017)]))
d=ImageDraw.Draw(paint,"RGBA")
for _ in range(54):
    x,y=rng.randrange(w),rng.randrange(h)
    if 160<x<844 and 100<y<400 and rng.random()<.86: continue
    dx=rng.randint(5,47); dy=rng.randrange(-7,5)
    d.line((x,y,x+dx//2,y+dy//2+1,x+dx,y+dy), fill=(222,152,111,rng.randrange(12,47)))
for anchor,edge,spread in [(.14,0,.06),(.85,0,.10),(.68,1,.04),(.96,1,.035),(.04,1,.065)]:
    for _ in range(148):
        x=int(rng.gauss(anchor*w,spread*w)); y=int(abs(rng.gauss(1.5,3.5)))
        y=y if edge==0 else h-1-y
        r=rng.choices([.6,1,2,3,4],[5,5,3,1,1])[0]
        d.ellipse((x-r*1.5,y-r*.65,x+r*1.5,y+r*.65+1),fill=(69,46,35,160))
        d.ellipse((x-r,y-r*.55,x+r,y+r*.55),fill=(rng.choice([135,170,193]),147,117,rng.randint(120,220)))
paint.save(out/"press-lacquer.webp", quality=94, method=6)
