"""
Georeferencing maths for Google Earth OBJ dumps.

The exporter writes vertices in Google's globe frame: earth-centred, earth-fixed
(ECEF) metres on a *sphere* of radius 6371 km. Two consequences drive this
module:

1. Orientation. In ECEF, "up" at a given place is the radial direction, not +Z.
   A raw import therefore arrives tipped over by roughly (90 - latitude) degrees
   and spun by the longitude. The fix is a rotation into the local
   East / North / Up frame at the model's own centre.

2. Precision. Blender stores vertex coordinates as float32. At a magnitude of
   6.4e6 the gap between representable floats is ~0.5 m, so importing raw ECEF
   quantises the whole model into half-metre steps. Every transform here
   therefore runs on the OBJ *text* in float64, before Blender sees it.

After the ENU rotation the ground is still tilted, because a real hillside is
tilted and because the exported patch sits off to one side of the tangent point.
So we fit a plane to the ground and rotate that plane level. Terrain relief is
preserved; only the overall tilt is removed.

This module is deliberately free of `bpy` imports so it can be tested and run
outside Blender.
"""

from __future__ import annotations

import math

# ---------------------------------------------------------------------------
# vector / matrix helpers
#
# Plain tuples and loops: Blender add-ons cannot rely on numpy being importable,
# and the heavy per-vertex work happens in obj_transform.py where the matrix is
# already flattened into locals.
# ---------------------------------------------------------------------------

IDENTITY3 = ((1.0, 0.0, 0.0), (0.0, 1.0, 0.0), (0.0, 0.0, 1.0))


def norm(v):
    return math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])


def unit(v):
    n = norm(v)
    if n == 0.0:
        raise ValueError("cannot normalise a zero-length vector")
    return (v[0] / n, v[1] / n, v[2] / n)


def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0])


def matmul(a, b):
    """3x3 * 3x3, both row-major tuples of rows."""
    return tuple(
        tuple(sum(a[i][k] * b[k][j] for k in range(3)) for j in range(3))
        for i in range(3)
    )


def apply(m, v):
    """3x3 row-major matrix times a column vector."""
    return (m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
            m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
            m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2])


# ---------------------------------------------------------------------------
# geodesy
# ---------------------------------------------------------------------------

def ecef_to_latlon(p):
    """
    Spherical latitude/longitude in degrees for an ECEF point, plus its radius.

    Google's globe frame is a true sphere, so the geocentric latitude returned
    here is also the geodetic latitude - there is no ellipsoid correction to
    make, and the radial direction is exactly the local vertical.
    """
    x, y, z = p
    r = norm(p)
    if r == 0.0:
        return 0.0, 0.0, 0.0
    lat = math.degrees(math.asin(max(-1.0, min(1.0, z / r))))
    lon = math.degrees(math.atan2(y, x))
    return lat, lon, r


def enu_basis(origin_ecef):
    """
    Rotation taking ECEF offsets into the local tangent frame at `origin_ecef`.

    Rows are East, North, Up, which lands straight on Blender's convention:
    +X east, +Y north, +Z up.
    """
    up = unit(origin_ecef)

    # east = Z_ecef x up, which degenerates at the poles where east is undefined.
    east_raw = (-up[1], up[0], 0.0)
    if norm(east_raw) < 1e-12:
        # At a pole, fall back to the prime meridian so the result is at least
        # deterministic rather than a division by zero.
        east_raw = (1.0, 0.0, 0.0)
    east = unit(east_raw)
    north = cross(up, east)

    return (east, north, up)


# ---------------------------------------------------------------------------
# ground plane fitting
# ---------------------------------------------------------------------------

def _solve3(a, b):
    """Solve a 3x3 linear system by Gaussian elimination with partial pivoting."""
    m = [list(a[i]) + [b[i]] for i in range(3)]
    for col in range(3):
        piv = max(range(col, 3), key=lambda r: abs(m[r][col]))
        if abs(m[piv][col]) < 1e-14:
            return None
        m[col], m[piv] = m[piv], m[col]
        pv = m[col][col]
        for r in range(3):
            if r == col:
                continue
            f = m[r][col] / pv
            if f:
                for c in range(col, 4):
                    m[r][c] -= f * m[col][c]
    return tuple(m[i][3] / m[i][i] for i in range(3))


