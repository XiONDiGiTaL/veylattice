# Implementation TODO

Read with ROADMAP.md and AI_HANDOFF.md. Status values: TODO, IN_PROGRESS, BLOCKED, DONE, DEFERRED. Only tasks whose acceptance criteria were met and whose checks actually ran are marked DONE. Split large tasks into stable child IDs when work starts; preserve parent scope and history.

## Completed documentation

- DOC-001 | DONE | Expanded specifications and 18 unique visual briefs. Evidence: commit b42c38ada7eae2177d8e98cfd69ce16ed70b9670; documentation completion only.
- DOC-002 | DONE | Supplied transcript and visual identity reconciliation. Evidence: commit 33c4b4885cebcd2c5b70135a1a1c64cdb8170931; documentation completion only.
- TRACK-001 | DONE | Define changelog, TODO and handoff files and require them in AI_INSTRUCTIONS.md. Evidence: the containing documentation change; no runtime behavior changed or tested.
- DOC-003 | DONE | Reference research and adaptation matrix required by the session directive. Evidence: docs/REFERENCE_RESEARCH.md, docs/MECHANIC_ADAPTATION_MATRIX.md, docs/IMPLEMENTATION_LOG.md. Recording REA's provider timeout is an observed limitation, not a completed analysis of the reference bundle.

## M1 - Working offline core (P0)

### M1-001 | DONE | Audit and establish test harness
Dependencies: none. Paths: src/game/, tests/, package.json.
Acceptance met: current behavior versus GAME_RULES.md recorded; Node built-in test harness runnable (`node --test "tests/*.test.js"`); static HTTP startup verified at repository root and under `/Veylattice/`.
Evidence: docs/IMPLEMENTATION_LOG.md session S-M1-A; 37/37 tests pass; browser smoke checks recorded. No gameplay tests existed before this session.

### M1-002 | DONE | Extract deterministic command/state engine
Depends on M1-001. Paths: src/game/engine.js, src/game/content.js, src/game/constants.js, src/main.js.
Acceptance met: DOM-free reducer, frozen card definitions, injected RNG and clock, validated ownership/targets/costs/versions, structured error codes; tests prove rejected commands return the unmodified state (including reference equality on representative paths).
Evidence: `stale, unknown and illegally-shaped commands never mutate state`; `catalog definitions are never mutated by play`.

### M1-003 | DONE | Movement, combat and victory
Depends on M1-002. Paths: src/game/engine.js, src/game/elemental-rules.js, tests/.
Acceptance met: legal orthogonal pathing with occupied-cell blocking; persistent Guard; eligible simultaneous retaliation; defeat/discard; Nexus direct attacks with home-row and undefended gates; fatigue, win, surrender and simultaneous-lethal draw; all 25 element pairs tested.
Evidence: 37/37 tests pass, including `combat removes Guard persistently instead of using a threshold`, `elemental advantage applies to attack and retaliation independently`, `Nexus direct attacks require the enemy home row and an empty enemy board`.

### M1-004 | DONE | Turns, draw, Flux, summon and mulligan
Depends on M1-002. Paths: src/game/engine.js, tests/.
Acceptance met: opening five cards plus first-turn draw; Flux 1→10 with refill and expiry; one normal summon, four-Vessel cap, deployment rows, unready entry; zero-cost cards still require one available Flux; once-per-turn one-Flux mulligan with atomic rejection paths.
Evidence: engine tests listed in docs/IMPLEMENTATION_LOG.md.

### M1-005 | DONE | HUD, 120-second deadline and full match
Depends on M1-003, M1-004. Paths: index.html, styles.css, src/main.js, tests/.
Acceptance met: visible deadline timer synchronized to `deadlineAt`; legal summon/move/attack highlighting; below-unit Attack and current/maximum Guard strip; selection panel with card and Vessel details; deadline auto-pass preserves committed actions (engine tests); complete match reachable (integration test); browser smoke at root and `/Veylattice/`.
Evidence: browser session in docs/IMPLEMENTATION_LOG.md (summon, move, attack with retaliation, defeat/discard, mulligan; no console errors). Real-time expiry was not waited out in the browser — covered by `commands at or after the deadline are rejected and the turn is passed`.

### M1-006 | DONE | Hot-seat AI replacement
Depends on M2-003. Paths: src/game/ai.js, src/main.js, index.html.
Acceptance met: Seat 2 is played by the tactical AI; the human only ever controls Seat 1; board interactions are disabled while the AI acts; the human hand is the only hand rendered.
Evidence: browser play at `/Veylattice/` (AI summoned, moved, attacked, traded and ended turns across six rounds); headless CDP session recorded 5 units on board with both Nexuses at 30; `preview_logs`/`Runtime.exceptionThrown` produced no console errors.

## M2 - Cards, decks and Practice (P1)

### M2-001 | IN_PROGRESS | Typed effects and Actions/Relics
Depends on M1-003, M1-004. Paths: src/cards/actions-relics.json, src/game/content.js, src/game/engine.js, tests/cards.test.js.
Acceptance: allowlisted effect vocabulary with no executable card code; damage/heal/draw/buff effects; relic auras; tested rejections; remaining families still outstanding.

