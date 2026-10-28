# AI Handoff — Start Here

## Verified baseline

- Repository: `XiONDiGiTaL/veylattice` (renamed from `Veylattice` in S-M2-B so the Pages path matches the
  published URL; GitHub keeps redirects for the old slug).
- Branch: `main`. Remote: `https://github.com/XiONDiGiTaL/veylattice.git`.
- Live site: **https://xiondigital.net/veylattice/** — a GitHub Pages project site under the account's
  existing Pages custom domain. The base site and `/sohbet` are untouched: no DNS record, custom-domain
  setting or base-site file was modified.
- Pages caches JS for up to four hours (`max-age=14400`), so a warm browser can briefly run a cached
  module against new HTML. Hard-refresh before debugging "stale" behaviour after a deploy.
- Latest commits: `a239bc9` (S-M2-D: menu, onboarding, board readability, 18 voxel models) and a
  docs follow-up recording it, both pushed to `origin/main`.
- Live verification after S-M2-D, in a fresh incognito context: first visit opened How to Play; menu
  rendered 4 decorative models (50 boxes); Roster rendered 18 cards / 18 models / 209 boxes; a practice
  match created 49 cells and summoned a `Mireglass Stalker` with `data-model-id` and 12 boxes; **zero
  console errors**; `models.js`, `voxel.js`, `tutorial.js` and `styles.css` all 200. Apex site 200,
  `sohbet.xiondigital.net` 200.
- Environment: Windows / Git Bash, Node v24.19.0, Python 3.14 for static serving. The app has **no
  runtime dependencies**; tests use Node's built-in runner.

## Latest session — S-M2-D (menu, onboarding, board readability, 18 voxel models)

The app used to boot straight into a match, explain nothing, and draw each unit as one element-coloured
CSS cube. This session replaced all three. `src/game/` was **not modified**: no rule, constant or engine
behaviour changed.

1. **Main menu, How to Play, Roster** — `index.html` gained `#view-menu`, `#view-guide` and
   `#view-roster`; `boot()` no longer calls `newMatch()`. `ui.view` starts at `menu`, the Battle tab is
   disabled until a match exists, and `showView()` drives all five views from a `VIEWS` map. Deck
   Builder / Collection / Shop / Online appear as a labelled "not in this build" block, not buttons.
2. **18 voxel models** — `src/render/models.js` holds one definition per official Vessel (11–14 boxes,
   grouped, element palette + per-model overrides, explicit `scale` for low quadrupeds).
   `src/render/voxel.js` builds CSS-3D DOM from that data. `modelFor(id)` returns `null` for an unknown
   id and the board draws a labelled placeholder — never a silent cube.
3. **Board readability** — per-row zones (`zone-opponent` / `zone-contested` / `zone-home`) with a
   vertical gutter, `:where()` so zone tints stay below interaction colours, dashed `deploy-blocked`
   tiles, a state chipped prompt bar, Cancel in two places, Escape to clear.
4. **Back row** — the two canonical Relic slots render as board furniture with index, name, element and
   effect. The four-zone layout from the supplied concept was **not** adopted: `GAME_RULES.md` fixes two
   Relics per seat and nothing defines set/activate Action zones. Documented divergence, not a silent
   rule change.
5. **Guided first match** — `src/ui/tutorial.js` is a pure step list plus `advanceTutorial()`. `dispatch()`
   feeds it accepted engine events (mapping `turnEnd` → `endTurn`), so the guide cannot invent progress.
   `tutorialHint()` adds a state-aware nudge when a step is blocked. Skip is always available.

### Fixes made during the session (all re-verified)

- A successful summon left the pre-summon prompt on screen; every action now reports its own result.
- Selecting an unaffordable Vessel said "choose a highlighted cell" while zero cells were legal.
  `vesselSelectionMessage()` now counts tiles from `getLegalActions` and names the blocking rule.
- The tutorial watched `endTurn` but the engine emits `turnEnd`, so it stalled on step one.
- Mobile tiles collapsed the model because the stat line wrapped to three lines in a 43 px cell. The
  stat line is split into `.stat.atk` / `.stat.gd` with `::before` labels that shorten to `A`/`G`, and
  `tickGuard()` updates only the Guard span.

### Where the seams are

- `ui.selectedCard` holds an instance id; `selectedCardEntry()` resolves it to a definition plus the
  engine's own legality (`getLegalActions`). **The DOM never decides what is playable.**
