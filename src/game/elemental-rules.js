export const ELEMENTS = Object.freeze(["wood", "fire", "earth", "metal", "water"]);
const OVERCOMES = Object.freeze({ wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" });
export function overcomes(a, b) { return OVERCOMES[a] === b; }
export function getEffectiveStats(attacker, defender) {
  const attack = Math.max(1, Math.floor(attacker.attack / (overcomes(defender.element, attacker.element) ? 2 : 1)));
  const guard = Math.max(1, Math.floor(defender.guard / (overcomes(attacker.element, defender.element) ? 2 : 1)));
  return { attack, guard, attackReduced: attack !== attacker.attack, guardReduced: guard !== defender.guard };
}
