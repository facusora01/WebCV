# MotiBot, the mascot of the WhatsApp bot, modelled from scratch for the WebCV room.
#
# Everything is built here, polygon by polygon, with bmesh: each part starts from a
# low-resolution base (an icosphere, a ring of 8 vertices) that is shaped by moving its
# vertices and extruding its faces; the parts are welded into one closed mesh with an
# exact boolean union. Colours are materials assigned per face: the patches (mask,
# face, belly, ear insides, tail rings, foot pads) are cut into the surface along their
# outline first, so they follow the facets like in the reference. No image textures.
#
# Then it gets a skeleton (Body, Head, LegL, LegR, Tail; L/R are his sides) with
# smoothed weights, is scaled to 0.20 m and exported to glTF. Optionally it renders the
# comparison sheets against images/Reference/MotiBot.jpg.
#
#   blender -b -P tools/motibot.py -- --glb motibot_raw.glb [--sheets out/] [--engine CYCLES]
#   npx -y @gltf-transform/cli@4 optimize motibot_raw.glb public/models/motibot.glb \
#       --compress meshopt --simplify false --join false --flatten false
#
# Blender axes: x = his left, -y = his front (glTF +z), z = up. Modelled in "units"
# (about 2 tall) and scaled to metres at the end.
import bpy, bmesh, sys, math, os
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
def arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default
OUT = arg('--glb')
SHEETS = arg('--sheets')
REF = arg('--ref', os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'images', 'Reference', 'MotiBot.jpg'))
ENGINE = arg('--engine', 'EEVEE')
QUICK = '--quick' in argv
HEIGHT = 0.20                        # metres, ears and headset included
V = Vector

# ---------------------------------------------------------------- palette
PAL = dict(grey='8a8f99', light='b9bec6', white='f1f2f4', dark='3e424b', black='1d2027',
           eye='18202e', teal='2f8a97', tealdark='3b6670', cyan='53f2ff')
MI = {n: i for i, n in enumerate(PAL)}
HEADSET = {MI['teal'], MI['tealdark'], MI['cyan']}

def lin(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]

def make_materials():
    mats = []
    for n, h in PAL.items():
        m = bpy.data.materials.new('Moti_' + n)
        if m.node_tree is None:
            m.use_nodes = True
        b = m.node_tree.nodes.get('Principled BSDF')
        b.inputs['Base Color'].default_value = (*lin(h), 1)
        b.inputs['Roughness'].default_value = 0.45 if n == 'eye' else 0.85
        b.inputs['Metallic'].default_value = 0
        if n == 'cyan':
            b.inputs['Emission Color'].default_value = (*lin(h), 1)
            b.inputs['Emission Strength'].default_value = 2.0
        m.diffuse_color = (*lin(h), 1)
        m.use_backface_culling = True
        mats.append(m)
    return mats

# ---------------------------------------------------------------- mesh helpers
def smooth(e0, e1, x):
    t = min(1.0, max(0.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)

def sym_ico(subdiv):
    """Icosphere turned so it is mirror-symmetric about x = 0, with a vertex facing front."""
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=1.0)
    ring = [v for v in bm.verts if 0.3 < v.co.z < 0.6]          # upper ring of the icosahedron
    a = min((math.atan2(v.co.y, v.co.x) for v in ring), key=lambda x: abs(x))
    bmesh.ops.transform(bm, matrix=Matrix.Rotation(-math.pi / 2 - a, 4, 'Z'), verts=bm.verts)
    return bm

def to_obj(name, bm, recalc=True):
    if recalc:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in MATS:
        me.materials.append(m)
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob

def cut(bm, f, snap=0.18):
    """Cuts the surface along the zero contour of f, so a patch (f < 0) gets its own faces.
    Crossings close to a vertex move that vertex onto the contour instead of making slivers."""
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
        pairs = []
        if len(zs) == 2:
            pairs = [(zs[0], zs[1])]
        else:   # several crossings: pair them along the loop, around the inside runs
            for k in range(len(zs)):
                i, j = zs[k], zs[(k + 1) % len(zs)]
                mid = [loop[(i + s) % n] for s in range(1, (j - i) % n)]
                if mid and all(val[v] < 0 for v in mid): pairs.append((i, j))
        for i, j in pairs:
            if (j - i) % n in (1, n - 1): continue          # already an edge
            a, b = loop[i], loop[j]
            if any(face in e.link_faces for e in a.link_edges if b in e.verts): continue
            try:
                bmesh.ops.connect_verts(bm, verts=[a, b])
            except Exception:
                pass
    bmesh.ops.triangulate(bm, faces=bm.faces[:])

