// The terminal on the main monitor: a tiny shell over the project list.
// It keeps lines of text; the room draws them onto the screen texture and the
// UI mirrors them as HTML on small screens.
import { projects, about, contact } from './content.js';

const COLS = 74;
const HOME = '~';
const ALIASES = { proyectos: 'projects', proyects: 'projects', proyecto: 'projects' };

const MSG = {
  en: {
    welcome: ['Welcome to facu@room. Type `ls projects`, then `cd <name>`.', 'Tab completes. `help` lists every command.'],
    help: [
      'ls [dir]          list files',
      'cd <dir>          enter a folder (cd .. goes back)',
      'cat <file>        print a file',
      'pwd · whoami · clear · exit'
    ],
    notFound: (c) => `command not found: ${c}`,
    noDir: (c, d) => `${c}: no such directory: ${d}`,
    noFile: (f) => `cat: ${f}: no such file`,
    isDir: (f) => `cat: ${f}: is a directory`,
    whoami: 'Facundo Sorasio · Computer Engineering student at UBA'
  },
  es: {
    welcome: ['Bienvenido a facu@room. Escribí `ls projects` y después `cd <nombre>`.', 'Tab autocompleta. `help` muestra todos los comandos.'],
    help: [
      'ls [dir]          lista archivos',
      'cd <dir>          entra a una carpeta (cd .. vuelve)',
      'cat <archivo>     muestra un archivo',
      'pwd · whoami · clear · exit'
    ],
    notFound: (c) => `comando no encontrado: ${c}`,
    noDir: (c, d) => `${c}: no existe el directorio: ${d}`,
    noFile: (f) => `cat: ${f}: no existe el archivo`,
    isDir: (f) => `cat: ${f}: es un directorio`,
    whoami: 'Facundo Sorasio · estudiante de Ingeniería Informática en la UBA'
  }
};

function wrap(text) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      if ((line + ' ' + word).trim().length > COLS) { out.push(line); line = word; }
      else line = (line + ' ' + word).trim();
    }
    out.push(line);
  }
  return out;
}

