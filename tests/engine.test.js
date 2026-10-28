import test from "node:test";
import assert from "node:assert/strict";

import { applyCommand, applyOutcome, createMatch, getLegalActions, unitsOf } from "../src/game/engine.js";
import { createCatalog } from "../src/game/content.js";
import { TURN_MS } from "../src/game/constants.js";
import {
  CATALOG,
  DEADLINE,
  START,
  matchWith,
  place,
  prepare,
  run,
  seededRng,
} from "./support.js";

const ASHEN = "vessel_ashen_crownblade"; // fire 6/4, range 1
const BASTION = "vessel_bastion_first_mountain"; // earth 2/8, range 1
const MIREGLASS = "vessel_mireglass_stalker"; // water 4/3, range 1
const WYRM = "vessel_wyrm_drowned_vault"; // water 7/5, range 1
const HOLLOWROOT = "vessel_hollowroot_oracle"; // wood 2/5, range 2
const DUSTVEIL = "vessel_dustveil_matriarch"; // earth 3/6, range 1

/* ----------------------------- setup ----------------------------- */

test("opening state follows the documented sequence", () => {
  const state = matchWith();
  assert.equal(state.phase, "main");
  assert.equal(state.turn, 1);
  assert.equal(state.active, 0);
  assert.equal(state.players[0].vitality, 30);
  assert.equal(state.players[1].vitality, 30);
  assert.equal(state.players[0].hand.length, 6, "five opening cards plus the first-turn draw");
  assert.equal(state.players[1].hand.length, 5);
  assert.equal(state.players[0].deck.length, 30);
  assert.equal(state.players[0].maxFlux, 1);
  assert.equal(state.players[0].flux, 1);
  assert.equal(state.deadlineAt, START + TURN_MS);
});

test("turn handoff raises maximum Flux and draws each turn", () => {
  const state = matchWith();
  const toSeat1 = run(state, { type: "endTurn" });
  assert.equal(toSeat1.ok, true);
  assert.equal(toSeat1.state.active, 1);
  assert.equal(toSeat1.state.players[1].maxFlux, 1);
  assert.equal(toSeat1.state.players[1].hand.length, 6);
  assert.equal(toSeat1.state.deadlineAt, START + 1000 + TURN_MS);

  const toSeat0 = run(toSeat1.state, { type: "endTurn" });
  assert.equal(toSeat0.state.active, 0);
  assert.equal(toSeat0.state.turn, 2);
  assert.equal(toSeat0.state.players[0].maxFlux, 2);
  assert.equal(toSeat0.state.players[0].flux, 2);
  assert.equal(toSeat0.state.players[0].hand.length, 7);
});

test("Flux caps at ten and does not carry over", () => {
  let state = matchWith();
  for (let i = 0; i < 24; i += 1) state = run(state, { type: "endTurn" }).state;
  // Back on seat 0 after 24 passes: seat 0 has taken its 13th turn.
  assert.equal(state.active, 0);
  assert.equal(state.players[0].maxFlux, 10);
  const spent = prepare(state, { hand: [ASHEN], flux: state.players[0].flux });
  const summon = run(spent, { type: "summon", instanceId: "test0_0", x: 3, y: 5 });
  assert.equal(summon.ok, true);
  const passed = run(summon.state, { type: "endTurn" });
  const back = run(passed.state, { type: "endTurn" });
  assert.equal(back.state.players[0].flux, 10, "pool refills to the cap, unused Flux expires");
});

/* ----------------------------- summon ----------------------------- */

test("summon pays Flux, enforces one per turn, and enters unready", () => {
  const state = prepare(matchWith(), { hand: [MIREGLASS, ASHEN], flux: 10 });
  const first = run(state, { type: "summon", instanceId: "test0_0", x: 3, y: 5 });
  assert.equal(first.ok, true, first.message);
  assert.equal(first.state.players[0].flux, 8);
  assert.equal(first.state.players[0].summonUsed, 1);
  const unit = unitsOf(first.state, 0)[0];
  assert.equal(unit.ready, false);
  assert.equal(unit.guard, 3);
  assert.deepEqual(getLegalActions(first.state).units.find((u) => u.unitId === unit.id)?.attacks, []);

  const second = run(first.state, { type: "summon", instanceId: "test0_1", x: 4, y: 5 });
  assert.equal(second.ok, false);
  assert.equal(second.code, "SUMMON_LIMIT");
  assert.equal(second.state, first.state);
});

