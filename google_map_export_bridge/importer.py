"""
Main-thread side of an import: pull the converted OBJ into the current scene.

Everything here touches `bpy` and so must run on Blender's main thread. It is
called from the timer in `__init__.py`, never from the worker thread.
"""

from __future__ import annotations

import os

import bpy

MARKER = "google_map_export_bridge"


def _find_layer_collection(layer_coll, target):
    if layer_coll.collection is target:
        return layer_coll
    for child in layer_coll.children:
        found = _find_layer_collection(child, target)
        if found is not None:
            return found
    return None


def _remove_previous_imports(context):
    """Delete collections this add-on created earlier, and their objects."""
    removed = 0
    for coll in list(bpy.data.collections):
        if not coll.get(MARKER):
            continue
        for obj in list(coll.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.collections.remove(coll)
        removed += 1

    if removed:
        # Meshes and images are left without users; clear them so repeated
        # imports do not grow the file without bound.
        for mesh in list(bpy.data.meshes):
            if mesh.users == 0:
                bpy.data.meshes.remove(mesh)
        for mat in list(bpy.data.materials):
            if mat.users == 0:
                bpy.data.materials.remove(mat)
        for img in list(bpy.data.images):
            if img.users == 0:
                bpy.data.images.remove(img)
    return removed


def _set_texture_extension(objects):
    """
    Clamp texture sampling at the edges.

    Each Google tile has its own atlas and UVs can land a hair outside 0..1, so
    the default repeat wraps a sliver of the opposite edge into view as a bright
    seam along every tile boundary.
    """
    seen = set()
    for obj in objects:
        for slot in obj.material_slots:
            mat = slot.material
            if mat is None or mat.name in seen or not mat.use_nodes:
                continue
            seen.add(mat.name)
            for node in mat.node_tree.nodes:
                if node.type == "TEX_IMAGE":
                    node.extension = "EXTEND"


def _apply_smooth(context, objects, smooth):
    meshes = [o for o in objects if o.type == "MESH"]
    if not meshes:
        return
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    context.view_layer.objects.active = meshes[0]
    if smooth:
        bpy.ops.object.shade_smooth()
    else:
        bpy.ops.object.shade_flat()


def _join(context, objects, name):
    meshes = [o for o in objects if o.type == "MESH"]
    if len(meshes) < 2:
        return meshes[0] if meshes else None
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    joined = context.view_layer.objects.active
    joined.name = name
    return joined


def _fit_clipping(context, objects):
    """Widen viewport clipping if the model would otherwise be clipped away."""
    extent = 0.0
    for obj in objects:
        for axis in obj.dimensions:
            extent = max(extent, abs(axis))
    if extent <= 0.0:
        return

    needed = extent * 4.0
    for window in context.window_manager.windows:
        for area in window.screen.areas:
            if area.type != "VIEW_3D":
                continue
            for space in area.spaces:
                if space.type != "VIEW_3D":
                    continue
                if space.clip_end < needed:
                    space.clip_end = needed
                # A near plane of 0.1 m against a kilometre of geometry causes
                # visible depth fighting on distant faces.
                if extent > 500.0 and space.clip_start < 0.1:
                    space.clip_start = 0.1


def import_model(context, model_path, options):
    """
    Import `model_path` and arrange it for use as a modelling reference.

    Returns a short human-readable summary.
    """
    if not os.path.isfile(model_path):
        raise RuntimeError("Converted model is missing: %s" % model_path)

    # Object mode is required by the operators used below, and the user may be
    # in edit or sculpt mode on something else.
    if context.mode != "OBJECT":
        try:
            bpy.ops.object.mode_set(mode="OBJECT")
        except RuntimeError:
            pass

    replaced = 0
    if options.get("replace_previous"):
        replaced = _remove_previous_imports(context)

    name = options.get("collection_name") or "MapExport"
    coll = bpy.data.collections.new(name)
    coll[MARKER] = True
    context.scene.collection.children.link(coll)

    # Import into our own collection by making it active first.
    view_layer = context.view_layer
    previous_active = view_layer.active_layer_collection
    target_layer = _find_layer_collection(view_layer.layer_collection, coll)
    if target_layer is not None:
        view_layer.active_layer_collection = target_layer

    before = set(bpy.data.objects)
    try:
        # The file is already Z-up with +Y north, so the importer must not apply
        # any axis conversion of its own.
        bpy.ops.wm.obj_import(filepath=model_path,
                              forward_axis="Y", up_axis="Z")
    finally:
        if previous_active is not None:
            view_layer.active_layer_collection = previous_active

    new_objects = [o for o in bpy.data.objects if o not in before]
    if not new_objects:
        bpy.data.collections.remove(coll)
        raise RuntimeError("Blender imported no objects from %s"
                           % os.path.basename(model_path))

    _set_texture_extension(new_objects)
    _apply_smooth(context, new_objects, options.get("shade_smooth", True))

    if options.get("join_objects"):
        joined = _join(context, new_objects, name)
        if joined is not None:
            new_objects = [joined]

    if options.get("adjust_clipping", True):
        _fit_clipping(context, new_objects)

    # Packing keeps the textures alive even if the download cache is cleared or
    # the .blend is moved to another machine.
    if options.get("pack_images"):
        try:
            bpy.ops.file.pack_all()
        except RuntimeError as exc:
            print("[google-map-export-bridge] could not pack images: %s" % exc)

    if options.get("lock_reference", True):
        for obj in new_objects:
            obj.hide_select = True

    bpy.ops.object.select_all(action="DESELECT")

    missing = count_missing_textures(new_objects)

    parts = ["Imported %d object%s into '%s'"
             % (len(new_objects), "" if len(new_objects) == 1 else "s", coll.name)]
    if replaced:
        parts.append("replaced %d earlier import%s"
                     % (replaced, "" if replaced == 1 else "s"))
    if missing:
        parts.append("%d material%s has no texture"
                     % (missing, "" if missing == 1 else "s"))

    import_model.last_missing_textures = missing
    return "; ".join(parts)


def count_missing_textures(objects):
    """
    How many materials ended up without a usable image.

    Checked after import rather than trusting the exporter, because a texture
    can go missing for reasons the exporter never sees: a file that failed to
    write, a path the filesystem rejected, or a cache cleared underneath the
    model. Whatever the cause, the result is the same untextured patch, so it is
    worth counting here where it actually shows.
    """
    missing = 0
    seen = set()

    for obj in objects:
        for slot in getattr(obj, "material_slots", []):
            material = slot.material
            if material is None or material.name in seen:
                continue
            seen.add(material.name)

            if not material.use_nodes:
                continue

            image_nodes = [n for n in material.node_tree.nodes
                           if n.type == "TEX_IMAGE"]
            if not image_nodes:
                # The exporter writes a plain grey material when it could not
                # decode a tile, so this is the deliberate no-texture case.
                missing += 1
                continue

            for node in image_nodes:
                image = node.image
                if image is None or image.size[0] == 0 or image.size[1] == 0:
                    missing += 1
                    break

    return missing
