from PIL import Image, ImageDraw, ImageFont
import os

W = H = 32
OUT = __import__("os").path.join(__import__("os").path.dirname(__file__), "..", "dist", "sprites")
os.makedirs(OUT, exist_ok=True)

# ---------- palette ----------
P = {
    "_": None,
    "o": (30, 24, 28),        # outline
    "s": (240, 200, 165),     # skin
    "S": (205, 155, 120),     # skin shade
    "w": (245, 245, 240),     # white
    "e": (40, 40, 50),        # eye
    "r": (220, 120, 120),     # blush / mouth
    "m": (150, 70, 70),       # mouth dark
}

def px(img, x, y, c):
    if c is None: return
    if 0 <= x < W and 0 <= y < H:
        img.putpixel((x, y), c + (255,))

def rect(img, x0, y0, x1, y1, c):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            px(img, x, y, c)

def hline(img, x0, x1, y, c): rect(img, x0, y, x1, y, c)

def new(): return Image.new("RGBA", (W, H), (0, 0, 0, 0))

# ---------- shared bust ----------
def bust(img, skin, skin_sh, cloth, cloth_sh, collar=None):
    o = P["o"]
    # shoulders / torso rows 22..31
    rect(img, 4, 24, 27, 31, cloth)
    rect(img, 4, 24, 5, 31, cloth_sh); rect(img, 26, 24, 27, 31, cloth_sh)
    hline(img, 6, 25, 23, cloth); hline(img, 8, 23, 22, cloth)
    # outline of shoulders
    hline(img, 8, 23, 21, o)
    px(img, 7, 22, o); px(img, 24, 22, o); px(img, 6, 23, o); px(img, 25, 23, o)
    rect(img, 3, 24, 3, 31, o); rect(img, 28, 24, 28, 31, o)
    # neck
    rect(img, 13, 19, 18, 23, skin); rect(img, 13, 21, 18, 23, skin_sh)
    rect(img, 12, 19, 12, 23, o); rect(img, 19, 19, 19, 23, o)
    if collar:
        hline(img, 10, 12, 23, collar); hline(img, 19, 21, 23, collar)
        px(img, 11, 24, collar); px(img, 20, 24, collar)
        px(img, 12, 25, collar); px(img, 19, 25, collar)

def head(img, skin, skin_sh, x0=8, x1=23, y0=5, y1=19):
    o = P["o"]
    rect(img, x0, y0, x1, y1, skin)
    # rounded corners outline
    rect(img, x0 - 1, y0 + 2, x0 - 1, y1 - 2, o); rect(img, x1 + 1, y0 + 2, x1 + 1, y1 - 2, o)
    hline(img, x0 + 2, x1 - 2, y0 - 1, o); hline(img, x0 + 2, x1 - 2, y1 + 1, o)
    px(img, x0, y0, o); px(img, x0 + 1, y0 - 1 + 1, skin); px(img, x0, y0 + 1, o); px(img, x0 + 1, y0, o)
    px(img, x1, y0, o); px(img, x1 - 1, y0, o); px(img, x1, y0 + 1, o)
    px(img, x0, y1, o); px(img, x0 + 1, y1, o); px(img, x0, y1 - 1, o)
    px(img, x1, y1, o); px(img, x1 - 1, y1, o); px(img, x1, y1 - 1, o)
    # jaw shade
    hline(img, x0 + 2, x1 - 2, y1, skin_sh)
    # ears
    rect(img, x0 - 2, 11, x0 - 1, 13, skin); px(img, x0 - 3, 11, o); px(img, x0 - 3, 12, o); px(img, x0 - 3, 13, o); px(img, x0 - 2, 14, o); px(img, x0 - 2, 10, o)
    rect(img, x1 + 1, 11, x1 + 2, 13, skin); px(img, x1 + 3, 11, o); px(img, x1 + 3, 12, o); px(img, x1 + 3, 13, o); px(img, x1 + 2, 14, o); px(img, x1 + 2, 10, o)