def paint(bm, f, mat, where=None):
    for face in bm.faces:
        if where is not None and face.material_index not in where: continue
        if f(face.calc_center_median()) < 0:
            face.material_index = MI[mat]

def frames(pts):
    """Parallel-transport frames along a polyline."""
    T = []
    for i in range(len(pts)):
        a, b = pts[max(i - 1, 0)], pts[min(i + 1, len(pts) - 1)]
        T.append((b - a).normalized())
    up = V((0, 0, 1)) if abs(T[0].z) < 0.9 else V((1, 0, 0))
    N = [(up - T[0] * up.dot(T[0])).normalized()]
    for i in range(1, len(pts)):
        n = N[-1] - T[i] * N[-1].dot(T[i])
        N.append(n.normalized())
    return T, N

def tube(bm, pts, radii, sides, mats, phase=0.0, squash=1.0, ref_up=None):
    """A closed tube through pts: rings of `sides` vertices, extruded ring by ring.
    mats[i] colours the segment from ring i to i+1. Returns (start cap, end cap)."""
    T, N = frames(pts)
    if ref_up is not None:           # fix the roll: N as close as possible to ref_up
        for i in range(len(pts)):
            n = ref_up - T[i] * ref_up.dot(T[i])
            if n.length > 1e-4: N[i] = n.normalized()
    rings = []
    for i, p in enumerate(pts):
        B = T[i].cross(N[i])
        r = radii[i]
        ring = []
        for k in range(sides):
            a = phase + 2 * math.pi * k / sides
            ring.append(bm.verts.new(p + N[i] * (r * squash * math.sin(a)) + B * (r * math.cos(a))))
        rings.append(ring)
    for i in range(len(rings) - 1):
        for k in range(sides):
            f = bm.faces.new((rings[i][k], rings[i][(k + 1) % sides], rings[i + 1][(k + 1) % sides], rings[i + 1][k]))
            f.material_index = MI[mats[min(i, len(mats) - 1)]]
    c0 = bm.faces.new(list(reversed(rings[0])))
    c1 = bm.faces.new(rings[-1])
    c0.material_index = MI[mats[0]]
    c1.material_index = MI[mats[-1]]
    return c0, c1

def inset(bm, face, thickness, depth, mat_ring=None, mat_face=None):
    r = bmesh.ops.inset_region(bm, faces=[face], thickness=thickness, depth=depth, use_even_offset=True)
    if mat_ring:
        for f in r['faces']: f.material_index = MI[mat_ring]
    if mat_face: face.material_index = MI[mat_face]
    return face

def blob(subdiv, center, shape, mat):
    bm = sym_ico(subdiv)
    for v in bm.verts:
        v.co = center + shape(v.co.normalized())
    for f in bm.faces: f.material_index = MI[mat]
    return bm

def catmull(P, n):
    pts = []
    for i in range(n + 1):
        t = i / n * (len(P) - 1)
        k = min(int(t), len(P) - 2); u = t - k
        p0, p1, p2, p3 = P[max(k - 1, 0)], P[k], P[k + 1], P[min(k + 2, len(P) - 1)]
        pts.append(0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3))
    return pts

def ico_ball(center, radius, mat, subdiv=1, scale=(1, 1, 1)):
    bm = sym_ico(subdiv)
    for v in bm.verts:
        v.co = center + V((v.co.x * radius * scale[0], v.co.y * radius * scale[1], v.co.z * radius * scale[2]))
    for f in bm.faces: f.material_index = MI[mat]
    return bm

def basis(n, hint=V((0, 0, 1))):
    """Tangent basis (t1, t2) with t1 x t2 = n, t2 as close to `hint` as possible."""
    t2 = (hint - n * hint.dot(n)).normalized()
    t1 = t2.cross(n)
    return t1, t2

# ---------------------------------------------------------------- the head
HC = V((0, -0.02, 1.37))             # head centre and radii
HR = V((0.76, 0.62, 0.66))
MUZ = V((0, -1, -0.62)).normalized()  # where the muzzle points

