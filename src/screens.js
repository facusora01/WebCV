// In-world UI: every piece of information lives on a screen or an object in the
// room. A screen is a canvas texture plus a list of clickable rectangles that the
// app registers while it draws. Pages are flat textures for the "inspect" view
// (cards, the name tag, the ear tag, the notebook).
import * as THREE from 'three';
import { projects, about, experience, education, contact, pharmacies, screenText } from './content.js';

const MONO = '"JetBrains Mono", ui-monospace, monospace';
const SERIF = '"Fraunces", Georgia, serif';
const SANS = 'Inter, system-ui, sans-serif';
const HAND = '"Caveat", "Segoe Print", cursive';
const P = (id) => projects.find((p) => p.id === id);

// what time it is in Facundo's room, whatever the visitor's own time zone
const baClock = new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hour12: false });
export const baTime = () => baClock.format(new Date());

// How dark it is there now: 0 by day, 1 at night, in between at dawn and dusk. Sunrise and
// sunset follow the seasons (about 5:40 and 20:10 in December, 8:00 and 18:00 in June).
const baParts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Argentina/Buenos_Aires', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' });
export function baNight(date = new Date()) {
  const p = Object.fromEntries(baParts.formatToParts(date).map((x) => [x.type, +x.value]));
  const h = p.hour + p.minute / 60;
  const season = Math.cos((((p.month - 1) * 30.44 + p.day - 355) / 365) * 2 * Math.PI); // 1 at midsummer, -1 at midwinter
  const rise = 6.9 - 1.2 * season, set = 19.1 + 1.05 * season;
  const s = (a, b) => THREE.MathUtils.smoothstep(h, a, b);
  return 1 - s(rise - 0.5, rise + 0.3) * (1 - s(set - 0.2, set + 0.7));
}

// Draws `text` wrapped to maxW; returns the y after the last line.
export function wrap(ctx, text, x, y, maxW, lh, maxLines = 99) {
  let line = '', n = 0;
  for (const word of String(text).split(' ')) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      if (++n >= maxLines) { ctx.fillText(line + '…', x, y); return y + lh; }
      ctx.fillText(line, x, y); y += lh; line = word;
    } else line = test;
  }
  if (line) { ctx.fillText(line, x, y); y += lh; }
  return y;
}
// draws img into the box like CSS object-fit: cover (cropped, never stretched)
export function drawCover(ctx, img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height);
  const sw = w / s, sh = h / s;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

function chips(ctx, items, x, y, maxW, { font = `18px ${MONO}`, fg = '#8fd6b8', bg = 'rgba(143,214,184,0.12)', h = 30 } = {}) {
  ctx.font = font;
  let cx = x;
  for (const it of items) {
    const w = ctx.measureText(it).width + 20;
    if (cx + w > x + maxW) { cx = x; y += h + 8; }
    ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(cx, y, w, h, 6); ctx.fill();
    ctx.fillStyle = fg; ctx.fillText(it, cx + 10, y + h * 0.68);
    cx += w + 8;
  }
  return y + h + 12;
}

// A canvas texture with clickable regions. app.draw(ui) is called on every redraw.
// dpr: canvas pixels per layout pixel; every redraw uploads the whole canvas, so
// screens that are only read from afar or redraw often should keep it low.
const PAGE_DPR = 1.5;
export function makeScreen(w, h, app, getLang, dpr = 2) {
  const canvas = document.createElement('canvas');
  canvas.width = w * dpr; canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const hits = [];
  const screen = {
    tex, app,
    redraw(t = screen.t || 0) {
      screen.t = t;
      hits.length = 0;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const L = getLang();
      app.draw({ ctx, w, h, t, L, T: screenText[L], btn: (x, y, bw, bh, fn) => hits.push({ x, y, bw, bh, fn }) });
      tex.needsUpdate = true;
    },
    click(u, v) {
      const x = u * w, y = (1 - v) * h;
      for (let i = hits.length - 1; i >= 0; i--) {
        const b = hits[i];
        if (x >= b.x && x <= b.x + b.bw && y >= b.y && y <= b.y + b.bh) { b.fn(); screen.redraw(); return true; }
      }
      return false;
    }
  };
  screen.redraw();
  return screen;
}

const openUrl = (url) => window.open(url, '_blank', 'noopener');

