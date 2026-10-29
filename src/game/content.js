/**
 * Card catalog validation and deck legality for Veylattice.
 *
 * Content is data, never code. The engine consumes a validated, frozen
 * catalog; malformed content must fail loudly instead of producing a
 * half-playable match.
 */

import {
  ACTION_TARGETING,
  CARD_CATEGORIES,
  DECK_RULES,
  EFFECT_KINDS,
  EFFECT_TARGETING,
  MAX_FLUX,
  RARITIES,
  SUBTYPES,
  VESSEL_KEYWORDS,
} from "./constants.js";
import { ELEMENTS } from "./elemental-rules.js";

const ID_PATTERN = /^[a-z0-9_]{3,64}$/;
const MAX_NAME_LENGTH = 64;
const MAX_TEXT_LENGTH = 400;

function isIntegerInRange(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}

/**
 * Validate a card's typed effect.
 *
 * Effects are declarative data. Anything that is not a known kind with the
 * right numeric fields for its scope is rejected, so a card can never smuggle
 * behaviour (or code) into the engine.
 */
function validateEffect(card, where, scope, errors) {
  const effect = card.effect;
  if (!effect || typeof effect !== "object" || Array.isArray(effect)) {
    errors.push(`${where}: ${scope} requires a typed effect object.`);
    return;
  }
  const rule = EFFECT_KINDS[effect.kind];
  if (!rule) {
    errors.push(`${where}: unknown effect kind "${String(effect.kind)}".`);
    return;
  }
  if (rule.scope !== scope) {
    errors.push(`${where}: effect "${effect.kind}" belongs to ${rule.scope} cards, not ${scope}.`);
    return;
  }
  if (rule.min !== undefined && !isIntegerInRange(effect.amount, rule.min, rule.max)) {
    errors.push(`${where}: effect amount must be an integer between ${rule.min} and ${rule.max}.`);
  }
  if (effect.kind === "buff") {
    const attack = effect.attack ?? 0;
    const guard = effect.guard ?? 0;
    if (!isIntegerInRange(attack, 0, 5)) {
      errors.push(`${where}: buff attack must be an integer between 0 and 5.`);
    }
    if (!isIntegerInRange(guard, 0, 5)) {
      errors.push(`${where}: buff guard must be an integer between 0 and 5.`);
    }
    if (attack === 0 && guard === 0) {
      errors.push(`${where}: buff must change attack or guard.`);
    }
  }
  // The targeting mode is part of the effect's contract: an enemy-only effect
  // printed as "none" would be unplayable, and a friendly buff printed as
  // "anyUnit" would let the engine accept a cast the rules never described.
  const required = EFFECT_TARGETING[effect.kind];
  if (scope === "action" && required && card.targeting !== required) {
    errors.push(`${where}: effect "${effect.kind}" requires targeting "${required}".`);
  }
}

/** Vessel abilities are keyword ids from a closed list, never free text. */
function validateAbilities(card, where, errors) {
  if (!Array.isArray(card.abilities)) return;
  const seen = new Set();
  for (const ability of card.abilities) {
    if (typeof ability !== "string" || !VESSEL_KEYWORDS[ability]) {
      errors.push(`${where}: unknown Vessel keyword "${String(ability)}".`);
      continue;
    }
    if (seen.has(ability)) {
      errors.push(`${where}: duplicate Vessel keyword "${ability}".`);
    }
    seen.add(ability);
  }
}

/**
 * Validate a raw card array.
 * @returns {{ok: boolean, errors: string[]}}
 */