def face(img, expr, eye=(40, 40, 50), skin_sh=None, blush=True, wrinkles=False, mustache=None, talk=False):
    o = P["o"]; e = eye; m = P["m"]
    if expr == "think":
        # 눈은 위쪽 옆을 보고, 한쪽 눈썹 올라감, 입은 한쪽으로
        rect(img, 12, 11, 13, 12, e); rect(img, 20, 11, 21, 12, e)
        px(img, 12, 11, P["w"]); px(img, 20, 11, P["w"])
        hline(img, 10, 12, 10, o); hline(img, 19, 21, 8, o)
        hline(img, 15, 18, 16, m); px(img, 19, 15, m)
    elif expr == "laugh":
        px(img, 11, 12, o); px(img, 12, 11, o); px(img, 13, 12, o)
        px(img, 18, 12, o); px(img, 19, 11, o); px(img, 20, 12, o)
        rect(img, 13, 15, 18, 17, m); hline(img, 14, 17, 15, P["w"]); px(img, 12, 15, m); px(img, 19, 15, m)
        talk = False
    # eyes at y 12..13, x 11-12 and 19-20
    if expr == "smile":
        # closed happy eyes ^ ^
        px(img, 11, 12, o); px(img, 12, 11, o); px(img, 13, 12, o)
        px(img, 18, 12, o); px(img, 19, 11, o); px(img, 20, 12, o)
        hline(img, 13, 18, 16, m); px(img, 12, 15, m); px(img, 19, 15, m)
    elif expr == "worry":
        rect(img, 11, 12, 12, 13, e); rect(img, 19, 12, 20, 13, e)
        px(img, 11, 12, P["w"]); px(img, 19, 12, P["w"])
        # slanted brows
        px(img, 10, 10, o); px(img, 11, 10, o); px(img, 12, 9, o)
        px(img, 19, 9, o); px(img, 20, 10, o); px(img, 21, 10, o)
        hline(img, 14, 17, 16, m); px(img, 13, 17, m); px(img, 18, 17, m)
    elif expr == "shock":
        rect(img, 10, 11, 13, 14, P["w"]); rect(img, 18, 11, 21, 14, P["w"])
        rect(img, 11, 12, 12, 13, e); rect(img, 19, 12, 20, 13, e)
        hline(img, 10, 13, 9, o); hline(img, 18, 21, 9, o)
        rect(img, 14, 16, 17, 18, m); rect(img, 15, 17, 16, 17, (90, 30, 30))
    elif expr == "neutral":
        rect(img, 11, 12, 12, 13, e); rect(img, 19, 12, 20, 13, e)
        px(img, 11, 12, P["w"]); px(img, 19, 12, P["w"])
        hline(img, 10, 12, 10, o); hline(img, 19, 21, 10, o)
        hline(img, 14, 17, 16, m)
    if talk:
        # 입 벌림: 기존 입 지우고 열린 입
        if mustache:
            rect(img, 14, 16, 17, 18, m); rect(img, 15, 17, 16, 17, (90, 30, 30))
        else:
            rect(img, 12, 15, 19, 18, P["s"])
            rect(img, 14, 15, 17, 18, m); rect(img, 15, 16, 16, 17, (90, 30, 30)); hline(img, 14, 17, 15, o)
    if wrinkles:
        px(img, 9, 15, skin_sh); px(img, 22, 15, skin_sh)
        px(img, 10, 9, skin_sh); px(img, 21, 9, skin_sh)
    if blush and expr in ("smile", "neutral"):
        px(img, 10, 14, P["r"]); px(img, 21, 14, P["r"])
    if mustache:
        hline(img, 12, 19, 15, mustache); hline(img, 13, 18, 14, mustache)
        px(img, 15, 15, None); px(img, 16, 15, None)
        px(img, 15, 15, P["s"]); px(img, 16, 15, P["s"])
        hline(img, 12, 19, 15, mustache); px(img, 15, 14, mustache); px(img, 16, 14, mustache)
    # nose
    px(img, 15, 14, P["S"]) if not mustache else None

