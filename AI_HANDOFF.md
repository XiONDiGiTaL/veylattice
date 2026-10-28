# AI Handoff — Start Here

## Verified baseline

- Repository: `XiONDiGiTaL/Veylattice` → **renamed to lowercase `XiONDiGiTaL/veylattice`** in session S-M2-B so the
  GitHub Pages path matches the published URL. GitHub keeps redirects for the old slug.
- Branch: `main`. Remote: `https://github.com/XiONDiGiTaL/veylattice.git`.
- The M1 change set (S-M1-A) and the M2-003/M2-004 change set (S-M2-B) are committed together as
  `1bb92f7` (`feat: tactical AI opponent, player profiles and cloud persistence`), pushed to
  `origin/main`.
- Live site: **https://xiondigital.net/veylattice/** (GitHub Pages project site under the account's
  existing Pages custom domain). Verified after the build: `/` and every asset returned 200, the page
  booted with 49 cells and 6 cards, the AI took its turn through the deployed bundle, and a profile
  write returned `200` from the live origin with no console errors.
- GitHub Pages settings: source `main`, path `/`, `https_enforced` was requested but the API returned
  `https_enforced: false`; the site nevertheless serves HTTPS (certificate approved for
  `xiondigital.net`/`www.xiondigital.net`). Re-check the enforce-HTTPS toggle in repository settings.
- Environment: Windows/Git Bash, Node v24.19.0, Python 3.14 for static serving. No dependencies are
  installed for the app; tests use Node's built-in runner.

## Latest session — S-M2-C (Actions, Relics, accounts, combat presentation)

Implemented in this session, all verified:

1. **Action and Relic cards** — `src/cards/actions-relics.json` (8 Actions, 4 Relics). Every effect is a
   closed `kind` in `EFFECT_KINDS` (`src/game/constants.js`) with a scope and numeric range; `content.js`
   validates and freezes it. New commands `playAction` / `playRelic` live in `engine.js` beside the
   existing handlers and go through the same `applyCommand` validator.
2. **Relic auras** — `relicAuras(state, seat)` is the single source for `attack`, `armor`, `mend` and
   `guard`. Used by `handleAttack`, Nexus damage, `startTurn` (mend) and `handleSummon` (guard bonus).
   Do not duplicate aura maths elsewhere; previews and the AI read the same helper.
3. **Canonical deck rules** — `PRACTICE_DECK_RULES` is deleted. `createMatch` defaults to `DECK_RULES`
   and `buildPracticeDeck` now builds a legal 38-card deck from the whole pool.
4. **AI** — `buildCandidates` emits `playAction` / `playRelic` plans; `evaluateAction` scores damage,
   kills, sweeps, heals, buffs, draws and Nexus burn. Pointless casts return `-Infinity` (empty-board
   sweep, heal at full Guard, draw from an empty deck) so exploration can never pick them.
5. **Accounts** — `src/net/account.js` + `supabase/migrations/0002_accounts.sql`. Recovery-code accounts;
   see `docs/ACCOUNTS.md`. `profile.js` routes saves to the account when signed in and to the device row
   otherwise; `initialiseProfile` prefers the account.
6. **Combat presentation** — `playEvents(events, before)` in `src/main.js` animates from engine events
   using a **pre-command snapshot**, because casualties are already gone from the new state. Voxel cubes,
   lunges, impact flashes, floating damage, Guard countdowns, crumbling ghosts, Nexus shake.

### Where the seams are

- `ui.selectedCard` holds an instance id; `selectedCardEntry()` resolves it to a definition plus the
  engine's own legality (`getLegalActions`). The DOM never decides what is playable.
- `dispatch()` snapshots units before applying and then calls `playEvents`. The AI loop keeps one frame
  per command for the same reason (a move-then-attack plan must animate from the moved cell).
- Account state lives in `localStorage` under `veylattice.account.v1`; `profile.js` re-exports the
  account actions the UI needs so `main.js` does not talk to the RPC layer directly.

