# Project rules

- Plain Vite + React SPA (no SSR, no TanStack Start, no server functions/routes) — workspace policy.
- Client routing uses @tanstack/react-router file routes; never react-router-dom — workspace policy.
- Page metadata lives in index.html, not route head() — SPA has no head rendering.
- Anything needing secrets or a backend goes through Supabase Edge Functions — workspace policy.
- Game rules live in src/game/logic.ts as pure functions with unit tests; UI only calls them — keeps rules testable.
- Sound effects are synthesized via Web Audio, no audio files — avoids asset licensing.
- Every dependency is recorded in THIRD-PARTY-LICENSES.md — McKinsey OSS standard.

<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Game progress is mirrored to sessionStorage and restored on load; a GameErrorBoundary wraps the route — so dev reloads or crashes never wipe a game in progress.
- Explosions in every canvas scene and fleet row come from src/game/fx.ts (explode/drawFx, ~600 particle cap, flash limiter) — one consistent look and bounded cost.
- The background is a single canvas Starfield (src/game/Starfield.tsx), triggered into hyperspace via a window event — one cheap animated layer for all screens.
- All sound goes through the master bus in src/game/sfx.ts (effects/music gains → compressor → speakers, shared reverb send, per-kind voice limits); canvas scenes trigger per-bolt/per-explosion sounds with screen-position pan — keeps 20-cannon volleys clean and in sync.
- Version and build date are set at build time in vite.config.ts (define) — bump the version there for each release.
