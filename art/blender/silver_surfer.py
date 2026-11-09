# SPDX-License-Identifier: MIT
"""
Silver Surfer: Suzuki Jimny 2008 (JB43) gris, «El más culito de todos».

Construye el carro completo en la colección «silver-surfer» de la escena activa,
siguiendo el contrato de art/blender/README.md. Requiere scripts/blender/mklib.py
cargado en el mismo espacio de nombres:

    ns = {}
    exec(open("<repo>/scripts/blender/mklib.py").read(), ns)
    exec(open("<repo>/scripts/blender/car_kit.py").read(), ns)
    exec(open("<repo>/art/blender/silver_surfer.py").read(), ns)
    ns["build"]()

Medidas tomadas de jimny() en src/game/vehicles.ts (blender = (-x, -z, y)),
para que el carro coincida con su caja de choques, la cámara y las calcomanías
que el juego pega atrás (nombre y «EL MÁS CULITO» sobre la tapa del repuesto,
placa sobre el bumper).
"""

import math

import bmesh
from mathutils import Matrix

VEHICLE_ID = "silver-surfer"

# Paleta (mismos colores que el carro del código).
PAINT = "#a6b4ba"
DARK = "#2b3036"
TRIM = "#3b4248"
BUMPER = "#2a2f35"
CHROME = "#c9d6de"
RAIL = "#58646e"
TIRE = "#1f262e"
RIM = "#c7d0d6"
GLASS = "#3f6f86"
WINDSCREEN = "#a9dcea"
SEAT = "#334b68"
INTERIOR = "#25303b"
COVER = "#e9eef1"
HEADLIGHT = "#fff1b7"
FOG = "#fff6d0"
SIGNAL = "#ff9f35"
TAIL = "#ee414c"
MIRROR_GLASS = "#83bbd2"

# Geometría base.
HW = 1.05            # medio ancho de la carrocería
BELT = 1.44          # línea de cintura
ROOF = 2.12          # techo trasero
ROOF_FRONT = 0.44    # donde empieza el techo (detrás de la cabeza del piloto)
WS_BASE = -0.90      # base del parabrisas
WHEEL_R, WHEEL_W, WHEEL_X = 0.56, 0.44, 1.08
AXLES = {"front": -1.30, "rear": 1.32}


