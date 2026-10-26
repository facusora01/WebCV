// Facundo's room, modelled from photos, plus the hallway you enter from.
// Units are metres. Room interior: x -1.8..1.8, z -1.9 (far wall) .. 1.9 (door
// wall), floor at y 0, ceiling at 2.7. The hallway sits outside the door, z > 1.9.
// Both desks run along the left wall (x = -1.8) under the window.
//
// Every clickable thing is a Group tagged with userData.hotspot and described in
// `hotspots` by its kind: a zone you walk up to, a screen with an app on it, a
// thing you pick up and turn over (inspect), the wallet, or a switch.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { screenText, cards as CARDS } from './content.js';
import {
  makeScreen, tvApp, browserApp, serverApp, phoneApp, printerApp, pageCanvas, CARD_THEMES,
  skillBack, idBack, stickerBack, earTag, earTagBack, notebookPages, drawCover, baTime, baNight, dogTag, dogTagBack
} from './screens.js';

export const C = {
  wall: '#ece6dc', ceiling: '#f2eee8', trim: '#f7f4ee',
  black: '#1c1c22', graphite: '#34343c', grey: '#8d8f96', steel: '#c3c6cc',
  red: '#d2302b', yellow: '#e2a52a', copper: '#c7784a', cream: '#f3ead8',
  purple: '#6d4fd8', blue: '#2f6fdc', lamp: '#ffd59a'
};
const R = { x0: -1.8, x1: 1.8, z0: -1.9, z1: 1.9, h: 2.7 };
const DOOR = { x0: 0.55, x1: 1.35, h: 2.05 };
const WIN = { z0: -1.05, z1: 0.85, y0: 0.95, y1: 2.25 };

// One material per colour/options: fewer programs and lets static meshes merge.
const matCache = new Map();
function M(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true, ...o }));
  return matCache.get(key);
}
// emissive materials get animated one by one, so they are never shared
const glow = (color, intensity = 1.5) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, flatShading: true });

function put(parent, geo, mat, [x, y, z], rot) {
  const m = new THREE.Mesh(geo, typeof mat === 'string' ? M(mat) : mat);
  m.position.set(x, y, z);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
const box = (p, [w, h, d], pos, mat, rot) => put(p, new THREE.BoxGeometry(w, h, d), mat, pos, rot);
const cyl = (p, [rt, rb, h, seg = 10], pos, mat, rot) => put(p, new THREE.CylinderGeometry(rt, rb, h, seg), mat, pos, rot);
const ball = (p, r, pos, mat, detail = 1) => put(p, new THREE.IcosahedronGeometry(r, detail), mat, pos);

function group(parent, [x, y, z], hotspot, rotY = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  if (hotspot) g.userData.hotspot = hotspot;
  parent.add(g);
  return g;
}

// Canvas-backed texture. draw(ctx, w, h, t) runs again on every redraw(t).
function canvasTex(w, h, draw, repeat) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (repeat) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(...repeat); }
  const redraw = (t = 0) => { draw(ctx, w, h, t); tex.needsUpdate = true; };
  redraw();
  return { tex, redraw };
}
// screens glow on their own and ignore the room's lights
const screenMat = (tex, k = 1) => new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(k, k, k) });
const paperMat = (tex) => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
// a screen plane showing an app; returns the mesh
function screenPlane(parent, w, h, ui, pos, k = 0.95) {
  const m = put(parent, new THREE.PlaneGeometry(w, h), screenMat(ui.tex, k), pos);
  m.castShadow = false;
  m.userData.screen = ui;
  return m;
}

const MONO = '"JetBrains Mono", ui-monospace, monospace';
const HAND = '"Caveat", "Segoe Print", cursive';

function wallWithHoles(parent, axis, at, from, to, holes, color) {
  // axis 'x': wall in the YZ plane at x = at, spanning z. axis 'z': XY plane at z = at.
  const T = 0.12;
  const seg = (a0, a1, y0, y1) => {
    if (a1 - a0 < 0.001 || y1 - y0 < 0.001) return;
    const mid = (a0 + a1) / 2, len = a1 - a0;
    if (axis === 'x') box(parent, [T, y1 - y0, len], [at, (y0 + y1) / 2, mid], color);
    else box(parent, [len, y1 - y0, T], [mid, (y0 + y1) / 2, at], color);
  };
  let cursor = from;
  for (const hl of holes) {
    seg(cursor, hl.a0, 0, R.h);
    seg(hl.a0, hl.a1, 0, hl.y0);
    seg(hl.a0, hl.a1, hl.y1, R.h);
    cursor = hl.a1;
  }
  seg(cursor, to, 0, R.h);
}

function herringbone() {
  const S = 1024;
  return canvasTex(S, S, (ctx) => {
    ctx.fillStyle = '#2a140b'; ctx.fillRect(0, 0, S, S);
    const L = 181, W = 45, sx = 128, sy = 64;
    const tones = ['#6b3820', '#5e301b', '#7a4426', '#55291a', '#6f3a1f', '#4c2416'];
    let k = 0;
    for (let c = -1; c <= S / sx + 1; c++) {
      for (let r = -2; r <= S / sy + 2; r++) {
        const cx = c * sx, cy = r * sy + (c % 2 ? sy / 2 : 0);
        ctx.fillStyle = tones[(k++ * 7 + c * 3) % tones.length];
        for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
          ctx.save();
          ctx.translate(cx + ox, cy + oy);
          ctx.rotate(c % 2 ? Math.PI / 4 : -Math.PI / 4);
          ctx.fillRect(-L / 2 + 2, -W / 2 + 2, L - 4, W - 4);
          ctx.restore();
        }
      }
    }
  }, [2.2, 2.2]);
}

