# Simón and Manolo, the two dogs of the WebCV room, modelled from scratch.
#
# Same method as tools/motibot.py: each part starts from a low-resolution base (an
# icosphere, rings of a few vertices) shaped by moving vertices and extruding faces with
# bmesh; the parts are welded into one closed mesh with an exact boolean union, and the
# coat patches are cut into the surface along their outline (the intersection with an
# ellipsoid), so each face gets one solid colour from a material. No image textures.
#
#   Simón: a white Jack Russell asleep on the bed, curled up. Dark brown patches over
#          his eyes and ears with a white blaze between them, a black oval on his back,
#          another one on his rump. Static mesh (the room makes him breathe).
#   Manolo: a fluffy mutt sitting on the floor. White, with a black saddle over his back
#          and the base of his tail, a tan face with a black mask, a light muzzle, tan
#          ears with dark tips, blue collar. Skeleton Body / Head / Tail with smooth
#          weights: the whole head (chin included) turns, the tail wags without tearing.
#
#   blender -b -P tools/dogs.py -- --out public/models [--sheets tools/dogs-sheets] [--only manolo]
#   then, for each dog:
#   npx -y @gltf-transform/cli@4 optimize X_raw.glb public/models/X.glb --compress meshopt \
#       --simplify false --join false --flatten false --palette false
#
# Blender axes: x = his left, -y = his front (glTF +z), z = up. Built in "units" and
# scaled to metres at the end; the origin is on the floor under the middle of the dog.
import bpy, bmesh, sys, math, os
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
def arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default
OUT = arg('--out')
SHEETS = arg('--sheets')
ONLY = arg('--only')
REF = arg('--ref', os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'images', 'Reference', 'SimonYManolo.jpeg'))
ENGINE = arg('--engine', 'EEVEE')
V = Vector

PAL = dict(white='eeebe4', cream='d9d3c7', grey='a9a59d', black='1d1c1e', brown='3b2a22',
           tan='a8703c', tandark='6e4524', nose='141416', eye='1a1412', blue='2d63b5', gold='d9b45a')
MI = {n: i for i, n in enumerate(PAL)}

def lin(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]

def make_materials():
    mats = []
    for n, h in PAL.items():
        m = bpy.data.materials.new(n)
        if m.node_tree is None: m.use_nodes = True
        b = m.node_tree.nodes.get('Principled BSDF')
        b.inputs['Base Color'].default_value = (*lin(h), 1)
        b.inputs['Roughness'].default_value = 0.35 if n in ('nose', 'eye', 'gold') else 0.9
        b.inputs['Metallic'].default_value = 0.6 if n == 'gold' else 0
        m.diffuse_color = (*lin(h), 1)
        m.use_backface_culling = True
        mats.append(m)
    return mats

# ---------------------------------------------------------------- mesh helpers
def smooth(e0, e1, x):
    t = min(1.0, max(0.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)

def sym_ico(subdiv):
    """Icosphere turned so it is mirror-symmetric about x = 0."""
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=1.0)
    ring = [v for v in bm.verts if 0.3 < v.co.z < 0.6]
    a = min((math.atan2(v.co.y, v.co.x) for v in ring), key=abs)
    bmesh.ops.transform(bm, matrix=Matrix.Rotation(-math.pi / 2 - a, 4, 'Z'), verts=bm.verts)
    return bm

def xform(bm, M):
    bmesh.ops.transform(bm, matrix=M, verts=bm.verts)
    return bm

def frame(origin, fwd, up):
    """Matrix taking a local frame (facing -y, z up) to `origin`, facing `fwd`."""
    ey = -fwd.normalized()
    ez = (up - ey * up.dot(ey)).normalized()
    ex = ey.cross(ez)
    M = Matrix((ex, ey, ez)).transposed().to_4x4()
    M.translation = origin
    return M

def blob(subdiv, radii, mat, shape=None, M=None):
    bm = sym_ico(subdiv)
    for v in bm.verts:
        n = v.co.normalized()
        v.co = shape(n) if shape else V((n.x * radii[0], n.y * radii[1], n.z * radii[2]))
    for f in bm.faces: f.material_index = MI[mat]
    if M is not None: xform(bm, M)
    return bm

