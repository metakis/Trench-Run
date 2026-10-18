/**
 * One explosion style shared by every canvas scene (dogfight, trench, shaft, finale, fleet rows).
 * White flash → fireball that grows and cools (white→yellow→orange→red, additive glow),
 * 3–5 tumbling line debris in the ship's colour, sparks that slow down, a thin shock ring, a smoke puff.
 */
export type FxKind = "flash" | "fire" | "debris" | "spark" | "ring" | "smoke";
export type Fx = { k: FxKind; x: number; y: number; vx: number; vy: number; a: number; va: number; r: number; gr: number; life: number; decay: number; color: string };
export type FxSize = "small" | "medium" | "huge";

export const MAX_FX = 600;
const SCALE: Record<FxSize, number> = { small: 1, medium: 1.7, huge: 6 };

export const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Never flash the screen more than 3 times per second (fewer with reduced motion).
const flashTimes: number[] = [];
export function allowFlash() {
  const now = performance.now();
  while (flashTimes.length && now - flashTimes[0]! > 1000) flashTimes.shift();
  if (flashTimes.length >= (reducedMotion() ? 1 : 3)) return false;
  flashTimes.push(now);
  return true;
}

function push(list: Fx[], p: Fx) { if (list.length < MAX_FX) list.push(p); }
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export function explode(list: Fx[], x: number, y: number, color: string, size: FxSize = "small") {
  const s = SCALE[size], reduced = reducedMotion();
  if (!reduced || size === "huge") { if (allowFlash()) push(list, { k: "flash", x, y, vx: 0, vy: 0, a: 0, va: 0, r: 10 * s, gr: 40 * s, life: 1, decay: 6, color: "white" }); }
  const fires = size === "huge" ? 14 : size === "medium" ? 6 : 4;
  for (let i = 0; i < fires; i++) {
    const ang = rnd(0, Math.PI * 2), v = rnd(0, 18 * s);
    push(list, { k: "fire", x: x + Math.cos(ang) * 3 * s, y: y + Math.sin(ang) * 3 * s, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, a: 0, va: 0, r: rnd(4, 7) * s, gr: rnd(14, 22) * s, life: 1, decay: rnd(1.1, 1.6), color: "" });
  }
  const debris = 3 + Math.floor(Math.random() * 3) + (size === "huge" ? 8 : 0);
  for (let i = 0; i < debris; i++) {
    const ang = rnd(0, Math.PI * 2), v = rnd(40, 110) * Math.sqrt(s);
    push(list, { k: "debris", x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, a: rnd(0, 6), va: rnd(-10, 10), r: rnd(4, 9) * Math.sqrt(s), gr: 0, life: 1, decay: rnd(0.6, 0.9), color });
  }
  const sparks = Math.round((reduced ? 6 : 12) * Math.sqrt(s) * (size === "huge" ? 3 : 1));
  for (let i = 0; i < sparks; i++) {
    const ang = rnd(0, Math.PI * 2), v = rnd(80, 220) * Math.sqrt(s);
    push(list, { k: "spark", x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, a: 0, va: 0, r: 1.4, gr: 0, life: 1, decay: rnd(1, 1.8), color: "rgb(255,215,120)" });
  }
  push(list, { k: "ring", x, y, vx: 0, vy: 0, a: 0, va: 0, r: 4 * s, gr: 90 * s, life: 1, decay: 1.8, color: "rgb(255,240,210)" });
  for (let i = 0; i < (size === "huge" ? 8 : 2); i++) puff(list, x + rnd(-4, 4) * s, y + rnd(-4, 4) * s, s);
}

export function puff(list: Fx[], x: number, y: number, s = 1, alpha = 1) {
  push(list, { k: "smoke", x, y, vx: rnd(-8, 8), vy: rnd(-14, -4), a: alpha, va: 0, r: rnd(4, 7) * s, gr: rnd(8, 14) * s, life: 1, decay: rnd(0.7, 1.1), color: "" });
}