def glasses(img, col=(60, 70, 90)):
    for x0 in (10, 18):
        hline(img, x0, x0 + 3, 11, col); hline(img, x0, x0 + 3, 14, col)
        px(img, x0, 12, col); px(img, x0, 13, col); px(img, x0 + 3, 12, col); px(img, x0 + 3, 13, col)
    hline(img, 14, 17, 12, col)
    px(img, 9, 12, col); px(img, 22, 12, col)

# ---------- hair / headwear ----------
def hair_short_gray(img, col=(215, 215, 220), sh=(170, 170, 180)):
    o = P["o"]
    rect(img, 8, 4, 23, 7, col); rect(img, 7, 6, 7, 9, col); rect(img, 24, 6, 24, 9, col)
    hline(img, 9, 22, 3, o); px(img, 8, 4, o); px(img, 23, 4, o); px(img, 7, 5, o); px(img, 24, 5, o)
    rect(img, 6, 6, 6, 9, o); rect(img, 25, 6, 25, 9, o)
    hline(img, 8, 23, 7, sh); px(img, 7, 9, sh); px(img, 24, 9, sh)
    # receding: skin showing at temples
    rect(img, 10, 6, 12, 7, P["s"]); rect(img, 19, 6, 21, 7, P["s"])

def hair_bun_dark(img, col=(60, 45, 40), sh=(40, 30, 28), streak=(190, 185, 190)):
    o = P["o"]
    rect(img, 8, 4, 23, 8, col); rect(img, 7, 5, 7, 10, col); rect(img, 24, 5, 24, 10, col)
    hline(img, 9, 22, 3, o); px(img, 8, 4, o); px(img, 23, 4, o); px(img, 7, 4, o); px(img, 24, 4, o)
    rect(img, 6, 5, 6, 10, o); rect(img, 25, 5, 25, 10, o)
    hline(img, 8, 23, 8, sh)
    # side bangs
    rect(img, 8, 8, 10, 9, col); rect(img, 21, 8, 23, 9, col)
    # gray streak
    hline(img, 12, 14, 4, streak); hline(img, 12, 13, 5, streak)
    # bun on top-back
    rect(img, 13, 1, 18, 3, col); hline(img, 13, 18, 0, o); px(img, 12, 1, o); px(img, 19, 1, o); px(img, 12, 2, o); px(img, 19, 2, o)
    hline(img, 14, 17, 3, sh)

def cap_trucker(img, col=(200, 60, 50), sh=(150, 40, 35), brim=(60, 40, 35)):
    o = P["o"]
    rect(img, 7, 3, 24, 8, col); hline(img, 8, 23, 2, o); px(img, 7, 3, o); px(img, 24, 3, o)
    rect(img, 6, 4, 6, 8, o); rect(img, 25, 4, 25, 8, o)
    hline(img, 7, 24, 8, sh)
    # brim
    rect(img, 6, 9, 27, 10, brim); hline(img, 6, 28, 11, o); px(img, 28, 10, o); px(img, 5, 9, o); px(img, 5, 10, o)
    # logo patch
    rect(img, 14, 5, 17, 6, P["w"]); px(img, 15, 5, sh)
    # hair peeking (gray)
    rect(img, 7, 9, 8, 9, (200, 200, 205)); rect(img, 23, 9, 24, 9, (200, 200, 205))
    px(img, 6, 9, None)

def hair_ponytail_brown(img, col=(120, 75, 45), sh=(85, 50, 30)):
    o = P["o"]
    rect(img, 8, 4, 23, 8, col); rect(img, 7, 5, 7, 11, col); rect(img, 24, 5, 24, 11, col)
    hline(img, 9, 22, 3, o); px(img, 8, 4, o); px(img, 23, 4, o); px(img, 7, 4, o); px(img, 24, 4, o)
    rect(img, 6, 5, 6, 11, o); rect(img, 25, 5, 25, 11, o)
    hline(img, 8, 23, 8, sh)
    # bangs swept
    rect(img, 9, 8, 15, 9, col); px(img, 16, 9, col); px(img, 17, 8, col)
    # ponytail right-back
    rect(img, 25, 8, 27, 16, col); rect(img, 26, 9, 27, 16, sh)
    rect(img, 28, 8, 28, 16, o); hline(img, 25, 27, 17, o); px(img, 25, 12, o)

