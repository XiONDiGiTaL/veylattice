/**
 * Printed card text.
 *
 * One formatter for the HUD and for the printed card faces, so a card cannot say
 * one thing on the battlefield and another on its artwork. DOM-free on purpose:
 * the card-image build script imports this module directly.
 */

import { VESSEL_KEYWORDS } from "./constants.js";

/** One line of plain English for a typed effect. Display only. */
export function effectSummary(def) {
  const effect = def?.effect;
  if (!effect) return def?.flavorText ?? "";
  switch (effect.kind) {
    case "damage":
      return `Deal ${effect.amount} damage, resolved elementally.`;
    case "damageAll":
      return `Deal ${effect.amount} damage to every enemy Vessel.`;
    case "heal":
      return `Restore ${effect.amount} Guard to a Vessel you control.`;
    case "buff":
      return `Grant +${effect.attack ?? 0} Attack and +${effect.guard ?? 0} Guard permanently.`;
    case "draw":
      return `Draw ${effect.amount} card${effect.amount === 1 ? "" : "s"}.`;
    case "nexusDamage":
      return `Deal ${effect.amount} damage to the enemy Nexus.`;
    case "nexusHeal":
      return `Restore ${effect.amount} Vitality to your Nexus.`;
    case "drain":
      return `Deal ${effect.amount} damage and restore half of it to your Nexus.`;
    case "stun":
      return "Stun an enemy Vessel: it misses its next activation.";
    case "ready":
      return "Ready a Vessel you control so it can move and attack again.";
    case "revive":
      return "Return your most expensive defeated Vessel from the discard to your hand.";
    case "flux":
      return `Gain ${effect.amount} Flux this turn.`;
    case "attackAura":
      return `Relic · your Vessels' attacks deal +${effect.amount}.`;
    case "armorAura":
      return `Relic · your Nexus takes ${effect.amount} less damage.`;
    case "mendAura":
      return `Relic · at the start of your turn, heal ${effect.amount} Guard.`;
    case "guardAura":
      return `Relic · your Vessels have +${effect.amount} Guard.`;
    case "wardAura":
      return `Relic · your Vessels take ${effect.amount} less Action damage.`;
    case "swiftAura":
      return "Relic · your Vessels enter play ready.";
    case "drawAura":
      return `Relic · draw ${effect.amount} extra card at the start of your turn.`;
    default:
      return def.flavorText ?? "";
  }
}

/** Human label for a closed keyword id: `deathrattleDraw` -> `Deathrattle Draw`. */
export function keywordLabel(keyword) {
  return String(keyword)
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

/** Plain English for a Vessel's closed keyword list. */
export function abilitySummary(def) {
  const keywords = def?.abilities ?? [];
  return keywords
    .map((keyword) => `${keywordLabel(keyword)} — ${VESSEL_KEYWORDS[keyword] ?? ""}`)
    .join(" ");
}

export function categoryLabel(def) {
  if (def.category === "action") return "Action";
  if (def.category === "relic") return "Relic";
  return "Vessel";
}

/**
 * Everything a printed card states, in print order.
 * `rules` is always upright text; `flavor` is always the italic line.
 */
export function cardCopy(def) {
  const category = def.category;
  const rules =
    category === "vessel"
      ? abilitySummary(def) || def.designDescription || def.role || ""
      : effectSummary(def);
  return {
    category,
    categoryLabel: categoryLabel(def),
    rules,
    flavor: def.flavorText ?? "",
  };
}
