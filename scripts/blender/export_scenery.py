"""Exporta piezas de escenario de art/blender/scenery.blend a public/models/scenery/<archivo>.glb.

Cada tipo vive en su escena «prop-<tipo>» con un empty raíz llamado igual que el tipo. El archivo junta varios
tipos (FILES en art/blender/scenery.py) en una escena temporal y exporta solo eso. El contrato lo revisa
tests/scenery.test.ts: un nodo raíz por tipo, sin rotación ni escala, y sin extensiones obligatorias.

    import export_scenery; export_scenery.export_file('vegetation', repo_root='/ruta/al/repo')
"""

import json
import os

import bpy

import scenery


def _repo_root_guess():
    here = bpy.data.filepath and os.path.dirname(bpy.data.filepath)
    return os.path.abspath(os.path.join(here, "..", "..")) if here else os.getcwd()


def export_file(name, repo_root=None, out_path=None):
    kinds = scenery.FILES[name]
    roots = []
    for kind in kinds:
        root = bpy.data.objects.get(kind)
        if root is None or root.type != "EMPTY":
            raise RuntimeError(f"Falta el empty raíz «{kind}»: construye primero scenery.build('{kind}')")
        if any(abs(v) > 1e-6 for v in root.rotation_euler) or any(abs(v - 1) > 1e-6 for v in root.scale):
            raise RuntimeError(f"El empty «{kind}» no puede tener rotación ni escala")
        roots.append(root)

    work = bpy.data.scenes.get("export-" + name) or bpy.data.scenes.new("export-" + name)
    for c in list(work.collection.children):
        work.collection.children.unlink(c)
    for o in list(work.collection.objects):
        work.collection.objects.unlink(o)
    for root in roots:
        work.collection.children.link(bpy.data.collections["prop-" + root.name])
    previous_scene = bpy.context.window.scene
    bpy.context.window.scene = work

    objects = []
    for root in roots:
        objects += [root, *root.children_recursive]
    if out_path is None:
        out_path = os.path.join(repo_root or _repo_root_guess(), "public", "models", "scenery", f"{name}.glb")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    try:
        for o in work.objects:
            o.select_set(False)
        for o in objects:
            o.hide_set(False)
            o.select_set(True)
        bpy.context.view_layer.objects.active = roots[0]
        wanted = dict(
            filepath=out_path, export_format="GLB", use_selection=True, use_visible=False, use_active_scene=True,
            export_apply=True, export_yup=True, export_texcoords=True, export_normals=True, export_materials="EXPORT",
            export_cameras=False, export_lights=False, export_animations=False, export_extras=False,
            export_draco_mesh_compression_enable=False,
            export_vertex_color="NAME", export_vertex_color_name="AO", export_all_vertex_colors=False,
        )
        available = set(bpy.ops.export_scene.gltf.get_rna_type().properties.keys())
        result = bpy.ops.export_scene.gltf(**{k: v for k, v in wanted.items() if k in available})
    finally:
        for o in objects:
            o.select_set(False)
        bpy.context.window.scene = previous_scene
    if "FINISHED" not in result:
        raise RuntimeError(f"El exportador glTF terminó con {result}")
    with open(out_path, "rb") as f:
        data = f.read()
    length = int.from_bytes(data[12:16], "little")
    gltf = json.loads(data[20:20 + length])
    names = {n.get("name") for n in gltf["nodes"]}
    extra = sorted(str(n) for n in names - {o.name for o in objects})
    if extra:
        os.remove(out_path)
        raise RuntimeError(f"Se colaron objetos ajenos ({', '.join(extra)}); no se guardó el GLB")
    tris = sum(scenery.L.triangles([o]) for o in objects if o.type == "MESH")
    return {"path": out_path, "bytes": len(data), "triangles": tris, "types": kinds}