def hair_thin_white(img, col=(230, 230, 234), sh=(192, 192, 200)):
    """성긴 백발 — 정수리는 비었고 옆머리만 남았다 (80대)"""
    o = P["o"]
    rect(img, 6, 8, 8, 14, col); rect(img, 23, 8, 25, 14, col)
    rect(img, 6, 12, 7, 14, sh); rect(img, 24, 12, 25, 14, sh)
    rect(img, 5, 8, 5, 15, o); rect(img, 26, 8, 26, 15, o)
    hline(img, 6, 8, 7, o); hline(img, 23, 25, 7, o)
    # 이마 위로 몇 올만
    hline(img, 9, 11, 6, col); hline(img, 20, 22, 6, col)
    px(img, 13, 5, col); px(img, 16, 4, col); px(img, 19, 5, col)
    px(img, 9, 5, o); px(img, 22, 5, o)


def cardigan(img, col=(152, 122, 92), sh=(116, 91, 66), shirt=(236, 236, 228)):
    o = P["o"]
    rect(img, 6, 24, 25, 31, col)
    rect(img, 6, 24, 7, 31, sh); rect(img, 24, 24, 25, 31, sh)
    rect(img, 13, 23, 18, 31, shirt)                      # 앞섶 사이 셔츠
    rect(img, 12, 24, 12, 31, o); rect(img, 19, 24, 19, 31, o)
    px(img, 15, 27, (96, 84, 70)); px(img, 15, 30, (96, 84, 70))
    hline(img, 10, 12, 23, shirt); hline(img, 19, 21, 23, shirt)   # 칼라


def cane(img, col=(96, 64, 34), sh=(64, 42, 22)):
    """지팡이 — 왼쪽 아래로 세워 잡았다"""
    o = P["o"]
    rect(img, 2, 24, 3, 31, col); rect(img, 3, 24, 3, 31, sh)
    rect(img, 1, 24, 1, 31, o); rect(img, 4, 24, 4, 31, o)
    rect(img, 2, 22, 6, 23, col); hline(img, 2, 6, 21, o); px(img, 7, 22, o); px(img, 7, 23, o)
    hline(img, 2, 6, 23, sh)


def headset(img, col=(50, 50, 60), mic=(120, 120, 130)):
    rect(img, 5, 10, 6, 14, col); rect(img, 25, 10, 26, 14, col)
    hline(img, 6, 25, 2, col)
    px(img, 5, 3, col); px(img, 26, 3, col)
    # mic
    px(img, 6, 15, mic); px(img, 7, 16, mic); px(img, 8, 17, mic); rect(img, 9, 17, 10, 18, mic)
    px(img, 10, 17, (90, 90, 100))

# ---------- accessories on torso ----------
def vest(img, col, sh):
    # sleeveless vest over cloth: shows as darker panels on sides
    rect(img, 6, 24, 9, 31, col); rect(img, 22, 24, 25, 31, col)
    rect(img, 6, 24, 6, 31, sh); rect(img, 25, 24, 25, 31, sh)
    rect(img, 9, 24, 9, 31, P["o"]); rect(img, 22, 24, 22, 31, P["o"])
    # pocket
    rect(img, 7, 27, 8, 28, sh)

def hivis(img, col=(250, 190, 40), stripe=(220, 220, 230)):
    rect(img, 6, 24, 25, 31, col)
    hline(img, 6, 25, 27, stripe); hline(img, 6, 25, 28, stripe)
    rect(img, 12, 24, 19, 31, P["_"]) if False else None
    # opening in the middle shows shirt
    rect(img, 13, 24, 18, 31, (90, 110, 150))
    rect(img, 12, 24, 12, 31, P["o"]); rect(img, 19, 24, 19, 31, P["o"])

def name_tag(img, x=21, y=26, col=(240, 240, 230)):
    rect(img, x, y, x + 3, y + 1, col); px(img, x + 1, y, (200, 60, 50))

