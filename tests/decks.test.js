import test from "node:test";
import assert from "node:assert/strict";

import { buildPracticeDeck, validateDeck } from "../src/game/content.js";
import {
  createDeck,
  deleteDeck,
  duplicateDeck,
  maxDeckRequirement,
  sanitizeDecks,
  upsertDeck,
  validateDeckWithOwnership,
} from "../src/game/decks.js";
import { sanitizeEconomy, starterCollection } from "../src/game/economy.js";
import { sanitizeProfile } from "../src/net/profile.js";
import { CATALOG, matchWith } from "./support.js";

const practice = () => buildPracticeDeck(CATALOG);
const ownedFor = (ids) => starterCollection(ids);

test("a legal owned deck validates and can start a match", () => {
  const ids = practice();
  const check = validateDeckWithOwnership(ids, CATALOG, ownedFor(ids));
  assert.equal(check.ok, true, check.errors.join(" "));
  assert.equal(check.counts.total, 40);
  const match = matchWith({ decks: [ids, ids] });
  // 40 minus opening hand of 5, minus seat 0's first-turn draw.
  assert.equal(match.players[0].deck.length, 34);
  assert.equal(match.players[1].deck.length, 35);
});

test("copy limit, type minima and size bounds are enforced with precise errors", () => {
  const oneVessel = CATALOG.cards.find((c) => c.category === "vessel").id;
  const check = validateDeckWithOwnership(new Array(30).fill(oneVessel), CATALOG, ownedFor([oneVessel]));
  assert.equal(check.ok, false);
  assert.ok(check.errors.some((e) => e.includes("3-copy limit")));
  assert.ok(check.errors.some((e) => e.includes("Actions")));
  const small = validateDeckWithOwnership(practice().slice(0, 10), CATALOG, ownedFor(practice()));
  assert.ok(small.errors.some((e) => e.includes("between 20 and 40")));
});

test("ownership is checked per deck: unowned copies make a deck unselectable", () => {
  const ids = practice();
  const check = validateDeckWithOwnership(ids, CATALOG, {});
  assert.equal(check.ok, false);
  assert.ok(check.errors.some((e) => e.includes("Not owned")));
  // Owning only one copy of a card the deck needs twice is not enough.
  const actionId = ids.find((id) => CATALOG.byId.get(id).category === "action");
  const partial = { [actionId]: { qty: 1, boundQty: 0, discovered: true } };
  const counts = ids.filter((id) => id === actionId).length;
  assert.ok(counts >= 2);
  assert.equal(validateDeckWithOwnership(ids, CATALOG, partial).ok, false);
});

test("deck CRUD: create, save, duplicate, rename, delete, and malformed entries are dropped", () => {
  const deck = createDeck("My deck", practice());
  const saved = upsertDeck([], deck);
  assert.equal(saved.error, null);
  assert.equal(saved.decks.length, 1);
  const dup = duplicateDeck(saved.decks, deck.id);
  assert.equal(dup.decks.length, 2);
  assert.notEqual(dup.decks[0].id, deck.id);
  const renamed = upsertDeck(dup.decks, { ...deck, name: "Renamed" });
  assert.equal(renamed.decks.find((d) => d.id === deck.id).name, "Renamed");
  const afterDelete = deleteDeck(renamed.decks, deck.id);
  assert.equal(afterDelete.length, 1);
  assert.deepEqual(sanitizeDecks([{ id: "", cardIds: [] }, null, deck]), [deck]);
  assert.equal(maxDeckRequirement(saved.decks, practice()[0]), 1);
});

test("profile sanitization preserves decks, collection and shards across a save round-trip", () => {
  const ids = practice();
  const profile = sanitizeProfile({
    id: "11111111-1111-4111-8111-111111111111",
    displayName: "Tester",
    economy: { shards: 123, collection: ownedFor(ids), decks: [createDeck("Starter", ids)], activeDeckId: "missing" },
  });
  assert.equal(profile.economy.shards, 123);
  assert.equal(profile.economy.decks.length, 1);
  // A dangling activeDeckId falls back to the first saved deck.
  assert.equal(profile.economy.activeDeckId, profile.economy.decks[0].id);
  const clean = sanitizeEconomy({ shards: -5, collection: { "bad id!": { qty: 9 } }, openings: "nope" });
  assert.equal(clean.shards, 300);
  assert.deepEqual(clean.collection, {});
});
