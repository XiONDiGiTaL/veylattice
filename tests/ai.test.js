/**
 * M2-003 AI tests.
 *
 * These check the three AI guarantees rather than "the AI is smart":
 * information isolation, bounded decisions, and legality through the engine.
 * A separate crafted position checks that difficulty actually changes
 * decision quality.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  AI_DIFFICULTIES,
  buildCandidates,
  buildObservation,
  choosePlan,
  decideNextCommands,
  evaluatePlan,
  resolveArchetype,
} from "../src/game/ai.js";
import { applyCommand } from "../src/game/engine.js";
import { buildPracticeDeck } from "../src/game/content.js";
import { CATALOG, START, matchWith, place, prepare, run, seededRng } from "./support.js";

const PRACTICE = buildPracticeDeck(CATALOG);

function baseMatch(options = {}) {
  return matchWith({ decks: [PRACTICE, PRACTICE], seed: 11, ...options });
}

/* ---------------------------------------------------------------- *
 * Information isolation
 * ---------------------------------------------------------------- */

test("the observation never contains opponent hand or deck contents", () => {
  let state = baseMatch();
  state.players[1].hand = [
    { instanceId: "secret_a", cardId: "vessel_star_eater" },
    { instanceId: "secret_b", cardId: "vessel_wyrm_drowned_vault" },
  ];
  state.players[1].deck = [{ instanceId: "secret_c", cardId: "vessel_unwritten_guest" }];

  const observation = buildObservation(state, 0);
  const serialized = JSON.stringify(observation);

  for (const hidden of ["secret_a", "secret_b", "secret_c"]) {
    assert.ok(!serialized.includes(hidden), `observation leaked ${hidden}`);
  }
  assert.deepEqual(Object.keys(observation.foe).sort(), [
    "deckCount",
    "discardCount",
    "handCount",
    "nexusArmor",
    "relicCount",
    "relicEffectKinds",
    "unitCount",
    "vitality",
    "ward",
  ]);
  assert.equal(observation.foe.handCount, 2);
  assert.equal(observation.foe.deckCount, 1);
  assert.ok(Array.isArray(observation.own.hand), "own hand is legitimately visible");
});

test("changing hidden opponent cards cannot change the AI's plan", () => {
  const base = place(baseMatch(), 1, "vessel_bastion_first_mountain", 3, 2).state;
  const withHiddenA = structuredClone(base);
  withHiddenA.players[1].hand = [{ instanceId: "h1", cardId: "vessel_star_eater" }];
  const withHiddenB = structuredClone(base);
  withHiddenB.players[1].hand = [{ instanceId: "h2", cardId: "vessel_mireglass_stalker" }];

  const options = { difficulty: "veteran", archetype: "conductor", rng: seededRng(5) };
  const obsA = buildObservation(withHiddenA, 0);
  const obsB = buildObservation(withHiddenB, 0);
  assert.deepEqual(obsA, obsB, "observations differ only in what is hidden");

  const candidatesA = buildCandidates(withHiddenA, 0, options);
  const candidatesB = buildCandidates(withHiddenB, 0, options);
  assert.deepEqual(candidatesA, candidatesB, "candidate plans are identical");

  const planA = choosePlan(candidatesA, obsA, options);
  const planB = choosePlan(candidatesB, obsB, options);
  assert.deepEqual(planA.commands, planB.commands);
});

/* ---------------------------------------------------------------- *
 * Determinism and bounds
 * ---------------------------------------------------------------- */

test("the same seed and state produce the same command", () => {
  const state = baseMatch();
  const decision = () =>
    decideNextCommands(state, 0, { difficulty: "standard", rng: seededRng(42) }).commands;
  assert.deepEqual(decision(), decision());
  assert.ok(decision().length > 0);
});

