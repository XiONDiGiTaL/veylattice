import test from "node:test";
import assert from "node:assert/strict";

import { BOARD_SIZE } from "../src/game/constants.js";
import {
  CARD_ASPECT,
  CARD_HEIGHT,
  CARD_WIDTH,
  cameraForWidth,
  cardAnchor,
  cellToWorld,
  fieldLayout,
  worldToCell,
} from "../src/render/arena3d.js";

test("formation cards keep the approved 214:300 shape and stand at the table's edge", () => {
  assert.ok(Math.abs(CARD_WIDTH / CARD_HEIGHT - 214 / 300) < 1e-9, "card slots are never stretched");
  assert.ok(Math.abs(CARD_ASPECT - 300 / 214) < 1e-9);
  const anchor = cardAnchor({ x: 0, z: 4 });
  assert.ok(anchor.y > 0.3, "the card body clears the table surface");
  assert.ok(anchor.z > 4, "the leaning card's foot moves toward the viewer (seat 0)");
});

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

test("camera: desktop frames both formations, narrow screens frame the grid", () => {
  const desktop = cameraForWidth(1200);
  const mobile = cameraForWidth(360);
  assert.equal(desktop.mobile, false);
  assert.equal(mobile.mobile, true);
  // Desktop holds all eight slots of both seats in one frame, so its eye line
  // is raised and pulled back. Phones hand the eight slots to the DOM rails
  // and come in close on the 5x5 grid instead, which is the difference these
  // two assertions lock in: a lower, nearer eye, still looking down.
  assert.ok(mobile.position[1] < desktop.position[1], "mobile eye is lower");
  assert.ok(mobile.position[2] < desktop.position[2], "mobile eye is nearer the board");
  for (const preset of [desktop, mobile]) {
    assert.ok(preset.position[1] > preset.lookAt[1], "both presets look down at the table");
    assert.ok(preset.position[2] > preset.lookAt[2], "both sit on seat 0's side of the board");
  }
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
