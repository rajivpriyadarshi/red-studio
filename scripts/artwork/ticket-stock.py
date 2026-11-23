"""Original ticket dies, ink plates and paper grain. Requires Pillow."""
import math
import random
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

assets = Path(__file__).resolve().parents[2] / "dist/assets"
out = assets / "ticket-window"
out.mkdir(exist_ok=True)
S = 600
font = ImageFont.truetype(str(assets / "programme/archivo-black.ttf"), 515)
ink = (32, 45, 36, 255)
rng = random.Random(59)
grain = Image.new("RGBA", (160, 160))
grain.putdata([(47, 30, 17, rng.randrange(0, 14)) for _ in range(160 * 160)])
grain.save(out / "grain.png", optimize=True)


# A two-family engine-turned rosette, printed as a pale second ink.
lace = Image.new("RGBA", (900, 420))
burin = ImageDraw.Draw(lace)
for family, phase in [(0, 0), (1, math.pi)]:
    for ring in range(34):
        points = []
        for j in range(1201):
            a = j * math.tau / 1200
            lobes = math.cos(7 * a + phase + ring * .065)
            radius = 109 + ring * 2.7 + 18 * lobes
            points.append((550 + 1.39 * radius * math.cos(a), 215 + radius * math.sin(a)))
        burin.line(points, fill=(77, 55, 31, 52 if family else 44), width=1)
lace.save(out / "engine-turn.webp", lossless=True)


def wave_height(i):
    envelope = math.sin(math.pi * (i + 1) / 30) ** .66
    return 9 + envelope * (38 + 54 * math.sin(i * .37 - .6) ** 2 + 80 * math.cos(i * .59) ** 4)


def paper_die(sound=False):
    w, h = 1500, 470
    alpha = Image.new("L", (w, h), 255)
    d = ImageDraw.Draw(alpha)
    for x in (0, w, 1297):
        for y in ((h * .5,) if x in (0, w) else (0, h)):
            d.ellipse((x-19,y-19,x+19,y+19), fill=0)
    if sound:
        for i in range(29):
            x = 742 + i * 17
            height = wave_height(i)
            d.rounded_rectangle((x, 247-height/2, x+10, 247+height/2), radius=5, fill=0)
    stencil = Image.new("LA", alpha.size, (0, 255))
    stencil.putalpha(alpha)
    stencil.save(out / ("wave-die.png" if sound else "stock-die.png"), optimize=True)


