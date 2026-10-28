/**
 * Shared test scaffolding.
 *
 * Tests load the real starter set, build a validated catalog and drive the
 * engine through public commands. Board-position setup uses the engine's own
 * createUnit/insertUnit helpers so unit shape cannot drift from production.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { createCatalog } from "../src/game/content.js";
import { createMatch, createUnit, insertUnit, cellIndex, applyCommand } from "../src/game/engine.js";
import { TURN_MS } from "../src/game/constants.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const starterPath = path.join(here, "..", "src", "cards", "starter-set.json");

export const RAW_CARDS = JSON.parse(readFileSync(starterPath, "utf8"));
export const CATALOG = createCatalog(RAW_CARDS);

export const CARD = Object.fromEntries(CATALOG.cards.map((c) => [c.id, c]));

/** Deterministic RNG (mulberry32). */
export function seededRng(seed = 1) {
  let a = seed >>> 0;
  return function rng() {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deck of repeated single card ids; keeps tests readable. */
export function deckOf(cardId, count = 30) {
  return new Array(count).fill(cardId);
}

export function matchWith({ decks, seed = 7, now = 1_000_000 } = {}) {
  return createMatch({
    catalog: CATALOG,
    decks,
    rng: seededRng(seed),
    now,
  });
}

export const START = 1_000_000;
export const DEADLINE = START + TURN_MS;

/** Give a seat a controlled hand and Flux so tests can exercise real commands. */
export function prepare(state, { seat = state.active, hand = [], flux = 10 } = {}) {
  const draft = structuredClone(state);
  draft.players[seat].hand = hand.map((cardId, i) => ({ instanceId: `test${seat}_${i}`, cardId }));
  draft.players[seat].flux = flux;
  draft.players[seat].maxFlux = Math.max(draft.players[seat].maxFlux, flux);
  return draft;
}

/** Place a unit directly for positional setup (already-committed state). */
export function place(state, seat, cardId, x, y, { ready = true } = {}) {
  const draft = structuredClone(state);
  const def = CATALOG.byId.get(cardId);
  const unit = createUnit(draft, def, seat, x, y, { ready });
  insertUnit(draft, unit);
  return { state: draft, unitId: unit.id };
}

export function run(state, command, now = START + 1000) {
  return applyCommand(state, command, { now });
}

export function occupancy(state) {
  return Object.fromEntries(
    Object.entries(state.units).map(([id, u]) => [id, { owner: u.owner, x: u.x, y: u.y, guard: u.guard }]),
  );
}

export { cellIndex, createUnit, insertUnit, applyCommand, createMatch };
