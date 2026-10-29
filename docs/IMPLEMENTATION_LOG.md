# Implementation Log

Permanent record of work sessions. Planning, research and implementation are
listed separately. Only commands actually executed and results actually observed
are recorded.

## Session 2026-10-28 · S-M1-A · Offline rules engine + HUD (M1)

**Base revision:** `12ffb0b` (`main`, verified with `git log --oneline`). The
working tree was clean at session start (`git status --short` printed nothing).
All changes in this entry are **uncommitted** at the time of writing; no commit
was created in this session.
**Environment:** Windows, Git Bash, Node v24.19.0, Python 3.14 available for
static serving.

### Inspected

- Project docs: `AI_INSTRUCTIONS.md`, `AI_HANDOFF.md`, `TODO.md`,
  `CHANGELOG.md`, `GAME_RULES.md`, `TECHNICAL_ARCHITECTURE.md`, `ROADMAP.md`,
  `PROJECT_BRIEF.md`, `README.md`, `docs/IMPLEMENTATION_PROMPT.md`,
  `docs/TESTING.md`, `docs/ELEMENTAL_SYSTEM.md`, `docs/COMBAT_RULES.md`,
  `docs/BALANCING.md`.
- Source: `src/main.js`, `src/game/elemental-rules.js`,
  `src/cards/starter-set.json`, `src/cards/lore-bonds.json`, `index.html`,
  `styles.css` (empty).
- References (read-only): `X:\REA` (USAGE.md, `--help`, `capabilities`,
  artifact inspection), Duelyst II Electron app data, MDPro3 shipped JSON.
- Multiplayer references re-verified at current `main` via the GitHub API:
  `XiONDiGiTaL/meldra` (`src/server/index.ts`, `src/shared/protocol.ts`) and
  `XiONDiGiTaL/leapbuddies` (`js/net.js`). Both are two-participant,
  host-authoritative relays; LeapBuddies hard-codes a Supabase URL and anon key
  in client code. No credentials were copied and no reference code was run.

### Research (see [REFERENCE_RESEARCH.md](REFERENCE_RESEARCH.md))

- REA static reconstruction of the Duelyst bundle hit the provider's 300 s
  timeout; `inspect-artifact` on `duelyst.js.map` succeeded but the map has no
  `sourcesContent`. Recorded as a limitation.
- Aggregated Duelyst II effect-text vocabulary (308 spells/artifacts) and asset
  inventory; aggregated MDPro3 card corpus (14,138 cards) and effect families.
- Confirmed neither multiplayer reference supplies server-validated state,
  private hands or idempotent rewards, so M5 must build them.
- No reference asset, text, credential or code was copied.

### Implemented

| File | Change |
|---|---|
| `package.json` | New ESM manifest with `type: module` and `test` script (`node --test "tests/*.test.js"`). |
| `src/game/constants.js` | Board, caps, Flux, timer, deck and rarity constants; deployment/home-row helpers. |
| `src/game/elemental-rules.js` | Replaced prototype halving helper with canonical damage module (`damageFor`, `relation`, `previewDamage`). |
| `src/game/content.js` | Catalog validation/freeze, practice deck builder, deck legality. |
| `src/game/engine.js` | Deterministic match state, commands, combat, Nexus, Flux/draw/fatigue, mulligan, deadlines, outcome, legal-action enumeration, attack preview. |
| `src/main.js` | Rewritten as a thin HUD controller; no rules in the DOM layer. |
| `index.html` | Timer, Nexus markers, selection panel, mulligan, counters, result overlay. |
| `styles.css` | Full dark-fantasy layout, element badges, legal-move/attack highlight, reduced-motion support. |
| `tests/support.js`, `tests/elemental.test.js`, `tests/content.test.js`, `tests/engine.test.js`, `tests/match.test.js` | New test harness and 37 tests. |
| `docs/REFERENCE_RESEARCH.md`, `docs/MECHANIC_ADAPTATION_MATRIX.md` | New required research records. |

### Design decisions

1. **Canonical elemental math** from GAME_RULES.md (advantage `floor(1.5×Attack)`,
   disadvantage `max(1, floor(0.5×Attack))`, neutral unchanged), applied per
   damage packet to current Attack. Guard is never pre-halved. This supersedes
   the older halving proposal in `docs/ELEMENTAL_SYSTEM.md`, which is now marked.
2. **Simultaneous exchange.** Both Attack values are snapshotted, both packets
   applied, then all units at ≤0 Guard are removed together. A defender that
   will die still retaliates.
3. **Direct attacks** deal the unit's full current Attack, no elemental
   modifier, and require: unit on the enemy home row, opponent controls no
   Vessels. Nexus never retaliates.
4. **Commands** carry an optional `expectedVersion`; rejected commands return
   the original state object unchanged, which the tests assert by reference.
5. **Deadline handling** returns the materialized timeout state with a
   rejection (`DEADLINE_PASSED`) so a caller never loses the auto-pass.
6. **Practice deck profile** is explicit (`PRACTICE_DECK_RULES`, minimum Actions
   temporarily 0) because the starter set contains 18 Vessels and no Actions.
   The canonical `DECK_RULES` are untouched and still fail the practice deck;
   a test asserts that gap so it cannot be forgotten.

### Tests executed

Command (from repository root):

```
node --test "tests/*.test.js"
```

Observed result: **37 tests, 37 pass, 0 fail** (~0.47 s). Coverage includes:
all 25 element pairs, rounding/minimums, persistent Guard, simultaneous lethal
trades, out-of-range retaliation, blocked/diagonal LOS, summon limits and
deployment zones, zero-cost/zero-Flux rule, movement legality, Nexus gating and
lethal, draw, victory, surrender, simultaneous-lethal draw, mulligan atomicity
and once-per-turn, stale/unknown command immutability, deadline boundary and
preservation of committed actions, fatigue escalation and fatigue lethal, legal
action enumeration, catalog immutability, and a full scripted match plus
same-seed replay determinism.

Earlier runs during development failed and were fixed (not hidden):
missing `ELEMENTS` export in `content.js`; `mythic` rarity rejected by the new
validator (starter data is authoritative, validator corrected); deadline
failure returning the pre-timeout state; two test-authoring mistakes
(mulligan expectation and unaffordable Flux in the enumeration test). Each fix
was followed by a full rerun.

### Browser verification

- Served `C:\GitHub` with `python -m http.server 8123 --bind 127.0.0.1` and
  opened `http://127.0.0.1:8123/Veylattice/`.
- Served the app root with `python -m http.server 8124` and confirmed HTTP 200
  for `/`, `/styles.css`, `/src/main.js`, `/src/game/engine.js`,
  `/src/cards/starter-set.json` — relative paths work at root and under
  `/Veylattice/`.
- Driven through the preview browser: end turn ×4 (Flux reached 3), summon
  (Argent Nightlancer, 3 Flux, enters UNREADY), next own turn (READY), move
  (4 legal cells shown, then 0 after moving), summon for Seat 2 adjacent,
  attack preview ("takes 2 (disadvantage)"), resolution showing persistent
  Guard `2/4`, retaliation 9, defeat and discard count 1, and a mulligan
  (Flux 5→4, button disabled afterwards).
- `preview_logs` reported no console or network entries; `preview_snapshot`
  showed the expected HUD. No page errors observed.

### Known defects / limitations

- **Hot-seat only.** No AI opponent yet (M2-003); Seat 2 is played by the same
  person. Footer and header state this.
- **No Actions or Relics.** Starter set contains none; `playCard` is not
  implemented. The engine rejects non-Vessel cards with `UNSUPPORTED_CARD`.
- **Canonical Action minimum unmet** by the practice deck (documented above).
- **Real-time 120 s expiry was not waited out in the browser.** The deadline is
  covered by engine tests; the HUD interval calls the same `timeout` command.
- **Timeout forfeit safeguard** (two consecutive inactive turns) is specified
  but not implemented; only auto-pass exists.
- **No scroll/hover attack preview on the board itself**; preview text appears
  in the selection panel for legal targets.
- Keyboard-only board navigation relies on native button focus; no arrow-key
  grid traversal yet.

### Next executable steps

1. **M2-001** — typed effect queue and the first Actions/Relics (damage, heal,
   draw, revive, death triggers), with loop protection and tests.
2. **M2-002** — canonical Action-aware decks (18 Vessels + Actions/Relics),
   three prebuilt archetypes, switch `createMatch` to `DECK_RULES`, and remove
   the practice exception once content permits.
3. **M2-003** — legal-action AI using `getLegalActions`, three archetypes,
   bounded decision time, no hidden-hand access, zero progression rewards.

## Session 2026-10-28 · S-M2-B · Tactical AI, profiles, avatars and deployment

**Base revision:** `12ffb0b` plus the uncommitted M1 change set from S-M1-A.
**Environment:** Windows, Git Bash, Node v24.19.0, Python 3.14 (static server),
Brave `Chrome/156` in headless mode for reproducible screenshots, `X:\REA` untouched.

