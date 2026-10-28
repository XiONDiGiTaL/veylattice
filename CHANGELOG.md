# Changelog

Engineering history, not a list of promised features. Keep entries under Unreleased until an actual release is designated. Preserve history and distinguish implementation, specification and verification.

## Unreleased

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
