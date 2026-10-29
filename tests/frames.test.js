import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { FRAME_CANVAS, FRAME_GEOMETRY, frameKeyFor } from "../src/render/approved-frame.js";
import { CATALOG } from "./support.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");

function pngSize(buffer) {
  // PNG IHDR: bytes 16-19 width, 20-23 height, big-endian.
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

test("approved overlays exist at the manifest canvas size and match the manifest", () => {
  const manifest = JSON.parse(readFileSync(path.join(root, "CardFrames", "frame-manifest.json"), "utf8"));
  assert.equal(manifest.canvas.width, FRAME_CANVAS.width);
  assert.equal(manifest.canvas.height, FRAME_CANVAS.height);
  for (const [key, geometry] of Object.entries(FRAME_GEOMETRY)) {
    const manifestFrame = manifest.frames[key];
    assert.ok(manifestFrame, `manifest missing frame ${key}`);
    assert.deepEqual(geometry.art, manifestFrame.art, `art aperture drift for ${key}`);
    const buffer = readFileSync(path.join(root, geometry.overlay));
    const size = pngSize(buffer);
    assert.equal(size.width, FRAME_CANVAS.width, `${key} overlay width`);
    assert.equal(size.height, FRAME_CANVAS.height, `${key} overlay height`);
    assert.ok(buffer.length > 1000, `${key} overlay is not an empty file`);
  }
});

test("frame mapping: five elements plus Action; Relics have no approved frame (pending)", () => {
  for (const element of ["wood", "fire", "earth", "metal", "water"]) {
    const vessel = CATALOG.cards.find((c) => c.category === "vessel" && c.element === element);
    assert.ok(vessel, `no ${element} vessel in catalog`);
    assert.equal(frameKeyFor(vessel), element);
  }
  const action = CATALOG.cards.find((c) => c.category === "action");
  assert.equal(frameKeyFor(action), "action");
  const relic = CATALOG.cards.find((c) => c.category === "relic");
  assert.ok(relic);
  assert.equal(frameKeyFor(relic), null, "Relics must not silently borrow a Vessel frame");
});

test("every catalog card resolves to a frame or an explicit Relic-pending state", () => {
  for (const card of CATALOG.cards) {
    const key = frameKeyFor(card);
    if (card.category === "relic") assert.equal(key, null);
    else assert.ok(FRAME_GEOMETRY[key], `${card.id} has no frame`);
  }
});
