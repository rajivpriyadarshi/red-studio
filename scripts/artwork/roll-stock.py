"""Print stock for the printer spindle. Requires Pillow."""
from math import cos, sin, tau
from pathlib import Path
from random import Random

from PIL import Image, ImageDraw

out = Path(__file__).resolve().parents[2] / "dist/assets/ticket-window"
rng = Random(711)
w, h = 832, 448

# Warm uncoated stock with short pulp fibres and broad, low-contrast flecks.
def paper(size, colour):
    width, height = size
    noise = Image.frombytes("L", size, rng.randbytes(width * height))
    soft = noise.resize((width // 10, height // 10), Image.Resampling.NEAREST).resize(size, Image.Resampling.BICUBIC)
    mottling = Image.blend(noise, soft, .30)
    return Image.merge("RGB", tuple(mottling.point(lambda n, c=c: c + (n-128)*.066) for c in colour))

web = paper((w,h), (236, 229, 208))
d = ImageDraw.Draw(web, "RGBA")
for _ in range(3400):
    x, y = rng.randrange(w), rng.randrange(h)
    d.line((x,y,x+rng.randrange(1,6),y+rng.randrange(-1,2)), fill=(93,80,56,rng.randrange(10,36)))

# Two restrained inks, with open space for the eventual overprint.
sage = (70,102,92)
oxide = (143,58,47)
for inset, opacity in [(22,133),(28,66)]:
    d.rounded_rectangle((inset, inset, w-inset, h-inset), radius=11, outline=(*sage,opacity), width=2)
for x in [692,700]:
    d.line((x,32,x,h-32), fill=(*sage,100),width=1)
# Reserve the centre of the coupon. Its continuous margin stripes visibly
# follow the bend off the spool, even when the stock is viewed at phone size.
d.rectangle((w-31,18,w-26,h-18),fill=(*oxide,135))
d.rectangle((w-38,18,w-36,h-18),fill=(*oxide,118))
d.line((35,22,35,h-22),fill=(*sage,135),width=2)
for y in range(16,h-12,16):
    d.line((708,y,708,y+6),fill=(94,88,72,160),width=2)
for x in [12,w-15]:
    d.rectangle((x,74,x+3,97),fill=(*oxide,192))
    d.rectangle((x,102,x+3,108),fill=(*oxide,150))
# A partially cut perforation at each repeat, with a small notch at each margin.
for x in range(5,w,17):
    d.line((x,4,x+9,4),fill=(82,78,62,165),width=2)
    d.line((x,6,x+9,6),fill=(255,251,225,185),width=1)
alpha = Image.new("L",(w,h),255)
cut = ImageDraw.Draw(alpha)
for x in (0,w):
    cut.ellipse((x-8,h//2-8,x+8,h//2+8),fill=0)

def draw_waterfront(d):
    # A small line engraving of waterside timber gables. The roofs, piles and
    # reflections use the same two inks as the counterfoil and registration marks.
    x = 74
    reflections = []
    for n, (width, eave, roof, quay, tone, tint) in enumerate([
        (60,172,145,254,sage,48), (75,146,111,257,sage,122),
        (90,132,91,265,oxide,113), (65,159,128,261,sage,28),
        (81,145,106,268,sage,104), (70,170,138,265,sage,63),
    ]):
        peak = x + width//2
        right = x + width
        depth = (17,13,21,12,16,20)[n]
        wall = [(x,eave),(peak,roof),(right,eave),(right,quay),(x,quay)]
        d.polygon(wall, fill=(*tone,tint))
        d.polygon([(right,eave),(right+depth,eave-9),(right+depth,quay-7),(right,quay)],fill=(*tone,min(215,tint+55)))
        for board in range(x+3,right-1,4):
            top = roof + (eave-roof)*abs(board-peak)/(width/2)
            d.line((board,top+3,board,quay-2), fill=(*tone,109 if board%3 else 62))
        d.polygon([(peak,roof),(peak+depth,roof-9),(right+depth,eave-9),(right,eave)],fill=(*tone,172))
        for slate in range(4, width//2, 6):
            y = roof + slate * (eave-roof)/(width/2)
            d.line((peak+slate,y,peak+slate+depth,y-9),fill=(240,230,209,105))
        d.line(wall+[wall[0]],fill=(*tone,206),width=2)
        d.line((x-2,eave+1,peak,roof-2,right+1,eave), fill=(*tone,232),width=3)
        for floor in (eave+13,(eave+quay)//2+7):
            for bay in (x+width*.21,peak,x+width*.79):
                d.rectangle((bay-4,floor,bay+4,floor+12),fill=(*tone,211))
                d.line((bay,floor+1,bay,floor+11),fill=(240,230,209,190))
                d.line((bay-3,floor+5,bay+3,floor+5),fill=(240,230,209,190))
        d.line((x+1,eave+4,right-1,eave+4),fill=(*tone,135),width=2)
        d.rectangle((peak-6,quay-21,peak+6,quay),fill=(*tone,220))
        d.line((peak,quay-20,peak,quay),fill=(240,230,209,133))
        d.line((x,quay,right,quay,right+depth,quay-7), fill=(*tone,235),width=4)
        for post in (x+5,peak-8,peak+8,right-5):
            d.line((post,quay,post-1,quay+12),fill=(*tone,208),width=3)
        reflections.append((x, right, quay, tone))
        x = right + depth - 3

    for x, right, quay, tone in reflections:
        for lane in range(13):
            y = quay + 14 + lane*4
            start = x + 4*sin(lane*1.7) + rng.randrange(-7,8)
            while start < right:
                end = min(right+3, start+rng.randrange(5,26))
                d.line((start,y,(start+end)/2,y-1,end,y+1),fill=(*tone,127-8*lane),width=2)
                start = end+rng.randrange(2,10)

def draw_bridge(d):
    # The two red timber portals recede along the deck of Gamle Bybro.
    cream = (236, 229, 208)
    vanishing_x, horizon = 396, 206
    for i in range(10):
        y = 249 + 5*i
        for x, span in [(91,53), (546,64)]:
            d.line((x+i%3*7,y,x+span,y-2,x+span+18,y-1), fill=(*sage,93-5*i),width=2)
    d.polygon([(336,212),(454,212),(640,310),(75,310)],fill=(*sage,32))
    for x in range(75,643,24):
        d.line((vanishing_x+(x-vanishing_x)*.2,226,x,310),fill=(*sage,87))
    for y in (237,245,255,268,284,303):
        t=(y-212)/98
        d.line((336-261*t,y,454+186*t,y),fill=(*sage,95),width=2)

    def portal(cx,base,scale):
        def line(points,colour,width):
            d.line([(cx+px*scale,base+py*scale) for px,py in points],
                   fill=colour,width=max(1,round(width*scale)),joint="curve")
        def beam(points,width):
            line(points,(*oxide,242),width)
            line([(px,py-1.5) for px,py in points],(*cream,183),max(1,width*.17))
        for side in (-1,1):
            foot=side*103
            beam([(foot,0),(foot,-110)],10)
            beam([(foot,-86),(foot-side*19,-112)],6)
            beam([(foot,-111),(foot+side*21,-95)],6)
            line([(foot-5,-2),(foot+6,-2)],(*sage,205),5)
        beam([(-129,-93),(0,-148),(129,-93)],10)
        beam([(-105,-105),(105,-105)],9)
        beam([(-76,-95),(0,-126),(76,-95)],5)
        for px in [-62,-34,0,34,62]:
            y=-145+abs(px)*.41
            beam([(px,y),(px,-106)],4)
        for px in [-45,0,45]:
            line([(px-10,-107),(px,-117),(px+10,-107)],(*oxide,182),3)
        line([(0,-148),(0,-159)],(*sage,221),2)
        d.ellipse((cx-2*scale,base-161*scale,cx+2*scale,base-157*scale),fill=(*oxide,245))

    # A low bank and distant rooftops give the gate an open sightline.
    d.line((83,209,158,202,194,206,240,199,292,204,336,202),fill=(*sage,121),width=2)
    d.line((455,205,488,198,542,201,577,196,639,199),fill=(*sage,113),width=2)
    for left,base,span in [(356,211,18),(381,210,23),(404,212,17),(427,211,19)]:
        d.line((left,base,left,base-11,left+span*.5,base-19,left+span,base-11,left+span,base),
               fill=(*sage,122),width=2)
    portal(398,224,.52)
    portal(345,278,1.23)
    for near,far in [(79,361),(641,441)]:
        def rail(t, top):
            return (near+(far-near)*t, (274 if top else 310)+(207-(274 if top else 310))*t)
        d.line((rail(0,True),rail(1,True)),fill=(*oxide,215),width=4)
        bays = (0,.21,.39,.54,.66,.76,.84,.90,.95,1)
        for a,b in zip(bays,bays[1:]):
            d.line((rail(a,False),rail(b,True)),fill=(*sage,111),width=2)
            d.line((rail(a,True),rail(b,False)),fill=(*sage,95),width=1)
        for t in bays:
            d.line((rail(t,True),rail(t,False)),fill=(*sage,206),width=max(1,round(4-3*t)))
        d.line((rail(0,False),rail(1,False)),fill=(*sage,210),width=3)


def draw_tram(d):
    # A tram to Lian, seen at rail level, with the overhead wire above the roof.
    cream = (236,229,208)
    for j in range(3):
        points=[(x,201-15*j+9*sin(x/64+j*.7)+5*sin(x/31)) for x in range(77,636,4)]
        d.line(points,fill=(*sage,77-14*j),width=2)
    for x, height in [(90,45),(105,59),(122,53),(143,37),(530,47),(554,68),(576,59),(605,44)]:
        y=220
        d.line((x,y-height,x,y+4),fill=(*sage,148),width=2)
        for branch in range(4, height, 4):
            half=branch*.27
            d.line((x-half,y-height+branch+4,x,y-height+branch-3,x+half,y-height+branch+4),
                   fill=(*sage,135),width=2)
    d.line((93,134,335,85,631,62),fill=(*sage,169),width=2)
    d.line((486,220,486,78,523,72),fill=(*sage,164),width=3)
    for x in (148,276):
        d.line((x,316,544+(x-148)*.12,231),fill=(*sage,222),width=3)
        d.line((x+6,316,548+(x-148)*.12,231),fill=(*sage,127),width=2)
    for t in range(10):
        q=t/10
        d.line((136+398*q,314-81*q,301+260*q,309-76*q),fill=(*sage,99),width=2)
    # Side elevation narrows to the rear. Thick window pillars and the
    # destination blind stay visible after the engraving wraps onto the roll.
    d.polygon([(294,144),(520,149),(518,226),(294,266)],fill=(*sage,120),outline=(*sage,222),width=3)
    d.polygon([(294,203),(519,186),(518,225),(294,264)],fill=(*sage,184))
    for i in range(8):
        t0=i/8+.013; t1=(i+1)/8-.015
        p=lambda t,y0,y1:(294+224*t,y0+(y1-y0)*t)
        d.polygon([p(t0,152,156),p(t1,152,156),p(t1,197,182),p(t0,197,182)],
                  fill=(*cream,211),outline=(*sage,227),width=2)
        d.line((p(t0,165,163),p(t1,165,163)),fill=(*sage,128),width=1)
    d.line((300,212,516,194),fill=(*cream,210),width=3)
    for x,y,r in [(317,259,10),(475,232,6)]:
        d.ellipse((x-r,y-r,x+r,y+r),fill=(*sage,236))
        d.ellipse((x-3,y-3,x+3,y+3),fill=(*cream,203))
    front=[(184,146),(201,136),(280,136),(296,145),(296,263),(286,274),(197,277),(181,264)]
    d.polygon(front,fill=(*cream,255),outline=(*sage,231),width=3)
    d.rounded_rectangle((188,147,289,171),radius=6,fill=(*sage,221))
    d.line((217,158,257,158),fill=(*cream,226),width=3)
    for x in (190,239):
        d.rounded_rectangle((x,176,x+44,212),radius=4,fill=(*sage,113),outline=(*sage,218),width=2)
        d.line((x+5,205,x+22,181),fill=(*cream,174),width=2)
    d.polygon([(185,217),(292,214),(292,259),(283,269),(198,272),(185,262)],fill=(*sage,208))
    d.line((186,225,291,221),fill=(*oxide,220),width=4)
    for x in [198,278]:
        d.ellipse((x-4,245,x+4,253),fill=(*cream,245))
    d.line((198,268,284,265),fill=(*cream,185),width=3)
    d.polygon([(185,145),(201,131),(278,130),(511,142),(520,149),(295,146),(279,138),(202,138)],fill=(*sage,193))
    d.line((317,134,354,108,332,86,307,112,341,136),fill=(*sage,234),width=3)
    d.line((321,87,343,83),fill=(*oxide,233),width=4)


def draw_cathedral(d):
    # Twin west towers, central rose and the crossing spire behind the gable.
    cream = (236,229,208)
    centre = 365
    def stone(shape,tint=70):
        d.polygon(shape,fill=(*sage,tint),outline=(*sage,217),width=2)
    def lancet(x,base,width,height,tint):
        d.polygon([(x-width/2,base),(x-width/2,base-height*.61),
                   (x-width*.30,base-height*.83),(x,base-height),
                   (x+width*.30,base-height*.83),(x+width/2,base-height*.61),(x+width/2,base)],
                  fill=(*sage,tint),outline=(*sage,160))
    stone([(409,156),(413,107),(422,58),(430,110),(440,153)],150)
    d.line((422,55,422,101),fill=(*sage,227),width=2)
    stone([(235,293),(235,185),(centre,107),(497,185),(497,293)],48)
    d.line((235,181,centre,102,497,181),fill=(*oxide,174),width=4)
    for x in (208,521):
        stone([(x-24,293),(x-24,147),(x+23,147),(x+23,293)],85)
        stone([(x-24,147),(x-24,130),(x,83),(x+23,130),(x+23,147)],110)
        for k in [-21,0,20]:
            apex=67 if k==0 else 95
            stone([(x+k-5,137),(x+k,apex),(x+k+5,137)],164)
        d.line((x-26,148,x+25,148),fill=(*sage,232),width=5)
        for y in (176,204,234):
            for dx in (-11,0,11): lancet(x+dx,y,7,16,172)
        for dx in (-20,18): d.line((x+dx,154,x+dx,292),fill=(*sage,168),width=3)
    # Narrow stone courses, buttresses and two tiers of carved niches.
    for y in range(173,290,8):
        for x in range(237+(y%16),495,24):
            if abs(x-centre)<46 and y<236: continue
            d.line((x,y,x+17,y),fill=(*sage,48))
            d.line((x+17,y,x+17,y+5),fill=(*sage,40))
    for x in [235,259,321,409,469,495]:
        d.polygon([(x-3,292),(x-2,175),(x,162),(x+3,174),(x+5,292)],fill=(*sage,123))
    for x in range(245,491,12):
        d.ellipse((x-2,237,x+2,241),fill=(*sage,173))
        d.line((x,241,x-1,246),fill=(*sage,144),width=3)
    for y in (234,249,291):
        d.line((181,y,546,y),fill=(*sage,199),width=3)
    for x in range(245,490,14):
        if abs(x-centre)>45:
            for base in (203,228): lancet(x,base,8,17,127)
    # Tracery is drawn in reserve, leaving a legible rose at the smallest size.
    cy, r = 189,38
    for radius,tint in [(r+5,161),(r+2,45),(r,215)]:
        d.ellipse((centre-radius,cy-radius,centre+radius,cy+radius),fill=(*sage,tint),outline=(*sage,224),width=2)
    for j in range(12):
        a=tau*j/12
        px,py=centre+cos(a)*22,cy+sin(a)*22
        d.ellipse((px-7,py-7,px+7,py+7),outline=(*cream,230),width=2)
        d.line((centre,cy,centre+r*cos(a),cy+r*sin(a)),fill=(*cream,215),width=2)
    d.ellipse((centre-6,cy-6,centre+6,cy+6),fill=(*oxide,221),outline=(*cream,255))
    for x,ht in [(290,38),(centre,49),(440,38)]:
        lancet(x,292,29,ht,220)
        d.line((x,291,x,292-ht*.61),fill=(*cream,201),width=2)
    for y,dx in [(296,0),(301,11),(307,24)]:
        d.line((172-dx,y,558+dx,y),fill=(*sage,174),width=2)


# WebGL reads the bottom cell at offset zero. A pitch of paper then exposes
# the next complete drawing without changing the material during a print.
scenes = (draw_waterfront, draw_bridge, draw_tram, draw_cathedral)
strip = Image.new("RGBA", (w,h*len(scenes)))
for i, illustrate in enumerate(scenes):
    panel = web.copy()
    illustrate(ImageDraw.Draw(panel, "RGBA"))
    panel = Image.blend(web, panel, 0.82)
    panel.putalpha(alpha)
    strip.paste(panel,(0,(len(scenes)-1-i)*h))
strip.save(out / "roll-stock.webp", quality=83, method=6)

# End grain of the wound paper. The tight spiral breaks gently at individual
# wraps, with a dark capillary line and a glint on the cut edge above it.
size = 384
edge = paper((size,size), (210,197,168))
d = ImageDraw.Draw(edge,"RGBA")
turns = 52
for delta, ink in [(1.0,(250,241,214,148)), (0,(72,55,35,182))]:
    points = []
    for j in range(turns*210+1):
        a = tau*j/210
        radius = 46+(size*.5-45)*j/(turns*210)+delta + .52*sin(2*a+.45) + .34*sin(5*a+a/20)
        points.append((size/2+radius*cos(a),size/2+radius*sin(a)))
    d.line(points,fill=ink,width=1)
d.ellipse((143,143,241,241),fill=(150,116,79,255),outline=(111,84,56,235),width=4)
d.ellipse((150,150,234,234),fill=(112,91,65,255),outline=(210,177,128,255),width=3)
edge.save(out / "roll-edge.webp", quality=90, method=6)
