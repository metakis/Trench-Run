// Retro sound effects synthesized with the Web Audio API (no audio files).
let ctx: AudioContext | null = null;
let muted = false;

export const setMuted = (m: boolean) => { muted = m; };
export const isMuted = () => muted;

// ---- Master bus: Effects + Music → compressor/limiter → speakers, plus a shared reverb send ----
type Bus = { fx: GainNode; music: GainNode; verb: GainNode; out: DynamicsCompressorNode };
let bus: Bus | null = null;
let fxVol = 0.9, musicVol = 0.7;
export const setEffectsVolume = (v: number) => { fxVol = v; if (bus) bus.fx.gain.value = v; };
export const setMusicVolume = (v: number) => { musicVol = v; if (bus) bus.music.gain.value = v; };

function makeImpulse(a: AudioContext, secs = 2.2, decay = 3) {
  const n = Math.floor(a.sampleRate * secs), buf = a.createBuffer(2, n, a.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
  }
  return buf;
}
function getBus(a: AudioContext): Bus {
  if (bus) return bus;
  const out = a.createDynamicsCompressor();
  out.threshold.value = -14; out.knee.value = 8; out.ratio.value = 12; out.attack.value = 0.003; out.release.value = 0.25;
  const master = a.createGain(); master.gain.value = 0.85;
  out.connect(master).connect(a.destination);
  const fx = a.createGain(); fx.gain.value = fxVol; fx.connect(out);
  const music = a.createGain(); music.gain.value = musicVol; music.connect(out);
  const conv = a.createConvolver(); conv.buffer = makeImpulse(a);
  const verb = a.createGain(); verb.gain.value = 0.35;
  // a short feedback echo layered with the reverb
  const dl = a.createDelay(1); dl.delayTime.value = 0.28; const fb = a.createGain(); fb.gain.value = 0.3;
  verb.connect(conv).connect(out); verb.connect(dl); dl.connect(fb).connect(dl); dl.connect(out);
  bus = { fx, music, verb, out };
  return bus;
}

function ac(): AudioContext | null {
  if (muted || typeof window === "undefined") return null;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  getBus(ctx);
  return ctx;
}

// A short silent WAV, built in memory, played through an <audio> element.
// iPhones only treat page sound as media (so it ignores the silent switch)
// once a media element has played during a tap.
function silentWavUrl(): string {
  const n = 800, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); w(8, "WAVEfmt "); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 16000, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, n * 2, true);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}

let unlocked = false;
function unlockAudio() {
  if (unlocked) return;
  try {
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    if (nav.audioSession) nav.audioSession.type = "playback";
  } catch { /* not supported */ }
  try {
    ctx ??= new AudioContext();
    void ctx.resume();
    const src = ctx.createBufferSource();
    src.buffer = ctx.createBuffer(1, 1, 22050);
    src.connect(ctx.destination);
    src.start(0);
  } catch { /* ignore */ }
  try {
    const el = new Audio(silentWavUrl());
    el.setAttribute("playsinline", "");
    void el.play().catch(() => {});
  } catch { /* ignore */ }
  if (ctx && ctx.state === "running") unlocked = true;
  else setTimeout(() => { if (ctx?.state === "running") unlocked = true; }, 300);
}

if (typeof window !== "undefined") {
  for (const ev of ["pointerdown", "touchend", "click", "keydown"]) {
    window.addEventListener(ev, unlockAudio, { capture: true, passive: true });
  }
}

