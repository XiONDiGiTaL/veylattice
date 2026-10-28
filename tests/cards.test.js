/**
 * Action and Relic rules tests.
 *
 * These drive the public command surface only: every cast, set and rejection
 * goes through applyCommand, exactly like the HUD and the AI.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { applyCommand, getLegalActions, unitsOf } from "../src/game/engine.js";
import { decideNextCommands } from "../src/game/ai.js";
import { buildPracticeDeck } from "../src/game/content.js";
import { MAX_RELICS_PER_SEAT } from "../src/game/constants.js";
import { CATALOG, START, matchWith, place, prepare, run, seededRng } from "./support.js";

const LANCE = "action_ember_lance"; // fire 2 Flux, damage 5, enemy unit
const VERDICT = "action_quarry_verdict"; // earth 3, damage 7
const MEND = "action_undertow_mend"; // water 1, heal 4, friendly unit
const VIGIL = "action_thorned_vigil"; // wood 2, buff +2/+2, friendly unit
const WARD = "action_barkbound_ward"; // wood 2, buff +0/+4, friendly unit
const SURVEY = "action_lodestone_survey"; // metal 1, draw 2
const ASHFALL = "action_ashfall"; // fire 3, 2 damage to all enemy vessels
const CANTICLE = "action_siege_canticle"; // earth 3, 4 Nexus damage
const LENS = "relic_ember_lens"; // +1 Vessel attack
const SIGIL = "relic_stone_sigil"; // Nexus takes 1 less
const BELL = "relic_choir_bell"; // mend 2 at turn start
const SEAL = "relic_verdant_seal"; // +2 Guard to your Vessels

const ASHEN = "vessel_ashen_crownblade"; // fire 6/4
const MIREGLASS = "vessel_mireglass_stalker"; // water 4/3
const HOLLOWROOT = "vessel_hollowroot_oracle"; // wood 2/5
const ARGENT = "vessel_argent_nightlancer"; // metal 5/4
const BASTION = "vessel_bastion_first_mountain"; // earth 2/8

const cast = (state, instanceId, targetId) =>
  run(state, targetId ? { type: "playAction", instanceId, targetId } : { type: "playAction", instanceId });

/* ------------------------------ Actions ------------------------------ */

test("an Action pays Flux, leaves the hand, is discarded and resolves elementally", () => {
  const base = place(
    prepare(matchWith(), { hand: [LANCE], flux: 6 }),
    1,
    ARGENT,
    3,
    2,
  ).state;

  const result = cast(base, "test0_0", "u0");
  assert.equal(result.ok, true, result.message);
  assert.equal(result.state.players[0].flux, 4, "2 Flux paid");
  assert.equal(result.state.players[0].hand.length, 0);
  assert.deepEqual(result.state.players[0].discard, [LANCE]);

  const packet = result.events.find((e) => e.type === "actionDamage").packets[0];
  assert.equal(packet.packet.relation, "advantage", "fire overcomes metal");
  assert.equal(packet.packet.damage, 7, "floor(5 x 1.5)");
  assert.equal(packet.guardAfter, -3);
  assert.ok(result.events.some((e) => e.type === "defeat" && e.seat === 1), "the target died");
  assert.equal(Object.keys(result.state.units).length, 0);
});

test("a disadvantaged Action is halved but never drops below one", () => {
  const base = place(prepare(matchWith(), { hand: [LANCE], flux: 6 }), 1, MIREGLASS, 3, 2).state;
  const result = cast(base, "test0_0", "u0");
  assert.equal(result.ok, true, result.message);
  const packet = result.events.find((e) => e.type === "actionDamage").packets[0];
  assert.equal(packet.packet.relation, "disadvantage");
  assert.equal(packet.packet.damage, 2, "floor(5 x 0.5)");
  assert.equal(result.state.units.u0.guard, 1);
});

