/**
 * Canonical rule constants for the M1 offline slice.
 *
 * Source of truth: GAME_RULES.md. Numbers marked "proposed" there are kept
 * here as named constants so balance can change without engine edits.
 */

export const RULES_VERSION = "m1-rules-1";

/**
 * Battlefield geometry.
 *
 * Every rule that cares about the grid derives from these two numbers: cell
 * indices, in-bounds checks, deployment rows, home rows, the terrain map and
 * the UI's zone tinting. Resizing the arena is therefore a one-line change
 * (`BOARD_SIZE`/`DEPLOYMENT_ROWS`), not an engine rewrite; the exported
 * helpers take optional overrides so alternative sizes are testable without
 * touching the shipped arena.
 *
 * The shipped arena is 5x5: 25 playable tiles, two deployment rows per seat
 * and one contested row between them.
 */
export const BOARD_SIZE = 5;
export const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;

export const START_VITALITY = 30;
export const OPENING_HAND = 5;
export const MAX_FLUX = 10;
export const MAX_UNITS_PER_SEAT = 4;
/**
 * Four Relic slots per seat: the four back-row card zones are the physical
 * field for this capacity, so the rule and the interface cannot disagree.
 */
export const MAX_RELICS_PER_SEAT = 4;

/** Every seat receives this many milliseconds of main-phase time. */
export const TURN_MS = 120_000;

/**
 * Rows 0..n-1 belong to seat 1's deployment zone; the last n rows to seat 0.
 * Must stay below BOARD_SIZE / 2 so the two zones never overlap.
 */
export const DEPLOYMENT_ROWS = 2;

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
  nexusHeal: Object.freeze({ scope: "action", min: 1, max: 8 }),
  drain: Object.freeze({ scope: "action", min: 1, max: 8 }),
  stun: Object.freeze({ scope: "action" }),
  ready: Object.freeze({ scope: "action" }),
  revive: Object.freeze({ scope: "action" }),
  flux: Object.freeze({ scope: "action", min: 1, max: 3 }),
  attackAura: Object.freeze({ scope: "relic", min: 1, max: 3 }),
  armorAura: Object.freeze({ scope: "relic", min: 1, max: 3 }),
  mendAura: Object.freeze({ scope: "relic", min: 1, max: 4 }),
  guardAura: Object.freeze({ scope: "relic", min: 1, max: 4 }),
  wardAura: Object.freeze({ scope: "relic", min: 1, max: 2 }),
  swiftAura: Object.freeze({ scope: "relic" }),
  drawAura: Object.freeze({ scope: "relic", min: 1, max: 1 }),
});

/**
 * Target mode each effect kind requires. Validated at catalog build so an
 * Action can never be printed with a mode its handler cannot honour.
 * Relics have no targeting field at all.
 */
export const EFFECT_TARGETING = Object.freeze({
  damage: "enemyUnit",
  damageAll: "none",
  heal: "friendlyUnit",
  buff: "friendlyUnit",
  draw: "none",
  nexusDamage: "none",
  nexusHeal: "none",
  drain: "enemyUnit",
  stun: "enemyUnit",
  ready: "friendlyUnit",
  revive: "none",
  flux: "none",
});

/**
 * Closed Vessel keyword vocabulary. Keywords are engine behaviour, so they are
 * a short allowlist rather than free text on a card.
 */
export const VESSEL_KEYWORDS = Object.freeze({
  swift: "Enters play ready instead of waiting a turn.",
  stalwart: "Enters play with 2 additional Guard.",
  deathrattleDraw: "When defeated, its controller draws a card.",
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
  "knight",
  "guardian",
  "rogue",
  "mage",
  "priest",
  "artificer",
  "archer",
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
export function enemyHomeRow(seat, size = BOARD_SIZE) {
  return seat === 0 ? 0 : size - 1;
}

/** Deployment rows for a seat, inclusive. */
export function deploymentBounds(seat, size = BOARD_SIZE, rows = DEPLOYMENT_ROWS) {
  if (!Number.isInteger(size) || !Number.isInteger(rows) || rows < 1 || rows * 2 > size) {
    throw new Error(`Invalid battlefield geometry: size ${size}, ${rows} deployment rows.`);
  }
  return seat === 0
    ? { min: size - rows, max: size - 1 }
    : { min: 0, max: rows - 1 };
}

/**
 * Which side of the arena a row belongs to.
 * Presentation reads this instead of hardcoding row numbers, so a resized
 * arena keeps its colour language without touching the renderer.
 */
export function rowOwner(y, size = BOARD_SIZE, rows = DEPLOYMENT_ROWS) {
  const home = deploymentBounds(0, size, rows);
  const away = deploymentBounds(1, size, rows);
  if (y >= home.min) return "home";
  if (y <= away.max) return "opponent";
  return "contested";
}
