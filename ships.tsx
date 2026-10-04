// Hand-drawn Star Wars-style silhouettes. Colors come from currentColor.
import { useId } from "react";
type P = { className?: string };

export function XWing({ className }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="currentColor">
      {/* wings in open X */}
      <path d="M27 36 5 22l-1 4 23 14z" />
      <path d="M37 36l22-14 1 4-23 14z" />
      <path d="M27 42 5 54l-1-3 23-13z" opacity=".8" />
      <path d="M37 42l22 12 1-3-23-13z" opacity=".8" />
      {/* wingtip cannons */}
      <rect x="2" y="12" width="2" height="16" /><rect x="60" y="12" width="2" height="16" />
      <rect x="2" y="48" width="2" height="10" opacity=".8" /><rect x="60" y="48" width="2" height="10" opacity=".8" />
      {/* fuselage with pointed nose */}
      <path d="M32 2l3 12 2 34h-10l2-34z" />
      <path d="M30 22h4l1 8h-6z" className="fill-background" opacity=".7" />
      {/* engines */}
      <rect x="25" y="44" width="5" height="12" rx="2" /><rect x="34" y="44" width="5" height="12" rx="2" />
      <circle cx="27.5" cy="58" r="2" fill="var(--saber-blue)" />
      <circle cx="36.5" cy="58" r="2" fill="var(--saber-blue)" />
    </svg>
  );
}

export function YWing({ className }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="currentColor">
      {/* cockpit */}
      <path d="M26 6q6-5 12 0l2 14H24z" />
      <path d="M28 8h8l1 6H27z" className="fill-background" opacity=".7" />
      <rect x="29" y="20" width="6" height="18" />
      {/* cross bar */}
      <rect x="12" y="24" width="40" height="5" />
      {/* engine pods */}
      <rect x="10" y="20" width="8" height="38" rx="3" />
      <rect x="46" y="20" width="8" height="38" rx="3" />
      <path d="M11 32h6M11 37h6M11 42h6M47 32h6M47 37h6M47 42h6" className="stroke-background" strokeWidth="1.2" opacity=".6" />
      <rect x="11" y="56" width="6" height="4" rx="1" fill="var(--saber-blue)" />
      <rect x="47" y="56" width="6" height="4" rx="1" fill="var(--saber-blue)" />
    </svg>
  );
}

export function TieFighter({ className }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="currentColor">
      {/* hex wing panels */}
      <path d="M3 32 8 6h3v52H8z" />
      <path d="M61 32 56 6h-3v52h3z" />
      <path d="M8 10v44M56 10v44M5 32h6M53 32h6" className="stroke-background" strokeWidth="1" opacity=".5" />
      {/* struts */}
      <path d="M11 29h12v6H11zM41 29h12v6H41z" />
      {/* ball cockpit with spoked window */}
      <circle cx="32" cy="32" r="11" />
      <circle cx="32" cy="32" r="6" className="fill-background" />
      <path d="M32 26v12M26 32h12M28 28l8 8M36 28l-8 8" stroke="currentColor" strokeWidth="1" opacity=".8" />
    </svg>
  );
}

export function SuperTie({ className }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="currentColor">
      {/* bent wing panels */}
      <path d="M2 6l12 10v32L2 58l4-26z" />
      <path d="M62 6 50 16v32l12 10-4-26z" />
      <path d="M8 14l3 18-3 18M56 14l-3 18 3 18" className="stroke-background" strokeWidth="1" opacity=".5" fill="none" />
      <path d="M14 29h36v6H14z" />
      {/* elongated cockpit */}
      <path d="M32 14c8 0 11 8 11 16l-4 16H25l-4-16c0-8 3-16 11-16z" />
      <circle cx="32" cy="27" r="5" className="fill-background" />
      <circle cx="32" cy="27" r="2" fill="var(--saber-red)" />
      <rect x="27" y="46" width="10" height="3" fill="var(--saber-red)" />
    </svg>
  );
}

export function Cannon({ className }: P) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="currentColor">
      <rect x="8" y="48" width="48" height="10" />
      <path d="M16 48a16 16 0 0 1 32 0z" />
      <path d="M30 34l24-22 3 3-22 24z" />
      <path d="M26 34 46 10l3 2-18 26z" opacity=".7" />
    </svg>
  );
}

