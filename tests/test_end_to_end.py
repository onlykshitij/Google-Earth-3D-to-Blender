"""
End-to-end test of the packaged add-on, inside Blender.

    python build.py
    blender --background --factory-startup --online-mode \
            --python tests/test_end_to_end.py -- dist/google-map-export-bridge-1.0.0.zip

The zip is unpacked to a temporary folder and loaded from there, so the test
exercises the artifact that actually ships without touching your Blender
configuration. It then drives an export exactly as the map interface does -
over HTTP, through the hub - and inspects what lands in the scene.

This downloads a small area from Google Earth, so it needs a network
connection and takes a few minutes.
"""

import glob
import json
import math
import os
import shutil
import sys
import tempfile
import time
import urllib.error
import urllib.request
import zipfile

import bpy

FAILURES = []


def check(label, ok, detail=""):
    print("[%s] %s%s" % ("ok  " if ok else "FAIL", label,
                         (" - " + str(detail)) if detail else ""))
    if not ok:
        FAILURES.append(label)
    return ok


def find_zip():
    for arg in reversed(sys.argv):
        if arg.endswith(".zip") and os.path.isfile(arg):
            return os.path.abspath(arg)
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    found = sorted(glob.glob(os.path.join(root, "dist", "*.zip")))
    if not found:
        sys.exit("No add-on zip found. Run: python build.py")
    return found[-1]


ZIP = find_zip()
WORK = tempfile.mkdtemp(prefix="gmeb-e2e-")
print("Blender", bpy.app.version_string,
      "| online:", getattr(bpy.app, "online_access", None))
print("testing", ZIP)

with zipfile.ZipFile(ZIP) as zf:
    names = zf.namelist()
    zf.extractall(WORK)

check("zip contains the exporter bundle",
      any(n.endswith("exporter/earth-export.cjs") for n in names))
check("zip contains the built interface",
      any(n.endswith("web/index.html") for n in names))
check("zip contains no node_modules", not any("node_modules" in n for n in names))
check("zip contains no bytecode", not any(n.endswith(".pyc") for n in names))

sys.path.insert(0, WORK)

import addon_utils  # noqa: E402

addon_utils.enable("google_map_export_bridge", default_set=True, persistent=True)
mod = sys.modules.get("google_map_export_bridge")
check("add-on loads from the package", mod is not None)
check("scene properties registered", hasattr(bpy.context.scene, "gmeb"))
check("operators registered", hasattr(bpy.ops.gmeb, "export"))

prefs = bpy.context.preferences.addons["google_map_export_bridge"].preferences
node = prefs.resolved_node()
check("node.js located", bool(node), node or "not found")

from google_map_export_bridge import agent, connect, georef, jobs, launch  # noqa: E402

# Keep off the default port so a real Blender running alongside is unaffected.
prefs.port = 8899

url, hosting, error = launch.connect_hub(bpy.context)
check("hub started", not error and hosting, error or url)
BASE = url.rstrip("/")


def get(path):
    with urllib.request.urlopen(BASE + path, timeout=8) as r:
        return json.loads(r.read().decode())


def post(path, payload):
    req = urllib.request.Request(BASE + path, data=json.dumps(payload).encode(),
                                headers={"Content-Type": "application/json"},
                                method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())


def pump(seconds):
    """Drive the add-on's timer by hand; background Blender runs no timers."""
    deadline = time.time() + seconds
    while time.time() < deadline:
        mod._tick()
        time.sleep(0.2)


# The agent needs a moment to register with the hub it just started.
pump(4)

session = get("/api/session")
check("session issues a token", bool(session.get("token")))

instances = get("/api/instances")["instances"]
check("this Blender registered itself", len(instances) == 1,
      "%d instance(s)" % len(instances))
if instances:
    info = instances[0]["info"]
    check("instance reports its identity",
          bool(info.get("blenderVersion")) and info.get("hosting") is True, info)
    check("instance reports node availability", info.get("nodeFound") is True)
    check("the detail level offered is capped at 20",
          (info.get("defaults") or {}).get("level", 0) <= 20,
          (info.get("defaults") or {}).get("level"))

instance_id = instances[0]["id"] if instances else ""

