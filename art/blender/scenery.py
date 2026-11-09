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


# --------------------------------------------------------------------------- utilidades de arquitectura

def rot_y(bm, angle, center=(0, 0, 0)):
    """Gira como rotation.y del juego (Babylon, mano izquierda) alrededor de un punto del juego."""
    bmesh.ops.rotate(bm, verts=bm.verts, cent=G(*center), matrix=Matrix.Rotation(-angle, 3, "Z"))
    return bm


def tile_roof(w, z_front, z_back, y_eave, y_ridge, z_ridge=0.0, period=0.36, amp=0.06, gables=True):
    """Techo de teja de barro a dos aguas (cumbrera a lo largo de x), con las ondas de las tejas."""
    bm = bmesh.new()
    n = max(2, int(round(w / (period / 2))))
    for z_e in (z_front, z_back):
        rows = []
        for zz, yy in ((z_e, y_eave), (z_ridge, y_ridge)):
            rows.append([gv(bm, Vector((-w / 2 + w * i / n, yy + amp * (1 if i % 2 else -1), zz))) for i in range(n + 1)])
        a, b = rows
        for i in range(n):
            bm.faces.new((a[i], a[i + 1], b[i + 1], b[i]))
    if gables:
        for sx in (-1, 1):
            vs = [gv(bm, Vector((sx * w / 2, y, z))) for y, z in ((y_eave, z_front), (y_eave, z_back), (y_ridge, z_ridge))]
            bm.faces.new(vs)
    return bm


def arch_window(w, h, x, y, z, seg=8, depth=0.08):
    """Ventana o puerta con arco de medio punto, plana hacia +z (y = base)."""
    bm = gbox(w, h - w / 2, depth, x, y + (h - w / 2) / 2, z)
    half = L.cylinder(w / 2, depth, "Y", seg=seg * 2, center=G(x, y + h - w / 2, z))
    bmesh.ops.delete(half, geom=[v for v in half.verts if v.co.z < y + h - w / 2 - 1e-4], context="VERTS")
    return L.merge(bm, half)


SCHOOL = dict(wall="#e8d6a8", cream="#efe2bf", trim="#2f6b4f", gate="#2f7a4e", roof="#b4644c", glass="#3e7f8f",
              wood="#8a5a3a", concrete="#cfc8b6", base="#a99a7c")


def _school_mats():
    c = SCHOOL
    return dict(wall=L.mat("ls-wall", c["wall"], 0.9), cream=L.mat("ls-cream", c["cream"], 0.8),
                trim=L.mat("ls-trim", c["trim"], 0.6), roof=L.mat("ls-roof", c["roof"], 0.85, double=True),
                glass=L.mat("ls-glass", c["glass"], 0.25), wood=L.mat("ls-wood", c["wood"], 0.8),
                concrete=L.mat("ls-concrete", c["concrete"], 0.95), base=L.mat("ls-base", c["base"], 0.95),
                louver=L.mat("ls-louver", "#a8d0d6", 0.3))


def _facade(parts, top=4.2):
    """Ventanas con persianas de vidrio, puerta de madera con tablero y marco verde: tres vanos de 4,2 m."""
    for i, x in enumerate((-4.2, 0.0, 4.2)):
        if i == 1:
            parts["wood"] += [gbox(1.4, 2.6, 0.1, x, 1.3, 8.03)]
            parts["base"] += [gbox(0.5, 0.9, 0.04, x + dx, y, 8.09) for dx in (-0.33, 0.33) for y in (0.7, 1.85)]
            parts["trim"] += [gbox(1.8, 0.2, 0.12, x, 2.72, 8.06), gbox(0.15, 2.7, 0.12, x - 0.85, 1.35, 8.06),
                              gbox(0.15, 2.7, 0.12, x + 0.85, 1.35, 8.06)]
        else:
            parts["glass"].append(gbox(2.4, 1.6, 0.06, x, 2.2, 8.02))
            parts["louver"] += [gbox(2.3, 0.07, 0.05, x, 1.6 + k * 0.3, 8.07) for k in range(5)]
            parts["cream"] += [gbox(2.7, 0.14, 0.2, x, 1.33, 8.1), gbox(2.7, 0.14, 0.12, x, 3.07, 8.06),
                               gbox(0.14, 1.8, 0.12, x - 1.28, 2.2, 8.06), gbox(0.14, 1.8, 0.12, x + 1.28, 2.2, 8.06),
                               gbox(0.08, 1.6, 0.06, x, 2.2, 8.09)]


def _begin_parts(kind):
    B, root = _begin(kind)
    return B, root, _school_mats(), {k: [] for k in ("wall", "cream", "trim", "roof", "glass", "wood", "concrete", "base", "louver")}


def _flush(B, root, M, parts, smooth=20):
    for k, bms in parts.items():
        if bms:
            _part(B, root, M[k].name, bms, M[k], smooth)


# --------------------------------------------------------------------------- La Salle

def aula_pb():
    """Planta baja de un módulo de aulas (3 vanos, 12,6 × 16 m): pared, ventanas, puerta, corredor con columnas y losa.
    El juego repite el módulo a lo largo del bloque y lo estira a su largo (block() en lasalle.ts)."""
    B, root, M, P = _begin_parts("aula-pb")
    P["wall"].append(gbox(12.6, 4.2, 16, 0, 2.1, 0))
    P["base"].append(gbox(12.6, 0.7, 0.16, 0, 0.35, 8.06))
    _facade(P)
    for x in (-6.05, -2.1, 2.1, 6.05):
        P["cream"] += [gbox(0.5, 3.6, 0.5, x, 2.05, 10.1), gbox(0.72, 0.22, 0.72, x, 3.95, 10.1), gbox(0.72, 0.25, 0.72, x, 0.13, 10.1)]
    P["concrete"] += [gbox(12.6, 0.25, 2.6, 0, 4.32, 9.25), gbox(12.6, 0.14, 2.5, 0, 0.07, 9.2)]
    P["trim"].append(gbox(12.6, 0.32, 0.1, 0, 4.3, 10.58))
    _flush(B, root, M, P)
    return _finish(B, root, 0.5, 2.5, 16)


