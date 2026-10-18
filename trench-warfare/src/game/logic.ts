// Pure game rules for Trench Warfare. No UI here.
export const CREDITS = 20;

export const COSTS = { tie: 2, superTie: 5, cannon: 1, xwing: 2, ywing: 3 } as const;
export type UnitKey = keyof typeof COSTS;

/** Minimum die roll needed to hit. */
export const HIT_ON = {
  xwing: 4,
  ywing: 6,
  tie: 5,
  superTie: 3,
  cannon: 6,
  xwingBomb: 6,
  ywingBomb: 3,
} as const;

export const SUPER_TIE_HP = 2;

export type EmpireBuy = { tie: number; superTie: number; cannon: number };
export type RebelBuy = { xwing: number; ywing: number };

export function spent(buy: Partial<Record<UnitKey, number>>): number {
  return (Object.keys(buy) as UnitKey[]).reduce((s, k) => s + COSTS[k] * (buy[k] ?? 0), 0);
}

export function canAdd(buy: Partial<Record<UnitKey, number>>, unit: UnitKey): boolean {
  return spent(buy) + COSTS[unit] <= CREDITS;
}

export type Rebels = { xwing: number; ywing: number };
export type Imperials = { tie: number; superHealthy: number; superDamaged: number; cannon: number };

export type Side = "rebel" | "empire";
export type Die = { id: string; label: string; unit: string; value: number; hit: boolean; side: Side };

export type Rng = () => number;
export const rollD6 = (rng: Rng = Math.random) => 1 + Math.floor(rng() * 6);

function rollGroup(label: string, unit: string, count: number, target: number, side: Side, rng: Rng): Die[] {
  return Array.from({ length: count }, (_, i) => {
    const value = rollD6(rng);
    return { id: `${unit}-${i}`, label: `${label} ${i + 1}`, unit, value, hit: value >= target, side };
  });
}

export const rebelAttack = (r: Rebels, rng: Rng = Math.random) => [
  ...rollGroup("X-wing", "xwing", r.xwing, HIT_ON.xwing, "rebel", rng),
  ...rollGroup("Y-wing", "ywing", r.ywing, HIT_ON.ywing, "rebel", rng),
];

export const empireAttack = (e: Imperials, rng: Rng = Math.random) => [
  ...rollGroup("TIE", "tie", e.tie, HIT_ON.tie, "empire", rng),
  ...rollGroup("Super TIE", "superTie", e.superHealthy + e.superDamaged, HIT_ON.superTie, "empire", rng),
];

export const cannonFire = (e: Imperials, rng: Rng = Math.random) =>
  rollGroup("Cannon", "cannon", e.cannon, HIT_ON.cannon, "empire", rng);

export const bombRun = (r: Rebels, rng: Rng = Math.random) => [
  ...rollGroup("X-wing", "xwing", r.xwing, HIT_ON.xwingBomb, "rebel", rng),
  ...rollGroup("Y-wing", "ywing", r.ywing, HIT_ON.ywingBomb, "rebel", rng),
];

export const hitsOf = (dice: Die[]) => dice.filter((d) => d.hit).length;
export const rebelCount = (r: Rebels) => r.xwing + r.ywing;
export const empireFighters = (e: Imperials) => e.tie + e.superHealthy + e.superDamaged;
/** Total hits the Empire's fighters can absorb before all are gone. */
export const empireCapacity = (e: Imperials) => e.tie + SUPER_TIE_HP * e.superHealthy + e.superDamaged;

export function applyRebelLosses(r: Rebels, x: number, y: number): Rebels {
  if (x < 0 || y < 0 || x > r.xwing || y > r.ywing) throw new Error("Invalid rebel losses");
  return { xwing: r.xwing - x, ywing: r.ywing - y };
}

/** tie = TIEs destroyed, damage = healthy Super TIEs damaged, finish = damaged Super TIEs destroyed. */
export type EmpireAlloc = { tie: number; damage: number; finish: number };

export function isValidEmpireAlloc(e: Imperials, a: EmpireAlloc): boolean {
  return (
    a.tie >= 0 && a.damage >= 0 && a.finish >= 0 &&
    a.tie <= e.tie && a.damage <= e.superHealthy && a.finish <= e.superDamaged + a.damage
  );
}

export function applyEmpireLosses(e: Imperials, a: EmpireAlloc): Imperials {
  if (!isValidEmpireAlloc(e, a)) throw new Error("Invalid empire losses");
  return {
    ...e,
    tie: e.tie - a.tie,
    superHealthy: e.superHealthy - a.damage,
    superDamaged: e.superDamaged + a.damage - a.finish,
  };
}

/** Splits n Super TIE hits: finish damaged ones first, then damage healthy ones (overflow finishes them). */
export function allocSuperHits(e: Imperials, n: number): { damage: number; finish: number } {
  const finishDamaged = Math.min(n, e.superDamaged);
  let rest = n - finishDamaged;
  const damage = Math.min(rest, e.superHealthy);
  rest -= damage;
  const finishFresh = Math.min(rest, damage);
  return { damage, finish: finishDamaged + finishFresh };
}

/** Removes all fighters (used when hits meet or exceed capacity). */
export const wipeEmpireFighters = (e: Imperials): Imperials => ({ ...e, tie: 0, superHealthy: 0, superDamaged: 0 });

export type BattleOutcome = "continue" | "empire" | "trench";
export function battleOutcome(r: Rebels, e: Imperials): BattleOutcome {
  if (rebelCount(r) === 0) return "empire";
  if (empireFighters(e) === 0) return "trench";
  return "continue";
}
