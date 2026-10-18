import { useEffect, useRef, useState } from "react";
import { ShipIcon } from "./ui";
import { FxBurst } from "./TrenchPOV";

type Unit = "xwing" | "ywing" | "tie" | "superTie" | "cannon";
export type ShipState = "ok" | "damaged" | "dead";

/** Tracks which slot indices just changed state so they can animate once. */
function useChanged(states: ShipState[]) {
  const prev = useRef(states);
  const [changed, setChanged] = useState<Set<number>>(new Set());
  const key = states.join(",");
  useEffect(() => {
    const c = new Set<number>();
    states.forEach((s, i) => { if (prev.current[i] && prev.current[i] !== s) c.add(i); });
    prev.current = states;
    if (c.size === 0) return;
    setChanged(c);
    const t = setTimeout(() => setChanged(new Set()), 1100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return changed;
}

function ShipSlot({ unit, state, fresh, color, size }: { unit: Unit; state: ShipState; fresh: boolean; color: string; size: string }) {
  const tone = state === "damaged" ? "text-warn animate-flicker" : color;
  return (
    <div className={`relative ${size}`} title={state}>
      <ShipIcon unit={unit} className={`${size} ${tone} ${state === "dead" ? "opacity-25" : ""} ${fresh ? "animate-shipflash" : ""}`} />
      {unit === "superTie" && state !== "dead" && (
        <div className="absolute -bottom-1 left-1/2 flex -translate-x-1/2 gap-0.5">
          <span className="h-1.5 w-1.5 rounded-full bg-hit" />
          <span className={`h-1.5 w-1.5 rounded-full ${state === "ok" ? "bg-hit" : "bg-muted"}`} />
        </div>
      )}
      {state === "damaged" && <span className="absolute -right-1 -top-1 text-xs text-warn">✦</span>}
      {state === "dead" && (
        <svg viewBox="0 0 10 10" className={`absolute inset-0 ${size} ${fresh ? "animate-xin" : ""}`}>
          <path d="M1 1 9 9M9 1 1 9" className="stroke-empire-red" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      )}
      {fresh && state === "dead" && <FxBurst size={unit === "superTie" ? "medium" : "small"} color={color.includes("rebel") ? "rgb(110,160,255)" : "rgb(190,195,210)"} className="-inset-6 h-[calc(100%+3rem)] w-[calc(100%+3rem)]" />}
      {fresh && state === "damaged" && <div className="pointer-events-none absolute inset-0 animate-burst rounded-full bg-warn" />}
      {unit === "superTie" && state === "damaged" && <FxBurst mode="smoke" className="-inset-3 h-[calc(100%+1.5rem)] w-[calc(100%+1.5rem)]" />}
    </div>
  );
}

export function ShipRow({ unit, label, states, color, size: base = "h-9 w-9", from }: {
  unit: Unit; label: string; states: ShipState[]; color: string; size?: string; from?: "left" | "right";
}) {
  const size = states.length > 16 ? "h-4 w-4" : states.length > 12 ? "h-5 w-5" : states.length > 8 ? "h-6 w-6" : base;
  const changed = useChanged(states);
  if (states.length === 0) return null;
  const alive = states.filter((s) => s !== "dead").length;
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 shrink-0">
        <div className="text-xs uppercase tracking-wider">{label}</div>
        <div className="font-mono text-[10px] text-muted-foreground">{alive} left</div>
      </div>
      <div className={`flex min-w-0 flex-1 flex-wrap ${states.length > 8 ? "gap-1" : "gap-2"}`}>
        {states.map((s, i) => (
          <div key={i} className={from ? (from === "left" ? "animate-flyleft" : "animate-flyright") : ""} style={from ? { animationDelay: `${i * 70}ms` } : undefined}>
            <ShipSlot unit={unit} state={s} fresh={changed.has(i)} color={color} size={size} />
          </div>
        ))}
      </div>
    </div>
  );
}

export const simpleStates = (start: number, now: number): ShipState[] =>
  Array.from({ length: start }, (_, i) => (i < now ? "ok" : "dead"));

export const superStates = (start: number, healthy: number, damaged: number): ShipState[] =>
  Array.from({ length: start }, (_, i) => (i < healthy ? "ok" : i < healthy + damaged ? "damaged" : "dead"));
