import { useEffect, useRef } from "react";
import { sfx } from "./sfx";
import { allowFlash, drawFx, explode, puff, reducedMotion, sparkle, type Fx } from "./fx";

/**
 * Glowing-line 3D scenes drawn on canvas with a tiny perspective projection.
 * TrenchPOV = Phase 3 trench (cannon rounds + bombing run), SpaceDogfight = Phase 2 battle.
 * Shared look: Rebel bolts blue, Imperial bolts red, one explosion and one miss style.
 */
type Props = {
  cannons: number;
  step: string;
  rolling: boolean;
  fire: { hits: number; total: number; key: string; mask?: boolean[] } | null;
  bomb: { hits: boolean[]; key: string } | null;
  label: string;
  shipsLeft: number;
  ships: { xwing: number; ywing: number };
};

type Particle = Fx;
type Glyph = "xwing" | "ywing" | "tie" | "superTie";

const SEG = 1.6, FAR = 22, SPEED = 9, MAX_SHIPS = 12;

function readColors() {
  const css = getComputedStyle(document.documentElement);
  const col = (n: string) => css.getPropertyValue(n).trim() || "white";
  return { holo: col("--holo"), red: col("--saber-red"), blue: col("--saber-blue"), gold: col("--gold"), hit: col("--hit"), bg: col("--background"), rebel: col("--rebel"), empire: col("--empire") };
}

/** The one explosion style (see fx.ts); keeps its existing sound. */
function shatter(list: Particle[], x: number, y: number, color: string, _gold?: string, scale = 1, w = 0) {
  const size = scale >= 1.5 ? "huge" : scale > 1 ? "medium" : "small";
  explode(list, x, y, color, size);
  sfx.explosion(size === "huge" ? "medium" : size, w ? (x / w) * 2 - 1 : 0);
}
/** The one miss style: small spark where the bolt ends. */
function spark(list: Particle[], x: number, y: number, color: string) { sparkle(list, x, y, color); }
const drawParticles = drawFx;

function drawGlyph(g: CanvasRenderingContext2D, u: Glyph, x: number, y: number, sz: number) {
  g.beginPath();
  if (u === "xwing") {
    g.moveTo(x - sz, y - sz * 0.7); g.lineTo(x + sz, y + sz * 0.7);
    g.moveTo(x - sz, y + sz * 0.7); g.lineTo(x + sz, y - sz * 0.7);
    g.moveTo(x, y - sz * 0.3); g.lineTo(x, y + sz * 0.3);
  } else if (u === "ywing") {
    g.moveTo(x - sz * 0.8, y); g.lineTo(x + sz * 0.8, y);
    g.moveTo(x - sz * 0.8, y - sz * 0.4); g.lineTo(x - sz * 0.8, y + sz * 0.4);
    g.moveTo(x + sz * 0.8, y - sz * 0.4); g.lineTo(x + sz * 0.8, y + sz * 0.4);
    g.moveTo(x, y - sz * 0.25); g.lineTo(x, y + sz * 0.25);
  } else {
    g.arc(x, y, sz * 0.3, 0, Math.PI * 2);
    g.moveTo(x - sz * 0.3, y); g.lineTo(x - sz * 0.8, y); g.moveTo(x + sz * 0.3, y); g.lineTo(x + sz * 0.8, y);
    if (u === "tie") {
      g.moveTo(x - sz * 0.8, y - sz * 0.8); g.lineTo(x - sz * 0.8, y + sz * 0.8);
      g.moveTo(x + sz * 0.8, y - sz * 0.8); g.lineTo(x + sz * 0.8, y + sz * 0.8);
    } else {
      g.moveTo(x - sz * 0.5, y - sz * 0.9); g.lineTo(x - sz * 0.9, y); g.lineTo(x - sz * 0.5, y + sz * 0.9);
      g.moveTo(x + sz * 0.5, y - sz * 0.9); g.lineTo(x + sz * 0.9, y); g.lineTo(x + sz * 0.5, y + sz * 0.9);
    }
  }
  g.stroke();
}

function fitCanvas(c: HTMLCanvasElement, g: CanvasRenderingContext2D) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = c.clientWidth, h = c.clientHeight;
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return [w, h] as const;
}
const ease = (u: number) => 1 - Math.pow(1 - Math.min(Math.max(u, 0), 1), 3);

/** Shared cockpit frame laid over every 3D scene. */
export function CockpitFrame({ label, right, rightTone = "text-rebel", children }: { label: string; right?: string; rightTone?: string; children?: React.ReactNode }) {
  const corner = "absolute h-4 w-4 border-holo/80";
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className={`${corner} left-1 top-1 border-l-2 border-t-2`} />
      <div className={`${corner} right-1 top-1 border-r-2 border-t-2`} />
      <div className={`${corner} bottom-1 left-1 border-b-2 border-l-2`} />
      <div className={`${corner} bottom-1 right-1 border-b-2 border-r-2`} />
      <div className="absolute left-6 top-2 font-mono text-[10px] uppercase tracking-widest text-holo">{label}</div>
      {right && <div className={`absolute right-6 top-2 font-mono text-[10px] uppercase tracking-widest ${rightTone}`}>{right}</div>}
      <div className="absolute bottom-2 left-6 font-mono text-[9px] uppercase tracking-widest text-holo/60 animate-flicker">Red Sq · Shields 100 · Tgt-lock</div>
      <div className="absolute bottom-2 right-6 font-mono text-[9px] uppercase tracking-widest text-holo/60">Imp-Sec 7</div>
      {children}
    </div>
  );
}

