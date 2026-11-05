"""
Tests for the OpenStreetMap and SRTM sources, runnable without Blender or a
network: the servers are replaced by canned answers.

    python tests/test_open_data.py
"""

import gzip
import importlib.util
import io
import os
import struct
import sys
import tempfile
import types
import urllib.error
import zipfile

ADDON_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                         "google_map_export_bridge")

pkg = types.ModuleType("_gmeb")
pkg.__path__ = [ADDON_DIR]
sys.modules["_gmeb"] = pkg
for name in ("hub", "georef", "obj_transform", "open_data"):
    spec = importlib.util.spec_from_file_location(
        "_gmeb." + name, os.path.join(ADDON_DIR, name + ".py"))
    mod = importlib.util.module_from_spec(spec)
    sys.modules["_gmeb." + name] = mod
    spec.loader.exec_module(mod)
od = sys.modules["_gmeb.open_data"]

FAILURES = []


def check(label, ok, detail=""):
    print("[%s] %s%s" % ("ok  " if ok else "FAIL", label,
                         (" - " + str(detail)) if detail else ""))
    if not ok:
        FAILURES.append(label)


def area(pts):
    return od._area2(pts) / 2.0


def raises(fn, *args):
    try:
        fn(*args)
    except Exception as exc:              # noqa: BLE001
        return str(exc)
    return None


BBOX = {"minLat": 43.7225, "minLng": 10.3955, "maxLat": 43.7235, "maxLng": 10.3970}
TMP = tempfile.mkdtemp(prefix="gmeb-open-data-")
quiet = lambda *_: None

# --- heights --------------------------------------------------------------------
print("--- heights ---")
for tags, want in [({"height": "12 m"}, (12.0, False)),
                   ({"height": "12;15"}, (12.0, False)),
                   ({"height": "7,5"}, (7.5, False)),
                   ({"building:levels": "3"}, (9.0, False)),
                   ({"building:levels": "2", "roof:levels": "1"}, (9.0, False)),
                   ({"building": "yes"}, (od.DEFAULT_HEIGHT_M, True)),
                   ({"height": "tall"}, (od.DEFAULT_HEIGHT_M, True))]:
    check("height from %s" % tags, od.building_height(tags) == want,
          od.building_height(tags))

# --- query and servers ------------------------------------------------------------
print("\n--- query and servers ---")
check("a plain box is queried as a bbox", "(43.7225000,10.3955000" in od.overpass_query(BBOX))
check("a tilted area is queried as a polygon",
      'poly:"43.7230000 10.3955000 ' in od.overpass_query(
          BBOX, [[43.723, 10.3955], [43.7235, 10.39625], [43.723, 10.397]]))
check("the chosen server goes first, without repeating it",
      od._servers(od.OVERPASS_SERVERS[2], od.OVERPASS_SERVERS)
      == [od.OVERPASS_SERVERS[2]] + [s for i, s in enumerate(od.OVERPASS_SERVERS) if i != 2])
check("a custom server goes first, then the built-in ones",
      od._servers("https://my.overpass/api/interpreter", od.OVERPASS_SERVERS)[1:]
      == od.OVERPASS_SERVERS)
check("a non-http server is refused", raises(od._servers, "file:///etc/passwd", []) is not None)

# --- outlines ----------------------------------------------------------------------
print("\n--- outlines ---")
sq = lambda a, b, c, d: [{"lat": y, "lon": x} for x, y in ((a, c), (b, c), (b, d), (a, d), (a, c))]
outer = sq(10.3960, 10.3966, 43.7228, 43.7232)
inner = sq(10.3962, 10.3964, 43.7229, 43.7231)
check("two open segments join into one ring",
      len(od._join_rings([[(0, 0), (0, 1), (1, 1)], [(0, 0), (1, 0), (1, 1)]])) == 1)
check("a segment that never closes is dropped",
      od._join_rings([[(0, 0), (0, 1), (1, 1)]]) == [])
courtyard = {"type": "relation", "id": 7, "tags": {"building": "yes", "height": "10"},
             "members": [{"type": "way", "role": "outer", "geometry": outer[:3]},
                         {"type": "way", "role": "outer", "geometry": outer[2:]},
                         {"type": "way", "role": "inner", "geometry": inner}]}
