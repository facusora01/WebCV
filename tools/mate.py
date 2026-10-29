# The mate and the thermos of the WebCV room, modelled from scratch in Blender.
#
# Same method as tools/motibot.py and tools/dogs.py: low-poly bases (rings of a few
# vertices turned round an axis, extruded along a path) shaped vertex by vertex with
# bmesh, flat-shaded, coloured per face by materials. No image textures: even the
# thermos sticker is made of flat polygons, one per colour, wrapped onto the surface.
#
#   mate:    an egg-shaped gourd in a wide flared virola (the metal rim), a wire stand
#            (a belt under the rim, three teardrop loops down the sides to three little
#            ringed feet), the yerba in a "montañita": piled high at the back, low at the
#            front, where the water is poured and the bombilla goes in, leaning out
#            toward you (+z in glTF). The bombilla: a steel straw with a gold ring and a
#            flattened mouthpiece. The water is its own mesh ("Water"); the room raises
#            it as the mate is filled. extras: tip (mouthpiece), pour (where the water
#            lands), both in metres in the model's own space.
#   thermos: a hammered-green Stanley-style flask, steel base and neck, black cap with a
#            green pour spout (+x), a folding black handle (-x), a red badge with a black
#            bull's head facing +z. extras: spout.
#
#   blender -b -P tools/mate.py -- --out public/models [--sheets tools/mate-sheets]
#   npx -y @gltf-transform/cli@4 optimize X_raw.glb public/models/X.glb --compress meshopt \
#       --simplify false --join false --flatten false --palette false
#
# Built in centimetres, Blender axes (x right, -y front = glTF +z, z up), scaled to
# metres on export. The origin is the middle of the base, on the table.
import bpy, bmesh, sys, math, os, random
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
def arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default
OUT = arg('--out')
SHEETS = arg('--sheets')
REFS = arg('--refs', os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'images', 'Reference', 'mate'))
ENGINE = arg('--engine', 'EEVEE')
V = Vector
CM = 0.01

PAL = {
    'gourd': ('4f2018', 0.35, 0), 'virola': ('d8cca0', 0.3, 0.6), 'wire': ('c8c9cc', 0.3, 0.8),
    'steel': ('c3c6cb', 0.25, 0.85), 'gold': ('c9a04e', 0.3, 0.7),
    'yerba': ('9c9b5c', 1.0, 0), 'yerba_dark': ('7b7f46', 1.0, 0), 'palo': ('c6b16d', 1.0, 0),
    'yerba_low': ('8f9152', 1.0, 0), 'water': ('3b3a1d', 0.05, 0),
    'green': ('33504a', 0.5, 0.15), 'black': ('1c1d20', 0.6, 0), 'spout': ('2f7a45', 0.5, 0),
    'red': ('cf3b3d', 0.6, 0), 'bull': ('161618', 0.6, 0), 'cream': ('efe3cf', 0.6, 0),
}
MI = {n: i for i, n in enumerate(PAL)}

def lin(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]

def make_materials():
    mats = []
    for n, (h, rough, metal) in PAL.items():
        m = bpy.data.materials.new(n)
        if m.node_tree is None: m.use_nodes = True
        b = m.node_tree.nodes.get('Principled BSDF')
        b.inputs['Base Color'].default_value = (*lin(h), 1)
        b.inputs['Roughness'].default_value = rough
        b.inputs['Metallic'].default_value = metal
        if n == 'water':
            b.inputs['Alpha'].default_value = 0.8
            try: m.surface_render_method = 'BLENDED'
            except Exception: pass
            try: m.blend_method = 'BLEND'
            except Exception: pass
        m.diffuse_color = (*lin(h), 1)
        m.use_backface_culling = True
        mats.append(m)
    return mats

