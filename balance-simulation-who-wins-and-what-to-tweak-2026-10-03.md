# Balance simulation: who wins, and what to tweak

This is a one-off analysis. The game itself does not change unless you approve a tweak afterward.

## 1. Simulate the game
- Use the game's own rules (costs, hit numbers, Super TIEs taking 2 hits, both sides firing at the same time, 2 cannon rounds hitting on 6, bombing run).
- Play 100 games for each pairing of fleets, so the results don't depend on one fleet choice:
  - **Typical fleets:** each side spends all 20 credits on a sensible mix (for example, Empire: 5 TIEs + 2 cannons, or 2 Super TIEs + 1 TIE + 8 cannons; Rebellion: 10 X-wings, 6 Y-wings + 1 X-wing, or a mix).
  - **Extreme fleets:** for example 20 cannons, 10 TIEs, 4 Super TIEs, 10 X-wings and 6 Y-wings.
  - **Random fleets:** 100 games where both sides pick a random fleet that uses their 20 credits.
- Losses are picked by a simple, sensible rule: the Rebellion loses X-wings first (Y-wings bomb better), and the Empire finishes off damaged Super TIEs first, then TIEs.

## 2. Report
- Overall win split for Rebellion vs Empire, in a table for each pairing.
- The best fleet for each side, and whether one fleet always wins.
- Where games are decided: Empire wins in the space battle, Empire wins in the trench, or Rebellion wins.

## 3. Tweak suggestions
- Test a few one-change options and show how each one moves the win split toward 50/50. For example:
  - Change the cost of the cannon, Y-wing or Super TIE by 1 credit.
  - Change the cannon or Y-wing bombing hit number by 1.
  - Change the number of cannon rounds (1 or 3 instead of 2).
- Recommend the smallest change, or two, that makes the game most even without making one fleet always best.

I'll share the results as a short summary in chat, plus a spreadsheet of all the numbers in Files.

## Technical details
- A standalone script in /tmp imports the pure functions in src/game/logic.ts (run with bun), with parameters for costs and hit numbers.
- Output: /mnt/documents/balance_simulation.xlsx (raw results + tweak comparison). No project files are changed.
