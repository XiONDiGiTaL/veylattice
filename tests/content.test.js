import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPracticeDeck,
  createCatalog,
  validateCatalog,
  validateDeck,
} from "../src/game/content.js";
import { DECK_RULES, PRACTICE_DECK_RULES } from "../src/game/constants.js";
import { CATALOG, RAW_CARDS } from "./support.js";

function cloneCards() {
  return JSON.parse(JSON.stringify(RAW_CARDS));
}

test("the shipped starter set is valid and keeps its 18 stable ids", () => {
  const result = validateCatalog(RAW_CARDS);
  assert.deepEqual(result.errors, []);
  assert.equal(result.ok, true);
  assert.equal(RAW_CARDS.length, 18);
  assert.equal(new Set(RAW_CARDS.map((c) => c.id)).size, 18);
  assert.ok(RAW_CARDS.every((c) => c.category === "vessel"));
});

test("malformed content is rejected with a specific error", () => {
  const cases = [
    {
      name: "duplicate id",
      mutate: (cards) => {
        cards[1].id = cards[0].id;
      },
      match: /duplicate id/,
    },
    {
      name: "invalid element",
      mutate: (cards) => {
        cards[0].element = "aether";
      },
      match: /element must be one of/,
    },
    {
      name: "attack out of printed range",
      mutate: (cards) => {
        cards[0].attack = 11;
      },
      match: /attack must be an integer between 1 and 10/,
    },
    {
      name: "missing model id",
      mutate: (cards) => {
        delete cards[0].modelId;
      },
      match: /requires a modelId/,
    },
    {
      name: "unknown subtype",
      mutate: (cards) => {
        cards[0].subtypes = ["golem"];
      },
      match: /unknown vessel subtype/,
    },
    {
      name: "executable abilities",
      mutate: (cards) => {
        cards[0].abilities = "document.querySelector('body')";
      },
      match: /abilities must be an array/,
    },
  ];

  for (const scenario of cases) {
    const cards = cloneCards();
    scenario.mutate(cards);
    const result = validateCatalog(cards);
    assert.equal(result.ok, false, scenario.name);
    assert.ok(
      result.errors.some((e) => scenario.match.test(e)),
      `${scenario.name}: ${result.errors.join(" | ")}`,
    );
  }
});

test("createCatalog freezes definitions and refuses invalid input", () => {
  const catalog = createCatalog(cloneCards());
  assert.equal(catalog.cards.length, 18);
  assert.equal(Object.isFrozen(catalog.byId.get("vessel_ashen_crownblade")), true);
  assert.throws(() => {
    const cards = cloneCards();
    cards[0].element = "void";
    createCatalog(cards);
  }, /Invalid card catalog/);
});

test("practice deck is 20-40 cards, at most three copies, ten-plus Vessels", () => {
  const deck = buildPracticeDeck(CATALOG, 2);
  assert.equal(deck.length, 36);
  const practice = validateDeck(deck, CATALOG, PRACTICE_DECK_RULES);
  assert.equal(practice.ok, true, practice.errors.join(" | "));
  assert.equal(practice.counts.vessels, 36);
  assert.ok(Math.max(...Object.values(practice.counts.copies)) <= DECK_RULES.maxCopies);

  // Documented M1 gap: the canonical Action minimum cannot be met yet.
  const canonical = validateDeck(deck, CATALOG, DECK_RULES);
  assert.equal(canonical.ok, false);
  assert.ok(canonical.errors.some((e) => /at least 5 Actions/.test(e)));
});

test("deck validation catches size, copy, ownership-unknown and type errors", () => {
  const tooSmall = validateDeck(buildPracticeDeck(CATALOG, 1), CATALOG, PRACTICE_DECK_RULES);
  assert.equal(tooSmall.ok, false);
  assert.ok(tooSmall.errors.some((e) => /between 20 and 40/.test(e)));

  const tooManyCopies = new Array(21).fill("vessel_ashen_crownblade");
  const copies = validateDeck(tooManyCopies, CATALOG, PRACTICE_DECK_RULES);
  assert.equal(copies.ok, false);
  assert.ok(copies.errors.some((e) => /3-copy limit/.test(e)));

  const unknown = validateDeck(["vessel_not_real", ...buildPracticeDeck(CATALOG, 2)], CATALOG, PRACTICE_DECK_RULES);
  assert.equal(unknown.ok, false);
  assert.ok(unknown.errors.some((e) => /Unknown card id/.test(e)));
});
