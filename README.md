<div align="center">

# VEYLATTICE

**An original tactical elemental card battler for the browser.**

Grid movement · persistent Guard · five-element counter-cycle · a tactical AI that plays by the rules

[![Play now](https://img.shields.io/badge/▶_PLAY_NOW-xiondigital.net%2Fveylattice-7ad7ff?style=for-the-badge)](https://xiondigital.net/veylattice/)
[![Tests](https://img.shields.io/badge/tests-83_passing-6ee7a8?style=flat-square)](#tests)
[![Dependencies](https://img.shields.io/badge/runtime_dependencies-0-b58bff?style=flat-square)](#architecture)
[![License](https://img.shields.io/badge/license-All_Rights_Reserved-9aa6c4?style=flat-square)](LICENSE)

</div>

![Veylattice battle screen](screenshots/battle.png)

---

## ▸ What this is

Veylattice is a tactical collectible card game: you deploy **Vessels** onto a 7×7 lattice, manoeuvre
them into firing lanes, and break the opposing **Nexus** before yours falls. Every unit is a
miniature sculpture of its element, every trade is decided by persistent Guard, and the five-element
cycle decides who hits harder.

This repository is a **working vertical slice**, not a design document. A deterministic rules engine
with typed Action and Relic cards, a tactically competent AI opponent, portable accounts with a
cross-device recovery code, animated voxel combat, and automated tests all ship from this tree today.

| Playable now | Not built yet |
|---|---|
| Main menu, How to Play, guided first match — no auto-launch into a game | Card collection, deck builder, shop, packs |
| 7×7 board with tinted deployment zones and a contested middle row | Online lobbies and server-authoritative matches |
| Persistent Guard, simultaneous retaliation, lethal trades | Lore Bonds, arenas, Forge, Codex |
| Five-element counter-cycle (advantage ×1.5, resistance ×0.5) | Ranked ladder and seasonal rewards |
| **8 Action cards** (damage, sweep, heal, buff, draw, Nexus) | Google / Discord sign-in (needs OAuth credentials) |
| **4 Relic cards** in a visible two-slot back row | Set/activate Action zones (no rule specifies them yet) |
| Typed, data-only effects — no card can carry code | Terrain that changes rules rather than decoration |
| Flux economy 1→10, one summon, four-Vessel cap | — |
| 120-second deadline with automatic turn pass | — |
| Tactical AI: 4 difficulties × 3 styles, plays Actions and Relics | — |
| **18 individually modelled 3D Vessels** in a CSS-3D renderer | — |
| Combat: lunges, impact, floating damage, Guard ticks, deaths | — |
| Contextual prompts, cancel/Escape, legality reasons | — |
| Profiles, avatars, match record, **portable accounts** | — |
| 83 automated tests + offline-first play | — |

> **Honest status:** Seat 2 is a real AI opponent with no access to your hand. The game opens on a
> menu; nothing starts until you press a button. Every Vessel on the board is its own voxel model —
> there is no generic fallback in the shipped roster, and a missing model renders a labelled
> placeholder instead of a silent cube.

---

## ▸ The menu, the tutorial and the roster

<div align="center">

![Main menu](screenshots/menu.png)

</div>

The app no longer drops you into a match. The menu offers **Practice match**, **Guided first match**,
and — only while a game is genuinely in progress — **Return to match**. Deck Builder, Collection, Shop
and Online are listed as *not in this build* rather than shown as buttons that do nothing.

On a first visit the **How to Play** page opens by itself: eight short steps covering the objective,
what a Vessel is, where you may summon, Actions and Relics, movement and combat, Flux, ending a turn,
and how a Nexus actually dies. It stays reachable from the header forever, and completion is stored
locally — practice never requires an account.

<div align="center">

![How to Play](screenshots/guide.png)

</div>

**The guided match is the real game.** It does not script a board. It watches the events the engine
emits (`summon`, `move`, `attack`, `turnEnd`…) and advances a five-step checklist over a live practice
match, with a state-aware nudge when a step cannot be completed yet — for example *"No Vessel in hand
can be summoned right now — end the turn to keep going."* Ending the turn always advances a step, so
the tutorial can never trap you, and Skip is always one click away.

<div align="center">

![Vessel roster](screenshots/roster.png)

</div>

**The Roster page renders the same model files the battlefield uses** — not illustrations. All 18
official Vessels have their own voxel definition: 11–14 boxes each, distinct silhouettes, grouped for
animation, and a per-model palette blended from its element.

---

## ▸ Where to play

| Surface | URL | Status |
|---|---|---|
| Custom domain | **https://xiondigital.net/veylattice/** | GitHub Pages project site under the existing `xiondigital.net` custom domain — no DNS changes, base site untouched |
| GitHub Pages | https://xiondigital.github.io/veylattice/ | Same build, account subdomain |
| Local | `python -m http.server 8000` → `http://localhost:8000` | Always works offline |

The app is a static bundle with **no build step and no runtime dependencies**. It also runs from
`file://`-adjacent hosts, but ES modules require HTTP — use the local server command above.

---

## ▸ The AI opponent

The AI is the centrepiece of this milestone, so it is built around three testable guarantees rather
than "it feels smart".

### Guarantee 1 — it cannot cheat

```
buildObservation(state, seat)  →  own hand + public board + opponent *counts* only
buildCandidates(state, seat)   →  commands produced by the engine's own getLegalActions()
choosePlan(candidates, obs)    →  pure scoring; receives no match state at all
applyCommand(state, command)   →  the same validator the human uses
```

- **No hidden information.** The opponent's hand and deck are exposed to the decision function as
  counts, never contents. A test mutates the opponent's hand and asserts the chosen command is
  byte-identical.
- **No bypass.** Every candidate is an engine command; a rejected command leaves state untouched and
  is surfaced in the match log. An AI-versus-AI match test asserts zero rejections across a full game.
- **No cheating on resources.** Difficulty changes *decision quality* (search window, noise, trade
  modelling, threat awareness) — never stats, Flux or extra actions.

### Guarantee 2 — it is bounded

Each decision checks an injected clock against a per-difficulty budget and keeps the best plan found
so far. Budgets are 8 / 20 / 45 / 120 ms. A test forces the budget to bite and asserts the AI still
returns a legal plan with `truncated: true`.

### Guarantee 3 — difficulty is real

| Difficulty | Budget | Search | Trade model | Threat model | Finds move-then-strike |
|---|---|---|---|---|---|
| Novice | 8 ms | 90 candidates, 5-way random pick | 25 % retaliation awareness | none | no |
| Standard | 20 ms | 400 candidates | 85 % | 35 % | yes |
| Veteran | 45 ms | 900 candidates | full | 80 % | yes |
| Master | 120 ms | 1800 candidates | full | full | yes + enemy best-response penalty |

Three personalities change the weights, not the rules:

| Style | Bias | Behaviour |
|---|---|---|
| **The Vanguard** | +30 % aggression, +30 % Nexus focus | Advances and races your Nexus |
| **The Warden** | +40 % defence, +35 % survival | Attrites, refuses bad trades, punishes overextension |
| **The Conductor** | +35 % positioning, +35 % element play | Hunts elemental advantages and firing lanes |

A crafted-position test proves the tiers differ for a reason: a Veteran sees the lethal
move-onto-home-row-then-strike line and wins the match; a Novice has no move-then-attack search and
cannot. A separate test proves the Veteran rates a suicidal trade *below* the Novice and declines it.

The AI also plays the new card types through the same command path: `buildCandidates` enumerates
`playAction` and `playRelic` plans from `getLegalActions`, and `evaluateAction` scores damage (with
retaliation modelled as zero), kills, sweeps, heals, buffs, draws and Nexus burn. It is never offered
a cast that would do nothing — a board wipe against an empty board and a heal on an undamaged Vessel
both return no plan at all, which was caught in browser play and fixed at the scoring level.

---

## ▸ Actions, Relics and voxel combat

![Battle screen with Actions in hand and voxel units](screenshots/battle.png)

Cards are **typed data, never code**. Every effect is one of a closed set of `kind` values, validated
against a numeric range, frozen at catalog build time, and executed by one switch in the engine. A
card that tries to smuggle behaviour is rejected before a match can start.

| Card | Element | Cost | Effect |
|---|---|---|---|
| Ember Lance | Fire | 2 | 5 damage to a Vessel, resolved elementally |
| Quarry Verdict | Earth | 3 | 7 damage to a Vessel |
| Ashfall | Fire | 3 | 2 damage to every enemy Vessel |
| Siege Canticle | Earth | 3 | 4 damage to the enemy Nexus |
| Undertow Mend | Water | 1 | Restore 4 Guard, capped at maximum |
| Thorned Vigil | Wood | 2 | Permanent +2 Attack / +2 Guard |
| Barkbound Ward | Wood | 2 | Permanent +4 Guard |
| Lodestone Survey | Metal | 1 | Draw 2 |
| Ember Lens | Fire | 2 | Relic · your Vessel attacks deal +1 |
| Stone Sigil | Earth | 3 | Relic · your Nexus takes 1 less |
| Choir Bell | Water | 2 | Relic · mend 2 Guard at the start of your turn |
| Verdant Seal | Wood | 3 | Relic · your Vessels have +2 Guard |

Relics are persistent, capped at two per seat, and their auras are computed in one place
(`relicAuras`) so the HUD, the previews, the engine and the AI cannot disagree. A Guard aura applies
to Vessels already on the table *and* to every future summon, so the bonus does not depend on timing.

### The 3D Vessels

There are no GLB files and no Three.js dependency: the renderer is **CSS 3D**, about 120 lines in
[`src/render/voxel.js`](src/render/voxel.js). Each box becomes a node with three visible faces
(front, right, top) inside a `preserve-3d` scene, scaled by a single CSS variable — the same markup is
40 px on a phone tile and 130 px in the roster. It costs no downloads and works on the static host.

Models are **data**, in [`src/render/models.js`](src/render/models.js): a list of boxes in voxel units
with a group (`body`, `head`, `weapon`, `tail`…), size, offset and palette key. Behaviour is not in
the data, and the renderer cannot change a match — it is handed a card id and draws it.

| Element | Material language |
|---|---|
| Wood | layered bark, leaf plates, branch crowns |
| Fire | ember-lit fractures, heated metal, sparks |
| Earth | stone mass, mineral strata, masonry |
| Metal | forged plate, etched alloy, sharp geometry |
| Water | translucent blue, fins, submerged motifs |

Subtype drives the silhouette too: Beasts are quadrupeds with low centres of mass, Constructs are
blocky and jointed, Dragons are long and serpentine, Spirits float with no legs, and Otherworldly
Vessels break anatomy outright (the Star-Eater is a hovering eclipse core with ring shards).

A test enforces the roster: every official Vessel has a model, no two models share a silhouette, every
box uses a real palette key, and a missing id returns `null` rather than a silent cube.

> **Balance note, not a bug:** the canonical Flux curve gives 1 Flux on your first turn and the
> cheapest Vessel costs 2, so turns one and two are spent on cheap Actions, a mulligan or passing.
> The tutorial says so explicitly. Changing that is a balance decision for `GAME_RULES.md`, not a UI
> tweak.

### Combat presentation

Attack resolution is animated from the engine's own events, never from re-derived state:

- the attacker **lunges** toward its target using a per-strike offset, then settles;
- the defender **flashes and shakes**, and a floating `-N` rises from the tile (larger and amber on an
  elemental advantage, smaller and red for retaliation);
- surviving Guard **counts down** from its old value to its new one instead of snapping;
- a lethal hit leaves a **ghost chip that crumbles** away before the tile clears;
- Nexus strikes **shake the board** and stamp a large number on the Nexus;
- Actions add violet impact rings, green mend pulses and gold buff glows.

Everything is skipped when `prefers-reduced-motion` is set or the in-game toggle is on, and no effect
can mutate a match — the presentation layer only reads events.

---

## ▸ Rules at a glance

| Rule | Value |
|---|---|
| Board | 7×7, orthogonal movement, occupied cells block paths |
| Vitality | 30 per Nexus |
| Flux | Starts at 1, +1 per turn, caps at 10, refills each turn |
| Opening | 5 cards, mandatory draw at turn start, fatigue escalates |
| Summons | One per turn, max four Vessels, own three deployment rows, enters unready |
| Actions per Vessel | One move **and** one attack per ready Vessel |
| Guard | Persistent durability; printed maximum is preserved separately |
| Retaliation | Simultaneous, if the defender's range and line of sight allow it |
| Nexus | Strikable only from the enemy home row **and** only while the opponent controls no Vessels |
| Element cycle | Wood → Earth → Water → Fire → Metal → Wood |
| Element maths | Advantage `floor(1.5 × Attack)`; resistance `max(1, floor(0.5 × Attack))`; applied per packet from current Attack |
| Mulligan | Once per turn, 1 Flux, bottom one card and draw one |
| Turn clock | 120 seconds, engine-resolved; a late command is rejected and the turn passes without duplicating accepted actions |

Elemental maths lives in exactly one module ([`src/game/elemental-rules.js`](src/game/elemental-rules.js))
and is tested across all 25 pairs. The old halved-Guard proposal was withdrawn rather than silently
reinterpreted — see [docs/ELEMENTAL_SYSTEM.md](docs/ELEMENTAL_SYSTEM.md).

---

## ▸ Profiles, avatars and stored data

<div align="center">

![Profile and settings](screenshots/profile.png)

</div>

The **Profile & Settings** tab holds your display name, avatar, opponent configuration, motion and
coordinate preferences, and your match record.

**Avatar upload** is a real pipeline, not a form field: pick a PNG/JPEG/WebP, the browser centre-crops
it, resizes to 128 px, and compresses to WebP (falling back to smaller sizes and JPEG if needed). A
512 px / 132 KB source lands as a **2.4 KB** stored image. SVG is rejected — it can carry active
content. Removal is one click.

### Where the data actually goes

| Layer | What | Behaviour |
|---|---|---|
| `localStorage` | Whole profile + guest edit token (and the account link, once signed in) | Written first, always. The game never blocks on the network. |
| Supabase Postgres | Name, avatar, settings, stats — under a device row *or* an account | Best-effort sync; the UI reports *Saved to account*, *Saved to cloud*, *Saving…* or *Offline — saved on this device*, never a success it did not observe |

The cloud side runs in a **dedicated Supabase project created for Veylattice**, deliberately separate
from the Sohbet project so nothing here can touch another app's data or quotas.

### Accounts, and why they exist

A guest profile is an identity bound to one browser: its credential is a token in `localStorage`, so
clearing site data breaks the link to the cloud row. **An account fixes exactly that.**

1. **Create account** uploads the current name, avatar, settings and record, and the server returns a
   **recovery code** — 20 characters from a 32-symbol alphabet (`XXXX-XXXX-XXXX-XXXX-XXXX`, 100 bits).
2. **Sign in** with that code on any device and the account's record replaces the local one.
3. **Sign out** returns this browser to a guest profile without touching the account.
4. **Issue a new code** invalidates the old one immediately.

No email, password, or personal data is collected. The code is the credential; the account id is only
a lookup key.

### Security model

```sql
-- RLS on, no anon table privileges: direct PostgREST access returns 401
revoke all on table public.veylattice_profiles  from anon, authenticated;
revoke all on table public.veylattice_accounts  from anon, authenticated;

-- Guest rows: guarded by a per-browser edit token
veylattice_profile_save(p_id, p_token, ...)   veylattice_profile_get(p_id)

-- Accounts: guarded by the recovery code
veylattice_account_create(...) -> {account_id, recovery_code}
veylattice_account_load(p_code)
veylattice_account_save(p_account_id, p_code, ...)
veylattice_account_rotate(p_account_id, p_code) -> {recovery_code}
```

| Threat | Mitigation | Verified |
|---|---|---|
| Client writes arbitrary rows | No table grants; RPC only | direct `GET /rest/v1/veylattice_accounts` → **401** |
| Hijacking someone's profile | 64-hex edit token; DB stores a bcrypt hash | wrong token → **401 `not authorized`** |
| Guessing an account code | 100-bit CSPRNG code; only a SHA-256 digest is stored | wrong code → `null`; wrong code on save → **401** |
| Reusing a revoked code | Rotate replaces the digest in one statement | old code → `null` after rotation |
| Stored XSS via avatar | DB `CHECK` allows only base64 PNG/JPEG/WebP data URLs | schema constraint |
| Oversized payloads | Name ≤ 24 chars, avatar ≤ 70 000 chars, JSON ≤ 4 000 / 2 000 chars | schema constraints |
| Tampered local storage | Every restored field re-sanitised (`sanitizeProfile`) | unit tests |
| Privileged key leakage | Only the publishable anon key ships; the service-role key is absent from the repo and browser | [config.js](src/net/config.js) |

**Verified end to end against the live database** — create → load → save with a wrong code (401) →
save with the right code → rotate → old code rejected → new code returns the updated record. Then,
in the browser: create an account, rename to *Lattice Adept*, sign out, rename the guest to *Guest
Only*, sign back in with the code, and see *Lattice Adept* return from the database. Test rows were
removed afterwards.

### Google and Discord

Supabase Auth is present on the project but **Google and Discord providers are disabled**, and turning
them on needs OAuth client credentials created in the Google Cloud and Discord developer consoles.
That is not something this build can do for you, so the UI says so instead of showing buttons that
cannot work. [docs/ACCOUNTS.md](docs/ACCOUNTS.md) lists the exact steps; the recovery code already
provides cross-device identity without them.

Reproduce the schema with [`supabase/migrations/0001_profiles.sql`](supabase/migrations/0001_profiles.sql)
and [`supabase/migrations/0002_accounts.sql`](supabase/migrations/0002_accounts.sql).

---

## ▸ Screenshots

| Battle | Profile & Settings |
|---|---|
| ![Battle](screenshots/battle.png) | ![Profile](screenshots/profile.png) |

<div align="center">

**Mobile (414 px)**

<img src="screenshots/mobile.png" alt="Veylattice on a phone" width="360">

</div>

---

## ▸ Architecture

```
src/game/            DOM-free rules and AI
  constants.js         rule numbers (single source of truth)
  elemental-rules.js   25-pair counter-cycle maths
  content.js           catalog validation, frozen card data, deck legality
  engine.js            deterministic command reducer (applyCommand)
  ai.js                observation → candidates → bounded scoring
src/net/             browser persistence
  config.js            public Supabase URL + publishable key
  rpc.js               one guarded PostgREST transport
  profile.js           sanitise, local-first save, cloud sync, avatar pipeline
  account.js           recovery-code accounts (create, load, save, rotate)
src/render/          presentation-only model layer
  models.js            18 Vessel voxel definitions + element palettes
  voxel.js             CSS-3D model builder (no dependencies)
src/ui/              UI state machines that are worth testing on their own
  tutorial.js          guided-match steps and the pure advance reducer
src/main.js          HUD controller + presentation layer (events → animation)
src/cards/           starter Vessels, Actions and Relics as validated JSON
index.html           Menu, How to Play, Roster, Battle and Settings views
styles.css           themed UI, voxel models, board zones, combat keyframes, reduced motion
tests/               Node test runner, 83 tests, zero dependencies
supabase/migrations/ profile + account schemas and RPCs
docs/                rules, research, adaptation matrix, accounts, session log
```

Design rules the code follows:

1. **The engine never imports the DOM**, and the AI never imports the engine's state — it consumes a
   filtered observation.
2. **Content is data.** Card definitions are validated, deep-frozen, and can never become executable
   code.
3. **Rejected commands are inert.** A failed command returns the original state object; a stale
   `expectedVersion` is rejected; deadline handling materialises a timeout without duplicating
   accepted actions.
4. **Injected clock and RNG.** Determinism is testable because time and randomness are parameters.

---

## ▸ Run locally

```bash
# serve (any static server works)
python -m http.server 8000
# → http://localhost:8000

# tests
npm test            # node --test "tests/*.test.js"
```

### Tests

`npm test` → **83 passing, 0 failing** (~0.6 s). Coverage includes:

| Area | Examples |
|---|---|
| Elemental system | all 25 pairs, rounding, minimum 1, persistent Guard |
| Combat | lethal trades, out-of-range retaliation, blocked line of sight, Nexus gating |
| Actions & Relics | elemental damage, heal capping, permanent buffs, sweeps, Nexus burn vs armour, wrong-side and missing targets, Relic cap, attack/guard/mend auras, aura timing on existing and future Vessels |
| Deck rules | canonical five-Action minimum enforced, vessel-only decks rejected, practice deck legal with no exception profile |
| Content | 30-card pool validates; malformed effects, cross-scope effects and pseudo-targeting Relics are rejected |
| Economy & turns | Flux 1→10, zero-Flux restriction, summon limits, draw, fatigue |
| Determinism | byte-identical rejection, seeded replay, catalog immutability |
| Deadlines | boundary rejection, committed actions preserved |
| AI | information isolation, hidden-hand invariance, time budget, legality, tier differentiation, Actions/Relics played through the engine, no pointless casts, full AI-vs-AI match |
| Profiles | name/avatar/settings/stats sanitisation, forged ids, streak maths |
| Voxel roster | all 18 official ids modelled, no shared silhouettes, palette keys resolve, missing model reports `null`, board is 49 tiles split 21/7/21 across the zones |
| Guided match | step order, unrelated events ignored, `endTurn` always escapes, completion clamps, skip is idempotent, every step watches a real engine event |

Tests I did **not** run are listed as unrun in [docs/IMPLEMENTATION_LOG.md](docs/IMPLEMENTATION_LOG.md),
not as passes.

---

## ▸ Deployment

**GitHub Pages** (this is how the live site is served):

1. Repository → **Settings → Pages**.
2. Source: **Deploy from a branch** → `main` → `/ (root)`.
3. `.nojekyll` is committed so the static files are served verbatim.

The site lives at `xiondigital.net/veylattice/` because the account's user site
(`xiondigital.github.io`) already owns the `xiondigital.net` custom domain; GitHub Pages serves
project repositories as subpaths of that domain. **No DNS record, custom-domain setting, or file on
the base site was modified** — `/sohbet` and the root site are unaffected.

**Database** (optional for local play; required for cloud profiles):

1. Create a Supabase project (a separate one — do not reuse another app's project).
2. Run [`supabase/migrations/0001_profiles.sql`](supabase/migrations/0001_profiles.sql) and
   [`supabase/migrations/0002_accounts.sql`](supabase/migrations/0002_accounts.sql) in the SQL editor.
3. Put the project URL and **publishable/anon** key in [`src/net/config.js`](src/net/config.js).
4. Never put the `service_role` key in this repository or in the browser bundle.

Without step 1–3 the game still runs: `CLOUD_ENABLED = false` (or a failing network) degrades to a
clearly labelled local profile and accounts report that cloud sync is disabled.

---

## ▸ Roadmap

| Milestone | State |
|---|---|
| **M1** deterministic engine, HUD, tests, deadline | ✅ done |
| **M2-001** typed Action and Relic effects, relic auras | ✅ done |
| **M2-002** canonical deck rules, practice exception removed | ✅ done |
| **M2-003** tactical AI, difficulties, styles | ✅ done |
| **M2-006** portable accounts, recovery codes, cross-device restore | ✅ done |
| **M2-007** voxel combat presentation | ✅ done |
| **M2-008 / UX-001** menu, How to Play, guided first match, un-auto-launched boot | ✅ done |
| **M2-009** unique voxel models for all 18 Vessels and the roster page | ✅ done |
| **M3** collection, deck builder, shop, packs | next |
| **M4** trusted backend, authoritative matches, throttling | planned |
| **M5** lobbies and Tag | planned |
| **M6–M7** ranked, arenas, Lore Bonds, full voxel models | planned |

Full task list, acceptance criteria and blockers: [TODO.md](TODO.md). Dated session records:
[docs/IMPLEMENTATION_LOG.md](docs/IMPLEMENTATION_LOG.md).

---

## ▸ Documentation

- [Canonical rules](GAME_RULES.md) · [technical architecture](TECHNICAL_ARCHITECTURE.md) · [roadmap](ROADMAP.md)
- [Reference research](docs/REFERENCE_RESEARCH.md) · [mechanic adaptation matrix](docs/MECHANIC_ADAPTATION_MATRIX.md)
- [Elemental system](docs/ELEMENTAL_SYSTEM.md) · [combat rules](docs/COMBAT_RULES.md) · [testing guide](docs/TESTING.md)
- [AI handoff](AI_HANDOFF.md) · [changelog](CHANGELOG.md) · [implementation log](docs/IMPLEMENTATION_LOG.md)
- Art and world: [voxel art bible](docs/VOXEL_ART_BIBLE.md), [unit designs](docs/UNIT_VISUAL_DESIGNS.md), [world](docs/WORLD_BIBLE.md), [arenas](docs/ARENA_SYSTEM.md)

---

## ▸ Originality and licensing

Original code, creatures, card text, lore, naming and presentation. Reference games were studied for
*design problems and solutions only* — no assets, card text, UI or code were copied, and the
reference installations were treated as read-only research sources. See
[docs/REFERENCE_RESEARCH.md](docs/REFERENCE_RESEARCH.md) for evidence and documented tool
limitations.

The existing [LICENSE](LICENSE) remains **All Rights Reserved** unless separately authorized.
Third-party dependencies retain their licences; there are currently no runtime dependencies.
