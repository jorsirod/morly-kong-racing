# SPDX-License-Identifier: MIT
"""
Segunda pasada de detalle para los siete carros (art/blender/cars.blend): interior y accesorios.

No reconstruye nada: toma cada carro ya modelado, mide su cabina (línea de puertas, parabrisas, asiento del piloto,
ruedas) y le agrega piezas nuevas bajo `body`, con su oclusión horneada:

  - cojines de los asientos y cabecera del copiloto;
  - consola central con palanca de cambios y freno de mano;
  - tablero de instrumentos frente al piloto, con dos relojes que brillan;
  - limpiaparabrisas, antena, escape cromado y loderas;
  - discos de freno con mordaza roja detrás de los rines.

Uso (consola de Python de Blender o MCP), en el mismo espacio de nombres que mklib.py y car_kit.py:

    ns = {}
    for f in ("scripts/blender/mklib.py", "scripts/blender/car_kit.py", "art/blender/car_details.py"):
        exec(open("<repo>/" + f).read(), ns)
    ns["add_details"]("white-empanade")          # o ns["add_details_all"]()

Se puede correr varias veces: borra las piezas `detail-*` anteriores antes de crear las nuevas.
"""
import bpy
from mathutils import Vector

CARS = ["silver-surfer", "white-empanade", "la-raulina", "hola-willy", "orange-seed", "black-diamond", "el-tiburon"]


def _bbox(objs):
    pts = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
    return Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))), Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))


