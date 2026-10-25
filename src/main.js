import * as THREE from 'three';
import { buildRoom } from './room.js';
import { createUI } from './ui.js';
import { createAudio } from './audio.js';
import { createTerminal } from './terminal.js';
import { hotspots as HOTSPOTS } from './content.js';
import './style.css';

const canvas = document.getElementById('scene');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;

const audio = createAudio();
const api = {}; // filled by start(); the UI exists first so it can show the fallback
const ui = createUI({
  audio,
  onFocus: (id) => api.activate?.(id),
  onLang: () => api.setLang?.(),
  onTermKey: (e) => api.key?.(e) ?? false
});
const terminal = createTerminal({ getLang: ui.lang, onExit: () => api.back?.() });

// on low-density displays edges get MSAA instead of extra resolution (see maxScale)
const msaa = devicePixelRatio < 2;
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: msaa, powerPreference: 'high-performance' });
} catch {
  ui.noWebgl();
}
if (renderer) {
  // canvases in the scene use these fonts; give them a moment to arrive
  Promise.race([
    Promise.all(['72px Caveat', '19px "JetBrains Mono"', '48px Fraunces', '20px Inter'].map((f) => document.fonts.load(f))),
    new Promise((r) => setTimeout(r, 1500))
  ]).finally(start);
}