export function buildRoom(scene, { lowPower = false, terminal, getLang, avatarUrl }) {
  const root = new THREE.Group();
  scene.add(root);
  const anim = [];
  const hotspots = {};
  const onLang = []; // everything with text that depends on the language
  const T = () => screenText[getLang()];
  const dynamic = (o) => { o.userData.dynamic = true; return o; }; // never merged
  const page = (w, h, draw) => { const p = pageCanvas(w, h, draw, getLang); onLang.push(p.redraw); return p; };
  const screen = (w, h, app, dpr) => { const s = makeScreen(w, h, app, getLang, dpr); onLang.push(() => s.redraw()); return s; };

  // the profile photo, shared by the phone and the developer ID
  const avatar = { img: null, onload: [] };
  if (avatarUrl) {
    const img = new Image();
    img.onload = () => { avatar.img = img; avatar.onload.forEach((f) => f()); };
    img.src = avatarUrl;
  }

  // ---------- shell ----------
  const floorTex = herringbone();
  box(root, [4.3, 0.06, 7.6], [0.1, -0.03, 1.8], new THREE.MeshStandardMaterial({ map: floorTex.tex, roughness: 0.55 }));
  box(root, [3.84, 0.06, 4.0], [0, R.h + 0.03, 0], C.ceiling);
  wallWithHoles(root, 'z', R.z0 - 0.06, R.x0 - 0.12, R.x1 + 0.12, [], C.wall);
  wallWithHoles(root, 'x', R.x1 + 0.06, R.z0, R.z1, [], C.wall);
  wallWithHoles(root, 'x', R.x0 - 0.06, R.z0, R.z1, [{ a0: WIN.z0, a1: WIN.z1, y0: WIN.y0, y1: WIN.y1 }], C.wall);
  wallWithHoles(root, 'z', R.z1 + 0.06, R.x0 - 0.12, R.x1 + 0.12, [{ a0: DOOR.x0, a1: DOOR.x1, y0: 0, y1: DOOR.h }], C.wall);
  box(root, [3.6, 0.1, 0.02], [0, 0.05, R.z0 + 0.01], C.trim);
  box(root, [0.02, 0.1, 3.8], [R.x1 - 0.01, 0.05, 0], C.trim);
  box(root, [0.02, 0.1, 3.8], [R.x0 + 0.01, 0.05, 0], C.trim);

  // day or night, by the time in Buenos Aires; the window and the lamps follow it
  const sky = { night: -1 };
  buildWindow(root, anim, sky);
  const hall = dynamic(group(root, [0, 0, 0]));
  buildHallway(hall, anim);
  const door = buildDoor(root, anim);

  // ---------- zones: walk up to the desk or the printer table first ----------
  const zone = (id, center, size, view) => {
    const g = group(root, center, id);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshBasicMaterial({ visible: false }));
    g.add(hit);
    hotspots[id] = { kind: 'zone', group: g, anchor: [0, size[1] / 2 - 0.1, 0], view };
  };
  // the desk view is from the chair, at seated eye height; you can look down to the controller and up to the TV
  zone('desk', [-1.45, 1.15, -1.3], [0.75, 2.2, 1.2], { pos: [-0.86, 1.2, -1.27], look: [-1.7, 1.1, -1.3], yaw: 0.75, pitch: [-0.8, 0.6] });
  zone('table', [-1.5, 1.0, 0.1], [0.7, 0.7, 1.7], { pos: [-0.5, 1.5, 0.15], look: [-1.6, 0.85, 0.05], yaw: 0.6, pitch: [-0.5, 0.4] });

  // ---------- black desk: left wall, far corner. Its front faces +x. ----------
  // Local axes once rotated: local +x → world -z (towards the far wall), local +z → world +x.
  const desk = group(root, [-1.5, 0, -1.3], null, Math.PI / 2);
  box(desk, [1.16, 0.03, 0.6], [0, 0.75, 0], C.black);
  const pad = canvasTex(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#2b2a33'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e9e6e0';
    for (let i = 0; i < 9; i++) ctx.fillRect(20 + i * 52, 30 + (i % 3) * 60, 30, 8);
    ctx.font = `bold 46px ${MONO}`; ctx.fillText('SORA', w - 150, h - 30);
    ctx.fillStyle = '#e7739a'; ctx.fillRect(0, h - 70, w, 6);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) if ((i + j) % 2) { ctx.fillStyle = '#e9e6e0'; ctx.fillRect(300 + i * 16, 40 + j * 16, 16, 16); }
  });
  box(desk, [1.08, 0.004, 0.42], [0, 0.768, 0.06], paperMat(pad.tex));
  for (const x of [-0.55, 0.55]) for (const z of [-0.27, 0.27]) box(desk, [0.03, 0.75, 0.03], [x, 0.375, z], C.black);
  box(desk, [1.1, 0.03, 0.03], [0, 0.12, -0.27], C.black);
  box(desk, [0.42, 0.025, 0.14], [-0.15, 0.783, 0.14], C.black); // keyboard
  for (let i = 0; i < 4; i++) box(desk, [0.39, 0.003, 0.022], [-0.15, 0.796, 0.09 + i * 0.03], M('#24242c', { emissive: '#3a5cff', emissiveIntensity: 0.12 }));
  buildMouse(desk, [0.16, 0.77, 0.15]);
  buildMug(desk, [-0.48, 0.77, 0.18], anim);
  buildClaudio(desk, [-0.36, 0.77, 0.0], anim);
  // PC tower under the far end of the desk, a little proud of the front edge
  box(desk, [0.2, 0.45, 0.42], [0.38, 0.225, 0.1], C.black);
  box(desk, [0.005, 0.38, 0.005], [0.38, 0.225, 0.311], glow('#3a5cff', 2));
  const hp = group(desk, [0.58, 0.62, 0.15]); // headphones hanging off the side
  put(hp, new THREE.TorusGeometry(0.075, 0.012, 6, 12, Math.PI), C.black, [0, 0, 0], [0, Math.PI / 2, 0]);
  for (const z of [-0.075, 0.075]) cyl(hp, [0.04, 0.04, 0.03, 10], [0, -0.01, z], C.black, [Math.PI / 2, 0, 0]);
  hotspots.lamp = buildDeskLamp(group(desk, [0.5, 0.768, 0.15], 'lamp', Math.PI + 0.35), anim, sky); // right of the phone

  // monitor 1: the terminal. The cheat sheet hangs off the left bezel, outside the screen.
  {
    const g = group(desk, [-0.22, 0.765, -0.12], 'monitor');
    // Noxi gas-spring arm, like the photo: round base at the back, a lower arm leaning
    // towards the wall, a joint, and an upper arm reaching forward to the monitor
    const arm = M('#26262c', { roughness: 0.45, metalness: 0.3 });
    cyl(g, [0.05, 0.055, 0.015, 16], [0, 0.008, -0.17], arm);
    box(g, [0.045, 0.32, 0.04], [0, 0.165, -0.22], arm, [-0.34, 0, 0]);
    cyl(g, [0.022, 0.022, 0.06, 12], [0, 0.315, -0.27], arm);
    box(g, [0.05, 0.045, 0.25], [0, 0.345, -0.15], arm, [0.1, 0, 0]);
    box(g, [0.1, 0.1, 0.01], [0, 0.36, -0.019], arm); // VESA plate, flush with the back
    box(g, [0.56, 0.34, 0.025], [0, 0.36, 0], C.black);
    const term = canvasTex(2048, 1200, (ctx, w, h, t) => { ctx.setTransform(2, 0, 0, 2, 0, 0); terminal.draw(ctx, 1024, 600, t); });
    const mesh = put(g, new THREE.PlaneGeometry(0.535, 0.31), screenMat(term.tex, 0.95), [0, 0.365, 0.0131]);
    mesh.userData.keep = true; // raycast and framing target
    const cheat = canvasTex(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#ffe680'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#e8cd5c'; ctx.fillRect(0, 0, w, 24);
      ctx.fillStyle = '#2a2a2a';
      T().cheat.forEach((line, i) => { ctx.font = i ? `24px ${HAND}` : `bold 26px ${HAND}`; ctx.fillText(line, 14, 50 + i * 27); });
    });
    onLang.push(cheat.redraw);
    box(g, [0.09, 0.09, 0.002], [-0.2, 0.162, 0.014], paperMat(cheat.tex), [0, 0, -0.05]);
    // the cursor only blinks while you are typing; otherwise redraw just when the text changes
    let last = -1;
    anim.push((t, dt, view) => {
      const k = terminal.active ? Math.floor(t * 2) : last;
      if (k !== last || terminal.dirty) { last = k; terminal.dirty = false; term.redraw(t); }
    });
    // framed a bit lower and taller than the screen so the cheat sheet hanging below fits too
    hotspots.monitor = { kind: 'terminal', group: g, anchor: [0, 0.6, 0], mesh, size: [0.64, 0.5], shift: -0.07 };
  }

  // monitor 2: a browser with the web projects
  {
    const g = group(desk, [0.36, 0.765, -0.1], 'monitor2', -0.55);
    box(g, [0.18, 0.012, 0.12], [0, 0.006, 0], C.black);
    box(g, [0.03, 0.14, 0.02], [0, 0.08, -0.02], C.black);
    box(g, [0.48, 0.3, 0.025], [0, 0.29, 0], C.black);
    const ui = screen(1024, 624, browserApp());
    const mesh = screenPlane(g, 0.46, 0.28, ui, [0, 0.292, 0.0131], 0.9);
    let minute = '';
    anim.push(() => { const m = baTime(); if (m !== minute) { minute = m; ui.redraw(); } }); // taskbar clock
    hotspots.monitor2 = { kind: 'screen', group: g, anchor: [0, 0.5, 0], mesh, size: [0.5, 0.3] };
  }

  // phone: contact
  {
    const g = group(desk, [0.27, 0.77, 0.19], 'phone', 0.2); // right of the mouse, clear of the keyboard
    box(g, [0.075, 0.009, 0.155], [0, 0.005, 0], C.black);
    const ui = screen(320, 682, phoneApp(avatar));
    avatar.onload.push(() => ui.redraw());
    let minute = '';
    anim.push(() => { const m = baTime(); if (m !== minute) { minute = m; ui.redraw(); } }); // keep its clock on time
    const mesh = screenPlane(g, 0.068, 0.145, ui, [0, 0.0101, 0]);
    mesh.rotation.x = -Math.PI / 2;
    hotspots.phone = { kind: 'screen', group: g, anchor: [0, 0.08, 0], mesh, size: [0.09, 0.17] };
  }

  // purple DualSense on top of the PC tower: turns the TV into a console
  {
    const g = group(desk, [0.38, 0.452, 0.2], 'ps5', Math.PI / 2);
    loadModel('ps5', g, { size: 0.16, axis: 'x', rotX: -Math.PI / 2, tint: '#a58cff' });
    hotspots.ps5 = { kind: 'tvmode', mode: 'console', group: g, anchor: [0, 0.1, 0] };
  }

  // TV on an arm, far wall near the corner, turned towards the room
  {
    const mount = group(root, [-1.25, 1.88, R.z0 + 0.04]);
    box(mount, [0.12, 0.16, 0.02], [0, 0, 0], C.graphite);
    box(mount, [0.04, 0.04, 0.24], [0, 0, 0.12], C.graphite);
    const g = group(root, [-1.3, 1.88, R.z0 + 0.3], 'tv', 0.5);
    box(g, [0.96, 0.57, 0.05], [0, 0, 0], C.black);
    const app = tvApp();
    const ui = screen(1024, 600, app);
    const mesh = screenPlane(g, 0.92, 0.53, ui, [0, 0, 0.026], 0.85);
    // Every redraw uploads the whole canvas, so only redraw when what it shows changes:
    // the list steps once per cycle (smoothly, 15 times a second, only when you are up
    // close), the console menu shows the clock, and focusing adds the info button.
    let lastTv = null;
    anim.push((t, dt, view) => {
      if (!view.sees(mesh) && !app.focused) return;
      const sliding = app.focused && app.mode === 'turnero' && !app.info && (t % 6.4) > 5;
      const k = `${app.mode}${app.info}${app.focused}${sliding ? Math.floor(t * 15) : Math.floor(t / 6.4)}${app.mode === 'console' ? baTime() : ''}`;
      if (k !== lastTv) { lastTv = k; ui.redraw(t); }
    });
    hotspots.tv = { kind: 'screen', group: g, anchor: [0, 0.38, 0], mesh, size: [1.0, 0.6], app };

    // creeper plush hanging under the TV: turns the TV into a Minecraft menu
    const c = group(g, [0.36, -0.43, -0.015], 'creeper'); // a small plush hanging by its cable from the TV's corner
    c.scale.setScalar(0.6);
    const cg = M('#4fae3f');
    const tex = canvasTex(64, 64, (ctx) => {
      ctx.fillStyle = '#4fae3f'; ctx.fillRect(0, 0, 64, 64);
      for (let i = 0; i < 40; i++) { ctx.fillStyle = i % 2 ? '#3f9433' : '#6cc95a'; ctx.fillRect(((i * 37) % 8) * 8, ((i * 13) % 8) * 8, 8, 8); }
      ctx.fillStyle = '#111';
      ctx.fillRect(12, 16, 12, 12); ctx.fillRect(40, 16, 12, 12); ctx.fillRect(26, 30, 12, 10);
      ctx.fillRect(20, 38, 8, 14); ctx.fillRect(36, 38, 8, 14);
    });
    tex.tex.magFilter = THREE.NearestFilter;
    box(c, [0.1, 0.1, 0.1], [0, 0.05, 0], [cg, cg, cg, cg, paperMat(tex.tex), cg]);
    box(c, [0.07, 0.13, 0.05], [0, -0.07, 0], cg);
    for (const x of [-0.025, 0.025]) for (const z of [-0.03, 0.03]) box(c, [0.035, 0.05, 0.035], [x, -0.16, z], cg);
    box(c, [0.004, 0.22, 0.004], [0, 0.21, 0], C.black);
    anim.push((t) => { c.rotation.z = Math.sin(t * 0.9) * 0.05; });
    hotspots.creeper = { kind: 'tvmode', mode: 'mods', group: c, anchor: [0, 0.18, 0] };
  }

  buildChair(group(root, [-0.95, 0, -1.25], null, -Math.PI / 2 + 0.2));

  // ---------- white trestle table under the window, continuing the desk line ----------
  // Along the table, from the desk to the door: white bin, filament dryer (CFS), printer.
  const table = group(root, [-1.5, 0, 0.1]);
  box(table, [0.6, 0.035, 1.6], [0, 0.75, 0], '#efece6');
  for (const z of [-0.6, 0.6]) {
    for (const s of [-1, 1]) box(table, [0.04, 0.78, 0.04], [s * 0.16, 0.37, z], '#efece6', [0, 0, s * 0.18]);
    box(table, [0.36, 0.03, 0.04], [0, 0.45, z], '#efece6');
  }
  box(table, [0.4, 0.02, 0.2], [0, 0.45, 0.6], '#efece6');
  cyl(table, [0.08, 0.07, 0.2, 8], [-0.12, 0.87, -0.62], '#f4f4f4'); // white bin with a black bag
  cyl(table, [0.081, 0.081, 0.02, 8], [-0.12, 0.97, -0.62], C.black);
  buildCFS(table, [-0.06, 0.77, -0.15]);
  {
    // a framed photo on the table: a sunset with two people, drawn rather than copied
    const f = group(table, [0.16, 0.77, -0.6], null, Math.PI / 2 - 0.3);
    box(f, [0.1, 0.13, 0.012], [0, 0.064, 0], C.black, [-0.15, 0, 0]);
    const pic = canvasTex(200, 260, (ctx, w, h) => {
      const g2 = ctx.createLinearGradient(0, 0, 0, h); g2.addColorStop(0, '#f6b38a'); g2.addColorStop(0.6, '#f4d6a8'); g2.addColorStop(1, '#6f8fbf');
      ctx.fillStyle = g2; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ffe9b0'; ctx.beginPath(); ctx.arc(w / 2, h * 0.58, 30, 0, 7); ctx.fill();
      ctx.fillStyle = '#3a3048';
      for (const [x, s] of [[72, 1], [118, 0.9]]) { ctx.beginPath(); ctx.arc(x, 150 + 20 * (1 - s), 15 * s, 0, 7); ctx.fill(); ctx.fillRect(x - 18 * s, 165 + 20 * (1 - s), 36 * s, 100); }
    });
    put(f, new THREE.PlaneGeometry(0.085, 0.112), paperMat(pic.tex), [0, 0.065, 0.0071], [-0.15, 0, 0]);
  }

  const wallet = buildWallet(table, [0.2, 0.77, -0.12], page, avatar, anim);
  hotspots.wallet = { kind: 'wallet', group: wallet.group, anchor: [0, 0.07, 0] };

  // 3D printer (Creality bed-slinger): its touch screen holds the print queue
  {
    const g = group(table, [-0.02, 0.77, 0.45], 'printer', Math.PI / 2);
    const ui = screen(512, 358, printerApp(), 1.5);
    const mesh = buildPrinter(g, ui, anim);
    hotspots.printer = { kind: 'screen', group: g, anchor: [0, 0.75, 0], mesh, size: [0.12, 0.085] };
  }

  // blue 3D-printed cow: AgroScanner, with its ear tag
  {
    const g = group(table, [0.2, 0.77, 0.12], 'cow', 2.2);
    const blue = M(C.blue, { roughness: 0.5 });
    box(g, [0.1, 0.05, 0.05], [0, 0.06, 0], blue);
    box(g, [0.04, 0.04, 0.035], [0.065, 0.075, 0], blue);
    for (const x of [-0.035, 0.035]) for (const z of [-0.017, 0.017]) box(g, [0.014, 0.035, 0.014], [x, 0.018, z], blue);
    for (const z of [-0.015, 0.015]) box(g, [0.006, 0.012, 0.006], [0.07, 0.1, z], blue);
    const tag = box(g, [0.004, 0.016, 0.014], [0.07, 0.085, 0.026], '#f2c230');
    tag.userData.keep = true; // the inspect view flies from it
    hotspots.cow = { kind: 'inspect', group: g, anchor: [0, 0.16, 0], from: tag, aspect: 0.8, pages: [page(400, 500, earTag), page(400, 500, earTagBack)] };
  }

  // yellow backpack on the floor at the end of the table: the notebook inside holds the experience
  {
    // front pocket faces the room (local +z)
    const g = group(root, [-1.52, 0, 1.15], 'backpack', Math.PI / 2 + 0.3);
    const pages = notebookPages().map((d) => page(600, 800, d));
    // the zipper along the top: a dark opening that widens as the pull slides across.
    // Both stay hidden until the bag opens, and sit on the bag's real top once it loads.
    const opening = new THREE.Mesh(new THREE.BufferGeometry(), M(C.black));
    opening.visible = false;
    g.add(opening);
    const pull = box(g, [0.012, 0.03, 0.006], [-0.1, 0.38, 0.02], '#c9ccd2');
    pull.visible = false;
    loadModel('backpack', g, { size: 0.46, axis: 'y', onLoad: (wrap) => {
      // sample the bag's top just in front of the handle, side to side: the zipper is a
      // frown-shaped curve that hugs that contour
      const pts = [];
      for (let i = 0; i <= 10; i++) {
        const x = -0.12 + i * 0.024;
        const y = topOf(wrap, g, [[x, 0.035]], null);
        if (y != null) pts.push(new THREE.Vector3(x, y + 0.002, 0.035));
      }
      if (pts.length < 3) return;
      const curve = new THREE.CatmullRomCurve3(pts);
      opening.geometry = new THREE.TubeGeometry(curve, 40, 0.005, 6);
      hotspots.backpack.zip = { curve, count: opening.geometry.index.count };
      hotspots.backpack.top = Math.max(...pts.map((p) => p.y));
      opening.geometry.setDrawRange(0, 0);
    } });
    // the FIUBA notebook, waiting inside
    const blue = M('#1f3a6a');
    const notebook = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.015), [blue, blue, blue, blue, paperMat(pages[0].tex), blue]);
    notebook.position.set(0, 0.25, 0);
    notebook.visible = false;
    g.add(notebook);
    hotspots.backpack = { kind: 'backpack', group: g, anchor: [0, 0.6, 0], aspect: 0.75, pages, opening, pull, notebook, top: 0.38 };
  }
  // black bin with a wooden lid, under the printer table
  cyl(root, [0.12, 0.12, 0.3, 10], [-1.55, 0.15, 0.35], C.black);
  cyl(root, [0.125, 0.125, 0.03, 10], [-1.55, 0.31, 0.35], '#b88a5a');

  // ---------- far wall: posters, ladder shelf, red nightstand ----------
  // Framed posters: click one to walk up to it and read it. Drawn at 2x so they
  // stay sharp up close; the draw functions work in a 256 px wide space.
  const poster = (id, pos, w, h, draw, frame = '#f5f2ec') => {
    const g = group(root, pos, id);
    box(g, [w, h, 0.025], [0, 0, 0], frame);
    const H = Math.round(256 * h / w);
    const tx = canvasTex(512, H * 2, (ctx) => { ctx.setTransform(2, 0, 0, 2, 0, 0); draw(ctx, 256, H); });
    const face = put(g, new THREE.PlaneGeometry(w - 0.05, h - 0.05), paperMat(tx.tex), [0, 0, 0.0131]);
    face.userData.keep = true; // the camera frames it
    hotspots[id] = { kind: 'poster', group: g, anchor: [0, h / 2 + 0.06, 0], mesh: face, size: [w + 0.06, h + 0.06] };
  };
  // chalkboard print in a worn white frame: LIVE YOUR Life LIKE THERE IS NO TOMORROW
  poster('posterLive', [-0.3, 1.58, R.z0 + 0.02], 0.26, 0.34, (ctx, w, h) => {
    ctx.fillStyle = '#1f2421'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#d9d4c3'; ctx.lineWidth = 1; ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = '#ece7d6';
    ctx.font = 'bold 54px Georgia, serif'; ctx.fillText('LIVE', 14, 62);
    ctx.font = 'bold 26px Georgia, serif'; ctx.fillText('YOUR', 160, 44);
    for (let i = 0; i < 9; i++) ctx.fillRect(160 + i * 9, 54, 4, 4); // dotted rule under YOUR
    ctx.textAlign = 'center';
    ctx.font = `italic 78px ${HAND}`; ctx.fillText('Life', w / 2, 140);
    ctx.strokeStyle = '#ece7d6'; ctx.lineWidth = 1.5;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(w / 2 + s * 95, 112, 14, 0, Math.PI * 1.6); ctx.stroke(); } // flourishes
    ctx.font = 'bold 36px Georgia, serif'; ctx.fillText('LIKE THERE', w / 2, 196);
    ctx.beginPath(); ctx.moveTo(60, 214); ctx.lineTo(w - 60, 214); ctx.moveTo(60, 236); ctx.lineTo(w - 60, 236); ctx.stroke(); // ribbon
    ctx.font = 'bold 18px Georgia, serif'; ctx.fillText('IS NO', w / 2, 231);
    ctx.font = '52px Impact, "Arial Narrow", sans-serif'; ctx.fillText('TOMORROW', w / 2, 296, w - 24); // squeezed to fit when Impact is missing
    ctx.textAlign = 'left';
  }, '#ece6da');
  poster('posterPast', [0.18, 1.78, R.z0 + 0.02], 0.4, 0.52, (ctx, w, h) => {
    ctx.fillStyle = '#c4532a'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f7ead4'; ctx.textAlign = 'center';
    [['your', 30, HAND], ['past', 64, 'Georgia, serif'], ['NEVER', 46, 'Impact, sans-serif'], ['DEFINE', 46, 'Impact, sans-serif'], ['your', 30, HAND], ['future', 58, HAND]]
      .forEach(([s, sz, f], i) => { ctx.font = `${sz}px ${f}`; ctx.fillText(s, w / 2, 48 + i * 52); });
    ctx.fillStyle = '#2f7fd6'; ctx.font = '30px serif'; ctx.fillText('★', w - 30, h - 20);
    ctx.textAlign = 'left';
  });

  // grey ladder shelf, with the old laptop that is the server
  {
    const g = group(root, [0.1, 0, R.z0 + 0.2]);
    const grey = M('#8e9196', { roughness: 0.9 });
    for (const x of [-0.24, 0.24]) box(g, [0.035, 1.55, 0.04], [x, 0.76, 0.02], grey, [-0.17, 0, 0]);
    for (const [y, d] of [[0.2, 0.3], [0.55, 0.26], [0.9, 0.22], [1.22, 0.18]]) {
      const zc = 0.16 - y * 0.17;
      box(g, [0.46, 0.02, d], [0, y, zc], grey);
      box(g, [0.46, 0.06, 0.015], [0, y + 0.03, zc + d / 2], grey);
    }
    cyl(g, [0.025, 0.025, 0.15, 8], [-0.15, 1.31, 0.0], '#f06a25');
    cyl(g, [0.025, 0.025, 0.17, 8], [0.13, 1.32, 0.0], '#e9edf2');
    box(g, [0.25, 0.04, 0.12], [0.0, 0.25, 0.14], '#2b2b2b');
    box(g, [0.14, 0.01, 0.03], [-0.08, 0.93, 0.06], C.yellow);
    box(g, [0.06, 0.02, 0.06], [0.1, 0.93, 0.06], C.red);

    const s = group(g, [0, 0.565, 0.08], 'server');
    box(s, [0.3, 0.02, 0.2], [0, 0.01, 0], C.graphite);
    const lid = group(s, [0, 0.02, -0.1]);
    lid.rotation.x = -0.35;
    box(lid, [0.3, 0.19, 0.012], [0, 0.095, 0], C.graphite);
    const app = serverApp();
    const ui = screen(984, 600, app, 1.5);
    const mesh = screenPlane(lid, 0.27, 0.165, ui, [0, 0.095, 0.0065], 0.85);
    const led = box(s, [0.01, 0.004, 0.01], [0.12, 0.022, 0.08], glow('#3ddc84', 2));
    // the status dots only blink up close; from the room the screen redraws when it changes
    let lastPm = null;
    anim.push((t, dt, view) => {
      led.material.emissiveIntensity = Math.sin(t * 9) > 0 ? 2.5 : 0.2;
      const k = `${app.sel}${app.focused && Math.floor(t * 2)}`;
      if (k !== lastPm && view.sees(mesh)) { lastPm = k; ui.redraw(t); }
    });
    hotspots.server = { kind: 'screen', group: s, anchor: [0, 0.3, 0], mesh, size: [0.32, 0.2], app };
  }

  // red nightstand: cabinet with a door, an open shelf above it, a curved back
  {
    const g = group(root, [0.62, 0, R.z0 + 0.2]);
    const red = M(C.red, { roughness: 0.7 }), darkRed = M('#a81f1b', { roughness: 0.8 });
    box(g, [0.42, 0.42, 0.34], [0, 0.21, 0], red);
    box(g, [0.34, 0.32, 0.012], [0, 0.22, 0.176], darkRed);
    ball(g, 0.016, [-0.13, 0.24, 0.19], C.steel, 0);
    box(g, [0.42, 0.18, 0.02], [0, 0.51, -0.16], darkRed);
    for (const x of [-0.2, 0.2]) box(g, [0.02, 0.18, 0.34], [x, 0.51, 0], red);
    box(g, [0.44, 0.025, 0.36], [0, 0.612, 0], red);
    const back = put(g, new THREE.CylinderGeometry(0.22, 0.22, 0.025, 16, 1, false, -Math.PI / 2, Math.PI), red, [0, 0.625, -0.165], [Math.PI / 2, 0, 0]);
    back.scale.set(1, 1, 0.55);
    for (const x of [-0.21, 0.21]) box(g, [0.025, 0.1, 0.34], [x, 0.67, 0], red);

    // the Appointa name tag lying on top
    const st = group(g, [0.02, 0.626, 0.04], 'sticker', 0.15);
    const front = page(512, 400, (ctx, w, h) => {
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#2b3fb8'; ctx.fillRect(0, 0, w, 100);
      ctx.fillStyle = '#fff'; ctx.font = `bold 52px ${MONO}`; ctx.fillText('Appointa', 104, 68);
      ctx.fillRect(28, 26, 52, 52);
      ctx.fillStyle = '#111'; ctx.font = 'bold 64px Arial, sans-serif';
      ctx.fillText('Facundo', 36, 206); ctx.fillText('Sorasio', 36, 282);
      ctx.fillStyle = '#666'; ctx.font = '28px Arial, sans-serif'; ctx.fillText('Grupo 15', 36, 350);
    });
    const tag = put(st, new THREE.PlaneGeometry(0.12, 0.094), paperMat(front.tex), [0, 0.0015, 0], [-Math.PI / 2, 0, 0]);
    tag.userData.keep = true; // the inspect view flies from it
    hotspots.sticker = { kind: 'inspect', group: st, anchor: [0, 0.08, 0], from: tag, aspect: 1.28, pages: [front, page(512, 400, stickerBack)] };
  }

  // bed along the right wall with the striped cover
  {
    const g = group(root, [1.38, 0, -0.95]);
    box(g, [0.84, 0.3, 1.95], [0, 0.15, 0], '#1f2a4a');
    const stripes = canvasTex(256, 512, (ctx, w, h) => {
      const cols = ['#efe2cf', '#d9737f', '#efe2cf', '#22305a', '#efe2cf', '#c94d5d', '#e8d4bd'];
      let y = 0, i = 0;
      while (y < h) { const s = 8 + ((i * 13) % 5) * 6; ctx.fillStyle = cols[i % cols.length]; ctx.fillRect(0, y, w, s); y += s; i++; }
    });
    stripes.tex.center.set(0.5, 0.5);
    stripes.tex.rotation = Math.PI / 2;
    box(g, [0.9, 0.12, 1.8], [0, 0.36, 0.08], paperMat(stripes.tex));
    box(g, [0.6, 0.1, 0.32], [0, 0.47, -0.78], paperMat(stripes.tex), [0.1, 0, 0]);
  }

  // the dogs (low-poly models generated from references): Simón asleep, curled up on
  // the bed; Manolo sitting on the floor, wagging, now and then turning to look at you.
  // Clicking either shows the tag on its collar.
  const dogs = { lookAt: new THREE.Vector3(), attention: 0 };
  {
    const simon = group(root, [1.32, 0.42, -0.35], 'simon', -2.4);
    const manolo = group(root, [0.5, 0, 0.05], 'manolo', -0.9);
    loadModel('simon', simon, { size: 0.42, axis: 'x' });
    // his own head and tail are cut out of the model so they can move
    let head = null, tail = null;
    loadModel('manolo', manolo, { size: 0.5, axis: 'y', trim: 0.03, split: (m) => {
      const H = (b) => b.max.y - b.min.y, D = (b) => b.max.z - b.min.z;
      head = splitPart(m, (c, b) => c.y > b.min.y + H(b) * 0.62, (pb, b) => new THREE.Vector3((pb.min.x + pb.max.x) / 2, b.min.y + H(b) * 0.62, (pb.min.z + pb.max.z) / 2));
      tail = splitPart(m, (c, b) => c.z < b.min.z + D(b) * 0.24 && c.y < b.min.y + H(b) * 0.62, (pb) => new THREE.Vector3((pb.min.x + pb.max.x) / 2, (pb.min.y + pb.max.y) / 2, pb.max.z));
    } });
    // "z z z" floating over Simón when someone wakes him
    const zz = canvasTex(128, 64, (ctx) => { ctx.clearRect(0, 0, 128, 64); ctx.fillStyle = '#ffffff'; ctx.font = `bold 34px ${HAND}`; ctx.fillText('z z z', 10, 44); });
    const zzz = new THREE.Sprite(new THREE.SpriteMaterial({ map: zz.tex, transparent: true, opacity: 0, depthWrite: false }));
    zzz.scale.set(0.16, 0.08, 1);
    root.add(zzz);
    const local = new THREE.Vector3();
    anim.push((t, dt) => {
      simon.scale.y = 1 + Math.sin(t * 1.2) * 0.02; // slow sleepy breathing
      const curious = Math.max(dogs.attention, Math.sin(t * 0.55) > 0.6 ? 1 : 0);
      dogs.attention = Math.max(0, dogs.attention - dt * 0.4);
      if (head) {
        local.copy(dogs.lookAt);
        manolo.worldToLocal(local);
        const yaw = THREE.MathUtils.clamp(Math.atan2(local.x, local.z), -0.9, 0.9);
        head.rotation.y += ((curious ? yaw : Math.sin(t * 0.4) * 0.15) - head.rotation.y) * Math.min(1, dt * 3);
        head.rotation.z = Math.sin(t * 0.9) * 0.04;
      }
      if (tail) tail.rotation.y = Math.sin(t * (6 + 8 * curious)) * (0.3 + 0.3 * curious);
      zzz.material.opacity = Math.max(0, zzz.material.opacity - dt * 0.4);
      zzz.position.set(1.32, 0.75 + (1 - zzz.material.opacity) * 0.25, -0.35);
    });
    // where each collar tag starts its flight from
    const simonTag = group(simon, [-0.08, 0.1, 0.05]);
    const manoloTag = group(manolo, [0, 0.3, 0.1]);
    hotspots.simon = { kind: 'inspect', group: simon, anchor: [0, 0.3, 0], from: simonTag, aspect: 1, pages: [page(400, 400, dogTag('simon')), page(400, 400, dogTagBack('simon'))], react: () => { zzz.material.opacity = 1; } };
    hotspots.manolo = { kind: 'inspect', group: manolo, anchor: [0, 0.6, 0], from: manoloTag, aspect: 1, pages: [page(400, 400, dogTag('manolo')), page(400, 400, dogTagBack('manolo'))], sound: 'bark', react: () => { dogs.attention = 1; } };
  }

  // ---------- wardrobe on the door wall ----------
  {
    const g = group(root, [-0.65, 0, R.z1 - 0.05]);
    const white = M('#f2efe9', { roughness: 0.7 });
    box(g, [1.85, 2.1, 0.06], [0, 1.05, 0], white);
    for (let i = 0; i < 4; i++) {
      const x = -0.69 + i * 0.46;
      box(g, [0.004, 2.0, 0.065], [x + 0.23, 1.05, 0], '#d8d4cc');
      box(g, [0.34, 0.95, 0.02], [x, 1.45, -0.035], white);
      box(g, [0.34, 0.6, 0.02], [x, 0.45, -0.035], white);
      if (i === 1 || i === 2) ball(g, 0.02, [x + (i === 1 ? 0.19 : -0.19), 1.0, -0.05], '#3a2a1a', 0);
    }
  }

  // ---------- pendant lamp: black shade with a copper inside ----------
  {
    const g = group(root, [0, R.h, -0.15], 'pendant');
    cyl(g, [0.035, 0.035, 0.03], [0, -0.015, 0], C.black);
    cyl(g, [0.006, 0.006, 0.42], [0, -0.24, 0], C.black);
    ball(g, 0.03, [0, -0.3, 0], C.black, 0);
    put(g, new THREE.CylinderGeometry(0.06, 0.22, 0.17, 16, 1, true), M('#2b2b2f'), [0, -0.53, 0]).castShadow = false;
    put(g, new THREE.CylinderGeometry(0.058, 0.215, 0.165, 16, 1, true), M(C.copper, { side: THREE.BackSide, metalness: 0.6, roughness: 0.35 }), [0, -0.53, 0]);
    const bulb = ball(g, 0.045, [0, -0.6, 0], glow(C.lamp, 3), 1);
    bulb.castShadow = false;
    const light = new THREE.PointLight(C.lamp, 7, 7, 1.4); // no shadow: a point-light shadow renders the room six times
    light.position.set(0, -0.66, 0);
    g.add(light);
    let on = true;
    hotspots.pendant = {
      kind: 'toggle', group: g, anchor: [0, -0.75, 0],
      toggle() { on = !on; light.intensity = on ? 7 : 0; bulb.material.emissiveIntensity = on ? 3 : 0.1; }
    };
  }

  if (!lowPower) buildDust(root, anim);

  // mark everything that moves or is clicked, then merge the rest into a handful of meshes
  for (const h of Object.values(hotspots)) dynamic(h.group);
  dynamic(door.hinge);
  mergeStatic(root);
  // clickable things that hold still inside: merge their parts too (fewer draw calls)
  for (const id of ['monitor', 'monitor2', 'phone', 'tv', 'creeper', 'server', 'sticker', 'cow', 'printer', 'pendant']) mergeStatic(hotspots[id].group, true);

  return {
    hotspots,
    get night() { return sky.night; },
    door,
    hall,
    wallet,
    dogs,
    update: (t, dt, view) => { for (const f of anim) f(t, dt, view); },
    setLang() { for (const r of onLang) r(); }
  };
}

