# Fix the "white screen, back to start" reset + richer final recap

## 1. What happened
- The preview's records show no game error. Right at that moment they show "server connection lost", which means the preview restarted.
- When the preview restarts (for example while I'm saving changes) the page reloads. The game keeps everything in memory, so a reload shows a white screen and then the title screen again.
- So the game didn't crash. It was reset by the reload. Players on the published game won't see this, but it's annoying while testing, and any real crash would look the same.

## 2. Fix
- **Resume after reload:** save the game (phase, fleets, round, history, trench results) in the browser tab as it's played. After a reload, the game picks up at the same step. "Play again" clears it.
- **Crash safety net:** if something does break, show a "Something went wrong" panel with "Resume" and "New game" buttons and keep the saved game, so you don't get a blank white screen.

## 3. Ideas for numbers in the final recap (pick any)
- **A. Accuracy per side:** % of Rebel shots that hit and % of Empire shots that hit in the space battle, shown as rings.
- **B. Cannon accuracy:** % of cannon shots that hit in each round and overall (for example "4 of 24 · 17%").
- **C. Torpedo accuracy:** X-wing vs Y-wing torpedo hits and %.
- **D. Survival rate:** % of each fleet still flying at the end, by ship type.
- **E. Credits lost:** credit value of ships lost per side (for example "Empire lost 14 of 20 credits").
- **F. Battle length:** number of rounds, total dice rolled, and the round with the most kills.
- **G. MVP ship type:** the ship type with the most hits per credit spent.
- **H. Luck vs expected:** hits each side actually scored compared with what the dice should average (for example "Rebellion +2 lucky").

Recommended: A, B, C, D, E.

## Technical notes
- Save state in sessionStorage from Game.tsx (one serialized object) and restore it when the game starts. Add a React error boundary in the route.
- The recap stats come from the existing RoundRecord/TrenchRecord data. To calculate accuracy, shots per side get stored in RoundRecord, and torpedo split by ship type in TrenchRecord.
- No new packages and no rule changes.
