// A small lofi loop synthesized with Web Audio (no audio files): soft electric
// piano chords, a round bass, a lazy swung beat and a little vinyl dust.
// Also the one-shot sounds (door handle click, dogs barking, the desk buddies, the mate).
const BPM = 72;
const BEAT = 60 / BPM;
// Fmaj9 → Em7 → Dm9 → Cmaj9, one bar each (MIDI notes)
const CHORDS = [
  [53, 57, 60, 64, 67],
  [52, 55, 59, 62, 67],
  [50, 53, 57, 60, 64],
  [48, 52, 55, 59, 62]
];
const hz = (n) => 440 * 2 ** ((n - 69) / 12);

export function createAudio() {
  let ctx = null, master = null, music = null, bus = null, noise = null, emptyMate = null;
  let on = false, timer = null, nextBar = 0, bar = 0;

  function init() {
    ctx = new AudioContext();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 3;
    master = ctx.createGain(); master.gain.value = 0.8;
    master.connect(comp).connect(ctx.destination);
    // the mate running dry, recorded; until it arrives (or where Ogg Opus can't be
    // decoded) slurp() synthesizes one
    fetch(`${import.meta.env.BASE_URL}sounds/empty-mate.ogg`).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)).then((b) => { emptyMate = b; }).catch(() => {});
    music = ctx.createGain(); music.gain.value = 0;
    // the "lofi" part: everything goes through a warm low-pass
    const warm = ctx.createBiquadFilter();
    warm.type = 'lowpass'; warm.frequency.value = 2400; warm.Q.value = 0.4;
    music.connect(warm).connect(master);
    bus = ctx.createGain();
    bus.connect(music);

    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    // vinyl dust: rare soft clicks, quiet
    const dust = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const dd = dust.getChannelData(0);
    for (let i = 0; i < dd.length; i++) dd[i] = Math.random() < 0.00025 ? (Math.random() * 2 - 1) * 0.5 : 0;
    const src = ctx.createBufferSource();
    src.buffer = dust; src.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000;
    const g = ctx.createGain(); g.gain.value = 0.12;
    src.connect(hp).connect(g).connect(bus);
    src.start();
  }

  // electric-piano-ish note: sine + a quiet octave, slow decay, tiny detune wobble
  function key(note, t, dur, vel = 0.06) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.02);
    g.gain.exponentialRampToValueAtTime(vel * 0.35, t + 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(bus);
    for (const [mult, amp, type] of [[1, 1, 'sine'], [2, 0.18, 'sine'], [1, 0.08, 'triangle']]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = hz(note) * mult;
      o.detune.value = (Math.random() - 0.5) * 8;
      const a = ctx.createGain(); a.gain.value = amp;
      o.connect(a).connect(g);
      o.start(t); o.stop(t + dur + 0.05);
    }
  }
  function bass(note, t, dur) {
    const o = ctx.createOscillator();
    o.type = 'sine'; o.frequency.value = hz(note - 12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function kick(t) {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.32, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g).connect(bus);
    o.start(t); o.stop(t + 0.4);
  }
  function hiss(t, dur, freq, type, vol, dest = bus) {
    const s = ctx.createBufferSource();
    s.buffer = noise;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(dest);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  function scheduleBar(t) {
    const chord = CHORDS[bar % CHORDS.length];
    // chord on 1, a softer re-strike on the "and" of 3
    chord.forEach((n, i) => key(n + 12, t + i * 0.012, BEAT * 3.6, 0.05));
    chord.slice(2).forEach((n) => key(n + 12, t + BEAT * 2.5, BEAT * 1.4, 0.03));
    bass(chord[0], t, BEAT * 1.8);
    bass(chord[0] + 7, t + BEAT * 2.5, BEAT * 1.2);
    kick(t); kick(t + BEAT * 2.25);
    if (bar % 4 === 3) kick(t + BEAT * 3.5);
    for (const b of [1, 3]) hiss(t + b * BEAT, 0.18, 1800, 'bandpass', 0.12);
    for (let i = 0; i < 8; i++) {
      const swing = i % 2 ? BEAT * 0.08 : 0; // lazy swung eighths
      hiss(t + i * BEAT / 2 + swing, 0.04, 7500, 'highpass', i % 2 ? 0.025 : 0.04);
    }
    bar++;
  }

  function pump() {
    while (nextBar < ctx.currentTime + 1.2) { scheduleBar(nextBar); nextBar += BEAT * 4; }
  }

  function set(next) {
    if (next && !ctx) init();
    if (!ctx) return;
    on = next;
    if (on) {
      ctx.resume();
      nextBar = Math.max(nextBar, ctx.currentTime + 0.1);
      pump();
      timer = setInterval(pump, 300);
    } else {
      clearInterval(timer);
    }
    music.gain.setTargetAtTime(on ? 0.9 : 0, ctx.currentTime, 0.5);
  }

  // one-shots work even with the music off
  function ensure() { if (!ctx) init(); ctx.resume(); return ctx.currentTime; }
  function click() {
    const t = ensure();
    hiss(t, 0.05, 2500, 'bandpass', 0.25, master);
    hiss(t + 0.09, 0.04, 1800, 'bandpass', 0.18, master);
  }
  function bark() {
    const t = ensure();
    for (const [at, f0] of [[0, 520], [0.22, 600], [0.75, 340]]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f0, t + at);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.6, t + at + 0.12);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + at);
      g.gain.exponentialRampToValueAtTime(0.18, t + at + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.14);
      o.connect(f).connect(g).connect(master);
      o.start(t + at); o.stop(t + at + 0.16);
    }
  }

  // Claudio: a quick rising robotic "bip-bup-biii"
  function happy() {
    const t = ensure();
    [76, 81, 88].forEach((n, i) => {
      const at = t + i * 0.09;
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.setValueAtTime(hz(n), at);
      o.frequency.exponentialRampToValueAtTime(hz(n + 2), at + 0.08);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.05, at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, at + (i === 2 ? 0.25 : 0.08));
      o.connect(g).connect(master);
      o.start(at); o.stop(at + 0.3);
    });
  }
  // MotiBot: a soft little animal trill, a warbling chirp that rises and falls
  function trill() {
    const t = ensure();
    for (const [at, f0, f1, dur] of [[0, 900, 1500, 0.16], [0.17, 1200, 1900, 0.22]]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(f0, t + at);
      o.frequency.exponentialRampToValueAtTime(f1, t + at + dur * 0.6);
      o.frequency.exponentialRampToValueAtTime(f0 * 1.1, t + at + dur);
      const lfo = ctx.createOscillator(), depth = ctx.createGain(); // the warble
      lfo.frequency.value = 28; depth.gain.value = 60;
      lfo.connect(depth).connect(o.frequency);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + at);
      g.gain.exponentialRampToValueAtTime(0.12, t + at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
      o.connect(g).connect(master);
      o.start(t + at); o.stop(t + at + dur + 0.02);
      lfo.start(t + at); lfo.stop(t + at + dur + 0.02);
    }
  }
  // filtered noise with a shaped envelope: [[time, gain], ...], linear between points
  function breath(t, points, type, freq, q = 1) {
    const s = ctx.createBufferSource();
    s.buffer = noise; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    for (const [at, v] of points) g.gain.linearRampToValueAtTime(v, t + at);
    s.connect(f).connect(g).connect(master);
    s.start(t); s.stop(t + points.at(-1)[0] + 0.05);
    return f;
  }
  // hot water into the mate ("cebar"): barely audible. A thin stream into wet yerba is
  // a soft hiss, a hollow tone that rises as the gourd fills, and tiny bubbles popping
  function pour(dur = 1.4) {
    const t = ensure();
    breath(t, [[0.12, 0.025], [dur - 0.2, 0.02], [dur, 0]], 'lowpass', 2200, 0.5);
    const fill = breath(t, [[0.15, 0.05], [dur - 0.2, 0.04], [dur, 0]], 'bandpass', 480, 9);
    fill.frequency.exponentialRampToValueAtTime(1150, t + dur);
    for (let i = 0; i < 28; i++) {
      const at = t + 0.1 + Math.random() * (dur - 0.2), f0 = 700 + Math.random() * 900 + (at - t) * 300;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(f0, at);
      o.frequency.exponentialRampToValueAtTime(f0 * 1.7, at + 0.02);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.015 + Math.random() * 0.03, at + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.025);
      o.connect(g).connect(master);
      o.start(at); o.stop(at + 0.03);
    }
  }
  // sipping through the bombilla: a quiet, steady draw with a little bubbling
  function sip(dur = 1.5) {
    const t = ensure();
    const f = breath(t, [[0.1, 0.12], [dur - 0.15, 0.1], [dur, 0]], 'bandpass', 700, 2);
    const lfo = ctx.createOscillator(), depth = ctx.createGain();
    lfo.frequency.value = 6; depth.gain.value = 120;
    lfo.connect(depth).connect(f.frequency);
    lfo.start(t); lfo.stop(t + dur + 0.05);
  }
  // the mate running dry: air and the last drops sucked up the bombilla together, a
  // crackling gurgle of short bursts that gets brighter as it empties. Returns its length.
  function slurp() {
    const t = ensure();
    if (emptyMate) {
      const src = ctx.createBufferSource();
      src.buffer = emptyMate;
      src.connect(master);
      src.start(t);
      return emptyMate.duration;
    }
    let at = t;
    for (let i = 0; i < 26; i++) {
      const k = i / 26;
      const dur = 0.012 + Math.random() * 0.02;
      hiss(at, dur, 1200 + k * 1800 + Math.random() * 900, 'bandpass', (0.18 + Math.random() * 0.14) * (1 - k * 0.4), master);
      at += dur + Math.random() * 0.018;
    }
    return at - t;
  }
  // burnt tongue: a sharp "sss" through the teeth, then a short "ay"
  function burn() {
    const t = ensure();
    breath(t, [[0.03, 0.4], [0.3, 0.25], [0.4, 0]], 'highpass', 3500, 0.7);
    const at = t + 0.35, o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 1300;
    o.frequency.setValueAtTime(520, at);
    o.frequency.exponentialRampToValueAtTime(320, at + 0.25);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.12, at + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.28);
    o.connect(f).connect(g).connect(master);
    o.start(at); o.stop(at + 0.3);
  }
  // the mate touching down on its coaster
  function clink() {
    const t = ensure();
    for (const [f, v] of [[1900, 0.06], [3100, 0.03]]) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g).connect(master);
      o.start(t); o.stop(t + 0.2);
    }
    hiss(t, 0.04, 400, 'lowpass', 0.3, master);
  }

  return { set, toggle: () => set(!on), on: () => on, click, bark, happy, trill, pour, sip, slurp, burn, clink };
}