### Requested scope

Implement M2-003 (a legal-action AI for Seat 2 with no hidden-hand access and bounded
decision time, replacing hot-seat play), add player profiles with avatar upload and
settings, publish to GitHub Pages at `xiondigital.net/veylattice`, persist user data in a
database without affecting Sohbet or the base site, and document it with screenshots.

### Inspected before changing anything

- `git status --short`, `git log --oneline -3`, full file inventory (35 files).
- Source: `src/game/engine.js`, `content.js`, `constants.js`, `elemental-rules.js`,
  `src/main.js`, `index.html`, `styles.css`, `src/cards/starter-set.json`, `tests/support.js`.
- Continuity: `AI_HANDOFF.md`, `TODO.md`, `CHANGELOG.md`, `docs/TESTING.md`,
  `TECHNICAL_ARCHITECTURE.md`, `README.md`.
- External state, verified rather than assumed:
  - `curl -I https://xiondigital.net/` returned GitHub Pages headers
    (`x-github-request-id`, `x-served-by`, `via: varnish`) behind Cloudflare, and
    `/veylattice` returned 404. Conclusion: the account already serves a Pages user site
    on the custom domain, so a project repo appears as a subpath with no DNS work.
  - GitHub API: repository was **private**, account plan is **free**, `has_pages: false`.
  - Supabase: exactly one project existed ("Sohbet", ref `ezwxppiuxbyzmmheckce`).
  - Cloudflare and Vercel are connected, but neither exposes a Worker/function deploy tool
    in this session, so a static site cannot safely use D1 or a Vercel function.

### Decisions

1. **AI consumes a filtered observation, not the state.** `buildObservation` exposes the
   seat's own hand plus public board and opponent *counts*; `choosePlan` is pure and never
   sees `state`. This is testable, unlike an informal "the AI doesn't peek" claim.
2. **Candidates come from the engine.** `buildCandidates` wraps `getLegalActions` and three
   new shared geometry helpers, so move-then-attack lines exist without duplicating rules.
3. **Difficulty is decision quality, not resources.** Budgets 8/20/45/120 ms, candidate
   caps, noise, retaliation awareness, threat awareness and move-attack search.
4. **Local storage is the source of truth; the cloud is a synchronised copy.** The game must
   never block on the network, so `persistProfile` writes locally first and reports the
   real sync outcome afterwards.
5. **A new Supabase project, not the Sohbet project.** The user required Sohbet to be
   untouched; a separate project also isolates quotas and keys.
6. **No table grants at all.** Writes go through a `SECURITY DEFINER` RPC guarded by a
   bcrypt-hashed per-profile edit token; reads go through a single-row RPC. Verified by
   curl, including a deliberate wrong-token attempt.
7. **Repo made public and renamed to lowercase.** GitHub Pages for a private repo requires a
   paid plan, and the requested path is `/veylattice` (Pages paths are case-sensitive).
8. **No demo scaffolding in product code.** Screenshots were produced by driving the real
   UI through the DevTools protocol rather than adding a hidden "screenshot mode".

### Implemented

| File | Change |
|---|---|
| `src/game/ai.js` | New: observation, candidate builder, scoring, bounded selection, difficulty/archetype tables |
| `src/game/engine.js` | Added `attacksFromCell`, `lineOfSightOnBoard`, `canStrikeNexusFrom`; `lineClear`/`canAttackNexus` delegate to them |
| `src/net/config.js` | New: public Supabase URL + publishable key, cloud toggle |
| `src/net/profile.js` | New: sanitisation, local-first persistence, cloud pull/push, avatar pipeline, stats maths |
| `src/main.js` | Rewritten: AI turn driver, view switching, profile form, match log, gated interactions |
| `index.html` | Rebuilt: Battle + Profile & Settings views, opponent card, match log, result record |
| `styles.css` | Added navigation, avatars, opponent card, log, profile panels, responsive rules |
| `supabase/migrations/0001_profiles.sql` | New: table, constraints, RLS, RPCs, grants |
| `supabase/` | New directory |
| `tests/ai.test.js` | New: 10 tests |
| `tests/profile.test.js` | New: 6 tests |
| `screenshots/` | New: `battle.png`, `profile.png`, `mobile.png` (real renders) |
| `README.md` | Rewritten with screenshots, AI guarantees, rules, data model, deployment |
| `.nojekyll` | New: disables Jekyll processing for Pages |

### Commands and observed results

| Command | Result |
|---|---|
| `node --test "tests/ai.test.js"` | 10/10 pass, ~228 ms |
| `npm test` | **53/53 pass, 0 fail**, ~0.62 s |
| `node --check src/main.js src/game/ai.js src/net/profile.js` | syntax OK |
| `curl -X POST .../rest/v1/rpc/veylattice_profile_save` (new id) | `200 {"ok":true}` |
| `curl -X POST .../rest/v1/rpc/veylattice_profile_get` | `200` with name/avatar/settings/stats |
| same save with a wrong token | `401 {"code":"42501","message":"not authorized"}` |
| same save with the correct token | `200 {"ok":true}` |
| `curl .../rest/v1/veylattice_profiles?select=*` | `401 permission denied for table veylattice_profiles` |
| Browser, `http://127.0.0.1:8124/Veylattice/` | Loaded, profile restored from cloud, opponent card rendered |
| Six human turns vs AI | AI summoned (2 and 3 Flux), moved, attacked, traded, mulliganed, ended turns |
| Headless CDP play + capture | 5 units on board, log attributed correctly, **0 exceptions/console errors** |
| Avatar upload (512 px, 132 KB PNG) | Stored as 2 415-char WebP; DB row confirmed `avatar_chars = 2415` |

### Fixed during the session

- AI tests initially used 30 copies of one card, which the 3-copy deck rule rejects; switched
  to `buildPracticeDeck`.
- Determinism test reused one mutable RNG instance between calls, so it compared two
  different draws; fixed by constructing a generator per call.
- Truncation test advanced the fake clock too slowly to exceed the budget; fixed the clock
  step and budget, and added an assertion that enough candidates exist.
- Match log attributed every defeat in a batch to the acting seat; now uses the defeated
  unit's owner. Turn-start text was also ambiguous ("Turn 2 begins" twice per round); now
  reads "Round N — your/opponent's turn begins".
- The AI had no Nexus-strike candidate after moving; added `canStrikeNexusFrom` so
  move-onto-home-row-then-strike lines are discoverable (covered by a lethal-line test).

### Known limitations

- Profiles are device identities, not accounts: no sign-in, recovery, or cross-device
  identity. Anyone with an id can read its public fields; only the token holder can write.
- No rate limiting on profile creation (M2-005); a browser alone cannot enforce it.
- The AI's win rate against humans is unmeasured; balance claims are deliberately absent.
- Actions/Relics remain unimplemented, so `PRACTICE_DECK_RULES` still waives the
  five-Action minimum (`minActions: 0` only).
- No keyboard grid traversal; the AI turn is paced with timers rather than animated.
- A real 120-second browser expiry was again not waited out; engine tests cover the boundary.

### Next executable steps

1. **M2-001** typed effect queue and the first Actions/Relics (ordering, loop limit,
   simultaneous death, revive readiness).
2. **M2-002** canonical decks with Actions, then delete `PRACTICE_DECK_RULES`.
3. **M2-005** cloud write abuse guard, then **M3** collection/deck builder.

### Deployment verification (same session)

| Step | Observed |
|---|---|
| `git commit` | `1bb92f7` — 34 files, 6 995 insertions |
| `git push -u origin main` (after rename) | `12ffb0b..1bb92f7 main -> main` |
| GitHub API: set `visibility: public` | `private: false` |
| GitHub API: rename repo | `full_name: XiONDiGiTaL/veylattice` |
| GitHub API: enable Pages (`main`, `/`, legacy) | `html_url: http://xiondigital.net/veylattice/`, certificate `approved` for `xiondigital.net` |
| Poll `https://xiondigital.net/veylattice/` | 404 ×5, then **200** on attempt 6 (~75 s) |
| Asset probes | `styles.css`, `src/main.js`, `src/game/ai.js`, `src/net/profile.js`, `src/cards/starter-set.json`, `screenshots/battle.png` → all **200** |
| Base site | `https://xiondigital.net/` still **200** |
| Live page runtime | 49 grid cells, 6 cards, opponent "The Vanguard", profile chip "Synced" |
| Live AI turn | Ended turn → AI mulliganed and ended its turn → control returned at round 2 |
| Live profile write | `POST .../rpc/veylattice_profile_save` → **200**; UI showed "Saved to cloud" |
| Live console | No errors, no warnings (`preview_logs`, `kind: all`) |

Notes: Pages inherited the account's custom domain, so `/veylattice/` required no DNS change and no
edit to the base site. The API reported `https_enforced: false` even though it was requested; HTTPS
works via the approved certificate. Profiles are per-origin, so a profile created on
`localhost:8000` is separate from one created on the deployed origin — there is no import/export yet.