test("decisions respect the time budget and report truncation", () => {
  let state = baseMatch();
  for (let i = 0; i < 3; i += 1) {
    const placed = place(state, 0, "vessel_mireglass_stalker", i, 5);
    state = placed.state;
  }
  const placedEnemy = place(state, 1, "vessel_bastion_first_mountain", 3, 2);
  state = placedEnemy.state;

  let clock = 0;
  const advancingNow = () => {
    clock += 3;
    return clock;
  };
  const observation = buildObservation(state, 0);
  const candidates = buildCandidates(state, 0, { difficulty: "veteran" });
  assert.ok(candidates.length > 12, "enough candidates to exceed the budget");
  const plan = choosePlan(candidates, observation, {
    difficulty: "veteran",
    now: advancingNow,
    timeBudgetMs: 4,
    rng: seededRng(1),
  });

  assert.ok(plan, "a bounded search still returns the best plan found so far");
  assert.equal(plan.truncated, true, "the budget stopped the sweep early");
  assert.ok(plan.considered <= 10, `considered ${plan.considered} candidates inside a 4 ms budget`);
});

test("a zero budget still returns a legal plan instead of hanging", () => {
  const state = baseMatch();
  const observation = buildObservation(state, 0);
  const candidates = buildCandidates(state, 0, { difficulty: "master" });
  const plan = choosePlan(candidates, observation, {
    difficulty: "master",
    now: () => Date.now() + 10_000,
    timeBudgetMs: 0,
    rng: seededRng(2),
  });
  assert.ok(plan === null || Array.isArray(plan.commands));
  const result = plan
    ? applyCommand(state, plan.commands[0], { now: START + 500 })
    : applyCommand(state, { type: "endTurn" }, { now: START + 500 });
  assert.equal(result.ok, true, "the fallback is a legal command");
});

/* ---------------------------------------------------------------- *
 * Legality through the engine
 * ---------------------------------------------------------------- */

test("an AI-versus-AI match only ever submits accepted commands", () => {
  let state = matchWith({ decks: [PRACTICE, PRACTICE], seed: 3 });
  let steps = 0;
  let rejections = 0;
  let maxUnits = 0;

  while (state.phase !== "over" && steps < 1200) {
    const { commands } = decideNextCommands(state, state.active, {
      difficulty: "novice",
      archetype: "vanguard",
      rng: seededRng(steps + 1),
      timeBudgetMs: 4,
    });
    assert.ok(commands.length > 0, "the AI always produces a command");
    for (const command of commands) {
      const result = applyCommand(state, command, { now: START + 1000 });
      if (!result.ok) {
        rejections += 1;
        break;
      }
      state = result.state;
      assert.ok(state.players[0].vitality <= 30 && state.players[1].vitality <= 30);
    }
    maxUnits = Math.max(maxUnits, Object.keys(state.units).length);
    steps += 1;
  }

  assert.equal(rejections, 0, "no AI command was rejected by the engine");
  assert.equal(state.phase, "over", `match ended honestly after ${steps} decisions`);
  assert.ok(maxUnits <= 8, "both seats stay inside the four-Vessel cap");
});

test("a spent Vessel is never offered as a move-then-attack plan", () => {
  // Regression: `attacksFromCell` reasons about geometry only, so a unit that
  // had already attacked could still be proposed for move+attack on the
  // standard difficulty, and the engine rejected the second command.
  let state = place(baseMatch(), 0, "vessel_ashen_crownblade", 2, 3).state;
  state = place(state, 1, "vessel_mireglass_stalker", 2, 2).state;
  const attacker = Object.values(state.units).find((u) => u.owner === 0);
  attacker.hasAttacked = true;

  const plans = buildCandidates(state, 0, { difficulty: "standard" });
  const spent = plans.filter((plan) =>
    plan.commands.some((command) => command.type === "attack" && command.unitId === attacker.id),
  );
  assert.deepEqual(spent, [], "no attack plan may come from a unit that already attacked");
  for (const plan of plans) {
    for (const command of plan.commands) {
      assert.equal(applyCommand(state, command, { now: START + 1000 }).ok, true, `${plan.kind} was rejected`);
    }
  }
});

