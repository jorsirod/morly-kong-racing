# SPDX-License-Identifier: MIT
"""
Los otros seis carros de Morly Kong Racing, construidos en Blender por código.

Medidas en coordenadas del juego, copiadas de src/game/vehicles.ts (pickup, golf,
mazda, matiz, yaris) para que cada carro coincida con su caja de choques, la cámara
y las calcomanías que el juego pega atrás. Requiere mklib.py y car_kit.py:

    ns = {}
    for f in ("scripts/blender/mklib.py", "scripts/blender/car_kit.py", "art/blender/cars.py"):
        exec(open("<repo>/" + f).read(), ns)
    ns["BUILDERS"]["hola-willy"](alf_glb="<ruta>/alf.glb")

Cada carro vive en su propia escena (use_scene) y junta sus piezas por material
(una malla por material: menos llamadas de dibujo en el celular).
"""

import math

import bmesh
from mathutils import Matrix

GLASS = "#3f6f86"


class Parts:
    """Acumula bmesh por material y crea una malla por material al final."""

    def __init__(self, B, body, prefix):
        self.B, self.body, self.prefix = B, body, prefix
        self.items = {}
        self.mats = {}

    def add(self, key, *bms, material=None):
        if material is not None:
            self.mats[key] = material
        self.items.setdefault(key, []).extend(bms)

    def flush(self, smooth=None):
        for key, bms in self.items.items():
            if bms:
                self.B.mesh(f"{self.prefix}{key}", merge(*bms), self.body, self.mats[key], smooth_angle=(smooth or {}).get(key, 35))
        self.items = {}


def start(vid, paint_hex):
    use_scene(vid)
    B = Builder(vid)
    root = B.empty(f"vehicle-{vid}", size=0.6)
    body = B.empty("body", root, size=0.4)
    p = vid + "-"
    P = Parts(B, body, p)
    m = dict(
        paint=mat(p + "paint", paint_hex, rough=0.26),
        glass=mat(p + "glass", GLASS, rough=0.1),
        cover=mat(p + "lamp-cover", "#c8dce6", rough=0.05, alpha=0.5, double=True),
        head=mat(p + "headlight", "#fff1b7", rough=0.1, emissive=True),
        fog=mat(p + "fog", "#fff6d0", rough=0.1, emissive=True),
        signal=mat(p + "signal", "#ff9f35", rough=0.2, emissive=True),
        tail=mat(p + "tail", "#ee414c", rough=0.2, emissive=True),
    )
    return B, root, body, P, m


def lamp(d, x, y, z, scale=(1, 1, 1), seg=14):
    """Faro tipo lamp() del código: esfera emisiva escalada."""
    return gsphere(d, x, y, z, scale, seg=seg, rings=7)


def hull_with_arches(B, body, name, secs, material, r, zf, zr, extra=0.1):
    hull = B.mesh(name, loft(gsecs(secs), seg=4, div=3, step=0.22), body, material)
    cut_arches(B, hull, r, zf, zr, extra)
    return hull


def finish(B):
    objs = list(B.col.all_objects)
    return {"objects": len(objs), "triangles": triangles(objs)}


# =========================================================================== pickups