def mug(img):
    o = P["o"]
    rect(img, 24, 27, 28, 31, (250, 250, 245)); rect(img, 24, 27, 28, 27, (120, 80, 60))
    rect(img, 23, 27, 23, 31, o); rect(img, 29, 27, 29, 31, o); hline(img, 24, 28, 26, o)
    px(img, 30, 28, o); px(img, 31, 29, o); px(img, 30, 30, o)
    # steam
    px(img, 26, 24, (200, 200, 210)); px(img, 25, 23, (200, 200, 210)); px(img, 27, 22, (200, 200, 210))

def clipboard(img):
    o = P["o"]
    rect(img, 1, 22, 8, 31, (150, 110, 70)); rect(img, 2, 24, 7, 31, (245, 245, 235))
    rect(img, 0, 22, 0, 31, o); rect(img, 9, 22, 9, 31, o); hline(img, 1, 8, 21, o)
    rect(img, 3, 21, 6, 22, (120, 120, 130))
    hline(img, 3, 6, 26, (150, 150, 160)); hline(img, 3, 6, 28, (150, 150, 160)); hline(img, 3, 5, 30, (150, 150, 160))
    px(img, 3, 26, (200, 60, 50))

def tablet(img):
    o = P["o"]
    rect(img, 22, 24, 30, 31, (40, 40, 50)); rect(img, 23, 25, 29, 31, (90, 180, 210))
    rect(img, 21, 24, 21, 31, o); rect(img, 31, 24, 31, 31, o); hline(img, 22, 30, 23, o)
    hline(img, 24, 28, 26, (240, 250, 255)); hline(img, 24, 27, 28, (240, 250, 255)); hline(img, 24, 26, 30, (240, 250, 255))

def towel(img, col=(240, 240, 240), sh=(200, 200, 205)):
    # towel around neck
    rect(img, 10, 20, 12, 24, col); rect(img, 19, 20, 21, 24, col)
    rect(img, 10, 22, 12, 24, sh); rect(img, 19, 22, 21, 24, sh)
    rect(img, 9, 20, 9, 24, P["o"]); rect(img, 22, 20, 22, 24, P["o"])

# ---------- characters ----------
def char_A(expr, talk=False):
    """박 반장 — 60대, 흰머리, 안경, 작업 조끼, 머그컵. 푸근한 타입"""
    img = new()
    skin, sh = (240, 205, 170), (200, 160, 125)
    bust(img, skin, sh, (100, 130, 160), (70, 95, 120), collar=(230, 230, 225))
    vest(img, (110, 85, 60), (80, 60, 40))
    head(img, skin, sh)
    hair_short_gray(img)
    face(img, expr, skin_sh=sh, wrinkles=True, talk=talk)
    glasses(img)
    name_tag(img, x=11, y=26)
    mug(img)
    return img

def char_B(expr, talk=False):
    """강 소장 — 50대 여성, 쪽머리+새치, 안전모 없이 클립보드. 깐깐한 베테랑"""
    img = new()
    skin, sh = (235, 195, 160), (195, 150, 118)
    bust(img, skin, sh, (60, 90, 80), (40, 65, 58), collar=(210, 220, 215))
    head(img, skin, sh)
    hair_bun_dark(img)
    face(img, expr, skin_sh=sh, wrinkles=True, blush=False, talk=talk)
    name_tag(img, x=19, y=26)
    clipboard(img)
    return img

def char_C(expr, talk=False):
    """노 기사 — 70대, 빨간 트럭 캡, 흰 콧수염, 목에 수건. 옛날 트럭 기사 출신"""
    img = new()
    skin, sh = (225, 180, 140), (185, 135, 100)
    bust(img, skin, sh, (150, 150, 155), (110, 110, 118))
    towel(img)
    head(img, skin, sh)
    cap_trucker(img)
    face(img, expr, skin_sh=sh, wrinkles=True, mustache=(225, 225, 230), talk=talk)
    # thick brows white
    hline(img, 10, 12, 9, (225, 225, 230)); hline(img, 19, 21, 9, (225, 225, 230))
    return img

