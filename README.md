<div align="center">

# VEYLATTICE

**An original tactical elemental card battler for the browser.**

Grid movement · persistent Guard · five-element counter-cycle · a tactical AI that plays by the rules

[![Play now](https://img.shields.io/badge/▶_PLAY_NOW-xiondigital.net%2Fveylattice-7ad7ff?style=for-the-badge)](https://xiondigital.net/veylattice/)
[![Tests](https://img.shields.io/badge/tests-53_passing-6ee7a8?style=flat-square)](#tests)
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

This repository is a **working vertical slice**, not a design document. A deterministic rules engine,
a tactically competent AI opponent, a profile system with cloud-saved avatars and match statistics,
and automated tests all ship from this tree today.

| Playable now | Not built yet |
|---|---|
| 7×7 tactical board with orthogonal movement and line of sight | Action and Relic cards (typed effect queue) |
| Persistent Guard, simultaneous retaliation, lethal trades | Card collection, deck builder, shop, packs |
| Five-element counter-cycle (advantage ×1.5, resistance ×0.5) | Online lobbies and server-authoritative matches |
| Flux economy 1→10, one summon, four-Vessel cap | Lore Bonds, arenas, Forge, Codex |
| 120-second deadline with automatic turn pass | Unique 3D voxel models (roster is 2D UI today) |
| Tactical AI: 4 difficulties × 3 styles, bounded latency | Ranked ladder and seasonal rewards |
| Profile, avatar upload, match record synced to Postgres | Accounts, sign-in, cross-device identity |
| 53 automated tests + offline-first play | — |

> **Honest status:** Seat 2 is a real AI opponent with no access to your hand. The card pool is the
> 18-Vessel starter set, so the canonical "five Actions per deck" rule is still waived by an
> explicitly named practice profile (`PRACTICE_DECK_RULES`) — see [TODO.md](TODO.md#m2-002--todo--canonical-deck-validation-and-prebuilt-decks).

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
| `localStorage` | Whole profile + private edit token | Written first, always. The game never blocks on the network. |
| Supabase Postgres | Name, avatar, settings, stats | Best-effort sync; the UI reports *Saved to cloud*, *Saving…* or *Offline — saved on this device* — never a success it did not observe |

The cloud side runs in a **dedicated Supabase project created for Veylattice**, deliberately separate
from the Sohbet project so nothing here can touch another app's data or quotas.

### Security model

```sql
-- RLS on, no anon table privileges: direct PostgREST access returns 401
revoke all on table public.veylattice_profiles from anon, authenticated;

-- The only writable surface: a SECURITY DEFINER function guarded by an edit token
veylattice_profile_save(p_id, p_token, p_display_name, p_avatar, p_settings, p_stats)
veylattice_profile_get (p_id)
```

| Threat | Mitigation | Verified |
|---|---|---|
| Client writes arbitrary rows | No table grants; RPC only | `GET /rest/v1/veylattice_profiles` → **401** |
| Hijacking someone's profile | 64-hex edit token; DB stores a bcrypt hash | Wrong token → **401 `not authorized`** |
| Stored XSS via avatar | DB `CHECK` allows only base64 PNG/JPEG/WebP data URLs | schema constraint |
| Oversized payloads | Name ≤ 24 chars, avatar ≤ 70 000 chars, JSON ≤ 4 000 / 2 000 chars | schema constraints |
| Tampered local storage | Every restored field re-sanitised (`sanitizeProfile`) | unit tests |
| Privileged key leakage | Only the publishable anon key ships; the service-role key is absent from the repo and browser | [config.js](src/net/config.js) |

> **What this is not:** a device profile is an identity, not an account. There is no password, no
> email, and no personal data collected. Anyone holding the profile id can *read* its public fields;
> only the token holder can change them. Cross-device sign-in, account recovery and ownership
> transfer are M4 work, and the README will not claim them before they exist.

Reproduce the schema with [`supabase/migrations/0001_profiles.sql`](supabase/migrations/0001_profiles.sql).

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
  profile.js           sanitise, local-first save, cloud sync, avatar pipeline
src/main.js          HUD controller: every click becomes a validated command
index.html           Battle + Profile views
styles.css           themed UI (element colours, reduced-motion support)
tests/               Node test runner, 53 tests, zero dependencies
supabase/migrations/ profile schema + RPCs
docs/                rules, research, adaptation matrix, session log
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

`npm test` → **53 passing, 0 failing** (~0.6 s). Coverage includes:

| Area | Examples |
|---|---|
| Elemental system | all 25 pairs, rounding, minimum 1, persistent Guard |
| Combat | lethal trades, out-of-range retaliation, blocked line of sight, Nexus gating |
| Economy & turns | Flux 1→10, zero-Flux restriction, summon limits, draw, fatigue |
| Determinism | byte-identical rejection, seeded replay, catalog immutability |
| Deadlines | boundary rejection, committed actions preserved |
| AI | information isolation, hidden-hand invariance, time budget, legality, tier differentiation, full AI-vs-AI match |
| Profiles | name/avatar/settings/stats sanitisation, forged ids, streak maths |

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
2. Run [`supabase/migrations/0001_profiles.sql`](supabase/migrations/0001_profiles.sql) in the SQL editor.
3. Put the project URL and **publishable/anon** key in [`src/net/config.js`](src/net/config.js).
4. Never put the `service_role` key in this repository or in the browser bundle.

Without step 1–3 the game still runs: `CLOUD_ENABLED = false` (or a failing network) degrades to a
clearly labelled local profile.

---

## ▸ Roadmap

| Milestone | State |
|---|---|
| **M1** deterministic engine, HUD, tests, deadline | ✅ done |
| **M2-003** tactical AI, difficulties, styles | ✅ done |
| Profile, avatar, cloud persistence | ✅ done (device identity, not accounts) |
| **M2-001/002** typed Actions & Relics, canonical deck rules | next |
| **M3** collection, deck builder, shop, packs | planned |
| **M4** trusted backend, auth, authoritative matches | planned |
| **M5** lobbies and Tag | planned |
| **M6–M7** ranked, arenas, Lore Bonds, voxel models | planned |

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
