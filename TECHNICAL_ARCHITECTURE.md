# Technical Architecture

Status: target architecture. HTML/CSS/vanilla JS ES modules and JSON remain the baseline; Three.js/GLB follow tested gameplay.

**Implemented as of 2026-10-28 (M1 + M2-001a/002a/003/004/006/007/008/009):** static frontend on GitHub Pages
at `xiondigital.net/veylattice/`; deterministic rules engine with typed Action and Relic effects, and an
AI in `src/game/` that plays them; local-first persistence with a dedicated Supabase project
(`jjtfnduodxtulxvviasf`) for name/avatar/settings/stats, plus portable accounts keyed by a recovery code;
an event-driven presentation layer for voxel combat. Everything below about authoritative matches,
wallets, seats and ranked progression remains a target. The AI's current guarantees (filtered
observation, engine-derived candidates, bounded decisions) are the pattern any server-side AI must keep.

## Static frontend and trusted backend
Host frontend assets on GitHub Pages and the website at /Veylattice/. Use relative module/content URLs and base-aware invite links. Do not configure a CNAME for a subpath. Prefer query/hash navigation so direct routes do not need SPA rewrites. Authentication redirects must preserve deployment base and be allowlisted.
Proposed backend: Supabase Auth, Postgres, Realtime, and Edge Functions for atomic commands/AI validation; optional Vercel HTTP endpoints only if necessary. Do not design around in-process timers or an always-running WebSocket server inside a short-lived function. Realtime transports notifications/presence; durable match state, event sequence and server command validation remain authoritative.
Use persisted turn deadlines, compare-and-swap state versions and a scheduled timeout worker. Every incoming command first materializes overdue transitions. The worker advances abandoned games even without connected browsers. Backend project selection, quotas, migrations and deployment require explicit approval.

## Layers
1. Immutable versioned content definitions and schemas (`src/game/content.js` — implemented).
2. Pure shared rules reducer: state + validated command + time/RNG context => state/events. No DOM/network calls (`src/game/engine.js` — implemented).
3. AI legal-command enumeration, heuristic/search policy and reproducible seeds (`src/game/ai.js` — implemented; consumes a filtered observation, never the state).
4. Controllers/renderers: DOM views and a presentation-only model layer (`src/main.js`, `src/render/` — implemented). `src/ui/tutorial.js` is a pure state machine for the guided match.
5. Presentation is a projection: `renderBoard()` reads `ui.match` plus `humanCanAct()` and asks the engine for legality; `buildVoxelModel(model)` turns data into DOM and can neither read nor write match state.
6. Transport/auth adapters, server-side command processor and audience-specific projections (target).
7. Persistence, immutable economy ledger and content migration/version management (profile slice implemented in `src/net/` + `supabase/migrations/`).

### Voxel rendering (implemented)

`src/render/models.js` holds the roster as **data**: each Vessel is a list of boxes in voxel units with an
element palette, animation-group tags and an optional `scale`. `src/render/voxel.js` builds a DOM node per
box with three visible faces (front, right, top) inside a `preserve-3d` scene, sized by
`--u-base × --scale` so one definition serves a 40 px tile and a 130 px roster card. There is no Three.js,
no GLB pipeline and no WebGL context, so there is also no WebGL fallback to maintain. Animation attaches to
`.vox-body` (idle breathing, attack lunge, damage flinch, summon drop) and is disabled under
`prefers-reduced-motion` or the in-game toggle. Adding a Vessel means adding a definition, not editing the
renderer; an unknown id produces a labelled placeholder rather than a silent cube.

### Implemented data flow (offline match)

```
DOM click ─▶ applyCommand(state, command, {now}) ─▶ accepted? new state + events
                                                  └▶ rejected? same state object
AI turn  ─▶ buildObservation ─▶ buildCandidates(engine) ─▶ choosePlan(bounded) ─▶ applyCommand
Events   ─▶ playEvents(events, pre-command snapshot) ─▶ CSS animation (never mutates state)
Profile  ─▶ sanitize ─▶ localStorage ─▶ (best effort) Supabase RPC ─▶ sync state shown in UI
Account  ─▶ recovery code ─▶ account RPCs ─▶ account row replaces the device row while signed in
```

