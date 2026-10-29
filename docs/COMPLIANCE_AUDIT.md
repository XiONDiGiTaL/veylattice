# Compliance Audit — Specification vs. Implementation

Recorded 2026-10-28 against `main` at `e8703de` plus the uncommitted LAYOUT-001 change set.
Updated after GRID-002 / ART-002: the board is now 5x5 with configurable geometry, every card has
generated art projected from its model, and the AI candidate builder no longer proposes spent actions.
This audit is evidence-based: every status cites code, a test run, or a browser observation made in
this session. A design document, a JSON entry, a labelled placeholder or a rendered button is **not**
counted as a working feature.

Baseline commands executed for this audit:

```
git status --short        # 15 modified + 8 untracked files (LAYOUT-001 plus this audit)
npm test                  # 122 tests, 122 pass, 0 fail (after GRID-002/ART-002; 112 before, 97 before CONTENT-001)
node -e "..."             # roster inventory: 18 Vessels (fire 3, water 4, wood 3, earth 4, metal 4)
```

## Audit table

| Requirement | Specified behavior | Actual implementation | Evidence | Status | Required action |
|---|---|---|---|---|---|
| Main menu and navigation | Boot to a menu; every reachable control works | Five views (`menu`, `guide`, `roster`, `battle`, `profile`) switched by `VIEWS`/`showView`; Battle tab disabled until a match exists | `index.html` sections `#view-menu`…`#view-profile`; `src/main.js` `VIEWS`, `showView`; browser runs in prior sessions | Implemented and verified | Keep as-is |
| Tutorial and onboarding | Guided first match built from real engine events | 8-step How to Play plus a guided practice match driven by accepted engine events, with Skip and a state-aware hint | `src/ui/tutorial.js`, `tests/tutorial.test.js` (7 tests) | Implemented and verified | Add ability/keyword explanations with the expanded roster |
| Tactical battlefield and grid | Central 5×5 grid with integrated card zones and configurable dimensions | 25 tiles, 10/5/10 zone split, four Vessel + four Relic zones per seat projected from state; every consumer derives from `BOARD_SIZE`/`DEPLOYMENT_ROWS` and the terrain map refuses to load mismatched geometry | `src/game/constants.js` (`rowOwner`, `deploymentBounds`), `src/ui/fields.js`, `src/render/terrain.js`, `tests/models.test.js` geometry tests | Implemented and verified | Arena variety still missing (see below) |
| Vessel deployment | Legal deployment only, one summon/turn, four-Vessel cap | Engine-validated deployment rows, `summonUsed`, `MAX_UNITS_PER_SEAT`, zone slot assignment | `src/game/engine.js` `handleSummon`; engine tests | Implemented and verified | — |
| Action and Relic zones | Four front-row Vessel zones and four back-row Action zones; set/activate rules | Relics set into the four back-row sockets; **Actions resolve from hand and never occupy a zone**; no face-down set or activation timing exists | `src/ui/fields.js`, `handlePlayRelic`; `GAME_RULES.md` | Partially implemented | Requires a canonical set/activate rule before code |
| Movement and combat | BFS movement, range + orthogonal line of sight, persistent Guard, retaliation | Implemented in the engine with deterministic tests, elemental packets and simultaneous retaliation | `tests/engine.test.js`, `tests/elemental.test.js` | Implemented and verified | — |
| Turn progression and timeout | 120 s deadline, materialized timeout, fatigue | `tick` turns an expired deadline into exactly one turn transition; injected clock in tests | `src/game/engine.js` `tick`, deadline tests | Implemented and verified | Real 120 s browser expiry not waited out |
| AI opponents | Legal-action AI with no hidden-hand access, bounded time, several strategies/difficulties | Observation excludes opponent hand/deck; candidates from `getLegalActions`; 4 difficulties (8/20/45/120 ms), 3 archetypes | `src/game/ai.js`, `tests/ai.test.js` | Partially implemented | Directive asks for 6 archetypes (Reclaimer, Architect missing) |
| Card library and variety | At least 60 Vessels, 30 Actions, meaningful Relics | **65 Vessels (13 per element, one armoured human per element), 30 Actions, 12 Relics** (107 cards) via a set manifest; 19 typed effect kinds, all used | `src/cards/expansion-set.json`, `manifest.json`; `tests/content.test.js`; CONTENT-001 | Implemented and verified | Balance simulation still outstanding |
| Deck construction | Deck Builder with canonical 20–40 / 10 Vessel / 5 Action / 3-copy rules | `validateDeck` exists and is tested; **no deck builder UI**; one generated practice deck | `src/game/content.js`, `buildPracticeDeck` | Partially implemented | Build deck UI after the pool expands |
| 3D voxel models | Individually designed models for every official Vessel | 65 models / 2,890 boxes: 18 hand-authored, 47 configured from five rigs with separate robe, split-tabard and lean-predator body plans; no pair above 0.877 silhouette IoU | `src/render/vessels/*`, `blueprints.js`, `tests/models.test.js`; browser roster run | Partially implemented | Several humanoids share a rig and look related at tile size; CSS-3D only, no GLB/skeletal animation |
| Arena system | Data-driven, selectable arenas with distinct identity; effects must be explicit and tested | `src/arenas/arenas.json` has 7 entries, all `status: "concept"`, none loaded; exactly one hand-authored decorative ground map | `src/arenas/arenas.json`, `src/render/terrain.js`, `tests/terrain.test.js` | Documented but not implemented | Implement at least two selectable decorative arenas, then rules-bearing ones |
| Card art | Full-background illustration on every card, depicting the same design as the playable model | Generated SVG for all **107 cards**; each Vessel figure is a projection of its own `VOXEL_MODELS` entry (palette, geometry, voxel height), staged in a per-element place (gatehouse, grove, drowned temple, furnace hall, canyon gate) with weather, floor, fog and foreground, plus rarity treatment; Actions/Relics get emblems keyed to their effect kind | `src/render/illustration.js`, `src/render/scenery.js`; `tests/illustration.test.js` (8 tests) | Implemented and verified | Procedural voxel rendering, not painted illustration; compositions vary by element and seed, not bespoke per card |
| Printed card faces | One finished face per card with the reference layout, and no stat sockets on non-units | 107 faces at 1086x2048 with fitted title, Flux medallion, attribute line, emblems, 902x700 art window, Attack/Guard medallions, rules then flavour, rarity plate; Actions/Relics print an ACTION/RELIC band and no stats; the game exposes them in a Cards tab with filters and a full-size viewer | `src/render/card-face.js`, `tools/build-cards.mjs`, `Cards/`; `tests/card-files.test.js` (7 tests, byte-equal to a fresh render) | Implemented and verified | No PNG export; library is browse-only (no ownership or deck builder) |
| Card collection and inventory | Persistent, ownership-aware collection | **No inventory, no ownership model, no UI** | `grep` for collection/inventory → no gameplay code | Missing | Persistent local-first inventory with prepared migration |
| Currency | Earned currency with trusted validation | **No currency** | none | Missing | Implement earned Aether Shards locally, label trust boundary |
| Card shop | Purchasable singles and packs | **No shop** | menu labels it "not in this build" | Missing | Shop UI on top of inventory |
| Booster packs | Exactly six cards: 5 Common + 1 Rare | **No pack logic or odds** | none | Missing | Implement with seeded RNG and composition tests |
| Card recycling | Dissolution of surplus copies | **No recycling** | none | Missing | Implement after inventory |
| Online lobbies | Room codes, seats, reconnect, no hand leakage | **No transport, no lobby, no server** | none | Missing | Needs trusted backend first |
| Custom card creation | Validated point-budget Forge, casual only | **No code**; only `docs/CARD_CREATOR.md` | none | Documented but not implemented | Defer until content schema is v2 |
| Lore Bonds and synergies | Authored pairings, non-stacking, custom exclusion | `lore-bonds.json` exists with `activation` data; **no resolver, no stat application, no UI** | `src/cards/lore-bonds.json`; no engine reference to `loreBondIds` | Documented but not implemented | Resolver milestone M7-002 |
| Bestiary / Codex | Stats, abilities, lore, authored synergies | Roster page renders model, stats, role, flavour and keyword explanations for all 60; no synergy section or filters | `renderRoster()` in `src/main.js`; CONTENT-001 | Partially implemented | Add authored synergies and filter/search |
| Automated tests | Rules, content, models, art, UI invariants | 122 tests across 14 files; deterministic clock and RNG; content target gates and keyword/effect coverage | `npm test` → 122/122; `npm run check` | Implemented and verified | No browser automation suite; no balance simulation |
| Production deployment | Playable at `xiondigital.net/veylattice` | GitHub Pages project site live; **LAYOUT-001 is uncommitted, so live serves the previous build** | `git status`; prior live checks in `AI_HANDOFF.md` | Implemented, stale | Commit and deploy this build |
| Account persistence | Names, avatars, progress survive sign-in | Local-first profile + recovery-code accounts with RPC-only Supabase project; collection not persisted | `src/net/profile.js`, `docs/ACCOUNTS.md`; live RPC checks recorded | Partially implemented | Progress persistence needs the inventory |
| Google / Discord sign-in | Link social accounts like Sohbet | **Not implemented**; provider config unavailable; UI states the limitation | `docs/ACCOUNTS.md` | Blocked | Requires provider credentials and owner approval |
| Match-end screen | Explain result and offer rematch | `gameOver` handled in `playEvents`; board selector and banner present; no dedicated result dialog | `src/main.js` event handler | Partially implemented | Add a result overlay with rematch |
| Difficulty/archetype settings | User-facing selection with real behavioral difference | Settings persist difficulty + archetype; difficulty changes time budget/noise only | `src/main.js` profile controls, `tests/ai.test.js` | Implemented and verified | Add Reclaimer/Architect |
| Performance | Measured at tile size | Estimator only; no profiling harness; 728 boxes documented as a risk | `AI_HANDOFF.md` "Known risks" | Not measured | Profile before raising box counts |
| Accessibility | Keyboard traversal, reduced motion, no hue-only signalling | Reduced-motion support and labels exist; **no grid keyboard traversal** | `src/main.js` `keydown` handlers; TODO M7-005 | Partially implemented | Keyboard pass |
| Server authority / anti-cheat | Client cannot award currency or invent ownership | Not applicable yet: no economy. Supabase writes are RPC-only | migrations, `docs/ACCOUNTS.md` | Missing | Required before any rewards |
| Abuse throttling | Bounded profile/account creation, code attempts | **No rate limiting** | TODO M2-005 | Missing | Needs an edge component |

