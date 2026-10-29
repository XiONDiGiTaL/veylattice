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

test("camera preset at yaw 0 sits on the player's (seat 0, +z) side, not rotated onto the x axis", async () => {
  const { cameraPosition, cameraForWidth: preset } = await import("../src/render/arena3d.js");
  for (const width of [1200, 390]) {
    const p = preset(width);
    const [x, y, z] = cameraPosition(p, 0);
    assert.ok(Math.abs(x - p.position[0]) < 1e-9, "x unchanged at yaw 0");
    assert.ok(Math.abs(y - p.position[1]) < 1e-9);
    assert.ok(Math.abs(z - p.position[2]) < 1e-9, "z unchanged at yaw 0");
    assert.ok(z > 0, "camera on seat 0's near side");
  }
  const [x90, , z90] = cameraPosition(preset(1200), Math.PI / 2);
  assert.ok(x90 > 0 && Math.abs(z90) < 1e-9, "yaw orbits around Y");
});

test("render loop draws only when visible and changed or animating", async () => {
  const { arenaShouldDraw } = await import("../src/render/arena3d.js");
  const base = { documentHidden: false, containerDisplayed: true, onScreen: true, dirty: false, animating: false };
  assert.equal(arenaShouldDraw(base), false, "idle and unchanged: no draw");
  assert.equal(arenaShouldDraw({ ...base, dirty: true }), true);
  assert.equal(arenaShouldDraw({ ...base, animating: true }), true);
  assert.equal(arenaShouldDraw({ ...base, dirty: true, containerDisplayed: false }), false, "hidden view (menu / classic grid)");
  assert.equal(arenaShouldDraw({ ...base, dirty: true, onScreen: false }), false, "scrolled off-screen");
  assert.equal(arenaShouldDraw({ ...base, animating: true, documentHidden: true }), false, "background tab");
});
