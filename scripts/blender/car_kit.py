# SPDX-License-Identifier: MIT
"""
Kit de piezas de carro en COORDENADAS DEL JUEGO (las de src/game/vehicles.ts):
x = derecha del carro, y = arriba, z = frente. Convierte a Blender con G().

Requiere scripts/blender/mklib.py en el mismo espacio de nombres.
"""

import math

import bmesh
import bpy
from mathutils import Matrix, Vector


def G(x, y, z):
    """Juego -> Blender."""
    return (-x, -z, y)


def gsecs(secs):
    """Secciones de loft() del código (z, w, y0, y1, r) -> secciones de mklib.loft (frente primero)."""
    out = [dict(y=-s["z"], w=s["w"], z0=s["y0"], z1=s["y1"], r=s.get("r", 0.2)) for s in secs]
    return sorted(out, key=lambda s: s["y"])


def gbox(w, h, d, x, y, z, bevel=0.02, seg=1):
    """Caja como box() del código: ancho (x), alto (y), largo (z), centrada en (x, y, z) del juego."""
    return box(w, d, h, bevel=min(bevel, w / 2.2, h / 2.2, d / 2.2), seg=seg, center=G(x, y, z))


def gcyl(h, diameter, x, y, z, axis="z", seg=20, top=None):
    """Cilindro a lo largo de un eje del juego (z = hacia el frente, x = de lado, y = vertical)."""
    blender_axis = {"z": "Y", "x": "X", "y": "Z"}[axis]
    return cylinder(diameter / 2, h, blender_axis, seg=seg, center=G(x, y, z), radius2=None if top is None else top / 2)


def gsphere(d, x, y, z, scale=(1, 1, 1), seg=16, rings=8):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=d / 2)
    bmesh.ops.scale(bm, vec=(scale[0], scale[2], scale[1]), verts=bm.verts)
    bmesh.ops.translate(bm, vec=G(x, y, z), verts=bm.verts)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def gquad(points):
    return quad([G(*p) for p in points])


def gbar(a, b, w, d=None):
    return bar(G(*a), G(*b), w, d)


def tube(points, radius, seg=8):
    """Tubo por una polilínea (coordenadas Blender), con tapas."""
    pts = [Vector(p) for p in points]
    bm = bmesh.new()
    rings = []
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        u = t.orthogonal().normalized()
        v = t.cross(u).normalized()
        rings.append([bm.verts.new(p + radius * (math.cos(2 * math.pi * k / seg) * u + math.sin(2 * math.pi * k / seg) * v)) for k in range(seg)])
    for a, b in zip(rings, rings[1:]):
        for k in range(seg):
            bm.faces.new((a[k], a[(k + 1) % seg], b[(k + 1) % seg], b[k]))
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def gtube(points, radius, seg=8):
    return tube([G(*p) for p in points], radius, seg)


def pair(fn):
    """Une fn(-1) y fn(1): piezas simétricas a cada lado (s = signo de x en el juego)."""
    return merge(fn(-1), fn(1))


def use_scene(name):
    """Cada carro vive en su propia escena dentro de cars.blend."""
    sc = bpy.data.scenes.get(name) or bpy.data.scenes.new(name)
    sc.unit_settings.system = "METRIC"
    sc.unit_settings.scale_length = 1.0
    bpy.context.window.scene = sc
    return sc


# --------------------------------------------------------------------------- ruedas

def tire_profile(r, w, inner, round_r):
    hw = w / 2
    pts = []
    seg = 4
    for i in range(seg + 1):
        a = math.radians(90 * i / seg)
        pts.append((hw - round_r + round_r * math.cos(a), r - round_r + round_r * math.sin(a)))
    for i in range(seg + 1):
        a = math.radians(90 + 90 * i / seg)
        pts.append((-hw + round_r + round_r * math.cos(a), r - round_r + round_r * math.sin(a)))
    pts += [(-hw + 0.03, inner + 0.03), (-hw + 0.08, inner), (hw - 0.08, inner), (hw - 0.03, inner + 0.03)]
    return list(reversed(pts))


