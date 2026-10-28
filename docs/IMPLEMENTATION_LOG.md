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
