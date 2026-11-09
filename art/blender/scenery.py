"""Escenarios de las pistas modelados en Blender: vegetación y monumentos.

Cada pieza vive en su propia escena de art/blender/scenery.blend («prop-<tipo>»), con un empty raíz que se llama
exactamente como el tipo del juego (palm, mango, cristo…) en el origen. Se trabaja en coordenadas del juego con G():
y hacia arriba, +z = el frente de la pieza. El juego la coloca con kit.prop() (src/game/worlds/props.ts).

Uso en Blender (con scripts/blender en sys.path):
    import scenery; scenery.build_all()
    import export_scenery; export_scenery.export_file('vegetation'); export_scenery.export_file('cristo')
"""

import math
import random

import bmesh
import bpy
from mathutils import Matrix, Vector, noise

import mklib as L

UP = Vector((0, 1, 0))


def G(x, y, z):
    """Juego -> Blender."""
    return (-x, -z, y)


def use_scene(name):
    sc = bpy.data.scenes.get(name) or bpy.data.scenes.new(name)
    sc.unit_settings.system = "METRIC"
    bpy.context.window.scene = sc
    return sc


def gv(bm, v):
    return bm.verts.new(G(v.x, v.y, v.z))


# --------------------------------------------------------------------------- formas

def vtube(points, radii, seg=8, cap_end=True, cap_start=False, wobble=None):
    """Tubo por puntos del juego con radio variable; marco sin giros (transporte paralelo).

    wobble(i, k) -> factor del radio, para pliegues o anillos.
    """
    pts = [Vector(p) for p in points]
    bm = bmesh.new()
    rings, n = [], None
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        n = t.orthogonal().normalized() if n is None else (n - t * n.dot(t)).normalized()
        b = t.cross(n)
        ring = []
        for k in range(seg):
            a = 2 * math.pi * k / seg
            r = radii[i] * (wobble(i, k) if wobble else 1)
            ring.append(gv(bm, p + r * (math.cos(a) * n + math.sin(a) * b)))
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        for k in range(seg):
            bm.faces.new((a[k], a[(k + 1) % seg], b[(k + 1) % seg], b[k]))
    if cap_end:
        bm.faces.new(rings[-1])
    if cap_start:
        bm.faces.new(list(reversed(rings[0])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def blob(radius, center, scale=(1, 1, 1), subdiv=2, amp=0.22, freq=1.6, seed=0.0, flat_bottom=0.0):
    """Esfera abultada con ruido: copas de árboles y arbustos. center/scale en coordenadas del juego."""
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=radius)
    off = Vector((seed * 13.1, seed * 7.7, seed * 3.3))
    for v in bm.verts:
        p = v.co / radius
        d = 0.65 * noise.noise(p * freq + off) + 0.35 * noise.noise(p * freq * 2.7 + off * 1.3)
        v.co = v.co * (1 + amp * d)
        if flat_bottom and v.co.z < -radius * flat_bottom:  # blender z = arriba
            v.co.z = -radius * flat_bottom + (v.co.z + radius * flat_bottom) * 0.35
    bmesh.ops.scale(bm, vec=(scale[0], scale[2], scale[1]), verts=bm.verts)
    bmesh.ops.translate(bm, vec=G(*center), verts=bm.verts)
    return bm


def lathe(profile, seg=16, depth=1.0, ripple=None, y_axis=(0, 0), caps=True):
    """Sólido de revolución alrededor del eje vertical del juego. profile = [(radio, y)], de abajo arriba.

    depth escala el eje z (sección elíptica); ripple(t, a) -> factor del radio (pliegues).
    """
    bm = bmesh.new()
    rings = []
    for j, (r, y) in enumerate(profile):
        t = j / (len(profile) - 1)
        ring = []
        for k in range(seg):
            a = 2 * math.pi * k / seg
            rr = r * (ripple(t, a) if ripple else 1)
            ring.append(gv(bm, Vector((y_axis[0] + rr * math.cos(a), y, y_axis[1] + rr * math.sin(a) * depth))))
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        for k in range(seg):
            bm.faces.new((a[k], a[(k + 1) % seg], b[(k + 1) % seg], b[k]))
    if caps:
        bm.faces.new(list(reversed(rings[0])))
        if profile[-1][0] > 1e-4:
            bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def prism(radius, h, y0, seg=8, radius_top=None, center=(0, 0)):
    """Cilindro vertical (seg lados) del juego, de y0 a y0+h."""
    bm = L.cylinder(radius, h, "Z", seg=seg, center=G(center[0], y0 + h / 2, center[1]),
                    radius2=radius_top)
    return bm


def gbox(w, h, d, x, y, z):
    return L.box(w, d, h, center=G(x, y, z))


# --------------------------------------------------------------------------- piezas comunes

def _part(B, root, name, bms, material, smooth=40):
    bm = L.merge(*bms) if isinstance(bms, (list, tuple)) else bms
    return B.mesh(name, bm, root, material, smooth_angle=smooth)


def _begin(kind):
    use_scene("prop-" + kind)
    B = L.Builder("prop-" + kind)
    bpy.context.view_layer.update()  # tras borrar la versión anterior, la capa de vista conserva huecos
    root = B.empty(kind, size=1.0)
    return B, root


def _finish(B, root, ao_strength=0.55, distance=1.6, samples=32):
    objs = [o for o in B.col.objects if o.type == "MESH"]
    bake = L.bake_ao(objs, samples=samples, strength=ao_strength, distance=distance, ground=True)
    return {"triangles": L.triangles(objs), "parts": len(objs), "ao": bake["darkest"]}


# --------------------------------------------------------------------------- vegetación

def palm(seed=3):
    """Palmera de coco: tronco curvo anillado, ~11 hojas con folíolos colgantes, cocos y una hoja seca."""
    rnd = random.Random(seed)
    B, root = _begin("palm")
    trunk_c = L.mat("palm-trunk", "#9c8460", 0.85)
    leaf_c = L.mat("palm-leaf", "#5a9e4e", 0.6, double=True)
    leaf_c2 = L.mat("palm-leaf-light", "#7cb85a", 0.6, double=True)
    dry_c = L.mat("palm-dry", "#a08a52", 0.8, double=True)
    nut_c = L.mat("coconut", "#7d5a2e", 0.55)

    n, H, lean = 18, 7.7, 1.0
    pts = [Vector((lean * (i / n) ** 2, H * i / n, 0.12 * math.sin(i / n * 3))) for i in range(n + 1)]
    radii = [0.42 - 0.22 * min(1, i / 2.5) if i < 3 else 0.27 - 0.09 * i / n for i in range(n + 1)]
    _part(B, root, "palm-trunk", vtube(pts, radii, seg=8, wobble=lambda i, k: 1.06 if i % 2 else 0.97), trunk_c, 60)
    top = pts[-1]

    fronds = {leaf_c: [], leaf_c2: [], dry_c: []}
    count = 13
    for f in range(count + 1):
        dry = f == count
        a = (f / count) * 2 * math.pi + rnd.uniform(-0.18, 0.18)
        d = Vector((math.cos(a), 0, math.sin(a)))
        length = rnd.uniform(3.6, 4.4) if not dry else 2.6
        rise = rnd.uniform(0.6, 1.4) if f % 3 else rnd.uniform(1.4, 2.0)
        droop = rnd.uniform(1.6, 3.2) if not dry else 0.0
        steps = 12
        bm = bmesh.new()

        def at(s):
            if dry:  # cuelga pegada al tronco
                return top + d * (0.5 * s) - UP * (2.4 * s) + Vector((0, 0.1, 0))
            return top + d * (length * s) + UP * (rise * s - droop * s * s)

        side = d.cross(UP).normalized()
        prev = None
        for i in range(steps + 1):
            s = i / steps
            p = at(s)
            w = 0.07 * (1 - s) + 0.015
            pair = (gv(bm, p - side * w), gv(bm, p + side * w))
            if prev:
                bm.faces.new((prev[0], prev[1], pair[1], pair[0]))
            prev = pair
            if i < 1 or i == steps:
                continue
            t = (at(min(1, s + 0.05)) - at(max(0, s - 0.05))).normalized()
            sd = t.cross(UP).normalized() if abs(t.dot(UP)) < 0.98 else side
            lf = (1.3 if not dry else 0.6) * (0.3 + 0.7 * math.sin(math.pi * min(1, s * 1.1)))
            for sg in (-1, 1):
                dirv = (sd * sg * 0.9 + t * 0.45 - UP * (0.32 if not dry else 0.9)).normalized()
                tip = p + dirv * lf
                mid = p + dirv * lf * 0.5 - UP * lf * 0.12
                ww = 0.13
                b1, b2 = gv(bm, p - t * ww), gv(bm, p + t * ww)
                m1, m2 = gv(bm, mid - t * ww * 0.8), gv(bm, mid + t * ww * 0.8)
                tv = gv(bm, tip)
                bm.faces.new((b1, b2, m2, m1))
                bm.faces.new((m1, m2, tv))
        fronds[dry_c if dry else (leaf_c2 if f % 2 else leaf_c)].append(bm)
    for m, bms in fronds.items():
        if bms:
            _part(B, root, m.name, bms, m, None)

    nuts = []
    for i in range(5):
        a = i / 5 * 2 * math.pi
        c = top + Vector((0.28 * math.cos(a), -0.35 - 0.12 * (i % 2), 0.28 * math.sin(a)))
        nuts.append(L.merge(*[blob(0.17, (c.x, c.y, c.z), subdiv=1, amp=0.04)]))
    nuts.append(blob(0.3, (top.x, top.y - 0.05, top.z), scale=(1, 1.3, 1), subdiv=1, amp=0.05))
    _part(B, root, "coconut", nuts, nut_c)
    return _finish(B, root, 0.5, 1.4)


def _crown(B, root, name, material, blobs, seed, amp=0.3, freq=2.2):
    bms = [blob(r, c, s, subdiv=3 if r > 1.6 else 2, amp=amp, freq=freq, seed=seed + i, flat_bottom=0.55)
           for i, (r, c, s) in enumerate(blobs)]
    return _part(B, root, name, bms, material, 70)


def cluster(rnd, center, ext, n, rmin, rmax, squash=0.8, core=0.75):
    """Copa hecha de muchos bultos sobre un elipsoide (ext = semiejes x, y, z), más un núcleo que la rellena.

    Los bultos se reparten con la espiral de Fibonacci sobre la mitad superior, con algo de azar.
    """
    cx, cy, cz = center
    ex, ey, ez = ext
    out = [(min(ex, ez) * core, (cx, cy, cz), (ex / min(ex, ez), ey / min(ex, ez) * 0.9, ez / min(ex, ez)))]
    golden = math.pi * (3 - math.sqrt(5))
    for i in range(n):
        y = 1 - (i + 0.5) / n * 1.25  # de 1 a -0.25: casi todo arriba, algunos bajo el ecuador
        r = math.sqrt(max(0.0, 1 - y * y))
        a = i * golden + rnd.uniform(-.25, .25)
        p = (cx + ex * r * math.cos(a) * 0.85, cy + ey * y * 0.8, cz + ez * r * math.sin(a) * 0.85)
        out.append((rnd.uniform(rmin, rmax), p, (1, squash, 1)))
    return out


def _branches(rnd, base_y, count, reach, rise, r0=0.18, start_r=0.0):
    out = []
    for i in range(count):
        a = i / count * 2 * math.pi + rnd.uniform(-0.3, 0.3)
        d = Vector((math.cos(a), 0, math.sin(a)))
        pts = [Vector((0, base_y, 0)) + d * (start_r + reach * t) + UP * (rise * math.sin(t * 1.4)) for t in (0, 0.35, 0.7, 1.0)]
        out.append(vtube(pts, [r0, r0 * 0.75, r0 * 0.5, r0 * 0.3], seg=6))
    return out


def mango(seed=11):
    """Árbol de mango: tronco corto y grueso, ramas abiertas y copa redonda y densa."""
    rnd = random.Random(seed)
    B, root = _begin("mango")
    bark = L.mat("bark", "#7a644a", 0.9)
    leaves = L.mat("mango-leaves", "#4a8a40", 0.7)
    trunk = vtube([Vector((0, 0, 0)), Vector((0.1, 1.4, 0)), Vector((0, 2.8, 0.1))], [0.42, 0.32, 0.26], seg=8)
    _part(B, root, "bark", [trunk] + _branches(rnd, 2.4, 5, 2.0, 1.6, 0.2), bark)
    _crown(B, root, "mango-leaves", leaves, cluster(rnd, (0, 5.0, 0), (3.1, 2.4, 3.1), 14, 1.05, 1.5, core=0.85), seed)
    return _finish(B, root, 0.6, 2.2)


def malinche(seed=21):
    """Malinche (flamboyán): tronco corto, ramas en abanico y copa ancha como sombrilla, roja con verde debajo."""
    rnd = random.Random(seed)
    B, root = _begin("malinche")
    bark = L.mat("bark", "#7a644a", 0.9)
    red = L.mat("malinche-flowers", "#e2492f", 0.6)
    green = L.mat("malinche-leaves", "#5f9a46", 0.7)
    trunk = vtube([Vector((0, 0, 0)), Vector((0.15, 1.2, 0)), Vector((0, 2.3, 0))], [0.36, 0.28, 0.24], seg=8)
    _part(B, root, "bark", [trunk] + _branches(rnd, 2.2, 5, 3.0, 1.9, 0.17), bark)
    top = cluster(rnd, (0, 5.2, 0), (3.9, 1.0, 3.9), 14, 0.9, 1.25, squash=0.55, core=0.7)
    under = [(r * 1.05, (c[0] * 0.92, 4.25, c[2] * 0.92), (1.2, .4, 1.2)) for r, c, _ in top[1::2]]
    under.append((2.7, (0, 4.4, 0), (1.35, .32, 1.35)))
    _crown(B, root, "malinche-flowers", red, top, seed, amp=0.32, freq=2.6)
    _crown(B, root, "malinche-leaves", green, under, seed + 50, amp=0.25)
    return _finish(B, root, 0.55, 2.2)


def ceiba(seed=31):
    """Ceiba: tronco alto y recto con raíces en aleta y copa ancha y plana en lo alto."""
    rnd = random.Random(seed)
    B, root = _begin("ceiba")
    bark = L.mat("ceiba-bark", "#8f7f66", 0.9)
    leaves = L.mat("ceiba-leaves", "#5c9a48", 0.7)
    trunk = vtube([Vector((0, 0, 0)), Vector((0, 1.2, 0)), Vector((0, 3.5, 0)), Vector((0, 7.4, 0))], [0.7, 0.52, 0.44, 0.34], seg=10)
    fins = []
    for i in range(7):
        a = i / 7 * 2 * math.pi + 0.3 + rnd.uniform(-.2, .2)
        d = Vector((math.cos(a), 0, math.sin(a)))
        s = d.cross(UP).normalized() * 0.07
        bm = bmesh.new()
        reach = rnd.uniform(1.0, 1.5)
        base_out, base_in, top_in = d * reach, d * 0.35, d * 0.35 + UP * rnd.uniform(1.4, 2.2)
        vs = [gv(bm, p) for p in (base_in - s, base_out - s, top_in - s, base_in + s, base_out + s, top_in + s)]
        bm.faces.new((vs[0], vs[1], vs[2]))
        bm.faces.new((vs[5], vs[4], vs[3]))
        bm.faces.new((vs[1], vs[4], vs[5], vs[2]))
        bm.faces.new((vs[0], vs[3], vs[4], vs[1]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        fins.append(bm)
    _part(B, root, "ceiba-bark", [trunk] + fins + _branches(rnd, 7.0, 5, 3.6, 1.2, 0.22), bark, 50)
    _crown(B, root, "ceiba-leaves", leaves, cluster(rnd, (0, 8.7, 0), (4.6, 1.2, 4.6), 15, 1.1, 1.6, squash=0.55, core=0.7), seed)
    return _finish(B, root, 0.55, 2.4)


def pine(seed=41):
    """Pino: tronco recto y pisos de ramas en estrella, caídos hacia afuera."""
    B, root = _begin("pine")
    bark = L.mat("pine-bark", "#6f5440", 0.9)
    needles = L.mat("pine-needles", "#3b7449", 0.75)
    _part(B, root, "pine-bark", vtube([Vector((0, 0, 0)), Vector((0, 6.5, 0))], [0.3, 0.12], seg=7), bark)
    tiers = []
    for i, (r, y0, h) in enumerate(((2.5, 1.8, 2.4), (2.0, 3.1, 2.2), (1.55, 4.3, 2.0), (1.1, 5.4, 1.8), (0.65, 6.4, 1.5))):
        bm = bmesh.new()
        apex = gv(bm, Vector((0, y0 + h, 0)))
        ring, n = [], 14
        for k in range(n):
            a = 2 * math.pi * k / n + i * 0.4
            rr = r * (1.0 if k % 2 == 0 else 0.72)
            ring.append(gv(bm, Vector((rr * math.cos(a), y0 - (0.25 if k % 2 == 0 else 0.0), rr * math.sin(a)))))
        inner = gv(bm, Vector((0, y0 + 0.35, 0)))
        for k in range(n):
            bm.faces.new((apex, ring[(k + 1) % n], ring[k]))
            bm.faces.new((inner, ring[k], ring[(k + 1) % n]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        tiers.append(bm)
    _part(B, root, "pine-needles", tiers, needles, 50)
    return _finish(B, root, 0.55, 1.8)


def bush(seed=51):
    """Arbusto: tres o cuatro bultos de hojas, unos 2,5 m de ancho."""
    rnd = random.Random(seed)
    B, root = _begin("bush")
    leaves = L.mat("bush-leaves", "#66b246", 0.7)
    _crown(B, root, "bush-leaves", leaves, cluster(rnd, (0, 0.8, 0), (1.25, 0.75, 1.15), 6, 0.55, 0.75, core=0.8), seed, amp=0.3)
    return _finish(B, root, 0.6, 1.2)


# --------------------------------------------------------------------------- San Juan del Sur

def cristo():
    """Cristo de la Misericordia: mirador octogonal con baranda, pedestal escalonado y la estatua con los brazos
    abiertos. El origen es la cima del cerro; mira hacia +z (el juego lo gira hacia la bahía)."""
    B, root = _begin("cristo")
    stone = L.mat("cristo-stone", "#f2eedc", 0.55)
    plinth = L.mat("cristo-plinth", "#d9d3bd", 0.7)
    plaza = L.mat("cristo-plaza", "#c9bfa6", 0.85)
    rail = L.mat("cristo-rail", "#f4f0e4", 0.6)

    # Mirador: plataforma octogonal, escalones al frente y baranda.
    _part(B, root, "cristo-plaza", [prism(10.5, 1.0, -0.6, seg=8), prism(9.6, 0.25, 0.4, seg=8),
                                     gbox(5, .35, 2.2, 0, .05, 10.6), gbox(5, .35, 1.2, 0, -.3, 11.6)], plaza, 20)
    posts, rails = [], []
    for k in range(8):
        a0, a1 = 2 * math.pi * k / 8 + math.pi / 8, 2 * math.pi * (k + 1) / 8 + math.pi / 8
        p0 = Vector((9.2 * math.cos(a0), 0, 9.2 * math.sin(a0)))
        p1 = Vector((9.2 * math.cos(a1), 0, 9.2 * math.sin(a1)))
        mid = (p0 + p1) / 2
        if mid.z > 8 and abs(mid.x) < 3:  # abertura frente a los escalones
            continue
        for t in (0, .25, .5, .75):
            q = p0.lerp(p1, t)
            posts.append(gbox(.18, 1.0, .18, q.x, 1.15, q.z))
        rails.append(L.bar(G(p0.x, 1.65, p0.z), G(p1.x, 1.65, p1.z), .22, .12))
    _part(B, root, "cristo-rail", posts + rails, rail, 20)

    # Pedestal escalonado con cornisa.
    _part(B, root, "cristo-plinth", [gbox(7.2, 1.2, 7.2, 0, 1.25, 0), gbox(6.2, 1.0, 6.2, 0, 2.35, 0),
                                      prism(3.1, 5.4, 2.85, seg=4, radius_top=2.8),
                                      gbox(5.6, .5, 5.6, 0, 8.45, 0), gbox(4.6, .7, 4.6, 0, 9.05, 0)], plinth, 20)
    # Prism with 4 sides is rotated 45°: fine, it reads as a square shaft between the cornices.

    # Estatua: túnica con pliegues, manto, brazos abiertos con mangas anchas, cabeza con cabello y barba.
    y0 = 9.4
    robe = lathe([(2.05, y0), (1.85, y0 + 1.4), (1.6, y0 + 4), (1.42, y0 + 7.5), (1.32, y0 + 9.5), (1.45, y0 + 12),
                  (1.7, y0 + 14.2), (1.85, y0 + 15.4), (1.25, y0 + 16.3), (0.5, y0 + 16.8), (0.45, y0 + 17.3)],
                 seg=20, depth=0.68, ripple=lambda t, a: 1 + (0.07 * math.cos(7 * a)) * max(0, 0.7 - t))
    sash = lathe([(1.36, y0 + 9.1), (1.4, y0 + 9.7), (1.36, y0 + 10.3)], seg=20, depth=0.72)
    head_y = y0 + 18.4
    head = blob(0.95, (0, head_y, 0.05), (0.92, 1.12, 1.0), subdiv=2, amp=0.0)
    hair = blob(1.02, (0, head_y + 0.12, -0.18), (1.0, 1.15, 1.0), subdiv=2, amp=0.03)
    locks = blob(0.9, (0, head_y - 0.9, -0.35), (1.45, 0.9, 0.7), subdiv=2, amp=0.05)
    beard = blob(0.55, (0, head_y - 0.65, 0.55), (1.0, 1.1, 0.75), subdiv=2, amp=0.03)
    arms = []
    for s in (-1, 1):
        sh = Vector((s * 1.45, y0 + 15.3, 0))
        el = Vector((s * 4.7, y0 + 15.0, 0.45))
        wr = Vector((s * 7.6, y0 + 14.5, 1.0))
        arms.append(vtube([sh, sh.lerp(el, .5), el, el.lerp(wr, .5), wr],
                          [0.78, 0.72, 0.66, 0.78, 0.95], seg=12, cap_end=True))
        # Mano abierta con la palma hacia adelante, saliendo de la manga.
        hand = wr + Vector((s * 0.85, -0.25, 0.15))
        arms.append(blob(0.42, (hand.x, hand.y, hand.z), (1.25, 1.0, 0.45), subdiv=2, amp=0.0))
        arms.append(vtube([wr + Vector((s * .2, 0, 0)), hand], [0.28, 0.24], seg=8))
        for f in range(4):
            fy = hand.y + 0.42 - f * 0.05
            tip = hand + Vector((s * 0.55, 0.25 - f * 0.18, 0.02))
            arms.append(vtube([Vector((hand.x + s * .3, fy - f * .17, hand.z)), tip], [0.09, 0.07], seg=5))
    # Manto: capa sobre hombros y espalda.
    mantle = lathe([(1.9, y0 + 15.6), (1.95, y0 + 14), (2.0, y0 + 10), (2.15, y0 + 4), (2.25, y0 + 1.2)],
                   seg=20, depth=0.75, y_axis=(0, -0.25), caps=False)
    # Solo la mitad trasera (z del juego < -0.1, y de Blender > 0.1): el frente deja ver la túnica.
    bmesh.ops.delete(mantle, geom=[f for f in mantle.faces if f.calc_center_median().y <= 0.1], context="FACES")
    # La estatua mide 15 m sobre el pedestal de 9 m: se modela a 18 m y se escala.
    statue = L.merge(robe, sash, head, hair, locks, beard, *arms)
    for bm in (statue, mantle):
        bmesh.ops.scale(bm, vec=(0.84, 0.84, 0.84), space=Matrix.Translation(-Vector(G(0, y0, 0))), verts=bm.verts)
    _part(B, root, "cristo-stone", statue, stone, 45)
    _part(B, root, "cristo-mantle", mantle, L.mat("cristo-mantle", "#ece6d2", 0.6, double=True), 45)
    return _finish(B, root, 0.6, 3.0, 24)


# --------------------------------------------------------------------------- piezas teñidas por instancia
# Se modelan en blanco: el juego les pone el color de cada ejemplar (tint en kit.prop), como las lonas del mercado
# o los colores de los Árboles de la Vida.

def planar_uv(bm, scale):
    """UV planas por la vista de arriba (x, z del juego), en metros/scale: para las texturas del juego."""
    uv = bm.loops.layers.uv.get("UVMap") or bm.loops.layers.uv.new("UVMap")
    for f in bm.faces:
        for loop in f.loops:
            loop[uv].uv = (loop.vert.co.x / scale, loop.vert.co.y / scale)
    return bm


def rock(seed=61):
    """Roca volcánica: bulto irregular de base plana. El juego la estira y le da uno de cuatro grises."""
    B, root = _begin("rock")
    m = L.mat("rock-tinted", "#ffffff", 0.9)
    bm = blob(1.0, (0, 0.25, 0), (1.0, 0.75, 1.0), subdiv=2, amp=0.42, freq=1.3, seed=seed, flat_bottom=0.3)
    bmesh.ops.translate(bm, vec=(0, 0, -0.05), verts=bm.verts)
    _part(B, root, "rock-tinted", bm, m, 28)
    return _finish(B, root, 0.6, 1.2)


def arbol_vida(seed=71):
    """Árbol de la Vida de Managua: tronco metálico con siete ramas en espiral, aro en la copa y bombillos.
    Blanco: el juego le da el color de cada árbol (amarillo, rosado, celeste, verde)."""
    B, root = _begin("arbol-vida")
    metal = L.mat("arbol-metal", "#ffffff", 0.35)
    bulbs = L.mat("arbol-light", "#fff6c2", 0.3, emissive=True)
    parts = [vtube([Vector((0, 0, 0)), Vector((0, 6, 0)), Vector((0, 12.4, 0))], [0.32, 0.24, 0.16], seg=8),
             prism(0.7, 0.4, 0.0, seg=10)]
    lights = []
    for i in range(7):
        a = i / 7 * 2 * math.pi
        h = 6 + (i % 3) * 2.4
        path = []
        for t in range(13):
            u = t / 12
            r = 0.25 + u * 3.6
            path.append(Vector((math.cos(a + u * 2.8) * r * 0.9, h + u * 4.6 - u * u * 2.7, math.sin(a + u * 2.8) * r * 0.9)))
        # Rizo final hacia adentro, como las volutas reales.
        end = path[-1]
        for t in range(1, 6):
            v = t / 5
            path.append(end + Vector((math.cos(a + 2.8 + 2.4 + v * 4.2) * 0.6 * (1 - v * .5), -0.25 * v, math.sin(a + 2.8 + 2.4 + v * 4.2) * 0.6 * (1 - v * .5))) - Vector((math.cos(a + 5.2) * .6, 0, math.sin(a + 5.2) * .6)))
        parts.append(vtube(path, [0.14] * len(path), seg=6))
        for t in (3, 6, 9, 12, 16):
            p = path[min(t, len(path) - 1)]
            lights.append(blob(0.2, (p.x, p.y, p.z), subdiv=1, amp=0.0))
    ring = []
    for k in range(25):
        a = k / 24 * 2 * math.pi
        ring.append(Vector((2.1 * math.cos(a), 12.6, 2.1 * math.sin(a))))
    parts.append(vtube(ring, [0.14] * len(ring), seg=6, cap_end=False))
    for k in range(12):
        a = k / 12 * 2 * math.pi
        lights.append(blob(0.18, (2.1 * math.cos(a), 12.85, 2.1 * math.sin(a)), subdiv=1, amp=0.0))
    _part(B, root, "arbol-metal", parts, metal, 50)
    _part(B, root, "arbol-light", lights, bulbs, 60)
    return _finish(B, root, 0.35, 1.5)


def lona(seed=81):
    """Lona de chinamo: toldo con caída, borde con flecos ondulados y amarres. Blanca: el juego le da su color."""
    B, root = _begin("lona")
    m = L.mat("lona-tinted", "#ffffff", 0.8, double=True)
    bm = bmesh.new()
    nx, nz = 10, 6
    w, d = 6.4, 4.4
    grid = []
    for j in range(nz + 1):
        row = []
        for i in range(nx + 1):
            x = -w / 2 + w * i / nx
            z = -d / 2 + 0.2 + d * j / nz
            sag = -0.28 * math.sin(math.pi * i / nx) * math.sin(math.pi * j / nz)
            y = 3.95 - 0.75 * (j / nz) + sag  # cae hacia el frente (+z)
            row.append(gv(bm, Vector((x, y, z))))
        grid.append(row)
    for j in range(nz):
        for i in range(nx):
            bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
    # Faldón del frente con picos.
    front = grid[-1]
    prev = None
    for i in range(nx + 1):
        a = front[i].co.copy()
        low = gv(bm, Vector((-a.x, a.z - (0.45 if i % 2 == 0 else 0.25), -a.y)))
        if prev is not None:
            bm.faces.new((front[i - 1], front[i], low, prev))
        prev = low
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    _part(B, root, "lona-tinted", bm, m, 60)
    return _finish(B, root, 0.45, 1.5)


def chinamo(seed=91):
    """Chinamo del Oriental: mesa de tablas con patas, mercadería apilada (frutas, cajas, bolsas), postes y
    racimos colgando. Frente hacia +z (la calle). La lona va aparte (lona)."""
    rnd = random.Random(seed)
    B, root = _begin("chinamo")
    wood = L.mat("chinamo-wood", "#8a6a45", 0.85)
    wood2 = L.mat("chinamo-wood-dark", "#6b5236", 0.9)
    crate = L.mat("chinamo-crate", "#c9a46a", 0.85)
    goods = {c: L.mat("goods-" + c[1:], c, 0.6) for c in ("#f2c14e", "#d9473b", "#7cc36b", "#f39c4a", "#8e5a3c", "#fff2d6")}
    _part(B, root, "chinamo-wood", [gbox(5.8, 0.18, 2.1, 0, 0.92, 0.6), gbox(5.8, 0.9, 0.08, 0, 0.45, 1.62)] +
          [gbox(0.12, 0.85, 0.12, x, 0.43, z) for x in (-2.7, 2.7) for z in (-0.35, 1.55)], wood, 20)
    poles = [vtube([Vector((x, 0, z)), Vector((x, 3.9 - (0.7 if z > 1 else 0), z))], [0.07, 0.06], seg=6)
             for x in (-2.9, 2.9) for z in (-1.9, 1.9)]
    _part(B, root, "chinamo-wood-dark", poles + [gbox(5.6, 1.4, 0.06, 0, 1.7, -1.9)], wood2, 20)
    crates, piles = [], {c: [] for c in goods}
    cols = list(goods)
    for i in range(5):
        x = -2.3 + i * 1.15
        crates.append(gbox(0.95, 0.32, 1.2, x, 1.17, 0.7))
        c = cols[(i * 2 + 1) % 4]
        # Montón de fruta: un solo bulto con ruido fuerte (se lee como frutas sueltas a la distancia del juego).
        piles[c].append(blob(0.42, (x, 1.38, 0.7), (1.05, 0.5, 1.35), subdiv=2, amp=0.3, freq=3.5, seed=i + rnd.random()))
    # Sacos en el suelo y racimos de guineo colgando del travesaño.
    for i, x in enumerate((-2.0, -1.2, 1.6)):
        piles["#fff2d6"].append(blob(0.42, (x, 0.38, 1.95), (1, 1.1, 0.85), subdiv=1, amp=0.08, seed=i))
    for x in (-1.6, 0.3, 2.0):
        piles["#f2c14e"].append(blob(0.3, (x, 2.6, 1.35), (0.8, 1.4, 0.8), subdiv=1, amp=0.18, seed=x))
    piles["#8e5a3c"].append(gbox(0.6, 0.6, 0.5, 2.3, 0.3, 2.2))
    _part(B, root, "chinamo-crate", crates + [gbox(0.6, 0.6, 0.5, -2.5, 0.3, 2.3)], crate, 20)
    for c, bms in piles.items():
        if bms:
            _part(B, root, goods[c].name, bms, goods[c], 50)
    return _finish(B, root, 0.5, 1.4)


# --------------------------------------------------------------------------- Managua

def catedral():
    """Antigua Catedral de Managua: fachada neoclásica con columnas y frontón, dos torres con campanario y
    cúpula pequeña (reloj en la derecha), nave y cúpula detrás. Frente hacia +z; el origen es el centro de la base
    de la fachada."""
    B, root = _begin("catedral")
    stone = L.mat("cat-stone", "#d6ccb6", 0.85)
    trim = L.mat("cat-trim", "#ebe4d2", 0.75)
    dark = L.mat("cat-dark", "#3f474f", 0.9)
    dome = L.mat("cat-dome", "#a39a86", 0.8)
    clock = L.mat("cat-clock", "#f4efe2", 0.5)
    z0 = 0.0  # plano de la fachada
    body = [gbox(17, 19, 2.4, 0, 9.5, z0 - 1.2), gbox(20, 15, 30, 0, 7.5, z0 - 17)]
    # Techo a dos aguas de la nave.
    bm = bmesh.new()
    ridge = [Vector((-10.3, 15, z0 - 2.4)), Vector((10.3, 15, z0 - 2.4)), Vector((0, 19.5, z0 - 2.4)),
             Vector((-10.3, 15, z0 - 32)), Vector((10.3, 15, z0 - 32)), Vector((0, 19.5, z0 - 32))]
    v = [gv(bm, p) for p in ridge]
    bm.faces.new((v[0], v[1], v[2]))
    bm.faces.new((v[5], v[4], v[3]))
    bm.faces.new((v[1], v[4], v[5], v[2]))
    bm.faces.new((v[0], v[2], v[5], v[3]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    body.append(bm)
    towers, trims, darks, domes = [], [], [], []
    for s in (-1, 1):
        x = s * 10.2
        towers += [gbox(6.4, 22, 6.4, x, 11, z0 - 2.0), gbox(5.0, 7.0, 5.0, x, 25.5, z0 - 2.0)]
        trims += [gbox(7.0, 0.7, 7.0, x, 22.2, z0 - 2.0), gbox(5.6, 0.6, 5.6, x, 29.2, z0 - 2.0),
                  gbox(6.8, 0.6, 6.8, x, 0.3, z0 - 2.0)]
        domes += [prism(2.2, 1.6, 29.5, seg=8, center=(x, z0 - 2.0)),
                  lathe([(2.2, 31.1), (2.1, 31.9), (1.6, 33.0), (0.8, 33.8), (0.25, 34.2), (0.0, 34.3)], seg=12,
                        y_axis=(x, z0 - 2.0))]
        trims += [gbox(0.18, 1.8, 0.18, x, 35.1, z0 - 2.0), gbox(0.9, 0.18, 0.18, x, 35.3, z0 - 2.0)]
        # Vanos del campanario (cuatro caras) y ventanas de la torre.
        for (fx, fz) in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            darks.append(gbox(1.6 if fz else 0.12, 3.6, 0.12 if fz else 1.6, x + fx * 2.52, 25.6, z0 - 2.0 + fz * 2.52))
        for j in range(3):
            darks.append(gbox(1.3, 2.6, 0.12, x, 7 + j * 5.2, z0 + 1.25))
    # Columnas, entablamento, frontón y puertas.
    for i in range(6):
        x = -6.25 + i * 2.5
        trims.append(prism(0.55, 11, 0.6, seg=10, center=(x, z0 + 0.8)))
        trims.append(gbox(1.4, 0.6, 1.4, x, 0.3, z0 + 0.8))
    trims.append(gbox(17.6, 1.2, 2.2, 0, 12.2, z0 + 0.3))
    bm = bmesh.new()
    pts = [Vector((-8.8, 12.8, z0 + 1.2)), Vector((8.8, 12.8, z0 + 1.2)), Vector((0, 17.0, z0 + 1.2)),
           Vector((-8.8, 12.8, z0 - 0.6)), Vector((8.8, 12.8, z0 - 0.6)), Vector((0, 17.0, z0 - 0.6))]
    v = [gv(bm, p) for p in pts]
    bm.faces.new((v[0], v[1], v[2]))
    bm.faces.new((v[5], v[4], v[3]))
    bm.faces.new((v[1], v[4], v[5], v[2]))
    bm.faces.new((v[0], v[2], v[5], v[3]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    trims.append(bm)
    darks += [gbox(2.4, 5.0, 0.12, 0, 2.5, z0 + 0.05), gbox(1.7, 3.6, 0.12, -4.4, 1.8, z0 + 0.05),
              gbox(1.7, 3.6, 0.12, 4.4, 1.8, z0 + 0.05),
              L.cylinder(1.1, 0.12, "Y", seg=14, center=G(0, 14.6, z0 + 1.25))]  # rosetón
    clocks = [L.cylinder(1.3, 0.12, "Y", seg=16, center=G(10.2, 19.5, z0 + 1.28))]
    darks += [L.bar(G(10.2, 19.5, z0 + 1.36), G(10.2, 20.5, z0 + 1.36), 0.12, 0.05),
              L.bar(G(10.2, 19.5, z0 + 1.36), G(10.85, 19.5, z0 + 1.36), 0.12, 0.05)]
    # Cúpula sobre el crucero.
    domes += [prism(5.6, 4, 15, seg=16, center=(0, z0 - 22)),
              lathe([(5.9, 19), (5.7, 20.6), (4.9, 22.6), (3.4, 24.2), (1.2, 25.2), (0.0, 25.4)], seg=16, y_axis=(0, z0 - 22)),
              prism(0.9, 1.6, 25.2, seg=8, center=(0, z0 - 22))]
    _part(B, root, "cat-stone", body + towers, stone, 20)
    _part(B, root, "cat-trim", trims, trim, 30)
    _part(B, root, "cat-dark", darks, dark, 20)
    _part(B, root, "cat-dome", domes, dome, 40)
    _part(B, root, "cat-clock", clocks, clock, 20)
    return _finish(B, root, 0.55, 6.0, 24)


# --------------------------------------------------------------------------- Masaya

def volcano(seed=101):
    """Volcán Masaya: cono ancho con cárcavas y coladas, borde irregular y cráter Santiago (el juego pone la lava
    a y = 30). Radio de la base 124 m: la pista pasa por fuera (r > 137). Lleva UV para la textura de roca."""
    rnd = random.Random(seed)
    B, root = _begin("volcano")
    m = L.mat("tex-rock-volcano", "#8a7f70", 0.95)
    rocks_m = L.mat("volcano-rocks", "#5f6a60", 0.95)
    seg = 112
    prof = [(124, -2.5), (118, 1.5), (110, 6), (101, 12), (93, 19), (88.5, 25), (86.5, 29.5), (85, 32.4), (83.2, 33.4),
            (80.5, 32.6), (74, 31.0), (64, 29.9), (54, 29.6), (30, 29.5), (0.1, 29.5)]
    bm = bmesh.new()
    rings = []
    for j, (r0, y0) in enumerate(prof):
        ring = []
        for k in range(seg):
            a = 2 * math.pi * k / seg
            outer = j < 8
            gully = 0.02 * math.sin(a * 19 + 1.3) + 0.015 * math.sin(a * 37) if outer and 0 < j < 7 else 0
            nz = noise.noise(Vector((math.cos(a) * 3, math.sin(a) * 3, j * 0.35 + seed)))
            r = r0 * (1 + gully + 0.025 * nz * (1 if 0 < j < len(prof) - 2 else 0))
            y = y0 + (1.3 * nz if 5 <= j <= 9 else 0.4 * nz if 0 < j < 5 else 0)
            ring.append(gv(bm, Vector((r * math.cos(a), y, r * math.sin(a)))))
        rings.append(ring)
    for a_, b_ in zip(rings, rings[1:]):
        for k in range(seg):
            bm.faces.new((a_[k], a_[(k + 1) % seg], b_[(k + 1) % seg], b_[k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    planar_uv(bm, 9.0)
    _part(B, root, "tex-rock-volcano", bm, m, 50)
    # Peñascos sobre el borde del cráter.
    rocks = []
    for i in range(22):
        a = i / 22 * 2 * math.pi + rnd.uniform(-.1, .1)
        r = rnd.uniform(80, 86)
        rocks.append(blob(rnd.uniform(3.0, 6.0), (r * math.cos(a), 32.0, r * math.sin(a)), (1.2, .55, 1), subdiv=2, amp=0.35, seed=i, flat_bottom=0.3))
    _part(B, root, "volcano-rocks", rocks, rocks_m, 30)
    out = _finish(B, root, 0.5, 14.0, 16)
    # Coladas viejas: franjas más oscuras bajando por el cono (se multiplican con la oclusión).
    o = bpy.data.objects["tex-rock-volcano"]
    data = o.data.color_attributes["AO"].data
    for loop in o.data.loops:
        co = o.data.vertices[loop.vertex_index].co
        a = math.atan2(co.y, co.x)
        flow = max(0.0, math.sin(a * 5 + 0.7)) ** 6 * (1 if co.z < 28 else 0)
        c = data[loop.index].color
        f = 1 - 0.35 * flow
        data[loop.index].color = (c[0] * f, c[1] * f, c[2] * f, 1)
    return out


VEGETATION = {"palm": palm, "mango": mango, "malinche": malinche, "ceiba": ceiba, "pine": pine, "bush": bush,
              "rock": rock}
LANDMARKS = {"cristo": cristo, "catedral": catedral, "arbol-vida": arbol_vida, "chinamo": chinamo, "lona": lona,
             "volcano": volcano}
FILES = {"vegetation": list(VEGETATION), "cristo": ["cristo"], "managua": ["catedral", "arbol-vida"],
         "oriental": ["chinamo", "lona"], "masaya": ["volcano"]}


def build(kind):
    return (VEGETATION.get(kind) or LANDMARKS[kind])()


def build_all():
    return {k: build(k) for k in [*VEGETATION, *LANDMARKS]}
