# Proposal — Cloud economy (decks, collection, Lattice Shards)

**Status: DESIGN ONLY. Not implemented, not applied.** This follows the same approval rule as
`SERVER_AUTHORITATIVE_MULTIPLAYER.md`. The draft SQL is `supabase/drafts/0004_economy.DRAFT.sql`
and has not been run. Written 2026-10-29.

## 1. Where things stand (verified in code)

- `profile.economy = { shards, collection, openings, decks, activeDeckId }` lives only in
  localStorage (`src/net/profile.js` marks it local-only). The cloud RPCs (`veylattice_profile_*`,
  `veylattice_account_*`) carry name, avatar, settings and stats, and nothing else.
- Shard income today: 300 Lattice Shards at profile creation, plus dissolution payouts. **No
  match grants Shards.** Pack rolls use `Math.random` in the browser.
- Anything in localStorage can be edited by the user. A local balance or collection is an
  unverified claim.

## 2. The core rule: never sync a client balance upward

"Uploading the local economy" would accept a fabricated balance once and then make it
permanent. The cloud economy is therefore a **server ledger**, and every mutation goes through
a server function:

- `veylattice_economy_state(account)`: balance, collection and decks for the caller.
- `veylattice_economy_buy_pack(op_id)`: the roll runs on the server
  (`gen_random_bytes`-driven, same rates as `economy.js`: 5 Common + 1 Rare-or-better at
  90/9/1). Idempotent on `op_id`.
- `veylattice_economy_buy_single(op_id, card_id)`, `…_dissolve(op_id, card_id, qty)`: same
  prices and payouts, the same bound-copy rule, and the same "would break a saved deck" check.
- `veylattice_economy_save_decks(decks)`: deck lists are validated against server-held
  ownership; the 20–40 cards / ≥10 Vessels / ≥5 Actions / ≤3 copies rules are re-checked in SQL.

The balance is `sum(delta)` over `veylattice_economy_ledger`, cached on the account row with a
`check (shards >= 0)` constraint. Every ledger row has a `unique (account_id, op_id)`, so a
retried request can never charge or grant twice.

## 3. Migrating existing local profiles without double-granting

| Item | Treatment on first cloud sign-in |
| --- | --- |
| Starter grant (300 Shards + bound starter collection + Starter Lattice deck) | Granted **by the server** once per account: a ledger row with `op_id = 'starter'`, made unique by the constraint. The local starter is never uploaded. |
| Local Shards above 300 | **Not imported as currency.** There is no legitimate way to earn more than 300 plus dissolution payouts, and both are reproducible server-side. |
| Local collection (non-starter copies) | Imported **once** as `unverified_legacy` items, capped at what 300 Shards could buy (one pack or the equivalent Singles). The cap is computed server-side from the claimed rarities. Copies are flagged `legacy = true` and **cannot be dissolved** (no laundering into Shards). |
| Saved decks | Imported once and re-validated against the server collection. Illegal decks are imported as drafts and flagged in the Deck Builder. |
| Import marker | `veylattice_economy_imports (account_id, local_profile_id)` is unique on both columns. A second browser, or a replayed import, is a no-op that returns the first result. |

After a successful import the client keeps its local economy only as a read-only cache of the
server state. Guest profiles that never sign in keep working fully local, exactly as today.

## 4. Client changes (for later, after approval)

- `economy.js` stays the pure validator and preview layer. For signed-in accounts the Shop and
  Deck Builder call the RPCs, render the server's reply, and stop mutating the local balance
  directly.
- The UI labels which mode is active: "Local profile — not synced" vs. "Account — server
  balance".
- Offline: a signed-in account shows its last server snapshot and disables purchases. There is
  no optimistic local spending.

## 5. Costs

There are no new services: plain Postgres functions in the existing project. No Edge Function is
needed for the economy alone.

## 6. Owner decisions needed

1. Approve the import cap (proposed: one pack's worth of unverified legacy cards, never Shards).
2. Approve that legacy copies are non-dissolvable.
3. Decide whether economy sync waits for the anonymous-Auth identity in the multiplayer proposal
   (recommended, since one identity serves both) or reuses recovery-code auth per call.
