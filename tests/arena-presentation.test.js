import test from "node:test";
import assert from "node:assert/strict";
import { materialSettings, tileMarkers, disposeObjectResources } from "../src/render/arena-presentation.js";

test("voxel materials preserve canonical palette and differentiate metal, glass and glow", () => {
  const palette = { base: "#123456" };
  const matte = materialSettings({ c: "base", m: "cloth" }, palette);
  const metal = materialSettings({ c: "base", m: "metal" }, palette);
  assert.equal(metal.color, palette.base);
  assert.ok(metal.metalness > matte.metalness);
  assert.ok(metal.roughness < matte.roughness);
  assert.equal(materialSettings({ c: "base", m: "glass" }, palette).depthWrite, false);
  assert.ok(materialSettings({ c: "base", m: "glow" }, palette).emissiveIntensity > 0);
});

test("tile markers project supplied legal states without inventing targets", () => {
  assert.deepEqual(tileMarkers(), []);
  assert.deepEqual(tileMarkers({ legalMoves: [[1, 2], [1, 2]], legalAttacks: [[2, 3]], legalSummons: [[0, 4]], selected: { x: 1, y: 2 } }), [
    { kind: "move", x: 1, y: 2 }, { kind: "attack", x: 2, y: 3 }, { kind: "summon", x: 0, y: 4 }, { kind: "selected", x: 1, y: 2 },
  ]);
});

test("tile markers ignore out-of-bounds or malformed display coordinates", () => {
  assert.deepEqual(tileMarkers({ legalMoves: [[-1, 0], [5, 0], [0, 5], [0.5, 2], null], selected: { x: 99, y: 99 } }), []);
});

test("resource teardown keeps caller-owned textures such as cached card faces", () => {
  const calls = [];
  const kept = { isTexture: true, dispose: () => calls.push("kept") };
  const owned = { isTexture: true, dispose: () => calls.push("owned") };
  const material = { map: kept, emissiveMap: owned, dispose: () => calls.push("material") };
  const root = { traverse: (fn) => [{ material }].forEach(fn) };
  disposeObjectResources(root, new Set([kept]));
  assert.deepEqual(calls.sort(), ["material", "owned"], "a kept texture survives the sweep");
});

test("resource teardown handles shared resources and material arrays once", () => {
  const calls = [];
  const geometry = { dispose: () => calls.push("geometry") };
  const texture = { isTexture: true, dispose: () => calls.push("texture") };
  const material = { map: texture, emissiveMap: texture, dispose: () => calls.push("material") };
  const root = { traverse: (fn) => [{ geometry, material }, { geometry, material: [material] }].forEach(fn) };
  disposeObjectResources(root);
  assert.deepEqual(calls.sort(), ["geometry", "material", "texture"]);
});