export function TrenchPOV(p: Props) {
  const cv = useRef<HTMLCanvasElement>(null);
  const props = useRef(p);
  props.current = p;

  useEffect(() => {
    const c = cv.current!;
    const g = c.getContext("2d")!;
    const C = readColors();
    // sky: dim stars like the main background, only above the horizon
    const sky = Array.from({ length: 110 }, (_, i) => ({ x: Math.random(), y: Math.random(), r: [0.5, 0.95, 1.4][i % 3]!, tw: Math.random() * 6, blue: i % 3 === 2 && Math.random() > 0.7 }));
    const E = { fireAt: -1, fireKey: "", bombAt: -1, bombKey: "", gateAt: -1, step: props.current.step, rollAt: -1, wasRolling: false,
      boomed: new Set<number>(), gone: new Set<number>(), landed: new Set<number>(), tally: [0, 0], camY: 0, sweep: 0,
      landAt: new Map<number, number>(), flakAcc: 0, shot: new Set<number>(), launched: new Set<number>(), speed: -1 };
    const reduced = reducedMotion();
    const parts: Particle[] = [];
    let raf = 0, last = performance.now(), s = 0;
    const t0 = last;

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      const t = (now - t0) / 1000;
      const P = props.current;
      const bombing = P.step === "bomb";
      if (P.fire && P.fire.key !== E.fireKey) { E.fireKey = P.fire.key; E.fireAt = t; E.boomed.clear(); E.gone.clear(); E.shot.clear(); }
      if (!P.fire && E.fireAt >= 0 && t - E.fireAt > 0.1) { E.fireAt = -1; E.gone.clear(); }
      if (P.bomb && P.bomb.key !== E.bombKey) { E.bombKey = P.bomb.key; E.bombAt = t; E.landed.clear(); E.landAt.clear(); E.launched.clear(); E.tally = [0, 0]; }
      if (P.step !== E.step) { E.step = P.step; E.gateAt = t; E.sweep = E.sweep > 0 ? -1.4 : 1.4; }
      if (P.rolling && !E.wasRolling) { E.rollAt = t; if (bombing) sfx.targeting(1.1); }
      { const sp = bombing ? (E.bombAt >= 0 ? 0.4 : 0.7) : 1; if (sp !== E.speed) { E.speed = sp; sfx.engineSpeed(sp); } }
      E.wasRolling = P.rolling;
      s += dt * SPEED * (bombing && E.bombAt >= 0 ? 0.3 : 1);

      // camera: behind the fleet for cannon rounds, diving low for the bombing run, sweep on each new round
      E.camY += ((bombing ? -0.5 : 0) - E.camY) * Math.min(1, dt * 2);
      const gt = E.gateAt >= 0 ? t - E.gateAt : 99;
      const camX = E.sweep * (1 - ease(gt / 1.6));

      const [w, h] = fitCanvas(c, g);
      const fireT = E.fireAt >= 0 ? t - E.fireAt : 99;
      const shake = !reducedMotion() && fireT < 2.4 && P.fire && P.fire.hits > 0 ? Math.max(0, 2.4 - fireT) * 3 : 0;
      const cx = w / 2 + (Math.random() - 0.5) * shake, cy = h * 0.42 + (Math.random() - 0.5) * shake;
      const f = Math.min(w, h) * 0.9;
      const bob = reduced ? 0 : Math.sin(t * 1.3) * 0.04;
      const pr = (x: number, y: number, z: number): [number, number] => [cx + ((x - camX * Math.min(z, 6) / 6) / z) * f, cy - ((y - E.camY - bob) / z) * f];

      g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = C.bg; g.fillRect(0, 0, c.width, c.height);
      fitCanvas(c, g);
      // slight banking for a sense of speed
      const bank = reduced ? 0 : Math.sin(t * 0.7) * 0.035 + camX * 0.03;
      g.translate(cx, cy); g.rotate(bank); g.translate(-cx, -cy);
      {
        const horizonY = pr(0, 1, FAR)[1];
        const ox = -camX * 6 + (reduced ? 0 : Math.sin(t * 0.05) * 4), pad = w * 0.06;
        g.save(); g.beginPath(); g.rect(-w, -h, w * 3, horizonY + h); g.clip();
        for (const st of sky) {
          g.globalAlpha = reduced ? 0.3 : Math.max(0.06, 0.15 + 0.25 * Math.sin(t * 1.3 + st.tw));
          g.fillStyle = st.blue ? "rgb(170,230,255)" : "white";
          g.fillRect(-pad + st.x * (w + pad * 2) + ox, st.y * horizonY, st.r * 1.4, st.r * 1.4);
        }
        g.restore(); g.globalAlpha = 1;
      }

      const off = s % SEG;
      const ribs: number[] = [];
      for (let z = FAR - off; z > 0.35; z -= SEG) ribs.push(z);

      // glowing-line trench (brighter, with a floor grid, during the bombing run)
      g.lineWidth = bombing ? 2.2 : 1.5; g.strokeStyle = C.holo; g.shadowColor = C.holo; g.shadowBlur = bombing ? 12 : 8;
      g.beginPath();
      for (const z of ribs) {
        const pts = [pr(-4, 1, z), pr(-1, 1, z), pr(-1, -1, z), pr(1, -1, z), pr(1, 1, z), pr(4, 1, z)];
        pts.forEach(([x, y], j) => (j ? g.lineTo(x, y) : g.moveTo(x, y)));
      }
      const rails: [number, number][] = [[-1, 1], [-1, -1], [1, -1], [1, 1]];
      if (bombing) rails.push([-0.5, -1], [0, -1], [0.5, -1], [-1, 0], [1, 0]);
      for (const [x, y] of rails) {
        const [ax, ay] = pr(x, y, 0.35), [bx, by] = pr(x, y, FAR);
        g.moveTo(ax, ay); g.lineTo(bx, by);
      }
      g.stroke();

      // wall and floor greebles: panel lines, vents, pipes and boxes scrolling past
      g.lineWidth = 1; g.shadowBlur = 4; g.globalAlpha = 0.55;
      g.beginPath();
      const quad = (pts: [number, number, number][]) => { pts.forEach(([x, y, z], j) => { const [a, b] = pr(x, y, z); if (j) g.lineTo(a, b); else g.moveTo(a, b); }); g.closePath(); };
      for (const z of ribs) {
        if (z < 0.6) continue;
        const id = Math.round((z + s) / SEG), z2 = z + SEG * 0.8;
        for (const side of [-1, 1]) {
          const k = (id * 7 + (side > 0 ? 3 : 0)) % 5;
          // panel line across the wall
          { const [a, b] = pr(side, 0.35, z), [c2, d] = pr(side, 0.35, z2); g.moveTo(a, b); g.lineTo(c2, d); }
          if (k === 0) quad([[side, -0.6, z + 0.2], [side, -0.2, z + 0.2], [side, -0.2, z + 0.9], [side, -0.6, z + 0.9]]); // vent
          if (k === 1) { const [a, b] = pr(side * 0.94, 0.7, z), [c2, d] = pr(side * 0.94, 0.7, z + SEG); g.moveTo(a, b); g.lineTo(c2, d); const [e1, e2] = pr(side * 0.94, 0.62, z), [f1, f2] = pr(side * 0.94, 0.62, z + SEG); g.moveTo(e1, e2); g.lineTo(f1, f2); } // pipes
          if (k === 2) for (let v = 0; v < 3; v++) { const yy = -0.8 + v * 0.12; const [a, b] = pr(side, yy, z + 0.3), [c2, d] = pr(side, yy, z + 1.1); g.moveTo(a, b); g.lineTo(c2, d); } // vent slats
          if (k === 3) quad([[side * 0.8, -1, z + 0.3], [side * 0.8, -0.8, z + 0.3], [side * 0.55, -0.8, z + 0.3], [side * 0.55, -1, z + 0.3]]); // floor box
        }
        if (id % 3 === 0) { const [a, b] = pr(-1, -1, z + 0.8), [c2, d] = pr(1, -1, z + 0.8); g.moveTo(a, b); g.lineTo(c2, d); }
      }
      g.stroke(); g.globalAlpha = 1;

      // speed streaks at the screen edges
      if (!reduced) {
        g.strokeStyle = "rgba(200,240,255,0.35)"; g.lineWidth = 1; g.shadowBlur = 0; g.beginPath();
        for (let i = 0; i < 6; i++) {
          const ang = Math.random() * Math.PI * 2, r0 = Math.max(w, h) * (0.42 + Math.random() * 0.1);
          const dx = Math.cos(ang), dy = Math.sin(ang);
          g.moveTo(cx + dx * r0, cy + dy * r0); g.lineTo(cx + dx * r0 * 1.25, cy + dy * r0 * 1.25);
        }
        g.stroke();
      }

      if (bombing) {
        // exhaust port
        const rollT = E.rollAt >= 0 ? t - E.rollAt : 0;
        const pz = Math.max(2.2, 16 - rollT * 10);
        const [px, py] = pr(0, -1, pz);
        const r = (0.35 / pz) * f;
        g.beginPath(); g.ellipse(px, py, r, r * 0.35, 0, 0, Math.PI * 2);
        g.fillStyle = C.bg; g.fill(); g.lineWidth = 2.5; g.strokeStyle = C.gold; g.shadowColor = C.gold; g.shadowBlur = 16; g.stroke();
        g.beginPath(); g.ellipse(px, py, r * 0.55, r * 0.2, 0, 0, Math.PI * 2); g.stroke(); g.shadowBlur = 0;
        // target box tightens as the range counts down
        { const k = 1 + 4 * Math.max(0, (pz - 2.2) / 13.8), bw = r * 1.6 * k, bh = r * 0.9 * k, L = Math.min(bw, bh) * 0.5;
          g.strokeStyle = C.hit; g.shadowColor = C.hit; g.shadowBlur = 8; g.lineWidth = 1.5; g.beginPath();
          for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
            const x0 = px + sx * bw, y0 = py + sy * bh;
            g.moveTo(x0, y0 - sy * L); g.lineTo(x0, y0); g.lineTo(x0 - sx * L, y0);
          }
          g.stroke(); g.shadowBlur = 0; }
        // scorch marks where torpedoes missed, and hit flashes down the port
        if (P.bomb && E.bombAt >= 0) P.bomb.hits.forEach((hit, i) => {
          const at = E.landAt.get(i); if (at === undefined) return;
          const ang = i * 2.4, age = t - at;
          if (hit) {
            if (age < 0.8) { const a = 1 - age / 0.8; g.globalCompositeOperation = "lighter";
              const gr = g.createRadialGradient(px, py, 0, px, py, r * 1.4); gr.addColorStop(0, `rgba(255,250,220,${a})`); gr.addColorStop(1, "rgba(255,180,60,0)");
              g.fillStyle = gr; g.beginPath(); g.ellipse(px, py, r * 1.4, r * 0.6, 0, 0, Math.PI * 2); g.fill();
              g.fillStyle = `rgba(255,240,200,${a * 0.8})`; g.fillRect(px - r * 0.15, py, r * 0.3, h); g.globalCompositeOperation = "source-over"; }
          } else {
            const sx = px + Math.cos(ang) * r * (1.6 + (i % 3) * 0.5), sy = py + Math.sin(ang) * r * 0.6 - r * 0.2;
            g.fillStyle = "rgba(10,8,8,0.85)"; g.beginPath(); g.ellipse(sx, sy, r * 0.35, r * 0.13, 0, 0, Math.PI * 2); g.fill();
            g.strokeStyle = `rgba(255,120,40,${Math.max(0.25, 1 - age)})`; g.lineWidth = 1; g.stroke();
          }
        });
        if (P.bomb && E.bombAt >= 0) {
          const bt = t - E.bombAt, n = P.bomb.hits.length;
          const gap = Math.min(0.3, 1.6 / Math.max(n, 1)), FLY = 0.8;
          P.bomb.hits.forEach((hit, i) => {
            const d = bt - i * gap;
            if (d < 0) return;
            if (!E.launched.has(i)) { E.launched.add(i); sfx.torpedo(i % 2 ? 0.4 : -0.4); }
            const ang = i * 2.4;
            const tx = hit ? px : px + Math.cos(ang) * r * (1.6 + (i % 3) * 0.5);
            const ty = hit ? py : py + Math.sin(ang) * r * 0.6 - r * 0.2;
            if (d < FLY) {
              const u = d / FLY;
              const sx = cx + (i % 2 ? 1 : -1) * w * 0.22, sy = h * 0.98;
              const u0 = Math.max(0, u - 0.18);
              g.strokeStyle = C.blue; g.shadowColor = C.blue; g.shadowBlur = 14; g.lineWidth = 3 * (1 - u) + 1; g.globalAlpha = 0.7;
              g.beginPath(); g.moveTo(sx + (tx - sx) * u0, sy + (ty - sy) * u0); g.lineTo(sx + (tx - sx) * u, sy + (ty - sy) * u); g.stroke(); g.globalAlpha = 1;
              g.beginPath(); g.arc(sx + (tx - sx) * u, sy + (ty - sy) * u, 5 * (1 - u) + 2, 0, Math.PI * 2);
              g.fillStyle = C.blue; g.fill(); g.shadowBlur = 0;
            } else if (!E.landed.has(i)) {
              E.landed.add(i); E.landAt.set(i, t);
              E.tally[hit ? 0 : 1]! += 1;
              if (hit) shatter(parts, tx, ty, C.gold, "", 1.6, w);
              else { explode(parts, tx, ty, "rgb(255,150,60)", "small"); sfx.impact((tx / w) * 2 - 1); sfx.miss(); }
            }
          });
          g.font = "bold 12px ui-monospace, monospace"; g.textAlign = "left";
          const [hn, mn] = E.tally;
          g.fillStyle = C.hit; g.fillText(`${hn} ${hn === 1 ? "hit" : "hits"}`, px + r * 2.6, py - 6);
          g.fillStyle = "rgb(255,150,60)"; g.fillText(`${mn} ${mn === 1 ? "miss" : "misses"}`, px + r * 2.6, py + 10);
        }
      } else {
        // cannon towers
        const n = Math.min(P.cannons, 10);
        const towers: [number, number][] = [];
        const recoil: number[] = Array(n).fill(0);
        if (P.fire && n) { const tot = Math.max(P.fire.total, 1), gp = Math.min(0.12, 2 / tot);
          for (let i = 0; i < tot; i++) { const d = fireT - i * gp; if (d >= 0 && d < 0.2) recoil[i % n] = Math.max(recoil[i % n]!, 1 - d / 0.2); } }
        const charge = P.rolling && E.rollAt >= 0 ? Math.min(1, (t - E.rollAt) / 1.0) : 0;
        g.lineWidth = 1.5; g.strokeStyle = C.red; g.shadowColor = C.red; g.shadowBlur = 8;
        for (let i = 0; i < n; i++) {
          const z = (((i * 2.3 + 6 - s * 0.35) % 16) + 16) % 16 + 3;
          const sx = i % 2 ? 1 : -1;
          const x0 = sx, x1 = sx * 0.7, y0 = 0.1, y1 = 0.5;
          const q = [pr(x0, y0, z), pr(x1, y0, z), pr(x1, y1, z), pr(x0, y1, z)];
          g.beginPath(); q.forEach(([x, y], j) => (j ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.stroke();
          const [bx, by] = pr(x1, (y0 + y1) / 2, z);
          const rc = recoil[i]!, len = 0.25 * (1 - rc * 0.5);
          const [mx, my] = pr(x1 - sx * len, (y0 + y1) / 2, z);
          g.beginPath(); g.moveTo(bx, by); g.lineTo(mx, my); g.stroke();
          const glow = Math.max(charge * (0.6 + 0.4 * Math.sin(t * 20 + i)), rc);
          if (glow > 0.05) {
            const rr = (rc > 0 ? 10 : 5) * glow * Math.min(2, 4 / z) + 1;
            g.globalCompositeOperation = "lighter";
            const gr = g.createRadialGradient(mx, my, 0, mx, my, rr * 2);
            gr.addColorStop(0, rc > 0 ? "rgba(255,240,200,1)" : "rgba(255,90,60,0.9)"); gr.addColorStop(1, "rgba(255,60,40,0)");
            g.fillStyle = gr; g.beginPath(); g.arc(mx, my, rr * 2, 0, Math.PI * 2); g.fill();
            g.globalCompositeOperation = "source-over";
          }
          towers.push([mx, my]);
        }

        // rebel ships ahead of the camera
        const list = [...Array(P.ships.xwing).fill("xwing"), ...Array(P.ships.ywing).fill("ywing")] as Glyph[];
        const drawn = list.slice(0, MAX_SHIPS);
        const slot = (i: number): [number, number, number] => {
          const cols = Math.min(drawn.length, 4), row = Math.floor(i / 4), col = i % 4;
          const x = (col - (cols - 1) / 2) * 0.32 + Math.sin(t * 2 + i) * 0.02;
          const y = -0.55 + row * 0.22 + Math.cos(t * 1.7 + i) * 0.02;
          return [...pr(x, y, 2.4 + row * 0.25), f / (2.4 + row * 0.25)];
        };
        g.strokeStyle = C.rebel; g.shadowColor = C.rebel; g.shadowBlur = 8; g.lineWidth = 1.5;
        drawn.forEach((u, i) => {
          if (E.gone.has(i)) return;
          const [x, y, k] = slot(i);
          drawGlyph(g, u, x, y, k * 0.06);
        });
        if ((P.rolling || (P.fire && fireT < 2.6)) && drawn.length) {
          E.flakAcc += dt;
          if (E.flakAcc > (reduced ? 0.6 : 0.22)) {
            E.flakAcc = 0;
            const [fx, fy, k] = slot(Math.floor(Math.random() * drawn.length));
            const ox = fx + (Math.random() - 0.5) * k * 0.5, oy = fy + (Math.random() - 0.5) * k * 0.3;
            sparkle(parts, ox, oy, "rgb(255,120,50)", 5); puff(parts, ox, oy, 0.5, 0.6);
          }
        }
        if (list.length > MAX_SHIPS) {
          g.shadowBlur = 0; g.fillStyle = C.rebel; g.font = "bold 11px ui-monospace, monospace"; g.textAlign = "center";
          g.fillText(`+${list.length - MAX_SHIPS}`, cx, h * 0.95);
        }

        // one bolt per cannon
        if (P.fire && towers.length) {
          const total = Math.max(P.fire.total, 1), gap = Math.min(0.12, 2 / total), FLY = 0.45;
          const alive = drawn.map((_, i) => i);
          for (let i = 0; i < total; i++) {
            const d = fireT - i * gap;
            if (d < 0 || d > FLY + 0.2) continue;
            const [bx, by] = towers[i % towers.length]!;
            if (!E.shot.has(i)) { E.shot.add(i); sfx.turbolaser((bx / w) * 2 - 1, false); }
            const hit = P.fire.mask ? !!P.fire.mask[i] : i < P.fire.hits;
            const target = hit ? alive[alive.length - 1 - (i % Math.max(alive.length, 1))] : undefined;
            const [tx, ty] = target !== undefined ? slot(target) : [bx < cx ? cx + w * 0.3 : cx - w * 0.3, h * (0.55 + (i % 3) * 0.08)];
            const u = Math.min(d / FLY, 1), u0 = Math.max(0, u - 0.35);
            if (d <= FLY) {
              g.lineWidth = hit ? 3.5 : 2; g.strokeStyle = C.red; g.shadowColor = C.red; g.shadowBlur = 12; g.globalAlpha = hit ? 1 : 0.7;
              g.beginPath(); g.moveTo(bx + (tx - bx) * u0, by + (ty - by) * u0); g.lineTo(bx + (tx - bx) * u, by + (ty - by) * u); g.stroke();
              g.globalAlpha = 1;
            } else if (!E.boomed.has(i)) {
              E.boomed.add(i);
              if (target !== undefined && !E.gone.has(target)) { E.gone.add(target); shatter(parts, tx, ty, C.rebel, C.gold, 1, w); }
              else { spark(parts, tx, ty, C.red); sfx.impact((tx / w) * 2 - 1); }
            }
          }
          if (P.fire.hits > 0 && fireT > 0.4 && fireT < 1.4) {
            g.shadowBlur = 0; g.fillStyle = `rgba(255,60,40,${(reducedMotion() ? 0.06 : 0.2) * (1 - (fireT - 0.4))})`; g.fillRect(0, 0, w, h);
          }
        }
      }

      // gate fly-through on a new round
      if (gt < 1.3) {
        const z = Math.max(0.36, 6 - gt * 5);
        const pass = z < 1.2 ? 1 - (z - 0.36) / 0.84 : 0;
        const col = pass > 0.3 ? "rgb(255,250,220)" : C.gold;
        g.lineWidth = 3 + pass * 2; g.strokeStyle = col; g.shadowColor = C.gold; g.shadowBlur = 14 + (reduced ? 0 : pass * 20);
        const fr = (k: number, zz: number) => [pr(-k, k, zz), pr(k, k, zz), pr(k, -k, zz), pr(-k, -k, zz)];
        const o = fr(1.15, z), inn = fr(0.95, z), back = fr(1.15, z + 0.3);
        g.beginPath();
        for (const q of [o, inn, back]) { q.forEach(([x, y], j) => (j ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); }
        for (let j = 0; j < 4; j++) { g.moveTo(...o[j]!); g.lineTo(...back[j]!); g.moveTo(...o[j]!); g.lineTo(...inn[j]!); }
        // struts across the top corners
        g.moveTo(...inn[0]!); g.lineTo(...pr(-0.5, 1.15, z)); g.moveTo(...inn[1]!); g.lineTo(...pr(0.5, 1.15, z));
        g.stroke();
      }
      g.shadowBlur = 0;
      drawParticles(g, parts, dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    sfx.engineStart(1);
    return () => { cancelAnimationFrame(raf); sfx.engineStop(); };
  }, []);

  return (
    <div className="relative h-full min-h-40 w-full overflow-hidden rounded-md border border-border">
      <canvas ref={cv} className="absolute inset-0 h-full w-full" />
      <CockpitFrame label={p.label} right={`${p.shipsLeft} ${p.shipsLeft === 1 ? "ship" : "ships"} left`}>
        <div className="absolute left-1/2 top-[42%] h-4 w-4 -translate-x-1/2 -translate-y-1/2 border border-holo/60" />
      </CockpitFrame>
    </div>
  );
}

export type DogfightDie = { id: string | number; side: "rebel" | "empire"; kind: Glyph; hit: boolean; value: number };

/** Phase 2 space battle in the same glowing-line 3D style: Rebels up front, Imperials further out. */
export function SpaceDogfight({ dice, doomed, damaged = [] }: { dice: DogfightDie[]; doomed?: { rebel: number[]; empire: number[] }; damaged?: number[] }) {
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = cv.current!;
    const g = c.getContext("2d")!;
    const C = readColors();
    const reduced = reducedMotion();
    const reb = dice.filter((d) => d.side === "rebel").slice(0, 12);
    const emp = dice.filter((d) => d.side === "empire").slice(0, 12);
    const parts: Particle[] = [];
    const struck = { rebel: new Map<number, number>(), empire: new Map<number, number>() };
    const landed = new Set<string>();
    const gone = new Set<string>();
    const fired = new Set<string>();
    sfx.flyby(-0.9, 0.9, 1.2);
    let raf = 0, last = performance.now(), shakeUntil = 0, smokeT = 0;
    const t0 = last;
    const pos = (side: "rebel" | "empire", i: number, n: number, t: number): [number, number, number] => {
      const cols = Math.min(n, 4), row = Math.floor(i / 4), col = i % 4;
      const left = side === "rebel";
      const x = (left ? -1.1 : 1.1) + (col - (cols - 1) / 2) * 0.32 * (left ? 1 : -1) + Math.sin(t * 1.5 + i) * 0.03;
      const y = (row - 1) * 0.35 + Math.cos(t * 1.3 + i) * 0.03;
      const z = (left ? 3 : 4.2) + row * 0.3;
      return [x, y, z];
    };
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      const t = (now - t0) / 1000;
      const [w, h] = fitCanvas(c, g);
      const sh = !reduced && t < shakeUntil ? (shakeUntil - t) * 10 : 0;
      // wide shot that slowly orbits
      const camX = Math.sin(t * 0.4) * 0.25, cx = w / 2 + (Math.random() - 0.5) * sh, cy = h * 0.5 + (Math.random() - 0.5) * sh, f = Math.min(w, h) * 1.1;
      const pr = (x: number, y: number, z: number): [number, number] => [cx + ((x - camX) / z) * f, cy - (y / z) * f];
      g.fillStyle = C.bg; g.fillRect(0, 0, w, h);
      g.fillStyle = "rgba(255,255,255,0.6)";
      for (let i = 0; i < 60; i++) g.fillRect(((i * 97 - t * 20 * (1 + (i % 3))) % w + w) % w, (i * 53) % h, 1, 1);
      // faint depth grid
      g.strokeStyle = C.holo; g.globalAlpha = 0.15; g.lineWidth = 1; g.beginPath();
      for (let z = 2; z < 9; z += 1) { const [a, b] = pr(-4, -1.2, z), [c2, d] = pr(4, -1.2, z); g.moveTo(a, b); g.lineTo(c2, d); }
      for (let x = -4; x <= 4; x++) { const [a, b] = pr(x, -1.2, 2), [c2, d] = pr(x, -1.2, 9); g.moveTo(a, b); g.lineTo(c2, d); }
      g.stroke(); g.globalAlpha = 1;

      // struck ships spin out and drift before exploding
      const screen = (side: "rebel" | "empire", i: number) => {
        const list = side === "rebel" ? reb : emp;
        const [x, y, z] = pos(side, i, list.length, t);
        const at = struck[side].get(i);
        const u = at !== undefined && (!doomed || doomed[side].includes(i)) ? Math.max(0, t - at) : 0;
        const [sx, sy] = pr(x + (side === "rebel" ? -1 : 1) * u * 0.08, y - u * u * 0.04, z);
        return [sx, sy, f / z, u] as const;
      };
      smokeT += dt;
      const emitSmoke = smokeT > 0.06; if (emitSmoke) smokeT = 0;
      // ships
      for (const side of ["rebel", "empire"] as const) {
        const list = side === "rebel" ? reb : emp;
        list.forEach((d, i) => {
          const key = `${side}${i}`;
          const hitAt = struck[side].get(i);
          const dies = !doomed || doomed[side].includes(i);
          if (hitAt !== undefined && dies && t > 3.0 && !gone.has(key)) {
            gone.add(key); const [sx, sy] = screen(side, i);
            const big = d.kind === "superTie";
            explode(parts, sx, sy, side === "rebel" ? C.rebel : C.empire, big ? "medium" : "small");
            sfx.explosion(big ? "medium" : "small", (sx / w) * 2 - 1);
            if (big) shakeUntil = t + 0.4;
          }
          if (gone.has(key)) return;
          const [sx, sy, k, u] = screen(side, i);
          const flash = hitAt !== undefined && t - hitAt < 0.25;
          const col = flash ? "rgb(255,255,255)" : hitAt !== undefined && Math.floor(t * 10) % 2 === 0 ? C.red : side === "rebel" ? C.rebel : C.empire;
          if (hitAt !== undefined && emitSmoke) puff(parts, sx, sy, 0.6, 0.8);
          g.save(); g.translate(sx, sy); if (hitAt !== undefined) g.rotate(u * u * 6);
          g.strokeStyle = col; g.shadowColor = col; g.shadowBlur = flash ? 16 : 8; g.lineWidth = 1.5;
          drawGlyph(g, d.kind, 0, 0, k * 0.08);
          g.restore();
          // die value stays under the ship
          g.shadowBlur = 0; g.font = "bold 10px ui-monospace, monospace"; g.textAlign = "center";
          const [lx, ly, lk] = (() => { const [x, y, z] = pos(side, i, list.length, t); const [a, b] = pr(x, y, z); return [a, b, f / z]; })();
          g.fillStyle = d.hit ? C.hit : "rgba(160,160,170,0.8)";
          g.fillText(String(d.value), lx, ly + lk * 0.08 + 12);
        });
      }
      // bolts: Rebellion fires first (blue), then the Empire returns fire (red) — simultaneous, so struck ships still shoot
      const volley = (from: DogfightDie[], side: "rebel" | "empire", start: number) => {
        const other = side === "rebel" ? "empire" : "rebel";
        const toN = (side === "rebel" ? emp : reb).length;
        const pool = doomed ? [...doomed[other], ...(other === "empire" ? damaged : [])].filter((x) => x < toN) : null;
        let k = 0;
        from.forEach((d, i) => {
          const target = !d.hit ? -1 : pool ? (pool[(k++) % pool.length] ?? -1) : toN ? (k++) % toN : -1;
          const t1 = start + i * 0.14, FLY = 0.55, dd = t - t1;
          if (dd < 0 || dd > FLY + 0.1) return;
          const [ax, ay, ak] = screen(side, i);
          if (!fired.has(`${side}${i}`)) { fired.add(`${side}${i}`); const pn = (ax / w) * 2 - 1; if (side === "rebel") sfx.rebelBlaster(pn); else sfx.impBlaster(pn); }
          const [bx, by] = target >= 0 ? screen(other, target) : [side === "rebel" ? w * 1.05 : -w * 0.05, i % 2 ? -10 : h + 10];
          const u = Math.min(dd / FLY, 1), u0 = Math.max(0, u - 0.3);
          const col = side === "rebel" ? C.blue : C.red;
          if (dd <= FLY) {
            g.lineWidth = d.hit ? 3 : 1.5; g.strokeStyle = col; g.shadowColor = col; g.shadowBlur = 12; g.globalAlpha = d.hit ? 1 : 0.6;
            // X-wings fire paired bolts from their wingtips
            const offs = d.kind === "xwing" ? [-ak * 0.05, ak * 0.05] : [0];
            g.beginPath();
            for (const o of offs) { g.moveTo(ax + (bx - ax) * u0, ay + o + (by - ay) * u0); g.lineTo(ax + (bx - ax) * u, ay + o * (1 - u) + (by - ay) * u); }
            g.stroke();
            g.globalAlpha = 1; g.shadowBlur = 0;
          } else if (!landed.has(`${side}${i}`)) {
            landed.add(`${side}${i}`);
            if (target >= 0) {
              if (!struck[other].has(target)) struck[other].set(target, t);
              sparkle(parts, bx, by, "rgb(255,240,200)", 10);
              sfx.impact((bx / w) * 2 - 1);
            } else if (bx > 0 && bx < w) spark(parts, bx, by, col);
          }
        });
      };
      volley(reb, "rebel", 0.3);
      volley(emp, "empire", 1.6);
      drawParticles(g, parts, dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [dice, doomed, damaged]);
  return <canvas ref={cv} className="absolute inset-0 h-full w-full rounded-md" />;
}

/** Looking straight down the exhaust shaft: rings rush past, torpedoes fall to the reactor, which flares and fades to black. */
export function ShaftView({ torpedoes }: { torpedoes: number }) {
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = cv.current!;
    const g = c.getContext("2d")!;
    const C = readColors();
    const t0 = performance.now();
    const parts: Particle[] = [];
    let raf = 0, last = t0, boomed = false;
    const loop = (now: number) => {
      const t = (now - t0) / 1000;
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      const [w, h] = fitCanvas(c, g);
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.6;
      g.clearRect(0, 0, w, h);
      const fade = t > 2.1 ? Math.max(0, 1 - (t - 2.1) * 1.6) : 1;
      g.globalAlpha = fade;
      // reactor glow at the bottom of the shaft
      const glow = Math.min(1, 0.3 + t / 2);
      const rg = g.createRadialGradient(cx, cy, 0, cx, cy, R * 0.25 * glow);
      rg.addColorStop(0, "rgba(255,255,230,1)"); rg.addColorStop(0.4, "rgba(255,180,60,0.8)"); rg.addColorStop(1, "rgba(255,80,40,0)");
      g.fillStyle = rg; g.beginPath(); g.arc(cx, cy, R * 0.25 * glow, 0, Math.PI * 2); g.fill();
      // rings rushing toward the viewer
      g.strokeStyle = C.holo; g.shadowColor = C.holo; g.shadowBlur = 10;
      for (let i = 0; i < 14; i++) {
        const z = ((i / 14 - t * 0.9) % 1 + 1) % 1;
        const r = R * 0.05 / Math.max(1.05 - z, 0.05);
        g.globalAlpha = Math.min(1, z * 2) * fade; g.lineWidth = 1 + z * 2;
        g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          g.beginPath(); g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.lineTo(cx + Math.cos(a) * r * 1.08, cy + Math.sin(a) * r * 1.08); g.stroke();
        }
      }
      g.globalAlpha = fade;
      for (let i = 0; i < torpedoes; i++) {
        const d = Math.max(0, Math.min(1, (t - i * 0.15) / 1.9));
        const a = i * 2.1 + d * 3;
        const rr = R * 0.5 * (1 - d);
        g.fillStyle = C.blue; g.shadowColor = C.blue; g.shadowBlur = 18;
        g.beginPath(); g.arc(cx + Math.cos(a) * rr * 0.3, cy + Math.sin(a) * rr * 0.3, 7 * (1 - d) + 1.5, 0, Math.PI * 2); g.fill();
      }
      g.shadowBlur = 0;
      // reactor flare: a round glow that grows and fades out (no full-screen fill)
      if (t > 2.1) {
        const u = t - 2.1, fr = R * (0.2 + u * 1.2), al = Math.max(0, 0.9 - u * 1.4);
        const fg = g.createRadialGradient(cx, cy, 0, cx, cy, fr);
        fg.addColorStop(0, `rgba(255,240,200,${al})`); fg.addColorStop(0.5, `rgba(255,150,60,${al * 0.6})`); fg.addColorStop(1, "rgba(255,80,40,0)");
        g.globalAlpha = 1; g.fillStyle = fg; g.beginPath(); g.arc(cx, cy, fr, 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = 1;
      if (t > 2.05 && !boomed) { boomed = true; explode(parts, cx, cy, C.gold, "medium"); }
      drawFx(g, parts, dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [torpedoes]);
  return <canvas ref={cv} className="absolute inset-0 h-full w-full rounded-lg" />;
}


/** A one-shot (or looping smoke) effect canvas: used by the finale and fleet-row overlays. */
export function FxBurst({ size = "small", color = "white", mode = "boom", className = "" }: { size?: "small" | "medium" | "huge"; color?: string; mode?: "boom" | "smoke"; className?: string }) {
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = cv.current!;
    const g = c.getContext("2d")!;
    const parts: Particle[] = [];
    let raf = 0, last = performance.now(), started = false, acc = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      const [w, h] = fitCanvas(c, g);
      g.clearRect(0, 0, w, h);
      if (mode === "boom" && !started) { started = true; explode(parts, w / 2, h / 2, color, size); }
      if (mode === "smoke") {
        acc += dt;
        if (acc > 0.18) { acc = 0; puff(parts, w / 2 + (Math.random() - 0.5) * 4, h / 2, 0.35, 0.6); if (Math.random() < 0.15) sparkle(parts, w / 2, h / 2, "rgb(255,200,90)", 2); }
      }
      drawFx(g, parts, dt);
      if (mode === "smoke" || parts.length) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [size, color, mode]);
  return <canvas ref={cv} className={`pointer-events-none absolute ${className}`} />;
}

/**
 * Death Star destruction in the glowing-line style: cracks of light spread from the trench, plates break off,
 * a core flash, a flat shock ring and a debris cloud, camera shake, then the Rebel ships fly past the camera.
 * `skip` jumps straight to the afterglow. Timeline (s): 0–1.6 cracks, 1.6 flash, 1.6–2.6 ring, 2.4–4 fly-past.
 */
export const FINALE_FLASH = 1.6;
export function FinaleScene({ ships, skip }: { ships: Glyph[]; skip: boolean }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const skipRef = useRef(skip); skipRef.current = skip;
  useEffect(() => {
    const c = cv.current!;
    const g = c.getContext("2d")!;
    const C = readColors();
    const reduced = reducedMotion();
    const parts: Particle[] = [];
    const cracks = Array.from({ length: 14 }, (_, i) => {
      const x0 = -0.9 + (i / 13) * 1.8, up = i % 2 ? 1 : -1;
      const pts: [number, number][] = [[x0, 0]];
      let x = x0, y = 0;
      for (let k = 0; k < 6; k++) { x += (Math.random() - 0.5) * 0.18; y += up * (0.08 + Math.random() * 0.1); pts.push([x, y]); }
      return pts;
    });
    const plates = Array.from({ length: 22 }, () => {
      const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * 0.9;
      return { x: Math.cos(a) * rr, y: Math.sin(a) * rr, vx: Math.cos(a) * (0.3 + Math.random()), vy: Math.sin(a) * (0.3 + Math.random()), at: 0.9 + Math.random() * 0.7, sz: 0.04 + Math.random() * 0.06, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 6 };
    });
    let raf = 0, last = performance.now(), t0 = last, flashed = false, skipped = false;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      if (skipRef.current && !skipped) { skipped = true; t0 = Math.min(t0, now - 2.4 * 1000); }
      const t = (now - t0) / 1000;
      const [w, h] = fitCanvas(c, g);
      g.clearRect(0, 0, w, h);
      const R = Math.min(w, 768, h, 288) * 0.32;
      const shake = !reduced && t > FINALE_FLASH && t < FINALE_FLASH + 0.9 ? (FINALE_FLASH + 0.9 - t) * 14 : 0;
      const cx = w / 2 + (Math.random() - 0.5) * shake, cy = h * 0.4 + (Math.random() - 0.5) * shake;
      const S = (x: number, y: number): [number, number] => [cx + x * R, cy - y * R];

      if (t < FINALE_FLASH) {
        // the Death Star, glowing hotter as cracks spread
        const u = t / FINALE_FLASH;
        g.strokeStyle = C.empire; g.shadowColor = C.empire; g.shadowBlur = 8; g.lineWidth = 1.5;
        g.fillStyle = "rgba(15,18,30,0.9)";
        g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill(); g.stroke();
        g.globalAlpha = 0.5; g.lineWidth = 1; g.beginPath();
        for (let k = -3; k <= 3; k++) { const yy = k / 4, hw = Math.sqrt(1 - yy * yy); g.moveTo(...S(-hw, yy)); g.lineTo(...S(hw, yy)); }
        for (let k = -3; k <= 3; k++) { g.ellipse(cx, cy, Math.abs(k / 4) * R, R, 0, 0, Math.PI * 2); }
        g.stroke(); g.globalAlpha = 1;
        g.beginPath(); g.arc(cx - R * 0.4, cy - R * 0.4, R * 0.2, 0, Math.PI * 2); g.stroke();
        // trench + cracks of light
        g.globalCompositeOperation = "lighter";
        g.strokeStyle = `rgba(255,${Math.round(200 - u * 80)},80,${0.4 + u * 0.6})`; g.shadowColor = "rgb(255,160,60)"; g.shadowBlur = 12 + u * 20; g.lineWidth = 2 + u * 2;
        g.beginPath(); g.moveTo(...S(-1, 0)); g.lineTo(...S(1, 0)); g.stroke();
        g.lineWidth = 1.5 + u; g.beginPath();
        for (const pts of cracks) {
          const n = Math.max(1, Math.floor(u * pts.length));
          pts.slice(0, n).forEach(([x, y], j) => { const p = S(x * Math.sqrt(Math.max(0, 1 - y * y)), y); if (j) g.lineTo(...p); else g.moveTo(...p); });
        }
        g.stroke();
        const gr = g.createRadialGradient(cx, cy, 0, cx, cy, R * (0.3 + u * 0.6));
        gr.addColorStop(0, `rgba(255,220,150,${u * 0.6})`); gr.addColorStop(1, "rgba(255,80,40,0)");
        g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
        g.globalCompositeOperation = "source-over"; g.shadowBlur = 0;
      }
      // plates and chunks breaking off
      g.strokeStyle = C.empire; g.shadowColor = "rgb(255,150,60)"; g.shadowBlur = 6; g.lineWidth = 1.2;
      for (const p of plates) {
        if (t < p.at) continue;
        const d = t - p.at, k = t > FINALE_FLASH ? 3 : 1;
        const x = p.x + p.vx * d * 0.4 * k, y = p.y + p.vy * d * 0.4 * k, a = p.rot + p.vr * d;
        const al = Math.max(0, 1 - d / 3); if (al <= 0) continue;
        g.globalAlpha = al; g.save(); g.translate(...S(x, y)); g.rotate(a);
        const z = p.sz * R; g.strokeRect(-z, -z * 0.6, z * 2, z * 1.2); g.restore();
      }
      g.globalAlpha = 1; g.shadowBlur = 0;

      if (t >= FINALE_FLASH && !flashed) {
        flashed = true;
        explode(parts, cx, cy, "rgb(200,205,215)", "huge");
        for (let i = 0; i < 40; i++) explode(parts, cx + (Math.random() - 0.5) * R * 1.6, cy + (Math.random() - 0.5) * R * 1.6, C.empire, "small");
      }
      if (t >= FINALE_FLASH) {
        const d = t - FINALE_FLASH;
        // blinding core flash (counts as one full-screen flash)
        if (d < 0.5 && (d > 0.02 || allowFlash())) { g.fillStyle = `rgba(255,252,240,${(reduced ? 0.4 : 1) * (1 - d / 0.5)})`; g.fillRect(0, 0, w, h); }
        // flat expanding shock ring
        const rr = R * (0.5 + d * 3.2), al = Math.max(0, 1 - d / 2.2);
        g.globalCompositeOperation = "lighter";
        g.strokeStyle = `rgba(160,230,255,${al})`; g.shadowColor = C.holo; g.shadowBlur = 18; g.lineWidth = 3;
        g.beginPath(); g.ellipse(cx, cy, rr, rr * 0.14, -0.15, 0, Math.PI * 2); g.stroke();
        g.lineWidth = 1; g.beginPath(); g.ellipse(cx, cy, rr * 0.8, rr * 0.11, -0.15, 0, Math.PI * 2); g.stroke();
        // afterglow
        const ag = Math.max(0, 1 - d / 2.6);
        const gr = g.createRadialGradient(cx, cy, 0, cx, cy, R * 1.4);
        gr.addColorStop(0, `rgba(255,200,120,${ag * 0.7})`); gr.addColorStop(1, "rgba(255,80,40,0)");
        g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R * 1.4, 0, Math.PI * 2); g.fill();
        g.globalCompositeOperation = "source-over"; g.shadowBlur = 0;
      }
      drawFx(g, parts, dt);
      // surviving Rebel ships fly past the camera with glowing engines
      if (t > 2.4) {
        ships.slice(0, 12).forEach((u, i) => {
          const d = (t - 2.4 - i * 0.08) / 1.4; if (d < 0 || d > 1) return;
          const z = 4 * (1 - d) + 0.25;
          const ox = (i - (Math.min(ships.length, 12) - 1) / 2) * 0.35, oy = -0.25 + (i % 2) * 0.15;
          const x = w / 2 + (ox / z) * R * 1.2, y = h / 2 - (oy / z) * R * 1.2 + h * 0.15;
          const sz = (R * 0.18) / z;
          g.globalAlpha = Math.min(1, d * 4);
          const eg = g.createRadialGradient(x, y + sz * 0.2, 0, x, y + sz * 0.2, sz * 0.7);
          eg.addColorStop(0, "rgba(255,140,120,0.9)"); eg.addColorStop(1, "rgba(255,80,60,0)");
          g.globalCompositeOperation = "lighter"; g.fillStyle = eg; g.beginPath(); g.arc(x, y + sz * 0.2, sz * 0.7, 0, Math.PI * 2); g.fill();
          g.globalCompositeOperation = "source-over";
          g.strokeStyle = C.rebel; g.shadowColor = C.rebel; g.shadowBlur = 10; g.lineWidth = Math.min(3, 1 + 1 / z);
          drawGlyph(g, u, x, y, sz);
        });
        g.globalAlpha = 1; g.shadowBlur = 0;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <canvas ref={cv} className="absolute inset-0 h-full w-full" />;
}