// ---------- the TV: Farmacéutica's live screen, a console menu, a Minecraft menu ----------
export function tvApp() {
  const app = { mode: 'turnero', info: false, sel: 0, focused: false };
  app.setMode = (m) => { app.mode = m; app.info = false; app.sel = 0; };
  app.draw = (u) => {
    if (app.mode === 'console') return drawConsole(u, app, ['leaguedt', 'automatch', 'lootmarket', 'readingmarathon']);
    if (app.mode === 'mods') return drawMods(u, app, ['stackstorage', 'moblevel', 'babyneeds']);
    if (app.info) return drawProjectSheet(u, P('farmaceutica'), { bg: '#0f1a17', accent: '#2ecc8c', back: () => { app.info = false; }, backLabel: u.T.liveScreen });
    drawTurnero(u);
    if (app.focused) {
      const { ctx, w, h, T } = u;
      ctx.font = `bold 22px ${SANS}`;
      const label = `ⓘ  ${T.aboutSystem}`, bw = ctx.measureText(label).width + 40;
      ctx.fillStyle = '#1f8a63'; ctx.beginPath(); ctx.roundRect(w - bw - 24, h - 66, bw, 46, 23); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillText(label, w - bw - 4, h - 36);
      u.btn(w - bw - 24, h - 66, bw, 46, () => { app.info = true; });
    }
  };
  return app;
}

function drawTurnero({ ctx, w, h, t, T }) {
  ctx.fillStyle = '#0f1a17'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#1f8a63'; ctx.fillRect(0, 0, w, 74);
  ctx.fillStyle = '#fff'; ctx.font = `bold 36px ${MONO}`; ctx.fillText(T.tvTitle, 28, 50);
  ctx.font = `22px ${MONO}`; ctx.textAlign = 'right';
  ctx.fillText(`${pharmacies.length} ${T.tvCount}`, w - 28, 48); ctx.textAlign = 'left';
  const rowH = 96;
  const row = (p, pos, y, highlight) => {
    if (highlight) { ctx.fillStyle = 'rgba(46,204,140,0.14)'; ctx.fillRect(0, y, w, rowH); ctx.fillStyle = '#2ecc8c'; ctx.fillRect(0, y, 10, rowH); }
    ctx.fillStyle = '#6f8f85'; ctx.font = `22px ${MONO}`; ctx.fillText(String(pos), 28, y + 40);
    ctx.fillStyle = '#f2f5f3'; ctx.font = `bold 34px ${MONO}`; ctx.fillText(p[0], 74, y + 42);
    ctx.fillStyle = '#2ecc8c'; ctx.textAlign = 'right'; ctx.fillText(p[2], w - 28, y + 42); ctx.textAlign = 'left';
    ctx.fillStyle = '#9fb3ad'; ctx.font = `22px ${MONO}`; ctx.fillText(p[1], 74, y + 78);
    ctx.fillStyle = '#25332f'; ctx.fillRect(0, y + rowH - 2, w, 2);
  };
  ctx.fillStyle = '#2ecc8c'; ctx.font = `20px ${MONO}`; ctx.fillText(T.tvNearest.toUpperCase(), 28, 104);
  row(pharmacies[0], 1, 114, true);
  const rest = pharmacies.slice(1);
  const top = 114 + rowH + 16;
  const DWELL = 5, SLIDE = 1.4, cycle = DWELL + SLIDE;
  const step = Math.floor(t / cycle), k = (t % cycle) - DWELL;
  const e = k > 0 ? 1 - (1 - k / SLIDE) ** 3 : 0;
  const offset = ((step % rest.length) + e) * rowH;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, top, w, h - top); ctx.clip();
  for (let i = 0; i < rest.length * 2; i++) {
    const y = top + i * rowH - offset;
    if (y > -rowH && y < h) row(rest[i % rest.length], (i % rest.length) + 2, y, false);
  }
  ctx.restore();
}

