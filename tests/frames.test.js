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

/* ---- battle-hand migration (2026-10-29) ---- */
import { buildHandCardFace } from "../src/render/approved-frame.js";

/** Just enough DOM for the face builders. */
function fakeDocument() {
  const make = (tag) => {
    const node = {
      tagName: tag.toUpperCase(),
      children: [],
      attributes: {},
      style: {},
      textContent: "",
      src: "",
      _classes: new Set(),
      get className() { return [...this._classes].join(" "); },
      set className(v) { this._classes = new Set(String(v).split(/\s+/).filter(Boolean)); },
      classList: null,
      append(...kids) { this.children.push(...kids); },
      setAttribute(k, v) { this.attributes[k] = String(v); },
      removeAttribute(k) { delete this.attributes[k]; },
      getAttribute(k) { return this.attributes[k] ?? null; },
      querySelector(sel) {
        const cls = sel.replace(/^\./, "");
        const walk = (n) => { for (const c of n.children) { if (c._classes?.has(cls)) return c; const f = walk(c); if (f) return f; } return null; };
        return walk(this);
      },
    };
    node.classList = { add: (c) => node._classes.add(c), contains: (c) => node._classes.has(c) };
    return node;
  };
  return { createElement: make };
}

test("battle hand uses the approved frame at manifest geometry with canonical text", () => {
  const saved = globalThis.document;
  globalThis.document = fakeDocument();
  try {
    for (const category of ["vessel", "action", "relic"]) {
      const card = CATALOG.cards.find((c) => c.category === category);
      const face = buildHandCardFace(card, { artUri: "data:,x", effectText: "canonical text", base: "./", affordable: false });
      const key = frameKeyFor(card);
      assert.ok(face.classList.contains("hand-face"));
      assert.ok(face.classList.contains("approved-card"));
      assert.equal(face.getAttribute("aria-hidden"), "true", "the button, not the face, is announced");
      assert.equal(face.querySelector(".approved-name").textContent, card.name);
      assert.equal(face.querySelector(".approved-cost").textContent, String(card.cost));
      assert.ok(face.querySelector(".approved-cost").classList.contains("unaffordable"));
      assert.equal(face.querySelector(".approved-text").textContent, "canonical text");
      if (category === "relic") {
        assert.equal(key, null);
        assert.ok(face.classList.contains("relic-pending"));
        assert.equal(face.querySelector(".approved-mid").textContent, "RELIC FRAME PENDING");
        assert.equal(face.querySelector(".approved-overlay"), null, "a Relic never borrows a frame");
      } else {
        const overlay = face.querySelector(".approved-overlay");
        assert.equal(overlay.src, `./${FRAME_GEOMETRY[key].overlay}`);
        const art = face.querySelector(".approved-art");
        const [ax, ay, aw, ah] = FRAME_GEOMETRY[key].art;
        assert.equal(art.style.left, `${(ax / 214) * 100}%`);
        assert.equal(art.style.top, `${(ay / 300) * 100}%`);
        assert.equal(art.style.width, `${(aw / 214) * 100}%`);
        assert.equal(art.style.height, `${(ah / 300) * 100}%`);
      }
      if (category === "vessel") {
        assert.equal(face.querySelector(".approved-mid").textContent, `ATK ${card.attack ?? "—"} · GD ${card.guard ?? "—"}`);
      }
    }
  } finally {
    globalThis.document = saved;
  }
});

test("hand rail CSS keeps the 214:300 frame ratio and never fixes a stretched height", () => {
  const css = readFileSync(path.join(root, "battlefield.css"), "utf8");
  const block = css.slice(css.indexOf(".hand-rail .card.hand-card {"));
  assert.match(block, /aspect-ratio:\s*214\s*\/\s*300/);
  assert.match(block.slice(0, block.indexOf("}")), /height:\s*auto/);
});