/* ---------------------------------------------------------------- *
 * Decision quality differences
 * ---------------------------------------------------------------- */

test("a veteran refuses a suicidal trade that a novice underrates", () => {
  let state = baseMatch();
  state.players[0].flux = 10;
  const ours = place(state, 0, "vessel_hollowroot_oracle", 3, 4);
  state = ours.state;
  const theirs = place(state, 1, "vessel_cinder_maw", 3, 3);
  state = theirs.state;

  const observation = buildObservation(state, 0);
  const attackPlan = {
    kind: "attack",
    unitId: ours.unitId,
    target: { type: "unit", unitId: theirs.unitId },
    commands: [{ type: "attack", unitId: ours.unitId, targetId: theirs.unitId }],
  };
  const weights = resolveArchetype("warden");
  const novice = evaluatePlan(attackPlan, observation, AI_DIFFICULTIES.novice, weights);
  const veteran = evaluatePlan(attackPlan, observation, AI_DIFFICULTIES.veteran, weights);

  assert.equal(novice.kills, false);
  assert.equal(veteran.attackerDies, true, "the veteran predicts the lethal retaliation");
  assert.ok(
    veteran.score < novice.score,
    `veteran ${veteran.score.toFixed(2)} should rate the losing trade below novice ${novice.score.toFixed(2)}`,
  );
});

test("a veteran finds a lethal move-then-strike line that a novice cannot", () => {
  let state = baseMatch({ seed: 21 });
  state = run(state, { type: "endTurn" }).state;
  assert.equal(state.active, 1, "seat 2 is to act");
  state.players[0].vitality = 3;

  const placed = place(state, 1, "vessel_mireglass_stalker", 3, 4);
  state = placed.state;

  const novice = decideNextCommands(state, 1, {
    difficulty: "novice",
    rng: seededRng(9),
  });
  const veteran = decideNextCommands(state, 1, {
    difficulty: "veteran",
    rng: seededRng(9),
  });

  assert.notEqual(veteran.plan?.kind, "nexusAttack", "the strike requires a preceding move");
  assert.equal(veteran.plan?.kind, "moveAttack");
  assert.ok(
    veteran.commands.some((c) => c.type === "attack" && c.target === "nexus"),
    "the veteran plans a Nexus strike",
  );

  let after = state;
  for (const command of veteran.commands) {
    const result = applyCommand(after, command, { now: START + 1000 });
    assert.equal(result.ok, true, `engine accepted ${command.type}`);
    after = result.state;
  }
  assert.equal(after.phase, "over");
  assert.equal(after.result.winnerSeat, 1, "the line is actually lethal");

  const noviceCanStrike = novice.commands.some((c) => c.type === "attack" && c.target === "nexus");
  assert.equal(noviceCanStrike, false, "novice has no move-then-attack search");
});

test("the AI ends its turn when it has no useful legal action", () => {
  let state = baseMatch();
  state = run(state, { type: "endTurn" }).state;
  const starved = prepare(state, { seat: 1, hand: ["vessel_star_eater"], flux: 1 });
  const { commands, plan } = decideNextCommands(starved, 1, {
    difficulty: "veteran",
    rng: seededRng(4),
  });
  assert.ok(commands.length > 0);
  for (const command of commands) {
    const result = applyCommand(starved, command, { now: START + 1000 });
    assert.equal(result.ok, true, `${command.type} was accepted`);
  }
  assert.ok(
    ["endTurn", "mulligan"].includes(plan.kind),
    `expected to pass or mulligan, got ${plan.kind}`,
  );
});

test("the AI does nothing when it is not the active seat or the match is over", () => {
  const state = baseMatch();
  assert.deepEqual(decideNextCommands(state, 1).commands, []);
  const over = structuredClone(state);
  over.phase = "over";
  assert.deepEqual(decideNextCommands(over, 0).commands, []);
});
