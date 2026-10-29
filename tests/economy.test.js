import test from "node:test";
import assert from "node:assert/strict";

import { buildPracticeDeck } from "../src/game/content.js";
import {
  PACK_COMMON_SLOTS,
  PACK_PRICE,
  PACK_SIZE,
  RARITY_PRICES,
  dissolve,
  dissolvePreview,
  purchasePack,
  purchaseSingle,
  rollPack,
  sanitizeEconomy,
  starterCollection,
} from "../src/game/economy.js";
import { CATALOG, seededRng } from "./support.js";

const baseEconomy = () => {
  const ids = buildPracticeDeck(CATALOG);
  return sanitizeEconomy({ shards: 300, collection: starterCollection(ids), decks: [{ id: "d1", name: "Starter", cardIds: ids }] });
};

test("a pack contains exactly six cards: five Commons and one Rare-or-better", () => {
  for (const seed of [1, 2, 3, 42, 99]) {
    const roll = rollPack(CATALOG, seededRng(seed));
    assert.equal(roll.cards.length, PACK_SIZE);
    const commons = roll.cards.filter((id) => CATALOG.byId.get(id).rarity === "common");
    assert.equal(commons.length, PACK_COMMON_SLOTS, `seed ${seed}: ${roll.cards.map((id) => CATALOG.byId.get(id).rarity).join(",")}`);
    const rarePlus = roll.cards.filter((id) => ["rare", "epic", "mythic"].includes(CATALOG.byId.get(id).rarity));
    assert.equal(rarePlus.length, 1);
  }
});

test("pack purchase charges exactly 300, grants the roll, and is idempotent on replay", () => {
  const econ = baseEconomy();
  const first = purchasePack(econ, CATALOG, "op-1", seededRng(7));
  assert.equal(first.error, undefined);
  assert.equal(first.economy.shards, econ.shards - PACK_PRICE);
  assert.equal(first.opening.cards.length, PACK_SIZE);
  for (const id of first.opening.cards) assert.ok((first.economy.collection[id]?.qty ?? 0) >= 1);
  const replay = purchasePack(first.economy, CATALOG, "op-1", seededRng(12345));
  assert.equal(replay.replayed, true);
  assert.deepEqual(replay.opening.cards, first.opening.cards);
  assert.equal(replay.economy.shards, first.economy.shards);
});

test("insufficient funds change nothing, and balances never go negative", () => {
  const econ = sanitizeEconomy({ shards: 299, collection: {} });
  const result = purchasePack(econ, CATALOG, "op-2", seededRng(1));
  assert.ok(result.error.includes("Not enough"));
  assert.equal(result.economy.shards, 299);
  assert.deepEqual(result.economy.collection, {});
});

test("Singles require discovery and charge the rarity price", () => {
  const econ = baseEconomy();
  const starterIds = buildPracticeDeck(CATALOG);
  const common = CATALOG.cards.find((c) => c.rarity === "common" && starterIds.includes(c.id));
  assert.ok(common, "expected a discovered common in the starter deck");
  // A common from the starter deck is discovered; an undiscovered one is not buyable.
  const undiscovered = CATALOG.cards.find((c) => c.rarity === "common" && !econ.collection[c.id]);
  assert.ok(undiscovered, "expected an undiscovered common in the catalog");
  assert.ok(purchaseSingle(econ, CATALOG, undiscovered.id).error.includes("not been discovered"));
  const bought = purchaseSingle(econ, CATALOG, common.id);
  assert.equal(bought.error, undefined);
  assert.equal(bought.economy.shards, econ.shards - RARITY_PRICES.common.buy);
});

test("dissolution pays out, protects bound starter copies, and blocks deck-breaking sales", () => {
  const econ = baseEconomy();
  const ids = buildPracticeDeck(CATALOG);
  const starterId = ids[0];
  // Starter copies are fully bound, so dissolving any of them is blocked.
  assert.equal(dissolvePreview(econ, CATALOG, starterId, 1, econ.decks).ok, false);
  // Add an unbound copy via a pack-style grant, then dissolve only that copy.
  const rich = { ...econ, collection: { ...econ.collection, [starterId]: { qty: econ.collection[starterId].qty + 1, boundQty: econ.collection[starterId].boundQty, discovered: true } } };
  const preview = dissolvePreview(rich, CATALOG, starterId, 1, econ.decks);
  assert.equal(preview.ok, true);
  const done = dissolve(rich, CATALOG, starterId, 1, econ.decks);
  assert.equal(done.error, undefined);
  assert.equal(done.economy.shards, rich.shards + preview.payout);
  // Dissolving below a saved deck's requirement is blocked even for unbound copies.
  const actionId = ids.find((id) => CATALOG.byId.get(id).category === "action");
  const withExtra = { ...econ, collection: { ...econ.collection, [actionId]: { qty: 3, boundQty: 0, discovered: true } } };
  // The starter deck needs 2 copies of this action; leaving 1 would break it.
  assert.ok(dissolve(withExtra, CATALOG, actionId, 2, econ.decks).error.includes("saved deck"));
});