test("Actions reject wrong sides, missing targets and short Flux without changing state", () => {
  const base = place(prepare(matchWith(), { hand: [LANCE, MEND], flux: 6 }), 1, MIREGLASS, 3, 2).state;
  const own = place(base, 0, ASHEN, 3, 5);
  const withOwn = own.state;

  assert.equal(cast(withOwn, "test0_0", "u1").code, "INVALID_TARGET", "enemy-only Action");
  assert.equal(cast(withOwn, "test0_0").code, "INVALID_TARGET", "target required");
  assert.equal(cast(withOwn, "test0_1", "u0").code, "INVALID_TARGET", "friendly-only Action");
  assert.equal(cast(withOwn, "test0_0", "nope").code, "INVALID_TARGET");

  const poor = prepare(matchWith(), { hand: [LANCE], flux: 1 });
  const broke = cast(place(poor, 1, MIREGLASS, 3, 2).state, "test0_0", "u0");
  assert.equal(broke.code, "INSUFFICIENT_FLUX");
});

test("healing is capped at maximum Guard and buffs are permanent", () => {
  const wounded = place(prepare(matchWith(), { hand: [MEND], flux: 4 }), 0, HOLLOWROOT, 3, 5);
  wounded.state.units[wounded.unitId].guard = 1;
  const healed = cast(wounded.state, "test0_0", wounded.unitId);
  assert.equal(healed.ok, true, healed.message);
  assert.equal(healed.state.units[wounded.unitId].guard, 5, "capped at 5, not 6");
  assert.equal(healed.events.find((e) => e.type === "actionHeal").healed, 4);

  const buffed = place(prepare(matchWith(), { hand: [VIGIL], flux: 4 }), 0, ASHEN, 3, 5);
  const after = cast(buffed.state, "test0_0", buffed.unitId);
  assert.equal(after.ok, true, after.message);
  const unit = after.state.units[buffed.unitId];
  assert.equal(unit.attack, 8);
  assert.equal(unit.guard, 6);
  assert.equal(unit.maxGuard, 6);
});

test("draw and board-wide effects resolve through the same command", () => {
  const drawn = cast(prepare(matchWith(), { hand: [SURVEY], flux: 4 }), "test0_0");
  assert.equal(drawn.ok, true, drawn.message);
  assert.equal(drawn.state.players[0].hand.length, 2, "net +2 cards, the Action itself discarded");
  assert.equal(drawn.state.players[0].discard.length, 1);

  let board = place(prepare(matchWith(), { hand: [ASHFALL], flux: 6 }), 1, MIREGLASS, 3, 2).state;
  board = place(board, 1, ARGENT, 4, 2).state;
  const swept = cast(board, "test0_0");
  assert.equal(swept.ok, true, swept.message);
  const packets = swept.events.find((e) => e.type === "actionDamage").packets;
  assert.equal(packets.length, 2, "every enemy Vessel was hit");
  const byId = Object.fromEntries(packets.map((p) => [p.unitId, p.packet.damage]));
  // u0 is the water Vessel (resists fire, 1), u1 is the metal one (fire wins, 3).
  assert.deepEqual(byId, { u0: 1, u1: 3 }, "fire overcomes metal, water resists fire");
  assert.equal(unitsOf(swept.state, 1).length, 2, "2 damage does not finish either Vessel");
  assert.equal(swept.state.units.u0.guard, 2);
  assert.equal(swept.state.units.u1.guard, 1);
});

test("Nexus-damaging Actions respect Relic armour but can never be fully absorbed", () => {
  const plain = cast(prepare(matchWith(), { hand: [CANTICLE], flux: 6 }), "test0_0");
  assert.equal(plain.state.players[1].vitality, 26);

  let armoured = prepare(matchWith(), { hand: [SIGIL, CANTICLE], flux: 8 });
  armoured = run(armoured, { type: "endTurn" }).state;
  assert.equal(armoured.active, 1);
  // Seat 2 sets the Sigil, then seat 1 casts at it next turn.
  const seat1 = prepare(armoured, { seat: 1, hand: [SIGIL], flux: 8 });
  const sigil = run(seat1, { type: "playRelic", instanceId: "test1_0" });
  assert.equal(sigil.ok, true, sigil.message);

  const passed = run(sigil.state, { type: "endTurn" });
  assert.equal(passed.state.active, 0);
  const hit = cast(prepare(passed.state, { hand: [CANTICLE], flux: 8 }), "test0_0");
  assert.equal(hit.ok, true, hit.message);
  assert.equal(hit.state.players[1].vitality, 27, "4 damage minus 1 armour");
});

/* ------------------------------ Relics ------------------------------ */