def head_shape(n):
    x, y, z = n
    sx = HR.x * (1 + 0.05 * max(0, -z) - 0.08 * max(0, z) ** 2)   # full cheeks, rounder crown
    sy = HR.y * (1 - 0.10 * max(0, -y) ** 2)                       # flatter face
    sz = HR.z * (1 - 0.10 * max(0, -z) ** 2)
    p = V((x * sx, y * sy, z * sz))
    g = math.exp(-(1 - n.dot(MUZ)) / 0.05)                         # the muzzle
    p += V((0, -0.13 * g, -0.02 * g))
    return p

def huv(p):
    q = p - HC
    return q.x / HR.x, q.z / HR.z, -q.y / HR.y

def f_light(p):
    u, v, w = huv(p)
    return max(v - (0.30 - 0.40 * u * u), -(w + 0.35))

def f_white(p):
    u, v, w = huv(p)
    return max(v - (0.47 - 0.45 * u * u), -(w + 0.05))

MASK_C, MASK_A, MASK_B, MASK_ANG = (0.41, -0.07), 0.35, 0.32, math.radians(22)
EYE_C, EYE_R = (0.35, 0.02), 0.18

def f_mask(side):
    d = V((side * math.cos(MASK_ANG), -math.sin(MASK_ANG)))
    pp = V((-d.y, d.x))
    def f(p):
        u, v, w = huv(p)
        q = V((u - side * MASK_C[0], v - MASK_C[1]))
        return max((q.dot(d) / MASK_A) ** 2 + (q.dot(pp) / MASK_B) ** 2 - 1, -w)
    return f

def build_head():
    bm = blob(2, HC, head_shape, 'grey')
    cut(bm, f_light); paint(bm, f_light, 'light')
    cut(bm, f_white); paint(bm, f_white, 'white')
    for s in (1, -1):
        f = f_mask(s); cut(bm, f); paint(bm, f, 'black')
    return bm

def surface_hit(tree, u, v, along=V((0, 1, 0))):
    o = HC + V((u * HR.x, 0, v * HR.z)) - along * 3
    loc, nrm, _, _ = tree.ray_cast(o, along, 10)
    return loc, nrm

def build_ear(side):
    bm = bmesh.new()
    n = V((side * 0.50, 0.10, 0.86)).normalized()
    base = HC + head_shape(n) - n * 0.12
    up = V((side * 0.48, 0.10, 1)).normalized()
    pts = [base, base + up * 0.22, base + up * 0.42, base + up * 0.53]
    c0, c1 = tube(bm, pts, [0.27, 0.25, 0.15, 0.06], 4, ['grey'], phase=math.pi / 4,
                  squash=0.55, ref_up=V((0, -1, 0)))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    # the front faces above the head become the inner ear: inset, a little hollow, white
    front = [f for f in bm.faces if f.normal.y < -0.5 and f not in (c0, c1)
             and f.calc_center_median().z > base.z + 0.12]
    bmesh.ops.inset_region(bm, faces=front, thickness=0.06, depth=-0.025, use_even_offset=True)
    for f in front: f.material_index = MI['white']
    return bm

def build_eye(tree, side):
    loc, nrm = surface_hit(tree, side * EYE_C[0], EYE_C[1])
    n = (nrm + V((0, -0.6, 0))).normalized()             # they look ahead
    t1, t2 = basis(n)
    depth = 0.14
    c = loc - n * depth * 0.35
    bm = sym_ico(1)
    M = Matrix((t1 * EYE_R, t2 * EYE_R * 1.08, n * depth)).transposed()
    for v in bm.verts: v.co = c + M @ v.co
    for f in bm.faces: f.material_index = MI['eye']
    # highlights, as their own little faces just above the eye
    hl = []
    for (a, b, r) in ((-0.36, 0.36, 0.068), (0.40, -0.30, 0.03)):
        h = math.sqrt(max(0.0, 1 - a * a - b * b))
        p = c + t1 * (a * EYE_R) + t2 * (b * EYE_R * 1.08) + n * (h * depth)
        g = (t1 * (a / EYE_R) + t2 * (b / (EYE_R * 1.08)) + n * (h / depth)).normalized()
        g = (g + n).normalized()
        hl.append((p + g * 0.006, g, r))
    return bm, hl

