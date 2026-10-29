import test from "node:test";
import assert from "node:assert/strict";

import { BOARD_SIZE } from "../src/game/constants.js";
import { cameraForWidth, cellToWorld, fieldLayout, worldToCell } from "../src/render/arena3d.js";

test("tile <-> world mapping is bijective across the 5x5 grid", () => {
  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      const world = cellToWorld(x, y);
      assert.deepEqual(worldToCell(world.x, world.z), { x, y });
    }
  }
  assert.equal(worldToCell(99, 99), null, "clicks outside the board map to nothing");
  assert.equal(worldToCell(cellToWorld(0, 0).x, cellToWorld(0, 0).z).x, 0);
});

test("opponent and player fields are on opposite sides and never overlap the board", () => {
  const foe = fieldLayout(1);
  const mine = fieldLayout(0);
  assert.ok(foe.platform.z < 0 && mine.platform.z > 0, "fields sit on opposite sides");
  assert.ok(Math.abs(foe.platform.z) > (BOARD_SIZE / 2) * 1.15, "opponent platform is beyond the board edge");
  for (const layout of [foe, mine]) {
    assert.equal(layout.vessels.length, 4);
    assert.equal(layout.relics.length, 4);
    assert.equal(layout.actions.length, 4);
    const all = [...layout.vessels, ...layout.relics, ...layout.actions];
    const keys = new Set(all.map((s) => `${s.x},${s.z}`));
    assert.equal(keys.size, all.length, "no two field slots share a position");
    assert.notEqual(layout.discard.x, layout.vessels[0].x, "discard pile is not on a card slot");
  }
  assert.deepEqual(foe.vessels.map((s) => s.x), mine.vessels.map((s) => s.x), "both fields share slot columns");
});

test("camera: desktop is elevated three-quarter, narrow screens go more top-down", () => {
  const desktop = cameraForWidth(1200);
  const mobile = cameraForWidth(360);
  assert.equal(desktop.mobile, false);
  assert.equal(mobile.mobile, true);
  assert.ok(mobile.position[1] > desktop.position[1], "mobile camera is higher");
  assert.ok(mobile.position[2] < desktop.position[2], "mobile camera is closer to top-down");
});
