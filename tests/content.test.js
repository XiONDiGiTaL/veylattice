import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPracticeDeck,
  createCatalog,
  validateCatalog,
  validateDeck,
} from "../src/game/content.js";
import { DECK_RULES } from "../src/game/constants.js";
import { CARD_MANIFEST, CARD_SETS, CATALOG, RAW_CARDS, RAW_CORE_VESSELS, RAW_EXTRAS, RAW_VESSELS, seededRng } from "./support.js";

function cloneCards() {
  return JSON.parse(JSON.stringify(RAW_CARDS));
}

test("the core starter set keeps its 18 stable Vessel ids", () => {
  const result = validateCatalog(RAW_CORE_VESSELS);
  assert.deepEqual(result.errors, []);
  assert.equal(result.ok, true);
  assert.equal(RAW_CORE_VESSELS.length, 18);
  assert.equal(new Set(RAW_CORE_VESSELS.map((c) => c.id)).size, 18);
  assert.ok(RAW_CORE_VESSELS.every((c) => c.category === "vessel"));
});

test("the manifest loads every set and the roster target is 65 Vessels", () => {
  assert.ok(CARD_MANIFEST.sets.length >= 3);
  assert.equal(CARD_SETS.length, CARD_MANIFEST.sets.length);
  assert.equal(RAW_VESSELS.length, 65);
  assert.equal(new Set(RAW_CARDS.map((c) => c.id)).size, RAW_CARDS.length, "ids are unique across sets");
  const perElement = {};
  for (const card of RAW_VESSELS) perElement[card.element] = (perElement[card.element] ?? 0) + 1;
  assert.deepEqual(perElement, { wood: 13, fire: 13, earth: 13, metal: 13, water: 13 });
});

test("the shipped Action and Relic library is valid, typed and complete", () => {
  assert.deepEqual(validateCatalog(RAW_CARDS).errors, []);
  const actions = RAW_EXTRAS.filter((c) => c.category === "action");
  const relics = RAW_EXTRAS.filter((c) => c.category === "relic");
  assert.equal(actions.length, 30);
  assert.equal(relics.length, 12);
  assert.ok(actions.every((c) => typeof c.effect?.kind === "string"));
  assert.ok(relics.every((c) => typeof c.effect?.kind === "string"));
  assert.equal(CATALOG.cards.length, 107);
  // Every effect family that the engine resolves must appear at least once, so
  // no shipped kind is dead content.
  const kinds = new Set([...actions, ...relics].map((c) => c.effect.kind));
  for (const kind of [
    "damage", "damageAll", "heal", "buff", "draw", "nexusDamage", "nexusHeal", "drain",
    "stun", "ready", "revive", "flux", "attackAura", "armorAura", "mendAura", "guardAura",
    "wardAura", "swiftAura", "drawAura",
  ]) {
    assert.ok(kinds.has(kind), `no shipped card uses ${kind}`);
  }
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
    {
      name: "unknown Vessel keyword",
      mutate: (cards) => {
        cards[0].abilities = ["teleport"];
      },
      match: /unknown Vessel keyword/,
    },
    {
      name: "duplicate Vessel keyword",
      mutate: (cards) => {
        cards[0].abilities = ["swift", "swift"];
      },
      match: /duplicate Vessel keyword/,
    },
    {
      name: "stun printed as a friendly buff",
      mutate: (cards) => {
        byId(cards, "action_granite_grasp").targeting = "friendlyUnit";
      },
      match: /requires targeting "enemyUnit"/,
    },
    {
      name: "ready printed without a target",
      mutate: (cards) => {
        byId(cards, "action_quickening_spark").targeting = "none";
      },
      match: /requires targeting "friendlyUnit"/,
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
  assert.equal(catalog.cards.length, 107);
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
  assert.equal(deck.length, 40);
  const checked = validateDeck(deck, CATALOG, DECK_RULES);
  assert.equal(checked.ok, true, checked.errors.join(" | "));
  assert.equal(checked.counts.vessels, 20);
  assert.equal(checked.counts.actions, 16);
  assert.equal(checked.counts.relics, 4);
  // The curated deck must still represent every element, not just the first set.
  const elements = new Set(deck.map((id) => CATALOG.byId.get(id).element));
  assert.equal(elements.size, 5);
  assert.ok(checked.counts.actions >= DECK_RULES.minActions);
  assert.ok(Math.max(...Object.values(checked.counts.copies)) <= DECK_RULES.maxCopies);
});

test("a seeded practice deck stays legal and samples a different selection", () => {
  const first = buildPracticeDeck(CATALOG, { rng: seededRng(11) });
  const second = buildPracticeDeck(CATALOG, { rng: seededRng(22) });
  assert.equal(first.length, 40);
  assert.notDeepEqual(first, second, "two seeds should not deal the same deck");
  for (const deck of [first, second]) {
    const checked = validateDeck(deck, CATALOG, DECK_RULES);
    assert.equal(checked.ok, true, checked.errors.join(" | "));
    assert.equal(checked.counts.vessels, 20);
    assert.equal(checked.counts.actions, 16);
    assert.equal(checked.counts.relics, 4);
  }
  // The deterministic variant used by tests and by `createMatch` defaults is unchanged.
  assert.deepEqual(buildPracticeDeck(CATALOG), buildPracticeDeck(CATALOG));
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