def disc(bm, p, n, r, sides, mat):
    t1, t2 = basis(n)
    vs = [bm.verts.new(p + t1 * (r * math.cos(2 * math.pi * k / sides)) + t2 * (r * math.sin(2 * math.pi * k / sides))) for k in range(sides)]
    bm.faces.new(vs).material_index = MI[mat]

def build_nose():
    p = HC + head_shape(MUZ)
    bm = sym_ico(1)
    for v in bm.verts:
        v.co = p + V((v.co.x * 0.075, v.co.y * 0.05, v.co.z * 0.05)) + V((0, 0.0, 0.01))
    for f in bm.faces: f.material_index = MI['black']
    return bm

def build_smile(bm, tree):
    uv = [(-0.21, -0.62), (-0.105, -0.71), (0.0, -0.63), (0.105, -0.71), (0.21, -0.62)]
    fine = []
    for (u0, v0), (u1, v1) in zip(uv, uv[1:]):
        fine += [(u0 + (u1 - u0) * k / 3, v0 + (v1 - v0) * k / 3) for k in range(3)]
    fine.append(uv[-1])
    pts = [surface_hit(tree, u, v) for u, v in fine]
    hw = 0.016
    rows = []
    for i, (p, n) in enumerate(pts):
        a, b = pts[max(i - 1, 0)][0], pts[min(i + 1, len(pts) - 1)][0]
        t = (b - a).normalized()
        s = n.cross(t).normalized()
        q = p + n * 0.016
        rows.append((bm.verts.new(q - s * hw), bm.verts.new(q + s * hw), n))
    for i in range(len(rows) - 1):
        a0, a1, n = rows[i]
        b0, b1, _ = rows[i + 1]
        f = bm.faces.new((a0, b0, b1, a1))
        f.normal_update()
        if f.normal.dot(n) < 0: f.normal_flip()
        f.material_index = MI['black']

# ---------------------------------------------------------------- the headset
CUP_X0, CUP_X1, CUP_R, CUP_Z, CUP_Y = 0.62, 0.92, 0.25, 1.40, -0.02

def build_cup(side):
    bm = bmesh.new()
    pts = [V((side * CUP_X0, CUP_Y, CUP_Z)), V((side * CUP_X1, CUP_Y, CUP_Z))]
    c0, c1 = tube(bm, pts, [CUP_R * 0.92, CUP_R], 8, ['teal'], phase=math.pi / 8, ref_up=V((0, 0, 1)))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    inset(bm, c1, 0.03, 0.03, 'teal')          # chamfer
    inset(bm, c1, 0.025, 0.0, 'teal')
    inset(bm, c1, 0.045, 0.0, 'cyan')          # the glowing ring
    inset(bm, c1, 0.0, -0.025, 'tealdark', 'tealdark')
    return bm

def build_band():
    bm = bmesh.new()
    pts = []
    for i in range(13):
        a = math.pi * i / 12
        pts.append(V((math.cos(a) * 0.80, -0.06, CUP_Z + 0.04 + math.sin(a) * 0.68)))
    pts[0] = V((0.80, -0.06, CUP_Z)); pts[-1] = V((-0.80, -0.06, CUP_Z))
    tube(bm, pts, [0.065] * 13, 4, ['tealdark'], phase=math.pi / 4, squash=0.55, ref_up=V((0, 1, 0)))
    return bm

def build_mic():
    bm = bmesh.new()
    P = [V((-0.80, -0.10, 1.30)), V((-0.80, -0.30, 1.16)), V((-0.70, -0.50, 1.00)), V((-0.50, -0.63, 0.95)), V((-0.32, -0.67, 0.94))]
    pts = catmull(P, 8)
    tube(bm, pts, [0.03] * len(pts), 6, ['tealdark'])
    tip = ico_ball(pts[-1] + (pts[-1] - pts[-2]).normalized() * 0.03, 0.065, 'tealdark')
    return bm, tip

def build_antenna():
    bm = bmesh.new()
    a, b = V((-0.78, CUP_Y, CUP_Z + 0.12)), V((-0.80, CUP_Y + 0.01, CUP_Z + 0.50))
    tube(bm, [a, b], [0.028, 0.026], 6, ['tealdark'])
    ball = ico_ball(b + V((0, 0, 0.04)), 0.07, 'tealdark')
    return bm, ball

# ---------------------------------------------------------------- the body
BC = V((0, 0.06, 0.47))
BR = V((0.45, 0.41, 0.52))