shapes = od.element_shapes(courtyard)
check("a split multipolygon gives one outline with its courtyard",
      len(shapes) == 1 and len(shapes[0][0]) == 4 and len(shapes[0][1]) == 1, shapes)

# --- meshes ------------------------------------------------------------------------
print("\n--- meshes ---")
frame = od.Frame(BBOX)
verts, faces = od.building_mesh(shapes[0][0], shapes[0][1], frame, 10.0)
walls = [f for f in faces if len(f) == 4]
roof = [f for f in faces if len(f) == 3]
footprint = area([frame.xy(la, lo) for la, lo in shapes[0][0]])
hole = area([frame.xy(la, lo) for la, lo in shapes[0][1][0]])
roof_area = sum(area([verts[i][:2] for i in t]) for t in roof)
check("walls go round the outline and the courtyard", len(walls) == 8, len(walls))
check("the roof covers the building but not the courtyard",
      abs(roof_area - (abs(footprint) - abs(hole))) < 0.01 * abs(footprint),
      "%.1f m2 of %.1f" % (roof_area, abs(footprint) - abs(hole)))
check("every roof triangle faces up", all(area([verts[i][:2] for i in t]) > 0 for t in roof))
check("the roof sits at the building's height",
      all(verts[i][2] == 10.0 for t in roof for i in t))
# The normal of wall a-b is (dy, -dx); it should point away from the middle.
(ax, ay, _), (bx, by, _) = verts[walls[0][0]], verts[walls[0][1]]
cx = sum(v[0] for v in verts) / len(verts)
cy = sum(v[1] for v in verts) / len(verts)
check("outer walls face outwards",
      (by - ay) * ((ax + bx) / 2 - cx) + (ax - bx) * ((ay + by) / 2 - cy) > 0)

ell = [(43.7228, 10.3960), (43.7228, 10.3966), (43.7230, 10.3966),
       (43.7230, 10.3963), (43.7232, 10.3963), (43.7232, 10.3960)]
verts, faces = od.building_mesh(list(reversed(ell)), [], frame, 6.0)
check("an L-shaped roof is one upward face, whichever way it was drawn",
      sum(len(f) == 6 for f in faces) == 1
      and area([verts[i][:2] for i in faces[-1]]) > 0)

# --- whole OSM export ---------------------------------------------------------------
print("\n--- OSM export ---")
real_fetch = od.fetch_osm
od.fetch_osm = lambda *a: [courtyard, {"type": "way", "id": 9, "tags": {"building": "yes"},
                                       "geometry": [{"lat": a, "lon": b} for a, b in ell + ell[:1]]}]
report = od.export({"source": "osm", "bbox": BBOX, "job_dir": TMP}, quiet)
text = open(report.output_path).read()
check("each building is its own object",
      text.count("\no ") + text.startswith("o ") == 2, text.count("o osm_"))
check("guessed heights are reported", "1 of 2 had no height" in report.coverage_note,
      report.coverage_note)
check("the tallest building sets the height range", report.max_z_m == 10.0, report.max_z_m)
od.fetch_osm = lambda *a: []
check("an area without buildings says so",
      "no buildings" in (raises(od.export, {"source": "osm", "bbox": BBOX, "job_dir": TMP},
                                quiet) or ""))

# --- server fallback -----------------------------------------------------------------
print("\n--- fallback ---")
asked = []


def fake_get(url, data=None, timeout=0):
    asked.append(url)
    if "first" in url:
        raise urllib.error.HTTPError(url, 504, "busy", {}, None)
    if "second" in url:
        return b'{"remark": "runtime error: Query timed out", "elements": []}'
    return b'{"elements": [{"type": "way", "id": 1}]}'


od.fetch_osm = real_fetch
od._get = fake_get
od.OVERPASS_SERVERS = ["https://second/api", "https://third/api"]
elements = od.fetch_osm(BBOX, None, "https://first/api", quiet)
check("a busy server and a timed-out query fall through to the next",
      asked == ["https://first/api", "https://second/api", "https://third/api"]
      and len(elements) == 1, asked)
