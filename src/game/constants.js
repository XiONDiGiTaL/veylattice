/**
 * Canonical rule constants for the M1 offline slice.
 *
 * Source of truth: GAME_RULES.md. Numbers marked "proposed" there are kept
 * here as named constants so balance can change without engine edits.
 */

export const RULES_VERSION = "m1-rules-1";

export const BOARD_SIZE = 7;
export const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;

export const START_VITALITY = 30;
export const OPENING_HAND = 5;
export const MAX_FLUX = 10;
export const MAX_UNITS_PER_SEAT = 4;
export const MAX_RELICS_PER_SEAT = 2;

/** Every seat receives this many milliseconds of main-phase time. */
export const TURN_MS = 120_000;

/** Rows 0-2 belong to seat 1's deployment zone; rows 4-6 to seat 0. */
export const DEPLOYMENT_ROWS = 3;

/**
 * Deck composition rules.
 *
 * The Action minimum is canonical and enforced: it was waived only while the
 * card pool had no Actions at all, and that exception is gone now that the
 * first Action and Relic set ships.
 */
export const DECK_RULES = Object.freeze({
  minTotal: 20,
  maxTotal: 40,
  maxCopies: 3,
  minVessels: 10,
  minActions: 5,
});

/** Which units an Action may target. */
export const ACTION_TARGETING = Object.freeze([
  "enemyUnit",
  "friendlyUnit",
  "anyUnit",
  "none",
]);

/**
 * Typed, data-only effect vocabulary.
 *
 * `scope` separates one-shot Action effects from persistent Relic auras so a
 * definition cannot accidentally be used in the wrong card category. Content
 * stays declarative: no card in this project carries executable text.
 */
export const EFFECT_KINDS = Object.freeze({
  damage: Object.freeze({ scope: "action", min: 1, max: 12 }),
  damageAll: Object.freeze({ scope: "action", min: 1, max: 6 }),
  heal: Object.freeze({ scope: "action", min: 1, max: 12 }),
  buff: Object.freeze({ scope: "action" }),
  draw: Object.freeze({ scope: "action", min: 1, max: 3 }),
  nexusDamage: Object.freeze({ scope: "action", min: 1, max: 8 }),
  attackAura: Object.freeze({ scope: "relic", min: 1, max: 3 }),
  armorAura: Object.freeze({ scope: "relic", min: 1, max: 3 }),
  mendAura: Object.freeze({ scope: "relic", min: 1, max: 4 }),
  guardAura: Object.freeze({ scope: "relic", min: 1, max: 4 }),
});

export const ELEMENT_LABELS = Object.freeze({
  wood: "Wood",
  fire: "Fire",
  earth: "Earth",
  metal: "Metal",
  water: "Water",
});

export const SUBTYPES = Object.freeze([
  "warrior",
  "beast",
  "mystic",
  "construct",
  "demon",
  "dragon",
  "ancient",
  "spirit",
  "otherworldly",
]);

// docs/PROGRESSION_AND_CONTENT.md fixes these five labels; "mythic" is the
// canonical top tier, so "legendary" is not accepted.
export const RARITIES = Object.freeze([
  "common",
  "uncommon",
  "rare",
  "epic",
  "mythic",
]);

export const CARD_CATEGORIES = Object.freeze(["vessel", "action", "relic"]);

/** Home row nearest each seat's Nexus marker (outside the grid). */
export function enemyHomeRow(seat) {
  return seat === 0 ? 0 : BOARD_SIZE - 1;
}

/** Deployment rows for a seat, inclusive. */
export function deploymentBounds(seat) {
  return seat === 0
    ? { min: BOARD_SIZE - DEPLOYMENT_ROWS, max: BOARD_SIZE - 1 }
    : { min: 0, max: DEPLOYMENT_ROWS - 1 };
}
