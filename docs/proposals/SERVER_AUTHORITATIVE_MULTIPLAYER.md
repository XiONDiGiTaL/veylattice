# Proposal — Server-authoritative online matches

**Status: PROPOSAL ONLY. Nothing here is implemented, deployed, or applied.**
Nothing here gets built until the owner explicitly approves it. The draft SQL lives in
`supabase/drafts/0003_matches.DRAFT.sql`, outside `supabase/migrations/`, so no tooling picks it up
by accident. Written 2026-10-29.

## 1. Why the current lobby can't be trusted

The Online Lobby (`src/game/lobby.js`, `src/net/online.js`) is a **peer-validated preview**. Each
client runs the full engine and re-checks every remote command: seat, sequence number, command id
and engine legality. The 2026-10-29 two-browser run (see `docs/IMPLEMENTATION_LOG.md`) confirmed
that this works as designed. It still has hard limits that peer validation can't remove:

| Limit | Consequence |
| --- | --- |
| Both clients shuffle from a **shared seed** and both receive both deck lists | A modified client can rebuild the opponent's whole draw order, and so its hand. Hands are never *broadcast*, but they aren't *secret* either. |
| No referee | If two clients disagree, the match is void. Neither side can prove what happened. |
| Each client owns its own clock | Turn deadlines rely on the active client to time itself out. A stalled or malicious client can hold a turn until the opponent leaves. |
| No server record | No rewards, rank or stats can ever be attached safely. |

## 2. Design summary

One Supabase project: the existing `veylattice` project. It uses the existing free-tier features
only (Postgres, Edge Functions, Realtime, Auth anonymous sign-ins). The **same engine module**
(`src/game/engine.js` plus `content.js`, `elemental-rules.js`, `constants.js` and the card JSON)
runs in a Deno Edge Function. The server and client rules can't drift apart, because they are the
same code.

```
browser ──(JWT)──► Edge Function `match`  ──► Postgres (matches, match_commands)   [service role]
   ▲                       │
   └── Realtime private channel `match:<id>` ◄── "version N" ping (no hidden data)
browser ──(JWT)──► RPC veylattice_match_view(id) → caller's redacted view
```

### 2.1 Identity

Seat ownership needs an identity the server can verify on every call. The current profile and
recovery-code accounts are bearer secrets sent only to save/load RPCs. Sending a recovery code on
every game command would be a poor design.

- **Proposed:** enable Supabase Auth **anonymous sign-ins** (dashboard toggle). Each browser calls
  `signInAnonymously()` and gets a JWT. `auth.uid()` then identifies the seat in Edge Functions
  and RLS. The JWT carries `is_anonymous`; RLS policies check it where needed.
- Link the JWT user to the existing account with a one-time
  `veylattice_account_link(p_account_id, p_code)` RPC. It proves code ownership once and stores
  `auth_user_id` on the account row.
- Abuse controls (Supabase's own recommendations for anonymous sign-ins): keep the default
  IP rate limit (30 sign-ins/hour), add Cloudflare Turnstile on sign-in, and run a periodic
  cleanup of stale anonymous users. Turnstile is free; it is listed as an option, not a
  requirement.

### 2.2 Tables (see draft SQL)

- `veylattice_matches`: one row per match. It holds both seats' `auth.uid()`, deck lists
  (validated server-side at creation), the **full engine state** (`state jsonb`, including both
  hands and deck orders), `version`, `deadline_at`, `status`, `result`, and timestamps.
  **RLS gives no client any direct access to this table.** The service role (Edge Function) is
  the only reader and writer.
- `veylattice_match_commands`: an append-only log. Columns: `(match_id, seq, seat, command_id,
  command, accepted, error_code, created_at)`, with `unique(match_id, command_id)` for
  idempotency and `unique(match_id, seq)` for ordering. It supports replay, audits and dispute
  review.
- `veylattice_rooms`: replaces broadcast-only rooms. Columns: code, host/guest uid, each
  player's chosen deck id and list, ready flags, status and expiry. Players read their own rooms
  through RLS. All writes go through RPCs.

### 2.3 Command validation (Edge Function `match`)

`POST /match/command { matchId, commandId, expectedVersion, command }`

1. Verify the JWT and resolve `uid`.
2. Within one transaction, `select … for update` the match row.
3. Reject when: `uid` isn't seated; the command is a duplicate `command_id` (return the stored
   result, which makes the call idempotent); `expectedVersion ≠ version` (409, client re-fetches
   its view); or the status isn't `in_match`.
