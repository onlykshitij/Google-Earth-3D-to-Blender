"""Scene-level properties: the selected area and the import options."""

from __future__ import annotations

from bpy.props import (BoolProperty, FloatProperty, IntProperty,
                       StringProperty)
from bpy.types import PropertyGroup

# See PRACTICAL_MAX_LEVEL in obj_transform for why 20 and not 21.
MAX_USEFUL_LEVEL = 20


class GMEB_Properties(PropertyGroup):
    # --- selected area -----------------------------------------------------
    min_lat: FloatProperty(
        name="Min Lat", description="Southern edge of the area",
        default=52.51550, min=-89.0, max=89.0, precision=6,
    )
    min_lng: FloatProperty(
        name="Min Lng", description="Western edge of the area",
        default=13.37500, min=-180.0, max=180.0, precision=6,
    )
    max_lat: FloatProperty(
        name="Max Lat", description="Northern edge of the area",
        default=52.51700, min=-89.0, max=89.0, precision=6,
    )
    max_lng: FloatProperty(
        name="Max Lng", description="Eastern edge of the area",
        default=13.37900, min=-180.0, max=180.0, precision=6,
    )

    # --- export options ----------------------------------------------------
    level: IntProperty(
        name="Detail",
        description="Maximum octant depth. 20 is as fine as this usefully goes; "
                    "each step down roughly quarters the download",
        default=20, min=14, max=MAX_USEFUL_LEVEL,
    )

    # --- orientation and placement -----------------------------------------
    level_ground: BoolProperty(
        name="Level Ground",
        description="Fit a plane to the ground and rotate it flat, then sit it "
                    "at Z=0. Terrain relief is kept; only the overall tilt goes",
        default=True,
    )
    ground_cell_size: FloatProperty(
        name="Ground Cell",
        description="Grid size used to sample ground height. Larger values are "
                    "more robust on cluttered sites, smaller ones follow "
                    "narrow streets more closely",
        default=4.0, min=0.5, max=50.0, subtype="DISTANCE",
    )
    scale: FloatProperty(
        name="Scale",
        description="Unit scale. 1.0 makes one Blender unit one metre",
        default=1.0, min=0.0001, max=1000.0,
    )
    trim_sub_ground: BoolProperty(
        name="Trim Below Ground",
        description="Discard geometry hanging below the ground. Google's tiles "
                    "include a flat clip sheet tens of metres under the terrain; "
                    "this removes it, but would also cut genuinely sunken ground",
        default=False,
    )
    trim_depth: FloatProperty(
        name="Trim Depth",
        description="How far below the ground plane to start cutting",
        default=2.0, min=0.1, max=200.0, subtype="DISTANCE",
    )

    # --- files -------------------------------------------------------------
    export_dir: StringProperty(
        name="Export Folder",
        description="Folder to download into and import from. Each export gets "
                    "its own dated subfolder here, holding the model, its "
                    "material file and its textures. Leave empty to use the "
                    "temporary download cache set in the add-on preferences",
        subtype="DIR_PATH",
        default="",
    )

    # --- scene handling ----------------------------------------------------
    collection_name: StringProperty(
        name="Collection",
        description="Collection to import into. Left empty, one is named after "
                    "the coordinates",
        default="",
    )
    join_objects: BoolProperty(
        name="Join Into One Object",
        description="Merge the imported tiles into a single object. Tidier to "
                    "handle, but it drops the per-tile structure",
        default=False,
    )
    shade_smooth: BoolProperty(
        name="Smooth Shading",
        description="Smooth-shade the result. Google's meshes are dense enough "
                    "that this usually reads better than faceted",
        default=True,
    )
    lock_reference: BoolProperty(
        name="Lock In Place",
        description="Make the imported objects unselectable, so they cannot be "
                    "nudged while you model against them",
        default=True,
    )
    adjust_clipping: BoolProperty(
        name="Fit View Clipping",
        description="Widen the viewport clip range if the model is larger than "
                    "the current setting, which otherwise clips it away",
        default=True,
    )
    replace_previous: BoolProperty(
        name="Replace Previous Import",
        description="Delete the previously imported reference before importing "
                    "a new one",
        default=False,
    )

    # Job status deliberately lives in jobs.MANAGER rather than in scene
    # properties: writing progress into the scene every tick would keep marking
    # the .blend as modified. The panel reads the manager directly instead.
