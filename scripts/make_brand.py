"""Draws the project's marks as SVG: the "hIC" wordmark framed by striped bands, the woven knot, and the shield.

Our own drawings after the embroidery (never traced from the photography): letters set in an uncial font, bands after the borders' slanted bars, a ring of woven loops after the interlace of the trees.
Muted wool colours: sage green, ochre, terracotta, slate blue. Run: python scripts/make_brand.py
(writes public/brand/ and public/favicon.svg).
"""

import math
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public"
INK = "#1f1f1d"
GREEN = "#5b7a52"
OCHRE = "#c39a45"
TERRA = "#b5593c"
BLUE = "#4f7d99"
PAPER = "#fbfaf6"
LINEN = "#f3efe6"

# ---------- wordmark ----------

# Both bands repeat the same unit of slanted stripes: a wide green field, then ochre, terracotta and blue.
UNIT = [(GREEN, 30), (OCHRE, 8), (TERRA, 8), (BLUE, 8)]
LEAN = 14


def band(y: float, height: float, width: float, clip: str, shift: float = 0) -> str:
    parts = [f'<clipPath id="{clip}"><rect x="0" y="{y}" width="{width}" height="{height}"/></clipPath>',
             f'<g clip-path="url(#{clip})">']
    x = -LEAN - shift
    while x < width:
        for colour, w in UNIT:
            parts.append(
                f'<path d="M{x:.1f} {y + height}L{x + LEAN:.1f} {y}H{x + LEAN + w + 0.4:.1f}L{x + w + 0.4:.1f} {y + height}Z" '
                f'fill="{colour}"/>'
            )
            x += w
    parts.append("</g>")
    return "".join(parts)


# The letters are set in Uncial Antiqua (Astigmatic, SIL Open Font License 1.1, scripts/fonts/), a revival of the
# uncial hands of early medieval manuscripts, converted to outlines so the SVG needs no font.
FONT = Path(__file__).resolve().parent / "fonts" / "uncial-antiqua-latin-400-normal.woff"


def text_outline(text: str, box: tuple[float, float, float, float]) -> str:
    """The text's glyph outlines as one SVG path, scaled to fit and centred in box (x, y, width, height)."""
    from fontTools.pens.boundsPen import BoundsPen
    from fontTools.pens.svgPathPen import SVGPathPen
    from fontTools.pens.transformPen import TransformPen
    from fontTools.ttLib import TTFont

    font = TTFont(FONT)
    glyphs, cmap = font.getGlyphSet(), font.getBestCmap()
    names = [cmap[ord(ch)] for ch in text]
    bounds = BoundsPen(glyphs)
    advance = 0.0
    for name in names:
        glyphs[name].draw(TransformPen(bounds, (1, 0, 0, 1, advance, 0)))
        advance += glyphs[name].width
    x0, y0, x1, y1 = bounds.bounds
    bx, by, bw, bh = box
    scale = min(bw / (x1 - x0), bh / (y1 - y0))
    dx = bx + (bw - (x1 - x0) * scale) / 2 - x0 * scale
    dy = by + (bh - (y1 - y0) * scale) / 2 + y1 * scale
    pen = SVGPathPen(glyphs, ntos=lambda v: f"{v:.1f}")
    advance = 0.0
    for name in names:
        # Font units point up; SVG points down.
        glyphs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, dx + advance * scale, dy)))
        advance += glyphs[name].width
    return pen.getCommands()


def wordmark() -> str:
    width, height = 236, 150
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" role="img" aria-label="Hic">
  <title>Hic</title>
  <rect x="1" y="1" width="{width - 2}" height="{height - 2}" fill="{PAPER}"/>
  {band(1, 26, width, "band-top")}
  {band(123, 26, width, "band-bottom", shift=27)}
  <path d="M1 27H{width - 1}M1 123H{width - 1}" stroke="{INK}" stroke-width="1.5"/>
  <rect x="1" y="1" width="{width - 2}" height="{height - 2}" fill="none" stroke="{INK}" stroke-width="2"/>
  <path d="{text_outline("HIC", (22, 38, 192, 74))}" fill="{INK}"/>