// A full-screen project sheet, shared by the TV info page and the other screens.
function drawProjectSheet(u, p, { bg, accent, ink = '#f2f0ea', sub = '#b9b4c9', back, backLabel, x0 = 40, top = 40, link = true }) {
  const { ctx, w, h, L, T } = u;
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  let y = top;
  if (back) {
    ctx.font = `20px ${MONO}`; ctx.fillStyle = sub;
    ctx.fillText(`← ${backLabel || T.back}`, x0, y + 16);
    u.btn(x0 - 10, y - 10, 300, 44, back);
    y += 50;
  }
  ctx.fillStyle = accent; ctx.font = `20px ${MONO}`; ctx.fillText(p.tag[L].toUpperCase(), x0, y + 10);
  if (link && p.links[0]) {
    const label = p.links[0].kind === 'repo' ? T.repo : T.visit;
    ctx.font = `bold 20px ${SANS}`;
    const bw = ctx.measureText(label).width + 40;
    ctx.fillStyle = accent; ctx.beginPath(); ctx.roundRect(w - bw - x0, y - 18, bw, 42, 21); ctx.fill();
    ctx.fillStyle = bg; ctx.fillText(label, w - bw - x0 + 20, y + 10);
    u.btn(w - bw - x0, y - 18, bw, 42, () => openUrl(p.links[0].url));
  }
  y += 52;
  ctx.fillStyle = ink; ctx.font = `600 48px ${SERIF}`; ctx.fillText(p.title, x0, y); y += 44;
  ctx.font = `21px ${SANS}`; ctx.fillStyle = sub;
  y = wrap(ctx, p.summary[L], x0, y, w - x0 * 2, 29, 7) + 6;
  y = chips(ctx, p.stack, x0, y, w - x0 * 2, { fg: accent }) + 22; // chips returns the row's bottom; text needs a baseline
  ctx.fillStyle = ink; ctx.font = `20px ${SANS}`;
  for (const f of p.features[L].slice(0, 3)) { if (y > h - 40) break; ctx.fillStyle = accent; ctx.fillText('›', x0, y); ctx.fillStyle = ink; y = wrap(ctx, f, x0 + 22, y, w - x0 * 2 - 22, 27, 2) + 4; }
  if (p.private) { ctx.fillStyle = accent; ctx.font = `20px ${MONO}`; ctx.fillText(`🔒 ${T.private}`, x0, Math.min(y + 10, h - 30)); }
}

function drawConsole(u, app, ids) {
  const { ctx, w, h, L, T } = u;
  const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#0b1a3a'); g.addColorStop(1, '#251247');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#c9d6ff'; ctx.font = `20px ${SANS}`; ctx.fillText(T.games, 40, 44);
  ctx.textAlign = 'right'; ctx.fillText(baTime(), w - 40, 44); ctx.textAlign = 'left';
  const colors = ['#2c6be0', '#e0532c', '#7a3ee0', '#2ca86b'];
  ids.forEach((id, i) => {
    const sel = i === app.sel, s = sel ? 132 : 104, x = 40 + i * 150, y = sel ? 66 : 80;
    ctx.fillStyle = colors[i]; ctx.beginPath(); ctx.roundRect(x, y, s, s, 14); ctx.fill();
    if (sel) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(x - 4, y - 4, s + 8, s + 8, 16); ctx.stroke(); }
    ctx.fillStyle = '#fff'; ctx.font = `bold ${sel ? 40 : 32}px ${SANS}`;
    ctx.fillText(P(id).title.slice(0, 2).toUpperCase(), x + 18, y + s - 22);
    u.btn(x, y, s, s, () => { app.sel = i; });
  });
  const p = P(ids[app.sel]);
  let y = 260;
  ctx.fillStyle = '#fff'; ctx.font = `600 46px ${SANS}`; ctx.fillText(p.title, 40, y); y += 34;
  ctx.fillStyle = '#9fb3ff'; ctx.font = `18px ${MONO}`; ctx.fillText(p.tag[L].toUpperCase(), 40, y); y += 38;
  ctx.fillStyle = '#d8def5'; ctx.font = `22px ${SANS}`;
  y = wrap(ctx, p.summary[L], 40, y, w - 80, 30, 4) + 4;
  chips(ctx, p.stack, 40, y, w - 300, { fg: '#fff', bg: 'rgba(255,255,255,0.14)' });
  if (p.links[0]) {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(w - 230, h - 76, 190, 48, 24); ctx.fill();
    ctx.fillStyle = '#0b1a3a'; ctx.font = `bold 20px ${SANS}`; ctx.fillText(`▶ ${T.repo}`, w - 205, h - 45);
    u.btn(w - 230, h - 76, 190, 48, () => openUrl(p.links[0].url));
  }
}