## Session 2026-10-28 · S-M2-C · Actions, Relics, accounts, voxel combat

**Base revision:** `b8afd6a` (`main`). Working tree contained only this session's changes.
**Environment:** Windows, Git Bash, Node v24.19.0, Python 3.14 static server on port 8130.

### Inspected

- Engine, content, AI and HUD source at `b8afd6a`; the whole test suite; `styles.css` board/unit rules.
- `supabase/migrations/0001_profiles.sql` and the live Supabase Auth settings endpoint
  (`/auth/v1/settings`) before promising anything about social sign-in. It returned
  `email: true, google: false, discord: false, mailer_autoconfirm: false`, which is why OAuth was
  documented rather than faked.

### Implemented

| File | Change |
|---|---|
| `src/cards/actions-relics.json` | 8 Actions and 4 Relics as typed data. |
| `src/game/constants.js` | `ACTION_TARGETING`, `EFFECT_KINDS` (scope + ranges); deleted `PRACTICE_DECK_RULES`. |
| `src/game/content.js` | Effect validation, action/relic requirements, frozen effects, legal 38-card practice deck, `actionIdsFrom`/`relicIdsFrom`. |
| `src/game/engine.js` | `actionTargetsFor`, `relicAuras`, `effectiveAttack`, `applyEffect`, `handlePlayAction`, `handlePlayRelic`, `cleanupDefeated`, relic mend at turn start, guard aura on summon, aura-aware attack/Nexus previews, `actions`/`relics` in `getLegalActions`, new error codes. |
| `src/game/ai.js` | Observation gains `category`/`targeting`/`effect`, `own.attackBonus`, `own.relics`, `foe.nexusArmor`, `foe.relicEffectKinds`; `playAction`/`playRelic` candidates; `evaluateAction`; no-op casts rejected at scoring. |
| `src/net/rpc.js` | Shared RPC transport extracted from `profile.js`. |
| `src/net/account.js` | Recovery-code accounts: normalise/format/validate, session storage, create/load/save/rotate. |
| `src/net/profile.js` | Account-aware `initialiseProfile`/`persistProfile`, `accountStatus`, `createAccountForProfile`, `signInToAccount`, `signOutOfAccount`. |
| `supabase/migrations/0002_accounts.sql` | Account table, RLS, code minting/rotation, four guarded RPCs. |
| `src/main.js` | Cast/set flow and target highlighting, relic panel, card-type rendering, `playEvents` presentation layer with pre-command snapshots, account panel wiring. |
| `index.html` / `styles.css` | Play button, relic list, account panel, voxel cubes, combat keyframes, mobile tile rules. |
| `tests/cards.test.js` | 13 new tests. `tests/content.test.js` rewritten for the 30-card pool. `tests/support.js` loads both card files. |
| `docs/ACCOUNTS.md` | Account model, threat table, verification log, blocked OAuth steps. |

### Design decisions

- **Effects are data.** A card can only name a known kind with in-range numbers; `createCatalog`
  rejects anything else, so no card text can become behaviour.
- **One aura implementation.** `relicAuras` feeds attacks, Nexus mitigation, dawn mending and summon
  bonuses, so the HUD preview and the engine cannot drift apart.
- **Auras are timing-independent.** A Guard Relic bumps existing Vessels immediately *and* is applied at
  summon, rather than depending on when it was set.
- **Accounts are a credential, not a password.** Server-minted 100-bit code, SHA-256 digest at rest,
  account id is only a lookup key. Rotation invalidates in one statement.
- **Presentation reads events.** `playEvents` takes the events the engine emitted plus a snapshot taken
  before the command, because defeated units no longer exist in the new state.

### Verification

```
npm test                                  -> 69 pass, 0 fail (~0.45 s)
direct GET /rest/v1/veylattice_accounts   -> 401
create / load / wrong-code save / rotate  -> see docs/ACCOUNTS.md
browser: cast, relic set, auras, mobile   -> no console or network errors
browser: account create/sign-out/sign-in  -> "Lattice Adept" restored from the database
```

Browser presentation checks observed `.fx-lunge`, `.fx-hit`, `.dmg-float`, `.dmg-float.retaliation`,
`.fx-ghost`, `.fx-spawn`, `.fx-cast-hit` and `.fx-shake` on real engine events, and a Guard value
counting `5/8 → 2/8` during a strike. These were driven from a **temporary** `?debug=1` hook used to
compose positions; the hook was removed before committing and `grep __veylattice src/main.js` is empty.

### Fixed during the session

- The AI cast `Ashfall` on an empty board because the Standard exploration window could pick a negative
  score. Root cause was scoring, not exploration: no-op casts now score `-Infinity`. A regression test
  covers it.
- Mobile cells clipped Guard numbers; under 640 px the tile drops the name and shows the two numbers
  that matter, with the full name kept in the selection panel and `aria-label`.

### Limitations

- No Google/Discord sign-in: providers disabled, credentials unavailable (documented in
  `docs/ACCOUNTS.md`).
- No throttling on account load attempts (M2-005).
- No transient animation screenshot: effects outlive the capture latency, so the README describes the
  presentation instead of illustrating a frame.
- Effect queue ordering, revive/death triggers and buff expiry remain for full M2-001.

## Session 2026-10-28 · S-M2-D · Menu, onboarding, board readability and the 18 voxel models

**Base revision:** `5551093` (S-M2-C), branch `main`, clean working tree at session start.
**Environment:** Windows, Git Bash, Node v24.19.0, Python 3.14 static server on
`http://127.0.0.1:8123/` (PID recorded, stopped at the end). No database or deployment credentials used.

### Reported defects and root causes

| # | Symptom | Root cause | Correction |
|---|---|---|---|
| 1 | Opening the site started a match immediately; nothing explained the game | `boot()` called `newMatch()` unconditionally and `ui.view` defaulted to `battle` | `boot()` renders the menu; `ui.view` starts at `menu`; first visit opens How to Play |
| 2 | Units were one coloured cube per element | `renderBoard()` built a fixed six-face `.voxel` span using `--vox` from the element | 18 authored models in `src/render/models.js`, built by `src/render/voxel.js` |
| 3 | Deployment zones and the back row were invisible or sidebar-only | Zones existed in the engine but not in the DOM; Relics were a `<ul>` in the sidebar | Row tints, a named gutter, dashed blocked tiles, and a two-slot back row |
| 4 | Choosing an unaffordable Vessel said "choose a highlighted cell" with zero legal cells | The hand handler never asked the engine whether any cell was legal | `vesselSelectionMessage()` counts cells from `getLegalActions` and names the blocking rule |
| 5 | A successful summon left the previous prompt on screen | `dispatch()` only set a message on failure | Each action sets its own result message |
| 6 | The guided tutorial stalled on step one | Steps listened for `endTurn`; the engine emits `turnEnd` | Normalised in `dispatch()` |
| 7 | Mobile tiles lost the model entirely | `ATK 4 · GD 3/3` wrapped to three lines inside a 43 px cell, collapsing the stage | Split stat spans with `::before` labels that shorten to `A`/`G`; `tickGuard()` updates only Guard |

### Implemented

- `index.html`: menu, guide and roster views; header nav with a disabled-until-a-match Battle tab;
  prompt bar, tutorial panel, back-row section; removed the stray "opponent deployment" caption that
  pointed above the Nexus.
- `styles.css`: menu hero and stage, CSS-3D model rules (`--u-base` × `--scale`), zone tints using
  `:where()` so interaction colours always win, back-row slots, prompt state chips, tutorial panel,
  roster grid, mobile overrides.
- `src/render/models.js`: 18 Vessel definitions (11–14 boxes, animation groups, element palette plus
  per-model overrides, explicit `scale` for low quadrupeds).
- `src/render/voxel.js`: dependency-free CSS-3D builder; three faces per box; unknown ids get a clearly
  labelled placeholder.
- `src/ui/tutorial.js`: pure guided-match steps and `advanceTutorial` / `skipTutorial` / `tutorialStep`.
- `src/main.js`: `VIEWS` and `showView` for five views, `renderMenuState`, `renderMenuModels`,
  `renderRoster`, `renderTutorial`, `tutorialHint`, `renderPrompt`, `cancelSelection`,
  `vesselSelectionMessage`, `summonBlockReason`, Escape handling, per-action result messages.
- `src/game/` was **not modified**. No rule, constant or engine behaviour changed.

### Rule-consistency decision

The supplied concept shows four back-row zones (two set/activate plus two summon columns). `GAME_RULES.md`
fixes **two Relics per seat** and defines no set/activate Action zone, so implementing four live zones
would have been a silent rules change. The back row therefore implements the two canonical Relic slots
and the divergence is recorded in `CHANGELOG.md`, `TODO.md` and this log.

