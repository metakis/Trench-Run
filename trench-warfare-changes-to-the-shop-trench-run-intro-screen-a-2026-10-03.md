# Trench Warfare: changes to the shop, trench run, intro screen and colors

## 1. One Super TIE choice when the Empire takes losses
- Replace the two Super TIE rows ("Damage a healthy Super TIE" and "Destroy a damaged Super TIE") with a single row: **Hit a Super TIE**.
- Each hit on a Super TIE goes to a damaged one first, which destroys it. Once there are no damaged Super TIEs, the hit damages a healthy one.
- A hint under the row shows the result, for example "2 hits → 1 destroyed, 1 damaged". The picker caps the number of hits at what the Super TIEs can take: two per healthy ship, one per damaged ship.
- The game rules are unchanged: a Super TIE still takes two hits to destroy.

## 2. Phase 1 shop with ship stats and a growing fleet
- The shop becomes two columns.
- **Left column:** one stat card per unit. Each card shows the ship icon, its cost in credits, and its hit numbers as six small dice faces with the hitting faces lit.
  - Rebellion cards show both the space battle number and the Death Star bombing number.
  - TIE and Super TIE cards show their battle number. The Super TIE card also shows its two health dots.
  - The cannon card shows "Trench only · hits on 6 · 2 rounds".
- Each card has its own buttons to add or remove that unit.
- **Right column:** a "Your fleet" area with a credits bar. A ship icon appears for each unit you buy (it flashes in when added) and disappears when you remove it, grouped by type.

## 3. Phase 3 trench run picture
- Under the tracker, a wide trench drawing runs from left to right: Entry, then Cannon gate 1, then Cannon gate 2, then the Death Star exhaust port at the far end.
- Each gate shows the Empire's cannon icons.
- The surviving Rebel ships sit as icons at the current stage and slide to the next stage after each cannon round. Ships lost in a round explode and drop out of the group.
- On the bombing run the group is next to the Death Star, which glows as the target.
- The dice area and buttons below stay the same, and everything still fits on a laptop screen without scrolling.

## 4. Intro screen explaining the 3 phases
- After the title screen and before Phase 1, a "How it works" screen shows three illustrated panels side by side:
  1. **Buy your fleet:** credit coins and ship icons, 20 credits each, Empire buys first.
  2. **Space battle:** X-wings and Y-wings against TIEs and Super TIEs, both sides fire at once, players pick their own losses, and the battle repeats until one fleet is gone.
  3. **Trench run:** two cannon gates, then the bombing run. One hit destroys the Death Star.
- One button continues to the Empire's shop.

## 5. Rebel color
- Change the Rebellion's color from orange to **blue** everywhere (ships, panels, dice, banners, recap). Blue is the classic Rebel cockpit-glow color and stands apart from the Empire's red.
- Also update the saved project notes on colors to match.

## Technical details
- `logic.ts`: add `allocSuperHits(e, n)`, which returns `{damage, finish}` (finishing damaged ships first). Add unit tests for it. `EmpireAlloc` stays the same, and `EmpirePicker` builds it from the tie count and the single Super TIE count.
- `Game.tsx`: change the `Shop` layout (stat cards and a `FleetPreview` built with `ShipRow`), add a `Briefing` phase between title and buyEmpire, and add a `TrenchMap` component placed under `TrenchTrack` that uses the step plus the rebel counts.
- `styles.css`: change `--rebel` to a blue oklch value (about `oklch(0.7 0.15 240)`). Check that the `holo` token is still distinct from it, and adjust it if needed. Add a `slide` keyframe for the moving group.
- No new packages.