export function DeathStar({ className }: P) {
  const id = useId().replace(/:/g, "");
  const lat = [18, 30, 40, 60, 70, 82];
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <defs>
        <radialGradient id={`ds-b${id}`} cx="35%" cy="32%" r="75%">
          <stop offset="0" stopColor="var(--color-empire)" />
          <stop offset=".6" stopColor="color-mix(in oklch, var(--color-empire) 70%, var(--color-background))" />
          <stop offset="1" stopColor="var(--color-background)" />
        </radialGradient>
        <radialGradient id={`ds-d${id}`} cx="40%" cy="40%" r="60%">
          <stop offset="0" stopColor="color-mix(in oklch, var(--color-empire) 60%, var(--color-background))" />
          <stop offset="1" stopColor="var(--color-background)" />
        </radialGradient>
        <clipPath id={`ds-c${id}`}><circle cx="50" cy="50" r="46" /></clipPath>
      </defs>
      <circle cx="50" cy="50" r="46" fill={`url(#ds-b${id})`} />
      <g clipPath={`url(#ds-c${id})`} stroke="var(--color-background)" fill="none">
        {lat.map((y) => <path key={y} d={`M0 ${y}h100`} strokeWidth=".4" opacity=".45" />)}
        {[20, 32, 44, 56, 68, 80].map((x) => <ellipse key={x} cx="50" cy="50" rx={Math.abs(50 - x) + 2} ry="46" strokeWidth=".35" opacity=".35" />)}
        {/* surface panels */}
        <path d="M14 36h8v3h-8zM60 34h10v3H60zM70 64h9v3h-9zM24 72h12v3H24zM48 80h8v2h-8zM40 18h7v2h-7zM76 44h8v2h-8zM56 58h6v4h-6z" fill="var(--color-background)" stroke="none" opacity=".35" />
        {/* equatorial trench */}
        <path d="M0 49h100" strokeWidth="3.2" opacity=".9" />
        <path d="M0 51.4h100" stroke="var(--color-empire)" strokeWidth=".5" opacity=".6" />
        {/* city lights */}
        {[[22, 47], [41, 47.5], [63, 47], [79, 47.3], [30, 54], [70, 55], [52, 53.5]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r=".6" fill="var(--color-hit)" stroke="none" opacity=".8" />)}
        {/* terminator shadow */}
        <circle cx="70" cy="66" r="44" fill="var(--color-background)" stroke="none" opacity=".35" />
      </g>
      {/* superlaser dish */}
      <circle cx="34" cy="32" r="12" fill={`url(#ds-d${id})`} />
      <circle cx="34" cy="32" r="12" fill="none" stroke="var(--color-background)" strokeWidth=".8" opacity=".7" />
      <circle cx="34" cy="32" r="8.5" fill="none" stroke="var(--color-empire)" strokeWidth=".4" opacity=".5" />
      <circle cx="34" cy="32" r="5" fill="none" stroke="var(--color-background)" strokeWidth=".5" opacity=".6" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
        const r = (a * Math.PI) / 180;
        return <path key={a} d={`M${34 + Math.cos(r) * 2.5} ${32 + Math.sin(r) * 2.5}L${34 + Math.cos(r) * 11} ${32 + Math.sin(r) * 11}`} stroke="var(--color-background)" strokeWidth=".35" opacity=".5" />;
      })}
      <circle cx="34" cy="32" r="2.4" className="fill-hit" />
      <circle cx="50" cy="50" r="46" fill="none" stroke="var(--color-empire)" strokeWidth=".6" opacity=".5" />
    </svg>
  );
}

export function Vader({ className }: P) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="currentColor">
      <path d="M50 6C28 6 18 22 18 42v14L6 86l20 6 8-14h32l8 14 20-6-12-30V42C82 22 72 6 50 6z" className="fill-secondary" />
      <path d="M50 10c-18 0-27 13-28 30h56C77 23 68 10 50 10z" />
      <path d="M24 44h52l-4 8H28z" />
      <path d="M30 52l12 2-2 10-12-4zM70 52l-12 2 2 10 12-4z" className="fill-empire-red" />
      <path d="M44 62h12l6 18H38z" />
      <path d="M42 70h16M41 75h18" className="stroke-background" strokeWidth="1.5" />
      <path d="M50 54v8" className="stroke-background" strokeWidth="2" />
    </svg>
  );
}

export const SHIPS = { xwing: XWing, ywing: YWing, tie: TieFighter, superTie: SuperTie, cannon: Cannon };
