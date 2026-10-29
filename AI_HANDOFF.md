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
- Latest pushed commit at the start of the 2026-10-29 session: `ffbf2be` (merge). The 2026-10-29
  session's work (3D battlefield, Deck Builder, Shop, Online Lobby preview, directive reconciliation)
  was uncommitted at handoff-write time; see "Latest session — 2026-10-29" below. Do NOT quote
  `e8703de` as the latest pushed commit — that line was stale.
- Live verification after S-M2-D, in a fresh incognito context: first visit opened How to Play; menu
  rendered 4 decorative models (50 boxes); Roster rendered 18 cards / 18 models / 209 boxes; a practice
  match created 49 cells and summoned a `Mireglass Stalker` with `data-model-id` and 12 boxes; **zero
  console errors**; `models.js`, `voxel.js`, `tutorial.js` and `styles.css` all 200. Apex site 200,
  `sohbet.xiondigital.net` 200.
- ART-001 local verification: 18 roster cards / 728 boxes, a practice match to turn 6 with four
  different Vessels on the board, and zero console errors on menu, guide, roster, settings and battle.
- Environment: Windows / Git Bash, Node v24.19.0, Python 3.14 for static serving. The app has **no
  runtime dependencies**; tests use Node's built-in runner. Current suite: **129 tests, 129 pass**
  (`npm run check` adds syntax checks).


## Latest session — 2026-10-29 (evening) · STABILITY-001: dead tabs after deploy

Origin is `7b9709e`: the owner applied the earlier patch, and its tree is identical to local
`31a52e8`. The owner reported the live site's tabs and links dead (Cards, Shop, …). This session
couldn't open xiondigital.net (egress 403). The live `src/game/lobby.js` was fetched and is the
new code.

Reproduced locally, then fixed:
- **Stale module cache:** mixed old and new modules fail to link and nothing binds. Fixed with
  the import-map stamp from `npm run stamp`, which **must be run after any `src/` or CSS
  change** (tests enforce it), plus a boot guard.
- **Cloud-blocked boot:** the UI now binds before the Supabase sync.
- supabase-js is pinned to 2.118.0.

Push status: see the CHANGELOG/IMPLEMENTATION_LOG entry for this change. The git proxy refused
this repo again, so the change was handed to the owner as a patch.

Tests: 185/185. Live confirmation is still pending.

Next three tasks:
1. Push this change, then open the live site once with a hard refresh. After that, normal
   reloads must work across future deploys. Confirm the tabs, Cards, Shop and audio.
2. Two-device lobby check against real Supabase.
3. Owner decisions on the two proposals.

, lobby E2E, hand frames

**Start here.** The base was `b488699`. This session's work is one **local commit on top of
b488699 that was NOT pushed**. The session's git proxy refused the repository ("not in this
session's authorized repository set"), `GH_TOKEN` was invalid, and no GitHub connector was
present. Unless the owner pushed it afterwards, **remote main is still b488699 and the live
site still runs ab35232's code**, which includes every defect listed below. Before you build
on anything: `git fetch`, then confirm whether that commit, or the patch the owner received,
is on origin.

What this session verified (headless Chromium via Playwright, local `/veylattice/` subpath
server; scripts in `tools/browser-checks/`, which list their own limits):
- Console: no page errors and no JS console errors across menu, Decks, Shop, Lobby, Settings
  and a full Practice match. The only console errors came from this harness blocking
  supabase.co.
- Soundtrack: the role per view is correct; the browser blocks autoplay until the first click,
  then plays; Battle plays on match start; exactly one Defeat sting per match. **Audible output
  is still unconfirmed** (headless). The Victory sting is unit-tested only.
- Lobby: the two-context E2E over a Supabase Realtime **test double** passes after fixes
  (25–31 checks per run, guest clock skew ±5 s, forged commands, the 120 s deadline,
  leave/cleanup). It has **not** been run against real Supabase or with two signed-in players.
  The status stays a **peer-validated preview**.

Fixed (see CHANGELOG.md for the full list): stingers missing after the first match;
index.html track 404; a broken file mislabelled "blocked"; the sting overlapping the menu
theme; a guest never seated (subscribe race); clock-skew loss of guest edits (now an
ownership merge plus per-sender revs); mid-match leave handling; AI takeover of a leaver's
match; guest HUD seat inversion; local timeout racing remote commands; the 3D camera rotated
90°; the classic board drawn under the canvas; the WebGL loop drawing while hidden or idle; a
518 px phone layout. The battle hand now uses the approved frames.

Proposals awaiting owner approval (**nothing applied, nothing deployed**):
- `docs/proposals/SERVER_AUTHORITATIVE_MULTIPLAYER.md` (+ `supabase/drafts/0003_matches.DRAFT.sql`)
- `docs/proposals/CLOUD_ECONOMY_SYNC.md` (+ `supabase/drafts/0004_economy.DRAFT.sql`)
- `docs/RELIC_FRAME_REQUEST.md` (the asset spec; no frame was made)