od.OVERPASS_SERVERS = ["https://second/api"]
message = raises(od.fetch_osm, BBOX, None, "https://first/api", quiet) or ""
check("when every server fails, the reasons are listed",
      "HTTP 504 (busy)" in message and "timed out" in message, message)

# --- SRTM ----------------------------------------------------------------------------
print("\n--- SRTM ---")
check("tile names", od.tile_name(43, 10) == "N43E010" and od.tile_name(-1, -70) == "S01W070")

SIZE = 11


def tile_bytes(void_at=None):
    # Height rises 10 m per row going south, so north is low.
    vals = [r * 10 for r in range(SIZE) for _ in range(SIZE)]
    if void_at is not None:
        vals[void_at] = od.SRTM_VOID
    return struct.pack(">%dh" % len(vals), *vals)


raw = tile_bytes()
zipped = io.BytesIO()
with zipfile.ZipFile(zipped, "w") as zf:
    zf.writestr("N43E010.hgt", raw)
for label, data, url in [("raw", raw, "x.hgt"), ("gzip", gzip.compress(raw), "x.hgt.gz"),
                         ("zip", zipped.getvalue(), "x.hgt.zip")]:
    size, grid = od.parse_hgt(data, "https://h/" + url)
    check("parses a %s tile" % label, size == SIZE and grid[SIZE * 3] == 30)
check("a file of the wrong size is refused", raises(od.parse_hgt, b"abc") is not None)

cache = os.path.join(TMP, "srtm-cache")
calls = []


def tile_get(url, data=None, timeout=0):
    calls.append(url)
    if "esa" in url:
        raise urllib.error.HTTPError(url, 404, "no", {}, None)
    return gzip.compress(raw)


od._get = tile_get
od.SRTM_SOURCES = ["https://esa/{tile}.zip", "https://aws/{lat}/{tile}.hgt.gz"]
first = od.load_tile("N43E010", "", cache, quiet)
second = od.load_tile("N43E010", "", cache, quiet)
check("a tile missing from one source comes from the next",
      calls == ["https://esa/N43E010.zip", "https://aws/N43/N43E010.hgt.gz"], calls)
check("a downloaded tile is cached, not fetched again",
      len(calls) == 2 and first[0] == second[0] and list(first[1]) == list(second[1]))
od._get = lambda url, data=None, timeout=0: (_ for _ in ()).throw(
    urllib.error.HTTPError(url, 404, "no", {}, None))
check("a tile no source has is the sea", od.load_tile("N00W140", "", None, quiet) is None)

od.load_tile = lambda name, *a: (SIZE, od.parse_hgt(tile_bytes(void_at=SIZE * 5 + 5))[1])
srtm_box = {"minLat": 43.40, "minLng": 10.40, "maxLat": 43.60, "maxLng": 10.60}
report = od.export({"source": "srtm", "bbox": srtm_box, "job_dir": TMP}, quiet)
check("terrain spans the heights in the area, lowest at Z=0",
      report.min_z_m == 0 and report.max_z_m == 20, (report.min_z_m, report.max_z_m))
check("north is lower than south, as in the tile",
      "Z=0 is 40 m above sea level" in report.coverage_note, report.coverage_note)
check("missing points are counted", "had no data" in report.coverage_note, report.coverage_note)
obj = open(report.output_path).read()
check("terrain is one object of quads",
      obj.count("o srtm_terrain") == 1 and all(len(l.split()) == 5 for l in obj.splitlines()
                                               if l.startswith("f ")))

od.load_tile = lambda *a: None
check("an area of open sea says so",
      "sea" in (raises(od.export, {"source": "srtm", "bbox": srtm_box, "job_dir": TMP}, quiet)
                or ""))
check("beyond 60°N is refused",
      "56°S to 60°N" in (raises(od.export, {"source": "srtm", "job_dir": TMP, "bbox": {
          "minLat": 61, "minLng": 10, "maxLat": 61.1, "maxLng": 10.1}}, quiet) or ""))

print("\n" + "=" * 62)
print("%d FAILED: %s" % (len(FAILURES), ", ".join(FAILURES)) if FAILURES
      else "ALL CHECKS PASSED")
print("=" * 62)
sys.exit(1 if FAILURES else 0)