def frames(pts):
    T = [(pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized() for i in range(len(pts))]
    up = V((0, 0, 1)) if abs(T[0].z) < 0.9 else V((1, 0, 0))
    N = [(up - T[0] * up.dot(T[0])).normalized()]
    for i in range(1, len(pts)):
        N.append((N[-1] - T[i] * N[-1].dot(T[i])).normalized())
    return T, N

def tube(bm, pts, radii, sides, mats, phase=0.0, squash=1.0, ref_up=None):
    """A closed tube through pts, one ring of `sides` vertices per point (extruded ring by
    ring). radii[i] is a number or (width, height); mats[i] colours segment i."""
    T, N = frames(pts)
    if ref_up is not None:
        for i in range(len(pts)):
            n = ref_up - T[i] * ref_up.dot(T[i])
            if n.length > 1e-4: N[i] = n.normalized()
    rings = []
    for i, p in enumerate(pts):
        B = T[i].cross(N[i])
        rw, rh = radii[i] if isinstance(radii[i], tuple) else (radii[i], radii[i] * squash)
        rings.append([bm.verts.new(p + N[i] * (rh * math.sin(phase + 2 * math.pi * k / sides)) + B * (rw * math.cos(phase + 2 * math.pi * k / sides))) for k in range(sides)])
    for i in range(len(rings) - 1):
        for k in range(sides):
            f = bm.faces.new((rings[i][k], rings[i][(k + 1) % sides], rings[i + 1][(k + 1) % sides], rings[i + 1][k]))
            f.material_index = MI[mats[min(i, len(mats) - 1)]]
    c0 = bm.faces.new(list(reversed(rings[0])))
    c1 = bm.faces.new(rings[-1])
    c0.material_index = MI[mats[0]]
    c1.material_index = MI[mats[-1]]
    return c0, c1

def catmull(P, n):
    pts = []
    for i in range(n + 1):
        t = i / n * (len(P) - 1)
        k = min(int(t), len(P) - 2); u = t - k
        p0, p1, p2, p3 = P[max(k - 1, 0)], P[k], P[k + 1], P[min(k + 2, len(P) - 1)]
        pts.append(0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3))
    return pts

def limb(pts, radii, sides, mats, cap='round', ref_up=None):
    """A leg, a muzzle, a tail: a tube whose far end is closed with a poked, rounded cap."""
    bm = bmesh.new()
    c0, c1 = tube(bm, pts, radii, sides, mats, ref_up=ref_up)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    if cap == 'round':
        r = bmesh.ops.inset_region(bm, faces=[c1], thickness=min(radii[-1] if not isinstance(radii[-1], tuple) else radii[-1][1], 0.2) * 0.45, depth=0.03)
        bmesh.ops.poke(bm, faces=[c1], offset=0.02)
    return bm

def cut(bm, f, snap=0.2):
    """Cuts the surface along the zero contour of f (f < 0 inside a patch). Crossings
    close to a vertex move the vertex onto the contour instead of leaving slivers."""
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    val = {v: f(v.co) for v in bm.verts}
    for v, x in val.items():
        if x == 0: val[v] = 1e-9
    def root(a, b):
        pa, pb, sa = a.co.copy(), b.co.copy(), val[a] > 0
        lo, hi = 0.0, 1.0
        for _ in range(22):
            m = (lo + hi) / 2
            if (f(pa.lerp(pb, m)) > 0) == sa: lo = m
            else: hi = m
        return (lo + hi) / 2
    def crossing(e):
        a, b = e.verts
        return val[a] != 0 and val[b] != 0 and (val[a] > 0) != (val[b] > 0)
    for e in [e for e in bm.edges if crossing(e)]:
        if not crossing(e): continue
        a, b = e.verts
        t = root(a, b)
        if t < snap: a.co = a.co.lerp(b.co, t); val[a] = 0
        elif t > 1 - snap: b.co = a.co.lerp(b.co, t); val[b] = 0
    for e in [e for e in bm.edges if crossing(e)]:
        a, b = e.verts
        t = root(a, b)
        p = a.co.lerp(b.co, t)
        _, nv = bmesh.utils.edge_split(e, a, t)
        nv.co = p
        val[nv] = 0
    for face in list(bm.faces):
        loop = [l.vert for l in face.loops]
        zs = [i for i, v in enumerate(loop) if val[v] == 0]
        if len(zs) < 2: continue
        n = len(loop)
        pairs = [(zs[0], zs[1])] if len(zs) == 2 else [
            (zs[k], zs[(k + 1) % len(zs)]) for k in range(len(zs))
            if all(val[loop[(zs[k] + s) % n]] < 0 for s in range(1, (zs[(k + 1) % len(zs)] - zs[k]) % n)) and (zs[(k + 1) % len(zs)] - zs[k]) % n > 1]
        for i, j in pairs:
            if (j - i) % n in (1, n - 1): continue
            try: bmesh.ops.connect_verts(bm, verts=[loop[i], loop[j]])
            except Exception: pass
    bmesh.ops.triangulate(bm, faces=bm.faces[:])

def ellipsoid(c, r, M=None):
    """Signed-ish distance to an ellipsoid (centre c, radii r), optionally in a local frame M."""
    Mi = M.inverted() if M is not None else None
    def f(p):
        q = (Mi @ p if Mi is not None else p) - c
        return (q.x / r[0]) ** 2 + (q.y / r[1]) ** 2 + (q.z / r[2]) ** 2 - 1
    return f

def patches(bm, regions):
    """regions: [(f, material, {materials it may paint over})], applied in order."""
    for f, mat, where in regions:
        cut(bm, f)
        for face in bm.faces:
            if face.material_index in {MI[w] for w in where} and f(face.calc_center_median()) < 0:
                face.material_index = MI[mat]

def to_obj(name, bm):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    for m in MATS: me.materials.append(m)
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob

def union(target, others):
    col = bpy.data.collections.new('ops_' + target.name)
    bpy.context.scene.collection.children.link(col)
    for o in others:
        bpy.context.scene.collection.objects.unlink(o)
        col.objects.link(o)
    m = target.modifiers.new('union', 'BOOLEAN')
    m.operation, m.operand_type, m.collection, m.solver = 'UNION', 'COLLECTION', col, 'EXACT'
    try: m.material_mode = 'INDEX'
    except Exception: pass
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(target.evaluated_get(dg))
    target.modifiers.clear()
    target.data = me
    if not me.materials:
        for mt in MATS: me.materials.append(mt)
    for o in others: bpy.data.objects.remove(o)
    bpy.data.collections.remove(col)
    return target

def finish(ob, regions):
    """Welds, cuts the coat patches into the surface and leaves it flat shaded."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges[:], dist=1e-5)
    patches(bm, regions)
    bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(0.5), verts=bm.verts[:], edges=bm.edges[:], delimit={'MATERIAL'})
    bm.to_mesh(ob.data); bm.free()
    for p in ob.data.polygons: p.use_smooth = False

# ---------------------------------------------------------------- a dog's head
def head(M, skull, muzzle, ears, eyes_open=True, mat='white'):
    """Parts of a head in its own frame M (local: facing -y, z up, origin = skull centre).
    skull = radii; muzzle = (length, width, height, drop); ears = 'erect' | 'folded'."""
    sx, sy, sz = skull
    def skull_shape(n):
        x, y, z = n
        p = V((x * sx * (1 - 0.12 * max(0, z)), y * sy * (1 - 0.08 * max(0, -y)), z * sz * (1 - 0.15 * max(0, -z))))
        return p
    parts = [blob(2, None, mat, skull_shape, M)]
    L, w, h, drop = muzzle
    a = V((0, -sy * 0.45, -sz * 0.30))
    pts = [a, a + V((0, -L * 0.5, -drop * 0.5)), a + V((0, -L, -drop))]
    mz = limb(pts, [(w, h), (w * 0.88, h * 0.85), (w * 0.72, h * 0.72)], 8, [mat])
    parts.append(xform(mz, M))
    tip = pts[-1] + V((0, -0.02, h * 0.35))
    nose = blob(1, (w * 0.5, w * 0.35, w * 0.32), 'nose', M=M @ Matrix.Translation(tip))
    parts.append(nose)
    for s in (1, -1):
        e = V((s * sx * 0.48, -sy * 0.80, sz * 0.12))
        if eyes_open:
            parts.append(blob(1, (sx * 0.15, sx * 0.08, sx * 0.15), 'eye', M=M @ Matrix.Translation(e) @ Matrix.Rotation(s * 0.45, 4, 'Z')))
        else:   # asleep: a closed lid, a thin dark crescent
            parts.append(blob(1, (sx * 0.17, sx * 0.05, sx * 0.035), 'eye', M=M @ Matrix.Translation(e + V((0, 0.0, -0.01))) @ Matrix.Rotation(s * 0.45, 4, 'Z') @ Matrix.Rotation(-s * 0.15, 4, 'Y')))
        if ears == 'erect':
            b = V((s * sx * 0.55, sy * 0.05, sz * 0.62))
            up = V((s * 0.38, 0.05, 1)).normalized()
            ear = limb([b, b + up * sz * 0.65, b + up * sz * 1.15 + V((0, -0.05, 0))],
                       [(sx * 0.36, sx * 0.14), (sx * 0.26, sx * 0.10), (sx * 0.05, sx * 0.04)], 4, [mat],
                       cap=None, ref_up=V((0, -1, 0)))
        else:   # button ears folded forward over the sides of the head
            b = V((s * sx * 0.62, sy * 0.05, sz * 0.60))
            d = V((s * 0.55, -0.55, -0.35)).normalized()
            ear = limb([b, b + d * sx * 0.35 + V((s * 0.02, 0, 0.05)), b + d * sx * 0.75 + V((s * 0.03, 0, -0.04))],
                       [(sx * 0.34, sx * 0.07), (sx * 0.30, sx * 0.06), (sx * 0.10, sx * 0.04)], 4, [mat],
                       cap=None, ref_up=V((s, 0, 0.6)))
        parts.append(xform(ear, M))
    return parts

# ---------------------------------------------------------------- Manolo
TAIL_R = [0.12, 0.14, 0.145, 0.145, 0.135, 0.12, 0.105, 0.08, 0.05]   # Manolo's tail, ring by ring
TAIL_ROOT = 0.26                    # where along it the tail comes out of his body

def tail_point(pts, s):
    L = [0.0]
    for a, b in zip(pts, pts[1:]): L.append(L[-1] + (b - a).length)
    x = s * L[-1]
    for i in range(len(pts) - 1):
        if L[i + 1] >= x: return pts[i].lerp(pts[i + 1], (x - L[i]) / (L[i + 1] - L[i]))
    return pts[-1]

def build_manolo():
    # torso, sitting: extruded ring by ring along a straight spine from the seat to the
    # withers, so the back is a straight slope (no hump), with a full white chest in front
    spine = [V((0, 0.32, 0.06)), V((0, 0.30, 0.26)), V((0, 0.19, 0.56)), V((0, 0.07, 0.85)), V((0, -0.03, 1.07))]
    torso = limb(spine, [(0.40, 0.36), (0.44, 0.40), (0.42, 0.37), (0.38, 0.32), (0.31, 0.27)], 10, ['white'], ref_up=V((0, -1, 0)))
    for v in torso.verts: v.co.z = max(v.co.z, 0.0)
    parts = [torso]
    parts.append(blob(2, (0.36, 0.26, 0.34), 'white', M=Matrix.Translation(V((0, -0.17, 0.95)))))
    for s in (1, -1):
        parts.append(blob(2, (0.20, 0.38, 0.30), 'white', M=Matrix.Translation(V((s * 0.29, 0.22, 0.30))) @ Matrix.Rotation(math.radians(-12), 4, 'X')))
        parts.append(limb([V((s * 0.30, 0.10, 0.10)), V((s * 0.32, -0.12, 0.09)), V((s * 0.33, -0.30, 0.085))], [0.115, 0.11, 0.095], 7, ['white']))
        parts.append(limb([V((s * 0.18, -0.18, 0.86)), V((s * 0.20, -0.27, 0.48)), V((s * 0.21, -0.30, 0.13)), V((s * 0.21, -0.42, 0.075))],
                          [0.14, 0.12, 0.11, 0.10], 7, ['white']))
    neck0, neck1 = V((0, -0.04, 1.00)), V((0, -0.24, 1.45))
    parts.append(limb([neck0, (neck0 + neck1) / 2, neck1], [0.30, 0.28, 0.25], 9, ['white'], cap=None))
    nd = (neck1 - neck0).normalized()
    cc = neck0.lerp(neck1, 0.52)
    band = bmesh.new()
    tube(band, [cc - nd * 0.035, cc + nd * 0.035], [0.30, 0.30], 12, ['blue'])
    parts.append(band)
    parts.append(blob(1, (0.05, 0.015, 0.05), 'gold', M=Matrix.Translation(cc + V((0, -0.30, -0.08)))))
    # head: broad, with fluffy tan cheeks and a short muzzle
    HM = frame(V((0, -0.33, 1.66)), V((0, -1, -0.05)), V((0, 0, 1)))
    parts += head(HM, (0.37, 0.33, 0.31), (0.27, 0.17, 0.14, 0.05), 'erect', mat='tan')
    for s in (1, -1):
        parts.append(blob(1, (0.16, 0.18, 0.17), 'tan', M=HM @ Matrix.Translation(V((s * 0.28, 0.02, -0.13)))))
    # tail, fluffy, lying on the floor and curling round his side
    TAIL = catmull([V((0.04, 0.40, 0.16)), V((0.24, 0.58, 0.12)), V((0.50, 0.52, 0.10)), V((0.66, 0.28, 0.10)), V((0.66, 0.06, 0.10))], 8)
    parts.append(limb(TAIL, TAIL_R, 7, ['black'] * 4 + ['white'] * 4))
    obs = [to_obj('p', b) for b in parts]
    ob = union(obs[0], obs[1:])
    ob.name = ob.data.name = 'Manolo'
    finish(ob, [
        (ellipsoid(V((0, 0.44, 0.66)), (0.56, 0.36, 0.42)), 'black', {'white'}),            # saddle
        (ellipsoid(V((0, 0.50, 0.25)), (0.32, 0.25, 0.22)), 'black', {'white'}),            # rump, tail root
        (ellipsoid(V((0, 0.10, 1.48)), (0.38, 0.28, 0.26)), 'tan', {'white'}),              # mane behind the head
        (ellipsoid(V((0, -0.40, -0.10)), (0.18, 0.22, 0.13), HM), 'grey', {'tan'}),         # muzzle
        (ellipsoid(V((0, -0.33, -0.24)), (0.15, 0.18, 0.09), HM), 'cream', {'tan', 'grey'}),  # chin
        (ellipsoid(V((0, -0.27, 0.03)), (0.085, 0.13, 0.09), HM), 'black', {'tan', 'grey'}),  # bridge of the nose
        (ellipsoid(V((0.16, -0.25, 0.05)), (0.125, 0.10, 0.10), HM), 'black', {'tan'}),     # mask
        (ellipsoid(V((-0.16, -0.25, 0.05)), (0.125, 0.10, 0.10), HM), 'black', {'tan'}),
        (ellipsoid(V((0, -0.42, -0.07)), (0.11, 0.07, 0.10), HM), 'cream', {'grey', 'black'}),  # light ring round the nose
        (ellipsoid(V((0.30, 0.0, 0.56)), (0.13, 0.13, 0.13), HM), 'tandark', {'tan'}),      # ear tips
        (ellipsoid(V((-0.30, 0.0, 0.56)), (0.13, 0.13, 0.13), HM), 'tandark', {'tan'}),
    ])
    return ob, TAIL, (neck0, neck1)

# ---------------------------------------------------------------- Simón
def build_simon():
    # asleep on the bed, lying on his belly in a loose C. Like Manolo, the body is one
    # piece extruded ring by ring along a curved spine, from the rump through the
    # flank and the deep chest into the neck, which turns back so his head rests on his
    # front paws; the rings swell and narrow gently, so the outline flows instead of
    # being a chain of balls. Hind legs fold forward, the tail wraps toward his nose.
    P = V((-0.32, 0.10, 0.20))                     # hips
    C = V((0.22, 0.24, 0.24))                      # chest
    d = (C - P); d.z = 0; d.normalize()            # along the body
    side = V((-d.y, d.x, 0))                       # to his left (away from the curl)
    rot = Matrix.Rotation(math.atan2(d.y, d.x), 4, 'Z')
    H = V((0.33, -0.20, 0.17))
    fwd = V((-0.85, -0.35, -0.08))
    ctrl = [(P - d * 0.20 + V((0, 0, -0.03)), (0.15, 0.13)),   # rump
            (P, (0.215, 0.185)),                               # hips
            ((P + C) / 2 + V((0, 0, -0.01)), (0.20, 0.175)),   # flank, a little narrower
            (C, (0.235, 0.205)),                               # deep chest
            (C + d * 0.17 + V((0, -0.02, 0)), (0.20, 0.185)),  # shoulders
            (V((0.42, 0.05, 0.22)), (0.15, 0.145)),            # neck, turning back
            (H - fwd.normalized() * 0.06, (0.125, 0.12))]      # into the head
    N = 14
    spine = catmull([c for c, _ in ctrl], N)
    def sec(i):
        t = i / N * (len(ctrl) - 1); k = min(int(t), len(ctrl) - 2); u = smooth(0, 1, t - k)
        (a, b), (c, e) = ctrl[k][1], ctrl[k + 1][1]
        return (a + (c - a) * u, b + (e - b) * u)
    torso = limb(spine, [sec(i) for i in range(N + 1)], 10, ['white'], cap=None, ref_up=V((0, 0, 1)))
    parts = [torso]
    # front legs stretched forward under the chin
    for k, off in ((0, -0.09), (1, 0.08)):
        a = C + d * 0.12 + side * off + V((0, 0, -0.12))
        e = V((-0.08 + 0.10 * k, -0.40 - 0.04 * k, 0.055))
        parts.append(limb([a, a.lerp(e, 0.5) + V((0, 0, -0.02)), e], [0.08, 0.07, 0.065], 7, ['white']))
    # hind legs: thighs folded flat against both flanks, hocks and paws forward
    for off, sz in ((-0.13, (0.20, 0.08, 0.12)), (0.14, (0.19, 0.07, 0.11))):
        th = P + side * off + d * 0.05 + V((0, 0, -0.04))
        parts.append(blob(2, sz, 'white', M=Matrix.Translation(th) @ rot @ Matrix.Rotation(math.radians(-15), 4, 'Y')))
    for off, e in ((-0.16, V((-0.06, -0.24, 0.055))), (0.12, V((-0.20, -0.20, 0.055)))):
        a = P + side * off + d * 0.14 + V((0, 0, -0.10))
        parts.append(limb([a, a.lerp(e, 0.5), e], [0.075, 0.068, 0.062], 7, ['white']))
    HM = frame(H, fwd, V((0.15, 0.25, 1)))
    parts += head(HM, (0.20, 0.21, 0.175), (0.22, 0.10, 0.085, 0.03), 'folded', eyes_open=False)
    # collar
    nd = (spine[N - 1] - spine[N - 3]).normalized()
    nc = spine[N - 2]
    band = bmesh.new()
    tube(band, [nc - nd * 0.022, nc + nd * 0.022], [(sec(N - 2)[0] + 0.012, sec(N - 2)[1] + 0.012)] * 2, 12, ['blue'], ref_up=V((0, 0, 1)))
    parts.append(band)
    parts.append(blob(1, (0.03, 0.03, 0.01), 'gold', M=Matrix.Translation(nc + V((0, 0, -0.12)) + side * 0.05)))
    # the tail wraps round toward his nose
    tail = catmull([P - d * 0.17 + V((0, 0, 0.06)), V((-0.55, -0.02, 0.14)), V((-0.48, -0.24, 0.08)), V((-0.30, -0.36, 0.06))], 6)
    parts.append(limb(tail, [0.06, 0.058, 0.055, 0.05, 0.045, 0.04, 0.03], 6, ['white']))
    for b in parts:
        for v in b.verts: v.co.z = max(v.co.z, 0.012)                                   # flat on the bed
    obs = [to_obj('p', b) for b in parts]
    ob = union(obs[0], obs[1:])
    ob.name = ob.data.name = 'Simon'
    finish(ob, [
        (ellipsoid(V((-0.02, 0.22, 0.38)), (0.19, 0.17, 0.13)), 'black', {'white'}),      # oval on his back
        (ellipsoid(V((-0.44, 0.12, 0.30)), (0.15, 0.17, 0.15)), 'black', {'white'}),      # rump, by the tail
        (ellipsoid(V((0.13, -0.10, 0.08)), (0.16, 0.23, 0.17), HM), 'brown', {'white'}),   # patches over eyes and ears
        (ellipsoid(V((-0.13, -0.10, 0.08)), (0.16, 0.23, 0.17), HM), 'brown', {'white'}),
        (ellipsoid(V((0.21, 0.02, 0.08)), (0.12, 0.13, 0.13), HM), 'tan', {'brown', 'white'}),   # tan on the ears
        (ellipsoid(V((-0.21, 0.02, 0.08)), (0.12, 0.13, 0.13), HM), 'tan', {'brown', 'white'}),
        (ellipsoid(V((0, -0.15, 0.12)), (0.042, 0.27, 0.23), HM), 'white', {'brown'}),     # the white blaze
    ])
    # turn him so his face looks along -y (glTF +z): the room aims that at the visitor
    a = -math.pi / 2 - math.atan2(fwd.y, fwd.x)
    Rz = Matrix.Rotation(a, 3, 'Z')
    for v in ob.data.vertices: v.co = Rz @ v.co
    return ob, Rz @ C, Rz @ H

def rig_simon(ob, chest, head_c):
    """A Chest bone that breathes (the room scales it), weighted softly over his ribcage
    and flanks, and an unweighted Head bone that marks where the z z z rise from."""
    me = ob.data
    nv = len(me.vertices)
    nb = [set() for _ in range(nv)]
    for e in me.edges:
        a, b = e.vertices; nb[a].add(b); nb[b].add(a)
    c = V((chest.x, chest.y, 0.0))
    w = []
    for v in me.vertices:
        q = v.co - c
        dist = math.sqrt(q.x * q.x + q.y * q.y) * 0.8 + abs(q.z) * 0.2
        w.append((1 - smooth(0.16, 0.42, dist)) * smooth(0.20, 0.32, (v.co - head_c).length))
    for _ in range(2):
        w = [0.5 * w[i] + 0.5 * (sum(w[j] for j in nb[i]) / len(nb[i]) if nb[i] else w[i]) for i in range(nv)]
    gb, gc = ob.vertex_groups.new(name='Body'), ob.vertex_groups.new(name='Chest')
    for i in range(nv):
        if w[i] > 0.002: gc.add([i], w[i], 'REPLACE')
        if w[i] < 0.998: gb.add([i], 1 - w[i], 'REPLACE')
    T = place(ob, length=0.42)
    arm = bpy.data.armatures.new('Rig')
    r = bpy.data.objects.new('Rig', arm)
    bpy.context.scene.collection.objects.link(r)
    bpy.context.view_layer.objects.active = r
    bpy.ops.object.mode_set(mode='EDIT')
    def bone(name, h, t, parent=None):
        b = arm.edit_bones.new(name)
        b.head, b.tail = T(h), T(t)
        b.align_roll(V((0, -1, 0)))
        if parent: b.parent = arm.edit_bones[parent]
    bone('Body', V((0, 0, 0)), V((0, 0, 0.3)))
    bone('Chest', c, c + V((0, 0, 0.3)), 'Body')      # on the bed: it swells up and out, not down
    bone('Head', head_c, head_c + V((0, 0, 0.25)), 'Body')
    bpy.ops.object.mode_set(mode='OBJECT')
    mod = ob.modifiers.new('rig', 'ARMATURE'); mod.object = r
    ob.parent = r
    return r

# ---------------------------------------------------------------- rig (Manolo)
def seg_param(p, pts):
    best, L, acc = (1e9, 0.0), [0.0], 0.0
    for a, b in zip(pts, pts[1:]): acc += (b - a).length; L.append(acc)
    for i, (a, b) in enumerate(zip(pts, pts[1:])):
        ab = b - a; t = max(0, min(1, (p - a).dot(ab) / ab.length_squared))
        d = (a + ab * t - p).length
        if d < best[0]: best = (d, (L[i] + t * ab.length) / acc)
    return best

def rig_manolo(ob, tail, neck, height):
    """Weights are worked out in model units, then the mesh goes to metres and the bones follow."""
    me = ob.data
    nv = len(me.vertices)
    nb = [set() for _ in range(nv)]
    for e in me.edges:
        a, b = e.vertices; nb[a].add(b); nb[b].add(a)
    n0, n1 = neck
    W = {'Head': [0.0] * nv, 'Tail': [0.0] * nv}
    for v in me.vertices:
        p = v.co
        d, s = seg_param(p, tail)
        # only what is inside the tail's own tube, and only from where it leaves the
        # body: the hip stays put and the whole tail, tip included, moves as one
        r = TAIL_R[min(int(s * (len(TAIL_R) - 1) + 0.5), len(TAIL_R) - 1)]
        W['Tail'][v.index] = smooth(TAIL_ROOT - 0.04, TAIL_ROOT + 0.08, s) * (1 - smooth(r * 1.15, r * 1.45, d)) if p.z < 0.35 else 0.0
        t = (p - n0).dot(n1 - n0) / (n1 - n0).length_squared
        W['Head'][v.index] = smooth(0.30, 0.80, t)
    for k in W:   # neighbour averaging: soft neck and tail root
        w = W[k]
        for _ in range(3 if k == 'Head' else 2):
            w = [0.5 * w[i] + 0.5 * (sum(w[j] for j in nb[i]) / len(nb[i]) if nb[i] else w[i]) for i in range(nv)]
        W[k] = w
    groups = {k: ob.vertex_groups.new(name=k) for k in ('Body', 'Head', 'Tail')}
    for i in range(nv):
        h, tl = W['Head'][i], W['Tail'][i]
        if h + tl > 1: h, tl = h / (h + tl), tl / (h + tl)
        for k, x in (('Head', h), ('Tail', tl), ('Body', 1 - h - tl)):
            if x > 0.002: groups[k].add([i], x, 'REPLACE')
    T = place(ob, height=height)
    arm = bpy.data.armatures.new('Rig')
    r = bpy.data.objects.new('Rig', arm)
    bpy.context.scene.collection.objects.link(r)
    bpy.context.view_layer.objects.active = r
    bpy.ops.object.mode_set(mode='EDIT')
    def bone(name, h, t, roll, parent=None):
        b = arm.edit_bones.new(name)
        b.head, b.tail = T(h), T(t)
        b.align_roll(roll)
        if parent: b.parent = arm.edit_bones[parent]
    bone('Body', V((0, 0.1, 0.0)), V((0, 0.0, 0.95)), V((0, -1, 0)))
    # the head turns round the neck: rotate about its local y (up) to look left/right
    bone('Head', n0.lerp(n1, 0.3), V((0, -0.30, 1.95)), V((0, -1, 0)), 'Body')
    # the tail hinges where it leaves the body; local z is up, so turning about local x
    # lifts it off the floor and lets it fall back (it lies on the floor, curled round him)
    root = tail_point(tail, TAIL_ROOT)
    bone('Tail', root, tail[6], V((0, 0, 1)), 'Body')
    bpy.ops.object.mode_set(mode='OBJECT')
    mod = ob.modifiers.new('rig', 'ARMATURE'); mod.object = r
    ob.parent = r
    return r

# ---------------------------------------------------------------- scale, export, render
def place(ob, height=None, length=None):
    """Scales to metres and puts the origin on the floor under the middle of the dog."""
    vs = [v.co for v in ob.data.vertices]
    mn = V([min(c[i] for c in vs) for i in range(3)]); mx = V([max(c[i] for c in vs) for i in range(3)])
    S = height / (mx.z - mn.z) if height else length / max(mx.x - mn.x, mx.y - mn.y)
    O = V(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z))
    T = lambda p: (p - O) * S
    for v in ob.data.vertices: v.co = T(v.co)
    return T

def export(objs, path):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_yup=True,
                              export_skins=True, export_animations=False, export_texcoords=False,
                              export_normals=True, export_materials='EXPORT')

def setup_render():
    sc = bpy.context.scene
    for n in (['BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT'] if ENGINE.upper().startswith('EEVEE') else ['CYCLES']):
        try: sc.render.engine = n; break
        except TypeError: pass
    sc.render.film_transparent = True
    sc.render.resolution_x = sc.render.resolution_y = 700
    sc.view_settings.view_transform = 'Standard'
    w = bpy.data.worlds.new('w'); sc.world = w
    if w.node_tree is None: w.use_nodes = True
    bg = w.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (0.85, 0.85, 0.88, 1)
    bg.inputs['Strength'].default_value = 0.35
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    sun.data.energy = 3.0; sun.data.angle = math.radians(15)
    sun.rotation_euler = V((-0.5, -0.7, 0.9)).to_track_quat('Z', 'Y').to_euler()
    sc.collection.objects.link(sun)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    sc.collection.objects.link(cam); sc.camera = cam
    return cam

def shoot(cam, target, az, el, dist, path):
    a, e = math.radians(az), math.radians(el)
    d = V((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))
    cam.location = target + d * dist
    cam.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    cam.data.lens = 60
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)

def sheet(out, panels, labels, bg=(200, 200, 205)):
    from PIL import Image, ImageDraw
    ims = []
    for p in panels:
        im = p if not isinstance(p, str) else Image.open(p).convert('RGBA')
        if isinstance(p, str):
            a = im.getchannel('A').getbbox()
            if a: im = im.crop(a)
            base = Image.new('RGBA', im.size, bg + (255,)); base.alpha_composite(im); im = base
        s = max(im.size); m = int(s * 0.08)
        sq = Image.new('RGBA', (s + 2 * m, s + 2 * m), bg + (255,))
        sq.paste(im, ((s - im.size[0]) // 2 + m, (s - im.size[1]) // 2 + m))
        ims.append(sq.resize((480, 480)))
    W = Image.new('RGB', (490 * len(ims) + 10, 520), (40, 44, 52))
    dr = ImageDraw.Draw(W)
    for i, (im, lb) in enumerate(zip(ims, labels)):
        W.paste(im.convert('RGB'), (10 + i * 490, 10))
        dr.text((18 + i * 490, 498), lb, fill=(230, 230, 230))
    W.save(out)

def ref(box):
    from PIL import Image
    return Image.open(REF).convert('RGBA').crop(box)

def clear():
    for o in list(bpy.data.objects): bpy.data.objects.remove(o)

bpy.ops.wm.read_factory_settings(use_empty=True)
MATS = make_materials()
J = lambda d, n: os.path.join(d, n)

if ONLY in (None, 'manolo'):
    ob, tail, neck = build_manolo()
    r = rig_manolo(ob, tail, neck, 0.5)
    print(f'Manolo: {len(ob.data.vertices)} verts, {sum(len(p.vertices) - 2 for p in ob.data.polygons)} tris')
    if OUT: export([ob, r], J(OUT, 'manolo_raw.glb'))
    if SHEETS:
        os.makedirs(SHEETS, exist_ok=True)
        cam = setup_render()
        tg = V((0, 0, 0.25))
        shoot(cam, tg, 25, 35, 1.9, J(SHEETS, 'm_34.png'))
        shoot(cam, tg, 90, 10, 1.9, J(SHEETS, 'm_side.png'))
        shoot(cam, tg, 170, 30, 1.9, J(SHEETS, 'm_back.png'))
        sheet(J(SHEETS, 'sheet_manolo.png'), [J(SHEETS, 'm_34.png'), ref((200, 760, 730, 1220)), J(SHEETS, 'm_side.png'), J(SHEETS, 'm_back.png')],
              ['Manolo 3/4', 'referencia', 'costado', 'espalda'])
        # rig test: head turned 0.9 rad and tilted, tail wagged
        bpy.context.view_layer.objects.active = r
        bpy.ops.object.mode_set(mode='POSE')
        for n, rot in (('Head', (-0.3, 0.9, 0.08)), ('Tail', (0.6, 0, 0))):
            pb = r.pose.bones[n]; pb.rotation_mode = 'XYZ'; pb.rotation_euler = rot
        bpy.ops.object.mode_set(mode='OBJECT')
        shoot(cam, tg, 25, 35, 1.9, J(SHEETS, 'm_pose34.png'))
        shoot(cam, tg, 150, 40, 1.9, J(SHEETS, 'm_pose_back.png'))
        for n, rot in (('Head', (-0.3, -0.9, -0.08)), ('Tail', (0.3, 0, 0))):
            r.pose.bones[n].rotation_euler = rot
        shoot(cam, tg, -40, 30, 1.9, J(SHEETS, 'm_pose_other.png'))
        sheet(J(SHEETS, 'sheet_manolo_rig.png'), [J(SHEETS, 'm_pose34.png'), J(SHEETS, 'm_pose_back.png'), J(SHEETS, 'm_pose_other.png')],
              ['cabeza +0.9 rad mirando arriba, cola levantada 0.6', 'atras', 'cabeza -0.9 rad, cola 0.3'])
    clear()

if ONLY in (None, 'simon'):
    ob, chest, head_c = build_simon()
    r = rig_simon(ob, chest, head_c)
    print(f'Simon: {len(ob.data.vertices)} verts, {sum(len(p.vertices) - 2 for p in ob.data.polygons)} tris')
    if OUT: export([ob, r], J(OUT, 'simon_raw.glb'))
    if SHEETS:
        os.makedirs(SHEETS, exist_ok=True)
        cam = setup_render()
        tg = V((0, 0, 0.06))
        shoot(cam, tg, 20, 50, 1.4, J(SHEETS, 's_34.png'))
        shoot(cam, tg, 0, 89, 1.4, J(SHEETS, 's_top.png'))
        shoot(cam, tg, 200, 30, 1.4, J(SHEETS, 's_back.png'))
        sheet(J(SHEETS, 'sheet_simon.png'), [J(SHEETS, 's_34.png'), ref((170, 10, 650, 420)), J(SHEETS, 's_top.png'), J(SHEETS, 's_back.png')],
              ['Simon 3/4 (dormido)', 'referencia', 'arriba', 'otro lado'])
        # breathing test: the chest bone at its fullest
        bpy.context.view_layer.objects.active = r
        bpy.ops.object.mode_set(mode='POSE')
        r.pose.bones['Chest'].scale = (1.12, 1.12, 1.12)
        bpy.ops.object.mode_set(mode='OBJECT')
        shoot(cam, tg, 90, 8, 1.4, J(SHEETS, 's_breath_in.png'))
        r.pose.bones['Chest'].scale = (1, 1, 1)
        shoot(cam, tg, 90, 8, 1.4, J(SHEETS, 's_breath_out.png'))
        sheet(J(SHEETS, 'sheet_simon_breath.png'), [J(SHEETS, 's_breath_out.png'), J(SHEETS, 's_breath_in.png')], ['respiracion: reposo', 'respiracion: pecho lleno (x1.12)'])