def char_D(expr, talk=False):
    """여 실장 — 40대, 포니테일, 헤드셋, 형광 조끼, 태블릿. 빠릿한 현장 실장"""
    img = new()
    skin, sh = (245, 210, 180), (205, 165, 135)
    bust(img, skin, sh, (90, 110, 150), (60, 80, 115))
    hivis(img)
    head(img, skin, sh)
    hair_ponytail_brown(img)
    face(img, expr, skin_sh=sh, talk=talk)
    headset(img)
    tablet(img)
    return img

def char_E(expr, talk=False):
    """한 사장님(영감님) — 80대, 성긴 백발, 깊은 주름, 갈색 카디건, 지팡이. 이 창고의 전 주인"""
    img = new()
    skin, sh = (226, 194, 166), (184, 148, 120)
    bust(img, skin, sh, (152, 122, 92), (116, 91, 66))
    cardigan(img)
    head(img, skin, sh)
    hair_thin_white(img)
    face(img, expr, skin_sh=sh, wrinkles=True, blush=False, talk=talk)
    hline(img, 10, 12, 9, (228, 228, 232)); hline(img, 19, 21, 9, (228, 228, 232))   # 흰 눈썹
    cane(img)
    return img


def hair_curly_black(img, col=(40, 34, 36), sh=(24, 20, 22)):
    """짧은 곱슬 — 정수리가 봉긋하고 옆은 짧다 (20대)"""
    o = P["o"]
    rect(img, 8, 3, 23, 7, col); rect(img, 7, 5, 7, 9, col); rect(img, 24, 5, 24, 9, col)
    hline(img, 9, 22, 2, o); px(img, 8, 3, o); px(img, 23, 3, o); rect(img, 6, 5, 6, 9, o); rect(img, 25, 5, 25, 9, o)
    for x in (9, 12, 15, 18, 21): px(img, x, 3, sh); px(img, x + 1, 5, sh)
    rect(img, 9, 8, 11, 8, col); rect(img, 14, 8, 17, 8, col); rect(img, 20, 8, 22, 8, col)

def apron(img, col=(240, 160, 75), sh=(200, 120, 50), strap=(120, 70, 30)):
    """파손주의 주황 앞치마 — 살살 택배 유니폼"""
    o = P["o"]
    rect(img, 9, 24, 22, 31, col); rect(img, 9, 24, 10, 31, sh); rect(img, 21, 24, 22, 31, sh)
    rect(img, 8, 24, 8, 31, o); rect(img, 23, 24, 23, 31, o)
    px(img, 11, 23, strap); px(img, 20, 23, strap); px(img, 11, 22, strap); px(img, 20, 22, strap)
    # 가슴에 ⚠ 마크
    px(img, 15, 26, o); px(img, 16, 26, o); hline(img, 14, 17, 27, o); hline(img, 13, 18, 28, o)
    px(img, 15, 27, (250, 240, 200)); px(img, 16, 27, (250, 240, 200))

def bubble_wrap(img):
    """뽁뽁이 롤 — 왼팔에 끼고 있다"""
    o = P["o"]; c = (210, 235, 245); d = (150, 200, 220)
    rect(img, 1, 23, 7, 31, c); rect(img, 0, 23, 0, 31, o); rect(img, 8, 23, 8, 31, o); hline(img, 1, 7, 22, o)
    for y in (24, 27, 30):
        for x in (2, 5): px(img, x, y, d)
    for y in (25, 28):
        for x in (3, 6): px(img, x, y, (245, 252, 255))

def char_F(expr, talk=False):
    """안 대리 — 20대 청년, 짧은 곱슬, 주황 앞치마(⚠), 뽁뽁이 롤. 살살 택배의 조심성 많은 담당자"""
    img = new()
    skin, sh = (242, 206, 172), (202, 162, 128)
    bust(img, skin, sh, (70, 80, 100), (50, 58, 75), collar=(235, 235, 230))
    apron(img)
    head(img, skin, sh)
    hair_curly_black(img)
    face(img, expr, skin_sh=sh, talk=talk)
    bubble_wrap(img)
    return img

