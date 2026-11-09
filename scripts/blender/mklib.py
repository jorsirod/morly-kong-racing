# SPDX-License-Identifier: MIT
"""
Piezas para construir carros de Morly Kong Racing en Blender por código.

Ejes de Blender: X = izquierda del carro (lado del conductor), -Y = frente, Z = arriba.
Desde las coordenadas del juego (src/game/vehicles.ts): blender = (-x, -z, y).

Uso (consola de Python de Blender o MCP):
    ns = {}
    exec(open("<repo>/scripts/blender/mklib.py").read(), ns)
    exec(open("<repo>/art/blender/silver_surfer.py").read(), ns)
"""

import math

import bmesh
import bpy
from mathutils import Matrix, Vector

# --------------------------------------------------------------------------- colores

def _lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


# Los carros que generaba el código salían con 0,5 × el color lineal. Con los reflejos del cielo que
# agrega el juego (paintFinish en src/game/look.ts), 0,62 se ve más vivo sin lavar los colores.
BASE_FACTOR = 0.62


def game_base(h):
    """Color base para el GLB: BASE_FACTOR × color lineal."""
    return tuple(BASE_FACTOR * _lin(c) for c in hex_rgb(h))


def game_emissive(h):
    """Brillo propio como en los carros actuales: 0,55 × color sRGB."""
    return tuple(0.55 * c for c in hex_rgb(h))


_MATS = {}


def mat(name, color, rough=0.37, emissive=False, alpha=1.0, double=False):
    """Material Principled compatible con el exportador glTF (sin metal, como el juego)."""
    key = (name, color, rough, emissive, alpha, double)
    if key in _MATS and _MATS[key].name in bpy.data.materials:
        return _MATS[key]
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    base = game_base(color)
    bsdf.inputs["Base Color"].default_value = (*base, 1.0)
    bsdf.inputs["Metallic"].default_value = 0.0
    bsdf.inputs["Roughness"].default_value = rough
    if emissive:
        bsdf.inputs["Emission Color"].default_value = (*game_emissive(color), 1.0)
        bsdf.inputs["Emission Strength"].default_value = 1.0
    bsdf.inputs["Alpha"].default_value = alpha
    if alpha < 1:
        for attr, value in (("surface_render_method", "BLENDED"), ("blend_method", "BLEND")):
            if hasattr(m, attr):
                try:
                    setattr(m, attr, value)
                except Exception:
                    pass
    m.use_backface_culling = not double
    m.diffuse_color = (*base, alpha)
    _MATS[key] = m
    return m


# --------------------------------------------------------------------------- objetos