### Implemented client persistence boundary

The browser holds the publishable/anon key only. Both `public.veylattice_profiles` and
`public.veylattice_accounts` have RLS enabled and **no grants to `anon`/`authenticated`**; the only
callable surface is `SECURITY DEFINER` RPCs. Guest rows require a per-profile edit token whose bcrypt
hash is stored server-side. Account rows require the account id *and* the recovery code, of which only
a SHA-256 digest is stored; the code is server-minted with 100 bits of entropy and can be rotated.
Name, avatar shape/size and JSON payload sizes are database constraints, not just client validation.

Neither surface is OAuth: accounts carry no email address or personal data, and social providers are
disabled on the project. Both remain client-trusted for *identity of the device*, so any reward-bearing
feature still needs the server-authoritative backend described below.

## Proposed tables
profiles(user_id PK/display settings); wallets(user_id PK/balance); wallet_ledger(id, user_id, delta, reason, operation_id UNIQUE); collection(user_id, card_id, finish, quantity, composite PK); discovered_cards(user_id, canonical_card_id, first_obtained_at); decks/deck_cards; rooms/room_seats; matches/match_seats; match_events(match_id, seq UNIQUE within match); match_snapshots; match_results(match_id UNIQUE); seasons; season_progress(user_id, season_id composite PK); pack_definitions/content_versions; shop_rotations; pack_openings(operation_id UNIQUE); offer_redemptions.
Use foreign keys, nonnegative checks and appropriately sized integer quantities; do not impose an arbitrary inventory cap. Discoveries survive recycling to zero. Wallet/collection changes are atomic with ledger/opening records. Do not accept client-set balances, rarity, prices, rewards, deck ownership or rank.

## Security boundaries
Enable RLS on every exposed table. Users read their own inventory/decks/progression and update only allowlisted profile/deck fields through validated paths. Wallet, pack contents, outcomes, rank, room ownership and match state cannot be freely written by clients. Service-role secrets remain server-only; a public publishable/anon key is not a privilege boundary. Use authenticated private room channels and enforce seat/team membership. Room codes alone never authorize access.
Each command includes matchId, expectedVersion and unique commandId; server derives actor from JWT and stored seat. Serialize per match and reject duplicates/stale/illegal commands. Rate-limit joins, commands, purchases and pack opening. Return only each seat's hand; deck order, opponent hand, private AI state and hidden RNG must never be broadcast. Teammates see each other's hands only if the chosen mode explicitly allows it (default no).
Pack opening uses server cryptographic randomness; injectable deterministic RNG is for tests and replayable gameplay, not client-chosen pack rolls. Never expose a pack RNG seed that predicts future purchases. Reward-bearing AI executes through trusted command validation; browser-only AI results are not eligible. Idempotent match settlement prevents reconnect/retry farming.

## Lobby reference findings
Re-verified 2026-10-28 at current `main` (read-only; no execution). Meldra `src/server/index.ts` is a Node WebSocket relay: two clients per room, opaque message forwarding, optional origin allowlist, rate limiting and idle-room reaping, with host-browser authority and a versioned `act`/`snap` peer protocol. Leapbuddies `js/net.js` uses Supabase Realtime broadcast channels with presence keys, first-guest room locking and watchdog timeouts, and ships a Supabase URL plus public anon key inside the client file. Reuse UX patterns and transport concepts only — never credentials, namespaces or host-trusted reward logic, and never a hard-coded anon key. Veylattice needs four seats, authenticated membership, durable recovery, private state and trusted progression. No changes to either reference repository are part of this directive.

## Operational requirements
UTC boundaries for seasons/shops; restricted CORS origins; schema/content/rules versions pinned to matches; migrations and rollback instructions; config.example without secrets; structured errors and redacted logs. IndexedDB stores preferences and cached content, not authoritative currency. Cross-domain saves follow authenticated user identity, not localStorage origin. Offline practice remains functional when backend is unavailable; disable rewards/shop writes with clear messaging. Test both root and `/veylattice/` asset paths.

