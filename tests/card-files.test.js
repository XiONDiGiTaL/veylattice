/**
 * Shipped card files must equal the canonical card data.
 *
 * The collection in `Cards/` is a build artefact: 102 faces generated from the
 * same definitions the engine plays. This test re-generates each face in memory
 * and compares it to the file on disk, so a data change (name, cost, stat,
 * rules, art) that was not rebuilt fails here instead of shipping a card whose
 * printed numbers disagree with the game.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

import { CATALOG } from "./support.js";
import { cardFaceSvg, cardFaceFacts, CARD_WIDTH, CARD_HEIGHT } from "../src/render/card-face.js";

const CARDS = [...CATALOG.byId.values()];
const manifest = JSON.parse(readFileSync("Cards/manifest.json", "utf8"));

const read = (path) => readFileSync(path, "utf8");

test("the manifest describes every card in the catalog", () => {
  assert.equal(manifest.schemaVersion >= 1, true);
  assert.equal(manifest.canvas.width, CARD_WIDTH);
  assert.equal(manifest.canvas.height, CARD_HEIGHT);
  const entries = manifest.cards;
  const listed = new Set(entries.map((entry) => entry.id));
  for (const card of CARDS) assert.ok(listed.has(card.id), `${card.id} missing from the card manifest`);
  assert.equal(listed.size, CARDS.length);
  const counts = entries.reduce((acc, entry) => ({ ...acc, [entry.category]: (acc[entry.category] ?? 0) + 1 }), {});
  const { total, ...byCategory } = manifest.counts;
  assert.deepEqual(counts, byCategory);
  assert.equal(total, entries.length);
});

test("every shipped card file matches its regenerated face", () => {
  for (const card of CARDS) {
    const path = `Cards/cards/${card.id}.svg`;
    assert.ok(existsSync(path), `${path} is missing — run node tools/build-cards.mjs`);
    const file = read(path).trim();
    const generated = cardFaceSvg(card).trim();
    assert.equal(file, generated, `${card.id} on disk is stale relative to its definition`);
  }
});

test("the art layers and frames ship alongside the faces", () => {
  for (const card of CARDS) {
    assert.ok(existsSync(`Cards/art/${card.id}.svg`), `${card.id} has no illustration asset`);
  }
  for (const category of ["vessel", "action", "relic"]) {
    assert.ok(existsSync(`Cards/frames/${category}-frame.svg`), `missing the ${category} frame template`);
  }
  assert.ok(existsSync("Cards/index.html"), "missing the contact sheet");
  assert.ok(existsSync("Cards/QA.md"), "missing the QA list");
});

test("printed text carries the canonical name, cost and stats", () => {
  for (const card of CARDS) {
    const svg = read(`Cards/cards/${card.id}.svg`);
    assert.ok(svg.includes(card.name.replace(/&/g, "&amp;")), `${card.id} does not print its name`);
    assert.match(svg, /aria-label="[^"]*"/);
    const label = svg.match(/aria-label="([^"]*)"/)[1];
    assert.ok(label.includes(`cost ${card.cost}`), `${card.id} aria-label omits its Flux cost`);
    if (card.category === "vessel") {
      assert.ok(label.includes(`Attack ${card.attack}`), `${card.id} aria-label omits Attack`);
      assert.ok(label.includes(`Guard ${card.guard}`), `${card.id} aria-label omits Guard`);
    }
  }
});

test("non-unit cards carry no Attack/Guard sockets", () => {
  for (const card of CARDS.filter((entry) => entry.category !== "vessel")) {
    const svg = read(`Cards/cards/${card.id}.svg`);
    assert.equal(svg.includes(">ATTACK<"), false, `${card.id} prints an ATTACK stat label`);
    assert.equal(svg.includes(">GUARD<"), false, `${card.id} prints a GUARD stat label`);
    assert.match(svg, /(ACTION|RELIC)/, `${card.id} does not name its category band`);
  }
});

test("faces render without placeholder or invalid values", () => {
  for (const card of CARDS) {
    const svg = read(`Cards/cards/${card.id}.svg`);
    assert.equal(svg.includes("NaN"), false, `${card.id} has a NaN coordinate`);
    assert.equal(svg.includes("undefined"), false, `${card.id} has an undefined value`);
    assert.equal(svg.includes('fill=""'), false, `${card.id} has an empty fill`);
    assert.ok(svg.startsWith("<svg"), `${card.id} is not SVG`);
    assert.ok(svg.trimEnd().endsWith("</svg>"), `${card.id} is truncated`);
  }
});

test("facts used by the in-game viewer match the catalog", () => {
  for (const card of CARDS) {
    const facts = cardFaceFacts(card);
    assert.equal(facts.id, card.id);
    assert.equal(facts.name, card.name);
    assert.equal(facts.cost, card.cost);
    if (card.category === "vessel") {
      assert.equal(facts.attack, card.attack);
      assert.equal(facts.guard, card.guard);
      assert.ok(facts.modelId, `${card.id} has no model behind its art`);
    } else {
      assert.equal(facts.attack, null);
      assert.equal(facts.guard, null);
    }
    assert.ok(facts.rules.length > 0, `${card.id} has no rules text to print`);
  }
});
