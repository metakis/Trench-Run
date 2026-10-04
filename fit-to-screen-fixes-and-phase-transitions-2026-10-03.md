# Fit-to-Screen Fixes and Phase Transitions

## 1. Fit everything on a laptop screen (about 1280x720 and up)

**The problem:** with many units (for example 20 cannons, or 10 X-wings), the dice and ship icons wrap onto extra lines and push the roll / continue buttons off the bottom. The battle screen cannot scroll, so the game gets stuck.

**Fixes:**
- **Dice shrink to fit.** Dice size steps down with the number of dice (large up to 6, medium up to 12, small above 12). Above 12 dice, the small label under each die is hidden; hits still glow and show "HIT".
- **Ship rows shrink to fit.** Fleet icons get smaller as a row grows, and rows longer than 12 icons stack into tight groups so the fleet strip stays short.
- **Buttons always visible.** The roll button, "Continue" after a reveal, and the loss-choice confirm button are pinned to the bottom of the battle panel, so they never scroll out of view.
- **Safety net.** If something still doesn't fit, only the dice area scrolls inside the panel; the buttons stay fixed.
- **Phase 3 is more compact.** The trench track, trench map and Death Star description are combined into a shorter header, freeing room for the dice.
- **Shops and recap screens** get the same check: the "Done" buttons stay pinned, and the long recap table scrolls on its own.
- Checked in the browser at 1280x720 and 1366x768 with extreme fleets: 20 cannons, 10 TIEs, 4 Super TIEs, 10 X-wings, 6 Y-wings.

## 2. Ideas for more compelling transitions (please pick)

- **A. Phase title cards.** A 1.5-second full-screen card between phases ("PHASE 2 · SPACE BATTLE") that slides in with a sound sting, then wipes away.
- **B. Hyperspace jump.** Going from the shop to the battle, the stars stretch into streaks (light-speed) with a whoosh, then snap back to the battle screen.
- **C. Fleets fly in.** At the start of the battle, each side's ship icons fly into their places from the left and right edges, one after another.
- **D. Trench dive.** Going into Phase 3, the view tilts and zooms toward the Death Star surface before the trench map appears.
- **E. Round counter flip.** Each new battle round shows a big "ROUND 3" that flips in over the dice area.
- **F. Cannon gate pass.** After each cannon round, surviving ships visibly fly past the gate on the trench map, with a whoosh.
- **G. Defeat scene.** When the Empire wins, a short scene of the Death Star turning red and Rebel icons fading, as a contrast to the victory finale.

My suggestion: A, B, C and F. They add drama without slowing play much. Every transition can be skipped with a click.

## Technical details
- Game.tsx / ui.tsx / fleet.tsx: dice and ship sizes based on count (`size` prop on DiceTray and ShipRow); battle panel becomes a flex column with a scrollable dice body and a pinned footer; trench header merged.
- Transitions use new CSS keyframes in styles.css (starfield stretch, slide-in, flip) and existing or new synthesized Web Audio sounds. Click-to-skip on each.
- No game rule changes, no new packages.
