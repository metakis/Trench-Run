import { useEffect, useRef } from "react";
import { sfx } from "./sfx";

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

type Particle = { x: number; y: number; vx: number; vy: number; a: number; va: number; len: number; life: number; color: string; ring?: boolean };
type Glyph = "xwing" | "ywing" | "tie" | "superTie";

const SEG = 1.6, FAR = 22, SPEED = 9, MAX_SHIPS = 12;

function readColors() {
  const css = getComputedStyle(document.documentElement);
  const col = (n: string) => css.getPropertyValue(n).trim() || "white";
  return { holo: col("--holo"), red: col("--saber-red"), blue: col("--saber-blue"), gold: col("--gold"), hit: col("--hit"), bg: col("--background"), rebel: col("--rebel"), empire: col("--empire") };
}

function burst(list: Particle[], x: number, y: number, n: number, speed: number, color: string, len = 8) {
  for (let i = 0; i < n; i++) {
    const ang = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random());
    list.push({ x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, a: Math.random() * 6, va: (Math.random() - 0.5) * 12, len: len * (0.5 + Math.random()), life: 1, color });
  }
}
/** The one explosion style: flash ring, then line pieces in the ship's color, then gold sparks. */
function shatter(list: Particle[], x: number, y: number, color: string, gold: string, scale = 1) {
  list.push({ x, y, vx: 0, vy: 0, a: 0, va: 0, len: 4, life: 1, color: "rgb(255,250,230)", ring: true });
  burst(list, x, y, Math.round(24 * scale), 160 * scale, color, 10 * scale);
  burst(list, x, y, Math.round(14 * scale), 90 * scale, gold, 6 * scale);
  sfx.explosion();
}
/** The one miss style: small spark where the bolt ends. */
function spark(list: Particle[], x: number, y: number, color: string) { burst(list, x, y, 6, 60, color, 4); }