test("summon rejects illegal cells, occupancy, Flux shortages and the unit cap", () => {
  const base = prepare(matchWith(), { hand: [ASHEN], flux: 10 });

  const outsideZone = run(base, { type: "summon", instanceId: "test0_0", x: 3, y: 3 });
  assert.equal(outsideZone.code, "ILLEGAL_CELL");

  const offBoard = run(base, { type: "summon", instanceId: "test0_0", x: 9, y: 5 });
  assert.equal(offBoard.code, "ILLEGAL_CELL");

  const occupied = place(base, 0, MIREGLASS, 3, 5);
  const blocked = run(occupied.state, { type: "summon", instanceId: "test0_0", x: 3, y: 5 });
  assert.equal(blocked.code, "CELL_OCCUPIED");

  const poor = prepare(matchWith(), { hand: [ASHEN], flux: 2 });
  const short = run(poor, { type: "summon", instanceId: "test0_0", x: 3, y: 5 });
  assert.equal(short.code, "INSUFFICIENT_FLUX");
  assert.equal(short.state, poor);

  const noFlux = prepare(matchWith(), { hand: [ASHEN], flux: 0 });
  assert.equal(run(noFlux, { type: "summon", instanceId: "test0_0", x: 3, y: 5 }).code, "INSUFFICIENT_FLUX");

  let capped = prepare(matchWith(), { hand: [ASHEN], flux: 10 });
  [[0, 6], [1, 6], [2, 6], [3, 6]].forEach(([x, y], i) => {
    capped = place(capped, 0, i % 2 === 0 ? MIREGLASS : HOLLOWROOT, x, y).state;
  });
  const full = run(capped, { type: "summon", instanceId: "test0_0", x: 4, y: 6 });
  assert.equal(full.code, "UNIT_LIMIT");
});

test("a zero-cost card still requires at least one available Flux", () => {
  const synthetic = Array.from({ length: 10 }, (_, i) => ({
    id: `synth_${i}`,
    name: `Synth ${i}`,
    category: "vessel",
    element: "fire",
    subtypes: ["construct"],
    cost: 0,
    attack: 1,
    guard: 1,
    movement: 1,
    range: 1,
    rarity: "common",
    modelId: `synth_${i}`,
    flavorText: "",
    abilities: [],
    loreBondIds: [],
  }));
  const catalog = createCatalog(synthetic);
  const deck = synthetic.flatMap((c) => [c.id, c.id]);
  const state = createMatch({ catalog, decks: [deck, deck], rng: seededRng(2), now: START });
  const prepared = prepare(state, { hand: ["synth_0"], flux: 0 });
  const result = run(prepared, { type: "summon", instanceId: "test0_0", x: 3, y: 5 });
  assert.equal(result.code, "INSUFFICIENT_FLUX");
});

/* ----------------------------- movement ----------------------------- */

