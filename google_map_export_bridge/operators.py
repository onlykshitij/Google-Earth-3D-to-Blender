"""Operators for the sidebar: connect to the hub, open the map, run an export."""

from __future__ import annotations

import webbrowser

from bpy.types import Operator

from . import agent, connect, jobs, launch


class GMEB_OT_connect(Operator):
    bl_idname = "gmeb.connect"
    bl_label = "Connect"
    bl_description = ("Join the map interface, or host it here if nothing else "
                      "is hosting it yet")

    @classmethod
    def poll(cls, _context):
        return not agent.is_running()

    def execute(self, context):
        url, hosting, error = launch.connect_hub(context)
        if error:
            self.report({"ERROR"}, error)
            return {"CANCELLED"}

        self.report({"INFO"}, "Map interface at %s (%s)"
                    % (url, "hosting" if hosting else "joined"))
        return {"FINISHED"}


class GMEB_OT_disconnect(Operator):
    bl_idname = "gmeb.disconnect"
    bl_label = "Disconnect"
    bl_description = ("Stop reporting to the map interface, and shut it down if "
                      "this Blender is hosting it")

    @classmethod
    def poll(cls, _context):
        return agent.is_running()

    def execute(self, _context):
        connect.disconnect()
        self.report({"INFO"}, "Disconnected from the map interface")
        return {"FINISHED"}


class GMEB_OT_open_interface(Operator):
    bl_idname = "gmeb.open_interface"
    bl_label = "Open Map"
    bl_description = "Open the map interface in your browser to select an area"

    def execute(self, context):
        if not agent.is_running():
            _url, _hosting, error = launch.connect_hub(context)
            if error:
                self.report({"ERROR"}, error)
                return {"CANCELLED"}

        url = connect.hub_url()
        if not url:
            self.report({"ERROR"}, "No map interface address is known yet")
            return {"CANCELLED"}

        webbrowser.open(url)
        self.report({"INFO"}, "Opened %s" % url)
        return {"FINISHED"}


class GMEB_OT_copy_url(Operator):
    bl_idname = "gmeb.copy_url"
    bl_label = "Copy Address"
    bl_description = "Copy the map interface address to the clipboard"

    @classmethod
    def poll(cls, _context):
        return bool(connect.hub_url())

    def execute(self, context):
        url = connect.hub_url()
        context.window_manager.clipboard = url
        self.report({"INFO"}, "Copied %s" % url)
        return {"FINISHED"}


class GMEB_OT_export(Operator):
    bl_idname = "gmeb.export"
    bl_label = "Fetch And Import"
    bl_description = ("Download the area shown below and import it into this "
                      "scene. Areas are normally chosen visually in the map "
                      "interface, which fills these fields in")

    @classmethod
    def poll(cls, _context):
        return not jobs.MANAGER.is_busy()

    def execute(self, context):
        bbox = launch.bbox_from_scene(context)
        job, error = launch.start(context, bbox)
        if error:
            self.report({"ERROR"}, error)
            return {"CANCELLED"}

        self.report({"INFO"}, "Export started (%s)" % job.id)
        return {"FINISHED"}


class GMEB_OT_cancel(Operator):
    bl_idname = "gmeb.cancel"
    bl_label = "Cancel"
    bl_description = "Stop the running export"

    @classmethod
    def poll(cls, _context):
        return jobs.MANAGER.is_busy()

    def execute(self, _context):
        if jobs.MANAGER.cancel():
            self.report({"INFO"}, "Cancelling export")
        return {"FINISHED"}


class GMEB_OT_open_output(Operator):
    bl_idname = "gmeb.open_output"
    bl_label = "Open Folder"
    bl_description = "Show the folder the last export was written to"

    @classmethod
    def poll(cls, _context):
        job = jobs.MANAGER.job
        return job is not None and bool(job.output_dir)

    def execute(self, _context):
        import os
        import subprocess
        import sys

        path = jobs.MANAGER.job.output_dir
        if not path or not os.path.isdir(path):
            self.report({"ERROR"}, "That folder no longer exists")
            return {"CANCELLED"}

        try:
            if sys.platform == "win32":
                os.startfile(path)                       # noqa: S606
            elif sys.platform == "darwin":
                subprocess.Popen(["open", path])
            else:
                subprocess.Popen(["xdg-open", path])
        except Exception as exc:                         # noqa: BLE001
            self.report({"ERROR"}, "Could not open the folder: %s" % exc)
            return {"CANCELLED"}
        return {"FINISHED"}


class GMEB_OT_reimport(Operator):
    bl_idname = "gmeb.reimport"
    bl_label = "Re-import Last Model"
    bl_description = ("Import the most recently converted model again, without "
                      "downloading it a second time")

    @classmethod
    def poll(cls, _context):
        job = jobs.MANAGER.job
        return job is not None and job.model_path is not None

    def execute(self, context):
        from . import importer

        job = jobs.MANAGER.job
        options = dict(job.params.get("import_options", {}))
        try:
            summary = importer.import_model(context, job.model_path, options)
        except Exception as exc:                       # noqa: BLE001
            self.report({"ERROR"}, str(exc))
            return {"CANCELLED"}

        self.report({"INFO"}, summary)
        return {"FINISHED"}


CLASSES = (
    GMEB_OT_connect,
    GMEB_OT_disconnect,
    GMEB_OT_open_interface,
    GMEB_OT_copy_url,
    GMEB_OT_export,
    GMEB_OT_cancel,
    GMEB_OT_open_output,
    GMEB_OT_reimport,
)
