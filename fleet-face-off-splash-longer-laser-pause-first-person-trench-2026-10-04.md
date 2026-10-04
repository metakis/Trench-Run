# Fleet face-off splash, longer laser pause, first-person trench run

## 1. Fleet face-off splash (after Phase 1)
After the Rebellion presses "Done — start the space battle", a short full-screen scene plays before the battle:
- The Empire's ships appear one by one on the right (warping in with a flash), then the Rebellion's on the left.
- Both fleets slide into formation facing each other across the starfield, with "REBELLION" and "EMPIRE" labels and ship counts.
- An engine hum builds, then "Battle stations!" and the hyperspace jump into Phase 2.
- About 4 seconds long; click to skip.

## 2. Phase 2: longer laser pause
- The dogfight scene with the lasers stays up longer (about 2.6 seconds now, 4 seconds after the change), and the lasers fire more slowly so you can follow each shot.
- The "Assign damage" button waits until the lasers finish (still clickable to skip).

## 3. Phase 3: first-person trench run
Both views are seen from the cockpit, flying down the trench.

**Cannon rounds: 3D vector look** (like the classic 1983 Star Wars arcade game)
- Glowing line drawing of the trench walls and floor rushing toward you.
- The cannon towers appear on the walls ahead, one for each Imperial cannon.
- When the dice land, each cannon that rolls a 6 fires a red bolt at the screen and the view flashes and shakes. Misses streak past.
- A gate frame flies past at the end of each round.
- A cockpit frame overlays the view with the round number and ships left.

**Bombing run: more detailed version**
- Solid, shaded trench walls with panel detail and lighting, instead of just lines.
- The exhaust port gets closer at the end of the trench, with the green targeting computer on top and a range countdown.
- On a hit, torpedoes fly into the port with a flash (then the existing Death Star ending). On a miss, they hit the surface beside it.

The trench view replaces the current flat trench strip and sits where the dice are now. The dice and results still show underneath, and everything fits on a laptop screen without scrolling.

## Technical details
- New `src/game/TrenchPOV.tsx`: a `<canvas>` with a small perspective projection (pure math, requestAnimationFrame). Mode `vector` draws stroked wireframe lines with a glow. Mode `solid` fills shaded polygons sorted by depth, with a lighting gradient. Props: cannons, hits, rolling, step, outcome.
- New `FleetFaceoff` component in Game.tsx; a new "faceoff" phase between buyRebel and battle. The Phase 2 intro card plays after it.
- BattleScene animation lengthened to 4s; bolt animation delays and durations scaled up; reveal buttons appear after the scene ends.
- No new packages (three.js is not needed for this level of detail). No game rule changes. Sounds reuse the existing synthesized effects, plus a new engine-hum sound.