A second, related observation: the canonical Flux curve gives 1 Flux on turn one and the cheapest Vessel
costs 2, so turns one and two cannot summon. This is canonical, not a defect; the guide says so and the
tutorial shows a state-aware hint. It is flagged as a balance question rather than "fixed".

### Tests

```
npm test  ->  83 tests, 83 pass, 0 fail  (~0.6 s)
```

New: `tests/models.test.js` (7) and `tests/tutorial.test.js` (7). The existing 69 tests were not
modified and still pass.

### Browser verification (recorded)

- First load opened How to Play; after that the menu is the default view.
- Menu, guide and roster each rendered with **zero console and zero network entries**.
- Guided practice match: ended turns, the AI acted through the engine, `Ironwrought Hound`,
  `Hollowroot Oracle`, `Bell of the Unmoored`, `Mireglass Stalker` and `Gilt-Ash Bargainer` all rendered
  their own `data-model-id`; an AI `Argent Nightlancer` rendered on its own tile.
- Selecting a 3-Flux Vessel with 2 Flux reported `… costs 3 Flux and you have 2` instead of promising a
  tile; with 3 Flux it reported `21 legal tiles are highlighted`, and the summon produced
  `deployed to C6 — it acts from your next turn`.
- Tutorial advanced 1 → 4 and displayed the blocked-step hint at step 2.
- Back row rendered two empty slots (`SLOT 1`, `SLOT 2`).
- Mobile 390×844: 43 px tiles, model visible, `A2 G5/5` on one line, gutter hidden.
- Screenshots regenerated into `screenshots/`.

### Not verified / limitations

- No GLB or skeletal animation; attacks lunge and tilt the whole body. Per-limb swings would need the
  weapon/head groups to be rotated around a joint origin, which is not implemented.
- No real 120-second browser expiry (engine tests cover it).
- No deck builder, shop, collection or online play; the menu labels them as absent.
- A full match to a victory screen was not played in this session; the match engine and its full-match
  tests were unchanged, and earlier sessions did reach the result overlay.

## Session 2026-10-28 · ART-001 · Voxel art pass, articulated rigs and the arena diorama

**Base revision:** `769a65c` (S-M2-D docs) plus the uncommitted S-M2-D change set.
**Environment:** Windows, Git Bash, Node v24.19.0, Python static server on `127.0.0.1:8123`,
Chromium preview at 1440×1200 and 390×844.

### Requested scope

Raise the visual bar of the game: detailed RPG-style voxel miniatures, a coherent dark-fantasy art
direction, articulated animation, a battlefield that reads as a miniature diorama, a real model
showcase, and a per-model art specification — without changing rules, card identities or data.

### What changed

| File | Change |
|---|---|
| `src/render/voxel.js` | Material-based face shading in JS, group pivots, angled boxes, idle/combat animation hooks, prop support |
| `src/render/models.js` | Palettes extended to a full material world per element; assembles element modules |
| `src/render/vessels/{fire,water,earth,metal,wood}.js` | 18 individually authored models, 728 boxes total |
| `src/render/vessels/_parts.js` | `box` / `pair` / `both` authoring helpers (new) |
| `src/render/terrain.js` | Authored ground map, props and decorative contract (new) |
| `src/main.js` | Ground/prop rendering per cell, arena name, roster spin/inspection, curated menu showcase |
| `styles.css` | Material faces, pivots, idle/attack animations, diorama plinth/posts/ground/props, roster stage |
| `index.html` | Arena caption, board stage and corner posts, roster rotation hint |
| `tests/models.test.js` | Detail bar, materials, pivots, rotations, proportions |
| `tests/terrain.test.js` | Coverage, symmetry, decorative contract, prop validity (new) |
| `docs/VOXEL_ART_BIBLE.md`, `docs/UNIT_VISUAL_DESIGNS.md` | Implementation status and per-model table |
| `screenshots/*.png` | Regenerated from the running build |

### Verified working

- All 18 official Vessels resolve to an authored model, render on the battlefield and in the roster,
  and are visually distinct in silhouette (asserted including rotations).
- The board renders 49 interactive tiles over a decorative diorama: layered ground blocks, props,
  plinth, corner posts, unit contact shadows, key light and vignette.
- Deployment, selection, movement, attack, Actions, Relics, turn flow and the AI are unchanged and
  still pass their suites; terrain is not imported by `src/game/`.
- Roster models rotate by drag and arrow keys; the stage uses the same node the match uses.

### Commands and results

```
npm test  ->  91 tests, 91 pass, 0 fail  (~0.5 s)
```

`models.test.js`: 9 tests, including the new ≥30-box / ≥4-group / ≥4-material floor.
`terrain.test.js`: 6 tests. Existing engine, cards, profile, match and tutorial suites unchanged.

### Browser verification (recorded)

- `http://127.0.0.1:8123/` — menu, guide, roster, settings, battle: **zero console errors**.
- Roster: 18 cards, 18 `data-model-id` nodes, 728 `.vox-box` nodes.
- Practice match to turn 6: four Vessels on the board at once (Wyrm of the Drowned Vault, Mireglass
  Stalker, Argent Nightlancer, Cloudbreak Coil) each rendered on their own tile; Flux, Vitality and
  the AI turn loop behaved as before.
- Mobile 390×844: 43 px tiles, board fully visible, stat line readable, caption collapses to the
  arena name, plinth/posts scale down.

### Defects found and fixed during the session

- `boxElement` assumed a palette; prop models carry raw hex colours and threw on every board render
  (`Cannot read properties of undefined`). Palettes now default to `{}` with a hex fallback.
- The board lost its width cap when wrapped in the new `.board-stage` and stretched across the
  layout; the stage is now `min(100%, 600px)` and centred.
- Per-face borders made 1–2 px voxels unreadable; removed in favour of material face tones.
- The Wyrm's neck and head were hidden inside the coil at tile size; rebuilt as a coil + S-body with
  the head above the ring. Still the weakest silhouette.

### Remaining bugs / limitations

- CSS-3D boxes only: no GLB assets, no GPU lighting, no dynamic shadows, rigid-group limb rotation.
- The Verdant Colossus still reads as a trunk with a cap at tile size; its canopy needs a distinct
  value break. The Wyrm needs a clearer head/coil separation.
- Props are static and can be visually overlapped by a Vessel's model; units always draw above them.
- Phone tiles favour stat readability; models are colour + shape only at 43 px.
- No full match to a victory screen was played in this session (engine tests unchanged).

### Next executable steps

1. **ART-002** — second pass on the Wyrm and Colossus, then a silhouette-gate review of all 18 at
   tile size (black-fill screenshots), not just at roster size.
2. **ART-003** — arena variety: pick two more authored arenas from `docs/ARENA_SYSTEM.md` as pure
   reskins (no terrain rules), with a selector in Match Setup.
3. **M2-001/M2-002 remainder** — effect queue ordering and validated prebuilt decks, which are still
   the blockers for a real collection/economy loop.

## Session 2026-10-28 · LAYOUT-001 · War table, card fields and Nexus target

**Base revision:** `e8703de` (ART-001) with a clean working tree.
**Environment:** Windows, Git Bash, Node 24.19.0, static Python server on `127.0.0.1:8123`,
Chrome via the preview panel at 1440×950, 1024×768 and 390×844.

### What the audit found

The battle screen was a vertical stack of unrelated boxes: status strip, opponent card, a 280 px side
panel, a nexus bar, the 7×7 grid, a nexus bar, a relic panel, the hand, the log and a footer. At
1440×950 the board alone was ~600 px and the hand was below the fold. Rooms existed for two Relics and
none for the four Vessel cards or four Action cards the redesign requires. The board was authoritative
and correct; the presentation around it was not.

### What changed

1. **One table (`index.html`, `battlefield.css`).** Opponent HUD, four back-row zones, four front-row
   zones, arena, player four + four, player console and hand share one plinth and one light. The
   marketing header shrinks to 54 px on the battle view via `body[data-view="battle"]`.
2. **Card fields (`src/ui/fields.js`).** `fieldState(match, seat)` projects exactly four Vessel slots
   and four Relic slots, with stable keys (`seat0:vessel:2`), free-slot counts and orderly fallbacks
   for units inserted outside a summon. Zones render the real model, live Guard, ATK/MV/RG, element
   and effect text; empty zones are labelled sockets.
3. **Engine zone ownership (`engine.js`).** Summons record `fieldSlot` (lowest free of four);
   `nextFieldSlot` is a small exported helper. Movement and death leave the slot map honest, so a
   new summon fills a gap instead of shuffling the row. Presentation metadata only.
4. **Rule alignment (`constants.js`, `GAME_RULES.md`).** `MAX_RELICS_PER_SEAT` is now 4 — one per
   back-row zone. Actions still resolve from hand and go to discard; the UI says so rather than
   pretending an Action can be set.
5. **Nexus target.** The opponent's HUD vitality block is now `#enemy-nexus`, clickable only when
   `getLegalAttacks` reports a Nexus strike; the player's block mirrors it for FX. Two dedicated
   nexus bars (58 px) were removed, so the board gained real estate.
