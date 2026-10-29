/**
 * Deck management: pure, testable, no DOM, no network.
 *
 * A deck is a list of canonical card ids. Legality is decided by the
 * engine's `validateDeck` (size, type minima, copy limit) plus an
 * ownership check against the player's collection. Decks reference
 * collection quantities; they never consume inventory, so the same card
 * may appear in several saved decks.
 *
 * Collection shape: `{ [cardId]: { qty, boundQty } }` where `boundQty`
 * counts starter copies that may not be dissolved (see economy.js).
 * A deck is selectable only when it is legal AND every copy it needs is
 * owned (owned qty >= copies required by that one deck).
 */

import { validateDeck } from "./content.js";

export const MAX_DECKS_PER_PROFILE = 20;
const NAME_MAX = 40;

function cleanName(value, fallback) {
  const name = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, NAME_MAX);
  return name.length > 0 ? name : fallback;
}

function cleanIdList(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((id) => typeof id === "string" && /^[a-z0-9_]{3,64}$/.test(id)).slice(0, 40);
}

/** Sanitise one stored deck; invalid fields fall back, ids are kept only if well-formed. */
export function sanitizeDeck(raw, fallbackName = "Untitled deck") {
  if (!raw || typeof raw !== "object") return null;
  const id = typeof raw.id === "string" && raw.id.length > 0 && raw.id.length <= 80 ? raw.id : null;
  if (!id) return null;
  return {
    id,
    name: cleanName(raw.name, fallbackName),
    cardIds: cleanIdList(raw.cardIds),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : null,
  };
}

/** Sanitise a stored deck list, dropping malformed entries. */
export function sanitizeDecks(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((deck) => sanitizeDeck(deck)).filter(Boolean).slice(0, MAX_DECKS_PER_PROFILE);
}

/** Counts of each id in a deck. */
export function deckCopyCounts(cardIds) {
  const counts = {};
  for (const id of cardIds) counts[id] = (counts[id] ?? 0) + 1;
  return counts;
}

/**
 * Full selectability check: engine legality + ownership.
 * @returns {{ok: boolean, errors: string[], counts: object}}
 */
export function validateDeckWithOwnership(cardIds, catalog, collection) {
  const checked = validateDeck(cardIds, catalog);
  const errors = [...checked.errors];
  const owned = collection ?? {};
  for (const [id, needed] of Object.entries(deckCopyCounts(cardIds))) {
    const have = Number(owned[id]?.qty ?? 0);
    if (have < needed) {
      errors.push(`Not owned: "${id}" needs ${needed} cop${needed === 1 ? "y" : "ies"} (owned ${have}).`);
    }
  }
  return { ok: errors.length === 0, errors, counts: checked.counts };
}

/** Summary counts for display: total, vessels, actions, relics. */
export function deckSummary(cardIds, catalog) {
  const checked = validateDeck(cardIds, catalog);
  return { ...checked.counts, ok: checked.ok, errors: checked.errors };
}

export function newDeckId() {
  const c = globalThis.crypto;
  if (c?.randomUUID) return `deck-${c.randomUUID()}`;
  return `deck-${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffffffff).toString(36)}`;
}

export function createDeck(name, cardIds = []) {
  return { id: newDeckId(), name: cleanName(name, "Untitled deck"), cardIds: cleanIdList(cardIds), updatedAt: new Date().toISOString() };
}

/** Pure list operations; each returns a new array (never mutates the input). */
export function upsertDeck(decks, deck) {
  const clean = sanitizeDeck(deck);
  if (!clean) return { decks: sanitizeDecks(decks), error: "That deck is invalid and was not saved." };
  const list = sanitizeDecks(decks).filter((d) => d.id !== clean.id);
  if (list.length >= MAX_DECKS_PER_PROFILE && !sanitizeDecks(decks).some((d) => d.id === clean.id)) {
    return { decks: sanitizeDecks(decks), error: `At most ${MAX_DECKS_PER_PROFILE} decks per profile.` };
  }
  list.unshift({ ...clean, updatedAt: new Date().toISOString() });
  return { decks: list, error: null };
}

export function deleteDeck(decks, deckId) {
  return sanitizeDecks(decks).filter((d) => d.id !== deckId);
}

export function duplicateDeck(decks, deckId) {
  const source = sanitizeDecks(decks).find((d) => d.id === deckId);
  if (!source) return { decks: sanitizeDecks(decks), error: "Deck not found." };
  const copy = { ...source, id: newDeckId(), name: cleanName(`${source.name} copy`, "Untitled deck"), updatedAt: new Date().toISOString() };
  return upsertDeck(decks, copy);
}

/**
 * Largest copy count any single saved deck requires for a card. Dissolution
 * must not drop ownership below this, or that deck would stop being
 * selectable (see economy.js).
 */
export function maxDeckRequirement(decks, cardId) {
  let max = 0;
  for (const deck of sanitizeDecks(decks)) {
    max = Math.max(max, deckCopyCounts(deck.cardIds)[cardId] ?? 0);
  }
  return max;
}
