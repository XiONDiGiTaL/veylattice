/**
 * Veylattice deterministic match engine (M1 offline slice).
 *
 * Pure rules only: no DOM, no network, no clock reads unless injected.
 * State is plain data and every accepted command produces a new version,
 * so stale or illegal commands can be detected and discarded without
 * mutating the authoritative state.
 *
 * Command flow: applyCommand(state, command, { now }) -> { ok, state, events }
 */

import {
  BOARD_SIZE,
  CELL_COUNT,
  DECK_RULES,
  MAX_FLUX,
  MAX_UNITS_PER_SEAT,
  OPENING_HAND,
  PRACTICE_DECK_RULES,
  RULES_VERSION,
  START_VITALITY,
  TURN_MS,
  deploymentBounds,
  enemyHomeRow,
} from "./constants.js";
import { damageFor, previewDamage } from "./elemental-rules.js";
import { buildPracticeDeck, validateDeck } from "./content.js";

export const ERROR_CODES = Object.freeze({
  INVALID_COMMAND: "INVALID_COMMAND",
  UNKNOWN_COMMAND: "UNKNOWN_COMMAND",
  GAME_OVER: "GAME_OVER",
  STALE_STATE: "STALE_STATE",
  DEADLINE_PASSED: "DEADLINE_PASSED",
  DEADLINE_NOT_REACHED: "DEADLINE_NOT_REACHED",
  CARD_NOT_IN_HAND: "CARD_NOT_IN_HAND",
  UNSUPPORTED_CARD: "UNSUPPORTED_CARD",
  INSUFFICIENT_FLUX: "INSUFFICIENT_FLUX",
  SUMMON_LIMIT: "SUMMON_LIMIT",
  UNIT_LIMIT: "UNIT_LIMIT",
  ILLEGAL_CELL: "ILLEGAL_CELL",
  CELL_OCCUPIED: "CELL_OCCUPIED",
  UNKNOWN_UNIT: "UNKNOWN_UNIT",
  NOT_YOUR_UNIT: "NOT_YOUR_UNIT",
  UNIT_NOT_READY: "UNIT_NOT_READY",
  ALREADY_MOVED: "ALREADY_MOVED",
  ALREADY_ATTACKED: "ALREADY_ATTACKED",
  OUT_OF_RANGE: "OUT_OF_RANGE",
  NO_LINE_OF_SIGHT: "NO_LINE_OF_SIGHT",
  ILLEGAL_TARGET: "ILLEGAL_TARGET",
  NEXUS_BLOCKED: "NEXUS_BLOCKED",
  NOT_ON_HOME_ROW: "NOT_ON_HOME_ROW",
  DECK_EMPTY: "DECK_EMPTY",
  MULLIGAN_USED: "MULLIGAN_USED",
});

/* ------------------------------------------------------------------ *
 * Coordinates
 * ------------------------------------------------------------------ */

export function cellIndex(x, y) {
  return y * BOARD_SIZE + x;
}

export function cellCoords(index) {
  return { x: index % BOARD_SIZE, y: Math.floor(index / BOARD_SIZE) };
}

function inBounds(x, y) {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < BOARD_SIZE && y < BOARD_SIZE;
}

export function unitAt(state, x, y) {
  if (!inBounds(x, y)) return null;
  const id = state.board[cellIndex(x, y)];
  return id === null ? null : state.units[id];
}

export function unitsOf(state, seat) {
  return Object.values(state.units).filter((u) => u.owner === seat);
}

export function opponentOf(seat) {
  return seat === 0 ? 1 : 0;
}

/* ------------------------------------------------------------------ *
 * Setup
 * ------------------------------------------------------------------ */

function shuffleInPlace(items, rng) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = items[i];
    items[i] = items[j];
    items[j] = tmp;
  }
  return items;
}