function drawMods(u, app, ids) {
  const { ctx, w, h, L, T } = u;
  // dirt background, Minecraft-menu style
  for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 32) {
    const n = (x * 7 + y * 13) % 5;
    ctx.fillStyle = ['#3b2a1d', '#46321f', '#33251a', '#4a3524', '#3f2d1e'][n]; ctx.fillRect(x, y, 32, 32);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center'; ctx.fillStyle = '#ffff55'; ctx.font = `bold 40px ${MONO}`;
  ctx.fillText(T.mods, w / 2, 62); ctx.textAlign = 'left';
  ids.forEach((id, i) => {
    const x = 40, y = 100 + i * 70, bw = 330, bh = 56, sel = i === app.sel;
    ctx.fillStyle = sel ? '#7a8fd6' : '#6b6b6b'; ctx.fillRect(x, y, bw, bh);
    ctx.fillStyle = sel ? '#c8d4ff' : '#9a9a9a'; ctx.fillRect(x, y, bw, 4); ctx.fillStyle = '#2a2a2a'; ctx.fillRect(x, y + bh - 4, bw, 4);
    ctx.fillStyle = '#fff'; ctx.font = `bold 24px ${MONO}`; ctx.textAlign = 'center';
    ctx.fillText(P(id).title, x + bw / 2, y + 37); ctx.textAlign = 'left';
    u.btn(x, y, bw, bh, () => { app.sel = i; });
  });
  const p = P(ids[app.sel]);
  const x0 = 410, w0 = w - x0 - 40;
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x0 - 16, 100, w0 + 32, h - 140);
  let y = 146;
  ctx.fillStyle = '#fff'; ctx.font = `bold 32px ${MONO}`; ctx.fillText(p.title, x0, y); y += 34;
  ctx.fillStyle = '#aaa'; ctx.font = `18px ${MONO}`; ctx.fillText(p.stack.join(' · '), x0, y); y += 38;
  ctx.fillStyle = '#e8e8e8'; ctx.font = `21px ${MONO}`;
  y = wrap(ctx, p.summary[L], x0, y, w0, 29, 6) + 8;
  for (const f of p.features[L].slice(0, 2)) { ctx.fillStyle = '#55ff55'; y = wrap(ctx, `+ ${f}`, x0, y, w0, 26, 2) + 2; }
  if (p.links[0]) {
    ctx.fillStyle = '#6b6b6b'; ctx.fillRect(x0, h - 96, 220, 44);
    ctx.fillStyle = '#fff'; ctx.font = `bold 20px ${MONO}`; ctx.fillText(T.repo, x0 + 20, h - 67);
    u.btn(x0, h - 96, 220, 44, () => openUrl(p.links[0].url));
  }
}

