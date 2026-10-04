import { describe, expect, it } from "vitest";
import {
  applyEmpireLosses, battleOutcome, canAdd, empireAttack, empireCapacity, hitsOf,
  isValidEmpireAlloc, rebelAttack, spent, allocSuperHits,
} from "./logic";

const fixed = (v: number) => () => (v - 1) / 6; // rng producing die value v

describe("Trench Warfare rules", () => {
  it("enforces the 20-credit budget", () => {
    expect(spent({ tie: 5, superTie: 2 })).toBe(20);
    expect(canAdd({ tie: 5, superTie: 2 }, "cannon")).toBe(false);
    expect(canAdd({ xwing: 7, ywing: 1 }, "ywing")).toBe(true); // 17 + 3
  });

  it("uses correct hit numbers", () => {
    const r = { xwing: 1, ywing: 1 };
    expect(hitsOf(rebelAttack(r, fixed(4)))).toBe(1); // only X-wing
    expect(hitsOf(rebelAttack(r, fixed(6)))).toBe(2);
    const e = { tie: 1, superHealthy: 1, superDamaged: 0, cannon: 0 };
    expect(hitsOf(empireAttack(e, fixed(3)))).toBe(1); // only Super TIE
  });

  it("Super TIEs take two hits", () => {
    const e = { tie: 0, superHealthy: 1, superDamaged: 0, cannon: 0 };
    expect(empireCapacity(e)).toBe(2);
    const damaged = applyEmpireLosses(e, { tie: 0, damage: 1, finish: 0 });
    expect(damaged.superDamaged).toBe(1);
    expect(battleOutcome({ xwing: 1, ywing: 0 }, damaged)).toBe("continue");
    expect(isValidEmpireAlloc(e, { tie: 0, damage: 0, finish: 1 })).toBe(false);
    const dead = applyEmpireLosses(e, { tie: 0, damage: 1, finish: 1 });
    expect(battleOutcome({ xwing: 1, ywing: 0 }, dead)).toBe("trench");
  });

  it("Empire wins on mutual destruction", () => {
    expect(battleOutcome({ xwing: 0, ywing: 0 }, { tie: 0, superHealthy: 0, superDamaged: 0, cannon: 3 })).toBe("empire");
  });
  it("allocates Super TIE hits damaged-first", () => {
    const e = { tie: 0, superHealthy: 2, superDamaged: 1, cannon: 0 };
    expect(allocSuperHits(e, 1)).toEqual({ damage: 0, finish: 1 });
    expect(allocSuperHits(e, 2)).toEqual({ damage: 1, finish: 1 });
    expect(allocSuperHits(e, 5)).toEqual({ damage: 2, finish: 3 });
    expect(empireCapacity(applyEmpireLosses(e, { tie: 0, ...allocSuperHits(e, 5) }))).toBe(0);
  });
});
