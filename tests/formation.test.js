/**
 * Formation card-face tests (ARENA-R2, 2026-11-04).
 *
 * These cover the eight persistent slots per seat (two rows of four) and the
 * approved-frame geometry the DOM rows and the 3D arena both paint from. They
 * assert presentation only: legality, occupancy and stats come from the engine.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { FRAME_CANVAS, FRAME_GEOMETRY } from "../src/render/approved-frame.js";
import { faceGeometry, faceModel, truncateToWidth } from "../src/render/formation-face.js";
import { MAX_RELICS_PER_SEAT, MAX_UNITS_PER_SEAT } from "../src/game/constants.js";
import { ACTION_SLOTS, FORMATION_ROWS, FORMATION_SIZE, VESSEL_SLOTS, formationSlots } from "../src/ui/fields.js";
import { CATALOG, matchWith, place } from "./support.js";

const ASHEN = "vessel_ashen_crownblade";
const LENS = "relic_ember_lens";
const effectText = (card) => `${card.category} effect`;

test("each seat projects exactly eight persistent slots, two rows of four", () => {
  const match = matchWith();
  assert.equal(FORMATION_SIZE, 8);
  assert.deepEqual([...FORMATION_ROWS], ["vessel", "relic"]);
  assert.equal(VESSEL_SLOTS + ACTION_SLOTS, FORMATION_SIZE);
  assert.equal(FORMATION_SIZE, MAX_UNITS_PER_SEAT + MAX_RELICS_PER_SEAT);

  for (const seat of [0, 1]) {
    const slots = formationSlots(match, seat, CATALOG, { effectText });
    assert.equal(slots.length, 8);
    assert.equal(slots.filter((slot) => slot.kind === "vessel").length, 4);
    assert.equal(slots.filter((slot) => slot.kind === "relic").length, 4);
    assert.deepEqual(slots.map((slot) => slot.row), [0, 0, 0, 0, 1, 1, 1, 1]);
    assert.deepEqual(slots.map((slot) => slot.index), [0, 1, 2, 3, 0, 1, 2, 3]);
    assert.equal(slots.every((slot) => slot.occupied === false), true);
    assert.equal(new Set(slots.map((slot) => slot.key)).size, 8, "slot keys are unique");
  }
  assert.equal(formationSlots(null, 0, CATALOG).length, 8, "a missing match still projects eight slots");
});

test("a placed Vessel fills one Vessel row slot with its card and live unit", () => {
  const base = matchWith();
  const placed = place(base, 0, ASHEN, 2, 4);
  const slots = formationSlots(placed.state, 0, CATALOG, { effectText });
  const filled = slots.filter((slot) => slot.occupied);
  assert.equal(filled.length, 1);
  assert.equal(filled[0].kind, "vessel");
  assert.equal(filled[0].row, 0);
  assert.equal(filled[0].card.id, ASHEN);
  assert.equal(filled[0].unit.id, placed.unitId);
  assert.equal(filled[0].effectText, `${CATALOG.byId.get(ASHEN).category} effect`);
  assert.equal(slots.filter((slot) => slot.kind === "relic" && slot.occupied).length, 0, "Relics never take a Vessel slot");
});

test("a set Relic fills the Relic row and is not counted as a Vessel slot", () => {
  const base = matchWith();
  const state = {
    ...base,
    players: {
      ...base.players,
      0: { ...base.players[0], relics: [{ cardId: LENS, instanceId: "r1" }] },
    },
  };
  const slots = formationSlots(state, 0, CATALOG, { effectText });
  const relic = slots.find((slot) => slot.occupied);
  assert.equal(relic.kind, "relic");
  assert.equal(relic.row, 1);
  assert.equal(relic.card.id, LENS);
  assert.equal(relic.unit, null);
  assert.equal(formationSlots(state, 0, CATALOG).find((slot) => slot.occupied).effectText, "", "no copy without an effect summary");
});

test("approved frame geometry stays inside the 214x300 canvas and below the art aperture", () => {
  const frames = [...Object.keys(FRAME_GEOMETRY), null];
  for (const key of frames) {
    const geometry = faceGeometry(key);
    assert.equal(geometry.width, FRAME_CANVAS.width);
    assert.equal(geometry.height, FRAME_CANVAS.height);
    assert.ok(Math.abs(geometry.width / geometry.height - 214 / 300) < 1e-9, "approved aspect is preserved");
    if (key) {
      assert.deepEqual(
        [geometry.art.x, geometry.art.y, geometry.art.w, geometry.art.h],
        FRAME_GEOMETRY[key].art,
        `${key} uses its manifest aperture`,
      );
    }
    const artBottom = geometry.art.y + geometry.art.h;
    assert.ok(geometry.text.y >= artBottom, `${key ?? "neutral"}: rules text starts below the art`);
    assert.ok(geometry.type.y >= artBottom - 1, `${key ?? "neutral"}: stat band sits under the aperture`);
    for (const band of [geometry.name, geometry.art, geometry.type, geometry.text]) {
      assert.ok(band.x >= 0 && band.y >= 0, "bands start inside the canvas");
      assert.ok(band.x + band.w <= geometry.width + 1e-9, "bands do not run off the right edge");
      assert.ok(band.y + band.h <= geometry.height + 1e-9, "bands do not run off the bottom edge");
    }
    assert.ok(geometry.name.y + geometry.name.h <= geometry.art.y, "the name bar is above the art");
  }
});

test("a Vessel face shows canonical identity and live Guard, and never a stale frame", () => {
  const base = matchWith();
  const placed = place(base, 0, ASHEN, 2, 4);
  const slot = formationSlots(placed.state, 0, CATALOG, { effectText }).find((entry) => entry.occupied);
  const unit = { ...slot.unit, attack: 7, guard: 2, maxGuard: 6, ready: false, selected: true };
  const model = faceModel({ ...slot, unit });

  assert.equal(model.empty, false);
  assert.equal(model.title, CATALOG.byId.get(ASHEN).name);
  assert.equal(model.cost, CATALOG.byId.get(ASHEN).cost);
  assert.equal(model.status, "SPENT", "an unready Vessel is marked in the presentation");
  assert.match(model.stats, /ATK 7/);
  assert.match(model.stats, /GD 2\/6/);
  assert.equal(model.frameKey, CATALOG.byId.get(ASHEN).element, "Vessels use their element frame");
  assert.equal(model.pendingFrame, false);
  assert.equal(model.selected, true);
});

test("a Relic keeps the neutral pending-frame presentation and never borrows a Vessel frame", () => {
  const base = matchWith();
  const state = {
    ...base,
    players: { ...base.players, 1: { ...base.players[1], relics: [{ cardId: LENS, instanceId: "r1" }] } },
  };
  const slot = formationSlots(state, 1, CATALOG, { effectText }).find((entry) => entry.occupied);
  const model = faceModel(slot);
  assert.equal(model.frameKey, null, "no approved Relic frame exists");
  assert.equal(model.pendingFrame, true);
  assert.equal(model.kind, "relic");
  assert.equal(model.title, CATALOG.byId.get(LENS).name);
  assert.equal(model.stats, "ONGOING · PERSISTENT");
  assert.equal(model.ownerLabel, "ENEMY FORMATION");
});

test("an empty slot still names its owner, category and hint at card proportions", () => {
  const slots = formationSlots(matchWith(), 0, CATALOG, { effectText });
  for (const slot of slots) {
    const model = faceModel(slot);
    assert.equal(model.empty, true);
    assert.equal(model.ownerLabel, "YOUR FORMATION");
    assert.ok(model.title.includes(slot.kind === "vessel" ? "VESSEL SLOT" : "RELIC SOCKET"));
    assert.ok(model.hint.length > 0);
    assert.equal(model.geometry.width / model.geometry.height, 214 / 300);
    assert.equal(model.frameKey, null, "empty plates are not frameless cards pretending to be framed");
  }
  assert.equal(faceModel(slots[4]).title, "RELIC SOCKET 1");
});

test("text truncation never exceeds the measured width and never invents characters", () => {
  const measure = (value) => value.length * 10;
  assert.equal(truncateToWidth("short", 200, measure), "short");
  assert.equal(truncateToWidth("", 200, measure), "");
  const clipped = truncateToWidth("Ashen Crownblade of the Ninth Vigil", 100, measure);
  assert.ok(measure(clipped) <= 100, "clipped text fits the band");
  assert.ok(clipped.endsWith("…"));
  assert.ok("Ashen Crownblade of the Ninth Vigil".startsWith(clipped.slice(0, -1)));
  assert.equal(truncateToWidth("clip", 0, measure), "", "no room means no text, not an overflow");
});
