# Battle Visuals and One-Screen Layout

## 1. Fleets shown as ship icons (Phase 2 and 3)
- Replace the "3 / 4" counts with one icon per ship bought.
- A destroyed ship stays in place, dimmed, with a red X over it.
- **Super TIEs get one row.** Each one shows its condition:
  - Healthy: normal icon with two small health pips.
  - Damaged (one hit taken): cracked/flickering icon in a warning color, one pip left, with a small spark.
  - Destroyed: dimmed with a red X.
- Cannons appear as icons too, so you can see which are firing.
- Each fleet panel's header shows a large **total ships remaining** count, for example "Rebellion: 5 ships left" and "Empire: 4 fighters left". It updates each round.

## 2. Destruction effects each round
- When losses are confirmed, the ships just lost flash, show an explosion burst, then get their X.
- Newly damaged Super TIEs get a spark burst.
- A brief banner appears over the battle area, such as "Round 2: Rebellion lost 1 X-wing · Empire lost 2 TIEs", and the screen shakes slightly when there are big losses.
- The existing explosion sound plays with each effect.

## 3. Everything fits on a laptop screen
- The battle screen is redesigned to fit roughly 1280x720 without scrolling:
  - Top strip: both fleets side by side, shown as compact icon rows.
  - Middle: both dice areas side by side, with the roll button in between.
  - Loss choices (absorb N hits) appear in an overlay over the dice area, so the confirm button is always visible.
  - Losses per round and the battle log move to a narrow right-hand column that scrolls on its own and holds only a few entries.
- The buying screens get tighter so the confirm button is always visible.

## 4. "Empire fleet destroyed" splash
- When the Rebellion wipes out every Imperial fighter, a full-screen celebration appears before Phase 3: "Imperial fleet destroyed!" with an explosion burst, a list of the surviving Rebel ships, a fanfare sound, and a "Begin the trench run" button.
- The splash does not appear if the Empire bought no fighters (in that case the game goes straight to the trench, as it does now).

## 5. Phase 3 clarity
- A large three-step track across the top: **Cannon Round 1 > Cannon Round 2 > Bombing Run**. The current step is highlighted and finished steps are checked off.
- Two big counters stand side by side: "Cannons: N" (icons) and "Rebel ships left: N" (icons with X's for ships lost in the trench).
- The Death Star sits beside them, larger.

## Technical details
- Changes are mostly in the game screen and its shared display pieces. Game rules don't change; the per-ship display is derived from the starting fleet plus the current counts (destroyed = start - current; damaged Super TIEs = superDamaged).
- Use a new short-lived "just lost" state after each confirmation to trigger the CSS explosion/X animations (new keyframes in the style file, using existing color tokens plus a warning token).
- A new phase step, "cleared", is added between battle and trench for the splash.
- The layout uses fixed viewport-height sizing (h-screen with internal scroll only in the log column).
- No new packages.