def _fit_plane(samples):
    """Least-squares fit of z = a*x + b*y + c. Returns (a, b, c) or None."""
    sxx = sxy = syy = sx = sy = sz = sxz = syz = 0.0
    n = 0
    for x, y, z in samples:
        sxx += x * x
        sxy += x * y
        syy += y * y
        sx += x
        sy += y
        sz += z
        sxz += x * z
        syz += y * z
        n += 1
    if n < 3:
        return None
    return _solve3(
        ((sxx, sxy, sx), (sxy, syy, sy), (sx, sy, float(n))),
        (sxz, syz, sz),
    )


def median(values):
    s = sorted(values)
    n = len(s)
    if not n:
        return 0.0
    mid = n // 2
    return s[mid] if n % 2 else 0.5 * (s[mid - 1] + s[mid])


def cells_to_samples(cell_min_z, cell_size):
    """Turn a {(i, j): min_z} grid into plane-fit samples at cell centres."""
    return [((i + 0.5) * cell_size, (j + 0.5) * cell_size, z)
            for (i, j), z in cell_min_z.items()]


def _refine_plane(samples, seed_c, iterations, reject_sigma, tol_floor, seed_band):
    """
    Trim-and-refit starting from the horizontal plane z = seed_c.

    The first trim is a fixed band around the seed rather than a spread-based
    one. That matters: the sample set is multi-modal, so a median-absolute-
    deviation computed across all of it is roughly the distance *between*
    surfaces, which would readmit every surface on the first pass and throw the
    seed away. Anchoring the first cut to the seed keeps each candidate on its
    own surface.

    Later passes widen or tighten using the MAD of the current inliers only, so
    genuinely uneven terrain can grow its inlier set while a different surface
    fifteen metres away stays out.

    Returns (plane, inliers, rms) or None if the seed has too little support.
    """
    keep = [s for s in samples if abs(s[2] - seed_c) <= seed_band]
    if len(keep) < 3:
        return None

    plane = _fit_plane(keep)
    if plane is None:
        return None

    for _ in range(iterations):
        a, b, c = plane
        kept_res = [s[2] - (a * s[0] + b * s[1] + c) for s in keep]
        mad = median([abs(r) for r in kept_res])
        tol = max(tol_floor, reject_sigma * 1.4826 * mad)

        trimmed = [s for s in samples
                   if abs(s[2] - (a * s[0] + b * s[1] + c)) <= tol]
        if len(trimmed) < 3:
            break
        converged = len(trimmed) == len(keep)
        keep = trimmed
        nxt = _fit_plane(keep)
        if nxt is None:
            break
        plane = nxt
        if converged:
            break

    a, b, c = plane
    residuals = [s[2] - (a * s[0] + b * s[1] + c) for s in keep]
    rms = (sum(r * r for r in residuals) / len(residuals)) ** 0.5 if residuals else 0.0
    return plane, keep, rms


