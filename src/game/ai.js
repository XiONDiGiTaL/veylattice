/**
 * Veylattice tactical AI (M2-003).
 *
 * Three hard rules keep this honest:
 *
 *  1. It never bypasses the rules engine. `buildCandidates` only ever offers
 *     commands produced by the engine's own legal-action enumeration, and the
 *     caller submits them through `applyCommand`, which re-validates them.
 *  2. It never reads hidden information. `buildObservation` exposes the seat's
 *     own hand plus public board state and *counts* for the opponent; the pure
 *     decision function `choosePlan` receives that observation and the
 *     candidate list and has no access to the match state at all.
 *  3. It is bounded. Every decision loop checks an injected clock against a
 *     per-difficulty budget and keeps the best plan found so far, so a turn
 *     can never hang the interface.
 */

import {
  attacksFromCell,
  canStrikeNexusFrom,
  getLegalActions,
  lineOfSightOnBoard,
  relicAuras,
} from "./engine.js";
import { previewDamage } from "./elemental-rules.js";
import { BOARD_SIZE, START_VITALITY, enemyHomeRow } from "./constants.js";

/* ------------------------------------------------------------------ *
 * Difficulty and personality profiles
 * ------------------------------------------------------------------ */

/**
 * Difficulty changes the quality of the decision, never the resources:
 * time budget, candidate sampling, noise, and how well the AI models its own
 * retaliation risk or the opponent's next-turn threats.
 */
export const AI_DIFFICULTIES = Object.freeze({
  novice: Object.freeze({
    id: "novice",
    label: "Novice",
    description: "Legal but distractible: small search window, weak trade awareness.",
    timeBudgetMs: 8,
    maxCandidates: 90,
    explore: 4,
    noise: 0.4,
    retaliateAwareness: 0.25,
    threatAwareness: 0,
    moveAndAttack: false,
  }),
  standard: Object.freeze({
    id: "standard",
    label: "Standard",
    description: "Trades sensibly, advances, and looks for move-then-attack lines.",
    timeBudgetMs: 20,
    maxCandidates: 400,
    explore: 1,
    noise: 0.12,
    retaliateAwareness: 0.85,
    threatAwareness: 0.35,
    moveAndAttack: true,
  }),
  veteran: Object.freeze({
    id: "veteran",
    label: "Veteran",
    description: "Full candidate sweep, retaliation modelling and threat avoidance.",
    timeBudgetMs: 45,
    maxCandidates: 900,
    explore: 0,
    noise: 0.04,
    retaliateAwareness: 1,
    threatAwareness: 0.8,
    moveAndAttack: true,
  }),
  master: Object.freeze({
    id: "master",
    label: "Master",
    description: "Adds enemy best-response penalties and a larger positional budget.",
    timeBudgetMs: 120,
    maxCandidates: 1800,
    explore: 0,
    noise: 0,
    retaliateAwareness: 1,
    threatAwareness: 1,
    responseAwareness: 1,
    moveAndAttack: true,
  }),
});

export const AI_ARCHETYPES = Object.freeze({
  vanguard: Object.freeze({
    id: "vanguard",
    label: "Vanguard",
    description: "Aggressive pressure: advances and races the enemy Nexus.",
    aggression: 1.3,
    defense: 0.85,
    positioning: 1,
    elementPlay: 1,
    nexusFocus: 1.3,
  }),
  warden: Object.freeze({
    id: "warden",
    label: "Warden",
    description: "Attrition: keeps Vessels alive, punishes overextension.",
    aggression: 0.85,
    defense: 1.4,
    positioning: 1.1,
    elementPlay: 1,
    nexusFocus: 0.9,
  }),
  conductor: Object.freeze({
    id: "conductor",
    label: "Conductor",
    description: "Positional play that hunts elemental advantages and firing lanes.",
    aggression: 1,
    defense: 1,
    positioning: 1.35,
    elementPlay: 1.35,
    nexusFocus: 1,
  }),
});

export const DEFAULT_DIFFICULTY = "standard";
export const DEFAULT_ARCHETYPE = "vanguard";