def add_details(vid, ao=True):
    scene = bpy.data.scenes[vid]
    bpy.context.window.scene = scene
    bpy.context.view_layer.update()
    root = next(o for o in scene.objects if o.name.split(".")[0] == f"vehicle-{vid}")
    tree = [root, *root.children_recursive]
    body = next(o for o in tree if o.name.split(".")[0] == "body")
    find = lambda suffix: next((o for o in tree if o.type == "MESH" and o.name.split(".")[0].endswith(suffix)), None)
    empty = lambda name: next((o for o in tree if o.name.split(".")[0] == name), None)
    for o in [o for o in tree if "detail-" in o.name]:
        me = o.data
        bpy.data.objects.remove(o, do_unlink=True)
        if me and me.users == 0:
            bpy.data.meshes.remove(me)
    tree = [root, *root.children_recursive]
    col = body.users_collection[0]
    seats, trim = find("seats"), find("door-top-trim")
    prefix = seats.name.split(".")[0][:-len("seats")]
    # Medidas de la cabina, en coordenadas del juego (x = -X, y = Z, z = -Y).
    lo, hi = _bbox([trim])
    belt, hw, ws, rf = (lo.z + hi.z) / 2 - .02, hi.x, -lo.y, -hi.y
    slo, shi = _bbox([seats])
    seat_top, seat_back = shi.z, -(slo.y + shi.y) / 2
    S = seat_back + .4
    blo, bhi = _bbox([o for o in tree if o.type == "MESH" and "wheel" not in (o.parent.name if o.parent else "")])
    rear = -bhi.y
    dash_z = min(S + .98, ws - .12)
    wheels = {k: empty("wheel-pivot-" + k) for k in ("front-left", "front-right", "rear-left", "rear-right")}
    wp = {k: (lambda p: (-p.x, p.z, -p.y))(o.matrix_world.translation) for k, o in wheels.items()}
    r = wp["rear-left"][1]

    class Obj:  # la misma interfaz mínima que Builder.mesh, pero dentro de la colección del carro
        pass

    made = []

    def emit(name, bm, material, smooth=35):
        import bmesh as _bm
        _bm.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
        me = bpy.data.meshes.new(f"{prefix}detail-{name}")
        bm.to_mesh(me)
        bm.free()
        for p in me.polygons:
            p.use_smooth = True
        if hasattr(me, "set_sharp_from_angle"):
            import math as _m
            me.set_sharp_from_angle(angle=_m.radians(smooth))
        me.materials.append(material)
        o = bpy.data.objects.new(f"{prefix}detail-{name}", me)
        col.objects.link(o)
        o.parent = body
        made.append(o)
        return o

    seat_mat = seats.data.materials[0]
    interior = mat(f"{prefix}interior", "#25303b", rough=0.7)
    dark = mat(f"{prefix}dark", "#2a3038", rough=0.55)
    chrome = mat(f"{prefix}detail-chrome", "#c9d3da", rough=0.18)
    gauge = mat(f"{prefix}detail-gauge", "#9fe8ff", rough=0.2, emissive=True)
    needle = mat(f"{prefix}detail-needle", "#ff5a3c", rough=0.2, emissive=True)
    caliper = mat(f"{prefix}detail-caliper", "#d9342b", rough=0.4)
    disc = mat(f"{prefix}detail-disc", "#8d979f", rough=0.3)

    cush_y = seat_top - .46 - .03
    emit("seat-cushions", merge(*[gbox(.57, .15, .5, x, cush_y, S - .14, bevel=.06, seg=3) for x in (-.43, .45)],
                                gbox(.3, .2, .13, .45, seat_top + .14, S - .42, bevel=.06, seg=3),
                                *[gcyl(.12, .03, .45 + s * .08, seat_top + .03, S - .42, axis="y", seg=8) for s in (-1, 1)]), seat_mat)
    emit("console", merge(gbox(.2, .2, .78, 0, cush_y + .02, S + .22, bevel=.05, seg=2),
                          gbox(.46, .12, .17, -.43, belt + .17, dash_z + .01, bevel=.05, seg=2),
                          gbox(.05, .05, .24, .0, cush_y + .15, S - .02, bevel=.02)), interior)
    emit("levers", merge(gcyl(.24, .03, 0, cush_y + .22, S + .36, axis="y", seg=8), gsphere(.085, 0, cush_y + .36, S + .36, seg=10, rings=6),
                         *[gbar((x0, belt + .045, ws + .0), (x1, belt + .075, ws + .02), .028) for x0, x1 in ((-hw + .2, -.08), (.1, hw - .22))],
                         gtube([(hw - .22, belt + .02, ws + .12), (hw - .22, belt + .5, ws + .05), (hw - .22, belt + .95, ws - .08)], .012, seg=6),
                         gsphere(.045, hw - .22, belt + .95, ws - .08, seg=8, rings=5),
                         *[gbox(.3, .32, .035, s * abs(wp["rear-left"][0]), r * .72, wp["rear-left"][2] - r - .13, bevel=.01) for s in (-1, 1)]), dark, smooth=50)
    emit("gauges", merge(*[gcyl(.02, .12, -.43 + s * .1, belt + .17, dash_z - .078, axis="z", seg=14) for s in (-1, 1)]), gauge)
    emit("needles", merge(*[gbar((-.43 + s * .1, belt + .17, dash_z - .092), (-.43 + s * .1 + .035, belt + .205, dash_z - .092), .012) for s in (-1, 1)]), needle)
    emit("exhaust", merge(gcyl(.4, .1, hw * .55, r * .78, rear + .12, axis="z", seg=12)), chrome)
    brakes, cal = [], []
    for k, (x, y, z) in wp.items():
        s = 1 if x > 0 else -1
        brakes.append(gcyl(.045, r * 1.12, x - s * .09, y, z, axis="x", seg=20))
        cal.append(gbox(.09, r * .42, r * .3, x - s * .07, y + r * .32, z - r * .34, bevel=.02))
    emit("brake-discs", merge(*brakes), disc, smooth=30)
    emit("calipers", merge(*cal), caliper)
    if ao:
        bake_ao(made, samples=32, strength=0.6, distance=0.9, ground=False)
    return {"id": vid, "new": len(made), "triangles": triangles([o for o in [root, *root.children_recursive] if o.type == "MESH"]), "belt": round(belt, 2), "hw": round(hw, 2), "S": round(S, 2), "rear": round(rear, 2), "r": round(r, 2)}


def add_details_all(ao=True):
    return [add_details(v, ao) for v in CARS]
