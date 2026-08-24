"""
The hub: serves the map interface and routes work to Blender instances.

Deliberately stdlib-only and free of any `bpy` or same-package imports, because
it is loaded two different ways:

  * inside Blender, as `from . import hub`, when an add-on hosts the hub itself,
  * standalone, by `run.py` and the Docker image, which load this file directly
    by path so that the add-on's `bpy`-dependent `__init__` never runs.

Transport direction is the important design point. Blender instances are
*clients* here: each one polls `/api/agent/poll`, reporting what it is and what
its current job is doing, and receives queued commands in the reply. Nothing
ever connects *to* Blender. That is what allows the hub to run in a container -
a container usually cannot reach back into host processes, but a host process
can always reach a published port - and it also means several Blender instances
can register with one hub and be picked between in the interface.
"""

from __future__ import annotations

import json
import mimetypes
import os
import posixpath
import secrets
import threading
import time
from collections import deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

SERVICE_NAME = "google-map-export-bridge"
PROTOCOL_VERSION = 1

# Kept in step with bl_info in __init__.py; build.py fails if they drift.
VERSION = "1.1.3"

DEFAULT_PORT = 8777

# An instance is considered gone if it misses several polls in a row.
AGENT_POLL_SECONDS = 1.5
# While a browser is waiting on an answer from Blender, the agent is asked to
# poll far more often, so a request/response round trip feels immediate rather
# than taking a whole poll cycle.
AGENT_POLL_BUSY_SECONDS = 0.2
EXPEDITE_WINDOW_SECONDS = 12.0
REQUEST_TIMEOUT_SECONDS = 6.0
INSTANCE_TIMEOUT_SECONDS = 8.0

MAX_BODY_BYTES = 256 * 1024
MAX_COMMANDS_PER_INSTANCE = 8

for _ext, _mime in (
    (".js", "text/javascript"),
    (".mjs", "text/javascript"),
    (".css", "text/css"),
    (".svg", "image/svg+xml"),
    (".json", "application/json"),
    (".woff2", "font/woff2"),
):
    mimetypes.add_type(_mime, _ext)


class Instance:
    """One Blender session known to the hub."""

    def __init__(self, instance_id):
        self.id = instance_id
        self.info = {}
        self.state = {}
        self.first_seen = time.time()
        self.last_seen = self.first_seen
        self.commands = deque()
        # Requests wait for an answer, unlike commands which are fire-and-forget.
        self.requests = deque()
        self.waiters = {}
        self.expedite_until = 0.0

    def as_dict(self, now=None):
        now = now or time.time()
        age = now - self.last_seen
        return {
            "id": self.id,
            "info": self.info,
            "state": self.state,
            "online": age <= INSTANCE_TIMEOUT_SECONDS,
            "secondsSinceSeen": round(age, 2),
            "connectedFor": round(now - self.first_seen, 1),
        }