### Verified in this session

- `npm test` → **69 passing, 0 failing**.
- Live database: direct table read 401; create → load → wrong-code save 401 → correct save → rotate →
  old code null → new code returns the updated record. Test rows removed (`veylattice_accounts` count 0).
- Browser: no console errors; Actions cast, Relics set with auras visible (`2 / 2`), combat classes
  observed during real events, and a full account round trip (create → rename → sign out → guest rename
  → sign in → restored).

## Read first

`AI_INSTRUCTIONS.md`, `GAME_RULES.md`, `TODO.md`, `ROADMAP.md`, `TECHNICAL_ARCHITECTURE.md`,
`docs/IMPLEMENTATION_LOG.md` (session S-M2-B), `README.md`.
`GAME_RULES.md` is canonical; `docs/ELEMENTAL_SYSTEM.md` and `docs/COMBAT_RULES.md` now describe the
implemented rules.

## What is implemented (verified)

### Deterministic rules engine — `src/game/`

- Commands: `summon`, `move`, `attack` (unit or `target: "nexus"`), `mulligan`, `endTurn`,
  `surrender`, `timeout`, `tick`. `applyCommand(state, command, { now })` → `{ ok, state, events }`.
- Rejected commands return the original state by reference; `expectedVersion` catches stale commands;
  the deadline path materializes a timeout rather than losing it.
- Rules: 7×7 board, 30 Vitality, opening 5 + mandatory draw, Flux 1→10 with refill/expiry, one summon
  per turn, four-Vessel cap, deployment rows, summons unready, orthogonal BFS movement, one move and
  one attack per ready Vessel, persistent Guard with separate `maxGuard`, simultaneous eligible
  retaliation, defeat/discard, Nexus strikes gated on the enemy home row and an undefended opponent,
  escalating fatigue, victory/surrender/simultaneous-lethal draw, once-per-turn 1-Flux mulligan,
  120-second deadline.
- Shared public helpers added for the AI: `attacksFromCell`, `lineOfSightOnBoard`,
  `canStrikeNexusFrom` (`canAttackNexus` delegates to it). Do not re-implement range/LoS in the AI.

### Tactical AI — `src/game/ai.js`

- `buildObservation(state, seat)` → own hand + public units/board + opponent **counts only**.
- `buildCandidates(state, seat, { difficulty })` → engine-derived plans (single commands, or
  `[move, attack]` pairs for move-then-strike).
- `choosePlan(candidates, observation, { difficulty, archetype, rng, now, timeBudgetMs })` → pure,
  bounded, returns `{ commands, kind, score, considered, truncated }`.
- `decideNextCommands(state, seat, options)` → convenience wrapper used by the HUD.
- Difficulties: `novice`/`standard`/`veteran`/`master` (8/20/45/120 ms budgets). Archetypes:
  `vanguard`/`warden`/`conductor`. Difficulty changes decision quality only — never resources.
- Seat 1 is the human, Seat 2 is the AI. The HUD drives the AI through `applyCommand` only.

### Profiles and persistence — `src/net/`

- `src/net/config.js`: public Supabase URL + publishable key, `CLOUD_ENABLED` toggle.
- `src/net/profile.js`: `sanitizeProfile`, `sanitizeName`, `sanitizeAvatar`, `sanitizeSettings`,
  `sanitizeStats`, `recordMatchResult`, local-first `persistProfile`, `initialiseProfile`,
  `resetLocalProfile`, `fileToAvatar` (center-crop → 128 px WebP/JPEG, SVG rejected).
- UI: Profile & Settings tab with name, avatar upload/removal, difficulty, archetype, reduced motion,
  coordinates, record, profile id, copy, and "forget this device's profile".
- Cloud: dedicated Supabase project `jjtfnduodxtulxvviasf`; schema and RPCs in
  `supabase/migrations/0001_profiles.sql`. RLS on, **no anon table grants**; writes only via
  `veylattice_profile_save` guarded by a bcrypt-hashed edit token; reads via
  `veylattice_profile_get`. Verified 401 for direct table access and for wrong tokens.

