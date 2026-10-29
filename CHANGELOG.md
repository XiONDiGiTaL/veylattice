# Changelog

Engineering history, not a list of promised features. Keep entries under Unreleased until an actual release is designated. Preserve history and distinguish implementation, specification and verification.

## Unreleased

### 2026-10-29 - Real-browser verification pass: audio, lobby E2E, hand frames, 3D fixes

Verified in headless Chromium (Playwright) against a local `/veylattice/` subpath server.
Scripts are in `tools/browser-checks/`. **Not** verified on the public site, because this
session's sandbox could not reach xiondigital.net, cdn.jsdelivr.net or supabase.co
(egress 403). Push was also blocked (see AI_HANDOFF.md).

Fixed (each found by an actual browser run, each with a regression test where the logic is
testable without a DOM):
- Audio: no victory/defeat stinger after the first practice match. `newMatch` never advanced
  the match key.
- Audio: `/veylattice/index.html` resolved tracks to `index.html/music/…` (404).
- Audio: a missing or unsupported file was reported as "paused by the browser" and retried on
  every gesture.
- Audio: an `AbortError` from rapid navigation was misreported as blocked.
- Audio: the Defeat sting played over the menu theme.
- Lobby: a guest who joined was never seated. The channel join resolved before SUBSCRIBED, so
  the host's reply was lost.
- Lobby: guest deck/ready edits were discarded when the guest's clock ran behind. Wall-clock
  ordering was replaced by a seat-ownership merge (`mergeRemoteRoom`) plus per-sender
  revisions.
- Lobby: the host is now told when the opponent leaves, and the board freezes.
- Lobby: a leaver's leftover match could be re-seated against the local AI.
- Lobby: the waiting client no longer times the opponent out locally. The active client
  broadcasts its own timeout; remote commands are never re-timed (`remoteCommandNow`).
- Lobby: the online guest saw its own field and log labels as the opponent's.
- 3D arena: the camera sat on the +x axis, so the board rendered rotated 90°.
- 3D arena: the classic CSS board also rendered under the canvas.
- 3D arena: the scene drew every frame while hidden or idle. Rendering is now on demand.
- Mobile: the tab bar widened a 390 px phone layout to 518 px.

Added:
- The battle hand now uses the approved frames (`buildHandCardFace`).
- `docs/RELIC_FRAME_REQUEST.md`: the asset spec only. No frame was made.
- `docs/proposals/SERVER_AUTHORITATIVE_MULTIPLAYER.md` and `docs/proposals/CLOUD_ECONOMY_SYNC.md`,
  with draft SQL in `supabase/drafts/`. Both are **proposals only, not applied**.

The lobby text and `lobby.js` header now state honestly that hands are seed-derivable and
that reconnection is unsupported.

Tests: `npm test` 179/179, `npm run check` 179/179 (was 164/164).


### 2026-10-29 - Live verification of ab35232

Public-site check (no sign-in, no purchase): new build confirmed live — Decks/Shop/Lobby
tabs, Starter Lattice LEGAL+ACTIVE (40 cards), Shop 300 Lattice Shards, lobby
peer-preview disclaimer, Audio controls with "Now playing: menu.", 3D canvas and 5×5/25-tile
board in a Practice match. Not verified: console output (devtools would not open) and
audible music (page reports playing; no audible confirmation from the remote browser).


### 2026-10-29 - AUDIO-001 (update) - Supplied tracks arrived and are wired