// ---- Voice helpers ----
type Opt = { pan?: number; start?: number; vol?: number; verb?: number; music?: boolean };
const jit = (x: number, amt = 0.06) => x * (1 + (Math.random() * 2 - 1) * amt);
const live: Record<string, number> = {};
/** Voice limiting: at most `max` sounds of a kind at once, so 20 cannons don't clip or blur. */
function claim(kind: string, dur: number, max = 8) {
  if ((live[kind] ?? 0) >= max) return false;
  live[kind] = (live[kind] ?? 0) + 1;
  setTimeout(() => { live[kind] = Math.max(0, (live[kind] ?? 1) - 1); }, dur * 1000);
  return true;
}
/** A per-voice output: gain → stereo pan → bus (+ reverb send). */
function out(a: AudioContext, o: Opt = {}) {
  const b = getBus(a);
  const g = a.createGain();
  const p = a.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, o.pan ?? 0));
  g.connect(p); p.connect(o.music ? b.music : b.fx);
  if (o.verb) { const s = a.createGain(); s.gain.value = o.verb; p.connect(s).connect(b.verb); }
  return g;
}
let noiseBuf: AudioBuffer | null = null;
function noiseSrc(a: AudioContext) {
  if (!noiseBuf || noiseBuf.sampleRate !== a.sampleRate) {
    noiseBuf = a.createBuffer(1, a.sampleRate * 3, a.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = a.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s;
}
function env(g: GainNode, t: number, peak: number, att: number, dur: number) {
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + att);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

function tone(freq: number, dur: number, type: OscillatorType = "square", start = 0, endFreq?: number, vol = 0.12, o: Opt = {}) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + start + (o.start ?? 0);
  const osc = a.createOscillator(), g = out(a, o);
  osc.type = type; osc.frequency.setValueAtTime(freq, t);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
  env(g, t, vol, 0.005, dur);
  osc.connect(g); osc.start(t); osc.stop(t + dur + 0.02);
}

/** Filtered noise burst with an optional moving filter. */
function hiss(dur: number, vol: number, f0: number, f1: number, o: Opt = {}, type: BiquadFilterType = "lowpass", att = 0.005, q = 0.7) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + (o.start ?? 0);
  const src = noiseSrc(a), f = a.createBiquadFilter(), g = out(a, o);
  f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), t + dur);
  env(g, t, vol, att, dur);
  src.connect(f).connect(g); src.start(t, Math.random() * 2); src.stop(t + dur + 0.05);
}
function noise(dur: number, start = 0, vol = 0.25, o: Opt = {}) { hiss(dur, vol, 900, 300, { ...o, start: (o.start ?? 0) + start }); }

let curve: Float32Array<ArrayBuffer> | null = null;
function drive(a: AudioContext) {
  const sh = a.createWaveShaper();
  if (!curve) { curve = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 3); } }
  sh.curve = curve; return sh;
}

export type BoomSize = "small" | "medium" | "huge";
/** Music bus for the score (src/game/music.ts); null until audio is allowed. */
export function musicBus(): { ctx: AudioContext; node: AudioNode } | null {
  const a = ac(); if (!a) return null;
  return { ctx: a, node: getBus(a).music };
}
/** Duck the music ~6 dB under big explosions. */
function duck(secs: number) {
  if (!ctx || !bus) return;
  const g = bus.music.gain, t = ctx.currentTime;
  g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(musicVol * 0.5, t + 0.05); g.setTargetAtTime(musicVol, t + secs, 0.4);
}
function boom(size: BoomSize = "small", o: Opt = {}) {
  const k = size === "huge" ? 3 : size === "medium" ? 1.7 : 1;
  if (size !== "small") duck(size === "huge" ? 2.5 : 0.8);
  if (!claim("boom", 0.6 * k)) return;
  const v = jit(1, 0.15), st = o.start ?? 0;
  // low thump
  tone(jit(110 / Math.sqrt(k)), 0.35 * k, "sine", 0, 32, 0.45 * v, { ...o, verb: 0.3 });
  // noisy body
  hiss(0.55 * k, 0.32 * v, jit(2400 / k), 180, { ...o, verb: 0.4 }, "lowpass", 0.01);
  // crackling tail
  for (let i = 0; i < 3 + Math.round(k * 2); i++) hiss(0.05, 0.12 * v, 3000, 1500, { ...o, start: st + 0.15 + Math.random() * 0.4 * k }, "bandpass", 0.002, 2);
}

// ---- Engine rumble for the trench run (rises with speed) ----
let engine: { o1: OscillatorNode; o2: OscillatorNode; n: AudioBufferSourceNode; f: BiquadFilterNode; g: GainNode } | null = null;
function engineStart(speed = 1) {
  const a = ac(); if (!a || engine) return;
  const g = out(a, {}); g.gain.value = 0.0001;
  const o1 = a.createOscillator(), o2 = a.createOscillator(), n = noiseSrc(a), f = a.createBiquadFilter();
  o1.type = "sawtooth"; o2.type = "sawtooth"; f.type = "lowpass"; f.Q.value = 2;
  const mix = a.createGain(); mix.gain.value = 0.25;
  o1.connect(mix); o2.connect(mix); const nm = a.createGain(); nm.gain.value = 0.6; n.connect(nm).connect(f); mix.connect(f); f.connect(g);
  o1.start(); o2.start(); n.start();
  engine = { o1, o2, n, f, g };
  engineSpeed(speed);
}
function engineSpeed(speed: number) {
  const a = ctx; if (!a || !engine) return;
  const t = a.currentTime;
  engine.o1.frequency.setTargetAtTime(45 + speed * 20, t, 0.4);
  engine.o2.frequency.setTargetAtTime(46.5 + speed * 21, t, 0.4);
  engine.f.frequency.setTargetAtTime(250 + speed * 350, t, 0.4);
  engine.g.gain.setTargetAtTime(0.05 + speed * 0.04, t, 0.5);
}
function engineStop() {
  const a = ctx; if (!a || !engine) return;
  const e = engine; engine = null; const t = a.currentTime;
  e.g.gain.setTargetAtTime(0.0001, t, 0.3);
  setTimeout(() => { try { e.o1.stop(); e.o2.stop(); e.n.stop(); } catch { /* stopped */ } }, 1500);
}

