"""
Turn a requested area into a running job.

Both entry points funnel through here - the button in the sidebar and the Export
button on the map page - so they cannot drift apart. Scene properties act as the
defaults; anything the web page sends explicitly overrides them.
"""

from __future__ import annotations

import os
import time

import bpy

from . import agent, connect, jobs, prefs

# See PRACTICAL_MAX_LEVEL in obj_transform for why 20 and not 21.
MAX_USEFUL_LEVEL = 20


def exporter_script() -> str:
    return os.path.join(os.path.dirname(__file__), "exporter", "earth-export.cjs")


def web_dir() -> str:
    return os.path.join(os.path.dirname(__file__), "web")


def publish_info(context):
    """
    Refresh what the hub is told about this Blender session.

    Runs on the main thread, since it reads `bpy`. The agent thread only ever
    reads the resulting dictionary, which is why the values are copied out into
    plain Python types here.
    """
    p = prefs.get_prefs(context)
    scene = context.scene
    settings = getattr(scene, "gmeb", None)

    blend_path = bpy.data.filepath or ""
    info = {
        "blenderVersion": bpy.app.version_string,
        "blendFile": (os.path.basename(blend_path) if blend_path
                      else "Untitled"),
        "blendPath": blend_path,
        "unsaved": bool(bpy.data.is_dirty),
        "sceneName": scene.name if scene else "",
        "pid": os.getpid(),
        "nodeFound": bool(p.resolved_node()),
        "onlineAccess": bool(getattr(bpy.app, "online_access", True)),
        "hosting": connect.is_hosting(),
    }

    if settings is not None:
        info["defaults"] = {
            "level": settings.level,
            "levelGround": settings.level_ground,
            "groundCellSize": settings.ground_cell_size,
            "scale": settings.scale,
            "joinObjects": settings.join_objects,
            "shadeSmooth": settings.shade_smooth,
            "lockReference": settings.lock_reference,
            "adjustClipping": settings.adjust_clipping,
            "replacePrevious": settings.replace_previous,
            "collectionName": settings.collection_name,
            "exportDir": settings.export_dir,
            "trimSubGround": settings.trim_sub_ground,
            "trimDepth": settings.trim_depth,
        }

    agent.INFO.clear()
    agent.INFO.update(info)


def connect_hub(context):
    """Join or host the map interface. Returns (url, hosting, error)."""
    url, hosting, error = connect.connect(context, web_dir())
    if not error:
        publish_info(context)
    return url, hosting, error


def _pick(options, key, fallback):
    """Take `key` from the web payload if present, otherwise the scene default."""
    if isinstance(options, dict) and key in options and options[key] is not None:
        return options[key]
    return fallback


def default_collection_name(bbox) -> str:
    lat = (bbox["minLat"] + bbox["maxLat"]) * 0.5
    lng = (bbox["minLng"] + bbox["maxLng"]) * 0.5
    return "MapExport %.5f %.5f" % (lat, lng)


def _safe_component(text):
    """Reduce a string to something safe to use as a folder name."""
    cleaned = []
    for ch in text:
        cleaned.append(ch if (ch.isalnum() or ch in "-_.") else "_")
    return "".join(cleaned).strip("_") or "area"


def job_folder_name(bbox):
    """
    A readable, unique folder name for one export.

    Coordinates first so folders sort by place, then a timestamp so repeated
    exports of the same area sit side by side instead of overwriting.
    """
    lat = (bbox["minLat"] + bbox["maxLat"]) * 0.5
    lng = (bbox["minLng"] + bbox["maxLng"]) * 0.5
    stamp = time.strftime("%Y%m%d-%H%M%S")
    return _safe_component("%.5f_%.5f_%s" % (lat, lng, stamp))


