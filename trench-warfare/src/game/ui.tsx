import { useEffect, useState, type ReactNode, type MouseEvent } from "react";
import type { Die } from "./logic";
import { SHIPS } from "./ships";
import { sfx } from "./sfx";

export function Panel({ title, tone, children, className = "" }: { title: string; tone?: "rebel" | "empire"; children: ReactNode; className?: string }) {
  const color = tone === "rebel" ? "text-rebel" : tone === "empire" ? "text-empire" : "text-holo";
  return (
    <section className={`holo-panel rounded-lg p-4 ${className}`}
      style={tone ? { ["--console-line" as string]: tone === "rebel" ? "var(--saber-blue)" : "var(--saber-red)" } : undefined}>
      <h3 className={`mb-3 flex items-center justify-between font-mono text-xs uppercase tracking-[0.3em] ${color}`}>
        <span>{title}</span>{tone && <span className="text-[9px] tracking-widest opacity-50">{tone === "empire" ? "IMP-SEC 7" : "RED SQ · TGT-LOCK"}</span>}
      </h3>
      {children}
    </section>
  );
}

export function Btn({ children, onClick, disabled, variant = "primary" }: {
  children: ReactNode; onClick: () => void; disabled?: boolean; variant?: "primary" | "ghost";
}) {
  const cls = variant === "primary"
    ? "saber-btn bg-primary text-primary-foreground"
    : "saber-btn bg-secondary text-foreground hover:bg-accent";
  return (
    <button onClick={onClick} disabled={disabled} onMouseEnter={() => { if (!disabled) sfx.hover(); }}
      className={`px-7 py-2.5 font-display text-sm uppercase tracking-[0.25em] transition disabled:cursor-not-allowed disabled:opacity-40 ${cls}`}>
      {children}
    </button>
  );
}

export function Stepper({ value, onInc, onDec, canInc, canDec, onBlocked }: {
  value: number; onInc: (e: MouseEvent<HTMLButtonElement>) => void; onDec: () => void; canInc: boolean; canDec: boolean;
  onBlocked?: () => void;
}) {
  const [shake, setShake] = useState(0);
  const soft = !!onBlocked;
  return (
    <div className="flex items-center gap-2">
      <button aria-label="decrease" onClick={onDec} disabled={!canDec}
        className="h-8 w-8 rounded border border-border font-mono text-lg disabled:opacity-30 hover:bg-accent">−</button>
      <span className="w-8 text-center font-mono text-xl">{value}</span>
      <button key={shake} aria-label="increase" aria-disabled={!canInc}
        disabled={!canInc && !soft}
        onClick={(e) => { if (canInc) onInc(e); else { setShake((n) => n + 1); onBlocked?.(); } }}
        className={`h-8 w-8 rounded border border-border font-mono text-lg disabled:opacity-30 aria-disabled:opacity-30 hover:bg-accent ${shake ? "shake-x" : ""}`}>+</button>
    </div>
  );
}

export function ShipIcon({ unit, className }: { unit: keyof typeof SHIPS; className?: string }) {
  const S = SHIPS[unit];
  return <S className={`ship-glow ${className ?? "h-8 w-8"}`} />;
}

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]], 2: [[28, 28], [72, 72]], 3: [[25, 25], [50, 50], [75, 75]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]], 5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[28, 22], [72, 22], [28, 50], [72, 50], [28, 78], [72, 78]],
};

function DieFace({ value, hit, rolling, side, size }: { value: number; hit: boolean; rolling: boolean; side: "rebel" | "empire"; size: string }) {
  const border = rolling ? "border-border" : hit ? "border-hit shadow-[0_0_18px_var(--hit)] scale-110 animate-pop" : "border-border opacity-30 scale-90";
  const pip = side === "rebel" ? "fill-rebel" : "fill-empire-red";
  return (
    <svg viewBox="0 0 100 100" className={`${size} rounded-md border-2 bg-secondary transition-all ${border} ${rolling ? "animate-tumble" : ""}`}>
      {(PIPS[value] ?? []).map(([x, y], i) => <circle key={i} cx={x} cy={y} r="9" className={pip} />)}
    </svg>
  );
}

export function DiceTray({ dice, rolling }: { dice: Die[]; rolling: boolean }) {
  const [faces, setFaces] = useState<number[]>([]);
  useEffect(() => {
    if (!rolling) return;
    const t = setInterval(() => setFaces(dice.map(() => 1 + Math.floor(Math.random() * 6))), 90);
    return () => clearInterval(t);
  }, [rolling, dice]);
  if (dice.length === 0) return null;
  const n = dice.length;
  const size = n <= 6 ? "h-11 w-11" : n <= 12 ? "h-8 w-8" : n <= 16 ? "h-6 w-6" : "h-5 w-5";
  const showLabel = n <= 12;
  return (
    <div className={`flex flex-wrap ${n <= 6 ? "gap-3" : "gap-1.5"}`}>
      {dice.map((d, i) => (
        <div key={d.id} className="flex flex-col items-center gap-1">
          <DieFace value={rolling ? faces[i] ?? 1 : d.value} hit={d.hit} rolling={rolling} side={d.side} size={size} />
          {showLabel ? <span className={`font-mono text-[10px] uppercase ${!rolling && d.hit ? "text-hit" : "text-muted-foreground"}`}>
            {d.label}{!rolling && d.hit && <span className="ml-1 rounded bg-hit px-1 font-bold text-background">HIT</span>}
          </span> : !rolling && d.hit ? <span className="rounded bg-hit px-0.5 font-mono text-[8px] font-bold text-background">HIT</span> : null}
        </div>
      ))}
    </div>
  );
}