#### M2-001a | DONE | Action and Relic slice
Acceptance met: closed `EFFECT_KINDS` vocabulary with per-kind scope and numeric ranges validated at catalog build and frozen; 8 Actions (`damage`, `damageAll`, `heal`, `buff`, `draw`, `nexusDamage`) and 4 Relics (`attackAura`, `armorAura`, `mendAura`, `guardAura`); `playAction`/`playRelic` commands behind the same `applyCommand` validator; targets enumerated by `actionTargetsFor` and shared by HUD and AI; two-Relic cap; aura aggregation in one `relicAuras` helper used by attacks, Nexus damage, turn start and summons.
Evidence: 69/69 tests, including elemental Action damage, heal capping, permanent buffs, sweep packets, armour reduction, wrong-side/missing targets, Relic cap, and aura timing on existing and future Vessels.
#### M2-001b | DONE | Expansion effect vocabulary and Vessel keywords
Acceptance met: six new Action kinds (`nexusHeal`, `drain`, `stun`, `ready`, `revive`, `flux`) and three Relic auras (`wardAura`, `swiftAura`, `drawAura`) implemented in the engine with one shared `wardPacket` path; three closed Vessel keywords (`swift`, `stalwart`, `deathrattleDraw`) validated at catalog build and honoured on summon, defeat and readying; every Action kind now has a required targeting mode validated in `content.js`, so an enemy-only effect cannot be printed as `none`. `tests/keywords.test.js` adds 12 tests (stun timing, refresh, revive selection, empty discard, Flux cap and the 1-Flux floor, drain healing, Nexus heal cap, ward minimum 1, swift summons, stalwart + deathrattle, legal-action enumeration, keyword coverage).
Evidence: `npm test` -> 112/112 pass.
Outstanding for full M2-001: a general effect **queue** with explicit ordering and a resolution limit; temporary buff expiry; loop protection; revival onto the board (current `revive` returns the card to hand); tested simultaneous-death ordering.

### M2-002 | IN_PROGRESS | Canonical deck validation and prebuilt decks
Depends on M2-001. Paths: src/cards/, src/game/content.js, tests/content.test.js.
Acceptance: `createMatch` uses `DECK_RULES` (20-40 cards, ≥10 Vessels, ≥5 Actions, ≤3 copies) with the practice exception deleted; at least three validated archetypes; ownership-aware validation remains a backend concern.

#### M2-002a | DONE | Canonical rules enforced, exception removed
Acceptance met: `PRACTICE_DECK_RULES` deleted from constants, engine and tests; `createMatch` defaults to `DECK_RULES`; the practice deck is now a curated 40 cards (20 Vessels spread across all five elements + two copies each of eight Actions + 4 Relics) and validates under the canonical rules; a vessel-only deck is rejected with `Deck needs at least 5 Actions`.
Outstanding: three named, validated prebuilt deck archetypes and a deck-building UI. The 60-Vessel pool is larger than any legal deck, so a curated practice deck is required; it covers every element but not every card.

