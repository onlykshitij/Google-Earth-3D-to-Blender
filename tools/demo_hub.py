#!/usr/bin/env python3
"""
Serve the interface with stand-in Blender sessions, for screenshots and for
poking at the UI without opening Blender.

    python tools/demo_hub.py            # http://127.0.0.1:8788

Two sessions are registered: one idle, one holding a finished export. The
numbers in that export are real, measured from a level-20 download of Piazza
dei Miracoli in Pisa, so the screenshots do not show invented figures.
"""

from __future__ import annotations

import argparse
import importlib.util
import os
import sys
import threading
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ADDON = os.path.join(ROOT, "google_map_export_bridge")


def load_hub():
    spec = importlib.util.spec_from_file_location(
        "gmeb_hub_demo", os.path.join(ADDON, "hub.py"))
    module = importlib.util.module_from_spec(spec)
    sys.modules["gmeb_hub_demo"] = module
    spec.loader.exec_module(module)
    return module


DEFAULTS = {
    "level": 20,
    "levelGround": True,
    "groundCellSize": 4.0,
    "scale": 1.0,
    "joinObjects": False,
    "shadeSmooth": True,
    "lockReference": True,
    "adjustClipping": True,
    "replacePrevious": False,
    "collectionName": "",
    "exportDir": "",
    "trimSubGround": True,
    "trimDepth": 2.0,
}

IDLE = {
    "id": "demo-idle",
    "info": {
        "blenderVersion": "5.2.0 LTS",
        "blendFile": "city-block.blend",
        "blendPath": "/work/city-block.blend",
        "unsaved": False,
        "sceneName": "Scene",
        "pid": 4328,
        "nodeFound": True,
        "onlineAccess": True,
        "hosting": True,
        "defaults": DEFAULTS,
    },
    "state": {"busy": False, "job": None, "history": []},
}

FINISHED = {
    "id": "demo-done",
    "info": {
        "blenderVersion": "5.2.0 LTS",
        "blendFile": "harbour.blend",
        "blendPath": "/work/harbour.blend",
        "unsaved": True,
        "sceneName": "Scene",
        "pid": 74832,
        "nodeFound": True,
        "onlineAccess": True,
        "hosting": False,
        "defaults": DEFAULTS,
    },
    "state": {
        "busy": False,
        "history": [],
        "job": {
            "id": "8fa7a5e6dad9",
            "phase": "done",
            "message": "Imported 26 objects into 'MapExport 43.72329 10.39414'",
            "progress": 1.0,
            "startedAt": 0,
            "finishedAt": 0,
            "elapsed": 96.0,
            "bbox": {"minLat": 43.7230, "minLng": 10.3940,
                     "maxLat": 43.7233, "maxLng": 10.3944},
            "level": 20,
            "error": None,
            "log": [
                "Starting export at detail level 20...",
                "Found 14 octants to fetch",
                "Downloading tiles (22/22)",
                "Georeferencing and levelling...",
                "Writing georeferenced OBJ...",
                "Imported 26 objects into 'MapExport 43.72329 10.39414'",
            ],
            "importSummary": "Imported 26 objects",
            "outputDir": "D:/refs/43.72311_10.39412_20260824-142827",
            "model": {
                "vertices": 35742,
                "latitude": 43.723291,
                "longitude": 10.394142,
                "sizeX": 55.2,
                "sizeY": 76.4,
                "minZ": -7.1,
                "maxZ": 56.7,
                "tiltRemovedDeg": 0.425,
                "groundCells": 242,
                "groundInliers": 139,
                "groundRms": 0.25,
                "coverage": "3d",
                "coverageNote": "",
                "density": 8.54,
                "relief": 56.7,
                "achievedLevel": 20,
            },
        },
    },
}


def listing(path):
    """A real folder listing, so the folder picker actually works here."""
    home = os.path.expanduser("~")
    roots = [{"name": "Home", "path": home}]
    if os.name == "nt":
        roots += [{"name": "%s:%s" % (d, os.sep), "path": "%s:%s" % (d, os.sep)}
                  for d in "CDEFG" if os.path.isdir("%s:%s" % (d, os.sep))]
    else:
        roots.append({"name": "/", "path": "/"})

    # No starting point given, so open somewhere useful.
    if not path:
        path = os.path.expanduser("~")

    target = os.path.abspath(os.path.expanduser(path))
    if not os.path.isdir(target):
        return {"error": "%s is not a folder on this machine." % target}

    entries = []
    try:
        with os.scandir(target) as it:
            for item in it:
                if len(entries) >= 400:
                    break
                try:
                    if item.is_dir(follow_symlinks=False) and not item.name.startswith("."):
                        entries.append({"name": item.name, "path": item.path})
                except OSError:
                    continue
    except OSError as exc:
        return {"error": str(exc)}

    entries.sort(key=lambda e: e["name"].lower())
    parent = os.path.dirname(target.rstrip(os.sep))
    return {"path": target,
            "parent": parent if parent != target and os.path.isdir(parent) else None,
            "entries": entries, "roots": roots, "sep": os.sep,
            "writable": os.access(target, os.W_OK)}


def keep_alive(registry, stop):
    """
    Stand in for the agents: keep them registered and answer their requests.

    This is the same exchange a real Blender has with the hub, just in-process,
    which is what lets the folder picker work against this demo.
    """
    while not stop.is_set():
        for entry in (IDLE, FINISHED):
            _commands, requests = registry.poll(entry["id"], entry["info"],
                                                entry["state"])
            results = {}
            for item in requests:
                if item.get("type") == "browse":
                    results[item["id"]] = listing(item.get("path") or "")
                else:
                    results[item["id"]] = {"error": "Unknown request type"}
            if results:
                registry.resolve(entry["id"], results)
        stop.wait(0.15)


def main():
    hub_module = load_hub()

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8788)
    args = parser.parse_args()

    web_dir = os.path.join(ADDON, "web")
    if not os.path.isfile(os.path.join(web_dir, "index.html")):
        sys.exit("Build the interface first: cd web && npm run build")

    running = hub_module.serve(port=args.port, web_dir=web_dir,
                              host="127.0.0.1")
    stop = threading.Event()
    thread = threading.Thread(target=keep_alive,
                              args=(running.hub.registry, stop), daemon=True)
    thread.start()

    print("demo hub: %s" % running.url)
    print("  token: %s" % running.hub.web_token)
    print("  sessions: city-block.blend (idle), harbour.blend (finished export)")
    print("Ctrl+C to stop.")

    try:
        while True:
            time.sleep(0.5)
    except KeyboardInterrupt:
        pass
    finally:
        stop.set()
        running.stop()


if __name__ == "__main__":
    main()