def body_shape(n):
    x, y, z = n
    k = 1 + 0.10 * max(0, -z) - 0.24 * max(0, z)
    return V((x * BR.x * k, y * BR.y * k, z * BR.z))

def f_belly(p):
    q = p - BC
    return max((q.x / 0.28) ** 2 + ((q.z + 0.02) / 0.36) ** 2 - 1, q.y + 0.12)

def build_body():
    bm = blob(2, BC, body_shape, 'grey')
    for v in bm.verts:
        v.co.z = max(v.co.z, 0.0)          # flat seat
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-4)
    cut(bm, f_belly); paint(bm, f_belly, 'white')
    return bm

LEG = [(V((0.17, -0.02, 0.19)), 0.15), (V((0.24, -0.30, 0.18)), 0.175), (V((0.29, -0.52, 0.18)), 0.185), (V((0.31, -0.61, 0.185)), 0.165)]
HIP_Y = -0.28                         # the front line of his hips: the shelf edge, the origin

def build_leg(side):
    bm = bmesh.new()
    pts = [V((p.x * side, p.y, p.z)) for p, r in LEG]
    c0, c1 = tube(bm, pts, [r for p, r in LEG], 8, ['grey'], phase=math.pi / 8, ref_up=V((0, 0, 1)))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    inset(bm, c1, 0.035, 0.03, 'grey', 'dark')
    inset(bm, c1, 0.0, 0.02, 'dark')
    return bm

ARM = [(V((0.22, 0.0, 0.70)), 0.10), (V((0.37, -0.13, 0.62)), 0.115), (V((0.44, -0.24, 0.50)), 0.12), (V((0.46, -0.29, 0.43)), 0.10)]

def build_arm(side):
    bm = bmesh.new()
    pts = [V((p.x * side, p.y, p.z)) for p, r in ARM]
    c0, c1 = tube(bm, pts, [r for p, r in ARM], 7, ['grey', 'grey', 'dark'], ref_up=V((0, -1, 0)))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    inset(bm, c1, 0.03, 0.025, 'dark', 'dark')
    return bm

TAIL_P = [V((0.10, 0.22, 0.26)), V((0.34, 0.46, 0.24)), V((0.60, 0.60, 0.38)), V((0.78, 0.60, 0.64)), V((0.86, 0.50, 0.92)), V((0.82, 0.40, 1.14))]
TAIL_N = 14

def tail_radius(t):
    return 0.15 + 0.09 * smooth(0.0, 0.35, t) - 0.13 * smooth(0.55, 1.0, t)

def build_tail():
    bm = bmesh.new()
    pts = catmull(TAIL_P, TAIL_N)
    ts = [i / TAIL_N for i in range(TAIL_N + 1)]
    mats = []
    for i in range(TAIL_N):
        band = int(((ts[i] + ts[i + 1]) / 2 - 0.12) / 0.15) if ts[i] > 0.12 else -1
        mats.append('dark' if band % 2 == 0 and band >= 0 else 'grey')
    mats[-1] = 'dark'
    c0, c1 = tube(bm, pts, [tail_radius(t) for t in ts], 8, mats, ref_up=V((0, 0, 1)))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    r = bmesh.ops.poke(bm, faces=[c1], offset=0.07)
    for f in r['faces']: f.material_index = MI['dark']
    return bm, pts

# ---------------------------------------------------------------- assembly
def union(target, others):
    col = bpy.data.collections.new('ops_' + target.name)
    bpy.context.scene.collection.children.link(col)
    for o in others:
        bpy.context.scene.collection.objects.unlink(o)
        col.objects.link(o)
    m = target.modifiers.new('union', 'BOOLEAN')
    m.operation = 'UNION'
    m.operand_type = 'COLLECTION'
    m.collection = col
    m.solver = 'EXACT'
    try: m.material_mode = 'INDEX'
    except Exception: pass
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(target.evaluated_get(dg))
    target.modifiers.clear()
    target.data = me
    if len(me.materials) == 0:
        for mt in MATS: me.materials.append(mt)
    for o in others: bpy.data.objects.remove(o)
    bpy.data.collections.remove(col)
    return target