def build_pickup(single):
    vid = "la-raulina" if single else "white-empanade"
    B, root, body, P, m = start(vid, "#f7f3df" if single else "#f4efe2")
    p = vid + "-"
    dark, chrome, trim = mat(p + "dark", "#2a3038", rough=0.55), mat(p + "chrome", "#d3dde4", rough=0.18), mat(p + "trim", "#4a525b", rough=0.6)
    S = -0.02 if single else 0.1
    belt = 1.32 if single else 1.44
    yt = 2.0 if single else 2.16
    hw = 1.08 if single else 1.1
    ws = 1.0 if single else 1.12
    rf = -0.3 if single else -0.22
    cab_back = -0.62 if single else -1.12
    bed_front, bed_end = cab_back - 0.06, -2.42
    front = 2.47 if single else 2.46
    wr, ww, wz = (0.5, 0.38, (1.6, -1.55)) if single else (0.55, 0.44, (1.62, -1.62))

    if single:
        secs = [dict(z=front, w=0.94, y0=0.5, y1=1.12, r=0.12), dict(z=2.37, w=1.04, y0=0.46, y1=1.22, r=0.16), dict(z=1.7, w=hw, y0=0.44, y1=1.27, r=0.16),
                dict(z=ws, w=hw, y0=0.44, y1=belt, r=0.16), dict(z=cab_back, w=hw, y0=0.44, y1=belt + 0.01, r=0.16), dict(z=cab_back - 0.04, w=hw - 0.04, y0=0.48, y1=belt - 0.04, r=0.12)]
    else:
        secs = [dict(z=front, w=0.98, y0=0.6, y1=1.3, r=0.1), dict(z=2.38, w=1.06, y0=0.55, y1=1.36, r=0.14), dict(z=1.75, w=hw, y0=0.52, y1=1.4, r=0.16),
                dict(z=ws, w=hw, y0=0.52, y1=belt, r=0.16), dict(z=cab_back, w=hw, y0=0.52, y1=belt + 0.01, r=0.16), dict(z=cab_back - 0.04, w=hw - 0.04, y0=0.55, y1=belt - 0.04, r=0.12)]
    hull_with_arches(B, body, p + "hull", secs, m["paint"], wr, wz[0], wz[1])

    # Palangana: piso, costados (con paso de rueda), pared delantera, compuerta, nervios.
    lo, hi = (0.5, 1.3) if single else (0.56, 1.42)
    bed_len, bed_z = bed_front - bed_end, (bed_front + bed_end) / 2
    sides = B.mesh(p + "bed-sides", merge(
        pair(lambda s: rounded_bar(bed_len, 0.14, hi - lo - 0.1, 0.05, "Y", center=G(s * (hw - 0.07), (lo + hi) / 2 + 0.08, bed_z), seg=3, div=2, step=0.2)),
        gbox(hw * 2 - 0.2, hi - lo - 0.1, 0.08, 0, (lo + hi) / 2 + 0.08, bed_front - 0.04, bevel=0.03),
        gbox(hw * 2 - 0.06, hi - lo - 0.12, 0.12, 0, (lo + hi) / 2 + 0.06, bed_end + 0.06, bevel=0.04, seg=2),
    ), body, m["paint"])
    under = B.mesh(p + "bed-under", gbox(hw * 2 - 0.1, 0.3, bed_len, 0, lo + 0.15, bed_z, bevel=0.05), body, dark)
    for obj in (sides, under):
        B.apply_boolean(obj, cylinder(wr + 0.1, 3.0, "X", seg=32, center=G(0, wr, wz[1])))
    P.add("bed-floor", gbox(hw * 2 - 0.2, 0.08, bed_len, 0, lo + 0.36, bed_z), *[gbox(0.06, 0.04, bed_len - 0.2, i * 0.38, lo + 0.42, bed_z, bevel=0.015) for i in range(-2, 3)],
          material=mat(p + "bed", "#3a424a", rough=0.8))
    P.add("rails", pair(lambda s: rounded_bar(bed_len, 0.2, 0.06, 0.025, "Y", center=G(s * (hw - 0.07), hi + 0.02, bed_z), seg=2, div=0)), material=m["paint"] if single else chrome)
    P.add("dark", gbox(0.34, 0.08, 0.05, 0, hi - 0.12, bed_end - 0.01, bevel=0.02), material=dark)
    P.add("tail", pair(lambda s: gbox(0.18, 0.46, 0.06, s * (hw - 0.06), hi - 0.26, bed_end - 0.01, bevel=0.03)), material=m["tail"])
    P.add("bumpers", rounded_bar(hw * 2 + 0.02, 0.22, 0.2, 0.06, "X", center=G(0, lo - 0.02, bed_end - 0.04)),
          rounded_bar(hw * 2 + 0.04, 0.24, 0.24, 0.07, "X", center=G(0, 0.62 if single else 0.7, front + 0.06)), material=dark if single else chrome)
    P.add("dark", gbox(hw * 2 - 0.2, 0.12, 0.2, 0, 0.5 if single else 0.56, front - 0.02, bevel=0.03))

    # Frente: S-10 con parrilla delgada y la cruz dorada; Hilux con parrilla alta cromada de tres barras.
    if single:
        P.add("dark", gbox(1.3, 0.28, 0.04, 0, 0.96, front, bevel=0.02), pair(lambda s: gbox(0.44, 0.22, 0.06, s * 0.74, 0.98, front - 0.01, bevel=0.03)))
        P.add("paint-trim", gbox(1.34, 0.07, 0.04, 0, 0.96, front + 0.02, bevel=0.015), material=m["paint"])
        P.add("gold", gbox(0.3, 0.08, 0.03, 0, 0.96, front + 0.05, bevel=0.01), gbox(0.1, 0.16, 0.03, 0, 0.96, front + 0.05, bevel=0.01), material=mat(p + "gold", "#e6b941", rough=0.25))
        P.add("head", pair(lambda s: gbox(0.38, 0.15, 0.04, s * 0.74, 0.98, front + 0.02, bevel=0.02)), material=m["head"])
        P.add("signal", pair(lambda s: gbox(0.08, 0.14, 0.2, s * 0.99, 0.98, front - 0.1, bevel=0.02)), material=m["signal"])
    else:
        P.add("dark", gbox(1.32, 0.42, 0.05, 0, 1.06, front, bevel=0.02), pair(lambda s: gbox(0.3, 0.3, 0.06, s * 0.84, 1.1, front - 0.01, bevel=0.03)))
        P.add("chrome", *[gbox(1.34, 0.05, 0.03, 0, y, front + 0.03, bevel=0.012) for y in (0.94, 1.06, 1.18)], gbox(1.38, 0.05, 0.04, 0, 1.28, front + 0.02, bevel=0.015),
              gbox(0.24, 0.16, 0.03, 0, 1.06, front + 0.06, bevel=0.03), material=chrome)
        P.add("head", pair(lambda s: gbox(0.24, 0.22, 0.04, s * 0.84, 1.11, front + 0.02, bevel=0.02)), material=m["head"])
        P.add("signal", pair(lambda s: gbox(0.22, 0.1, 0.08, s * 0.84, 0.9, front, bevel=0.02)), material=m["signal"])

    cabin(B, body, p, S, belt, yt, hw, ws, rf, m["paint"])
    greenhouse(B, body, p, [dict(z=rf, w=hw - 0.04, y0=belt - 0.02, y1=yt, r=0.1), dict(z=cab_back + 0.02, w=hw - 0.04, y0=belt - 0.02, y1=yt, r=0.1)], m["glass"],
               [dict(z=rf + 0.02, w=hw - 0.02, y0=yt - 0.02, y1=yt + 0.12, r=0.06), dict(z=cab_back - 0.0, w=hw - 0.02, y0=yt - 0.02, y1=yt + 0.12, r=0.06)], m["paint"],
               bulkhead_y=belt + 0.32, bulkhead_z=rf - 0.005, hw=hw)
    P.add("pillars", pair(lambda s: gbar((s * (hw - 0.03), belt, cab_back + 0.04), (s * (hw - 0.07), yt + 0.02, cab_back + 0.04), 0.16, 0.12)), material=m["paint"])
    P.add("chrome", pair(lambda s: gbox(0.04, 0.05, 0.2, s * (hw + 0.01), belt - 0.16, 0.3 if single else 0.5, bevel=0.015)), material=chrome)
    P.add("trim", pair(lambda s: gbox(0.02, 0.8, 0.03, s * (hw + 0.002), 1.0, rf - 0.04, bevel=0.005)), material=trim)
    if not single:
        P.add("chrome", pair(lambda s: gbox(0.04, 0.05, 0.18, s * (hw + 0.01), belt - 0.16, -0.6, bevel=0.015)))
        P.add("trim", pair(lambda s: merge(gbox(0.02, 0.8, 0.03, s * (hw + 0.002), 1.0, ws - 0.06, bevel=0.005), gbox(0.02, 0.8, 0.03, s * (hw + 0.002), 1.0, cab_back + 0.1, bevel=0.005))))
        P.add("dark", pair(lambda s: rounded_bar(1.5, 0.18, 0.08, 0.03, "Y", center=G(s * (hw + 0.08), 0.58, (ws + cab_back) / 2 - 0.1), seg=2, div=0)))
        flares = bmesh.new()
        for z in (1.62, -1.62):
            for s in (-1, 1):
                x0, x1 = sorted((-s * (hw + 0.06), -s * (hw + 0.2)))
                b = arch_band(-z, 0.55, 0.62, 0.74, x0, x1, a0=8, a1=172, seg=16)
                me_ = bpy.data.meshes.new("tmp"); b.to_mesh(me_); b.free(); flares.from_mesh(me_); bpy.data.meshes.remove(me_)
        P.add("flares", flares, material=mat(p + "flare", "#2b3036", rough=0.6))
    mirrors(B, body, p, hw, belt + 0.2, ws - 0.15, dark)
    P.flush()
    anchors(B, body, S)
    if single:
        wheels(B, body, p, 0.5, 0.38, hw, 1.6, -1.55, "cap", "#e8ecef", lip_hex="#4a525b", lip_x=hw)
    else:
        wheels(B, body, p, 0.55, 0.44, hw + 0.04, 1.62, -1.62, "steel", "#aab4bc")
    return finish(B)


