# Clearer hit reveal + text review

## 1. Hit reveal step (Phase 2 and Phase 3)

Right now, the "choose losses" box covers the dice as soon as they stop rolling. A short reveal step will go in first.

After the dice settle:
- Hits light up: they get bigger, glow, and show a "HIT" tag. Misses fade out.
- A large result card appears for each side, for example "REBELLION: 3 HITS" and "EMPIRE: 2 HITS". It shows "0 hits — all missed" when nothing hits.
- One line says what happens next, for example "Empire must remove 3 hits of fighters, then Rebellion removes 2."
- A "Assign damage" button opens the loss picker. When no choice is needed (zero hits, or the whole fleet is wiped out), the button says "Continue" instead.
- Phase 3 cannon rounds: the result card says "CANNONS: 2 HITS — 2 Rebel ships destroyed", with the same button.
- Phase 3 bombing run: hits light up and the card says "DIRECT HIT!" or "ALL TORPEDOES MISSED". The finale or the recap starts after a short pause.

## 2. Text improvements (approved)

Title / How it works
- Make the three phase names the same everywhere: "Buy Your Fleet", "Space Battle", "Trench Run". Use them in the top tracker too.
- Battle panel: "Both sides fire at once. Each player picks which of their own ships are lost."

Phase 1 (shops)
- Titles: "Phase 1 · Empire: Buy Your Fleet" / "Phase 1 · Rebellion: Buy Your Fleet".
- Cannon card: change "Trench only · hits on 6 · 2 rounds" to "Fires only in the trench run · 2 rounds · hits on 6".
- Super TIE: change "Takes 2 hits" to "Takes 2 hits to destroy".
- Buttons: "Lock in Empire fleet" becomes "Done — Rebellion buys next"; "Launch the attack" becomes "Done — start the space battle".

Phase 2
- Dice labels: "Rebellion fires" / "Empire fires back" become "Rebellion's shots" / "Empire's shots" (both sides fire at the same time).
- Picker text: "Choose which ships are lost." becomes "Choose which of your ships are destroyed."
- Super TIE hint: "A Super TIE takes 2 hits to destroy. Hits finish off damaged ones first."

Phase 3
- Cannon line: "The Empire's N cannon(s) fire. Each 6 destroys a Rebel ship." becomes "N Imperial cannons fire. Each roll of 6 destroys one Rebel ship."
- Bombing line: "N ships make their bombing run. X-wings hit on 6, Y-wings on 3 or higher. One hit destroys the Death Star."
- Button: "Drop the bombs" becomes "Start the bombing run".
- Show correct singular and plural everywhere ("1 ship", "2 ships"), with no "(s)".

End screens
- "Imperial fleet destroyed!" screen: add "N Rebel ships survive to make the trench run."
- Win messages: use one format, "Rebellion wins — the Death Star is destroyed" and "Empire wins — …reason".

## Technical details
- Game.tsx: add `reveal` state `{ kind: "battle" | "cannon" | "bomb", ... }` set in `doRoll`'s callback. The existing allocation and `resolveBattle`/`afterCannon` logic moves behind the reveal's Continue handler. No rule changes.
- SideDice/DiceTray: an `emphasize` prop that scales up and glows the hit dice and dims the misses. Add a new `pop` keyframe in styles.css.
- Add a `plural(n, word)` helper for text.
- No new packages.
