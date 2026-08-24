"""
Rewrite an exported Google Earth OBJ into a Blender-ready local frame.

Runs three streaming passes over the file so that memory stays proportional to
the ground grid rather than to the vertex count (a level-20 export can reach
hundreds of megabytes):

  pass 1  accumulate the ECEF centroid, which becomes the local origin, and
          mark which vertices any face actually refers to
  pass 2  project the referenced vertices into East/North/Up and record the
          lowest height in each ground cell
  pass 3  fit and remove the ground tilt, then write the transformed file

Pass 1 tracks face references because the exporter emits every vertex of a node
but then omits the triangles covered by a finer child node, leaving a
substantial minority of vertices unused - about 14% in testing. Blender's
importer drops those, and some of them are the lowest point in their ground
cell, so fitting the plane to them levels against geometry that never reaches
the scene and leaves a fraction of a degree of tilt behind.

Normals are dropped. The exporter multiplies vertices by the node's
`matrixGlobeFromMesh` but leaves normals on an identity matrix (see
`writeMeshOBJ` in the exporter's dump-obj.ts), so the `vn` values are stranded
in per-node mesh space and disagree with the vertices they belong to. Letting
Blender derive normals from the geometry gives correct shading instead.
"""

from __future__ import annotations

import os
from array import array

from . import georef

# Bin width for the all-vertex height histogram used to tell the real ground
# apart from Google's tile clip planes. Fine enough to resolve the empty gap
# above a clip sheet, coarse enough to stay a small dict.
HIST_BIN_M = 0.5


class ObjTransformResult:
    """Report of what the rewrite did, for logging and UI feedback."""

    def __init__(self):
        self.output_path = ""
        self.vertex_count = 0
        self.referenced_count = 0
        self.latitude = 0.0
        self.longitude = 0.0
        self.radius_m = 0.0
        self.tilt_removed_deg = 0.0
        self.ground_cells = 0
        self.ground_inliers = 0
        self.ground_rms_m = 0.0
        self.size_x_m = 0.0
        self.size_y_m = 0.0
        self.min_z_m = 0.0
        self.max_z_m = 0.0
        self.trimmed_faces = 0
        self.coverage = "unknown"
        self.coverage_note = ""
        self.vertex_density = 0.0
        self.relief_m = 0.0

    def summary(self) -> str:
        return (
            "{:,} of {:,} verts used | {:.6f}, {:.6f} | {:.0f} x {:.0f} m | "
            "height {:.1f}..{:.1f} m | tilt removed {:.3f} deg | "
            "ground {}/{} cells, rms {:.2f} m".format(
                self.referenced_count, self.vertex_count,
                self.latitude, self.longitude,
                self.size_x_m, self.size_y_m, self.min_z_m, self.max_z_m,
                self.tilt_removed_deg, self.ground_inliers, self.ground_cells,
                self.ground_rms_m,
            )
            + " | {:.2f} verts/m2, relief {:.1f} m, coverage {}".format(
                self.vertex_density, self.relief_m, self.coverage)
            + (" | trimmed {:,} sub-ground faces".format(self.trimmed_faces)
               if self.trimmed_faces else "")
        )


# --- coverage assessment ----------------------------------------------------
#
# Google only has photogrammetry for part of the world. Elsewhere Earth falls
# back to draped satellite imagery over a coarse terrain mesh - the "2D" case -
# and the exporter happily returns that, because from its point of view tiles
# exist and geometry was produced. The result imports without error but is a
# textured sheet with no buildings on it, which is not what anyone asked for.
#
# Nothing in the data says which kind it is, so it is inferred from two
# measurements that separate the cases cleanly in practice:
#
#   relief   how far the tallest geometry rises above the fitted ground. Real
#            photogrammetry of a built-up area has buildings and trees in it;
#            draped terrain over a few hundred metres is nearly flat.
#   density  vertices per square metre. Level-20 photogrammetry runs to several
#            per square metre; a coarse terrain sheet is orders of magnitude
#            below that.