def _support_profile(height_hist, hist_bin, c,
                     skirt=0.5, above=3.0, clearance=1.0):
    """
    Describe the geometry around a candidate ground height `c`.

    Returns (above_count, below_count, total), where `above_count` covers the
    band from `c - skirt` up to `c + above` and `below_count` is everything
    under `c - clearance`.

    The two numbers reject the two different impostors:

      * A tile clip plane is a thin flat sheet with a wide empty gap between it
        and the terrain, so almost nothing sits in the band above it. Real
        ground is continuous photogrammetry and that band is packed.
      * A roof also has a well-populated band just above it (its own surface
        detail), so "above" alone is not enough - a dense roof cluster can
        out-count the ground. What separates them is what lies beneath: nearly
        nothing under the true ground, but an entire building under a roof.
    """
    if not height_hist:
        return 0, 0, 0

    lo = int((c - skirt) // hist_bin)
    hi = int((c + above) // hist_bin)
    below_edge = int((c - clearance) // hist_bin)

    above_count = 0
    below_count = 0
    total = 0
    for b, n in height_hist.items():
        total += n
        if lo <= b <= hi:
            above_count += n
        if b < below_edge:
            below_count += n
    return above_count, below_count, total


def fit_ground_plane(samples, height_hist=None, hist_bin=0.5,
                     iterations=8, reject_sigma=2.5,
                     tol_floor=1.0, seed_bin=2.0, seed_band=3.0,
                     max_below_fraction=0.25):
    """
    Robust plane fit to per-cell ground height samples.

    Because the samples are per-cell *minimum* heights, buildings are largely
    excluded already: in any cell containing some ground, the ground is the
    lowest thing in it. Two things still fight the fit:

      * cells covered wall-to-wall by a building footprint, which report a roof
        height, and
      * Google's tile clip planes, which sit tens of metres *below* the ground
        as a broad, perfectly flat sheet and can easily occupy a quarter of the
        cells. These are the dangerous ones, since taking a per-cell minimum
        actively seeks them out.

    So rather than trusting a single least-squares seed, we try several
    candidate heights - the median plus the densest peaks of the height
    histogram - refine each by trim-and-refit, and score the results.

    When `height_hist` is supplied (a {bin_index: vertex_count} map over all
    vertex heights) candidates are ranked by how much geometry sits immediately
    above them, which reliably picks the ground out even when a clip plane
    covers most of the export. Without it, ranking falls back to inlier count.

    Returns (a, b, c, inliers) for the plane z = a*x + b*y + c, or None.
    """
    if len(samples) < 3:
        return None

    heights = [s[2] for s in samples]

    # Candidate seeds: the median (robust to up to half the samples being
    # outliers) plus the centres of the most populated height bins, which
    # covers the case where the ground is not the median surface.
    seeds = [median(heights)]
    hist = {}
    for z in heights:
        key = int(z // seed_bin)
        hist[key] = hist.get(key, 0) + 1
    for key, _count in sorted(hist.items(), key=lambda kv: (-kv[1], kv[0]))[:4]:
        seeds.append((key + 0.5) * seed_bin)

    best = None
    seen = []
    for seed_c in seeds:
        refined = _refine_plane(samples, seed_c, iterations, reject_sigma,
                                tol_floor, seed_band)
        if refined is None:
            continue
        plane, keep, rms = refined
        if len(keep) < 3:
            continue

        # Different seeds often converge on the same surface; keep one of each.
        if any(abs(plane[2] - c) < tol_floor for c in seen):
            continue
        seen.append(plane[2])

        if height_hist:
            above, below, total = _support_profile(height_hist, hist_bin, plane[2])
            # A surface with a large share of the model underneath it is a roof,
            # not the ground. Ranked first so no amount of surface detail can
            # promote a roof over the real ground.
            plausible = 1 if total and (below / total) <= max_below_fraction else 0
            score = (plausible, above, len(keep), -rms)
        else:
            score = (len(keep), -rms)

        if best is None or score > best[0]:
            best = (score, plane, keep)

    if best is None:
        return None

    (_, plane, keep) = best
    a, b, c = plane
    return a, b, c, keep


def rotation_from_axis_angle(axis, angle):
    """Rodrigues rotation matrix, row-major."""
    if angle == 0.0:
        return IDENTITY3
    ux, uy, uz = unit(axis)
    ct = math.cos(angle)
    st = math.sin(angle)
    vt = 1.0 - ct
    return (
        (ct + ux * ux * vt,      ux * uy * vt - uz * st, ux * uz * vt + uy * st),
        (uy * ux * vt + uz * st, ct + uy * uy * vt,      uy * uz * vt - ux * st),
        (uz * ux * vt - uy * st, uz * uy * vt + ux * st, ct + uz * uz * vt),
    )


def level_rotation(a, b):
    """
    Rotation that tips the plane z = a*x + b*y + c to horizontal.

    The plane's upward normal is (-a, -b, 1) normalised; we rotate that onto +Z
    along the shortest arc. That introduces no gratuitous spin about the
    vertical, so north stays north.

    Returns (matrix, angle_radians).
    """
    n = unit((-a, -b, 1.0))
    cos_t = max(-1.0, min(1.0, n[2]))
    angle = math.acos(cos_t)
    if angle < 1e-12:
        return IDENTITY3, 0.0

    axis = cross(n, (0.0, 0.0, 1.0))
    if norm(axis) < 1e-12:
        return IDENTITY3, 0.0

    return rotation_from_axis_angle(axis, angle), angle