test("Relics leave the hand, stay on the table, and any cast card type is rejected", () => {
  const base = prepare(matchWith(), { hand: [LENS, LANCE], flux: 8 });
  const set = run(base, { type: "playRelic", instanceId: "test0_0" });
  assert.equal(set.ok, true, set.message);
  assert.equal(set.state.players[0].relics.length, 1);
  assert.equal(set.state.players[0].relics[0].cardId, LENS);
  assert.equal(set.state.players[0].discard.length, 0, "a Relic is not discarded");
  assert.equal(set.state.players[0].flux, 6);

  const wrongWay = run(set.state, { type: "playRelic", instanceId: "test0_1" });
  assert.equal(wrongWay.code, "UNSUPPORTED_CARD", "an Action cannot be set as a Relic");

  const asSummon = run(base, { type: "summon", instanceId: "test0_0", x: 3, y: 5 });
  assert.equal(asSummon.code, "UNSUPPORTED_CARD", "a Relic cannot be summoned");
  const actionAsSummon = run(base, { type: "summon", instanceId: "test0_1", x: 3, y: 5 });
  assert.equal(actionAsSummon.code, "UNSUPPORTED_CARD", "an Action cannot be summoned");
});

test("the Relic limit is enforced and rejected plans change nothing", () => {
  const base = prepare(matchWith(), { hand: [LENS, SIGIL, BELL], flux: 10 });
  let state = base;
  for (const [index] of [0, 1].entries()) {
    const step = run(state, { type: "playRelic", instanceId: `test0_${index}` });
    assert.equal(step.ok, true, step.message);
    state = step.state;
  }
  assert.equal(state.players[0].relics.length, MAX_RELICS_PER_SEAT);

  const over = run(state, { type: "playRelic", instanceId: "test0_2" });
  assert.equal(over.code, "RELIC_LIMIT");
  assert.equal(over.state, state, "a rejected Relic leaves the match untouched");
});

test("an attack Relic raises the damage of Vessel attacks only", () => {
  let board = prepare(matchWith(), { hand: [LENS, LANCE], flux: 10 });
  board = run(board, { type: "playRelic", instanceId: "test0_0" }).state;
  const placed = place(board, 0, ASHEN, 3, 4);
  board = place(placed.state, 1, BASTION, 3, 3).state;
  const attacker = Object.values(board.units).find((u) => u.owner === 0);

  const strike = run(board, { type: "attack", unitId: attacker.id, targetId: "u1" });
  assert.equal(strike.ok, true, strike.message);
  const packet = strike.events.find((e) => e.type === "attack").attackPacket;
  assert.equal(packet.damage, 7, "6 printed Attack plus 1 from Ember Lens vs neutral earth");

  // Actions keep their printed amount: the aura is a Vessel aura.
  const actionBoard = prepare(board, { hand: [LANCE], flux: 6 });
  const casted = cast(actionBoard, "test0_0", "u1");
  assert.equal(casted.events.find((e) => e.type === "actionDamage").packets[0].packet.damage, 5);
});

test("a Guard Relic raises existing and future Vessels", () => {
  const existing = place(prepare(matchWith(), { hand: [SEAL], flux: 8 }), 0, ASHEN, 3, 5);
  const set = run(existing.state, { type: "playRelic", instanceId: "test0_0" });
  assert.equal(set.ok, true, set.message);
  assert.equal(set.state.units[existing.unitId].guard, 6, "4 Guard plus 2");
  assert.equal(set.state.units[existing.unitId].maxGuard, 6);

  const summoned = prepare(set.state, { hand: [HOLLOWROOT], flux: 8 });
  const next = run(summoned, { type: "summon", instanceId: "test0_0", x: 4, y: 5 });
  assert.equal(next.ok, true, next.message);
  const unit = unitsOf(next.state, 0).find((u) => u.cardId === HOLLOWROOT);
  assert.equal(unit.guard, 7, "5 Guard plus 2 from the Relic");
});