/** Miss / impact: a few sparks that slow down. */
export function sparkle(list: Fx[], x: number, y: number, color: string, n = 6) {
  for (let i = 0; i < n; i++) {
    const ang = rnd(0, Math.PI * 2), v = rnd(30, 90);
    push(list, { k: "spark", x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, a: 0, va: 0, r: 1.2, gr: 0, life: 1, decay: rnd(1.5, 2.5), color });
  }
}

function fireColor(u: number, a: number) {
  // u: 1 = fresh (white) → 0 = cooled (red)
  if (u > 0.8) return `rgba(255,255,235,${a})`;
  if (u > 0.55) return `rgba(255,225,110,${a})`;
  if (u > 0.3) return `rgba(255,140,40,${a})`;
  return `rgba(210,50,30,${a})`;
}

export function drawFx(g: CanvasRenderingContext2D, list: Fx[], dt: number) {
  const prevOp = g.globalCompositeOperation;
  g.shadowBlur = 0;
  // smoke first (normal blending), then glowing parts additively
  for (let i = list.length - 1; i >= 0; i--) {
    const q = list[i]!;
    q.life -= dt * q.decay;
    if (q.life <= 0) { list.splice(i, 1); continue; }
    if (q.k === "smoke") {
      q.x += q.vx * dt; q.y += q.vy * dt; q.r += q.gr * dt;
      g.globalAlpha = q.life * 0.35 * q.a; g.fillStyle = "rgb(120,120,130)";
      g.beginPath(); g.arc(q.x, q.y, q.r, 0, Math.PI * 2); g.fill();
    }
  }
  g.globalCompositeOperation = "lighter";
  for (const q of list) {
    if (q.k === "smoke") continue;
    const drag = q.k === "spark" ? Math.pow(0.04, dt) : q.k === "debris" ? Math.pow(0.4, dt) : Math.pow(0.2, dt);
    q.vx *= drag; q.vy *= drag;
    q.x += q.vx * dt; q.y += q.vy * dt; q.a += q.va * dt;
    const L = q.life;
    if (q.k === "flash") {
      q.r += q.gr * dt * 4;
      const gr = g.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.r);
      gr.addColorStop(0, `rgba(255,255,255,${L})`); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.globalAlpha = 1; g.fillStyle = gr; g.beginPath(); g.arc(q.x, q.y, q.r, 0, Math.PI * 2); g.fill();
    } else if (q.k === "fire") {
      q.r += q.gr * dt * L;
      const gr = g.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.r);
      gr.addColorStop(0, fireColor(L, 0.9 * L)); gr.addColorStop(0.5, fireColor(L - 0.2, 0.5 * L)); gr.addColorStop(1, fireColor(0, 0));
      g.globalAlpha = 1; g.fillStyle = gr; g.beginPath(); g.arc(q.x, q.y, q.r, 0, Math.PI * 2); g.fill();
    } else if (q.k === "ring") {
      q.r += q.gr * dt;
      g.globalAlpha = L * 0.7; g.strokeStyle = q.color; g.lineWidth = 1;
      g.beginPath(); g.arc(q.x, q.y, q.r, 0, Math.PI * 2); g.stroke();
    } else if (q.k === "debris") {
      const dx = Math.cos(q.a) * q.r, dy = Math.sin(q.a) * q.r;
      g.globalAlpha = Math.min(1, L * 1.5); g.strokeStyle = q.color; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(q.x - dx / 2, q.y - dy / 2); g.lineTo(q.x + dx / 2, q.y + dy / 2); g.stroke();
    } else {
      g.globalAlpha = L; g.strokeStyle = q.color; g.lineWidth = q.r;
      g.beginPath(); g.moveTo(q.x, q.y); g.lineTo(q.x - q.vx * 0.03, q.y - q.vy * 0.03); g.stroke();
    }
  }
  g.globalCompositeOperation = prevOp; g.globalAlpha = 1;
}