export function createUnit(state, def, owner, x, y, options = {}) {
  const id = `u${state.nextUnitSeq}`;
  state.nextUnitSeq += 1;
  return {
    id,
    cardId: def.id,
    name: def.name,
    owner,
    element: def.element,
    subtype: def.subtypes?.[0] ?? null,
    attack: def.attack,
    baseGuard: def.guard,
    maxGuard: def.guard,
    guard: def.guard,
    movement: def.movement,
    range: def.range,
    x,
    y,
    ready: options.ready === true,
    hasMoved: false,
    hasAttacked: false,
    summonedOnTurn: state.turn,
    modifiers: [],
  };
}

/** Place an already-built unit on the board. Performs no validation. */
export function insertUnit(state, unit) {
  state.board[cellIndex(unit.x, unit.y)] = unit.id;
  state.units[unit.id] = unit;
  return unit;
}

function removeUnit(state, unit) {
  state.board[cellIndex(unit.x, unit.y)] = null;
  delete state.units[unit.id];
  state.players[unit.owner].discard.push(unit.cardId);
}

function makePlayer() {
  return {
    vitality: START_VITALITY,
    maxFlux: 0,
    flux: 0,
    hand: [],
    deck: [],
    discard: [],
    relics: [],
    summonUsed: 0,
    mulliganUsed: 0,
    fatigue: 0,
  };
}

/**
 * Create a match.
 *
 * @param {object} options
 * @param {object} options.catalog - result of createCatalog()
 * @param {string[][]} [options.decks] - card ids per seat (seat 0 first)
 * @param {() => number} [options.rng] - uniform [0,1) source, injectable for tests
 * @param {number} [options.now] - epoch ms used for the first deadline
 * @param {object} [options.deckRules] - defaults to the documented M1 practice profile
 */
export function createMatch(options = {}) {
  const {
    catalog,
    rng = Math.random,
    now = Date.now(),
    deckRules = PRACTICE_DECK_RULES,
  } = options;

  if (!catalog || !(catalog.byId instanceof Map)) {
    throw new Error("createMatch requires a catalog from createCatalog().");
  }

  const decks = options.decks ?? [buildPracticeDeck(catalog), buildPracticeDeck(catalog)];

  const state = {
    rulesVersion: RULES_VERSION,
    version: 0,
    turn: 1,
    active: 0,
    phase: "main",
    board: new Array(CELL_COUNT).fill(null),
    units: {},
    players: [makePlayer(), makePlayer()],
    catalog: catalog.byId,
    nextInstanceSeq: 0,
    nextUnitSeq: 0,
    deadlineAt: now + TURN_MS,
    result: null,
  };

  for (const seat of [0, 1]) {
    const ids = decks[seat];
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error(`Seat ${seat} needs a deck.`);
    }
    const checked = validateDeck(ids, catalog, deckRules);
    if (!checked.ok) {
      throw new Error(`Seat ${seat} deck is illegal:\n${checked.errors.join("\n")}`);
    }
  }

  for (const seat of [0, 1]) {
    state.players[seat].deck = shuffleInPlace(
      decks[seat].map((cardId) => {
        const instance = { instanceId: `c${state.nextInstanceSeq}`, cardId };
        state.nextInstanceSeq += 1;
        return instance;
      }),
      rng,
    );
  }

  for (const seat of [0, 1]) {
    for (let i = 0; i < OPENING_HAND; i += 1) {
      const card = state.players[seat].deck.shift();
      if (card) state.players[seat].hand.push(card);
    }
  }

  startTurn(state, 0, now, []);
  return state;
}

/* ------------------------------------------------------------------ *
 * Turn structure
 * ------------------------------------------------------------------ */

function drawCard(state, seat, events, reason) {
  const player = state.players[seat];
  if (player.deck.length === 0) {
    player.fatigue += 1;
    player.vitality -= player.fatigue;
    events.push({ type: "fatigue", seat, amount: player.fatigue, reason });
    applyOutcome(state, events);
    return null;
  }
  const card = player.deck.shift();
  player.hand.push(card);
  events.push({ type: "draw", seat, card, reason });
  return card;
}