Tests: `npm test` 179/179, `npm run check` 179/179.

Known limits and new findings:
- Online hands are seed-derivable; the lobby text now says so.
- There is no reconnection.
- The guest plays from the far side (TODO MP-002).
- The classic CSS-3D board is slow under software compositing (TODO ARENA-3D).
- `supabase-js@2` is imported unpinned from jsDelivr (a floating major). Consider pinning an
  exact version.

Next three executable tasks:
1. Get this commit onto origin/main. Then, on the live site in a real browser: hard-refresh,
   listen for menu/battle/stinger audio, open devtools, and confirm the 3D board orientation
   and hand frames.
2. Run `tools/browser-checks/lobby-e2e.cjs` logic by hand against real Supabase with two
   devices (or two browser profiles). Watch for the subscribe/seat fix and the leave notice.
3. Owner decisions on the two proposals (identity choice, import cap). After that, the
   approved migration work.

## Latest session — 2026-10-29 · Full 3D battlefield + Deck Builder + Shop + Online Lobby preview

**Working tree (uncommitted at handoff-write time):** new `src/render/arena3d.js`,
`src/render/approved-frame.js`, `src/game/decks.js`, `src/game/economy.js`, `src/game/lobby.js`,
`src/net/online.js`, `src/ui/systems.js`, new `tests/decks.test.js`, `tests/economy.test.js`,
`tests/lobby.test.js`, `tests/frames.test.js`, `tests/arena3d.test.js`; edits to `src/main.js`,
`src/ui/fields.js`, `src/net/profile.js`, `index.html`, `styles.css`, `tests/terrain.test.js`, and
the canonical docs (`AI_INSTRUCTIONS.md`, `GAME_RULES.md`, `PROJECT_BRIEF.md`,
`TECHNICAL_ARCHITECTURE.md`, `ART_BIBLE.md`, `CARD_DESIGN_GUIDE.md`, `CardFrames/FRAME_DIRECTIVE.md`,
`docs/ARENA_SYSTEM.md`, `docs/CARD_FRAMES.md`, `docs/IMPLEMENTATION_PROMPT.md`,
`docs/UNIT_VISUAL_DESIGNS.md`, `docs/VOXEL_ART_BIBLE.md`, `docs/MECHANIC_ADAPTATION_MATRIX.md`,
`README.md`, `ROADMAP.md`, `TODO.md`, `CHANGELOG.md`, `docs/IMPLEMENTATION_LOG.md`).

What changed (no balance changes; `GAME_RULES.md` stayed authoritative):

1. **Canonical field layout (Phase 1).** Per seat: 4 Vessel slots (= deployment cap), 4 Relic
   sockets (= Relic cap), a 4-slot Action staging row that is a VIEW of the first four Action cards
   in hand (Actions are never a zone; they resolve hand → discard), 1 engine-owned discard pile.
   Card geometry 214:300 from the approved frames; `Cards/EXAMPLE.jpg` is composition reference
   only. Relics: no approved dedicated frame — neutral "RELIC FRAME PENDING" presentation.
2. **Three.js 3D arena** (`arena3d.js`, CDN ES module, no build step): 5x5 tiles from `terrain.js`,
   voxel Vessels via `modelFor`, field platforms, discard stacks, label sprites, raycast picking,
   drag-orbit, desktop camera [0,8.5,10.5], mobile <700px [0,13.5,5.5]. CSS-3D board remains as
   fallback + accessible grid behind a toggle; WebGL failure leaves the game playable with notice.
3. **Deck Builder** (decks.js + systems.js): create/edit/save/duplicate/rename/delete, search/sort/
   filter, composition counts, precise validation errors, ownership-aware adds, active-deck gating
   of match start. Starter profile seeds a legal 40-card "Starter Lattice" deck + bound collection.
4. **Shop** (economy.js + systems.js): local-profile only. New profiles 300 Lattice Shards; pack 300
   = exactly 5 Common + 1 Rare-or-better (Unranked rates 90/9/1); Singles 60/100/240/600/1200;
   dissolution 10/15/40/100/200, starter copies bound, dissolution blocked if it breaks a saved
   deck, purchases idempotent by operation id. Cloud sync needs a migration — tracked as blocked.
5. **Online Lobby preview** (lobby.js + online.js + systems.js): Supabase Realtime broadcast rooms,
   6-char codes, readiness, deck selection, envelope validation (seat/seq/command-id) then engine
   application, desync logged honestly. **NOT server-authoritative** — authoritative Edge Functions
   are BLOCKED pending owner approval + database migration (repo rule: no migrations/provisioning
   without separate approval). Online matches grant no rewards/rank/stats; hands never broadcast
   (shared seed, local shuffle). Two-browser E2E NOT yet done — do not claim multiplayer operational.

