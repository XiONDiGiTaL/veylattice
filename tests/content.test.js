import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPracticeDeck,
  createCatalog,
  validateCatalog,
  validateDeck,
} from "../src/game/content.js";
import { DECK_RULES } from "../src/game/constants.js";
import { CATALOG, RAW_CARDS, RAW_EXTRAS, RAW_VESSELS } from "./support.js";

function cloneCards() {
  return JSON.parse(JSON.stringify(RAW_CARDS));
}

test("the shipped starter set is valid and keeps its 18 stable ids", () => {
  const result = validateCatalog(RAW_VESSELS);
  assert.deepEqual(result.errors, []);
  assert.equal(result.ok, true);
  assert.equal(RAW_VESSELS.length, 18);
  assert.equal(new Set(RAW_VESSELS.map((c) => c.id)).size, 18);
  assert.ok(RAW_VESSELS.every((c) => c.category === "vessel"));
});

test("the shipped Action and Relic set is valid and typed", () => {
  assert.deepEqual(validateCatalog(RAW_CARDS).errors, []);
  assert.equal(RAW_EXTRAS.length, 12);
  const actions = RAW_EXTRAS.filter((c) => c.category === "action");
  const relics = RAW_EXTRAS.filter((c) => c.category === "relic");
  assert.equal(actions.length, 8);
  assert.equal(relics.length, 4);
  assert.ok(actions.every((c) => typeof c.effect?.kind === "string"));
  assert.ok(relics.every((c) => typeof c.effect?.kind === "string"));
  assert.equal(CATALOG.cards.length, 30);
});

test("malformed content is rejected with a specific error", () => {
  const byId = (cards, id) => cards.find((c) => c.id === id);
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
    {
      name: "action without an effect",
      mutate: (cards) => {
        delete byId(cards, "action_ember_lance").effect;
      },
      match: /requires a typed effect object/,
    },
    {
      name: "action with an unknown effect kind",
      mutate: (cards) => {
        byId(cards, "action_ember_lance").effect = { kind: "runScript" };
      },
      match: /unknown effect kind/,
    },
    {
      name: "action effect borrowed from the Relic scope",
      mutate: (cards) => {
        byId(cards, "action_ember_lance").effect = { kind: "attackAura", amount: 1 };
      },
      match: /belongs to relic cards/,
    },
    {
      name: "action with an illegal targeting mode",
      mutate: (cards) => {
        byId(cards, "action_ember_lance").targeting = "anywhere";
      },
      match: /action targeting must be one of/,
    },
    {
      name: "action amount outside its range",
      mutate: (cards) => {
        byId(cards, "action_ember_lance").effect = { kind: "damage", amount: 40 };
      },
      match: /effect amount must be an integer between 1 and 12/,
    },
    {
      name: "relic that pretends to have a target",
      mutate: (cards) => {
        byId(cards, "relic_ember_lens").targeting = "enemyUnit";
      },
      match: /relics are persistent and take no targeting field/,
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
  assert.equal(catalog.cards.length, 30);
  assert.equal(Object.isFrozen(catalog.byId.get("vessel_ashen_crownblade")), true);
  assert.equal(Object.isFrozen(catalog.byId.get("action_ember_lance").effect), true);
  assert.throws(() => {
    const cards = cloneCards();
    cards[0].element = "void";
    createCatalog(cards);
  }, /Invalid card catalog/);
});

test("the practice deck satisfies the canonical rules with no exception", () => {
  const deck = buildPracticeDeck(CATALOG);
  assert.equal(deck.length, 38);
  const checked = validateDeck(deck, CATALOG, DECK_RULES);
  assert.equal(checked.ok, true, checked.errors.join(" | "));
  assert.equal(checked.counts.vessels, 18);
  assert.equal(checked.counts.actions, 16);
  assert.equal(checked.counts.relics, 4);
  assert.ok(checked.counts.actions >= DECK_RULES.minActions);
  assert.ok(Math.max(...Object.values(checked.counts.copies)) <= DECK_RULES.maxCopies);
});

test("a deck without Actions is now rejected by the canonical rules", () => {
  const vesselsOnly = [...RAW_VESSELS.map((c) => c.id), ...RAW_VESSELS.map((c) => c.id)];
  const result = validateDeck(vesselsOnly, CATALOG, DECK_RULES);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /at least 5 Actions/.test(e)));
});

test("deck validation catches size, copy and unknown-card errors", () => {
  const tooSmall = validateDeck(["vessel_ashen_crownblade"], CATALOG, DECK_RULES);
  assert.equal(tooSmall.ok, false);
  assert.ok(tooSmall.errors.some((e) => /between 20 and 40/.test(e)));

  const tooManyCopies = new Array(21).fill("vessel_ashen_crownblade");
  const copies = validateDeck(tooManyCopies, CATALOG, DECK_RULES);
  assert.equal(copies.ok, false);
  assert.ok(copies.errors.some((e) => /3-copy limit/.test(e)));

  const unknown = validateDeck(["vessel_not_real", ...buildPracticeDeck(CATALOG)], CATALOG, DECK_RULES);
  assert.equal(unknown.ok, false);
  assert.ok(unknown.errors.some((e) => /Unknown card id/.test(e)));
});