CHARS = [
    ("A", "박 반장", "60대 · 흰머리 · 안경 · 작업조끼 · 머그", "느긋한 멘토. 실수해도 '그럴 수 있지' 하고 커피부터 권한다", char_A),
    ("B", "강 소장", "50대 · 쪽머리(새치) · 클립보드", "깐깐한 베테랑. 숫자로 말한다. 칭찬은 짧고 지적은 정확", char_B),
    ("C", "노 기사", "70대 · 트럭 캡 · 흰 콧수염 · 수건", "1세대 화물 기사 출신. 명절·장마·김장철 이야기를 몸으로 안다", char_C),
    ("D", "여 실장", "40대 · 포니테일 · 헤드셋 · 형광조끼 · 태블릿", "빠릿한 현장 실장. 짧은 문장, 이모지 톤. 젊은 플레이어 친화", char_D),
    ("E", "한 사장님", "80대 · 성긴 백발 · 깊은 주름 · 카디건 · 지팡이", "이 창고의 전 주인. 말이 느리고 짧다. 야단치지 않고 그냥 기다린다", char_E),
]
EXPRS = [("neutral", "기본"), ("smile", "웃음"), ("worry", "걱정"), ("shock", "놀람"), ("think", "생각"), ("laugh", "웃음(큰)")]

def scale(img, k): return img.resize((img.width * k, img.height * k), Image.NEAREST)