def aula_pa():
    """Piso alto del módulo de aulas: pared, ventanas, puerta, balcón con baranda verde y postes hasta el alero."""
    B, root, M, P = _begin_parts("aula-pa")
    P["wall"].append(gbox(12.6, 4.2, 16, 0, 2.1, 0))
    _facade(P)
    P["trim"] += [gbox(12.6, 0.1, 0.12, 0, 1.1, 10.3), gbox(12.6, 0.08, 0.1, 0, 0.35, 10.3)]
    P["trim"] += [gbox(0.06, 0.8, 0.06, -6.15 + i * 0.6, 0.72, 10.3) for i in range(21)]
    for x in (-6.05, -2.1, 2.1, 6.05):
        P["cream"].append(gbox(0.32, 4.0, 0.32, x, 2.2, 10.3))
    P["concrete"].append(gbox(12.6, 0.25, 2.6, 0, 4.32, 9.25))
    P["trim"].append(gbox(12.6, 0.32, 0.1, 0, 4.3, 10.58))
    _flush(B, root, M, P)
    return _finish(B, root, 0.5, 2.5, 16)


def aula_techo():
    """Techo de teja del módulo: alero largo al frente (cubre el corredor), cumbrera, fascia verde."""
    B, root, M, P = _begin_parts("aula-techo")
    P["roof"].append(tile_roof(12.6, 10.9, -8.8, 0.5, 3.0, z_ridge=1.0))
    P["trim"] += [gbox(12.6, 0.28, 0.1, 0, 0.45, 10.95), gbox(12.6, 0.28, 0.1, 0, 0.45, -8.85)]
    P["cream"].append(gbox(12.6, 0.42, 16.2, 0, 0.21, 0))
    P["roof"].append(gbox(12.6, 0.22, 0.4, 0, 3.08, 1.0))
    _flush(B, root, M, P)
    return _finish(B, root, 0.45, 2.5, 16)


def capilla():
    """Capilla del colegio: nave con techo de teja, contrafuertes, ventanas de arco con vitral, torre del campanario
    al frente (+z) con techo piramidal y cruz, puerta de arco y gradas."""
    B, root, M, P = _begin_parts("capilla")
    stone = L.mat("ls-chapel", "#f4ead0", 0.85)
    stained = {c: L.mat("ls-vitral-" + c[1:], c, 0.2, emissive=True) for c in ("#3f6fd0", "#d0453f", "#e8b83a")}
    chapel = [gbox(18, 10, 26, 0, 5, 0), gbox(6, 18, 6, 0, 9, 14)]
    for sx in (-1, 1):
        for z in (-10, -4, 2, 8):
            chapel.append(gbox(0.9, 6, 1.2, sx * 9.35, 3, z))
    roof = tile_roof(27, 10.2, -10.2, 9.8, 14.6, period=0.42)
    rot_y(roof, math.pi / 2)
    P["roof"] += [roof, prism(4.4, 4.2, 18.2, seg=4, radius_top=0.05, center=(0, 14))]
    rot_y(P["roof"][-1], math.pi / 4, (0, 0, 14))
    P["cream"] += [gbox(6.8, 0.6, 6.8, 0, 18.1, 14), gbox(6.6, 0.4, 6.6, 0, 10.3, 14), gbox(18.6, 0.5, 26.6, 0, 0.25, 0),
                   gbox(0.45, 3.6, 0.45, 0, 23.9, 14), gbox(2.0, 0.45, 0.45, 0, 24.6, 14),
                   gbox(5.0, 0.3, 2.0, 0, 0.15, 18.0), gbox(4.2, 0.3, 1.2, 0, 0.45, 17.6)]
    P["wood"].append(arch_window(2.6, 4.4, 0, 0.6, 17.05, depth=0.12))
    P["trim"].append(arch_window(3.2, 4.9, 0, 0.6, 17.0, depth=0.08))
    P["glass"] += [arch_window(1.0, 2.6, 0, 13.0, 17.03) for _ in (0,)]
    for fx, fz in ((0, 1), (0, -1), (1, 0), (-1, 0)):  # vanos del campanario
        b = arch_window(1.6, 3.0, 0, 13.6, 0, depth=0.12)
        rot_y(b, {(0, 1): 0, (0, -1): math.pi, (1, 0): math.pi / 2, (-1, 0): -math.pi / 2}[(fx, fz)])
        bmesh.ops.translate(b, vec=G(fx * 3.02, 0, 14 + fz * 3.02), verts=b.verts)
        P["glass"].append(b)
    vitrals = {c: [] for c in stained}
    cols = list(stained)
    for i, z in enumerate((-7, -1, 5)):
        for sx in (-1, 1):
            w = arch_window(1.4, 3.6, 0, 3.6, 0, depth=0.1)
            rot_y(w, sx * math.pi / 2)
            bmesh.ops.translate(w, vec=G(sx * 9.03, 0, z), verts=w.verts)
            vitrals[cols[(i + (sx > 0)) % 3]].append(w)
    _part(B, root, "ls-chapel", chapel, stone, 20)
    for c, bms in vitrals.items():
        _part(B, root, stained[c].name, bms, stained[c], 20)
    _flush(B, root, M, P)
    return _finish(B, root, 0.5, 4.0, 16)