function startTurn(state, seat, now, events) {
  state.active = seat;
  const player = state.players[seat];
  player.maxFlux = Math.min(MAX_FLUX, player.maxFlux + 1);
  player.flux = player.maxFlux;
  player.summonUsed = 0;
  player.mulliganUsed = 0;
  for (const unit of unitsOf(state, seat)) {
    unit.ready = true;
    unit.hasMoved = false;
    unit.hasAttacked = false;
  }
  state.deadlineAt = now + TURN_MS;
  events.push({ type: "turnStart", seat, turn: state.turn, maxFlux: player.maxFlux });
  drawCard(state, seat, events, "turnStart");
}

function endTurn(state, now, events, reason) {
  events.push({ type: "turnEnd", seat: state.active, reason });
  const next = opponentOf(state.active);
  if (next === 0) state.turn += 1;
  startTurn(state, next, now, events);
}

/**
 * Resolve and record vitality-based match completion.
 * Exported so deadline/fatigue/effect paths and tests share one rule.
 */
export function applyOutcome(state, events) {
  if (state.phase === "over") return;
  const [a, b] = state.players;
  const aDead = a.vitality <= 0;
  const bDead = b.vitality <= 0;
  if (!aDead && !bDead) return;
  state.phase = "over";
  state.deadlineAt = null;
  if (aDead && bDead) {
    state.result = { winnerSeat: null, reason: "simultaneous" };
  } else {
    state.result = { winnerSeat: aDead ? 1 : 0, reason: "vitality" };
  }
  events.push({ type: "gameOver", ...state.result });
}

/* ------------------------------------------------------------------ *
 * Geometry helpers
 * ------------------------------------------------------------------ */

function reachableCells(state, unit) {
  const start = cellIndex(unit.x, unit.y);
  const distances = new Map([[start, 0]]);
  const queue = [{ x: unit.x, y: unit.y }];
  const out = [];
  while (queue.length > 0) {
    const { x, y } = queue.shift();
    const distance = distances.get(cellIndex(x, y));
    if (distance >= unit.movement) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (!inBounds(nx, ny)) continue;
      const index = cellIndex(nx, ny);
      if (state.board[index] !== null) continue;
      if (distances.has(index)) continue;
      distances.set(index, distance + 1);
      out.push({ x: nx, y: ny, distance: distance + 1 });
      queue.push({ x: nx, y: ny });
    }
  }
  return { cells: out, distances };
}

/**
 * Orthogonal line of sight over a bare occupancy grid.
 * Public information only, so the AI can reason about it without the state.
 */
export function lineOfSightOnBoard(board, from, to) {
  if (from.x === to.x && from.y === to.y) return false;
  if (from.x !== to.x && from.y !== to.y) return false;
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);
  let x = from.x + dx;
  let y = from.y + dy;
  while (x !== to.x || y !== to.y) {
    if (board[cellIndex(x, y)] !== null) return false;
    x += dx;
    y += dy;
  }
  return true;
}

/** Orthogonal line of sight with no unit strictly between the two cells. */
export function lineClear(state, from, to) {
  return lineOfSightOnBoard(state.board, from, to);
}

