/**
 * Portable Veylattice accounts.
 *
 * A guest profile is bound to one browser: its identity is a UUID plus a local
 * edit token, so clearing site data loses the link to the cloud row. An account
 * fixes exactly that and nothing else.
 *
 * Model
 * -----
 *  - The server mints a 100-bit recovery code from an unambiguous alphabet and
 *    returns it once, formatted as five groups of four characters.
 *  - Only a SHA-256 digest of the normalised code is stored, so a database leak
 *    does not hand out accounts. The code space is far too large to brute force
 *    and the digest is not reversible, so no password hashing is needed for it.
 *  - Load and save both require the account id *and* the code; the code is the
 *    credential, the id is only a lookup key.
 *  - This is not OAuth and carries no email address or personal data.
 *
 * The recovery code lives in this browser's storage once signed in. That is the
 * same trust model as the guest token: the device is trusted, the network is
 * not. Writing the code down is what makes progress portable.
 */

import { rpc } from "./rpc.js";

const SESSION_KEY = "veylattice.account.v1";

/** Crockford-style alphabet used by the server; kept here only for display. */
const CODE_LENGTH = 20;

function storage() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/** Uppercase and strip separators. Mirrors the server's normalisation. */
export function normaliseCode(raw) {
  return String(raw ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/** Group a normalised code for display: ABCD-EFGH-... */
export function formatCode(raw) {
  const code = normaliseCode(raw);
  return code.match(/.{1,4}/g)?.join("-") ?? code;
}

export function isWellFormedCode(raw) {
  const code = normaliseCode(raw);
  return code.length === CODE_LENGTH && /^[0-9A-Z]+$/.test(code);
}

export function readSession() {
  const raw = storage()?.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.accountId !== "string" || !/^[0-9a-f-]{36}$/i.test(parsed.accountId)) return null;
    if (!isWellFormedCode(parsed.code)) return null;
    return { accountId: parsed.accountId, code: normaliseCode(parsed.code) };
  } catch {
    return null;
  }
}

export function writeSession(session) {
  storage()?.setItem(
    SESSION_KEY,
    JSON.stringify({ accountId: session.accountId, code: normaliseCode(session.code) }),
  );
}

export function clearSession() {
  storage()?.removeItem(SESSION_KEY);
}

export function isSignedIn() {
  return readSession() !== null;
}

/**
 * Create an account from the current profile and return the recovery code.
 * The caller must show that code prominently: it is the only way back in.
 */
export async function createAccount(profile) {
  const result = await rpc("veylattice_account_create", {
    p_display_name: profile.displayName,
    p_avatar: profile.avatar,
    p_settings: profile.settings,
    p_stats: profile.stats,
  });
  if (!result || typeof result !== "object" || !result.account_id || !result.recovery_code) {
    throw new Error("The account service returned an unexpected response.");
  }
  writeSession({ accountId: result.account_id, code: result.recovery_code });
  return { accountId: result.account_id, code: result.recovery_code };
}

/** Fetch an existing account by recovery code. Returns null for an unknown code. */
export async function loadAccount(code) {
  const normalised = normaliseCode(code);
  if (!isWellFormedCode(normalised)) return null;
  const row = await rpc("veylattice_account_load", { p_code: normalised });
  if (!row || typeof row !== "object" || !row.account_id) return null;
  return {
    accountId: row.account_id,
    displayName: row.display_name,
    avatar: row.avatar,
    settings: row.settings,
    stats: row.stats,
    updatedAt: row.updated_at,
  };
}

/** Push the current profile to the signed-in account. */
export async function saveAccount(profile) {
  const session = readSession();
  if (!session) throw new Error("Not signed in.");
  return rpc("veylattice_account_save", {
    p_account_id: session.accountId,
    p_code: session.code,
    p_display_name: profile.displayName,
    p_avatar: profile.avatar,
    p_settings: profile.settings,
    p_stats: profile.stats,
  });
}

/** Issue a fresh recovery code, invalidating the old one. */
export async function rotateRecoveryCode() {
  const session = readSession();
  if (!session) throw new Error("Not signed in.");
  const result = await rpc("veylattice_account_rotate", {
    p_account_id: session.accountId,
    p_code: session.code,
  });
  if (!result?.recovery_code) throw new Error("Could not issue a new recovery code.");
  writeSession({ accountId: session.accountId, code: result.recovery_code });
  return result.recovery_code;
}
