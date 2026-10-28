/**
 * Local + cloud player profile for Veylattice.
 *
 * Design constraints:
 *  - The game must be fully playable with no network. The local profile is the
 *    source of truth for play; the cloud copy is a synchronised backup.
 *  - Nothing here is an authentication system. A profile is a random UUID plus
 *    a private edit token kept in this browser. The database stores only a
 *    bcrypt hash of that token, so a profile cannot be rewritten without it.
 *  - Every field restored from storage or the network is re-sanitised: storage
 *    and remote rows are untrusted input.
 */

import { CLOUD_ENABLED, PROFILE_RPC_GET, PROFILE_RPC_SAVE } from "./config.js";
import { rpc } from "./rpc.js";
import {
  clearSession,
  createAccount as createAccountRemote,
  loadAccount,
  readSession,
  saveAccount,
  writeSession,
} from "./account.js";

const STORAGE_KEY = "veylattice.profile.v2";
const TOKEN_KEY = "veylattice.profile.token.v2";

export const MAX_NAME_LENGTH = 24;
export const MAX_AVATAR_CHARS = 70000;
export const AVATAR_SIZE = 128;

export const DIFFICULTY_IDS = Object.freeze(["novice", "standard", "veteran", "master"]);
export const ARCHETYPE_IDS = Object.freeze(["vanguard", "warden", "conductor"]);

const AVATAR_PATTERN = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

/* ------------------------------------------------------------------ *
 * Pure helpers (unit-testable without a browser)
 * ------------------------------------------------------------------ */

export function defaultStats() {
  return {
    games: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastPlayedAt: null,
  };
}

export function defaultSettings() {
  return {
    difficulty: "standard",
    archetype: "vanguard",
    reducedMotion: false,
    showCoordinates: true,
  };
}

function toInt(value, min, max, fallback) {
  return Number.isInteger(value) && value >= min && value <= max ? value : fallback;
}

export function sanitizeName(value) {
  if (typeof value !== "string") return "Wanderer";
  const cleaned = value.replace(CONTROL_CHARS, "").trim().slice(0, MAX_NAME_LENGTH);
  return cleaned.length > 0 ? cleaned : "Wanderer";
}

export function sanitizeAvatar(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  if (value.length > MAX_AVATAR_CHARS) return null;
  return AVATAR_PATTERN.test(value) ? value : null;
}

export function sanitizeSettings(raw) {
  const base = defaultSettings();
  if (!raw || typeof raw !== "object") return base;
  return {
    difficulty: DIFFICULTY_IDS.includes(raw.difficulty) ? raw.difficulty : base.difficulty,
    archetype: ARCHETYPE_IDS.includes(raw.archetype) ? raw.archetype : base.archetype,
    reducedMotion: raw.reducedMotion === true,
    showCoordinates: raw.showCoordinates !== false,
  };
}

export function sanitizeStats(raw) {
  const base = defaultStats();
  if (!raw || typeof raw !== "object") return base;
  return {
    games: toInt(raw.games, 0, 1_000_000, 0),
    wins: toInt(raw.wins, 0, 1_000_000, 0),
    losses: toInt(raw.losses, 0, 1_000_000, 0),
    draws: toInt(raw.draws, 0, 1_000_000, 0),
    currentStreak: toInt(raw.currentStreak, 0, 1_000_000, 0),
    bestStreak: toInt(raw.bestStreak, 0, 1_000_000, 0),
    lastPlayedAt:
      typeof raw.lastPlayedAt === "string" && raw.lastPlayedAt.length <= 40
        ? raw.lastPlayedAt
        : null,
  };
}

/** Coerce arbitrary input into a safe profile object. */
export function sanitizeProfile(raw, fallbackId) {
  const source = raw && typeof raw === "object" ? raw : {};
  const id =
    typeof source.id === "string" && /^[0-9a-f-]{36}$/i.test(source.id)
      ? source.id
      : (fallbackId ?? newId());
  return {
    id,
    displayName: sanitizeName(source.displayName),
    avatar: sanitizeAvatar(source.avatar),
    settings: sanitizeSettings(source.settings),
    stats: sanitizeStats(source.stats),
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : null,
  };
}

/** Apply one finished match to a stats block. Pure. */
export function recordMatchResult(stats, outcome) {
  const next = { ...sanitizeStats(stats) };
  next.games += 1;
  if (outcome === "win") {
    next.wins += 1;
    next.currentStreak += 1;
    next.bestStreak = Math.max(next.bestStreak, next.currentStreak);
  } else if (outcome === "loss") {
    next.losses += 1;
    next.currentStreak = 0;
  } else {
    next.draws += 1;
    next.currentStreak = 0;
  }
  next.lastPlayedAt = new Date().toISOString();
  return next;
}