4. Apply `applyCommand(state, command, { now: serverNow })`. The engine already does a lot here:
   it rejects a wrong-seat actor ("not your turn"), materialises a passed deadline before
   rejecting a late command, and checks legality. The **server clock is the only clock.**
5. Persist the new `state`, `version + 1`, `deadline_at`, and the command log row in the same
   transaction, then commit.
6. Send `{ version }` on the private Realtime channel `match:<id>`. Only seated uids may join
   (Realtime Authorization RLS on `realtime.messages`). The ping holds no hidden information.
7. Return the caller's redacted view (§2.4).

The client stops applying commands locally as truth. It keeps the local engine only for previews:
legal-move highlights and damage previews against its last redacted view.

### 2.4 Private hands

`veylattice_match_view(p_match_id)` is a SECURITY DEFINER RPC. It returns the state with the
opponent's `hand` replaced by a count, both `deck` arrays replaced by counts, and nothing seeded.
Deck order is shuffled server-side with `crypto.getRandomValues` at match creation and never
leaves the server. This closes the shared-seed hand leak in §1.

### 2.5 Turns and deadlines

- `deadline_at` is stored on the row and comes from the server's `now()`.
- Nobody has to be online for a timeout. **Any** call to the function (a command, a view fetch,
  or `POST /match/tick` sent by the waiting client when its timer shows 0) runs
  `applyCommand(state, {type:"timeout"}, {now})` when the deadline has passed. This uses the
  engine's existing tick path.
- Abandonment: a pg_cron job, or an opportunistic sweep inside the function, marks `in_match`
  rows `abandoned` after N missed deadlines. pg_cron is optional; the opportunistic sweep needs
  no extra service.

### 2.6 Reconnection

The state lives on the server. A reloaded or crashed client signs in again (the same anonymous
session persists in localStorage), lists its active matches with
`veylattice_my_active_matches()`, fetches its view and rejoins `match:<id>`. Nothing is lost.
Replacing the preview's "reconnection is not supported" is a direct benefit of this design.

### 2.7 Rewards and the local economy

Online matches stay **reward-free** even after this ships. Rewards also need the server-side
economy in `docs/proposals/CLOUD_ECONOMY_SYNC.md` (ledger and idempotent grants). Once both
exist, a match result can grant through `veylattice_economy_grant(uid, 'match_win', match_id)`,
keyed uniquely on `match_id`, so it can never double-grant. Until then `result` is recorded for
stats only.

## 3. Costs

There are no new paid services. The free-plan quotas below were checked on 2026-10-29 against
Supabase's pricing pages:

| Resource | Free quota | Expected use |
| --- | --- | --- |
| Edge Function invocations | 500,000 / month | About 60 commands + 10 view fetches per match ⇒ roughly 7,000 matches/month |
| Realtime messages | 2 million / month | One ping per command, fanned out to 2 clients ⇒ about 120 per match |
| Realtime peak connections | 200 | 2 per live match ⇒ about 100 concurrent matches |
| Database | existing project | State jsonb is about 30–60 KB per live match; command logs are small |

The free plan shows no overage line for Edge Functions. Before relying on this, confirm whether
the project hits a hard stop or gets paused at quota. **Not verified:** whether REST/DB-originated
broadcasts count as Realtime messages (the pricing page doesn't say).

## 4. Rollout (each step needs the owner's go-ahead)

1. Approve this document and the draft SQL (it can still change).
2. Enable anonymous sign-ins (dashboard). Apply `0003` as a real migration.
3. Deploy the `match` function. Run it behind a feature flag next to the preview lobby.
4. Run a two-browser test with two separately signed-in anonymous users: hand privacy (inspect
   network payloads), forged commands, the deadline with the active client closed, and a
   reconnect after a reload.
5. Only after that, retire the peer preview and update the lobby disclaimer.

## 5. Open questions for the owner

- Anonymous Auth vs. a custom session table keyed on the recovery code. Anonymous Auth is
  recommended: less code, and it fits RLS and Realtime Authorization directly.
- Turnstile on sign-in: yes or no.
- Abandonment threshold. Suggested: 3 consecutive missed deadlines.

Sources: [Supabase Edge Functions pricing](https://supabase.com/docs/guides/functions/pricing),
[Realtime pricing](https://supabase.com/docs/guides/realtime/pricing),
[Anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous),
[Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization).
