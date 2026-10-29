/**
 * Keyword and expansion-effect rules.
 *
 * These cover the vocabulary added with the sixty-Vessel pool: Vessel keywords,
 * stun/ready/revive/flux/nexus healing, drain, and the Relic auras that alter
 * summoning, Action damage and the dawn draw. Every effect goes through
 * `applyCommand`, exactly like the HUD and the AI.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { applyCommand, getLegalActions, unitsOf } from "../src/game/engine.js";
import { CATALOG, START, matchWith, place, prepare, run } from "./support.js";

const GRANITE = "action_granite_grasp"; // earth 2, stun
const SPARK = "action_quickening_spark"; // fire 1, ready a friendly Vessel
const GRAVESONG = "action_gravesong"; // water 3, revive
const SURGE = "action_flux_surge"; // metal 0, gain 2 Flux
const TITHE = "action_siphon_tithe"; // water 2, drain 4
const TIDEWALL = "action_tidewall"; // water 2, Nexus heal 5
const MERIDIAN = "action_glass_meridian"; // water 1, damage 4
const LANCE = "action_ember_lance"; // fire 2, damage 5

const ABBOT = "vessel_furnace_abbot"; // fire 4/7, deathrattleDraw
const WARDEN = "vessel_cinder_warden"; // fire 5/6, stalwart
const STALKER = "vessel_mireglass_stalker"; // water 4/3

const cast = (state, instanceId, targetId) =>
  run(state, targetId ? { type: "playAction", instanceId, targetId } : { type: "playAction", instanceId });

const only = (state, seat) => unitsOf(state, seat)[0];

/** Put a Relic on the table without paying for it, to test its aura. */
function withRelic(state, seat, cardId) {
  const draft = structuredClone(state);
  draft.players[seat].relics = [
    ...draft.players[seat].relics,
    { instanceId: `relic_test_${seat}_${cardId}`, cardId },
  ];
  return draft;
}

test("a stun costs the target exactly one activation, then clears", () => {
  const base = place(
    prepare(matchWith({ seed: 4 }), { hand: [GRANITE], flux: 6 }),
    1,
    STALKER,
    3,
    2,
  ).state;

  const casted = cast(base, "test0_0", "u0");
  assert.equal(casted.ok, true, casted.message);
  const stunned = only(casted.state, 1);
  assert.equal(stunned.stunned, true);
  assert.equal(stunned.ready, false);

  const nextOwner = run(casted.state, { type: "endTurn" });
  const skipped = nextOwner.state.units[stunned.id];
  assert.equal(skipped.stunned, false, "the stun clears");
  assert.equal(skipped.ready, false, "but it misses this activation");

  const backToHuman = run(nextOwner.state, { type: "endTurn" });
  const backToAi = run(backToHuman.state, { type: "endTurn" });
  assert.equal(backToAi.state.units[stunned.id].ready, true, "the next turn is normal");
});

test("ready refreshes a Vessel that already moved and attacked", () => {
  let base = place(prepare(matchWith({ seed: 5 }), { hand: [SPARK], flux: 5 }), 0, "vessel_argent_nightlancer", 3, 5).state;
  const unitId = only(base, 0).id;
  base.units[unitId].hasMoved = true;
  base.units[unitId].hasAttacked = true;
  base.units[unitId].ready = true;

  const casted = cast(base, "test0_0", unitId);
  assert.equal(casted.ok, true, casted.message);
  const unit = casted.state.units[unitId];
  assert.equal(unit.hasMoved, false);
  assert.equal(unit.hasAttacked, false);
  assert.equal(unit.ready, true);
});