</svg>
"""


# ---------- knot ----------
# One strand braided round a ring, after the interlace of the trees that divide the scenes. Over and under
# alternate along it; no masks or gaps, so it sits on any background. Drawn as a ribbon: ochre edges, green inside.

LOOPS = 7  # times the strand swings in and out
TURNS = 3  # times it goes round before closing: a three-strand braid made of one strand
RING, SWING = 30.0, 14.0
RIBBON, FILL = 5.2, 2.8

Pt = tuple[float, float]


def strand(samples: int = 2400) -> list[Pt]:
    """One closed strand braided round a ring (a torus-knot path): it goes round TURNS times, swinging in and
    out LOOPS times, so its passes cross evenly and steeply."""
    pts = []
    for k in range(samples + 1):
        t = 2 * math.pi * TURNS * k / samples
        r = RING + SWING * math.cos(LOOPS * t / TURNS)
        pts.append((50 + r * math.sin(t), 50 - r * math.cos(t)))
    return pts


def self_crossings(pts: list[Pt]):
    """[(position, position, sin of the angle)] where the closed polyline crosses itself."""
    n = len(pts) - 1
    found = []
    for i in range(n):
        p, q = pts[i], pts[i + 1]
        for j in range(i + 2, n):
            if i == 0 and j == n - 1:
                continue
            r, s_ = pts[j], pts[j + 1]
            d = (q[0] - p[0]) * (s_[1] - r[1]) - (q[1] - p[1]) * (s_[0] - r[0])
            if abs(d) < 1e-12:
                continue
            t = ((r[0] - p[0]) * (s_[1] - r[1]) - (r[1] - p[1]) * (s_[0] - r[0])) / d
            u = ((r[0] - p[0]) * (q[1] - p[1]) - (r[1] - p[1]) * (q[0] - p[0])) / d
            if 0 <= t < 1 and 0 <= u < 1:
                found.append((i + t, j + u, abs(d) / (math.dist(p, q) * math.dist(r, s_))))
    return found


def poly(pts) -> str:
    return "M" + "L".join(f"{x:.2f} {y:.2f}" for x, y in pts)


def stretch(pts: list[Pt], pos: float, reach: float) -> list[Pt]:
    """The part of the closed polyline within `reach` (measured along it) of position `pos`."""
    n = len(pts) - 1
    i = int(pos)
    centre = (pts[i][0] + (pos - i) * (pts[i + 1][0] - pts[i][0]), pts[i][1] + (pos - i) * (pts[i + 1][1] - pts[i][1]))
    back, ahead = [centre], [centre]
    for step, out in ((-1, back), (1, ahead)):
        k, walked, last = (i if step < 0 else i + 1), 0.0, centre
        while walked < reach:
            nxt = pts[k % n]
            walked += math.dist(last, nxt)
            out.append(nxt)
            last, k = nxt, k + step
    return back[::-1] + ahead[1:]


def knot(background: str | None, size: int = 64) -> str:
    """One strand weaving round, seamless: the whole strand is drawn, then at each crossing the upper pass is laid
    again on top, so its ochre edges run across the lower one. Along the strand the crossings go over, under,
    over... (a closed curve always allows this)."""
    pts = strand()
    cross = self_crossings(pts)
    events = sorted([(c[0], c[2]) for c in cross] + [(c[1], c[2]) for c in cross])
    full = poly(pts) + "Z"
    tops = "".join(
        f'<path d="{poly(stretch(pts, pos, RIBBON / max(0.35, sin) + 2))}"/>' for pos, sin in events[0::2]
    )
    bg = f'<rect width="100" height="100" rx="18" fill="{background}"/>' if background else ""
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="{size}" height="{size}" role="img" aria-label="Hic">
  <title>Hic</title>
  {bg}
  <g fill="none" stroke-linecap="butt" stroke-linejoin="round">
    <path d="{full}" stroke="{OCHRE}" stroke-width="{RIBBON}"/>
    <path d="{full}" stroke="{GREEN}" stroke-width="{FILL}"/>
    <g stroke="{OCHRE}" stroke-width="{RIBBON}">{tops}</g>
    <g stroke="{GREEN}" stroke-width="{FILL}">{tops}</g>
  </g>
</svg>
"""


# ---------- shield ----------
# A Norman kite shield over two crossed sewing needles held like swords, threaded, after Paul's sketch.