export const sfx = {
  // Engine hum that swells over ~3s.
  hum: () => { tone(55, 3, "sawtooth", 0, 70, 0.05, { verb: 0.2 }); tone(82.5, 3, "sawtooth", 0.4, 104, 0.03, { verb: 0.2 }); hiss(3, 0.05, 200, 600, { verb: 0.2 }, "lowpass", 2.5); },
  // UI: soft holo blips
  blip: () => tone(jit(1320, 0.02), 0.06, "sine", 0, 1760, 0.07, { verb: 0.15 }),
  unblip: () => tone(jit(990, 0.02), 0.06, "sine", 0, 740, 0.06, { verb: 0.15 }),
  hover: () => tone(jit(2200, 0.03), 0.03, "sine", 0, undefined, 0.02),
  chime: () => { tone(1568, 0.25, "sine", 0, undefined, 0.07, { verb: 0.3 }); tone(2093, 0.3, "sine", 0.06, undefined, 0.06, { verb: 0.3 }); },
  denied: () => { tone(140, 0.18, "square", 0, 120, 0.06); tone(147, 0.18, "square", 0, 125, 0.06); },
  clunk: () => { tone(70, 0.25, "sine", 0, 40, 0.4); hiss(0.12, 0.2, 1200, 200); tone(180, 0.06, "square", 0.02, 90, 0.08); },
  // Dice rattle: short clicky noise bursts, slowing down as dice settle.
  /** One bright ping per hit die; pitch climbs with each hit. */
  hitPing: (i = 0) => tone(880 * Math.pow(2, Math.min(i, 12) / 12), 0.09, "square", 0, undefined, 0.05, { verb: 0.2 }),
  /** Destruction crunch per hit die (voice-limited by boom), with the ping on top. */
  hitBoom: (i = 0, pan = 0) => { boom("small", { pan: pan + (Math.random() - 0.5) * 0.3 }); sfx.hitPing(i); },
  roll: () => { let t = 0; for (let i = 0; i < 12; i++) { hiss(0.03, 0.12, jit(3500, 0.2), 1500, { start: t }, "bandpass", 0.002, 3); t += 0.05 + i * 0.008; } },
  /** Rebel blaster: bright falling "pew" with a metallic ring. */
  rebelBlaster: (pan = -0.5) => {
    if (!claim("laser", 0.2)) return;
    const f = jit(1900, 0.08), o = { pan, verb: 0.15 };
    tone(f, 0.16, "sawtooth", 0, f * 0.18, 0.06, o); tone(f * 2.7, 0.1, "sine", 0, f * 2.2, 0.025, o);
  },
  /** Imperial blaster: lower, harsher, slightly distorted. */
  impBlaster: (pan = 0.5) => {
    if (!claim("laser", 0.25)) return;
    const a = ac(); if (!a) return;
    const t = a.currentTime, f = jit(900, 0.08), osc = a.createOscillator(), g = out(a, { pan, verb: 0.2 }), d = drive(a);
    osc.type = "square"; osc.frequency.setValueAtTime(f, t); osc.frequency.exponentialRampToValueAtTime(f * 0.2, t + 0.22);
    env(g, t, 0.05, 0.004, 0.22); osc.connect(d).connect(g); osc.start(t); osc.stop(t + 0.25);
  },
  laser: (pan = -0.5) => (pan > 0 ? sfx.impBlaster(pan) : sfx.rebelBlaster(pan)),
  /** Turbolaser: short charge whine, then a deep blast with a long echo. */
  turbolaser: (pan = 0.4, charge = true) => {
    if (!claim("cannon", 0.6)) return;
    const o = { pan, verb: 0.6 };
    if (charge) tone(jit(600), 0.12, "sine", 0, 1800, 0.025, o);
    const s = charge ? 0.1 : 0;
    tone(jit(75, 0.1), 0.45, "sawtooth", s, 30, 0.14, o); hiss(0.3, 0.16, 1800, 150, { ...o, start: s });
  },
  /** Cannon charge-up whine while dice roll. */
  cannonCharge: () => tone(300, 1.0, "sine", 0, 1400, 0.03, { pan: 0.3, verb: 0.2 }),
  cannon: () => { sfx.cannonCharge(); },
  boom,
  explosion: (size: BoomSize = "small", pan = 0) => boom(size, { pan }),
  impact: (pan = 0) => { if (claim("impact", 0.1, 6)) hiss(0.08, 0.12, 4000, 1200, { pan }, "bandpass", 0.002, 1.5); },
  // One crunchy explosion per ship lost, staggered.
  shipLost: (n = 1) => { for (let i = 0; i < Math.min(n, 6); i++) setTimeout(() => boom("small", { pan: (Math.random() - 0.5) * 0.6 }), i * 180); },
  // Torpedo launch whistle ending in a thud.
  bombDrop: () => { tone(1800, 0.9, "sine", 0, 250, 0.06, { verb: 0.3 }); setTimeout(() => boom("small"), 900); },
  torpedo: (pan = 0) => { if (claim("laser", 0.3)) { tone(jit(500), 0.3, "triangle", 0, 1400, 0.05, { pan, verb: 0.2 }); hiss(0.25, 0.05, 3000, 6000, { pan }, "highpass"); } },
  /** Doppler fly-by: rising then falling pitch, panning across. */
  flyby: (from = -0.8, to = 0.8, dur = 0.9) => {
    const a = ac(); if (!a || !claim("flyby", dur, 4)) return;
    const t = a.currentTime, g = out(a, { verb: 0.25 });
    const pan = a.createStereoPanner(); pan.pan.setValueAtTime(from, t); pan.pan.linearRampToValueAtTime(to, t + dur);
    const src = noiseSrc(a), f = a.createBiquadFilter(), osc = a.createOscillator(), og = a.createGain();
    f.type = "bandpass"; f.Q.value = 1.5;
    const f0 = jit(500, 0.1);
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f0 * 3.5, t + dur * 0.5); f.frequency.exponentialRampToValueAtTime(f0 * 0.6, t + dur);
    osc.type = "sawtooth"; osc.frequency.setValueAtTime(jit(140), t); osc.frequency.exponentialRampToValueAtTime(220, t + dur * 0.5); osc.frequency.exponentialRampToValueAtTime(90, t + dur);
    og.gain.value = 0.15;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + dur * 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(pan); osc.connect(og).connect(pan); pan.connect(g);
    src.start(t); osc.start(t); src.stop(t + dur + 0.05); osc.stop(t + dur + 0.05);
  },
  whoosh: () => sfx.flyby(-0.7, 0.7, 0.8),
  engineStart, engineSpeed, engineStop,
  /** Targeting computer beeps that speed up over `secs`, ending in a lock tone. */
  targeting: (secs = 1.1) => {
    let t = 0, gap = 0.22;
    while (t < secs - 0.1) { tone(1760, 0.04, "sine", t, undefined, 0.05); t += gap; gap = Math.max(0.05, gap * 0.78); }
    sfx.lock(t);
  },
  lock: (start = 0) => { tone(1760, 0.35, "sine", start, undefined, 0.06, { verb: 0.2 }); tone(2637, 0.35, "sine", start, undefined, 0.04, { verb: 0.2 }); },
  sting: () => { tone(196, 0.6, "sawtooth", 0, 196, 0.06, { music: true, verb: 0.4 }); tone(294, 0.7, "triangle", 0.15, 294, 0.07, { music: true, verb: 0.4 }); },
  hyperspace: () => { tone(80, 1.2, "sawtooth", 0, 1600, 0.05, { verb: 0.4 }); hiss(1.1, 0.1, 300, 5000, { start: 0.1, verb: 0.3 }, "bandpass", 0.3, 1.2); },
  miss: () => tone(300, 0.2, "triangle", 0, 150, 0.06),
  victory: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.4, "triangle", i * 0.18, undefined, 0.09, { music: true, verb: 0.4 })),
  defeat: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.5, "triangle", i * 0.22, undefined, 0.09, { music: true, verb: 0.4 })),
  bigBoom: () => boom("huge"),
  // Long rolling Death Star rumble with aftershocks.
  deathStar: () => {
    boom("huge");
    tone(45, 4, "sawtooth", 0, 18, 0.2, { verb: 0.5 }); hiss(4.5, 0.3, 900, 60, { verb: 0.5 }, "lowpass", 0.05);
    [0.6, 1.1, 1.7, 2.4, 3.2].forEach((s, i) => setTimeout(() => boom(i % 2 ? "medium" : "small", { pan: (Math.random() - 0.5) * 1.4 }), s * 1000));
  },
};
