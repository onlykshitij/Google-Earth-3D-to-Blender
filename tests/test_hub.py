"""
Tests for the hub: registration, routing to a chosen Blender, and the guards.

    python tests/test_hub.py

Runs against a real HTTP server on a loopback port, with fake agents standing
in for Blender, so the wire protocol is exercised rather than mocked.
"""

import importlib.util
import json
import os
import socket
import sys
import tempfile
import time
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HUB_PATH = os.path.join(ROOT, "google_map_export_bridge", "hub.py")

spec = importlib.util.spec_from_file_location("gmeb_hub_test", HUB_PATH)
hub = importlib.util.module_from_spec(spec)
sys.modules["gmeb_hub_test"] = hub
spec.loader.exec_module(hub)

FAILURES = []


def check(label, ok, detail=""):
    print("[%s] %s%s" % ("ok  " if ok else "FAIL", label,
                         (" - " + str(detail)) if detail else ""))
    if not ok:
        FAILURES.append(label)
    return ok


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


# A minimal web root so static serving can be checked.
WEB = tempfile.mkdtemp(prefix="gmeb-web-")
with open(os.path.join(WEB, "index.html"), "w", encoding="utf-8") as fh:
    fh.write("<!doctype html><title>Google Map Export Bridge</title><div id=root></div>")
with open(os.path.join(ROOT, "tests", "_secret_probe.txt"), "w", encoding="utf-8") as fh:
    fh.write("must-not-be-served")

PORT = free_port()
running = hub.serve(port=PORT, web_dir=WEB, host="127.0.0.1")
BASE = "http://127.0.0.1:%d" % running.port
print("hub on", BASE)


def get(path, expect=200):
    try:
        with urllib.request.urlopen(BASE + path, timeout=6) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except ValueError:
            return e.code, {"raw": raw}


