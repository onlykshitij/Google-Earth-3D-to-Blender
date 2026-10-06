#!/usr/bin/env python3
"""
Run the map interface outside Blender.

    python run.py                 # http://127.0.0.1:8777
    python run.py --port 9000
    python run.py --host 0.0.0.0  # reachable from other machines
    python run.py --build         # build the interface first, needs npm
    python run.py --no-browser
    python run.py --carto-key KEY # CARTO's Dark and Light map layers

No dependencies beyond the standard library, and no Blender. The hub serves the
interface and waits for Blender sessions to check in; any Blender whose Hub URL
preference points here appears in the interface and can be exported to.

The interface itself is a build artefact, so it is not in the repository. It is
located automatically - from a local build if there is one, otherwise from an
installed copy of the add-on, whose release zip ships one already built. Only
`--build` wants npm.

The hub itself never downloads or imports anything - that happens in Blender,
which owns the exporter and the scene. This process is the interface and the
router between the two.
"""

from __future__ import annotations

import argparse
import importlib.util
import os
import shutil
import signal
import subprocess
import sys
import threading
import webbrowser

HERE = os.path.dirname(os.path.abspath(__file__))
ADDON_DIR = os.path.join(HERE, "google_map_export_bridge")


def load_hub():
    """
    Load the add-on's hub module without importing the add-on package.

    Importing `google_map_export_bridge` would execute its `__init__`, which needs
    `bpy`. Loading the single file directly sidesteps that, and keeps one copy
    of the hub shared between Blender and this script.
    """
    path = os.environ.get("GMEB_HUB_MODULE") or os.path.join(ADDON_DIR, "hub.py")
    if not os.path.isfile(path):
        sys.exit("Cannot find hub.py at %s" % path)

    spec = importlib.util.spec_from_file_location("gmeb_hub", path)
    module = importlib.util.module_from_spec(spec)
    sys.modules["gmeb_hub"] = module
    spec.loader.exec_module(module)
    return module


def installed_addon_web_dirs():
    """
    Interface folders belonging to an installed copy of the add-on.

    The built interface is generated, so it is not in the repository - but the
    released add-on ships with it. Anyone who installed the add-on therefore
    already has a copy on disk, and reusing it means this script needs no build
    step and no npm.
    """
    home = os.path.expanduser("~")
    roots = [
        os.path.join(os.environ.get("APPDATA", ""), "Blender Foundation",
                     "Blender"),
        os.path.join(home, "Library", "Application Support", "Blender"),
        os.path.join(home, ".config", "blender"),
    ]

    found = []
    for root in roots:
        if not root or not os.path.isdir(root):
            continue
        for version in sorted(os.listdir(root), reverse=True):
            for middle in (("scripts", "addons"),
                           ("extensions", "user_default")):
                candidate = os.path.join(root, version, *middle,
                                         "google_map_export_bridge", "web")
                if os.path.isfile(os.path.join(candidate, "index.html")):
                    found.append(candidate)
    return found


def build_interface():
    """Build the interface with npm. Returns True on success."""
    web_src = os.path.join(HERE, "web")
    if not os.path.isfile(os.path.join(web_src, "package.json")):
        print("No web/ sources here, so there is nothing to build.")
        return False

    npm = shutil.which("npm")
    if not npm:
        print("npm was not found, so the interface cannot be built here.")
        return False

    steps = [[npm, "ci", "--no-audit", "--no-fund"],
             [npm, "run", "build"]]
    if not os.path.isfile(os.path.join(web_src, "package-lock.json")):
        steps[0] = [npm, "install", "--no-audit", "--no-fund"]

    for step in steps:
        print("$ %s" % " ".join(step))
        # shell=True on Windows so npm's .cmd shim resolves.
        if subprocess.run(step, cwd=web_src,
                          shell=(os.name == "nt")).returncode != 0:
            print("That step failed.")
            return False
    return True


def resolve_web_dir(explicit, allow_build):
    """
    Find an interface to serve, or explain how to get one.

    Tried in order: what was asked for, a local build, an installed add-on's
    copy, then building it here.
    """
    if explicit:
        if os.path.isfile(os.path.join(explicit, "index.html")):
            return explicit
        sys.exit("No index.html in %s" % explicit)

    local = os.path.join(ADDON_DIR, "web")
    if os.path.isfile(os.path.join(local, "index.html")):
        return local

    for candidate in installed_addon_web_dirs():
        print("Using the interface from the installed add-on:\n  %s\n"
              % candidate)
        return candidate

    if allow_build:
        print("The interface has not been built yet. Building it now.\n")
        if build_interface() and os.path.isfile(
                os.path.join(local, "index.html")):
            return local
        sys.exit("The build did not produce %s" % local)

    sys.exit(
        "The map interface has not been built, and no installed add-on was\n"
        "found to borrow it from. Pick whichever is easier:\n"
        "\n"
        "  python run.py --build        build it here (needs npm, once)\n"
        "\n"
        "  or install the add-on in Blender from the release zip, which\n"
        "  already contains the built interface, then run this again\n"
        "\n"
        "  or point at a copy yourself:  python run.py --web-dir <path>\n"
        "\n"
        "Looked in: %s" % local)