def build():
    head = build_head()
    tree = BVHTree.FromBMesh(head)
    deco = bmesh.new()                  # loose decorations: highlights, smile
    parts = []
    for s in (1, -1):
        eye, hl = build_eye(tree, s)
        parts.append(to_obj('eye', eye))
        for p, n, r in hl: disc(deco, p, n, r, 7 if r > 0.04 else 5, 'white')
        parts.append(to_obj('ear', build_ear(s)))
        parts.append(to_obj('cup', build_cup(s)))
    build_smile(deco, tree)
    parts.append(to_obj('nose', build_nose()))
    parts.append(to_obj('band', build_band()))
    mic, tip = build_mic()
    parts += [to_obj('mic', mic), to_obj('mictip', tip)]
    ant, ball = build_antenna()
    parts += [to_obj('ant', ant), to_obj('antball', ball)]
    head_ob = union(to_obj('head', head), parts)

    body_parts = [to_obj('leg', build_leg(s)) for s in (1, -1)] + [to_obj('arm', build_arm(s)) for s in (1, -1)]
    tail, tail_pts = build_tail()
    body_parts.append(to_obj('tail', tail))
    body_ob = union(to_obj('body', build_body()), body_parts)
    ob = union(body_ob, [head_ob])
    ob.name = ob.data.name = 'MotiBot'

    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges[:], dist=1e-5)
    bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(0.5), verts=bm.verts[:], edges=bm.edges[:], delimit={'MATERIAL'})
    me_deco = bpy.data.meshes.new('deco'); deco.to_mesh(me_deco); deco.free()
    bm.from_mesh(me_deco)
    bpy.data.meshes.remove(me_deco)
    bm.to_mesh(ob.data); bm.free()
    for p in ob.data.polygons: p.use_smooth = False
    return ob, tail_pts

# ---------------------------------------------------------------- rig
def seg_dist(p, a, b):
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / ab.length_squared))
    return (a + ab * t - p).length

def weights(ob, tail_pts):
    me = ob.data
    nv = len(me.vertices)
    vmat = [set() for _ in range(nv)]
    for p in me.polygons:
        for i in p.vertices: vmat[i].add(p.material_index)
    nb = [set() for _ in range(nv)]
    for e in me.edges:
        a, b = e.vertices; nb[a].add(b); nb[b].add(a)
    # tail: arc length along its spine
    seg = [(tail_pts[i], tail_pts[i + 1]) for i in range(len(tail_pts) - 1)]
    L = [0.0]
    for a, b in seg: L.append(L[-1] + (b - a).length)
    def tail_param(p):
        best = (1e9, 0, 0)
        for i, (a, b) in enumerate(seg):
            ab = b - a; t = max(0, min(1, (p - a).dot(ab) / ab.length_squared))
            d = (a + ab * t - p).length
            if d < best[0]: best = (d, (L[i] + t * ab.length) / L[-1], i)
        return best[0], best[1]
    W = {k: [0.0] * nv for k in ('Body', 'Head', 'LegL', 'LegR', 'Tail')}
    for v in me.vertices:
        p = v.co
        i = v.index
        d, s = tail_param(p)
        tail = smooth(0.13, 0.30, s) * (1 - smooth(0.30, 0.45, d)) if p.y > 0.1 else 0.0
        e = ((p - HC) / 1).copy()
        e = math.sqrt((e.x / HR.x) ** 2 + (e.y / HR.y) ** 2 + (e.z / HR.z) ** 2)
        head = max(smooth(1.10, 1.0, e) * smooth(0.62, 0.80, p.z), smooth(0.98, 1.08, p.z))
        if vmat[i] & HEADSET: head = 1.0
        head *= (1 - tail)
        legs = {}
        side = 1 if p.x > 0 else -1
        arm_d = min(seg_dist(p, V((side * a.x, a.y, a.z)), V((side * b.x, b.y, b.z))) / r
                    for (a, r), (b, _) in zip(ARM, ARM[1:]))
        for side, name in ((1, 'LegL'), (-1, 'LegR')):
            a = V((side * LEG[0][0].x, LEG[0][0].y, LEG[0][0].z))
            b = V((side * LEG[-1][0].x, LEG[-1][0].y, LEG[-1][0].z))
            ab = b - a
            t = (p - a).dot(ab) / ab.length_squared
            rad = (p - (a + ab * max(0, min(1, t)))).length
            near_arm = arm_d < 1.4 and arm_d < rad / 0.18      # the paws rest on the thighs
            legs[name] = 0.0 if near_arm else smooth(0.25, 0.48, t) * (1 - smooth(0.26, 0.34, rad)) * (1 - head) * (1 - tail)
        W['Head'][i], W['Tail'][i] = head, tail
        W['LegL'][i], W['LegR'][i] = legs['LegL'], legs['LegR']
    # a few rounds of neighbour averaging: soft transitions at neck, hips and tail root
    for k in ('Head', 'LegL', 'LegR', 'Tail'):
        w = W[k]
        for _ in range(3):
            w = [0.5 * w[i] + 0.5 * (sum(w[j] for j in nb[i]) / len(nb[i]) if nb[i] else w[i]) for i in range(nv)]
        for i in range(nv):                       # rigid parts stay rigid
            if k == 'Head' and vmat[i] & HEADSET: w[i] = 1.0
        W[k] = w
    groups = {k: ob.vertex_groups.new(name=k) for k in W}
    for i in range(nv):
        ws = {k: W[k][i] for k in ('Head', 'LegL', 'LegR', 'Tail')}
        tot = sum(ws.values())
        if tot > 1: ws = {k: x / tot for k, x in ws.items()}; tot = 1
        ws['Body'] = 1 - tot
        for k, x in ws.items():
            if x > 0.002: groups[k].add([i], x, 'REPLACE')

