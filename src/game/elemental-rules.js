/**
 * Canonical elemental resolution module.
 *
 * This supersedes the earlier halved-Guard comparison found in
 * docs/ELEMENTAL_SYSTEM.md (see that file's status note). GAME_RULES.md is
 * authoritative:
 *   - attacker element overcomes defender element -> floor(1.5 x Attack)
 *   - defender element overcomes attacker element -> max(1, floor(0.5 x Attack))
 *   - otherwise neutral -> Attack
 *
 * Damage is resolved from the attacker's *current* Attack only. Guard is
 * persistent durability and is never pre-halved by this module.
 */

export const ELEMENTS = Object.freeze([
  "wood",
  "fire",
  "earth",
  "metal",
  "water",
]);

/** Wood > Earth > Water > Fire > Metal > Wood */
const OVERCOMES = Object.freeze({
  wood: "earth",
  earth: "water",
  water: "fire",
  fire: "metal",
  metal: "wood",
});

export const ADVANTAGE_MULTIPLIER = 1.5;
export const DISADVANTAGE_MULTIPLIER = 0.5;

export function isElement(value) {
  return ELEMENTS.includes(value);
}

/** True when `attacker` element overcomes `defender` element. */
export function overcomes(attacker, defender) {
  return OVERCOMES[attacker] === defender;
}

/**
 * Relationship from the acting unit's perspective.
 * @returns {"advantage"|"disadvantage"|"neutral"}
 */
export function relation(attackerElement, defenderElement) {
  if (overcomes(attackerElement, defenderElement)) return "advantage";
  if (overcomes(defenderElement, attackerElement)) return "disadvantage";
  return "neutral";
}

/**
 * Damage one packet deals, after the elemental cycle.
 * Integer rounding happens exactly once, here, and the result is clamped to 0.
 */
export function damageFor(attack, attackerElement, defenderElement) {
  const current = Number.isFinite(attack) ? Math.max(0, Math.trunc(attack)) : 0;
  const rel = relation(attackerElement, defenderElement);
  if (rel === "advantage") {
    return Math.max(0, Math.floor(current * ADVANTAGE_MULTIPLIER));
  }
  if (rel === "disadvantage") {
    return Math.max(1, Math.floor(current * DISADVANTAGE_MULTIPLIER));
  }
  return current;
}

/** Human-readable reason string for HUD previews. */
export function describeRelation(attackerElement, defenderElement) {
  const rel = relation(attackerElement, defenderElement);
  if (rel === "advantage") {
    return `${attackerElement} overcomes ${defenderElement} (x1.5 damage)`;
  }
  if (rel === "disadvantage") {
    return `${defenderElement} resists ${attackerElement} (x0.5 damage)`;
  }
  return `${attackerElement} vs ${defenderElement} (neutral)`;
}

/**
 * Damage preview for the HUD: the packet plus the reason it has that value.
 */
export function previewDamage(attack, attackerElement, defenderElement) {
  return {
    baseAttack: attack,
    damage: damageFor(attack, attackerElement, defenderElement),
    relation: relation(attackerElement, defenderElement),
    reason: describeRelation(attackerElement, defenderElement),
  };
}