// ---------- static geometry merge: hundreds of boxes → one draw call per material ----------
// inside = true merges within a (dynamic) hotspot group, in that group's own space;
// screens and anything flagged dynamic keep their own mesh.
function mergeStatic(root, inside = false) {
  root.updateMatrixWorld(true);
  const toLocal = inside ? root.matrixWorld.clone().invert() : new THREE.Matrix4();
  const buckets = new Map();
  const drop = [];
  (function walk(o, top) {
    if (o.userData.dynamic && !top) return;
    for (const c of o.children) walk(c, false);
    if (o.isMesh && !o.material.transparent && !Array.isArray(o.material) && o.material.visible && !o.userData.screen && !o.userData.hotspot && !o.userData.keep) {
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(toLocal, o.matrixWorld));
      if (!buckets.has(o.material)) buckets.set(o.material, { geos: [], cast: false });
      const b = buckets.get(o.material);
      b.geos.push(g); b.cast ||= o.castShadow;
      drop.push(o);
    }
  })(root, true);
  for (const o of drop) o.removeFromParent();
  for (const [mat, b] of buckets) {
    const mesh = new THREE.Mesh(mergeGeometries(b.geos), mat);
    mesh.castShadow = b.cast;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    root.add(mesh);
  }
}

// ---------- generated models (public/models/*.glb, optimized with gltf-transform) ----------
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
// Scales the model so its extent along `axis` is `size`, sits it on y = 0 and centres it.
function loadModel(name, parent, { size, axis = 'y', trim = 0, rotX = 0, split, tint, onLoad }) {
  loader.load(`${import.meta.env.BASE_URL}models/${name}.glb`, (gltf) => {
    const m = gltf.scene;
    m.rotation.x = rotX;
    if (trim) trimGround(m, trim);
    if (split) split(m);
    const wrap = new THREE.Group();
    wrap.add(m);
    const bb = new THREE.Box3().setFromObject(wrap);
    const dim = bb.getSize(new THREE.Vector3());
    wrap.scale.setScalar(size / dim[axis]);
    const c = bb.getCenter(new THREE.Vector3());
    m.position.sub(new THREE.Vector3(c.x, bb.min.y, c.z));
    m.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = o.receiveShadow = true;
      // faceted, like the rest of the room
      o.material.flatShading = true; o.material.roughness = 0.8; o.material.metalness = 0; o.material.needsUpdate = true;
      if (tint) o.material.color.set(tint); // multiplies the generated texture
    });
    parent.add(wrap);
    onLoad?.(wrap);
  });
}

