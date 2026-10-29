/**
 * Card illustration tests.
 *
 * The production rule these protect: a Vessel's illustrated art is generated
 * from the *same* voxel definition the battlefield renders, so the card and the
 * model cannot drift apart. A separate hand-drawn asset per card would pass a
 * "has art" check while failing this one.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { CATALOG } from "./support.js";
import { modelFor, modelHeight } from "../src/render/models.js";
import {
  illustrationDataUri,
  illustrationSource,
  illustrationSvg,
} from "../src/render/illustration.js";

const CARDS = [...CATALOG.byId.values()];
const VESSELS = CARDS.filter((card) => card.category === "vessel");
const NON_VESSELS = CARDS.filter((card) => card.category !== "vessel");

test("every shipped card has an illustration", () => {
  assert.ok(CARDS.length >= 90, `expected the full card pool, saw ${CARDS.length}`);
  for (const card of CARDS) {
    const svg = illustrationSvg(card);
    assert.ok(svg.startsWith("<svg"), `${card.id} did not produce SVG`);
    assert.ok(svg.trimEnd().endsWith("</svg>"), `${card.id} produced truncated SVG`);
    assert.match(svg, /viewBox="0 0 400 310"/);
    assert.match(svg, /role="img"/);
    assert.match(svg, new RegExp(`aria-label="[^"]*${card.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  }
});

test("no illustration contains NaN, undefined or an empty fill", () => {
  for (const card of CARDS) {
    const svg = illustrationSvg(card);
    assert.equal(svg.includes("NaN"), false, `${card.id} has a NaN coordinate`);
    assert.equal(svg.includes("undefined"), false, `${card.id} has an undefined value`);
    assert.equal(/fill=""/.test(svg), false, `${card.id} has an empty fill`);
    assert.equal(/stroke-width="0"/.test(svg), false, `${card.id} has a zero-width stroke`);
  }
});

test("vessel art is a projection of the canonical model, not a separate asset", () => {
  for (const vessel of VESSELS) {
    const model = modelFor(vessel.id);
    assert.ok(model, `${vessel.id} has no model to illustrate`);
    const source = illustrationSource(vessel);
    assert.equal(source.modelId, model.id);
    assert.equal(source.partCount, model.parts.length);

    const svg = illustrationSvg(vessel);
    // The rendered art declares the model's voxel height, so the framing and the
    // playable model share one measurement.
    assert.match(svg, /data-voxel-height="[\d.]+"/);
    assert.equal(
      svg.match(/data-voxel-height="([\d.]+)"/)[1],
      modelHeight(model).toFixed(2),
    );
    // Every palette entry the model actually uses must be reachable in the art:
    // the figure is shaded from the model's own colours.
    const used = new Set(model.parts.map((part) => part.c).filter((key) => model.palette[key]));
    assert.ok(used.size >= 4, `${vessel.id} uses too few materials to illustrate`);
    const fills = new Set([...svg.matchAll(/fill="(#[0-9a-f]{6})"/gi)].map((m) => m[1].toLowerCase()));
    let found = 0;
    for (const key of used) {
      const base = model.palette[key].toLowerCase();
      // Shading multiplies the colour, so compare hue-preserving presence:
      // at least one fill must be derived from this material.
      for (const fill of fills) {
        const a = [1, 3, 5].map((i) => Number.parseInt(base.slice(i, i + 2), 16));
        const b = [1, 3, 5].map((i) => Number.parseInt(fill.slice(i, i + 2), 16));
        const ratio = a.map((v, i) => (v === 0 ? 1 : b[i] / v));
        if (Math.max(...ratio) - Math.min(...ratio) < 0.22) {
          found += 1;
          break;
        }
      }
    }
    assert.ok(found >= Math.min(4, used.size), `${vessel.id} art did not shade from the model palette`);
  }
});

test("every vessel figure carries real geometry in frame", () => {
  for (const vessel of VESSELS) {
    const svg = illustrationSvg(vessel);
    const figure = svg.split('class="art-figure"')[1]?.split("</g>")[0] ?? "";
    const polygons = figure.match(/<polygon/g) ?? [];
    assert.ok(polygons.length >= 40, `${vessel.id} figure has only ${polygons.length} faces`);
    // Nothing may be projected outside the artwork window.
    const ys = [...figure.matchAll(/,-?(\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
    const xs = [...figure.matchAll(/(?:points="| )(-?\d+(?:\.\d+)?),/g)].map((m) => Number(m[1]));
    assert.ok(Math.min(...ys) >= 0, `${vessel.id} figure is clipped at the top`);
    assert.ok(Math.max(...ys) <= 310, `${vessel.id} figure falls below the frame`);
    assert.ok(Math.min(...xs) >= 0, `${vessel.id} figure is clipped on the left`);
    assert.ok(Math.max(...xs) <= 400, `${vessel.id} figure is clipped on the right`);
  }
});

test("two vessels with different models never share identical art", () => {
  const seen = new Map();
  for (const vessel of VESSELS) {
    const svg = illustrationSvg(vessel);
    const previous = seen.get(svg);
    assert.equal(previous, undefined, `${vessel.id} shares art with ${previous}`);
    seen.set(svg, vessel.id);
  }
  assert.equal(seen.size, VESSELS.length);
});

test("actions and relics get emblem art keyed by their effect, not a blank plate", () => {
  assert.ok(NON_VESSELS.length >= 30, "the Action and Relic library is too small to verify");
  for (const card of NON_VESSELS) {
    const svg = illustrationSvg(card);
    assert.match(svg, /class="art-emblem"/, `${card.id} has no emblem`);
    assert.match(svg, /<defs>/, `${card.id} has no scene gradients`);
    assert.ok(card.effect?.kind, `${card.id} has no effect to illustrate`);
  }

  const byKind = new Map();
  for (const card of NON_VESSELS) {
    const body = illustrationSvg(card).split('class="art-emblem"')[1];
    if (!byKind.has(card.effect.kind)) byKind.set(card.effect.kind, body);
  }
  const distinct = new Set(byKind.values());
  assert.ok(
    distinct.size >= Math.min(8, byKind.size),
    `expected distinct emblems per effect kind, saw ${distinct.size} for ${byKind.size} kinds`,
  );
});

test("illustrations are deterministic and cache-stable", () => {
  const card = VESSELS[0];
  const first = illustrationSvg(card);
  const second = illustrationSvg(card);
  assert.equal(first, second);
  assert.equal(illustrationDataUri(card), illustrationDataUri(card));
  // The scene-only variant used behind the rotatable roster model omits the
  // painted figure but keeps the environment.
  const scene = illustrationSvg(card, { figure: false });
  assert.equal(scene.includes('class="art-figure"'), false);
  assert.match(scene, /<rect width="400" height="310"/);
});

test("art data URIs are valid and compact enough to ship per card", () => {
  for (const card of CARDS) {
    const uri = illustrationDataUri(card);
    assert.ok(uri.startsWith("data:image/svg+xml;charset=utf-8,"), `${card.id} has a bad URI`);
    // Budget: the scene is architecture plus floor plus weather, so a card
    // carries roughly 30-45 kB of vector art. This guards against runaway growth.
    assert.ok(uri.length < 60_000, `${card.id} art is ${uri.length} bytes`);
    assert.equal(uri.includes("%3Cscript"), false, `${card.id} art embeds a script`);
  }
});