6. **Interaction.** Vessel card → all four front-row zones `is-ready` plus 21 legal tiles; clicking a
   tile summons and fills the next zone; clicking a filled zone selects the unit; Relic card → only
   the next free Action socket glows; a wrong socket explains which is next; filled Relic shows its
   effect. Stale selections are cleared when a unit dies or a card leaves the hand.
7. **Terrain.** Deterministic per-tile tone shift, larger back-edge props, restored ground shadows,
   2 px seams. Still decorative; the rules engine and AI do not import `terrain.js`.

### Checks actually run

- `npm test` → **97 tests, 97 pass, 0 fail** (~0.5 s). New `tests/fields.test.js` (6 tests) and an
  updated four-Relic limit test; all earlier suites still pass.
- Browser, fresh incognito context:
  - all four + four zones render for both seats; the player console shows `RELICS 0/4`;
  - selecting Ember Lens lit only the first Action socket (`SET HERE`); clicking it produced
    `Ember Lens is set in back-row zone 1`, `Relics 1/4`, Flux 2→0, hand 7→6;
  - selecting The Unwritten Guest lit 21 legal tiles; clicking A5 spawned the model, filled the first
    Vessel zone (`WAIT`), paid 7 Flux and set `Vessels 1/4`;
  - clicking a filled Vessel zone selected it and highlighted the board; the hint changed to the
    unready wording;
  - after the opponent killed that Vessel, the next render cleared the dead selection;
  - `preview_logs`: no console errors; every module/CSS/data request 200 or 304;
  - 1024×768 and 390×844: no horizontal overflow; board capped by height and width respectively.

### Remaining limitations

- Actions cannot be set face-down or activated from a back-row zone; no canonical rule defines it.
- The board is still CSS 3D with no dynamic lights or GLB assets; the diorama reads best at desktop
  size, and the Wyrm/Colossus remain the weakest silhouettes at tile scale.
- At 390×844 the page scrolls: the opponent field and board are above the fold, the player field and
  hand below. No control is clipped and there is no horizontal overflow.
- The new Nexus strike control was not exercised against a live undefended Nexus; the `attack`
  command and click handler are unchanged and covered by engine tests.
- The four-zone field is not yet wired to a deck builder (not built).

### Next executable steps

1. **LAYOUT-002** — put Relics and Actions in a proper "set" flow only if `GAME_RULES.md` defines
   face-down timing; until then, add a relic-effect readout on hover/focus and keyboard grid
   navigation.
2. **ART-002** — arena scenery pass: flanking terraces, larger landmarks, and silhouette review of
   all 18 Vessels at 59 px tile size (black-fill screenshots).
3. **M2-001/M2-002 remainder** — effect queue ordering and validated prebuilt decks, still the
   blockers for a collection/economy loop.

---

## Session CONTENT-001 — compliance audit and the sixty-Vessel pool (2026-10-28)

### Scope

The directive required an evidence-based audit of every specified system, then implementation of the
highest-priority unfinished requirement. The audit (`docs/COMPLIANCE_AUDIT.md`) found the pool — 18
Vessels, 8 Actions, 4 Relics — to be the blocker for collection, deck building, packs, synergies and
varied AI play. It also found the roster size hardcoded in tests and copy, which would reject any
expansion. This session fixed both.

### Files changed

| File | Change |
|---|---|
| `docs/COMPLIANCE_AUDIT.md` (new) | 31-row requirement audit with evidence, status, missing action; drift analysis and workflow corrections |
| `src/cards/manifest.json` (new) | Schema v2 set manifest; the app and tests load sets from it |
| `src/cards/expansion-set.json` (new) | 42 Vessels, 22 Actions, 8 Relics |
| `src/game/constants.js` | Seven new subtypes; six Action kinds; three Relic auras; `EFFECT_TARGETING`; `VESSEL_KEYWORDS` |
| `src/game/content.js` | Targeting-contract and keyword validation; 40-card curated practice deck; element spread helper |
| `src/game/engine.js` | Keyword storage, stun/ready/revive/flux/nexusHeal/drain, ward, swift and dawn-draw auras, deathrattle |
| `src/game/ai.js` | Public keywords/stun/ward; scoring for every new Action kind; three new Relic values |
| `src/render/vessels/blueprints.js` (new) | Humanoid (including robe plan), beast, construct, drake and spirit rigs |
| `src/render/vessels/{fire,water,earth,wood,metal}.js` | 42 configured models appended; core 18 untouched |
| `index.html`, `src/main.js`, `styles.css` | Manifest loading, new effect/keyword text, 60-Vessel copy, hand name wrapping |
| `tests/{support,content,models,engine,ai}.test.js` | Manifest loading and target-based assertions |
| `tests/keywords.test.js` (new) | 12 tests for keywords and expansion effects |
| `package.json` | `npm run check` |
| `README.md`, `GAME_RULES.md`, `TODO.md`, `CHANGELOG.md`, `AI_HANDOFF.md`, `docs/TESTING.md` | Counts, vocabulary, status and evidence |

### Checks actually run

- `node --check` on `src/main.js`, `src/game/*.js`, `src/render/vessels/*.js` → clean.
- `npm test` → **112 tests, 112 pass, 0 fail** (~0.75 s).
- Browser, fresh incognito, `http://127.0.0.1:8123/?v=exp60fresh` (server already owned by the
  previous session; reused, not restarted):
  - Roster: **60 cards, 2,388 voxel boxes**, zero console errors, 346 ms synchronous render at 1440×950.
  - Keyword text renders (`Cinder Warden`: “Stalwart — Enters play with 2 additional Guard.”).
  - Practice match: 49 cells, eight zones per seat, 40-card deck (`DECK 34` after opening), an
    expansion Relic in hand, zero console errors.
  - Turn-3 summon of *Lantern of the Lost Choir*: 21 legal tiles, 3 Flux paid, Vessel zone 1 occupied,
    board model `data-model-id="vessel_lantern_lost_choir"` with 32 boxes.
  - Screenshots: `screenshots/roster-expansion.png`, `screenshots/roster-new-vessels.png`.
- Not run: a real 120-second deadline expiry; mobile re-check of the expanded hand/roster; balance
  simulation; any collection/shop/arena flow (none exists).

### Known limitations

- The 42 new models use five shared rigs; distinct proportions and gear satisfy the silhouette gate but
  several humanoids still look related at tile size. Only the robe body plan is a structurally
  different humanoid silhouette.
- New card balance is unproven. Costs follow the existing curve (roughly 1.5 × cost + 4 total stats)
  but no simulation or playtest was run.
- Ward, revive, stun and Flux cards have engine coverage but have not been played through a full
  human match.
- The working tree is uncommitted, so the live site still serves the previous build.

### Next executable steps

1. **ECON-001** — local-first collection + Aether Shards + six-card packs (5 Common / 1 Rare) +
   Dissolution, clearly labelled as demo data until trusted settlement exists.
2. **DECK-001** — deck builder over the 60-Vessel pool with canonical validation and three prebuilt
   archetypes.
3. **ARENA-002** — two selectable decorative arenas driven by data, then one rules-bearing arena with
   telegraphed, tested terrain effects.

## Session S-M2-E — GRID-002 and ART-002 (5x5 arena, generated card art, AI legality)

Owner directive: adapt the game to a 5x5 integrated arena with configurable geometry, a genuinely 3D
world, and full-background card art that depicts the same design as each playable model; then verify in
the running game rather than in source alone.

### What was implemented

- **Geometry from one source** (`src/game/constants.js`). `BOARD_SIZE = 5`, `DEPLOYMENT_ROWS = 2`.
  `enemyHomeRow(seat, size)` and `deploymentBounds(seat, size, rows)` take overrides and reject geometry
  whose zones would overlap; `rowOwner(y)` names each row's side. `src/render/terrain.js` throws at
  import if its authored map disagrees with `BOARD_SIZE`; `src/main.js` derives zone classes from
  `rowOwner`, writes the CSS `--grid` column count and generates the arena label, so no renderer
  hardcodes a row or a column count any more.
- **Card art** (`src/render/illustration.js`, new). `illustrationSvg(card)` projects the card's canonical
  voxel model with a fixed three-quarter camera, shades every face against a key light with per-material
  responses, painter-sorts faces across the whole figure, and stages it in a seeded element environment.
  Actions/Relics get emblem scenes keyed to `effect.kind`. Markup and data URIs are memoised.
- **Art in the UI**: hand cards (full-bleed layer + directional scrim + text shadow), the command-panel
  inspector (full illustration for the selected card) and the roster stage (same scene without the
  figure, behind the live rotatable model).
- **AI legality fix** (`src/game/ai.js`): `buildCandidates` now refuses attack plans for a unit that has
  already attacked and move plans for one that has already moved. `attacksFromCell` reasons about
  geometry only, so a move-then-attack could previously be proposed and rejected by the engine.

