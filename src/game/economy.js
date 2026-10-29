/**
 * Local shop economy: pure, testable, no DOM, no network.
 *
 * Canonical basis: docs/PROGRESSION_AND_CONTENT.md (proposed prices and
 * rates, adopted here as the shipped local defaults and labelled as such
 * in the UI — they are not owner-approved final balance).
 *
 * - Currency: Lattice Shards. New profiles start with STARTING_SHARDS.
 * - Pack: PACK_PRICE Shards, exactly PACK_SIZE cards: 5 Common + 1
 *   Rare-or-better. Rare+ tier rates are the Unranked profile
 *   (rare 90%, epic 9%, mythic 1%); rank-modified rates are a server
 *   feature and are NOT applied locally, because the browser's claimed
 *   rank must never set pack odds.
 * - Singles: buy a discovered card at its rarity price.
 * - Dissolution: recycle an owned, unbound copy for its rarity payout.
 *   Bound starter copies can never be dissolved, and dissolution that
 *   would make any saved deck unselectable is blocked.
 * - Idempotency: every purchase carries an operation id. Replaying the
 *   same operation id returns the original opening instead of charging
 *   again or rolling new cards. The UI generates one id per click and
 *   disables the button while the purchase resolves.
 *
 * This module never trusts a caller-supplied balance: callers pass the
 * current economy state and receive a new state (or an error with the
 * state unchanged). Balances can never go negative through these
 * functions. Server-authoritative accounting is still required before
 * any reward-bearing use; see docs/PROGRESSION_AND_CONTENT.md.
 */

import { sanitizeDecks } from "./decks.js";

export const STARTING_SHARDS = 300;
export const PACK_PRICE = 300;
export const PACK_SIZE = 6;
export const PACK_COMMON_SLOTS = 5;
export const RARE_PLUS_RATES = Object.freeze([
  ["rare", 0.9],
  ["epic", 0.09],
  ["mythic", 0.01],
]);

/** Buy price / dissolve payout per rarity, from PROGRESSION_AND_CONTENT.md. */
export const RARITY_PRICES = Object.freeze({
  common: { buy: 60, dissolve: 10 },
  uncommon: { buy: 100, dissolve: 15 },
  rare: { buy: 240, dissolve: 40 },
  epic: { buy: 600, dissolve: 100 },
  mythic: { buy: 1200, dissolve: 200 },
});

function cleanCollection(raw) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [id, entry] of Object.entries(raw)) {
    if (typeof id !== "string" || !/^[a-z0-9_]{3,64}$/.test(id)) continue;
    if (!entry || typeof entry !== "object") continue;
    const qty = Number.isInteger(entry.qty) && entry.qty > 0 ? Math.min(entry.qty, 100000) : 0;
    const boundQty = Number.isInteger(entry.boundQty) && entry.boundQty >= 0 ? Math.min(entry.boundQty, qty) : 0;
    if (qty > 0) out[id] = { qty, boundQty, discovered: true };
    else if (entry.discovered === true) out[id] = { qty: 0, boundQty: 0, discovered: true };
  }
  return out;
}

/** Starter collection: one bound copy of every card in the given deck ids. */
export function starterCollection(deckIds) {
  const out = {};
  for (const id of deckIds) {
    if (typeof id !== "string") continue;
    out[id] = out[id] ?? { qty: 0, boundQty: 0, discovered: true };
    out[id].qty += 1;
    out[id].boundQty += 1;
  }
  return out;
}

export function sanitizeEconomy(raw) {
  if (!raw || typeof raw !== "object") return { shards: STARTING_SHARDS, collection: {}, openings: [], decks: [], activeDeckId: null };
  const shards = Number.isInteger(raw.shards) && raw.shards >= 0 ? Math.min(raw.shards, 100000000) : STARTING_SHARDS;
  const openings = Array.isArray(raw.openings)
    ? raw.openings.filter((o) => o && typeof o.operationId === "string" && Array.isArray(o.cards)).slice(0, 200)
    : [];
  const decks = sanitizeDecks(raw.decks);
  const activeDeckId = typeof raw.activeDeckId === "string" && decks.some((d) => d.id === raw.activeDeckId) ? raw.activeDeckId : (decks[0]?.id ?? null);
  return { shards, collection: cleanCollection(raw.collection), openings, decks, activeDeckId };
}

function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

function rollRarePlusTier(rng) {
  let roll = rng();
  for (const [tier, rate] of RARE_PLUS_RATES) {
    if (roll < rate) return tier;
    roll -= rate;
  }
  return "rare";
}

/**
 * Deterministic pack roll: 5 Commons, then 1 Rare+. Throws when a pool is
 * empty instead of inventing a card. `rng` is injectable for tests.
 */
export function rollPack(catalog, rng = Math.random) {
  const commons = catalog.cards.filter((c) => c.rarity === "common");
  if (commons.length === 0) throw new Error("Pack roll failed: the Common pool is empty.");
  const cards = [];
  for (let i = 0; i < PACK_COMMON_SLOTS; i += 1) cards.push(pick(rng, commons).id);
  const tier = rollRarePlusTier(rng);
  const pool = catalog.cards.filter((c) => c.rarity === tier);
  if (pool.length === 0) throw new Error(`Pack roll failed: the ${tier} pool is empty.`);
  cards.push(pick(rng, pool).id);
  return { cards, rarePlusTier: tier };
}