// Height of a model's upper surface at a few (x, z) points of `frame`, in frame-local y.
function topOf(model, frame, points, fallback = 0.38) {
  frame.updateWorldMatrix(true, true);
  const ray = new THREE.Raycaster(), o = new THREE.Vector3(), down = new THREE.Vector3(0, -1, 0);
  let sum = 0, n = 0;
  for (const [x, z] of points) {
    frame.localToWorld(o.set(x, 2, z));
    ray.set(o, down);
    const hit = ray.intersectObject(model, true)[0];
    if (hit) { sum += frame.worldToLocal(hit.point).y; n++; }
  }
  return n ? sum / n : fallback;
}

// Cuts the triangles picked by select(centroid, bounds) out of the model into their
// own mesh, hung on a hinge placed by hingeAt(partBounds, bounds), so that part can
// move on its own (a head that turns, a tail that wags). Returns the hinge.
function splitPart(model, select, hingeAt) {
  model.updateMatrixWorld(true);
  let mesh = null;
  model.traverse((o) => { if (o.isMesh && !mesh) mesh = o; });
  const geo = (mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry).clone().applyMatrix4(mesh.matrixWorld);
  mesh.removeFromParent();
  mesh.position.set(0, 0, 0); mesh.rotation.set(0, 0, 0); mesh.scale.set(1, 1, 1);
  model.add(mesh);
  geo.computeBoundingBox();
  const bounds = geo.boundingBox, p = geo.attributes.position, c = new THREE.Vector3();
  const partTris = [], restTris = [];
  for (let i = 0; i < p.count; i += 3) {
    c.set(0, 0, 0);
    for (let k = 0; k < 3; k++) c.x += p.getX(i + k) / 3, c.y += p.getY(i + k) / 3, c.z += p.getZ(i + k) / 3;
    (select(c, bounds) ? partTris : restTris).push(i);
  }
  const pick = (tris) => {
    const out = new THREE.BufferGeometry();
    for (const [name, attr] of Object.entries(geo.attributes)) {
      const arr = new attr.array.constructor(tris.length * 3 * attr.itemSize);
      tris.forEach((t, k) => arr.set(attr.array.subarray(t * attr.itemSize, (t + 3) * attr.itemSize), k * 3 * attr.itemSize));
      out.setAttribute(name, new THREE.BufferAttribute(arr, attr.itemSize, attr.normalized));
    }
    return out;
  };
  const partGeo = pick(partTris);
  partGeo.computeBoundingBox();
  const at = hingeAt(partGeo.boundingBox, bounds);
  partGeo.translate(-at.x, -at.y, -at.z);
  mesh.geometry = pick(restTris);
  const hinge = new THREE.Group();
  hinge.position.copy(at);
  hinge.add(new THREE.Mesh(partGeo, mesh.material));
  model.add(hinge);
  return hinge;
}

