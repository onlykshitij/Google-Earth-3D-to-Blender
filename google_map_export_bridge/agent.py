"""
The agent: the Blender end of the hub connection.

A worker thread posts to the hub on a short cycle, carrying what this Blender
session is and what its current job is doing, and receiving whatever commands
the interface has queued for it. Commands are handed to the main thread through
a queue, because acting on them touches `bpy`.

The thread must never read `bpy` itself. Everything it reports comes from
`INFO`, which the main-thread timer refreshes, and from the job manager, which
is thread-safe by design.
"""

from __future__ import annotations

import json
import os
import queue
import threading
import time
import urllib.error
import urllib.request
import uuid

from . import hub as hub_module
from . import jobs

# Identifies this Blender session for as long as it lives. Regenerated on
# reload, which is what we want: a reloaded add-on is a fresh agent.
INSTANCE_ID = uuid.uuid4().hex[:16]

# Refreshed by the main thread; read by the worker. Plain dict assignment is
# atomic enough for this purpose - the worker only ever reads whole values.
INFO = {}

# Commands from the hub, drained by the main-thread timer.
COMMANDS = queue.Queue()

REQUEST_TIMEOUT = 8.0
MAX_BACKOFF = 20.0

_thread = None
_stop = threading.Event()
_state = {
    "url": "",
    "connected": False,
    "error": "",
    "last_contact": 0.0,
    "hosting": False,
}


def status():
    return dict(_state)


def is_running():
    return _thread is not None and _thread.is_alive()


def _post(url, payload):
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url, data=data, method="POST",
        headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT) as response:
        body = response.read().decode("utf-8")
    return json.loads(body) if body else {}


MAX_BROWSE_ENTRIES = 400


def _roots():
    """Sensible starting points for browsing this machine."""
    places = []
    home = os.path.expanduser("~")

    if os.name == "nt":
        for letter in "CDEFGHIJKLMNOPQRSTUVWXYZAB":
            drive = "%s:%s" % (letter, os.sep)
            if os.path.isdir(drive):
                places.append({"name": drive, "path": drive})
    else:
        places.append({"name": "/", "path": "/"})

    if os.path.isdir(home):
        places.insert(0, {"name": "Home", "path": home})
    return places


def browse(path):
    """
    List the folders inside `path`, for the interface's folder picker.

    Answered on this thread rather than Blender's, because reading a directory
    needs no `bpy` - which is what keeps the round trip quick. Only directories
    are returned, since the thing being chosen is a directory.
    """
    try:
        # No starting point given, so open somewhere useful.
        if not path:
            path = os.path.expanduser("~")

        target = os.path.abspath(os.path.expanduser(path))
        if not os.path.isdir(target):
            return {"error": "%s is not a folder on this machine." % target}

        entries = []
        with os.scandir(target) as it:
            for item in it:
                if len(entries) >= MAX_BROWSE_ENTRIES:
                    break
                try:
                    if not item.is_dir(follow_symlinks=False):
                        continue
                except OSError:
                    continue
                if item.name.startswith("."):
                    continue
                entries.append({"name": item.name, "path": item.path})

        entries.sort(key=lambda e: e["name"].lower())

        parent = os.path.dirname(target.rstrip(os.sep))
        if parent == target or not os.path.isdir(parent):
            parent = None

        return {"path": target, "parent": parent, "entries": entries,
                "roots": _roots(), "sep": os.sep,
                "writable": os.access(target, os.W_OK)}
    except PermissionError:
        return {"error": "No permission to read that folder."}
    except OSError as exc:
        return {"error": str(exc)}


def _handle_request(item):
    """Answer one request from the hub. Never raises."""
    try:
        if item.get("type") == "browse":
            return browse(item.get("path") or "")
        return {"error": "Unknown request type"}
    except Exception as exc:                            # noqa: BLE001
        return {"error": str(exc)}


def _loop(base_url, agent_token):
    poll_url = base_url.rstrip("/") + "/api/agent/poll"
    interval = hub_module.AGENT_POLL_SECONDS
    backoff = 1.0

    pending_results = {}

    while not _stop.is_set():
        payload = {
            "id": INSTANCE_ID,
            "info": dict(INFO),
            "state": jobs.MANAGER.snapshot(),
        }
        if pending_results:
            payload["results"] = pending_results
        if agent_token:
            payload["agentToken"] = agent_token

        try:
            reply = _post(poll_url, payload)
        except (urllib.error.URLError, OSError, ValueError) as exc:
            _state["connected"] = False
            _state["error"] = _describe(exc)
            # Back off so a hub that is down does not spin the thread, but keep
            # trying: the user may start one at any time.
            if _stop.wait(min(MAX_BACKOFF, backoff)):
                break
            backoff = min(MAX_BACKOFF, backoff * 2.0)
            continue

        backoff = 1.0
        _state["connected"] = True
        _state["error"] = ""
        _state["last_contact"] = time.time()

        pending_results = {}

        for command in reply.get("commands") or []:
            COMMANDS.put(command)

        # Requests are answered here and now - they need no `bpy` - and sent
        # back on the very next poll rather than after another wait.
        requests = reply.get("requests") or []
        for item in requests:
            request_id = item.get("id")
            if request_id:
                pending_results[request_id] = _handle_request(item)

        interval = float(reply.get("pollSeconds") or interval)
        if pending_results:
            continue
        if _stop.wait(max(0.05, interval)):
            break


def _describe(exc):
    if isinstance(exc, urllib.error.HTTPError):
        return "hub returned HTTP %s" % exc.code
    if isinstance(exc, urllib.error.URLError):
        return "cannot reach the hub (%s)" % getattr(exc, "reason", exc)
    return str(exc)


def start(base_url, agent_token="", hosting=False):
    """Begin polling `base_url`. Restarts cleanly if already running."""
    global _thread

    stop()

    _stop.clear()
    _state.update({"url": base_url, "connected": False, "error": "",
                   "hosting": hosting})

    _thread = threading.Thread(target=_loop, args=(base_url, agent_token),
                              name="gmeb-agent", daemon=True)
    _thread.start()
    return _thread


def stop(notify_url=None, agent_token=""):
    """Stop polling. Tells the hub to forget us if a URL is supplied."""
    global _thread

    _stop.set()
    thread = _thread
    _thread = None
    if thread is not None and thread.is_alive():
        thread.join(timeout=3.0)

    url = notify_url or _state.get("url")
    if url:
        payload = {"id": INSTANCE_ID}
        if agent_token:
            payload["agentToken"] = agent_token
        try:
            _post(url.rstrip("/") + "/api/agent/leave", payload)
        except Exception:
            # Best effort only; the hub expires silent instances anyway.
            pass

    _state["connected"] = False

    while not COMMANDS.empty():
        try:
            COMMANDS.get_nowait()
        except queue.Empty:
            break