function start() {
  // Browsers without GPU acceleration fall back to a software renderer: start small there.
  const gl = renderer.getContext();
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const software = /swiftshader|basic render|llvmpipe|software/i.test(dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '');
  const lowPower = software || coarse || navigator.hardwareConcurrency <= 4;
  // MSAA already smooths the edges: rendering more pixels on top of it roughly doubles the cost
  const maxScale = Math.min(devicePixelRatio, lowPower ? 1.25 : msaa ? 1 : 1.5);
  let scale = software ? Math.min(maxScale, 0.6) : maxScale;
  renderer.setPixelRatio(scale);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = lowPower ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  // the room hardly moves: shadows are re-rendered only when something asks for it
  // Shadows are re-rendered per light, only when that light's casters moved: the room
  // sun when furniture moves, the hallway sun while the visitor and the door move.
  const lights = [];
  const shadowsDirty = () => { for (const l of lights) l.shadow.needsUpdate = true; };
  const shadowSize = software ? 512 : lowPower ? 1024 : 2048;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#1a1714');
  const camera = new THREE.PerspectiveCamera(60, 1, 0.02, 60);
  camera.rotation.order = 'YXZ';

  scene.add(new THREE.HemisphereLight('#fff1dd', '#c9ab90', 1.1));
  // late-afternoon sun through the bedroom window
  const sun = new THREE.DirectionalLight('#ffc98f', 3.2);
  sun.position.set(-6, 4.4, -0.8);
  sun.target.position.set(0, 0.3, -0.4);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(shadowSize);
  Object.assign(sun.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 14 });
  sun.shadow.bias = -0.0006;
  sun.shadow.autoUpdate = false;
  lights.push(sun);
  scene.add(sun, sun.target);
  // the hallway sun, through a window behind the visitor; it throws the visitor's shadow on the wall
  const hallSun = new THREE.DirectionalLight('#ffd9a8', 3.6);
  hallSun.position.set(4.23, 1.53, 9.34);
  hallSun.target.position.set(-0.2, 1.0, 2.7);
  hallSun.castShadow = true;
  hallSun.shadow.mapSize.setScalar(shadowSize);
  Object.assign(hallSun.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -2.5, near: 3, far: 14 });
  hallSun.shadow.bias = -0.0006;
  hallSun.shadow.autoUpdate = false;
  lights.push(hallSun);
  scene.add(hallSun, hallSun.target);

  const room = buildRoom(scene, { lowPower, terminal, getLang: ui.lang, avatarUrl: `${import.meta.env.BASE_URL}images/ProfilePicture.png` });
  shadowsDirty();
  THREE.DefaultLoadingManager.onLoad = shadowsDirty; // models arrive later

  // ---------- views ----------
  const DOOR_VIEW = { pos: new THREE.Vector3(0.95, 1.6, 3.95), look: new THREE.Vector3(0.7, 1.38, 1.9) };
  const STAND = new THREE.Vector3(0.75, 1.6, 1.3);
  let yaw = 0, pitch = 0;
  const UP = new THREE.Vector3(0, 1, 0);
  const lookQuat = (from, to, up = UP) => new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(from, to, up));
  camera.far = 2.4; // the closed door is ~2 m away: nothing behind it is drawn until it opens
  camera.updateProjectionMatrix();
  camera.position.copy(DOOR_VIEW.pos);
  camera.quaternion.copy(lookQuat(DOOR_VIEW.pos, DOOR_VIEW.look));

  const spots = Object.entries(room.hotspots).map(([id, h]) => ({ id, zone: HOTSPOTS[id]?.zone || null, ...h }));
  const byId = Object.fromEntries(spots.map((s) => [s.id, s]));
  scene.updateMatrixWorld(true);
  for (const s of spots) s.anchorWorld = s.group.localToWorld(new THREE.Vector3(...s.anchor));
  ui.buildMarkers(spots.filter((s) => s.kind !== 'toggle').map((s) => s.id));

  // ---------- timeline ----------
  const clock = new THREE.Clock();
  let tweens = [];
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
  function tween(dur, fn, delay = 0) {
    return new Promise((done) => tweens.push({ start: clock.elapsedTime + delay, dur: reducedMotion ? 0.01 : dur, fn, done }));
  }
  function flyTo(pos, quat, dur = 1.0) {
    const p0 = camera.position.clone(), q0 = camera.quaternion.clone();
    return tween(dur, (e) => { camera.position.lerpVectors(p0, pos, e); camera.quaternion.slerpQuaternions(q0, quat, e); });
  }

  // ---------- navigation: a stack of views, room → zone → thing ----------
  // Each entry remembers where the camera was, so stepping back returns there.
  let mode = 'door';
  let zone = null;
  let zoneLook = null; // at a zone you can look around a little: offsets from its base direction
  const stack = [];
  // reading something up close (a screen, a card) renders at full resolution: the
  // camera is still, so the extra pixels cost nothing that matters
  const CLOSE = ['screen', 'terminal', 'inspect', 'wallet'];
  const setMode = (m) => {
    const was = CLOSE.includes(mode), now = CLOSE.includes(m);
    mode = m;
    terminal.active = m === 'terminal';
    ui.setMode(m);
    if (was !== now) { renderer.setPixelRatio(now ? Math.min(devicePixelRatio, 2) : scale); resize(); }
  };
  function push(m, extra = {}) {
    stack.push({ mode, zone, pos: camera.position.clone(), quat: camera.quaternion.clone(), ...extra });
    setMode(m);
  }
  function back() {
    const top = stack.pop();
    if (!top) return;
    if (mode === 'inspect') closeInspect();
    if (top.backpack) closeBackpack(top.backpack);
    if (mode === 'wallet') closeWallet();
    if (top.holding) putDownController();
    if (mode === 'screen' || mode === 'terminal') {
      const app = byId[top.focus]?.app;
      if (app) app.focused = false;
      byId.tv.app.setMode('turnero');
    }
    zone = top.zone;
    setMode(top.mode);
    if (top.mode === 'room') flyTo(STAND, new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ')));
    else if (!top.keepCamera) flyTo(top.pos, top.quat);
  }

  // Camera in front of a screen, close enough that it fills most of the view.
  function screenView(s) {
    const q = s.mesh.getWorldQuaternion(new THREE.Quaternion());
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    const target = s.mesh.getWorldPosition(new THREE.Vector3()).addScaledVector(up, s.shift || 0);
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const [w, h] = s.size;
    const d = Math.max(h / (2 * tan), w / (2 * tan * camera.aspect)) * 1.04;
    const pos = target.clone().addScaledVector(normal, d);
    return { pos, quat: lookQuat(pos, target, up) };
  }

  function activate(id) {
    if (mode === 'door' || mode === 'entering') return;
    const s = byId[id];
    if (!s) return;
    if (s.kind === 'toggle') { s.toggle(); audio.click(); return; }
    if (s.sound === 'bark') audio.bark();
    s.react?.();
    if (s.kind === 'zone') {
      push('zone');
      zone = id;
      const p = new THREE.Vector3(...s.view.pos);
      const q = lookQuat(p, new THREE.Vector3(...s.view.look));
      const e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
      zoneLook = { yaw0: e.y, pitch0: e.x, yaw: 0, pitch: 0, maxYaw: s.view.yaw, minPitch: s.view.pitch[0] - e.x, maxPitch: s.view.pitch[1] - e.x };
      flyTo(p, q);
    } else if (s.kind === 'screen' || s.kind === 'tvmode' || s.kind === 'terminal') {
      const target = s.kind === 'tvmode' ? byId.tv : s;
      if (target === byId.tv) target.app.setMode(s.kind === 'tvmode' ? s.mode : 'turnero');
      if (target.app) target.app.focused = true;
      push(s.kind === 'terminal' ? 'terminal' : 'screen', { focus: target.id, holding: id === 'ps5' });
      const v = screenView(target);
      flyTo(v.pos, v.quat);
      if (id === 'ps5') pickUpController(v);
      if (s.kind === 'terminal') { terminal.dirty = true; ui.focusTerminal(); }
    } else if (s.kind === 'inspect') {
      push('inspect', { keepCamera: true });
      openInspect(s.from || s.group, s.pages, s.aspect);
    } else if (s.kind === 'wallet') {
      openWallet();
    } else if (s.kind === 'backpack') {
      openBackpack(s);
    }
  }

  // ---------- inspect: a thing flies to the middle of the view; clicking turns it over ----------
  const inspectMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true, toneMapped: false, depthTest: false }));
  inspectMesh.visible = false;
  inspectMesh.renderOrder = 10;
  scene.add(inspectMesh);
  const insp = { from: null, pages: [], page: 0, aspect: 1, size: new THREE.Vector2(), busy: false };
  function inspectTarget() {
    const d = 0.45;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const visH = 2 * d * tan, visW = visH * camera.aspect;
    let h = visH * 0.54, w = h * insp.aspect;
    if (w > visW * 0.68) { w = visW * 0.68; h = w / insp.aspect; }
    insp.size.set(w, h);
    return { pos: camera.position.clone().add(new THREE.Vector3(0, 0, -d).applyQuaternion(camera.quaternion)), quat: camera.quaternion.clone() };
  }
  function openInspect(from, pages, aspect) {
    Object.assign(insp, { from, pages, page: 0, aspect });
    inspectMesh.material.map = pages[0].tex;
    inspectMesh.material.needsUpdate = true;
    const start = from.getWorldPosition(new THREE.Vector3());
    const t = inspectTarget();
    inspectMesh.visible = true;
    if (room.wallet.cards.includes(from) || from === byId.backpack.notebook) from.visible = false; // it left its slot / the bag
    tween(0.7, (e) => {
      inspectMesh.position.lerpVectors(start, t.pos, e);
      inspectMesh.quaternion.copy(t.quat);
      inspectMesh.scale.set(insp.size.x * (0.15 + 0.85 * e), insp.size.y * (0.15 + 0.85 * e), 1);
    });
  }
  async function flipInspect() {
    if (insp.busy || insp.pages.length < 2) return;
    insp.busy = true;
    audio.click();
    await tween(0.18, (e) => { inspectMesh.scale.x = insp.size.x * (1 - e); });
    insp.page = (insp.page + 1) % insp.pages.length;
    inspectMesh.material.map = insp.pages[insp.page].tex;
    await tween(0.18, (e) => { inspectMesh.scale.x = insp.size.x * e; });
    insp.busy = false;
  }
  function closeInspect() {
    if (!inspectMesh.visible) return; // stepped back before anything was picked up
    const end = insp.from.getWorldPosition(new THREE.Vector3());
    const p0 = inspectMesh.position.clone(), from = insp.from;
    tween(0.5, (e) => {
      inspectMesh.position.lerpVectors(p0, end, e);
      inspectMesh.scale.set(insp.size.x * (1 - 0.85 * e), insp.size.y * (1 - 0.85 * e), 1);
    }).then(() => { inspectMesh.visible = false; from.visible = true; });
  }

  // ---------- the backpack: it comes to you, unzips, and the notebook comes out ----------
  async function openBackpack(s) {
    push('inspect', { keepCamera: true, backpack: s });
    inspectMesh.visible = false;
    const g = s.group;
    s.home ??= { pos: g.position.clone(), quat: g.quaternion.clone() };
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).setY(0).normalize();
    const pos = camera.position.clone().addScaledVector(fwd, 0.85).setY(camera.position.y - 0.62);
    const yaw = Math.atan2(camera.position.x - pos.x, camera.position.z - pos.z); // front pocket towards you
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0));
    const p0 = g.position.clone(), q0 = g.quaternion.clone();
    await tween(0.8, (e) => { g.position.lerpVectors(p0, pos, e); g.position.y += Math.sin(e * Math.PI) * 0.15; g.quaternion.slerpQuaternions(q0, q, e); shadowsDirty(); });
    audio.click();
    s.opening.visible = s.pull.visible = true;
    await tween(0.6, (e) => zipTo(s, e));
    s.notebook.visible = true;
    await tween(0.6, (e) => { s.notebook.position.y = s.top - 0.12 + 0.3 * e; });
    if (mode === 'inspect') openInspect(s.notebook, s.pages, s.aspect);
  }
  // the pull slides along the zipper's curve and the opening is drawn in behind it
  function zipTo(s, k) {
    if (!s.zip) return;
    s.pull.position.copy(s.zip.curve.getPointAt(Math.max(0.001, k)));
    s.pull.position.y -= 0.012;
    s.opening.geometry.setDrawRange(0, Math.floor((s.zip.count / 3) * k) * 3);
  }
  async function closeBackpack(s) {
    await new Promise((r) => setTimeout(r, reducedMotion ? 0 : 500)); // the notebook flies back first
    await tween(0.5, (e) => { s.notebook.position.y = s.top + 0.18 - 0.3 * e; });
    s.notebook.visible = false;
    await tween(0.5, (e) => zipTo(s, 1 - e));
    s.opening.visible = s.pull.visible = false;
    const g = s.group, p0 = g.position.clone(), q0 = g.quaternion.clone();
    await tween(0.8, (e) => { g.position.lerpVectors(p0, s.home.pos, e); g.position.y += Math.sin(e * Math.PI) * 0.15; g.quaternion.slerpQuaternions(q0, s.home.quat, e); shadowsDirty(); });
  }

  // ---------- the controller: picked up from the PC tower, held low in front of you ----------
  function pickUpController(view) {
    const g = byId.ps5.group;
    g.userData.home ??= { parent: g.parent, pos: g.position.clone(), quat: g.quaternion.clone() };
    scene.attach(g);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(view.quat);
    const down = new THREE.Vector3(0, -1, 0).applyQuaternion(view.quat);
    // held low: only its top edge peeks into the bottom of the view while you use the TV
    const pos = view.pos.clone().addScaledVector(fwd, 0.3).addScaledVector(down, 0.205);
    // tilted towards you, like it is in your hands
    const quat = view.quat.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(1.0, 0, 0)));
    const p0 = g.position.clone(), q0 = g.quaternion.clone();
    tween(1.0, (e) => { g.position.lerpVectors(p0, pos, e); g.quaternion.slerpQuaternions(q0, quat, e); shadowsDirty(); });
  }
  function putDownController() {
    const g = byId.ps5.group, home = g.userData.home;
    const pos = home.parent.localToWorld(home.pos.clone());
    const quat = home.parent.getWorldQuaternion(new THREE.Quaternion()).multiply(home.quat);
    const p0 = g.position.clone(), q0 = g.quaternion.clone();
    tween(0.9, (e) => { g.position.lerpVectors(p0, pos, e); g.quaternion.slerpQuaternions(q0, quat, e); shadowsDirty(); })
      .then(() => { home.parent.attach(g); g.position.copy(home.pos); g.quaternion.copy(home.quat); });
  }

  // ---------- the wallet ----------
  function openWallet() {
    push('wallet');
    const w = room.wallet;
    const center = w.group.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0.14, 0.22, 0.05));
    const pos = center.clone().add(new THREE.Vector3(0.33, 0.04, 0));
    w.layout(pos, center);
    flyTo(pos, lookQuat(pos, center));
    const k0 = w.k;
    tween(1.6, (e) => w.set(k0 + (1 - k0) * e), 0.3);
  }
  function closeWallet() {
    const w = room.wallet, k0 = w.k;
    tween(0.8, (e) => w.set(k0 * (1 - e)));
  }

  // ---------- the door ----------
  async function enter() {
    if (mode !== 'door') return;
    setMode('entering');
    camera.far = 40;
    camera.updateProjectionMatrix();
    // Hiding the hallway sun once inside changes the number of lights, which makes every
    // material recompile mid-animation. Compile that version now, while the door opens.
    hallSun.visible = false;
    renderer.compileAsync(scene, camera);
    hallSun.visible = true;
    audio.click();
    const { handle, hinge } = room.door;
    await tween(0.3, (e) => { handle.rotation.z = -0.55 * e; });
    tween(0.4, (e) => { handle.rotation.z = -0.55 * (1 - e); }, 0.5);
    tween(1.9, (e) => { hinge.rotation.y = -1.5 * e; });
    const path = new THREE.CatmullRomCurve3([DOOR_VIEW.pos.clone(), new THREE.Vector3(0.95, 1.6, 2.7), new THREE.Vector3(0.9, 1.6, 1.9), STAND.clone()]);
    const q0 = camera.quaternion.clone(), q1 = lookQuat(STAND, new THREE.Vector3(-1.2, 1.0, -1.3));
    await tween(3.2, (e) => {
      camera.position.copy(path.getPoint(e));
      camera.quaternion.slerpQuaternions(q0, q1, Math.min(1, e * 1.25));
    }, 0.5);
    const eul = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    yaw = eul.y; pitch = eul.x;
    setMode('room');
    // the door swings shut behind you; the hallway is gone for good
    audio.click();
    await tween(1.2, (e) => { hinge.rotation.y = -1.5 * (1 - e); });
    room.hall.visible = false;
    hallSun.visible = false;
    shadowsDirty();
  }

  Object.assign(api, {
    activate: (id) => activate(byId[id]?.zone && mode === 'room' ? byId[id].zone : id),
    back,
    setLang: () => { room.setLang(); terminal.relang(); terminal.dirty = true; },
    key: (e) => {
      if (e.key === 'Escape') { back(); return true; }
      return mode === 'terminal' ? terminal.key(e) : false;
    }
  });

  // ---------- pointer: look around, hover, click ----------
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let drag = null;
  const vel = { x: 0, y: 0 };
  const groups = spots.map((s) => s.group);
  let rect = canvas.getBoundingClientRect(); // refreshed on resize
  function hit(e, targets) {
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObjects(targets, true).find((h) => h.object.visible) || null;
  }
  const spotOf = (o) => { while (o && !o.userData.hotspot) o = o.parent; return o ? o.userData.hotspot : null; };
  // what can be clicked right now (things on a desk count as the desk until you walk up to it)
  function clickable(e) {
    if (mode === 'door') return spotOf(hit(e, [room.door.handle, room.door.sign])?.object);
    if (mode === 'room') { const id = spotOf(hit(e, groups)?.object); return byId[id]?.zone || id; }
    if (mode === 'zone') return spotOf(hit(e, spots.filter((s) => s.zone === zone).map((s) => s.group))?.object);
    return null;
  }
  canvas.addEventListener('open-door', enter);
  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, moved: 0 };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      const k = coarse ? 0.006 : 0.004;
      if (mode === 'room' && drag.moved > 4) {
        vel.x = dx * k; vel.y = dy * k;
        yaw += vel.x; pitch += vel.y;
      } else if (mode === 'zone' && drag.moved > 4 && !tweens.length) {
        zoneLook.yaw = THREE.MathUtils.clamp(zoneLook.yaw + dx * k, -zoneLook.maxYaw, zoneLook.maxYaw);
        zoneLook.pitch = THREE.MathUtils.clamp(zoneLook.pitch + dy * k, zoneLook.minPitch, zoneLook.maxPitch);
      }
      return;
    }
    if (e.pointerType !== 'touch') hoverEvent = e; // raycast once per frame, in the loop
  });
  // hover: what is under the pointer, for the cursor and the markers
  let hoverEvent = null, hovered, cursor;
  function hover(e) {
    if (!ui.ready()) return;
    const id = clickable(e);
    let over = !!id;
    if (mode === 'screen' || mode === 'terminal') over = !!hit(e, [byId[stack.at(-1).focus].mesh]);
    if (mode === 'inspect') over = !!hit(e, [inspectMesh]);
    if (mode === 'wallet') over = !!hit(e, room.wallet.cards);
    const c = over ? 'pointer' : mode === 'room' || mode === 'zone' ? 'grab' : 'default';
    if (c !== cursor) canvas.style.cursor = cursor = c;
    if (id !== hovered) ui.hover(hovered = id);
  }
  canvas.addEventListener('pointerup', (e) => {
    const d = drag;
    drag = null;
    if (!d || d.moved > 6 || !ui.ready()) return;
    if (mode === 'door') {
      const id = clickable(e);
      if (id === 'handle') enter();
      else if (id === 'sign') room.door.sign.userData.push();
    } else if (mode === 'room') {
      const id = clickable(e);
      if (id) activate(id);
    } else if (mode === 'zone') {
      const id = clickable(e);
      if (id) activate(id); else back();
    } else if (mode === 'screen' || mode === 'terminal') {
      const s = byId[stack.at(-1).focus];
      const h = hit(e, [s.mesh]);
      if (!h) back();
      else if (mode === 'terminal') ui.focusTerminal();
      else if (s.mesh.userData.screen.click(h.uv.x, h.uv.y)) audio.click();
    } else if (mode === 'inspect') {
      if (hit(e, [inspectMesh])) flipInspect(); else back();
    } else if (mode === 'wallet') {
      const h = hit(e, room.wallet.cards);
      if (!h) return back();
      push('inspect', { keepCamera: true });
      openInspect(h.object, h.object.userData.pages, 512 / 322);
    }
  });

  // ---------- loop ----------
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    rect = canvas.getBoundingClientRect();
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 78 : 60;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  const v = new THREE.Vector3();
  let lastShadow = 0, frames = 0, fpsSince = 0, smooth = 0;
  // what the camera can see, so the room skips redrawing screens that are out of view
  const frustum = new THREE.Frustum(), projView = new THREE.Matrix4();
  const view = { sees: (o) => frustum.intersectsObject(o) };
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    room.dogs.lookAt.copy(camera.position);
    frustum.setFromProjectionMatrix(projView.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    room.update(t, dt, view);

    tweens = tweens.filter((tw) => {
      if (t < tw.start) return true;
      const k = Math.min(1, (t - tw.start) / tw.dur);
      tw.fn(ease(k));
      if (k === 1) { tw.done(); return false; }
      return true;
    });
    // the visitor breathes and the door moves: refresh their shadows, ~15 times a second
    if (mode === 'door' && t - lastShadow > 1 / 15) { lastShadow = t; hallSun.shadow.needsUpdate = true; }
    if (mode === 'entering' && t - lastShadow > 1 / 15) { lastShadow = t; shadowsDirty(); }

    // dynamic resolution: if frames are slow, render fewer pixels (never below half)
    frames++;
    if (t - fpsSince > 2) {
      const fps = frames / (t - fpsSince);
      frames = 0; fpsSince = t;
      // fewer pixels when frames drop; more again after a couple of smooth stretches
      smooth = fps > 57 ? smooth + 1 : 0;
      if (!CLOSE.includes(mode)) {
        if (fps < 45 && scale > 0.5) { scale = Math.max(0.5, scale * 0.8); renderer.setPixelRatio(scale); resize(); }
        else if (smooth >= 2 && scale < maxScale) { smooth = 0; scale = Math.min(maxScale, scale * 1.15); renderer.setPixelRatio(scale); resize(); }
      }
    }

    if (mode === 'zone' && !tweens.length && zoneLook) {
      camera.quaternion.setFromEuler(new THREE.Euler(zoneLook.pitch0 + zoneLook.pitch, zoneLook.yaw0 + zoneLook.yaw, 0, 'YXZ'));
    }
    if (mode === 'room' && !tweens.length) {
      if (!drag) { yaw += vel.x; pitch += vel.y; vel.x *= 0.9; vel.y *= 0.9; }
      pitch = Math.max(-1.1, Math.min(0.7, pitch));
      camera.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
    }

    if (hoverEvent) { hover(hoverEvent); hoverEvent = null; }

    // markers: the room's top-level things, or the things of the zone you walked up to
    const settled = !tweens.length;
    for (const s of spots) {
      if (s.kind === 'toggle') continue;
      const show = settled && ((mode === 'room' && !s.zone) || (mode === 'zone' && s.zone === zone));
      if (!show) { ui.placeMarker(s.id, 0, 0, false); continue; }
      v.copy(s.anchorWorld).project(camera);
      ui.placeMarker(s.id, (v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight, show && v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1);
    }
    v.copy(room.door.anchor).project(camera);
    ui.placeHandle((v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight, mode === 'door');

    renderer.render(scene, camera);
  });
  ui.loaded();
}
