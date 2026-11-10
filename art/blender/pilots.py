# SPDX-License-Identifier: MIT
"""
Pilotos de Morly Kong Racing modelados en Blender.

Cada piloto vive en su escena `pilot-<id>` (colección del mismo nombre) dentro de art/blender/pilots.blend y se
exporta a public/models/pilots/<id>.glb. Se modela en las coordenadas del juego (x a la derecha del piloto, y arriba,
+z hacia donde mira), con las mismas medidas que buildCharacter() en src/game/models.ts, y al final se pasa a Blender
(blender = (-x, -z, y)). Así las etiquetas de texto del juego (nombre en la espalda, «LAKERS»…) calzan sin tocar nada.

Contrato del GLB (tests/pilots.test.ts):

    pilot-<id>            empty raíz en el origen, sin rotación ni escala
    ├── (mallas del torso, ropa y accesorios)
    ├── head-root         empty; la cabeza gira desde aquí
    │   ├── (mallas de la cabeza, pelo, gorra…)
    │   └── eyes          empty a la altura de los ojos: el juego lo aplasta para parpadear
    ├── arm-left          empty en el hombro (x < 0 en el juego), con el brazo y la mano
    └── arm-right

La piel, el pelo y el torso se unen con un remallado por vóxeles y se suavizan, para que la cara sea una sola
superficie continua en vez de esferas encimadas. La oclusión ambiental va horneada en el atributo «AO».

Uso (consola de Python de Blender o MCP):

    import sys; sys.path[:0] = ["<repo>/scripts/blender", "<repo>/art/blender"]
    import pilots
    pilots.build("morly")                 # o pilots.build_all()
    pilots.export("morly", repo_root="<repo>")
"""
import json
import math
import os

import bmesh
import bpy
from mathutils import Vector

import mklib as L

# --------------------------------------------------------------------------- datos (espejo de models.ts y content.ts)
LOOKS = {
    "semilla": dict(skin="#c88b68", hair="#161214", head=(.96, 1.14, .94), eyes=.16, brow=.06, browTilt=.04, haircut="slick", height=1.22, width=.94, neck=.2, cheeks=.04, ears=.21, nose=.25, smile="smirk", beard="short", moustache="thick"),
    "morly": dict(skin="#7d4e33", hair="#1f1a1b", head=(1.1, 1.02, .98), eyes=.15, brow=.0, browTilt=-.04, haircut="crop", height=1, width=.95, neck=0, cheeks=.04, ears=.42, nose=.3, smile="grin", beard="short", moustache="thick"),
    "chete": dict(skin="#d3a07c", hair="#332c25", head=(1.0, 1.06, .97), eyes=.15, brow=-.04, browTilt=.06, haircut="balding", height=.98, width=.86, neck=-.04, cheeks=.04, ears=.2, nose=.24, smile="wide"),
    "coconitas": dict(skin="#b37c59", hair="#292b30", head=(.92, 1.18, .96), eyes=.17, brow=.11, browTilt=.08, haircut="spike", height=1.22, width=1, neck=.06, cheeks=.04, ears=.21, nose=.52, smile="open"),
    "calin": dict(skin="#c59576", hair="#2b2522", head=(.96, 1.1, .95), eyes=.115, brow=.02, browTilt=-.1, haircut="up", height=1.02, width=.98, neck=.04, cheeks=.04, ears=.56, nose=.56, smile="flat"),
    "sap-heinz": dict(skin="#e0b896", hair="#1d1a1a", head=(.82, 1.2, .86), eyes=.15, brow=-.04, browTilt=.05, haircut="side", height=1.1, width=.74, neck=.12, cheeks=.04, ears=.2, nose=.27, smile="smirk", moustache="thin"),
    "enanonitas": dict(skin="#c18b6e", hair="#bdb6ad", head=(.92, 1.08, .94), eyes=.18, brow=.08, browTilt=.02, haircut="up", height=.84, width=.8, neck=-.08, cheeks=.02, ears=.22, nose=.26, smile="wide", moustache="thin"),
    "jorsi": dict(skin="#f1d2b8", hair="#302b2a", head=(.99, 1.06, .98), eyes=.16, brow=.1, browTilt=.03, haircut="quiff", height=1.04, width=.98, neck=.02, cheeks=.04, ears=.21, nose=.25, smile="grin"),
    "roman": dict(skin="#d6a382", hair="#1f1815", head=(1, 1.08, .97), eyes=.16, brow=.07, browTilt=.05, haircut="curly", height=1.05, width=1.02, neck=.02, cheeks=.04, ears=.21, nose=.3, smile="smirk", beard="full", moustache="thick"),
    "cucukis": dict(skin="#f2d3ba", hair="#5c4331", head=(.84, 1.14, .9), eyes=.15, brow=.06, browTilt=-.04, haircut="crop", height=1.08, width=.72, neck=.12, cheeks=.04, ears=.2, nose=.24, smile="smirk"),
    "raulin": dict(skin="#c39479", hair="#1f1a18", head=(1.04, 1.06, .96), eyes=.18, brow=-.03, browTilt=0, haircut="spike", height=.98, width=.96, neck=-.02, cheeks=.04, ears=.23, nose=.28, smile="open", beard="full"),
}
CHARS = {
    "semilla": dict(shirt="#eee5d0"), "morly": dict(shirt="#f5bc32", cap="#fff2d4"), "chete": dict(shirt="#f27fb2"),
    "coconitas": dict(shirt="#de783e"), "calin": dict(shirt="#fff9e9", cap="#d73e39"), "sap-heinz": dict(shirt="#84b967"),
    "enanonitas": dict(shirt="#ab4944"), "jorsi": dict(shirt="#1d1d22"), "roman": dict(shirt="#d84a45"),
    "cucukis": dict(shirt="#2f6fd0"), "raulin": dict(shirt="#58759d"),
}
IDS = list(LOOKS)
TRIANGLES_MAX = 9000