// Image-to-3D models sometimes come with a flat ground slab under them: drop every
// triangle that lies entirely in the bottom `fraction` of the model's height.
function trimGround(model, fraction) {
  model.updateMatrixWorld(true);
  const v = new THREE.Vector3();
  let min = Infinity, max = -Infinity;
  model.traverse((o) => {
    if (!o.isMesh) return;
    const p = o.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); min = Math.min(min, v.y); max = Math.max(max, v.y); }
  });
  const cut = min + (max - min) * fraction;
  model.traverse((o) => {
    if (!o.isMesh || !o.geometry.index) return;
    const p = o.geometry.attributes.position, idx = o.geometry.index.array, keep = [];
    const y = (i) => v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).y;
    for (let i = 0; i < idx.length; i += 3) {
      if (y(idx[i]) > cut || y(idx[i + 1]) > cut || y(idx[i + 2]) > cut) keep.push(idx[i], idx[i + 1], idx[i + 2]);
    }
    o.geometry.setIndex(keep);
    o.geometry = o.geometry.toNonIndexed(); // drops the unused vertices, so the bounds shrink too
  });
}

// ---------- the mouse: a white ergonomic gaming mouse (Redragon) ----------
function buildMouse(parent, [x, y, z]) {
  const g = group(parent, [x, y, z]);
  const white = new THREE.MeshStandardMaterial({ color: '#f4f4f2', roughness: 0.5 });
  const shell = put(g, new THREE.SphereGeometry(1, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), white, [0, 0.002, 0]);
  shell.scale.set(0.033, 0.021, 0.062);
  box(g, [0.0015, 0.004, 0.036], [0, 0.019, -0.028], '#cfcfcf');                          // split between the buttons
  cyl(g, [0.006, 0.006, 0.006, 10], [0, 0.021, -0.03], '#b8b8bc', [0, 0, Math.PI / 2]);  // wheel
  for (const dz of [-0.012, 0.004]) box(g, [0.003, 0.006, 0.012], [-0.032, 0.012, dz], '#e2e2e2'); // side buttons
}

// ---------- Claudio: a small red 3D-printed buddy that lives on the desk ----------
function buildClaudio(parent, pos, anim) {
  const g = group(parent, pos, null, 0.15);
  const red = M('#e8352a', { roughness: 0.6 });
  box(g, [0.05, 0.034, 0.03], [0, 0.027, 0], red);                    // body
  for (const s of [-1, 1]) box(g, [0.01, 0.014, 0.014], [s * 0.03, 0.026, 0], red); // arms
  for (const x of [-0.018, -0.008, 0.008, 0.018]) box(g, [0.006, 0.012, 0.012], [x, 0.006, 0], red); // legs
  for (const s of [-1, 1]) box(g, [0.004, 0.008, 0.002], [s * 0.011, 0.032, 0.0155], C.black); // eyes
  anim.push((t) => { g.position.y = pos[1] + Math.max(0, Math.sin(t * 2.2)) ** 8 * 0.008; }); // a little hop now and then
  g.userData.dynamic = true;
}

// ---------- mug with coffee and steam ----------
function buildMug(parent, [x, y, z], anim) {
  const g = group(parent, [x, y, z]);
  box(g, [0.12, 0.006, 0.12], [0, 0.003, 0], '#e8d8c0'); // coaster
  put(g, new THREE.CylinderGeometry(0.04, 0.035, 0.12, 12, 1, true), M('#bfe0d6', { side: THREE.DoubleSide }), [0, 0.066, 0]);
  cyl(g, [0.035, 0.035, 0.004, 12], [0, 0.008, 0], '#bfe0d6');
  cyl(g, [0.038, 0.038, 0.004, 12], [0, 0.11, 0], '#3b2314'); // the coffee
  put(g, new THREE.TorusGeometry(0.026, 0.007, 6, 10, Math.PI), '#bfe0d6', [-0.04, 0.066, 0], [0, 0, Math.PI / 2]); // handle: a half ring in the plane through the mug's axis
  const steam = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.25, depthWrite: false });
  const puffs = [0, 1, 2, 3].map((i) => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.018, 1), steam.clone());
    g.add(m);
    return { m, p: i / 4 };
  });
  anim.push((t) => {
    for (const s of puffs) {
      const k = (t * 0.28 + s.p) % 1;
      s.m.position.set(Math.sin(k * 7 + s.p * 9) * 0.015, 0.12 + k * 0.22, Math.cos(k * 5 + s.p * 4) * 0.01);
      s.m.scale.setScalar(0.6 + k * 1.8);
      s.m.material.opacity = 0.28 * Math.sin(k * Math.PI);
    }
  });
}

// ---------- filament dryer (Creality CFS): four spools side by side under a smoked lid ----------
function buildCFS(table, pos) {
  const g = group(table, pos);
  // long side along the table (z), front (display) facing the room (+x)
  box(g, [0.36, 0.14, 0.44], [0, 0.07, 0], C.graphite);
  box(g, [0.365, 0.024, 0.445], [0, 0.13, 0], C.red);
  const spools = ['#2f6fdc', '#d83a7a', '#f2f2f2', '#1c1c22'];
  spools.forEach((c, i) => {
    const z = -0.165 + i * 0.11;
    cyl(g, [0.095, 0.095, 0.06, 18], [0, 0.13, z], c, [Math.PI / 2, 0, 0]);
    cyl(g, [0.035, 0.035, 0.062, 10], [0, 0.13, z], '#2a2a2a', [Math.PI / 2, 0, 0]);
  });
  // smoked dome, flat side down, its axis along the long side
  const dome = put(g, new THREE.CylinderGeometry(0.175, 0.175, 0.44, 18, 1, false, Math.PI / 2, Math.PI),
    M('#4a4f5a', { transparent: true, opacity: 0.55, roughness: 0.15, side: THREE.DoubleSide }), [0, 0.142, 0], [Math.PI / 2, 0, 0]);
  dome.castShadow = false;
  box(g, [0.004, 0.03, 0.09], [0.182, 0.07, 0.1], glow('#5ad1ff', 1.2)); // the little display
}