test("revive returns the most expensive defeated Vessel and leaves the rest", () => {
  const base = prepare(matchWith({ seed: 6 }), { hand: [GRAVESONG], flux: 8 });
  base.players[0].discard = ["vessel_rubble_warden", "vessel_pyre_sovereign"];
  base.players[0].hand.push({ instanceId: "spare", cardId: "vessel_copper_squire" });

  const casted = cast(base, "test0_0");
  assert.equal(casted.ok, true, casted.message);
  const player = casted.state.players[0];
  // The Action itself is discarded before it resolves, then the Vessel is lifted out.
  assert.deepEqual(player.discard, ["vessel_rubble_warden", GRAVESONG]);
  const revived = player.hand.at(-1);
  assert.equal(revived.cardId, "vessel_pyre_sovereign", "the 8-Flux Vessel, not the 1-Flux one");
  assert.equal(new Set(player.hand.map((c) => c.instanceId)).size, player.hand.length, "instance ids stay unique");
});

test("revive with an empty discard is legal but does nothing", () => {
  const base = prepare(matchWith({ seed: 7 }), { hand: [GRAVESONG], flux: 8 });
  const casted = cast(base, "test0_0");
  assert.equal(casted.ok, true);
  assert.equal(casted.state.players[0].hand.length, 0);
  assert.equal(casted.events.find((e) => e.type === "actionRevive").unitCardId, null);
});

test("Flux gain is capped at the turn's maximum and still costs 1 to cast at cost 0", () => {
  const base = prepare(matchWith({ seed: 8 }), { hand: [SURGE], flux: 3 });
  base.players[0].maxFlux = 5;
  const casted = cast(base, "test0_0");
  assert.equal(casted.ok, true, casted.message);
  assert.equal(casted.state.players[0].flux, 5, "3 + 2 capped at maxFlux 5");

  const broke = prepare(matchWith({ seed: 8 }), { hand: [SURGE], flux: 0 });
  const rejected = cast(broke, "test0_0");
  assert.equal(rejected.ok, false);
  assert.equal(rejected.code, "INSUFFICIENT_FLUX", "zero-cost cards still need 1 available Flux");
});

test("drain damages the target and returns half to the caster's Nexus", () => {
  const base = place(prepare(matchWith({ seed: 9 }), { hand: [TITHE], flux: 6 }), 1, STALKER, 3, 2).state;
  base.players[0].vitality = 20;

  const casted = cast(base, "test0_0", "u0");
  assert.equal(casted.ok, true, casted.message);
  const packet = casted.events.find((e) => e.type === "actionDamage").packets[0].packet;
  const heal = Math.max(1, Math.floor(packet.damage / 2));
  assert.equal(casted.state.players[0].vitality, 20 + heal);
  assert.equal(casted.state.units.u0, undefined, "a 3-Guard target dies to the drain");
});

test("Nexus healing cannot exceed 30 Vitality", () => {
  const base = prepare(matchWith({ seed: 10 }), { hand: [TIDEWALL], flux: 5 });
  base.players[0].vitality = 28;
  const casted = cast(base, "test0_0");
  assert.equal(casted.ok, true, casted.message);
  assert.equal(casted.state.players[0].vitality, 30);
  assert.equal(casted.events.find((e) => e.type === "nexusHeal").healed, 2);
});

test("ward reduces Action damage to that seat's Vessels but never to zero", () => {
  const base = place(prepare(matchWith({ seed: 11 }), { hand: [MERIDIAN], flux: 5 }), 1, STALKER, 3, 2).state;
  const plain = cast(base, "test0_0", "u0");
  assert.equal(plain.ok, true, plain.message);
  const plainDamage = plain.events.find((e) => e.type === "actionDamage").packets[0].packet.damage;
  assert.equal(plainDamage, 4, "water into water is neutral");

  const warded = cast(withRelic(base, 1, "relic_mountain_oath"), "test0_0", "u0");
  assert.equal(warded.ok, true, warded.message);
  const wardedDamage = warded.events.find((e) => e.type === "actionDamage").packets[0].packet.damage;
  assert.equal(wardedDamage, 2, "ward 2 reduces 4 to 2");
  assert.equal(warded.state.units.u0.guard, 3 - 2);

  const stacked = cast(withRelic(withRelic(base, 1, "relic_mountain_oath"), 1, "relic_ashwake_crown"), "test0_0", "u0");
  const stackedDamage = stacked.events.find((e) => e.type === "actionDamage").packets[0].packet.damage;
  assert.equal(stackedDamage, 1, "3 ward against 4 damage still leaves 1");
});

