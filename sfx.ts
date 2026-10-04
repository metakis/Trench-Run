// Retro sound effects synthesized with the Web Audio API (no audio files).
let ctx: AudioContext | null = null;
let muted = false;

export const setMuted = (m: boolean) => { muted = m; };
export const isMuted = () => muted;

function ac(): AudioContext | null {
  if (muted || typeof window === "undefined") return null;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = "square", start = 0, endFreq?: number, vol = 0.12) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + start;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur);
}

function noise(dur: number, start = 0, vol = 0.25) {
  const a = ac();
  if (!a) return;
  const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 900;
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(a.destination);
  src.start(a.currentTime + start);
}

export const sfx = {
  // Engine hum that swells over ~3s.
  hum: () => { for (let i = 0; i < 6; i++) { tone(55 + i * 2, 0.7, "sawtooth", i * 0.5, undefined, 0.03 + i * 0.012); } },
  blip: () => tone(880, 0.08, "square"),
  unblip: () => tone(440, 0.08, "square"),
  // Dice rattle: short clicky noise bursts plus blips, slowing down as dice settle.
  roll: () => {
    let t = 0;
    for (let i = 0; i < 12; i++) { noise(0.03, t, 0.18); tone(300 + Math.random() * 500, 0.03, "square", t, undefined, 0.05); t += 0.05 + i * 0.008; }
  },
  laser: () => { tone(1400, 0.18, "sawtooth", 0, 200, 0.08); tone(1200, 0.18, "sawtooth", 0.1, 180, 0.08); },
  explosion: () => { noise(0.6); tone(120, 0.5, "triangle", 0, 40, 0.2); },
  // One crunchy pop per ship lost, staggered.
  shipLost: (n = 1) => { for (let i = 0; i < Math.min(n, 6); i++) { noise(0.35, i * 0.18, 0.3); tone(220, 0.3, "square", i * 0.18, 50, 0.1); } },
  // Heavy turbolaser cannon thumps.
  cannon: () => { for (let i = 0; i < 3; i++) { tone(90, 0.35, "square", i * 0.22, 35, 0.2); noise(0.2, i * 0.22, 0.25); } },
  // Falling whistle ending in a thud.
  bombDrop: () => { tone(1800, 0.9, "sine", 0, 250, 0.1); noise(0.4, 0.9, 0.35); tone(70, 0.4, "triangle", 0.9, 30, 0.25); },
  whoosh: () => { noise(0.5, 0, 0.15); tone(200, 0.5, "sine", 0, 900, 0.08); },
  sting: () => { tone(196, 0.5, "sawtooth", 0, 196, 0.1); tone(294, 0.6, "square", 0.15, 294, 0.08); },
  hyperspace: () => { tone(80, 1.2, "sawtooth", 0, 1600, 0.08); noise(1.1, 0.1, 0.12); },
  miss: () => tone(300, 0.2, "triangle", 0, 150),
  victory: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, "square", i * 0.18)),
  defeat: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, "square", i * 0.22)),
  bigBoom: () => { noise(1.5, 0, 0.4); tone(80, 1.4, "sawtooth", 0, 30, 0.25); },
  // Long rolling Death Star blast with secondary explosions.
  deathStar: () => {
    noise(2.5, 0, 0.5); tone(60, 2.4, "sawtooth", 0, 20, 0.3);
    [0.4, 0.8, 1.3, 1.9].forEach((s) => { noise(0.6, s, 0.3); tone(110, 0.5, "triangle", s, 35, 0.15); });
  },
};
