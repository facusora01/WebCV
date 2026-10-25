// A small lofi loop synthesized with Web Audio (no audio files): soft electric
// piano chords, a round bass, a lazy swung beat and a little vinyl dust.
// Also the one-shot sounds (door handle click, dogs barking).
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
  let ctx = null, master = null, music = null, bus = null, noise = null;
  let on = false, timer = null, nextBar = 0, bar = 0;

  function init() {
    ctx = new AudioContext();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 3;
    master = ctx.createGain(); master.gain.value = 0.8;
    master.connect(comp).connect(ctx.destination);
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

  return { set, toggle: () => set(!on), on: () => on, click, bark };
}