# =========================================================================== Golf IV + ALF

def build_golf(alf_glb=None):
    vid = "hola-willy"
    B, root, body, P, m = start(vid, "#f3efe3")
    p = vid + "-"
    dark, chrome, trim = mat(p + "dark", "#2a3038", rough=0.55), mat(p + "chrome", "#d6dfe6", rough=0.18), mat(p + "trim", "#3b434c", rough=0.6)
    S, belt, yt, hw, rf, ws = -0.07, 1.32, 2.06, 1.04, -0.39, 0.95
    secs = [dict(z=2.12, w=0.92, y0=0.5, y1=1.06, r=0.2), dict(z=2.04, w=1.0, y0=0.46, y1=1.16, r=0.22), dict(z=1.7, w=1.03, y0=0.44, y1=1.24, r=0.24),
            dict(z=ws, w=hw, y0=0.44, y1=belt, r=0.24), dict(z=-1.62, w=hw, y0=0.44, y1=1.38, r=0.24), dict(z=-2.0, w=0.98, y0=0.5, y1=1.34, r=0.22), dict(z=-2.08, w=0.9, y0=0.56, y1=1.22, r=0.2)]
    hull_with_arches(B, body, p + "hull", secs, m["paint"], 0.48, 1.36, -1.32)
    # Parrilla delgada con el escudo redondo, faros dobles bajo micas.
    P.add("dark", gbox(0.86, 0.14, 0.04, 0, 0.98, 2.12, bevel=0.02), gbox(1.1, 0.12, 0.04, 0, 0.62, 2.17, bevel=0.02), gbox(0.6, 0.2, 0.03, 0, 0.92, -2.09, bevel=0.02), material=dark)
    P.add("chrome", gcyl(0.03, 0.2, 0, 0.99, 2.15, seg=20), gcyl(0.03, 0.18, 0, 1.18, -2.11, seg=20), material=chrome)
    P.add("badge", gcyl(0.02, 0.15, 0, 0.99, 2.165, seg=20), material=mat(p + "badge", "#1d3f8a", rough=0.3))
    P.add("cover", pair(lambda s: gsphere(0.62, s * 0.62, 1.0, 2.06, (1.05, 0.46, 0.34))), material=m["cover"])
    P.add("head", pair(lambda s: merge(lamp(0.21, s * 0.5, 1.0, 2.1), lamp(0.19, s * 0.75, 1.0, 2.07))), material=m["head"])
    P.add("signal", pair(lambda s: lamp(0.12, s * 0.89, 0.94, 2.0)), material=m["signal"])
    P.add("fog", pair(lambda s: gcyl(0.04, 0.13, s * 0.72, 0.62, 2.17, seg=14)), material=m["fog"])
    P.add("bumpers", rounded_bar(2.02, 0.2, 0.24, 0.08, "X", center=G(0, 0.7, 2.08)), rounded_bar(2.0, 0.2, 0.24, 0.08, "X", center=G(0, 0.7, -2.06)), material=m["paint"])
    # Costados: moldura entre los pasos de rueda, manijas, costura de puerta.
    P.add("trim", pair(lambda s: merge(rounded_bar(1.44, 0.03, 0.08, 0.012, "Y", center=G(s * 1.045, 0.92, 0.02), seg=2, div=0),
                                       gbox(0.04, 0.05, 0.18, s * 1.06, 1.2, 0.05, bevel=0.015), gbox(0.04, 0.05, 0.18, s * 1.06, 1.22, -0.7, bevel=0.015),
                                       gbox(0.02, 0.74, 0.03, s * 1.045, 0.95, rf - 0.04, bevel=0.005))), material=trim)
    cabin(B, body, p, S, belt, yt, hw, ws, rf, m["paint"], bpillar_mat=dark)
    # Cabina trasera: vidrio, el pilar C ancho (sello del Golf IV) y la compuerta casi vertical.
    greenhouse(B, body, p, [dict(z=rf, w=hw - 0.05, y0=belt - 0.02, y1=yt, r=0.1), dict(z=-1.55, w=hw - 0.06, y0=belt - 0.02, y1=yt, r=0.1),
                            dict(z=-1.99, w=0.88, y0=belt - 0.02, y1=1.5, r=0.08)], m["glass"],
               [dict(z=rf + 0.02, w=hw - 0.07, y0=yt - 0.02, y1=yt + 0.1, r=0.06), dict(z=-1.6, w=hw - 0.08, y0=yt - 0.02, y1=yt + 0.1, r=0.06)], m["paint"],
               bulkhead_y=belt + 0.32, bulkhead_z=rf - 0.005, hw=hw)
    cp = bmesh.new()
    for s in (-1, 1):
        q = gquad([(s * (hw - 0.02), belt + 0.04, -1.0), (s * (hw - 0.04), belt + 0.08, -1.98), (s * (hw - 0.12), yt - 0.02, -1.58), (s * (hw - 0.1), yt + 0.02, -1.0)])
        bmesh.ops.solidify(q, geom=list(q.faces), thickness=0.03)
        me_ = bpy.data.meshes.new("tmp"); q.to_mesh(me_); q.free(); cp.from_mesh(me_); bpy.data.meshes.remove(me_)
    P.add("pillars", cp, gbox(1.66, 0.06, 0.16, 0, yt + 0.02, -1.62, bevel=0.025), material=m["paint"])
    P.add("dark", gbox(0.5, 0.03, 0.03, 0.1, 1.62, -1.96, bevel=0.01))
    P.add("tail", pair(lambda s: gbox(0.5, 0.2, 0.05, s * 0.68, 1.16, -2.08, bevel=0.03)), material=mat(p + "tail", "#d72f3c", rough=0.2, emissive=True))
    P.add("tail-inner", pair(lambda s: gbox(0.14, 0.18, 0.04, s * 0.47, 1.16, -2.11, bevel=0.02)), material=mat(p + "tail-inner", "#ff9fa5", rough=0.2))
    P.add("chrome", gcyl(0.25, 0.12, -0.6, 0.52, -2.1, seg=14))
    mirrors(B, body, p, hw, belt + 0.18, 0.8, m["paint"])
    P.flush()
    anchors(B, body, S)
    wheels(B, body, p, 0.48, 0.36, 1.04, 1.36, -1.32, "alloy", "#c9d2d9", lip_hex="#3b434c", lip_x=hw)
    if alf_glb:
        imported = import_glb(B, alf_glb, body)
        alf = bpy.data.objects.get("ALF-plush")
        if alf is None:
            raise RuntimeError("El GLB de ALF no trae el nodo «ALF-plush»")
    return finish(B)