// ---------- monitor 2: a browser with the web projects ----------
export function browserApp() {
  // a Windows-like desktop: the web projects are just shortcuts; one opens in a browser window
  const app = { open: null };
  const ids = ['martina', 'amankay', 'wantit'];
  const tints = { martina: '#e98ea0', amankay: '#5ab0a0', wantit: '#f2a65a' };
  app.draw = (u) => {
    const { ctx, w, h } = u;
    // wallpaper: the misty forest from the photo
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#163a4a'); g.addColorStop(1, '#2f7a6a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 28; i++) {
      const x = i * 40 + (i % 3) * 7, th = 120 + (i * 53) % 160;
      ctx.fillStyle = i % 2 ? '#0f2a30' : '#14353a';
      ctx.beginPath(); ctx.moveTo(x, h - 48); ctx.lineTo(x + 22, h - 48 - th); ctx.lineTo(x + 44, h - 48); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,240,200,0.8)'; ctx.beginPath(); ctx.arc(w - 160, 90, 22, 0, 7); ctx.fill();
    // taskbar with the real time
    ctx.fillStyle = 'rgba(20,24,32,0.85)'; ctx.fillRect(0, h - 48, w, 48);
    ctx.fillStyle = '#7aa7ff'; ctx.beginPath(); ctx.roundRect(w / 2 - 20, h - 40, 32, 32, 6); ctx.fill();
    ctx.fillStyle = '#e8ecf4'; ctx.font = `18px ${SANS}`; ctx.textAlign = 'right'; ctx.fillText(baTime(), w - 20, h - 18); ctx.textAlign = 'left';
    // desktop shortcuts
    ids.forEach((id, i) => {
      const x = 28, y = 24 + i * 112;
      ctx.fillStyle = tints[id]; ctx.beginPath(); ctx.roundRect(x + 14, y, 64, 64, 14); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = `bold 30px ${SANS}`; ctx.textAlign = 'center';
      ctx.fillText(P(id).title[0].toUpperCase(), x + 46, y + 44);
      ctx.font = `15px ${SANS}`; ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 4;
      ctx.fillText(P(id).title, x + 46, y + 88);
      ctx.shadowBlur = 0; ctx.textAlign = 'left';
      u.btn(x, y, 92, 96, () => { app.open = id; });
    });
    if (!app.open) return;
    // the browser window with the project
    const p = P(app.open);
    const X = 150, Y = 26, W = w - 190, H = h - 92;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.roundRect(X + 6, Y + 8, W, H, 12); ctx.fill();
    ctx.fillStyle = '#d7d2e2'; ctx.beginPath(); ctx.roundRect(X, Y, W, H, 12); ctx.fill();
    ctx.fillStyle = '#ece9f2'; ctx.beginPath(); ctx.roundRect(X + 12, Y + 8, 260, 34, 8); ctx.fill();
    ctx.fillStyle = '#2b2430'; ctx.font = `16px ${SANS}`; ctx.fillText(p.title, X + 26, Y + 31);
    ctx.fillStyle = '#e0534a'; ctx.beginPath(); ctx.arc(X + W - 24, Y + 24, 10, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `bold 14px ${SANS}`; ctx.textAlign = 'center'; ctx.fillText('×', X + W - 24, Y + 29); ctx.textAlign = 'left';
    u.btn(X + W - 44, Y + 4, 40, 40, () => { app.open = null; });
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(X + 12, Y + 48, W - 24, 30, 15); ctx.fill();
    ctx.fillStyle = '#6a6375'; ctx.font = `15px ${MONO}`;
    ctx.fillText(`🔒 ${(p.links[0]?.url || `${p.dir}.local`).replace(/^https?:\/\//, '')}`, X + 28, Y + 69);
    ctx.save();
    ctx.beginPath(); ctx.rect(X, Y + 86, W, H - 86); ctx.clip();
    ctx.translate(X, Y + 86);
    drawProjectSheet({ ...u, w: W, h: H - 86, btn: (x, y, bw, bh, fn) => u.btn(x + X, y + Y + 86, bw, bh, fn) }, p,
      { bg: '#f7f4fb', accent: '#7a4fd8', ink: '#2b2430', sub: '#5d566a', x0: 32, top: 22 });
    ctx.restore();
  };
  return app;
}

// ---------- the old laptop: the server ----------
export function serverApp() {
  const app = { sel: null, focused: false };
  const ids = ['motibot', 'vikunja'];
  app.draw = (u) => {
    const { ctx, w, h, t, T } = u;
    if (app.sel != null) return drawProjectSheet(u, P(ids[app.sel]), { bg: '#0c0f14', accent: '#3ddc84', ink: '#e6efe9', sub: '#9aa9a2', back: () => { app.sel = null; } });
    ctx.fillStyle = '#0c0f14'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#3ddc84'; ctx.font = `22px ${MONO}`; ctx.fillText('sora@sora-srv:~$ pm2 list', 30, 50);
    ctx.fillStyle = '#6b7a74'; ctx.font = `18px ${MONO}`;
    ctx.fillText('name                 status    uptime', 30, 96);
    const rows = [['motibot', 0], ['vikunja-extra', 1], ['farmaceutica-api'], ['agroscanner-api'], ['amankay-server'], ['martina']];
    rows.forEach(([n, idx], i) => {
      const y = 136 + i * 50;
      const clickable = idx != null;
      if (clickable) { ctx.fillStyle = 'rgba(61,220,132,0.1)'; ctx.fillRect(20, y - 32, w - 40, 44); u.btn(20, y - 32, w - 40, 44, () => { app.sel = idx; }); }
      ctx.fillStyle = clickable ? '#e6efe9' : '#8a948f'; ctx.font = `20px ${MONO}`; ctx.fillText(n, 30, y);
      ctx.fillStyle = !app.focused || Math.sin(t * 3 + i) > -0.95 ? '#3ddc84' : '#0c0f14'; ctx.fillText('● online', 300, y); // blinks up close
      ctx.fillStyle = '#8a948f'; ctx.fillText(`${12 + i * 3}d`, 470, y);
      if (clickable) { ctx.fillStyle = '#3ddc84'; ctx.fillText('›', w - 50, y); }
    });
    ctx.fillStyle = '#6b7a74'; ctx.font = `17px ${MONO}`; ctx.fillText(T.serverHint, 30, h - 30);
  };
  return app;
}