// ---------- 3D printer: prints a ring layer by layer; nozzle, bed and gantry follow the path ----------
function buildPrinter(g, ui, anim) {
  const grey = M('#5b5d64', { roughness: 0.6 });
  box(g, [0.42, 0.07, 0.4], [0, 0.035, 0], grey);
  box(g, [0.43, 0.02, 0.06], [0, 0.07, 0.2], C.graphite);
  const bed = group(g, [0, 0.085, 0]);
  box(bed, [0.32, 0.012, 0.3], [0, 0, 0], C.black);
  // the print: a hollow ring, like the one in the photo
  const R0 = 0.035, LAYERS = 40, LH = 0.0015;
  const ringGeo = new THREE.CylinderGeometry(R0, R0, LAYERS * LH, 24, 1, true);
  ringGeo.translate(0, (LAYERS * LH) / 2, 0);
  const print = put(bed, ringGeo, M(C.blue, { side: THREE.DoubleSide }), [0, 0.006, 0]);
  for (const x of [-0.22, 0.22]) box(g, [0.04, 0.45, 0.05], [x, 0.29, -0.15], grey);
  box(g, [0.48, 0.035, 0.04], [0, 0.48, -0.15], grey);
  const gantry = group(g, [0, 0.2, -0.15]);
  box(gantry, [0.44, 0.035, 0.04], [0, 0, 0], C.graphite);
  const head = group(gantry, [0, 0, 0.15]); // the nozzle sits over the bed centre (z = 0)
  box(head, [0.07, 0.09, 0.06], [0, 0.03, -0.02], M('#b9bcc4', { roughness: 0.35, metalness: 0.4 }));
  cyl(head, [0.014, 0.014, 0.005, 12], [0, 0.035, 0.011], C.black, [Math.PI / 2, 0, 0]);
  put(head, new THREE.ConeGeometry(0.008, 0.02, 6), C.steel, [0, -0.025, 0], [Math.PI, 0, 0]);
  const spool = group(g, [0.1, 0.6, -0.15]);
  cyl(spool, [0.09, 0.09, 0.06, 18], [0, 0, 0], C.blue, [Math.PI / 2, 0, 0]);
  cyl(spool, [0.03, 0.03, 0.065, 10], [0, 0, 0], C.black, [Math.PI / 2, 0, 0]);
  // the touch screen with the print queue
  box(g, [0.13, 0.095, 0.012], [0.16, 0.1, 0.25], C.black, [-0.35, 0, 0]);
  const mesh = screenPlane(g, 0.12, 0.084, ui, [0.16, 0.104, 0.257]);
  mesh.rotation.x = -0.35;

  // bowden tube: white, translucent, with the blue filament inside, from the spool to the moving head
  const tubeMat = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.45, roughness: 0.3 });
  const filMat = new THREE.MeshStandardMaterial({ color: C.blue, roughness: 0.5 });
  const tube = new THREE.Mesh(new THREE.BufferGeometry(), tubeMat), fil = new THREE.Mesh(new THREE.BufferGeometry(), filMat);
  g.add(tube, fil);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), d = new THREE.Vector3();
  const curve = new THREE.CubicBezierCurve3(a, b, c, d);
  let lastTube = -1, lastUi = -1;

  const PERIOD = 1.2; // seconds per layer
  anim.push((t, dt, view) => {
    const total = LAYERS * PERIOD + 3; // print, then a short pause before the next one
    const tc = t % total;
    const layer = Math.min(LAYERS, Math.floor(tc / PERIOD));
    const theta = (tc / PERIOD) * Math.PI * 2;
    const printing = layer < LAYERS;
    // nozzle path relative to the bed: a circle of radius R0
    head.position.x = printing ? R0 * Math.cos(theta) : 0;
    bed.position.z = printing ? -R0 * Math.sin(theta) : 0.08;
    print.scale.y = Math.max(0.001, layer / LAYERS);
    // the nozzle tip rides on top of the current layer
    gantry.position.y = 0.091 + (layer + 1) * LH + 0.035; // bed top + print height + nozzle length
    spool.rotation.z = -t * 0.4;
    if (t - lastTube > 1 / 10 && view.sees(mesh)) {
      lastTube = t;
      a.set(0.1, 0.66, -0.15);
      d.set(head.position.x, gantry.position.y + 0.075, -0.02); // top of the toolhead
      b.set(0.12, 0.8, -0.1); c.set((d.x + 0.1) / 2, d.y + 0.14, -0.03);
      curve.needsUpdate = true; // its points moved: re-measure its arc length
      if (tube.geometry.type !== 'TubeGeometry') {
        tube.geometry = new THREE.TubeGeometry(curve, 24, 0.0045, 6);
        fil.geometry = new THREE.TubeGeometry(curve, 24, 0.0016, 4);
      } else { retube(tube.geometry, curve); retube(fil.geometry, curve); }
    }
    const u = Math.floor(t);
    if (u !== lastUi && view.sees(mesh)) { lastUi = u; ui.redraw(t); }
  });
  for (const o of [bed, gantry, spool, tube, fil]) o.userData.dynamic = true; // they move
  return mesh;
}

// Moves a TubeGeometry's vertices onto a new curve in place (the same layout
// TubeGeometry builds), so a bending tube costs no new buffers.
const tubeP = new THREE.Vector3(), tubeN = new THREE.Vector3();
function retube(geo, curve) {
  const { tubularSegments: n, radialSegments: r, radius } = geo.parameters;
  const { normals, binormals } = curve.computeFrenetFrames(n, false);
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  for (let i = 0, k = 0; i <= n; i++) {
    curve.getPointAt(i / n, tubeP);
    const N = normals[i], B = binormals[i];
    for (let j = 0; j <= r; j++, k++) {
      const v = (j / r) * Math.PI * 2, sin = Math.sin(v), cos = -Math.cos(v);
      tubeN.set(cos * N.x + sin * B.x, cos * N.y + sin * B.y, cos * N.z + sin * B.z).normalize();
      nor.setXYZ(k, tubeN.x, tubeN.y, tubeN.z);
      pos.setXYZ(k, tubeP.x + radius * tubeN.x, tubeP.y + radius * tubeN.y, tubeP.z + radius * tubeN.z);
    }
  }
  pos.needsUpdate = nor.needsUpdate = true;
  geo.computeBoundingSphere();
}

// ---------- the wallet: a leather bifold like the real one ----------
// Closed, it lies on the table. Opened, it lifts towards the camera, unfolds, and
// the ID flap flips up. The skill cards sit in stepped slots with only their top
// edge showing; clicking one takes it out (see main.js: inspect).
// Body layout (open, facing +z): left half x 0..0.11, right half x 0.11..0.22,
// both y 0..0.095; the ID flap hinges on the left half's top edge.
function buildWallet(table, pos, page, avatar, anim) {
  const g = group(table, pos, 'wallet', 0.25);
  const leather = M('#7a3d1e', { roughness: 0.6 }), dark = M('#5c2d14', { roughness: 0.7 });
  const W = 0.11, H = 0.095, CW = 0.086, CH = 0.054, STEP = 0.011;

  const body = new THREE.Group();
  g.add(body);
  const left = group(body, [0, 0, 0]);
  const right = group(body, [W, 0, 0.012]); // hinge at the spine, just in front of the left half's slots
  const flapHinge = group(left, [0, H, 0.011]);

  box(left, [W, H, 0.004], [W / 2, H / 2, -0.002], leather);
  box(right, [W, H, 0.004], [W / 2, H / 2, -0.014], leather);
  box(right, [0.025, 0.006, 0.002], [W - 0.02, 0.012, -0.0165], C.red); // the little tab outside

  // stepped slots: card k sits behind pocket panel k, peeking above it
  const cards = [];
  const slot = (half, k, n, zBase, c, idx) => {
    const front = page(512, 322, skillFront(c)), back = page(512, 322, skillBack(c));
    const top = H - 0.004 - k * STEP;
    const z = zBase + k * 0.0022;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(CW, CH), new THREE.MeshBasicMaterial({ map: front.tex, transparent: true }));
    m.position.set(W / 2, top - CH / 2, z);
    m.userData.hotspot = `card:${idx}`;
    m.userData.pages = [front, back];
    half.add(m);
    cards.push(m);
    const panelTop = top - STEP;
    box(half, [W - 0.006, panelTop, 0.0012], [W / 2, panelTop / 2, z + 0.0011], k === n - 1 ? leather : dark);
  };
  CARDS.slice(0, 4).forEach((c, k) => slot(left, k, 4, 0.0005, c, k));
  CARDS.slice(4).forEach((c, k) => slot(right, k, CARDS.length - 4, -0.0115, c, k + 4));

  // ID flap with a clear window showing the developer ID
  box(flapHinge, [W, H - 0.004, 0.003], [W / 2, (H - 0.004) / 2, -0.0015], leather);
  const idFront = page(512, 322, idFrontDraw(avatar));
  avatar.onload.push(() => idFront.redraw());
  const id = new THREE.Mesh(new THREE.PlaneGeometry(CW, CH), new THREE.MeshBasicMaterial({ map: idFront.tex, transparent: true }));
  id.position.set(W / 2, (H - 0.004) / 2, 0.0005);
  id.userData.hotspot = 'card:id';
  id.userData.pages = [idFront, page(512, 322, idBack)];
  flapHinge.add(id);
  for (const [w, h, x, y] of [[W, 0.012, W / 2, 0.006], [W, 0.012, W / 2, H - 0.01], [0.012, H, 0.006, H / 2 - 0.002], [0.012, H, W - 0.006, H / 2 - 0.002]]) {
    box(flapHinge, [w, h, 0.0015], [x, y, 0.0012], dark);
  }

  const restQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  const restP = new THREE.Vector3(-W / 2, 0.004, H / 2);
  const showQ = new THREE.Quaternion(), showP = new THREE.Vector3();
  let k = 0;
  // Where the open wallet should float: centred on `center`, facing a camera at camPos.
  function layout(camPos, center) {
    g.updateWorldMatrix(true, false);
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(camPos, center, new THREE.Vector3(0, 1, 0)));
    const corner = center.clone().sub(new THREE.Vector3(W, H * 0.85, 0).applyQuaternion(q));
    showP.copy(g.worldToLocal(corner));
    showQ.copy(g.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q));
  }
  const step = (v, a, b) => { const e = Math.max(0, Math.min(1, (v - a) / (b - a))); return e * e * (3 - 2 * e); };
  function set(v) {
    k = v;
    const lift = step(v, 0, 0.45);
    body.position.lerpVectors(restP, showP, lift);
    body.position.y += Math.sin(lift * Math.PI) * 0.06;
    body.quaternion.slerpQuaternions(restQ, showQ, lift);
    right.rotation.y = -Math.PI * (1 - step(v, 0.4, 0.75));
    flapHinge.rotation.x = Math.PI * (1 - step(v, 0.65, 0.95));
  }
  set(0);
  return { group: g, cards: [...cards, id], layout, set, get k() { return k; } };
}

const skillFront = (c) => (ctx, w, h, L) => {
  const [a, b, ink] = CARD_THEMES[c.theme];
  ctx.beginPath(); ctx.roundRect(0, 0, w, h, 28); ctx.save(); ctx.clip();
  const gr = ctx.createLinearGradient(0, 0, w, h); gr.addColorStop(0, a); gr.addColorStop(1, b);
  ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = ink;
  ctx.font = 'bold 44px Georgia, serif'; ctx.fillText(c.name, 32, 64);
  ctx.font = `20px ${MONO}`; ctx.textAlign = 'right'; ctx.fillText(c.kind[L].toUpperCase(), w - 32, 58); ctx.textAlign = 'left';
  ctx.fillStyle = '#e6c46c'; ctx.beginPath(); ctx.roundRect(32, 92, 62, 46, 8); ctx.fill();
  ctx.fillStyle = ink; ctx.font = `22px ${MONO}`;
  c.items.slice(0, 6).forEach((it, i) => ctx.fillText(it, 32 + (i % 2) * 230, 186 + Math.floor(i / 2) * 32));
  ctx.font = `18px ${MONO}`; ctx.globalAlpha = 0.8; ctx.fillText('FACUNDO SORASIO', 32, h - 26); ctx.globalAlpha = 1;
  ctx.restore();
};