Checks actually run: `npm test` 149/149 (baseline 129); local servers on 8000 (root) and 8001
(`/veylattice` subpath) with curl 200s; browser check outcome recorded in CHANGELOG.md once known.
One review fix: arena `onUnit` now resolves `ui.match` at click time (was capturing mount-time match).

Soundtrack addendum (same session, after the owner chose push-first/live-verify at 09:56
EDT): `src/audio/soundtrack.js` (manifest + manager), profile audio settings, main.js
view/result wiring, settings controls, and `tests/audio.test.js` (15 tests) are implemented.
UPDATE same session: origin commit f51cec5 ("music") supplied all six tracks mid-session;
the tree was rebased onto it (clean) and the manifest now names them (ffprobe-verified MP3,
decode-clean; stingers 12.4/11.0 s, backgrounds 138–174 s). The earlier "no files" status is
superseded — do NOT repeat it. Audible browser playback still awaits live verification.
Final suite at handoff time: 164/164 (`npm test` and `npm run check`).

Live verification 2026-10-29 (10:11–10:27 EDT, public site, no sign-in/purchase): NEW build
confirmed live — Decks/Shop/Lobby tabs, Starter Lattice 40 cards (20V/16A/4R) LEGAL+ACTIVE,
Shop 300 Lattice Shards with Buy pack button (not clicked), lobby peer-preview disclaimer,
Audio controls (mute + 100/80/80 sliders, "Now playing: menu."), 3D canvas + 5×5/25-tile board
in a Practice match, hand-card selection behaving. NOT verified: console output (devtools
would not open — zero console errors NOT claimed) and audible music (page reports playing,
no audible confirmation from the remote browser). Remote main: ab35232 (pushed via GitHub
Data API; plain git push cannot prompt in this shell).

Next three executable tasks: (1) two-browser lobby E2E verification; (2) server-authoritative
migration proposal for owner approval (Edge Functions + tables); (3) battle-hand approved-frame
migration + dedicated Relic frame request, and mobile WebGL performance measurement.

## Latest session — GRID-002 / ART-002 (5x5 arena, generated card art, AI legality fix)

**Working tree:** new `src/render/illustration.js` and `tests/illustration.test.js`; edits to
`src/game/constants.js`, `src/game/ai.js`, `src/main.js`, `src/render/terrain.js`, `styles.css`,
`index.html`, `tests/models.test.js`, `tests/engine.test.js`, `tests/cards.test.js`,
`tests/keywords.test.js`, `tests/match.test.js`, docs and screenshots.

What changed:

1. **Board is 5x5 (25 tiles).** `BOARD_SIZE = 5`, `DEPLOYMENT_ROWS = 2`: rows 0-1 opponent, row 2
   contested, rows 3-4 player. `enemyHomeRow`/`deploymentBounds` accept size overrides and
   `deploymentBounds` throws on impossible geometry; new `rowOwner(y)` drives the UI tints so no
   renderer hardcodes a row. `terrain.js` throws at import if its map and `BOARD_SIZE` disagree, the
   CSS grid uses `--grid` written from `BOARD_SIZE`, and the arena label is generated.
2. **Generated card art.** `illustrationSvg(card)` projects the card's canonical voxel model with a
   three-quarter camera, shades faces against a fixed key light with material responses, painter-sorts
   across the whole figure, and stages it in a seeded element environment (ridges, haze, ground,
   summoning ring, light shaft, foreground rocks/grass, contact shadow, rarity arcs, motes, vignette).
   Actions/Relics get emblems keyed to `effect.kind`. Memoised markup and data URIs.
3. **Art surfaced everywhere.** Hand cards (full-bleed layer + directional scrim), the command-panel
   inspector (full illustration), and the roster stage (same scene without the figure, behind the live
   rotatable model).
4. **AI legality fix.** `buildCandidates` now skips attack plans for a unit with `hasAttacked` and move
   plans for `hasMoved`; `attacksFromCell` alone could propose an illegal move+attack. Regression test
   added; 12 seeded AI-vs-AI matches now submit zero rejected commands.

Checks actually run:

- `npm test` → **122/122 pass, 0 fail** (~0.9 s), including the new `tests/illustration.test.js` (8) and
  the parameterised-geometry test.
- Seeded AI-vs-AI harness over 12 seeds: every match reached `phase: over` in 16-38 turns, both seats
  winning, **0 engine rejections** (the same harness reported 1-2 per match before the fix).
- Browser (CDP, 1440x950 and 390x844) on `http://127.0.0.1:8123/`: 5x5 board with correct
  opponent/contested/home tints and ten legal summon tiles; 60 roster cards with generated scenes; hand
  art legible at 138x84 with no text clipping (all six cards `scrollHeight 82 <= 84`); Vessel and Action
  inspector art; **zero console errors, zero failed art requests**.