def porton_lasalle():
    """Entrada del colegio en la largada: pilares con capitel, arco con cornisa verde y estrella, portones verdes de
    barrotes con puntas abiertos contra el muro, muros con pilastras y la portería. Medidas para la pista de 15 m."""
    B, root, M, P = _begin_parts("porton-lasalle")
    half = 10.7
    star_m = L.mat("ls-star", "#f2d14c", 0.4)
    gate_m = L.mat("ls-gate", SCHOOL["gate"], 0.5)
    gates = []
    for s in (-1, 1):
        x = s * half
        P["cream"] += [gbox(1.6, 6.4, 1.6, x, 3.4, 0), gbox(1.9, 0.5, 1.9, x, 0.25, 0)]
        P["trim"] += [gbox(2.1, 0.4, 2.1, x, 6.75, 0), gbox(1.7, 0.25, 1.7, x, 6.45, 0),
                      gbox(0.9, 3.2, 0.06, x, 3.4, 0.82), gbox(0.9, 3.2, 0.06, x, 3.4, -0.82)]
        # Portón de barrotes, abierto contra el muro.
        leaf = [gbox(6.0, 0.16, 0.12, 0, 0.35, 0), gbox(6.0, 0.16, 0.12, 0, 4.1, 0), gbox(6.0, 0.12, 0.1, 0, 2.2, 0)]
        for i in range(16):
            bx = -2.9 + i * 0.387
            leaf += [gbox(0.07, 4.3, 0.07, bx, 2.25, 0), prism(0.07, 0.3, 4.4, seg=4, radius_top=0.0, center=(bx, 0))]
        lb = L.merge(*leaf)
        rot_y(lb, s * 0.12)
        bmesh.ops.translate(lb, vec=G(s * (half + 3.6), 0, -0.9), verts=lb.verts)
        gates.append(lb)
        # Muros con pilastras y remate.
        P["cream"].append(gbox(32, 3, 0.8, s * (half + 17), 1.5, -0.2))
        P["trim"].append(gbox(32, 0.3, 1.0, s * (half + 17), 3.1, -0.2))
        for i in range(9):
            P["cream"].append(gbox(0.7, 3.3, 1.1, s * (half + 1.5 + i * 3.9), 1.65, -0.2))
    P["cream"] += [gbox(half * 2 + 2.4, 1.9, 1.4, 0, 7.8, 0)]
    P["trim"] += [gbox(half * 2 + 2.4, 0.25, 1.5, 0, 6.8, 0), gbox(half * 2 + 3.0, 0.35, 1.7, 0, 8.9, 0),
                  gbox(6.0, 0.9, 1.2, 0, 9.5, 0)]
    # Estrella lasallista sobre el arco.
    bm = bmesh.new()
    pts = []
    for k in range(10):
        a = math.pi / 2 + k * math.pi / 5
        r = 1.0 if k % 2 == 0 else 0.42
        pts.append(Vector((r * math.cos(a), 11.1 + r * math.sin(a), 0)))
    face = bm.faces.new([gv(bm, p + Vector((0, 0, 0.12))) for p in pts])
    ext = bmesh.ops.extrude_face_region(bm, geom=[face])
    bmesh.ops.translate(bm, vec=(0, 0.24, 0), verts=[v for v in ext["geom"] if isinstance(v, bmesh.types.BMVert)])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    # Portería.
    gx, gz = -(half + 7), -6
    P["cream"] += [gbox(4, 3.2, 4, gx, 1.6, gz)]
    booth_roof = tile_roof(5.2, gz + 2.7, gz - 2.7, 3.2, 4.4, z_ridge=gz, period=0.4)
    bmesh.ops.translate(booth_roof, vec=(-gx, 0, 0), verts=booth_roof.verts)  # G(): x del juego = -x de Blender
    P["roof"].append(booth_roof)
    P["glass"] += [gbox(2.2, 1.0, 0.08, gx, 2.0, gz + 2.03)]
    P["wood"].append(gbox(0.08, 2.2, 1.0, gx + 2.03, 1.1, gz))
    _part(B, root, "ls-gate", gates, gate_m, 20)
    _part(B, root, "ls-star", bm, star_m, 20)
    _flush(B, root, M, P)
    return _finish(B, root, 0.5, 3.0, 16)


def bus_escolar():
    """Bus escolar amarillo (frente hacia +z, 11 m): carrocería con techo curvo, ventanas con parales, franjas
    negras, cofre con parrilla, defensas, llantas, luces y espejos."""
    B, root = _begin("bus-escolar")
    yellow = L.mat("bus-yellow", "#f2b81f", 0.45)
    black = L.mat("bus-black", "#1b1b1b", 0.7)
    glass = L.mat("bus-glass", "#3e6f80", 0.15)
    chrome = L.mat("bus-chrome", "#c9ced2", 0.3)
    red = L.mat("bus-red", "#e0352b", 0.4, emissive=True)
    white = L.mat("bus-light", "#fff4cc", 0.3, emissive=True)
    body = [gbox(2.9, 2.3, 9.4, 0, 2.1, -0.7)]
    top = L.cylinder(1.45, 9.4, "Y", seg=16, center=G(0, 3.25, -0.7))
    bmesh.ops.scale(top, vec=(1, 1, 0.32), space=Matrix.Translation(-Vector(G(0, 3.25, -0.7))), verts=top.verts)
    bmesh.ops.delete(top, geom=[v for v in top.verts if v.co.z < 3.25 - 1e-4], context="VERTS")
    body += [top, gbox(2.6, 1.15, 1.7, 0, 1.45, 4.85), gbox(2.4, 0.3, 1.5, 0, 2.1, 4.75)]
    wins, posts = [], []
    for sx in (-1, 1):
        for i in range(8):
            z = -4.6 + i * 1.08
            wins.append(gbox(0.06, 0.85, 0.92, sx * 1.46, 2.85, z))
    wins += [gbox(2.5, 1.0, 0.06, 0, 2.75, 4.02), gbox(0.06, 1.9, 0.75, 1.46, 2.25, 3.4)]
    blk = [gbox(2.96, 0.12, 9.4, 0, 1.55, -0.7), gbox(2.96, 0.12, 9.4, 0, 2.3, -0.7),
           gbox(3.0, 0.35, 0.3, 0, 0.75, 5.75), gbox(3.0, 0.35, 0.3, 0, 0.75, -5.45), gbox(1.8, 0.7, 0.06, 0, 1.4, 5.71)]
    wheels, hubs = [], []
    for sx in (-1, 1):
        for z in (-3.6, 4.2):
            wheels.append(L.cylinder(0.55, 0.42, "X", seg=14, center=G(sx * 1.3, 0.55, z)))
            hubs.append(L.cylinder(0.26, 0.44, "X", seg=10, center=G(sx * 1.3, 0.55, z)))
        posts.append(L.bar(G(sx * 1.5, 2.6, 3.9), G(sx * 1.85, 2.9, 4.1), 0.06))
        hubs.append(gbox(0.12, 0.3, 0.22, sx * 1.9, 2.95, 4.15))
    lights_r = [gbox(0.25, 0.25, 0.06, sx * 1.1, y, -5.42) for sx in (-1, 1) for y in (1.4, 3.3)]
    lights_w = [L.cylinder(0.16, 0.06, "Y", seg=10, center=G(sx * 0.95, 1.6, 5.72)) for sx in (-1, 1)]
    lights_r += [gbox(0.3, 0.18, 0.06, sx * 0.9, 3.45, 4.07) for sx in (-1, 1)]
    _part(B, root, "bus-yellow", body, yellow, 35)
    _part(B, root, "bus-glass", wins, glass, 20)
    _part(B, root, "bus-black", blk + wheels, black, 35)
    _part(B, root, "bus-chrome", hubs + posts, chrome, 35)
    _part(B, root, "bus-red", lights_r, red, 20)
    _part(B, root, "bus-light", lights_w, white, 20)
    return _finish(B, root, 0.5, 1.6, 16)