const ID_FIELDS = {
  en: ['DEVELOPER ID', ['SURNAME', 'SORASIO'], ['NAME', 'FACUNDO'], ['UNIVERSITY', 'FIUBA'], ['ROLE', 'CS STUDENT · DEV']],
  es: ['CREDENCIAL DEV', ['APELLIDO', 'SORASIO'], ['NOMBRE', 'FACUNDO'], ['UNIVERSIDAD', 'FIUBA'], ['ROL', 'ESTUDIANTE · DEV']]
};
const idFrontDraw = (avatar) => (ctx, w, h, L) => {
  const [title, ...fields] = ID_FIELDS[L];
  ctx.beginPath(); ctx.roundRect(0, 0, w, h, 24); ctx.save(); ctx.clip();
  const gr = ctx.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#e9eef4'); gr.addColorStop(0.6, '#cfdbe6'); gr.addColorStop(1, '#e6d9ef');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#3a4a66'; ctx.font = `bold 20px ${MONO}`; ctx.fillText(title, 28, 40);
  ctx.fillStyle = '#74acdf'; ctx.fillRect(w - 70, 22, 42, 26); ctx.fillStyle = '#fff'; ctx.fillRect(w - 70, 31, 42, 8);
  ctx.fillStyle = '#b9c6d3'; ctx.fillRect(28, 62, 132, 168);
  if (avatar.img) drawCover(ctx, avatar.img, 28, 62, 132, 168);
  fields.forEach(([k, v], i) => {
    ctx.fillStyle = '#5d6b83'; ctx.font = `14px ${MONO}`; ctx.fillText(k, 182, 80 + i * 44);
    ctx.fillStyle = '#1d2533'; ctx.font = 'bold 22px Arial, sans-serif'; ctx.fillText(v, 182, 102 + i * 44);
  });
  ctx.fillStyle = '#3a4a66'; ctx.font = `17px ${MONO}`; ctx.fillText('DEV<<SORASIO<<FACUNDO<<<<FIUBA<<<<', 28, h - 30);
  ctx.restore();
};

// ---------- hallway, door, window, chair ----------
function buildHallway(hall, anim) {
  const H = { x0: -0.15, x1: 1.86, z0: R.z1 + 0.12, z1: 5.6 };
  const wall = '#efe9df';
  box(hall, [0.12, R.h, H.z1 - H.z0], [H.x0 - 0.06, R.h / 2, (H.z0 + H.z1) / 2], wall);
  box(hall, [0.12, R.h, H.z1 - H.z0], [H.x1 + 0.06, R.h / 2, (H.z0 + H.z1) / 2], wall);
  // back wall (behind the visitor) with the window the sun comes through
  const W2 = { a0: 0.55, a1: 2.0, y0: 0.6, y1: 2.4 }, zb = H.z1 + 0.06;
  box(hall, [W2.a0 - H.x0 + 0.12, R.h, 0.12], [(H.x0 - 0.12 + W2.a0) / 2, R.h / 2, zb], wall);
  box(hall, [W2.a1 - W2.a0, W2.y0, 0.12], [(W2.a0 + W2.a1) / 2, W2.y0 / 2, zb], wall);
  box(hall, [W2.a1 - W2.a0, R.h - W2.y1, 0.12], [(W2.a0 + W2.a1) / 2, (R.h + W2.y1) / 2, zb], wall);
  box(hall, [0.05, W2.y1 - W2.y0, 0.06], [(W2.a0 + W2.a1) / 2, (W2.y0 + W2.y1) / 2, zb], '#d9d4cb');
  box(hall, [W2.a1 - W2.a0, 0.05, 0.06], [(W2.a0 + W2.a1) / 2, 1.65, zb], '#d9d4cb');
  box(hall, [H.x1 - H.x0 + 0.24, 0.12, H.z1 - H.z0], [(H.x0 + H.x1) / 2, R.h + 0.06, (H.z0 + H.z1) / 2], C.ceiling);

  // The visitor: invisible, only its shadow shows on the left wall. It faces the
  // wall so the low sun throws a clean front silhouette.
  const ghost = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
  const me = group(hall, [0.95, 0, 4.45], null, -Math.PI / 2);
  const part = (parent, geo, pos, scale) => {
    const m = put(parent, geo, ghost, pos);
    m.receiveShadow = false;
    if (scale) m.scale.set(...scale);
    return m;
  };
  const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 4, 10);
  const body = group(me, [0, 0, 0]);
  for (const s of [-1, 1]) {
    part(body, cap(0.068, 0.72), [s * 0.1, 0.46, 0]);
    part(body, new THREE.BoxGeometry(0.1, 0.06, 0.24), [s * 0.11, 0.03, 0.05]);
  }
  part(body, new THREE.BoxGeometry(0.34, 0.2, 0.2), [0, 0.9, 0]);
  part(body, cap(0.16, 0.34), [0, 1.2, 0], [1.3, 1, 0.75]);
  part(body, new THREE.CylinderGeometry(0.05, 0.055, 0.1, 8), [0, 1.5, 0]);
  const head = part(body, new THREE.SphereGeometry(0.1, 14, 12), [0, 1.65, 0], [0.9, 1.15, 1]);
  part(head, new THREE.SphereGeometry(0.1, 10, 8), [0, 0.05, -0.01], [1.1, 0.65, 1.05]);
  for (const s of [-1, 1]) {
    const shoulder = group(body, [s * 0.235, 1.42, 0]);
    shoulder.rotation.z = s * 0.1;
    part(shoulder, cap(0.045, 0.26), [0, -0.17, 0]);
    const elbow = group(shoulder, [0, -0.33, 0]);
    part(elbow, cap(0.04, 0.22), [0, -0.14, 0]);
    part(elbow, new THREE.SphereGeometry(0.045, 8, 6), [0, -0.3, 0]);
  }
  anim.push((t) => {
    if (!me.visible) return;
    // just standing there, breathing
    body.rotation.z = Math.sin(t * 0.8) * 0.012;
    head.rotation.z = Math.sin(t * 0.5) * 0.04;
  });
}

// The view out of the window, in layers so it has depth and parallax: the
// building across the street, the city further back, then the sky. Each layer
// has a day and a night version; at dusk the night one fades in over the day.
function buildWindow(root, anim, sky) {
  const x = R.x0 - 0.06, zc = (WIN.z0 + WIN.z1) / 2, yc = (WIN.y0 + WIN.y1) / 2;
  const frame = M('#9a9ca2', { roughness: 0.5, metalness: 0.3 });
  box(root, [0.14, 0.025, WIN.z1 - WIN.z0 + 0.04], [x + 0.01, WIN.y0 - 0.012, zc], '#eeebe5'); // slim sill, flush with the wall
  for (const z of [WIN.z0, zc, WIN.z1]) box(root, [0.08, WIN.y1 - WIN.y0, 0.05], [x, yc, z], frame);
  box(root, [0.08, 0.05, WIN.z1 - WIN.z0], [x, WIN.y1, zc], frame);
  box(root, [0.05, 0.08, WIN.z1 - WIN.z0 + 0.12], [x + 0.1, WIN.y1 + 0.08, zc], '#e3d6b4');
  box(root, [0.01, 0.34, WIN.z1 - WIN.z0], [x + 0.1, WIN.y1 - 0.14, zc], M('#e9dcb8', { transparent: true, opacity: 0.85 })).castShadow = false;

  const layers = [];
  const layer = (dist, w, h, y, day, night, transparent = true) => {
    const t = canvasTex(1024, Math.round(1024 * h / w), (ctx, cw, ch, n) => {
      ctx.clearRect(0, 0, cw, ch);
      day(ctx, cw, ch);
      if (n > 0) { ctx.save(); ctx.globalAlpha = n; night(ctx, cw, ch); ctx.restore(); }
    });
    layers.push(t);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t.tex, transparent, depthWrite: !transparent }));
    m.position.set(R.x0 - dist, y, zc);
    m.rotation.y = Math.PI / 2;
    m.userData.dynamic = true;
    root.add(m);
  };
  const facade = (ctx, w, h, base, glass, rows, cols, haze = 0) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    const cw = w / cols, rh = h / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      ctx.fillStyle = glass; ctx.fillRect(c * cw + cw * 0.2, r * rh + rh * 0.25, cw * 0.6, rh * 0.55);
      ctx.fillStyle = 'rgba(231,164,122,0.6)'; ctx.fillRect(c * cw + cw * 0.2, r * rh + rh * 0.25, cw * 0.6, rh * 0.08);
    }
    if (haze) { ctx.fillStyle = `rgba(246,199,154,${haze})`; ctx.fillRect(0, 0, w, h); }
  };
  // at night: dark walls, and a few windows with the lights on
  const facadeNight = (ctx, w, h, base, rows, cols) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    const cw = w / cols, rh = h / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r * 3 + c * 7) % 5 < 2 ? '#ffc874' : '#161b28';
      ctx.fillRect(c * cw + cw * 0.2, r * rh + rh * 0.25, cw * 0.6, rh * 0.55);
    }
  };
  // the far city's skyline, the same by day and by night
  const blocks = (w, h, fn) => {
    for (let bx = 0; bx < w;) {
      const bw = 60 + ((bx * 37) % 90), bh = h * (0.35 + ((bx * 13) % 50) / 100);
      fn(bx, bw, bh);
      bx += bw + 6;
    }
  };
  // sky
  layer(30, 70, 34, 6, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#7fa6e6'); g.addColorStop(0.6, '#f6c79a'); g.addColorStop(1, '#f0a77f');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (const [cx, cy, r] of [[220, 120, 40], [260, 110, 50], [300, 125, 36], [700, 80, 30], [740, 72, 42]]) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); }
  }, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#060b1f'); g.addColorStop(0.6, '#16224a'); g.addColorStop(1, '#3a3858');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = `rgba(255,255,240,${0.35 + (i % 5) * 0.13})`;
      ctx.fillRect((i * 197) % w, (i * 89) % (h * 0.6), 1.5 + (i % 3) * 0.7, 1.5 + (i % 3) * 0.7);
    }
    const mx = 640, my = 130;
    const halo = ctx.createRadialGradient(mx, my, 20, mx, my, 90);
    halo.addColorStop(0, 'rgba(240,236,220,0.35)'); halo.addColorStop(1, 'rgba(240,236,220,0)');
    ctx.fillStyle = halo; ctx.fillRect(mx - 90, my - 90, 180, 180);
    ctx.fillStyle = '#f3efe0'; ctx.beginPath(); ctx.arc(mx, my, 24, 0, 7); ctx.fill();
  }, false);
  // far city, hazy
  layer(16, 34, 14, 2, (ctx, w, h) => {
    blocks(w, h, (bx, bw, bh) => {
      ctx.fillStyle = ['#e8ddd3', '#ddd2c8', '#efe6dc'][(bx / 7 | 0) % 3];
      ctx.fillRect(bx, h - bh, bw, bh);
      ctx.fillStyle = 'rgba(160,170,190,0.5)';
      for (let y = h - bh + 14; y < h - 10; y += 22) for (let x = bx + 8; x < bx + bw - 12; x += 18) ctx.fillRect(x, y, 8, 10);
    });
    ctx.fillStyle = 'rgba(246,199,154,0.35)'; ctx.fillRect(0, 0, w, h);
  }, (ctx, w, h) => {
    blocks(w, h, (bx, bw, bh) => {
      ctx.fillStyle = ['#1b2033', '#20263a', '#171c2c'][(bx / 7 | 0) % 3];
      ctx.fillRect(bx, h - bh, bw, bh);
      for (let y = h - bh + 14; y < h - 10; y += 22) for (let x = bx + 8; x < bx + bw - 12; x += 18) {
        ctx.fillStyle = (x * 7 + y * 13) % 11 < 3 ? 'rgba(255,205,130,0.9)' : 'rgba(40,48,70,0.9)';
        ctx.fillRect(x, y, 8, 10);
      }
    });
    ctx.fillStyle = 'rgba(30,40,80,0.2)'; ctx.fillRect(0, 0, w, h);
  });
  // the building across the street, close and sharp
  const across = (draw) => (ctx, w, h) => {
    ctx.save(); ctx.beginPath(); ctx.rect(0, h * 0.12, w * 0.42, h); ctx.rect(w * 0.6, h * 0.25, w * 0.4, h); ctx.clip();
    draw(ctx, w, h);
    ctx.restore();
  };
  layer(5, 9, 7, 1.6, across((ctx, w, h) => facade(ctx, w, h, '#f3eee6', '#b7c2cf', 9, 10)),
    across((ctx, w, h) => facadeNight(ctx, w, h, '#2d2e38', 9, 10)));

  // check the time now and then; at dawn and dusk the view changes in small steps
  let checked = -Infinity;
  anim.push((t) => {
    if (t - checked < 20 && sky.night >= 0) return;
    checked = t;
    const n = Math.round(baNight() * 20) / 20;
    if (n === sky.night) return;
    sky.night = n;
    for (const l of layers) l.redraw(n);
  });
}