def _spoked(face_x, s, n, width, length, offset, thick=0.05):
    out = bmesh.new()
    for k in range(n):
        a = 2 * math.pi * k / n
        b = box(thick, width, length, bevel=min(0.012, width / 3), seg=1, center=(face_x + s * 0.02, 0, offset))
        bmesh.ops.rotate(b, verts=b.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(a, 3, "X"))
        me = bpy.data.meshes.new("tmp"); b.to_mesh(me); b.free(); out.from_mesh(me); bpy.data.meshes.remove(me)
    return out


def _lug_nuts(face_x, s, n=5, radius=0.07, size=0.025):
    out = bmesh.new()
    for k in range(n):
        a = 2 * math.pi * k / n
        b = cylinder(size, 0.04, "X", seg=6, center=(face_x + s * 0.05, radius * math.cos(a), radius * math.sin(a)))
        me = bpy.data.meshes.new("tmp"); b.to_mesh(me); b.free(); out.from_mesh(me); bpy.data.meshes.remove(me)
    return out


def wheel_meshes(B, spin, s, r, w, style, rim_hex, prefix, tire_hex="#1f262e"):
    """Llanta y rin en el espacio local de wheel-spin-* (eje X de Blender). s = +1 en el lado +X de Blender."""
    offroad = style == "offroad"
    tire = lathe_x(tire_profile(r, w, inner=r * (0.6 if offroad else 0.64), round_r=min(0.11, w * 0.28)), seg=36 if offroad else 32)
    parts = [tire]
    if offroad:
        lugs = bmesh.new()
        for k in range(18):
            a = 2 * math.pi * k / 18
            b = box(w * 0.36, 0.13, 0.05, bevel=0.015, seg=1, center=(w * 0.16 * (1 if k % 2 else -1), 0, r + 0.012))
            bmesh.ops.rotate(b, verts=b.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(a, 3, "X"))
            me = bpy.data.meshes.new("tmp"); b.to_mesh(me); b.free(); lugs.from_mesh(me); bpy.data.meshes.remove(me)
        parts.append(lugs)
    else:
        # Dos ranuras finas en la banda: se ven al rodar.
        for gx in (-w * 0.15, w * 0.15):
            parts.append(lathe_x([(gx - 0.012, r + 0.002), (gx + 0.012, r + 0.002), (gx + 0.012, r - 0.012), (gx - 0.012, r - 0.012)], seg=32))
    t = merge(*parts)
    if s < 0:
        bmesh.ops.scale(t, vec=(-1, 1, 1), verts=t.verts)
        bmesh.ops.reverse_faces(t, faces=t.faces)
    side = spin.name.split("wheel-spin-")[1]
    B.mesh(f"{prefix}tire-{side}", t, spin, mat(f"{prefix}tire", tire_hex, rough=0.85), smooth_angle=50)

    ri = r * (0.6 if offroad else 0.64)
    face_x = s * (w / 2 - 0.06)
    barrel = cylinder(ri, w * 0.7, "X", seg=28, center=(0, 0, 0))
    dish = cylinder(ri * 0.95, 0.04, "X", seg=28, center=(face_x, 0, 0), radius2=ri * 0.85)
    rim_parts = [barrel, dish]
    if style == "offroad":
        rim_parts.append(_spoked(face_x, s, 6, 0.075, ri * 0.75, ri * 0.45))
    elif style == "alloy":
        rim_parts.append(_spoked(face_x, s, 5, 0.06, ri * 0.8, ri * 0.48))
    elif style == "sport":
        rim_parts.append(_spoked(face_x, s, 10, 0.03, ri * 0.85, ri * 0.5, thick=0.04))
    elif style == "steel":
        # Disco de acero con seis huecos (se ven como manchas oscuras) y aro central.
        rim_parts.append(cylinder(ri * 0.55, 0.05, "X", seg=24, center=(face_x + s * 0.015, 0, 0)))
    elif style == "cap":
        rim_parts.append(cylinder(ri * 0.9, 0.06, "X", seg=28, center=(face_x + s * 0.02, 0, 0), radius2=ri * 0.6))
    rim_parts.append(cylinder(ri * 0.22, 0.08, "X", seg=16, center=(face_x + s * 0.04, 0, 0), radius2=ri * 0.15))
    if style != "cap":
        rim_parts.append(_lug_nuts(face_x, s, radius=ri * 0.32, size=ri * 0.06))
    B.mesh(f"{prefix}rim-{side}", merge(*rim_parts), spin, mat(f"{prefix}rim", rim_hex, rough=0.3), smooth_angle=40)
    if style in ("steel", "cap"):
        dark = bmesh.new()
        n = 6 if style == "steel" else 8
        for k in range(n):
            a = 2 * math.pi * k / n
            rad = ri * (0.72 if style == "steel" else 0.62)
            b = cylinder(ri * 0.11, 0.02, "X", seg=10, center=(face_x + s * (0.025 if style == "steel" else 0.05), rad * math.cos(a), rad * math.sin(a))) if style == "steel" \
                else box(0.02, ri * 0.08, ri * 0.32, center=(face_x + s * 0.055, 0, rad))
            if style == "cap":
                bmesh.ops.rotate(b, verts=b.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(a, 3, "X"))
            me = bpy.data.meshes.new("tmp"); b.to_mesh(me); b.free(); dark.from_mesh(me); bpy.data.meshes.remove(me)
        B.mesh(f"{prefix}rim-holes-{side}", dark, spin, mat(f"{prefix}rim-dark", "#2a3038", rough=0.6), smooth_angle=30)