# --------------------------------------------------------------------------- Hipa Hipa

NEON = ("#ff5fb0", "#45e0ff", "#ffd33d", "#8bff6a", "#b77bff")


def barra():
    """Barra de la disco (sin los neones de color, que pone el juego y laten con la música): piso, mostrador con
    paneles, pared del fondo con tres repisas de botellas encendidas, techo, columnas, siete bancos y el bartender."""
    rnd = random.Random(7)
    B, root = _begin("barra")
    dark = L.mat("club-dark", "#1a1630", 0.6)
    purple = L.mat("club-purple", "#3a2a4a", 0.5)
    floor = L.mat("club-floor", "#2a2440", 0.35)
    shelf = L.mat("club-shelf", "#5a4a6a", 0.5)
    metal = L.mat("club-metal", "#9aa0b4", 0.3)
    skin = L.mat("club-skin", "#c48a64", 0.6)
    bowtie = L.mat("club-bowtie", "#e53b35", 0.5)
    neon = {c: L.mat("club-glow-" + c[1:], c, 0.2, emissive=True) for c in NEON}
    _part(B, root, "club-floor", gbox(20, 0.12, 12, 0, 0.06, 1), floor, 20)
    _part(B, root, "club-purple", [gbox(16, 1.2, 1.3, 0, 0.6, 2.2)] + [gbox(0.12, 1.0, 0.06, -7.5 + i * 1.5, 0.6, 2.88) for i in range(11)] +
          [prism(0.18, 5.4, 0, seg=8, center=(sx * 9.4, 4.2)) for sx in (-1, 1)], purple, 20)
    _part(B, root, "club-dark", [gbox(17, 5.2, 0.6, 0, 2.6, -1.6), gbox(20, 0.3, 7.5, 0, 5.4, 0.8), gbox(1.1, 1.5, 0.75, -2, 1.35, 0.8)], dark, 20)
    _part(B, root, "club-shelf", [gbox(15, 0.1, 0.5, 0, 1.6 + r * 1.1, -1.15) for r in range(3)], shelf, 20)
    bottles = {c: [] for c in NEON}
    for r in range(3):
        for i in range(14):
            c = NEON[rnd.randrange(len(NEON))]
            x, y = -6.5 + i, 1.65 + r * 1.1
            bottles[c] += [prism(0.14, 0.5, y, seg=6, center=(x, -1.15)), prism(0.05, 0.26, y + 0.5, seg=5, center=(x, -1.15))]
    for c, bms in bottles.items():
        _part(B, root, neon[c].name, bms, neon[c], 30)
    stools = {c: [] for c in NEON}
    legs = []
    for i in range(7):
        sx = -6 + i * 2
        legs += [prism(0.06, 0.9, 0, seg=6, center=(sx, 3.6)), prism(0.3, 0.05, 0, seg=10, center=(sx, 3.6)),
                 vtube([Vector((sx + 0.25 * math.cos(a), 0.4, 3.6 + 0.25 * math.sin(a))) for a in [k / 10 * 2 * math.pi for k in range(11)]], [0.025] * 11, seg=4, cap_end=False)]
        stools[NEON[i % len(NEON)]].append(prism(0.38, 0.14, 0.9, seg=12, center=(sx, 3.6)))
    _part(B, root, "club-metal", legs, metal, 30)
    for c, bms in stools.items():
        if bms:
            _part(B, root, neon[c].name + "-seat", bms, L.mat("club-seat-" + c[1:], c, 0.4), 30)
    _part(B, root, "club-skin", [blob(0.32, (-2, 2.45, 0.8), subdiv=2, amp=0.0), vtube([Vector((-2.45, 2.0, 0.8)), Vector((-2.55, 1.45, 1.2))], [0.1, 0.09], seg=6),
                                  vtube([Vector((-1.55, 2.0, 0.8)), Vector((-1.4, 1.5, 1.25))], [0.1, 0.09], seg=6)], skin, 40)
    _part(B, root, "club-bowtie", [gbox(0.42, 0.14, 0.08, -2, 2.08, 1.2)], bowtie, 20)
    return _finish(B, root, 0.45, 2.0, 16)


def palmera_tronco():
    """Tronco de la palmera gigante de la pista de baile (34 m): curva suave, anillos de cicatrices de hojas y base
    ensanchada. Cabe dentro de los aros de neón del juego (radio un 3 % menor que el del código)."""
    B, root = _begin("palmera-tronco")
    bark = L.mat("giant-bark", "#8a6a46", 0.85)
    pts, radii = [], []
    n = 70
    for i in range(n + 1):
        y = 34.6 * i / n
        seg = min(10, max(0.0, (y - 1.6 + 1.6) / 3.0))
        x = math.sin(seg * 0.3) * 0.25
        r_code = (3.8 - seg * 0.18) / 2 if y > 0.5 else 2.3
        pts.append(Vector((x, y, 0)))
        radii.append(r_code * 0.95 if y > 0.5 else r_code)
    def wob(i, k):
        y = 34.6 * i / n
        return 1.0 - 0.06 * (1 - abs(math.sin(math.pi * (y % 1.5) / 1.5))) + 0.015 * math.sin(k * 2.1 + i)
    _part(B, root, "giant-bark", vtube(pts, radii, seg=14, wobble=wob), bark, 60)
    return _finish(B, root, 0.4, 3.0, 16)