// ---------- the phone: contact ----------
export function phoneApp(avatar) {
  const app = {};
  app.draw = (u) => {
    const { ctx, w, h, T } = u;
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2b3a8f'); g.addColorStop(1, '#ff9a6b');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff'; ctx.font = `bold 20px ${SANS}`; ctx.fillText(baTime(), 24, 34);
    ctx.save(); ctx.beginPath(); ctx.arc(w / 2, 150, 70, 0, 7); ctx.clip();
    ctx.fillStyle = '#ddd'; ctx.fillRect(w / 2 - 70, 80, 140, 140);
    if (avatar.img) drawCover(ctx, avatar.img, w / 2 - 70, 80, 140, 140);
    ctx.restore();
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
    ctx.font = `600 34px ${SERIF}`; ctx.fillText('Facundo Sorasio', w / 2, 270);
    ctx.font = `18px ${SANS}`; wrap(ctx, T.contactLead, w / 2, 304, w - 60, 24, 3);
    const colors = { Email: '#ffffff', WhatsApp: '#25d366', GitHub: '#111111' };
    contact.forEach((c, i) => {
      const y = 400 + i * 100;
      ctx.fillStyle = colors[c.label]; ctx.beginPath(); ctx.roundRect(40, y, w - 80, 76, 38); ctx.fill();
      ctx.fillStyle = c.label === 'Email' ? '#2b3a8f' : '#fff';
      ctx.font = `bold 24px ${SANS}`; ctx.fillText(c.label, w / 2, y + 34);
      ctx.font = `16px ${MONO}`; ctx.fillText(c.value, w / 2, y + 60);
      u.btn(40, y, w - 80, 76, () => openUrl(c.url));
    });
    ctx.textAlign = 'left';
  };
  return app;
}

// ---------- the printer's touch screen: the print queue ----------
export function printerApp() {
  const app = { sel: 0 };
  const ids = ['shapeshifter', 'letitride', 'showcase3d'];
  app.draw = (u) => {
    const { ctx, w, h, L, T } = u;
    ctx.fillStyle = '#151820'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#9aa'; ctx.font = `16px ${MONO}`; ctx.fillText(T.queue, 18, 28);
    ids.forEach((id, i) => {
      const y = 44 + i * 58, sel = i === app.sel;
      ctx.fillStyle = sel ? '#2a3a2e' : '#1f232c'; ctx.beginPath(); ctx.roundRect(14, y, 196, 50, 8); ctx.fill();
      ctx.fillStyle = sel ? '#2ecc71' : '#ccc'; ctx.font = `15px ${MONO}`; ctx.fillText(`${P(id).dir}.gcode`, 26, y + 31);
      u.btn(14, y, 196, 50, () => { app.sel = i; });
    });
    const p = P(ids[app.sel]);
    const x0 = 228, w0 = w - x0 - 14;
    ctx.fillStyle = '#fff'; ctx.font = `bold 24px ${SANS}`; ctx.fillText(p.title, x0, 42);
    ctx.fillStyle = '#2ecc71'; ctx.font = `13px ${MONO}`; ctx.fillText(p.tag[L].toUpperCase(), x0, 62);
    ctx.fillStyle = '#ccd'; ctx.font = `15px ${SANS}`;
    const y = wrap(ctx, p.summary[L], x0, 88, w0, 20, 8);
    ctx.fillStyle = '#9aa'; ctx.font = `13px ${MONO}`; wrap(ctx, p.stack.join(' · '), x0, y + 8, w0, 17, 2);
    if (p.links[0]) {
      ctx.fillStyle = '#2ecc71'; ctx.beginPath(); ctx.roundRect(14, h - 58, 196, 44, 22); ctx.fill();
      ctx.fillStyle = '#151820'; ctx.font = `bold 16px ${SANS}`; ctx.textAlign = 'center';
      ctx.fillText(`▶ ${p.links[0].kind === 'repo' ? T.repo : T.visit}`, 112, h - 30); ctx.textAlign = 'left';
      u.btn(14, h - 58, 196, 44, () => openUrl(p.links[0].url));
    }
  };
  return app;
}

