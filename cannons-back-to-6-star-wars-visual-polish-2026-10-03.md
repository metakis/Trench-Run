# Cannons back to 6 + Star Wars visual polish

## 1. Cannons hit on 6 again
- Cannons go back to hitting only on a 6.
- Text updates: Empire cannon card "Fires only in the trench run · 2 rounds · hits on 6"; trench line "Each roll of 6 destroys one Rebel ship."
- Rules memory updated to match.

## 2. Star Wars look, everywhere
No new packages, fonts or image files. Everything is drawn in code, so there are no licensing concerns. All art stays original and is not official artwork.

- **Title screen:** a gold, tilted "crawl" that scrolls the intro text away into the stars. Under it, a large outlined gold TRENCH WARFARE logo with wide letter spacing.
- **Starfield:** stars on three layers that drift at different speeds, a faint nebula glow, and a planet's edge in one corner.
- **Panels:** cockpit and console frames with corner brackets, thin glowing edges, scan lines and small readout labels like "TGT-LOCK" and "SECTOR 7". Rebellion panels glow blue and Empire panels glow red.
- **Buttons:** angled ends like lightsaber hilts, with a glowing core that brightens when you point at them.
- **Type:** headings in wide, spaced, all-caps letters (like the films' title cards), and numbers in a mono "targeting computer" style.
- **Ships:** sharper outlines for the X-wing, Y-wing, TIE, Super TIE and cannon, with glowing engines and red or green laser bolts when ships fire.
- **Space battle:** a short volley of laser bolts flies across the screen after each roll. Lost ships blow up with an orange fireball and flying debris.
- **Trench run:** the trench strip gets metal walls in perspective, flashes of turbolaser fire at each gate, and a targeting-computer reticle that locks onto the exhaust port.
- **Splash screens** (fleet destroyed, Death Star explosion, Vader defeat): letterbox bars, an expanding ring shockwave on the explosion, and a stronger red glow behind Vader.

Everything still fits on a laptop screen without scrolling. Game rules and flow don't change, apart from the cannon fix.

## Technical details
- logic.ts: `HIT_ON.cannon = 6`. Tests stay passing; any test that assumes 5 is updated.
- styles.css: new tokens (`--saber-blue`, `--saber-red`, `--crawl-gold`, `--console-line`), plus utilities `.crawl`, `.console-frame`, `.scanlines` and `.saber-btn`. New keyframes: drift layers, laserbolt, debris, shockwave, reticle-lock.
- Typography uses system font stacks with letter spacing, uppercase and `font-variant-numeric`. No web fonts.
- ui.tsx: Panel gets an optional `side` prop for the console frame, and Btn gets the saber styling.
- ships.tsx: redraw the SVGs and add engine-glow elements.
- Game.tsx: crawl on the title screen, laser volley overlay, debris on loss, trench walls and reticle, letterbox on the splash screens.
- Check at 1280x720 and 946x744 with Playwright, using the 20-cannon case as well.