# Below this, there is nothing standing up out of the ground.
FLAT_RELIEF_M = 4.0
# Below this, the mesh is too coarse to be building-level detail.
SPARSE_DENSITY = 0.35
# A comfortably detailed result.
GOOD_DENSITY = 1.5


def assess_coverage(relief_m, density, requested_level, achieved_level=None):
    """
    Guess whether an export is real 3D or Google's flat fallback.

    Returns (coverage, note) where coverage is one of "3d", "sparse" or "flat".
    The note is written for the person who asked for the export.
    """
    shortfall = None
    if achieved_level and requested_level and achieved_level < requested_level:
        shortfall = requested_level - achieved_level

    if relief_m < FLAT_RELIEF_M and density < SPARSE_DENSITY:
        note = ("This looks like Google's 2D fallback: draped imagery over flat "
                "terrain, with no buildings. Google has no 3D coverage here.")
        if shortfall:
            note += (" The finest detail available was level %d, not %d."
                     % (achieved_level, requested_level))
        return "flat", note

    if density < SPARSE_DENSITY:
        note = ("Very coarse geometry - %.2f vertices per m2. Google may only "
                "have low-detail terrain for this area." % density)
        if shortfall:
            note += (" The finest level available was %d, not %d."
                     % (achieved_level, requested_level))
        return "sparse", note

    if relief_m < FLAT_RELIEF_M:
        return "sparse", ("Detailed mesh but almost no vertical relief (%.1f m). "
                          "This may be open ground rather than a built-up area."
                          % relief_m)

    if density < GOOD_DENSITY or shortfall:
        note = "Usable 3D, but coarser than a city centre at full detail."
        if shortfall:
            note = ("Google's finest level here is %d, not %d, so the result is "
                    "coarser than a full-detail export."
                    % (achieved_level, requested_level))
        return "sparse", note

    return "3d", ""


def _face_below(line, vert_z, cutoff):
    """True when every vertex of the face sits below `cutoff`."""
    count = len(vert_z)
    saw_one = False
    for tok in line.split()[1:]:
        try:
            idx = int(tok.partition("/")[0])
        except ValueError:
            continue
        pos = count + idx if idx < 0 else idx - 1
        if not 0 <= pos < count:
            return False
        saw_one = True
        if vert_z[pos] >= cutoff:
            return False
    return saw_one


def _mark_face(line, still_used):
    """Flag every vertex a surviving face refers to."""
    count = len(still_used)
    for tok in line.split()[1:]:
        try:
            idx = int(tok.partition("/")[0])
        except ValueError:
            continue
        pos = count + idx if idx < 0 else idx - 1
        if 0 <= pos < count:
            still_used[pos] = 1


def _strip_face_normals(line: str) -> str:
    """Turn `f a/u/n b/u/n c/u/n` into `f a/u b/u c/u`."""
    out = ["f"]
    for tok in line.split()[1:]:
        if "/" in tok:
            tok = tok.rsplit("/", 1)[0]
            if tok.endswith("/"):
                tok = tok[:-1]
        out.append(tok)
    return " ".join(out) + "\n"