export function createTerminal({ getLang, onExit }) {
  let cwd = []; // [] = ~, ['projects'], ['projects', dir]
  let input = '';
  let lines = [];
  const history = [];
  let hIndex = 0;
  const M = () => MSG[getLang()];

  const term = {
    dirty: true,
    get lines() { return lines; },
    get input() { return input; },
    prompt: () => `facu@room:${[HOME, ...cwd].join('/')}$`,
    reset() { lines = M().welcome.map((t) => ({ t, c: 'dim' })); cwd = []; input = ''; term.dirty = true; },
    // switching language before typing anything re-greets in the new one
    relang() { if (!history.length && !input) term.reset(); },
    key, draw
  };

  const print = (t, c) => { for (const l of wrap(t)) lines.push({ t: l, c }); };
  const project = (dir) => projects.find((p) => p.dir === String(dir).toLowerCase());

  // What lives in a folder: names ending in / are folders.
  function list(path) {
    if (path.length === 0) return ['projects/', 'about.txt', 'contact.txt'];
    if (path.length === 1 && path[0].toLowerCase() === 'projects') return projects.map((p) => p.dir + '/');
    if (path.length === 2 && path[0].toLowerCase() === 'projects' && project(path[1])) {
      const p = project(path[1]);
      return ['README.md', 'stack.txt', ...(p.features[getLang()].length ? ['highlights.md'] : []), ...(p.links.length ? ['links.txt'] : [])];
    }
    return null;
  }

  function resolve(arg) {
    let path = arg.startsWith('~') || arg.startsWith('/') ? [] : [...cwd];
    for (let part of arg.replace(/^~\/?|^\//, '').split('/').filter(Boolean)) {
      part = ALIASES[part.toLowerCase()] || part;
      if (part === '.') continue;
      if (part === '..') path.pop();
      else path.push(part);
    }
    return path;
  }

  function cat(file) {
    const L = getLang();
    const path = resolve(file);
    const parent = path.slice(0, -1);
    const entries = list(parent) || [];
    const name = entries.find((e) => e.replace(/\/$/, '').toLowerCase() === String(path[path.length - 1]).toLowerCase());
    if (!name) return print(M().noFile(file), 'err');
    if (name.endsWith('/')) return print(M().isDir(file), 'err');
    if (parent.length === 0) {
      if (name === 'about.txt') return about[L].forEach((p) => { print(p); lines.push({ t: '' }); });
      return contact.forEach((c) => print(`${c.label.padEnd(10)} ${c.value}`));
    }
    const p = project(parent[1]);
    if (name === 'README.md') { print(`# ${p.title}`, 'accent'); print(p.tag[L], 'dim'); print(p.summary[L]); }
    if (name === 'stack.txt') print(p.stack.join(' · '));
    if (name === 'highlights.md') p.features[L].forEach((f) => print(`- ${f}`));
    if (name === 'links.txt') p.links.forEach((l) => print(l.url, 'accent'));
  }

  function run(raw) {
    lines.push({ t: `${term.prompt()} ${raw}`, c: 'cmd' });
    const [cmd, ...args] = raw.trim().split(/\s+/);
    const arg = args.join(' ');
    if (!cmd) return;
    history.push(raw); hIndex = history.length;
    switch (cmd.toLowerCase()) {
      case 'help': M().help.forEach((l) => print(l)); break;
      case 'clear': lines = []; break;
      case 'pwd': print('/home/facu/' + cwd.join('/')); break;
      case 'whoami': print(M().whoami); break;
      case 'ls': case 'dir': {
        const entries = list(arg ? resolve(arg) : cwd);
        if (!entries) { print(M().noDir('ls', arg), 'err'); break; }
        print(entries.join('   '), 'accent');
        break;
      }
      case 'cd': {
        const path = arg ? resolve(arg) : [];
        if (!list(path)) { print(M().noDir('cd', arg), 'err'); break; }
        cwd = path.length === 2 ? ['projects', project(path[1]).dir] : path.map((x) => x.toLowerCase());
        if (path.length === 2) { cat('README.md'); print('→ ls · cat highlights.md · cat links.txt', 'dim'); }
        break;
      }
      case 'cat': case 'less': case 'more': cat(arg); break;
      case 'exit': case 'logout': onExit(); break;
      default: print(M().notFound(cmd), 'err');
    }
  }

  function complete() {
    const parts = input.split(' ');
    const last = parts[parts.length - 1];
    let options;
    if (parts.length === 1) {
      options = ['ls', 'cd', 'cat', 'help', 'clear', 'pwd', 'whoami', 'exit'].filter((c) => c.startsWith(last));
    } else {
      const slash = last.lastIndexOf('/');
      const base = slash >= 0 ? last.slice(0, slash + 1) : '';
      const stem = last.slice(slash + 1).toLowerCase();
      const entries = list(base ? resolve(base) : cwd) || [];
      const onlyDirs = parts[0] === 'cd';
      options = entries.filter((e) => e.toLowerCase().startsWith(stem) && (!onlyDirs || e.endsWith('/'))).map((e) => base + e);
      // Spanish spellings of projects/ complete too: proy<Tab> → projects/
      if (!options.length && entries.includes('projects/') && Object.keys(ALIASES).some((k) => k.startsWith(stem))) options = [base + 'projects/'];
    }
    if (options.length === 1) {
      parts[parts.length - 1] = options[0] + (options[0].endsWith('/') ? '' : ' ');
      input = parts.join(' ');
    } else if (options.length > 1) {
      // extend to the common prefix, like bash; show the choices
      let prefix = options[0];
      for (const o of options) while (!o.startsWith(prefix)) prefix = prefix.slice(0, -1);
      if (prefix.length > last.length) { parts[parts.length - 1] = prefix; input = parts.join(' '); }
      else { lines.push({ t: `${term.prompt()} ${input}`, c: 'cmd' }); print(options.map((o) => o.split('/').filter(Boolean).pop() + (o.endsWith('/') ? '/' : '')).join('   '), 'accent'); }
    }
  }

  // Returns true when the key was used.
  function key(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) {
      if (e.ctrlKey && e.key.toLowerCase() === 'l') { lines = []; term.dirty = true; return true; }
      if (e.ctrlKey && e.key.toLowerCase() === 'c') { lines.push({ t: `${term.prompt()} ${input}^C`, c: 'cmd' }); input = ''; term.dirty = true; return true; }
      return false;
    }
    if (e.key === 'Enter') { const raw = input; input = ''; run(raw); }
    else if (e.key === 'Backspace') input = input.slice(0, -1);
    else if (e.key === 'Tab') complete();
    else if (e.key === 'ArrowUp') { if (hIndex > 0) input = history[--hIndex]; }
    else if (e.key === 'ArrowDown') { hIndex = Math.min(history.length, hIndex + 1); input = history[hIndex] || ''; }
    else if (e.key.length === 1) { if (input.length < 120) input += e.key; }
    else return false;
    if (lines.length > 300) lines = lines.slice(-300);
    term.dirty = true;
    return true;
  }

  const COLORS = { cmd: '#e9e4f5', accent: '#8fd6b8', dim: '#8f88b0', err: '#f38ba0' };
  function draw(ctx, w, h, t) {
    ctx.fillStyle = '#12101f'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1d1a33'; ctx.fillRect(0, 0, w, 30);
    ['#f38ba0', '#ffd59a', '#8fd6b8'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(20 + i * 22, 15, 6, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#8f88b0'; ctx.font = '16px "JetBrains Mono", monospace'; ctx.fillText('facu@room — zsh', w / 2 - 70, 21);
    const lh = 24, top = 54, rows = Math.floor((h - top) / lh);
    ctx.font = '19px "JetBrains Mono", monospace';
    const all = [...lines, { t: `${term.prompt()} ${input}`, c: 'cmd', live: true }];
    const shown = all.slice(-rows);
    shown.forEach((l, i) => {
      const y = top + i * lh;
      if (l.c === 'cmd') {
        const p = l.t.indexOf('$');
        ctx.fillStyle = '#ffb38a'; ctx.fillText(l.t.slice(0, p + 1), 16, y);
        const pw = ctx.measureText(l.t.slice(0, p + 1)).width;
        ctx.fillStyle = COLORS.cmd; ctx.fillText(l.t.slice(p + 1), 16 + pw, y);
        if (l.live && Math.floor(t * 2) % 2 === 0) {
          const cw = ctx.measureText(l.t).width;
          ctx.fillStyle = '#8fd6b8'; ctx.fillRect(16 + cw + 2, y - 17, 11, 21);
        }
      } else {
        ctx.fillStyle = COLORS[l.c] || '#cfc9e6';
        ctx.fillText(l.t, 16, y);
      }
    });
  }

  term.reset();
  return term;
}