test("movement respects readiness, range, occupancy and ownership", () => {
  const base = matchWith();
  const placed = place(base, 0, MIREGLASS, 3, 5, { ready: true });

  const moved = run(placed.state, { type: "move", unitId: placed.unitId, x: 3, y: 3 });
  assert.equal(moved.ok, true, moved.message);
  assert.equal(moved.state.units[placed.unitId].y, 3);
  assert.equal(moved.state.board[3 * 7 + 3], placed.unitId);
  assert.equal(moved.state.board[5 * 7 + 3], null);

  const again = run(moved.state, { type: "move", unitId: placed.unitId, x: 4, y: 3 });
  assert.equal(again.code, "ALREADY_MOVED");

  const tooFar = run(placed.state, { type: "move", unitId: placed.unitId, x: 3, y: 2 });
  assert.equal(tooFar.code, "OUT_OF_RANGE");

  const unready = place(base, 0, MIREGLASS, 3, 5, { ready: false });
  assert.equal(
    run(unready.state, { type: "move", unitId: unready.unitId, x: 3, y: 4 }).code,
    "UNIT_NOT_READY",
  );

  const enemy = place(base, 1, MIREGLASS, 0, 0, { ready: true });
  assert.equal(
    run(enemy.state, { type: "move", unitId: enemy.unitId, x: 0, y: 1 }).code,
    "NOT_YOUR_UNIT",
  );

  const blocked = place(placed.state, 1, BASTION, 4, 5);
  assert.equal(
    run(blocked.state, { type: "move", unitId: placed.unitId, x: 4, y: 5 }).code,
    "CELL_OCCUPIED",
  );

  // Occupied cells block paths: a unit cannot slip past a blocker with movement 2.
  const wall = place(placed.state, 0, BASTION, 3, 4);
  assert.equal(
    run(wall.state, { type: "move", unitId: placed.unitId, x: 3, y: 3 }).code,
    "OUT_OF_RANGE",
  );
});

/* ----------------------------- combat ----------------------------- */

test("combat removes Guard persistently instead of using a threshold", () => {
  const base = matchWith();
  const attacker = place(base, 0, ASHEN, 2, 3);
  const defender = place(attacker.state, 1, BASTION, 2, 4);
  const result = run(defender.state, {
    type: "attack",
    unitId: attacker.unitId,
    targetId: defender.unitId,
  });
  assert.equal(result.ok, true, result.message);
  const d = result.state.units[defender.unitId];
  const a = result.state.units[attacker.unitId];
  assert.equal(d.guard, 2, "8 Guard minus 6 neutral damage survives at 2");
  assert.equal(d.maxGuard, 8, "printed maximum Guard is preserved");
  assert.equal(a.guard, 2, "eligible retaliation deals 2 back");
  assert.equal(a.hasAttacked, true);
  assert.equal(result.state.players[1].vitality, 30, "unit damage never hits Vitality");
});

test("elemental advantage applies to attack and retaliation independently", () => {
  const base = matchWith();
  const attacker = place(base, 0, MIREGLASS, 1, 3); // water 4/3
  const defender = place(attacker.state, 1, ASHEN, 1, 4); // fire 6/4
  const result = run(defender.state, {
    type: "attack",
    unitId: attacker.unitId,
    targetId: defender.unitId,
  });
  assert.equal(result.ok, true, result.message);
  const event = result.events.find((e) => e.type === "attack");
  assert.equal(event.attackPacket.damage, 6); // floor(4 * 1.5)
  assert.equal(event.attackPacket.relation, "advantage");
  assert.equal(event.retaliationPacket.damage, 3); // max(1, floor(6 * 0.5))
  assert.equal(event.retaliationPacket.relation, "disadvantage");

  // Simultaneous exchange: both Guard totals reach 0, so both are defeated.
  assert.deepEqual(Object.keys(result.state.units), []);
  assert.equal(result.state.players[0].discard.includes(MIREGLASS), true);
  assert.equal(result.state.players[1].discard.includes(ASHEN), true);
  assert.ok(result.state.board.every((cell) => cell === null));
});

test("a disadvantageous attacker loses the exchange", () => {
  const base = matchWith();
  const attacker = place(base, 0, ASHEN, 4, 3); // fire 6/4
  const defender = place(attacker.state, 1, WYRM, 4, 4); // water 7/5
  const result = run(defender.state, {
    type: "attack",
    unitId: attacker.unitId,
    targetId: defender.unitId,
  });
  assert.equal(result.ok, true, result.message);
  assert.equal(result.state.units[defender.unitId].guard, 2);
  assert.equal(result.state.units[attacker.unitId], undefined);
});

