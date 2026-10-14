"""Draws the project's marks as SVG: the "hIC" wordmark framed by two striped border bands, and the knot of loops.

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
LETTERS = f"""<g fill="{INK}">
    <path d="M27 45L52 37V104C52 108 54 110 59 111H25C30 110 32 108 32 104V52C32 49 30 47 27 45Z"/>
    <path d="M52 76C58 64 70 59 81 62C93 66 97 79 94 93C91 104 82 111 70 112L68 104C76 101 80 95 80 86C80 76 76 71 70 71C63 71 57 76 52 85Z"/>
    <path d="M103 41H137C130 43 128 46 128 51V101C128 106 130 109 137 111H103C110 109 112 106 112 101V51C112 46 110 43 103 41Z"/>
    <path d="M204 52C197 43 187 39 177 40C158 42 145 57 145 76C145 95 158 110 177 111C188 112 198 107 205 98L199 93C194 99 188 102 182 102C170 102 162 91 162 76C162 61 170 49 182 49C188 49 194 53 198 59Z"/>
    <path d="M196 56L205 52L206 64L199 62Z"/>
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
# A ring of loops, after the interlace of the trees that divide the scenes: circles set round a ring, each crossing
# its neighbours. Over and under alternate along every loop (solved as a two-colouring of the crossings), and a
# loop is simply broken where it passes under, so the mark needs no masks and sits on any background. It is drawn
# as a ribbon: ochre edges, green inside.

LOOPS = 8
RING = 30.0
LOOP_R = 15.0
RIBBON, FILL = 5.6, 3.0
GAP = 1.1

Pt = tuple[float, float]


def loops(samples: int = 720) -> list[list[Pt]]:
    out = []
    for i in range(LOOPS):
        a = 2 * math.pi * i / LOOPS - math.pi / 2
        cx, cy = 50 + RING * math.cos(a), 50 + RING * math.sin(a)
        out.append([(cx + LOOP_R * math.cos(2 * math.pi * k / samples + a),
                     cy + LOOP_R * math.sin(2 * math.pi * k / samples + a)) for k in range(samples + 1)])
    return out


def crossings(strands):
    """[(strand a, position on a, strand b, position on b, point, sin of the angle)] between different strands."""
    found = []
    for a in range(len(strands)):
        for b in range(a + 1, len(strands)):
            pa, pb = strands[a], strands[b]
            for i in range(len(pa) - 1):
                for j in range(len(pb) - 1):
                    p, q, r, s = pa[i], pa[i + 1], pb[j], pb[j + 1]
                    d = (q[0] - p[0]) * (s[1] - r[1]) - (q[1] - p[1]) * (s[0] - r[0])
                    if abs(d) < 1e-12:
                        continue
                    t = ((r[0] - p[0]) * (s[1] - r[1]) - (r[1] - p[1]) * (s[0] - r[0])) / d
                    u = ((r[0] - p[0]) * (q[1] - p[1]) - (r[1] - p[1]) * (q[0] - p[0])) / d
                    if 0 <= t < 1 and 0 <= u < 1:
                        sin = abs(d) / (math.dist(p, q) * math.dist(r, s))
                        found.append((a, i + t, b, j + u, (p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])), sin))
    return found


def weave(cross, count: int) -> list[int]:
    """The strand on top at each crossing, alternating along every strand (two-colouring by search)."""
    a_over: dict[int, bool] = {}
    links: dict[int, list[tuple[int, bool]]] = {k: [] for k in range(len(cross))}
    for s in range(count):
        seq = sorted((c[1] if c[0] == s else c[3], k) for k, c in enumerate(cross) if s in (c[0], c[2]))
        for (_, k1), (_, k2) in zip(seq, seq[1:] + seq[:1]):
            same = (cross[k1][0] == s) == (cross[k2][0] == s)
            links[k1].append((k2, same))
            links[k2].append((k1, same))
    for start in range(len(cross)):
        if start in a_over:
            continue
        a_over[start] = True
        todo = [start]
        while todo:
            k = todo.pop()
            for other, same in links[k]:
                want = (not a_over[k]) if same else a_over[k]
                if other not in a_over:
                    a_over[other] = want
                    todo.append(other)
                elif a_over[other] != want:
                    raise ValueError("this layout cannot alternate over and under")
    return [cross[k][0] if a_over[k] else cross[k][2] for k in range(len(cross))]


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
    strands = loops()
    cross = crossings(strands)
    top = weave(cross, len(strands))
    paths = []
    for s, pts in enumerate(strands):
        # The upper loop covers RIBBON / sin(angle) of this one, so shallow crossings get longer holes.
        holes = [(c[1] if c[0] == s else c[3], RIBBON / 2 / max(0.35, c[5]) + GAP)
                 for k, c in enumerate(cross) if s in (c[0], c[2]) and top[k] != s]
        paths += [f'<path d="{poly(piece)}"/>' for piece in broken(pts, holes)]
    body = "".join(paths)
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


if __name__ == "__main__":
    (OUT / "brand").mkdir(exist_ok=True)
    (OUT / "brand" / "hic-wordmark.svg").write_text(wordmark())
    (OUT / "brand" / "hic-knot.svg").write_text(knot(None))
    (OUT / "favicon.svg").write_text(knot(LINEN))
    print("written public/brand/hic-wordmark.svg, public/brand/hic-knot.svg, public/favicon.svg")