### Commands run and results

```
npm test
→ 122 tests, 122 pass, 0 fail, 0 skipped (~0.9 s)
```

New `tests/illustration.test.js` (8 tests): every card produces well-formed SVG; no `NaN`, `undefined`
or empty fills; each Vessel's art matches its model's part count, palette shading and declared voxel
height; no figure is clipped by the frame; two Vessels never share identical art; Action emblems differ
by effect kind; output is deterministic; every data URI is script-free and under 40 kB.

Seeded AI-vs-AI harness (12 seeds, standard difficulty, commands applied through `applyCommand`):
all 12 matches reached `phase: "over"` in 16-38 turns, both seats won at least once, **0 engine
rejections** — the same harness reported 1-2 `ALREADY_ATTACKED` rejections per match before the fix.

### Browser verification (CDP, 1440x950 and 390x844)

| Check | Result |
|---|---|
| Board renders 5 columns x 5 rows, 25 `.cell` targets | pass |
| Zone tints: rows 0-1 opponent, row 2 contested, rows 3-4 home | pass |
| Arena label reads "5 x 5 grid · 25 tiles" | pass |
| Vessel card selected: exactly 10 legal summon tiles highlighted | pass |
| Roster: 60 cards, all 60 stages carry a generated scene background | pass |
| Hand: 6 cards, art visible under the scrim, `scrollHeight 82 <= height 84` (no clipping) | pass |
| Inspector art renders for a Vessel and for an Action | pass |
| Console errors / failed art requests | 0 / 0 |

### Known limitations

- The world is CSS-3D (real boxes, perspective, per-face shading, painted contact shadows). No WebGL, no
  GPU lighting pass, no cast shadow map.
- Card art is procedural voxel rendering, not painted illustration; there are no bespoke per-card
  compositions.
- Only one arena layout ships, and a different `BOARD_SIZE` would still need its own terrain map.
- Balance of the 5x5 board is unmeasured against humans; the AI harness only proves matches terminate.

### Next executable steps

1. Commit and deploy the working tree (owner-authorised), so the live site stops serving ART-001.
2. **DECK-001** — deck builder over the 60-Vessel pool with canonical validation.
3. **ECON-001** — collection, Aether Shards, six-card packs and Dissolution, labelled demo-only.

## CARDS-001 — the printed collection (2026-10-28)

What was built: `src/render/card-face.js` (the face), `src/render/scenery.js` (five element
environments), `src/game/card-text.js` (rules and flavour copy per category),
`tools/build-cards.mjs` (the build) and `Cards/` (102 faces, 102 art layers, 3 frames, a manifest,
a QA sheet and a contact sheet). The game gained a Cards tab: the library, filters and a full-face
viewer shared by the roster and the hand.

Two defects were found and fixed while inspecting the render rather than the source:

1. **Every card was cropped.** The illustration canvas was 400x260 (1.54:1) but the art window is
   902x700 (1.29:1) with `preserveAspectRatio="...slice"`, so ~175 px of every scene — precisely the
   flanking towers, trunks and columns — was cut off. The canvas is now 400x310 and the figure is
   framed to 92–308 x 62–226, which leaves room for the architecture.
2. **The footer printed the internal card id** (`ARGENT NIGHTLANCER`) over the rarity label, and the
   rarity gem sat inside the word. The footer now prints only the rarity.

What is verified, and how:

| Check | Method | Result |
|---|---|---|
| Every card has a face | `node tools/build-cards.mjs` | 102 faces (60/30/12) |
| Faces match the catalog | `npm test`, `tests/card-files.test.js` | byte-equal to a fresh render, 7/7 |
| Whole suite | `npm test` | 129/129 pass |
| Library renders | browser, 1440x950 | 102 tiles, 0 broken images |
| Filters work | browser | Metal 21 cards; Metal + Vessels 12 |
| Viewer works | browser, 390x844 | 343x647 image, inside the viewport |
| Roster viewer | browser | "Printed card" opens the same face |

Not done, stated plainly: no deck builder, ownership, economy or packs; art is generated voxel
sculpture rather than painted illustration; balance is untested; no PNG export is produced.

## S-ART-C: distinct body plans and legible card numerals (2026-10-28)

