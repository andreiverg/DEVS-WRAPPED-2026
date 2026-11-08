"""Pixel-art assets for the personal-stats slides, drawn at low res and scaled up nearest-neighbour.

Usage: python3 scripts/gen-personal-art.py public/wrapped/personal public/wrapped
"""
import sys
from PIL import Image, ImageDraw

OUT = sys.argv[1]
PUB = sys.argv[2]

INK = (28, 28, 27, 255)        # card fill #1C1C1B, used as outline
WHITE = (255, 255, 255, 255)
PAPER = (241, 236, 250, 255)
MIST = (201, 190, 221, 255)
LAV = (190, 168, 236, 255)
DEEP = (42, 18, 69, 255)
HERO = (123, 63, 228, 255)
GLOW = (155, 95, 240, 255)
VIOLET = (117, 62, 255, 255)
PINK = (212, 120, 251, 255)
BLUE = (74, 95, 217, 255)
GOLD = (255, 205, 72, 255)
GOLD_D = (214, 140, 30, 255)
GREY = (150, 150, 160, 255)
GREY_D = (90, 90, 100, 255)
CLEAR = (0, 0, 0, 0)


def up(img, k):
    return img.resize((img.width * k, img.height * k), Image.NEAREST)


# ---------- podium pillar, re-sliced from the popular-category podium sheet ----------
pod = Image.open(f"{PUB}/popular-category/podium.png").convert("RGBA")
cap = pod.crop((570, 180, 992, 304))
body = pod.crop((570, 304, 992, 704))
pillar = Image.new("RGBA", (cap.width, 2000), CLEAR)
pillar.paste(cap, (0, 0))
y = cap.height
while y < pillar.height:
    pillar.paste(body, (0, y))
    y += body.height
pillar.save(f"{OUT}/pillar.png", optimize=True)

# ---------- archetype badges, 16x16 each ----------
PAL = {
    ".": CLEAR, "k": INK, "w": WHITE, "p": HERO, "g": GLOW, "v": VIOLET, "d": DEEP,
    "y": GOLD, "o": GOLD_D, "m": MIST, "b": BLUE, "n": PINK, "s": GREY, "S": GREY_D, "l": LAV,
}
BADGES = {
    "ghost-member": [
        "................",
        ".....kkkkkk.....",
        "...kkwwwwwwkk...",
        "..kwwwwwwwwwwk..",
        "..kwwwwwwwwwwk..",
        ".kwwwkkwwkkwwwk.",
        ".kwwwkpwwkpwwwk.",
        ".kwwwkkwwkkwwwk.",
        ".kwwwwwwwwwwwwk.",
        ".kwwwwwkkwwwwwk.",
        ".kwwwwwwwwwwwwk.",
        ".kwwwwwwwwwwwwk.",
        ".kwwwwwwwwwwwwk.",
        ".kwwwkwwwwkwwwk.",
        ".kwwk.kwwk.kwwk.",
        "..kk...kk...kk..",
    ],
    "devs-star": [
        ".......kk.......",
        "......kyyk......",
        "......kyyk......",
        ".....kyyyyk.....",
        ".....kywyyk.....",
        "kkkkkkywyyykkkkk",
        "kyyyyyyyyyyyyyok",
        ".kyyyyyyyyyyyok.",
        "..kyyyyyyyyyok..",
        "...kyyyyyyyok...",
        "...kyyyyyyyok...",
        "..kyyyyokyyyok..",
        "..kyyyokkkyyok..",
        ".kyyokk...kkyok.",
        ".kok........kok.",
        "..kk........kk..",
    ],
    "locked-in": [
        "................",
        ".....kkkkkk.....",
        "....kssssssk....",
        "...ksSkkkkSsk...",
        "...ksk....ksk...",
        "...ksk....ksk...",
        "..kkkkkkkkkkkk..",
        "..kggggggggggk..",
        "..kgppppppppgk..",
        "..kgppkkkkppgk..",
        "..kgppkwwkppgk..",
        "..kgpppkkpppgk..",
        "..kgpppkkpppgk..",
        "..kgppppppppgk..",
        "..kvvvvvvvvvvk..",
        "..kkkkkkkkkkkk..",
    ],
    "competitor": [
        "................",
        "..kkkkkkkkkkkk..",
        "kkkywyyyyyyyokkk",
        "kyykwyyyyyyyokyk",
        "kykkwyyyyyyyokkk",
        "kykkyyyyyyyyok.k",
        "kkykyyyyyyyyokk.",
        "..kkyyyyyyyyok..",
        "...kyyyyyyyok...",
        "....kkyyyyokk...",
        "......kyok......",
        "......kyok......",
        ".....kkookk.....",
        "....kppppppk....",
        "...kgggggggpk...",
        "...kkkkkkkkkk...",
    ],
    "party-animal": [
        "........kk......",
        ".......knnk.....",
        "........kk......",
        ".......kgk......",
        "......kgpgk.....",
        "......kpypk.....",
        ".....kpyypgk....",
        ".....kgppppk....",
        "....kppppyypk...",
        "....knyypppgk...",
        "...kgpppppppgk..",
        "...kppppyyppppk.",
        "..kyyppppppnnpk.",
        "..kkkkkkkkkkkkk.",
        ".n...y....n...y.",
        "...y....n...y...",
    ],
    "all-rounder": [
        "................",
        ".....kkkkkk.....",
        "...kkppppbbkk...",
        "..kgppppkbbbbk..",
        "..kppppkbbbbbk..",
        ".kppppppkbbbbbk.",
        ".kppppppkbbbbbk.",
        ".kkkkkkkkkkkkkk.",
        ".knnnnnnkyyyyyk.",
        ".knnnnnnkyyyyyk.",
        ".knnnnnnkyyyyok.",
        "..knnnnnkyyyok..",
        "..knnnnnkyyook..",
        "...kknnnkyokk...",
        ".....kkkkkk.....",
        "................",
    ],
    "wildcard": [
        "..kkkkkkkkkkk...",
        "..kwwwwwwwwwwk..",
        "..kwpwwwwwwwwk..",
        "..kwwwwwwwwwwk..",
        "..kwwwkkkkwwwk..",
        "..kwwkppppkwwk..",
        "..kwwkpkkpkwwk..",
        "..kwwwwwkpkwwk..",
        "..kwwwwkppkwwk..",
        "..kwwwwkpkwwwk..",
        "..kwwwwwkwwwwk..",
        "..kwwwwkpkwwwk..",
        "..kwwwwwkwwwwk..",
        "..kwwwwwwwwpwk..",
        "..kwwwwwwwwwwk..",
        "..kkkkkkkkkkkk..",
    ],
}
ORDER = ["ghost-member", "devs-star", "locked-in", "competitor", "party-animal", "all-rounder", "wildcard"]
sheet = Image.new("RGBA", (16 * len(ORDER), 16), CLEAR)
for i, key in enumerate(ORDER):
    rows = BADGES[key]
    assert len(rows) == 16 and all(len(r) == 16 for r in rows), key
    for y, row in enumerate(rows):
        for x, c in enumerate(row):
            sheet.putpixel((i * 16 + x, y), PAL[c])
up(sheet, 16).save(f"{OUT}/archetype-badges.png", optimize=True)
print("ok")