## Why earlier directives drifted

1. **The working tree was treated as delivered.** LAYOUT-001 is complete and tested but uncommitted, so
   the public game still shows the old layout. The handoff says this explicitly, but the session ended
   before the commit and deploy, which is why the owner still sees the old build.
2. **Roster size was baked into copy and tests.** The menu, roster heading, `tests/models.test.js`
   (`assert.equal(OFFICIAL_IDS.length, 18)`) and `tests/content.test.js` (`length, 18` / `30`) all
   encode 18 as a ceiling. Adding a card would fail tests rather than extend the game.
3. **Data without a consumer was logged as progress.** `arenas.json` (7 arena concepts) and
   `lore-bonds.json` were written before any resolver, so documents described arenas and bonds that the
   game cannot use. The audit now marks these "documented but not implemented".
4. **Work was scoped to one screen per session.** The battle screen was redesigned four times while
   collection, deck building, arenas and bonds — explicitly specified systems — were never started.
5. **"DONE" sometimes meant "rendered".** M2-004's profile and M2-006's accounts were genuinely
   verified against the live database; the four card zones were verified in the browser; but the
   roster target and arena system were reported in TODO as milestones without acceptance evidence.

## Workflow corrections applied with this audit

- Card counts are no longer asserted as literal 18/30 in tests: the suite now asserts the **target**
  (60 Vessels / 30 Actions / 12 Relics), per-element distribution, model coverage for every Vessel, and
  model uniqueness. Adding a card extends the game; removing one fails the gate.
- `npm run check` runs syntax checks plus the full suite so a session cannot end on a green suite that
  was never executed.
- Every new gameplay element (keywords, effect kinds) must have an engine test and a UI description in
  the same change set; content that validates but does nothing is rejected by review.
- `docs/IMPLEMENTATION_LOG.md` records commands and observed output; `AI_HANDOFF.md` records the
  uncommitted state explicitly.

## Post-audit progress (CONTENT-001)

The pool blocker is resolved: 60 Vessels, 30 Actions, 12 Relics and a manifest-driven pipeline shipped
with tests and a browser check (`npm test` 112/112; roster 60 cards / 2,388 boxes; a turn-3 summon of an
expansion Vessel). Details are in `TODO.md` CONTENT-001 and `docs/IMPLEMENTATION_LOG.md`.

## Highest-priority unfinished requirement

The next blocker is **ownership and deck building**. A 60-Vessel pool has no legal deck that uses every
card, and the game still offers one curated practice deck. The collection needs a persistent inventory,
earned Aether Shards, six-card packs (5 Common + 1 Rare), Dissolution, and a deck builder that validates
canonical rules and ownership before any shop or ranked feature can mean anything. Until a trusted
server exists, all balances must be labelled local demo data rather than secure progression.