### Tests — 53/53 passing

`npm test` → 53 pass, 0 fail (~0.62 s). Files: `tests/elemental`, `content`, `engine`, `match`,
`ai`, `profile`, plus `support.js`.

## Not implemented (do not claim otherwise)

- No Actions or Relics. Non-Vessel cards are rejected with `UNSUPPORTED_CARD`.
- `PRACTICE_DECK_RULES` still waives only `minActions`. The canonical deck rule needs five Actions;
  delete the exception in M2-002 once Actions exist.
- Profiles are **device identities, not accounts**. No sign-in, email, password, recovery, or
  cross-device identity. Anyone with an id can read its public fields.
- No rate limiting on profile creation (M2-005) — a browser cannot enforce it.
- No collection, deck builder, shop, packs, rewards, lobbies, ranked, arenas, Lore Bonds, Forge,
  Codex, or 3D voxel models. No timeout forfeit safeguard; only auto-pass.
- No keyboard grid traversal. The AI turn is paced with `setTimeout`, not animated.
- No measured AI win rate against humans; no balance claims are justified.
- A real 120-second browser expiry has still not been waited out; engine tests cover the boundary.

## Architecture decisions and reasons

1. **Everything is a command.** HUD and AI (and later a server) submit the same validated commands.
2. **The AI cannot see hidden information.** The decision function receives an observation, not state;
   a test mutates the opponent hand and asserts an identical decision.
3. **Candidates come from the engine**, so legality can never fork between HUD and AI.
4. **Elemental math is one module**, applied per packet to current Attack; Guard is never halved.
5. **Simultaneous exchange**, so a lethally hit defender still retaliates.
6. **Local-first persistence.** Play never blocks on the network; the UI reports the real sync state.
7. **No anon table grants.** All database access is through two RPCs; writes need an edit token.
8. **Separate Supabase project.** Sohbet (`ezwxppiuxbyzmmheckce`) must never be touched.

## Commands

```bash
npm test                                  # 53 tests, Node built-in runner
node --check src/main.js src/game/ai.js   # syntax sanity
python -m http.server 8000                # then http://localhost:8000
```

Serve from the repository root. All asset paths are relative, so `/veylattice/` works unchanged.
Previously used preview servers: 8123/8124. Check ownership before killing anything.

## Known risks

- `state.catalog` is cloned per command (fine at 18 cards; revisit if the catalog grows or a server
  serializes per command). `structuredClone` is required.
- The practice deck exception must not leak into ranked or online formats.
- Balance numbers (Flux curve, fatigue, 1-Flux mulligan, four-Vessel cap) are provisional.
- The edit token is a write capability, not authentication. Do not describe profiles as secure accounts.
- `structuredClone`/`crypto.randomUUID` require a modern browser; there are no polyfills.

## Next three executable steps

1. **M2-001** — typed effect queue in `src/game/effects/` with allowlisted handlers and the first
   Actions/Relics (damage, heal, draw, revive, death trigger). Acceptance: explicit ordering, loop
   limit, buff expiry, revive enters unready, simultaneous-death tests, no executable card code.
2. **M2-002** — author Actions/Relics, build three legal archetype decks (20–40 cards, ≥10 Vessels,
   ≥5 Actions, ≤3 copies), switch `createMatch` to `DECK_RULES`, delete `PRACTICE_DECK_RULES`.
3. **M2-005** — cloud write abuse guard (edge/server-side), then **M3** collection and deck builder.

## End-of-session requirement

Commit coherent change sets, update `CHANGELOG.md` with actual changes and observed test output,
`TODO.md` with statuses and evidence, this handoff with a fresh verified baseline, and append to
`docs/IMPLEMENTATION_LOG.md`. Include the commit hash you actually created. Never claim completion
from a plan, placeholder, or unrun test.