def wheels(B, body, prefix, r, w, x, z_front, z_rear, style, rim_hex, lip_hex=None, lip_x=None):
    """Cuatro ruedas del contrato en las posiciones del juego, con labio de guardafango opcional."""
    for axle, z in (("front", z_front), ("rear", z_rear)):
        for side_name, s in (("left", -1), ("right", 1)):
            pivot = B.empty(f"wheel-pivot-{axle}-{side_name}", body, G(s * x, r, z), size=0.3)
            spin = B.empty(f"wheel-spin-{axle}-{side_name}", pivot, (0, 0, 0), size=0.2)
            wheel_meshes(B, spin, -s, r, w, style, rim_hex, prefix)
    if lip_hex:
        lips = bmesh.new()
        lx = lip_x if lip_x is not None else x
        for z in (z_front, z_rear):
            for s in (-1, 1):
                bx0, bx1 = sorted((-s * (lx - 0.05), -s * (lx + 0.05)))
                b = arch_band(-z, r, r + 0.08, r + 0.16, bx0, bx1, a0=-5, a1=185, seg=18)
                me = bpy.data.meshes.new("tmp"); b.to_mesh(me); b.free(); lips.from_mesh(me); bpy.data.meshes.remove(me)
        B.mesh(f"{prefix}wheel-lips", lips, body, mat(f"{prefix}lip", lip_hex, rough=0.6), smooth_angle=40)


def cut_arches(B, hull, r, z_front, z_rear, extra=0.1):
    for z in (z_front, z_rear):
        B.apply_boolean(hull, cylinder(r + extra, 3.0, "X", seg=32, center=G(0, r, z)))


# --------------------------------------------------------------------------- cabina, anclajes, espejos

