#!/usr/bin/env python3
"""
Run the map interface outside Blender.

    python run.py                 # http://127.0.0.1:8777
    python run.py --port 9000
    python run.py --host 0.0.0.0  # reachable from other machines
    python run.py --no-browser

Nothing else is needed: no dependencies beyond the standard library, and no
Blender. The hub serves the interface and waits for Blender sessions to check
in. Any Blender running the add-on with its External Hub preference pointed
here will appear in the interface and can be exported to.

The hub itself never downloads or imports anything - that happens in Blender,
which owns the exporter and the scene. This process is the interface and the
router between the two.
"""

from __future__ import annotations

import argparse
import importlib.util
import os
import signal
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
        help="directory holding the built interface (defaults to the add-on's "
             "web folder)")
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
    args = parser.parse_args(argv)

    web_dir = args.web_dir or os.path.join(ADDON_DIR, "web")
    if not os.path.isfile(os.path.join(web_dir, "index.html")):
        sys.exit(
            "The interface has not been built.\n"
            "  cd web && npm install && npm run build\n"
            "Looked in: %s" % web_dir)

    try:
        running = hub_module.serve(port=args.port, web_dir=web_dir,
                                   host=args.host,
                                   agent_token=args.agent_token)
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
