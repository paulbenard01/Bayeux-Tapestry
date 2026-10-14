"""Draws the project's marks as SVG: the "hIC" wordmark framed by striped bands, the woven knot, and the shield.

Our own drawings after the embroidery (never traced from the photography): heavy uncial letters after the
captions, bands after the borders' slanted bars, a ring of woven loops after the interlace of the trees.
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

# Each band is a run of slanted stripes: (colour, width), filling the band from left to right.
TOP_BAND = [(GREEN, 92), (OCHRE, 9), (TERRA, 15), (BLUE, 14), (OCHRE, 8), (GREEN, 56), (OCHRE, 70)]
BOTTOM_BAND = [(GREEN, 40), (OCHRE, 26), (GREEN, 70), (TERRA, 12), (BLUE, 16), (OCHRE, 9), (TERRA, 10), (GREEN, 90)]
LEAN = 14


def band(y: float, height: float, width: float, stripes: list[tuple[str, float]], clip: str) -> str:
    parts = [f'<clipPath id="{clip}"><rect x="0" y="{y}" width="{width}" height="{height}"/></clipPath>',
             f'<g clip-path="url(#{clip})">']
    x = -LEAN
    for colour, w in stripes:
        parts.append(
            f'<path d="M{x:.1f} {y + height}L{x + LEAN:.1f} {y}H{x + LEAN + w + 0.6:.1f}L{x + w + 0.6:.1f} {y + height}Z" '
            f'fill="{colour}"/>'
        )
        x += w
    parts.append("</g>")
    return "".join(parts)


# Heavy uncial letters: a thick stem and a hooked bowl for h, a flared I, a C thicker on the left.
# Heavy uncial letters, all curves: h with a curled flag and a bowl whose foot hooks back, a flared I, a round C
# with a ball terminal.
LETTERS = f"""<g fill="{INK}">
    <path d="M26 47C35 46 45 42 52 36V103C52 108 55 110 61 111H23C29 110 32 107 32 103V56C32 51 30 48 26 47Z"/>
    <path d="M52 77C58 65 69 60 79 62C91 65 96 77 95 91C94 104 89 112 81 112C77 112 74.5 110 74.5 107.5C74.5 105.5 76 104.5 77.5 103.5C79.5 101.5 80 97 80 88C80 77 76 71 70 71C63 71 57 76 52 84Z"/>
    <path d="M102 41H138C131 43 128 46 128 52V100C128 106 131 109 138 111H102C109 109 112 106 112 100V52C112 46 109 43 102 41Z"/>
    <path d="M200 52C193 44 185 40 176 40C157 41 145 57 145 76C145 95 158 111 177 111C189 111 198 106 204 98C205 96 204 94 202 94C197 99 190 102 183 102C170 102 162 90 162 76C162 61 170 49 182 49C188 49 192 52 195 56Z"/>
    <circle cx="199" cy="57" r="7.5"/>
  </g>"""


def wordmark() -> str:
    width, height = 236, 150
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" role="img" aria-label="Hic">
  <title>Hic</title>
  <rect x="1" y="1" width="{width - 2}" height="{height - 2}" fill="{PAPER}"/>
  {band(1, 26, width, TOP_BAND, "band-top")}
  {band(123, 26, width, BOTTOM_BAND, "band-bottom")}
  <path d="M1 27H{width - 1}M1 123H{width - 1}" stroke="{INK}" stroke-width="1.5"/>
  <rect x="1" y="1" width="{width - 2}" height="{height - 2}" fill="none" stroke="{INK}" stroke-width="2"/>
  {LETTERS}
</svg>
"""


# ---------- knot ----------
# One strand braided round a ring, after the interlace of the trees that divide the scenes. Over and under
# alternate along it, and it is broken where it passes under, so the mark needs no masks and sits on any
# background. Drawn as a ribbon: ochre edges, green inside.

LOOPS = 7  # times the strand swings in and out
TURNS = 3  # times it goes round before closing: a three-strand braid made of one strand
RING, SWING = 30.0, 14.0
RIBBON, FILL = 5.2, 2.8
GAP = 1.1

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


def broken(pts: list[Pt], holes: list[tuple[float, float]]) -> list[list[Pt]]:
    """A closed polyline cut at each (position, half length) hole, as open pieces."""
    n = len(pts) - 1
    arc = [0.0]
    for i in range(n):
        arc.append(arc[-1] + math.dist(pts[i], pts[i + 1]))
    total = arc[-1]

    def length(pos: float) -> float:
        i = min(int(pos), n - 1)
        return arc[i] + (pos - i) * (arc[i + 1] - arc[i])

    def point(at: float) -> Pt:
        at %= total
        lo, hi = 0, n
        while hi - lo > 1:
            mid = (lo + hi) // 2
            lo, hi = (mid, hi) if arc[mid] <= at else (lo, mid)
        f = (at - arc[lo]) / (arc[lo + 1] - arc[lo])
        return (pts[lo][0] + f * (pts[lo + 1][0] - pts[lo][0]), pts[lo][1] + f * (pts[lo + 1][1] - pts[lo][1]))

    cuts = sorted((length(pos), half) for pos, half in holes)
    pieces = []
    for k, (h, half) in enumerate(cuts):
        nxt, nxt_half = cuts[(k + 1) % len(cuts)]
        start, end = h + half, nxt - nxt_half
        if end <= start:
            end += total
        steps = max(2, int((end - start) / 0.5))
        pieces.append([point(start + (end - start) * i / steps) for i in range(steps + 1)])
    return pieces