test("defenders outside their own range do not retaliate", () => {
  const base = matchWith();
  const attacker = place(base, 0, HOLLOWROOT, 0, 3); // wood 2/5, range 2
  const defender = place(attacker.state, 1, DUSTVEIL, 0, 1); // earth 3/6, range 1
  const result = run(defender.state, {
    type: "attack",
    unitId: attacker.unitId,
    targetId: defender.unitId,
  });
  assert.equal(result.ok, true, result.message);
  const event = result.events.find((e) => e.type === "attack");
  assert.equal(event.attackPacket.damage, 3); // wood overcomes earth: floor(2 * 1.5)
  assert.equal(event.retaliationPacket, null);
  assert.equal(result.state.units[attacker.unitId].guard, 5);
  assert.equal(result.state.units[defender.unitId].guard, 3);
});

test("blocked or diagonal lines of sight are rejected", () => {
  const base = matchWith();
  const attacker = place(base, 0, HOLLOWROOT, 0, 3);
  const blockedState = place(attacker.state, 1, BASTION, 0, 2);
  const defender = place(blockedState.state, 1, DUSTVEIL, 0, 1);
  const blocked = run(defender.state, {
    type: "attack",
    unitId: attacker.unitId,
    targetId: defender.unitId,
  });
  assert.equal(blocked.code, "NO_LINE_OF_SIGHT");

  const diagonal = place(attacker.state, 1, DUSTVEIL, 1, 2);
  assert.equal(
    run(diagonal.state, { type: "attack", unitId: attacker.unitId, targetId: diagonal.unitId }).code,
    "NO_LINE_OF_SIGHT",
  );
});

test("one attack per Vessel per turn, and friendly fire is illegal", () => {
  const base = matchWith();
  const attacker = place(base, 0, ASHEN, 2, 3);
  const defender = place(attacker.state, 1, BASTION, 2, 4);
  const ally = place(defender.state, 0, MIREGLASS, 3, 3);

  const onAlly = run(ally.state, { type: "attack", unitId: attacker.unitId, targetId: ally.unitId });
  assert.equal(onAlly.code, "ILLEGAL_TARGET");

  const first = run(ally.state, { type: "attack", unitId: attacker.unitId, targetId: defender.unitId });
  assert.equal(first.ok, true, first.message);
  const second = run(first.state, { type: "attack", unitId: attacker.unitId, targetId: defender.unitId });
  assert.equal(second.code, "ALREADY_ATTACKED");
});

/* ----------------------------- Nexus ----------------------------- */

test("Nexus direct attacks require the enemy home row and an empty enemy board", () => {
  const base = matchWith();
  const unit = place(base, 0, ASHEN, 0, 0, { ready: true });

  const blockedState = place(unit.state, 1, BASTION, 6, 6);
  const blocked = run(blockedState.state, { type: "attack", unitId: unit.unitId, target: "nexus" });
  assert.equal(blocked.code, "NEXUS_BLOCKED");

  const offHome = place(base, 0, ASHEN, 0, 2, { ready: true });
  const wrongRow = run(offHome.state, { type: "attack", unitId: offHome.unitId, target: "nexus" });
  assert.equal(wrongRow.code, "NOT_ON_HOME_ROW");

  const hit = run(unit.state, { type: "attack", unitId: unit.unitId, target: "nexus" });
  assert.equal(hit.ok, true, hit.message);
  assert.equal(hit.state.players[1].vitality, 24, "full Attack 6, no elemental modifier");
  assert.equal(hit.state.players[0].vitality, 30);
  assert.equal(hit.state.units[unit.unitId].hasAttacked, true);
});

test("lethal Nexus damage ends the match exactly once", () => {
  const base = matchWith();
  const unit = place(base, 0, ASHEN, 0, 0, { ready: true });
  const wounded = structuredClone(unit.state);
  wounded.players[1].vitality = 5;

  const hit = run(wounded, { type: "attack", unitId: unit.unitId, target: "nexus" });
  assert.equal(hit.ok, true, hit.message);
  assert.equal(hit.state.phase, "over");
  assert.deepEqual(hit.state.result, { winnerSeat: 0, reason: "vitality" });
  assert.equal(hit.state.deadlineAt, null);

  const afterwards = run(hit.state, { type: "endTurn" });
  assert.equal(afterwards.code, "GAME_OVER");
  assert.equal(afterwards.state, hit.state);
});

