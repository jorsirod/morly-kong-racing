"""Run with Blender: blender --background --python scripts/art-pipeline.py
Reopens the six source GLBs, adds small bevels and exports editable .blend files.
The production meshes use material colors, so no bitmap texture decoder is required.
"""
from pathlib import Path
import bpy
root = Path(__file__).resolve().parent.parent
dest = root / "art" / "vehicles"
dest.mkdir(parents=True, exist_ok=True)
for source in (root / "public" / "models").glob("*.glb"):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    for obj in bpy.data.objects:
        if obj.type == "MESH" and "glass" not in obj.name.lower():
            bevel = obj.modifiers.new("Toy edge highlights", "BEVEL")
            bevel.width = 0.035
            bevel.segments = 2
    bpy.ops.wm.save_as_mainfile(filepath=str(dest / (source.stem + ".blend")))
    bpy.ops.export_scene.gltf(filepath=str(source), export_format="GLB", export_apply=True)
    print("Editable model:", source.stem)
