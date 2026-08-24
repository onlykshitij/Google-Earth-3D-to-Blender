"""Sidebar UI. The map page is the main way in; this mirrors it inside Blender."""

from __future__ import annotations

from bpy.types import Panel

from . import agent, connect, jobs

PHASE_ICONS = {
    jobs.PHASE_QUEUED: "TIME",
    jobs.PHASE_DOWNLOADING: "IMPORT",
    jobs.PHASE_CONVERTING: "DRIVER_TRANSFORM",
    jobs.PHASE_IMPORTING: "OUTLINER_OB_MESH",
    jobs.PHASE_DONE: "CHECKMARK",
    jobs.PHASE_ERROR: "ERROR",
    jobs.PHASE_CANCELLED: "CANCEL",
}


class _Base:
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "Map Export"


class GMEB_PT_main(_Base, Panel):
    bl_label = "Map Export Bridge"
    bl_idname = "GMEB_PT_main"

    def draw(self, context):
        layout = self.layout

        # --- map interface -------------------------------------------------
        box = layout.box()
        conn = agent.status()

        row = box.row(align=True)
        if not agent.is_running():
            row.label(text="Not connected", icon="UNLINKED")
        elif conn.get("connected"):
            if connect.is_hosting():
                row.label(text="Hosting on port %d" % connect.hosted_port(),
                          icon="URL")
            else:
                row.label(text="Joined the hub", icon="LINKED")
        else:
            row.label(text="Reaching the hub...", icon="SORTTIME")

        if agent.is_running():
            row.operator("gmeb.disconnect", text="", icon="X")

        if conn.get("error"):
            col = box.column(align=True)
            col.scale_y = 0.8
            for i, line in enumerate(_wrap(conn["error"], 34)):
                col.label(text=line, icon="ERROR" if i == 0 else "BLANK1")

        row = box.row(align=True)
        row.scale_y = 1.3
        row.operator("gmeb.open_interface", icon="WORLD")
        if agent.is_running():
            row.operator("gmeb.copy_url", text="", icon="COPYDOWN")
        else:
            row.operator("gmeb.connect", text="", icon="PLAY")

        box.label(text="Select the area in the map interface.")

        # --- progress ------------------------------------------------------
        job = jobs.MANAGER.job
        if job is not None:
            box = layout.box()
            icon = PHASE_ICONS.get(job.phase, "INFO")
            box.label(text=job.phase.title(), icon=icon)

            if job.phase not in jobs.TERMINAL_PHASES:
                box.progress(factor=job.progress,
                             text=job.message[:48] or job.phase)
                box.operator("gmeb.cancel", icon="CANCEL")
            else:
                col = box.column(align=True)
                col.scale_y = 0.8
                for line in _wrap(job.message, 34):
                    col.label(text=line)

                if job.report is not None and job.phase == jobs.PHASE_DONE:
                    r = job.report
                    col = box.column(align=True)
                    col.scale_y = 0.8
                    col.label(text="%.0f x %.0f m, %s verts"
                                   % (r.size_x_m, r.size_y_m,
                                      format(r.vertex_count, ",")))
                    col.label(text="Tilt removed %.2f deg" % r.tilt_removed_deg)
                    col.label(text="Ground fit %d/%d cells, %.2f m rms"
                                   % (r.ground_inliers, r.ground_cells,
                                      r.ground_rms_m))
                    col.label(text="%.2f verts/m2, relief %.1f m"
                                   % (r.vertex_density, r.relief_m))
                    if job.textures_blank:
                        col.label(text="%d tile(s) had no imagery"
                                       % job.textures_blank, icon="INFO")

                    if r.coverage != "3d" and r.coverage_note:
                        warn = box.column(align=True)
                        warn.scale_y = 0.8
                        warn.label(
                            text=("No 3D coverage" if r.coverage == "flat"
                                  else "Thin coverage"),
                            icon="ERROR")
                        for line in _wrap(r.coverage_note, 34):
                            warn.label(text=line)

        layout.separator()
        col = layout.column(align=True)
        col.scale_y = 1.4
        col.operator("gmeb.export", icon="IMPORT")