# =========================================================================== Mazda 3

def build_mazda():
    vid = "orange-seed"
    B, root, body, P, m = start(vid, "#f3782c")
    p = vid + "-"
    dark, chrome = mat(p + "dark", "#242a31", rough=0.55), mat(p + "chrome", "#d6dfe6", rough=0.18)
    S, belt, yt, hw, rf, ws = -0.07, 1.28, 1.98, 1.05, -0.39, 1.15
    secs = [dict(z=2.14, w=0.92, y0=0.45, y1=0.82, r=0.16), dict(z=2.0, w=1.0, y0=0.42, y1=0.98, r=0.18), dict(z=1.6, w=1.04, y0=0.4, y1=1.1, r=0.2),
            dict(z=1.15, w=hw, y0=0.4, y1=belt - 0.04, r=0.22), dict(z=0.6, w=hw, y0=0.4, y1=belt + 0.02, r=0.24), dict(z=-1.58, w=hw, y0=0.42, y1=1.46, r=0.24),
            dict(z=-2.04, w=0.98, y0=0.48, y1=1.42, r=0.22)]
    hull_with_arches(B, body, p + "hull", secs, m["paint"], 0.49, 1.38, -1.3)
    # Parrilla de cinco puntas, boca baja ancha y faros afilados hacia atrás.
    P.add("dark", gbox(0.5, 0.14, 0.05, 0, 0.8, 2.11, bevel=0.03), gbox(0.2, 0.08, 0.05, 0, 0.71, 2.11, bevel=0.02), gbox(1.3, 0.16, 0.05, 0, 0.58, 2.12, bevel=0.04),
          gbox(1.3, 0.1, 0.08, 0, 0.52, -2.1, bevel=0.03), material=dark)
    P.add("chrome", gbox(0.6, 0.04, 0.04, 0, 0.89, 2.08, bevel=0.015), gbox(0.12, 0.1, 0.03, 0, 0.82, 2.14, bevel=0.02),
          pair(lambda s: gcyl(0.22, 0.13, s * 0.5, 0.5, -2.08, seg=14)), material=chrome)
    P.add("fog", pair(lambda s: gcyl(0.04, 0.13, s * 0.7, 0.58, 2.14, seg=14)), material=m["fog"])

    def swept(s, w, h, d, material_key):
        b = box(w, d, h, bevel=0.04, seg=2)
        bmesh.ops.rotate(b, verts=b.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(0.22, 3, "X"))
        bmesh.ops.rotate(b, verts=b.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(s * 0.62, 3, "Z"))  # barrido hacia atrás
        bmesh.ops.translate(b, vec=G(s * 0.68, 0.945, 1.84), verts=b.verts)
        return b
    P.add("lamp-housing", pair(lambda s: swept(s, 0.40, 0.13, 0.56, "dark")), material=mat(p + "lamp-housing", "#1f2830", rough=0.4))
    P.add("head", pair(lambda s: merge(lamp(0.17, s * 0.58, 0.95, 1.99), lamp(0.14, s * 0.8, 0.97, 1.8))), material=m["head"])
    # Línea de carácter, manijas, costura.
    P.add("char-line", pair(lambda s: gbar((s * 1.052, 1.06, 0.75), (s * 1.062, 1.24, -1.7), 0.03, 0.04)), material=mat(p + "char", "#c55a18", rough=0.3))
    P.add("chrome", pair(lambda s: merge(gbox(0.04, 0.05, 0.18, s * 1.07, 1.16, 0.05, bevel=0.015), gbox(0.04, 0.05, 0.18, s * 1.07, 1.24, -0.75, bevel=0.015))))
    P.add("dark", pair(lambda s: gbox(0.02, 0.8, 0.03, s * 1.05, 0.95, rf - 0.04, bevel=0.005)))
    cabin(B, body, p, S, belt - 0.04, yt, hw, ws, rf, dark)
    # Techo que cae, pilares negros, ventana que sube, compuerta con alerón.
    greenhouse(B, body, p, [dict(z=rf, w=hw - 0.05, y0=belt - 0.06, y1=yt, r=0.1), dict(z=-1.0, w=hw - 0.06, y0=belt - 0.04, y1=yt - 0.05, r=0.1),
                            dict(z=-1.62, w=hw - 0.08, y0=belt + 0.1, y1=yt - 0.1, r=0.1), dict(z=-2.02, w=0.9, y0=belt + 0.18, y1=1.5, r=0.08)], m["glass"],
               [dict(z=rf + 0.02, w=hw - 0.08, y0=yt - 0.03, y1=yt + 0.07, r=0.05), dict(z=-1.64, w=hw - 0.1, y0=yt - 0.15, y1=yt - 0.05, r=0.05)], m["paint"],
               bulkhead_y=belt + 0.3, bulkhead_z=rf - 0.005, hw=hw)
    cp = bmesh.new()
    for s in (-1, 1):
        q = gquad([(s * (hw - 0.02), 1.44, -1.3), (s * (hw - 0.04), 1.48, -2.02), (s * (hw - 0.14), yt - 0.1, -1.66), (s * (hw - 0.12), yt - 0.08, -1.32)])
        bmesh.ops.solidify(q, geom=list(q.faces), thickness=0.03)
        me_ = bpy.data.meshes.new("tmp"); q.to_mesh(me_); q.free(); cp.from_mesh(me_); bpy.data.meshes.remove(me_)
    spoiler = box(1.6, 0.3, 0.06, bevel=0.025, seg=2)
    bmesh.ops.rotate(spoiler, verts=spoiler.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(-0.1, 3, "X"))
    bmesh.ops.translate(spoiler, vec=G(0, yt + 0.01, -1.72), verts=spoiler.verts)
    P.add("pillars", cp, spoiler, material=m["paint"])
    P.add("brake", gbox(0.5, 0.04, 0.03, 0, yt - 0.01, -1.95, bevel=0.01), material=mat(p + "brake", "#ff3b46", rough=0.2, emissive=True))
    P.add("tail-housing", pair(lambda s: gsphere(0.5, s * 0.68, 1.24, -2.03, (1.2, 0.75, 0.3))), material=mat(p + "tail-housing", "#f2f2f2", rough=0.1))
    P.add("tail", pair(lambda s: merge(lamp(0.22, s * 0.58, 1.24, -2.08, (1, 1, 0.3)), lamp(0.19, s * 0.8, 1.24, -2.06, (1, 1, 0.3)))), material=m["tail"])
    P.add("bumpers", rounded_bar(1.98, 0.18, 0.22, 0.07, "X", center=G(0, 0.66, -2.04)), material=m["paint"])
    mirrors(B, body, p, hw, belt + 0.16, 1.0, m["paint"])
    P.flush()
    anchors(B, body, S)
    wheels(B, body, p, 0.49, 0.38, 1.05, 1.38, -1.3, "sport", "#2e3238", lip_hex="#242a31", lip_x=hw)
    return finish(B)