Not claimed: the world is CSS-3D, not WebGL — no GPU lighting pass, no shadow map, shadows are painted
contact ellipses. Card art is procedural voxel rendering, not painted illustration. Only one arena
layout ships. Nothing was deployed in this session.

## Previous session — CONTENT-001 (compliance audit, 60 Vessels, 30 Actions, 12 Relics)

**Working tree:** new `docs/COMPLIANCE_AUDIT.md`, `src/cards/manifest.json`, `src/cards/expansion-set.json`,
`src/render/vessels/blueprints.js`, `tests/keywords.test.js`; edits to `constants.js`, `content.js`,
`engine.js`, `ai.js`, the five element model files, `main.js`, `index.html`, `styles.css`, tests, docs
and screenshots. `src/net/` and the database are untouched.

What changed:

1. **Audit.** 33 rows covering every system in the directive, each with code evidence, a status and a
   required action. Root causes recorded: roster size hardcoded in tests/copy; data (arenas, bonds)
   logged as progress before a resolver existed; LAYOUT-001 never committed.
2. **Content pipeline.** `src/cards/manifest.json` (schema v2) is the single list of sets. The app and
   `tests/support.js` both load it, so adding a set file requires no loader edit.
3. **Pool.** 60 Vessels (12 per element; 42 new), 30 Actions (22 new), 12 Relics (8 new) = **102 cards**.
   New Action kinds: `nexusHeal`, `drain`, `stun`, `ready`, `revive`, `flux`; new Relic auras:
   `wardAura`, `swiftAura`, `drawAura`; new keywords: `swift`, `stalwart`, `deathrattleDraw`.
   `EFFECT_TARGETING` validates each kind's target mode.
4. **Models.** Five parametric rigs (humanoid with a separate robe body plan, beast, construct, drake,
   spirit) configured 42 times. 1,660 new boxes; **2,388 total**, 30–59 each, no duplicate silhouettes.
   The original 18 models are unchanged.
5. **Practice deck.** Curated to 40 cards (20 Vessels across all elements, 8 Actions ×2, 4 Relics)
   because the pool is now larger than a legal deck. The UI passes a seeded RNG, so each match deals a
   fresh selection and every Vessel is reachable; the no-RNG call used by tests is deterministic.
6. **UI.** New effect text, keyword badges, 60-Vessel copy, hand-name wrapping; manifest loading.

Checks: `npm test` → **112/112 pass**. Browser, fresh incognito at 1440×950 on an existing local static
server: roster **60 cards / 2,388 boxes** with zero console errors; keyword text rendered; practice
match loaded a 40-card deck with an expansion Relic in hand; turn-3 summon of *Lantern of the Lost
Choir* paid 3 Flux, filled Vessel zone 1, rendered a 32-box `vessel_lantern_lost_choir` model.
Screenshots: `screenshots/roster-expansion.png`, `screenshots/roster-new-vessels.png`.

Not claimed: new-card balance is unproven; several humanoids share a rig and look related at tile size;
mobile was not re-checked with the larger hand/roster; no collection, deck builder, shop, arena, bond or
lobby work happened. The suite does not test that every one of the 60 models looks distinct, only that
its geometry/silhouette signature is unique.

Next: ECON-001 (local-first collection, Aether Shards, six-card packs, dissolution), DECK-001 (deck
builder + three archetypes), ARENA-002 (selectable arenas, then one rules-bearing arena).

## LAYOUT-001 (previous session — war table, card fields, Nexus target)

**Working tree, not yet committed:** `index.html`, new `battlefield.css`, `styles.css`, `src/main.js`,
new `src/ui/fields.js`, `src/game/engine.js`, `src/game/constants.js`, `tests/fields.test.js`,
`tests/cards.test.js`, docs and screenshots. `src/cards/` and card stats are untouched.

What changed:

1. The battle screen is one table: opponent HUD → four back-row Relic zones → four front-row Vessel
   zones → 7×7 arena → player four Vessel zones → four Relic zones → player console + hand. New
   `battlefield.css`; the battle view trims the marketing header with `body[data-view="battle"]`.
2. `src/ui/fields.js` projects four Vessel + four Relic slots per seat from match state, with stable
   keys and counts; the DOM holds no occupancy.
3. `handleSummon` records `unit.fieldSlot` (lowest free of four) via exported `nextFieldSlot`; movement
   and death do not reshuffle zones.
4. `MAX_RELICS_PER_SEAT` is **4**, one per back-row zone; `GAME_RULES.md` updated. Actions still resolve
   from hand and never occupy a zone.
5. Vessel card → four zones + 21 legal tiles highlight; tile click summons into the next zone; filled
   Vessel zone selects the unit; Relic card → only the next free Action socket glows; wrong socket
   explains the next one; filled Relic reads its effect.
