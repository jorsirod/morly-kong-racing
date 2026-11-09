# SPDX-License-Identifier: MIT
"""
Exporta un carro de Blender a art/blender/exports/<id>.glb con la configuración
que espera Morly Kong Racing. Después, `npm run assets` lo revisa y lo copia a
public/models/.

Convenciones en Blender (ver art/blender/README.md):
- Un empty raíz llamado ``vehicle-<id>`` (por ejemplo ``vehicle-silver-surfer``).
- Frente del carro hacia -Y, lado del conductor (izquierdo) hacia +X, arriba +Z.
- Dentro de la raíz, el empty ``body`` con ``driver-socket``, ``passenger-socket``
  y los cuatro ``wheel-pivot-{front|rear}-{left|right}``, cada uno con su
  ``wheel-spin-…`` que contiene la malla de la llanta. Los empties de rueda van
  en el centro de la rueda, sin rotación ni escala.

Uso sin interfaz:
    blender -b art/blender/silver-surfer.blend --python scripts/blender/export_vehicle.py -- silver-surfer

Uso desde la consola de Python de Blender o el MCP:
    exec(open("<repo>/scripts/blender/export_vehicle.py").read())
    export_vehicle("silver-surfer", repo_root="<repo>")
"""

import json
import os
import re
import sys

import bpy

REQUIRED = ["body", "driver-socket", "passenger-socket"] + [
    f"wheel-{kind}-{axle}-{side}"
    for kind in ("pivot", "spin")
    for axle in ("front", "rear")
    for side in ("left", "right")
]
TRIANGLES_MAX = 30000
# Nombres que el juego busca. En un .blend con varios carros, Blender les agrega «.001»;
# al revisar/exportar, el carro activo los toma prestados y luego se devuelven.
CANONICAL = REQUIRED + ["ALF-plush", "alf-head-pivot", "alf-arm-left", "alf-arm-right"]


def _repo_root_guess():
    here = globals().get("__file__")
    if here and os.path.isfile(here):
        return os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(here))))
    if bpy.data.filepath:  # art/blender/<id>.blend -> repositorio
        return os.path.dirname(os.path.dirname(os.path.dirname(bpy.data.filepath)))
    raise RuntimeError("No sé dónde está el repositorio: pasa repo_root=... o out_path=...")


def _tree(obj):
    return [obj] + list(obj.children_recursive)


def _claim_names(root):
    """Da a los nodos de este carro sus nombres exactos (sin «.001»). Devuelve cómo deshacerlo."""
    tree = _tree(root)
    undo = []
    for o in tree:
        m = re.match(r"^(.*)\.\d{3}$", o.name)
        if not m or m.group(1) not in CANONICAL:
            continue
        base = m.group(1)
        holder = bpy.data.objects.get(base)
        if holder is not None and holder not in tree:
            holder.name = base + ".__prestado"
            undo.append((holder, base))
        undo.append((o, o.name))
        o.name = base
    return undo


def _restore_names(undo):
    for obj, name in reversed(undo):
        obj.name = name


def check_vehicle(vehicle_id):
    """Revisa la escena antes de exportar. Devuelve (raíz, lista de problemas)."""
    root = bpy.data.objects.get(f"vehicle-{vehicle_id}")
    undo = _claim_names(root) if root else []
    try:
        return _check(vehicle_id)
    finally:
        _restore_names(undo)


def _check(vehicle_id):
    problems = []
    bpy.context.view_layer.update()  # matrix_world de objetos recién creados o movidos
    root = bpy.data.objects.get(f"vehicle-{vehicle_id}")
    if root is None:
        return None, [f"falta el empty raíz «vehicle-{vehicle_id}»"]
    tree = {o.name: o for o in _tree(root)}
    for name in REQUIRED:
        if name not in tree:
            similar = [n for n in tree if n.startswith(name + ".")]
            hint = f" (hay {', '.join(similar)}: quita el sufijo .001)" if similar else ""
            problems.append(f"falta «{name}» dentro de «{root.name}»{hint}")
    suffixed = sorted(n for n in tree if re.search(r"\.\d{3}$", n) and n.rsplit(".", 1)[0] in REQUIRED + ["ALF-plush"])
    for name in suffixed:
        problems.append(f"«{name}» tiene sufijo de Blender; renómbralo")
    body = tree.get("body")
    if body:
        inside = {o.name for o in _tree(body)}
        for name in REQUIRED[1:] + (["ALF-plush"] if "ALF-plush" in tree else []):
            if name in tree and name not in inside:
                problems.append(f"«{name}» debe colgar de «body»")
    for axle in ("front", "rear"):
        for side in ("left", "right"):
            pivot, spin = tree.get(f"wheel-pivot-{axle}-{side}"), tree.get(f"wheel-spin-{axle}-{side}")
            if pivot and spin and spin.parent != pivot:
                problems.append(f"«{spin.name}» debe ser hijo directo de «{pivot.name}»")
            for obj in (pivot, spin):
                if obj is None:
                    continue
                if any(abs(a) > 1e-4 for a in obj.rotation_euler) or obj.rotation_mode == "QUATERNION" and any(abs(a) > 1e-4 for a in obj.rotation_quaternion[1:]):
                    problems.append(f"«{obj.name}» tiene rotación; déjala en cero")
                if any(abs(s - 1) > 1e-4 for s in obj.scale):
                    problems.append(f"«{obj.name}» tiene escala; aplícala a la malla")
            if spin and not any(o.type == "MESH" for o in _tree(spin)):
                problems.append(f"«{spin.name}» no contiene la malla de la llanta")
    if "ALF-plush" in tree and vehicle_id != "hola-willy":
        problems.append("ALF solo viaja en Hola Willy")
    if vehicle_id == "hola-willy" and "ALF-plush" not in tree:
        problems.append("falta «ALF-plush» en Hola Willy")
    fl, rl, fr = tree.get("wheel-pivot-front-left"), tree.get("wheel-pivot-rear-left"), tree.get("wheel-pivot-front-right")
    if fl and rl and fr:
        if not fl.matrix_world.translation.x > fr.matrix_world.translation.x:
            problems.append("las ruedas izquierdas deben estar en +X (carro espejado o nombres cambiados)")
        if not fl.matrix_world.translation.y < rl.matrix_world.translation.y:
            problems.append("el frente del carro debe mirar a -Y")
    return root, problems