def shade(h, f):
    r, g, b = L.hex_rgb(h)
    return "#%02x%02x%02x" % tuple(max(0, min(255, round(c * f * 255))) for c in (r, g, b))


# --------------------------------------------------------------------------- formas, en coordenadas del juego
def _rot(bm, rot):
    """Rotación de Babylon (rotation.x/y/z): primero z, luego x, luego y."""
    rx, ry, rz = rot
    for v in bm.verts:
        x, y, z = v.co
        if rz:
            c, s = math.cos(rz), math.sin(rz)
            x, y = x * c - y * s, x * s + y * c
        if rx:
            c, s = math.cos(rx), math.sin(rx)
            y, z = y * c - z * s, y * s + z * c
        if ry:
            c, s = math.cos(ry), math.sin(ry)
            x, z = x * c + z * s, -x * s + z * c
        v.co = (x, y, z)


def sph(x, y, z, d, scale=(1, 1, 1), rot=None, seg=12, rings=8):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=d / 2)
    bmesh.ops.scale(bm, vec=scale, verts=bm.verts)
    if rot:
        _rot(bm, rot)
    bmesh.ops.translate(bm, vec=(x, y, z), verts=bm.verts)
    return bm


def box(x, y, z, w, h, d, rot=None, bevel=0.0):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(w, h, d), verts=bm.verts)
    if bevel:
        b = min(bevel, w * .45, h * .45, d * .45)
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=b, segments=2, profile=.5, affect="EDGES")
    if rot:
        _rot(bm, rot)
    bmesh.ops.translate(bm, vec=(x, y, z), verts=bm.verts)
    return bm