# ---------------------------------------------------------------- mesh helpers
def smooth(e0, e1, x):
    t = min(1.0, max(0.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)

def lathe(bm, prof, sides, mats, closed=False, cap0=True, cap1=True, phase=0.0, center=V((0, 0, 0)), squash=(1, 1)):
    """Turns a profile [(r, z), ...] round the z axis: one ring of `sides` vertices per
    point. mats[i] colours the band from point i to i+1. closed joins the last point
    back to the first (a hollow band, like a rim)."""
    rings = []
    for r, z in prof:
        rings.append([bm.verts.new(center + V((r * squash[0] * math.cos(phase + 2 * math.pi * k / sides),
                                               r * squash[1] * math.sin(phase + 2 * math.pi * k / sides), z))) for k in range(sides)])
    n = len(rings)
    for i in range(n if closed else n - 1):
        a, b = rings[i], rings[(i + 1) % n]
        for k in range(sides):
            f = bm.faces.new((a[k], a[(k + 1) % sides], b[(k + 1) % sides], b[k]))
            f.material_index = MI[mats[min(i, len(mats) - 1)]]
    if not closed:
        if cap0: bm.faces.new(list(reversed(rings[0]))).material_index = MI[mats[0]]
        if cap1: bm.faces.new(rings[-1]).material_index = MI[mats[-1]]
    return rings

def frames(pts):
    T = [(pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized() for i in range(len(pts))]
    up = V((0, 0, 1)) if abs(T[0].z) < 0.9 else V((1, 0, 0))
    N = [(up - T[0] * up.dot(T[0])).normalized()]
    for i in range(1, len(pts)):
        N.append((N[-1] - T[i] * N[-1].dot(T[i])).normalized())
    return T, N

def tube(bm, pts, radii, sides, mats, phase=0.0, ref_up=None, closed_loop=False):
    """A tube through pts (rings extruded one after the other); radii[i] = r or (w, h)."""
    T, N = frames(pts)
    if ref_up is not None:
        for i in range(len(pts)):
            n = ref_up - T[i] * ref_up.dot(T[i])
            if n.length > 1e-4: N[i] = n.normalized()
    rings = []
    for i, p in enumerate(pts):
        B = T[i].cross(N[i])
        rw, rh = radii[i] if isinstance(radii[i], tuple) else (radii[i], radii[i])
        rings.append([bm.verts.new(p + N[i] * (rh * math.sin(phase + 2 * math.pi * k / sides)) + B * (rw * math.cos(phase + 2 * math.pi * k / sides))) for k in range(sides)])
    n = len(rings)
    for i in range(n if closed_loop else n - 1):
        a, b = rings[i], rings[(i + 1) % n]
        for k in range(sides):
            f = bm.faces.new((a[k], a[(k + 1) % sides], b[(k + 1) % sides], b[k]))
            f.material_index = MI[mats[min(i, len(mats) - 1)]]
    if not closed_loop:
        bm.faces.new(list(reversed(rings[0]))).material_index = MI[mats[0]]
        bm.faces.new(rings[-1]).material_index = MI[mats[-1]]
    return rings

def catmull(P, n):
    pts = []
    for i in range(n + 1):
        t = i / n * (len(P) - 1)
        k = min(int(t), len(P) - 2); u = t - k
        p0, p1, p2, p3 = P[max(k - 1, 0)], P[k], P[k + 1], P[min(k + 2, len(P) - 1)]
        pts.append(0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3))
    return pts

def ring(bm, center, normal, R, r, mat, seg=12, sides=4):
    """A torus (a wire ring) of radius R and wire radius r around `normal`."""
    n = normal.normalized()
    a = (V((1, 0, 0)) if abs(n.x) < 0.9 else V((0, 1, 0))).cross(n).normalized()
    b = n.cross(a)
    pts = [center + (a * math.cos(2 * math.pi * k / seg) + b * math.sin(2 * math.pi * k / seg)) * R for k in range(seg)]
    tube(bm, pts, [r] * seg, sides, [mat], closed_loop=True)

def to_obj(name, bm, extras=None):
    # every part's faces point outward (with backface culling, a ring wound the wrong way
    # shows only its far side: the gold band looked like a patch on one side of the straw)
    # (the sticker is an open decal, already facing out: it is left alone)
    bmesh.ops.recalc_face_normals(bm, faces=[f for f in bm.faces if f.material_index not in (MI['red'], MI['bull'], MI['cream'])])
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    for m in MATS: me.materials.append(m)
    for p in me.polygons: p.use_smooth = False
    for v in me.vertices: v.co *= CM
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    for k, val in (extras or {}).items(): ob[k] = val
    return ob

def gltf_vec(p):
    """A Blender-space point in cm as a glTF-space list in metres."""
    return [round(p.x * CM, 4), round(p.z * CM, 4), round(-p.y * CM, 4)]

# ---------------------------------------------------------------- the mate
YERBA_Z = 8.1            # the low side of the yerba, where the water goes
BOMB_BASE = V((0.0, 0.3, 4.2))       # so it comes out of the middle of the low side
BOMB_DIR = V((0.0, -0.46, 1)).normalized()      # leaning straight out toward you (-y)
BOMB_LEN = 14.5

def yerba_height(x, y, rnd):
    """The montañita: low at the front (-y), piled up at the back, with a lumpy top."""
    back = smooth(-1.2, 2.6, y + 0.25 * x)
    return YERBA_Z + 2.3 * back + rnd.uniform(-0.18, 0.18)

def build_mate():
    rnd = random.Random(7)
    bm = bmesh.new()
    S = 14
    # the gourd: an egg, wider low down, narrowing into the rim
    gourd = [(1.7, 0.5), (3.0, 1.4), (3.85, 3.0), (4.1, 4.7), (3.9, 6.2), (3.5, 7.3), (3.2, 8.0)]
    lathe(bm, gourd, S, ['gourd'])
    # the virola: a wide band that flares out to a rolled lip, hollow inside
    vir = [(3.5, 7.35), (3.7, 7.9), (3.95, 8.8), (4.05, 9.3), (3.8, 9.5), (3.4, 9.3), (3.3, 8.5), (3.3, 7.6)]
    lathe(bm, vir, S, ['virola'], closed=True)
    # the yerba: a polar grid on top, its sides down inside the rim
    rings_r = [0, 0.9, 1.8, 2.6, 3.25]
    sectors = 16
    top = []
    for i, r in enumerate(rings_r):
        row = []
        for k in range(1 if r == 0 else sectors):
            a = 2 * math.pi * (k + 0.5 * (i % 2)) / sectors
            x, y = r * math.cos(a), r * math.sin(a)
            z = yerba_height(x, y, rnd) if i < len(rings_r) - 1 else min(yerba_height(x, y, rnd), 9.25)
            row.append(bm.verts.new((x, y, z)))
        top.append(row)
    for k in range(sectors):
        bm.faces.new((top[0][0], top[1][k], top[1][(k + 1) % sectors]))
    for i in range(1, len(rings_r) - 1):
        a, b = top[i], top[i + 1]
        for k in range(sectors):
            bm.faces.new((a[k], b[k], b[(k + 1) % sectors]))
            bm.faces.new((a[k], b[(k + 1) % sectors], a[(k + 1) % sectors]))
    rim = top[-1]
    low = [bm.verts.new((v.co.x, v.co.y, 6.5)) for v in rim]
    for k in range(sectors):
        bm.faces.new((rim[k], low[k], low[(k + 1) % sectors], rim[(k + 1) % sectors]))
    bm.faces.new(list(reversed(low)))
    yerba_faces = [f for f in bm.faces if f.material_index == 0 and all(v in set(sum(top, [])) | set(low) for v in f.verts)]
    for f in yerba_faces:
        c = f.calc_center_median()
        if c.z <= YERBA_Z + 0.55 and c.y < 0.6: f.material_index = MI['yerba_low']   # the low side, which gets wet
        else: f.material_index = MI[rnd.choice(['yerba', 'yerba', 'yerba', 'yerba_dark', 'palo'])]
    # the wire stand: a belt under the virola, three teardrop loops to three ringed feet
    WB, WR = 7.5, 0.11
    ring(bm, V((0, 0, WB)), V((0, 0, 1)), 3.42, WR, 'wire', seg=S, sides=4)
    for a0 in (math.radians(0), math.radians(120), math.radians(240)):
        loop = []
        for da, rz in ((-0.30, (3.42, WB)), (-0.14, (4.15, 4.6)), (-0.05, (3.5, 1.6)), (0.0, (3.0, 0.45)), (0.05, (3.5, 1.6)), (0.14, (4.15, 4.6)), (0.30, (3.42, WB))):
            r, z = rz
            loop.append(V((r * math.cos(a0 + da), r * math.sin(a0 + da), z)))
        tube(bm, catmull(loop, 14), [WR] * 15, 4, ['wire'])
        foot = V((3.0 * math.cos(a0), 3.0 * math.sin(a0), 0.45))
        ring(bm, foot, V((-math.sin(a0), math.cos(a0), 0)), 0.42, WR, 'wire', seg=8, sides=4)
    # the bombilla
    b0 = BOMB_BASE
    top_p = b0 + BOMB_DIR * BOMB_LEN
    bend = top_p + (BOMB_DIR + V((0, -0.35, 0))).normalized() * 1.4
    pts = [b0, b0 + BOMB_DIR * 1.2, b0 + BOMB_DIR * 6.0, b0 + BOMB_DIR * 10.0, top_p, bend]
    radii = [0.42, 0.32, 0.32, 0.32, (0.36, 0.24), (0.42, 0.18)]       # a filter at the foot, a flat mouthpiece
    tube(bm, pts, radii, 8, ['steel'], ref_up=V((0, -1, 0)))
    gp = b0 + BOMB_DIR * 10.6
    tube(bm, [gp - BOMB_DIR * 0.45, gp - BOMB_DIR * 0.3, gp + BOMB_DIR * 0.3, gp + BOMB_DIR * 0.45], [0.4, 0.52, 0.52, 0.4], 10, ['gold'])
    tip = bend
    ob = to_obj('Mate', bm, {'tip': gltf_vec(tip), 'pour': gltf_vec(V((-1.3, -1.3, YERBA_Z + 0.3)))})
    # the water: a disc the room raises as the mate is filled; the montañita stays above it
    wb = bmesh.new()
    vs = [wb.verts.new((3.2 * math.cos(2 * math.pi * k / 16), 3.2 * math.sin(2 * math.pi * k / 16), YERBA_Z)) for k in range(16)]
    wb.faces.new(vs).material_index = MI['water']
    water = to_obj('Water', wb)
    return ob, water, tip

def px(pts, k=0.028, cy=218, zc=19.8):
    """The sticker traced on the ranch's logo (pixels: x from its centre line, y down) to
    cm: x along the surface, y up."""
    return [(x * k, (cy - y) * k + zc) for x, y in pts]

def mirror(half):
    """A left half traced from the top down, closed with its mirror image."""
    return half + [(-x, y) for x, y in reversed(half) if x != 0]

# the Cabañas La Esperanza logo in the thermos sticker's colours. The bull's head, black:
# horns hooking up and out to a point, a domed brow, the face down the sides, a step in
# at the cheeks to a square muzzle with rounded corners
BULL = px(mirror([(0, 193), (-28, 197), (-53, 205), (-67, 212), (-115, 180), (-112, 204), (-104, 225), (-89, 242),
                  (-73, 252), (-72, 270), (-65, 277), (-38, 281), (-36, 318), (-29, 328), (-15, 333), (0, 334)]))
# the red outline round it
OUTLINE = px(mirror([(0, 184), (-31, 188), (-56, 196), (-66, 202), (-110, 173), (-115, 171), (-120, 172), (-123, 176),
                     (-124, 181), (-121, 205), (-112, 228), (-96, 248), (-82, 257), (-81, 270), (-78, 276), (-71, 283),
                     (-66, 286), (-47, 289), (-45, 318), (-36, 333), (-32, 336), (-18, 341), (0, 343)]))
# the chevron on the muzzle, pointing up
NOSE = px([(-16, 303), (0, 286), (16, 303), (10, 308), (0, 297), (-10, 308)])
# the red banner over the horns, its lower edge and the ranch's name on it (two lines:
# text, baseline radius, width) curved round a centre below the sticker, in logo pixels
NAME_CY = 320
BANNER = px([(127 * math.cos(math.pi * (0.04 + 0.92 * k / 16)), 162 - 69 * math.sin(math.pi * (0.04 + 0.92 * k / 16))) for k in range(17)] +
            [(165 * math.sin(a), NAME_CY - 165 * math.cos(a)) for a in (-0.555 + 1.11 * k / 12 for k in range(13))])
NAME = [('Cabañas La Esperanza', 192, 150), ('de Agropampa S.A.', 175, 100)]

def text_lines():
    """The ranch's name as flat polygons in logo pixels, each line bent round NAME_CY."""
    out = []
    for body, rad, width in NAME:
        cu = bpy.data.curves.new('name', 'FONT')
        cu.body, cu.align_x, cu.resolution_u = body, 'CENTER', 2
        ob = bpy.data.objects.new('name', cu)
        bpy.context.scene.collection.objects.link(ob)
        me = bpy.data.meshes.new_from_object(ob.evaluated_get(bpy.context.evaluated_depsgraph_get()))
        bpy.data.objects.remove(ob); bpy.data.curves.remove(cu)
        xs = [v.co.x for v in me.vertices]
        s = width / (max(xs) - min(xs))
        for v in me.vertices:
            a, r = v.co.x * s / rad, rad + v.co.y * s
            v.co = V((r * math.sin(a), NAME_CY - r * math.cos(a), 0))
        out.append(me)
    return out

def sticker_patch(bm, R):
    """A thin decal wrapped round the body: each colour is its own flat polygon (the red,
    the head over it, the chevron and the name over those, a hair further out each), cut
    into narrow upright strips so it follows the curve, then wrapped onto the surface.
    The corners are the traced points themselves, so the horns keep their tips."""
    layers = [(0, 'red', OUTLINE), (0, 'red', BANNER), (1, 'bull', BULL), (2, 'red', NOSE)]
    for me in text_lines():
        lb = bmesh.new(); lb.from_mesh(me); bpy.data.meshes.remove(me)
        for v in lb.verts: v.co.xy = px([v.co.xy])[0]
        layers.append((1, 'cream', lb))
    for lift, mat, poly in layers:
        if isinstance(poly, list):
            lb = bmesh.new()
            lb.faces.new([lb.verts.new((x, y, 0)) for x, y in poly])
            xs = [x for x, _ in poly]
            for i in range(int(min(xs) / 0.3), int(max(xs) / 0.3) + 1):
                bmesh.ops.bisect_plane(lb, geom=lb.verts[:] + lb.edges[:] + lb.faces[:], plane_co=(i * 0.3, 0, 0), plane_no=(1, 0, 0))
        else: lb = poly
        bmesh.ops.triangulate(lb, faces=lb.faces[:], ngon_method='EAR_CLIP')
        rr = R + 0.035 + 0.015 * lift
        for v in lb.verts:
            x, y, _ = v.co
            v.co = V((rr * math.sin(x / R), -rr * math.cos(x / R), y))
        lb.normal_update()
        for f in lb.faces:
            f.material_index = MI[mat]
            if f.normal.dot(f.calc_center_median() * V((1, 1, 0))) < 0: f.normal_flip()   # facing out from the body
        me = bpy.data.meshes.new('sticker'); lb.to_mesh(me); lb.free()
        bm.from_mesh(me); bpy.data.meshes.remove(me)

# ---------------------------------------------------------------- the thermos
def build_thermos():
    bm = bmesh.new()
    S = 24
    R = 4.6
    lathe(bm, [(4.2, 0.0), (4.45, 0.4), (4.45, 4.3)], S, ['steel'], cap1=False)
    body = [(4.45, 4.3), (R, 4.5)] + [(R, z / 2) for z in range(30, 50)] + [(R, 27.0), (4.35, 28.4), (3.75, 29.4)]   # rings where the badge goes
    lathe(bm, body, S, ['green'], cap0=False, cap1=False)
    lathe(bm, [(3.75, 29.4), (3.55, 29.7), (3.55, 30.6), (3.4, 30.8), (3.55, 31.0), (3.55, 31.9), (3.4, 32.1), (3.55, 32.3), (3.55, 33.0)], S, ['steel'], cap0=False, cap1=False)
    lathe(bm, [(3.55, 33.0), (3.8, 33.1), (3.8, 34.6), (3.5, 35.0), (3.0, 35.1)], S, ['black'], cap0=False)
    # the pour spout, on the edge of the cap, toward +x
    d = V((0.55, 0, 1)).normalized()
    s0 = V((2.2, 0, 34.6))
    tube(bm, [s0, s0 + d * 1.4, s0 + d * 2.6], [0.75, 0.62, 0.5], 8, ['spout'])
    spout = s0 + d * 2.7
    # the folding handle on the -x side: two hinges and a flat bar
    for z in (6.0, 25.0):
        tube(bm, [V((-R + 0.3, 0, z)), V((-R - 0.9, 0, z))], [(0.5, 0.35)] * 2, 4, ['steel'], ref_up=V((0, 0, 1)))
    hp = [V((-R - 0.6, 0, 25.0)), V((-R - 1.6, 0, 24.0)), V((-R - 2.1, 0, 21.0)), V((-R - 2.1, 0, 10.0)), V((-R - 1.6, 0, 7.0)), V((-R - 0.6, 0, 6.0))]
    tube(bm, catmull(hp, 10), [(0.75, 0.38)] * 11, 4, ['black'], phase=math.pi / 4, ref_up=V((1, 0, 0)))
    # the sticker, facing -y (glTF +z): the ranch's logo, a black bull's head with a red
    # chevron for the nostrils inside a red outline, under a red banner with its name.
    # Traced from the logo in pixels and laid out in cm along the surface.
    sticker_patch(bm, R)
    return to_obj('Thermos', bm, {'spout': gltf_vec(spout)}), spout

# ---------------------------------------------------------------- export and sheets
def export(objs, path):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_yup=True,
                              export_texcoords=False, export_normals=True, export_materials='EXPORT', export_extras=True)

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
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.85, 0.85, 0.88, 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.6
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    sun.data.energy = 3.0; sun.data.angle = math.radians(15)
    sun.rotation_euler = V((-0.5, -0.7, 0.9)).to_track_quat('Z', 'Y').to_euler()
    sc.collection.objects.link(sun)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    sc.collection.objects.link(cam); sc.camera = cam
    return cam

