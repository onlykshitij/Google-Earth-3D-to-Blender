"""Add-on preferences: where the tools live and how the hub is reached."""

from __future__ import annotations

import os
import shutil
import tempfile

import bpy
from bpy.props import BoolProperty, IntProperty, StringProperty
from bpy.types import AddonPreferences

DEFAULT_PORT = 8777


def default_work_dir() -> str:
    return os.path.join(tempfile.gettempdir(), "google-map-export-bridge")


def find_node() -> str:
    """
    Locate a Node.js interpreter.

    Blender launches with a sanitised environment on some platforms, and macOS
    GUI apps in particular do not inherit a shell PATH, so the usual install
    locations are probed as well.
    """
    found = shutil.which("node")
    if found:
        return found

    candidates = [
        "/usr/local/bin/node",
        "/usr/bin/node",
        "/opt/homebrew/bin/node",
        os.path.expanduser("~/.nvm/versions/node"),
        r"C:\Program Files\nodejs\node.exe",
        r"C:\Program Files (x86)\nodejs\node.exe",
    ]
    for path in candidates:
        if os.path.isfile(path) and os.access(path, os.X_OK):
            return path
    return ""


def _reconnect(self, _context):
    """
    Re-join or re-host after the address settings change.

    Without this, editing Hub URL leaves the old connection in place - and if
    this Blender was hosting, it keeps holding the port, which is exactly what
    blocks a container from taking it. Deferred to a timer so the preferences
    panel is not blocked while the network work happens.
    """
    from . import agent

    if not agent.is_running():
        return

    def apply():
        from . import launch
        try:
            url, hosting, error = launch.connect_hub(bpy.context)
        except Exception as exc:                        # noqa: BLE001
            print("[google-map-export-bridge] reconnect failed: %s" % exc)
            return None
        if error:
            print("[google-map-export-bridge] %s" % error)
        else:
            print("[google-map-export-bridge] now %s at %s"
                  % ("hosting" if hosting else "joined", url))
        return None

    bpy.app.timers.register(apply, first_interval=0.2)


class GMEB_Preferences(AddonPreferences):
    # Set at registration time to the actual package name, which differs between
    # a legacy add-on install and an extension install (bl_ext.*).
    bl_idname = __package__

    node_path: StringProperty(
        name="Node.js",
        description="Path to the node executable. Leave empty to search PATH",
        subtype="FILE_PATH",
        default="",
    )
    work_dir: StringProperty(
        name="Download Cache",
        description="Fallback location for downloads, used when no Export "
                    "Folder is set for the scene",
        subtype="DIR_PATH",
        default="",
    )
    port: IntProperty(
        name="Hub Port",
        description="Port for the map interface. Only 127.0.0.1 is bound, so "
                    "nothing is exposed to the network. If another Blender is "
                    "already hosting here, this one joins it instead",
        default=DEFAULT_PORT,
        min=1024,
        max=65535,
        update=_reconnect,
    )
    hub_url: StringProperty(
        name="Hub URL",
        description="Full address of a hub running outside Blender - the run.py "
                    "script, a Docker container, or one on another machine. "
                    "Accepts http://127.0.0.1:8777, 192.168.1.20:8777, "
                    "my-desktop:8777 or https://maps.example.com. The scheme "
                    "and port are filled in when left off. Empty means host "
                    "the interface inside Blender",
        default="",
        update=_reconnect,
    )
    agent_token: StringProperty(
        name="Hub Token",
        description="Shared secret, only needed if the hub was started with "
                    "one (GMEB_AGENT_TOKEN)",
        default="",
        subtype="PASSWORD",
        update=_reconnect,
    )
    autostart: BoolProperty(
        name="Connect Automatically",
        description="Join or start the map interface as soon as the add-on loads",
        default=True,
    )
    keep_downloads: BoolProperty(
        name="Keep Downloads",
        description="Keep raw tile downloads after importing. Useful for "
                    "re-importing without downloading again, but uses disk space",
        default=True,
    )

    def resolved_node(self) -> str:
        return bpy.path.abspath(self.node_path) if self.node_path else find_node()

    def resolved_work_dir(self) -> str:
        return bpy.path.abspath(self.work_dir) if self.work_dir else default_work_dir()

    def draw(self, _context):
        layout = self.layout

        col = layout.column()
        col.prop(self, "autostart")
        col.prop(self, "keep_downloads")

        box = layout.box()
        box.label(text="Map Interface", icon="WORLD")
        box.prop(self, "hub_url")

        if self.hub_url.strip():
            from . import connect
            resolved = connect.normalise_url(self.hub_url)
            col = box.column(align=True)
            col.scale_y = 0.8
            if resolved:
                col.label(text="Connecting to %s" % resolved, icon="URL")
            else:
                col.label(text="That address cannot be understood.",
                          icon="ERROR")
        else:
            sub = box.column()
            sub.prop(self, "port")
            col = box.column(align=True)
            col.scale_y = 0.8
            col.label(text="Hosted in Blender, or joined if another Blender",
                      icon="INFO")
            col.label(text="got there first.")

        box.prop(self, "agent_token")

        box = layout.box()
        box.label(text="Tools", icon="TOOL_SETTINGS")
        box.prop(self, "node_path")

        node = self.resolved_node()
        row = box.row()
        if node:
            row.label(text="Found: %s" % node, icon="CHECKMARK")
        else:
            row.label(text="Node.js not found - install it from nodejs.org",
                      icon="ERROR")

        box.prop(self, "work_dir")
        box.label(text="Using: %s" % self.resolved_work_dir())


def get_prefs(context=None) -> "GMEB_Preferences":
    context = context or bpy.context
    return context.preferences.addons[__package__].preferences
