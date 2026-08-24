"""
Tests for the georeferencing maths, runnable without Blender.

    python tests/test_ground_fit.py

The ground-plane fit is the part most likely to go quietly wrong, because the
inputs it has to survive are adversarial in a specific way: Google's tiles come
with a flat clip plane tens of metres *below* the terrain, and dense cities
present large roof surfaces *above* it. Either can be more populous than the
ground itself, so each scenario below encodes a case that broke an earlier
version of the fit.
"""

import importlib.util
import math
import os
import sys
import types

ADDON_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                         "google_map_export_bridge")


def _load_addon_modules():
    """Import the bpy-free modules as a package, without importing the add-on."""
    pkg = types.ModuleType("_gmeb")
    pkg.__path__ = [ADDON_DIR]
    sys.modules["_gmeb"] = pkg
    loaded = {}
    for name in ("georef", "obj_transform"):
        spec = importlib.util.spec_from_file_location(
            "_gmeb." + name, os.path.join(ADDON_DIR, name + ".py"))
        mod = importlib.util.module_from_spec(spec)
        sys.modules["_gmeb." + name] = mod
        spec.loader.exec_module(mod)
        loaded[name] = mod
    return loaded


_mods = _load_addon_modules()
georef = _mods["georef"]
obj_transform = _mods["obj_transform"]

HIST_BIN = 0.5
FAILURES = []


def check(label, ok, detail=""):
    print("[%s] %s%s" % ("ok  " if ok else "FAIL", label,
                         (" - " + str(detail)) if detail else ""))
    if not ok:
        FAILURES.append(label)
    return ok


