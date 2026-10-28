import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { ARENA, PROP_MODELS, TERRAIN_KINDS, arenaMap, propsAt, terrainAt } from "../src/render/terrain.js";
import { BOARD_SIZE, CELL_COUNT } from "../src/game/constants.js";

test("the arena covers all 49 logical tiles with a known kind", () => {
  const map = arenaMap();
  assert.equal(map.length, BOARD_SIZE);
  for (let y = 0; y < BOARD_SIZE; y += 1) {
    assert.equal(map[y].length, BOARD_SIZE);
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      const kind = terrainAt(x, y);
      assert.ok(TERRAIN_KINDS[kind.id], `unknown terrain at ${x},${y}`);
      assert.equal(kind.id, map[y][x]);
    }
  }
  let count = 0;
  for (let y = 0; y < BOARD_SIZE; y += 1) for (let x = 0; x < BOARD_SIZE; x += 1) count += 1;
  assert.equal(count, CELL_COUNT);
});

test("terrain is decorative and symmetric, so neither seat is visually favoured", () => {
  for (const kind of Object.values(TERRAIN_KINDS)) {
    assert.equal(kind.rules, "decorative", `${kind.id} claims rules this build does not have`);
    assert.equal(kind.walkableLook, true, `${kind.id} must not look impassable`);
  }
  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      assert.equal(
        terrainAt(x, y).id,
        terrainAt(BOARD_SIZE - 1 - x, BOARD_SIZE - 1 - y).id,
        `terrain at ${x},${y} is not rotationally symmetric`,
      );
    }
  }
});

test("props stay inside the board and reference real prop models", () => {
  let total = 0;
  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      for (const prop of propsAt(x, y)) {
        total += 1;
        assert.ok(PROP_MODELS[prop.kind], `unknown prop kind ${prop.kind}`);
        assert.equal(prop.model, PROP_MODELS[prop.kind]);
        assert.ok(prop.scale > 0 && prop.scale <= 2);
        assert.ok(prop.offsetZ < 0, "props must sit behind the unit, not in front of it");
      }
    }
  }
  assert.ok(total >= 10, "the arena needs scenery to read as a diorama");
});

test("every prop model is a small, valid, non-animated construction", () => {
  for (const [kind, model] of Object.entries(PROP_MODELS)) {
    assert.ok(model.parts.length >= 4, `${kind} is too simple to read`);
    for (const part of model.parts) {
      assert.ok(part.w > 0 && part.h > 0 && part.d > 0, `${kind} has a zero-sized box`);
      assert.ok(String(part.c).startsWith("#"), `${kind} props must carry explicit colours`);
    }
    assert.equal(model.idle, "none", `${kind} must not animate: it would compete with units`);
  }
});

test("the rules engine and AI never read arena decoration", async () => {
  for (const file of ["src/game/engine.js", "src/game/ai.js", "src/game/content.js"]) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.equal(
      /render\/terrain|terrainAt|propsAt|ARENA\b/.test(source),
      false,
      `${file} imports presentation terrain; terrain must stay decorative`,
    );
  }
});

test("the arena has an identity the battlefield can display", () => {
  assert.equal(typeof ARENA.name, "string");
  assert.ok(ARENA.name.length > 3);
  assert.equal(ARENA.id, "verdant_sanctum");
});