test("simultaneous lethal Vitality is a draw", () => {
  const state = matchWith();
  const both = structuredClone(state);
  both.players[0].vitality = 0;
  both.players[1].vitality = 0;
  const events = [];
  applyOutcome(both, events);
  assert.equal(both.phase, "over");
  assert.deepEqual(both.result, { winnerSeat: null, reason: "simultaneous" });
  assert.equal(events.filter((e) => e.type === "gameOver").length, 1);
});

test("surrender awards the opponent without touching Vitality", () => {
  const result = run(matchWith(), { type: "surrender" });
  assert.equal(result.ok, true);
  assert.deepEqual(result.state.result, { winnerSeat: 1, reason: "surrender" });
  assert.equal(result.state.players[0].vitality, 30);
});

/* ----------------------------- mulligan ----------------------------- */

test("mulligan costs one Flux, bottoms the card and is once per turn", () => {
  const state = prepare(matchWith(), { hand: [MIREGLASS, ASHEN], flux: 4 });
  const bottomBefore = state.players[0].deck[state.players[0].deck.length - 1].cardId;

  const result = run(state, { type: "mulligan", instanceId: "test0_0" });
  assert.equal(result.ok, true, result.message);
  assert.equal(result.state.players[0].flux, 3);
  assert.equal(result.state.players[0].mulliganUsed, 1);
  assert.equal(result.state.players[0].hand.length, 2);
  assert.equal(result.state.players[0].hand[0].cardId, ASHEN, "the unselected card remains");
  const deck = result.state.players[0].deck;
  assert.equal(deck[deck.length - 1].cardId, MIREGLASS, "the chosen card goes to the bottom");
  assert.equal(deck[0].cardId === MIREGLASS, false);
  assert.notEqual(deck[0].cardId, bottomBefore);
  assert.equal(result.state.players[0].hand[1].instanceId, result.events[0].drawn.instanceId);

  const second = run(result.state, { type: "mulligan", instanceId: "test0_1" });
  assert.equal(second.code, "MULLIGAN_USED");
  assert.equal(second.state, result.state);
});

test("failed mulligans leave the state byte-identical", () => {
  const state = prepare(matchWith(), { hand: [ASHEN], flux: 4 });
  const noDeck = structuredClone(state);
  noDeck.players[0].deck = [];
  const before = structuredClone(noDeck);
  const empty = run(noDeck, { type: "mulligan", instanceId: "test0_0" });
  assert.equal(empty.code, "DECK_EMPTY");
  assert.deepEqual(empty.state, before);

  const poor = prepare(matchWith(), { hand: [ASHEN], flux: 0 });
  const beforePoor = structuredClone(poor);
  const broke = run(poor, { type: "mulligan", instanceId: "test0_0" });
  assert.equal(broke.code, "INSUFFICIENT_FLUX");
  assert.deepEqual(broke.state, beforePoor);

  const missing = run(poor, { type: "mulligan", instanceId: "nope" });
  assert.equal(missing.code, "CARD_NOT_IN_HAND");
});

/* ----------------------------- integrity ----------------------------- */

test("stale, unknown and illegally-shaped commands never mutate state", () => {
  const state = prepare(matchWith(), { hand: [ASHEN], flux: 10 });
  const before = structuredClone(state);

  const stale = run(state, { type: "summon", instanceId: "test0_0", x: 3, y: 5, expectedVersion: 99 });
  assert.equal(stale.code, "STALE_STATE");
  assert.equal(stale.state, state);

  assert.equal(run(state, { type: "teleport" }).code, "UNKNOWN_COMMAND");
  assert.equal(run(state, {}).code, "INVALID_COMMAND");
  assert.equal(run(state, { type: "attack", unitId: "garbage", target: "nexus" }).code, "UNKNOWN_UNIT");
  assert.deepEqual(state, before);

  const accepted = run(state, { type: "summon", instanceId: "test0_0", x: 3, y: 5 });
  assert.equal(accepted.state.version, state.version + 1);
  assert.equal(state.players[0].hand.length, 1, "original state is untouched");
});

