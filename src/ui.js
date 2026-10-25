// The HTML layer on top of the room: markers, the hint line, the top bar and the
// classic CV. Everything else is shown inside the room itself.
import { ui as STR, about, projects, experience, cards, education, contact, hotspots } from './content.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const coarse = matchMedia('(pointer: coarse)').matches;

function storedLang() {
  try { const l = localStorage.getItem('lang'); if (l === 'es' || l === 'en') return l; } catch {}
  return navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
}

export function createUI({ audio, onFocus, onLang, onTermKey }) {
  let lang = storedLang();
  let mode = 'door';
  const markers = {};
  const cv = $('#cv'), termInput = $('#term-input');
  const s = () => STR[lang];
  const tr = (o) => (typeof o === 'string' ? o : o[lang]);

  // ---------- classic CV (the accessible, no-3D version of everything) ----------
  const chips = (items) => `<div class="chips">${items.map((i) => `<span>${esc(i)}</span>`).join('')}</div>`;
  const linkHtml = (l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${l.kind === 'repo' ? s().repo : s().live}</a>`;
  const projectDetail = (p) => `
    <p class="eyebrow">${esc(tr(p.tag))}</p>
    <h2>${esc(p.title)}</h2>
    ${p.private ? `<p class="private">🔒 ${s().private}</p>` : ''}
    <p>${esc(tr(p.summary))}</p>
    ${chips(p.stack)}
    ${tr(p.features).length ? `<h3>${s().features}</h3><ul class="ticks">${tr(p.features).map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
    ${p.links.length ? `<div class="links">${p.links.map(linkHtml).join('')}</div>` : ''}`;
  function renderCV() {
    $('#cv-body').innerHTML = `
      <header class="cv-head"><h1>Facundo Sorasio</h1><p>${s().tagline}</p></header>
      <section><h2>${s().sections.about}</h2>${tr(about).map((p) => `<p>${esc(p)}</p>`).join('')}</section>
      <section><h2>${s().sections.experience}</h2>
        <ol class="timeline">${experience.map((e) => `
          <li><span class="date">${esc(e.date)}</span><strong>${esc(tr(e.title))}</strong>
          <ul>${tr(e.points).map((p) => `<li>${esc(p)}</li>`).join('')}</ul></li>`).join('')}</ol>
        <h2>${s().sections.education}</h2>
        <p><strong>${esc(tr(education.title))}</strong><br>${esc(tr(education.place))}<br><span class="date">${esc(tr(education.date))}</span></p></section>
      <section><h2>${s().sections.projects}</h2>${projects.map((p) => `<article class="cv-project">${projectDetail(p)}</article>`).join('')}</section>
      <section><h2>${s().sections.skills}</h2>${cards.map((c) => `<h3>${esc(c.name)}</h3>${chips(c.items)}`).join('')}</section>
      <section><h2>${s().sections.contact}</h2><p>${s().contactLead}</p>
        <ul class="contact">${contact.map((c) => `<li><a href="${esc(c.url)}" target="_blank" rel="noopener"><span>${c.label}</span>${esc(c.value)}</a></li>`).join('')}</ul></section>`;
  }
  function openCV() {
    renderCV();
    cv.hidden = false;
    document.body.classList.add('cv-open');
    $('#cv-close').focus({ preventScroll: true });
  }
  function closeCV() {
    cv.hidden = true;
    document.body.classList.remove('cv-open');
  }
  $('#btn-cv').addEventListener('click', () => (cv.hidden ? openCV() : closeCV()));
  $('#cv-close').addEventListener('click', closeCV);

  // ---------- terminal input ----------
  // Printable characters come from the input event (works with phone keyboards);
  // Enter, Tab, arrows and shortcuts come from keydown.
  termInput.addEventListener('input', () => {
    for (const ch of termInput.value) onTermKey({ key: ch });
    termInput.value = '';
  });
  addEventListener('keydown', (e) => {
    if (mode === 'terminal') {
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        if (document.activeElement !== termInput) termInput.focus({ preventScroll: true });
        return; // the input event will deliver it
      }
      if (onTermKey(e)) e.preventDefault();
      return;
    }
    if (e.key === 'Escape') {
      if (!cv.hidden && !document.body.classList.contains('no-webgl')) closeCV();
      else onTermKey(e); // the scene treats Escape as "step back"
    }
  });

  // ---------- i18n ----------
  const hints = {
    door: () => (coarse ? s().knockTouch : s().knock),
    room: () => (coarse ? s().hintTouch : s().hint),
    zone: () => s().zoneHint,
    screen: () => s().screenHint,
    terminal: () => s().termHint,
    inspect: () => s().inspectHint,
    wallet: () => (coarse ? s().walletHintTouch : s().walletHint),
    entering: () => ''
  };
  function applyLang() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = s()[el.dataset.t]; });
    $('#hint').textContent = hints[mode]();
    document.querySelectorAll('.lang-switch [data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    for (const [id, m] of Object.entries(markers)) m.querySelector('span').textContent = tr(hotspots[id].label);
    if (!cv.hidden) renderCV();
    onLang(lang);
  }
  document.querySelector('.lang-switch').addEventListener('click', (e) => {
    const next = e.target.closest('[data-lang]')?.dataset.lang;
    if (!next || next === lang) return;
    lang = next;
    try { localStorage.setItem('lang', lang); } catch {}
    applyLang();
  });

  // ---------- sound ----------
  function syncSound() { $('#btn-sound').setAttribute('aria-pressed', String(audio.on())); }
  $('#btn-sound').addEventListener('click', () => { audio.toggle(); syncSound(); });

  // the handle marker is a real button, so the door also opens from the keyboard
  $('#handle-btn').addEventListener('click', () => $('#scene').dispatchEvent(new CustomEvent('open-door')));

  applyLang();

  return {
    lang: () => lang,
    ready: () => cv.hidden,
    focusTerminal: () => termInput.focus({ preventScroll: true }),
    setMode(m) {
      mode = m;
      document.body.dataset.mode = m;
      $('#hint').textContent = hints[m]();
      if (m !== 'terminal') termInput.blur();
    },
    buildMarkers(ids) {
      const wrap = $('#markers');
      for (const id of ids) {
        const b = document.createElement('button');
        b.className = 'marker';
        b.innerHTML = `<i></i><span>${esc(tr(hotspots[id].label))}</span>`;
        b.addEventListener('click', () => onFocus(id));
        b.addEventListener('pointerenter', () => b.classList.add('hot'));
        b.addEventListener('pointerleave', () => b.classList.remove('hot'));
        wrap.appendChild(b);
        markers[id] = b;
      }
    },
    placeMarker(id, x, y, visible) {
      const m = markers[id];
      m.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      m.classList.toggle('hidden', !visible);
    },
    placeHandle(x, y, visible) {
      const b = $('#handle-btn');
      b.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      b.classList.toggle('hidden', !visible);
    },
    hover(id) {
      for (const [k, m] of Object.entries(markers)) m.classList.toggle('hot', k === id);
      $('#handle-btn').classList.toggle('hot', id === 'handle');
    },
    loaded() { document.body.classList.add('loaded'); },
    noWebgl() {
      document.body.classList.add('no-webgl', 'loaded');
      openCV();
      $('#cv-note').textContent = s().noWebgl;
    },
    syncSound
  };
}