/* ------------------------------------------------------------------ *
 * Identity
 * ------------------------------------------------------------------ */

function newId() {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = Math.floor(Math.random() * 16);
    const v = ch === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function newToken() {
  const c = globalThis.crypto;
  const bytes = new Uint8Array(32);
  if (c?.getRandomValues) c.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function storage() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function createProfile() {
  const profile = sanitizeProfile({}, newId());
  const store = storage();
  if (store) {
    store.setItem(TOKEN_KEY, newToken());
    store.setItem(STORAGE_KEY, JSON.stringify({ ...profile, updatedAt: new Date().toISOString() }));
  }
  return profile;
}

let memoryToken = null;

export function readProfileToken() {
  const store = storage();
  if (!store) return memoryToken;
  const token = store.getItem(TOKEN_KEY);
  return typeof token === "string" && token.length >= 32 ? token : memoryToken;
}

export function ensureProfileToken() {
  const existing = readProfileToken();
  if (existing) {
    memoryToken = existing;
    return existing;
  }
  const token = newToken();
  memoryToken = token;
  storage()?.setItem(TOKEN_KEY, token);
  return token;
}

export function loadLocalProfile() {
  const store = storage();
  if (!store) return createProfile();
  const raw = store.getItem(STORAGE_KEY);
  if (!raw) return createProfile();
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return createProfile();
    const profile = sanitizeProfile(parsed, newId());
    ensureProfileToken();
    return profile;
  } catch {
    return createProfile();
  }
}

export function saveLocalProfile(profile) {
  const store = storage();
  if (!store) return;
  const stamped = { ...profile, updatedAt: new Date().toISOString() };
  store.setItem(STORAGE_KEY, JSON.stringify(stamped));
}

/** Forget this device's profile identity (the cloud row is left untouched). */
export function resetLocalProfile() {
  const store = storage();
  if (!store) return;
  store.removeItem(STORAGE_KEY);
  store.removeItem(TOKEN_KEY);
}

/* ------------------------------------------------------------------ *
 * Cloud transport
 * ------------------------------------------------------------------ */

export async function pullRemoteProfile(id) {
  if (!CLOUD_ENABLED) return null;
  const row = await rpc(PROFILE_RPC_GET, { p_id: id });
  if (!row || typeof row !== "object") return null;
  return {
    id,
    displayName: row.display_name,
    avatar: row.avatar,
    settings: row.settings,
    stats: row.stats,
    updatedAt: row.updated_at,
  };
}

export async function pushProfile(profile) {
  if (!CLOUD_ENABLED) throw new Error("Cloud sync is disabled.");
  const token = ensureProfileToken();
  const clean = sanitizeProfile(profile);
  return rpc(PROFILE_RPC_SAVE, {
    p_id: clean.id,
    p_token: token,
    p_display_name: clean.displayName,
    p_avatar: clean.avatar,
    p_settings: clean.settings,
    p_stats: clean.stats,
  });
}

/**
 * Reconcile this device with the cloud.
 *
 * Three cases, in order of precedence:
 *  1. Signed in: the account is the source of truth, so the same name, avatar,
 *     settings and record appear on any device that enters the recovery code.
 *  2. Guest: the device row is synced newest-wins, exactly as before.
 *  3. Offline: the local profile is used and the UI says so honestly.
 * The local profile is always written before any network call, so the game
 * never blocks on connectivity.
 */
export async function initialiseProfile() {
  const local = loadLocalProfile();
  ensureProfileToken();
  if (!CLOUD_ENABLED) return { profile: local, sync: { state: "local", message: "Local only" } };

  const session = readSession();
  if (session) {
    try {
      const remote = await loadAccount(session.code);
      if (remote) {
        const merged = sanitizeProfile({ ...local, ...remote }, local.id);
        saveLocalProfile(merged);
        return { profile: merged, sync: { state: "synced", message: "Signed in" } };
      }
      // The stored code no longer resolves (rotated elsewhere). Fall back to guest.
      clearSession();
    } catch (error) {
      return {
        profile: local,
        sync: { state: "offline", message: "Account unreachable — using this device" },
        error,
      };
    }
  }

  try {
    const remote = await pullRemoteProfile(local.id);
    if (remote && remote.updatedAt && (!local.updatedAt || remote.updatedAt > local.updatedAt)) {
      const merged = sanitizeProfile({ ...local, ...remote, id: local.id });
      saveLocalProfile(merged);
      return { profile: merged, sync: { state: "synced", message: "Restored from cloud" } };
    }
    await pushProfile(local);
    saveLocalProfile(local);
    return { profile: local, sync: { state: "synced", message: "Guest · backed up" } };
  } catch (error) {
    return {
      profile: local,
      sync: { state: "offline", message: "Offline — saved on this device only" },
      error,
    };
  }
}

/**
 * Persist changes. Local first, cloud best-effort; the returned sync state is
 * what the UI reports, and it never claims success it did not observe.
 */
export async function persistProfile(profile) {
  const clean = sanitizeProfile(profile);
  saveLocalProfile(clean);
  if (!CLOUD_ENABLED) return { profile: clean, sync: { state: "local", message: "Local only" } };

  if (readSession()) {
    try {
      await saveAccount(clean);
      const synced = { ...clean, updatedAt: new Date().toISOString() };
      saveLocalProfile(synced);
      return { profile: synced, sync: { state: "synced", message: "Saved to account" } };
    } catch (error) {
      return {
        profile: clean,
        sync: { state: "offline", message: "Account unreachable — saved on this device" },
        error,
      };
    }
  }

  try {
    await pushProfile(clean);
    const synced = { ...clean, updatedAt: new Date().toISOString() };
    saveLocalProfile(synced);
    return { profile: synced, sync: { state: "synced", message: "Saved to cloud" } };
  } catch (error) {
    return {
      profile: clean,
      sync: { state: "offline", message: "Cloud unavailable — saved on this device" },
      error,
    };
  }
}

/* ------------------------------------------------------------------ *
 * Accounts
 * ------------------------------------------------------------------ */

/** Current account link, for the settings panel. Never exposes a token. */
export function accountStatus() {
  const session = readSession();
  return session ? { signedIn: true, accountId: session.accountId } : { signedIn: false, accountId: null };
}

/**
 * Turn this device's profile into a portable account.
 * The existing name, avatar, settings and record are uploaded first, so
 * progress earned before signing up is preserved.
 */
export async function createAccountForProfile(profile) {
  if (!CLOUD_ENABLED) throw new Error("Cloud sync is disabled in this build.");
  const clean = sanitizeProfile(profile);
  const { code } = await createAccountRemote(clean);
  const stamped = { ...clean, updatedAt: new Date().toISOString() };
  saveLocalProfile(stamped);
  return { profile: stamped, code };
}

/**
 * Sign in on this device with a recovery code.
 * The account replaces this device's profile: it carries the record that was
 * earned wherever the account was last used.
 */
export async function signInToAccount(rawCode) {
  if (!CLOUD_ENABLED) throw new Error("Cloud sync is disabled in this build.");
  const remote = await loadAccount(rawCode);
  if (!remote) throw new Error("No account matches that recovery code.");
  writeSession({ accountId: remote.accountId, code: rawCode });
  const merged = sanitizeProfile(remote);
  saveLocalProfile(merged);
  return merged;
}

/** Leave the account on this device; the account itself is untouched. */
export function signOutOfAccount() {
  clearSession();
}

/* ------------------------------------------------------------------ *
 * Avatar processing (browser only)
 * ------------------------------------------------------------------ */

async function loadBitmap(file) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fall through to <img> */
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That image could not be read."));
    };
    image.src = url;
  });
}

