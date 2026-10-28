# Accounts and cross-device progress

Status: **implemented and verified** for recovery-code accounts (M2-004). Google/Discord sign-in is
**blocked on credentials** that this project cannot create. This file records what exists, what was
verified, and the exact steps to switch the social providers on later.

## Why accounts exist

A guest profile is an identity bound to one browser:

- `localStorage` holds a profile UUID and a 64-hex edit token.
- The database stores a bcrypt hash of that token, so only that browser can rewrite the row.
- Clearing site data, or opening the game on another device, breaks the link. The row still exists but
  nothing can prove ownership of it.

That is a **device identity**, not an account. An account adds a credential the user can carry.

## How recovery-code accounts work

1. **Create account** (`veylattice_account_create`) uploads the current name, avatar, settings and
   record. The server mints a code and returns it **once**.
2. The code is 20 symbols from the 32-character alphabet `0-9 A-Z` minus `I L O U`, displayed as five
   groups of four: `XXXX-XXXX-XXXX-XXXX-XXXX`. That is 100 bits of CSPRNG entropy.
3. Only `sha256(normalised code)` is stored. The code itself is never persisted server-side.
4. **Sign in** (`veylattice_account_load`) requires the code; the account id alone is not a credential.
5. **Save** (`veylattice_account_save`) requires the account id *and* the code.
6. **Rotate** (`veylattice_account_rotate`) issues a new code and invalidates the old one in the same
   statement.
7. On the client, the signed-in link is stored in `localStorage` (`veylattice.account.v1`) so the game
   does not ask every load. Signing out removes it and leaves the account untouched.

Why a digest instead of bcrypt: the code is random with 100 bits of entropy, so there is no dictionary
to attack and no reason to make each lookup expensive. Equality on an indexed digest keeps sign-in to
one round trip. Directory passwords are a different problem; this is closer to an API token.

### Progress preservation, stated precisely

| Action | Effect on data |
|---|---|
| Create account while playing as a guest | The guest record is uploaded as the account's starting point, so nothing earned before signing up is lost |
| Sign in on another device | The **account's** record replaces that device's guest record (the account is the source of truth) |
| Change name or avatar while signed in | Written to the account row; visible on the next sign-in anywhere |
| Sign out | This browser continues as a guest with the same local data; the account is untouched |
| Forget this device's profile | A brand-new guest identity is created; the account is untouched |

## Threat model and limits

| Risk | Mitigation | Verified |
|---|---|---|
| Reading accounts from the browser | RLS on, no `anon`/`authenticated` grants | direct `GET /rest/v1/veylattice_accounts` → **401** |
| Writing without the code | Every write requires id + code | wrong code → **401 `not authorized`** |
| Guessing a code | 100-bit CSPRNG space | wrong code → `null` |
| Reusing a rotated code | Rotate overwrites the digest | old code → `null` immediately |
| Oversized or hostile avatars | Database `CHECK` allows only base64 PNG/JPEG/WebP ≤ 70 000 chars | schema constraints |
| Losing the code | Nothing recovers it; the user is told to write it down | — |

**Known limitation:** nothing throttles repeated `veylattice_account_load` calls. The code space makes
online guessing infeasible, but a production deployment should also rate-limit at the edge. This is
tracked as M4 work alongside the trusted backend.

## Verification performed

Against the live project (`jjtfnduodxtulxvviasf`, separate from Sohbet):

```
direct table read            -> 401
create                       -> { account_id, recovery_code }
load with the correct code   -> the record
load with a wrong code       -> null
save with a wrong code       -> 401
save with the correct code   -> { ok: true }
rotate                       -> new code
load with the old code       -> null
load with the new code       -> updated record
```

In the browser, on the real UI:

```
create account                -> "Signed in", code shown and stored
rename to "Lattice Adept"     -> sync reads "Saved to account"
sign out                      -> guest profile, name still local
rename guest to "Guest Only"  -> guest row updated
sign in with the code         -> "Lattice Adept" restored from the database
```

Test rows were deleted afterwards; `select count(*) from veylattice_accounts` is back to 0.

## Google and Discord sign-in

The Supabase project reports:

```json
{ "external": { "google": false, "discord": false }, "email": true }
```

So neither provider is enabled, and enabling one requires OAuth client credentials that must be created
in Google Cloud Console / the Discord Developer Portal. Those are account-level secrets belonging to the
user, not something this repository can generate.

To switch them on later:

1. **Google** — create an OAuth 2.0 Client ID (Web application) in Google Cloud Console. Add
   `https://jjtfnduodxtulxvviasf.supabase.co/auth/v1/callback` as an authorised redirect URI.
2. **Discord** — create an application at the Discord Developer Portal and add the same callback URL.
3. In the Supabase dashboard: **Authentication → Providers**, enable Google/Discord and paste each
   client id and secret.
4. Add the site and loopback URLs to **Authentication → URL Configuration**:
   `https://xiondigital.net/veylattice/` and `http://localhost:8000/`.
5. Then extend `src/net/account.js`: after a successful provider sign-in, read the Supabase session's
   `user.id` and store the profile against it. The cleanest mapping is an `auth_user_id uuid unique`
   column on `veylattice_accounts` with a policy `auth.uid() = auth_user_id`, keeping the recovery-code
   path as a fallback for anyone who prefers not to use a provider.

Until step 5 exists, the UI states the limitation plainly instead of rendering dead buttons.