# =========================================================================== Daewoo Matiz

def build_matiz():
    vid = "black-diamond"
    B, root, body, P, m = start(vid, "#27353c")
    p = vid + "-"
    dark, chrome = mat(p + "dark", "#1b2228", rough=0.55), mat(p + "chrome", "#c9d2d9", rough=0.18)
    S, belt, yt, hw, rf, ws = -0.24, 1.4, 2.14, 0.95, -0.56, 0.78
    secs = [dict(z=1.72, w=0.82, y0=0.52, y1=0.98, r=0.26), dict(z=1.62, w=0.9, y0=0.46, y1=1.12, r=0.3), dict(z=1.28, w=0.94, y0=0.44, y1=1.3, r=0.32),
            dict(z=ws, w=hw, y0=0.44, y1=belt, r=0.32), dict(z=-1.52, w=hw, y0=0.44, y1=1.43, r=0.3), dict(z=-1.72, w=0.88, y0=0.5, y1=1.4, r=0.28)]
    hull_with_arches(B, body, p + "hull", secs, m["paint"], 0.44, 1.12, -1.1)
    # Los ojos saltones sobre el capó y la parrilla sonriente.
    P.add("cover", pair(lambda s: gsphere(0.62, s * 0.54, 1.2, 1.42, (1, 0.72, 0.92), seg=20, rings=10)), material=m["cover"])
    P.add("head", pair(lambda s: lamp(0.34, s * 0.54, 1.2, 1.52, (1, 0.8, 0.6))), material=m["head"])
    P.add("signal", pair(lambda s: lamp(0.14, s * 0.8, 1.08, 1.4)), material=m["signal"])
    P.add("dark", gtube([(-0.32, 0.86, 1.72), (-0.16, 0.82, 1.75), (0, 0.8, 1.76), (0.16, 0.82, 1.75), (0.32, 0.86, 1.72)], 0.05),
          gbox(0.9, 0.1, 0.04, 0, 0.6, 1.8, bevel=0.02), gbox(0.56, 0.2, 0.03, 0, 0.9, -1.735, bevel=0.02),
          pair(lambda s: gbox(0.02, 0.82, 0.03, s * 0.95, 0.98, rf - 0.04, bevel=0.005)), material=dark)
    P.add("chrome", gbox(0.14, 0.1, 0.03, 0, 0.98, 1.74, bevel=0.02), pair(lambda s: gbox(0.04, 0.05, 0.16, s * 0.97, 1.28, -0.1, bevel=0.015)), material=chrome)
    P.add("bumpers", rounded_bar(1.82, 0.16, 0.2, 0.07, "X", center=G(0, 0.66, 1.72)), rounded_bar(1.8, 0.16, 0.2, 0.07, "X", center=G(0, 0.68, -1.72)), material=m["paint"])
    cabin(B, body, p, S, belt, yt, hw, ws, rf, m["paint"], bpillar_mat=dark)
    # Techo alto, pilar D grueso y compuerta casi vertical.
    greenhouse(B, body, p, [dict(z=rf, w=hw - 0.05, y0=belt - 0.02, y1=yt, r=0.12), dict(z=-1.5, w=hw - 0.06, y0=belt - 0.02, y1=yt, r=0.12),
                            dict(z=-1.71, w=0.8, y0=belt - 0.02, y1=yt - 0.1, r=0.1)], m["glass"],
               [dict(z=rf + 0.02, w=hw - 0.06, y0=yt - 0.02, y1=yt + 0.11, r=0.06), dict(z=-1.58, w=hw - 0.08, y0=yt - 0.02, y1=yt + 0.11, r=0.06)], m["paint"],
               bulkhead_y=belt + 0.32, bulkhead_z=rf - 0.005, hw=hw)
    cp = bmesh.new()
    for s in (-1, 1):
        q = gquad([(s * (hw - 0.02), belt + 0.04, -1.3), (s * (hw - 0.04), belt + 0.04, -1.7), (s * (hw - 0.1), yt, -1.56), (s * (hw - 0.08), yt, -1.3)])
        bmesh.ops.solidify(q, geom=list(q.faces), thickness=0.03)
        me_ = bpy.data.meshes.new("tmp"); q.to_mesh(me_); q.free(); cp.from_mesh(me_); bpy.data.meshes.remove(me_)
    P.add("pillars", cp, material=m["paint"])
    P.add("dark", gbox(1.5, 0.06, 0.24, 0, yt + 0.02, -1.56, bevel=0.025))
    P.add("tail", pair(lambda s: gbox(0.16, 0.5, 0.06, s * 0.8, 1.56, -1.71, bevel=0.03)), material=m["tail"])
    P.add("signal", pair(lambda s: gbox(0.15, 0.12, 0.05, s * 0.8, 1.24, -1.73, bevel=0.02)))
    mirrors(B, body, p, hw, belt + 0.18, 0.64, m["paint"])
    P.flush()
    anchors(B, body, S, driver_y=0.14)
    wheels(B, body, p, 0.44, 0.32, 0.96, 1.12, -1.1, "cap", "#9aa6b0", lip_hex="#1b2228", lip_x=hw)
    return finish(B)


