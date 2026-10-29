import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { activeDeckStatus, menuMotionAllowed } from "../src/ui/menu.js";
import { buildPracticeDeck } from "../src/game/content.js";
import { createDeck } from "../src/game/decks.js";
import { starterCollection } from "../src/game/economy.js";
import { mergeRemoteRoom, createRoom, joinRoom, setSeatDeck } from "../src/game/lobby.js";
import { CATALOG } from "./support.js";

function economyWith(cardIds, { owned = true } = {}) {
  const deck = createDeck("Test deck", cardIds);
  return { shards: 300, collection: owned ? starterCollection(cardIds) : {}, openings: [], decks: [deck], activeDeckId: deck.id };
}

test("Solo Duel: a legal, owned active deck is ready", () => {
  const ids = buildPracticeDeck(CATALOG);
  const status = activeDeckStatus(economyWith(ids), CATALOG);
  assert.equal(status.ok, true);
  assert.equal(status.counts.total, ids.length);
  assert.equal(status.reason, "");
});

test("Solo Duel: an illegal deck is refused with the first validation error", () => {
  const ids = buildPracticeDeck(CATALOG).slice(0, 12);
  const status = activeDeckStatus(economyWith(ids), CATALOG);
  assert.equal(status.ok, false);
  assert.match(status.reason, /can't be used yet/);
});

test("Solo Duel: an unowned deck is refused (ownership is enforced, not just rules)", () => {
  const ids = buildPracticeDeck(CATALOG);
  const status = activeDeckStatus(economyWith(ids, { owned: false }), CATALOG);
  assert.equal(status.ok, false);
  assert.match(status.reason, /Not owned/);
});

test("Solo Duel: no active deck, or no catalog yet, is never ready", () => {
  assert.equal(activeDeckStatus({ decks: [] }, CATALOG).ok, false);
  assert.equal(activeDeckStatus(undefined, CATALOG).deck, null);
  const ids = buildPracticeDeck(CATALOG);
  assert.equal(activeDeckStatus(economyWith(ids), null).ok, false);
});

test("menu motion honours both prefers-reduced-motion and the in-game setting", () => {
  assert.equal(menuMotionAllowed({}), true);
  assert.equal(menuMotionAllowed({ prefersReduced: true }), false);
  assert.equal(menuMotionAllowed({ settingReduced: true }), false);
});

test("lobby: a player's deck name travels with their own seat fields", () => {
  const host = { id: "host-1", displayName: "Host" };
  const room = joinRoom(createRoom({ code: "ABC234", host }), { id: "guest-1", displayName: "Guest" }).room;
  const guestCopy = setSeatDeck(room, "guest-1", "deck-g").room;
  guestCopy.seats[1].deckName = "Ember Rush";
  const merged = mergeRemoteRoom(room, guestCopy, { myId: "host-1", fromId: "guest-1" });
  assert.equal(merged.room.seats[1].deckName, "Ember Rush");
});

test("menu markup: every visible destination has a handler target and no dead buttons", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const menu = html.slice(html.indexOf('id="view-menu"'), html.indexOf("HOW TO PLAY"));
  const ids = [...menu.matchAll(/<button id="([a-z-]+)"/g)].map((m) => m[1]);
  const main = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
  const menuJs = readFileSync(new URL("../src/ui/menu.js", import.meta.url), "utf8");
  for (const id of ids) {
    assert.ok(main.includes(`"#${id}"`) || menuJs.includes(`"#${id}"`), `no handler for #${id}`);
  }
  assert.ok(ids.includes("menu-play"));
  assert.ok(!/Local Match|hot-seat/i.test(menu), "no button for the unimplemented local mode");
});
