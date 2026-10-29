/**
 * Online lobby: pure room state machine, no DOM, no network.
 *
 * What this is: two-player rooms with seat assignment, deck selection,
 * readiness gating and a command-validation contract for the transport
 * layer (`src/net/online.js`). What it is NOT: server-authoritative
 * multiplayer. There is no deployed Edge Function, so a remote client's
 * word is never trusted — every incoming command is re-run through the
 * local engine (see `validateRemoteCommand`) and rejected on wrong seat,
 * stale sequence, duplicate command id or engine illegality. Online
 * matches are practice-only: no rewards, rank or currency.
 *
 * Room lifecycle: waiting -> ready (both seats ready) -> in_match ->
 * finished/closed. A configuration or deck change clears readiness.
 * Rooms expire after ROOM_TTL_MS without activity; the transport layer
 * also drops a seat on disconnect, and the match ends (no AI takeover
 * for ranked-style play, because there is no ranked online play here).
 */

export const MAX_SEATS = 2;
export const ROOM_TTL_MS = 30 * 60 * 1000;
export const RECONNECT_GRACE_MS = 60 * 1000;

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeRoomCode(rng = Math.random) {
  let code = "";
  for (let i = 0; i < 6; i += 1) code += CODE_CHARS[Math.floor(rng() * CODE_CHARS.length)];
  return code;
}

export function isRoomCode(value) {
  return typeof value === "string" && /^[A-HJ-NP-Z2-9]{6}$/.test(value.trim().toUpperCase());
}

export function createRoom({ code, host, deckId = null, now = Date.now() }) {
  if (!host || typeof host.id !== "string") throw new Error("A room needs a host profile id.");
  const roomCode = code ?? makeRoomCode();
  if (!isRoomCode(roomCode)) throw new Error(`Invalid room code "${roomCode}".`);
  return {
    code: roomCode,
    status: "waiting",
    seats: [
      { seat: 0, playerId: host.id, displayName: host.displayName ?? "Player", deckId, ready: false, connected: true },
      { seat: 1, playerId: null, displayName: null, deckId: null, ready: false, connected: false },
    ],
    createdAt: now,
    updatedAt: now,
    matchSeed: null,
    lastSeq: -1,
    seenCommandIds: [],
  };
}

export function joinRoom(room, player) {
  if (!room || typeof room !== "object") return { room, error: "Room not found." };
  if (room.status === "closed" || room.status === "finished") return { room, error: "That room is closed." };
  if (room.status === "in_match") return { room, error: "That match has already started." };
  if (Date.now() - room.updatedAt > ROOM_TTL_MS) return { room, error: "That room has expired." };
  if (room.seats.some((s) => s.playerId === player.id)) return { room, error: "You are already in this room." };
  const free = room.seats.find((s) => s.playerId === null);
  if (!free) return { room, error: "That room is full." };
  const next = structuredClone(room);
  const seat = next.seats[free.seat];
  seat.playerId = player.id;
  seat.displayName = player.displayName ?? "Player";
  seat.connected = true;
  next.updatedAt = Date.now();
  return { room: next, error: null };
}

export function leaveRoom(room, playerId) {
  if (!room) return room;
  const next = structuredClone(room);
  const seat = next.seats.find((s) => s.playerId === playerId);
  if (seat) {
    seat.playerId = null;
    seat.displayName = null;
    seat.deckId = null;
    seat.ready = false;
    seat.connected = false;
  }
  if (next.seats.every((s) => s.playerId === null)) next.status = "closed";
  else if (next.status === "in_match") next.status = "finished";
  else next.status = "waiting";
  next.updatedAt = Date.now();
  return next;
}

/** Deck or readiness changes clear that seat's readiness. */
export function setSeatDeck(room, playerId, deckId) {
  const next = structuredClone(room);
  const seat = next.seats.find((s) => s.playerId === playerId);
  if (!seat) return { room, error: "You are not in this room." };
  if (next.status === "in_match") return { room, error: "The match has started; decks are locked." };
  seat.deckId = deckId;
  seat.ready = false;
  next.status = "waiting";
  next.updatedAt = Date.now();
  return { room: next, error: null };
}

export function setReady(room, playerId, ready) {
  const next = structuredClone(room);
  const seat = next.seats.find((s) => s.playerId === playerId);
  if (!seat) return { room, error: "You are not in this room." };
  if (!seat.deckId && ready) return { room, error: "Select a valid deck before readying up." };
  seat.ready = ready;
  next.status = next.seats.every((s) => s.playerId && s.ready) ? "ready" : "waiting";
  next.updatedAt = Date.now();
  return { room: next, error: null };
}

/**
 * A match may start only when both seats are filled, ready, and carry a
 * deck id. Deck legality and ownership are checked again at start time
 * by the caller (validateDeckWithOwnership); this function checks the
 * room-level gate only.
 */
export function canStart(room) {
  if (!room || room.status !== "ready") return false;
  return room.seats.every((s) => s.playerId && s.deckId && s.ready);
}

export function startMatch(room, seed) {
  if (!canStart(room)) return { room, error: "Both players must be seated, decked and ready." };
  const next = structuredClone(room);
  next.status = "in_match";
  next.matchSeed = seed >>> 0;
  next.lastSeq = -1;
  next.seenCommandIds = [];
  next.updatedAt = Date.now();
  return { room: next, error: null };
}

/**
 * Validate a remote command envelope before the engine ever sees it.
 * The caller then applies `command` with the local engine and, only on
 * success, records the sequence/command id. This is peer validation:
 * it proves the command is well-formed, in order, from the right seat
 * and legal in this client's copy of the state — it does not make the
 * match server-authoritative.
 */
export function validateRemoteCommand(room, state, envelope) {
  if (!envelope || typeof envelope !== "object") return { ok: false, error: "Malformed command envelope." };
  if (typeof envelope.commandId !== "string" || envelope.commandId.length === 0) return { ok: false, error: "Command needs an id." };
  if ((room?.seenCommandIds ?? []).includes(envelope.commandId)) return { ok: false, error: "Duplicate command ignored." };
  if (envelope.seq !== (room?.lastSeq ?? -1) + 1) return { ok: false, error: `Stale or out-of-order command (expected seq ${(room?.lastSeq ?? -1) + 1}, got ${envelope.seq}).` };
  if (state.active !== envelope.seat) return { ok: false, error: "That seat is not the active seat." };
  const seat = room?.seats?.[envelope.seat];
  if (!seat || seat.playerId !== envelope.playerId) return { ok: false, error: "Command author does not own that seat." };
  return { ok: true };
}

export function recordRemoteCommand(room, envelope) {
  const next = structuredClone(room);
  next.lastSeq = envelope.seq;
  next.seenCommandIds = [...(next.seenCommandIds ?? []), envelope.commandId].slice(-500);
  next.updatedAt = Date.now();
  return next;
}