function addCards(collection, cardIds) {
  const next = {};
  for (const [id, entry] of Object.entries(collection)) next[id] = { ...entry };
  for (const id of cardIds) {
    next[id] = next[id] ?? { qty: 0, boundQty: 0, discovered: true };
    next[id] = { ...next[id], qty: next[id].qty + 1, discovered: true };
  }
  return next;
}

/**
 * Buy one pack. Returns `{ economy, opening }` or `{ error, economy }`
 * with the economy unchanged. Replaying an operation id returns the
 * stored opening without charging again.
 */
export function purchasePack(economy, catalog, operationId, rng = Math.random) {
  const current = sanitizeEconomy(economy);
  if (typeof operationId !== "string" || operationId.length === 0) {
    return { economy: current, error: "A purchase needs an operation id." };
  }
  const replay = current.openings.find((o) => o.operationId === operationId);
  if (replay) return { economy: current, opening: replay, replayed: true };
  if (current.shards < PACK_PRICE) {
    return { economy: current, error: `Not enough Lattice Shards: a pack costs ${PACK_PRICE} (balance ${current.shards}).` };
  }
  let roll;
  try {
    roll = rollPack(catalog, rng);
  } catch (error) {
    return { economy: current, error: error.message };
  }
  const opening = { operationId, cards: roll.cards, rarePlusTier: roll.rarePlusTier, price: PACK_PRICE, at: new Date().toISOString() };
  return {
    economy: { shards: current.shards - PACK_PRICE, collection: addCards(current.collection, roll.cards), openings: [opening, ...current.openings].slice(0, 200) },
    opening,
  };
}

/** Buy one discovered single. Undiscovered cards cannot be bought as Singles. */
export function purchaseSingle(economy, catalog, cardId) {
  const current = sanitizeEconomy(economy);
  const def = catalog.byId?.get(cardId);
  if (!def) return { economy: current, error: `Unknown card "${cardId}".` };
  const price = RARITY_PRICES[def.rarity]?.buy;
  if (price === undefined) return { economy: current, error: `No Singles price for rarity "${def.rarity}".` };
  if (current.collection[cardId]?.discovered !== true) {
    return { economy: current, error: `${def.name} has not been discovered yet, so it cannot be bought as a Single.` };
  }
  if (current.shards < price) {
    return { economy: current, error: `Not enough Lattice Shards: ${def.name} costs ${price} (balance ${current.shards}).` };
  }
  return { economy: { ...current, shards: current.shards - price, collection: addCards(current.collection, [cardId]) } };
}

/**
 * Dissolve `qty` copies of a card. Blocked when: the card is unknown, the
 * player owns too few unbound copies, or the remaining copies would drop
 * below what any saved deck requires (that deck would stop being
 * selectable). Returns the payout so the UI can confirm before calling.
 */
export function dissolvePreview(economy, catalog, cardId, qty, savedDecks) {
  const current = sanitizeEconomy(economy);
  const def = catalog.byId?.get(cardId);
  if (!def) return { ok: false, error: `Unknown card "${cardId}".` };
  if (!Number.isInteger(qty) || qty < 1) return { ok: false, error: "Choose at least one copy to dissolve." };
  const entry = current.collection[cardId];
  const owned = entry?.qty ?? 0;
  const unbound = owned - (entry?.boundQty ?? 0);
  if (unbound < qty) {
    return { ok: false, error: `${def.name}: only ${unbound} unbound cop${unbound === 1 ? "y is" : "ies are"} available to dissolve (${owned} owned, ${entry?.boundQty ?? 0} bound starter ${entry?.boundQty === 1 ? "copy" : "copies"} protected).` };
  }
  const payout = (RARITY_PRICES[def.rarity]?.dissolve ?? 0) * qty;
  return { ok: true, payout, remaining: owned - qty };
}

export function dissolve(economy, catalog, cardId, qty, savedDecks) {
  const current = sanitizeEconomy(economy);
  const preview = dissolvePreview(economy, catalog, cardId, qty, savedDecks);
  if (!preview.ok) return { economy: current, error: preview.error };
  // Saved-deck protection: remaining copies must still cover the largest
  // requirement of any single saved deck for this card.
  const required = Math.max(0, ...(Array.isArray(savedDecks) ? savedDecks.map((deck) => {
    const counts = {};
    for (const id of deck.cardIds ?? []) counts[id] = (counts[id] ?? 0) + 1;
    return counts[cardId] ?? 0;
  }) : [0]));
  if (preview.remaining < required) {
    return { economy: current, error: `Dissolving ${qty} would leave ${preview.remaining} cop${preview.remaining === 1 ? "y" : "ies"} of ${catalog.byId.get(cardId).name}, but a saved deck needs ${required}. Edit that deck first.` };
  }
  const next = { ...current.collection };
  const entry = { ...next[cardId], qty: preview.remaining };
  if (entry.qty === 0) entry.qty = 0;
  next[cardId] = entry;
  return { economy: { ...current, shards: current.shards + preview.payout, collection: next }, payout: preview.payout };
}