def cabin(B, body, prefix, S, belt, yt, hw, ws_base, roof_front, frame_mat, upright=False, bpillar_mat=None):
    """La cabina abierta del juego (como cabin() del código): el techo empieza detrás del piloto."""
    top_z, top_y, inner = S + (0.84 if upright else 0.68), belt + 0.55, hw - 0.13
    frame = merge(
        pair(lambda s: gbar((s * (hw - 0.06), belt, ws_base), (s * inner, top_y, top_z), 0.09)),
        pair(lambda s: gbar((s * inner, top_y, top_z), (s * (hw - 0.09), yt + 0.02, roof_front), 0.08)),
        gbox(inner * 2 + 0.08, 0.07, 0.08, 0, top_y, top_z + 0.02, bevel=0.025),
    )
    B.mesh(f"{prefix}windscreen-frame", frame, body, frame_mat, smooth_angle=50)
    B.mesh(f"{prefix}b-pillars", pair(lambda s: gbar((s * (hw - 0.05), belt, roof_front - 0.04), (s * (hw - 0.09), yt + 0.02, roof_front - 0.04), 0.12)),
           body, bpillar_mat or frame_mat, smooth_angle=50)
    B.mesh(f"{prefix}windscreen", gquad([(-(hw - 0.1), belt + 0.02, ws_base - 0.02), (hw - 0.1, belt + 0.02, ws_base - 0.02),
                                         (inner - 0.02, top_y - 0.04, top_z + 0.03), (-(inner - 0.02), top_y - 0.04, top_z + 0.03)]),
           body, mat(f"{prefix}windscreen", "#a9dcea", rough=0.08, alpha=0.32, double=True), smooth_angle=None)
    B.mesh(f"{prefix}door-top-trim", pair(lambda s: gbox(0.1, 0.06, ws_base - roof_front, s * (hw - 0.05), belt + 0.02, (ws_base + roof_front) / 2)),
           body, mat(f"{prefix}dark", "#2a3038", rough=0.55))
    B.mesh(f"{prefix}seats", merge(gbox(0.57, 0.46, 0.22, -0.43, belt - 0.12, S - 0.4, bevel=0.07, seg=3), gbox(0.57, 0.46, 0.22, 0.45, belt - 0.12, S - 0.4, bevel=0.07, seg=3)),
           body, mat(f"{prefix}seat", "#334b68", rough=0.75))
    dash = box(hw * 2 - 0.34, 0.3, 0.22, bevel=0.06, center=(0, 0, 0))
    bmesh.ops.rotate(dash, verts=dash.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(0.1, 3, "X"))
    bmesh.ops.translate(dash, vec=G(0, belt + 0.03, min(S + 0.98, ws_base - 0.12)), verts=dash.verts)
    B.mesh(f"{prefix}dashboard", dash, body, mat(f"{prefix}interior", "#25303b", rough=0.7))


def greenhouse(B, body, prefix, secs, glass_mat, roof_secs, roof_mat, bulkhead_y=None, bulkhead_z=None, hw=None):
    """Cabina trasera: volumen de vidrio oscuro + techo pintado encima (+ pared interior hacia el piloto)."""
    B.mesh(f"{prefix}greenhouse-glass", loft(gsecs(secs), seg=4, div=2, step=0.25), body, glass_mat, smooth_angle=30)
    B.mesh(f"{prefix}roof", loft(gsecs(roof_secs), seg=4, div=2, step=0.25), body, roof_mat, smooth_angle=35)
    if bulkhead_z is not None:
        B.mesh(f"{prefix}bulkhead", gbox((hw or 1.0) * 2 - 0.2, 0.6, 0.03, 0, bulkhead_y, bulkhead_z, bevel=0.01), body, mat(f"{prefix}interior", "#25303b", rough=0.7))


def anchors(B, body, S, driver_y=0.0):
    B.empty("driver-socket", body, G(0, driver_y, S))
    B.empty("passenger-socket", body, G(0.48, 1.04, S + 0.22))


def mirrors(B, body, prefix, hw, y, z, shell_mat):
    shells = pair(lambda s: merge(gbox(0.26, 0.17, 0.2, s * (hw + 0.13), y, z, bevel=0.05, seg=2), gbox(0.12, 0.05, 0.06, s * (hw + 0.02), y, z + 0.02)))
    B.mesh(f"{prefix}mirrors", shells, body, shell_mat)
    B.mesh(f"{prefix}mirror-glass", pair(lambda s: gbox(0.2, 0.11, 0.018, s * (hw + 0.13), y, z - 0.105, bevel=0.005)), body, mat(f"{prefix}mirror-glass", "#83bbd2", rough=0.05), smooth_angle=10)


def import_glb(B, path, parent):
    """Importa un GLB (por ejemplo ALF exportado desde el código) y lo cuelga de `parent` dentro de la colección del carro."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    for o in new:
        for c in list(o.users_collection):
            c.objects.unlink(o)
        B.col.objects.link(o)
    roots = [o for o in new if o.parent is None or o.parent not in new]
    for o in roots:
        mw = o.matrix_world.copy()
        o.parent = parent
        o.matrix_world = parent.matrix_world @ mw
    return new
