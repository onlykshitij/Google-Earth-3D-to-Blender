#!/usr/bin/env python3
"""
Package the add-on into an installable zip.

    python build.py            # build the interface, then zip
    python build.py --no-web   # zip whatever interface is already built

The zip contains the `google_map_export_bridge` folder at its root, which is what
both Blender's legacy add-on installer and its extension installer expect.
"""

from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import sys
import zipfile

ROOT = os.path.dirname(os.path.abspath(__file__))
ADDON = os.path.join(ROOT, "google_map_export_bridge")
WEB_SRC = os.path.join(ROOT, "web")
DIST = os.path.join(ROOT, "dist")

# Never ship these.
EXCLUDE_DIRS = {"__pycache__", ".git", "node_modules"}
EXCLUDE_SUFFIXES = (".pyc", ".pyo", ".blend1")

REQUIRED = [
    os.path.join("exporter", "earth-export.cjs"),
    os.path.join("web", "index.html"),
    "__init__.py",
    "hub.py",
    "agent.py",
]


def read_version():
    """
    Take the version from bl_info, and check nothing else disagrees.

    The version is declared three times - bl_info for the add-on, VERSION in
    hub.py for the interface to report, and the extension manifest - because
    none of them can import the others. So the one place that sees all three
    checks they match, rather than letting them drift apart silently.
    """
    with open(os.path.join(ADDON, "__init__.py"), encoding="utf-8") as fh:
        text = fh.read()
    match = re.search(r'"version":\s*\((\d+),\s*(\d+),\s*(\d+)\)', text)
    if not match:
        sys.exit("Could not read the version from __init__.py")
    version = ".".join(match.groups())

    others = []
    with open(os.path.join(ADDON, "hub.py"), encoding="utf-8") as fh:
        found = re.search(r'^VERSION\s*=\s*"([^"]+)"', fh.read(), re.M)
        others.append(("hub.py VERSION", found.group(1) if found else None))

    manifest = os.path.join(ADDON, "blender_manifest.toml")
    if os.path.isfile(manifest):
        with open(manifest, encoding="utf-8") as fh:
            found = re.search(r'^version\s*=\s*"([^"]+)"', fh.read(), re.M)
            others.append(("blender_manifest.toml",
                           found.group(1) if found else None))

    wrong = [(name, value) for name, value in others if value != version]
    if wrong:
        detail = "; ".join("%s says %s" % (name, value)
                           for name, value in wrong)
        sys.exit("Version mismatch. bl_info says %s, but %s" % (version, detail))
    return version


def build_web():
    if not os.path.isdir(os.path.join(WEB_SRC, "node_modules")):
        print("Installing interface dependencies...")
        run(["npm", "install", "--no-audit", "--no-fund"], WEB_SRC)
    print("Building the interface...")
    run(["npm", "run", "build"], WEB_SRC)


def run(cmd, cwd):
    # shell=True on Windows so npm's .cmd shim resolves.
    result = subprocess.run(cmd, cwd=cwd, shell=(os.name == "nt"))
    if result.returncode != 0:
        sys.exit("Command failed: %s" % " ".join(cmd))


def check_required():
    missing = [rel for rel in REQUIRED
               if not os.path.isfile(os.path.join(ADDON, rel))]
    if missing:
        sys.exit("Missing from the add-on:\n  " + "\n  ".join(missing) +
                 "\n\nThe exporter bundle is built with:\n"
                 "  cd vendor/earth-exporter && npm install && "
                 "npx esbuild src/index.ts --bundle --platform=node "
                 "--target=node18 --format=cjs --outfile=earth-export.cjs\n"
                 "then copy it to google_map_export_bridge/exporter/.\n"
                 "The interface is built with: cd web && npm run build")


def collect():
    for base, dirs, files in os.walk(ADDON):
        dirs[:] = sorted(d for d in dirs if d not in EXCLUDE_DIRS)
        for name in sorted(files):
            if name.endswith(EXCLUDE_SUFFIXES):
                continue
            full = os.path.join(base, name)
            rel = os.path.relpath(full, ROOT)
            yield full, rel.replace(os.sep, "/")


def main(argv=None):
    parser = argparse.ArgumentParser(description="Package the add-on.")
    parser.add_argument("--no-web", action="store_true",
                        help="skip rebuilding the map interface")
    args = parser.parse_args(argv)

    if not args.no_web:
        build_web()

    check_required()

    version = read_version()
    os.makedirs(DIST, exist_ok=True)
    out = os.path.join(DIST, "google-map-export-bridge-%s.zip" % version)
    if os.path.exists(out):
        os.remove(out)

    total = 0
    count = 0
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for full, rel in collect():
            zf.write(full, rel)
            total += os.path.getsize(full)
            count += 1

    packed = os.path.getsize(out)
    print()
    print("Wrote %s" % out)
    print("  %d files, %.1f MB raw, %.1f MB packed"
          % (count, total / 1e6, packed / 1e6))
    print()
    print("Install in Blender: Edit > Preferences > Add-ons > Install from Disk,")
    print("choose the zip, then enable Google Map Export Bridge.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