export function validateCatalog(cards) {
  const errors = [];
  if (!Array.isArray(cards)) {
    return { ok: false, errors: ["Card catalog must be an array."] };
  }
  if (cards.length === 0) {
    return { ok: false, errors: ["Card catalog is empty."] };
  }

  const seen = new Set();
  cards.forEach((card, index) => {
    const where = `card[${index}]${card && card.id ? ` (${card.id})` : ""}`;
    if (!card || typeof card !== "object" || Array.isArray(card)) {
      errors.push(`${where}: not an object.`);
      return;
    }
    if (typeof card.id !== "string" || !ID_PATTERN.test(card.id)) {
      errors.push(`${where}: id must match ${ID_PATTERN}.`);
    } else if (seen.has(card.id)) {
      errors.push(`${where}: duplicate id.`);
    } else {
      seen.add(card.id);
    }
    if (typeof card.name !== "string" || card.name.trim().length === 0 || card.name.length > MAX_NAME_LENGTH) {
      errors.push(`${where}: name must be a non-empty string up to ${MAX_NAME_LENGTH} characters.`);
    }
    if (!CARD_CATEGORIES.includes(card.category)) {
      errors.push(`${where}: category must be one of ${CARD_CATEGORIES.join(", ")}.`);
    }
    if (!ELEMENTS.includes(card.element)) {
      errors.push(`${where}: element must be one of ${ELEMENTS.join(", ")}.`);
    }
    if (!isIntegerInRange(card.cost, 0, MAX_FLUX)) {
      errors.push(`${where}: cost must be an integer between 0 and ${MAX_FLUX}.`);
    }
    if (!RARITIES.includes(card.rarity)) {
      errors.push(`${where}: rarity must be one of ${RARITIES.join(", ")}.`);
    }
    if (typeof card.flavorText !== "string" || card.flavorText.length > MAX_TEXT_LENGTH) {
      errors.push(`${where}: flavorText must be a string up to ${MAX_TEXT_LENGTH} characters.`);
    }
    if (!Array.isArray(card.abilities)) {
      errors.push(`${where}: abilities must be an array (typed effect definitions only).`);
    }

    if (card.category === "vessel") {
      validateAbilities(card, where, errors);
      if (!isIntegerInRange(card.attack, 1, 10)) {
        errors.push(`${where}: vessel attack must be an integer between 1 and 10.`);
      }
      if (!isIntegerInRange(card.guard, 1, 10)) {
        errors.push(`${where}: vessel guard must be an integer between 1 and 10.`);
      }
      if (!isIntegerInRange(card.movement, 0, 3)) {
        errors.push(`${where}: vessel movement must be an integer between 0 and 3.`);
      }
      if (!isIntegerInRange(card.range, 1, 3)) {
        errors.push(`${where}: vessel range must be an integer between 1 and 3.`);
      }
      if (!Array.isArray(card.subtypes) || card.subtypes.length === 0) {
        errors.push(`${where}: vessel subtypes must be a non-empty array.`);
      } else if (card.subtypes.some((s) => !SUBTYPES.includes(s))) {
        errors.push(`${where}: unknown vessel subtype.`);
      }
      if (typeof card.modelId !== "string" || card.modelId.length === 0) {
        errors.push(`${where}: vessel requires a modelId.`);
      }
    }

    if (card.category === "action") {
      if (!ACTION_TARGETING.includes(card.targeting)) {
        errors.push(`${where}: action targeting must be one of ${ACTION_TARGETING.join(", ")}.`);
      }
      validateEffect(card, where, "action", errors);
    }

    if (card.category === "relic") {
      if (card.targeting !== undefined) {
        errors.push(`${where}: relics are persistent and take no targeting field.`);
      }
      validateEffect(card, where, "relic", errors);
    }
  });

  return { ok: errors.length === 0, errors };
}

/** Deep-freeze card definitions so printed stats can never drift. */
function freezeCard(card) {
  if (Array.isArray(card.subtypes)) Object.freeze(card.subtypes);
  if (Array.isArray(card.abilities)) Object.freeze(card.abilities);
  if (Array.isArray(card.loreBondIds)) Object.freeze(card.loreBondIds);
  if (card.effect && typeof card.effect === "object") Object.freeze(card.effect);
  return Object.freeze(card);
}

/**
 * Build an immutable catalog.
 * Throws on invalid content so a broken set cannot silently start a match.
 */
export function createCatalog(cards) {
  const { ok, errors } = validateCatalog(cards);
  if (!ok) {
    throw new Error(`Invalid card catalog:\n${errors.join("\n")}`);
  }
  const byId = new Map();
  for (const card of cards) {
    byId.set(card.id, freezeCard({ ...card }));
  }
  return {
    cards: Object.freeze(cards.map((c) => byId.get(c.id))),
    byId,
  };
}