def env_flag(name, default=False):
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


def main(argv=None):
    hub_module = load_hub()

    parser = argparse.ArgumentParser(
        description="Serve the Google Map Export Bridge interface.")
    parser.add_argument(
        "--port", type=int,
        default=int(os.environ.get("GMEB_PORT", hub_module.DEFAULT_PORT)),
        help="port to listen on (default %d)" % hub_module.DEFAULT_PORT)
    parser.add_argument(
        "--host", default=os.environ.get("GMEB_HOST", "127.0.0.1"),
        help="address to bind (default 127.0.0.1; use 0.0.0.0 to accept "
             "connections from other machines)")
    parser.add_argument(
        "--web-dir", default=os.environ.get("GMEB_WEB_DIR", ""),
        help="directory holding the built interface. Found automatically "
             "when left off")
    parser.add_argument(
        "--build", action="store_true", default=env_flag("GMEB_BUILD"),
        help="build the interface with npm first, if it is not already "
             "built")
    parser.add_argument(
        "--agent-token", default=os.environ.get("GMEB_AGENT_TOKEN", ""),
        help="shared secret Blender must present when checking in")
    parser.add_argument(
        "--public-url", default=os.environ.get("GMEB_PUBLIC_URL", ""),
        help="address Blender should use to reach this hub, when it differs "
             "from the bind address (for example the published port of a "
             "container)")
    parser.add_argument(
        "--no-browser", action="store_true",
        default=env_flag("GMEB_NO_BROWSER"),
        help="do not open a browser window")

    # Map settings, handed to every browser that opens the interface. Each
    # browser can also override them from the interface's settings dialog.
    env_maps = hub_module.map_settings_from_env()
    parser.add_argument(
        "--carto-key", default=env_maps["cartoKey"],
        help="CARTO basemaps key, which the Dark and Light layers need. "
             "Free from https://carto.com/basemaps/apikey")
    parser.add_argument(
        "--tile-url", default=env_maps["tileUrl"],
        help="an extra XYZ tile layer, shown as Custom, for example "
             "https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=KEY")
    parser.add_argument(
        "--tile-attribution", default=env_maps["tileAttribution"],
        help="attribution text for the --tile-url layer")
    parser.add_argument(
        "--geocoder-url", default=env_maps["geocoderUrl"],
        help="Nominatim-compatible search address, with {query} where the "
             "search text goes. Default: nominatim.openstreetmap.org")
    args = parser.parse_args(argv)

    web_dir = resolve_web_dir(args.web_dir, args.build)

    map_settings = {
        "cartoKey": args.carto_key,
        "tileUrl": args.tile_url,
        "tileAttribution": args.tile_attribution,
        "geocoderUrl": args.geocoder_url,
    }

    try:
        running = hub_module.serve(port=args.port, web_dir=web_dir,
                                   host=args.host,
                                   agent_token=args.agent_token,
                                   map_settings=map_settings)
    except OSError as exc:
        sys.exit("Could not bind %s:%d - %s" % (args.host, args.port, exc))

    url = running.url
    loopback = args.host in ("127.0.0.1", "localhost", "::1")

    # Bound to all interfaces usually means a container, where the port Blender
    # must dial is the published one and is unknowable from in here. Say so
    # rather than printing an address that only works inside the container.
    blender_url = (args.public_url or "").rstrip("/") or (
        url.rstrip("/") if loopback else "")

    print("Google Map Export Bridge")
    print("  interface : %s" % url)
    print("  serving   : %s" % web_dir)
    if not loopback:
        print("  bound to  : %s:%d (all interfaces)" % (args.host, running.port))
    if args.agent_token:
        print("  agent token required")
    # Say which map settings are in force, never their values.
    configured = [label for label, value in (
        ("CARTO key", args.carto_key),
        ("custom tile layer", args.tile_url),
        ("custom search", args.geocoder_url),
    ) if value]
    if configured:
        print("  map       : %s set" % ", ".join(configured))
    print()
    print("In Blender: Preferences > Add-ons > Google Map Export Bridge, set")
    if blender_url:
        print("  External Hub = %s" % blender_url)
    else:
        print("  External Hub = the address this port is published on,")
        print("  for example http://127.0.0.1:%d" % running.port)
    print("then open the Map Ref tab in the 3D view sidebar.")
    print()
    print("Waiting for Blender to check in. Press Ctrl+C to stop.")

    if not args.no_browser:
        # Delayed so the first request lands after the server is accepting.
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()

    stop = threading.Event()

    def shutdown(_signum=None, _frame=None):
        stop.set()

    signal.signal(signal.SIGINT, shutdown)
    try:
        signal.signal(signal.SIGTERM, shutdown)
    except (AttributeError, ValueError):
        # Not available on every platform, and only settable on the main thread.
        pass

    try:
        stop.wait()
    except KeyboardInterrupt:
        pass
    finally:
        print("\nStopping.")
        running.stop()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