function drawParticles(g: CanvasRenderingContext2D, list: Particle[], dt: number) {
  for (let i = list.length - 1; i >= 0; i--) {
    const q = list[i]!;
    q.x += q.vx * dt; q.y += q.vy * dt; q.a += q.va * dt; q.life -= dt * (q.ring ? 2.2 : 0.9);
    if (q.life <= 0) { list.splice(i, 1); continue; }
    g.globalAlpha = q.life; g.strokeStyle = q.color; g.shadowColor = q.color; g.shadowBlur = 8; g.lineWidth = 1.5;
    if (q.ring) {
      q.len += dt * 90; g.lineWidth = 3;
      g.beginPath(); g.arc(q.x, q.y, q.len, 0, Math.PI * 2); g.stroke();
      continue;
    }
    const dx = Math.cos(q.a) * q.len, dy = Math.sin(q.a) * q.len;
    g.beginPath(); g.moveTo(q.x - dx / 2, q.y - dy / 2); g.lineTo(q.x + dx / 2, q.y + dy / 2); g.stroke();
  }
  g.globalAlpha = 1; g.shadowBlur = 0;
}

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
    const E = { fireAt: -1, fireKey: "", bombAt: -1, bombKey: "", gateAt: -1, step: props.current.step, rollAt: -1, wasRolling: false,
      boomed: new Set<number>(), gone: new Set<number>(), landed: new Set<number>(), tally: [0, 0], camY: 0, sweep: 0 };
    const parts: Particle[] = [];
    let raf = 0, last = performance.now(), s = 0;
    const t0 = last;

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      const t = (now - t0) / 1000;
      const P = props.current;
      const bombing = P.step === "bomb";
      if (P.fire && P.fire.key !== E.fireKey) { E.fireKey = P.fire.key; E.fireAt = t; E.boomed.clear(); E.gone.clear(); }
      if (!P.fire && E.fireAt >= 0 && t - E.fireAt > 0.1) { E.fireAt = -1; E.gone.clear(); }
      if (P.bomb && P.bomb.key !== E.bombKey) { E.bombKey = P.bomb.key; E.bombAt = t; E.landed.clear(); E.tally = [0, 0]; }
      if (P.step !== E.step) { E.step = P.step; E.gateAt = t; E.sweep = E.sweep > 0 ? -1.4 : 1.4; }
      if (P.rolling && !E.wasRolling) E.rollAt = t;
      E.wasRolling = P.rolling;
      s += dt * SPEED * (bombing && E.bombAt >= 0 ? 0.3 : 1);

      // camera: behind the fleet for cannon rounds, diving low for the bombing run, sweep on each new round
      E.camY += ((bombing ? -0.5 : 0) - E.camY) * Math.min(1, dt * 2);
      const gt = E.gateAt >= 0 ? t - E.gateAt : 99;
      const camX = E.sweep * (1 - ease(gt / 1.6));

      const [w, h] = fitCanvas(c, g);
      const fireT = E.fireAt >= 0 ? t - E.fireAt : 99;
      const shake = fireT < 2.4 && P.fire && P.fire.hits > 0 ? Math.max(0, 2.4 - fireT) * 3 : 0;
      const cx = w / 2 + (Math.random() - 0.5) * shake, cy = h * 0.42 + (Math.random() - 0.5) * shake;
      const f = Math.min(w, h) * 0.9;
      const pr = (x: number, y: number, z: number): [number, number] => [cx + ((x - camX * Math.min(z, 6) / 6) / z) * f, cy - ((y - E.camY) / z) * f];

      g.fillStyle = C.bg; g.fillRect(0, 0, w, h);
      g.fillStyle = "rgba(255,255,255,0.6)";
      for (let i = 0; i < 40; i++) g.fillRect((i * 97) % w, (i * 53) % (h * 0.35), 1, 1);

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

      if (bombing) {
        // exhaust port
        const rollT = E.rollAt >= 0 ? t - E.rollAt : 0;
        const pz = Math.max(2.2, 16 - rollT * 10);
        const [px, py] = pr(0, -1, pz);
        const r = (0.35 / pz) * f;
        g.beginPath(); g.ellipse(px, py, r, r * 0.35, 0, 0, Math.PI * 2);
        g.fillStyle = C.bg; g.fill(); g.lineWidth = 2.5; g.strokeStyle = C.gold; g.shadowColor = C.gold; g.shadowBlur = 16; g.stroke();
        g.beginPath(); g.ellipse(px, py, r * 0.55, r * 0.2, 0, 0, Math.PI * 2); g.stroke(); g.shadowBlur = 0;
        if (P.bomb && E.bombAt >= 0) {
          const bt = t - E.bombAt, n = P.bomb.hits.length;
          const gap = Math.min(0.3, 1.6 / Math.max(n, 1)), FLY = 0.8;
          P.bomb.hits.forEach((hit, i) => {
            const d = bt - i * gap;
            if (d < 0) return;
            const ang = i * 2.4;
            const tx = hit ? px : px + Math.cos(ang) * r * (1.6 + (i % 3) * 0.5);
            const ty = hit ? py : py + Math.sin(ang) * r * 0.6 - r * 0.2;
            if (d < FLY) {
              const u = d / FLY;
              const sx = cx + (i % 2 ? 1 : -1) * w * 0.22, sy = h * 0.98;
              g.beginPath(); g.arc(sx + (tx - sx) * u, sy + (ty - sy) * u, 5 * (1 - u) + 2, 0, Math.PI * 2);
              g.fillStyle = C.blue; g.shadowColor = C.blue; g.shadowBlur = 16; g.fill(); g.shadowBlur = 0;
            } else if (!E.landed.has(i)) {
              E.landed.add(i);
              E.tally[hit ? 0 : 1]! += 1;
              if (hit) shatter(parts, tx, ty, C.gold, "rgb(255,250,220)", 1.1);
              else { spark(parts, tx, ty, C.red); burst(parts, tx, ty, 8, 90, "rgb(255,150,60)", 6); sfx.miss(); }
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
        g.lineWidth = 1.5; g.strokeStyle = C.red; g.shadowColor = C.red; g.shadowBlur = 8;
        for (let i = 0; i < n; i++) {
          const z = (((i * 2.3 + 6 - s * 0.35) % 16) + 16) % 16 + 3;
          const sx = i % 2 ? 1 : -1;
          const x0 = sx, x1 = sx * 0.7, y0 = 0.1, y1 = 0.5;
          const q = [pr(x0, y0, z), pr(x1, y0, z), pr(x1, y1, z), pr(x0, y1, z)];
          g.beginPath(); q.forEach(([x, y], j) => (j ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.stroke();
          const [bx, by] = pr(x1, (y0 + y1) / 2, z);
          g.beginPath(); g.moveTo(bx, by); g.lineTo(...pr(x1 - sx * 0.25, (y0 + y1) / 2, z)); g.stroke();
          towers.push([bx, by]);
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
              if (target !== undefined && !E.gone.has(target)) { E.gone.add(target); shatter(parts, tx, ty, C.rebel, C.gold); }
              else spark(parts, tx, ty, C.red);
            }
          }
          if (P.fire.hits > 0 && fireT > 0.4 && fireT < 1.4) {
            g.shadowBlur = 0; g.fillStyle = `rgba(255,60,40,${0.2 * (1 - (fireT - 0.4))})`; g.fillRect(0, 0, w, h);
          }
        }
      }

      // gate fly-through on a new round
      if (gt < 1.3) {
        const z = Math.max(0.36, 6 - gt * 5);
        g.lineWidth = 3; g.strokeStyle = C.gold; g.shadowColor = C.gold; g.shadowBlur = 14;
        const q = [pr(-1.1, 1.1, z), pr(1.1, 1.1, z), pr(1.1, -1.1, z), pr(-1.1, -1.1, z)];
        g.beginPath(); q.forEach(([x, y], j) => (j ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.stroke();
      }
      g.shadowBlur = 0;
      drawParticles(g, parts, dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
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
export function SpaceDogfight({ dice }: { dice: DogfightDie[] }) {
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = cv.current!;
    const g = c.getContext("2d")!;
    const C = readColors();
    const reb = dice.filter((d) => d.side === "rebel").slice(0, 12);
    const emp = dice.filter((d) => d.side === "empire").slice(0, 12);
    const parts: Particle[] = [];
    const struck = { rebel: new Map<number, number>(), empire: new Map<number, number>() };
    const landed = new Set<string>();
    const gone = new Set<string>();
    let raf = 0, last = performance.now();
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
      // wide shot that slowly orbits
      const camX = Math.sin(t * 0.4) * 0.25, cx = w / 2, cy = h * 0.5, f = Math.min(w, h) * 1.1;
      const pr = (x: number, y: number, z: number): [number, number] => [cx + ((x - camX) / z) * f, cy - (y / z) * f];
      g.fillStyle = C.bg; g.fillRect(0, 0, w, h);
      g.fillStyle = "rgba(255,255,255,0.6)";
      for (let i = 0; i < 60; i++) g.fillRect(((i * 97 - t * 20 * (1 + (i % 3))) % w + w) % w, (i * 53) % h, 1, 1);
      // faint depth grid
      g.strokeStyle = C.holo; g.globalAlpha = 0.15; g.lineWidth = 1; g.beginPath();
      for (let z = 2; z < 9; z += 1) { const [a, b] = pr(-4, -1.2, z), [c2, d] = pr(4, -1.2, z); g.moveTo(a, b); g.lineTo(c2, d); }
      for (let x = -4; x <= 4; x++) { const [a, b] = pr(x, -1.2, 2), [c2, d] = pr(x, -1.2, 9); g.moveTo(a, b); g.lineTo(c2, d); }
      g.stroke(); g.globalAlpha = 1;

      const screen = (side: "rebel" | "empire", i: number) => {
        const list = side === "rebel" ? reb : emp;
        const [x, y, z] = pos(side, i, list.length, t);
        const [sx, sy] = pr(x, y, z);
        return [sx, sy, f / z] as const;
      };
      // ships
      for (const side of ["rebel", "empire"] as const) {
        const list = side === "rebel" ? reb : emp;
        list.forEach((d, i) => {
          const key = `${side}${i}`;
          const hitAt = struck[side].get(i);
          if (hitAt !== undefined && t > 3.0 && !gone.has(key)) {
            gone.add(key); const [sx, sy] = screen(side, i);
            burst(parts, sx, sy, 16, 120, side === "rebel" ? C.rebel : C.empire, 8);
          }
          if (gone.has(key)) return;
          const [sx, sy, k] = screen(side, i);
          const flick = hitAt !== undefined && Math.floor(t * 12) % 2 === 0;
          const col = flick ? C.red : side === "rebel" ? C.rebel : C.empire;
          g.strokeStyle = col; g.shadowColor = col; g.shadowBlur = 8; g.lineWidth = 1.5;
          drawGlyph(g, d.kind, sx, sy, k * 0.08);
          g.shadowBlur = 0; g.font = "bold 10px ui-monospace, monospace"; g.textAlign = "center";
          g.fillStyle = d.hit ? C.hit : "rgba(160,160,170,0.8)";
          g.fillText(String(d.value), sx, sy + k * 0.08 + 12);
        });
      }
      // bolts: Rebellion fires first (blue), then the Empire returns fire (red) — simultaneous, so struck ships still shoot
      const volley = (from: DogfightDie[], side: "rebel" | "empire", start: number) => {
        const other = side === "rebel" ? "empire" : "rebel";
        const toN = (side === "rebel" ? emp : reb).length;
        let k = 0;
        from.forEach((d, i) => {
          const target = d.hit && toN ? (k++) % toN : -1;
          const t1 = start + i * 0.14, FLY = 0.55, dd = t - t1;
          if (dd < 0 || dd > FLY + 0.1) return;
          const [ax, ay] = screen(side, i);
          const [bx, by] = target >= 0 ? screen(other, target) : [side === "rebel" ? w * 1.05 : -w * 0.05, i % 2 ? -10 : h + 10];
          const u = Math.min(dd / FLY, 1), u0 = Math.max(0, u - 0.3);
          const col = side === "rebel" ? C.blue : C.red;
          if (dd <= FLY) {
            g.lineWidth = d.hit ? 3 : 1.5; g.strokeStyle = col; g.shadowColor = col; g.shadowBlur = 12; g.globalAlpha = d.hit ? 1 : 0.6;
            g.beginPath(); g.moveTo(ax + (bx - ax) * u0, ay + (by - ay) * u0); g.lineTo(ax + (bx - ax) * u, ay + (by - ay) * u); g.stroke();
            g.globalAlpha = 1; g.shadowBlur = 0;
          } else if (!landed.has(`${side}${i}`)) {
            landed.add(`${side}${i}`);
            if (target >= 0) {
              if (!struck[other].has(target)) struck[other].set(target, t);
              shatter(parts, bx, by, other === "rebel" ? C.rebel : C.empire, C.gold, 0.8);
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
  }, [dice]);
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
    let raf = 0;
    const loop = (now: number) => {
      const t = (now - t0) / 1000;
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
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [torpedoes]);
  return <canvas ref={cv} className="absolute inset-0 h-full w-full rounded-lg" />;
}
