/**
 * Card-field projection.
 *
 * The battlefield has two different systems and this module keeps them apart:
 *
 *  - The tactical grid (`match.board`, 25 tiles, BOARD_SIZE 5x5) is where
 *    Vessels move and fight. The engine owns it.
 *  - The card fields (`vessel` and `action` slots, four per seat) are where a
 *    player's summoned cards and persistent Relics sit. This module derives
 *    that field from match state; it never decides legality.
 *
 * A slot is addressed by a stable key (`v2:vessel:0`), so the DOM can be rebuilt
 * on every render without losing which card occupies which zone.
 */

import { MAX_RELICS_PER_SEAT, MAX_UNITS_PER_SEAT } from "../game/constants.js";

/** Four front-row Vessel zones per seat. */
export const VESSEL_SLOTS = MAX_UNITS_PER_SEAT;
/**
 * Four back-row Relic sockets per seat (legacy export name ACTION_SLOTS:
 * the old UI labelled these zones "Action zones", but Actions never occupy
 * a zone — they resolve from hand to discard. See docs/ARENA_SYSTEM.md
 * canonical layout 2026-10-29. The separate Action staging row is a view
 * of the first four Action cards in hand, defined in src/render/arena3d.js.
 */
export const ACTION_SLOTS = MAX_RELICS_PER_SEAT;
/** Alias with the canonical name: four Relic sockets per seat. */
export const RELIC_SLOTS = MAX_RELICS_PER_SEAT;

/** Stable slot key used for DOM ids and tests. */
export function slotKey(seat, kind, index) {
  return `seat${seat}:${kind}:${index}`;
}

function unitOrder(unit) {
  const match = /^u(\d+)$/.exec(unit.id ?? "");
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

/**
 * Read-only view of one seat's card field.
 *
 * `vessels` is always exactly four entries (unit or null), `relics` exactly
 * four (relic record or null). Vessels keep the zone the engine assigned them;
 * units inserted directly (tests, tools) fall back to the first free zone in
 * summon order so the projection is still total.
 */
export function fieldState(match, seat) {
  const empty = {
    seat,
    vessels: new Array(VESSEL_SLOTS).fill(null),
    relics: new Array(ACTION_SLOTS).fill(null),
    unitCount: 0,
    relicCount: 0,
    freeVesselSlots: VESSEL_SLOTS,
    freeActionSlots: ACTION_SLOTS,
  };
  if (!match || !match.players?.[seat]) return empty;

  const units = Object.values(match.units ?? {})
    .filter((unit) => unit.owner === seat)
    .sort((a, b) => unitOrder(a) - unitOrder(b));

  const vessels = new Array(VESSEL_SLOTS).fill(null);
  const unplaced = [];
  for (const unit of units) {
    const slot = unit.fieldSlot;
    if (Number.isInteger(slot) && slot >= 0 && slot < VESSEL_SLOTS && !vessels[slot]) {
      vessels[slot] = unit;
    } else {
      unplaced.push(unit);
    }
  }
  for (const unit of unplaced) {
    const free = vessels.indexOf(null);
    if (free === -1) break;
    vessels[free] = unit;
  }

  const stored = match.players[seat].relics ?? [];
  const relics = Array.from({ length: ACTION_SLOTS }, (_, index) => stored[index] ?? null);

  return {
    seat,
    vessels,
    relics,
    unitCount: units.length,
    relicCount: relics.filter(Boolean).length,
    freeVesselSlots: vessels.filter((unit) => !unit).length,
    freeActionSlots: relics.filter((relic) => !relic).length,
  };
}

/** Owned Vessels in the order their zones are drawn. */
export function fieldUnits(match, seat) {
  return fieldState(match, seat).vessels.filter(Boolean);
}