class Registry:
    """Thread-safe set of connected instances and their pending commands."""

    def __init__(self):
        self._lock = threading.RLock()
        self._instances = {}

    def request(self, instance_id, payload, timeout=None):
        """
        Ask an instance something and wait for its answer.

        The transport only runs one way - Blender polls us - so a round trip is
        built by queueing the question, letting the next poll collect it, and
        blocking this request thread until that instance polls back with the
        answer. The instance is asked to poll quickly while anyone is waiting.

        Returns the answer, or None on timeout.
        """
        # Read at call time, not bound as a default, so the value stays
        # adjustable - which tests rely on and deployments may want.
        if timeout is None:
            timeout = REQUEST_TIMEOUT_SECONDS

        event = threading.Event()
        request_id = secrets.token_hex(8)
        entry = {"id": request_id, "event": event, "result": None}

        with self._lock:
            inst = self._instances.get(instance_id)
            if inst is None:
                return None
            item = dict(payload)
            item["id"] = request_id
            inst.requests.append(item)
            inst.waiters[request_id] = entry
            inst.expedite_until = time.time() + EXPEDITE_WINDOW_SECONDS

        if not event.wait(timeout):
            with self._lock:
                inst = self._instances.get(instance_id)
                if inst is not None:
                    inst.waiters.pop(request_id, None)
            return None
        return entry["result"]

    def resolve(self, instance_id, results):
        """Hand answers from a poll back to whoever is waiting for them."""
        if not results:
            return
        with self._lock:
            inst = self._instances.get(instance_id)
            if inst is None:
                return
            for request_id, value in results.items():
                entry = inst.waiters.pop(request_id, None)
                if entry is not None:
                    entry["result"] = value
                    entry["event"].set()

    def poll_interval(self, instance_id):
        with self._lock:
            inst = self._instances.get(instance_id)
            if inst is None:
                return AGENT_POLL_SECONDS
            waiting = bool(inst.waiters) or bool(inst.requests)
            if waiting or time.time() < inst.expedite_until:
                return AGENT_POLL_BUSY_SECONDS
            return AGENT_POLL_SECONDS

    def poll(self, instance_id, info, state):
        """Register or refresh an instance; return and clear its commands."""
        with self._lock:
            inst = self._instances.get(instance_id)
            if inst is None:
                inst = Instance(instance_id)
                self._instances[instance_id] = inst
            if info:
                inst.info = info
            if state is not None:
                inst.state = state
            inst.last_seen = time.time()

            commands = list(inst.commands)
            inst.commands.clear()
            requests = list(inst.requests)
            inst.requests.clear()
            self._expire()
            return commands, requests

    def push(self, instance_id, command):
        with self._lock:
            inst = self._instances.get(instance_id)
            if inst is None:
                return False
            if len(inst.commands) >= MAX_COMMANDS_PER_INSTANCE:
                return False
            inst.commands.append(command)
            return True

    def get(self, instance_id):
        with self._lock:
            return self._instances.get(instance_id)

    def list(self):
        now = time.time()
        with self._lock:
            self._expire(now)
            items = [i.as_dict(now) for i in self._instances.values()]
        # Stable, friendly ordering: longest-connected first.
        items.sort(key=lambda d: d["connectedFor"], reverse=True)
        return items

    def count_online(self):
        return sum(1 for i in self.list() if i["online"])

    def drop(self, instance_id):
        with self._lock:
            self._instances.pop(instance_id, None)

    def _expire(self, now=None):
        """Forget instances that stopped polling. Assumes the lock is held."""
        now = now or time.time()
        dead = [k for k, v in self._instances.items()
                if now - v.last_seen > INSTANCE_TIMEOUT_SECONDS * 4]
        for k in dead:
            del self._instances[k]


class Hub:
    def __init__(self, web_dir="", agent_token=""):
        self.registry = Registry()
        self.web_dir = web_dir
        # Guards writes coming from a browser. A page on another origin can POST
        # here but cannot read our responses, so it can never obtain this.
        self.web_token = secrets.token_urlsafe(24)
        # Optional shared secret for agents, for deployments where the hub is
        # not reachable only from the local machine.
        self.agent_token = agent_token or ""
        self.started_at = time.time()

    # --- request handling ------------------------------------------------
    def describe(self):
        return {
            "service": SERVICE_NAME,
            "protocol": PROTOCOL_VERSION,
            "version": VERSION,
            "instances": self.registry.count_online(),
            "uptime": round(time.time() - self.started_at, 1),
        }

    def resolve_instance(self, requested):
        """
        Pick the instance a request is aimed at.

        A single connected instance needs no explicit choice, which keeps the
        common case - one Blender open - free of ceremony.
        """
        online = [i for i in self.registry.list() if i["online"]]
        if requested:
            for i in online:
                if i["id"] == requested:
                    return requested, None
            return None, "That Blender instance is no longer connected."
        if not online:
            return None, ("No Blender instance is connected. Open Blender with "
                          "the Google Map Export Bridge add-on enabled.")
        if len(online) > 1:
            return None, "Several Blender instances are connected - pick one."
        return online[0]["id"], None


def validate_export(payload):
    """Check a browser's export request. Raises ValueError with a reason."""
    if not isinstance(payload, dict):
        raise ValueError("Expected a JSON object")

    bbox = payload.get("bbox")
    if not isinstance(bbox, dict):
        raise ValueError("Missing bbox")

    try:
        values = {k: float(bbox[k]) for k in
                  ("minLat", "minLng", "maxLat", "maxLng")}
    except (KeyError, TypeError, ValueError):
        raise ValueError("bbox needs numeric minLat, minLng, maxLat and maxLng")

    for key in ("minLat", "maxLat"):
        if not -89.0 <= values[key] <= 89.0:
            raise ValueError("%s out of range: %s" % (key, values[key]))
    for key in ("minLng", "maxLng"):
        if not -180.0 <= values[key] <= 180.0:
            raise ValueError("%s out of range: %s" % (key, values[key]))
    if values["maxLat"] <= values["minLat"] or values["maxLng"] <= values["minLng"]:
        raise ValueError("The selected area is empty")

    options = payload.get("options") or {}
    if not isinstance(options, dict):
        raise ValueError("options must be an object")

    return values, options


