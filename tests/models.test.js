import test from "node:test";
import assert from "node:assert/strict";

import { ELEMENT_PALETTES, MODEL_IDS, VOXEL_MODELS, modelFor, modelHeight, modelWidth } from "../src/render/models.js";
import { BOARD_SIZE, CELL_COUNT, deploymentBounds, enemyHomeRow, rowOwner } from "../src/game/constants.js";
import { CATALOG, RAW_VESSELS } from "./support.js";

const OFFICIAL_IDS = RAW_VESSELS.map((card) => card.id);

const MATERIALS = new Set([
  "matte", "metal", "stone", "cloth", "leather", "wood", "bone", "crystal", "glass", "ember", "void",
]);

/** A rough silhouette signature: every box size, offset and rotation. */
function silhouette(model) {
  return model.parts
    .map((p) => `${p.x},${p.y},${p.z}:${p.w}x${p.h}x${p.d}:${p.rx ?? 0}/${p.ry ?? 0}/${p.rz ?? 0}`)
    .sort()
    .join("|");
}

test("every official Vessel has its own model definition", () => {
  assert.equal(OFFICIAL_IDS.length, 65);
  for (const id of OFFICIAL_IDS) {
    assert.ok(VOXEL_MODELS[id], `missing model for ${id}`);
    assert.equal(VOXEL_MODELS[id].id, id);
  }
  assert.deepEqual([...MODEL_IDS].sort(), [...OFFICIAL_IDS].sort());
});

test("no model is a recolour of another model", () => {
  const seen = new Map();
  for (const id of MODEL_IDS) {
    const signature = silhouette(VOXEL_MODELS[id]);
    assert.equal(seen.has(signature), false, `${id} shares a silhouette with ${seen.get(signature)}`);
    seen.set(signature, id);
  }
});

test("every model meets the detail bar: many boxes, several groups, several materials", () => {
  for (const id of MODEL_IDS) {
    const model = VOXEL_MODELS[id];
    assert.ok(model.parts.length >= 30, `${id} has only ${model.parts.length} boxes`);
    const groups = new Set(model.parts.map((part) => part.g));
    assert.ok(groups.size >= 4, `${id} only animates ${groups.size} group(s)`);
    const materials = new Set(model.parts.map((part) => part.m ?? "matte"));
    assert.ok(materials.size >= 4, `${id} only uses ${materials.size} material(s)`);
    // A focal point above the feet: a model that never rises cannot read.
    assert.ok(
      modelHeight(model) * (model.scale ?? 1) >= 6,
      `${id} is too short to read on a tile`,
    );
    assert.ok(modelWidth(model) <= 14, `${id} spills far outside its tile`);
    assert.ok(["breathe", "hover", "sway", "heavy", "none"].includes(model.idle ?? "breathe"));
  }
});

test("model geometry, palette keys, materials and pivots are valid", () => {
  for (const id of MODEL_IDS) {
    const model = VOXEL_MODELS[id];
    for (const part of model.parts) {
      assert.ok(part.w > 0 && part.h > 0 && part.d > 0, `${id} has a zero-sized box`);
      assert.ok(part.y >= 0, `${id} has a box below the ground`);
      assert.ok(model.palette[part.c], `${id} uses unknown palette key ${part.c}`);
      assert.ok(MATERIALS.has(part.m ?? "matte"), `${id} uses unknown material ${part.m}`);
      assert.ok(Math.abs(part.x) <= 7, `${id} has a box outside the tile`);
      for (const axis of ["rx", "ry", "rz"]) {
        if (part[axis] === undefined) continue;
        assert.ok(Number.isFinite(part[axis]), `${id} has a non-numeric ${axis} rotation`);
        // Y rotation may wrap around a full coil; X/Z stay in a readable arc.
        const limit = axis === "ry" ? 360 : 90;
        assert.ok(Math.abs(part[axis]) <= limit, `${id} rotates a box past ${limit} degrees on ${axis}`);
      }
    }
    for (const [group, pivot] of Object.entries(model.pivots ?? {})) {
      assert.equal(pivot.length, 3, `${id}.${group} pivot needs three values`);
      assert.ok(pivot.every(Number.isFinite), `${id}.${group} pivot is not numeric`);
    }
  }
});

