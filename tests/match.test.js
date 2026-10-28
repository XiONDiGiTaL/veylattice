import test from "node:test";
import assert from "node:assert/strict";

import { createMatch, getLegalActions, unitsOf } from "../src/game/engine.js";
import { CATALOG, START, run, seededRng } from "./support.js";

/**
 * Greedy scripted driver used only as an integration harness: it may only
 * submit commands through the public engine, exactly like the HUD does.
 */
function playMatch(seed, maxSteps = 5000) {
  let state = createMatch({ catalog: CATALOG, rng: seededRng(seed), now: START });
  let steps = 0;
  let maxUnitsSeen = 0;

  while (state.phase !== "over" && steps < maxSteps) {
    steps += 1;
    const seat = state.active;

    const actions = getLegalActions(state);
    if (actions.summons.length > 0) {
      const { instanceId, cells } = actions.summons[0];
      const cell = cells[0];
      const result = run(state, { type: "summon", instanceId, x: cell.x, y: cell.y });
      if (result.ok) state = result.state;
    }

    for (const unit of getLegalActions(state).units) {
      if (unit.attacks.length === 0) continue;
      const target = unit.attacks[0];
      const command =
        target.type === "nexus"
          ? { type: "attack", unitId: unit.unitId, target: "nexus" }
          : { type: "attack", unitId: unit.unitId, targetId: target.unitId };
      const result = run(state, command);
      if (result.ok) state = result.state;
    }

    for (const unit of getLegalActions(state).units) {
      if (unit.moves.length === 0) continue;
      const sorted = [...unit.moves].sort((a, b) => (seat === 0 ? a.y - b.y : b.y - a.y));
      const destination = sorted[0];
      const result = run(state, { type: "move", unitId: unit.unitId, x: destination.x, y: destination.y });
      if (result.ok) state = result.state;
    }

    maxUnitsSeen = Math.max(maxUnitsSeen, unitsOf(state, 0).length, unitsOf(state, 1).length);
    if (state.phase !== "over") state = run(state, { type: "endTurn" }).state;
  }

  return { state, steps, maxUnitsSeen };
}

test("a complete match can be played to an honest end state through public commands only", () => {
  const { state, steps, maxUnitsSeen } = playMatch(11);
  assert.equal(state.phase, "over", `match did not finish within ${steps} steps`);
  assert.ok(steps < 5000);
  assert.ok(maxUnitsSeen <= 4, "the four-Vessel cap was never exceeded");
  assert.ok(state.result !== null);
  assert.ok(["vitality", "fatigue", "surrender", "simultaneous"].includes(state.result.reason));
  if (state.result.winnerSeat !== null) {
    const loser = state.players[1 - state.result.winnerSeat];
    assert.ok(loser.vitality <= 0, "the losing seat is at or below zero Vitality");
  }
  assert.equal(state.deadlineAt, null);
  for (const unit of Object.values(state.units)) {
    assert.equal(state.board[unit.y * 7 + unit.x], unit.id, "board and unit registry agree");
    assert.ok(unit.guard > 0, "no defeated Vessel is left on the board");
  }
  assert.ok(CATALOG.byId.size >= 18);
});

function fingerprint(state) {
  return JSON.stringify({
    turn: state.turn,
    result: state.result,
    board: state.board,
    units: state.units,
    players: state.players.map((p) => ({
      vitality: p.vitality,
      flux: p.flux,
      hand: p.hand,
      deck: p.deck,
      discard: p.discard,
    })),
  });
}

test("the same seed reproduces the same match, and different seeds diverge", () => {
  const a = playMatch(21).state;
  const b = playMatch(21).state;
  assert.equal(a.turn, b.turn);
  assert.deepEqual(a.result, b.result);
  assert.equal(fingerprint(a), fingerprint(b), "same seed must replay identically");

  const c = playMatch(22).state;
  assert.notEqual(fingerprint(c), fingerprint(a), "different seeds should not produce an identical match");
});
