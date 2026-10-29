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

export function createUI({ audio, onFocus, onLang, onTermKey, onTermInput, termLine }) {
  let lang = storedLang();
  let mode = 'door';
  const markers = {};
  const cv = $('#cv'), termInput = $('#term-input'), handleBtn = $('#handle-btn');
  // called every frame for every marker: touch the DOM only when something changed
  const placed = new Map();
  function place(el, x, y, visible) {
    const p = placed.get(el) || placed.set(el, {}).get(el);
    if (visible !== p.visible) { el.classList.toggle('hidden', !visible); p.visible = visible; }
    if (!visible) return; // a hidden one keeps its place while it fades out
    const tf = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    if (tf !== p.tf) { el.style.transform = tf; p.tf = tf; }
  }
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
  // The line being typed lives in the text field, so phone keyboards (with their
  // predictions and backspace) edit it like any other field; every change is mirrored
  // into the terminal. Enter, Tab, history and shortcuts come from keydown, after which
  // the field is set back to the terminal's line.
  const syncTerm = () => { termInput.value = termLine(); };
  const termKey = (e) => { const used = onTermKey(e); syncTerm(); return used; };
  termInput.addEventListener('input', () => onTermInput(termInput.value));
  // phone keyboards that don't send an Enter keydown still submit the form
  $('#term-form').addEventListener('submit', (e) => { e.preventDefault(); termKey({ key: 'Enter' }); });
  const EDIT = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
  addEventListener('keydown', (e) => {
    if (mode === 'terminal') {
      if (document.activeElement !== termInput) termInput.focus({ preventScroll: true });
      if ((e.key.length === 1 || EDIT.includes(e.key)) && !e.ctrlKey && !e.metaKey) return; // the field handles it
      if (termKey(e)) e.preventDefault();
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
    look: () => s().lookHint,
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

  // ---------- the terminal panel on phones ----------
  // Buttons for the keys a phone keyboard lacks; they keep the keyboard open (except Exit).
  for (const b of document.querySelectorAll('.term-keys button')) {
    b.addEventListener('pointerdown', (e) => e.preventDefault());
    b.addEventListener('click', () => {
      if (b.dataset.k !== 'kbd') termKey({ key: b.dataset.k });
      if (b.dataset.k !== 'Escape') termInput.focus({ preventScroll: true });
    });
  }
  const panel = $('.term-panel'), termOut = $('#term-out');
  termOut.addEventListener('click', () => termInput.focus({ preventScroll: true })); // brings the keyboard back
  // keep the panel over what the keyboard leaves visible
  const vv = window.visualViewport;
  const fitPanel = () => { if (vv) { panel.style.top = `${vv.offsetTop}px`; panel.style.height = `${vv.height}px`; } };
  vv?.addEventListener('resize', fitPanel);
  vv?.addEventListener('scroll', fitPanel);
  let termShown = '';
  const line = (t, c) => { const el = document.createElement('span'); el.className = c; el.textContent = t; return el; };
  // what the terminal shows, as text: called every frame while it is open; redraws only on change
  function termView(term) {
    const key = `${term.lines.length}|${term.lines.at(-1)?.t}|${term.prompt()}|${term.input}`;
    if (key === termShown) return;
    termShown = key;
    const out = [];
    for (const l of term.lines) {
      if (l.c === 'cmd') { const p = l.t.indexOf('$') + 1; out.push(line(l.t.slice(0, p), 'prompt'), line(`${l.t.slice(p)}\n`, 'cmd')); }
      else out.push(line(`${l.t}\n`, l.c));
    }
    out.push(line(term.prompt(), 'prompt'), line(` ${term.input}`, 'cmd'), line('▌', 'cursor'));
    termOut.replaceChildren(...out);
    termOut.scrollTop = termOut.scrollHeight;
  }

  applyLang();

  return {
    lang: () => lang,
    ready: () => cv.hidden,
    focusTerminal: () => { syncTerm(); termInput.focus({ preventScroll: true }); },
    termView: (term) => { if (coarse) termView(term); },
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
    placeMarker(id, x, y, visible) { place(markers[id], x, y, visible); },
    placeHandle(x, y, visible) { place(handleBtn, x, y, visible); },
    // MotiBot's speech bubble: say() sets the phrase, placeBubble() keeps it over his head
    say(p) {
      const b = $('#bubble');
      b.textContent = tr(p);
      const by = document.createElement('small');
      by.textContent = `— ${p.by}`;
      b.append(by);
    },
    placeBubble(x, y, visible) { place($('#bubble'), x, y, visible); },
    hover(id) {
      for (const [k, m] of Object.entries(markers)) m.classList.toggle('hot', k === id);
      handleBtn.classList.toggle('hot', id === 'handle');
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