Reported defects: rig-built Vessels shared silhouettes (the Clockwork Hydra read as the
Ironstep Sentinel's twin even though its brief describes a three-headed brass serpent), and
card numbers overlapped the sword/shield badges, lacked usable outlines, and sat low in the
Flux orb.

Fixed:

- `clockwork_hydra` moved to the `serpent` rig (three coil tiers, raised trunk, three fanned
  necks, brass scale plates, clawed forelimbs). `ironstep_sentinel` stays a `slim` construct
  with an `antenna` crest. `quiet_engine` moved to `quad`, `tomb_colossus` to `tower`.
- All 42 rig Vessels now set structural axes rather than only colour/size. The full axis
  vocabulary is documented in `docs/VOXEL_ART_BIBLE.md` section 4b.
- Humanoid heads gained a lit neck column and a `bone` face plate; beast heads gained a longer
  neck, larger skull, face plate, jaw and repositioned eyes. Before this, a head flush with the
  shoulder mass disappeared at both tile and card scale.
- `quad` / `tower` / `wraith` / `crowned` / `core` gained authored geometry (chain fists,
  buttresses, sarcophagus slabs, grave lamps, ribs, tendrils, petals) so every model clears the
  30-box, 4-group, 4-material floor.
- `statMedallion()` re-zoned; numeric text is drawn as a dark halo plus a white face with a
  keyline; ATTACK/GUARD labels moved to plates under the disc; cost uses a lining-figure stack
  and a `0.34 em` cap-height offset, measured in Chrome (Georgia's old-style 3/4/5/7/9 descend
  0.18 em below the baseline, Cambria/Times descend 0.01 em).
- Vessel illustration target enlarged from 216x164 to 284x188 art units.

Observed checks: `npm test` 129/129; `node --test tests/models.test.js`; `node
tools/silhouette-report.mjs` (worst pair 0.895, none at or above 0.90; Hydra vs Sentinel 0.485); `node
tools/build-cards.mjs` 102 faces, 0 missing models/rules; card faces and model art inspected in
Chromium at 1086x2048 and 3.7x art scale.

Not verified in this session: the in-game browser capture of the roster (`preview_screenshot`
refused because the window was not being drawn). The roster renders through the CSS-3D path in
`src/render/voxel.js`, which the model tests cover structurally but not visually.

## ART-004 — lean predator body plan (2026-10-28)

The beast rig gave every animal the same barrel body. Hounds, stalkers and chargers differed from the
Rams and the Warden only by palette, bulk and horn — the same complaint the Hydra had.

- Added `build: "lean"` to the beast rig as a second body plan rather than a resized heavy one:
  proportional limbs (segment heights are fractions of the belly line, so any posture keeps contact
  with the body), a deep narrow ribcage set forward over the forelegs, a waist that tucks up and
  narrows behind it, a back arching over the chest, a forward-reaching neck, a shoulder mass with
  spine knobs, and a long counterbalancing tail.
- Posture is the stature control: `low` stands level, `prowl` drops the chest and raises the
  haunches, `rear` rises on the hind legs with the forelimbs raised as clawed paws.
- Extracted the skull vocabulary into `beastHead()` and added `skull: "wedge"`: cranium, brow ridge,
  long low muzzle, dark nose, dropped under-jaw, fangs, deep-set eyes. The old single long skull box
  read as a plank. Horn bases now follow the skull plan so ram/antler/spike horns attach to the
  cranium instead of the muzzle. The heavy plan's geometry is unchanged.
- Applied to `brine_hound` (level, fan tail), `bramble_stalker` (`prowl`, six legs, spike horn) and
  `glass_horn_charger` (`rear`, ram horn). `slatehorn_ram`, `mossback_warden` and `antlered_bulwark`
  keep the heavy plan.

Two defects were found by rendering the box data, not by the tests: the reared charger's hind legs
floated about a unit below its raised chest (fixed by proportional limb stacking), and thin flank rib
bars read as debris beside the torso at card size (removed in favour of a shoulder mass).

Observed checks: `node tools/silhouette-report.mjs` lean vs heavy 0.346-0.620 IoU, lean trio
0.415-0.590, worst roster pair unchanged at 0.895; `npm test` 129/129; `node tools/build-cards.mjs`
102 faces with 0 missing models and 0 missing rules, and `Cards/` rebuilt so the on-disk stale-artefact
guard passes again. Geometry inspected in `screenshots/beast-builds.png`.

Not verified: in-game Chromium capture (`preview_screenshot` refused while the browser window was not
being drawn), so the CSS-3D path was not re-screenshot this session.

## ART-005 — humanoid body plans and the human knight wave (2026-10-28)

Four slim humanoids shared an outline at 0.845-0.895 IoU, and the roster's "knights" were wardens,
lancers and constructs rather than ordinary armoured humans.

- Humanoid rig gained `robe: "split"` (short flared tabard, belt, visible boots — the columnar robe
  had given two casters the same 0.917 silhouette), a horizontal `wire` weapon, and a back `pack`
  (frame, chain, bucket). Reef Duelist now lunges in a bent crouch, Quarry Engineer carries a pike and
  pack, Emberwright Adept wears the split tabard with a tome, Razorline Duelist holds the wire. The
  four measure 0.758-0.848 against each other.
- Five human Vessels added, one per element, as cards and models: Oathstone Knight (Earth 4/7
  stalwart), Ironvow Paladin (Metal 6/7 stalwart), Tidewall Sentinel (Water 3/5 stalwart),
  Cinderwatch Knight (Fire 5/4 swift), Thornmarch Ranger (Wood 2/3 swift). Pool: 65 Vessels (13 per
  element), 30 Actions, 12 Relics = 107 cards.
- Pauldron depth no longer scales with the shoulder multiplier; the depth scaling turned a broad
  knight's shoulders into flat boards from the three-quarter camera.
- Card Library footer and the menu/guide headings read the catalog size instead of printing "102".

Observed checks: `node tools/silhouette-report.mjs` worst roster pair 0.877, none >= 0.90; new knights
0.815-0.874; `npm test` 129/129; `node tools/build-cards.mjs` 107 faces with 0 missing models and 0
missing rules and the on-disk set byte-equal to a fresh render. Chromium captures:
`screenshots/knights-wave.png`, `screenshots/knight-art.png`. Orthographic box-data sheet:
`screenshots/humanoid-sheet.png`.

Not verified / not done: no ownership, deck building or economy for the new cards; balance untested.
The robed casters remain the closest cluster at 0.86-0.877.

## Session 2026-10-28 · ART-006 · Literal humans + stepped arena (uncommitted)

**Base revision:** working tree continuing ART-001..ART-005; nothing committed or deployed in this
session.
**Environment:** Windows, Git Bash, Node v24.19.0. A no-store static server on 127.0.0.1:8130 was
used for browsing, because Python's `http.server` let Chromium serve a cached `styles.css` and
every CSS change appeared to do nothing (verified: computed background still matched the previous
rule after a normal reload).
**Work:**
1. Audited the five human Vessels in a probe page at 15 px/voxel. Result: identical face, identical
   arm pose, identical torso; weapons were near-flat sticks. The complaint was accurate.
2. Rewrote the human head (proportions, eyes with irises, brows, nostrils, mouth, chin), added hair
   and beard plans, added the pose system with hand anchors, rebuilt the torso (hips, waist, chest,
   collar, deltoids) and the legs, added garments and kit, and respecified the five humans.
3. Rewrote `src/render/terrain.js` (layout, six surface types with height steps, sixteen scenery
   models, fifty placements) and added the tile side wall, voxel grain, prop contact shadows and
   board-scale Vessel rendering in CSS.
4. Fixed three rendering defects found by inspection: the side wall was a horizontal slab
   (`rotateX(-90deg)`); board Vessels rendered at 3.9 px/voxel because no board-specific `--u-base`
   existed; a nested `preserve-3d` context painted a dark panel over each unit tile (fixed with
   `transform-style: flat` on `.unit`).
**Verification actually run:** `npm test` 129/129; `node tools/build-cards.mjs` (107 cards, 0
missing models/rules/flavour); `node tools/silhouette-report.mjs 0.84` (no human pair >= 0.84);
screenshots at 690x1225 and 390x844. The illustration budget test failed once (Ironvow Paladin
61,472 bytes > 60,000) and was fixed by dropping edge strokes on sub-9 px^2 facets and thinning the
mail ring grid, not by raising the limit.
**Not verified:** no formal tooltip/ARIA pass on the new hash marks; combat animations were not
re-watched on the new terrain; mobile was checked visually only at 390 px wide.

## Session 2026-10-29 · Full 3D battlefield + Deck Builder + Shop + Online Lobby preview (uncommitted at log time)

**Base revision:** `main` at `ffbf2be` (merge); working tree clean at session start. Baseline `npm test`
129/129.
**Task:** two mandatory phases — (1) reconcile all canonical directives, (2) implement the redesigned
3D battlefield (5x5, two four-slot rows per player, Relics, discards, approved frames, Three.js arena)
plus Deck Builder, Shop, and Online Lobby. No balance changes; `GAME_RULES.md` stayed authoritative.
**Phase 1 (directives):** appended the canonical field layout to `docs/ARENA_SYSTEM.md`,
`docs/CARD_FRAMES.md`, `ART_BIBLE.md`, `CARD_DESIGN_GUIDE.md`, `docs/IMPLEMENTATION_PROMPT.md`; mandatory-read
block in `AI_INSTRUCTIONS.md`; layout clarification in `GAME_RULES.md` (no rule change); refreshed
`PROJECT_BRIEF.md` status; 2026-10-29 additions in `TECHNICAL_ARCHITECTURE.md`; integration note in
`CardFrames/FRAME_DIRECTIVE.md`; identity notes in `docs/UNIT_VISUAL_DESIGNS.md`, `docs/VOXEL_ART_BIBLE.md`.
Fixed stale strings: `src/ui/fields.js` (25 tiles, `RELIC_SLOTS` alias for the misnamed
`ACTION_SLOTS`), `src/main.js` ("two home rows"), `index.html`, `tests/terrain.test.js`,
`docs/MECHANIC_ADAPTATION_MATRIX.md`.
**Canonical layout decided:** per seat — 4 Vessel slots (= the deployment cap, never extra units),
4 Relic sockets (= the Relic cap), a 4-slot Action staging row that is a VIEW of the first four
Action cards in hand (Actions are never a zone; they resolve hand → discard), and 1 engine-owned
discard pile. Card geometry is 214:300 from the approved frames; `Cards/EXAMPLE.jpg` is composition
reference only (752x1418). Relics have no approved dedicated frame — neutral "RELIC FRAME PENDING"
presentation, never a borrowed Vessel frame.
**Phase 2 (implementation):**
- `src/render/arena3d.js` (new): Three.js scene via CDN ES module, no build step; tiles from
  `terrain.js`, voxel Vessels via `modelFor`, field platforms, discard stacks, label sprites, raycast
  picking, drag-orbit, pure exports `cellToWorld`/`worldToCell`/`fieldLayout`/`cameraForWidth`
  (desktop [0,8.5,10.5], mobile <700px [0,13.5,5.5]). CSS-3D board stays as fallback + accessible
  grid behind an arena toggle; if Three/WebGL fails the game stays playable with a notice.
- `src/ui/fields.js` + `index.html` + `styles.css`: opponent DISCARD chip, per-player "View discard"
  buttons opening an approved-frame discard modal (`openDiscardViewer`), arena container/toggle/notice,
  Decks/Shop/Lobby tabs and views, "Play with active deck" menu button. `NOT IN THIS BUILD` block
  replaced with an honest status note.
- `src/game/decks.js` (new): sanitize/CRUD, `validateDeckWithOwnership`, `maxDeckRequirement`
  (dissolution guard). `src/game/economy.js` (new): `rollPack` (exactly 5 Common + 1 Rare-or-better,
  Unranked rates 90/9/1), `purchasePack`/`purchaseSingle`/`dissolve`/`starterCollection`/
  `sanitizeEconomy` (now also carries `decks` + `activeDeckId`); prices adopted from
  `docs/PROGRESSION_AND_CONTENT.md` proposals and labelled as shipped local defaults: new profiles
  300 Lattice Shards, pack 300, Singles 60/100/240/600/1200, dissolution 10/15/40/100/200, starter
  copies bound and never dissolvable, purchases idempotent by operation id. Economy is LOCAL-PROFILE
  ONLY — decks/collection/Shards do not sync via cloud RPCs (needs a migration; tracked as blocked).
- `src/ui/systems.js` (new): Deck Builder (create/edit/save/duplicate/rename/delete, search/sort/
  filter, composition counts, precise validation errors, ownership-aware add buttons, active-deck
  selection gating match start), Shop (balance, packs, singles, dissolution with pre-confirmation),
  Lobby UI (create/join/leave, readiness, deck selection, connection status). Wired into `main.js`
  via callbacks; starter profile seeds a legal 40-card "Starter Lattice" deck + bound starter
  collection; active legal+owned deck plays for the human seat, else the practice deck.
- `src/game/lobby.js` (new): room state machine, 6-char codes from an unambiguous alphabet,
  `validateRemoteCommand`/`recordRemoteCommand` (seat/sequence/command-id checks).
  `src/net/online.js` (new): Supabase Realtime channel per room code, dynamic CDN import of
  `@supabase/supabase-js@2`, room/command/join broadcasts + presence.
- `src/main.js`: `mySeat()`/`foeSeat()` (online-aware; offline seats unchanged), online match start /
  remote-command apply (envelope validated, then engine; desync logged honestly, never hidden),
  broadcast of local commands with unique ids, AI turn suppressed online, online match end records
  no stats/rank/currency, discard viewer, arena mount with `arenaMounting` guard + fallback notice.
  One defect fixed during review: the arena `onUnit` callback captured the mount-time match object —
  it now resolves `ui.match` at click time, so a second match reuses the mounted arena correctly.
- `src/render/approved-frame.js` (new): `FRAME_GEOMETRY` mirroring the manifest, `frameKeyFor`
  (element → frame, action → action, relic → null).
**Honest limits (do not overclaim):** Online Lobby is a PEER-VALIDATED PREVIEW over Supabase
Realtime broadcast, NOT server-authoritative — authoritative Edge Functions are BLOCKED pending owner
approval + a database migration (repo `AI_INSTRUCTIONS.md` forbids migrations/provisioning without
separate approval). Online matches grant no rewards/rank/stats. Hands are never broadcast; both
clients shuffle locally from a shared seed. Two-browser end-to-end lobby verification NOT yet done.
Battle-hand cards still use the legacy hand renderer; approved-frame migration of the battle hand is
outstanding. Dedicated Relic frame still PENDING (no asset provided).
**Verification actually run:** `npm test` 149/149 (baseline 129 + new `tests/decks.test.js`,
`tests/economy.test.js`, `tests/lobby.test.js`, `tests/frames.test.js` (PNG IHDR vs manifest),
`tests/arena3d.test.js`); one self-inflicted test error fixed (seat 0 deck after opening hand +
first-turn draw is 34, seat 1 is 35 — test corrected, engine untouched). Local static servers on
ports 8000 (root) and 8001 (`/veylattice` subpath symlink); curl 200s for index/main/systems/
arena3d/overlay/manifest at both paths. Browser verification: BLOCKED at the tool layer, not the app. The live-browser session rejected every local address before loading (localhost and the VM's reserved-range address both refused as invalid requests; a public-IP control was attempted normally, so the block is specific to non-public addresses). The local servers themselves answer 200 (verified by curl). No menu/tab/deck/shop/lobby/arena observation was obtained this way. Remaining verification paths: (a) the user takes over the live browser window, navigates to the local build, and hands it back, or (b) commit + push, then verify against the public live site and fix forward. Decision taken 2026-10-29 09:56 EDT by the owner: push first, then verify on the live site (see commit/push record below).
**Not verified / not done:** two-browser lobby E2E; server-authoritative multiplayer; cloud economy
sync; mobile WebGL performance measurement; battle-hand approved-frame migration; Relic frame.

## Session 2026-10-29 · AUDIO-001 · Soundtrack system (tracks absent — BLOCKED)

**Base revision:** working tree continuing the 2026-10-29 battlefield/Deck Builder/Shop/lobby
change set (uncommitted at session time); `npm test` 149/149 at session start.
**Phase 1 finding (verified, not assumed):** there is NO `music/` directory and NO audio file
of any format anywhere in the repo — checked the working tree, `git ls-files`, a filesystem
scan for mp3/ogg/wav/flac/m4a/opus, and `git log --all -- music/*` (empty). The directive's
premise of supplied tracks does not hold for this tree. No track identity, duration, or format
could be measured (ffprobe is installed but there is nothing to probe), no file was renamed,
regenerated, or invented, and no role was pointed at an unrelated track. All six roles are
manifest-missing by verified fact. A second premise correction: the directive calls Deck
Builder and Shop "planned, not functional" — in this tree both are functional screens, so
their themes are wired to real screens.
**Implementation:** `src/audio/soundtrack.js` (manifest + `createAudioManager`, dependency-free);
`src/net/profile.js` (`profile.settings.audio` via `sanitizeAudioSettings`); `src/main.js`
(manager owned at boot, `viewMusicRole` driving `showView`, stinger key per match,
`onMatchEnd` stops battle music then plays exactly one victory/defeat sting, draws none,
`renderResult` untouched by audio, gesture unlock + visibility handlers, working mute/range
controls in the profile view); `index.html` audio controls with `role="status"` status line.
Track URLs resolve as `music/<file>` under the document base (Pages-subpath safe).
**Verification actually run:** `tests/audio.test.js` (15 tests) + updated `tests/profile.test.js`
expectation for the extended settings shape. Three defects were caught by the new tests and
fixed, not waived: (1) `new URL("music/x", base)` without a trailing slash drops the last
path segment — the resolver now forces a directory base; (2) autoplay-rejection retries were
swallowed by the no-restart guard — the manager now tracks whether the element ever started;
(3) the started flag had to become optimistic-synchronous or rapid re-renders replayed.
Final: `npm test` 164/164, `npm run check` 164/164, 0 fail; `node --check` clean on all touched
modules. Browser check of the running app: local-browser route blocked at the tool layer (see
earlier entry); owner chose push-first, live-site verification second.
**Not verified / not done:** any audible music (no files); loop seamlessness of unreceived
tracks; SFX playback (volume channel only, no SFX assets); supplying the six tracks remains
BLOCKED on the owner.

## Session 2026-10-29 · AUDIO-001 (continued) · Supplied tracks wired

**What changed mid-session:** while the soundtrack system was being built, origin/main moved
from ffbf2be to f51cec5 ("music"), supplying exactly six MP3s. The local commit was rebased
onto f51cec5 (clean, no conflicts — f51cec5 touches only `music/`). A plain `git push` then
failed in this shell (no credential prompt available), so the push route is the GitHub Data
API via the user's connected custom.github credential (see push record below).
**Verification of the tracks (ffprobe + full ffmpeg decode, all clean, MP3 48 kHz stereo):**
menu `Veylattice_ Main Menu.mp3` 174.0 s / 4,004,186 bytes; battle `Veylattice_ Battle.mp3`
153.6 s / 3,735,339; preparations `Veylattice_ Planning.mp3` 137.6 s / 3,397,241; shop
`Veylattice_ Shop.mp3` 172.0 s / 4,276,127; victory `Veylattice_ Victory.mp3` 12.4 s / 318,839;
defeat `Veylattice_ Defeat.mp3` 11.0 s / 275,583. Filenames map unambiguously to the six
directive roles, and the stinger durations match the ~10 s signature. Musical character was
NOT auditioned (no listening tool in this environment) — the mapping claim rests on filenames
plus durations, stated as such wherever it appears. Manifest, tests (real-manifest test now
asserts the six files exist; missing-file test uses an explicitly empty manifest; a
space-in-filename URL case was added), and all docs that previously said "absent" were
updated in the same change set. Final: `npm test` 164/164.
**Not verified:** audible playback in a real browser (autoplay-gated; live verification
pending); loop seamlessness of the background tracks (no loop-point metadata supplied).

## Session 2026-10-29 · Live verification of ab35232 at xiondigital.net/veylattice/

**Method:** live-browser check of the public site (10:11–10:27 EDT), no sign-in, no purchase,
no spending (Shop Buy button present, not clicked). **Verdict: the live site serves the NEW
build, not a stale cached one** — all new-build markers present on first load.
**Observed:** menu tabs Menu / Battle (disabled until a match starts) / How to Play / Roster /
Cards / Decks / Shop / Lobby / Settings, heading "Command the Lattice."; Decks tab lists
"Starter Lattice" as 40 cards · 20 Vessels · 16 Actions · 4 Relics, LEGAL and ACTIVE; Shop tab
shows "Balance: 300 Lattice Shards" with a "Buy pack — 300 Shards" button and the 5 Common +
1 Rare-or-better pack note; Lobby tab shows the peer-validated-preview status text with its
NOT-server-authoritative disclaimer plus Create/Join room controls; Profile/Settings AUDIO
section shows an unchecked "Mute all sound" box, MASTER 100 / MUSIC 80 / SFX 80 sliders, and
the status line "Now playing: menu."; a Practice match with the Starter Lattice deck rendered
a 3D canvas ("3D tactical battlefield. Click a tile to act.", Classic-grid toggle present),
board labelled "5 × 5 grid · 25 tiles" (A1–E5), turn 1 "Your turn", Flux 1/1, hand 6, deck 34;
clicking "Quarry Verdict" (Earth Action, 3 Flux) selected it and showed the target banner and
a disabled "Choose a target on the board" button with "No legal target right now."
**NOT verified (stated, not assumed):** console output — the browser view would not open a
developer console, so zero console errors is NOT claimed; no visible page error, error banner,
or broken rendering was observed. Audible music was NOT confirmed — the page reports "Now
playing: menu." but the remote browser produced no identifiable audio; music playback in a
real user browser (autoplay-gated to the first gesture) still awaits the owner's own listen.
**Push record:** local commit a398ba9 pushed via the GitHub Data API (plain `git push` cannot
prompt for credentials in this shell) to remote ab35232e58b4b8b2fefa82018a56c1f1efb7dbf8
(tree identical to local); local branch reset to origin/main, clean tree.