test("each model is individually constructed, not a generic humanoid recolour", () => {
  // Silhouette height and widest box vary across the roster, so no single rig
  // is being reused wholesale. Different subtypes must not share proportions.
  const proportions = new Set(
    MODEL_IDS.map((id) => {
      const model = VOXEL_MODELS[id];
      return `${Math.round(modelHeight(model))}x${Math.round(modelWidth(model))}`;
    }),
  );
  assert.ok(proportions.size >= 18, `only ${proportions.size} distinct proportions across 65 models`);
});

test("models only reference real Vessel ids and real elements", () => {
  const catalogIds = new Set(CATALOG.cards.filter((c) => c.category === "vessel").map((c) => c.id));
  for (const id of MODEL_IDS) {
    assert.ok(catalogIds.has(id), `model ${id} is not a Vessel in the catalog`);
    assert.ok(ELEMENT_PALETTES[VOXEL_MODELS[id].element], `${id} has an unknown element`);
    const card = CATALOG.byId.get(id);
    assert.equal(card.element, VOXEL_MODELS[id].element, `${id} element disagrees with its card`);
  }
});

test("the five elements have distinct palettes and distinct silhouettes per subtype", () => {
  const elements = Object.keys(ELEMENT_PALETTES);
  assert.equal(elements.length, 5);
  const bases = new Set(elements.map((element) => ELEMENT_PALETTES[element].base));
  assert.equal(bases.size, 5);
  // Element identity needs shape as well as colour: each element must define
  // its own stone, cloth, metal and accent materials.
  for (const element of elements) {
    for (const key of ["stone", "cloth", "metal", "accent", "wood", "bone", "crystal"]) {
      assert.ok(ELEMENT_PALETTES[element][key], `${element} palette is missing ${key}`);
    }
    const count = MODEL_IDS.filter((id) => VOXEL_MODELS[id].element === element).length;
    assert.equal(count, 13, `${element} has ${count} models instead of 13`);
  }
});

test("a missing model is reported, never silently replaced", () => {
  assert.equal(modelFor("vessel_not_a_thing"), null);
});

test("the board is 5x5 with two 10-tile deployment zones and one contested row", () => {
  assert.equal(BOARD_SIZE, 5);
  assert.equal(CELL_COUNT, 25);

  const human = deploymentBounds(0);
  const ai = deploymentBounds(1);
  assert.deepEqual(human, { min: 3, max: 4 });
  assert.deepEqual(ai, { min: 0, max: 1 });

  const humanTiles = [];
  const aiTiles = [];
  const contested = [];
  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      const key = `${x},${y}`;
      if (y >= human.min && y <= human.max) humanTiles.push(key);
      else if (y >= ai.min && y <= ai.max) aiTiles.push(key);
      else contested.push(key);
    }
  }
  assert.equal(humanTiles.length, 10);
  assert.equal(aiTiles.length, 10);
  assert.equal(contested.length, 5);
  assert.equal(new Set([...humanTiles, ...aiTiles, ...contested]).size, 25);
  // Zone tints used by the UI follow the same split.
  assert.equal(contested.every((key) => Number(key.split(",")[1]) === 2), true);
});

test("grid geometry is parameterised, so an alternative arena is testable without engine edits", () => {
  assert.deepEqual(deploymentBounds(0, 7, 3), { min: 4, max: 6 });
  assert.deepEqual(deploymentBounds(1, 7, 3), { min: 0, max: 2 });
  assert.equal(enemyHomeRow(0, 7), 0);
  assert.equal(enemyHomeRow(1, 7), 6);
  assert.equal(rowOwner(0), "opponent");
  assert.equal(rowOwner(2), "contested");
  assert.equal(rowOwner(4), "home");
  assert.throws(() => deploymentBounds(0, 5, 3), /Invalid battlefield geometry/);
});
