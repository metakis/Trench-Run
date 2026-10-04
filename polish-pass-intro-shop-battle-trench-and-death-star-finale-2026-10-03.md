# Polish pass: intro, shop, battle, trench and Death Star finale

## 1. How it works screen
- Trench panel: remove "(each 6 destroys a ship)".
- Button text: "To the Empire's shop" becomes **"Buy Your Fleet"**.

## 2. Phase 1 shop
- Bring back the short instructions under the Phase 1 title (for example "Spend up to 20 credits. Add or remove units with + / −. The Empire buys first.").
- Each stat card shows cost as its own labeled row: **Cost: 2 credits** (instead of a "2 cr" badge).
- Battle and Bombing rows get a text label next to the dice faces: **"Battle: hits on 4 or higher"**, **"Bombing: hits on 6"** (shows "on 6" when only a 6 works).

## 3. Phase 2 hits to absorb
- The loss picker header becomes a large banner: big number plus "HITS TO ABSORB", in the side's color.
- A running counter shows "Assigned 1 of 2" with one pip per hit that fills as losses are picked. The confirm button only lights up when all hits are assigned.

## 4. Phase 3
- Trench strip: add the same connector line between Gate 2 and the Exhaust port as between Gate 1 and Gate 2.
- The Imperial cannons' dice area no longer shows "No dice to roll" during the bombing run; it is left empty (or hidden).

## 5. Death Star finale (only when the bombing run hits)
- A new full-screen animated scene before the final recap:
  1. The surviving ships that scored hits fly over the trench and drop torpedoes into the exhaust port (with laser sound).
  2. The view zooms in on the Death Star, which flashes, cracks and explodes in a large burst with a big boom sound.
  3. "The Death Star is destroyed!" appears, then a "See battle recap" button (it also continues on its own after a few seconds).
- If the bombing run misses, the game goes straight to the recap as now.

## Technical details
- Game.tsx only: Briefing text, Shop card rows, picker headers, TrenchMap connector, hide empty DiceTray for Empire in trench, new "finale" phase between trench and over.
- New CSS keyframes in styles.css (bomb drop, zoom, explode); built with existing ship SVGs and color tokens. Uses existing sounds.
- No game rule changes, no new packages.