### CONTENT-001 | DONE | Sixty-Vessel roster, thirty Actions, twelve Relics and a set manifest
Depends on M2-001a, M2-009. Paths: src/cards/expansion-set.json (new), src/cards/manifest.json (new), src/game/content.js, src/game/constants.js, src/render/vessels/blueprints.js (new), src/render/vessels/*.js, tests/content.test.js, tests/models.test.js.
Acceptance met: 60 official Vessels (12 per element; 42 new original designs spanning knights, rogues, mages, priests, artificers, beasts, constructs, drakes and spirits), 30 Actions and 12 Relics; `SUBTYPES` extended for the RPG roster; a manifest loads every set in the app and the tests from one source; content validation rejects unknown/duplicate keywords and effect/targeting mismatches; 42 new models built from five authored anatomical blueprints plus a robe body plan, each with its own proportions, head, weapon, offhand, crest, cape and palette keys; practice deck curated to 40 legal cards, with a seeded fresh selection per practice match so all 60 Vessels are reachable.
Evidence: `npm test` -> 112/112 pass, including 60/12/12 content counts, per-element distribution, unique silhouettes, 30+ boxes / 4+ groups / 4+ materials for every model, and all 19 effect kinds used by shipped cards. Browser (fresh incognito, 1440x950): 60 roster cards / 2,388 voxel boxes render with zero console errors; practice match loaded a 40-card deck, hand showed an expansion Relic, turn 3 summon of *Lantern of the Lost Choir* paid 3 Flux, occupied Vessel zone 1 and rendered 32 boxes with `data-model-id`.
Not claimed: the blueprint rigs share anatomy by design, so several humanoids remain similar in silhouette at tile size; only the robe/armour, gear and proportions separate them. Balance of 42 new cards is unproven. No new bond, arena or custom-card data was added.

### GRID-002 | DONE | Five-by-five arena with configurable geometry
Depends on M1-003, LAYOUT-001. Paths: src/game/constants.js, src/main.js, src/render/terrain.js, styles.css, tests/models.test.js, tests/engine.test.js, tests/terrain.test.js.
Acceptance met: the shipped board is **5x5 (25 tiles)** with two deployment rows per seat and one contested row; every consumer derives from `BOARD_SIZE`/`DEPLOYMENT_ROWS` (`cellIndex`, `inBounds`, `deploymentBounds`, `enemyHomeRow`, `rowOwner`, the terrain map guard, the renderer's zone classes, the CSS `--grid` column count and the arena label); no renderer hardcodes a row number; `deploymentBounds` rejects geometry whose zones would overlap, and the exported helpers accept size/row overrides so an alternative layout is testable; the terrain map throws at load if it does not match the rule grid.
Evidence: `npm test` -> 122/122 pass, including `the board is 5x5 with two 10-tile deployment zones and one contested row`, `grid geometry is parameterised, so an alternative arena is testable without engine edits` and `the arena covers all 25 logical tiles with a known kind`; 12 seeded AI-vs-AI matches all reached a result (16-38 turns, both seats winning); browser at 1440x950 and 390x844 shows five columns, correct opponent/contested/home tints, ten legal summon tiles and zero console errors.
Not claimed: only one arena layout ships. The geometry is parameterised, not player-configurable, and a different size still needs its own terrain map.

### ART-002 | DONE | Generated card art for every card, projected from the playable model
Depends on ART-001, CONTENT-001. Paths: src/render/illustration.js (new), src/main.js, styles.css, tests/illustration.test.js (new).
Acceptance met: all 102 cards render an original full-background SVG illustration; Vessel art is a projection of the **same** `VOXEL_MODELS` entry the battlefield draws (three-quarter camera, per-face key lighting, material responses, painter-sorted across overlapping parts, palette taken from the model); each card gets a seeded element environment (ridges, haze, ground, summoning ring, light shaft, foreground, contact shadow, rarity arcs, motes, vignette); Actions and Relics get emblem scenes keyed to their effect kind; the hand rail, the command-panel inspector and the roster stage all use the same generator, and markup/URIs are memoised.
Evidence: `tests/illustration.test.js` 8/8 pass — every card produces well-formed SVG, no `NaN`/`undefined`/empty fills, each Vessel's art matches its model's part count and declared voxel height and shades from that model's palette, no figure is clipped, no two Vessels share art, Action emblems differ per effect kind, output is deterministic, script-free and under 40 kB. Browser (1440x950, 390x844): 60 roster cards with generated scenes, hand art legible under the scrim, Vessel and Action inspector art, zero console errors, all art requests 200.
Not claimed: the art is stylised voxel rendering, not painted illustration; there are no per-card bespoke compositions, poses or effect flourishes. The world itself is still CSS-3D, not WebGL.

### CARDS-001 | DONE | Printed card collection and in-game Card Library
Depends on ART-002, CONTENT-001. Paths: src/render/card-face.js (new), src/render/scenery.js (new), src/game/card-text.js (new), tools/build-cards.mjs (new), Cards/ (generated), src/main.js, index.html, styles.css, tests/card-files.test.js (new), tests/illustration.test.js.
Acceptance met: 102 finished faces at 1086x2048 (543:1024, the reference proportion) with one shared hierarchy — title, Flux medallion top-right, attribute line, element and subtype emblems, inset art window, Attack/Guard medallions, rules then italic flavour, rarity plate; Actions and Relics print a category band and **no** stat sockets; each Vessel's art is projected from its own model and staged in an element environment (gatehouse, grove, drowned temple, furnace hall, canyon gate) with a single shared value structure; the art canvas is 400x310 to match the window, so scenes are no longer cropped; `Cards/manifest.json`, `Cards/QA.md`, per-card art layers, reusable frames and a contact sheet are generated by one command; the game exposes a Cards tab with category and element filters and a full-face viewer reachable from the library, the roster and the hand.
Evidence: `node tools/build-cards.mjs` -> 102 faces (60 V / 30 A / 12 R), 3.4 MB, 33 kB average, 0 missing flavour, 0 Vessels without a model, 0 cards without rules. `npm test` -> **129/129 pass**, including a new suite that re-generates every face and asserts byte equality with the file on disk, plus manifest coverage, printed name/cost/stat checks, the absence of ATTACK/GUARD on non-units, and no NaN/empty fills. Browser: 1440x950 library shows 102 tiles with no broken images, element filter returns 21 Metal cards, category+element returns 12 Metal Vessels, viewer opens at 343x647 on 390x844, zero console errors.
Not claimed: no deck builder, ownership, pack opening or economy — the library is browse-only. Art is generated voxel sculpture, not painted illustration, and no card's balance has been tested. PNG exports are not produced.

### ART-003 | DONE | Distinct body plans and legible card numerals
Depends on ART-001, ART-002, CARDS-001. Paths: src/render/vessels/blueprints.js, src/render/vessels/{fire,water,earth,metal,wood}.js, src/render/card-face.js, src/render/illustration.js, tools/silhouette-report.mjs (new), docs/VOXEL_ART_BIBLE.md, CARD_DESIGN_GUIDE.md.
Acceptance met: the Clockwork Hydra is a serpent (three coils, three fanned necks, no legs) and no longer shares a body plan with the Ironstep Sentinel (slim construct, piston legs, antenna crest); all 42 rig Vessels set structural axes — stance, robe, second arm pair, hunch, wings, tail, leg count, head count, shell, posture, drake plan, construct frame and crest — instead of only tone/size; rig heads carry a neck column, pale face plate and dark jaw so they read at tile size; every model still clears the 30-box, 4-group, 4-material floor; card Attack/Guard values sit in their own zone below an engraved rule, drawn as a dark halo plus an outlined white face, with labels on plates outside the disc; Flux cost is centred using lining figures and a measured 0.34 em cap-height offset.
Evidence: `node --test tests/models.test.js` passes; `node tools/silhouette-report.mjs` worst pair 0.895 with no pair ≥0.90 (Hydra vs Sentinel 0.485); `npm test` 129/129 pass; `node tools/build-cards.mjs` 102 faces with 0 missing models/rules; card faces and model art inspected in Chromium (1086x2048 and 3.7x art scale). Chrome canvas metrics confirm Georgia's digits descend 0.18 em while Cambria/Times descend 0.01 em, which is why numbers moved off the title face.
Not claimed: the beast rig still gives lean predators a heavy barrel body, and four slim humanoid soldiers remain at 0.88-0.895 IoU because they differ by stance and reach rather than mass. No painted illustration.

### ART-005 | DONE | Humanoids split by body plan, plus a human knight wave
Depends on ART-003, ART-004. Paths: src/render/vessels/blueprints.js (split tabard, `wire`, `pack`, pauldron depth), src/render/vessels/{fire,water,earth,metal,wood}.js, src/cards/expansion-set.json, src/main.js, index.html, Cards/ (rebuilt), docs/UNIT_VISUAL_DESIGNS.md, docs/VOXEL_ART_BIBLE.md, README.md.
Acceptance met: the four slim duelists differ by body plan — a bent low lunge (Reef Duelist), pike plus back pack (Quarry Engineer), split tabard over boots plus tome (Emberwright Adept), horizontal wire-blade (Razorline Duelist); five new human Vessels ship as cards and models, one per element (Oathstone Knight, Ironvow Paladin, Tidewall Sentinel, Cinderwatch Knight, Thornmarch Ranger) with canonical stats, keywords, art and card faces; the pool is 65 Vessels (13 per element), 107 cards; hard-coded "102" copy now reads the catalog.
Evidence: `node tools/silhouette-report.mjs` -> four at 0.758-0.848 (was 0.845-0.895), new knights 0.815-0.874, worst roster pair 0.877, zero pairs >= 0.90; `npm test` -> 129/129; `node tools/build-cards.mjs` -> 107 faces, 0 missing models/rules, files byte-equal to a fresh render; Chromium captures `screenshots/knights-wave.png` and `screenshots/knight-art.png`; orthographic `screenshots/humanoid-sheet.png` caught the board-like pauldrons before shipping.
Not claimed: no ownership, deck builder or economy for the new cards; balance is unproven. The robed casters remain the closest cluster (0.86-0.877) and need authored geometry.

### ART-004 | DONE | Lean predator body plan for the beast rig
Depends on ART-003. Paths: src/render/vessels/blueprints.js (`predator`, `beastHead`), src/render/vessels/{fire,water,wood}.js, docs/VOXEL_ART_BIBLE.md, Cards/ (rebuilt).
Acceptance met: `build: "lean"` is a separate beast plan — proportional long limbs that always meet the belly line, deep narrow ribcage forward, tucked waist, arched back, forward neck, shoulder mass, long tail — not a rescaled heavy beast; stature is posture (`low` / `prowl` / `rear`, the last on hind legs with clawed forelimbs raised); the shared skull helper gained a `skull: "wedge"` head (cranium, brow, long muzzle, dropped jaw, fangs) with horn bases following the plan; `brine_hound`, `bramble_stalker` and `glass_horn_charger` use the plan while the Rams/Warden/Bulwark keep the barrel.
Evidence: `node tools/silhouette-report.mjs` -> lean vs heavy 0.346-0.620 IoU, lean trio 0.415-0.590, worst overall unchanged at 0.895; `npm test` -> 129/129 pass; `node tools/build-cards.mjs` -> 102 faces, 0 missing models/rules; box data rendered orthographically into `screenshots/beast-builds.png` after two render-caught defects (floating reared hind legs, rib bars reading as debris) were fixed.
Not claimed: the heavy plan is intentionally unchanged; the four slim humanoid soldiers are still the closest pair at 0.895 and need authored geometry. Chromium capture was unavailable (window not drawn), so the in-game CSS-3D view of these models was not re-screenshot this session.

### M2-003 | DONE | Legal tactical AI
Depends on M1-005. Paths: src/game/ai.js, src/game/engine.js (`attacksFromCell`, `lineOfSightOnBoard`, `canStrikeNexusFrom`), src/main.js, tests/ai.test.js.
Acceptance met: candidates come only from engine legal-action enumeration; the decision function receives a filtered observation (own hand + public board + opponent counts) and no match state; per-difficulty time budget with best-so-far retention and `truncated` reporting; four difficulties and three weighted archetypes; AI-vs-AI matches complete with zero rejected commands; no rewards are granted.
Evidence: `node --test "tests/*.test.js"` -> 53/53 pass, including `the observation never contains opponent hand or deck contents`, `changing hidden opponent cards cannot change the AI's plan`, `decisions respect the time budget and report truncation`, `an AI-versus-AI match only ever submits accepted commands`, `a veteran finds a lethal move-then-strike line that a novice cannot`.
Not claimed: the AI is not proven balanced; its win rate against humans is unmeasured.

### M2-004 | DONE | Player profile, avatar upload and cloud persistence
Depends on M1-005. Paths: src/net/config.js, src/net/profile.js, src/main.js, index.html, styles.css, supabase/migrations/0001_profiles.sql, tests/profile.test.js.
Acceptance met: editable display name, image avatar (centre-crop, 128 px, WebP/JPEG, SVG rejected), difficulty/archetype selection, motion and coordinate preferences, match record; local-first persistence with best-effort cloud sync and an honest sync state; all restored data re-sanitised; database denies direct table access and requires a per-profile edit token.
Evidence: 53/53 tests; live RPC verification (insert 200, read 200, wrong token 401, correct-token update 200, direct table select 401); avatar upload in a real browser produced a 2.4 KB WebP that was confirmed in the database (`avatar_chars = 2415`).
Not claimed: not an authentication system. No cross-device sign-in, recovery or ownership transfer; no abuse rate limiting (see M2-005).

### M2-005 | TODO | Cloud write abuse guard
Depends on M2-004, M2-006. Paths: supabase/migrations/, src/net/profile.js, src/net/account.js.
Acceptance: bounded profile and account creation per IP/window, plus a load attempt limit for recovery codes, or a captcha-equivalent gate; documented retention/cleanup for abandoned rows; a test or documented manual check demonstrating the guard. Blocker: requires a trusted edge/server component; a browser cannot enforce this.

### M2-006 | DONE | Portable accounts and cross-device progress
Depends on M2-004. Paths: src/net/account.js, src/net/rpc.js, src/net/profile.js, src/main.js, index.html, supabase/migrations/0002_accounts.sql, docs/ACCOUNTS.md.
Acceptance met: server-minted 100-bit recovery code stored only as a SHA-256 digest; create/load/save/rotate RPCs behind RLS with no table grants; signed-in saves replace device saves; signing out leaves the account intact; the UI shows the code, supports copy, rotation and sign-out, and states the provider limitation instead of rendering dead buttons.
Evidence: live database flow verified (direct read 401, wrong code null, wrong-code save 401, correct save ok, rotation invalidates the old code); browser round trip — create, rename to *Lattice Adept*, sign out, rename guest to *Guest Only*, sign back in, *Lattice Adept* restored. Test rows deleted.
Not claimed: no Google/Discord sign-in (providers disabled and credentials unavailable — see docs/ACCOUNTS.md); no throttling on load attempts (see M2-005).

### M2-007 | DONE | Voxel combat presentation
Depends on M1-005, M2-001a. Paths: src/main.js (`playEvents`), styles.css.
Acceptance met: CSS voxel cubes per unit; attack lunges driven by pre-command snapshots; impact flash and shake; floating damage numbers with advantage/retaliation variants; Guard values counted down rather than swapped; lethal hits leave a crumbling ghost chip; Nexus strikes shake the board; Action casts, heals, buffs and summons have distinct feedback; reduced-motion and the in-game toggle skip everything.
Evidence: browser checks confirmed `.fx-lunge`, `.fx-hit`, `.dmg-float`, `.dmg-float.retaliation`, `.fx-ghost`, `.fx-spawn`, `.fx-cast-hit`, `.fx-shake` appearing during real engine events, and a Guard value animating `5/8 → 2/8` mid-tick.
Not claimed: no sprite or GLB assets; no animation frame was captured as a screenshot (transient effects outlive the capture latency). The unit *models* themselves were replaced under M2-009.

### M2-008 | DONE | Main menu, How to Play and guided first match (UX-001)
Depends on M1-005. Paths: index.html, styles.css, src/main.js, src/ui/tutorial.js, tests/tutorial.test.js.
Acceptance met: the app boots to a menu and does not start a match by itself; Practice, Guided first match and a live-only Return to match; How to Play (8 steps) opens on a first visit and is always reachable; Vessel Roster page; Settings remains the profile view; "not in this build" items are labelled instead of offered as buttons; no active menu control is a dead end; a guided match runs on a real practice match and advances from engine events; Skip always available; `endTurn` always escapes a blocked step; contextual state prompt with Cancel and Escape; refusals name the rule that blocked them.
Evidence: `npm test` -> 83/83 pass including the tutorial suite; browser run at `http://127.0.0.1:8123/` — first load opened How to Play, menu/roster/guide rendered with no console or network errors, tutorial advanced 1->4 in a live match and displayed its blocked-step hint.
Not claimed: no in-match pause overlay (the header Menu button covers navigation); no per-archetype animated intro.

### M2-009 | DONE | Unique voxel models for the original 18 Vessels (superseded for coverage by CONTENT-001)
Depends on M1-005. Paths: src/render/models.js, src/render/voxel.js, src/main.js, tests/models.test.js.
Acceptance met: every official Vessel id has its own model definition (11-14 boxes, 2+ animation groups, unique silhouette); element palettes give each element its own material language and low quadrupeds carry an explicit scale; the board renders `data-model-id` per unit and the roster page renders the same modules; a missing model returns `null` and draws a labelled placeholder rather than a generic cube; models are presentation-only and cannot mutate a match.
Evidence: `tests/models.test.js` (roster completeness, no shared silhouettes, palette-key validity, catalog/element agreement, five distinct element palettes, `null` for unknown ids); browser run showed six different Vessels rendering their own models on the board and all 18 on the roster page.
Not claimed: CSS-3D boxes, not GLB meshes, so there is no skeletal animation — attacks lunge and tilt the body instead of swinging a limb; per-limb weapon swings, victory poses and a GLB pipeline remain for M7-004. There is no WebGL path to fall back from.

### LAYOUT-001 | DONE | Integrated war table, four Vessel zones and four Action zones per seat
Depends on M2-008, M2-009. Paths: index.html, battlefield.css (new), src/main.js, src/ui/fields.js (new), src/game/engine.js, src/game/constants.js, tests/fields.test.js.
Acceptance met: the battle screen is one table object — opponent HUD, four back-row Relic zones and four front-row Vessel zones, the 7×7 arena, the player's four Vessel + four Relic zones, then the player console and hand; every zone is a projection of match state (`fieldState`) with stable keys, never DOM-owned state; summon, Relic placement, zone selection, empty/occupied styling and counters all route through the engine; the Relic cap was raised to four so the rule matches the four zones; the Nexus vitality bar is the strike target and existing FX ids are preserved; the 7×7 grid and all card data are unchanged.
Evidence: `npm test` -> 97/97 pass including six new field tests and the four-Relic limit test; browser at 1440×950, 1024×768 and 390×844 — summon paid 3 Flux and filled zone 1, Ember Lens filled Action zone 1 with `Relics 1/4`, clicking a filled zone selected its unit and highlighted the board, stale selection cleared after defeat, zero console errors, no horizontal overflow.
Not claimed: no drag-and-drop; Actions cannot be set face-down (no canonical rule); the four zones are not part of a deck builder (not built); the browser check did not reach a live undefended Nexus to click the new strike target (same engine command is unit-tested).

### M3-001 | DONE | Stash, deck builder, shop, Singles and recycling UI
Depends on M2-002. Paths: src/game/decks.js, src/game/economy.js, src/ui/systems.js, src/net/profile.js, tests/decks.test.js, tests/economy.test.js.
Acceptance met: Deck Builder (create/edit/save/duplicate/rename/delete/select, manifest search/filter/sort, engine + ownership validation, illegal decks cannot start a match, local-profile persistence across refresh); Shop (300-Shard packs of exactly 5 Commons + 1 Rare-or-better, operation-id idempotency, Singles by rarity price with discovery requirement, dissolution with bound-starter protection, saved-deck protection and confirmation, collection view); balances are local-only and labelled as such — no local data is presented as server currency.
Evidence: `npm test` 149/149 including new decks/economy suites; browser check at /veylattice/ subpath (see docs/IMPLEMENTATION_LOG.md 2026-10-29).
Outstanding: cloud sync of decks/collection/Shards (needs a server migration, see M4-001) — DESIGN for approval: docs/proposals/CLOUD_ECONOMY_SYNC.md + supabase/drafts/0004_economy.DRAFT.sql (not applied); rank-modified pack odds (server-only, not applied locally).

### M3-002 | IN_PROGRESS | Versioned schemas and expansion validation
Depends on M2-001. Paths: content manifests, validators, tests/.
Delivered by CONTENT-001: `src/cards/manifest.json` with `schemaVersion: 2`; stable ids unique across sets; typed, scoped effects; required targeting per effect kind; closed Vessel keywords; the app and tests load the same manifest, so a new set needs no engine/HUD edit; invalid content throws before a match starts.
Outstanding: pack composition (five Commons + one Rare) and disclosed odds. Acceptance: stable IDs, valid references/effects/pools, exactly five Commons plus one Rare-or-better, disclosed odds; supported new cards load without engine edits; invalid content fails safely.

## M4 - Trusted backend (P1)

### M4-001 | TODO | Auth, schema and RLS preparation
Depends on M3-002. Paths: backend source, migrations, config example, tests/.
Acceptance: reviewed source/migrations, private user data, denied unauthorized writes and secret-free browser config. Applying/deploying requires owner approval.

### M4-002 | TODO | Authoritative matches, server AI, rewards and economy
Depends on M4-001, M2-003, M3-001.
Acceptance: versioned/idempotent commands, private projections, persisted deadlines/worker, cryptographic pack RNG, atomic wallet/collection/reward settlement; retry/concurrency/tamper tests pass before rewards are enabled.

## M5 - Four-seat lobbies and Tag (P1)

### M5-001 | IN_PROGRESS | Lobby lifecycle, teams and reconnect (peer-validated preview DONE; server-authoritative BLOCKED)
Depends on M4-002. Paths: src/game/lobby.js, src/net/online.js, src/ui/systems.js, tests/lobby.test.js.
Delivered (peer-validated preview): two-player rooms by 6-character code over Supabase Realtime broadcast; seat assignment, deck selection, readiness gating (deck changes clear readiness), host start with shared seed, synchronized turns; every remote command re-validated by the receiving engine (seat, sequence, command id, legality); deck lists shared at match start, hands never broadcast; online matches grant no rewards/rank/currency.
BLOCKED (server-authoritative): Edge Function command validation, rooms/matches migrations, RLS and trusted settlement — requires separate owner approval before any reward-bearing or ranked online claim. PROPOSAL written 2026-10-29 for approval: docs/proposals/SERVER_AUTHORITATIVE_MULTIPLAYER.md + supabase/drafts/0003_matches.DRAFT.sql (not applied).
Two-browser E2E 2026-10-29 (tools/browser-checks/lobby-e2e.cjs): two isolated headless-Chromium contexts over a Supabase Realtime TEST DOUBLE (real Supabase unreachable from that sandbox — egress 403). Found and fixed: (1) joiner never seated — joinRoomChannel returned before SUBSCRIBED so the host's reply was missed; (2) clock-skew rejection of guest deck/ready edits (wall-clock updatedAt ordering) — replaced by seat-ownership merge + per-sender revision; (3) mid-match leave left the host waiting forever and could hand the leaver's leftover match to the local AI; (4) online guest saw its own field in the enemy rows (field/log/status code used HUMAN_SEAT 0 instead of mySeat()); (5) waiting client timed the opponent out locally, racing in-flight commands. After fixes: create/join/deck/ready/start, synced summons and turns, five forged-command rejections, idle 120 s deadline, leave/cleanup — all PASS at guest clock 0, -5 s, +5 s, +3 s, -4 s. NOT done: the same run against real Supabase Realtime with two separately signed-in players; reconnection (unsupported in the preview); hand privacy (seed-derivable, documented in the lobby text).
Acceptance (remaining): all human/AI seat combinations, team turns, reconnect/AI takeover, no hand leakage, duplicate start/command handling — under the server-authoritative implementation, not the preview.

## M6 - Ranked and rotations (P2)

### M6-001 | TODO | AI ladder, seasonal emblems and shop schedule
Depends on M4-002, M3-002.
Acceptance: three-match promotion series, no in-season demotion, monthly reset, retained inventory/emblems, rank rewards/odds, weekly rotation/occasional Friday sale; UTC boundaries and economy/farming checks pass.

## M7 - World systems and 3D (P2)

### ARENA-3D | DONE | Genuine 3D battlefield with integrated card fields
Paths: src/render/arena3d.js, src/main.js, index.html, styles.css, tests/arena3d.test.js.
Acceptance met: Three.js primary renderer with CSS-3D fallback/toggle; one scene with opponent field, 5x5 grid, player field, 4 Vessel slots + 4 Relic sockets + 4 Action staging slots + discard pile per seat; real voxel Vessel geometry from the same box data as card art; raycast picking to engine cells; legal-move/attack/summon tints; desktop three-quarter and narrow top-down cameras.
Evidence: tests/arena3d.test.js (mapping bijectivity, field layout, camera presets); browser check at /veylattice/ subpath (see log 2026-10-29).
Fixed 2026-10-29 (real-browser screenshots): camera sat on the +x axis at yaw 0 (board rotated 90°, both fields at the sides) — now seat 0 near, `cameraPosition` unit-tested; the classic CSS board rendered UNDER the canvas in 3D mode (`.board-wrap{display:block}` beat `[hidden]`).
Measured 2026-10-29 (headless Chromium, SwiftShader CPU GL — relative numbers only): the arena issued ~490–780 draw calls/s while idle, while hidden on the menu, and in classic mode. On-demand rendering (visible AND changed/animating) brought idle/hidden/classic to 0 draw calls/s; page frame rate on battle idle 6.2→60 fps desktop, 4.2→60 fps phone profile (390×844, DPR 2, CPU 4×); long-task total during the run 6.5 s→2.2–2.4 s desktop, 14.0 s→4.7–6.2 s phone. Battle-hand migration: see FRAME-001. Outstanding: a real phone GPU measurement; the classic CSS-3D board itself (2,224 DOM nodes, 2,199 transformed) has ~850 ms frames under software compositing — exactly the no-GPU case where the fallback is used; not changed without real-device numbers.

### FRAME-001 | DONE (partial) | Approved CardFrames in the card pipeline; Relic frame PENDING
Paths: src/render/approved-frame.js, CardFrames/FRAME_DIRECTIVE.md, tests/frames.test.js.
Acceptance met: six approved overlays composited (manifest apertures, 214x300, never stretched) in Deck Builder, Shop, Collection and discard viewer with canonical text; frame geometry asserted against the manifest in tests.
PENDING: a dedicated approved Relic frame does not exist — Relics use a flagged neutral presentation and must not borrow a Vessel frame. Exact asset spec requested in docs/RELIC_FRAME_REQUEST.md (not fabricated).
DONE 2026-10-29: battle hand migrated (`buildHandCardFace`): approved overlay + manifest aperture + canonical DOM text; rules line hidden at hand size (full text in inspector/double-click viewer); browser-measured aspect 0.713 (=214/300) at 104 px desktop and 92 px phone; tests/frames.test.js covers Vessel/Action/Relic faces with a DOM double.

### AUDIO-001 | DONE | Original soundtrack integration (system + supplied tracks wired)
Paths: src/audio/soundtrack.js, src/net/profile.js, src/main.js, index.html, tests/audio.test.js.
Acceptance met (system): central manifest + manager (single-element background reuse, no-restart on re-render, fade on switch, stinger once per match key, draw plays neither sting, mute/volume/sfx controls that persist via profile.settings.audio, autoplay-blocked status + gesture retry, visibility pause/resume, missing-file/error tolerance without crashing); view mapping menu/decks/shop/battle + silent result screen; subpath-safe music/ URLs.
Evidence: tests/audio.test.js (15 tests) + updated profile expectation; `npm test` 164/164, `npm run check` 164/164, 0 fail.
Update 2026-10-29: the six tracks arrived mid-session via origin commit f51cec5 ("music") and are now wired into SOUNDTRACK (ffprobe-verified MP3, decode-clean; stingers 12.4 s / 11.0 s, backgrounds 138–174 s). No music was generated as a substitute. Remaining: audible playback confirmation in live browser verification (autoplay-gated).
Browser pass 2026-10-29 (headless Chromium, tools/browser-checks): blocked before gesture → plays after first click; Planning on Decks, Shop on Shop, Main Menu on menu/Lobby/Settings, Battle on match start, exactly one Defeat sting, battle stopped, no replay on resize. Defects found and fixed: (1) second and later practice matches played NO stinger (match key only advanced for online matches); (2) /veylattice/index.html resolved tracks to index.html/music/… (404); (3) a 404/unsupported file was reported as "paused by the browser" and retried forever; (4) the Defeat sting kept playing over the menu theme. Not verified: audible output (no speakers in headless), a Victory sting in the browser (the scripted matches end in defeat; covered by unit tests), loop seamlessness.

### MOBILE-001 | DONE | Phone viewport horizontal overflow
Found 2026-10-29: at 390×844 the nine-tab nav measured 518 px and widened the whole layout viewport (sideways scroll / zoomed-out page). Tabs now wrap at ≤640 px; measured scrollWidth 390 on menu and battle (tools/browser-checks/mobile-overflow.cjs). Not checked on a physical phone.

### MP-002 | TODO | Online guest perspective
In the peer preview the guest (seat 1) plays from the far side: the 3D camera and classic grid always put seat 0 near. Correct and legal, but awkward. Flip the camera / grid for seat 1 (presentation only).

### M7-001 | TODO | Arena affinity, terrain and hazards
Depends on M1-003, M2-001. Paths: src/arenas/, rules, UI, tests/.
Acceptance: start with one symmetric arena, then terrain/hazards; visible warnings and explicit triggers; Guard bonuses preserve damage and never heal by repeated recalculation.

### M7-002 | TODO | Lore Bonds and free Codex/Bestiary
Depends on M7-001. Paths: bond data/resolver, Codex UI, tests/.
Acceptance: three authored pairings, orthogonal same-controller checks, nonstacking duplicates, custom exclusion, four free Codex sections and linked unit/set views with all stats.

### M7-003 | TODO | Vessel Forge and Custom Practice
Depends on M2-002, M7-002. Paths: creator/validation/persistence/UI/tests.
Acceptance: deterministic paid-for power budget, safe editable/generated text, save/edit/delete/deck integration, no official bonds or reward eligibility; offline custom play separate from prebuilt Practice.

### ART-001 | DONE | Voxel art pass: materials, pivots and the arena diorama
Depends on M2-009. Paths: src/render/voxel.js, src/render/models.js, src/render/vessels/*, src/render/terrain.js, src/main.js, styles.css, tests/models.test.js, tests/terrain.test.js.
Acceptance met: 18 models rebuilt to 728 boxes (30-59 each, 4+ groups, 4+ materials); per-material face shading computed instead of CSS filters; groups rotate around authored pivots so attacks swing the weapon, head and tail; angled parts for fins/banners/lances; idle languages per unit; authored point-symmetric arena ground map with props, plinth, posts, elevation and unit shadows; roster rotation and richer inspection; decorative contract enforced by tests.
Evidence: `npm test` -> 91/91 pass; browser run at 127.0.0.1:8123 with zero console errors, 18 roster cards / 728 boxes, four Vessels on the board at turn 6, mobile 390x844 checked; screenshots regenerated.
Not claimed: no GLB, no GPU lighting, no dynamic shadows, no skeletal deformation; Wyrm and Colossus remain weak at tile size; phone tiles favour stats over model detail.

### M7-004 | IN_PROGRESS | Voxel models, animation states and accessible frames
Depends on M1-005. Paths: rendering/assets/UI; docs/UNIT_VISUAL_DESIGNS.md.
Delivered by M2-009, ART-001 and CONTENT-001: 60 identifiable silhouettes (18 hand-authored, 42 blueprint-configured), a dependency-free CSS-3D renderer, per-material shading, articulated pivots (weapon/head/tail/arm swings on attack), idle languages, summon/hit/defeat states, reduced-motion support, and a roster page that uses the same modules as the board.
Delivered by ART-002: card art for all 102 cards generated from the same model definitions, so illustration and model cannot diverge, plus per-card environments and rarity treatment.
Remaining: victory/defeat-specific poses per unit, legible elemental/rarity card frames, a measured performance pass at the 728-box budget, a silhouette gate at tile size, and either a documented voxel-to-GLB export pipeline (docs/VOXEL_PIPELINE.md) or a written decision to stay on CSS-3D — that decision is still open, and the README states the CSS-3D limitation plainly. docs/VOXEL_ART_BIBLE.md and docs/UNIT_VISUAL_DESIGNS.md now carry implementation status; docs/CARD_FRAMES.md covers frame direction.

### M7-005 | TODO | Keyboard and assistive control pass
Depends on M1-005. Acceptance: arrow-key grid traversal, focus return after commands, screen-reader announcements for combat results, no hue-only signalling (element abbreviations already present).

## Decisions and blockers to preserve
- Prices, pack odds, promotion wins, mulligan cost and Tag dimensions are proposed defaults, not proven balance.
- Deployment project, quotas, production configuration and migrations require separate approval; this does not block offline M1/M2.
- New transcript excerpts may add context; do not revert canonical newer rules silently.
- The practice deck exception is temporary and must be removed in M2-002, not relabeled as a rule.
- Attack line of sight requires orthogonal alignment (provisional default; review after playtest).
- Player profiles are device identities, not accounts. The edit token is a write capability, not authentication; do not describe saved profiles as secure accounts.
- Cloud data lives in a Supabase project (`jjtfnduodxtulxvviasf`) created only for Veylattice. Do not add Veylattice tables, policies or functions to the Sohbet project or any other app's project.
- The publishable/anon key in `src/net/config.js` is intentionally public. The `service_role` key must never enter the repository or the browser bundle.

## ART-006 - humans and arena (DONE, uncommitted)

- ART-006a | DONE | Give the five human Vessels literal faces, skin, hair and beards. Evidence: per-Vessel `headW/headH/jaw/nose/ears` and palette overrides; probe render at 15 px/voxel.
- ART-006b | DONE | Replace the shared human arm pose with named poses and hand-anchored weapons. Evidence: `ARM_POSES` / `humanHands` in blueprints.js; five specs use guard/draw/shoulder/carry.
- ART-006c | DONE | Rebuild the arena as a stepped voxel diorama. Evidence: terrain.js rewrite (16 prop models, ~50 placements, 0-22 px height steps); block side walls and voxel grain in styles.css.
- ART-006d | DONE | Render board Vessels upright, at board scale, without covering the terrain. Evidence: `.cell .model-stage` board scale, counter-rotation, flat `.unit`; screenshots at 690x1225 and 390x844.
- ART-006e | TODO | Author weapon silhouettes for the humans at the detail level of the construct and beast rigs.
- ART-006f | TODO | Separate the remaining robe-wearer cluster (Furnace Abbot, Null-Choir Cantor, Dust Sage, Emberwright Adept) with authored geometry.