**Correction to the AUDIO-001 entry below:** its "no music files" status
was accurate when written. During the same session, commit f51cec5
("music") landed on origin/main supplying exactly six MP3s, and this
change set wires them into the manifest — no files were generated,
renamed, or re-pointed. Verified with ffprobe + full ffmpeg decode (all
clean, MP3 48 kHz stereo, browser-compatible): menu
`Veylattice_ Main Menu.mp3` 174.0 s, battle `Veylattice_ Battle.mp3`
153.6 s, preparations `Veylattice_ Planning.mp3` 137.6 s, shop
`Veylattice_ Shop.mp3` 172.0 s, victory `Veylattice_ Victory.mp3` 12.4 s,
defeat `Veylattice_ Defeat.mp3` 11.0 s. The two stingers match the
directive's ~10 s signature; all four backgrounds run 2+ minutes.
Musical character was not auditioned, so the mapping rests on filenames
plus that duration signature. The working tree was rebased onto f51cec5
(clean, no conflicts — that commit touches only `music/`), and the suite
still passes with the real manifest: `npm test` 164/164. The soundtrack
is therefore implemented end to end in code; audible playback in a real
browser remains to be confirmed in live verification (autoplay policy
means the first track starts on the user's first gesture).


### 2026-10-29 - AUDIO-001 - Soundtrack system shipped; tracks absent (BLOCKED on supplied files)

**Verified asset status (do not overclaim):** the repository contains no
music files. `music/` does not exist in the working tree, in git history,
or on the remote, and no audio file of any format exists anywhere in the
repo. The soundtrack directive's premise (supplied tracks in `music/`)
does not hold for this tree, so no track-to-file mapping could be
verified by listening, and no music was generated, renamed, or invented
to fill the gap. Every manifest role is honestly `file: null, status:
"missing"`.

**System implemented (activates on a manifest-only change once files
arrive):** `src/audio/soundtrack.js` — central `SOUNDTRACK` manifest
(menu/battle/preparations/shop backgrounds, victory/defeat stingers) +
`createAudioManager` (one reused background element, no restart on
re-render/navigation, short fade on switch, stinger at most once per
match key, draws play neither sting, mute + master/music/sfx volumes,
autoplay-blocked status with retry on the next gesture, tab-hide pause /
tab-show resume respecting user pause, missing-file and decode-error
tolerance with no crash, subpath-safe `music/<file>` URLs under the
document base). Wired to real view state (`viewMusicRole`): menu family
-> menu, Decks -> preparations, Shop -> shop, battle -> battle, result
screen -> silence; stingers fire only from `onMatchEnd` (its
recorded-guard makes them once-only; `renderResult` never touches
audio); menu music resumes only on return to the menu. Settings live in
`profile.settings.audio` via `sanitizeAudioSettings` with working mute +
range controls in the profile view, persisted through the existing
profile save path. Correction to the directive's premise: Deck Builder
and Shop ARE functional screens in this tree (2026-10-29 session), so
their themes are wired to real screens, not placeholders.

**Verification:** `tests/audio.test.js` (15 tests: manifest honesty,
subpath URLs incl. the no-trailing-slash edge, view mapping, no-restart,
single-element rapid navigation, stinger-once, missing-file silence,
mute-across-screens, blocked-retry, error status, visibility, settings
clamping, profile carriage, dispose) plus the updated profile-settings
expectation. Three test-caught defects were fixed during the session:
subpath resolution dropping the last segment without a trailing slash,
autoplay retries blocked by the no-restart guard, and the started-flag
needing optimistic synchrony across rapid re-renders. Final:
`npm test` 164/164, `npm run check` 164/164, 0 fail. Browser check of the
running app: see `docs/IMPLEMENTATION_LOG.md` 2026-10-29 (local-browser
route blocked at the tool layer; owner chose push-first, live-site
verification second).

**Not claimed:** any audible music (no files); loop seamlessness of
unreceived tracks; SFX playback (volume channel exists, no SFX assets).

### 2026-10-29 - CANON-001 / ARENA-3D / M3-001 / M5-001-preview - Canonical directives reconciled, 3D battlefield, Deck Builder, Shop, peer-validated lobby

**Phase 1 — directives reconciled before any implementation.** Audited all
listed documents, code, assets and history against the running game.
Contradictions found and fixed in the same change set: `src/ui/fields.js`
described a 49-tile grid (the engine is 5x5/25); the board's ARIA label
said "7 by 7"; the in-game hint said "three starting rows" (the rule is
two home rows per seat); `docs/MECHANIC_ADAPTATION_MATRIX.md` said "three
starting rows" and "7x7 board"; the "back-row Action zone" label named
Relic sockets after a card type that never occupies a zone. All are
corrected, and a canonical layout section (2026-10-29) was added to
`docs/ARENA_SYSTEM.md`, `docs/CARD_FRAMES.md`, `ART_BIBLE.md`,
`CARD_DESIGN_GUIDE.md`, `docs/IMPLEMENTATION_PROMPT.md`,
`AI_INSTRUCTIONS.md` (mandatory read + 7 requirements) and
`GAME_RULES.md` (clarification only — no rule, stat, effect, id or
balance change). `PROJECT_BRIEF.md`'s stale "early DOM prototype, no AI"
status was replaced with the verified 2026-10-29 status. Baseline before
changes: `npm test` 129/129 pass.

**Canonical layout (no balance change).** One shared 5x5 grid (seat 0 rows
3-4, seat 1 rows 0-1, row 2 contested) via `BOARD_SIZE` /
`deploymentBounds` / `rowOwner`. Per seat: 4 Vessel slots (= 4-Vessel
cap, never extra units), 4 Relic sockets (= 4-Relic cap), a 4-slot
Action staging row that is a *view of the first four Action cards in
hand* (Actions resolve from hand to discard and never occupy a zone),
and 1 engine-owned discard pile. Deck rules unchanged: 20-40 cards,
>=10 Vessels, >=5 Actions, <=3 copies per id, plus ownership for saved
decks. Element cycle Wood > Earth > Water > Fire > Metal > Wood with
1.5x / 0.5x (min 1) / neutral damage; Otherworldly is a subtype only.
Card slots use the approved-frame geometry 214x300 (aspect 0.713);
`Cards/EXAMPLE.jpg` remains a composition reference, not a dimension
source. Abstract references only: Yu-Gi-Oh! (zones/targeting),
Pokemon (type readability), Duelyst (grid tactics), Hearthstone
(interaction polish) — no copied art, names, layouts or mechanics.

**3D battlefield (`src/render/arena3d.js`).** Three.js (WebGL, CDN ES
module, no build step) is the primary renderer; the CSS-3D board is the
fallback and accessible grid, with a toggle in the arena. Opponent field
beyond the far side, 5x5 grid centre, player field near side, in one
scene with platforms, corner posts, trees, shrine, lighting and shadows.
Playable Vessels are real voxel geometry from the same box data as
their card illustrations (palette-resolved, seat-facing, idle bob,
selection ring). Tiles tint for legal summon/move/attack, raycast
picking maps clicks to engine cells, discard piles stack with counts
and open a viewer listing the actual engine discard contents. Desktop
elevated three-quarter camera; narrow screens more top-down; drag
orbits slightly. Pure mapping helpers (`cellToWorld`, `worldToCell`,
`fieldLayout`, `cameraForWidth`) are unit-tested.

**Approved frames (`src/render/approved-frame.js`).** The six approved
`CardFrames/` overlays are now used by the actual card pipeline:
Library-adjacent views (Deck Builder, Shop, Collection, discard viewer)
composite the overlay over the illustration inside the manifest art
aperture, with canonical name/cost/stats/effect text as DOM nodes.
Relics have no approved dedicated frame: they render in a flagged
neutral presentation and stay tracked as pending in TODO.md — they
never borrow a Vessel frame. Battle-hand mini cards still use the
vector face (staged migration, documented in
`CardFrames/FRAME_DIRECTIVE.md`). Tests assert overlay PNG sizes match
the manifest and that frame geometry has not drifted.

**Deck Builder (`src/game/decks.js`, `src/ui/systems.js`).** Create,
edit, save, duplicate, rename, delete and select decks from the
canonical manifest with search, category/element filters and sorting.
Validation is engine `validateDeck` plus ownership; errors name the
exact rule (size, type minima, copy limit, unowned copies). Illegal
decks save as drafts but cannot start a match. Saved decks persist on
the local profile (keyed to its id) and survive refresh; the active
deck can play a Practice match. New profiles are seeded with a legal
40-card "Starter Lattice" deck and a bound starter collection.

**Shop (`src/game/economy.js`).** Lattice Shards (new profiles start
with 300). Packs cost 300 and contain exactly 5 Commons + 1
Rare-or-better (Unranked rates 90/9/1; rank-modified rates are NOT
applied locally). Purchases are idempotent by operation id (replays
return the original opening). Singles use the documented rarity prices
and require discovery; dissolution pays the documented payout, is
blocked for bound starter copies and for any sale that would break a
saved deck, and requires confirmation. Collection view shows owned
quantities and bound protection. Economy is local-only: the existing
profile/account RPCs carry name/avatar/settings/stats only, so
decks/collection/Shards do not yet sync through the cloud row.

**Online lobby, peer-validated preview (`src/game/lobby.js`,
`src/net/online.js`).** Rooms by 6-character code over Supabase
Realtime broadcast, with seat assignment, deck selection (deck lists
shared at match start so both clients build the same match; hands are
never broadcast), readiness gating (deck changes clear readiness),
host start with a shared seed, and synchronized turns. Every remote
command is re-validated by the receiving client's engine (seat,
sequence, command id, engine legality) and rejected otherwise.
NOT server-authoritative: no Edge Functions are deployed, so online
matches grant no rewards, rank or currency and are labelled as a
preview in the UI. Server-authoritative validation remains BLOCKED
pending owner approval and a database migration (see TODO M4-002 /
M5-001). Two-browser end-to-end verification was NOT performed in
this session (single-browser verification only) — the lobby must not
be described as verified end to end until that check runs.

**Also fixed in this change set.** Opponent discard count added to the
HUD; both discard piles open a viewer. Field labels corrected
(Relics, not "Action zones"). Online-aware seat handling in the HUD
so a guest seat renders its own hand and HUD.

