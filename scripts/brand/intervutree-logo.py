from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import sys, os

f = TTFont("/usr/share/fonts/opentype/inter/Inter-Bold.otf")
gs = f.getGlyphSet(); cmap = f.getBestCmap(); upm = f["head"].unitsPerEm; hmtx = f["hmtx"]
SIZE = 56.0; s = SIZE / upm; BASE = 62.0
capH = f["OS/2"].sCapHeight * s; xH = f["OS/2"].sxHeight * s
top = BASE - capH; xtop = BASE - xH

def word(text, x0):
    pen = SVGPathPen(gs); x = x0
    for ch in text:
        g = cmap[ord(ch)]
        gs[g].draw(TransformPen(pen, (s, 0, 0, -s, x, BASE)))
        x += hmtx[g][0] * s
    return pen.getCommands(), x

TRUNK_W = 9.0; tx = 70.0; axis = tx + TRUNK_W / 2

def tree(ox, oy, k, ink, leaf, leaf_fill=None):
    """Skeleton half banyan on the left of the trunk, after the reference: limbs fork
    upward into a rounded crown, aerial roots hang straight down from them, and the
    base roots spread out along the ground. (ox, oy) is the trunk top-left at scale k."""
    a = ox + TRUNK_W * k / 2
    G = BASE_OFF  # ground level, tree units below oy
    def P(dx, dy): return f"{a - dx * k:.1f} {oy + dy * k:.1f}"
    w = lambda v: f"{v * k:.1f}"
    strokes = []
    def line(d, width): strokes.append(f'<path d="{d}" fill="none" stroke="{leaf}" stroke-width="{w(width)}" stroke-linecap="round" stroke-linejoin="round"/>')
    # Crown: two main limbs leave the trunk and each forks, so the tips sit on a
    # rounded half dome instead of fanning straight out of the trunk.
    line(f"M{P(0, 12)} C{P(8, 8)} {P(14, 2)} {P(18, -4)}", 4.2)         # upper limb to its fork
    line(f"M{P(18, -4)} C{P(20, -10)} {P(20, -16)} {P(18, -22)}", 3.0)  # fork: up
    line(f"M{P(18, -4)} C{P(24, -8)} {P(32, -10)} {P(40, -12)}", 3.0)   # fork: out
    line(f"M{P(28, -9)} C{P(30, -14)} {P(32, -17)} {P(36, -20)}", 2.0)  # twig
    line(f"M{P(0, 26)} C{P(12, 24)} {P(22, 20)} {P(30, 14)}", 3.8)      # lower limb to its fork
    line(f"M{P(30, 14)} C{P(36, 10)} {P(42, 4)} {P(48, -2)}", 2.8)      # fork: up-out
    line(f"M{P(30, 14)} C{P(40, 14)} {P(50, 12)} {P(60, 8)}", 2.8)      # fork: out
    line(f"M{P(46, 13)} C{P(50, 18)} {P(54, 20)} {P(60, 22)}", 2.0)     # drooping twig
    line(f"M{P(4, 4)} C{P(6, -2)} {P(8, -8)} {P(8, -14)}", 2.6)         # small top shoot
    # A few leaves at the tips: pointed ovals, each turned along its branch.
    import math
    lf = leaf_fill or leaf
    def leaf_at(dx, dy, angle, size=7.0):
        cx, cy = a - dx * k, oy + dy * k
        L = size * k; Wd = size * 0.42 * k
        return (f'<path transform="rotate({angle} {cx:.1f} {cy:.1f})" fill="{lf}" '
                f'd="M{cx - L/2:.1f} {cy:.1f} Q{cx:.1f} {cy - Wd:.1f} {cx + L/2:.1f} {cy:.1f} Q{cx:.1f} {cy + Wd:.1f} {cx - L/2:.1f} {cy:.1f} Z"/>')
    for dx, dy, ang, sz in [(19, -26, -65, 12), (23, -19, 25, 10), (42, -15, -20, 12), (36, -24, -55, 10), (38, -9, 45, 9),
                            (51, -5, -35, 12), (63, 6, 5, 12), (59, 13, 50, 10), (62, 25, 20, 11), (8, -18, -75, 11), (12, -11, 15, 9),
                            (30, -12, 70, 9), (47, 2, 80, 9)]:
        strokes.append(leaf_at(dx, dy, ang, sz))
    # Aerial roots: straight drops from the limbs; two reach the ground, one hangs free.
    for dx, y0, y1, width in [(14, 2, G, 2.6), (34, 11, G, 2.4), (24, 18, 46, 1.8), (50, 11, 40, 1.6)]:
        line(f"M{P(dx, y0)} L{P(dx, y1)}", width)
    # Base roots spreading left along the ground.
    line(f"M{P(2, G - 4)} C{P(10, G - 2)} {P(18, G)} {P(30, G + 2)}", 3.0)
    line(f"M{P(2, G - 1)} C{P(6, G + 2)} {P(10, G + 4)} {P(16, G + 6)}", 2.4)
    return "".join(strokes)

