# Trench Warfare: Game Mockup Plan

A two-player game on one screen: the Rebellion vs the Empire. It has three phases, animated dice, retro sound effects, and Star Wars-themed graphics.

## Flow

```text
Title -> Phase 1: Buy units (Empire, then Rebellion) -> Phase 2: Space battle -> Phase 3: Trench run -> Victory screen
```

## Phase 1: Buying units
- The Empire buys first with 20 credits: TIE fighter (2), Super TIE (5), Cannon (1).
- The Rebellion buys next with 20 credits: X-wing (2), Y-wing (3).
- Players use + and - buttons, and a live credits counter shows what's left. Nobody can spend more than 20. There's no hand-off screen between players.

## Phase 2: Space battle (rounds)
- The Rebellion rolls one die per ship. X-wings hit on 4-6, and Y-wings hit on 6.
- The Empire rolls back with every fighter at once, and losses are removed after both sides roll. TIEs hit on 4-6, and Super TIEs hit on 3-6.
- **A Super TIE takes two hits to destroy.** After its first hit it shows as "damaged" and keeps fighting.
- Each player decides how to absorb the hits they take. For example, the Empire picks whether a hit kills a TIE, damages a Super TIE, or finishes off a damaged one.
- The rounds repeat until one side has no fighters left. If the Rebellion is wiped out (even if both sides are wiped out together), the Empire wins. If only the Empire's fighters are gone, the game moves on to Phase 3. If the Empire bought no fighters, Phase 2 is skipped.

## Phase 3: Trench run
- The Empire's cannons fire for 2 rounds and hit on a 6. After each round, the Rebellion picks which ships it loses.
- The surviving ships then make bombing runs. X-wings hit on 6, and Y-wings hit on 3-6. One hit destroys the Death Star and the Rebellion wins. If nothing hits, the Empire wins.

## Look and sound
- Star Wars style: a starfield background, yellow title lettering, and Rebel orange vs Imperial gray/red colors. The X-wing, Y-wing, TIE, Super TIE, cannon and Death Star are drawn in a recognizable silhouette style.
- Retro 8-bit sound effects are generated live in the browser: dice rolls, laser shots, hits, explosions, purchase blips and a victory jingle. A mute button is included.
- Dice tray: each unit gets its own labeled die. The dice tumble, land, and glow when they hit.
- Fleet panels for both sides, plus a battle log.
- A loss-picker dialog that says "Absorb N hits".
- A victory screen with a "Play again" button.

## Note on names
Because this is a mockup, it uses the Star Wars names and look-alike artwork you asked for. Fan-style art is fine for an internal prototype, but it shouldn't be released publicly without rights to the Star Wars brand.

## Technical details
- Converts the starter app to a plain single-page web app (per workspace rules) and records those rules in AGENTS.md.
- Everything runs in the browser. There is no server and no new packages. Sounds use the browser's built-in audio synthesizer, so there are no audio files and no license concerns.
- All the game rules live in one self-contained module: costs, hit numbers, Super TIE hit points, and phase changes. It has unit tests. The screens are driven by that module's game states.
- The theme colors go in the shared style file. The ships are hand-drawn graphics built into the code, so no outside image files are needed.
