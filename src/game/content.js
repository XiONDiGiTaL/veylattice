/**
 * Card catalog validation and deck legality for Veylattice.
 *
 * Content is data, never code. The engine consumes a validated, frozen
 * catalog; malformed content must fail loudly instead of producing a
 * half-playable match.
 */

import {
  CARD_CATEGORIES,
  DECK_RULES,
  MAX_FLUX,
  RARITIES,
  SUBTYPES,
} from "./constants.js";
import { ELEMENTS } from "./elemental-rules.js";

const ID_PATTERN = /^[a-z0-9_]{3,64}$/;
const MAX_NAME_LENGTH = 64;
const MAX_TEXT_LENGTH = 400;

function isIntegerInRange(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
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
  });

  return { ok: errors.length === 0, errors };
}

/** Deep-freeze card definitions so printed stats can never drift. */
function freezeCard(card) {
  if (Array.isArray(card.subtypes)) Object.freeze(card.subtypes);
  if (Array.isArray(card.abilities)) Object.freeze(card.abilities);
  if (Array.isArray(card.loreBondIds)) Object.freeze(card.loreBondIds);
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

/**
 * Build the deterministic M1 practice deck: two copies of every Vessel.
 * Copies stay within DECK_RULES.maxCopies and the total is inside 20-40.
 */
export function buildPracticeDeck(catalog, copies = 2) {
  const ids = vesselIdsFrom(catalog);
  const deck = [];
  for (let copy = 0; copy < copies; copy += 1) {
    for (const id of ids) deck.push(id);
  }
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