# Tree sits above the x-height: canopy top at TT-17, roots end above the n.
TT = top - 6           # trunk top
BASE_OFF = (BASE - TT)  # ground level in tree units
n_start = axis + TRUNK_W / 2 + 4.5
main, xend = word("ntervu", n_start)
treew, xend2 = word("tree", xend)
W = xend2 + 6
vb_y = TT - 26

def logo(fg, brand, leaf, leaf_fill=None):
    h = BASE + 12 - vb_y
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 {vb_y:.1f} {W:.1f} {h:.1f}" role="img" aria-label="Intervutree">
  {tree(tx, TT, 1.0, fg, leaf, leaf_fill)}
  <rect x="{tx:.1f}" y="{TT:.1f}" width="{TRUNK_W}" height="{BASE - TT:.1f}" rx="1.5" fill="{fg}"/>
  <path fill="{fg}" d="{main}"/>
  <path fill="{brand}" d="{treew}"/>
</svg>'''

def icon(brand, ink, leaf, leaf_fill=None):
    k = 0.5; ox = 46; oy = 24
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 64 64" role="img" aria-label="Intervutree">
  <rect width="64" height="64" rx="14" fill="{brand}"/>
  {tree(ox, oy, k, ink, leaf, leaf_fill)}
  <rect x="{ox}" y="{oy}" width="{TRUNK_W*k:.1f}" height="{oy + BASE_OFF*k - oy:.1f}" rx="1.2" fill="{ink}"/>
</svg>'''

out = sys.argv[1]; os.makedirs(out, exist_ok=True)
for n in os.listdir(out): os.remove(os.path.join(out, n))
IL, ID = "#3F47B8", "#8B93FF"; GL, GD = "#2E9E5B", "#4ADE80"
files = {
  "intervutree-logo-light.svg": logo("#111827", IL, IL),
  "intervutree-logo-dark.svg": logo("#F5F5F5", ID, ID),
  "intervutree-logo-green-light.svg": logo("#111827", IL, IL, GL),
  "intervutree-logo-green-dark.svg": logo("#F5F5F5", ID, ID, GD),
  "intervutree-icon-light.svg": icon(IL, "#FFFFFF", "#FFFFFF"),
  "intervutree-icon-dark.svg": icon(ID, "#0D0F14", "#0D0F14"),
  "intervutree-icon-green-light.svg": icon(IL, "#FFFFFF", "#FFFFFF", GD),
  "intervutree-icon-green-dark.svg": icon(ID, "#0D0F14", "#0D0F14", "#1F7A45"),
}
for n, c in files.items(): open(os.path.join(out, n), "w").write(c)
print("roots end", TT + 10.5 + 13, "x-height top", xtop, "n_start", n_start)