// ---------- flat pages for the inspect view ----------
export function pageCanvas(w, h, draw, getLang) {
  const canvas = document.createElement('canvas');
  canvas.width = w * PAGE_DPR; canvas.height = h * PAGE_DPR;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const page = { tex, redraw() { const L = getLang(); ctx.setTransform(PAGE_DPR, 0, 0, PAGE_DPR, 0, 0); ctx.clearRect(0, 0, w, h); draw(ctx, w, h, L, screenText[L]); tex.needsUpdate = true; } };
  page.redraw();
  return page;
}

const cardBack = (bgA, bgB, ink) => (ctx, w, h) => {
  ctx.beginPath(); ctx.roundRect(0, 0, w, h, 28); ctx.save(); ctx.clip();
  const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, bgA); g.addColorStop(1, bgB);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 34, w, 50); // magnetic stripe
  ctx.restore();
  ctx.fillStyle = ink;
};

export const CARD_THEMES = {
  agents: ['#1b1430', '#3b2a86', '#fff'], python: ['#2f5f9e', '#3776ab', '#fff'], ts: ['#cfd4dc', '#8e97a6', '#14213d'],
  data: ['#b8862f', '#e8c46a', '#2b1d05'], infra: ['#0d0d10', '#2a2a33', '#fff'], game: ['#4fae3f', '#2d6e2a', '#fff'],
  mobile: ['#ff8a5c', '#e2508a', '#fff'], uni: ['#f3ead8', '#d9c7a6', '#3b2a1a']
};

// back of a skill card: what is on it, in big type
export function skillBack(c) {
  const [a, b, ink] = CARD_THEMES[c.theme];
  return (ctx, w, h, L, T) => {
    cardBack(a, b, ink)(ctx, w, h);
    ctx.font = `600 30px ${SERIF}`; ctx.fillText(c.name, 28, 124);
    ctx.font = `20px ${MONO}`; ctx.globalAlpha = 0.8; ctx.fillText(c.kind[L].toUpperCase(), 28, 152); ctx.globalAlpha = 1;
    ctx.font = `22px ${MONO}`;
    c.items.forEach((it, i) => ctx.fillText(`· ${it}`, 28 + (i % 2) * 240, 196 + Math.floor(i / 2) * 32));
  };
}
// back of the developer ID: about me
export function idBack(ctx, w, h, L, T) {
  cardBack('#e9eef4', '#e6d9ef', '#1d2533')(ctx, w, h);
  ctx.font = `600 26px ${SERIF}`; ctx.fillText(T.aboutTitle, 28, 120);
  ctx.font = `15.5px ${SANS}`;
  let y = 148;
  for (const p of about[L]) y = wrap(ctx, p, 28, y, w - 56, 20, 5) + 6;
}

export function stickerBack(ctx, w, h, L, T) {
  const p = P('appointa');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#2b3fb8'; ctx.fillRect(0, 0, w, 60);
  ctx.fillStyle = '#fff'; ctx.font = `bold 30px ${SANS}`; ctx.fillText('Appointa', 24, 40);
  ctx.fillStyle = '#2b3fb8'; ctx.font = `15px ${MONO}`; ctx.fillText(p.tag[L].toUpperCase(), 24, 90);
  ctx.fillStyle = '#222'; ctx.font = `18px ${SANS}`;
  const y = wrap(ctx, p.summary[L], 24, 120, w - 48, 24, 6) - 8;
  chips(ctx, p.stack, 24, y, w - 48, { fg: '#2b3fb8', bg: 'rgba(43,63,184,0.1)', font: `15px ${MONO}`, h: 26 });
}

const tagShape = (ctx, w, h) => {
  ctx.fillStyle = '#f2c230';
  ctx.beginPath(); ctx.roundRect(0, 30, w, h - 30, 40); ctx.fill();
  ctx.beginPath(); ctx.arc(w / 2, 40, 34, 0, 7); ctx.fill();
  ctx.fillStyle = '#c9a020'; ctx.beginPath(); ctx.arc(w / 2, 40, 14, 0, 7); ctx.fill();
};
export function earTag(ctx, w, h, L, T) {
  tagShape(ctx, w, h);
  ctx.fillStyle = '#1a1a1a'; ctx.textAlign = 'center';
  ctx.font = `bold 44px ${MONO}`; ctx.fillText('AR 0042', w / 2, 140);
  ctx.font = `600 34px ${SANS}`; ctx.fillText('AgroScanner', w / 2, 200);
  ctx.textAlign = 'left';
}
export function earTagBack(ctx, w, h, L, T) {
  const p = P('agroscanner');
  tagShape(ctx, w, h);
  ctx.fillStyle = '#1a1a1a'; ctx.font = `bold 24px ${SANS}`; ctx.fillText('AgroScanner', 34, 112);
  ctx.font = `18px ${SANS}`;
  let y = wrap(ctx, p.summary[L], 34, 146, w - 68, 25, 7) + 6;
  ctx.font = `16px ${MONO}`; y = wrap(ctx, p.stack.join(' · '), 34, y, w - 68, 22, 2);
  ctx.font = `bold 16px ${MONO}`; ctx.fillText(`🔒 ${T.private}`, 34, y + 12);
}