# --- folder browsing, answered by the agent on this machine ------------------
import threading  # noqa: E402

browse_result = {}


def do_browse(path):
    """Browse from another thread: the request blocks until the agent answers."""
    def run():
        try:
            browse_result[path] = post("/api/browse", {
                "token": session["token"],
                "instanceId": instance_id,
                "path": path,
            })
        except Exception as exc:                        # noqa: BLE001
            browse_result[path] = (0, {"error": str(exc)})

    worker = threading.Thread(target=run, daemon=True)
    worker.start()
    # The agent answers on its own thread, but the add-on's timer still has to
    # be driven for everything else, so keep pumping while waiting.
    for _ in range(120):
        if path in browse_result:
            break
        mod._tick()
        time.sleep(0.1)
    worker.join(timeout=2)
    return browse_result.get(path, (0, {"error": "no answer"}))

here = os.path.dirname(os.path.abspath(__file__))
status, body = do_browse(here)
check("browse lists a real folder",
      status == 200 and body.get("path") == here, body.get("error") or status)
check("browse returns only folders",
      all("." not in e["name"] or os.path.isdir(e["path"])
          for e in body.get("entries", [])),
      "%d entries" % len(body.get("entries", [])))
check("browse offers roots to start from", len(body.get("roots") or []) > 0,
      body.get("roots"))
check("browse reports whether it can be written to",
      body.get("writable") is True)

status, body = do_browse(os.path.join(here, "definitely-not-there"))
check("browsing a missing folder explains itself",
      status == 400 and "not a folder" in (body.get("error") or ""),
      body.get("error"))


# --- run an export exactly as the interface does -----------------------------
BBOX = {"minLat": 43.72300, "minLng": 10.39400,
        "maxLat": 43.72325, "maxLng": 10.39432}

status, resp = post("/api/export", {
    "token": session["token"],
    "instanceId": instance_id,
    "bbox": BBOX,
    "options": {"level": 20, "levelGround": True, "groundCellSize": 4.0,
                "scale": 1.0, "trimSubGround": True, "trimDepth": 2.0,
                "shadeSmooth": True,
                "replacePrevious": True, "collectionName": "E2E"},
})
check("export accepted", status == 200 and resp.get("accepted"), resp)

print("\nrunning...")
deadline = time.time() + 900
last = None
while time.time() < deadline:
    mod._tick()
    job = jobs.MANAGER.job
    if job is not None:
        tag = (job.phase, job.message)
        if tag != last:
            last = tag
            print("   %-12s %5.1f%%  %s" % (job.phase, job.progress * 100,
                                            job.message[:60]))
        if job.phase in jobs.TERMINAL_PHASES:
            break
    time.sleep(0.25)

job = jobs.MANAGER.job
check("export completed", job is not None and job.phase == jobs.PHASE_DONE,
      job.phase if job else "no job")
if job and job.error:
    print("     error:", job.error)

