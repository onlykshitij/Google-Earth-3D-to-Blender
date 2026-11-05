"""
OpenStreetMap buildings and SRTM terrain, as alternatives to Google Earth.

Both are fetched and meshed on the worker thread and written straight to an OBJ
in the frame the Google pipeline ends in: metres, +X east, +Y north, +Z up,
origin at the centre of the area. The geometry is built level, so the
georeferencing and levelling in obj_transform are not needed.

Deliberately free of `bpy`, like jobs.py, so it runs and tests outside Blender.
"""

from __future__ import annotations

import gzip
import io
import json
import math
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from array import array

from . import hub, obj_transform

SOURCES = ("osm", "srtm")

USER_AGENT = ("google-map-export-bridge/%s "
              "(+https://github.com/onlykshitij/Google-Earth-3D-to-Blender)"
              % hub.VERSION)

# Public Overpass servers. Whichever was chosen in the interface goes first,
# then the rest in this order: each has days when it is at capacity. Kept in
# step with OVERPASS_SERVERS in web/src/lib/settings.ts.
OVERPASS_SERVERS = [
    "https://overpass-api.de/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]

# SRTM 1 arc-second tiles. {tile} becomes e.g. N43E010 and {lat} N43. Kept in
# step with SRTM_SOURCES in web/src/lib/settings.ts.
SRTM_SOURCES = [
    "https://step.esa.int/auxdata/dem/SRTMGL1/{tile}.SRTMGL1.hgt.zip",
    "https://s3.amazonaws.com/elevation-tiles-prod/skadi/{lat}/{tile}.hgt.gz",
]

# Matches the interface's estimate in web/src/lib/area.ts.
METRES_PER_DEGREE = 111_320.0
LEVEL_HEIGHT_M = 3.0
# For buildings with neither a height nor a level count: two storeys.
DEFAULT_HEIGHT_M = 6.0
# Terrain is thinned past this so a huge area stays importable.
MAX_TERRAIN_VERTS = 1_000_000
SRTM_VOID = -32768


# --- shared -------------------------------------------------------------------

def _servers(chosen, defaults):
    """The chosen address first, then the built-in ones. Only http(s) is used."""
    chosen = (chosen or "").strip()
    if chosen and urllib.parse.urlsplit(chosen).scheme not in ("http", "https"):
        raise RuntimeError("The data server address must start with https:// "
                           "(got %s)" % chosen)
    return ([chosen] if chosen else []) + [d for d in defaults if d != chosen]


def _get(url, data=None, timeout=120):
    req = urllib.request.Request(url, data=data,
                                 headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def _reason(exc):
    if isinstance(exc, urllib.error.HTTPError):
        return "HTTP %d%s" % (exc.code, " (busy)" if exc.code in (429, 502, 503, 504)
                              else "")
    if isinstance(exc, urllib.error.URLError):
        return str(exc.reason)
    return str(exc) or exc.__class__.__name__


class Frame:
    """Flat local frame around the centre of the area, in metres."""

    def __init__(self, bbox, scale=1.0):
        self.lat0 = (bbox["minLat"] + bbox["maxLat"]) * 0.5
        self.lng0 = (bbox["minLng"] + bbox["maxLng"]) * 0.5
        self.kx = math.cos(math.radians(self.lat0)) * METRES_PER_DEGREE * scale
        self.ky = METRES_PER_DEGREE * scale
        self.scale = scale

    def xy(self, lat, lng):
        return (lng - self.lng0) * self.kx, (lat - self.lat0) * self.ky


def _report(path, frame, verts, note):
    """The same report the Google pipeline gives, so the interface shows it."""
    r = obj_transform.ObjTransformResult()
    r.output_path = path
    r.vertex_count = r.referenced_count = len(verts)
    r.latitude, r.longitude = frame.lat0, frame.lng0
    if verts:
        xs, ys, zs = zip(*verts)
        r.size_x_m, r.size_y_m = max(xs) - min(xs), max(ys) - min(ys)
        r.min_z_m, r.max_z_m = min(zs), max(zs)
    r.relief_m = r.max_z_m
    if r.size_x_m * r.size_y_m > 0:
        r.vertex_density = len(verts) / (r.size_x_m * r.size_y_m)
    # Coverage is about Google's 2D fallback, which does not apply here.
    r.coverage, r.coverage_note = "3d", note
    return r


def _write_obj(path, objects):
    """`objects` is a list of (name, verts, faces) with 0-based face indices."""
    base = 1
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        for name, verts, faces in objects:
            fh.write("o %s\n" % name)
            for x, y, z in verts:
                fh.write("v %.3f %.3f %.3f\n" % (x, y, z))
            for face in faces:
                fh.write("f %s\n" % " ".join(str(base + i) for i in face))
            base += len(verts)


# --- OpenStreetMap buildings ----------------------------------------------------

def overpass_query(bbox, polygon=None):
    """Buildings in the area. A tilted area is asked for as a polygon."""
    if polygon:
        area = 'poly:"%s"' % " ".join("%.7f %.7f" % (lat, lng)
                                      for lat, lng in polygon)
    else:
        area = "%.7f,%.7f,%.7f,%.7f" % (bbox["minLat"], bbox["minLng"],
                                        bbox["maxLat"], bbox["maxLng"])
    return ('[out:json][timeout:90];('
            'way["building"]["building"!="no"](%s);'
            'relation["building"]["building"!="no"]["type"="multipolygon"](%s);'
            ');out geom;' % (area, area))


def fetch_osm(bbox, polygon, chosen, progress):
    """Ask each Overpass server in turn. Returns the elements of the first answer."""
    body = urllib.parse.urlencode({"data": overpass_query(bbox, polygon)}).encode()
    problems = []
    for url in _servers(chosen, OVERPASS_SERVERS):
        host = urllib.parse.urlsplit(url).hostname
        progress("Asking %s for buildings..." % host, 0.05)
        try:
            data = json.loads(_get(url, body))
        except (urllib.error.URLError, OSError, ValueError) as exc:
            problems.append("%s: %s" % (host, _reason(exc)))
            continue
        # A query that runs out of time still answers 200, with what it had.
        remark = str(data.get("remark") or "")
        if "error" in remark.lower():
            problems.append("%s: %s" % (host, remark[:120]))
            continue
        return data.get("elements") or []
    raise RuntimeError("No OpenStreetMap server could answer (%s). Pick another "
                       "server under Map settings, or try again later."
                       % "; ".join(problems))


def _metres(text):
    match = re.match(r"\s*(\d+(?:[.,]\d+)?)", str(text or ""))
    return float(match.group(1).replace(",", ".")) if match else None


def building_height(tags):
    """Returns (height in metres, guessed?)."""
    height = _metres(tags.get("height"))
    if height:
        return height, False
    levels = _metres(tags.get("building:levels"))
    if levels:
        return (levels + (_metres(tags.get("roof:levels")) or 0)) * LEVEL_HEIGHT_M, False
    return DEFAULT_HEIGHT_M, True


def _join_rings(segments):
    """Join way segments into closed rings of (lat, lon). Open ends are dropped."""
    pending = [list(s) for s in segments if len(s) >= 2]
    rings = []
    while pending:
        ring = pending.pop()
        while ring[0] != ring[-1]:
            for i, seg in enumerate(pending):
                if seg[0] == ring[-1]:
                    ring += seg[1:]
                elif seg[-1] == ring[-1]:
                    ring += seg[-2::-1]
                else:
                    continue
                del pending[i]
                break
            else:
                break
        if ring[0] == ring[-1] and len(ring) >= 4:
            rings.append(ring[:-1])
    return rings


def _area2(ring):
    """Twice the signed area; positive when counter-clockwise."""
    return sum(x0 * y1 - x1 * y0
               for (x0, y0), (x1, y1) in zip(ring, ring[1:] + ring[:1]))


def _contains(ring, point):
    x, y = point
    inside = False
    for (x0, y0), (x1, y1) in zip(ring, ring[1:] + ring[:1]):
        if (y0 > y) != (y1 > y) and x < (x1 - x0) * (y - y0) / (y1 - y0) + x0:
            inside = not inside
    return inside


def element_shapes(element):
    """An element's footprints as (outer, [holes]) rings of (lat, lon)."""
    point = lambda g: (g["lat"], g["lon"])
    if element.get("type") == "way":
        rings = _join_rings([[point(g) for g in element.get("geometry") or []]])
        return [(r, []) for r in rings]

    members = element.get("members") or []
    outers = _join_rings([[point(g) for g in m.get("geometry") or []]
                          for m in members if m.get("role") != "inner"])
    inners = _join_rings([[point(g) for g in m.get("geometry") or []]
                          for m in members if m.get("role") == "inner"])
    shapes = [(o, []) for o in outers]
    for hole in inners:
        for outer, holes in shapes:
            if _contains(outer, hole[0]):
                holes.append(hole)
                break
    return shapes


def _bridge(outer, holes):
    """
    Fold each hole into the outer ring through a zero-width cut, giving one
    ring that ear clipping can fill. Points are (index, x, y).
    """
    ring = list(outer)
    for hole in sorted(holes, key=lambda h: -max(p[1] for p in h)):
        hi = max(range(len(hole)), key=lambda i: hole[i][1])
        hx, hy = hole[hi][1], hole[hi][2]
        oi = min(range(len(ring)),
                 key=lambda i: (ring[i][1] - hx) ** 2 + (ring[i][2] - hy) ** 2)
        ring = ring[:oi + 1] + hole[hi:] + hole[:hi + 1] + ring[oi:]
    return ring


def _triangulate(ring):
    """Ear clipping of a counter-clockwise ring of (index, x, y). Returns index triples."""
    def cross(o, a, b):
        return (a[1] - o[1]) * (b[2] - o[2]) - (a[2] - o[2]) * (b[1] - o[1])

    work = list(ring)
    tris = []
    while len(work) > 3:
        for i in range(len(work)):
            a, b, c = work[i - 1], work[i], work[(i + 1) % len(work)]
            if cross(a, b, c) <= 1e-9:
                continue
            corners = {(a[1], a[2]), (b[1], b[2]), (c[1], c[2])}
            if any(cross(a, b, p) > 0 and cross(b, c, p) > 0 and cross(c, a, p) > 0
                   for p in work if (p[1], p[2]) not in corners):
                continue
            tris.append((a[0], b[0], c[0]))
            del work[i]
            break
        else:
            # shortcut: a self-touching outline stops clipping here and keeps the
            # roof it has; fine for real buildings, upgrade if roofs show holes.
            break
    if len(work) == 3 and cross(*work) > 1e-9:
        tris.append(tuple(p[0] for p in work))
    return tris


def building_mesh(outer, holes, frame, height):
    """Walls and a flat roof for one footprint. Returns (verts, faces)."""
    verts, faces, roof_rings = [], [], []
    for ring, want_ccw in [(outer, True)] + [(h, False) for h in holes]:
        pts = [frame.xy(lat, lng) for lat, lng in ring]
        if (_area2(pts) > 0) != want_ccw:
            pts.reverse()
        base = len(verts)
        n = len(pts)
        verts += [(x, y, 0.0) for x, y in pts]
        verts += [(x, y, height * frame.scale) for x, y in pts]
        for i in range(n):
            j = (i + 1) % n
            faces.append((base + i, base + j, base + n + j, base + n + i))
        roof_rings.append([(base + n + i, x, y) for i, (x, y) in enumerate(pts)])

    if holes:
        faces += _triangulate(_bridge(roof_rings[0], roof_rings[1:]))
    else:
        faces.append(tuple(p[0] for p in roof_rings[0]))
    return verts, faces


def osm_export(params, path, progress):
    bbox = params["bbox"]
    frame = Frame(bbox, params.get("scale", 1.0))
    elements = fetch_osm(bbox, params.get("polygon"), params.get("overpass_url"),
                         progress)

    progress("Extruding %d buildings..." % len(elements), 0.75)
    objects, all_verts, guessed = [], [], 0
    for element in elements:
        tags = element.get("tags") or {}
        height, was_guessed = building_height(tags)
        for k, (outer, holes) in enumerate(element_shapes(element)):
            verts, faces = building_mesh(outer, holes, frame, height)
            objects.append(("osm_%s_%s%s" % (element["type"], element["id"],
                                             "_%d" % k if k else ""),
                            verts, faces))
            all_verts += verts
        guessed += was_guessed

    if not objects:
        raise RuntimeError("OpenStreetMap has no buildings mapped in that area.")

    progress("Writing %d buildings..." % len(objects), 0.85)
    _write_obj(path, objects)
    note = ("Buildings from OpenStreetMap, with flat roofs. Data © OpenStreetMap "
            "contributors, ODbL.")
    if guessed:
        note += (" %d of %d had no height or level count, so they are %.0f m tall."
                 % (guessed, len(elements), DEFAULT_HEIGHT_M))
    return _report(path, frame, all_verts, note)


# --- SRTM terrain ---------------------------------------------------------------

def tile_name(lat, lng):
    """Name of the 1-degree tile whose south-west corner is (lat, lng)."""
    return "%s%02d%s%03d" % ("N" if lat >= 0 else "S", abs(lat),
                             "E" if lng >= 0 else "W", abs(lng))


def parse_hgt(raw, url=""):
    """Unpack a downloaded tile into a square grid of big-endian int16 heights."""
    path = urllib.parse.urlsplit(url).path
    if path.endswith(".zip"):
        with zipfile.ZipFile(io.BytesIO(raw)) as zf:
            name = next(n for n in zf.namelist() if n.lower().endswith(".hgt"))
            raw = zf.read(name)
    elif path.endswith(".gz"):
        raw = gzip.decompress(raw)
    size = int(math.isqrt(len(raw) // 2))
    if size < 2 or size * size * 2 != len(raw):
        raise ValueError("not an SRTM tile (%d bytes)" % len(raw))
    grid = array("h")
    grid.frombytes(raw)
    if sys.byteorder == "little":
        grid.byteswap()
    return size, grid


def load_tile(name, chosen, cache_dir, progress):
    """A tile's (size, grid), or None where no source has one: the sea."""
    cached = os.path.join(cache_dir, name + ".hgt") if cache_dir else ""
    if cached and os.path.isfile(cached):
        with open(cached, "rb") as fh:
            return parse_hgt(fh.read())

    problems = []
    for template in _servers(chosen, SRTM_SOURCES):
        url = template.replace("{tile}", name).replace("{lat}", name[:3])
        progress("Downloading terrain tile %s from %s..."
                 % (name, urllib.parse.urlsplit(url).hostname), 0.1)
        try:
            raw = _get(url, timeout=180)
            size, grid = parse_hgt(raw, url)
        except urllib.error.HTTPError as exc:
            if exc.code == 404:
                continue
            problems.append(_reason(exc))
            continue
        except (urllib.error.URLError, OSError, ValueError, StopIteration) as exc:
            problems.append(_reason(exc))
            continue
        if cached:
            os.makedirs(cache_dir, exist_ok=True)
            with open(cached + ".part", "wb") as fh:
                big = array("h", grid)
                if sys.byteorder == "little":
                    big.byteswap()
                fh.write(big.tobytes())
            os.replace(cached + ".part", cached)
        return size, grid

    if problems:
        raise RuntimeError("Could not download SRTM tile %s (%s). Pick another "
                           "source under Map settings, or try again later."
                           % (name, "; ".join(problems)))
    return None


def srtm_export(params, path, progress):
    bbox = params["bbox"]
    frame = Frame(bbox, params.get("scale", 1.0))
    lat0, lat1 = bbox["minLat"], bbox["maxLat"]
    lng0, lng1 = bbox["minLng"], bbox["maxLng"]
    if lat1 > 60.0 or lat0 < -56.0:
        raise RuntimeError("SRTM only covers 56°S to 60°N.")

    tiles = {}
    for ty in range(math.floor(lat0), math.floor(lat1) + 1):
        for tx in range(math.floor(lng0), math.floor(lng1) + 1):
            tiles[(ty, tx)] = load_tile(tile_name(ty, tx), params.get("srtm_url"),
                                        params.get("srtm_cache"), progress)
    if not any(tiles.values()):
        raise RuntimeError("SRTM has no data here. It has no tiles over the sea.")

    # One arc-second, thinned until the grid fits.
    def span(step):
        # The last row and column are clamped onto the far edge.
        return (max(2, math.ceil((lat1 - lat0) / step) + 1),
                max(2, math.ceil((lng1 - lng0) / step) + 1))

    step = 1.0 / 3600.0
    rows, cols = span(step)
    step *= max(1, math.ceil(math.sqrt(rows * cols / MAX_TERRAIN_VERTS)))
    rows, cols = span(step)

    progress("Sampling %d x %d terrain points..." % (cols, rows), 0.75)
    heights, voids = [], 0
    for r in range(rows):
        lat = min(lat1, lat0 + r * step)
        for c in range(cols):
            lng = min(lng1, lng0 + c * step)
            ty, tx = math.floor(lat), math.floor(lng)
            tile = tiles.get((ty, tx))
            if tile is None:
                heights.append(0)       # sea level where there is no tile
                continue
            size, grid = tile
            row = round((ty + 1 - lat) * (size - 1))
            col = round((lng - tx) * (size - 1))
            h = grid[row * size + col]
            if h == SRTM_VOID:
                voids += 1
                h = None
            heights.append(h)

    valid = [h for h in heights if h is not None]
    floor = min(valid) if valid else 0
    verts = []
    for r in range(rows):
        lat = min(lat1, lat0 + r * step)
        for c in range(cols):
            x, y = frame.xy(lat, min(lng1, lng0 + c * step))
            h = heights[r * cols + c]
            verts.append((x, y, ((floor if h is None else h) - floor) * frame.scale))
    faces = [(r * cols + c, r * cols + c + 1, (r + 1) * cols + c + 1, (r + 1) * cols + c)
             for r in range(rows - 1) for c in range(cols - 1)]

    progress("Writing terrain...", 0.85)
    _write_obj(path, [("srtm_terrain", verts, faces)])
    note = ("SRTM terrain at %.0f m spacing. Z=0 is %d m %s sea level."
            % (step * METRES_PER_DEGREE, abs(floor), "below" if floor < 0 else "above"))
    if voids:
        note += " %d points had no data and sit at the lowest height." % voids
    return _report(path, frame, verts, note)


def export(params, progress):
    """
    Fetch and mesh `params["source"]` into `<job_dir>/model_blender.obj`.

    `progress(message, fraction)` reports with fraction 0..0.92, the share before
    Blender imports. Returns an obj_transform.ObjTransformResult.
    """
    os.makedirs(params["job_dir"], exist_ok=True)
    path = os.path.join(params["job_dir"], "model_blender.obj")
    build = osm_export if params["source"] == "osm" else srtm_export
    return build(params, path, progress)