paper_die()
paper_die(True)
for key in ("logo", "identity", "website", "product", "campaign", "motion", "video", "sound", "ongoing"):
    plate = Image.new("RGBA", (S,S))
    d = ImageDraw.Draw(plate)
    if key == "logo":
        # Curved engraving ridges shift over the edge of a blind-pressed initial.
        mask = Image.new("L", plate.size)
        g = ImageDraw.Draw(mask)
        g.text((300, 285), "R", font=font, anchor="mm", fill=255)
        ridges = Image.new("RGBA", plate.size)
        engrave = ImageDraw.Draw(ridges)
        for y in range(-80, 750, 9):
            points = [(x, y + 26 * math.sin(x / 77 + y / 55)) for x in range(0, S+3, 3)]
            engrave.line(points, fill=(126, 55, 29, 210), width=4)
        shadow = ImageChops.offset(mask, 3, 5).filter(ImageFilter.GaussianBlur(2))
        plate.paste((110,55,28,225), (0,0,S,S), shadow)
        plate.paste((231,174,111,255), (0,0,S,S), mask)
        plate.alpha_composite(Image.composite(ridges, Image.new("RGBA",plate.size), mask))
        d = ImageDraw.Draw(plate)
        for x,y in [(54,78),(530,77),(53,508),(530,507)]:
            d.line((x-10,y,x+10,y),fill=ink,width=2)
            d.line((x,y-10,x,y+10),fill=ink,width=2)
    elif key == "identity":
        for row in range(3):
            for col in range(3):
                x, y = 85+col*158, 65+row*164
                c = [(139,35,31,255), ink, (232,114,51,255)][(row+col)%3]
                d.text((x+65,y+63),"R",font=font.font_variant(size=181),anchor="mm",fill=c)
    elif key in ("website","product"):
        if key == "website":
            for i in range(11):
                t = i/10
                x,y = 45+115*t,162-95*t
                d.rounded_rectangle((x,y,x+350,y+295),radius=13,fill=(157,194,222,255),outline=(33,63,86,255),width=4)
            d.line((160,123,510,123),fill=ink,width=4)
            for x in (180,198,216): d.ellipse((x,91,x+6,97),fill=ink)
            d.polygon([(265,168),(265,312),(306,274),(342,326),(369,306),(332,254),(392,245)],fill=(26,49,73,255))
        else:
            for i in range(3):
                y=108+133*i
                d.rounded_rectangle((70,y,530,y+106),radius=54,outline=(25,69,45,255),width=5)
                x=127+i*170
                d.ellipse((x-42,y+10,x+42,y+94),fill=(25,69,45,255))
                d.arc((x-31,y+20,x+31,y+84),185,270,fill=(180,221,130,255),width=3)
    elif key == "campaign":
        for cx,cy,c in [(239,250,(29,104,141)),(360,251,(188,54,56)),(301,352,(221,145,22))]:
            for r in range(138,3,-8):
                d.ellipse((cx-r,cy-r,cx+r,cy+r),outline=(*c,230),width=4)
        for x,y in [(67,64),(528,514)]:
            d.ellipse((x-15,y-15,x+15,y+15),outline=ink,width=2)
            d.line((x-27,y,x+27,y),fill=ink,width=2)
            d.line((x,y-27,x,y+27),fill=ink,width=2)
    elif key == "motion":
        for i in range(15):
            t=i/14
            cx,cy=176+t*209,346-t*115
            points=[]
            for k in range(16):
                a=k*math.pi/8+t*.88
                r=72 if k%2 else 142
                points.append((cx+r*math.cos(a),cy+r*math.sin(a)))
            d.polygon(points, fill=(238,130,72,255) if i<14 else ink, outline=ink,width=3)
    elif key == "video":
        seq = Image.open(assets / "service-previews/yum-sequence.webp").convert("RGB")
        strip = Image.new("RGBA",(444,650),(35,30,26,255))
        sd = ImageDraw.Draw(strip)
        for i in range(3):
            width=seq.width//3
            frame=seq.crop((i*width,0,(i+1)*width,seq.height)).resize((336,185))
            strip.paste(frame, (54,20+i*211))
        for y in range(7,650,40):
            for x in (12,409): sd.rounded_rectangle((x,y,x+22,y+17),radius=3,fill=(0,0,0,0))
        strip.thumbnail((365,532))
        strip = strip.rotate(-10, Image.Resampling.BICUBIC, expand=True)
        plate.alpha_composite(strip, ((S-strip.width)//2,(S-strip.height)//2))
    elif key == "sound":
        # Oscilloscope scale above and below the actual punched waveform.
        for y in (102,486):
            d.line((24,y,574,y),fill=(77,41,100,180),width=2)
            for i in range(29):
                x=25+i*19.5
                tick=15 if i%4==0 else 7
                d.line((x,y,x,y+(tick if y<300 else -tick)),fill=(77,41,100,190),width=2)
    elif key == "ongoing":
        for i in range(4):
            x,y=92+i*10,146-i*15
            d.rounded_rectangle((x,y,x+348,y+318),radius=12,fill=(216,211,173,255),outline=ink,width=4)
        for row in range(4):
            for col in range(5):
                x,y=145+col*66,147+row*65
                if row==2 and col==3: d.ellipse((x,y,x+43,y+43),fill=(177,53,27,255))
                else: d.ellipse((x,y,x+43,y+43),outline=ink,width=4)
    plate.resize((480,480), Image.Resampling.LANCZOS).save(out / f"{key}.webp", quality=89, method=6)