- `dispatch()` snapshots units before applying and then calls `playEvents`; the AI loop keeps one frame
  per command so a move-then-attack plan animates from the moved cell.
- `renderBoard()` is a pure projection of `ui.match` plus `humanCanAct()`; anything that needs to know
  what is legal asks the engine.
- Models are presentation-only: `buildVoxelModel(model)` takes data and returns DOM. It cannot read or
  write match state.
- Account state lives in `localStorage` under `veylattice.account.v1`; guide completion under
  `veylattice.guide.seen.v1` (guarded `try/catch` for private-mode storage).

### Verified in this session

- `npm test` → **83 passing, 0 failing** (~0.6 s).
- Browser at `http://127.0.0.1:8123/` (owned Python server, PID recorded and stopped afterwards):
  first load opened How to Play; menu, roster and guide rendered with **zero console and zero network
  errors**; a guided practice match ran to turn 4 with the AI taking its turns; six different Vessels
  rendered their own models on the board (`data-model-id` asserted) and all 18 on the roster page; the
  tutorial advanced 1→4 and displayed its blocked-step hint; the back row rendered both slots; mobile at
  390×844 kept a visible model and a one-line `A2 G5/5`.
- No database work in this session. Previously verified (S-M2-C): direct table read 401, wrong code
  `null`, wrong-code save 401, correct save ok, rotation invalidates the old code, browser round trip
  restored *Lattice Adept* from the account.

## Read first

`AI_INSTRUCTIONS.md`, `GAME_RULES.md`, `TODO.md`, `ROADMAP.md`, `TECHNICAL_ARCHITECTURE.md`,
`docs/IMPLEMENTATION_LOG.md`, `README.md`. `GAME_RULES.md` is canonical; `src/game/` is the only
authority on legality.

## What is implemented (verified)

### Deterministic rules engine — `src/game/`

- Commands: `summon`, `move`, `attack` (unit or `target: "nexus"`), `mulligan`, `playAction`,
  `playRelic`, `endTurn`, `surrender`, `timeout`, `tick`.
  `applyCommand(state, command, { now })` → `{ ok, state, events, code?, message? }`.
- Rejected commands return the original state by reference; `expectedVersion` catches stale commands;
  the deadline path materialises a timeout instead of losing it.
- 7×7 board, 30 Vitality, opening 5 + mandatory draw, Flux 1→10 with refill/expiry, one summon per turn,
  four-Vessel cap, deployment rows, summons unready, orthogonal BFS movement, one move and one attack
  per ready Vessel, persistent Guard (`maxGuard` separate), simultaneous eligible retaliation,
  defeat/discard, Nexus strikes gated on the enemy home row **and** an undefended opponent, escalating
  fatigue, victory/surrender/simultaneous-lethal draw, once-per-turn 1-Flux mulligan, 120-second
  deadline.
- Actions and Relics: closed `EFFECT_KINDS` vocabulary with per-kind scope and ranges, frozen at catalog
  build. Relic auras resolve in one `relicAuras()` helper used by attacks, Nexus mitigation, dawn mend,
  summons, previews and the AI.

### Tactical AI — `src/game/ai.js`

- `buildObservation(state, seat)` → own hand + public board + opponent **counts only**.
- `buildCandidates(state, seat, …)` → engine-derived plans, including `playAction` / `playRelic`.
- `choosePlan(candidates, observation, …)` → pure, bounded by an injected clock, returns
  `{ commands, kind, score, considered, truncated }`.
- Four difficulties (8/20/45/120 ms) and three archetypes (`vanguard`/`warden`/`conductor`). Difficulty
  changes decision quality only — never resources.
- Seat 1 is the human, Seat 2 the AI; the HUD drives the AI through `applyCommand` only.

### Presentation — `src/render/`, `src/ui/`, `src/main.js`

- `src/render/models.js`: 18 Vessel definitions (boxes + groups + palettes + optional `scale`).
- `src/render/voxel.js`: CSS-3D builder; three faces per box; no dependencies, no WebGL.
- `src/ui/tutorial.js`: pure guided-match state machine (`TUTORIAL_STEPS`, `advanceTutorial`,
  `skipTutorial`, `tutorialStep`).
