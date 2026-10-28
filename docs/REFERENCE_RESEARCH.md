# Reference Research

Status: research record for the M1 session (2026-10-28). Every claim below is
either **observed** (with the command or artifact that produced it) or marked
**inference**. Nothing here is copied into the game; the reference installs
remain read-only and no reference asset, card text, lore or code is shipped.

## 1. Tooling

| Item | Detail |
|---|---|
| Research tool | REA (`rea-agents` 6.7.0) at `X:\REA`, run through `X:\REA\rea.sh` so caches stay off `C:` |
| Verified commands | `bash X:/REA/rea.sh --help`, `... capabilities`, `... analyze-javascript-application "…/Duelyst II/resources/app/src" --json`, `... inspect-artifact "…/duelyst.js.map" --json` |
| Second reference | MDPro3 at `X:\MDPro3` (Unity build). Inspected through its shipped JSON data only; no decompilation of `GameAssembly.dll` was attempted. |
| Third reference (multiplayer) | `XiONDiGiTaL/meldra` and `XiONDiGiTaL/leapbuddies`, re-inspected at current `main` through the GitHub API (read-only, no execution). Findings below; M5 must re-verify before any reuse. |

### 1.1 REA outcome and limitation

- `capabilities` confirmed the static JavaScript provider and artifact graph
  provider are `available: true` on this host.
- `analyze-javascript-application` on the full Electron app was started first
  and abandoned: the inventory includes **7,372** files, mostly `node_modules`.
- Scoped to `resources/app/src` (7 files, including the 15.6 MB `duelyst.js`
  bundle), the analysis ran until the provider's own 300 s ceiling and returned
  `provider_timeout` (retryable). This is a **tool limitation, not evidence
  about the game**.
- `inspect-artifact` on `duelyst.js.map` succeeded and returned observed
  metadata: `artifact_kind: source-map`, `declared_size: 15703353`,
  `root_sha256: 3fcbf732c068c75275cdc1966d6f06c93b53976afe0a1abd8014f22541d663e1`,
  `coverage.status: complete-within-substeps`.
- The source map declares **one source** (`duelyst.js`) with **no embedded
  `sourcesContent`**. Therefore no original module source, card data structure
  or AI logic could be recovered from it. No claim is made about Duelyst's
  combat formulas, AI, or animation implementation.

Because bundle-level reconstruction was unavailable, the research used the
game's own read-only shipped data (localization records, asset inventory) and
labeled what remained unverified.

### 1.2 Multiplayer references (observed 2026-10-28)

**Meldra** (`main` tree sha `653b1f8`):
- `src/server/index.ts` describes a Node relay that “never simulates the game: it forwards opaque messages between the two browsers that share a room code. The host client owns the authoritative state.”
- Observed constants: two clients per room, room cap (400), 16 KiB max message, 200 messages/second, 5-minute idle-room reaping, optional origin allowlist, `/health` endpoint.
- `src/shared/protocol.ts` defines a versioned peer protocol with `hello/welcome/lobby/set/start/rematch/toLobby/act/snap/paused/pause/resume/bye/err/ping`, room-code normalisation and `versionMatches`.
- Not suitable as-is for Veylattice: two seats, host-browser authority, no authenticated identity and no server-side rule validation.

**LeapBuddies** (`main` tree sha `120a8ac`):
- `js/net.js` uses Supabase Realtime broadcast channels with presence keys (`host-…`/`guest-…`), locks a room to the first guest, and reports connection failures through 12–20 s watchdogs.
- Observed risk: a Supabase URL and public anon key are hard-coded in the shipped client file. This is exactly the pattern Veylattice must avoid; configuration belongs in build-time env, and an anon key is never a privilege boundary without RLS.
- Also unsuitable as-is: two participants, host-authoritative, no durable match state or server validation.

Neither reference provides server-validated four-seat state, private hands, persisted deadlines or idempotent rewards; M5 must build those rather than port either transport wholesale.

## 2. Duelyst II (local installation)

Install: `D:\SteamLibrary\steamapps\common\Duelyst II`, Electron app
`resources/app` (`package.json` version 2.2.0), web bundle in `src/`.

### 2.1 Observed corpus statistics

Command used (read-only, aggregates only, no text stored in this repository):

```
node -e "…require('./resources/app/src/resources/locales/en/index.json')…"
```

- **1,305** name records, **308** effect-description records in this export.
- Those 308 descriptions are **258 spells + 50 artifacts**; minion descriptions
  are not present in this localization export. So minion design could not be
  measured from text here.
- Keyword prevalence across the 308 effect texts:

| Pattern | Count | Share |
|---|---|---|
| area / multi-target wording ("nearby", "all enemy/friendly/units") | 61 | 19.8% |
| direct damage ("deal N damage") | 51 | 16.6% |
| summon | 41 | 13.3% |
| stat buff ("+N attack", "give … attack") | 35 | 11.4% |
| heal | 33 | 10.7% |
| destroy | 31 | 10.1% |
| draw | 29 | 9.4% |
| random target/effect | 19 | 6.2% |
| stun | 12 | 3.9% |
| "whenever" (triggered effect) | 12 | 3.9% |
| teleport | 10 | 3.2% |
| return-to-hand wording | 0 in this export | — |

- Faction records: 6 unique factions plus Neutral (14 name keys including
  short forms). Card-set records: 9 unique sets plus Core and Boss variants.