def palmera_copa(seed=5):
    """Copa de la palmera gigante: once hojas enormes con folíolos y seis cocos encendidos. El origen es el punto de la
    copa del juego (el nodo que se mece con la música)."""
    rnd = random.Random(seed)
    B, root = _begin("palmera-copa")
    leaf = L.mat("giant-leaf", "#3f9a4f", 0.6, double=True)
    leaf2 = L.mat("giant-leaf-light", "#5cbf5a", 0.6, double=True)
    nut = L.mat("giant-coconut", "#ffd33d", 0.3, emissive=True)
    top = Vector((0, 0.4, 0))
    fronds = {leaf: [], leaf2: []}
    for f in range(11):
        a = f / 11 * 2 * math.pi + rnd.uniform(-.1, .1)
        d = Vector((math.sin(a), 0, math.cos(a)))
        length, rise, droop = rnd.uniform(11.5, 13), rnd.uniform(2.0, 3.0), rnd.uniform(6.5, 8.5)
        side = d.cross(UP).normalized()
        bm = bmesh.new()
        at = lambda s: top + d * (length * s) + UP * (rise * s - droop * s * s)
        prev = None
        steps = 14
        for i in range(steps + 1):
            s = i / steps
            p = at(s)
            w = 0.28 * (1 - s) + 0.05
            pair = (gv(bm, p - side * w), gv(bm, p + side * w))
            if prev:
                bm.faces.new((prev[0], prev[1], pair[1], pair[0]))
            prev = pair
            if i < 1 or i == steps:
                continue
            t = (at(min(1, s + 0.04)) - at(max(0, s - 0.04))).normalized()
            sd = t.cross(UP).normalized()
            lf = 3.2 * (0.3 + 0.7 * math.sin(math.pi * min(1, s * 1.1)))
            for sg in (-1, 1):
                dirv = (sd * sg * 0.9 + t * 0.45 - UP * 0.35).normalized()
                tip, mid, ww = p + dirv * lf, p + dirv * lf * 0.5 - UP * lf * 0.12, 0.38
                b1, b2 = gv(bm, p - t * ww), gv(bm, p + t * ww)
                m1, m2 = gv(bm, mid - t * ww * 0.8), gv(bm, mid + t * ww * 0.8)
                tv = gv(bm, tip)
                bm.faces.new((b1, b2, m2, m1))
                bm.faces.new((m1, m2, tv))
        fronds[leaf2 if f % 2 else leaf].append(bm)
    for m, bms in fronds.items():
        _part(B, root, m.name, bms, m, None)
    nuts = [blob(0.6, (1.3 * math.sin(i / 6 * 2 * math.pi), -1.6, 1.3 * math.cos(i / 6 * 2 * math.pi)), subdiv=2, amp=0.03) for i in range(6)]
    _part(B, root, "giant-coconut", nuts, nut, 40)
    return _finish(B, root, 0.35, 3.0, 16)


# --------------------------------------------------------------------------- casas (teñidas por instancia)

def _window(parts, x, y, z, w=1.3, h=1.4, grille=False):
    """Ventana hacia +z: vidrio hundido, marco, alféizar y, si se pide, verja de hierro."""
    parts["glass"].append(gbox(w, h, 0.06, x, y, z + 0.02))
    parts["frame"] += [gbox(w + 0.24, 0.12, 0.12, x, y + h / 2 + 0.06, z + 0.06), gbox(w + 0.34, 0.12, 0.22, x, y - h / 2 - 0.06, z + 0.1),
                       gbox(0.12, h, 0.12, x - w / 2 - 0.06, y, z + 0.06), gbox(0.12, h, 0.12, x + w / 2 + 0.06, y, z + 0.06)]
    if grille:
        parts["iron"] += [gbox(0.05, h, 0.05, x - w / 2 + (i + 0.5) * w / 5, y, z + 0.16) for i in range(5)]
        parts["iron"].append(gbox(w, 0.05, 0.05, x, y, z + 0.16))


def casa_managua(floors, kind):
    """Casa de barrio de Managua (10 × 8 m, el juego la estira a su ancho): paredes blancas que el juego tiñe del color
    de cada casa, ventanas con marco, verjas abajo, puerta, cornisa y un aire acondicionado. Frente hacia +z."""
    B, root = _begin(kind)
    h = {1: 6.0, 2: 9.5, 3: 13.0}[floors]
    M = dict(wall=L.mat("casa-wall", "#ffffff", 0.9), glass=L.mat("casa-glass", "#2f5d6e", 0.25),
             frame=L.mat("casa-frame", "#f4f0e6", 0.7), iron=L.mat("casa-iron", "#2b2f33", 0.5),
             door=L.mat("casa-door", "#7a5234", 0.8), ac=L.mat("casa-ac", "#d9dde0", 0.5))
    P = {k: [] for k in M}
    P["wall"] += [gbox(10, h, 8, 0, h / 2, 0), gbox(10.2, 0.35, 8.2, 0, h - 0.4, 0), gbox(10.1, 0.5, 8.1, 0, 0.25, 0)]
    rows = int(h / 3.5 - 0.5) + 1
    for f in range(rows):
        y = 2 + f * 3.4
        if y > h - 1:
            continue
        for i, x in enumerate((-3.3, 0.0, 3.3)):
            if f == 0 and i == 1:
                P["door"].append(gbox(1.2, 2.3, 0.08, x, 1.15, 4.03))
                P["frame"].append(gbox(1.5, 0.15, 0.14, x, 2.38, 4.06))
                continue
            _window(P, x, y, 4.0, grille=f == 0)
    P["ac"] += [gbox(0.9, 0.55, 0.5, 3.3, 2 + 3.4 * min(1, rows - 1) - 1.1, 4.3)]
    for k, bms in P.items():
        if bms:
            _part(B, root, M[k].name, bms, M[k], 20)
    return _finish(B, root, 0.5, 2.0, 16)