# --- inspect the scene -------------------------------------------------------
if job and job.phase == jobs.PHASE_DONE:
    print("\n   ", job.report.summary(), "\n")

    coll = bpy.data.collections.get("E2E")
    check("collection created", coll is not None)
    objs = [o for o in (coll.objects if coll else []) if o.type == "MESH"]
    check("objects imported", len(objs) > 0, "%d meshes" % len(objs))

    xs, ys, zs = [], [], []
    for obj in objs:
        mw = obj.matrix_world
        for v in obj.data.vertices:
            co = mw @ v.co
            xs.append(co.x)
            ys.append(co.y)
            zs.append(co.z)
    check("has geometry", len(zs) > 500, "%d verts" % len(zs))

    # Local metric frame, not earth-centred.
    check("not in ECEF coordinates",
          max(max(abs(x) for x in xs), max(abs(y) for y in ys)) < 100_000,
          "max |xy| = %.1f m" % max(max(abs(x) for x in xs),
                                    max(abs(y) for y in ys)))
    span_x, span_y = max(xs) - min(xs), max(ys) - min(ys)
    check("real-world scale", 10 < span_x < 2000 and 10 < span_y < 2000,
          "%.1f x %.1f m" % (span_x, span_y))

    # The ground must be level and at Z=0. Fit it the same way the add-on does,
    # scoring candidate surfaces by the geometry sitting just above them.
    cells, hist = {}, {}
    for x, y, z in zip(xs, ys, zs):
        key = (int(x // 4), int(y // 4))
        if key not in cells or z < cells[key]:
            cells[key] = z
        b = int(z // 0.5)
        hist[b] = hist.get(b, 0) + 1
    samples = georef.cells_to_samples(cells, 4.0)
    fit = georef.fit_ground_plane(samples, height_hist=hist, hist_bin=0.5)
    check("ground plane found", fit is not None)
    if fit:
        a, b, c, inliers = fit
        tilt = math.degrees(georef.level_rotation(a, b)[1])
        check("ground is level", tilt < 0.15, "residual tilt %.4f deg" % tilt)
        check("ground sits at Z=0", abs(c) < 1.0, "c = %.3f m" % c)

    check("buildings extend upward", max(zs) > 5, "max z %.1f m" % max(zs))
    check("sub-ground geometry trimmed", min(zs) > -12,
          "min z %.1f m" % min(zs))
    check("objects are selectable by default",
          all(not o.hide_select for o in objs))

    # A texture that decodes to black is the thing that looks like a hole.
    import struct as _struct

    def _mostly_black(path):
        with open(path, "rb") as fh:
            data = fh.read()
        if data[:2] != b"BM":
            return False
        offset = _struct.unpack_from("<I", data, 10)[0]
        px = data[offset:]
        step = max(3, (len(px) // 3000) * 3)
        vals = [max(px[i:i + 3]) for i in range(0, len(px) - 3, step)]
        return bool(vals) and sum(1 for v in vals if v < 6) / len(vals) > 0.95

    tex_dir = job.output_dir or ""
    tex_files = [os.path.join(tex_dir, f) for f in os.listdir(tex_dir)
                 if f.startswith("tex_") and f.endswith(".bmp")] if tex_dir else []
    black_files = [f for f in tex_files if _mostly_black(f)]
    check("no blank-black textures were written",
          not black_files, "%d of %d" % (len(black_files), len(tex_files)))

    tex_nodes = [n for o in objs for s in o.material_slots
                 if s.material and s.material.use_nodes
                 for n in s.material.node_tree.nodes if n.type == "TEX_IMAGE"]
    check("textures linked", len(tex_nodes) > 0, "%d image nodes" % len(tex_nodes))
    check("textures clamp at edges",
          all(n.extension == "EXTEND" for n in tex_nodes))
    check("texture files resolved",
          all(n.image and n.image.size[0] > 0 for n in tex_nodes))

# --- the update button must not take Blender down with it --------------------
# Installing an extension while a Python operator is still on the stack crashes
# Blender with an access violation, so the operator only schedules the install.
# This exercises the safe branch and proves the wiring is intact.
from google_map_export_bridge import updates as _updates  # noqa: E402

check("update operator registered", hasattr(bpy.ops.gmeb, "check_updates"))
check("install runs off the operator stack",
      callable(getattr(_updates, "install_latest", None)))

import inspect  # noqa: E402

_src = inspect.getsource(mod.operators.GMEB_OT_check_updates)
check("the operator does not install inline",
      "package_install" not in _src, "found a direct install call")
check("the operator defers to a timer", "timers.register" in _src)

try:
    _res = bpy.ops.gmeb.check_updates()
    check("update check runs without crashing", "FINISHED" in _res or
          "CANCELLED" in _res, _res)
except Exception as exc:                                # noqa: BLE001
    check("update check runs without crashing", False, exc)


# --- teardown ---------------------------------------------------------------
connect.disconnect()
check("agent stopped", not agent.is_running())
check("hub stopped", not connect.is_hosting())

try:
    addon_utils.disable("google_map_export_bridge")
    check("add-on unregisters cleanly", True)
except Exception as exc:
    check("add-on unregisters cleanly", False, exc)

shutil.rmtree(WORK, ignore_errors=True)

print("\n" + "=" * 62)
if FAILURES:
    print("%d FAILED: %s" % (len(FAILURES), ", ".join(FAILURES)))
else:
    print("ALL CHECKS PASSED")
print("=" * 62)
sys.stdout.flush()
sys.exit(1 if FAILURES else 0)