6. The opponent's HUD vitality block is `#enemy-nexus` (strike target); the player block mirrors it.
   Two 26 px nexus bars were removed. Existing FX ids still resolve.
7. Terrain gained deterministic per-tile tone, larger props, restored ground shadows and 2 px seams.

Checks: `npm test` → **97/97 pass**. Browser (fresh incognito, local static server) at 1440×950,
1024×768 and 390×844: eight zones per seat, summon paid 7 Flux and filled zone 1, Ember Lens filled
Action zone 1 (`Relics 1/4`), zone selection highlighted the board, stale selection cleared after a
defeat, zero console errors, no horizontal overflow. Nexus strike on a live undefended Nexus was not
reached in the browser.

Next: LAYOUT-002 (relic readout + keyboard grid navigation), ART-002 (arena scenery at 59 px tiles),
then M2-001/M2-002 remainder.

## ART-001 (voxel art pass, articulated rigs, arena diorama)

`src/game/` was **not modified**. Rules, card data and engine behaviour are unchanged; this was a
presentation and content-authoring session.

1. **Renderer** (`src/render/voxel.js`) — per-material face shading computed in JS instead of CSS
   brightness filters; per-face borders removed (they ate 2–3 px voxels); boxes carry an animation
   group and optional rotation; groups rotate around authored pivots (wrist, shoulder, neck, tail
   root); idle languages (`breathe`, `heavy`, `hover`, `sway`, `none`) and combat hooks
   (`fx-lunge` swings the weapon/head/tail, `fx-hit` flinches, `fx-spawn` rises).
2. **Roster** — 18 models rewritten into `src/render/vessels/{fire,water,earth,metal,wood}.js` with
   shared authoring helpers in `_parts.js`: **728 boxes**, 30–59 per Vessel, ≥4 groups and ≥4
   materials each. Element palettes now define a full material set (ceramic, cloth, leather, bark,
   stone, brass, bone, crystal, glass, void), so identity survives greyscale.
3. **Arena** (`src/render/terrain.js`, new) — authored point-symmetric 7×7 ground map (grass, moss,
   ruins, shallows, crystal), per-kind elevation, props at the back edge of tiles, stone plinth,
   corner posts, per-tile thickness, unit contact shadows, key light, vignette, 7° board tilt. Every
   kind is `rules: "decorative"`; the caption says so; a test fails if the engine or AI imports it.
4. **Showcase** — roster models are larger, draggable and arrow-key rotatable, and show role, stats,
   flavour and design notes. The menu shows the four clearest silhouettes.
5. **Docs** — `docs/VOXEL_ART_BIBLE.md` gained an implementation-status section;
   `docs/UNIT_VISUAL_DESIGNS.md` gained a per-model table (boxes, groups, materials, height, idle,
   acceptance notes).

### Defects found and fixed this session

- `boxElement` assumed a palette; prop models carry raw hex colours and threw on every board render.
  Palettes now default to `{}` with a hex fallback.
- The board lost its width cap when wrapped in `.board-stage` and stretched across the layout; it is
  now `min(100%, 600px)`, centred, with clearance for the plinth.
- Per-face 1 px borders made small voxels unreadable; removed in favour of material face tones.
- The Wyrm's neck/head were buried inside its coil; rebuilt as coil + S-body + head above the ring.

### Still weak (do not describe as finished)

- The Wyrm of the Drowned Vault and the Verdant Colossus read worst at tile size; both need another
  authored pass (head/coil separation, canopy value break).
- Phone tiles (43 px) favour stats; models are colour + shape only there.

## Previous session — S-M2-D (menu, onboarding, board readability, 18 voxel models)

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
- 5×5 board (25 tiles), 30 Vitality, opening 5 + mandatory draw, Flux 1→10 with refill/expiry, one summon per turn,
  four-Vessel cap, deployment rows, summons unready, orthogonal BFS movement, one move and one attack
  per ready Vessel, persistent Guard (`maxGuard` separate), simultaneous eligible retaliation,
  defeat/discard, Nexus strikes gated on the enemy home row **and** an undefended opponent, escalating
  fatigue, victory/surrender/simultaneous-lethal draw, once-per-turn 1-Flux mulligan, 120-second
  deadline.
- Actions and Relics: closed `EFFECT_KINDS` vocabulary with per-kind scope, ranges and required
  targeting mode, frozen at catalog build. 19 effect kinds are implemented and each is used by a
  shipped card. Relic auras (attack, armour, mend, guard, ward, swift, dawn draw) resolve in one
  `relicAuras()` helper used by attacks, Nexus mitigation, dawn mend, summons, previews and the AI.
- Vessel keywords (`swift`, `stalwart`, `deathrattleDraw`) are validated, stored on the unit and
  honoured by summon, defeat cleanup and readying; `stun` cancels exactly one activation.