def rig(ob, tail_pts, T):
    arm = bpy.data.armatures.new('Rig')
    r = bpy.data.objects.new('Rig', arm)
    bpy.context.scene.collection.objects.link(r)
    bpy.context.view_layer.objects.active = r
    bpy.ops.object.mode_set(mode='EDIT')
    def bone(name, head, tail, roll_to, parent=None):
        b = arm.edit_bones.new(name)
        b.head, b.tail = T(head), T(tail)
        b.align_roll(roll_to)
        if parent: b.parent = arm.edit_bones[parent]
    bone('Body', V((0, 0.06, 0.0)), V((0, 0.06, 0.82)), V((0, -1, 0)))
    bone('Head', V((0, 0.0, 0.84)), V((0, 0.0, 1.70)), V((0, -1, 0)), 'Body')
    for side, name in ((1, 'LegL'), (-1, 'LegR')):
        # the hinge is on the shelf edge, a bit under the middle of the thigh
        bone(name, V((side * 0.24, HIP_Y, 0.12)), V((side * 0.31, -0.62, 0.17)), V((0, 0, -1)), 'Body')
    bone('Tail', tail_pts[2], tail_pts[6], V((0, 0, 1)), 'Body')
    bpy.ops.object.mode_set(mode='OBJECT')
    mod = ob.modifiers.new('rig', 'ARMATURE')
    mod.object = r
    ob.parent = r
    return r

# ---------------------------------------------------------------- render helpers
def setup_render():
    sc = bpy.context.scene
    names = ['BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT'] if ENGINE.upper().startswith('EEVEE') else ['CYCLES']
    for n in names:
        try: sc.render.engine = n; break
        except TypeError: pass
    if sc.render.engine == 'CYCLES':
        sc.cycles.samples = 48
        sc.cycles.use_denoising = False
    sc.render.film_transparent = True
    sc.render.resolution_x = sc.render.resolution_y = 640 if QUICK else 900
    sc.view_settings.view_transform = 'Standard'
    w = bpy.data.worlds.new('w'); sc.world = w
    if w.node_tree is None: w.use_nodes = True
    bg = w.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (0.78, 0.85, 0.95, 1)
    bg.inputs['Strength'].default_value = 0.32
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    sun.data.energy = 3.0
    sun.data.angle = math.radians(20)
    sun.rotation_euler = V((-0.55, -0.75, 0.9)).to_track_quat('Z', 'Y').to_euler()
    sc.collection.objects.link(sun)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    sc.collection.objects.link(cam)
    sc.camera = cam
    return cam

def shoot(cam, target, az, el, path, dist=1.1, lens=70):
    """Camera az degrees to his left of his front, el degrees up."""
    a, e = math.radians(az), math.radians(el)
    d = V((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))
    cam.location = target + d * dist
    cam.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    cam.data.lens = lens
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)