def casa_techo():
    """Losa del techo de las casas de Managua con pretil; blanca, el juego la tiñe de teja o de lámina."""
    B, root = _begin("casa-techo")
    m = L.mat("casa-roof", "#ffffff", 0.85)
    parts = [gbox(10.6, 0.35, 8.6, 0, 0.17, 0)]
    for sx in (-1, 1):
        parts.append(gbox(0.25, 0.6, 8.6, sx * 5.17, 0.6, 0))
    for sz in (-1, 1):
        parts.append(gbox(10.6, 0.6, 0.25, 0, 0.6, sz * 4.17))
    parts.append(gbox(1.2, 1.0, 1.2, -3.2, 0.85, -2.0))  # tanque de agua
    _part(B, root, "casa-roof", parts, m, 20)
    return _finish(B, root, 0.5, 2.0, 16)


def casa_playa(floors, kind):
    """Casa de San Juan del Sur (8 × 7 m): paredes que el juego tiñe de pastel, ventanas con postigos, puerta.
    El techo de teja y el balcón son otra pieza (teja-playa), igual para las dos alturas."""
    B, root = _begin(kind)
    h = 4.5 if floors == 1 else 7.9
    M = dict(wall=L.mat("playa-wall", "#ffffff", 0.9), glass=L.mat("casa-glass", "#2f5d6e", 0.25),
             frame=L.mat("casa-frame", "#f4f0e6", 0.7), iron=L.mat("playa-shutter", "#2f8fa0", 0.6),
             door=L.mat("casa-door", "#7a5234", 0.8))
    P = {k: [] for k in M}
    P["wall"] += [gbox(8, h, 7, 0, h / 2, 0), gbox(8.1, 0.45, 7.1, 0, 0.22, 0)]
    P["door"].append(gbox(1.2, 2.3, 0.08, -2.2, 1.15, 3.53))
    for x in (0.4, 2.6):
        _window(P, x, 1.7, 3.5, 1.1, 1.3)
        P["iron"] += [gbox(0.55, 1.4, 0.06, x - 0.9, 1.7, 3.6), gbox(0.55, 1.4, 0.06, x + 0.9, 1.7, 3.6)]
    if floors == 2:
        for x in (-2.2, 0.4, 2.6):  # puertas al balcón
            P["glass"].append(gbox(1.0, 2.0, 0.06, x, h - 2.6 + 1.05, 3.52))
            P["frame"].append(gbox(1.2, 0.12, 0.12, x, h - 2.6 + 2.1, 3.56))
    for k, bms in P.items():
        if bms:
            _part(B, root, M[k].name, bms, M[k], 20)
    return _finish(B, root, 0.5, 2.0, 16)


def teja_playa():
    """Techo de teja a dos aguas de las casas de playa, con el balcón de madera y su baranda blanca 1,8 m más abajo
    (el juego lo pone a la altura de cada casa)."""
    B, root = _begin("teja-playa")
    roof = L.mat("playa-roof", "#a8553a", 0.85, double=True)
    wood = L.mat("playa-wood", "#8a5a3a", 0.8)
    white = L.mat("playa-rail", "#f4f0e4", 0.6)
    _part(B, root, "playa-roof", [tile_roof(9.0, 4.1, -4.1, 0.1, 1.9, period=0.38), gbox(8.2, 0.25, 7.2, 0, 0.1, 0)], roof, 30)
    _part(B, root, "playa-wood", [gbox(7.6, 0.18, 1.5, 0, -1.8, 4.2), gbox(7.8, 0.22, 0.1, 0, 0.05, 4.1)] +
          [gbox(0.14, 1.8, 0.14, x, -0.9, 4.85) for x in (-3.7, 3.7)], wood, 20)
    _part(B, root, "playa-rail", [gbox(7.5, 0.1, 0.1, 0, -0.85, 4.85)] + [gbox(0.07, 0.8, 0.07, -3.5 + i * 0.5, -1.3, 4.85) for i in range(15)],
          white, 20)
    return _finish(B, root, 0.5, 2.0, 16)


# --------------------------------------------------------------------------- Managua: Palacio y Concha