def knot(background: str | None, size: int = 64) -> str:
    """One strand weaving round: met in order along the strand, its crossings go over, under, over... (a closed
    curve always allows this), and the strand is broken where it passes under."""
    pts = strand()
    cross = self_crossings(pts)
    events = sorted([(c[0], c[2]) for c in cross] + [(c[1], c[2]) for c in cross])
    # The upper pass covers RIBBON / sin(angle) of the lower one, so shallow crossings get longer holes.
    holes = [(pos, RIBBON / 2 / max(0.35, sin) + GAP) for pos, sin in events[1::2]]
    body = "".join(f'<path d="{poly(piece)}"/>' for piece in broken(pts, holes))
    bg = f'<rect width="100" height="100" rx="18" fill="{background}"/>' if background else ""
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="{size}" height="{size}" role="img" aria-label="Hic">
  <title>Hic</title>
  {bg}
  <g fill="none" stroke-linecap="butt" stroke-linejoin="round">
    <g stroke="{OCHRE}" stroke-width="{RIBBON}">{body}</g>
    <g stroke="{GREEN}" stroke-width="{FILL}">{body}</g>
  </g>
</svg>
"""


# ---------- shield ----------
# A Norman kite shield over two crossed sewing needles (held like swords), threaded, after Paul's sketch.

STEEL = "#a5a8aa"
LEAF = "#7a9a72"
SHIELD = "M512 312C592 312 662 362 662 444C662 566 564 702 512 805C460 702 362 566 362 444C362 362 432 312 512 312Z"
EYE_AT = 66  # distance of the eye's centre from the needle's head


def needle(length: float = 790) -> str:
    """A needle along +x from its head: rounded head, eye slot, tapering to a point (the eye is a real hole)."""
    return (
        f'<path fill-rule="evenodd" d="M34 -30L{length} 0L34 30A30 30 0 0 1 34 -30Z'
        f'M26 -10H112A10 10 0 0 1 112 10H26A10 10 0 0 1 26 -10Z"/>'
    )


def shield() -> str:
    one_side = f"""<g transform="translate(238 236) rotate(45.3)" fill="{STEEL}" stroke="{INK}" stroke-width="7"
      stroke-linejoin="round">{needle()}</g>"""
    thread_side = "M284 282C232 330 240 395 285 450C330 505 322 572 278 578C240 583 232 530 268 500"
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="176 112 672 728" role="img" aria-label="Hic">
  <title>Hic</title>
  <defs><clipPath id="shield-face"><path d="{SHIELD}"/></clipPath></defs>
  {one_side}
  <g transform="translate(1024 0) scale(-1 1)">{one_side}</g>
  <g fill="none" stroke="{INK}" stroke-width="9" stroke-linecap="round">
    <path d="M284 282C330 235 420 225 478 262C515 286 560 268 556 215C552 170 472 170 468 215C464 268 509 286 546 262C604 225 694 235 740 282"/>
    <path d="{thread_side}"/>
    <path d="{thread_side}" transform="translate(1024 0) scale(-1 1)"/>
  </g>
  <g clip-path="url(#shield-face)">
    <rect x="300" y="300" width="212" height="520" fill="{LEAF}"/>
    <rect x="512" y="300" width="212" height="520" fill="{GREEN}"/>
    <rect x="300" y="495" width="424" height="34" fill="{TERRA}" stroke="{INK}" stroke-width="7"/>
    <rect x="496" y="300" width="32" height="520" fill="{OCHRE}" stroke="{INK}" stroke-width="7"/>
  </g>
  <path d="{SHIELD}" fill="none" stroke="{INK}" stroke-width="10" stroke-linejoin="round"/>
  <circle cx="512" cy="512" r="29" fill="{OCHRE}" stroke="{INK}" stroke-width="8"/>
</svg>
"""


if __name__ == "__main__":
    (OUT / "brand").mkdir(exist_ok=True)
    (OUT / "brand" / "hic-wordmark.svg").write_text(wordmark())
    (OUT / "brand" / "hic-knot.svg").write_text(knot(None))
    (OUT / "favicon.svg").write_text(knot(LINEN))
    (OUT / "brand" / "hic-shield.svg").write_text(shield())
    print("written public/brand/ (wordmark, knot, shield) and public/favicon.svg")