def shoot(cam, target, az, el, dist, path, lens=60):
    a, e = math.radians(az), math.radians(el)
    d = V((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))
    cam.location = target + d * dist
    cam.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    cam.data.lens = lens
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)

def sheet(out, panels, labels, bg=(200, 200, 205)):
    from PIL import Image, ImageDraw
    ims = []
    for p in panels:
        im = Image.open(p).convert('RGBA')
        if p.endswith('.png'):
            a = im.getchannel('A').getbbox()
            if a: im = im.crop(a)
            base = Image.new('RGBA', im.size, bg + (255,)); base.alpha_composite(im); im = base
        s = max(im.size); m = int(s * 0.06)
        sq = Image.new('RGBA', (s + 2 * m, s + 2 * m), bg + (255,))
        sq.paste(im, ((s - im.size[0]) // 2 + m, (s - im.size[1]) // 2 + m))
        ims.append(sq.resize((460, 460)))
    W = Image.new('RGB', (470 * len(ims) + 10, 500), (40, 44, 52))
    dr = ImageDraw.Draw(W)
    for i, (im, lb) in enumerate(zip(ims, labels)):
        W.paste(im.convert('RGB'), (10 + i * 470, 10))
        dr.text((18 + i * 470, 478), lb, fill=(230, 230, 230))
    W.save(out)

bpy.ops.wm.read_factory_settings(use_empty=True)
MATS = make_materials()
J = os.path.join
mate, water, tip = build_mate()
water.data.vertices.foreach_set('co', [c for v in water.data.vertices for c in (v.co + V((0, 0, 0.003)))])  # a fill, for the sheets
thermos, spout = build_thermos()
thermos.location.x = 0.16
for o, n in ((mate, 'mate'), (thermos, 'thermos')):
    print(n, len(o.data.vertices), 'verts', sum(len(p.vertices) - 2 for p in o.data.polygons), 'tris')
if OUT:
    loc = thermos.location.copy(); thermos.location = (0, 0, 0)
    for v in water.data.vertices: v.co.z -= 0.003
    export([mate, water], J(OUT, 'mate_raw.glb'))
    export([thermos], J(OUT, 'thermos_raw.glb'))
    thermos.location = loc
    for v in water.data.vertices: v.co.z += 0.003
if SHEETS:
    os.makedirs(SHEETS, exist_ok=True)
    cam = setup_render()
    mt, tt = V((0, 0, 0.09)), V((0.16, 0, 0.175))
    thermos.hide_render = True
    shoot(cam, mt, 15, 25, 0.75, J(SHEETS, 'm_34.png'))
    shoot(cam, mt, 0, 60, 0.75, J(SHEETS, 'm_top.png'))
    shoot(cam, mt, 90, 8, 0.75, J(SHEETS, 'm_side.png'))
    sheet(J(SHEETS, 'sheet_mate.png'), [J(SHEETS, 'm_34.png'), J(REFS, 'mateReference.jpeg'), J(SHEETS, 'm_top.png'), J(SHEETS, 'm_side.png')],
          ['mate 3/4', 'referencia', 'desde arriba: montanita atras, bombilla adelante', 'costado: la bombilla sale hacia adelante'])
    thermos.hide_render = False; mate.hide_render = True; water.hide_render = True
    shoot(cam, tt, 0, 8, 1.2, J(SHEETS, 't_front.png'))
    shoot(cam, tt, 35, 15, 1.2, J(SHEETS, 't_34.png'))
    shoot(cam, V((0.16, 0, 0.198)), 0, 3, 0.3, J(SHEETS, 't_badge.png'))
    shoot(cam, V((0.16, 0, 0.198)), 40, 3, 0.3, J(SHEETS, 't_badge34.png'))
    from PIL import Image
    Image.open(J(REFS, 'thermoReference.jpeg')).crop((230, 500, 700, 900)).save(J(SHEETS, 'badge_ref.png'))
    sheet(J(SHEETS, 'sheet_badge.png'), [J(SHEETS, 't_badge.png'), J(SHEETS, 'badge_ref.png'), J(SHEETS, 't_badge34.png')], ['sticker', 'referencia', 'sticker 3/4'])
    sheet(J(SHEETS, 'sheet_thermos.png'), [J(SHEETS, 't_front.png'), J(REFS, 'thermoReference.jpeg'), J(SHEETS, 't_34.png'), J(REFS, 'thermoPerspective.jpeg')],
          ['termo de frente', 'referencia', 'termo 3/4', 'referencia'])