def palacio():
    """Palacio Nacional de la Cultura: cuerpo neoclásico de dos pisos, pórtico central con frontón y seis columnas,
    columnata a lo largo de la fachada, cornisa y balaustrada. En el marco del código: la fachada mira hacia −z."""
    B, root = _begin("palacio")
    body = L.mat("pal-body", "#ead9b4", 0.85)
    trim = L.mat("pal-trim", "#f5ecd6", 0.7)
    cornice = L.mat("pal-cornice", "#d9c49a", 0.8)
    dark = L.mat("pal-dark", "#3c4a55", 0.6)
    P = dict(body=[gbox(40, 12, 18, 0, 6, 0), gbox(12, 13.5, 3, 0, 6.75, -9.6)], trim=[], cornice=[], dark=[])
    P["cornice"] += [gbox(42, 1, 19, 0, 12.4, 0), gbox(41, 0.4, 18.6, 0, 6.2, 0), gbox(41, 0.6, 18.6, 0, 0.3, 0)]
    for i in range(10):  # columnata del frente
        x = -16 + i * 3.55
        if abs(x) < 5.5:
            continue
        P["trim"] += [prism(0.45, 10, 0.6, seg=10, center=(x, -9.6)), gbox(1.1, 0.4, 1.1, x, 10.8, -9.6), gbox(1.1, 0.5, 1.1, x, 0.35, -9.6)]
    P["trim"].append(gbox(40, 0.8, 1.4, 0, 11.4, -9.6))
    for i in range(6):  # pórtico
        x = -5 + i * 2
        P["trim"] += [prism(0.55, 11.5, 0.6, seg=12, center=(x, -12.0)), gbox(1.3, 0.45, 1.3, x, 12.3, -12.0), gbox(1.3, 0.5, 1.3, x, 0.35, -12.0)]
    P["trim"] += [gbox(13, 1.0, 3.4, 0, 13.0, -11.4)]
    bm = bmesh.new()
    pts = [Vector((-6.5, 13.5, -13.1)), Vector((6.5, 13.5, -13.1)), Vector((0, 16.6, -13.1)),
           Vector((-6.5, 13.5, -9.7)), Vector((6.5, 13.5, -9.7)), Vector((0, 16.6, -9.7))]
    v = [gv(bm, p) for p in pts]
    bm.faces.new((v[0], v[1], v[2]))
    bm.faces.new((v[5], v[4], v[3]))
    bm.faces.new((v[1], v[4], v[5], v[2]))
    bm.faces.new((v[0], v[2], v[5], v[3]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    P["cornice"].append(bm)
    P["trim"] += [gbox(14, 0.4, 5, 0, 0.2, -13.2), gbox(13, 0.4, 3, 0, 0.6, -13.5)]
    # Balaustrada sobre la cornisa.
    for i in range(41):
        x = -20 + i
        P["trim"] += [gbox(0.18, 0.8, 0.18, x, 13.3, -9.3), gbox(0.18, 0.8, 0.18, x, 13.3, 9.3)]
    P["trim"] += [gbox(40.5, 0.18, 0.35, 0, 13.8, -9.3), gbox(40.5, 0.18, 0.35, 0, 13.8, 9.3)]
    for f, y in enumerate((3.2, 8.8)):  # ventanas de los dos pisos, frente y fondo
        for i in range(12):
            x = -18 + i * 3.27
            if abs(x) < 6.5:
                continue
            for z, d in ((-9.03, 1), (9.03, -1)):
                P["dark"].append(arch_window(1.3, 2.6, x, y - 1.3, z, depth=0.08) if d < 0 else gbox(1.3, 2.4, 0.08, x, y, z))
    P["dark"] += [arch_window(2.4, 4.6, 0, 0.8, -11.12, depth=0.1), arch_window(1.8, 3.4, -3.5, 0.8, -11.12), arch_window(1.8, 3.4, 3.5, 0.8, -11.12)]
    for k, m in (("body", body), ("trim", trim), ("cornice", cornice), ("dark", dark)):
        _part(B, root, m.name, P[k], m, 25)
    return _finish(B, root, 0.5, 5.0, 16)


def concha():
    """Concha Acústica del malecón: escenario y cinco arcos blancos escalonados que forman la concha, abierta hacia +z
    (el público). En el marco del código."""
    B, root = _begin("concha")
    white = L.mat("concha-white", "#fbf8ef", 0.6, double=True)
    stage = L.mat("concha-stage", "#e7e1d1", 0.85)
    bands = []
    for i in range(5):
        R = 9.5 - i * 1.15
        z0 = 2.5 - i * 1.25
        n = 18
        bm = bmesh.new()
        rings = []
        for j in range(n + 1):
            a = math.pi * j / n
            outer = [Vector((R * math.cos(a), 1.2 + R * math.sin(a), z0)), Vector((R * math.cos(a), 1.2 + R * math.sin(a), z0 - 1.5)),
                     Vector(((R - 0.4) * math.cos(a), 1.2 + (R - 0.4) * math.sin(a), z0 - 1.5)), Vector(((R - 0.4) * math.cos(a), 1.2 + (R - 0.4) * math.sin(a), z0))]
            rings.append([gv(bm, p) for p in outer])
        for a_, b_ in zip(rings, rings[1:]):
            for k in range(4):
                bm.faces.new((a_[k], a_[(k + 1) % 4], b_[(k + 1) % 4], b_[k]))
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bands.append(bm)
    bands.append(arch_window(9.2, 5.8, 0, 0, -3.9, seg=12, depth=0.3))  # fondo en arco, dentro del último aro
    _part(B, root, "concha-white", bands, white, 35)
    _part(B, root, "concha-stage", [gbox(16, 1.2, 8, 0, 0.6, 0), gbox(6, 0.3, 1.2, 0, 0.15, 4.6), gbox(5, 0.3, 0.8, 0, 0.45, 4.3)], stage, 20)
    return _finish(B, root, 0.5, 4.0, 16)


# --------------------------------------------------------------------------- La Salle: cafetería y bar

def cafeteria():
    """Cafetería junto a la pista (frente hacia +z, la calle): cuerpo, techo de teja, mostrador, toldo a rayas verde y
    blanco, tablero del rótulo, frascos de dulces y mesas con bancos. La señora y los rótulos los pone el juego."""
    B, root, M, P = _begin_parts("cafeteria")
    green = L.mat("cafe-green", "#2f7a4e", 0.6)
    white = L.mat("cafe-white", "#f6efe1", 0.7)
    jar = {c: L.mat("cafe-jar-" + c[1:], c, 0.3) for c in ("#f2c14e", "#d23b3b", "#fff4e0", "#7cc36b")}
    P["wall"].append(gbox(16, 4, 6, 0, 2, -2))
    P["roof"].append(tile_roof(17.5, 3.2, -5.4, 4.0, 5.3, z_ridge=-1.2, period=0.4))
    P["wood"] += [gbox(14, 1.2, 1.2, 0, 0.6, 1.4)]
    P["cream"] += [gbox(14.4, 0.12, 1.5, 0, 1.25, 1.4), gbox(9.4, 1.9, 0.15, 0, 5.3, 3.0)]
    stripes_g, stripes_w = [], []
    for i in range(9):
        sl = gbox(1.8, 0.12, 3.0, -7.2 + i * 1.8, 3.75, 2.6)
        bmesh.ops.rotate(sl, verts=sl.verts, cent=G(0, 3.75, 2.6), matrix=Matrix.Rotation(-0.18, 3, "X"))
        (stripes_w if i % 2 else stripes_g).append(sl)
    P["trim"] += [gbox(0.15, 3.0, 0.15, x, 2.1, 3.9) for x in (-7.8, 7.8)]
    jars = {c: [] for c in jar}
    for i, c in enumerate(jar):
        jars[c].append(prism(0.35, 0.6, 1.31, seg=10, center=(-5 + i * 1.4, 1.4)))
    tables = []
    for i in range(3):
        tx = -5 + i * 5
        tables += [prism(1.0, 0.12, 0.7, seg=12, center=(tx, -7.5)), prism(0.08, 0.7, 0, seg=6, center=(tx, -7.5)),
                   gbox(2.2, 0.12, 0.45, tx, 0.45, -8.7), gbox(2.2, 0.12, 0.45, tx, 0.45, -6.3)]
    P["wood"] += tables
    _part(B, root, "cafe-green", stripes_g, green, 20)
    _part(B, root, "cafe-white", stripes_w, white, 20)
    for c, bms in jars.items():
        _part(B, root, jar[c].name, bms, jar[c], 30)
    _flush(B, root, M, P)
    return _finish(B, root, 0.5, 2.5, 16)


def bar_lasalle():
    """«El bar» junto a las canchas, en el marco del código (el mostrador mira hacia −z): kiosko amarillo, techo de
    teja, mostrador, toldo rojo y blanco, repisa con gaseosas y cinco mesas con sombrilla y bancos."""
    B, root, M, P = _begin_parts("bar-lasalle")
    yellow = L.mat("bar-yellow", "#f0c95a", 0.8)
    red = L.mat("bar-red", "#c8432f", 0.6)
    white = L.mat("bar-white", "#f6efe1", 0.7)
    green = L.mat("bar-green", "#2f7a4e", 0.6)
    _part(B, root, "bar-yellow", gbox(22, 3.6, 7, 0, 1.8, 0), yellow, 20)
    P["roof"].append(tile_roof(23, 4.4, -4.4, 3.7, 5.0, period=0.4))
    P["wood"] += [gbox(22, 1.0, 1.2, 0, 1.15, -3.9)]
    P["cream"] += [gbox(8.4, 2.0, 0.2, 0, 5.4, -3.5)]
    reds, whites = [], []
    for i in range(16):
        sl = gbox(1.5, 0.12, 4.0, -11.25 + i * 1.5, 3.9, -4.7)
        bmesh.ops.rotate(sl, verts=sl.verts, cent=G(0, 3.9, -4.7), matrix=Matrix.Rotation(0.15, 3, "X"))
        (whites if i % 2 else reds).append(sl)
    umb_r, umb_g, legs = [], [], []
    for i in range(5):
        tx = -9 + i * 4.5
        legs += [prism(0.8, 0.1, 0.72, seg=12, center=(tx, -9)), prism(0.07, 0.75, 0, seg=6, center=(tx, -9)),
                 prism(0.05, 3.0, 0, seg=6, center=(tx, -9))]
        legs += [prism(0.3, 0.1, 0.45, seg=8, center=(tx + sx * 1.2, -9)) for sx in (-1, 1)]
        u = prism(1.8, 0.5, 2.85, seg=8, radius_top=0.1, center=(tx, -9))
        (umb_g if i % 2 else umb_r).append(u)
    P["wood"] += legs
    _part(B, root, "bar-red", reds + umb_r, red, 20)
    _part(B, root, "bar-white", whites, white, 20)
    _part(B, root, "bar-green", umb_g, green, 20)
    cans = {c: [] for c in ("#d23b3b", "#2e8b57", "#f2c14e", "#3a6db5", "#ffffff", "#7a3d9b")}
    for i, c in enumerate(cans):
        cans[c].append(prism(0.22, 0.8, 1.55, seg=8, center=(-8 + i * 3.2, -4.1)))
    for c, bms in cans.items():
        m = L.mat("bar-can-" + c[1:], c, 0.4)
        _part(B, root, m.name, bms, m, 30)
    _flush(B, root, M, P)
    return _finish(B, root, 0.5, 2.5, 16)


VEGETATION = {"palm": palm, "mango": mango, "malinche": malinche, "ceiba": ceiba, "pine": pine, "bush": bush,
              "rock": rock}
LANDMARKS = {"cristo": cristo, "catedral": catedral, "arbol-vida": arbol_vida, "chinamo": chinamo, "lona": lona,
             "volcano": volcano, "aula-pb": aula_pb, "aula-pa": aula_pa, "aula-techo": aula_techo, "capilla": capilla,
             "porton-lasalle": porton_lasalle, "bus-escolar": bus_escolar, "barra": barra,
             "palmera-tronco": palmera_tronco, "palmera-copa": palmera_copa,
             "casa-m1": lambda: casa_managua(1, "casa-m1"), "casa-m2": lambda: casa_managua(2, "casa-m2"),
             "casa-m3": lambda: casa_managua(3, "casa-m3"), "casa-techo": casa_techo,
             "casa-playa-1": lambda: casa_playa(1, "casa-playa-1"), "casa-playa-2": lambda: casa_playa(2, "casa-playa-2"),
             "teja-playa": teja_playa, "palacio": palacio, "concha": concha, "cafeteria": cafeteria,
             "bar-lasalle": bar_lasalle}
FILES = {"vegetation": list(VEGETATION), "cristo": ["cristo"],
         "managua": ["catedral", "arbol-vida", "palacio", "concha", "casa-m1", "casa-m2", "casa-m3", "casa-techo"],
         "oriental": ["chinamo", "lona"], "masaya": ["volcano"],
         "lasalle": ["aula-pb", "aula-pa", "aula-techo", "capilla", "porton-lasalle", "bus-escolar", "cafeteria", "bar-lasalle"],
         "sanjuan": ["casa-playa-1", "casa-playa-2", "teja-playa"],
         "hipa": ["barra", "palmera-tronco", "palmera-copa"]}


def build(kind):
    return (VEGETATION.get(kind) or LANDMARKS[kind])()


def build_all():
    return {k: build(k) for k in [*VEGETATION, *LANDMARKS]}