export function resolveDifficulty(id) {
  return AI_DIFFICULTIES[id] ?? AI_DIFFICULTIES[DEFAULT_DIFFICULTY];
}

export function resolveArchetype(id) {
  return AI_ARCHETYPES[id] ?? AI_ARCHETYPES[DEFAULT_ARCHETYPE];
}

/* ------------------------------------------------------------------ *
 * Information-restricted observation
 * ------------------------------------------------------------------ */

function publicUnit(unit) {
  return {
    id: unit.id,
    owner: unit.owner,
    name: unit.name,
    element: unit.element,
    subtype: unit.subtype,
    attack: unit.attack,
    guard: unit.guard,
    maxGuard: unit.maxGuard,
    movement: unit.movement,
    range: unit.range,
    x: unit.x,
    y: unit.y,
    ready: unit.ready,
    hasMoved: unit.hasMoved,
    hasAttacked: unit.hasAttacked,
    keywords: [...(unit.keywords ?? [])],
    stunned: Boolean(unit.stunned),
  };
}

/**
 * Everything a player at `seat` is legitimately allowed to know.
 *
 * The opponent contributes counts only: no hand contents, no deck order.
 * Tests assert that this projection cannot leak a hidden card.
 */
export function buildObservation(state, seat) {
  const own = state.players[seat];
  const foe = state.players[seat === 0 ? 1 : 0];
  const units = Object.values(state.units);
  const hand = own.hand.map((card) => {
    const def = state.catalog.get(card.cardId);
    return {
      instanceId: card.instanceId,
      cardId: card.cardId,
      name: def?.name ?? card.cardId,
      category: def?.category ?? null,
      targeting: def?.targeting ?? null,
      effect: def?.effect ?? null,
      cost: def?.cost ?? 0,
      element: def?.element ?? null,
      attack: def?.attack ?? 0,
      guard: def?.guard ?? 0,
      movement: def?.movement ?? 0,
      range: def?.range ?? 0,
    };
  });
  const ownAuras = relicAuras(state, seat);
  const foeAuras = relicAuras(state, seat === 0 ? 1 : 0);
  const ownRelics = own.relics.map((relic) => {
    const def = state.catalog.get(relic.cardId);
    return { cardId: relic.cardId, name: def?.name ?? relic.cardId, effect: def?.effect ?? null };
  });
  return {
    seat,
    turn: state.turn,
    phase: state.phase,
    active: state.active === seat,
    own: {
      vitality: own.vitality,
      flux: own.flux,
      maxFlux: own.maxFlux,
      summonUsed: own.summonUsed,
      mulliganUsed: own.mulliganUsed,
      handCount: hand.length,
      deckCount: own.deck.length,
      discardCount: own.discard.length,
      attackBonus: ownAuras.attack,
      nexusArmor: ownAuras.armor,
      ward: ownAuras.ward,
      drawBonus: ownAuras.draw,
      relics: ownRelics,
      hand,
    },
    foe: {
      vitality: foe.vitality,
      handCount: foe.hand.length,
      deckCount: foe.deck.length,
      discardCount: foe.discard.length,
      unitCount: units.filter((u) => u.owner !== seat).length,
      relicCount: foe.relics.length,
      // Relics are open information: they sit on the table, visible to both
      // seats. Hand and deck contents are never exposed.
      nexusArmor: foeAuras.armor,
      ward: foeAuras.ward,
      relicEffectKinds: foe.relics.map((relic) => state.catalog.get(relic.cardId)?.effect?.kind ?? null),
    },
    units: units.map(publicUnit),
    board: state.board.slice(),
  };
}

/* ------------------------------------------------------------------ *
 * Candidate plans (engine-validated commands only)
 * ------------------------------------------------------------------ */

function attackCommand(unitId, target) {
  return target.type === "nexus"
    ? { type: "attack", unitId, target: "nexus" }
    : { type: "attack", unitId, targetId: target.unitId };
}

/**
 * Every legal plan the seat could submit right now, each as a list of
 * validated engine commands. Multi-command plans exist because a Vessel may
 * move and then attack in the same turn; scoring them together is what lets
 * the AI find move-then-strike lines instead of treating movement as noise.
 */