class Builder:
    def __init__(self, collection_name):
        col = bpy.data.collections.get(collection_name)
        if col is None:
            col = bpy.data.collections.new(collection_name)
            bpy.context.scene.collection.children.link(col)
        for o in list(col.all_objects):
            bpy.data.objects.remove(o, do_unlink=True)
        for me in list(bpy.data.meshes):
            if me.users == 0:
                bpy.data.meshes.remove(me)
        self.col = col

    def empty(self, name, parent=None, loc=(0, 0, 0), size=0.25):
        o = bpy.data.objects.new(name, None)
        o.empty_display_size = size
        self.col.objects.link(o)
        o.parent = parent
        o.location = loc
        return o

    def mesh(self, name, bm, parent, material, loc=(0, 0, 0), smooth_angle=35, mirror_x=False):
        """Crea un objeto malla desde un bmesh. mirror_x duplica la geometría en -X (sin escala negativa)."""
        if mirror_x:
            mirrored = bm.copy()
            bmesh.ops.scale(mirrored, vec=(-1, 1, 1), verts=mirrored.verts)
            bmesh.ops.reverse_faces(mirrored, faces=mirrored.faces)
            me_tmp = bpy.data.meshes.new("tmp")
            mirrored.to_mesh(me_tmp)
            mirrored.free()
            bm.from_mesh(me_tmp)
            bpy.data.meshes.remove(me_tmp)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
        me = bpy.data.meshes.new(name)
        bm.to_mesh(me)
        bm.free()
        for p in me.polygons:
            p.use_smooth = True
        if smooth_angle is not None and hasattr(me, "set_sharp_from_angle"):
            me.set_sharp_from_angle(angle=math.radians(smooth_angle))
        me.materials.append(material)
        o = bpy.data.objects.new(name, me)
        self.col.objects.link(o)
        o.parent = parent
        o.location = loc
        return o

    def apply_boolean(self, target, cutter_bm, operation="DIFFERENCE"):
        """Booleano aplicado sin operadores (no depende del contexto de la interfaz)."""
        me = bpy.data.meshes.new("cutter")
        cutter_bm.to_mesh(me)
        cutter_bm.free()
        cutter = bpy.data.objects.new("cutter", me)
        self.col.objects.link(cutter)
        cutter.matrix_world = target.matrix_world.copy()
        mod = target.modifiers.new("bool", "BOOLEAN")
        mod.object = cutter
        mod.operation = operation
        mod.solver = "EXACT"
        dg = bpy.context.evaluated_depsgraph_get()
        new = bpy.data.meshes.new_from_object(target.evaluated_get(dg))
        old = target.data
        target.modifiers.remove(mod)
        target.data = new
        new.name = old.name
        bpy.data.meshes.remove(old)
        bpy.data.objects.remove(cutter, do_unlink=True)
        bpy.data.meshes.remove(me)
        for p in target.data.polygons:
            p.use_smooth = True
        if hasattr(target.data, "set_sharp_from_angle"):
            target.data.set_sharp_from_angle(angle=math.radians(35))


# --------------------------------------------------------------------------- formas (bmesh)

def rounded_rect(w, h, r, seg=4, div=0):
    """Contorno de un rectángulo redondeado centrado (lista de (u, v)), antihorario.
    div agrega puntos intermedios en los lados rectos (más vértices para la oclusión horneada)."""
    r = min(r, w / 2 - 1e-4, h / 2 - 1e-4)
    corners = [(w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)]
    arcs = []
    for cx, cy, a0 in corners:
        arc = []
        for i in range(seg + 1):
            a = math.radians(a0 + 90 * i / seg)
            arc.append((cx + r * math.cos(a), cy + r * math.sin(a)))
        arcs.append(arc)
    pts = []
    for k, arc in enumerate(arcs):
        pts.extend(arc)
        nxt = arcs[(k + 1) % 4][0]
        a = arc[-1]
        for i in range(1, div + 1):
            t = i / (div + 1)
            pts.append((a[0] + (nxt[0] - a[0]) * t, a[1] + (nxt[1] - a[1]) * t))
    return pts


def densify(sections, step=0.22):
    """Interpola secciones intermedias cada `step` metros a lo largo de Y."""
    out = [sections[0]]
    for a, b in zip(sections, sections[1:]):
        n = max(1, int(round(abs(b["y"] - a["y"]) / step)))
        for i in range(1, n + 1):
            t = i / n
            out.append({k: a[k] + (b[k] - a[k]) * t for k in a})
    return out