test("a mend Relic heals the most wounded Vessel at the start of the turn", () => {
  const placed = place(prepare(matchWith(), { hand: [BELL], flux: 8 }), 0, ASHEN, 3, 5);
  const set = run(placed.state, { type: "playRelic", instanceId: "test0_0" });
  const damaged = structuredClone(set.state);
  damaged.units[placed.unitId].guard = 1;

  const toSeat1 = run(damaged, { type: "endTurn" });
  assert.equal(toSeat1.ok, true, toSeat1.message);
  const back = run(toSeat1.state, { type: "endTurn" });
  assert.equal(back.state.active, 0);
  assert.equal(back.state.units[placed.unitId].guard, 3, "mend 2 at dawn");
  const mend = back.events.find((e) => e.type === "relicMend");
  assert.ok(mend, "the mend is reported as its own event");
  assert.equal(mend.healed, 2);
});

/* --------------------------- Enumeration --------------------------- */

test("legal-action enumeration exposes playable Actions and Relics with targets", () => {
  const base = place(prepare(matchWith(), { hand: [LANCE, LENS, CANTICLE], flux: 8 }), 1, MIREGLASS, 3, 2).state;
  const withOwn = place(base, 0, ASHEN, 4, 5).state;
  const actions = getLegalActions(withOwn);

  const lance = actions.actions.find((a) => a.cardId === LANCE);
  assert.equal(lance.targeting, "enemyUnit");
  assert.deepEqual(lance.targetIds, ["u0"], "only the enemy Vessel is offered");

  const canticle = actions.actions.find((a) => a.cardId === CANTICLE);
  assert.deepEqual(canticle.targetIds, [], "no target needed");

  assert.deepEqual(
    actions.relics.map((r) => r.cardId),
    [LENS],
  );

  for (const action of actions.actions) {
    const command =
      action.targeting === "none"
        ? { type: "playAction", instanceId: action.instanceId }
        : { type: "playAction", instanceId: action.instanceId, targetId: action.targetIds[0] };
    assert.equal(applyCommand(withOwn, command, { now: START + 1000 }).ok, true, action.cardId);
  }

  const noFlux = getLegalActions(prepare(withOwn, { hand: [LANCE], flux: 1 }));
  assert.equal(noFlux.actions.length, 0, "unaffordable Actions are not offered");
});

test("the AI is never offered a cast that would do nothing", () => {
  const deck = buildPracticeDeck(CATALOG);
  let state = matchWith({ decks: [deck, deck], seed: 5 });
  state = run(state, { type: "endTurn" }).state;
  assert.equal(state.active, 1);

  // A full-Guard friendly Vessel and an empty enemy board: neither the mend nor
  // the board wipe has any effect, so neither may be proposed.
  state = place(state, 1, BASTION, 3, 2).state;
  state.players[1].hand = [
    { instanceId: "wipe", cardId: ASHFALL },
    { instanceId: "heal", cardId: MEND },
  ];
  state.players[1].flux = 9;

  const { plan } = decideNextCommands(state, 1, { difficulty: "standard", rng: seededRng(3) });
  assert.notEqual(plan.kind, "playAction", `AI chose a pointless ${plan.kind}`);
});

test("the AI plays Actions and Relics, and never submits a rejected one", () => {
  const deck = buildPracticeDeck(CATALOG);
  let state = matchWith({ decks: [deck, deck], seed: 17 });
  state = run(state, { type: "endTurn" }).state;
  assert.equal(state.active, 1);

  // Seat 2 holds a removal Action and a Relic; the enemy Vessel is worth killing.
  const target = place(state, 0, "vessel_cinder_maw", 3, 4);
  state = place(target.state, 1, "vessel_bastion_first_mountain", 3, 2).state;
  state.players[1].hand = [
    { instanceId: "ai_action", cardId: LANCE },
    { instanceId: "ai_relic", cardId: LENS },
  ];
  state.players[1].flux = 9;

  const seen = new Set();
  for (let i = 0; i < 6; i += 1) {
    const decision = decideNextCommands(state, 1, { difficulty: "veteran", rng: seededRng(i + 1) });
    if (!decision.plan || decision.plan.kind === "endTurn") break;
    seen.add(decision.plan.kind);
    for (const command of decision.commands) {
      const result = applyCommand(state, command, { now: START + 1000 });
      assert.equal(result.ok, true, `${command.type} was rejected: ${result.message}`);
      state = result.state;
    }
  }

  assert.ok(seen.has("playAction") || seen.has("playRelic"), `AI kinds seen: ${[...seen].join(", ")}`);
  assert.equal(state.players[1].hand.length, 0, "both new card types were used");
});
