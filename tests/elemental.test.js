import test from "node:test";
import assert from "node:assert/strict";

import {
  ELEMENTS,
  damageFor,
  describeRelation,
  isElement,
  overcomes,
  previewDamage,
  relation,
} from "../src/game/elemental-rules.js";

// Explicit reference cycle from GAME_RULES.md. Kept independent of the
// implementation's own table so the test can actually fail.
const CYCLE = [
  ["wood", "earth"],
  ["earth", "water"],
  ["water", "fire"],
  ["fire", "metal"],
  ["metal", "wood"],
];

function expectedRelation(attacker, defender) {
  if (CYCLE.some(([a, b]) => a === attacker && b === defender)) return "advantage";
  if (CYCLE.some(([a, b]) => a === defender && b === attacker)) return "disadvantage";
  return "neutral";
}

test("element list is the canonical five", () => {
  assert.deepEqual([...ELEMENTS], ["wood", "fire", "earth", "metal", "water"]);
  assert.equal(isElement("water"), true);
  assert.equal(isElement("aether"), false);
});

test("all 25 element pairs resolve to the canonical relation and damage", () => {
  assert.equal(ELEMENTS.length, 5);
  let checked = 0;
  for (const attacker of ELEMENTS) {
    for (const defender of ELEMENTS) {
      const expected = expectedRelation(attacker, defender);
      assert.equal(relation(attacker, defender), expected, `${attacker}->${defender}`);
      assert.equal(overcomes(attacker, defender), expected === "advantage", `${attacker}->${defender}`);

      const attack = 10;
      const damage = damageFor(attack, attacker, defender);
      if (expected === "advantage") assert.equal(damage, 15, `${attacker}->${defender} advantage`);
      else if (expected === "disadvantage") assert.equal(damage, 5, `${attacker}->${defender} disadvantage`);
      else assert.equal(damage, 10, `${attacker}->${defender} neutral`);
      checked += 1;
    }
  }
  assert.equal(checked, 25);
});

test("rounding happens once with floor semantics and minimum values", () => {
  assert.equal(damageFor(3, "wood", "earth"), 4); // floor(4.5)
  assert.equal(damageFor(7, "wood", "earth"), 10); // floor(10.5)
  assert.equal(damageFor(5, "wood", "earth"), 7); // floor(7.5)
  assert.equal(damageFor(3, "earth", "wood"), 1); // max(1, floor(1.5))
  assert.equal(damageFor(1, "earth", "wood"), 1); // max(1, floor(0.5))
  assert.equal(damageFor(0, "earth", "wood"), 1); // documented minimum-1 floor
  assert.equal(damageFor(9, "fire", "fire"), 9); // same element is neutral
  assert.equal(damageFor(9, "fire", "earth"), 9); // unconnected pair is neutral
  assert.equal(damageFor(-4, "fire", "metal"), 0); // defensively clamped
});

test("preview exposes damage and a human-readable reason", () => {
  const preview = previewDamage(4, "water", "fire");
  assert.equal(preview.damage, 6);
  assert.equal(preview.relation, "advantage");
  assert.match(preview.reason, /water overcomes fire/i);
  assert.match(describeRelation("fire", "water"), /resists/i);
  assert.match(describeRelation("fire", "earth"), /neutral/i);
});
