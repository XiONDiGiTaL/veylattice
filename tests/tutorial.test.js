import test from "node:test";
import assert from "node:assert/strict";

import {
  TUTORIAL_STEPS,
  advanceTutorial,
  createTutorial,
  skipTutorial,
  tutorialStep,
} from "../src/ui/tutorial.js";

test("a new tutorial starts on its first step", () => {
  const tutorial = createTutorial();
  assert.equal(tutorial.step, 0);
  assert.equal(tutorial.done, false);
  assert.equal(tutorialStep(tutorial).id, TUTORIAL_STEPS[0].id);
});

test("unrelated events do not advance a step", () => {
  const tutorial = createTutorial();
  const next = advanceTutorial(tutorial, "nexusHit");
  assert.equal(next, tutorial);
  assert.equal(next.step, 0);
});

test("the step's own event advances it exactly once", () => {
  const tutorial = createTutorial();
  const after = advanceTutorial(tutorial, TUTORIAL_STEPS[0].advanceOn[0]);
  assert.equal(after.step, 1);
  assert.equal(tutorial.step, 0, "input must not be mutated");
});

test("ending the turn always advances, so no step can trap the player", () => {
  let tutorial = createTutorial();
  for (let i = 0; i < TUTORIAL_STEPS.length; i += 1) {
    const before = tutorial.step;
    tutorial = advanceTutorial(tutorial, "endTurn");
    assert.ok(tutorial.step > before, `step ${before} did not advance on endTurn`);
  }
  assert.equal(tutorial.done, true);
});

test("completing the last step finishes without overflowing", () => {
  let tutorial = createTutorial();
  for (const step of TUTORIAL_STEPS) {
    tutorial = advanceTutorial(tutorial, step.advanceOn[0]);
  }
  assert.equal(tutorial.done, true);
  assert.equal(tutorialStep(tutorial), null);
  assert.equal(advanceTutorial(tutorial, "summon").step, TUTORIAL_STEPS.length);
});

test("skipping marks the tutorial done and is idempotent", () => {
  const skipped = skipTutorial(createTutorial());
  assert.equal(skipped.done, true);
  assert.equal(skipped.skipped, true);
  assert.deepEqual(skipTutorial(skipped), skipped);
});

test("every step has a title, an explanation and an engine event to watch", () => {
  const engineEvents = new Set(["summon", "move", "attack", "playAction", "playRelic", "endTurn"]);
  for (const step of TUTORIAL_STEPS) {
    assert.ok(step.title.length > 4, `${step.id} needs a title`);
    assert.ok(step.body.length > 20, `${step.id} needs an explanation`);
    assert.ok(step.advanceOn.length > 0, `${step.id} has no advance trigger`);
    for (const trigger of step.advanceOn) {
      assert.ok(engineEvents.has(trigger), `${step.id} watches unknown event ${trigger}`);
    }
  }
  assert.equal(new Set(TUTORIAL_STEPS.map((s) => s.id)).size, TUTORIAL_STEPS.length);
});