def post(path, payload, timeout=12):
    req = urllib.request.Request(
        BASE + path, data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except ValueError:
            return e.code, {"raw": raw}


def raw_get(path):
    try:
        with urllib.request.urlopen(BASE + path, timeout=6) as r:
            return r.status, r.read().decode(errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode(errors="replace")


BBOX = {"minLat": 43.7230, "minLng": 10.3940, "maxLat": 43.7233, "maxLng": 10.3944}


def agent_poll(instance_id, info=None, state=None):
    return post("/api/agent/poll", {"id": instance_id,
                                    "info": info or {},
                                    "state": state or {"busy": False, "job": None}})


try:
    # --- identity and discovery -----------------------------------------
    print("\n--- discovery ---")
    status, body = get("/api/hub")
    check("GET /api/hub identifies the service",
          status == 200 and body.get("service") == hub.SERVICE_NAME, body)

    status, body = get("/api/session")
    token = body.get("token", "")
    check("GET /api/session issues a token", status == 200 and len(token) > 20)

    status, body = get("/api/instances")
    check("no instances before any agent checks in",
          status == 200 and body["instances"] == [])

    # --- static serving -------------------------------------------------
    print("\n--- static files ---")
    status, text = raw_get("/")
    check("serves index.html", status == 200 and "Google Map Export Bridge" in text)

    status, text = raw_get("/some/spa/route")
    check("unknown routes fall back to the app", status == 200 and "root" in text)

    status, text = raw_get("/../tests/_secret_probe.txt")
    check("path traversal is refused",
          status in (403, 404) or "must-not-be-served" not in text,
          "HTTP %d" % status)

    # --- agent registration ---------------------------------------------
    print("\n--- agents ---")
    status, body = agent_poll("aaa", {"blendFile": "alpha.blend", "pid": 1})
    check("agent poll is accepted",
          status == 200 and body.get("commands") == [], body)

    agent_poll("bbb", {"blendFile": "beta.blend", "pid": 2})
    status, body = get("/api/instances")
    files = sorted(i["info"].get("blendFile") for i in body["instances"])
    check("both instances are listed", files == ["alpha.blend", "beta.blend"], files)
    check("instances report as online",
          all(i["online"] for i in body["instances"]))

    status, body = post("/api/agent/poll", {"info": {}})
    check("poll without an id is refused", status == 400, body.get("error"))

    # --- export routing --------------------------------------------------
    print("\n--- routing ---")
    status, body = post("/api/export", {"bbox": BBOX})
    check("export without a token is refused", status == 403, body.get("error"))

    status, body = post("/api/export", {"token": token, "instanceId": "aaa",
                                        "bbox": {"minLat": 5, "minLng": 5,
                                                 "maxLat": 5, "maxLng": 6}})
    check("empty bbox is refused", status == 400, body.get("error"))

    status, body = post("/api/export", {"token": token, "instanceId": "aaa",
                                        "bbox": {"minLat": 200, "minLng": 5,
                                                 "maxLat": 201, "maxLng": 6}})
    check("out-of-range latitude is refused", status == 400, body.get("error"))

    status, body = post("/api/export", {"token": token, "bbox": BBOX})
    check("ambiguous target is refused when several are connected",
          status == 409 and "pick one" in (body.get("error") or ""),
          body.get("error"))

    status, body = post("/api/export", {"token": token, "instanceId": "nope",
                                        "bbox": BBOX})
    check("unknown target is refused", status == 409, body.get("error"))

    status, body = post("/api/export", {"token": token, "instanceId": "bbb",
                                        "bbox": BBOX,
                                        "options": {"level": 19}})
    check("export to a named instance is accepted",
          status == 200 and body.get("instanceId") == "bbb", body)

    # The command must reach only the instance it was addressed to.
    status, body = agent_poll("aaa", {"blendFile": "alpha.blend", "pid": 1})
    check("the other instance receives nothing", body.get("commands") == [],
          body.get("commands"))

    status, body = agent_poll("bbb", {"blendFile": "beta.blend", "pid": 2})
    commands = body.get("commands") or []
    check("the addressed instance receives the export",
          len(commands) == 1 and commands[0]["type"] == "export"
          and commands[0]["options"] == {"level": 19}, commands)

    status, body = agent_poll("bbb", {"blendFile": "beta.blend", "pid": 2})
    check("commands are delivered only once", body.get("commands") == [])

    # --- busy and cancel --------------------------------------------------
    print("\n--- busy and cancel ---")
    agent_poll("bbb", {"blendFile": "beta.blend", "pid": 2},
               {"busy": True, "job": {"phase": "downloading"}})
    status, body = post("/api/export", {"token": token, "instanceId": "bbb",
                                        "bbox": BBOX})
    check("a busy instance rejects a second export",
          status == 409 and "busy" in (body.get("error") or ""), body.get("error"))

    status, body = post("/api/cancel", {"token": token, "instanceId": "bbb"})
    check("cancel is accepted", status == 200 and body.get("cancelled"), body)
    status, body = agent_poll("bbb", {"blendFile": "beta.blend"})
    check("cancel reaches the instance",
          any(c["type"] == "cancel" for c in body.get("commands") or []))

    status, body = post("/api/cancel", {"instanceId": "bbb"})
    check("cancel without a token is refused", status == 403)

    # --- single instance needs no explicit target -------------------------
    print("\n--- single instance ---")
    post("/api/agent/leave", {"id": "bbb"})
    status, body = get("/api/instances")
    check("leaving removes the instance",
          [i["id"] for i in body["instances"]] == ["aaa"],
          [i["id"] for i in body["instances"]])

    status, body = post("/api/export", {"token": token, "bbox": BBOX})
    check("with one instance, no target need be given",
          status == 200 and body.get("instanceId") == "aaa", body)

    # --- expiry -----------------------------------------------------------
    print("\n--- expiry ---")
    original = hub.INSTANCE_TIMEOUT_SECONDS
    hub.INSTANCE_TIMEOUT_SECONDS = 0.4
    try:
        time.sleep(0.9)
        status, body = get("/api/instances")
        offline = [i for i in body["instances"] if not i["online"]]
        check("a silent instance goes offline", len(offline) == 1, body["instances"])

        status, body = post("/api/export", {"token": token, "bbox": BBOX})
        check("an offline instance cannot be exported to",
              status == 409, body.get("error"))
    finally:
        hub.INSTANCE_TIMEOUT_SECONDS = original

    # --- browsing, which is a round trip over a one-way transport ---------
    print("")
    print("--- folder browsing ---")

    import threading

    stop_agent = threading.Event()
    seen_paths = []

    def fake_agent():
        """Stand in for Blender: poll, and answer any browse request."""
        results = {}
        while not stop_agent.is_set():
            body = {"id": "ccc", "info": {"blendFile": "browsing.blend"},
                    "state": {"busy": False, "job": None}}
            if results:
                body["results"] = results
                results = {}
            _status, reply = post("/api/agent/poll", body)
            for item in reply.get("requests") or []:
                seen_paths.append(item.get("path"))
                results[item["id"]] = {
                    "path": item.get("path") or "/root",
                    "parent": None,
                    "entries": [{"name": "refs", "path": "/root/refs"}],
                    "roots": [{"name": "Home", "path": "/root"}],
                    "sep": "/",
                    "writable": True,
                }
            if results:
                continue
            stop_agent.wait(float(reply.get("pollSeconds") or 1.5))

    thread = threading.Thread(target=fake_agent, daemon=True)
    thread.start()
    time.sleep(0.5)

    started = time.time()
    status, body = post("/api/browse", {"token": token, "instanceId": "ccc",
                                        "path": "/root"})
    elapsed = time.time() - started
    check("browse reaches the instance and comes back",
          status == 200 and body.get("entries") == [
              {"name": "refs", "path": "/root/refs"}], body)
    check("the request carried the path asked for", seen_paths[:1] == ["/root"],
          seen_paths[:1])
    check("round trip is quick enough to feel interactive", elapsed < 4.0,
          "%.2fs" % elapsed)

    status, body = post("/api/browse", {"instanceId": "ccc", "path": "/root"})
    check("browse without a token is refused", status == 403)

    status, body = post("/api/browse", {"token": token, "instanceId": "gone",
                                        "path": "/root"})
    check("browse at an unknown instance is refused", status == 409,
          body.get("error"))

    stop_agent.set()
    thread.join(timeout=3)
    post("/api/agent/leave", {"id": "ccc"})

    # A request nobody answers must give up rather than hang for ever.
    agent_poll("ddd", {"blendFile": "silent.blend"})
    original_timeout = hub.REQUEST_TIMEOUT_SECONDS
    hub.REQUEST_TIMEOUT_SECONDS = 1.0
    try:
        started = time.time()
        status, body = post("/api/browse", {"token": token, "instanceId": "ddd",
                                            "path": "/root"})
        waited = time.time() - started
        check("an unanswered browse times out", status == 504, body.get("error"))
        check("and gives up promptly", waited < 4.0, "%.2fs" % waited)
    finally:
        hub.REQUEST_TIMEOUT_SECONDS = original_timeout
        post("/api/agent/leave", {"id": "ddd"})

    # --- version ----------------------------------------------------------
    print("")
    print("--- version ---")
    status, body = get("/api/hub")
    check("the hub reports its version", bool(body.get("version")),
          body.get("version"))

    # --- agent token ------------------------------------------------------
    print("\n--- agent token ---")
    secured = hub.serve(port=free_port(), web_dir=WEB, host="127.0.0.1",
                        agent_token="s3cret")
    sbase = "http://127.0.0.1:%d" % secured.port
    try:
        def spost(path, payload):
            req = urllib.request.Request(
                sbase + path, data=json.dumps(payload).encode(),
                headers={"Content-Type": "application/json"}, method="POST")
            try:
                with urllib.request.urlopen(req, timeout=6) as r:
                    return r.status, json.loads(r.read().decode())
            except urllib.error.HTTPError as e:
                return e.code, json.loads(e.read().decode())

        status, body = spost("/api/agent/poll", {"id": "x"})
        check("agent without the token is refused", status == 403, body.get("error"))

        status, body = spost("/api/agent/poll", {"id": "x",
                                                 "agentToken": "s3cret"})
        check("agent with the token is accepted", status == 200, body)
    finally:
        secured.stop()

finally:
    running.stop()
    probe = os.path.join(ROOT, "tests", "_secret_probe.txt")
    if os.path.exists(probe):
        os.remove(probe)

print("\n" + "=" * 62)
if FAILURES:
    print("%d FAILED: %s" % (len(FAILURES), ", ".join(FAILURES)))
else:
    print("ALL CHECKS PASSED")
print("=" * 62)
sys.exit(1 if FAILURES else 0)