// the round gold tag on a dog's collar: name and job on the front, a note on the back
const tagDisc = (ctx, w, h) => {
  const r = w / 2 - 8;
  const g = ctx.createRadialGradient(w * 0.4, h * 0.38, r * 0.1, w / 2, h / 2, r);
  g.addColorStop(0, '#fff1b8'); g.addColorStop(0.6, '#e6b84a'); g.addColorStop(1, '#b8862a');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(w / 2, h / 2, r, 0, 7); ctx.fill();
  ctx.strokeStyle = '#9a6d1c'; ctx.lineWidth = 6; ctx.stroke();
  ctx.fillStyle = '#9a6d1c'; ctx.beginPath(); ctx.arc(w / 2, 34, 12, 0, 7); ctx.fill(); // the ring hole
  ctx.fillStyle = '#5a3d0c'; ctx.textAlign = 'center';
};
export const dogTag = (id) => (ctx, w, h, L, T) => {
  const [name, role] = T.tags[id];
  tagDisc(ctx, w, h);
  ctx.font = `bold 64px ${SERIF}`; ctx.fillText(name, w / 2, h / 2 + 4);
  ctx.font = `600 26px ${SANS}`; wrap(ctx, role, w / 2, h / 2 + 52, w - 120, 30, 2);
  ctx.font = '30px serif'; ctx.fillText('🐾', w / 2, h - 60);
  ctx.textAlign = 'left';
};
export const dogTagBack = (id) => (ctx, w, h, L, T) => {
  tagDisc(ctx, w, h);
  ctx.font = `30px ${HAND}`;
  T.tagBack[id].forEach((line, i) => wrap(ctx, line, w / 2, h / 2 - 30 + i * 40, w - 90, 30, 1));
  ctx.textAlign = 'left';
};

// the notebook in the backpack: cover, then experience and education
export function notebookPages() {
  const lined = (ctx, w, h) => {
    ctx.fillStyle = '#fbf8ef'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(80,120,200,0.25)'; ctx.lineWidth = 1;
    for (let y = 70; y < h; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(220,80,80,0.4)'; ctx.beginPath(); ctx.moveTo(56, 0); ctx.lineTo(56, h); ctx.stroke();
    ctx.fillStyle = '#26324d';
  };
  const pages = [(ctx, w, h, L, T) => {
    ctx.fillStyle = '#1f3a6a'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f3ead8'; ctx.fillRect(40, 120, w - 80, 170);
    ctx.fillStyle = '#1f3a6a'; ctx.font = `bold 34px ${HAND}`;
    ctx.fillText('FIUBA', 64, 170);
    ctx.font = `30px ${HAND}`; ctx.fillText(education.title[L], 64, 214);
    ctx.fillText(education.date[L], 64, 254);
    ctx.fillStyle = '#f3ead8'; ctx.font = `20px ${MONO}`; ctx.fillText(T.notebookHint, 40, h - 40);
  }];
  for (let i = 0; i < experience.length; i += 2) {
    pages.push((ctx, w, h, L, T) => {
      lined(ctx, w, h);
      ctx.font = `bold 34px ${HAND}`; ctx.fillText(T.experienceTitle, 70, 56);
      let y = 110;
      for (const e of experience.slice(i, i + 2)) {
        ctx.fillStyle = '#c0392b'; ctx.font = `26px ${HAND}`; ctx.fillText(e.date, 70, y);
        ctx.fillStyle = '#26324d'; ctx.font = `bold 30px ${HAND}`; ctx.fillText(e.title[L], 70, y + 30); y += 64;
        ctx.font = `25px ${HAND}`;
        for (const pt of e.points[L]) y = wrap(ctx, `– ${pt}`, 78, y, w - 110, 28, 2);
        y += 22;
      }
    });
  }
  return pages;
}