function distanceBetween(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function inDeploymentZone(seat, x, y) {
  const bounds = deploymentBounds(seat);
  return y >= bounds.min && y <= bounds.max;
}

/* ------------------------------------------------------------------ *
 * Command handlers
 * ------------------------------------------------------------------ */

function reject(code, message) {
  return { code, message };
}

function handleSummon(state, command, events) {
  const player = state.players[state.active];
  const card = player.hand.find((c) => c.instanceId === command.instanceId);
  if (!card) return reject(ERROR_CODES.CARD_NOT_IN_HAND, "That card is not in the active hand.");
  const def = state.catalog.get(card.cardId);
  if (!def) return reject(ERROR_CODES.CARD_NOT_IN_HAND, "Unknown card definition.");
  if (def.category !== "vessel") {
    return reject(ERROR_CODES.UNSUPPORTED_CARD, `${def.category} cards are not implemented in this build.`);
  }
  if (!inBounds(command.x, command.y)) return reject(ERROR_CODES.ILLEGAL_CELL, "Cell is outside the board.");
  if (unitsOf(state, state.active).length >= MAX_UNITS_PER_SEAT) {
    return reject(ERROR_CODES.UNIT_LIMIT, `A seat may control at most ${MAX_UNITS_PER_SEAT} Vessels.`);
  }
  if (player.summonUsed >= 1) {
    return reject(ERROR_CODES.SUMMON_LIMIT, "Only one normal summon per turn.");
  }
  if (player.flux <= 0 || player.flux < def.cost) {
    return reject(
      ERROR_CODES.INSUFFICIENT_FLUX,
      `Summoning ${def.name} needs ${def.cost} Flux and at least 1 available Flux (have ${player.flux}).`,
    );
  }
  if (state.board[cellIndex(command.x, command.y)] !== null) {
    return reject(ERROR_CODES.CELL_OCCUPIED, "That cell is occupied.");
  }
  if (!inDeploymentZone(state.active, command.x, command.y)) {
    return reject(ERROR_CODES.ILLEGAL_CELL, "Vessels deploy inside your own starting rows.");
  }

  player.hand = player.hand.filter((c) => c.instanceId !== card.instanceId);
  player.flux -= def.cost;
  player.summonUsed += 1;
  const unit = createUnit(state, def, state.active, command.x, command.y, { ready: false });
  insertUnit(state, unit);
  events.push({
    type: "summon",
    seat: state.active,
    unitId: unit.id,
    cardId: unit.cardId,
    x: unit.x,
    y: unit.y,
    cost: def.cost,
  });
  return null;
}

function handleMove(state, command, events) {
  const unit = state.units[command.unitId];
  if (!unit) return reject(ERROR_CODES.UNKNOWN_UNIT, "Unknown unit.");
  if (unit.owner !== state.active) return reject(ERROR_CODES.NOT_YOUR_UNIT, "That Vessel is not yours.");
  if (!inBounds(command.x, command.y)) return reject(ERROR_CODES.ILLEGAL_CELL, "Cell is outside the board.");
  if (!unit.ready) return reject(ERROR_CODES.UNIT_NOT_READY, "That Vessel is not ready this turn.");
  if (unit.hasMoved) return reject(ERROR_CODES.ALREADY_MOVED, "That Vessel already moved this turn.");
  if (state.board[cellIndex(command.x, command.y)] !== null) {
    return reject(ERROR_CODES.CELL_OCCUPIED, "That cell is occupied.");
  }
  const { cells } = reachableCells(state, unit);
  const destination = cells.find((c) => c.x === command.x && c.y === command.y);
  if (!destination) {
    return reject(ERROR_CODES.OUT_OF_RANGE, `That cell is not reachable (movement ${unit.movement}).`);
  }
  const from = { x: unit.x, y: unit.y };
  state.board[cellIndex(from.x, from.y)] = null;
  unit.x = command.x;
  unit.y = command.y;
  unit.hasMoved = true;
  state.board[cellIndex(unit.x, unit.y)] = unit.id;
  events.push({ type: "move", seat: unit.owner, unitId: unit.id, from, to: { x: unit.x, y: unit.y } });
  return null;
}

export function canStrikeNexusFrom(state, unit, x, y) {
  const enemyUnits = unitsOf(state, opponentOf(unit.owner));
  return enemyUnits.length === 0 && y === enemyHomeRow(unit.owner) && unit.range >= 1;
}

export function canAttackNexus(state, unit) {
  return canStrikeNexusFrom(state, unit, unit.x, unit.y);
}

export function nexusAttackPreview(state, unit) {
  const opponent = state.players[opponentOf(unit.owner)];
  return {
    damage: Math.max(0, unit.attack),
    vitalityBefore: opponent.vitality,
    vitalityAfter: opponent.vitality - Math.max(0, unit.attack),
  };
}

function handleAttack(state, command, events) {
  const attacker = state.units[command.unitId];
  if (!attacker) return reject(ERROR_CODES.UNKNOWN_UNIT, "Unknown attacker.");
  if (attacker.owner !== state.active) return reject(ERROR_CODES.NOT_YOUR_UNIT, "That Vessel is not yours.");
  if (!attacker.ready) return reject(ERROR_CODES.UNIT_NOT_READY, "That Vessel is not ready this turn.");
  if (attacker.hasAttacked) return reject(ERROR_CODES.ALREADY_ATTACKED, "That Vessel already attacked this turn.");

  if (command.target === "nexus") {
    if (!canAttackNexus(state, attacker)) {
      if (unitsOf(state, opponentOf(attacker.owner)).length > 0) {
        return reject(ERROR_CODES.NEXUS_BLOCKED, "The opposing Nexus cannot be attacked while it controls Vessels.");
      }
      return reject(ERROR_CODES.NOT_ON_HOME_ROW, "A Vessel must stand on the enemy home row to strike the Nexus.");
    }
    const opponent = state.players[opponentOf(attacker.owner)];
    const damage = Math.max(0, attacker.attack);
    opponent.vitality -= damage;
    attacker.hasAttacked = true;
    events.push({
      type: "nexusHit",
      seat: attacker.owner,
      unitId: attacker.id,
      damage,
      vitality: opponent.vitality,
    });
    applyOutcome(state, events);
    return null;
  }

  const defender = state.units[command.targetId];
  if (!defender) return reject(ERROR_CODES.ILLEGAL_TARGET, "Unknown target.");
  if (defender.owner === attacker.owner) return reject(ERROR_CODES.ILLEGAL_TARGET, "Cannot attack your own Vessel.");
  const distance = distanceBetween(attacker, defender);
  if (distance < 1 || distance > attacker.range) {
    return reject(ERROR_CODES.OUT_OF_RANGE, `Target is out of range (${attacker.range}).`);
  }
  if (!lineClear(state, attacker, defender)) {
    return reject(ERROR_CODES.NO_LINE_OF_SIGHT, "No clear orthogonal line of sight.");
  }

  const attackPacket = previewDamage(attacker.attack, attacker.element, defender.element);
  const retaliates = defender.range >= distance && lineClear(state, defender, attacker);
  const retaliationPacket = retaliates
    ? previewDamage(defender.attack, defender.element, attacker.element)
    : null;

  defender.guard -= attackPacket.damage;
  if (retaliationPacket) attacker.guard -= retaliationPacket.damage;

  attacker.hasAttacked = true;

  events.push({
    type: "attack",
    seat: attacker.owner,
    attackerId: attacker.id,
    defenderId: defender.id,
    attackPacket,
    retaliationPacket,
    defenderGuard: defender.guard,
    attackerGuard: attacker.guard,
  });

  const defeated = Object.values(state.units).filter((u) => u.guard <= 0);
  for (const unit of defeated) {
    removeUnit(state, unit);
    events.push({ type: "defeat", unitId: unit.id, cardId: unit.cardId, seat: unit.owner });
  }
  return null;
}

function handleMulligan(state, command, events) {
  const player = state.players[state.active];
  const card = player.hand.find((c) => c.instanceId === command.instanceId);
  if (!card) return reject(ERROR_CODES.CARD_NOT_IN_HAND, "That card is not in the active hand.");
  if (player.mulliganUsed >= 1) return reject(ERROR_CODES.MULLIGAN_USED, "Already mulliganed this turn.");
  if (player.flux < 1) return reject(ERROR_CODES.INSUFFICIENT_FLUX, "Mulligan costs 1 Flux.");
  if (player.deck.length === 0) {
    return reject(ERROR_CODES.DECK_EMPTY, "Cannot mulligan with an empty deck.");
  }

  player.flux -= 1;
  player.hand = player.hand.filter((c) => c.instanceId !== card.instanceId);
  player.deck.push(card);
  player.mulliganUsed += 1;
  const drawn = player.deck.shift();
  player.hand.push(drawn);
  events.push({
    type: "mulligan",
    seat: state.active,
    bottomed: card,
    drawn,
    cost: 1,
  });
  return null;
}

function handleEndTurn(state, now, events) {
  endTurn(state, now, events, "endTurn");
  return null;
}

function handleSurrender(state, events) {
  const seat = state.active;
  state.phase = "over";
  state.deadlineAt = null;
  state.result = { winnerSeat: opponentOf(seat), reason: "surrender" };
  events.push({ type: "gameOver", ...state.result });
  return null;
}

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

function failure(state, code, message, extra = {}) {
  return { ok: false, code, message, state, events: extra.events ?? [] };
}

/**
 * Materialize an overdue turn transition.
 * Safe to call repeatedly; returns the same state when no deadline has passed.
 */
export function tick(state, now) {
  if (state.phase === "over" || typeof now !== "number" || state.deadlineAt === null) {
    return { state, events: [] };
  }
  if (now < state.deadlineAt) return { state, events: [] };
  const events = [];
  const draft = structuredClone(state);
  endTurn(draft, now, events, "timeout");
  draft.version = state.version + 1;
  return { state: draft, events };
}

export function applyCommand(state, command, context = {}) {
  if (!command || typeof command.type !== "string") {
    return failure(state, ERROR_CODES.INVALID_COMMAND, "Command requires a string type.");
  }
  if (state.phase === "over") {
    return failure(state, ERROR_CODES.GAME_OVER, "The match is over.");
  }
  if (
    command.expectedVersion !== undefined &&
    command.expectedVersion !== state.version
  ) {
    return failure(state, ERROR_CODES.STALE_STATE, "State version is stale; refresh and retry.");
  }

  const now = typeof context.now === "number" ? context.now : null;

  // Received at or after the deadline: resolve the timeout, then reject this command.
  if (now !== null && state.deadlineAt !== null && now >= state.deadlineAt) {
    if (command.type === "timeout") {
      const resolved = tick(state, now);
      return { ok: true, state: resolved.state, events: resolved.events };
    }
    const resolved = tick(state, now);
    // Return the materialized transition so the caller's clock stays consistent:
    // the command itself is rejected, but the timeout is never lost.
    return failure(resolved.state, ERROR_CODES.DEADLINE_PASSED, "The turn deadline passed; the turn was passed.", {
      events: resolved.events,
    });
  }

  if (command.type === "timeout") {
    return failure(state, ERROR_CODES.DEADLINE_NOT_REACHED, "The turn deadline has not been reached.");
  }
  if (command.type === "tick") {
    return { ok: true, state, events: [] };
  }

  const events = [];
  const draft = structuredClone(state);
  const effectiveNow = now ?? draft.deadlineAt ?? 0;
  let error = null;

  switch (command.type) {
    case "summon":
      error = handleSummon(draft, command, events);
      break;
    case "move":
      error = handleMove(draft, command, events);
      break;
    case "attack":
      error = handleAttack(draft, command, events);
      break;
    case "mulligan":
      error = handleMulligan(draft, command, events);
      break;
    case "endTurn":
      error = handleEndTurn(draft, effectiveNow, events);
      break;
    case "surrender":
      error = handleSurrender(draft, events);
      break;
    default:
      return failure(state, ERROR_CODES.UNKNOWN_COMMAND, `Unsupported command type "${command.type}".`);
  }

  if (error) return failure(state, error.code, error.message);
  draft.version = state.version + 1;
  return { ok: true, state: draft, events };
}

/* ------------------------------------------------------------------ *
 * Legal action enumeration (HUD + future AI share this)
 * ------------------------------------------------------------------ */

export function canSummon(state, instanceId, x, y) {
  if (state.phase === "over") return false;
  const player = state.players[state.active];
  const card = player.hand.find((c) => c.instanceId === instanceId);
  if (!card) return false;
  const def = state.catalog.get(card.cardId);
  if (!def || def.category !== "vessel") return false;
  if (unitsOf(state, state.active).length >= MAX_UNITS_PER_SEAT) return false;
  if (player.summonUsed >= 1) return false;
  if (player.flux <= 0 || player.flux < def.cost) return false;
  if (!inBounds(x, y) || state.board[cellIndex(x, y)] !== null) return false;
  return inDeploymentZone(state.active, x, y);
}

export function getLegalMoves(state, unitId) {
  const unit = state.units[unitId];
  if (!unit || unit.owner !== state.active || !unit.ready || unit.hasMoved) return [];
  return reachableCells(state, unit).cells.map((c) => ({ x: c.x, y: c.y }));
}

export function getLegalAttacks(state, unitId) {
  const unit = state.units[unitId];
  if (!unit || unit.owner !== state.active || !unit.ready || unit.hasAttacked) return [];
  const targets = [];
  for (const other of Object.values(state.units)) {
    if (other.owner === unit.owner) continue;
    const distance = distanceBetween(unit, other);
    if (distance < 1 || distance > unit.range) continue;
    if (!lineClear(state, unit, other)) continue;
    targets.push({ type: "unit", unitId: other.id });
  }
  if (canAttackNexus(state, unit)) targets.push({ type: "nexus" });
  return targets;
}

/**
 * Public-info geometry helper: which enemies could `unitId` strike if it stood
 * on (x, y)? Shared by the HUD preview and the AI candidate builder so range
 * and line-of-sight rules never fork into two implementations.
 */
export function attacksFromCell(state, unitId, x, y) {
  const unit = state.units[unitId];
  if (!unit || !inBounds(x, y)) return [];
  const from = { x, y };
  const targets = [];
  for (const other of Object.values(state.units)) {
    if (other.owner === unit.owner) continue;
    const distance = distanceBetween(from, other);
    if (distance < 1 || distance > unit.range) continue;
    if (!lineClear(state, from, other)) continue;
    targets.push({ type: "unit", unitId: other.id, distance });
  }
  return targets;
}

export function getLegalActions(state) {
  if (state.phase === "over") {
    return { summons: [], units: [], canEndTurn: false, canMulligan: false };
  }
  const player = state.players[state.active];
  const summons = [];
  for (const card of player.hand) {
    const def = state.catalog.get(card.cardId);
    if (!def || def.category !== "vessel") continue;
    const cells = [];
    for (let y = 0; y < BOARD_SIZE; y += 1) {
      for (let x = 0; x < BOARD_SIZE; x += 1) {
        if (canSummon(state, card.instanceId, x, y)) cells.push({ x, y });
      }
    }
    if (cells.length > 0) {
      summons.push({ instanceId: card.instanceId, cardId: card.cardId, cells });
    }
  }
  const units = unitsOf(state, state.active).map((unit) => ({
    unitId: unit.id,
    moves: getLegalMoves(state, unit.id),
    attacks: getLegalAttacks(state, unit.id),
  }));
  const canMulligan =
    player.mulliganUsed < 1 && player.flux >= 1 && player.deck.length > 0 && player.hand.length > 1;
  return { summons, units, canEndTurn: true, canMulligan };
}

/** Attack preview for the HUD, without mutating state. */
export function previewAttack(state, unitId, targetId) {
  const attacker = state.units[unitId];
  const defender = state.units[targetId];
  if (!attacker || !defender) return null;
  const distance = distanceBetween(attacker, defender);
  const packet = previewDamage(attacker.attack, attacker.element, defender.element);
  const retaliation =
    defender.range >= distance && lineClear(state, defender, attacker)
      ? previewDamage(defender.attack, defender.element, attacker.element)
      : null;
  return {
    packet,
    retaliation,
    defenderGuardAfter: defender.guard - packet.damage,
    attackerGuardAfter: retaliation ? attacker.guard - retaliation.damage : attacker.guard,
  };
}

export function isOver(state) {
  return state.phase === "over";
}

export { DECK_RULES, PRACTICE_DECK_RULES };
