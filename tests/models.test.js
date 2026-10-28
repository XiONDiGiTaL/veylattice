import test from "node:test";
import assert from "node:assert/strict";

import { ELEMENT_PALETTES, MODEL_IDS, VOXEL_MODELS, modelFor } from "../src/render/models.js";
import { BOARD_SIZE, CELL_COUNT, deploymentBounds } from "../src/game/constants.js";
import { CATALOG, RAW_VESSELS } from "./support.js";

const OFFICIAL_IDS = RAW_VESSELS.map((card) => card.id);

/** A rough silhouette signature: every box size and offset, order-independent. */
function silhouette(model) {
  return model.parts
    .map((p) => `${p.x},${p.y},${p.z}:${p.w}x${p.h}x${p.d}`)
    .sort()
    .join("|");
}

test("every official Vessel has its own model definition", () => {
  assert.equal(OFFICIAL_IDS.length, 18);
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

test("each model is a real multi-box construction with distinct grouped parts", () => {
  for (const id of MODEL_IDS) {
    const model = VOXEL_MODELS[id];
    assert.ok(model.parts.length >= 8, `${id} has only ${model.parts.length} boxes`);
    const groups = new Set(model.parts.map((part) => part.g));
    assert.ok(groups.size >= 2, `${id} has a single animation group`);
    const scale = model.scale ?? 1;
    assert.ok(scale >= 0.7 && scale <= 1.6, `${id} has an implausible scale ${scale}`);
    const heights = model.parts.map((part) => (part.y + part.h) * scale);
    assert.ok(Math.max(...heights) >= 6, `${id} is too short to read on a tile`);
    for (const part of model.parts) {
      assert.ok(part.w > 0 && part.h > 0 && part.d > 0, `${id} has a zero-sized box`);
      assert.ok(model.palette[part.c], `${id} uses unknown palette key ${part.c}`);
    }
  }
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
  // Every element carries at least three Vessels, so the visual language is exercised.
  for (const element of elements) {
    const count = MODEL_IDS.filter((id) => VOXEL_MODELS[id].element === element).length;
    assert.ok(count >= 3, `${element} only has ${count} models`);
  }
});

test("a missing model is reported, never silently replaced", () => {
  assert.equal(modelFor("vessel_not_a_thing"), null);
});

test("the board is 7x7 with two 21-tile deployment zones and one contested row", () => {
  assert.equal(BOARD_SIZE, 7);
  assert.equal(CELL_COUNT, 49);

  const human = deploymentBounds(0);
  const ai = deploymentBounds(1);
  assert.deepEqual(human, { min: 4, max: 6 });
  assert.deepEqual(ai, { min: 0, max: 2 });

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
  assert.equal(humanTiles.length, 21);
  assert.equal(aiTiles.length, 21);
  assert.equal(contested.length, 7);
  assert.equal(new Set([...humanTiles, ...aiTiles, ...contested]).size, 49);
  // Zone tints used by the UI follow the same split.
  assert.equal(contested.every((key) => Number(key.split(",")[1]) === 3), true);
});