/** Every Vessel id, in catalog order. */
export function vesselIdsFrom(catalog) {
  return catalog.cards.filter((c) => c.category === "vessel").map((c) => c.id);
}

/** Every Action id, in catalog order. */
export function actionIdsFrom(catalog) {
  return catalog.cards.filter((c) => c.category === "action").map((c) => c.id);
}

/** Every Relic id, in catalog order. */
export function relicIdsFrom(catalog) {
  return catalog.cards.filter((c) => c.category === "relic").map((c) => c.id);
}

function shuffleCopy(items, rng) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Round-robin one element at a time so a large pool still shows its variety. */
function spreadByElement(cards, limit) {
  const elements = ["wood", "fire", "earth", "metal", "water"];
  const byElement = elements.map((element) => cards.filter((card) => card.element === element));
  const picked = [];
  for (let round = 0; picked.length < limit; round += 1) {
    let added = false;
    for (const list of byElement) {
      if (round < list.length && picked.length < limit) {
        picked.push(list[round].id);
        added = true;
      }
    }
    if (!added) break;
  }
  return picked.slice(0, limit);
}

/**
 * Build the deterministic practice deck: 20 Vessels spread across the five
 * elements, two copies each of eight Actions, and four Relics — exactly 40
 * cards, inside the canonical 20-40 range, above the ten-Vessel and five-Action
 * minimums, and never above the three-copy limit.
 *
 * The deck is deliberately curated rather than "every card in the set": the
 * pool is now far larger than a legal deck, so a practice deck has to choose.
 * There is no weaker rule profile for it.
 */
export function buildPracticeDeck(catalog, options = {}) {
  // The UI passes a seeded RNG so each practice match samples a different 20
  // Vessels from the 60-card pool. Tests call it without one and get the same
  // deterministic deck every time.
  const pool = typeof options.rng === "function" ? shuffleCopy(catalog.cards, options.rng) : catalog.cards;
  const vessels = pool.filter((card) => card.category === "vessel");
  const actions = pool.filter((card) => card.category === "action");
  const relics = pool.filter((card) => card.category === "relic");

  const deck = spreadByElement(vessels, 20);
  const actionIds = spreadByElement(actions, 8);
  for (const id of actionIds) deck.push(id, id);
  deck.push(...spreadByElement(relics, 4));
  return deck;
}

/**
 * Validate deck composition (ownership is a later, collection-aware check).
 * @returns {{ok: boolean, errors: string[], counts: object}}
 */
export function validateDeck(cardIds, catalog, rules = DECK_RULES) {
  const errors = [];
  const counts = {
    total: cardIds.length,
    vessels: 0,
    actions: 0,
    relics: 0,
    copies: {},
  };
  if (!Array.isArray(cardIds)) {
    return { ok: false, errors: ["Deck must be an array of card ids."], counts };
  }
  if (cardIds.length < rules.minTotal || cardIds.length > rules.maxTotal) {
    errors.push(`Deck must contain between ${rules.minTotal} and ${rules.maxTotal} cards (found ${cardIds.length}).`);
  }
  for (const id of cardIds) {
    const card = catalog.byId.get(id);
    if (!card) {
      errors.push(`Unknown card id "${id}".`);
      continue;
    }
    counts.copies[id] = (counts.copies[id] ?? 0) + 1;
    if (card.category === "vessel") counts.vessels += 1;
    if (card.category === "action") counts.actions += 1;
    if (card.category === "relic") counts.relics += 1;
  }
  for (const [id, count] of Object.entries(counts.copies)) {
    if (count > rules.maxCopies) {
      errors.push(`Card "${id}" exceeds the ${rules.maxCopies}-copy limit (found ${count}).`);
    }
  }
  if (counts.vessels < rules.minVessels) {
    errors.push(`Deck needs at least ${rules.minVessels} Vessels (found ${counts.vessels}).`);
  }
  if (counts.actions < rules.minActions) {
    errors.push(`Deck needs at least ${rules.minActions} Actions (found ${counts.actions}).`);
  }
  return { ok: errors.length === 0, errors, counts };
}