def count_triangles(objects):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    total = 0
    for obj in objects:
        if obj.type != "MESH":
            continue
        mesh = obj.evaluated_get(depsgraph).to_mesh()
        mesh.calc_loop_triangles()
        total += len(mesh.loop_triangles)
        obj.evaluated_get(depsgraph).to_mesh_clear()
    return total


def export_vehicle(vehicle_id, repo_root=None, out_path=None):
    """Exporta ``vehicle-<id>`` y devuelve un resumen. Lanza RuntimeError si la escena no cumple."""
    root0 = bpy.data.objects.get(f"vehicle-{vehicle_id}")
    undo = _claim_names(root0) if root0 else []
    try:
        return _export(vehicle_id, repo_root, out_path)
    finally:
        _restore_names(undo)


def _export(vehicle_id, repo_root, out_path):
    root, problems = _check(vehicle_id)
    objects = _tree(root) if root else []
    triangles = count_triangles(objects) if root else 0
    if triangles > TRIANGLES_MAX:
        problems.append(f"{triangles} triángulos; el máximo es {TRIANGLES_MAX}")
    if root and root.name not in bpy.context.scene.objects:
        problems.append(f"«{root.name}» no está en la escena activa «{bpy.context.scene.name}»")
    if problems:
        raise RuntimeError("El carro no cumple el contrato:\n - " + "\n - ".join(problems))

    if out_path is None:
        out_path = os.path.join(repo_root or _repo_root_guess(), "art", "blender", "exports", f"{vehicle_id}.glb")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    if bpy.context.object and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")
    previous = [o for o in bpy.context.view_layer.objects if o.select_get()]
    previous_active = bpy.context.view_layer.objects.active
    hidden = [(o, o.hide_get(), o.hide_viewport) for o in objects if o.hide_get() or o.hide_viewport]
    for o, _, _ in hidden:
        o.hide_set(False)
        o.hide_viewport = False
    for o in previous:
        o.select_set(False)
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = root

    wanted = dict(
        filepath=out_path,
        export_format="GLB",
        use_selection=True,
        use_visible=False,
        use_active_scene=True,  # sin esto exporta también lo seleccionado en otras escenas
        export_apply=True,
        export_yup=True,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
        export_animations=False,
        export_extras=False,
        export_draco_mesh_compression_enable=False,
    )
    # Oclusión ambiental horneada en el atributo «AO» (ver mklib.bake_ao): se exporta como COLOR_0
    # y el juego la multiplica por el color base.
    if any(o.type == "MESH" and "AO" in o.data.color_attributes for o in objects):
        wanted.update(export_vertex_color="NAME", export_vertex_color_name="AO", export_all_vertex_colors=False)
    else:
        wanted.update(export_vertex_color="NONE")
    available = set(bpy.ops.export_scene.gltf.get_rna_type().properties.keys())
    try:
        result = bpy.ops.export_scene.gltf(**{k: v for k, v in wanted.items() if k in available})
    finally:
        for o in objects:
            o.select_set(False)
        for o in previous:
            o.select_set(True)
        bpy.context.view_layer.objects.active = previous_active
        for o, was_hidden, was_viewport_hidden in hidden:
            o.hide_viewport = was_viewport_hidden
            o.hide_set(was_hidden)
    if "FINISHED" not in result:
        raise RuntimeError(f"El exportador glTF terminó con {result}")
    with open(out_path, "rb") as f:
        data = f.read()
    length = int.from_bytes(data[12:16], "little")
    exported = {n.get("name") for n in json.loads(data[20:20 + length])["nodes"]}
    extra = sorted(str(n) for n in exported - {o.name for o in objects})
    if extra:
        os.remove(out_path)
        raise RuntimeError(f"Se colaron objetos ajenos al carro ({', '.join(extra)}); no se guardó el GLB")
    return {"path": out_path, "bytes": os.path.getsize(out_path), "triangles": triangles, "objects": len(objects)}


if __name__ == "__main__" and "--" in sys.argv:
    ids = sys.argv[sys.argv.index("--") + 1:]
    if not ids:
        raise SystemExit("Uso: blender -b <archivo>.blend --python scripts/blender/export_vehicle.py -- <id>")
    for vid in ids:
        print(export_vehicle(vid))
