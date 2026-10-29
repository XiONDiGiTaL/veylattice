import test from "node:test";
import assert from "node:assert/strict";

import { buildPracticeDeck } from "../src/game/content.js";
import {
  canStart,
  createRoom,
  isRoomCode,
  joinRoom,
  leaveRoom,
  makeRoomCode,
  recordRemoteCommand,
  setReady,
  setSeatDeck,
  startMatch,
  validateRemoteCommand,
} from "../src/game/lobby.js";
import { applyCommand, createMatch } from "../src/game/engine.js";
import { CATALOG, matchWith, prepare, seededRng } from "./support.js";

const host = { id: "host-1", displayName: "Host" };
const guest = { id: "guest-2", displayName: "Guest" };
const deck = () => buildPracticeDeck(CATALOG);

test("room codes are 6 unambiguous characters and validated", () => {
  for (let i = 0; i < 20; i += 1) {
    const code = makeRoomCode(seededRng(i + 1));
    assert.equal(code.length, 6);
    assert.equal(isRoomCode(code), true);
  }
  assert.equal(isRoomCode("abc"), false);
  assert.equal(isRoomCode("ABCDEF"), true);
  assert.equal(isRoomCode("ABCDE1"), false); // 1 is excluded as ambiguous
});

test("room lifecycle: create, join, deck, ready gating, start, leave", () => {
  let room = createRoom({ host });
  assert.equal(room.status, "waiting");
  assert.equal(room.seats[0].playerId, host.id);
  assert.equal(canStart(room), false);
  const joined = joinRoom(room, guest);
  assert.equal(joined.error, null);
  room = joined.room;
  assert.equal(room.seats[1].playerId, guest.id);
  const full = joinRoom(room, { id: "third", displayName: "Third" });
  assert.ok(full.error.includes("full"));
  room = setSeatDeck(room, host.id, "deck-host").room;
  room = setSeatDeck(room, guest.id, "deck-guest").room;
  room = setReady(room, host.id, true).room;
  assert.equal(canStart(room), false, "one ready seat is not enough");
  room = setReady(room, guest.id, true).room;
  assert.equal(canStart(room), true);
  // A deck change clears readiness.
  room = setSeatDeck(room, host.id, "deck-host-2").room;
  assert.equal(room.seats[0].ready, false);
  assert.equal(canStart(room), false);
  room = setReady(room, host.id, true).room;
  const started = startMatch(room, 1234);
  assert.equal(started.error, null);
  assert.equal(started.room.status, "in_match");
  assert.equal(started.room.matchSeed, 1234);
  const left = leaveRoom(started.room, guest.id);
  assert.equal(left.status, "finished");
});

test("remote commands: wrong seat, stale sequence, duplicates and illegal moves are rejected", () => {
  const ids = deck();
  let room = createRoom({ host });
  room = joinRoom(room, guest).room;
  room = setSeatDeck(room, host.id, "d").room;
  room = setSeatDeck(room, guest.id, "d").room;
  room = setReady(room, host.id, true).room;
  room = setReady(room, guest.id, true).room;
  room = startMatch(room, 99).room;
  const match = createMatch({ catalog: CATALOG, decks: [ids, ids], rng: seededRng(99), now: 1_000_000 });
  assert.equal(match.active, 0, "seat 0 moves first");
  const envelope = (overrides) => ({ seq: 0, commandId: "c1", seat: 0, playerId: host.id, command: { type: "endTurn" }, ...overrides });
  assert.equal(validateRemoteCommand(room, match, envelope({ seat: 1 })).ok, false, "guest cannot move on host turn");
  assert.equal(validateRemoteCommand(room, match, envelope({ seq: 3 })).ok, false, "stale/out-of-order seq rejected");
  assert.equal(validateRemoteCommand(room, match, envelope()).ok, true);
  const applied = applyCommand(match, envelope().command, { now: 1_001_000 });
  assert.equal(applied.ok, true);
  room = recordRemoteCommand(room, envelope());
  assert.equal(validateRemoteCommand(room, applied.state, envelope()).ok, false, "duplicate command id rejected");
  assert.equal(validateRemoteCommand(room, applied.state, envelope({ seq: 1, commandId: "c2", seat: 0 })).ok, false, "seat 0 cannot move on seat 1 turn");
});

test("a full online-style exchange stays in sync when both sides validate", () => {
  const ids = deck();
  let room = createRoom({ host });
  room = joinRoom(room, guest).room;
  room = setSeatDeck(room, host.id, "d").room;
  room = setSeatDeck(room, guest.id, "d").room;
  room = setReady(room, host.id, true).room;
  room = setReady(room, guest.id, true).room;
  room = startMatch(room, 5).room;
  let state = createMatch({ catalog: CATALOG, decks: [ids, ids], rng: seededRng(5), now: 1_000_000 });
  const env = { seq: 0, commandId: "e1", seat: 0, playerId: host.id, command: { type: "endTurn" } };
  assert.equal(validateRemoteCommand(room, state, env).ok, true);
  const out = applyCommand(state, env.command, { now: 1_001_000 });
  assert.equal(out.ok, true);
  assert.equal(out.state.active, 1, "turn passed to the guest seat");
  room = recordRemoteCommand(room, env);
  assert.equal(room.lastSeq, 0);
});