## Deployment topology (implemented)

| Piece | Detail |
|---|---|
| Hosting | GitHub Pages project site: repo `main`, path `/`, `.nojekyll` committed. Repository must be public on the free plan. |
| Custom domain | `xiondigital.net` is already the account's Pages custom domain (user site `xiondigital.github.io`), so project repos appear as subpaths. No DNS or custom-domain change was made for Veylattice. |
| Path case | Pages paths follow the repository name, so the repo was renamed to lowercase `veylattice` for `/veylattice/`. |
| Database | Separate Supabase project `jjtfnduodxtulxvviasf`, region us-east-2. Sohbet (`ezwxppiuxbyzmmheckce`) untouched. |
| Secrets | Only the publishable/anon key is in the bundle (`src/net/config.js`). `service_role` is absent from the repo and browser. |
| Offline | `CLOUD_ENABLED = false` or any network failure degrades to a clearly labelled local profile; no feature blocks on sync. |

## Public documentation basis
GitHub Pages is static hosting: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages . Supabase RLS/security guidance: https://supabase.com/docs/guides/database/postgres/row-level-security and https://supabase.com/docs/guides/database/secure-data . These links explain platform/security constraints, not implementation completion.

## 2026-10-29 additions (implemented in this change set)

- **3D battlefield (`src/render/arena3d.js`):** Three.js loaded as an ES
  module from CDN at runtime; the scene is built from the same voxel box
  data as the CSS-3D models and the card illustrations, so model identity
  cannot drift between card, roster and board. Tile meshes carry logical
  coordinates and raycast picking maps clicks back to engine cells; the
  CSS-3D board is the fallback and accessible grid. No build step is
  added; Pages serves the static bundle under `/veylattice/` as before.
- **Decks (`src/game/decks.js`) and economy (`src/game/economy.js`):**
  pure, testable modules. Decks are validated by the engine's
  `validateDeck` plus an ownership check against the local collection,
  and are stored on the local profile (`profile.economy`). Packs are
  exactly 5 Common + 1 Rare-or-better, 300 Shards, with operation ids for
  idempotent replays. Economy data is local-only for now: the existing
  profile/account RPCs carry name, avatar, settings and stats only, so
  decks, collection and Shards do not yet sync through the cloud row —
  that needs a server migration (tracked, not silently assumed).
- **Lobby (`src/game/lobby.js`, `src/net/online.js`):** pure room state
  machine plus a Supabase Realtime broadcast transport. Every remote
  command is re-validated by the receiving client's engine and rejected
  on wrong seat, stale sequence, duplicate command id or illegality.
  This is peer-validated, NOT server-authoritative: no Edge Functions
  are deployed, so online matches are practice-only with no rewards,
  rank or currency. Applying the rooms/matches migrations and deploying
  trusted command validation requires separate owner approval.
- **Soundtrack (`src/audio/soundtrack.js`):** dependency-free ES module.
  One manifest (`SOUNDTRACK`: menu/battle/preparations/shop backgrounds,
  victory/defeat stingers) and one manager instance owned by `main.js`.
  Background playback reuses a single `<audio>` element across roles with
  a short fade; stingers use a second element and play at most once per
  match key. Settings (`profile.settings.audio`: master/music/sfx/muted)
  are sanitised by `sanitizeAudioSettings` and rendered as working range
  + mute controls in the profile view; they persist through the existing
  profile save path (local + cloud settings row). Autoplay refusal is
  reported as "blocked" (never fake "playing") and retried on the next
  pointer/key gesture; tab-hide pauses, tab-show resumes only if the user
  never paused. Missing files create no element and no download.
  UPDATE (2026-10-29): the six tracks arrived via origin commit f51cec5
  and are now named in the manifest (MP3, 48 kHz stereo; stingers 12.4 s
  / 11.0 s, backgrounds 138–174 s, all decode-clean). Audible playback in
  a real browser is confirmed only by live verification, not by tests.