def build():
    use_scene(VEHICLE_ID)
    B = Builder(VEHICLE_ID)
    root = B.empty(f"vehicle-{VEHICLE_ID}", size=0.6)
    body = B.empty("body", root, size=0.4)

    paint = mat("paint", PAINT, rough=0.26)
    dark = mat("dark", DARK, rough=0.55)
    trim = mat("trim", TRIM, rough=0.6)
    bumper = mat("bumper", BUMPER, rough=0.7)
    chrome = mat("chrome", CHROME, rough=0.18)
    rail = mat("rail", RAIL, rough=0.45)
    glass = mat("glass", GLASS, rough=0.12)
    windscreen = mat("windscreen", WINDSCREEN, rough=0.08, alpha=0.32, double=True)

    # ---- Casco: secciones transversales de frente (-Y) a cola (+Y).
    sections = [
        dict(y=-1.97, w=0.95, z0=0.62, z1=1.28, r=0.10),
        dict(y=-1.93, w=1.00, z0=0.57, z1=1.34, r=0.13),
        dict(y=-1.80, w=1.03, z0=0.53, z1=1.38, r=0.15),
        dict(y=-1.55, w=1.05, z0=0.50, z1=1.40, r=0.16),
        dict(y=-1.15, w=HW, z0=0.50, z1=1.42, r=0.16),
        dict(y=-0.90, w=HW, z0=0.50, z1=BELT, r=0.16),
        dict(y=-0.45, w=HW, z0=0.50, z1=BELT, r=0.16),
        dict(y=0.00, w=HW, z0=0.50, z1=BELT + 0.005, r=0.16),
        dict(y=0.45, w=HW, z0=0.50, z1=BELT + 0.01, r=0.16),
        dict(y=0.95, w=HW, z0=0.50, z1=BELT + 0.015, r=0.16),
        dict(y=1.45, w=HW, z0=0.50, z1=BELT + 0.02, r=0.16),
        dict(y=1.82, w=HW, z0=0.50, z1=1.46, r=0.16),
        dict(y=1.94, w=1.00, z0=0.54, z1=1.42, r=0.12),
    ]
    hull = B.mesh("hull", loft(sections, seg=4, div=3, step=0.22), body, paint)
    for y in AXLES.values():
        B.apply_boolean(hull, cylinder(0.66, 2.6, "X", seg=32, center=(0, y, WHEEL_R)))

    # ---- Guardafangos ensanchados (en arco) sobre cada rueda.
    flares = bmesh.new()
    for y in AXLES.values():
        for side in (1, -1):
            x0, x1 = side * 0.96, side * 1.17
            b = arch_band(y, WHEEL_R, 0.64, 0.80, min(x0, x1), max(x0, x1), a0=-10, a1=190, seg=20)
            me_tmp = bpy.data.meshes.new("tmp"); b.to_mesh(me_tmp); b.free(); flares.from_mesh(me_tmp); bpy.data.meshes.remove(me_tmp)
    B.mesh("fender-flares", flares, body, trim, smooth_angle=40)

    # ---- Cabina trasera con techo (empieza detrás de la cabeza del piloto).
    house = [
        dict(y=ROOF_FRONT, w=1.00, z0=1.38, z1=ROOF + 0.04, r=0.14),
        dict(y=ROOF_FRONT + 0.06, w=1.02, z0=1.38, z1=ROOF + 0.06, r=0.15),
        dict(y=1.86, w=1.02, z0=1.38, z1=ROOF + 0.06, r=0.15),
        dict(y=1.94, w=0.98, z0=1.40, z1=ROOF + 0.02, r=0.12),
    ]
    B.mesh("greenhouse", loft(house, seg=4, div=3, step=0.25), body, paint)
    # Vidrios: cuarto trasero a cada lado y medallón trasero, apenas por fuera de la lámina.
    side_glass = bmesh.new()
    for s in (1, -1):
        x = s * 1.024
        q = quad([(x, 0.62, 1.54), (x, 1.78, 1.54), (x, 1.76, ROOF - 0.04), (x, 0.66, ROOF - 0.04)])
        if s < 0:
            bmesh.ops.reverse_faces(q, faces=q.faces)
        me_tmp = bpy.data.meshes.new("tmp"); q.to_mesh(me_tmp); q.free(); side_glass.from_mesh(me_tmp); bpy.data.meshes.remove(me_tmp)
    back = quad([(0.80, 1.946, 1.58), (-0.80, 1.946, 1.58), (-0.78, 1.946, ROOF - 0.06), (0.78, 1.946, ROOF - 0.06)])
    B.mesh("windows", merge(side_glass, back), body, glass, smooth_angle=10)
    # Molduras de goma alrededor de los vidrios.
    rubber = bmesh.new()
    for s in (1, -1):
        x = s * 1.03
        for a, b in (((x, 0.62, 1.54), (x, 1.78, 1.54)), ((x, 1.78, 1.54), (x, 1.76, ROOF - 0.04)),
                     ((x, 1.76, ROOF - 0.04), (x, 0.66, ROOF - 0.04)), ((x, 0.66, ROOF - 0.04), (x, 0.62, 1.54))):
            bm_ = bar(a, b, 0.035)
            me_tmp = bpy.data.meshes.new("tmp"); bm_.to_mesh(me_tmp); bm_.free(); rubber.from_mesh(me_tmp); bpy.data.meshes.remove(me_tmp)
    for a, b in (((0.80, 1.952, 1.58), (-0.80, 1.952, 1.58)), ((-0.80, 1.952, 1.58), (-0.78, 1.952, ROOF - 0.06)),
                 ((-0.78, 1.952, ROOF - 0.06), (0.78, 1.952, ROOF - 0.06)), ((0.78, 1.952, ROOF - 0.06), (0.80, 1.952, 1.58))):
        bm_ = bar(a, b, 0.035)
        me_tmp = bpy.data.meshes.new("tmp"); bm_.to_mesh(me_tmp); bm_.free(); rubber.from_mesh(me_tmp); bpy.data.meshes.remove(me_tmp)
    B.mesh("window-rubber", rubber, body, dark, smooth_angle=50)
    # Canaletas del techo y línea lateral de la carrocería (sobre los pasos de rueda).
    B.mesh("roof-drip-rails", merge(box(0.035, 1.42, 0.035, bevel=0.012, center=(1.0, 1.18, ROOF + 0.05)), box(0.035, 1.42, 0.035, bevel=0.012, center=(-1.0, 1.18, ROOF + 0.05))), body, trim)
    B.mesh("body-line", merge(rounded_bar(3.66, 0.022, 0.05, 0.01, "Y", center=(HW + 0.004, 0.0, 1.29), seg=2, div=0),
                              rounded_bar(3.66, 0.022, 0.05, 0.01, "Y", center=(-HW - 0.004, 0.0, 1.29), seg=2, div=0)), body, paint, smooth_angle=50)
    # Pared delantera de la cabina trasera vista desde el frente abierto: tapizado oscuro.
    B.mesh("bulkhead", box(1.86, 0.03, 0.62, bevel=0.06, seg=2, center=(0, ROOF_FRONT - 0.012, BELT + 0.36)), body, mat("interior", INTERIOR, rough=0.7))

    # ---- Frente abierto: pilares A, marco del parabrisas, parabrisas bajo y barras al techo.
    top_y, top_z = -0.72, BELT + 0.55
    frame = merge(
        bar((0.99, WS_BASE, BELT), (0.92, top_y, top_z), 0.09),
        bar((-0.99, WS_BASE, BELT), (-0.92, top_y, top_z), 0.09),
        bar((0.94, top_y, top_z), (-0.94, top_y, top_z), 0.08),
        bar((0.92, top_y, top_z), (0.95, ROOF_FRONT + 0.03, ROOF + 0.02), 0.08),
        bar((-0.92, top_y, top_z), (-0.95, ROOF_FRONT + 0.03, ROOF + 0.02), 0.08),
    )
    B.mesh("windscreen-frame", frame, body, paint, smooth_angle=50)
    B.mesh("windscreen", quad([(-0.94, WS_BASE - 0.02, BELT + 0.02), (0.94, WS_BASE - 0.02, BELT + 0.02), (0.89, top_y + 0.02, top_z - 0.04), (-0.89, top_y + 0.02, top_z - 0.04)]), body, windscreen, smooth_angle=None)
    B.mesh("door-top-trim", merge(box(0.08, ROOF_FRONT - WS_BASE, 0.06, bevel=0.02, center=(1.0, (ROOF_FRONT + WS_BASE) / 2, BELT + 0.02)),
                                   box(0.08, ROOF_FRONT - WS_BASE, 0.06, bevel=0.02, center=(-1.0, (ROOF_FRONT + WS_BASE) / 2, BELT + 0.02))), body, dark)

    # ---- Interior visible: tablero y respaldos.
    dash = box(1.76, 0.30, 0.22, bevel=0.06, center=(0, 0, 0))
    bmesh.ops.rotate(dash, verts=dash.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(0.1, 3, "X"))
    bmesh.ops.translate(dash, vec=(0, -0.78, BELT + 0.04), verts=dash.verts)
    B.mesh("dashboard", dash, body, mat("interior", INTERIOR, rough=0.7))
    seats = merge(box(0.56, 0.20, 0.50, bevel=0.07, seg=3, center=(0.44, 0.34, BELT - 0.06)),
                  box(0.56, 0.20, 0.50, bevel=0.07, seg=3, center=(-0.44, 0.34, BELT - 0.06)))
    B.mesh("seats", seats, body, mat("seat", SEAT, rough=0.75))

    # ---- Capó tipo almeja: costuras y toma de aire.
    hood = merge(
        box(0.04, 0.72, 0.03, center=(0.80, -1.25, 1.402)),
        box(0.04, 0.72, 0.03, center=(-0.80, -1.25, 1.402)),
        box(0.62, 0.36, 0.08, bevel=0.03, seg=2, center=(0, -1.30, 1.43)),
    )
    B.mesh("hood-details", hood, body, trim)

    # ---- Frente: parrilla de cinco ranuras, faros redondos en bisel cuadrado.
    fy = -1.975
    B.mesh("grille-frame", box(1.04, 0.05, 0.44, bevel=0.03, center=(0, fy, 1.06)), body, dark)
    slats = merge(*[box(0.075, 0.04, 0.36, bevel=0.012, seg=1, center=(i * 0.19, fy - 0.02, 1.06)) for i in range(-2, 3)])
    B.mesh("grille-slats", slats, body, paint)
    bezels = merge(box(0.42, 0.06, 0.38, bevel=0.04, center=(0.72, fy + 0.005, 1.08)), box(0.42, 0.06, 0.38, bevel=0.04, center=(-0.72, fy + 0.005, 1.08)))
    B.mesh("lamp-bezels", bezels, body, dark)
    lenses = merge(cylinder(0.15, 0.05, "Y", seg=24, center=(0.72, fy - 0.03, 1.08), radius2=0.14),
                   cylinder(0.15, 0.05, "Y", seg=24, center=(-0.72, fy - 0.03, 1.08), radius2=0.14))
    B.mesh("headlights", lenses, body, mat("headlight", HEADLIGHT, rough=0.1, emissive=True), smooth_angle=40)
    rings = merge(cylinder(0.175, 0.03, "Y", seg=24, center=(0.72, fy - 0.02, 1.08)), cylinder(0.175, 0.03, "Y", seg=24, center=(-0.72, fy - 0.02, 1.08)))
    B.mesh("headlight-rings", rings, body, chrome, smooth_angle=40)

    # ---- Bumper delantero, faros de niebla, direccionales, gancho.
    B.mesh("front-bumper", rounded_bar(2.18, 0.28, 0.27, 0.09, "X", center=(0, -2.02, 0.72)), body, bumper)
    B.mesh("fog-lamps", merge(cylinder(0.075, 0.04, "Y", seg=16, center=(0.60, -2.17, 0.72)), cylinder(0.075, 0.04, "Y", seg=16, center=(-0.60, -2.17, 0.72))),
           body, mat("fog", FOG, rough=0.1, emissive=True), smooth_angle=40)
    B.mesh("turn-signals", merge(box(0.16, 0.04, 0.09, bevel=0.02, center=(0.97, -2.16, 0.74)), box(0.16, 0.04, 0.09, bevel=0.02, center=(-0.97, -2.16, 0.74))),
           body, mat("signal", SIGNAL, rough=0.2, emissive=True))
    B.mesh("bumper-intake", box(0.74, 0.02, 0.10, bevel=0.02, center=(0, -2.163, 0.70)), body, dark)
    B.mesh("tow-hook", box(0.12, 0.14, 0.11, bevel=0.03, center=(0, -2.18, 0.63)), body, chrome)

    # ---- Costados: estribo, puerta, manija, espejos.
    steps = merge(rounded_bar(1.24, 0.20, 0.09, 0.03, "Y", center=(1.14, 0.0, 0.56), seg=2, div=0), rounded_bar(1.24, 0.20, 0.09, 0.03, "Y", center=(-1.14, 0.0, 0.56), seg=2, div=0))
    B.mesh("side-steps", steps, body, dark)
    seams = bmesh.new()
    for s in (1, -1):
        x = s * 1.053
        for b in (box(0.012, 0.025, 0.86, center=(x, ROOF_FRONT + 0.02, 1.0)),
                  box(0.012, 0.025, 0.80, center=(x, WS_BASE + 0.04, 1.02)),
                  box(0.012, ROOF_FRONT - WS_BASE, 0.025, center=(x, (ROOF_FRONT + WS_BASE) / 2 + 0.02, 0.60))):
            me_tmp = bpy.data.meshes.new("tmp"); b.to_mesh(me_tmp); b.free(); seams.from_mesh(me_tmp); bpy.data.meshes.remove(me_tmp)
    B.mesh("door-seams", seams, body, trim, smooth_angle=10)
    B.mesh("door-handles", merge(box(0.04, 0.20, 0.05, bevel=0.015, center=(1.07, 0.30, 1.26)), box(0.04, 0.20, 0.05, bevel=0.015, center=(-1.07, 0.30, 1.26))), body, chrome)
    mirror_bm = bmesh.new()
    glass_bm = bmesh.new()
    for s in (1, -1):
        for b, target in ((box(0.26, 0.18, 0.20, bevel=0.05, seg=2, center=(s * (HW + 0.15), -0.80, BELT + 0.22)), mirror_bm),
                          (box(0.12, 0.06, 0.05, bevel=0.015, center=(s * (HW + 0.04), -0.82, BELT + 0.18)), mirror_bm),
                          (box(0.20, 0.012, 0.13, bevel=0.02, center=(s * (HW + 0.15), -0.80 + 0.095, BELT + 0.22)), glass_bm)):
            me_tmp = bpy.data.meshes.new("tmp"); b.to_mesh(me_tmp); b.free(); target.from_mesh(me_tmp); bpy.data.meshes.remove(me_tmp)
    B.mesh("mirrors", mirror_bm, body, dark)
    B.mesh("mirror-glass", glass_bm, body, mat("mirror-glass", MIRROR_GLASS, rough=0.05), smooth_angle=10)

    # ---- Techo: barras portaequipaje con patas y travesaño.
    rails = bmesh.new()
    for s in (1, -1):
        for b in (box(0.07, 1.34, 0.07, bevel=0.025, seg=2, center=(s * 0.72, 1.20, ROOF + 0.20)),
                  box(0.08, 0.10, 0.12, bevel=0.02, center=(s * 0.72, 0.60, ROOF + 0.12)),
                  box(0.08, 0.10, 0.12, bevel=0.02, center=(s * 0.72, 1.80, ROOF + 0.12))):
            me_tmp = bpy.data.meshes.new("tmp"); b.to_mesh(me_tmp); b.free(); rails.from_mesh(me_tmp); bpy.data.meshes.remove(me_tmp)
    B.mesh("roof-rails", rails, body, rail)
    B.mesh("roof-crossbar", box(1.50, 0.08, 0.06, bevel=0.02, center=(0, 1.60, ROOF + 0.24)), body, chrome)

    # ---- Cola: calaveras, bumper, escape y la llanta de repuesto con tapa (donde el juego pega el nombre).
    B.mesh("tail-lights", merge(box(0.18, 0.05, 0.40, bevel=0.03, center=(0.90, 1.95, 1.12)), box(0.18, 0.05, 0.40, bevel=0.03, center=(-0.90, 1.95, 1.12))),
           body, mat("tail", TAIL, rough=0.2, emissive=True))
    B.mesh("rear-bumper", rounded_bar(2.16, 0.24, 0.25, 0.08, "X", center=(0, 1.98, 0.72)), body, bumper)
    B.mesh("exhaust", cylinder(0.07, 0.30, "Y", seg=14, center=(0.70, 2.0, 0.50)), body, chrome)
    spare = lathe_x(tire_profile(0.50, 0.34, 0.30, 0.10), seg=32)
    bmesh.ops.rotate(spare, verts=spare.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(-math.pi / 2, 3, "Z"))
    bmesh.ops.translate(spare, vec=(0, 2.17, 1.30), verts=spare.verts)
    B.mesh("spare-tire", spare, body, mat("tire", TIRE, rough=0.8), smooth_angle=50)
    B.mesh("spare-cover", cylinder(0.41, 0.05, "Y", seg=32, center=(0, 2.35, 1.30)), body, mat("spare-cover", COVER, rough=0.35), smooth_angle=40)
    ring = lathe_x([(0.03, 0.42), (0.03, 0.46), (-0.03, 0.46), (-0.03, 0.42)], seg=32)
    bmesh.ops.rotate(ring, verts=ring.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(-math.pi / 2, 3, "Z"))
    bmesh.ops.translate(ring, vec=(0, 2.36, 1.30), verts=ring.verts)
    B.mesh("spare-ring", ring, body, chrome, smooth_angle=40)
    B.mesh("spare-mount", box(0.30, 0.20, 0.30, bevel=0.04, center=(0, 2.02, 1.30)), body, dark)
    # Puerta trasera de bisagra lateral: costuras, bisagras, manija y limpiaparabrisas.
    rear = bmesh.new()
    for b in (box(0.025, 0.012, 1.44, center=(0.79, 1.951, 1.30)),
              box(0.025, 0.012, 1.44, center=(-0.79, 1.951, 1.30)),
              box(1.58, 0.012, 0.025, center=(0, 1.951, 0.60))):
        me_tmp = bpy.data.meshes.new("tmp"); b.to_mesh(me_tmp); b.free(); rear.from_mesh(me_tmp); bpy.data.meshes.remove(me_tmp)
    B.mesh("rear-door-seams", rear, body, trim, smooth_angle=10)
    hw_bm = bmesh.new()
    for b in (box(0.10, 0.05, 0.16, bevel=0.02, center=(-0.72, 1.965, 1.75)),
              box(0.10, 0.05, 0.16, bevel=0.02, center=(-0.72, 1.965, 0.86)),
              box(0.22, 0.05, 0.05, bevel=0.015, center=(0.62, 1.97, 1.30)),
              box(0.62, 0.03, 0.03, bevel=0.01, center=(0.05, 1.958, ROOF - 0.10))):
        me_tmp = bpy.data.meshes.new("tmp"); b.to_mesh(me_tmp); b.free(); hw_bm.from_mesh(me_tmp); bpy.data.meshes.remove(me_tmp)
    B.mesh("rear-door-hardware", hw_bm, body, dark)
    # Direccionales laterales en los guardafangos delanteros.
    B.mesh("side-markers", merge(box(0.03, 0.12, 0.05, bevel=0.01, center=(1.06, -1.72, 1.12)), box(0.03, 0.12, 0.05, bevel=0.01, center=(-1.06, -1.72, 1.12))),
           body, mat("signal", SIGNAL, rough=0.2, emissive=True))

    # ---- Anclajes del juego.
    B.empty("driver-socket", body, (0, 0.12, 0))
    B.empty("passenger-socket", body, (-0.48, -0.10, 1.04))

    # ---- Ruedas (kit común): pivote (dirección) > giro (rodadura) > llanta y rin con tuercas.
    for axle, y in AXLES.items():
        for side_name, s in (("left", 1), ("right", -1)):
            pivot = B.empty(f"wheel-pivot-{axle}-{side_name}", body, (s * WHEEL_X, y, WHEEL_R), size=0.3)
            spin = B.empty(f"wheel-spin-{axle}-{side_name}", pivot, (0, 0, 0), size=0.2)
            wheel_meshes(B, spin, s, WHEEL_R, WHEEL_W, "offroad", RIM, "")

    objs = list(B.col.all_objects)
    return {"objects": len(objs), "triangles": triangles(objs)}
