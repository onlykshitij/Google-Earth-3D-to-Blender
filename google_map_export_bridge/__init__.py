"""
Google Map Export Bridge - pick an area on a map, get it into Blender as a
correctly oriented, level modelling reference.

Four pieces cooperate:

  * a bundled Node.js exporter that pulls Google Earth's 3D tiles for a bbox,
  * `obj_transform` / `georef`, which move the result out of earth-centred
    coordinates into a local metric frame and level the ground,
  * `hub`, which serves the map interface and keeps a register of connected
    Blender sessions, and
  * `agent`, which reports this session to a hub and collects its commands.

Blender is always the client of the hub, never a server. That is what lets one
interface list several open Blender windows, and lets the hub live in a
container that could not otherwise reach back into a desktop process.

Thread discipline is the thing to keep in mind when editing: only this module's
timer callback runs on Blender's main thread, and only it may touch `bpy`. The
hub's request handlers and the agent and job threads must not.
"""

from __future__ import annotations

import traceback

import bpy
from bpy.props import PointerProperty
from bpy.utils import register_class, unregister_class

from . import (agent, connect, importer, jobs, launch, operators, panel, prefs,
               properties)

bl_info = {
    "name": "Google Map Export Bridge",
    "description": "Import Google Earth 3D areas as oriented, levelled "
                   "modelling references",
    "author": "Sentics",
    "version": (1, 1, 0),
    "blender": (4, 2, 0),
    "location": "View3D > Sidebar > Map Export",
    "category": "Import-Export",
}

TICK_SECONDS = 0.25

_last_ui_state = None


# ---------------------------------------------------------------------------
# main-thread pump
# ---------------------------------------------------------------------------

def _handle_command(context, command):
    kind = (command or {}).get("type")

    if kind == "export":
        bbox = command.get("bbox")
        if not isinstance(bbox, dict):
            return
        job, error = launch.start(context, bbox, command.get("options"))
        if error:
            print("[google-map-export-bridge] export rejected: %s" % error)
            jobs.MANAGER.record_failure(bbox, error)
        else:
            print("[google-map-export-bridge] export %s started" % job.id)

    elif kind == "retry":
        # Re-run the last export unchanged. Tiles are fetched again, which is
        # what recovers a texture that failed to arrive the first time.
        job = jobs.MANAGER.job
        if job is None:
            print("[google-map-export-bridge] nothing to retry")
            return
        bbox = job.params.get("bbox")
        options = command.get("options") or {}
        if not isinstance(bbox, dict):
            return
        started, error = launch.start(context, bbox, options or None)
        if error:
            print("[google-map-export-bridge] retry rejected: %s" % error)
            jobs.MANAGER.record_failure(bbox, error)
        else:
            print("[google-map-export-bridge] retry %s started" % started.id)

    elif kind == "cancel":
        jobs.MANAGER.cancel()


def _drain_commands(context):
    """Act on whatever the hub has queued for this session."""
    while True:
        try:
            command = agent.COMMANDS.get_nowait()
        except Exception:
            return
        try:
            _handle_command(context, command)
        except Exception:
            traceback.print_exc()


def _drain_imports(context):
    """Import models the worker thread has finished converting."""
    while True:
        try:
            job_id = jobs.MANAGER.pending_imports.get_nowait()
        except Exception:
            return

        job = jobs.MANAGER.job
        if job is None or job.id != job_id:
            continue

        options = dict(job.params.get("import_options", {}))
        try:
            summary = importer.import_model(context, job.model_path, options)
            job.textures_missing = getattr(importer.import_model,
                                           "last_missing_textures", 0)
        except Exception as exc:                       # noqa: BLE001
            traceback.print_exc()
            jobs.MANAGER.fail(job_id, exc)
        else:
            print("[google-map-export-bridge] %s" % summary)
            if job.report is not None:
                print("[google-map-export-bridge] %s" % job.report.summary())
            jobs.MANAGER.complete(job_id, summary)


def _refresh_ui(context):
    """Redraw the sidebar only when something it shows has actually changed."""
    global _last_ui_state

    job = jobs.MANAGER.job
    conn = agent.status()
    state = (
        (job.phase, round(job.progress, 3), job.message) if job else None,
        conn.get("connected"),
        conn.get("error"),
    )
    if state == _last_ui_state:
        return
    _last_ui_state = state

    for window in context.window_manager.windows:
        for area in window.screen.areas:
            if area.type == "VIEW_3D":
                area.tag_redraw()


def _tick():
    context = bpy.context
    try:
        if getattr(context, "scene", None) is not None:
            launch.publish_info(context)
            connect.maybe_recover(context, launch.web_dir())
            _drain_commands(context)
            _drain_imports(context)
            _refresh_ui(context)
    except Exception:
        # A raised exception would silently unregister the timer and leave the
        # add-on half-alive, so failures are logged and the pump keeps running.
        traceback.print_exc()
    return TICK_SECONDS


# ---------------------------------------------------------------------------
# registration
# ---------------------------------------------------------------------------

CLASSES = (
    prefs.GMEB_Preferences,
    properties.GMEB_Properties,
) + operators.CLASSES + panel.CLASSES


def register():
    for cls in CLASSES:
        register_class(cls)

    bpy.types.Scene.gmeb = PointerProperty(type=properties.GMEB_Properties)

    if not bpy.app.timers.is_registered(_tick):
        bpy.app.timers.register(_tick, first_interval=0.5, persistent=True)

    # Preferences are not readable during registration in every install path
    # (notably at start-up, before the add-on's own preferences exist), so the
    # connection is made from a one-shot timer once things have settled.
    bpy.app.timers.register(_autoconnect, first_interval=1.0)


def _autoconnect():
    try:
        p = prefs.get_prefs()
        if p.autostart and not agent.is_running():
            url, hosting, error = launch.connect_hub(bpy.context)
            if error:
                print("[google-map-export-bridge] %s" % error)
            else:
                print("[google-map-export-bridge] map interface at %s (%s)"
                      % (url, "hosting" if hosting else "joined"))
    except Exception as exc:                            # noqa: BLE001
        print("[google-map-export-bridge] could not connect: %s" % exc)
    return None


def unregister():
    connect.disconnect()

    if bpy.app.timers.is_registered(_tick):
        bpy.app.timers.unregister(_tick)

    if getattr(bpy.types.Scene, "gmeb", None) is not None:
        del bpy.types.Scene.gmeb

    for cls in reversed(CLASSES):
        try:
            unregister_class(cls)
        except RuntimeError:
            pass