// The desk lamp, like the real one: a round base with a switch, a ribbed gooseneck
// and a black dome shade, silver inside. It turns on by itself when night falls
// and off at daybreak; clicking it switches it in between.
function buildDeskLamp(g, anim, sky) {
  const black = M('#1d1d21', { roughness: 0.6, flatShading: false });
  cyl(g, [0.06, 0.065, 0.024, 24], [0, 0.012, 0], black);
  cyl(g, [0.066, 0.066, 0.003, 24], [0, 0.0015, 0], M('#9a9ca2', { metalness: 0.6, roughness: 0.4 })); // the metal rim at the bottom
  box(g, [0.014, 0.006, 0.012], [0.03, 0.026, 0.0], C.black); // the switch
  // gooseneck: up from the back of the base, over, and level at the joint
  const neck = new THREE.CatmullRomCurve3([[-0.035, 0.02, 0], [-0.04, 0.12, 0], [-0.025, 0.2, 0], [0.02, 0.245, 0], [0.065, 0.255, 0]].map((p) => new THREE.Vector3(...p)));
  const ribs = canvasTex(64, 16, (ctx, w, h) => {
    ctx.fillStyle = '#26262b'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#0c0c0e'; ctx.fillRect(w / 2, 0, w / 4, h);
  }, [36, 1]);
  put(g, new THREE.TubeGeometry(neck, 40, 0.008, 8), new THREE.MeshStandardMaterial({ map: ribs.tex, roughness: 0.5 }), [0, 0, 0]);
  cyl(g, [0.014, 0.014, 0.03, 12], [0.075, 0.255, 0], black, [Math.PI / 2, 0, 0]); // the joint
  // the shade: a dome around its own axis, tilted so it lights the desk in front
  const shade = group(g, [0.153, 0.156, 0]);
  shade.rotation.z = 0.6;
  // bottom to top, so the faces point outwards
  const profile = [[0.067, 0], [0.062, 0.012], [0.05, 0.035], [0.038, 0.06], [0.033, 0.085], [0.03, 0.11], [0.02, 0.119], [0.001, 0.12]].map(([x, y]) => new THREE.Vector2(x, y));
  put(shade, new THREE.LatheGeometry(profile, 24), M('#1d1d21', { roughness: 0.55, flatShading: false, side: THREE.FrontSide }), [0, 0, 0]);
  put(shade, new THREE.LatheGeometry(profile.map((v) => new THREE.Vector2(v.x * 0.96, v.y + 0.002)), 24),
    M('#d9dade', { roughness: 0.3, metalness: 0.7, flatShading: false, side: THREE.BackSide }), [0, 0, 0]).castShadow = false;
  const bulb = ball(shade, 0.026, [0, 0.03, 0], glow(C.lamp, 0.1), 2);
  bulb.castShadow = false;
  const light = new THREE.SpotLight(C.lamp, 0, 2.2, 0.75, 0.6, 1.4); // no shadow: it would render the room again
  light.position.set(0, 0.03, 0);
  light.target.position.set(0, -1, 0);
  shade.add(light, light.target);

  let on = false;
  const set = (v) => { on = v; light.intensity = on ? 3 : 0; bulb.material.emissiveIntensity = on ? 3 : 0.1; };
  let dark = null;
  anim.push(() => {
    const d = sky.night > 0.5;
    if (d !== dark) { dark = d; set(d); }
  });
  return { kind: 'toggle', group: g, anchor: [0.1, 0.3, 0], toggle() { set(!on); } };
}

function buildDoor(root, anim) {
  const z = R.z1 + 0.06;
  const white = M('#f6f3ee', { roughness: 0.6 });
  for (const face of [-0.075, 0.075]) {
    box(root, [0.07, DOOR.h + 0.07, 0.02], [DOOR.x0 - 0.035, (DOOR.h + 0.07) / 2, z + face], white);
    box(root, [0.07, DOOR.h + 0.07, 0.02], [DOOR.x1 + 0.035, (DOOR.h + 0.07) / 2, z + face], white);
    box(root, [DOOR.x1 - DOOR.x0 + 0.14, 0.07, 0.02], [(DOOR.x0 + DOOR.x1) / 2, DOOR.h + 0.035, z + face], white);
  }
  // the leaf hinges on the right (seen from the hallway) and swings into the room
  const hinge = group(root, [DOOR.x1, 0, z]);
  const w = DOOR.x1 - DOOR.x0;
  const leaf = group(hinge, [-w / 2, 0, 0]);
  box(leaf, [w - 0.01, DOOR.h - 0.01, 0.04], [0, DOOR.h / 2, 0], white);
  for (const s of [-1, 1]) {
    box(leaf, [w - 0.2, 0.95, 0.01], [0, 1.4, s * 0.024], white);
    box(leaf, [w - 0.2, 0.55, 0.01], [0, 0.45, s * 0.024], white);
  }
  const handle = group(leaf, [-w / 2 + 0.08, 1.0, 0], 'handle');
  const chrome = M('#cfd2d6', { metalness: 0.8, roughness: 0.25, flatShading: false });
  for (const s of [-1, 1]) {
    cyl(handle, [0.025, 0.025, 0.01, 16], [0, 0, s * 0.025], chrome, [Math.PI / 2, 0, 0]);
    cyl(handle, [0.01, 0.01, 0.05, 10], [0, 0, s * 0.045], chrome, [Math.PI / 2, 0, 0]);
    box(handle, [0.12, 0.018, 0.02], [0.055, 0, s * 0.07], chrome);
    cyl(leaf, [0.012, 0.012, 0.01, 10], [-w / 2 + 0.08, 0.93, s * 0.025], chrome, [Math.PI / 2, 0, 0]); // keyhole: on the leaf, it doesn't turn with the lever
  }

  // Name sign hanging from one nail by two strings to its top corners. It swings
  // like a pendulum; clicking it gives it a push. It rests a little crooked.
  const nail = group(leaf, [0, 1.78, 0.025]);
  ball(nail, 0.008, [0, 0, 0.004], C.steel, 0);
  const sign = group(nail, [0, 0, 0.01], 'sign');
  const SW = 0.4, drop = 0.11, half = SW / 2 - 0.03;
  for (const s of [-1, 1]) {
    box(sign, [Math.hypot(half, drop), 0.003, 0.003], [s * half / 2, -drop / 2, 0], '#6a4a2a', [0, 0, -s * Math.atan2(drop, half)]);
  }
  const plate = canvasTex(512, 160, (ctx, w2, h2) => {
    ctx.fillStyle = '#c99a63'; ctx.fillRect(0, 0, w2, h2);
    for (let i = 0; i < 18; i++) { ctx.fillStyle = `rgba(90,50,20,${0.05 + (i % 5) * 0.02})`; ctx.fillRect(0, (i * 53) % h2, w2, 2 + (i % 3)); }
    ctx.fillStyle = '#3a2412'; ctx.textAlign = 'center'; ctx.font = `bold 72px ${HAND}`;
    ctx.fillText('Facundo Sorasio', w2 / 2, h2 / 2 + 24);
  });
  box(sign, [SW, 0.125, 0.015], [0, -drop - 0.0625, 0], M('#b8874f'));
  put(sign, new THREE.PlaneGeometry(SW - 0.01, 0.12), paperMat(plate.tex), [0, -drop - 0.0625, 0.0081]);
  const REST = 0.09;
  const swing = { a: REST, v: 0 };
  sign.rotation.z = REST;
  anim.push((t, dt) => {
    if (Math.abs(swing.v) < 1e-4 && Math.abs(swing.a - REST) < 1e-4) return;
    swing.v += (-28 * Math.sin(swing.a - REST) - 1.1 * swing.v) * dt;
    swing.a += swing.v * dt;
    sign.rotation.z = swing.a;
  });
  sign.userData.push = (dir = Math.random() > 0.5 ? 1 : -1) => { swing.v += dir * (2.2 + Math.random()); };

  return { hinge, handle, sign, anchor: new THREE.Vector3(DOOR.x0 + 0.08, 1.0, z + 0.1) };
}

function buildChair(g) {
  const mesh = M('#8a8c92', { roughness: 0.9 });
  const frame = M('#b7b9be', { roughness: 0.4, metalness: 0.5 });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    box(g, [0.3, 0.03, 0.04], [Math.cos(a) * 0.15, 0.07, Math.sin(a) * 0.15], frame, [0, -a, 0]);
    ball(g, 0.028, [Math.cos(a) * 0.3, 0.028, Math.sin(a) * 0.3], C.black, 0);
  }
  cyl(g, [0.025, 0.03, 0.34], [0, 0.25, 0], frame);
  box(g, [0.5, 0.07, 0.48], [0, 0.46, 0.02], mesh);
  box(g, [0.5, 0.02, 0.44], [0, 0.42, 0.02], C.graphite);
  const back = group(g, [0, 0.5, -0.24]);
  back.rotation.x = -0.12;
  box(back, [0.46, 0.55, 0.035], [0, 0.32, 0], mesh);
  box(back, [0.04, 0.6, 0.05], [0, 0.3, -0.03], frame);
  box(back, [0.3, 0.12, 0.05], [0, 0.72, 0.0], mesh);
  box(back, [0.03, 0.12, 0.03], [0, 0.63, -0.02], frame);
  for (const s of [-1, 1]) {
    box(g, [0.04, 0.2, 0.04], [s * 0.27, 0.58, 0.0], frame);
    box(g, [0.08, 0.025, 0.24], [s * 0.27, 0.69, 0.02], C.graphite);
  }
}

function buildDust(root, anim) {
  const N = 120;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) pos.set([-1.7 + Math.random() * 2.2, Math.random() * 2.2, -1.2 + Math.random() * 2], i * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffe7c2', size: 0.008, transparent: true, opacity: 0.7, depthWrite: false }));
  root.add(pts);
  anim.push((t, dt) => {
    for (let i = 0; i < N; i++) {
      pos[i * 3 + 1] += dt * 0.015;
      pos[i * 3] += Math.sin(t * 0.3 + i) * dt * 0.01;
      if (pos[i * 3 + 1] > 2.2) pos[i * 3 + 1] = 0.2;
    }
    geo.attributes.position.needsUpdate = true;
  });
}