export function buildCandidates(state, seat, options = {}) {
  if (state.phase === "over" || state.active !== seat) return [];
  const difficulty = resolveDifficulty(options.difficulty);
  const actions = getLegalActions(state);
  const plans = [];

  for (const summon of actions.summons) {
    for (const cell of summon.cells) {
      plans.push({
        kind: "summon",
        cardId: summon.cardId,
        cell,
        commands: [{ type: "summon", instanceId: summon.instanceId, x: cell.x, y: cell.y }],
      });
    }
  }

  for (const entry of actions.units) {
    const unit = state.units[entry.unitId];
    if (!unit) continue;
    // `getLegalAttacks` already filters these, but `attacksFromCell` below does
    // not know about the unit's spent activation, so both flags are checked
    // here: a plan the engine would reject is never even proposed.
    const canAttack = !unit.hasAttacked;
    const canMove = !unit.hasMoved;
    if (!canAttack && !canMove) continue;
    for (const target of canAttack ? entry.attacks : []) {
      plans.push({
        kind: target.type === "nexus" ? "nexusAttack" : "attack",
        unitId: unit.id,
        target,
        commands: [attackCommand(unit.id, target)],
      });
    }
    if (difficulty.moveAndAttack && canAttack && canMove) {
      for (const cell of entry.moves) {
        // Moving onto the enemy home row with the board clear unlocks a Nexus strike.
        const targets = attacksFromCell(state, unit.id, cell.x, cell.y);
        if (canStrikeNexusFrom(state, unit, cell.x, cell.y)) targets.push({ type: "nexus" });
        for (const target of targets) {
          plans.push({
            kind: "moveAttack",
            unitId: unit.id,
            cell,
            target,
            commands: [
              { type: "move", unitId: unit.id, x: cell.x, y: cell.y },
              attackCommand(unit.id, target),
            ],
          });
        }
      }
    }
    for (const cell of canMove ? entry.moves : []) {
      plans.push({
        kind: "move",
        unitId: unit.id,
        cell,
        commands: [{ type: "move", unitId: unit.id, x: cell.x, y: cell.y }],
      });
    }
  }

  for (const action of actions.actions) {
    if (action.targeting === "none") {
      plans.push({
        kind: "playAction",
        instanceId: action.instanceId,
        cardId: action.cardId,
        targetId: null,
        commands: [{ type: "playAction", instanceId: action.instanceId }],
      });
      continue;
    }
    for (const targetId of action.targetIds) {
      plans.push({
        kind: "playAction",
        instanceId: action.instanceId,
        cardId: action.cardId,
        targetId,
        commands: [{ type: "playAction", instanceId: action.instanceId, targetId }],
      });
    }
  }

  for (const relic of actions.relics) {
    plans.push({
      kind: "playRelic",
      instanceId: relic.instanceId,
      cardId: relic.cardId,
      commands: [{ type: "playRelic", instanceId: relic.instanceId }],
    });
  }

  if (actions.canMulligan) {
    for (const card of state.players[seat].hand) {
      plans.push({
        kind: "mulligan",
        cardId: card.cardId,
        commands: [{ type: "mulligan", instanceId: card.instanceId }],
      });
    }
  }

  plans.push({ kind: "endTurn", commands: [{ type: "endTurn" }] });
  return plans;
}

/* ------------------------------------------------------------------ *
 * Scoring
 * ------------------------------------------------------------------ */

function unitValue(unit) {
  return 6 + unit.attack * 3 + unit.guard * 2 + unit.movement + unit.range;
}

