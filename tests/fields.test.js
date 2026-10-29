/**
 * Card-field tests.
 *
 * These cover the four front-row Vessel zones and four back-row Action zones
 * per seat: stable slot identity, occupancy derived from authoritative match
 * state, and the engine-side rules that make the zones match the rules.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { applyCommand, unitsOf } from "../src/game/engine.js";
import { MAX_RELICS_PER_SEAT, MAX_UNITS_PER_SEAT } from "../src/game/constants.js";
import { ACTION_SLOTS, VESSEL_SLOTS, fieldState, slotKey } from "../src/ui/fields.js";
import { CATALOG, matchWith, place, prepare, run } from "./support.js";

const ASHEN = "vessel_ashen_crownblade";
const MIREGLASS = "vessel_mireglass_stalker";
const LENS = "relic_ember_lens";

test("the field is four Vessel zones and four Action zones per seat", () => {
  assert.equal(VESSEL_SLOTS, 4);
  assert.equal(ACTION_SLOTS, 4);
  assert.equal(VESSEL_SLOTS, MAX_UNITS_PER_SEAT, "Vessel zones equal the unit cap");
  assert.equal(ACTION_SLOTS, MAX_RELICS_PER_SEAT, "Action zones equal the Relic cap");
});

test("slot keys are stable and unique per seat, kind and index", () => {
  const keys = new Set();
  for (const seat of [0, 1]) {
    for (const kind of ["vessel", "action"]) {
      for (let index = 0; index < 4; index += 1) keys.add(slotKey(seat, kind, index));
    }
  }
  assert.equal(keys.size, 16);
  assert.equal(slotKey(0, "vessel", 2), slotKey(0, "vessel", 2));
  assert.notEqual(slotKey(0, "vessel", 2), slotKey(1, "vessel", 2));
});

test("an empty field still projects eight explicit slots for each seat", () => {
  const match = matchWith();
  for (const seat of [0, 1]) {
    const field = fieldState(match, seat);
    assert.equal(field.vessels.length, VESSEL_SLOTS);
    assert.equal(field.relics.length, ACTION_SLOTS);
    assert.equal(field.vessels.every((unit) => unit === null), true);
    assert.equal(field.freeVesselSlots, VESSEL_SLOTS);
  }
  assert.equal(fieldState(null, 0).vessels.length, VESSEL_SLOTS);
});

test("a summoned Vessel claims the first free zone, keeps it, and does not duplicate", () => {
  let state = prepare(matchWith(), { hand: [ASHEN, MIREGLASS], flux: 10 });
  let result = run(state, { type: "summon", instanceId: "test0_0", x: 2, y: 4 });
  assert.equal(result.ok, true, result.message);
  state = result.state;

  const first = unitsOf(state, 0)[0];
  assert.equal(first.fieldSlot, 0);
  assert.equal(fieldState(state, 0).vessels[0].id, first.id);
  assert.equal(fieldState(state, 0).unitCount, 1);
  assert.equal(fieldState(state, 0).freeVesselSlots, 3);

  // Pass a full round so the first Vessel is ready, then move it: movement on
  // the tactical grid never changes the card zone.
  state = run(state, { type: "endTurn" }).state;
  state = run(state, { type: "endTurn" }).state;
  assert.equal(state.active, 0);
  result = run(state, { type: "move", unitId: first.id, x: 2, y: 3 });
  assert.equal(result.ok, true, result.message);
  state = result.state;
  assert.equal(state.units[first.id].fieldSlot, 0);
  assert.equal(fieldState(state, 0).vessels[0].id, first.id);

  // The next summon takes the next free zone.
  result = run(state, { type: "summon", instanceId: "test0_1", x: 4, y: 4 });
  assert.equal(result.ok, true, result.message);
  state = result.state;

  const field = fieldState(state, 0);
  assert.equal(field.vessels[0].id, first.id);
  assert.equal(field.vessels[1].cardId, MIREGLASS);
  assert.equal(new Set(field.vessels.filter(Boolean).map((unit) => unit.id)).size, 2);
});

test("units inserted outside a summon still fill exactly one zone each", () => {
  const base = matchWith();
  const a = place(base, 0, ASHEN, 2, 4);
  const b = place(a.state, 0, MIREGLASS, 4, 4);
  const field = fieldState(b.state, 0);
  assert.deepEqual(
    field.vessels.map((unit) => unit?.id ?? null),
    [a.unitId, b.unitId, null, null],
  );
  assert.equal(field.unitCount, 2);
});

test("Relics occupy back-row zones in order and the count matches the engine", () => {
  let state = prepare(matchWith(), { hand: [LENS, LENS, LENS, LENS], flux: 12 });
  for (let index = 0; index < ACTION_SLOTS; index += 1) {
    const result = applyCommand(state, { type: "playRelic", instanceId: `test0_${index}` }, { now: 1_001_000 });
    assert.equal(result.ok, true, result.message);
    state = result.state;
  }
  const field = fieldState(state, 0);
  assert.equal(field.relicCount, ACTION_SLOTS);
  assert.equal(field.freeActionSlots, 0);
  assert.deepEqual(
    field.relics.map((relic) => relic?.instanceId),
    ["test0_0", "test0_1", "test0_2", "test0_3"],
  );
  assert.equal(fieldState(state, 1).relicCount, 0, "the other seat's field is untouched");
  assert.equal(CATALOG.byId.get(field.relics[0].cardId).name, "Ember Lens");
});