def cyl(x, y, z, h, dia, top=None, rot=None, seg=16):
    """Cilindro vertical (eje y del juego); `top` es el diámetro de arriba."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=dia / 2, radius2=(dia if top is None else top) / 2, depth=h)
    for v in bm.verts:
        v.co = (v.co.x, v.co.z, v.co.y)
    if rot:
        _rot(bm, rot)
    bmesh.ops.translate(bm, vec=(x, y, z), verts=bm.verts)
    return bm


def tube(points, radius, seg=10, r_end=None):
    """Tubo por una polilínea suavizada; el radio puede ir de `radius` a `r_end`. Puntas redondeadas."""
    pts = [Vector(p) for p in points]
    if len(pts) == 3:  # curva cuadrática por los tres puntos, como una ceja
        a, m, b = pts
        ctrl = 2 * m - (a + b) / 2
        pts = [(1 - t) ** 2 * a + 2 * (1 - t) * t * ctrl + t * t * b for t in [i / 8 for i in range(9)]]
    r_end = radius if r_end is None else r_end
    bm = bmesh.new()
    rings = []
    n = len(pts)
    up = None
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized()
        u = t.orthogonal().normalized() if up is None else (up - up.dot(t) * t).normalized()
        up = u
        v = t.cross(u).normalized()
        r = radius + (r_end - radius) * i / (n - 1)
        rings.append([bm.verts.new(p + r * (math.cos(2 * math.pi * k / seg) * u + math.sin(2 * math.pi * k / seg) * v)) for k in range(seg)])
    for a, b in zip(rings, rings[1:]):
        for k in range(seg):
            bm.faces.new((a[k], a[(k + 1) % seg], b[(k + 1) % seg], b[k]))
    for ring, p, r, sign in ((rings[0], pts[0], radius, -1), (rings[-1], pts[-1], r_end, 1)):
        t = (pts[1] - pts[0]).normalized() if sign < 0 else (pts[-1] - pts[-2]).normalized()
        tip = bm.verts.new(p + sign * t * r * .6)
        for k in range(seg):
            bm.faces.new((ring[k], ring[(k + 1) % seg], tip))
    return bm


def torus(x, y, z, dia, thick, scale=(1, 1, 1), seg=20, ring=6):
    """Toro acostado (eje y), como CreateTorus de Babylon: `dia` entre centros del tubo, `thick` el grosor."""
    bm = bmesh.new()
    R, r = dia / 2, thick / 2
    rows = []
    for i in range(seg):
        a = 2 * math.pi * i / seg
        rows.append([bm.verts.new(((R + r * math.cos(b)) * math.cos(a), r * math.sin(b), (R + r * math.cos(b)) * math.sin(a))) for b in [2 * math.pi * k / ring for k in range(ring)]])
    for i in range(seg):
        a, b = rows[i], rows[(i + 1) % seg]
        for k in range(ring):
            bm.faces.new((a[k], a[(k + 1) % ring], b[(k + 1) % ring], b[k]))
    bmesh.ops.scale(bm, vec=scale, verts=bm.verts)
    bmesh.ops.translate(bm, vec=(x, y, z), verts=bm.verts)
    return bm


def skull(f):
    """Cabeza: elipsoide con mandíbula que se afina hacia el mentón y nuca un poco más llena."""
    hx, hy, hz = f["head"]
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=4, radius=1.0)
    for v in bm.verts:
        x, y, z = v.co
        down = max(0.0, -y)
        jaw = 1 - .26 * down ** 1.5
        px = x * .455 * hx * jaw
        py = y * .455 * hy * (1 + .03 * down)
        pz = z * .455 * hz * (1 - .1 * down * down if z < 0 else 1 + .05 * down) + .03 * down * max(z, 0.0)
        v.co = (px, 1.17 + py, .035 + pz)
    return bm


# --------------------------------------------------------------------------- unión suave
def _eval(bm, mods):
    me = bpy.data.meshes.new("tmp-blob")
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new("tmp-blob", me)
    bpy.context.scene.collection.objects.link(o)
    for kind, props in mods:
        m = o.modifiers.new(kind.lower(), kind)
        for k, v in props.items():
            setattr(m, k, v)
    bpy.context.view_layer.update()
    new = bpy.data.meshes.new_from_object(o.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    bpy.data.objects.remove(o, do_unlink=True)
    bpy.data.meshes.remove(me)
    out = bmesh.new()
    out.from_mesh(new)
    bpy.data.meshes.remove(new)
    return out


def blob(bm, voxel=.02, smooth=4, target=1500):
    """Une las piezas que se tocan en una sola superficie (vóxeles), la suaviza y la baja a ~`target` triángulos."""
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    out = _eval(bm, [("REMESH", dict(mode="VOXEL", voxel_size=voxel, adaptivity=0.0)), ("SMOOTH", dict(factor=.5, iterations=smooth))])
    tris = sum(len(fc.verts) - 2 for fc in out.faces)
    if tris > target:
        out = _eval(out, [("DECIMATE", dict(ratio=target / tris))])
    return out


# --------------------------------------------------------------------------- armado
class Pilot:
    def __init__(self, pid):
        self.id = pid
        self.f = LOOKS[pid]
        self.c = CHARS[pid]
        self.parts = {}  # (nodo, color, rough, emissive) -> [bmesh]
        self.blobs = {}  # (nodo, color) -> [bmesh], se unen con blob()

    def add(self, node, color, bm, rough=.7, emissive=False):
        self.parts.setdefault((node, color, rough, emissive), []).append(bm)
        return bm

    def soft(self, node, color, bm):
        self.blobs.setdefault((node, color), []).append(bm)
        return bm


def _head(P, hair_blob=True):
    f, c, pid = P.f, P.c, P.id
    hx, hy, hz = f["head"]
    skin, hair = f["skin"], f["hair"]
    H = "head-root"
    P.soft(H, skin, skull(f))
    # Orejas: pabellón aplanado y un hueco más oscuro adentro.
    for x in (-1, 1):
        big = f["ears"] > .3
        ex = x * .44 * hx + (x * .06 if big else 0)
        P.soft(H, skin, sph(ex, 1.17, .01, f["ears"], (.55, 1, .8), rot=(0, x * -.35, x * -.25 if big else 0)))
        P.add(H, shade(skin, .72), sph(ex + x * f["ears"] * .16, 1.17, .03, f["ears"] * .52, (.3, .8, .55), seg=10, rings=6))
    # Nariz: punta, puente hasta el entrecejo y aletas.
    n = f["nose"]
    ny, nz = 1.19 - (n - .25) * .25, .47 * hz + (n - .25) * .6
    if pid != "morly":  # Morly lleva hocico y nariz de mono
        P.soft(H, skin, sph(0, ny, nz, n, (.8, .95 if n > .35 else .8, 1.1)))
        P.soft(H, skin, tube([(0, 1.36, .43 * hz), (0, ny + n * .25, nz)], .045, r_end=n * .3))
    for x in (-1, 1):
        if pid != "morly":
            P.soft(H, skin, sph(x * n * .3, ny - n * .16, nz - n * .12, n * .5, (1, .8, 1)))
        P.soft(H, skin, sph(x * (.26 + f["cheeks"] * .3) * hx, 1.02, .27 * hz + f["cheeks"] * .2, f["cheeks"] + .12, (.9, .8, .7)))
    # Ojos (cuelgan de «eyes» para el parpadeo) y cejas.
    es = .72 if pid == "calin" else 1
    ey = .5 if pid == "cucukis" else 1
    for x in (-f["eyes"], f["eyes"]):
        side = 1 if x > 0 else -1
        P.add("eyes", "#fff8e8", sph(x * hx, 1.3, .423 * hz, .21 * es, (.85, 1.05 * ey, .45), seg=14, rings=8), rough=.25)
        P.add("eyes", "#5a3a26" if pid != "cucukis" else "#3d5a52", sph(x * hx, 1.3, .472 * hz, .112 * es, (1, ey, .35), seg=12, rings=6), rough=.3)
        P.add("eyes", "#16232c", sph(x * hx, 1.3, .488 * hz, .066 * es, (1, ey, .35), seg=10, rings=5), rough=.3)
        P.add("eyes", "#ffffff", sph(x * hx - .02, 1.328, .501 * hz, .03 * es, seg=8, rings=5), rough=.2, emissive=True)
        # Línea del párpado: le da expresión a la mirada.
        P.add("eyes", shade(skin, .45), tube([(x * hx - side * .085 * es, 1.345, .44 * hz), (x * hx, 1.3 + .118 * es * ey, .468 * hz), (x * hx + side * .09 * es, 1.34, .43 * hz)], .012, seg=6))
        inner, outer = f["brow"] + f["browTilt"] * side * -1, f["brow"] - f["browTilt"] * side * -1
        P.add(H, hair, tube([(x * hx - side * .1, 1.44 + inner, .427 * hz), (x * hx, 1.48 + f["brow"], .44 * hz), (x * hx + side * .1, 1.44 + outer - .04, .427 * hz)], .03 if f["width"] < .8 else .038, r_end=.022))
        if pid == "cucukis":
            P.soft(H, skin, sph(x * hx, 1.335, .43 * hz, .23, (.9, .42, .5)))
    HB = P.soft if hair_blob else P.add
    if f.get("beard") in ("full", "short"):
        P.add(H, hair, sph(0, .97, .19, .67, (.98 * hx, .62 if f["beard"] == "full" else .5, .8), seg=16, rings=10), rough=.85)
    if f.get("beard") == "goatee":
        P.add(H, hair, sph(0, .88, .43 * hz, .24, (1, .9, .7)), rough=.85)
    if f.get("moustache") == "thick":
        P.add(H, hair, tube([(-.21, 1.07, .45 * hz), (0, 1.04, .49 * hz), (.21, 1.07, .45 * hz)], .04, r_end=.03), rough=.85)
    if f.get("moustache") == "thin":
        P.add(H, hair, tube([(-.15, 1.08, .475 * hz), (0, 1.06, .49 * hz), (.15, 1.08, .475 * hz)], .022), rough=.85)
    # Boca.
    mz = .46 * hz
    dark, teeth = "#542c31", "#fff8e6"
    s = f["smile"]
    if s == "grin":
        P.add(H, dark, sph(0, 1.0, mz, .3, (1.35, .55, .25)))
        P.add(H, teeth, box(0, 1.03, mz + .035, .3, .06, .025, bevel=.01), rough=.3)
    elif s == "wide":
        P.add(H, dark, sph(0, .99, mz, .34, (1.4, .45, .25)))
        P.add(H, teeth, box(0, 1.015, mz + .035, .36, .05, .025, bevel=.01), rough=.3)
    elif s == "open":
        P.add(H, dark, sph(0, .98, mz, .27, (1.1, .85, .25)))
        P.add(H, teeth, box(0, 1.035, mz + .04, .2, .05, .025, bevel=.01), rough=.3)
        P.add(H, "#d06470", sph(0, .94, mz + .03, .12, (1.2, .5, .3)))
    elif s == "smirk":
        P.add(H, dark, tube([(-.13, 1.0, mz + .03), (.02, .985, mz + .04), (.15, 1.03, mz + .02)], .03, r_end=.02))
    else:
        P.add(H, dark, tube([(-.12, 1.0, mz + .03), (0, .995, mz + .035), (.12, 1.0, mz + .03)], .03))
    # Pelo.
    cut = f["haircut"]
    tilt = (0, 0, .08) if cut in ("side", "quiff") else None
    if cut == "slick":
        P.soft(H, hair, sph(0, 1.56, -.14, .86, (1.02 * hx, .56, .9), rot=tilt))
        for i in range(5):  # peinado hacia atrás: mechones largos
            P.soft(H, hair, tube([((i - 2) * .14 * hx, 1.74, .22), ((i - 2) * .16 * hx, 1.86, -.05), ((i - 2) * .15 * hx, 1.72, -.36)], .085, r_end=.05))
    elif cut == "balding":
        P.soft(H, hair, sph(0, 1.2, -.3, .8, (1.02 * hx, .45, .6)))
        for i in range(12):
            a = math.pi * (-.06 + i * 1.12 / 11)
            P.soft(H, hair, sph(math.cos(a) * .47 * hx, 1.32 + math.sin(i * 1.7) * .04, math.sin(a) * -.42 - .02, .24))
    elif cut == "buzz":
        P.soft(H, hair, sph(0, 1.5, -.06, .9, (1.0 * hx, .5, .94)))
    else:
        P.soft(H, hair, sph(0, 1.55, -.055, .86, (1.01 * hx, .58, .92), rot=tilt))
    if cut in ("side", "quiff"):
        P.soft(H, hair, sph(-.18 * hx, 1.62, .22, .48, (1.3, .45, .6)))
    if cut == "quiff":
        P.soft(H, hair, sph(.02, 1.78, .18, .5, (1.1, .6, .8)))
        P.soft(H, hair, tube([(-.16, 1.7, .3), (.02, 1.9, .34), (.2, 1.78, .12)], .1, r_end=.06))
    if cut == "spike":
        for i in range(5):
            P.soft(H, hair, cyl((i - 2) * .13 * hx, 1.78, -.06, .32, .2, .015, rot=(0, 0, (i - 2) * -.14), seg=10))
        for i in range(4):
            P.soft(H, hair, cyl((i - 1.5) * .15 * hx, 1.74, -.24, .26, .18, .015, rot=(-.35, 0, (i - 1.5) * -.14), seg=10))
    if cut == "up":
        for i in range(4):
            P.soft(H, hair, cyl((i - 1.5) * .13 * hx, 1.74, .08, .26, .22, .05, rot=(-.35, 0, 0), seg=10))
    if cut == "crop":
        P.soft(H, hair, sph(0, 1.6, .24, .5, (1.4 * hx, .3, .5)))
    if cut == "curly":
        for i in range(16):
            a, r = i * 2.399, .12 + ((i * .37) % 1) * .26
            P.soft(H, hair, sph(math.cos(a) * r * hx, 1.66 + math.cos(r * 4) * .05 - (.05 if r > .3 else 0), -.05 + math.sin(a) * r * .9 + .04, .26))
    # Patillas: unen el pelo con la oreja.
    if cut != "balding":
        for x in (-1, 1):
            P.soft(H, hair, sph(x * .4 * hx, 1.4, .1, .2, (.5, 1.3, .9)))
    if c.get("cap"):
        cap = c["cap"]
        P.add(H, cap, sph(0, 1.64, -.035, .91, (1.03 * hx, .47, .95), seg=20, rings=10), rough=.8)
        P.add(H, cap, box(0, 1.58, .4, .7, .055, .54, rot=(.1, 0, 0), bevel=.025), rough=.8)
        P.add(H, shade(cap, .82), torus(0, 1.585, -.035, .9 * hx, .05, (1, .8, .95 / hx if hx else 1)), rough=.8)
        P.add(H, shade(cap, .82), sph(0, 1.87, -.035, .09, (1, .5, 1), seg=10, rings=6), rough=.8)
        P.add(H, "#fff9e9" if pid == "calin" else "#e8b52b", box(0, 1.68, .41, .18, .13, .025, bevel=.01))
    if pid == "cucukis":
        P.add(H, "#f7f7f2", sph(0, 1.7, -.04, .96, (1.02 * hx, .5, 1), seg=20, rings=10), rough=.8)
        P.add(H, "#f7f7f2", torus(0, 1.6, -.04, .98 * hx, .15, (1, .75, 1)), rough=.8)
        P.add(H, "#1d3a7a", torus(0, 1.66, -.04, .9 * hx, .05, (1, .6, 1)))
    if pid == "morly":
        P.add(H, "#d2a47c", sph(0, 1.03, .27 * hz, .66, (1.3 * hx, .82, .56), seg=16, rings=10))
        P.add(H, "#5a3522", sph(0, 1.14, .5 * hz, .3, (1.35, .62, .7)))
        for x in (-1, 1):
            P.add(H, "#2a1a12", sph(x * .065, 1.12, .56 * hz, .07, seg=8, rings=5))
            P.add(H, "#b98a66", sph(x * .55 * hx, 1.17, .07, .26, (.45, .9, .5), seg=10, rings=6))
        P.add(H, "#5a3522", tube([(-.34 * hx, 1.42, .4 * hz), (0, 1.38, .47 * hz), (.34 * hx, 1.42, .4 * hz)], .07))
    if pid == "coconitas":
        P.add(H, "#fff6e2", torus(0, 1.46, 0, .92 * hx, .07, (1, 1.6, .98)), rough=.9)
    if pid == "jorsi":
        P.add(H, "#f3c12d", cyl(.46 * hx, 1.3, -.04, .62, .07, rot=(1.2, 0, .3), seg=8))
        P.add(H, "#f2a0a8", cyl(.46 * hx, 1.3, -.04, .08, .075, rot=(1.2, 0, .3), seg=8))


def _arm(P, x, sx, sy, sz, arm, sleeve):
    f = P.f
    node = "arm-left" if x < 0 else "arm-right"
    skin = f["skin"]
    a, b, c = (0, 0, 0), (x * .41 - sx, .15 - sy, .28 - sz), (x * .29 - sx, .3 - sy, .58 - sz)
    P.soft(node, skin, tube([a, b, c], arm * 1.12, r_end=arm * .8, seg=12))
    hx_, hy_, hz_ = x * .29 - sx, .3 - sy, .6 - sz
    P.soft(node, skin, sph(hx_, hy_, hz_, .22, (1, .85, 1.05)))
    for i in range(4):  # dedos cerrados sobre el timón
        P.soft(node, skin, tube([(hx_ + (i - 1.5) * .05, hy_ + .06, hz_ + .02), (hx_ + (i - 1.5) * .052, hy_ + .05, hz_ + .12), (hx_ + (i - 1.5) * .05, hy_ - .04, hz_ + .12)], .026, seg=8))
    P.soft(node, skin, tube([(hx_ - x * .07, hy_ + .02, hz_ - .02), (hx_ - x * .13, hy_ + .06, hz_ + .06), (hx_ - x * .1, hy_ + .04, hz_ + .13)], .032, seg=8))
    if sleeve:  # manga corta
        m = Vector(a).lerp(Vector(b), .55)
        P.add(node, sleeve, tube([a, tuple(m)], arm * 1.5, r_end=arm * 1.38, seg=14), rough=.85)
        P.add(node, shade(sleeve, .8), tube([tuple(Vector(a).lerp(Vector(b), .5)), tuple(Vector(a).lerp(Vector(b), .58))], arm * 1.44, seg=14), rough=.85)


def _body(P):
    f, c, pid = P.f, P.c, P.id
    R = "root"
    skin, shirt = f["skin"], c["shirt"]
    h, w = f["height"], f["width"]
    wz = max(.82, w)
    torsoH, shoulderY, neckTop = 1.15 * h, .29 + .2 * h + .02, .52 + .3 * h + f["neck"]
    P.soft(R, shirt, sph(0, .29 + .08 * (h - 1), 0, .86, (.94 * w, torsoH, .76 * wz), seg=20, rings=12))
    P.add(R, "#263b54", box(-.11 * w, .3, .31, .09, .72 * h, .035, rot=(0, 0, .28), bevel=.012))
    P.add(R, skin, cyl(0, neckTop - .06, 0, .21 + f["neck"], .29 * min(1, w + .15), seg=18))
    # Cuello de la camisa: un aro del color de la tela, un tono más oscuro.
    P.add(R, shade(shirt, .84), torus(0, neckTop - .15 - f["neck"] * .5, 0, .3 * min(1, w + .15), .06, (1, 1, 1)), rough=.85)
    arm = .11 * min(1.1, w + .12)
    for x in (-1, 1):
        sh = sph(x * .32 * w, shoulderY, .04, .36 * min(1.1, w + .1))
        if pid == "morly":
            P.add(R, skin, sh)  # camisola sin mangas
        else:
            P.soft(R, shirt, sh)
        sx, sy, sz = x * .36 * w, shoulderY - .03, .1
        _arm(P, x, sx, sy, sz, arm, None if pid == "morly" else shirt)
        P.add(R, "#344465", sph(x * .22, -.1, .18, .34 * min(1.1, w + .15), (1, .7, 1.4), seg=12, rings=7), rough=.85)
    chestZ, chestY = .338 * wz, .29 + .08 * (h - 1)
    backZ, backY = -.33 * wz, .29 + .08 * (h - 1)
    if pid == "morly":
        for x in (-.33, .33):
            P.add(R, "#613991", box(x, .26, .18, .1, .65, .18, bevel=.04))
        P.add(R, "#613991", torus(0, neckTop - .16, 0, .34, .05), rough=.85)
    elif pid == "calin":
        for x in (-1, 1):
            P.add(R, "#ece5d9", box(x * .12, .64, .28, .19, .13, .05, rot=(0, 0, x * .35), bevel=.015))
        for i in range(3):
            P.add(R, "#cfc6b6", sph(0, .5 - i * .16, .33, .05, seg=8, rings=5))
    elif pid == "chete":
        for i in range(9):
            a = -1.1 + i * .275
            P.add(R, "#f2c13a", sph(math.sin(a) * .28, chestY + .36 - math.cos(a) * .18, chestZ - .02, .07, seg=8, rings=5), rough=.25)
        for i in range(7):
            a = -.9 + i * .3
            P.add(R, "#f2c13a", sph(math.sin(a) * .27, backY + .44 - math.cos(a) * .06, backZ + .05 + math.cos(a) * .02, .07, seg=8, rings=5), rough=.25)
    elif pid == "jorsi":
        for x, y, col in ((-.15, .4, "#f04c72"), (.12, .22, "#ffcf4f"), (.05, .5, "#53d5e4")):
            P.add(R, col, sph(x, chestY + y - .25, chestZ + .005, .13, (1, 1, .2), seg=12, rings=6))
        by = backY + .22
        P.add(R, "#f05a7e", box(0, by, backZ - .14, .56, .62, .28, bevel=.08), rough=.8)
        P.add(R, "#d9446a", box(0, by - .17, backZ - .29, .4, .22, .06, bevel=.025), rough=.8)
        for x in (-1, 1):
            P.add(R, "#7a2e45", box(x * .2, by + .3, backZ + .02, .07, .26, .06, bevel=.02), rough=.8)
            P.add(R, "#ffd34d", sph(x * .07, by + .12, backZ - .29, .16, (1, 1, .3), seg=14, rings=8))
            P.add(R, "#1d2430", sph(x * .05, by + .12, backZ - .315, .035, seg=8, rings=5))
        P.add(R, "#ffd34d", box(0, by + .04, backZ - .29, .15, .15, .04, rot=(0, 0, math.pi / 4)))
        P.add(R, "#1d2430", tube([(-.05, by + .06, backZ - .315), (0, by + .04, backZ - .32), (.05, by + .06, backZ - .315)], .012, seg=6))
    elif pid == "sap-heinz":
        fx, fy, fz = .3 * w, shoulderY + .2, -.02
        P.add(R, "#4caf50", sph(fx, fy, fz, .3, (1.1, .75, 1), seg=16, rings=10))
        for e in (-1, 1):
            P.add(R, "#4caf50", sph(fx + e * .08, fy + .1, fz + .07, .11, seg=10, rings=6))
            P.add(R, "#16232c", sph(fx + e * .08, fy + .12, fz + .12, .05, seg=8, rings=5))
            P.add(R, "#3f9a44", sph(fx + e * .13, fy - .06, fz + .08, .1, (1, .5, 1.3), seg=8, rings=5))
    elif pid == "enanonitas":
        P.add(R, "#b770b8", sph(-.3 * w, backY - .12, backZ - .02, .22, (1, 1.1, 1), rot=(0, 0, .2), seg=14, rings=8))
        P.add(R, "#7cb55b", cyl(-.3 * w, backY + .03, backZ - .02, .12, .05, .02, seg=8))
    elif pid == "cucukis":
        P.add(R, "#1d3a7a", box(0, backY + .36, backZ - .02, .62, .38, .04, bevel=.015))
        for y in (.2, .5):
            P.add(R, "#ffffff", box(0, backY + y, backZ - .045, .58, .03, .02))
        for x in (-1, 1):
            P.add(R, "#1d3a7a", box(x * .13, .5, .33, .18, .34, .04, rot=(0, 0, x * .45), bevel=.015))
            P.add(R, "#e53b35", box(x * .06, .3, .36, .06, .2, .03, rot=(0, 0, x * .3), bevel=.01))
        P.add(R, "#e53b35", sph(0, .42, .36, .16, (1.6, .8, .6), seg=12, rings=8))
    elif pid == "roman":
        for x in (-1, 1):
            P.add(R, "#b8343a", box(x * .12, .64, .28, .2, .12, .05, rot=(0, 0, x * .35), bevel=.015))
        P.add(R, "#b8343a", box(0, .52, .335, .08, .2, .02))
        for i in range(2):
            P.add(R, "#f2e8de", sph(0, .58 - i * .1, .35, .045, seg=8, rings=5))
    elif pid == "raulin":
        for x, y, z, r in ((-.18, .42, -1, .2), (.16, .12, -1, .24), (-.08, -.02, -1, .14), (.22, .5, 1, .16), (-.2, .18, 1, .18)):
            P.add(R, "#fbf6ea", sph(x * w, backY + y - .1, z * .335 * wz, r, (1, .8, .25), seg=12, rings=8))
    return dict(neckTop=neckTop, shoulderY=shoulderY)


NODE_AT = {}


def _mesh(B, name, bm, parent, color, rough, emissive, origin):
    """bmesh en coordenadas del juego -> objeto de Blender colgado de su nodo."""
    for v in bm.verts:
        x, y, z = v.co
        v.co = L_G(x - origin[0], y - origin[1], z - origin[2])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return B.mesh(name, bm, parent, L.mat("pilot-" + color.lstrip("#") + ("-glow" if emissive else "") + ("" if abs(rough - .7) < 1e-6 else "-r%d" % round(rough * 100)), color, rough=rough, emissive=emissive), smooth_angle=50)


def L_G(x, y, z):
    return (-x, -z, y)


def use_scene(name):
    sc = bpy.data.scenes.get(name) or bpy.data.scenes.new(name)
    sc.unit_settings.system = "METRIC"
    bpy.context.window.scene = sc
    return sc


def build(pid, ao=True):
    """Construye el piloto en su escena `pilot-<id>` y devuelve sus triángulos."""
    use_scene("pilot-" + pid)
    B = L.Builder("pilot-" + pid)
    P = Pilot(pid)
    f = P.f
    m = _body(P)
    _head(P)
    w = f["width"]
    nodes = {"root": (0, 0, 0), "head-root": (0, m["neckTop"] - .8, 0), "eyes": (0, m["neckTop"] - .8 + 1.3, 0),
             "arm-left": (-.36 * w, m["shoulderY"] - .03, .1), "arm-right": (.36 * w, m["shoulderY"] - .03, .1)}
    # Geometría local de cada nodo: la cabeza y los ojos se modelan en el espacio de head-root, los brazos en el del hombro.
    local = {"root": (0, 0, 0), "head-root": (0, 0, 0), "eyes": (0, 1.3, 0), "arm-left": (0, 0, 0), "arm-right": (0, 0, 0)}
    root = B.empty("pilot-" + pid)
    objs = {"root": root}
    objs["head-root"] = B.empty("head-root", root, L_G(*nodes["head-root"]), .15)
    objs["eyes"] = B.empty("eyes", objs["head-root"], L_G(0, 1.3, 0), .08)
    for n in ("arm-left", "arm-right"):
        objs[n] = B.empty(n, root, L_G(*nodes[n]), .1)
    meshes = []
    targets = {"head-root": 1500, "root": 900, "arm-left": 380, "arm-right": 380}
    for (node, color), bms in P.blobs.items():
        is_hair = color == f["hair"] and node == "head-root"
        bm = blob(L.merge(*bms), voxel=.016 if node != "root" else .022, smooth=3 if is_hair else 5, target=800 if is_hair else targets[node])
        meshes.append(_mesh(B, f"{pid}-{node}-soft-{color.lstrip('#')}", bm, objs[node], color, .85 if is_hair else .7, False, local[node]))
    for (node, color, rough, emissive), bms in P.parts.items():
        meshes.append(_mesh(B, f"{pid}-{node}-{color.lstrip('#')}" + ("-glow" if emissive else "") + ("-r%d" % round(rough * 100)), L.merge(*bms), objs[node], color, rough, emissive, local[node]))
    if ao:
        L.bake_ao(meshes, samples=32, strength=.75, distance=.5, ground=False)
    tris = L.triangles(meshes)
    return dict(id=pid, triangles=tris, meshes=len(meshes), ok=tris <= TRIANGLES_MAX)


def build_all(ao=True):
    return [build(p, ao) for p in IDS]


def export(pid, repo_root=None, out_path=None):
    """Exporta pilot-<id> a public/models/pilots/<id>.glb (solo ese piloto, con la oclusión en COLOR_0)."""
    root = bpy.data.objects.get("pilot-" + pid)
    if root is None:
        raise RuntimeError(f"Falta pilot-{pid}: corre pilots.build('{pid}')")
    scene = bpy.data.scenes["pilot-" + pid]
    previous = bpy.context.window.scene
    bpy.context.window.scene = scene
    objects = [root, *root.children_recursive]
    if out_path is None:
        out_path = os.path.join(repo_root, "public", "models", "pilots", pid + ".glb")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    try:
        for o in scene.objects:
            o.select_set(False)
        for o in objects:
            o.hide_set(False)
            o.select_set(True)
        bpy.context.view_layer.objects.active = root
        wanted = dict(
            filepath=out_path, export_format="GLB", use_selection=True, use_visible=False, use_active_scene=True,
            export_apply=True, export_yup=True, export_texcoords=False, export_normals=True, export_materials="EXPORT",
            export_cameras=False, export_lights=False, export_animations=False, export_extras=False,
            export_draco_mesh_compression_enable=False,
            export_vertex_color="NAME", export_vertex_color_name="AO", export_all_vertex_colors=False,
        )
        available = set(bpy.ops.export_scene.gltf.get_rna_type().properties.keys())
        result = bpy.ops.export_scene.gltf(**{k: v for k, v in wanted.items() if k in available})
    finally:
        for o in objects:
            o.select_set(False)
        bpy.context.window.scene = previous
    if "FINISHED" not in result:
        raise RuntimeError(f"El exportador glTF terminó con {result}")
    with open(out_path, "rb") as fh:
        data = fh.read()
    gltf = json.loads(data[20:20 + int.from_bytes(data[12:16], "little")])
    names = {n.get("name") for n in gltf["nodes"]}
    for need in ("pilot-" + pid, "head-root", "eyes", "arm-left", "arm-right"):
        if need not in names:
            raise RuntimeError(f"Al GLB le falta el nodo {need}")
    return dict(path=out_path, bytes=len(data), triangles=L.triangles([o for o in objects if o.type == "MESH"]))
