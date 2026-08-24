#!/usr/bin/env python3
"""
Write the extension index Blender uses to offer updates.

    python tools/make_index.py dist/google-map-export-bridge-1.1.2.zip

Blender 4.2 and newer can track a remote repository: a URL serving a JSON index
that lists the available versions and where to fetch them. Publishing one with
every release is what lets Blender update this add-on itself, instead of the
add-on trying to overwrite itself while running.

The index is uploaded as a release asset, so
`releases/latest/download/index.json` always describes the newest release and
the URL never has to change.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, "google_map_export_bridge", "blender_manifest.toml")

GITHUB_REPO = os.environ.get("GITHUB_REPOSITORY",
                             "onlykshitij/Google-Earth-3D-to-Blender")


def manifest_values():
    """
    Read the fields Blender wants from the manifest.

    Parsed with regular expressions rather than a TOML library so this runs on a
    bare Python with nothing installed, which is all the release job has.
    """
    with open(MANIFEST, encoding="utf-8") as fh:
        text = fh.read()

    def scalar(key, default=""):
        match = re.search(r'^%s\s*=\s*"([^"]*)"' % re.escape(key), text, re.M)
        return match.group(1) if match else default

    def array(key):
        match = re.search(r'^%s\s*=\s*\[([^\]]*)\]' % re.escape(key), text, re.M)
        if not match:
            return []
        return re.findall(r'"([^"]+)"', match.group(1))

    permissions = {}
    block = re.search(r'^\[permissions\]\s*$(.*?)(^\[|\Z)', text, re.M | re.S)
    if block:
        for key, value in re.findall(r'^(\w+)\s*=\s*"([^"]*)"', block.group(1),
                                     re.M):
            permissions[key] = value

    return {
        "schema_version": scalar("schema_version", "1.0.0"),
        "id": scalar("id"),
        "name": scalar("name"),
        "tagline": scalar("tagline"),
        "version": scalar("version"),
        "type": scalar("type", "add-on"),
        "maintainer": scalar("maintainer"),
        "license": array("license"),
        "blender_version_min": scalar("blender_version_min", "4.2.0"),
        "permissions": permissions,
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", help="the packaged add-on zip")
    parser.add_argument("--out", default=os.path.join(ROOT, "dist", "index.json"))
    parser.add_argument("--tag", default=os.environ.get("RELEASE_TAG", ""),
                        help="release tag the archive is published under")
    args = parser.parse_args(argv)

    if not os.path.isfile(args.archive):
        sys.exit("No such archive: %s" % args.archive)

    entry = manifest_values()
    if not entry["id"] or not entry["version"]:
        sys.exit("Could not read id/version from %s" % MANIFEST)

    with open(args.archive, "rb") as fh:
        blob = fh.read()

    tag = args.tag or ("v" + entry["version"])
    entry["archive_url"] = (
        "https://github.com/%s/releases/download/%s/%s"
        % (GITHUB_REPO, tag, os.path.basename(args.archive)))
    entry["archive_size"] = len(blob)
    entry["archive_hash"] = "sha256:%s" % hashlib.sha256(blob).hexdigest()

    index = {"version": "v1", "blocklist": [], "data": [entry]}

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(index, fh, indent=2)
        fh.write("\n")

    print("Wrote %s" % args.out)
    print("  %s %s" % (entry["id"], entry["version"]))
    print("  %s" % entry["archive_url"])
    print("  %s, %d bytes" % (entry["archive_hash"], entry["archive_size"]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