class _Handler(BaseHTTPRequestHandler):
    server_version = "GoogleMapExportBridgeHub"
    protocol_version = "HTTP/1.1"

    @property
    def hub(self):
        return self.server.hub

    # --- plumbing --------------------------------------------------------
    def _json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            return None
        if length <= 0 or length > MAX_BODY_BYTES:
            return None
        try:
            return json.loads(self.rfile.read(length).decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return None

    def _host_allowed(self):
        """
        Guard against DNS rebinding without blocking legitimate names.

        The threat is a page on a domain that resolves to loopback reaching this
        server with its own origin. What actually rules that out is *where the
        connection came from*: if the peer is loopback, the request originated on
        this machine and is fine whatever name it used. That matters because
        people reach the hub by hostname - `http://my-desktop:8777` - and an
        earlier version rejected exactly those.

        Only a request arriving from another machine has to justify its Host
        header, and a hub bound to all interfaces expects those, so there the
        token carries the load instead.
        """
        peer = (self.client_address[0] if self.client_address else "") or ""
        if peer in ("127.0.0.1", "::1", "::ffff:127.0.0.1") or peer.startswith("127."):
            return True

        if not getattr(self.server, "loopback_only", True):
            return True

        host = (self.headers.get("Host") or "").rsplit(":", 1)[0]
        if host in ("127.0.0.1", "localhost", "[::1]", "::1", ""):
            return True

        self._json({"error": "Only local requests are accepted by this hub"}, 403)
        return False

    def _web_token_ok(self, payload):
        supplied = ""
        if isinstance(payload, dict):
            supplied = str(payload.get("token") or "")
        if not supplied:
            supplied = self.headers.get("X-GMEB-Token") or ""
        if secrets.compare_digest(supplied, self.hub.web_token):
            return True
        self._json({"error": "Invalid or missing session token"}, 403)
        return False

    def _agent_token_ok(self, payload):
        expected = self.hub.agent_token
        if not expected:
            return True
        supplied = ""
        if isinstance(payload, dict):
            supplied = str(payload.get("agentToken") or "")
        if not supplied:
            supplied = self.headers.get("X-GMEB-Agent-Token") or ""
        if secrets.compare_digest(supplied, expected):
            return True
        self._json({"error": "Invalid agent token"}, 403)
        return False

    # --- routes ----------------------------------------------------------
    def do_GET(self):
        if not self._host_allowed():
            return

        path = self.path.split("?", 1)[0]

        if path == "/api/hub":
            self._json(self.hub.describe())
            return

        if path == "/api/session":
            payload = dict(self.hub.describe())
            payload["token"] = self.hub.web_token
            payload["instances"] = self.hub.registry.list()
            self._json(payload)
            return

        if path == "/api/instances":
            self._json({"instances": self.hub.registry.list()})
            return

        if path.startswith("/api/"):
            self._json({"error": "Unknown endpoint"}, 404)
            return

        self._static(path)

    def do_POST(self):
        if not self._host_allowed():
            return

        path = self.path.split("?", 1)[0]
        payload = self._body()

        # --- agent side ---------------------------------------------------
        if path == "/api/agent/poll":
            if not self._agent_token_ok(payload):
                return
            if not isinstance(payload, dict) or not payload.get("id"):
                self._json({"error": "Missing instance id"}, 400)
                return
            instance_id = str(payload["id"])
            # Answers first, so a waiting browser is released before anything
            # else this poll might do.
            self.hub.registry.resolve(instance_id, payload.get("results") or {})
            commands, requests = self.hub.registry.poll(
                instance_id,
                payload.get("info") or {},
                payload.get("state"),
            )
            self._json({
                "commands": commands,
                "requests": requests,
                "pollSeconds": self.hub.registry.poll_interval(instance_id),
            })
            return

        if path == "/api/agent/leave":
            if not self._agent_token_ok(payload):
                return
            if isinstance(payload, dict) and payload.get("id"):
                self.hub.registry.drop(str(payload["id"]))
            self._json({"ok": True})
            return

        # --- browser side -------------------------------------------------
        if path == "/api/export":
            if not self._web_token_ok(payload):
                return
            try:
                bbox, options = validate_export(payload)
            except ValueError as exc:
                self._json({"error": str(exc)}, 400)
                return

            target, problem = self.hub.resolve_instance(
                (payload or {}).get("instanceId"))
            if problem:
                self._json({"error": problem}, 409)
                return

            inst = self.hub.registry.get(target)
            if inst is not None and (inst.state or {}).get("busy"):
                self._json({"error": "That Blender instance is already busy."},
                           409)
                return

            if not self.hub.registry.push(target, {"type": "export",
                                                   "bbox": bbox,
                                                   "options": options}):
                self._json({"error": "Could not queue the export."}, 409)
                return
            self._json({"accepted": True, "instanceId": target})
            return

        if path == "/api/browse":
            if not self._web_token_ok(payload):
                return
            target, problem = self.hub.resolve_instance(
                (payload or {}).get("instanceId"))
            if problem:
                self._json({"error": problem}, 409)
                return

            answer = self.hub.registry.request(
                target, {"type": "browse",
                         "path": str((payload or {}).get("path") or "")})
            if answer is None:
                self._json({"error": "That Blender did not answer in time."},
                           504)
                return
            if answer.get("error"):
                self._json(answer, 400)
                return
            self._json(answer)
            return

        if path == "/api/retry":
            if not self._web_token_ok(payload):
                return
            target, problem = self.hub.resolve_instance(
                (payload or {}).get("instanceId"))
            if problem:
                self._json({"error": problem}, 409)
                return

            inst = self.hub.registry.get(target)
            if inst is not None and (inst.state or {}).get("busy"):
                self._json({"error": "That Blender instance is already busy."},
                           409)
                return

            options = (payload or {}).get("options") or {}
            if not isinstance(options, dict):
                options = {}
            if not self.hub.registry.push(target, {"type": "retry",
                                                   "options": options}):
                self._json({"error": "Could not queue the retry."}, 409)
                return
            self._json({"accepted": True, "instanceId": target})
            return

        if path == "/api/cancel":
            if not self._web_token_ok(payload):
                return
            target, problem = self.hub.resolve_instance(
                (payload or {}).get("instanceId"))
            if problem:
                self._json({"error": problem}, 409)
                return
            self.hub.registry.push(target, {"type": "cancel"})
            self._json({"cancelled": True, "instanceId": target})
            return

        self._json({"error": "Unknown endpoint"}, 404)

    # --- static files -----------------------------------------------------
    def _static(self, path):
        web_dir = self.hub.web_dir
        if not web_dir or not os.path.isdir(web_dir):
            self.send_error(503, "The map interface has not been built")
            return

        rel = posixpath.normpath(path.lstrip("/"))
        if rel in ("", "."):
            rel = "index.html"

        root = os.path.normpath(web_dir)
        target = os.path.normpath(os.path.join(root, *rel.split("/")))

        # Containment check: refuse anything that escapes the web root.
        try:
            if os.path.commonpath([root, target]) != root:
                self.send_error(403, "Forbidden")
                return
        except ValueError:
            self.send_error(403, "Forbidden")
            return

        if not os.path.isfile(target):
            # Single-page app: unknown routes fall back to the entry document.
            target = os.path.join(root, "index.html")
            if not os.path.isfile(target):
                self.send_error(404, "Not found")
                return

        ctype = mimetypes.guess_type(target)[0] or "application/octet-stream"
        try:
            with open(target, "rb") as fh:
                body = fh.read()
        except OSError:
            self.send_error(500, "Could not read file")
            return

        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        # Per-request logging would flood Blender's console.
        pass


class _Server(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, address, hub, loopback_only):
        self.hub = hub
        self.loopback_only = loopback_only
        super().__init__(address, _Handler)


class RunningHub:
    """A hub bound to a port, with its serving thread."""

    def __init__(self, hub, server, thread, host, port):
        self.hub = hub
        self.server = server
        self.thread = thread
        self.host = host
        self.port = port

    @property
    def url(self):
        shown = "127.0.0.1" if self.host in ("0.0.0.0", "::", "") else self.host
        return "http://%s:%d/" % (shown, self.port)

    def stop(self):
        try:
            self.server.shutdown()
        except Exception:
            pass
        try:
            self.server.server_close()
        except Exception:
            pass
        if self.thread is not None:
            self.thread.join(timeout=2.0)


def serve(port=DEFAULT_PORT, web_dir="", host="127.0.0.1", agent_token="",
          port_attempts=1):
    """
    Start a hub. Raises OSError if no port could be bound.

    `port_attempts` above 1 walks upward from `port`, which lets a second
    Blender fall back to its own hub if the first port is taken by something
    that is not one of ours.
    """
    hub = Hub(web_dir=web_dir, agent_token=agent_token)
    loopback_only = host in ("127.0.0.1", "localhost", "::1")

    last = None
    for offset in range(max(1, port_attempts)):
        try:
            server = _Server((host, port + offset), hub, loopback_only)
        except OSError as exc:
            last = exc
            continue
        thread = threading.Thread(target=server.serve_forever,
                                 kwargs={"poll_interval": 0.3},
                                 name="gmeb-hub", daemon=True)
        thread.start()
        return RunningHub(hub, server, thread, host, port + offset)

    raise OSError("could not bind %s:%d (%s)" % (host, port, last))
