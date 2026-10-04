# Phase 3 graphics: cannon lasers, ship explosions, torpedo shots and the exhaust shaft

## 1. Cannon rounds (glowing line view)
- **Rebel ships ahead of you.** The surviving X-wings and Y-wings are drawn as glowing line ships flying in formation just ahead of the camera, so you can see who is being shot at. Up to 12 are drawn; larger fleets show 12 plus a "+N" count.
- **One laser per cannon.** Every Imperial cannon fires its own red bolt, one after another, so 12 cannons means 12 bolts.
- **Hits explode ships.** A bolt from a cannon that rolled a 6 hits one of the line ships. That ship flashes, breaks into flying line pieces with a spark burst, and disappears, along with a boom. The number of ships that explode matches the hits.
- **Misses** streak past the ships and hit the trench wall with a small spark.

## 2. Bombing run (shaded view)
- One torpedo per ship making the run, fired one after another toward the exhaust port.
- **Hits** drop into the port with a bright flash.
- **Misses** hit the surface around the port, each with its own small explosion, so you can count hits and misses near the target.
- A small tally appears beside the port during the run: "2 hits · 3 misses".

## 3. New ending scene: down the shaft (only on a hit)
After a hit, the ending now plays in this order:
1. **Down the shaft** (new, about 2.5 seconds): the view looks straight down the exhaust shaft, drawn as glowing rings rushing past. The torpedoes that hit fall down it toward the reactor glowing at the bottom, then a white flash.
2. **Ships fly away** (existing): the Rebel ships pull away from the Death Star.
3. **Death Star explodes** (existing, the same continuous shot as now), then the battle recap.

The old "ships drop bombs over the port" scene is replaced by the shaft scene, so the ending is not much longer.

## Technical details
- TrenchPOV.tsx: add `ships` prop (X/Y-wing count) and draw small wireframe ship shapes ahead of the camera. Per-cannon bolt schedule (all cannons, staggered ~120ms, total capped at ~2s). Hit bolts target ship slots and spawn a particle burst (line fragments with velocity, fade). Explosions are kept as a list inside the animation loop.
- Bombing: pass the dice list (hit/miss per torpedo) instead of a single hit flag; each torpedo gets a target point (the port for a hit, an offset around it for a miss) and its own burst.
- Game.tsx Finale: the "drop" stage becomes a "shaft" stage drawn on a canvas (rings toward a vanishing point, torpedo dots falling, reactor glow and flash), then the existing escape → zoom → boom stages.
- Reuses the existing sounds (laser, explosion, shipLost, bombDrop, deathStar). No new packages, no rule changes.