Verification: `npm test` -> **149/149 pass** (20 new tests: decks,
economy, lobby, frames, arena mapping). Local static server serves
index, main, systems, arena and frame assets at root and under a
`/veylattice/` subpath (200s). Browser check at the subpath: BLOCKED at the tool layer — the live-browser session refused
every local address before loading (localhost and the VM's reserved-range address); the local
servers themselves answer 200. See `docs/IMPLEMENTATION_LOG.md` session 2026-10-29 for the
verification paths still open. No browser observation is claimed for this session.

Not claimed: server-authoritative multiplayer; ranked progression;
reward-bearing online matches; cloud sync of decks/collection/Shards;
two-player end-to-end lobby verification; battle-hand migration to
approved frames; a dedicated Relic frame; mobile performance
measurement for the WebGL scene.


### 2026-10-28 - ART-005 - Humanoids split by body plan; human knight wave

Scope: four slim humanoids (Reef Duelist, Quarry Engineer, Emberwright Adept, Razorline Duelist)
shared one outline at 0.845–0.895 IoU because they differed by stance and reach rather than mass.
The roster also had no ordinary armoured humans: its "knights" were wardens and constructs.

- **Humanoid body plans, not hues.** The rig gained three structural options it lacked: a
  `robe: "split"` tabard (short flared skirt over visible boots and a belt, versus the columnar
  robe that gave two casters the same 0.917 silhouette), a horizontal `wire` weapon, and a
  back-mounted `pack` (frame, hanging chain, bucket) that gives a rearward mass nothing else has.
  Reef Duelist now lunges in a `bent` crouch, Quarry Engineer carries a pike and pack, Emberwright
  Adept wears the split tabard with a tome, Razorline Duelist holds the wire. The four now sit at
  **0.758–0.848** against each other.
- **Human knight wave (5 new Vessels, one per element).** Oathstone Knight (Earth, 4/7 `stalwart`,
  braced low behind a tower shield), Ironvow Paladin (Metal, 6/7 `stalwart`, great axe, long cloak,
  no shield), Tidewall Sentinel (Water, 3/5 `stalwart`, tide spear and shield), Cinderwatch Knight
  (Fire, 5/4 `swift`, axe and carried brazier), Thornmarch Ranger (Wood, 2/3 `swift`, hood and
  longbow). Pool is now **65 Vessels (13 per element), 30 Actions, 12 Relics = 107 cards**.
- **Pauldron depth is capped.** Scaling depth by the shoulder multiplier turned a broad knight's
  pauldrons into flat boards seen edge-on from the three-quarter camera; width and height still
  scale with the Vessel.
- **Counts are no longer hard-coded in copy.** The Card Library footer and the menu/guide headings
  read the catalog instead of printing "102".

Verification: `node tools/silhouette-report.mjs` — worst pair in the roster is **0.877** and no pair
is at or above 0.90 (it was 0.895 before the split, and the knight wave briefly created 0.90–0.917
pairs that were fixed before shipping). New knights' closest neighbours are 0.815–0.874. `npm test` →
**129/129 pass**. `node tools/build-cards.mjs` → 107 faces (65 V / 30 A / 12 R), 0 missing models,
0 missing rules, `Cards/` rebuilt and byte-equal to a fresh render. `screenshots/knights-wave.png` and
`screenshots/knight-art.png` are Chromium captures of the five new faces and their art layers;
`screenshots/humanoid-sheet.png` is an orthographic projection of the box data used to catch the
board-like pauldrons.

Not claimed: no deck builder, ownership or economy for the new cards; balance is unproven (costs
follow the existing `1.5 × cost + 4` seed, and no simulation exists). Several robed casters still sit
in the 0.86–0.877 band and need authored geometry rather than rig options.

### 2026-10-28 - ART-004 - Lean predator body plan for the beast rig

Scope: ART-003 gave every animal the same barrel body. A hound, a stalker and a charger
differed from the Rams and the Warden only by palette, bulk and horn, so the roster's
predators read as the same ox recoloured.

- **A second beast body plan, not a resized first one.** `build: "lean"` builds long
  proportional limbs, a deep narrow ribcage set forward over the forelegs, a waist that tucks
  up and narrows behind it, a back that arches over the chest, a forward-reaching neck, a
  shoulder mass with spine knobs, and a long counterbalancing tail. `brine_hound` (level, fan
  tail), `bramble_stalker` (`prowl`, six legs) and `glass_horn_charger` (`rear`, ram horn) use
  it; `slatehorn_ram`, `mossback_warden` and `antlered_bulwark` keep the heavy plan.
- **Stature is posture, not scale.** `prowl` drops the chest and raises the haunches; `rear`
  rises on the hind legs with the forelimbs held clear of the ground as clawed paws.
- **Two-mass predator skull.** The shared skull helper gained `skull: "wedge"`: a tall
  cranium, a brow ridge, a long low muzzle with a dark nose, a dropped under-jaw, fangs and
  deep-set eyes. The heavy plan's blunt cranium, pale face plate and heavy jaw are unchanged.
  Horn bases follow the skull plan so ram/antler/spike horns sit on the cranium, not the muzzle.
- **Two defects found by rendering, not by tests.** The reared charger's hind legs floated
  about a unit below its raised chest because segment heights were authored flat; limbs now
  stack as fractions of the belly line and always meet the body. Thin flank rib bars read as
  debris beside the torso at card size and were replaced with a shoulder mass.

Verification: `node tools/silhouette-report.mjs` — lean vs heavy plan 0.346–0.620 IoU (was a
~0.9 cluster); the three lean Vessels differ from each other at 0.415–0.590; worst pair in the
roster is unchanged at 0.895 (two slim humanoids). `npm test` 129/129. `node
tools/build-cards.mjs` 102 faces, 0 missing models, 0 missing rules, and the on-disk `Cards/`
set was rebuilt so the stale-artefact guard in `tests/card-files.test.js` passes again.
Geometry inspected in `screenshots/beast-builds.png`, an orthographic projection of the box
data (Chromium capture was unavailable this session: the browser window was not being drawn).

Not claimed: the heavy plan is deliberately unchanged, so Rams/Warden/Bulwark still read as
barrel-bodied bruisers; the four slim humanoid soldiers remain at 0.88–0.895 overlap.

### 2026-10-28 - ART-003 - Distinct body plans, legible card numerals

Scope: several rig-built Vessels were the same silhouette in a different palette
(the Clockwork Hydra was a two-legged construct chassis, which is why it read as
Ironstep Sentinel's twin), and card numbers had three separate defects: the
Attack/Guard values crowded the sword/shield badges, they had no outline worth the
name over bright metal, and Flux costs sat low in their orb.

- **Hydra is a serpent.** `clockwork_hydra` now uses the `serpent` rig: three coiled
  tiers, a raised trunk, three fanned necks with staggered heights, brass scale
  plates and clawed forelimbs. `ironstep_sentinel` keeps the `slim` construct frame
  and gains an `antenna` crest, so the two no longer share a body plan.
- **Structural variety across the 42 rig Vessels.** Every `humanoid`/`beast`/
  `construct`/`drake`/`spirit` configuration now sets its own structure — stance,
  robe, second arm pair, hunch, wings, tail, leg count, head count, shell, posture,
  wings plan, construct frame and crest — instead of only tone/height/bulk. Examples:
  `mossback_warden` is a shelled tall beast with a club tail, `bramble_stalker` a
  six-legged spiked low predator, `tomb_colossus` a `tower` frame, `quiet_engine` a
  `quad` frame, `first_bloom` a core spirit with no arms.
- **Heads read at tile size.** The humanoid rig gains a lit neck column and a pale
  face plate; the beast rig gets a longer rising neck, a larger skull, a `bone` face
  plate, a dark jaw and repositioned eyes. Before this the skull sat flush against
  the torso and vanished into it in both renderers.
- **Rig detail floors met.** `quad`, `tower`, `wraith`, `crowned` and `core` gained
  authoried detail (chain fists, buttresses, sarcophagus slabs, ribs, tendrils,
  petals) so every model clears the 30-box / 4-group / 4-material bar that
  `tests/models.test.js` enforces.
- **Card numerals.** Stat medallions are re-zoned: icon badge at the top, engraved
  rule, value in the lower half drawn as a wide dark halo plus a white face with a
  dark keyline. Attack/Guard labels moved onto their own plates below the disc.
  Numbers now use a lining-figure stack (`NUMERIC`, `'lnum'`), not Georgia, whose
  old-style 3/4/5/7/9 descend below the baseline; the Flux cost is centred with a
  `0.34 em` cap-height offset instead of `0.355 em`, and its disc gains an inner
  well so the digit has a value to sit against.
- **Card art fills more of the window.** The illustration target box grew from
  216x164 to 284x188 in art units, so Vessels read as card subjects rather than
  miniatures beside scenery.
- **Verification.** `node --test tests/models.test.js` passes (box/group/material
  floors, pivots, palette keys, footprint). `node tools/silhouette-report.mjs`:
  no pair scores 0.90 or above; the worst is 0.895 (a slim duelist and a slim engineer) and
  the Hydra/Sentinel pair fell to 0.485. `node tools/build-cards.mjs` renders all 102 faces and
  `tests/illustration.test.js` passes. Card faces inspected in the browser at
  1086x2048.

### 2026-10-28 - CARDS-001 - The printed collection: 102 faces, element scenery, in-game library

Scope: the game could render a card's illustration, but the *card* as a designed
object did not exist, and every Vessel was staged on the same studio backdrop
(dark gradient, summoning ring, light shaft), which is exactly the generic
presentation the art direction forbids.

- **Card faces** (new `src/render/card-face.js`, `src/game/card-text.js`): one
  1086x2048 face per card at the reference's 543:1024 ratio. Sculpted frame with
  per-element materials, serif title fitted to its plate, Flux medallion at the
  top right, element and subtype emblems with label tabs, inset art window,
  Attack/Guard medallions, movement/range row, rules then italic flavour, rarity
  plate. Actions and Relics print a category band and no stat sockets at all.
  Text is SVG text generated from the definition, never baked into the picture,
  so a face cannot ship a misspelled name or a stale cost.
- **Scenery** (new `src/render/scenery.js`): five hand-built environments — a
  fortress gatehouse, a rootbound grove, a drowned temple, a furnace hall, a
  canyon gate — each with its own architecture, floor, weather and palettes, and
  one shared value structure (bright sky, dark distant silhouettes, mid-tone side
  masses, a lit opening behind the figure, fog at the ground line, near-black
  rubble in front). Seeded per card id, so cards of one element share a design
  language without sharing a composition.
- **Art canvas** 400x260 to 400x310: the old canvas was 1.54:1 against a 1.29:1
  window, so `slice` cropped the flanking architecture off every card. The new
  ratio means the scene is shown whole, and a figure target of 92–308 x 62–226
  leaves room for the place behind it.
- **The build** (new `tools/build-cards.mjs`) writes `Cards/cards/*.svg`,
  `Cards/art/*.svg`, `Cards/frames/*.svg`, `Cards/manifest.json`, `Cards/QA.md`
  and a contact sheet. 102 faces, 3.4 MB total, **33 kB average**.
- **In the game**: new Cards tab and Card Library (102 faces, category and
  element filters), full-face viewer shared by the library, the roster ("Printed
  card") and the hand (double-click), loading the built file and falling back to
  the same generator in memory if `Cards/` is absent.
- **Tests**: 129/129 passing. New `tests/card-files.test.js` re-generates every
  face and compares it to the file on disk, so data changes cannot leave stale
  cards behind; it also checks the manifest, printed name/cost/stats, that
  non-unit cards carry no ATTACK/GUARD sockets, and that no face contains NaN or
  an empty fill. `tests/illustration.test.js` moved to the 400x310 canvas and a
  60 kB data-URI budget.
- **Verified in the browser** (1440x950 and 390x844): library renders 102 tiles
  with no broken images; filters return 21 Metal cards and 12 Metal Vessels;
  viewer opens at 343x647 on mobile; zero console errors.

### 2026-10-28 - GRID-002 / ART-001 - Five-by-five arena, generated card art, AI legality fix

Session scope: the owner asked for a 5x5 grid with configurable geometry, a genuinely three-dimensional
world, full-background card art consistent with the playable models, and verification in the running game.

- **Arena geometry** (`src/game/constants.js`, `src/main.js`, `src/render/terrain.js`, `styles.css`):
  the board is **5x5 — 25 playable tiles**, two deployment rows per seat and one contested row. Every
  rule that depends on size now derives from `BOARD_SIZE`/`DEPLOYMENT_ROWS`: cell indices, in-bounds
  checks, deployment bounds, home rows, the terrain map, the UI's zone tinting (`rowOwner`), the CSS
  grid column count (`--grid`) and the arena label. The helpers take optional overrides, so an
  alternative size is testable without engine edits, and `deploymentBounds` throws on impossible
  geometry (rows overlapping). `terrain.js` refuses to load a map that does not match `BOARD_SIZE`.
- **Card art pipeline** (new `src/render/illustration.js`): every one of the 102 cards now has a
  generated SVG illustration. A Vessel's art is its canonical `VOXEL_MODELS` definition projected
  through a three-quarter camera (yaw 0.52 rad, pitch 0.13 rad), each face shaded against a fixed key
  light with material responses for metal, crystal, glass and ember, painter-sorted across the whole
  figure, then staged in an element environment: sky gradient, three seeded ridge layers, horizon
  haze, ground plane, engraved summoning ring, light shaft, foreground rocks and grass, contact
  shadow, rarity arcs, motes and a vignette. Actions and Relics get emblem scenes keyed to their
  effect kind in their element's colours. Markup and data URIs are memoised per card.
- **Art in the interface** (`src/main.js`, `styles.css`): hand cards carry the illustration as a
  full-bleed layer under a directional scrim; the command-panel inspector shows the full illustration
  for any selected card; the roster stage uses the same scene (figure omitted) behind the live,
  draggable model, so the gallery is art-directed instead of gradient-filled.
- **AI legality fix** (`src/game/ai.js`): candidate generation could propose a move-then-attack for a
  Vessel that had already attacked, because `attacksFromCell` reasons about geometry only. Plans now
  check `hasAttacked`/`hasMoved` before they are offered. Verified over 12 seeded AI-vs-AI matches:
  zero engine rejections (previously 1-2 per match) and every match reached a result.
- **Tests**: **122/122 passing** in ~0.9 s. Board tests now assert 25 tiles split 10/5/10, plus a new
  test that alternative geometry (7x7) is derivable and invalid geometry is rejected. New
  `tests/illustration.test.js` (8 tests) enforces that every card has art, that Vessel art is a
  projection of its model (part count, palette shading, declared voxel height), that no figure is
  clipped, that no two Vessels share art, that Action emblems differ by effect, and that SVG is
  deterministic, script-free and under 40 kB.
- **Verified in the browser** (Chrome via CDP at 1440x950 and 390x844): 5x5 board with correct zone
  tints, 60 roster cards with generated scenes, hand art legible at 138x84, inspector art for a Vessel
  and an Action, zero console errors, zero failed art requests.
- **Not done, stated plainly**: the world is still CSS-3D (real boxes, real perspective, per-face
  shading, painted contact shadows) rather than WebGL with GPU lighting and cast shadows. Roster,
  deck builder, shop, packs and online lobbies remain unbuilt.

### 2026-10-28 - CONTENT-001 - Sixty Vessels, thirty Actions, twelve Relics and an extensible content pipeline

Session scope: the shipped pool was 18 Vessels, 8 Actions and 4 Relics, all loaded from two hardcoded
file paths. Roster size was asserted literally in tests and copy, so adding a card failed the suite.

- **Set manifest** (new `src/cards/manifest.json`, `schemaVersion: 2`). The app and the tests now load
the same manifest and every listed set, so a new expansion file needs no engine, HUD or loader edit.
- **Expansion set** (new `src/cards/expansion-set.json`): 42 original Vessels, 22 Actions and 8 Relics,
bringing the pool to **60 Vessels (12 per element), 30 Actions, 12 Relics = 102 cards**. Roles cover
knights, guardians, rogues, mages, priests, artificers, beasts, constructs, drakes, ancients and
spirits; `SUBTYPES` was extended to describe them rather than mislabelling a priest as a warrior.
- **Engine vocabulary** (`src/game/constants.js`, `engine.js`): six new Action kinds — `nexusHeal`,
`drain`, `stun`, `ready`, `revive`, `flux` — and three Relic auras — `wardAura`, `swiftAura`,
`drawAura`. `stun` costs exactly one activation, `ready` refreshes a Vessel, `revive` returns the
highest-cost defeated Vessel to hand, Flux gain caps at the turn maximum, Nexus healing caps at 30,
and ward reduces Action damage but never to zero. `EFFECT_TARGETING` makes each kind's targeting mode
part of its validated contract.
- **Vessel keywords** (`VESSEL_KEYWORDS`): `swift` (enters ready), `stalwart` (+2 Guard on entry) and
`deathrattleDraw` (its controller draws when it is defeated). Keywords are a closed, validated list,
stored on the unit and explained in the HUD and roster; content still cannot carry executable text.
- **Model pipeline** (new `src/render/vessels/blueprints.js`): five anatomical rigs — humanoid, beast,
construct, drake, spirit — plus a distinct robed body plan, with per-Vessel proportions, head,
weapon, offhand, crest, cape, palette keys and tris. The 42 new Vessels add **1,660 boxes** (2,388
total, 30–59 each). No two models share a silhouette; the existing 18 hand-authored models are
unchanged.
- **Roster and deck**: the practice deck is curated to 40 legal cards (20 Vessels across all five
elements, two copies each of eight Actions, four Relics) because the pool is now larger than a legal
deck. Each practice match now samples a fresh seeded selection from the 60-Vessel pool, so every
Vessel is reachable before a deck builder exists; the no-RNG call used by tests stays deterministic.
Roster copy, the menu count and the hand name wrapping reflect the larger pool.
- **Tests**: 112/112 passing in ~0.75 s. The suite now asserts the roster *target* rather than a
literal 18/30, checks per-element distribution, requires every shipped effect kind to appear on a
card, validates keywords and targeting, and covers the new mechanics in `tests/keywords.test.js`.
- **Workflow**: added `docs/COMPLIANCE_AUDIT.md` (evidence-based status of every specified system) and
`npm run check` (syntax + full suite) so a session cannot report a suite it did not run.
- Browser (fresh incognito, local static server): 60 roster cards / 2,388 boxes, zero console errors;
a practice match loaded the 40-card deck, showed an expansion Relic in hand, and a turn-3 summon of
*Lantern of the Lost Choir* paid 3 Flux, filled Vessel zone 1 and rendered its 32-box model with
`data-model-id`.
- Not claimed: balance of the new cards is unproven, several humanoids share a blueprint rig, and no
collection, deck builder, shop, arena, bond or lobby behaviour changed (none exists). The change set
is in the working tree; the live site still serves the previous build until it is committed/deployed.

### 2026-10-28 - LAYOUT-001 - War table: integrated fields, 4+4 card zones, Nexus as HUD target

Session scope: the battle screen was a status strip, a detached opponent card, a side panel, a nexus
bar, a 7×7 grid, a relic panel, a hand panel and a log stacked vertically. At 1440×950 the board
overflowed the viewport, and there was no representation of the four Vessel or four Action zones.

- **One war table** (`index.html`, new `battlefield.css`). The whole match is a single object: opponent
  HUD + four back-row zones + four front-row zones, the 7×7 arena, the player's four front-row + four
  back-row zones, then a player console and hand. The field platforms share the table plinth, a 2.4°
  tilt and one light; they are not detached panels.
- **Eight zones per seat, derived from state** (new `src/ui/fields.js`). `fieldState(match, seat)`
  returns exactly four Vessel and four Relic slots, fills them from `match.units` / `player.relics`,
  and exposes stable keys (`seat0:vessel:2`). Occupied Vessel zones render the real miniature, live
  Guard, ATK/MV/RG; occupied Relic zones render name, element and effect; empty zones are labelled
  sockets.
- **Engine zone assignment** (`engine.js`). `handleSummon` records `fieldSlot` (lowest free of four) so
  a Vessel keeps its card zone when another dies; movement never changes it. `nextFieldSlot` is
  exported and tested. Presentation metadata only: no legality reads it.
- **Relic capacity now 4** (`constants.js`, `GAME_RULES.md`). The four back-row zones are the rule's
  four Relic slots, so the interface cannot promise capacity the engine rejects. Actions still resolve
  from hand and never occupy a zone (canonical rule).
- **Zone interactions**: Vessel card → four zones + 21 legal tiles highlight; tile → summon fills the
  next zone; filled Vessel zone → selects that unit; Relic card → only the next free Action socket
  glows; wrong socket → explains which is next without mutating; filled Relic zone → reads the effect.
- **Nexus as a target** (`index.html`): the opponent's vitality bar is now the clickable Nexus for
  strikes, so two dedicated nexus bars no longer consume 58 px of board height. The player's vitality
  block is the mirrored target. FX still pulse the same ids.
- **Battle header compaction**: `body[data-view="battle"]` trims the marketing header so the table
  fits 950 px; the board is 46vh and the arena wings frame it instead of leaving dead space.
- **Terrain**: per-tile deterministic tone variation, larger back-edge props, restored ground depth
  shadows, 2 px tile seams; all decorative, no rule change.
- **Docs**: README rewritten around the war table with live screenshots; GAME_RULES relic cap updated;
  TESTING and IMPLEMENTATION_LOG record the actual checks.
- Tests: `npm test` → **97 tests, 97 pass, 0 fail** (~0.5 s), including the new `tests/fields.test.js`
  (six tests) and the updated four-Relic limit test.
- Browser: verified at 1440×950, 1024×768, 390×844 in a fresh incognito context: eight zones per seat,
  summon (flux paid, hand -1, zone filled, board tile occupied), Relic set into zone 1 (1/4, effect
  shown), Vessel-zone selection highlights the board, stale selection cleared after a defeat, no
  console errors, no horizontal overflow.

### 2026-10-28 - ART-001 - Voxel art pass: materials, pivots, 728 boxes and a diorama arena

Session scope: the roster was 11–14 boxes per Vessel with one tint per element, models were lit by CSS
filters, attacks tilted the whole body, and the board was a flat grid. No rule, card stat or engine
file changed.

- **Renderer rebuilt** (`src/render/voxel.js`). Face colours are now computed per material in JS
  (`matte`, `metal`, `stone`, `cloth`, `leather`, `wood`, `bone`, `crystal`, `glass`, `ember`, `void`)
  instead of CSS brightness filters, which flattened 3D transforms. Per-face 1 px borders were removed:
  at 2–3 px per voxel they consumed the fill and made small models read as noise.
- **Articulated groups.** Boxes carry an animation group; each group rotates around an authored pivot
  (wrist, shoulder, neck, hip, tail root, cloak). Attacks now swing the weapon, snap the head and lash
  the tail instead of only lunging the whole model. Groups animate for idle (`breathe`, `heavy`,
  `hover`, `sway`) and combat (`fx-lunge`, `fx-hit`, `fx-spawn`).
- **Angled geometry.** Parts accept `rx/ry/rz`, used for fins, banners, lances, antlers and blade snouts.
- **18 models rewritten** into `src/render/vessels/{fire,water,earth,metal,wood}.js`: **728 boxes**
  (30–59 each, minimum 4 animation groups and 4 materials). Element palettes now include a full
  material set (ceramic, cloth, leather, bark, stone, brass, bone, crystal) so element identity reads
  without colour. Humanoids gained segmented limbs, layered armour, cloth, weapons and helms; beasts,
  dragons, constructs, spirits and otherworldly units keep their own anatomy.
- **Arena diorama** (`src/render/terrain.js`, new): authored point-symmetric 7×7 ground map (grass,
  moss, ruins, shallows, crystal), per-kind elevation, props at the back edge of tiles, stone plinth,
  corner posts, per-tile thickness/bevel, unit contact shadows, key light and edge vignette, plus a 7°
  camera tilt on the board. Every kind declares `rules: "decorative"`; the caption says so.
- **Roster showcase upgraded**: models render at 10 px per voxel (was 8), each model can be dragged or
  rotated with the arrow keys, and cards show role, stats, flavour text and the design description.
- **Menu showcase curated** to the four clearest silhouettes (Crownblade, Nightlancer, Bastion,
  Lantern) at a larger scale with ground shadows.
- **Docs**: `docs/VOXEL_ART_BIBLE.md` gained an implementation-status section; 
  `docs/UNIT_VISUAL_DESIGNS.md` gained a per-model status table (boxes, groups, materials, height,
  idle, acceptance notes).
- Tests: `npm test` → **91 tests, 91 pass, 0 fail** (~0.5 s). `tests/models.test.js` tightened to
  enforce the detail bar (≥30 boxes, ≥4 groups, ≥4 materials, bounded footprint and rotations, valid
  pivots, ≥10 distinct proportion sets). New `tests/terrain.test.js` (6 tests): full 49-tile coverage,
  decorative classification, 180° symmetry, prop bounds, prop-model validity, and an architecture
  guard that fails if `src/game/engine.js`, `ai.js` or `content.js` ever imports terrain.
- Browser verification at `http://127.0.0.1:8123/` (Python static server, PID recorded and stopped):
  menu, guide, roster, settings and battle all rendered with **zero console errors**; 18 roster cards
  rendered 728 boxes; a practice match to turn 6 deployed four Vessels of different elements and the
  models rendered on their own tiles; mobile 390×844 kept the board and stats readable at 43 px tiles.
- Screenshots regenerated for the README: `screenshots/{menu,battle,roster,guide,profile,mobile}.png`.
- Known limitations: CSS-3D boxes, not GLB meshes; no real light pass or dynamic shadows; rigid-group
  limb rotation rather than skeletal deformation; the Wyrm of the Drowned Vault and the Verdant
  Colossus remain the weakest silhouettes at tile size; phone tiles prioritise stats over model detail.

### 2026-10-28 - UX-001 / M2-008 / M2-009 - Menu, board readability and the 18 Vessel models

Session scope: the app dropped straight into a match, the battlefield did not explain itself, and the "voxel units" were a single CSS cube per element. All three are addressed here; nothing was rebalanced and no canonical rule was changed.

- **Added a real main menu** (`#view-menu`). Entry point offers Practice match, Guided first match, and Return to match — the last only while a live match exists. How to Play, Vessel Roster and Profile & Settings are first-class entries. Deck Builder, Collection, Shop and Online appear in a labelled "not in this build" block instead of dead buttons. `boot()` no longer calls `newMatch()`; `ui.view` starts at `menu` and the Battle tab stays disabled until a match exists.
- **Added the How to Play page** (`#view-guide`): eight steps covering objective, Vessels, deployment, Actions/Relics, movement and combat, Flux, ending a turn and Nexus strikes. It opens automatically on a first visit (`veylattice.guide.seen.v1`, guarded `try/catch`) and is reachable from the header afterwards.
- **Added the Vessel Roster page** (`#view-roster`): all 18 models rendered from the same module the board uses, with element, role and printed stats.
- **Added 18 individually authored voxel models** in `src/render/models.js` and a dependency-free CSS-3D renderer in `src/render/voxel.js`. Each model is 11–14 boxes with its own silhouette, grouped body parts and an element palette blended with per-model overrides. Low quadrupeds carry a per-model `scale` so a 5-voxel body still fills a tile. `modelFor()` returns `null` for an unknown id and the board renders a visibly labelled placeholder instead of a silent cube.
- **Rebuilt the battlefield for readability**: deployment zones are tinted by row (opponent / contested / your zone) with a vertical gutter naming them; `:where()` keeps zone colours below interaction colours in the cascade so a legal summon is never tinted away. Selecting a Vessel highlights the engine's own legal tiles, dims the rest of your zone as dashed "blocked", and explains refusals by rule (occupied, outside zone, already summoned, four Vessels, insufficient Flux).
- **Back row**: the two canonical Relic slots (`MAX_RELICS_PER_SEAT`) are now a visible board element with slot indices, names, elements and effects, replacing the sidebar list. The four-zone layout in the supplied concept was deliberately **not** adopted: `GAME_RULES.md` fixes two Relics per seat and no rule defines set/activate Action zones, so inventing two extra live zones would have been a silent rules change. The divergence is documented rather than hidden.
- **Contextual interaction prompts**: the message bar now carries a state chip (`READY` / `DEPLOY` / `TARGET` / `MOVE / ATTACK` / `OPPONENT` / `FINISHED`) and the current instruction. Cancel exists as both a sidebar button and an in-context bar button, and Escape clears a selection. Stale selections are already dropped on turn change and match end.
- **Added the guided first match** (`src/ui/tutorial.js`): a pure step list plus `advanceTutorial(tutorial, eventType)`. `src/main.js` feeds it the events the engine already accepted (mapping `turnEnd` → `endTurn`), so the guide cannot invent progress. Five steps: opening Flux, summon, move, strike, pass. `endTurn` always advances, so an impossible step can never trap the player; `tutorialHint()` adds a state-aware nudge when the current step is blocked. Skip marks the tutorial done.
- **Changed** unit tiles: the model occupies the tile centre, the element badge and Guard bar stay as corner/footer markers, and the text `READY`/`UNREADY` flag was removed in favour of dimming your own unready Vessels (enemy units are unready by definition during your turn, so dimming them was noise). Added a legend entry for it.
- **Fixed**: a successful summon left the previous prompt on screen; summon, move, attack, Action and Relic plays now all set their own result message.
- **Fixed**: selecting an unaffordable Vessel told the player to "choose a highlighted cell" while no cell was legal. `vesselSelectionMessage()` now counts legal tiles from `getLegalActions` and names the blocking rule instead.
- **Fixed**: mobile tiles collapsed the model because `ATK 4 · GD 3/3` wrapped to three lines in a 43 px cell. The stat line is split into `.stat.atk` / `.stat.gd` with CSS `::before` labels that shorten to `A`/`G` under 640 px, and `tickGuard()` updates only the Guard span, so the model keeps its space.
- **Fixed**: `tutorial.js` steps watched `endTurn`, but the engine emits `turnEnd`; the tutorial stalled on step one. Normalised in `dispatch()`.
- Rules text in the guide was checked against `GAME_RULES.md` (one summon, four Vessels, two Relics, Flux 1→10, 120 s, retaliation, Nexus gating). No rule constant changed; `src/game/` is untouched by this session.
- Tests: `npm test` → **83 tests, 83 pass, 0 fail** (~0.6 s). New `tests/models.test.js` (7 tests: roster completeness, no shared silhouettes, multi-box construction, palette keys, catalog/element agreement, five distinct element palettes, `null` for unknown ids, 7×7 board split 21/7/21) and `tests/tutorial.test.js` (7 tests: step order, unrelated events ignored, one-step advance without mutation, `endTurn` escape, completion clamping, idempotent skip, every step watches a real engine event). Existing 69 tests still pass unchanged.
- Browser verification at `http://127.0.0.1:8123/` (Python static server, PID recorded and stopped afterwards): first visit opened How to Play; menu, roster and guide rendered with zero console and zero network errors; a guided practice match ran to turn 4 with the AI taking its turns; Ironwrought Hound, Hollowroot Oracle, Bell of the Unmoored, Mireglass Stalker, Gilt-Ash Bargainer and an AI Argent Nightlancer all rendered their own models on the board (`data-model-id` asserted); the tutorial advanced 1→4 and showed its blocked-step hint; the back row rendered both empty slots; mobile at 390×844 kept a visible model and a one-line `A2 G5/5` stat line.
- Screenshots regenerated for the README: `screenshots/menu.png`, `guide.png`, `roster.png`, `battle.png`, `mobile.png`.
- Deployment: committed as `a239bc9` (20 files, +2384/-240) and pushed to `origin/main`; GitHub Pages rebuilt. Verified live at https://xiondigital.net/veylattice/ in a **fresh incognito context**: the page booted to How to Play on a first visit, the menu rendered 4 decorative models (50 boxes), the Roster rendered 18 cards / 18 models / 209 boxes, and a practice match created 49 cells and summoned a `Mireglass Stalker` whose tile carried `data-model-id="vessel_mireglass_stalker"` with 12 boxes — with **zero console errors**. `src/render/models.js`, `src/render/voxel.js`, `src/ui/tutorial.js` and `styles.css` all returned 200. The apex site returned 200 and `https://sohbet.xiondigital.net/` returned 200; nothing outside this repository's Pages path was touched.
- Cache caveat observed for real: the persistent browser profile still had the previous `src/main.js` cached (`max-age=14400`) and threw `Cannot read properties of null (reading 'addEventListener')` from the old `bind()`. The same URL in a fresh context worked, and the deployed file matched the local one byte-for-byte modulo CRLF. Hard-refresh before treating a post-deploy error as a regression.
- Known limitations: models are CSS-3D boxes, not GLB meshes, so there is no skeletal animation — attacks lunge and tilt the whole body rather than swinging a limb; there is no WebGL fallback to write because nothing uses WebGL; terrain is decorative tinting only; the 1-Flux opening with a 2-Flux cheapest Vessel leaves turns one and two thin, which is canonical and flagged for a balance decision rather than changed here; there is no in-match menu overlay (the header Menu button covers it) and no deck builder yet.

### 2026-10-28 - M2-001a / M2-002a / M2-006 / M2-007 - Actions, Relics, accounts and voxel combat
- Added `src/cards/actions-relics.json`: 8 Actions (`damage`, `damageAll`, `heal`, `buff`, `draw`, `nexusDamage`) and 4 Relics (`attackAura`, `armorAura`, `mendAura`, `guardAura`). Content stays declarative; `EFFECT_KINDS` in `src/game/constants.js` defines each kind's scope and numeric range, and `content.js` rejects unknown kinds, cross-scope effects, out-of-range amounts and pseudo-targeting Relics.
- Engine: new `playAction` and `playRelic` commands beside the existing handlers, sharing `applyCommand` validation. Added `actionTargetsFor`, `relicAuras`, `effectiveAttack`, `applyEffect`, `cleanupDefeated`, relic mend at turn start, Guard aura on summon, aura-aware attack and Nexus previews, and `actions`/`relics` in `getLegalActions`.
- Relic auras resolve in one helper, so attacks, Nexus mitigation (armour can soften but never nullify), dawn mending, summons, previews and the AI cannot disagree. Guard auras apply to existing Vessels and to future summons, so the bonus does not depend on timing.
- Deleted `PRACTICE_DECK_RULES`: `createMatch` now uses canonical `DECK_RULES`, and `buildPracticeDeck` builds an explicitly legal 38-card deck (18 Vessels + 16 Actions + 4 Relics). A vessel-only deck is rejected with `Deck needs at least 5 Actions`.
- AI: candidates include `playAction`/`playRelic`; `evaluateAction` scores damage (no retaliation by definition), kills, sweeps, heals, buffs, draws and Nexus burn, and reads `own.attackBonus`/`foe.nexusArmor`. Observation exposes card `category`/`targeting`/`effect`, own relic list and foe relic effect kinds — all open information; hand and deck contents remain hidden.
- Added portable accounts (M2-006): `src/net/account.js`, `src/net/rpc.js`, `supabase/migrations/0002_accounts.sql`. The server mints a 100-bit recovery code from an unambiguous alphabet and stores only a SHA-256 digest; create/load/save/rotate are the only callable surfaces and the table denies direct access. Signed-in saves go to the account; signing out returns the browser to a guest profile without touching the account.
- Added the account panel: create-from-profile, recovery code display with copy, sign-in, code rotation and sign-out, plus an explicit note that Google/Discord sign-in needs OAuth credentials this build cannot create (see `docs/ACCOUNTS.md`).
- Added voxel combat presentation (M2-007): CSS voxel cubes per element, attacker lunges, impact flash and shake, floating damage numbers with advantage and retaliation variants, Guard values counted down instead of swapped, crumbling ghost chips on lethal hits, board shake on Nexus strikes, and distinct cast/heal/buff feedback. Everything is skipped under reduced motion or the in-game toggle, and no effect can mutate a match.
- Fixed: the AI cast `Ashfall` onto an empty board because the Standard exploration window could select a negative score. Root cause was scoring, not exploration — no-op casts (empty-board sweep, heal at full Guard, draw from an empty deck) now score `-Infinity`, with a regression test.
- Fixed: mobile tiles clipped Guard numbers; under 640 px the tile shows the voxel and the two numbers that matter, with the full name kept in the selection panel and `aria-label`.
- Tests: `npm test` -> 69 tests, 69 pass, 0 fail (~0.37 s). New `tests/cards.test.js` (13 tests); `tests/content.test.js` rewritten for the 30-card pool and canonical deck rules; `tests/support.js` loads both card files.
- Database verification: direct `GET /rest/v1/veylattice_accounts` -> 401; create -> load -> wrong-code save 401 -> correct save `{ok:true}` -> rotate -> old code `null` -> new code returns the updated record. Test rows deleted (`veylattice_accounts` count 0).
- Browser verification: served at `http://127.0.0.1:8130/`; no console or network errors; Actions cast and Relics set with the panel showing `2 / 2` and auras reflected in previews; presentation classes `.fx-lunge`, `.fx-hit`, `.fx-cast-hit`, `.fx-spawn`, `.fx-ghost`, `.fx-shake` and `.dmg-float` observed on real engine events with a Guard value counting `5/8 -> 2/8`; full account round trip (create, rename to *Lattice Adept*, sign out, rename guest to *Guest Only*, sign in with the code, *Lattice Adept* restored). A temporary `?debug=1` hook used to compose board positions was removed before committing.
- Deployment: committed as `00575e7` and pushed to `origin/main`; GitHub Pages rebuilt. Verified live at https://xiondigital.net/veylattice/ — `/veylattice/`, `src/main.js`, `src/net/account.js`, `src/net/rpc.js`, `src/game/engine.js`, both card JSON files and `styles.css` all returned 200, and the base site `https://xiondigital.net/` still returns 200. A fresh-cache load rendered Action/Vessel card kinds, effect text, the Relic panel and the account panel with no console errors; casting Lodestone Survey on the live origin logged `You cast Lodestone Survey for 1 Flux` and advanced the discard count.
- Deployment caveat: GitHub Pages serves JS with `Cache-Control: max-age=14400`, so a browser that loaded the previous build can keep running a cached module against the new HTML until that expires. Observed during verification (old card markup on a warm cache, correct markup in a fresh context); a hard refresh resolves it. No build step exists to hash filenames, so this is accepted rather than fixed.
- Known limitations: Google/Discord sign-in is unavailable (providers disabled, credentials unavailable); account load attempts are not throttled (M2-005); no transient animation frame was captured as a screenshot; effect queue ordering, revive/death triggers and buff expiry remain for full M2-001.

### 2026-10-28 - M2-003 / M2-004 - Tactical AI, profiles, avatars and cloud persistence
- Added `src/game/ai.js`: information-restricted observation, engine-derived candidates, bounded scoring, four difficulties (`novice`/`standard`/`veteran`/`master`) and three weighted archetypes (`vanguard`/`warden`/`conductor`). Seat 2 is now AI; hot-seat play is gone and the human only controls Seat 1.
- Added engine helpers shared by HUD and AI so rules never fork: `attacksFromCell`, `lineOfSightOnBoard`, `canStrikeNexusFrom` (with `canAttackNexus` delegating to it).
- AI guarantees, all tested: no opponent hand/deck contents reach the decision (hidden-hand invariance), only engine-legal commands are ever submitted (full AI-vs-AI match with zero rejections), and every decision is bounded by an injected clock with best-so-far retention and `truncated` reporting.
- Difficulty changes decision quality only: budget, candidate cap, noise, retaliation modelling, threat awareness and whether move-then-attack is searched. No stat, Flux or action bonuses.
- Added player profiles: display name, uploaded avatar (centre-crop to 128 px, WebP/JPEG, SVG rejected, size-capped), opponent configuration, motion/coordinate preferences, and a match record (games/wins/losses/draws/streak).
- Added `src/net/profile.js` + `src/net/config.js`: local-first persistence with best-effort Supabase sync and an honest `synced`/`saving`/`offline` state; every restored field re-sanitised (`sanitizeProfile`), forged ids replaced, stats clamped.
- Added a dedicated Supabase project and `supabase/migrations/0001_profiles.sql`: RLS with no `anon` table privileges, writes only through a `SECURITY DEFINER` RPC guarded by a bcrypt-hashed per-profile edit token, constrained name/avatar/settings/stats sizes. Existing Sohbet project was not touched.
- Rebuilt `index.html`/`styles.css`/`src/main.js`: Battle and Profile & Settings tabs, AI opponent card with thinking state, match log with per-seat attribution, avatar/profile chip, result overlay with record, reduced-motion and coordinate toggles.
- Fixed during the session: defeat and fatigue events were attributed to the acting seat instead of the unit owner; turn-start log text read ambiguously. Both corrected and re-verified in the browser.
- Added `README.md` rewrite with real screenshots (`screenshots/`), AI/rules/profile/deployment sections, and a `supabase/` migration. Added `.nojekyll` for GitHub Pages.
- Tests run from the repository root: `npm test` -> 53 tests, 53 pass, 0 fail (~0.62 s). New files `tests/ai.test.js` (10 tests) and `tests/profile.test.js` (6 tests). Earlier failures during development (30-copy test decks, a shared mutable RNG in the determinism test, a clock increment too small to force truncation) were fixed and rerun; none were hidden.
- Browser verification: served at `http://127.0.0.1:8124/Veylattice/`; played six rounds against the AI (summon, advance, attack, trade, mulligan, end turn); headless CDP run captured screenshots with 5 units on board and zero console errors; avatar upload wrote a 2.4 KB WebP confirmed in the database.
- Deployment: repository made public (required for Pages on the free plan), renamed to lowercase `veylattice` so the project path matches the requested URL, Pages enabled on `main` at `/`. Site: https://xiondigital.net/veylattice/ — verified after the first build: page and all six probed assets returned 200, the deployed bundle booted (49 cells, 6 cards), the AI completed a turn, and a profile write returned 200 from the live origin with no console errors. Base site `https://xiondigital.net/` still returns 200; no DNS or base-site file was changed.
- Commit: `1bb92f7` (pushed to `origin/main` after the rename).
- Known limitations: profiles are device identities, not accounts (no sign-in, recovery or cross-device identity); no rate limiting on profile creation; the AI's balance against humans is unmeasured; Actions/Relics and the canonical five-Action deck rule remain unimplemented.

### 2026-10-28 - M1-001..M1-005 - Deterministic offline rules engine and playable HUD
- Added a DOM-free command engine: `src/game/engine.js`, `src/game/constants.js`, `src/game/content.js`, and a rewritten canonical `src/game/elemental-rules.js`.
- Implemented: 7x7 board, 30 Vitality, opening five cards plus a mandatory first-turn draw, Flux 1->10 with refill/expiry, one normal summon, four-Vessel cap, deployment rows, unready summons, orthogonal movement with occupied-cell blocking, one move and one attack per ready Vessel, persistent Guard, simultaneous eligible retaliation, defeat/discard, Nexus direct attacks gated on the enemy home row and an undefended opponent, escalating fatigue, victory/surrender/simultaneous-lethal draw, once-per-turn one-Flux mulligan, 120-second deadline with deterministic auto-pass, and legal-action enumeration.
- Rewrote `src/main.js` as a thin HUD controller and rebuilt `index.html`/`styles.css`: deadline timer, Nexus markers, legal summon/move/attack highlighting, Attack and current/maximum Guard strip under units, selection and damage-preview panel, mulligan control, result overlay, reduced-motion support.
- Canonical elemental math is now `floor(1.5 x Attack)` / `max(1, floor(0.5 x Attack))` / neutral, applied per packet to current Attack. The older halve-Guard proposal is marked superseded in `docs/ELEMENTAL_SYSTEM.md`; `docs/COMBAT_RULES.md` now points at the implemented rules.
- Added reference research records required by the session directive: `docs/REFERENCE_RESEARCH.md`, `docs/MECHANIC_ADAPTATION_MATRIX.md`, and `docs/IMPLEMENTATION_LOG.md`. REA was used and its provider timeout on the 15.7 MB Duelyst bundle is recorded as a limitation; Meldra and LeapBuddies were re-verified at current `main` (both two-participant host-authoritative relays; LeapBuddies embeds a Supabase anon key in client code). No reference asset, card text, credential or code was copied.
- Added `package.json` (ESM, `npm test`) and a Node built-in test harness in `tests/` (`support.js`, `elemental`, `content`, `engine`, `match`).
- Changed behaviour: combat now subtracts damage from current Guard instead of comparing Attack to Guard; units must be moved/attacked explicitly; attacks require orthogonal line of sight; Nexus strikes use full current Attack; catalog validation accepts the canonical `common/uncommon/rare/epic/mythic` tiers used by the shipped data.
- Tests run from the repository root: `node --test "tests/*.test.js"` -> 37 tests, 37 pass, 0 fail (~0.47 s). Earlier failing runs during development were fixed (missing `ELEMENTS` import, mythic rarity rejection, deadline rejection returning pre-timeout state, two test-authoring errors) and rerun; none were hidden.
- Browser verification: served over `python -m http.server` and exercised at `/Veylattice/` (summon, readiness transition, movement, attack preview with elemental disadvantage, retaliation, defeat/discard, mulligan, timer countdown); `preview_logs` showed no console or network errors. Root-path HTTP 200s confirmed for `/`, `/styles.css`, `/src/main.js`, `/src/game/engine.js`, `/src/cards/starter-set.json`.
- Known limitations: hot-seat only (no AI, M2-003); no Actions/Relics, so the canonical five-Action deck minimum is unmet and the offline practice profile explicitly relaxes only that minimum (`PRACTICE_DECK_RULES`, TODO M2-002); a real 120-second browser expiry was not waited out (covered by engine tests); the two-inactive-turn forfeit safeguard is not implemented; no keyboard grid traversal yet.
- Documentation updated in the same change set: README.md, TODO.md, AI_HANDOFF.md, docs/TESTING.md, docs/ELEMENTAL_SYSTEM.md, docs/COMBAT_RULES.md, plus the three new docs. Deployment impact: none; still a static frontend, no secrets or backend.

### 2026-10-28 - TRACK-001 - AI continuity tracking
- Added CHANGELOG.md, TODO.md and AI_HANDOFF.md; strengthened AI_INSTRUCTIONS.md to require updates for every meaningful session.
- Added stable task IDs, acceptance criteria, truthful test reporting, blockers and next-step handoffs.
- Scope: documentation only. No gameplay behavior, schema, service or deployment changes.
- Tests: Not run; no application code changed. Browser execution and gameplay tests are not claimed.
- Known limitation: the core match engine and subsequent roadmap features still require implementation.
- Commit reference: this entry belongs to its containing commit; verified parent is 33c4b4885cebcd2c5b70135a1a1c64cdb8170931.

### 2026-10-28 - DOC-002 - Supplied transcript and visual identity
- Commit: 33c4b4885cebcd2c5b70135a1a1c64cdb8170931. GitHub push returned this commit successfully.
- Updated ART_BIBLE.md and added docs/TRANSCRIPT_RECONCILIATION.md.
- Incorporated the pasted historical transcript and screenshot direction; clarified free Codex sections, Custom Practice versus prebuilt Practice, arena/bond Guard behavior and original creature-family silhouettes.
- Scope: specifications only; models, Codex, Forge, hazards and bonds were not implemented by this change.
- Tests: Not run; documentation-only update. No deployment or migrations.

### 2026-10-28 - DOC-001 - Expanded production specification
- Commit: b42c38ada7eae2177d8e98cfd69ce16ed70b9670. GitHub push returned this commit successfully.
- Updated AI_INSTRUCTIONS.md, GAME_RULES.md, PROJECT_BRIEF.md, TECHNICAL_ARCHITECTURE.md, ROADMAP.md and README.md.
- Added docs/MODES_AND_LOBBIES.md, docs/PROGRESSION_AND_CONTENT.md, docs/UNIT_VISUAL_DESIGNS.md and docs/IMPLEMENTATION_PROMPT.md.
- Specified persistent Guard/retaliation, three-copy decks, timers, AI/tag/ranked modes, collection economy, content expansion and 18 bespoke Vessel visual briefs.
- Scope: documentation only; no implementation or finished 3D assets implied.
- Tests: Not run; no gameplay code changed. No deployment or migrations.

## Entry template
Use a dated heading with stable task/session IDs. Record Added/Changed/Fixed/Removed as applicable; affected paths; behavior and decision summary; exact commands and observed results (or Not run with reason); known limitations; migration/deployment impact; verified base or existing commit reference. Do not fabricate a self-referential commit hash or expose secrets.

### 2026-10-28 - ART-006 - Literal voxel humans and a stepped voxel arena

Scope: the five human Vessels shipped in ART-005 were one armoured body swapped between five
colour schemes - the same face, the same straight-down arms, the same box torso - and the arena
rendered its ground as five flat colour patches on a dark panel.

- **Humans are people now.** The human rig gained per-Vessel face proportions (`headW`, `headH`,
  `jaw`, `nose`, `ears`), eye sockets with irises and brows, a nose with nostrils, a mouth and a
  chin shadow, five new hair plans (`shaved`, `swept`, `curls`, `mohawk`, `chignon`) alongside the
  existing ones, and `goatee` facial hair. Skin and hair colour are per-Vessel palette overrides,
  so two humans of one element are no longer the same person.
- **Poses, not mannequins.** Human arms are now a shoulder-elbow-hand chain driven by a named pose
  (`stand`, `guard`, `draw`, `shoulder`, `carry`, `hip`); weapons and off-hand props anchor to the
  hand point the pose computes. Oathstone Knight braces behind a raised kite shield, Ironvow
  Paladin rests an axe at her shoulder, Tidewall Sentinel grips a spear high behind a shield,
  Cinderwatch Knight carries her brazier forward, Thornmarch Ranger stands at full draw.
- **Bodies with waists.** Hips, a pinched waist, a wide chest, a collar, shoulder deltoids and
  narrower legs replaced the single torso box. Garment layers (`quilt`, `scale`, `mail`, `coat`,
  `hide`), plus scarf, bracer, pouch, quiver, hood and a one-shoulder pauldron, give each human a
  different read from the front and from behind. Weapons got proportional blades, stepped axe
  edges and a kite shield with rim and boss.
- **The arena is a stepped diorama.** `terrain.js` was rewritten: stone terraces hold the corners,
  a paved cross meets a water ring around a raised shrine, and every surface border is a height
  step (water 0, sand 3, grass 6, moss 11, stone 16, shrine 22 px). Sixteen scenery models -
  canopy trees, pines, hedges, bushes, flower beds, ruins, columns, stairs, statues, banners,
  lanterns, logs, lily pads, reeds, coral, rocks - carry fifty placements, and each tile renders a
  voxel-grain face with directional light.
- **The board is a block of ground.** The tile side wall was rotated with `rotateX(-90deg)`, which
  made a horizontal slab and left the board looking painted; it is now rotated by the negative of
  the arena tilt, so every tile shows real thickness (17-35 px) above the board plane. Vessels
  stand upright (counter-rotated against the tilt) on their raised tile face, at board scale
  (`--board-u`, previously they rendered at roster-thumbnail size), with a nameplate and guard bar
  instead of a panel covering the terrain.
- **Verification:** `npm test` -> **129/129 pass**; `node tools/build-cards.mjs` -> 107 faces, 0
  missing models, 0 missing rules; `node tools/silhouette-report.mjs 0.84` -> no human pair at or
  above the threshold. Browser checks at 690x1225 and 390x844. Card art budget needed one
  optimisation: edge strokes are dropped on facets smaller than 9 px^2, which removed icon noise
  and brought the longest illustration back under its 60 kB test budget.
- **Not done / known gaps:** the human weapon silhouettes are still simple compared with the beast
  and construct rigs; robe-wearers and the new humans remain the closest cluster in the roster;
  the arena has one authored layout only, and terrain is still decorative (no rules effects).