/* ----------------------------- deadline ----------------------------- */

test("commands at or after the deadline are rejected and the turn is passed", () => {
  const state = matchWith();

  const justInTime = applyCommand(state, { type: "endTurn" }, { now: DEADLINE - 1 });
  assert.equal(justInTime.ok, true);

  const late = applyCommand(state, { type: "endTurn" }, { now: DEADLINE });
  assert.equal(late.ok, false);
  assert.equal(late.code, "DEADLINE_PASSED");
  assert.equal(late.state.active, 1, "the turn was auto-passed deterministically");
  assert.equal(late.state.turn, 1);
  assert.deepEqual(
    late.events.map((e) => e.type),
    ["turnEnd", "turnStart", "draw"],
  );

  const ticked = applyCommand(state, { type: "timeout" }, { now: DEADLINE });
  assert.equal(ticked.ok, true);
  assert.equal(ticked.state.active, 1);

  const early = applyCommand(state, { type: "timeout" }, { now: START + 1000 });
  assert.equal(early.code, "DEADLINE_NOT_REACHED");
});

test("deadline expiry preserves committed actions and does not duplicate them", () => {
  const state = prepare(matchWith(), { hand: [ASHEN], flux: 10 });
  const summoned = run(state, { type: "summon", instanceId: "test0_0", x: 3, y: 5 });
  assert.equal(summoned.ok, true);

  const late = applyCommand(summoned.state, { type: "summon", instanceId: "test0_0", x: 4, y: 5 }, {
    now: summoned.state.deadlineAt,
  });
  assert.equal(late.code, "DEADLINE_PASSED");
  assert.equal(late.state.active, 1);
  assert.equal(unitsOf(late.state, 0).length, 1, "the accepted summon still exists");
  assert.equal(late.state.players[0].hand.length, 0);
  assert.equal(late.state.players[0].summonUsed, 1);
});

/* ----------------------------- fatigue ----------------------------- */

test("an empty deck causes escalating fatigue damage", () => {
  const base = matchWith();
  const state = structuredClone(base);
  state.players[1].deck = [];
  state.players[1].fatigue = 0;

  const first = run(state, { type: "endTurn" });
  assert.equal(first.state.players[1].vitality, 29);
  assert.equal(first.state.players[1].fatigue, 1);
  assert.ok(first.events.some((e) => e.type === "fatigue" && e.amount === 1));

  const back = run(first.state, { type: "endTurn" });
  const second = run(back.state, { type: "endTurn" });
  assert.equal(second.state.players[1].vitality, 27);
  assert.equal(second.state.players[1].fatigue, 2);
});

test("fatigue can end the match", () => {
  const state = structuredClone(matchWith());
  state.players[1].deck = [];
  state.players[1].fatigue = 29;
  state.players[1].vitality = 1;
  const result = run(state, { type: "endTurn" });
  assert.equal(result.state.phase, "over");
  assert.deepEqual(result.state.result, { winnerSeat: 0, reason: "vitality" });
});

/* ----------------------------- legal actions ----------------------------- */

test("legal action enumeration matches what the engine accepts", () => {
  const state = prepare(matchWith(), { hand: [MIREGLASS], flux: 2 });
  const actions = getLegalActions(state);
  assert.equal(actions.summons.length, 1);
  assert.equal(actions.summons[0].cells.length, 21, "three deployment rows of seven");
  const { x, y } = actions.summons[0].cells[0];
  assert.equal(run(state, { type: "summon", instanceId: "test0_0", x, y }).ok, true);

  const poor = prepare(matchWith(), { hand: [ASHEN], flux: 2 });
  assert.equal(getLegalActions(poor).summons.length, 0);
});

test("catalog definitions are never mutated by play", () => {
  const before = JSON.stringify(CATALOG.byId.get(ASHEN));
  const state = prepare(matchWith(), { hand: [ASHEN], flux: 10 });
  const result = run(state, { type: "summon", instanceId: "test0_0", x: 3, y: 5 });
  assert.equal(result.ok, true);
  assert.equal(JSON.stringify(CATALOG.byId.get(ASHEN)), before);
});