STEEL = "#a5a8aa"
LEAF = "#7a9a72"
SHIELD = "M512 298C566 298 620 336 620 406C620 538 558 704 512 832C466 704 404 538 404 406C404 336 458 298 512 298Z"
NEEDLE_LEN = 790
EYE = 66  # distance of the eye's centre from the needle's head
ANGLE = 45.3  # degrees, left needle (head top left); the right one is its mirror image
HEAD = (238, 236)


def needle() -> str:
    """Along +x from the head: a rounded head that bulges slightly around the eye, a shaft, a long taper to the
    point. The eye is a real hole, so the thread behind shows through it."""
    L = NEEDLE_LEN
    return (
        f'<path fill-rule="evenodd" d="M0 0C0 -17 12 -27 40 -28C78 -29 118 -23 168 -18L{L} 0L168 18'
        f'C118 23 78 29 40 28C12 27 0 17 0 0Z'
        f'M27 -9H105A9 9 0 0 1 105 9H27A9 9 0 0 1 27 -9Z"/>'
    )


def eye_point(offset: float) -> tuple[float, float]:
    """A point across the left needle's eye: offset > 0 towards the upper right, < 0 towards the lower left."""
    a = math.radians(ANGLE)
    cx, cy = HEAD[0] + EYE * math.cos(a), HEAD[1] + EYE * math.sin(a)
    return cx + offset * math.sin(a), cy - offset * math.cos(a)


def shield() -> str:
    one_needle = (f'<g transform="translate({HEAD[0]} {HEAD[1]}) rotate({ANGLE})" fill="{STEEL}" stroke="{INK}" '
                  f'stroke-width="7" stroke-linejoin="round">{needle()}</g>')
    (ex, ey), (fx, fy), (bx, by) = eye_point(0), eye_point(26), eye_point(-26)
    # Behind the needle: from the curl at the side up to the eye. In front: out of the eye, a swoop down, up into a
    # loop that crosses itself above the shield, and down again to the other eye (the right half mirrors the left).
    behind = (f"M268 500C232 530 240 583 278 578C322 572 330 505 285 450C255 413 240 370 {bx:.0f} {by:.0f}"
              f"L{ex:.1f} {ey:.1f}")
    front = (f"M{ex:.1f} {ey:.1f}L{fx:.0f} {fy:.0f}C352 220 416 230 446 260C466 280 494 286 516 266"
             f"C536 248 552 232 550 210C548 188 532 174 512 174C492 174 476 188 474 210"
             f"C472 232 488 248 508 266C530 286 558 280 578 260"
             f"C608 230 672 220 {1024 - fx:.0f} {fy:.0f}L{1024 - ex:.1f} {ey:.1f}")
    mirror = 'transform="translate(1024 0) scale(-1 1)"'
    thread = f'fill="none" stroke="{INK}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"'
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="176 152 672 696" role="img" aria-label="Hic">
  <title>Hic</title>
  <defs><clipPath id="shield-face"><path d="{SHIELD}"/></clipPath></defs>
  <g {thread}><path d="{behind}"/><path d="{behind}" {mirror}/></g>
  {one_needle}
  <g {mirror}>{one_needle}</g>
  <path d="{front}" {thread}/>
  <g clip-path="url(#shield-face)">
    <rect x="300" y="290" width="212" height="550" fill="{LEAF}"/>
    <rect x="512" y="290" width="212" height="550" fill="{GREEN}"/>
    <rect x="300" y="452" width="424" height="32" fill="{TERRA}" stroke="{INK}" stroke-width="7"/>
    <rect x="497" y="290" width="30" height="550" fill="{OCHRE}" stroke="{INK}" stroke-width="7"/>
  </g>
  <path d="{SHIELD}" fill="none" stroke="{INK}" stroke-width="10" stroke-linejoin="round"/>
  <circle cx="512" cy="468" r="27" fill="{OCHRE}" stroke="{INK}" stroke-width="8"/>
</svg>
"""


if __name__ == "__main__":
    (OUT / "brand").mkdir(exist_ok=True)
    (OUT / "brand" / "hic-wordmark.svg").write_text(wordmark())
    (OUT / "brand" / "hic-knot.svg").write_text(knot(None))
    (OUT / "favicon.svg").write_text(knot(LINEN))
    (OUT / "brand" / "hic-shield.svg").write_text(shield())
    print("written public/brand/ (wordmark, knot, shield) and public/favicon.svg")