function distanceBetween(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Manhattan reach of every enemy, with no line-of-sight requirement.
 * This is a deliberately loose upper bound: it is used only as a soft penalty,
 * never to declare an action legal.
 */
function threatAt(observation, seat, cell) {
  let threat = 0;
  for (const unit of observation.units) {
    if (unit.owner === seat) continue;
    if (distanceBetween(unit, cell) > unit.movement + unit.range) continue;
    threat += unit.attack;
  }
  return { threat };
}

/**
 * Expected value of one attack, from the attacker's own view.
 * `origin` is where the attacker would strike from (its cell, or the
 * destination cell of a preceding move).
 */
function evaluateAttack(observation, attacker, target, origin, difficulty, weights) {
  // Relic attack auras apply to this seat's Vessel attacks, so score the
  // effective Attack the engine will actually use.
  const power = attacker.attack + (observation.own.attackBonus ?? 0);
  if (target.type === "nexus") {
    const armor = observation.foe.nexusArmor ?? 0;
    const raw = Math.max(0, power);
    const damage = raw <= 0 ? 0 : armor > 0 ? Math.max(1, raw - armor) : raw;
    const lethal = damage >= observation.foe.vitality;
    return {
      score: lethal ? 1000 : damage * 2.2 * weights.nexusFocus,
      lethal,
      damage,
      kills: lethal,
      retaliation: 0,
      attackerDies: false,
    };
  }

  const defender = observation.units.find((u) => u.id === target.unitId);
  if (!defender) return null;

  const packet = previewDamage(power, attacker.element, defender.element);
  const dealt = Math.min(packet.damage, defender.guard);
  const kills = defender.guard - packet.damage <= 0;
  const distance = distanceBetween(origin, defender);
  const canRetaliate =
    defender.range >= distance &&
    lineOfSightOnBoard(observation.board, origin, { x: defender.x, y: defender.y });
  const retaliation = canRetaliate
    ? previewDamage(defender.attack, defender.element, attacker.element).damage
    : 0;
  const attackerDies = canRetaliate && attacker.guard - retaliation <= 0;

  let score = dealt * 1.15 * weights.aggression;
  if (kills) score += unitValue(defender) * 1.15;
  if (packet.relation === "advantage") score += 2 * weights.elementPlay;
  if (packet.relation === "disadvantage" && !kills) score -= 1.5;

  const awareness = difficulty.retaliateAwareness;
  if (awareness > 0 && canRetaliate) {
    if (attackerDies) {
      const loss = unitValue(attacker) * 1.4;
      const gain = kills ? unitValue(defender) * 1.4 : 0;
      score -= (loss - gain * 0.5) * awareness * weights.defense;
    } else {
      score -= retaliation * 0.45 * awareness * weights.defense;
    }
  }
  if (kills && observation.foe.unitCount === 1) {
    score += 8 * weights.nexusFocus; // clearing the board opens the Nexus
  }

  return { score, kills, damage: dealt, retaliation, attackerDies, relation: packet.relation };
}

/** Positional value of standing on `cell`, independent of attacking. */
function evaluatePosition(observation, unit, cell, difficulty, weights) {
  const homeRow = enemyHomeRow(unit.owner);
  const before = Math.abs(unit.y - homeRow);
  const after = Math.abs(cell.y - homeRow);
  let score = (before - after) * 1.6 * weights.aggression * weights.nexusFocus;

  const { threat } = threatAt(observation, unit.owner, cell);
  score -= threat * 0.35 * weights.defense * difficulty.threatAwareness;
  if (difficulty.threatAwareness > 0 && threat >= unit.guard && threat > 0) {
    score -= unitValue(unit) * 0.5 * weights.defense * difficulty.threatAwareness;
  }
  if (cell.y === homeRow && observation.foe.unitCount === 0) {
    score += 6 * weights.nexusFocus;
  }
  score += 0.4 * weights.positioning * (unit.range + unit.movement - 2);
  return { score, threat };
}

function evaluateSummon(observation, card, cell, difficulty, weights) {
  const homeRow = enemyHomeRow(observation.seat);
  const progress = BOARD_SIZE - 1 - Math.abs(cell.y - homeRow);
  const base = card.attack * 1.2 + card.guard * 0.9 + card.movement * 0.4 + card.range * 0.5;
  const { threat } = threatAt(observation, observation.seat, cell);
  return {
    score:
      base * 0.5 +
      progress * 0.8 * weights.aggression -
      card.cost * 0.4 -
      threat * 0.25 * weights.defense * difficulty.threatAwareness,
    threat,
  };
}

/** Worst-case enemy retaliation against our board after a plan (master only). */
function enemyResponsePenalty(observation, unit, cell, weights) {
  let penalty = 0;
  for (const enemy of observation.units) {
    if (enemy.owner === observation.seat) continue;
    const distance = distanceBetween(enemy, cell);
    if (distance > enemy.movement + enemy.range) continue;
    const packet = previewDamage(enemy.attack, enemy.element, unit.element);
    penalty += Math.min(packet.damage, 6) * 0.35 * weights.defense;
  }
  return penalty;
}

/**
 * Score a one-shot Action. Pure, and restricted to public information plus
 * the AI's own hand.
 */
function evaluateAction(observation, card, targetId, weights) {
  const effect = card?.effect;
  if (!effect) return { score: -Infinity };
  const cost = card.cost ?? 0;
  const own = observation.seat;

  if (effect.kind === "damage" || effect.kind === "heal" || effect.kind === "buff") {
    const target = observation.units.find((u) => u.id === targetId);
    if (!target) return { score: -Infinity };
    const friendly = target.owner === own;

    if (effect.kind === "damage") {
      if (friendly) return { score: -Infinity };
      const packet = previewDamage(effect.amount, card.element, target.element);
      // Relic ward is open information and applies to every Action packet.
      const damage = Math.max(1, packet.damage - (observation.foe.ward ?? 0));
      const dealt = Math.min(damage, target.guard);
      const kills = target.guard - damage <= 0;
      let score = dealt * 1.2 + (kills ? unitValue(target) * 1.15 : 0) - cost * 0.35;
      if (packet.relation === "advantage") score += 1.5 * weights.elementPlay;
      if (kills && observation.foe.unitCount === 1) score += 8 * weights.nexusFocus;
      return { score, kills, damage: dealt, relation: packet.relation };
    }

    if (effect.kind === "heal") {
      if (!friendly) return { score: -Infinity };
      const healed = Math.min(Math.max(0, target.maxGuard - target.guard), effect.amount);
      // Healing an undamaged Vessel does literally nothing: never offer it.
      if (healed <= 0) return { score: -Infinity };
      return { score: healed * 0.85 * weights.defense - cost * 0.25, healed };
    }

    if (!friendly) return { score: -Infinity };
    return {
      score:
        (effect.attack ?? 0) * 1.4 * weights.aggression +
        (effect.guard ?? 0) * 0.8 * weights.defense -
        cost * 0.3,
    };
  }

  if (effect.kind === "drain") {
    const target = observation.units.find((u) => u.id === targetId);
    if (!target || target.owner === own) return { score: -Infinity };
    const warded = observation.foe.ward ?? 0;
    const packet = previewDamage(effect.amount, card.element, target.element);
    const dealt = Math.min(Math.max(1, packet.damage - warded), target.guard);
    const heal = Math.min(Math.max(1, Math.floor(dealt / 2)), START_VITALITY - observation.own.vitality);
    const kills = target.guard - dealt <= 0;
    return {
      score:
        dealt * 1.2 + heal * 1.8 * weights.defense + (kills ? unitValue(target) * 1.1 : 0) - cost * 0.3,
      kills,
      damage: dealt,
    };
  }

  if (effect.kind === "stun") {
    const target = observation.units.find((u) => u.id === targetId);
    if (!target || target.owner === own || target.stunned) return { score: -Infinity };
    return {
      score: (4 + target.attack * 1.1 + target.guard * 0.3) * weights.positioning - cost * 0.3,
    };
  }

  if (effect.kind === "ready") {
    const target = observation.units.find((u) => u.id === targetId);
    if (!target || target.owner !== own) return { score: -Infinity };
    // Only worth a card if the Vessel has already spent its action.
    if (!target.hasAttacked && !target.hasMoved) return { score: -Infinity };
    return { score: (3 + target.attack * 0.9) * weights.aggression - cost * 0.3 };
  }

  switch (effect.kind) {
    case "nexusHeal": {
      const healed = Math.min(effect.amount, START_VITALITY - observation.own.vitality);
      if (healed <= 0) return { score: -Infinity };
      return { score: healed * 1.7 * weights.defense - cost * 0.3, healed };
    }
    case "revive": {
      // Without a defeated Vessel the card would do nothing.
      if (observation.own.discardCount === 0) return { score: -Infinity };
      return { score: 5.5 * weights.positioning - cost * 0.3 };
    }
    case "flux": {
      const gained = Math.min(effect.amount, observation.own.maxFlux - observation.own.flux);
      if (gained <= 0) return { score: -Infinity };
      return { score: gained * 1.5 - cost * 0.4, gained };
    }
    case "damageAll": {
      const enemies = observation.units.filter((unit) => unit.owner !== own);
      // A board wipe against an empty board is a wasted card, not a style choice.
      if (enemies.length === 0) return { score: -Infinity };
      let score = -cost * 0.35;
      let kills = 0;
      for (const unit of enemies) {
        const packet = previewDamage(effect.amount, card.element, unit.element);
        score += Math.min(packet.damage, unit.guard) * 1.1;
        if (unit.guard - packet.damage <= 0) {
          kills += 1;
          score += unitValue(unit) * 1.1;
        }
      }
      return { score, kills };
    }
    case "nexusDamage": {
      const armor = observation.foe.nexusArmor ?? 0;
      const damage = armor > 0 ? Math.max(1, effect.amount - armor) : effect.amount;
      const lethal = damage >= observation.foe.vitality;
      return {
        score: lethal ? 1000 : damage * 2.3 * weights.nexusFocus - cost * 0.3,
        lethal,
        damage,
      };
    }
    case "draw":
      if (observation.own.deckCount === 0) return { score: -Infinity };
      return { score: effect.amount * 1.9 - cost * 0.3 };
    default:
      return { score: -Infinity };
  }
}

const RELIC_VALUE = Object.freeze({
  attackAura: 4,
  armorAura: 3,
  guardAura: 2.5,
  mendAura: 2.5,
  wardAura: 3.5,
  swiftAura: 4.5,
  drawAura: 4,
});

/**
 * Score one plan. Pure: observation plus candidate, no match state.
 */
export function evaluatePlan(plan, observation, difficulty, weights) {
  switch (plan.kind) {
    case "summon": {
      const card = observation.own.hand.find((c) => c.cardId === plan.cardId);
      if (!card) return { score: -Infinity };
      return evaluateSummon(observation, card, plan.cell, difficulty, weights);
    }
    case "attack":
    case "nexusAttack": {
      const attacker = observation.units.find((u) => u.id === plan.unitId);
      if (!attacker) return { score: -Infinity };
      return (
        evaluateAttack(observation, attacker, plan.target, attacker, difficulty, weights) ?? {
          score: -Infinity,
        }
      );
    }
    case "moveAttack": {
      const attacker = observation.units.find((u) => u.id === plan.unitId);
      if (!attacker) return { score: -Infinity };
      const attack = evaluateAttack(
        observation,
        attacker,
        plan.target,
        plan.cell,
        difficulty,
        weights,
      );
      if (!attack) return { score: -Infinity };
      const position = evaluatePosition(observation, attacker, plan.cell, difficulty, weights);
      const response =
        difficulty.responseAwareness > 0
          ? enemyResponsePenalty(observation, attacker, plan.cell, weights)
          : 0;
      return { ...attack, score: attack.score + position.score * 0.2 - response - 0.6 };
    }
    case "move": {
      const unit = observation.units.find((u) => u.id === plan.unitId);
      if (!unit) return { score: -Infinity };
      const position = evaluatePosition(observation, unit, plan.cell, difficulty, weights);
      const response =
        difficulty.responseAwareness > 0
          ? enemyResponsePenalty(observation, unit, plan.cell, weights)
          : 0;
      return { ...position, score: position.score - response - 0.4 };
    }
    case "playAction": {
      const card = observation.own.hand.find((c) => c.instanceId === plan.instanceId);
      if (!card) return { score: -Infinity };
      return evaluateAction(observation, card, plan.targetId, weights);
    }
    case "playRelic": {
      const card = observation.own.hand.find((c) => c.instanceId === plan.instanceId);
      if (!card) return { score: -Infinity };
      const base = RELIC_VALUE[card.effect?.kind] ?? 2;
      return { score: base - (card.cost ?? 0) * 0.4 };
    }
    case "mulligan": {
      const card = observation.own.hand.find((c) => c.cardId === plan.cardId);
      if (!card) return { score: -Infinity };
      const stuck = card.cost > observation.own.maxFlux;
      return { score: stuck ? 1.2 : -2 };
    }
    case "endTurn":
      return { score: 0 };
    default:
      return { score: -Infinity };
  }
}

/* ------------------------------------------------------------------ *
 * Decision
 * ------------------------------------------------------------------ */

/**
 * Pick a plan from scored candidates.
 *
 * @param {object[]} candidates - output of buildCandidates (already legal)
 * @param {object} observation - output of buildObservation
 * @param {object} [options]
 * @param {string} [options.difficulty]
 * @param {string} [options.archetype]
 * @param {() => number} [options.rng] - injected randomness for determinism
 * @param {() => number} [options.now] - injected clock for the time bound
 * @param {number} [options.timeBudgetMs] - overrides the difficulty budget
 * @returns {{commands: object[], kind: string, score: number, considered: number} | null}
 */
export function choosePlan(candidates, observation, options = {}) {
  if (!candidates || candidates.length === 0) return null;
  const difficulty = resolveDifficulty(options.difficulty);
  const weights = resolveArchetype(options.archetype);
  const rng = options.rng ?? Math.random;
  const now = options.now ?? (() => Date.now());
  const budget = options.timeBudgetMs ?? difficulty.timeBudgetMs;
  const limit = options.maxCandidates ?? difficulty.maxCandidates;
  const started = now();

  const scored = [];
  let truncated = false;
  for (let i = 0; i < candidates.length; i += 1) {
    if (scored.length >= limit) {
      truncated = true;
      break;
    }
    if (i % 8 === 0 && now() - started > budget) {
      truncated = true;
      break;
    }
    const plan = candidates[i];
    const evaluation = evaluatePlan(plan, observation, difficulty, weights);
    if (!Number.isFinite(evaluation.score)) continue;
    const jitter = difficulty.noise > 0 ? (rng() * 2 - 1) * difficulty.noise : 0;
    scored.push({ plan, score: evaluation.score + jitter, evaluation });
  }

  if (scored.length === 0) return null;
  scored.sort((a, b) => b.score - a.score);

  // Higher difficulty explores less: novice sometimes takes a plainly worse plan.
  const windowSize = Math.min(1 + difficulty.explore, scored.length);
  const pickIndex =
    difficulty.explore > 0 ? Math.floor(rng() * windowSize) : Math.min(0, windowSize - 1);
  const chosen = scored[Math.min(pickIndex, windowSize - 1)];

  return {
    commands: chosen.plan.commands,
    kind: chosen.plan.kind,
    score: chosen.score,
    evaluation: chosen.evaluation,
    considered: scored.length,
    truncated,
    difficulty: difficulty.id,
    archetype: weights.id,
  };
}

/**
 * One AI decision, from match state to validated command list.
 * The returned commands are submitted through applyCommand by the caller; any
 * that the engine rejects simply do not change state.
 */
export function decideNextCommands(state, seat, options = {}) {
  const observation = buildObservation(state, seat);
  if (state.phase === "over" || state.active !== seat) {
    return { commands: [], observation, plan: null, considered: 0 };
  }
  const candidates = buildCandidates(state, seat, options);
  const plan = choosePlan(candidates, observation, options);
  return {
    commands: plan ? plan.commands : [{ type: "endTurn" }],
    observation,
    plan,
    considered: candidates.length,
  };
}

/** Short human-readable summary used by the HUD log. */
export function describePlan(plan) {
  if (!plan) return "Passed.";
  switch (plan.kind) {
    case "summon":
      return "Summoning a Vessel.";
    case "attack":
      return "Attacking a Vessel.";
    case "nexusAttack":
      return "Striking the Nexus.";
    case "moveAttack":
      return "Repositioning, then attacking.";
    case "move":
      return "Repositioning.";
    case "playAction":
      return "Casting an Action.";
    case "playRelic":
      return "Setting a Relic.";
    case "mulligan":
      return "Using a mulligan.";
    case "endTurn":
      return "Ending the turn.";
    default:
      return "Acting.";
  }
}
