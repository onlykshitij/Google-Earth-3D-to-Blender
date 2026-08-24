"""
Deciding how this Blender session reaches a hub.

Three situations, resolved in this order:

  1. An external hub is configured (the standalone script or a container). Join
     it and host nothing.
  2. Nothing is listening on the configured port. Host the hub here.
  3. Something is already listening. If it is one of ours - typically another
     Blender that started first - join it, so both sessions appear in the same
     interface and can be picked between. If it is unrelated, walk up the port
     range and host on the first port that is free.

Case 3 is what makes several open Blender windows work without any setup: the
first to start becomes the hub, the rest become agents on it.
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.request

from . import agent, hub as hub_module, prefs

PROBE_TIMEOUT = 2.0
HOST_PORT_ATTEMPTS = 10

_running = None      # hub_module.RunningHub when this session hosts the hub
_joined_url = ""


def is_hosting():
    return _running is not None


def hub_url():
    if _running is not None:
        return _running.url
    return _joined_url


def hosted_port():
    return _running.port if _running is not None else 0


def local_registry():
    """The registry, when this session hosts the hub. Otherwise None."""
    return _running.hub.registry if _running is not None else None


def normalise_url(text):
    """
    Make a hand-typed hub address usable.

    People write `192.168.1.20:8777` or `my-desktop` as often as they write a
    full URL, so the scheme is filled in and a default port added when the
    address carries neither. Returns "" for empty input.
    """
    url = (text or "").strip()
    if not url:
        return ""

    if "://" not in url:
        url = "http://" + url

    scheme, _, rest = url.partition("://")
    rest = rest.strip("/")
    if not rest:
        return ""

    # A bare host with no port would otherwise go to 80 or 443.
    hostpart = rest.split("/", 1)[0]
    if ":" not in hostpart.rsplit("]", 1)[-1] and scheme == "http":
        rest = hostpart + ":%d" % hub_module.DEFAULT_PORT + rest[len(hostpart):]

    return "%s://%s/" % (scheme, rest)


def _probe(url):
    """Return the hub description at `url`, or None if it is not one of ours."""
    try:
        request = urllib.request.Request(url.rstrip("/") + "/api/hub",
                                        headers={"Accept": "application/json"})
        with urllib.request.urlopen(request, timeout=PROBE_TIMEOUT) as response:
            data = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, OSError, ValueError):
        return None
    if isinstance(data, dict) and data.get("service") == hub_module.SERVICE_NAME:
        return data
    return None


def connect(context, web_dir):
    """
    Join or start a hub and begin reporting to it.

    Returns (url, hosting, error_message).
    """
    global _running, _joined_url

    p = prefs.get_prefs(context)
    external = (p.hub_url or "").strip()
    agent_token = (p.agent_token or "").strip()

    if external:
        target = normalise_url(external)
        if not target:
            return "", False, ("The external hub address '%s' could not be "
                               "understood." % external)
        disconnect()
        _joined_url = target
        agent.start(_joined_url, agent_token, hosting=False)
        # Reachability is reported by the agent rather than blocking here, so a
        # hub that is not up yet simply shows as disconnected until it is.
        return _joined_url, False, None

    port = int(p.port)

    # Somebody may already be hosting on the configured port.
    existing = _probe("http://127.0.0.1:%d/" % port)
    if existing is not None:
        disconnect()
        _joined_url = "http://127.0.0.1:%d/" % port
        agent.start(_joined_url, agent_token, hosting=False)
        return _joined_url, False, None

    disconnect()
    try:
        running = hub_module.serve(port=port, web_dir=web_dir,
                                   host="127.0.0.1",
                                   agent_token=agent_token,
                                   port_attempts=HOST_PORT_ATTEMPTS)
    except OSError as exc:
        return "", False, ("Could not start the map interface on ports "
                           "%d-%d: %s" % (port, port + HOST_PORT_ATTEMPTS - 1,
                                          exc))

    _running = running
    _joined_url = ""
    # We register with our own hub over loopback like any other agent, so there
    # is only one code path for reporting state.
    agent.start(running.url, agent_token, hosting=True)
    return running.url, True, None


RECOVER_AFTER_SECONDS = 6.0
RECOVER_COOLDOWN_SECONDS = 5.0

_last_recovery = 0.0


def maybe_recover(context, web_dir):
    """
    Take over hosting if the hub we joined has gone away.

    The usual cause is the Blender that was hosting being closed, which would
    otherwise leave every remaining session pointing at a dead port and no
    interface at all. Whoever notices first binds the port and the rest rejoin
    on their own next attempt.

    Sessions configured against an external hub are left alone: that hub is
    someone else's to run, and the agent keeps retrying it by itself.
    """
    global _last_recovery

    p = prefs.get_prefs(context)
    if (p.hub_url or "").strip():
        return False
    if _running is not None or not agent.is_running():
        return False

    state = agent.status()
    if state.get("connected"):
        return False

    since = time.time() - max(state.get("last_contact", 0.0), 0.0)
    if since < RECOVER_AFTER_SECONDS:
        return False

    now = time.time()
    if now - _last_recovery < RECOVER_COOLDOWN_SECONDS:
        return False
    _last_recovery = now

    url, hosting, error = connect(context, web_dir)
    if error:
        print("[google-map-export-bridge] could not recover the hub: %s" % error)
        return False

    print("[google-map-export-bridge] hub moved to %s (%s)"
          % (url, "hosting here now" if hosting else "rejoined"))
    return True


def disconnect():
    """Stop reporting, and shut down a hub hosted here."""
    global _running, _joined_url

    agent.stop()

    if _running is not None:
        _running.stop()
        _running = None
    _joined_url = ""