def sheet(out, panels, labels, bg=(205, 222, 240)):
    from PIL import Image, ImageDraw
    ims = []
    for p in panels:
        im = Image.open(p).convert('RGBA') if isinstance(p, str) else p
        if isinstance(p, str) and p.lower().endswith('.png'):
            box = im.getbbox() if im.mode == 'RGBA' and im.getchannel('A').getbbox() else None
            if box: im = im.crop(im.getchannel('A').getbbox())
            base = Image.new('RGBA', im.size, bg + (255,))
            base.alpha_composite(im); im = base
        s = max(im.size); m = int(s * 0.08)
        sq = Image.new('RGBA', (s + 2 * m, s + 2 * m), bg + (255,))
        sq.paste(im, ((s - im.size[0]) // 2 + m, (s - im.size[1]) // 2 + m))
        ims.append(sq.resize((560, 560)))
    W = Image.new('RGB', (560 * len(ims) + 10 * (len(ims) + 1), 600), (40, 44, 52))
    dr = ImageDraw.Draw(W)
    for i, (im, lb) in enumerate(zip(ims, labels)):
        W.paste(im.convert('RGB'), (10 + i * 570, 10))
        dr.text((18 + i * 570, 576), lb, fill=(230, 230, 230))
    W.save(out)

def ref_crop():
    from PIL import Image
    im = Image.open(REF).convert('RGBA')
    return im.crop((225, 140, 870, 905))    # MotiBot inside his badge

# ---------------------------------------------------------------- main
bpy.ops.wm.read_factory_settings(use_empty=True)
MATS = make_materials()
ob, tail_pts = build()
weights(ob, tail_pts)

zmin = min(v.co.z for v in ob.data.vertices); zmax = max(v.co.z for v in ob.data.vertices)
S = HEIGHT / (zmax - zmin)
ORIGIN = V((0, HIP_Y, 0.0))
T = lambda p: (p - ORIGIN) * S
for v in ob.data.vertices: v.co = T(v.co)
r = rig(ob, tail_pts, T)
tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
print(f'MotiBot: {len(ob.data.vertices)} verts, {tris} tris, height {(zmax - zmin) * S:.3f} m, zmin {zmin:.3f}')

if OUT:
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True); r.select_set(True)
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_yup=True,
                              export_skins=True, export_animations=False, export_texcoords=False,
                              export_normals=True, export_materials='EXPORT')

if SHEETS:
    os.makedirs(SHEETS, exist_ok=True)
    cam = setup_render()
    tgt = T(V((0, 0.05, 1.0)))
    J = lambda n: os.path.join(SHEETS, n)
    shoot(cam, tgt, 30, 12, J('r_front34.png'))
    if QUICK:
        shoot(cam, T(V((0, -0.3, 1.3))), 25, 8, J('r_face.png'), dist=0.45)
        sheet(J('sheet_front34.png'), [J('r_front34.png'), ref_crop()], ['render 3/4', 'referencia'])
        sys.exit(0)
    shoot(cam, tgt, 0, 6, J('r_front.png'))
    shoot(cam, tgt, 90, 4, J('r_side.png'))
    shoot(cam, tgt, 180, 10, J('r_back.png'))
    sheet(J('sheet_front34.png'), [J('r_front34.png'), ref_crop()], ['render 3/4', 'referencia'])
    sheet(J('sheet_views.png'), [J('r_front.png'), J('r_side.png'), J('r_back.png')], ['frente', 'costado (su izquierda)', 'espalda'])
    # pose test: legs hanging over the shelf edge, head tilted, tail turned
    bpy.context.view_layer.objects.active = r
    bpy.ops.object.mode_set(mode='POSE')
    for n, rot in (('LegL', (1.05, 0, 0)), ('LegR', (1.05, 0, 0)), ('Head', (0, 0, 0.2)), ('Tail', (0, 0, 0.5))):
        pb = r.pose.bones[n]; pb.rotation_mode = 'XYZ'; pb.rotation_euler = rot
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.context.view_layer.update()
    foot = (r.matrix_world @ r.pose.bones['LegL'].tail).z
    print('posed foot z', foot, '(should be below the seat, < 0)')
    shoot(cam, tgt, 30, 12, J('r_pose34.png'))
    shoot(cam, tgt, 90, 4, J('r_pose_side.png'))
    shoot(cam, tgt, 150, 20, J('r_pose_back.png'))
    sheet(J('sheet_pose.png'), [J('r_pose34.png'), J('r_pose_side.png'), J('r_pose_back.png')], ['piernas 60 grados, cabeza 0.2 rad, cola girada', 'costado', 'atras'])