- Rarity vocabulary observed: Basic, Common, Rare, Epic, Legendary. Veylattice
  already fixes its own five-tier vocabulary (common, uncommon, rare, epic,
  mythic); no relabeling is implied.

### 2.2 Observed presentation inventory

| Directory | Files | What it establishes |
|---|---|---|
| `units/` | 2,164 | roughly 1,000+ per-unit `.plist`/`.png` pairs; each unit has authored art, not a recolor |
| `unit_gifs/` | 70 | separate animated previews for some units |
| `tiles/` | 12 | board tiles are shared texture atlases plus special tiles (chest, action) |
| `fx/` | 462 | a large shared effect library |
| `card_backgrounds/` | 161 | card frames/backgrounds are asset-driven |
| `generals/` | 122 | leaders are presented as distinct units with their own assets |
| `icons/`, `emotes/`, `codex/` | 1,212 / 504 / 146 | keyword icons, emotes and an in-client codex exist |

**Inference (not observed):** the per-unit asset volume supports the project
requirement that each Vessel receive bespoke authored art rather than one model
recolored per subtype. Veylattice's own art target is stricter (unique 3D voxel
silhouettes), and this inventory is cited only as evidence that per-unit
authored assets are a realistic production shape.

### 2.3 Not verified for Duelyst II

Recorded honestly so no later document treats these as fact:

- Board dimensions, movement/attack ranges, retaliation rules and damage math.
- AI behavior or difficulty implementation.
- Combat animation timelines, camera framing and readability at battlefield scale.
- Economy, pack composition and progression pacing.

These remain **design problems to solve independently**, not reference facts.

## 3. MDPro3 (local installation)

Install: `X:\MDPro3` (Unity; `GameAssembly.dll`, `MDPro3_Data`, `Data/cards.json`).

### 3.1 Observed corpus statistics

Read-only aggregation over `Data/cards.json` (14,138 records; fields
`cid, id, cn_name, sc_name, md_name, nwbbs_n, cnocg_n, jp_ruby, jp_name,
en_name, text, data`; `data` carries `ot, setcode, type, atk, def, level, race,
attribute`). This export contains **Chinese** effect text only:

| Pattern (Chinese term) | Count | Share of 14,096 effect texts |
|---|---|---|
| Special Summon | 7,014 | 49.8% |
| Destroy | 4,948 | 35.1% |
| Target | 4,554 | 32.3% |
| Send to Graveyard | 3,386 | 24.0% |
| Banish / remove from play | 3,010 | 21.4% |
| Add to hand (search) | 2,448 | 17.4% |
| Once per turn | 1,574 | 11.2% |
| Negate | 1,488 | 10.6% |
| ATK gain | 1,071 | 7.6% |
| Revive from Graveyard | 1,034 | 7.3% |
| Draw | 826 | 5.9% |
| Flip | 573 | 4.1% |
| Return to hand | 306 | 2.2% |
| Take control | 217 | 1.5% |

Card-type split by type bitfield: **9,206 monsters, 2,835 spells, 2,055 traps,
42 other**.

Other observed structure: 47 puzzle scenarios, 11 prebuilt `.ydk` decks,
`Data/Windbot/Decks` and `Dialogs` (a bundled scripted AI with deck lists), and
one expansion package `Expansions/ygopro-super-pre.ypk`.

### 3.2 What this evidence supports

**Observation:** high-frequency effect vocabulary concentrates on summoning,
destruction, targeting, graveyard movement, search, negation and recursion.
**Inference:** a durable tactical card game needs a small, well-defined effect
vocabulary (summon, destroy/damage, return, revive, search, draw, negate,
modify stats, control) with explicit timing, rather than hundreds of bespoke
one-off implementations. That directly shapes the typed-effect plan for M2.

### 3.3 Not verified for MDPro3

- Lua effect scripts inside `Data/script.zip` were **not** read or executed.
- AI decision quality, banlist effects and network protocol were not evaluated.
- No card text, art, names or data are reused in Veylattice.

## 4. Cross-reference conclusions carried into the M1 engine

1. **Positional combat must be readable and deterministic.** Both references
   expose range/targeting as first-class concepts; Veylattice implements them
   in one rules module, not in the HUD.
2. **Persistent durability beats threshold kills.** Veylattice's Guard is
   damage-accumulating, which makes partial damage visible and avoids the old
   prototype's "Attack must exceed Guard" coin-flip.
3. **Counterplay needs explicit legality.** Retaliation is implemented as a
   simultaneous exchange with its own range and line-of-sight check; it is not
   an assumption baked into card handlers.
4. **Effects need a closed vocabulary.** The MDPro3 frequency table supports
   the planned allowlisted effect types and a strict "no executable card code"
   rule.
5. **Per-unit authored identity is a production requirement**, supported by the
   per-unit asset volume observed in Duelyst II; Veylattice's own
   [UNIT_VISUAL_DESIGNS.md](UNIT_VISUAL_DESIGNS.md) remains the authority.

## 5. Reproducibility

Environment: Windows, Git Bash, Node v24.19.0. Reference installs were never
modified. Aggregation scripts were ad-hoc `node -e` invocations executed from
the reference directories; their outputs are summarized above and were not
committed as scraped data. REA temp output was written outside the repository.
