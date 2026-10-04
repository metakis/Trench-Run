# Sharper ships + no scrolling anywhere

## 1. Ship redraw
Original hand-drawn art (not official artwork), drawn in code, no new files or packages.
- **X-wing:** long pointed nose, cockpit canopy, four wings in an open X with laser cannons on each wingtip, four round engines at the back with a blue glow.
- **Y-wing:** rounded cockpit up front, a slim spine, two long engine pods with ribbed details and glowing engine tips.
- **TIE fighter:** round ball cockpit with a spoked front window, short wing struts, and two tall hexagonal wing panels with inner frame lines.
- **Super TIE:** bent, angled wing panels, a longer pointed cockpit and a red glow, so it reads as clearly bigger and meaner than a normal TIE.
- Ships stay readable at the smallest size used (20 icons in a row); fine details fade out at small sizes.
- The cannon, Death Star and Vader drawings stay as they are.

## 2. Nothing scrolls, on any screen
- Every screen fits a laptop window (1280x720 and 946x744) with no scroll bars, including the battle log column, which becomes a short "last few events" list instead of a scrolling area.
- Dice, ship icons and fleet rows shrink further when counts are large, so the main buttons always stay in view.

## 3. Extreme-case testing
Play through each screen in a browser at both laptop sizes with:
- 20 cannons vs 10 X-wings
- 10 TIEs vs 6 Y-wings
- 4 Super TIEs vs 10 X-wings
- Title, How it works, both shops, battle (rolling, results, loss picker), fleet-destroyed screen, trench run, Death Star finale, Vader defeat, recap.
Any screen that scrolls or cuts off is fixed and rechecked.

## Technical details
- ships.tsx: new SVG paths for XWing, YWing, TieFighter, SuperTie (64x64 viewBox, currentColor, engine-glow elements).
- Game.tsx / fleet.tsx / ui.tsx: remove overflow-auto areas, cap log to recent entries, add an extra size step for dice and icons; use `h-screen overflow-hidden` on the root.
- Playwright script checks `document.scrollingElement.scrollHeight <= innerHeight` and that no element has visible scroll overflow on each screen.
