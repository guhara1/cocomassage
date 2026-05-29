#!/usr/bin/env python3
"""OG 이미지(1200x630 PNG) 생성기.
의존: Pillow (pip install Pillow). 나눔고딕 폰트는 없으면 자동 다운로드.
실행: python3 scripts/make-og.py  -> assets/og-image.png
브랜드/문구 변경 시 아래 상수만 수정하세요."""
import os, math, urllib.request
from PIL import Image, ImageDraw, ImageFont

BRAND_EYE = "COCO · 코코마사지"
HEADLINE = "전국 출장마사지 안내"
SUBLINE = "스웨디시 · 아로마 · 딥티슈 · 타이 · 스포츠 · 림프"
TEL = "전화예약 0508-202-4717"
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "og-image.png")

FONTS = {
    "reg": "NanumGothic-Regular.ttf",
    "bold": "NanumGothic-Bold.ttf",
    "xbold": "NanumGothic-ExtraBold.ttf",
}
FONT_DIR = "/tmp"
BASE_URL = "https://github.com/google/fonts/raw/main/ofl/nanumgothic/"
for key, fn in FONTS.items():
    p = os.path.join(FONT_DIR, fn)
    if not os.path.exists(p):
        urllib.request.urlretrieve(BASE_URL + fn, p)
    FONTS[key] = p

W, H = 1200, 630
BG, GLOW = (16, 13, 12), (58, 42, 29)
GOLD, GOLD_BR, TEXT, MUTED = (224, 168, 120), (242, 199, 154), (243, 236, 230), (182, 169, 157)

img = Image.new("RGB", (W, H), BG)
px = img.load()
cx, cy, maxd = int(W * 0.82), int(H * -0.05), math.hypot(W, H) * 0.95
for y in range(H):
    for x in range(W):
        t = max(0.0, 1.0 - math.hypot(x - cx, y - cy) / maxd) ** 2 * 0.55
        px[x, y] = (int(BG[0] + (GLOW[0] - BG[0]) * t), int(BG[1] + (GLOW[1] - BG[1]) * t), int(BG[2] + (GLOW[2] - BG[2]) * t))

d = ImageDraw.Draw(img)
f_eye = ImageFont.truetype(FONTS["bold"], 34)
f_h1 = ImageFont.truetype(FONTS["xbold"], 92)
f_sub = ImageFont.truetype(FONTS["reg"], 38)
f_tel = ImageFont.truetype(FONTS["bold"], 40)
PAD = 80
d.text((PAD, 150), BRAND_EYE, font=f_eye, fill=GOLD)
d.text((PAD, 215), HEADLINE, font=f_h1, fill=TEXT)
d.text((PAD, 360), SUBLINE, font=f_sub, fill=MUTED)
tb = d.textbbox((0, 0), TEL, font=f_tel)
tw, th = tb[2] - tb[0], tb[3] - tb[1]
bx0, by0, padx, pady = PAD, 470, 28, 18
d.rounded_rectangle([bx0, by0, bx0 + tw + padx * 2, by0 + th + pady * 2 + 8], radius=999, fill=(28, 22, 18), outline=GOLD, width=2)
d.text((bx0 + padx, by0 + pady), TEL, font=f_tel, fill=GOLD_BR)
d.rectangle([0, H - 8, W, H], fill=GOLD)
img.save(os.path.normpath(OUT), "PNG", optimize=True)
print("saved", os.path.normpath(OUT), img.size)