def loft(sections, seg=4, cap=True, div=0, step=None):
    """Casco por secciones transversales. Cada sección: dict(y, w (medio ancho), z0, z1, r)."""
    if step:
        sections = densify(sections, step)
    bm = bmesh.new()
    rings = []
    for s in sections:
        w, h = s["w"] * 2, s["z1"] - s["z0"]
        zc = (s["z0"] + s["z1"]) / 2
        ring = [bm.verts.new((u, s["y"], zc + v)) for u, v in rounded_rect(w, h, s["r"], seg, div)]
        rings.append(ring)
    n = len(rings[0])
    for a, b in zip(rings, rings[1:]):
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new((a[i], a[j], b[j], b[i]))
    if cap:
        for ring, flip in ((rings[0], True), (rings[-1], False)):
            c = bm.verts.new(sum((v.co for v in ring), Vector()) / len(ring))
            for i in range(len(ring)):
                tri = (ring[i], ring[(i + 1) % len(ring)], c)
                bm.faces.new(tuple(reversed(tri)) if flip else tri)
    bm.normal_update()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def box(sx, sy, sz, bevel=0.0, seg=2, center=(0, 0, 0), cuts=0):
    """Caja con bisel. cuts subdivide las caras antes del bisel (más vértices para la oclusión)."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(sx, sy, sz), verts=bm.verts)
    if cuts:
        bmesh.ops.subdivide_edges(bm, edges=list(bm.edges), cuts=cuts, use_grid_fill=True)
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=min(bevel, sx / 2.05, sy / 2.05, sz / 2.05), segments=seg, profile=0.5, affect="EDGES", clamp_overlap=True)
    bmesh.ops.translate(bm, vec=center, verts=bm.verts)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def rounded_bar(length, sy, sz, r, axis="X", center=(0, 0, 0), step=0.2, seg=3, div=1):
    """Barra de sección redondeada extruida a lo largo de un eje (bumpers, estribos).
    Densa a lo largo y liviana en la sección: buena para la oclusión horneada."""
    secs = [dict(y=-length / 2, w=sy / 2, z0=-sz / 2, z1=sz / 2, r=r), dict(y=length / 2, w=sy / 2, z0=-sz / 2, z1=sz / 2, r=r)]
    bm = loft(secs, seg=seg, div=div, step=step)
    if axis == "X":
        bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, "Z"))
    bmesh.ops.translate(bm, vec=center, verts=bm.verts)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def cylinder(radius, depth, axis="X", seg=24, center=(0, 0, 0), radius2=None, cap=True):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=cap, cap_tris=cap, segments=seg, radius1=radius, radius2=radius if radius2 is None else radius2, depth=depth)
    rot = {"X": Matrix.Rotation(math.pi / 2, 3, "Y"), "Y": Matrix.Rotation(math.pi / 2, 3, "X"), "Z": Matrix.Identity(3)}[axis]
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=rot)
    bmesh.ops.translate(bm, vec=center, verts=bm.verts)
    if cap:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def lathe_x(profile, seg=32):
    """Sólido de revolución alrededor del eje X. profile: lista cerrada de (x, radio)."""
    bm = bmesh.new()
    rings = []
    for k in range(seg):
        a = 2 * math.pi * k / seg
        rings.append([bm.verts.new((x, r * math.cos(a), r * math.sin(a))) for x, r in profile])
    n = len(profile)
    for k in range(seg):
        a, b = rings[k], rings[(k + 1) % seg]
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new((a[i], a[j], b[j], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def arch_band(center_y, center_z, r_in, r_out, x0, x1, a0=-12, a1=192, seg=18):
    """Banda en arco (guardafango ensanchado) alrededor del eje X, de x0 a x1."""
    bm = bmesh.new()
    rings = []
    for i in range(seg + 1):
        a = math.radians(a0 + (a1 - a0) * i / seg)
        c, s = math.cos(a), math.sin(a)
        ring = []
        for x, r in ((x0, r_in), (x1, r_in), (x1, r_out), (x0, r_out)):
            ring.append(bm.verts.new((x, center_y + r * c, center_z + r * s)))
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        for i in range(4):
            j = (i + 1) % 4
            bm.faces.new((a[i], a[j], b[j], b[i]))
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def quad(points):
    bm = bmesh.new()
    bm.faces.new([bm.verts.new(p) for p in points])
    return bm


def bar(a, b, w, d=None):
    """Barra de sección rectangular entre dos puntos."""
    a, b = Vector(a), Vector(b)
    d = d or w
    length = (b - a).length
    bm = box(w, d, length, bevel=min(w, d) * 0.3, seg=1)
    direction = (b - a).normalized()
    rot = Vector((0, 0, 1)).rotation_difference(direction).to_matrix()
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=rot)
    bmesh.ops.translate(bm, vec=(a + b) / 2, verts=bm.verts)
    return bm


def merge(*bms):
    """Une varios bmesh en uno (consume los argumentos)."""
    out = bmesh.new()
    for bm in bms:
        me = bpy.data.meshes.new("tmp")
        bm.to_mesh(me)
        bm.free()
        out.from_mesh(me)
        bpy.data.meshes.remove(me)
    return out


def triangles(objects):
    dg = bpy.context.evaluated_depsgraph_get()
    total = 0
    for o in objects:
        if o.type == "MESH":
            me = o.evaluated_get(dg).to_mesh()
            me.calc_loop_triangles()
            total += len(me.loop_triangles)
            o.evaluated_get(dg).to_mesh_clear()
    return total


# --------------------------------------------------------------------------- oclusión ambiental

def bake_ao(objects, samples=48, strength=0.7, distance=0.9, ground=True):
    """Hornea oclusión ambiental (Cycles) en el atributo de color «AO» de cada malla.

    strength: 0 = sin efecto, 1 = oclusión completa. Se guarda como 1 - strength·(1 - ao)
    para que el carro no se oscurezca de más en el juego (el color se multiplica).
    """
    scene = bpy.context.scene
    meshes = [o for o in objects if o.type == "MESH"]
    prev = dict(engine=scene.render.engine, sel=[o for o in bpy.context.view_layer.objects if o.select_get()],
                active=bpy.context.view_layer.objects.active)
    scene.render.engine = "CYCLES"
    scene.cycles.samples = samples
    if scene.world is None:
        scene.world = bpy.data.worlds.new("World")
    scene.world.light_settings.distance = distance
    helper_col = None
    if ground:
        helper_col = bpy.data.collections.new("ao-helpers")
        scene.collection.children.link(helper_col)
        bm = bmesh.new()
        bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=8.0)
        me = bpy.data.meshes.new("ao-ground")
        bm.to_mesh(me)
        bm.free()
        helper_col.objects.link(bpy.data.objects.new("ao-ground", me))
    for o in meshes:
        attrs = o.data.color_attributes
        if "AO" in attrs:
            attrs.remove(attrs["AO"])
        a = attrs.new("AO", "BYTE_COLOR", "CORNER")
        attrs.active_color = a
        if hasattr(attrs, "render_color_index"):
            attrs.render_color_index = attrs.active_color_index
    for o in prev["sel"]:
        o.select_set(False)
    for o in meshes:
        o.hide_set(False)
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    window = bpy.context.window_manager.windows[0]
    area = next((a for a in window.screen.areas if a.type == "VIEW_3D"), None)
    override = dict(window=window, active_object=meshes[0], object=meshes[0], selected_objects=meshes, selected_editable_objects=meshes)
    if area:
        override.update(area=area, region=next(r for r in area.regions if r.type == "WINDOW"))
    try:
        with bpy.context.temp_override(**override):
            result = bpy.ops.object.bake(type="AO", target="VERTEX_COLORS", use_clear=True)
    finally:
        for o in meshes:
            o.select_set(False)
        for o in prev["sel"]:
            if o.name in bpy.data.objects:
                o.select_set(True)
        bpy.context.view_layer.objects.active = prev["active"]
        scene.render.engine = prev["engine"]
        if helper_col:
            for o in list(helper_col.objects):
                me = o.data
                bpy.data.objects.remove(o, do_unlink=True)
                bpy.data.meshes.remove(me)
            bpy.data.collections.remove(helper_col)
    lo = 1.0
    for o in meshes:
        data = o.data.color_attributes["AO"].data
        for d in data:
            c = d.color
            v = 1.0 - strength * (1.0 - c[0])
            lo = min(lo, v)
            d.color = (v, v, v, 1.0)
    return {"bake": list(result), "meshes": len(meshes), "darkest": round(lo, 3)}