# =========================================================================== Toyota Yaris (El Tiburón)

def build_yaris():
    vid = "el-tiburon"
    B, root, body, P, m = start(vid, "#f2f0e8")
    p = vid + "-"
    dark, bumper = mat(p + "dark", "#1c1f24", rough=0.55), mat(p + "bumper", "#2a2d33", rough=0.7)
    S, belt, yt, hw, rf, ws = -0.12, 1.3, 2.1, 0.98, -0.46, 0.9
    secs = [dict(z=1.98, w=0.86, y0=0.52, y1=0.98, r=0.22), dict(z=1.86, w=0.94, y0=0.46, y1=1.08, r=0.26), dict(z=1.4, w=0.97, y0=0.44, y1=1.2, r=0.28),
            dict(z=ws, w=hw, y0=0.44, y1=belt, r=0.28), dict(z=-1.3, w=hw, y0=0.44, y1=1.34, r=0.26), dict(z=-1.86, w=0.96, y0=0.48, y1=1.32, r=0.22),
            dict(z=-2.02, w=0.9, y0=0.54, y1=1.26, r=0.18)]
    hull_with_arches(B, body, p + "hull", secs, m["paint"], 0.44, 1.24, -1.26)
    P.add("cover", pair(lambda s: gsphere(0.56, s * 0.6, 1.04, 1.86, (1.2, 0.62, 0.4), seg=18, rings=9)), material=m["cover"])
    P.add("head", pair(lambda s: lamp(0.24, s * 0.58, 1.04, 1.92)), material=m["head"])
    P.add("signal", pair(lambda s: lamp(0.12, s * 0.82, 0.98, 1.82)), material=m["signal"])
    P.add("dark", gbox(0.7, 0.1, 0.04, 0, 0.96, 1.95, bevel=0.02), gbox(1.0, 0.1, 0.04, 0, 0.6, 2.07, bevel=0.02), gbox(0.56, 0.18, 0.03, 0, 0.9, -2.04, bevel=0.02),
          pair(lambda s: gbox(0.02, 0.74, 0.03, s * 0.985, 0.95, rf - 0.04, bevel=0.005)), material=dark)
    P.add("badge", gbox(0.16, 0.1, 0.02, 0, 0.96, 1.98, bevel=0.01), material=mat(p + "badge", "#c9d2d9", rough=0.2))

    def crooked(length, sy, sz, r, y, z, roll):
        b = rounded_bar(length, sy, sz, r, "X", center=(0, 0, 0))
        bmesh.ops.rotate(b, verts=b.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(roll, 3, "Y"))
        bmesh.ops.translate(b, vec=G(0, y, z), verts=b.verts)
        return b
    P.add("bumpers", crooked(1.9, 0.22, 0.26, 0.08, 0.66, 1.96, 0.04), crooked(1.86, 0.22, 0.28, 0.08, 0.66, -2.02, -0.05),
          pair(lambda s: merge(gbox(0.04, 0.05, 0.16, s * 1.0, 1.18, 0.15, bevel=0.015), gbox(0.04, 0.05, 0.16, s * 1.0, 1.2, -0.6, bevel=0.015),
                               rounded_bar(1.36, 0.03, 0.07, 0.012, "Y", center=G(s * 0.99, 0.84, -0.01), seg=2, div=0))), material=bumper)
    cabin(B, body, p, S, belt, yt, hw, ws, rf, m["paint"], bpillar_mat=dark)
    greenhouse(B, body, p, [dict(z=rf, w=hw - 0.05, y0=belt - 0.02, y1=yt, r=0.12), dict(z=-1.15, w=hw - 0.06, y0=belt - 0.02, y1=yt, r=0.12),
                            dict(z=-1.5, w=0.86, y0=belt - 0.02, y1=belt + 0.08, r=0.04)], m["glass"],
               [dict(z=rf + 0.02, w=hw - 0.07, y0=yt - 0.02, y1=yt + 0.1, r=0.06), dict(z=-1.18, w=hw - 0.08, y0=yt - 0.02, y1=yt + 0.1, r=0.06)], m["paint"],
               bulkhead_y=belt + 0.32, bulkhead_z=rf - 0.005, hw=hw)
    cp = bmesh.new()
    for s in (-1, 1):
        q = gquad([(s * (hw - 0.02), belt + 0.04, -1.1), (s * (hw - 0.04), belt + 0.04, -1.46), (s * (hw - 0.12), yt - 0.02, -1.18), (s * (hw - 0.1), yt + 0.02, -1.1)])
        bmesh.ops.solidify(q, geom=list(q.faces), thickness=0.03)
        me_ = bpy.data.meshes.new("tmp"); q.to_mesh(me_); q.free(); cp.from_mesh(me_); bpy.data.meshes.remove(me_)
    P.add("pillars", cp, gbox(1.78, 0.08, 0.54, 0, belt + 0.03, -1.76, bevel=0.03), material=m["paint"])
    P.add("tail", pair(lambda s: gbox(0.36, 0.24, 0.05, s * 0.7, 1.14, -2.03, bevel=0.03)), material=mat(p + "tail", "#d72f3c", rough=0.2, emissive=True))
    P.add("tail-white", pair(lambda s: gbox(0.3, 0.06, 0.04, s * 0.7, 1.06, -2.05, bevel=0.015)), material=mat(p + "tail-white", "#f3eee6", rough=0.2))
    P.add("exhaust", gcyl(0.25, 0.1, 0.62, 0.5, -2.06, seg=12), material=mat(p + "exhaust", "#8a8f96", rough=0.4))
    # El daño, a propósito: puerta trasera en primer, abolladuras, óxido, calavera con cinta, parabrisas rajado.
    P.add("primer", gbox(0.03, 0.56, 0.86, 1.0, 1.0, -0.62, bevel=0.01), material=mat(p + "primer", "#a7adb3", rough=0.8))
    P.add("dents", *[gbox(0.04, h, w * 6, x, y, z, bevel=0.015) for x, y, z, w, h in ((-1, 0.95, 0.75, 0.04, 0.18), (1, 0.82, 1.35, 0.04, 0.12), (-1, 0.78, -1.2, 0.04, 0.16))],
          material=mat(p + "dent", "#c9c6bd", rough=0.6))
    P.add("rust", *[gsphere(0.16, x, y, z, (0.2, 1, 1.4), seg=10, rings=6) for x, y, z in ((-0.99, 0.6, 1.6), (0.99, 0.62, -1.65), (-0.99, 0.58, -0.3), (0.99, 0.6, 0.9))],
          material=mat(p + "rust", "#8a4a24", rough=0.9))
    tape = []
    for a in (-0.5, 0.5):
        b = box(0.42, 0.02, 0.06, bevel=0.005)
        bmesh.ops.rotate(b, verts=b.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(a, 3, "Y"))
        bmesh.ops.translate(b, vec=G(-0.7, 1.14, -2.06), verts=b.verts)
        tape.append(b)
    P.add("tape", *tape, material=mat(p + "tape", "#b9b9b4", rough=0.7))
    P.add("crack", gtube([(0.55, belt + 0.12, 0.86), (0.62, belt + 0.25, 0.78), (0.5, belt + 0.36, 0.72)], 0.012, seg=6), material=mat(p + "crack", "#e6f2f6", rough=0.1))
    mirrors(B, body, p, hw, belt + 0.18, 0.72, bumper)
    P.flush()
    anchors(B, body, S)
    wheels(B, body, p, 0.44, 0.32, 0.99, 1.24, -1.26, "steel", "#22252b", lip_hex="#2a2d33", lip_x=hw)
    return finish(B)


BUILDERS = {
    "white-empanade": lambda **k: build_pickup(False),
    "la-raulina": lambda **k: build_pickup(True),
    "hola-willy": lambda **k: build_golf(k.get("alf_glb")),
    "orange-seed": lambda **k: build_mazda(),
    "black-diamond": lambda **k: build_matiz(),
    "el-tiburon": lambda **k: build_yaris(),
}