/* ---- clock-free convergence (2026-10-29 two-browser run regressions) ---- */
import { mergeRemoteRoom, remoteCommandNow } from "../src/game/lobby.js";

function seatedRoom() {
  const host = { id: "host-1", displayName: "Host" };
  const guest = { id: "guest-1", displayName: "Guest" };
  const room = createRoom({ code: "ABC234", host, now: Date.now() });
  return { room: joinRoom(room, guest).room, host, guest };
}

test("merge: a guest's deck/ready edit is kept by the host even when the guest's clock is behind", () => {
  const { room } = seatedRoom();
  const hostCopy = structuredClone(room);
  hostCopy.updatedAt = Date.now() + 60_000; // host clock far ahead
  let guestCopy = setSeatDeck(room, "guest-1", "deck-g").room;
  guestCopy = setReady(guestCopy, "guest-1", true).room;
  guestCopy.updatedAt = Date.now() - 60_000; // guest clock far behind
  const merged = mergeRemoteRoom(hostCopy, guestCopy, { myId: "host-1", fromId: "guest-1" });
  const seat = merged.room.seats[1];
  assert.equal(seat.deckId, "deck-g");
  assert.equal(seat.ready, true);
});

test("merge: a host broadcast never rolls back the receiver's own seat", () => {
  const { room } = seatedRoom();
  const guestCopy = setReady(setSeatDeck(room, "guest-1", "deck-g").room, "guest-1", true).room;
  // Host's broadcast predates the guest's edit (still shows the guest unready, no deck).
  const hostBroadcast = setSeatDeck(room, "host-1", "deck-h").room;
  const merged = mergeRemoteRoom(guestCopy, hostBroadcast, { myId: "guest-1", fromId: "host-1" });
  assert.equal(merged.room.seats[0].deckId, "deck-h", "host seat taken from the host");
  assert.equal(merged.room.seats[1].deckId, "deck-g", "own seat kept");
  assert.equal(merged.room.seats[1].ready, true);
});

test("merge: a guest cannot edit the host's seat or the room status", () => {
  const { room } = seatedRoom();
  const forged = structuredClone(room);
  forged.seats[0].deckId = "evil";
  forged.seats[0].ready = true;
  forged.status = "in_match";
  forged.matchSeed = 1;
  const merged = mergeRemoteRoom(room, forged, { myId: "host-1", fromId: "guest-1" });
  assert.equal(merged.room.seats[0].deckId, null);
  assert.notEqual(merged.room.status, "in_match");
  assert.equal(merged.room.matchSeed, null);
});

test("merge: guest vacating its seat is reported as left; mid-match it finishes the room", () => {
  const { room } = seatedRoom();
  let live = setReady(setSeatDeck(room, "host-1", "h").room, "host-1", true).room;
  live = setReady(setSeatDeck(live, "guest-1", "g").room, "guest-1", true).room;
  live = startMatch(live, 42).room;
  const guestLeft = leaveRoom(live, "guest-1");
  const merged = mergeRemoteRoom(live, guestLeft, { myId: "host-1", fromId: "guest-1" });
  assert.equal(merged.event, "left");
  assert.equal(merged.room.status, "finished");
});

test("merge: first view of a room adopts the host broadcast wholesale; wrong code ignored", () => {
  const { room } = seatedRoom();
  const placeholder = { code: "ABC234", status: "waiting", seats: [], updatedAt: 0 };
  assert.deepEqual(mergeRemoteRoom(placeholder, room, { myId: "guest-1", fromId: "host-1" }).room.seats, room.seats);
  const other = { ...structuredClone(room), code: "ZZZ999" };
  assert.equal(mergeRemoteRoom(room, other, { myId: "guest-1", fromId: "host-1" }).room, room);
});

test("remote commands are never re-timed on arrival; remote timeouts are accepted", () => {
  const state = { deadlineAt: 10_000 };
  assert.equal(remoteCommandNow(state, { type: "endTurn" }, 12_000), 9_999, "late arrival stays inside the deadline");
  assert.equal(remoteCommandNow(state, { type: "endTurn" }, 5_000), 5_000);
  assert.equal(remoteCommandNow(state, { type: "timeout" }, 5_000), 10_000, "early-clock receiver still accepts the timeout");
  assert.equal(remoteCommandNow({ deadlineAt: null }, { type: "endTurn" }, 7), 7);
});