### Tactical AI — `src/game/ai.js`

- `buildObservation(state, seat)` → own hand + public board + opponent **counts only**.
- `buildCandidates(state, seat, …)` → engine-derived plans, including `playAction` / `playRelic`.
- `choosePlan(candidates, observation, …)` → pure, bounded by an injected clock, returns
  `{ commands, kind, score, considered, truncated }`.
- Four difficulties (8/20/45/120 ms) and three archetypes (`vanguard`/`warden`/`conductor`). Difficulty
  changes decision quality only — never resources.
- Seat 1 is the human, Seat 2 the AI; the HUD drives the AI through `applyCommand` only.

### Presentation — `src/render/`, `src/ui/`, `src/main.js`

- `src/render/models.js`: palettes (full material set per element), model assembly, `modelFor()`.
- `src/render/vessels/*.js`: 65 Vessel definitions (2,890 boxes): the original 18 hand-authored, the
  expansion 42 configured through `blueprints.js` (humanoid/robe, beast, construct, drake, spirit).
- `src/render/voxel.js`: CSS-3D builder; three shaded faces per box; pivots and angled parts; no
  dependencies, no WebGL.
- `src/render/terrain.js`: decorative arena map + prop models; must never be imported by `src/game/`.
  Throws at import if the map size disagrees with `BOARD_SIZE`.
- `src/render/illustration.js`: generated card art (SVG) projected from the same voxel models.
- `src/ui/tutorial.js`: pure guided-match state machine (`TUTORIAL_STEPS`, `advanceTutorial`,
  `skipTutorial`, `tutorialStep`).
- `src/render/card-face.js`: printed faces (layout, emblems, stat medallions, text panel).
- `src/render/scenery.js`: the five element environments behind every figure.
- `tools/build-cards.mjs`: writes `Cards/` (faces, art layers, frames, manifest, QA, contact sheet).
- `src/main.js`: menu/guide/roster/library/battle/settings views, board projection, ground/prop rendering,
  roster spin, prompts, event-driven combat animation (`playEvents(events, before)`), AI pacing.

### Profiles and persistence — `src/net/`

- Local-first profile in `localStorage`, best-effort Supabase sync with an honest state string.
- Recovery-code accounts (`src/net/account.js` + `supabase/migrations/0002_accounts.sql`); see
  `docs/ACCOUNTS.md`. Dedicated Supabase project `jjtfnduodxtulxvviasf`; no table grants, RPC-only.

### Card art — `src/render/illustration.js`

- `illustrationSvg(card)` / `illustrationDataUri(card)`: memoised SVG (and data URI) per card; a
  Vessel's figure is projected from `VOXEL_MODELS` with a fixed camera and key light, so the card art
  and the playable model share one definition. `{ figure: false }` returns the environment only, which
  is what the roster stage uses behind the live model.
- `illustrationSource(card)`: the join the tests assert (model id, part count, palette, effect kind).
- Actions and Relics render an emblem chosen by `effect.kind`, in their element's environment.

### Tests — 122/122 passing

`npm test` → 122 pass, 0 fail. Files: `tests/` `elemental`, `content`, `cards`, `keywords`, `engine`,
`match`, `ai`, `profile`, `models`, `terrain`, `tutorial`, `fields`, `illustration`, plus `support.js`
(loads the set manifest).

## Not implemented (do not claim otherwise)

- The Card Library is browse-only: no collection ownership, deck builder, shop, packs, rewards, ranked,
  arenas, Lore Bonds, Forge or Codex.
- No online play, lobbies or server-authoritative matches. Practice is local only.
- **No terrain rules.** Zones are visual (deployment / contested); the arena ground map is decorative
  and declares that in code. Nothing on the board modifies combat.
- No set/activate Action back-row zones; no rule specifies them, so only the four Relic slots exist.
- No Google/Discord sign-in (providers disabled, credentials unavailable — see `docs/ACCOUNTS.md`).
- No rate limiting on account/profile creation (TODO M2-005).
- Models are CSS-3D boxes: no GLB, no GPU lighting or dynamic shadows, no skeletal deformation. Limbs
  are rigid voxel groups rotating around authored pivots, which is why attacks do swing the weapon and
  head, but there are no per-frame skinned poses.
- No keyboard grid traversal (TODO M7-005). No in-match pause overlay.
- No WebGL renderer: the world is CSS-3D (real boxes, perspective, per-face shading, painted contact
  shadows). GPU lighting and cast shadows are not implemented.