def font(sz):
    for p in ["/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
              "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
              "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
              "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]:
        if os.path.exists(p):
            try: return ImageFont.truetype(p, sz)
            except Exception: pass
    return ImageFont.load_default()

def main():
    K = 5
    cell = W * K
    pad = 24
    F = font(20); Fs = font(15); Ft = font(26)
    rows = len(CHARS); cols = len(EXPRS)
    sheetW = pad + 300 + cols * (cell + pad) + 20
    sheetH = pad + 50 + rows * (cell + pad + 10)
    sheet = Image.new("RGB", (sheetW, sheetH), (28, 30, 36))
    d = ImageDraw.Draw(sheet)
    d.text((pad, pad), "전임 창고장 캐릭터 시안 (32×32 픽셀, ×5)", font=Ft, fill=(240, 240, 235))
    y = pad + 50
    for key, name, look, tone, fn in CHARS:
        d.text((pad, y + 8), f"{key}. {name}", font=F, fill=(255, 220, 120))
        d.text((pad, y + 40), look, font=Fs, fill=(210, 210, 215))
        # wrap tone
        words = tone; line = ""; ly = y + 66
        for ch in words:
            line += ch
            if d.textlength(line, font=Fs) > 280:
                d.text((pad, ly), line, font=Fs, fill=(170, 175, 185)); ly += 20; line = ""
        if line: d.text((pad, ly), line, font=Fs, fill=(170, 175, 185))
        x = pad + 300
        for ek, elabel in EXPRS:
            img = fn(ek)
            # save individual
            img.save(f"{OUT}/sprite_{key}_{ek}.png")
            big = scale(img, K)
            bg = Image.new("RGB", big.size, (52, 56, 66))
            bg.paste(big, (0, 0), big)
            sheet.paste(bg, (x, y))
            d.rectangle([x - 1, y - 1, x + cell, y + cell], outline=(90, 95, 110))
            d.text((x, y + cell + 4), elabel, font=Fs, fill=(180, 185, 195))
            x += cell + pad
        y += cell + pad + 10
    sheet.save(f"{OUT}/character_concepts.png")

    # dialogue mockup (phone portrait 390 wide)
    mock = Image.new("RGB", (480, 300), (24, 26, 32))
    d = ImageDraw.Draw(mock)
    # top HUD-ish strip
    d.rectangle([0, 0, 480, 34], fill=(36, 40, 50)); d.text((12, 8), "3월 · 1개월차   턴 1/10   창고 0/24   ₩450", font=Fs, fill=(220, 220, 225))
    # dialog box
    d.rectangle([8, 150, 472, 292], fill=(40, 44, 56), outline=(120, 125, 140), width=3)
    d.rectangle([12, 154, 468, 288], outline=(70, 74, 90), width=1)
    face_img = scale(char_A("smile"), 4)
    mock.paste(face_img, (20, 160), face_img)
    d.text((160, 160), "박 반장", font=F, fill=(255, 220, 120))
    d.text((160, 190), "어서 와. 오늘부터 여기 사장은 자네야.", font=Fs, fill=(240, 240, 235))
    d.text((160, 212), "나는 석 달만 옆에서 잔소리하고 빠질게.", font=Fs, fill=(240, 240, 235))
    d.text((160, 234), "첫 달은 일반 택배만 들어와. 창고에 모았다가", font=Fs, fill=(240, 240, 235))
    d.text((160, 256), "탑차 한 대 꽉 채워서 보내는 게 요령이야.", font=Fs, fill=(240, 240, 235))
    d.text((400, 266), "▶ 다음", font=Fs, fill=(150, 200, 255))
    d.text((390, 160), "건너뛰기 ×", font=Fs, fill=(130, 135, 150))
    mock.save(f"{OUT}/dialog_mockup.png")

if __name__ == "__main__":
    main()


def char_generic(expr="neutral", talk=False):
    """이름 없는 센터 담당자: 회색 실루엣 + 전화기"""
    img = new()
    g1, g2 = (120, 120, 140), (90, 90, 110)
    bust(img, g1, g2, (70, 70, 90), (50, 50, 70))
    head(img, g1, g2)
    rect(img, 8, 4, 23, 7, g2); hline(img, 9, 22, 3, P["o"]); rect(img, 7, 5, 7, 9, g2); rect(img, 24, 5, 24, 9, g2)
    # 전화기
    rect(img, 24, 10, 26, 18, (40, 40, 50)); rect(img, 25, 11, 25, 17, (90, 180, 210)); px(img, 27, 12, P["o"]); px(img, 27, 16, P["o"])
    if talk: rect(img, 14, 15, 17, 17, (60, 60, 80))
    else: hline(img, 14, 17, 16, (60, 60, 80))
    return img

def export_js():
    import base64, io
    out = []
    for ek, _ in EXPRS:
        for talk in (False, True):
            if ek == "laugh" and talk: continue
            im = char_A(ek, talk).quantize(colors=32, method=Image.Quantize.FASTOCTREE, dither=0)
            b = io.BytesIO(); im.save(b, format="PNG", optimize=True)
            key = ek + ("_talk" if talk else "")
            out.append(f"    {key}: 'data:image/png;base64,{base64.b64encode(b.getvalue()).decode()}',")
    open(OUT + "/sprites_b64.txt", "w").write("\n".join(out) + "\n")
    # 조연: 여 실장(D)·노 기사(C)·강 소장(B)·이름 없는 담당자 — neutral/talk/smile
    reps = []
    for rid, fn in (("yeo", char_D), ("noh", char_C), ("kang", char_B), ("rep", char_generic), ("han", char_E), ("ahn", char_F)):
        exprs = (("neutral", False), ("neutral", True), ("smile", False))
        if rid == "han": exprs = exprs + (("smile", True), ("worry", False), ("laugh", False))   # 영감님은 편지·회상에서 표정을 더 쓴다
        for ek, talk in exprs:
            im = fn(ek, talk).quantize(colors=32, method=Image.Quantize.FASTOCTREE, dither=0)
            b = io.BytesIO(); im.save(b, format="PNG", optimize=True)
            reps.append(f"    {rid}_{ek}{'_talk' if talk else ''}: 'data:image/png;base64,{base64.b64encode(b.getvalue()).decode()}',")
    open(OUT + "/reps_b64.txt", "w").write("\n".join(reps) + "\n")
    # 시트
    K = 5; cols = len(EXPRS)
    sheet = Image.new("RGB", (cols * (32 * K + 12) + 12, 2 * (32 * K + 12) + 12), (28, 30, 36))
    for i, (ek, _) in enumerate(EXPRS):
        for r, talk in enumerate((False, True)):
            big = scale(char_A(ek, talk and ek != "laugh"), K); bg = Image.new("RGB", big.size, (52, 56, 66)); bg.paste(big, (0, 0), big)
            sheet.paste(bg, (12 + i * (32 * K + 12), 12 + r * (32 * K + 12)))
    sheet.save(OUT + "/park_expressions.png")

if __name__ == "__main__":
    export_js()