class GMEB_PT_area(_Base, Panel):
    bl_label = "Area"
    bl_parent_id = "GMEB_PT_main"

    def draw(self, context):
        layout = self.layout
        settings = context.scene.gmeb

        layout.label(text="Filled in by the map interface", icon="INFO")

        col = layout.column(align=True)
        col.prop(settings, "max_lat")
        row = col.row(align=True)
        row.prop(settings, "min_lng")
        row.prop(settings, "max_lng")
        col.prop(settings, "min_lat")

        size = _area_size(settings)
        if size is not None:
            width, height = size
            box = layout.box()
            box.scale_y = 0.8
            box.label(text="About %.0f x %.0f m" % (width, height))
            if width * height > 1_000_000:
                box.label(text="Large area - slow download", icon="ERROR")

        layout.prop(settings, "level")


class GMEB_PT_orientation(_Base, Panel):
    bl_label = "Orientation"
    bl_parent_id = "GMEB_PT_main"

    def draw(self, context):
        layout = self.layout
        settings = context.scene.gmeb

        col = layout.column()
        col.prop(settings, "level_ground")
        sub = col.column()
        sub.enabled = settings.level_ground
        sub.prop(settings, "ground_cell_size")
        col.prop(settings, "scale")

        col.separator()
        col.prop(settings, "trim_sub_ground")
        sub = col.column()
        sub.enabled = settings.trim_sub_ground and settings.level_ground
        sub.prop(settings, "trim_depth")


class GMEB_PT_files(_Base, Panel):
    bl_label = "Files"
    bl_parent_id = "GMEB_PT_main"

    def draw(self, context):
        layout = self.layout
        settings = context.scene.gmeb

        layout.prop(settings, "export_dir")

        col = layout.column(align=True)
        col.scale_y = 0.8
        if settings.export_dir.strip():
            col.label(text="Each export gets a dated subfolder here.")
        else:
            col.label(text="Using the temporary download cache.", icon="INFO")

        job = jobs.MANAGER.job
        if job is not None and job.output_dir:
            box = layout.box()
            box.scale_y = 0.8
            box.label(text="Last export:", icon="FILE_FOLDER")
            for line in _wrap(job.output_dir, 32):
                box.label(text=line)
            box.operator("gmeb.open_output", icon="FILEBROWSER")


class GMEB_PT_scene(_Base, Panel):
    bl_label = "Scene"
    bl_parent_id = "GMEB_PT_main"
    bl_options = {"DEFAULT_CLOSED"}

    def draw(self, context):
        layout = self.layout
        settings = context.scene.gmeb

        col = layout.column()
        col.prop(settings, "collection_name")
        col.prop(settings, "replace_previous")
        col.prop(settings, "join_objects")
        col.prop(settings, "shade_smooth")
        col.prop(settings, "lock_reference")
        col.prop(settings, "adjust_clipping")

        layout.operator("gmeb.reimport", icon="FILE_REFRESH")


def _wrap(text, width):
    """Break a message into label-sized lines; Blender labels do not wrap."""
    words = (text or "").split()
    lines, current = [], ""
    for word in words:
        candidate = (current + " " + word).strip()
        if len(candidate) > width and current:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines[:6] or [""]


def _area_size(settings):
    """Rough ground size of the selection, in metres."""
    import math

    d_lat = settings.max_lat - settings.min_lat
    d_lng = settings.max_lng - settings.min_lng
    if d_lat <= 0 or d_lng <= 0:
        return None

    mean_lat = math.radians((settings.max_lat + settings.min_lat) * 0.5)
    metres_per_degree = 111_320.0
    return (d_lng * metres_per_degree * math.cos(mean_lat),
            d_lat * metres_per_degree)


CLASSES = (GMEB_PT_main, GMEB_PT_area, GMEB_PT_orientation, GMEB_PT_files,
           GMEB_PT_scene)
