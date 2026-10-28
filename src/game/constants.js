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

/** Deck composition rules. Minimum total and Action minimum are proposed. */
export const DECK_RULES = Object.freeze({
  minTotal: 20,
  maxTotal: 40,
  maxCopies: 3,
  minVessels: 10,
  minActions: 5,
});

/**
 * Temporary M1 practice profile.
 *
 * The canonical starter set ships 18 Vessels and no Actions, so the full
 * DECK_RULES Action minimum cannot be satisfied until M2-001/M2-002 add
 * Action and Relic cards. This profile is deliberately weaker and is NOT a
 * replacement for the canonical rules; it exists only so the offline slice
 * can be played and tested honestly.
 */
export const PRACTICE_DECK_RULES = Object.freeze({
  ...DECK_RULES,
  minActions: 0,
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