test("a dawn-draw Relic adds one card to that seat's start-of-turn draw", () => {
  const base = matchWith({ seed: 16 });
  const before = base.players[1].hand.length;
  const plain = run(base, { type: "endTurn" });
  assert.equal(plain.state.players[1].hand.length, before + 1, "the normal mandatory draw");

  const withPrism = withRelic(base, 1, "relic_oracular_prism");
  const boosted = run(withPrism, { type: "endTurn" });
  assert.equal(boosted.state.players[1].hand.length, before + 2, "plus the Relic's extra draw");
  assert.ok(boosted.events.some((e) => e.type === "draw" && e.reason === "relic"));
});

test("a swift Relic makes summoned Vessels enter ready", () => {
  const base = prepare(matchWith({ seed: 12 }), { hand: ["vessel_copper_squire"], flux: 5 });
  const swift = withRelic(base, 0, "relic_swift_banner");
  const summon = run(swift, { type: "summon", instanceId: swift.players[0].hand[0].instanceId, x: 2, y: 3 });
  assert.equal(summon.ok, true, summon.message);
  assert.equal(only(summon.state, 0).ready, true);

  const plain = run(base, { type: "summon", instanceId: base.players[0].hand[0].instanceId, x: 2, y: 3 });
  assert.equal(plain.ok, true, plain.message);
  assert.equal(only(plain.state, 0).ready, false, "without the Relic summons are unready");
});

test("stalwart adds Guard on entry and deathrattleDraw draws for its controller", () => {
  const base = prepare(matchWith({ seed: 13 }), { hand: [WARDEN], flux: 8 });
  const summon = run(base, { type: "summon", instanceId: "test0_0", x: 2, y: 3 });
  assert.equal(summon.ok, true, summon.message);
  const warden = only(summon.state, 0);
  assert.equal(warden.maxGuard, 8, "6 printed Guard plus 2 from stalwart");
  assert.equal(warden.guard, 8);

  // A deathrattle Vessel owned by seat 1 dies to a seat-0 Action and draws.
  let board = place(prepare(matchWith({ seed: 14 }), { hand: [LANCE], flux: 4 }), 1, ABBOT, 3, 2).state;
  board.units.u0.guard = 1;
  const handBefore = board.players[1].hand.length;
  const killed = cast(board, "test0_0", "u0");
  assert.equal(killed.ok, true, killed.message);
  assert.equal(killed.state.units.u0, undefined);
  assert.equal(killed.state.players[1].hand.length, handBefore + 1);
  assert.ok(killed.events.some((e) => e.type === "draw" && e.reason === "deathrattle"));
});

test("the new Actions are enumerated as legal only when they can do something", () => {
  const base = prepare(matchWith({ seed: 15 }), { hand: [TIDEWALL, SPARK], flux: 4 });
  const legal = getLegalActions(base);
  assert.deepEqual(legal.actions.map((a) => a.cardId).sort(), [TIDEWALL]);
  assert.equal(legal.actions[0].targeting, "none");

  const withUnit = place(base, 0, "vessel_argent_nightlancer", 3, 5).state;
  const legalWithUnit = getLegalActions(withUnit);
  assert.ok(legalWithUnit.actions.some((a) => a.cardId === SPARK));
});

test("every keyword is documented and every expansion card is catalogued", () => {
  const keyworded = CATALOG.cards.filter((c) => c.category === "vessel" && c.abilities.length > 0);
  assert.ok(keyworded.length >= 15, `only ${keyworded.length} Vessels carry a keyword`);
  const used = new Set(keyworded.flatMap((c) => c.abilities));
  assert.deepEqual([...used].sort(), ["deathrattleDraw", "stalwart", "swift"]);
  assert.equal(CATALOG.cards.length, 107);
  assert.equal(START, 1_000_000);
});