- `src/main.js`: menu/guide/roster/battle/settings views, board projection, prompts, event-driven combat
  animation (`playEvents(events, before)`), AI pacing.

### Profiles and persistence — `src/net/`

- Local-first profile in `localStorage`, best-effort Supabase sync with an honest state string.
- Recovery-code accounts (`src/net/account.js` + `supabase/migrations/0002_accounts.sql`); see
  `docs/ACCOUNTS.md`. Dedicated Supabase project `jjtfnduodxtulxvviasf`; no table grants, RPC-only.

### Tests — 83/83 passing

`npm test` → 83 pass, 0 fail. Files: `tests/` `elemental`, `content`, `cards`, `engine`, `match`, `ai`,
`profile`, `models`, `tutorial`, plus `support.js`.

## Not implemented (do not claim otherwise)

- No card collection, deck builder, shop, packs, rewards, ranked, arenas, Lore Bonds, Forge or Codex.
- No online play, lobbies or server-authoritative matches. Practice is local only.
- **No terrain rules.** Zones are visual (deployment / contested); nothing on the board modifies combat.
- No set/activate Action back-row zones; no rule specifies them, so only the two Relic slots exist.
- No Google/Discord sign-in (providers disabled, credentials unavailable — see `docs/ACCOUNTS.md`).
- No rate limiting on account/profile creation (TODO M2-005).
- Models are CSS-3D boxes: no GLB, no skeletal animation, no per-limb swing. Whole-body lunges only.
- No keyboard grid traversal (TODO M7-005). No in-match pause overlay.
- No measured AI win rate against humans; no balance claims are justified.
- A real 120-second browser expiry has not been waited out; engine tests cover the boundary.

## Architecture decisions and reasons

1. **Everything is a command.** HUD and AI (and later a server) submit the same validated commands.
2. **The AI cannot see hidden information.** It receives an observation; a test mutates the opponent's
   hand and asserts an identical decision.
3. **Candidates come from the engine**, so legality cannot fork between HUD and AI.
4. **Elemental maths is one module**, applied per packet to current Attack; Guard is never halved.
5. **Simultaneous exchange**, so a lethally hit defender still retaliates.
6. **Local-first persistence.** Play never blocks on the network; the UI reports the real sync state.
7. **No anon table grants.** All database access is through RPCs; writes need an edit token or code.
8. **Separate Supabase project.** Sohbet (`ezwxppiuxbyzmmheckce`) must never be touched.
9. **Presentation is a projection.** Renderers never decide legality and never mutate a match.

## Commands

```bash
npm test                                  # 83 tests, Node built-in runner
node --check src/main.js src/game/ai.js   # syntax sanity
python -m http.server 8123 --bind 127.0.0.1   # then http://127.0.0.1:8123/
```

Serve from the repository root. All asset paths are relative, so `/veylattice/` works unchanged.
Previously used preview servers: 8123/8124/8130. Check ownership before killing anything.

## Known risks

- `state.catalog` is cloned per command (fine at 30 cards; revisit if the catalog grows or a server
  serialises per command). `structuredClone` is required.
- The 1-Flux opening with a 2-Flux cheapest Vessel makes turns one and two thin. **This is canonical**
  (`GAME_RULES.md`) — the tutorial explains it. Changing it is a balance decision, not a UI fix.
- CSS-3D model cost scales with box count × units on screen. 18 models at 11–14 boxes each is fine at
  four Vessels per seat; measure before adding many more.
- `structuredClone`/`crypto.randomUUID` require a modern browser; there are no polyfills.

## Next three executable steps

1. **M3-001** — deck builder and collection UI on top of the existing catalog/deck validators
   (`validateDeck`, `buildPracticeDeck`), using clearly labelled demo data until server integration.
2. **M2-001 remainder** — effect queue with explicit ordering, revive/return, death triggers, temporary
   buff expiry and loop protection, with simultaneous-death tests.
3. **M7-004 remainder** — per-limb animation (weapon/head groups already exist in the model data) and a
   measured mobile performance pass, or a written decision to stay on CSS-3D.

## End-of-session requirement

Commit coherent change sets, update `CHANGELOG.md` with actual changes and observed test output,
`TODO.md` with statuses and evidence, this handoff with a fresh verified baseline, and append to
`docs/IMPLEMENTATION_LOG.md`. Include the commit hash you actually created. Never claim completion from
a plan, a placeholder, or an unrun test.