def transform_obj(src_path,
                  dst_path=None,
                  level_ground=True,
                  ground_cell_size=4.0,
                  scale=1.0,
                  drop_normals=True,
                  trim_below=0.0,
                  requested_level=None,
                  achieved_level=None,
                  progress=None):
    """
    Georeference `src_path` and write the result next to it.

    `dst_path` defaults to `<src stem>_blender.obj` in the same directory, which
    matters: the file keeps its original `mtllib model.mtl` line, and the
    material library's texture paths are relative to that directory.

    `scale` is applied last, so 1.0 leaves one Blender unit equal to one metre.

    `trim_below`, when positive and the ground has been levelled, discards faces
    lying entirely more than that many metres below the ground plane. Google's
    tiles carry a flat clip sheet tens of metres under the terrain which is
    otherwise left dangling beneath the model. Real sunken ground - a riverbank
    or an underpass - would also be cut, so the caller decides.
    """
    if dst_path is None:
        stem, ext = os.path.splitext(src_path)
        dst_path = stem + "_blender" + ext

    result = ObjTransformResult()
    result.output_path = dst_path

    def note(msg):
        if progress:
            progress(msg)

    # ---- pass 1: centroid in ECEF, and which vertices faces use -----------
    note("Reading vertices...")
    sx = sy = sz = 0.0
    count = 0
    referenced = bytearray()

    with open(src_path, "r", encoding="utf-8", errors="replace") as fh:
        for line in fh:
            head = line[:2]
            if head == "v ":
                p = line.split()
                sx += float(p[1])
                sy += float(p[2])
                sz += float(p[3])
                count += 1
                referenced.append(0)
            elif head == "f ":
                for tok in line.split()[1:]:
                    try:
                        idx = int(tok.partition("/")[0])
                    except ValueError:
                        continue
                    # OBJ indices are 1-based, and may be negative to count back
                    # from the most recent vertex.
                    pos = count + idx if idx < 0 else idx - 1
                    if 0 <= pos < count:
                        referenced[pos] = 1

    if count == 0:
        raise ValueError("no vertices found in {} - the export produced no geometry"
                         .format(src_path))

    origin = (sx / count, sy / count, sz / count)
    result.vertex_count = count
    result.referenced_count = sum(referenced)
    result.latitude, result.longitude, result.radius_m = georef.ecef_to_latlon(origin)

    # ---- pass 2: ENU projection and ground grid ----------------------------
    r1 = georef.enu_basis(origin)
    total = r1
    z_offset = 0.0

    if level_ground:
        note("Sampling ground ({:,} verts)...".format(count))
        e0, e1, e2 = r1[0]
        n0, n1, n2 = r1[1]
        u0, u1, u2 = r1[2]
        ox, oy, oz = origin
        inv_cell = 1.0 / ground_cell_size
        inv_hist = 1.0 / HIST_BIN_M
        cell_min_z = {}
        height_hist = {}
        index = -1

        with open(src_path, "r", encoding="utf-8", errors="replace") as fh:
            for line in fh:
                if line[:2] != "v ":
                    continue
                index += 1
                # Vertices no face uses never reach Blender, so letting them
                # influence the ground plane would level against nothing.
                if not referenced[index]:
                    continue
                p = line.split()
                dx = float(p[1]) - ox
                dy = float(p[2]) - oy
                dz = float(p[3]) - oz
                x = e0 * dx + e1 * dy + e2 * dz
                y = n0 * dx + n1 * dy + n2 * dz
                z = u0 * dx + u1 * dy + u2 * dz

                # `// 1` on a float floors it, so negative coordinates land in
                # the cell below zero rather than being truncated towards it.
                key = (int(x * inv_cell // 1), int(y * inv_cell // 1))
                cur = cell_min_z.get(key)
                if cur is None or z < cur:
                    cell_min_z[key] = z

                hb = int(z * inv_hist // 1)
                height_hist[hb] = height_hist.get(hb, 0) + 1

        result.ground_cells = len(cell_min_z)
        samples = georef.cells_to_samples(cell_min_z, ground_cell_size)
        fit = georef.fit_ground_plane(samples, height_hist=height_hist,
                                      hist_bin=HIST_BIN_M)

        if fit is not None:
            a, b, c, inliers = fit
            result.ground_inliers = len(inliers)

            r2, angle = georef.level_rotation(a, b)
            result.tilt_removed_deg = angle * 180.0 / 3.141592653589793
            total = georef.matmul(r2, r1)

            # Residual spread of the inliers about the fitted plane, as a
            # confidence signal on the fit.
            if inliers:
                acc = 0.0
                for x, y, z in inliers:
                    r = z - (a * x + b * y + c)
                    acc += r * r
                result.ground_rms_m = (acc / len(inliers)) ** 0.5

            # Drop the levelled ground to z = 0. Rotating any point of the
            # fitted plane gives its new height; use the inlier centroid so the
            # reference point sits inside the actual data.
            if inliers:
                cx = sum(s[0] for s in inliers) / len(inliers)
                cy = sum(s[1] for s in inliers) / len(inliers)
            else:
                cx = cy = 0.0
            cz = a * cx + b * cy + c
            z_offset = georef.apply(r2, (cx, cy, cz))[2]
        else:
            note("Ground fit failed; keeping the tangent plane as-is.")

    # ---- pass 3: write ------------------------------------------------------
    note("Writing georeferenced OBJ...")
    m00, m01, m02 = total[0]
    m10, m11, m12 = total[1]
    m20, m21, m22 = total[2]
    ox, oy, oz = origin

    min_x = min_y = min_z = float("inf")
    max_x = max_y = max_z = float("-inf")
    index = -1

    # Only meaningful once the ground is at z = 0.
    trimming = bool(trim_below and trim_below > 0.0 and level_ground)
    cutoff = -abs(trim_below) * scale
    trimmed_faces = 0

    # Heights are kept so that a face can be judged when its line is reached.
    # The exporter always writes a mesh's vertices before the faces that use
    # them, so every index a face names has already been recorded.
    #
    # A face only goes if *all* of its vertices are below the cut - there is no
    # splitting geometry here - so a skirt face straddling the cut survives and
    # drags its lower vertices along with it. The extents therefore cannot be
    # decided while streaming: they are computed afterwards over exactly the
    # vertices that some surviving face still uses.
    vert_x = array("f") if trimming else None
    vert_y = array("f") if trimming else None
    vert_z = array("f") if trimming else None
    still_used = bytearray() if trimming else None

    with open(src_path, "r", encoding="utf-8", errors="replace") as src, \
            open(dst_path, "w", encoding="utf-8", newline="\n") as dst:
        for line in src:
            head = line[:2]

            if head == "v ":
                index += 1
                p = line.split()
                dx = float(p[1]) - ox
                dy = float(p[2]) - oy
                dz = float(p[3]) - oz
                x = (m00 * dx + m01 * dy + m02 * dz) * scale
                y = (m10 * dx + m11 * dy + m12 * dz) * scale
                z = (m20 * dx + m21 * dy + m22 * dz - z_offset) * scale

                if trimming:
                    vert_x.append(x)
                    vert_y.append(y)
                    vert_z.append(z)
                    still_used.append(0)
                elif referenced[index]:
                    # Unused vertices are still written, since dropping them
                    # would mean renumbering every face, but they are not part
                    # of the model and must not stretch its reported bounds.
                    if x < min_x:
                        min_x = x
                    if x > max_x:
                        max_x = x
                    if y < min_y:
                        min_y = y
                    if y > max_y:
                        max_y = y
                    if z < min_z:
                        min_z = z
                    if z > max_z:
                        max_z = z

                dst.write("v %.6f %.6f %.6f\n" % (x, y, z))

            elif head == "vn":
                if not drop_normals:
                    dst.write(line)

            elif head == "f ":
                if trimming:
                    if _face_below(line, vert_z, cutoff):
                        trimmed_faces += 1
                        continue
                    _mark_face(line, still_used)
                dst.write(_strip_face_normals(line) if drop_normals else line)

            else:
                dst.write(line)

    if trimming:
        for i, used in enumerate(still_used):
            if not used:
                continue
            x, y, z = vert_x[i], vert_y[i], vert_z[i]
            if x < min_x:
                min_x = x
            if x > max_x:
                max_x = x
            if y < min_y:
                min_y = y
            if y > max_y:
                max_y = y
            if z < min_z:
                min_z = z
            if z > max_z:
                max_z = z

    if min_x > max_x:
        raise ValueError("every face was trimmed away - try a smaller cut depth")

    result.trimmed_faces = trimmed_faces
    result.size_x_m = max_x - min_x
    result.size_y_m = max_y - min_y
    result.min_z_m = min_z
    result.max_z_m = max_z

    # Relief is measured from the ground plane, which levelling put at zero, so
    # the tallest thing above it is simply max_z. Without levelling there is no
    # such reference, so fall back to the overall height span.
    result.relief_m = max_z if level_ground else (max_z - min_z)

    footprint = result.size_x_m * result.size_y_m
    if footprint > 0:
        result.vertex_density = result.referenced_count / footprint

    result.coverage, result.coverage_note = assess_coverage(
        result.relief_m, result.vertex_density, requested_level, achieved_level)

    return result