def build_params(context, bbox, options=None):
    settings = context.scene.gmeb
    p = prefs.get_prefs(context)

    # An explicit export folder wins; otherwise fall back to the cache.
    requested = str(_pick(options, "exportDir", settings.export_dir) or "").strip()
    explicit = bool(requested)
    base_dir = bpy.path.abspath(requested) if explicit else p.resolved_work_dir()
    job_dir = os.path.join(base_dir, job_folder_name(bbox))

    keep_downloads = bool(_pick(options, "keepDownloads", p.keep_downloads))
    # Deleting a folder the user chose themselves would be a nasty surprise, so
    # an explicit destination is always kept.
    if explicit:
        keep_downloads = True

    collection_name = str(_pick(options, "collectionName",
                                settings.collection_name) or "").strip()
    if not collection_name:
        collection_name = default_collection_name(bbox)

    return {
        "node_path": p.resolved_node(),
        "script_path": exporter_script(),
        "job_dir": job_dir,
        "bbox": bbox,
        # Clamped because the interface is not the only caller: the API
        # accepts a level directly, and above 20 the exporter returns less
        # geometry for twice the download.
        "level": max(2, min(MAX_USEFUL_LEVEL,
                            int(_pick(options, "level", settings.level)))),
        "level_ground": bool(_pick(options, "levelGround", settings.level_ground)),
        "ground_cell_size": float(_pick(options, "groundCellSize",
                                        settings.ground_cell_size)),
        "scale": float(_pick(options, "scale", settings.scale)),
        "trim_below": (
            float(_pick(options, "trimDepth", settings.trim_depth))
            if bool(_pick(options, "trimSubGround", settings.trim_sub_ground))
            else 0.0
        ),
        "keep_downloads": keep_downloads,
        # The exporter always writes to <cwd>/downloaded_files/obj/<timestamp>/.
        # Lifting those files up into the job folder is what makes the chosen
        # destination hold the model rather than a tree of scaffolding.
        "flatten_output": True,
        "import_options": {
            "collection_name": collection_name,
            "join_objects": bool(_pick(options, "joinObjects",
                                       settings.join_objects)),
            "shade_smooth": bool(_pick(options, "shadeSmooth",
                                       settings.shade_smooth)),
            "lock_reference": bool(_pick(options, "lockReference",
                                         settings.lock_reference)),
            "adjust_clipping": bool(_pick(options, "adjustClipping",
                                          settings.adjust_clipping)),
            "replace_previous": bool(_pick(options, "replacePrevious",
                                           settings.replace_previous)),
            # Without the download cache the texture files would vanish from
            # under the materials, so pack them into the .blend instead.
            "pack_images": not keep_downloads,
        },
    }


def bbox_from_scene(context):
    s = context.scene.gmeb
    return {
        "minLat": float(s.min_lat),
        "minLng": float(s.min_lng),
        "maxLat": float(s.max_lat),
        "maxLng": float(s.max_lng),
    }


def apply_bbox_to_scene(context, bbox):
    """Mirror an area chosen on the map into the sidebar fields."""
    s = context.scene.gmeb
    s.min_lat = bbox["minLat"]
    s.min_lng = bbox["minLng"]
    s.max_lat = bbox["maxLat"]
    s.max_lng = bbox["maxLng"]


def validate(bbox):
    if bbox["maxLat"] <= bbox["minLat"] or bbox["maxLng"] <= bbox["minLng"]:
        return "The selected area is empty - drag out a rectangle first."
    if not os.path.isfile(exporter_script()):
        return "The bundled exporter is missing from the add-on."
    return None


def start(context, bbox, options=None):
    """Validate and launch. Returns (job, error_message)."""
    problem = validate(bbox)
    if problem:
        return None, problem

    params = build_params(context, bbox, options)

    # Fail here, with a message naming the folder, rather than part-way through
    # a download that has nowhere to land.
    destination = os.path.dirname(params["job_dir"])
    try:
        os.makedirs(destination, exist_ok=True)
    except OSError as exc:
        return None, ("Cannot use the export folder %s - %s" % (destination, exc))
    if not os.access(destination, os.W_OK):
        return None, "The export folder %s is not writable." % destination

    if not params["node_path"]:
        return None, ("Node.js was not found. Install it from nodejs.org, then "
                      "set the path in Preferences if it is still not picked up.")

    online = getattr(bpy.app, "online_access", True)
    if not online:
        return None, ("Blender is in offline mode, so map tiles cannot be "
                      "downloaded. Enable it under Preferences > System > "
                      "Network > Allow Online Access.")

    try:
        job = jobs.MANAGER.start(params)
    except RuntimeError as exc:
        return None, str(exc)

    apply_bbox_to_scene(context, bbox)
    return job, None