/**
 * Centre-crop an uploaded image to a square avatar and encode it small enough
 * for the database's size constraint. SVG is rejected outright: it is not a
 * raster format and can carry active content.
 */
export async function fileToAvatar(file) {
  if (!file) throw new Error("Choose an image file.");
  const type = String(file.type || "");
  if (!["image/png", "image/jpeg", "image/webp"].includes(type)) {
    throw new Error("Use a PNG, JPEG or WebP image.");
  }
  if (file.size > 8 * 1024 * 1024) throw new Error("Image must be smaller than 8 MB.");

  const source = await loadBitmap(file);
  const width = source.width ?? source.naturalWidth;
  const height = source.height ?? source.naturalHeight;
  if (!width || !height) throw new Error("That image has no readable dimensions.");

  const side = Math.min(width, height);
  const sx = (width - side) / 2;
  const sy = (height - side) / 2;

  for (const [size, quality] of [
    [AVATAR_SIZE, 0.82],
    [112, 0.75],
    [96, 0.68],
  ]) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable in this browser.");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, sx, sy, side, side, 0, 0, size, size);
    for (const mime of ["image/webp", "image/jpeg"]) {
      const dataUrl = canvas.toDataURL(mime, quality);
      if (!dataUrl.startsWith(`data:${mime}`)) continue;
      if (dataUrl.length <= MAX_AVATAR_CHARS && sanitizeAvatar(dataUrl)) return dataUrl;
    }
  }
  throw new Error("That image could not be compressed small enough.");
}
