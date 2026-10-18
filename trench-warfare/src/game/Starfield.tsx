import { useEffect, useRef } from "react";
import { reducedMotion } from "./fx";

/** Fire `window.dispatchEvent(new Event("hyperspace"))` to stretch the stars into streaks and snap back. */
export const jumpToHyperspace = () => window.dispatchEvent(new Event("hyperspace"));

type Star = { x: number; y: number; layer: number; tw: number; r: number };

/** Light living starfield behind every screen: 3 drifting layers, twinkle, nebula glow, occasional shooting star. ~250 stars, 30 fps, paused when hidden. */
export function Starfield() {
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = cv.current!;
    const g = c.getContext("2d")!;
    const reduced = reducedMotion();
    const stars: Star[] = Array.from({ length: 250 }, (_, i) => ({ x: Math.random(), y: Math.random(), layer: i % 3, tw: Math.random() * 6, r: 0.5 + (i % 3) * 0.45 }));
    const SPEED = [0.004, 0.009, 0.018];
    let raf = 0, last = performance.now(), acc = 0, hyperAt = -10, shoot: { x: number; y: number; vx: number; vy: number; life: number } | null = null;
    let nebula: HTMLCanvasElement | null = null;
    const onHyper = () => { hyperAt = performance.now() / 1000; };
    window.addEventListener("hyperspace", onHyper);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      c.width = Math.round(window.innerWidth * dpr); c.height = Math.round(window.innerHeight * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      // pre-render the nebula once per size
      const w = window.innerWidth, h = window.innerHeight;
      nebula = document.createElement("canvas"); nebula.width = w; nebula.height = h;
      const n = nebula.getContext("2d")!;
      const blob = (x: number, y: number, r: number, col: string) => { const gr = n.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, "rgba(0,0,0,0)"); n.fillStyle = gr; n.fillRect(0, 0, w, h); };
      blob(w * 0.2, h * 0.15, Math.max(w, h) * 0.45, "rgba(110,70,190,0.16)");
      blob(w * 0.85, h * 0.7, Math.max(w, h) * 0.4, "rgba(190,70,60,0.10)");
      blob(w * 1.1, h * 1.15, Math.max(w, h) * 0.3, "rgba(230,190,90,0.10)");
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) { last = now; return; }
      acc += now - last; last = now;
      if (acc < 1000 / 30) return;
      const dt = Math.min(acc / 1000, 0.1); acc = 0;
      const t = now / 1000, w = window.innerWidth, h = window.innerHeight, cx = w / 2, cy = h / 2;
      g.clearRect(0, 0, w, h);
      if (nebula) g.drawImage(nebula, 0, 0);
      // hyperspace: stretch out for 0.8s, hold, snap back by 1.6s
      const ht = t - hyperAt;
      const stretch = reduced ? 0 : ht < 0.8 ? ht / 0.8 : ht < 1.4 ? 1 : ht < 1.6 ? 1 - (ht - 1.4) / 0.2 : 0;
      for (const s of stars) {
        if (!reduced) s.x -= SPEED[s.layer]! * dt;
        if (s.x < 0) s.x += 1;
        const x = s.x * w, y = s.y * h;
        const a = reduced ? 0.7 : 0.45 + 0.4 * Math.sin(t * (1 + s.layer) + s.tw);
        g.globalAlpha = Math.max(0.1, a);
        if (stretch > 0) {
          const dx = x - cx, dy = y - cy, k = stretch * (0.4 + s.layer * 0.3);
          g.strokeStyle = s.layer === 2 ? "rgb(170,230,255)" : "white"; g.lineWidth = s.r;
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx * k, y + dy * k); g.stroke();
        } else {
          g.fillStyle = s.layer === 2 && s.tw > 5 ? "rgb(170,230,255)" : "white";
          g.fillRect(x, y, s.r * 1.4, s.r * 1.4);
        }
      }
      // occasional shooting star
      if (!reduced && !shoot && Math.random() < dt * 0.08) shoot = { x: Math.random() * w, y: Math.random() * h * 0.5, vx: -(300 + Math.random() * 300), vy: 120 + Math.random() * 120, life: 1 };
      if (shoot) {
        shoot.x += shoot.vx * dt; shoot.y += shoot.vy * dt; shoot.life -= dt * 1.2;
        g.globalAlpha = Math.max(0, shoot.life); g.strokeStyle = "white"; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(shoot.x, shoot.y); g.lineTo(shoot.x - shoot.vx * 0.08, shoot.y - shoot.vy * 0.08); g.stroke();
        if (shoot.life <= 0) shoot = null;
      }
      g.globalAlpha = 1;
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); window.removeEventListener("hyperspace", onHyper); };
  }, []);
  return <canvas ref={cv} aria-hidden className="pointer-events-none fixed inset-0 -z-10 h-full w-full" />;
}