- Card art is procedurally generated voxel rendering; there are no bespoke per-card illustrations,
  poses or effect flourishes.
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
npm run check                             # node --check on core modules + 122 tests
npm test                                  # 129 tests, Node built-in runner
node --check src/main.js src/game/ai.js   # syntax sanity
python -m http.server 8123 --bind 127.0.0.1   # then http://127.0.0.1:8123/
```

Serve from the repository root. All asset paths are relative, so `/veylattice/` works unchanged.
Previously used preview servers: 8123/8124/8130. Check ownership before killing anything.

## ART-003 verified baseline (2026-10-28)

What changed and how it was checked:

| Change | Evidence |
|---|---|
| Clockwork Hydra rebuilt on the `serpent` rig; Ironstep Sentinel kept on the `slim` construct frame with an antenna crest | `src/render/vessels/metal.js`; `node --test tests/models.test.js` passes; silhouette report worst pair for the two is 0.485, down from a 0.94 cluster |
| All 42 rig Vessels given individual structure (stance, robe, arms, hunch, wings, tail, leg/head count, shell, posture, frame, crest) | `src/render/vessels/{fire,water,earth,metal,wood}.js`; `node tools/silhouette-report.mjs` — worst pair 0.895, none ≥0.90 |
| Rig heads given a neck column, pale face plate and dark jaw so they read at tile size | `blueprints.js`; card art re-rendered and inspected in the browser |
| `quad`, `tower`, `wraith`, `crowned` and `core` frames gained authored detail to clear the 30-box floor | `node --test tests/models.test.js` |
| Card stat medallions re-zoned; numbers drawn halo + face; labels moved to their own plates | `Cards/cards/*.svg` re-rendered, inspected at 1086x2048 |
| Flux cost centred with lining figures (`NUMERIC`, `'lnum'`) and a `0.34 em` cap-height offset | Chrome canvas metrics: Georgia digits descend 0.18 em, Cambria/Times 0.01 em; cost ink centre measured at the medallion centre |
| Vessel art target enlarged to 284x188 art units | `tests/illustration.test.js`; 102 cards rebuilt |

Whole suite: `npm test` — 129/129 pass. Card files: `node tools/build-cards.mjs` — 102 faces,
0 missing models, 0 missing rules text.

Not done: the beast rig still favours a deep barrel body, so a lean predator reads heavier than its
brief; four slim humanoid soldiers sit at 0.88-0.895 IoU because they share a mass and differ by
stance and reach. Neither is a palette fix: they need new geometry, and neither is hidden in the docs as
finished.

## ART-005 verified baseline (2026-10-28)

**Pool is now 65 Vessels / 30 Actions / 12 Relics = 107 cards.** Five human Vessels, one per element,
were added to `src/cards/expansion-set.json` with models in `src/render/vessels/*.js`:

| Card | Element | Stats | Keyword | Equipment |
|---|---|---|---|---|
| Oathstone Knight | earth | 4/7, cost 5 | `stalwart` | bent stance, sword, tower shield, plume |
| Ironvow Paladin | metal | 6/7, cost 6 | `stalwart` | axe (no shield), long cloak, plume |
| Tidewall Sentinel | water | 3/5, cost 3 | `stalwart` | spear, shield, no cape |
| Cinderwatch Knight | fire | 5/4, cost 4 | `swift` | axe, carried brazier, spikes |
| Thornmarch Ranger | wood | 2/3, cost 2 | `swift` | hood, longbow, feather |

**Humanoid rig additions.** `robe: "split"` (short flared tabard, belt, visible boots), weapon `wire`
(horizontal taut blade), `pack` (back frame, chain, bucket). The four formerly interchangeable slim
duelists now differ by body plan. Pauldron depth is capped (`1.55 + 0.55 × pad`) so heavy shoulders
stop reading as boards.

**Verified.** `node tools/silhouette-report.mjs`: worst roster pair 0.877, **no pair ≥ 0.90**; the four
slim duelists 0.758–0.848 (were 0.845–0.895); new knights 0.815–0.874. `npm test` 129/129 (test counts
updated to 65/107/13-per-element). `node tools/build-cards.mjs` 107 faces, 0 missing models,
0 missing rules, `Cards/` rebuilt. Browser: the five new faces and their art layers were captured
(`screenshots/knights-wave.png`, `screenshots/knight-art.png`); an orthographic box-data sheet
(`screenshots/humanoid-sheet.png`) caught the pauldron problem before shipping.

**Not done.** New cards have no ownership, deck-construction or economy support. Balance is untested.
Robed casters remain the closest cluster (0.86–0.877).

## ART-004 verified baseline (2026-10-28)

**What changed.** The beast rig now has two body plans. `build: "lean"` is a separate
construction, not a rescaled heavy beast: limbs are stacked as fractions of the belly line (so any
posture keeps contact with the body), the ribcage is deep, narrow and set forward over the forelegs,
the waist tucks up and narrows behind it, the back arches over the chest, the neck reaches forward,
and the tail counterbalances. Posture decides stature: `low` stands level, `prowl` drops the chest and
raises the haunches, `rear` rises on the hind legs with the forelimbs raised as clawed paws.

**Skull.** `beastHead()` now takes `skull: "blunt" | "wedge"`. The wedge head is built as separate
masses — cranium, brow ridge, long low muzzle, dark nose, dropped under-jaw, fangs, deep-set eyes —
because one long box read as a plank. Horn bases follow the plan, so ram/antler/spike horns attach to
the cranium instead of the muzzle.

**Who uses it.** `brine_hound` (level, fan tail), `bramble_stalker` (`prowl`, six legs, spike horn),
`glass_horn_charger` (`rear`, ram horn). `slatehorn_ram`, `mossback_warden` and `antlered_bulwark` keep
the heavy plan deliberately.

**Verified.** `node tools/silhouette-report.mjs`: lean vs heavy 0.346–0.620 IoU; the three lean
Vessels 0.415–0.590 apart; worst pair in the roster still 0.895 (`reef_duelist` vs
`quarry_engineer`). `npm test` 129/129. `node tools/build-cards.mjs` 102 faces, 0 missing models,
0 missing rules, and `Cards/` was rebuilt — `tests/card-files.test.js` compares the shipped SVG to a
fresh render, so a model edit without a rebuild fails the suite (it did, and now passes).

**Not re-screenshot in the browser.** Chromium capture was unavailable ("window is minimized or
covered"), so the CSS-3D in-game view was not re-captured. Model geometry was inspected by projecting
the box data orthographically into `screenshots/beast-builds.png`, which is how the floating reared
hind legs and the debris-like rib bars were found and fixed. Do not describe that image as an in-game
screenshot.

## Known risks

- `state.catalog` is cloned per command. At 102 cards this is still fine locally, but a server that
  serialises state per command should send card ids, not the catalog. `structuredClone` is required.
- The 1-Flux opening with a 2-Flux cheapest Vessel makes turns one and two thin. **This is canonical**
  (`GAME_RULES.md`) — the tutorial explains it. Changing it is a balance decision, not a UI fix.
- CSS-3D model cost scales with box count × units on screen. The roster is now 2,388 boxes (30–59 per
  Vessel, 3 DOM faces each); the full roster renders in ~350 ms and 10.8k DOM nodes at 1440×950. Eight
  units on the board plus ~15 props still measures fine, but lazy-render or virtualise the roster
  before raising box counts much further.
- `structuredClone`/`crypto.randomUUID` require a modern browser; there are no polyfills.

## Next three executable steps

1. **Commit and deploy** the working tree (LAYOUT-001, CONTENT-001, GRID-002, ART-002) so
   https://xiondigital.net/veylattice/ stops serving the ART-001 build; deploy is owner-authorized only.
2. **DECK-001** — deck builder over the 60-Vessel pool with canonical validation, ownership checks and
   three named prebuilt archetypes; the curated practice deck is not a substitute.
3. **ECON-001** — local-first collection, Aether Shards, six-card packs (5 Common + 1 Rare) and
   Dissolution, clearly labelled as demo data until trusted settlement exists; prepare the migration
   but do not apply it without owner approval.

## End-of-session requirement

Commit coherent change sets, update `CHANGELOG.md` with actual changes and observed test output,
`TODO.md` with statuses and evidence, this handoff with a fresh verified baseline, and append to
`docs/IMPLEMENTATION_LOG.md`. Include the commit hash you actually created. Never claim completion from
a plan, a placeholder, or an unrun test.

## ART-006 (uncommitted, undeployed)

- Human Vessels were a single armoured body in five colours; they now have per-Vessel face
  proportions, hair, beards, skin tones, shoes-and-cloth bodies, garment layers, kit and six
  weapon-arm poses. Files: `src/render/vessels/blueprints.js` (human head, `humanArms`,
  `ARM_POSES`, `humanHands`, garment/kit layers, sword/axe/shield geometry), the five element
  files for the respecified humans.
- The arena is a stepped voxel diorama: `src/render/terrain.js` was rewritten (layout, surface
  heights, 16 prop models, ~50 placements). Block side walls, voxel grain, prop shadows and
  board-scale units live in `styles.css`, with arena overrides in `battlefield.css`.
- Three presentation defects fixed and worth remembering: a tile side wall needs
  `rotateX(calc(var(--tilt) * -1))` (not -90deg) to be vertical; board units need their own
  `--u-base` (`.cell .model-stage`); and `.unit` must stay `transform-style: flat` or Chrome paints
  a dark backdrop over the tile.
- Checks: `npm test` 129/129; `node tools/build-cards.mjs` (107 cards, 0 gaps);
  `node tools/silhouette-report.mjs 0.84` clean. Screenshots: `screenshots/arena-voxel-diorama.png`,
  `screenshots/humans-voxel.png`, `screenshots/mobile.png`.
- Still open: human weapon silhouettes are simple; robe-wearers remain the closest cluster; the
  arena has one authored layout; combat FX were not re-reviewed on the new terrain.