def make_hist(vert_heights):
    hist = {}
    for z in vert_heights:
        b = int(z / HIST_BIN // 1)
        hist[b] = hist.get(b, 0) + 1
    return hist


def scenario(label, cells, vert_heights, expect_c, tol=1.0):
    fit = georef.fit_ground_plane(cells, height_hist=make_hist(vert_heights),
                                  hist_bin=HIST_BIN)
    if fit is None:
        return check(label, False, "no fit produced")
    a, b, c, inliers = fit
    return check(label, abs(c - expect_c) <= tol,
                 "c=%.2f (want %.2f), %d/%d cells" % (c, expect_c, len(inliers),
                                                      len(cells)))


def grid(fn, n=20, step=4.0):
    """Build (cells, vert_heights) from fn(x_index, y_index) -> (min_z, [heights])."""
    cells, verts = [], []
    for i in range(n):
        for j in range(n):
            min_z, heights = fn(i, j)
            cells.append((i * step, j * step, min_z))
            verts.extend(heights)
    return cells, verts


# ---------------------------------------------------------------------------
# basic geodesy
# ---------------------------------------------------------------------------
print("--- geodesy ---")

b = georef.enu_basis((6371000.0, 0.0, 0.0))
check("ENU up is radial at the equator", abs(b[2][0] - 1.0) < 1e-9)
check("ENU north is +Z at the equator", abs(b[1][2] - 1.0) < 1e-9)

lat, lon, r = 43.7231, 10.3942, 6371000.0
la, lo = math.radians(lat), math.radians(lon)
p = (r * math.cos(la) * math.cos(lo), r * math.cos(la) * math.sin(lo),
     r * math.sin(la))
got_lat, got_lon, got_r = georef.ecef_to_latlon(p)
check("lat/lon round-trips through ECEF",
      abs(got_lat - lat) < 1e-9 and abs(got_lon - lon) < 1e-9,
      "%.6f, %.6f" % (got_lat, got_lon))

R = georef.enu_basis(p)
up = georef.unit(p)
delta = tuple(up[i] * 50.0 for i in range(3))
enu = georef.apply(R, delta)
check("straight up maps to +Z only",
      abs(enu[0]) < 1e-6 and abs(enu[1]) < 1e-6 and abs(enu[2] - 50.0) < 1e-6,
      "(%.6f, %.6f, %.6f)" % enu)

# A step due east must land on +X, and due north on +Y - if these swap or flip,
# the imported model comes in mirrored or rotated by 90 degrees.
east_step = georef.apply(R, R[0])
north_step = georef.apply(R, R[1])
check("east maps to +X", abs(east_step[0] - 1.0) < 1e-9 and abs(east_step[1]) < 1e-9)
check("north maps to +Y", abs(north_step[1] - 1.0) < 1e-9 and abs(north_step[0]) < 1e-9)

# Poles must not divide by zero.
try:
    pole = georef.enu_basis((0.0, 0.0, 6371000.0))
    check("pole does not blow up", abs(georef.norm(pole[2]) - 1.0) < 1e-9)
except Exception as exc:
    check("pole does not blow up", False, exc)

# ---------------------------------------------------------------------------
# levelling
# ---------------------------------------------------------------------------
print("\n--- levelling ---")

slope = math.tan(math.radians(5.0))
samples = [(x * 1.0, y * 1.0, slope * x) for x in range(-20, 21)
           for y in range(-20, 21)]
a, bb, c, _ = georef.fit_ground_plane(samples)
check("recovers a known 5 deg slope", abs(a - slope) < 1e-9,
      "a=%.6f want %.6f" % (a, slope))

r2, ang = georef.level_rotation(a, bb)
check("levelling angle matches", abs(math.degrees(ang) - 5.0) < 1e-6,
      "%.4f deg" % math.degrees(ang))
zs = [georef.apply(r2, s)[2] for s in samples]
check("levelling flattens it", max(zs) - min(zs) < 1e-6,
      "spread %.2e m" % (max(zs) - min(zs)))

# Levelling must not spin the model about the vertical, or north would drift.
north_after = georef.apply(r2, (0.0, 1.0, 0.0))
check("levelling keeps north pointing north", abs(north_after[0]) < 1e-9,
      "x component %.2e" % north_after[0])

# ---------------------------------------------------------------------------
# adversarial ground fits
# ---------------------------------------------------------------------------
print("\n--- adversarial ground fits ---")

scenario("flat ground, nothing else",
         *grid(lambda i, j: (0.0, [0.0] * 20)), expect_c=0.0)

# Google's clip plane, sitting well below the terrain as a sparse flat sheet.
scenario("clip plane below, quarter of cells",
         *grid(lambda i, j: (-15.0, [-15.0] * 4) if i < 5 else (0.0, [0.0] * 20)),
         expect_c=0.0)

scenario("clip plane below, most of the cells",
         *grid(lambda i, j: (-15.0, [-15.0] * 4) if i < 13 else (0.0, [0.0] * 30)),
         expect_c=0.0)

# Dense city: most cells see only a roof, never the ground.
scenario("dense city, two thirds roof-only cells",
         *grid(lambda i, j: (18.0, [18.0] * 10) if (i + j) % 3 else (0.0, [0.0] * 30)),
         expect_c=0.0)

# The case that defeated scoring on "geometry above" alone: roofs carrying more
# surface detail than the ground below them.
scenario("roofs denser than the ground",
         *grid(lambda i, j: (30.0, [30.0] * 26) if (i + j) % 2 else (0.0, [0.0] * 24)),
         expect_c=0.0)


def mixed(i, j):
    r = (i * 7 + j * 3) % 10
    if r < 3:
        return -18.0, [-18.0] * 3          # clip plane
    if r < 6:
        return 22.0, [22.0] * 30           # roofs
    return 0.0, [0.0] * 22                 # ground


scenario("clip plane below and roofs above", *grid(mixed), expect_c=0.0)

# Real slopes must survive: levelling should remove the slope, not mistake the
# hillside for an artefact and fit something else.
for degrees in (3.0, 8.0, 15.0):
    s = math.tan(math.radians(degrees))
    cells, verts = grid(lambda i, j, s=s: (s * i * 4.0, [s * i * 4.0] * 20))
    fit = georef.fit_ground_plane(cells, height_hist=make_hist(verts),
                                  hist_bin=HIST_BIN)
    a, b, c, inl = fit
    ang = math.degrees(georef.level_rotation(a, b)[1])
    check("recovers a %.0f deg hillside" % degrees, abs(ang - degrees) < 0.2,
          "%.3f deg from %d/%d cells" % (ang, len(inl), len(cells)))

# A hillside with the clip plane underneath it.
s = math.tan(math.radians(8.0))
cells, verts = grid(lambda i, j: (-20.0, [-20.0] * 4) if i < 6
                    else (s * i * 4.0, [s * i * 4.0] * 25))
a, b, c, inl = georef.fit_ground_plane(cells, height_hist=make_hist(verts),
                                       hist_bin=HIST_BIN)
ang = math.degrees(georef.level_rotation(a, b)[1])
check("hillside with a clip plane under it", abs(ang - 8.0) < 1.5,
      "%.3f deg" % ang)

# Degenerate inputs must not raise.
check("too few samples returns None", georef.fit_ground_plane([(0, 0, 0)]) is None)
check("empty samples returns None", georef.fit_ground_plane([]) is None)

# ---------------------------------------------------------------------------
# 3D versus Google's flat 2D fallback
#
# Reference numbers come from real exports: a Pisa city-centre level-20 export
# measures about 8.5 verts/m2 with 57 m of relief, whereas draped terrain is
# orders of magnitude coarser and essentially flat.
# ---------------------------------------------------------------------------
print("")
print("--- coverage assessment ---")


def coverage(label, relief, density, want, requested=20, achieved=None):
    got, note = obj_transform.assess_coverage(relief, density, requested,
                                              achieved)
    check("%-38s -> %-6s" % (label, got), got == want,
          note[:60] if note else "no note")


coverage("Pisa city centre, level 20", 56.7, 8.5, "3d")
coverage("low-rise but detailed", 12.0, 4.0, "3d")
coverage("draped terrain, flat and coarse", 1.2, 0.02, "flat")
coverage("flat and coarse plus level shortfall", 0.8, 0.05, "flat",
         requested=20, achieved=16)
coverage("coarse but with real relief", 30.0, 0.05, "sparse")
coverage("detailed but no relief, e.g. a field", 1.0, 5.0, "sparse")
coverage("moderate detail", 20.0, 0.9, "sparse")
coverage("full detail but level shortfall", 25.0, 6.0, "sparse",
         requested=20, achieved=18)
coverage("level fully satisfied", 25.0, 6.0, "3d", requested=20, achieved=20)

# The flat verdict has to say something the reader can act on.
_verdict, _note = obj_transform.assess_coverage(1.0, 0.02, 20, 16)
check("flat verdict explains itself",
      "no 3D coverage" in _note and "level 16" in _note, _note)

# A level shortfall must be named, not silently accepted.
_verdict, _note = obj_transform.assess_coverage(25.0, 6.0, 20, 17)
check("shortfall names both levels", "17" in _note and "20" in _note, _note)

# Level 21 is reachable but measured worse than 20 on every area tried, so 20
# counts as full detail. Asking for 21 and getting 20 is not a shortfall.
coverage("asked 21, got 20 - not a shortfall", 25.0, 6.0, "3d",
         requested=21, achieved=20)
coverage("asked 21, got 18 - still a shortfall", 25.0, 6.0, "sparse",
         requested=21, achieved=18)

_verdict, _note = obj_transform.assess_coverage(25.0, 6.0, 21, 18)
check("a shortfall past 21 is measured against 20",
      "18" in _note and "20" in _note and "21" not in _note, _note)


print("\n" + "=" * 62)
if FAILURES:
    print("%d FAILED: %s" % (len(FAILURES), ", ".join(FAILURES)))
else:
    print("ALL CHECKS PASSED")
print("=" * 62)
sys.exit(1 if FAILURES else 0)
