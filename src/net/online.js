/**
 * Online lobby transport: Supabase Realtime broadcast channels.
 *
 * One channel per room code (`veylattice-room-<CODE>`). Room state and
 * game commands travel as broadcast events; presence tracks who is
 * connected. This transport carries NO authority: the lobby module and
 * the engine validate everything that arrives (see src/game/lobby.js).
 * A forged or illegal command is rejected by the receiver's engine and
 * never applied, and online matches grant no rewards or rank.
 *
 * The Supabase JS client is loaded as an ES module from CDN at runtime
 * (the static bundle has no build step). If it cannot load, the caller
 * reports the lobby transport as unavailable instead of pretending a
 * room exists. No service-role key is used; only the publishable anon
 * key already shipped in src/net/config.js.
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

let clientPromise = null;

export async function getOnlineClient() {
  if (!clientPromise) {
    clientPromise = (async () => {
      // Pinned exact version (was the floating "@2", so any new 2.x release
      // changed the lobby's transport without a deploy). 2.118.0's
      // realtime-js was checked 2026-10-29: subscribe() status strings
      // SUBSCRIBED / CHANNEL_ERROR / TIMED_OUT / CLOSED, and send() before
      // the join falls back to REST with a deprecation warning, which
      // joinRoomChannel avoids by waiting for SUBSCRIBED.
      const mod = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm");
      return mod.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    })().catch((error) => {
      clientPromise = null;
      throw error;
    });
  }
  return clientPromise;
}

/**
 * Join a room channel and resolve only once it is SUBSCRIBED. Handlers:
 * onRoom(room, fromId), onCommand(envelope), onJoin(player),
 * onPresence(playerIds[]), onStatus(status) for a later drop.
 * Returns { sendRoom, sendCommand, sendJoin, leave }.
 */
export async function joinRoomChannel(code, playerId, handlers = {}, { subscribeTimeoutMs = 10000 } = {}) {
  const client = await getOnlineClient();
  // Per-sender ordering without clocks: every outgoing room broadcast carries
  // (session, rev); receivers drop anything not newer than the last seen rev
  // from that sender session. A reloaded page starts a fresh session.
  const session = Math.floor(Math.random() * 0xffffffff).toString(36);
  let rev = 0;
  const lastRev = new Map();
  const fresh = (payload) => {
    if (typeof payload?.rev !== "number" || typeof payload?.session !== "string") return true;
    const key = `${payload.from}:${payload.session}`;
    if ((lastRev.get(key) ?? -1) >= payload.rev) return false;
    lastRev.set(key, payload.rev);
    return true;
  };
  const channel = client.channel(`veylattice-room-${code}`, {
    config: { broadcast: { self: false }, presence: { key: playerId } },
  });
  channel
    .on("broadcast", { event: "room" }, ({ payload }) => {
      if (payload?.room && payload?.from !== playerId && fresh(payload)) handlers.onRoom?.(payload.room, payload.from);
    })
    .on("broadcast", { event: "command" }, ({ payload }) => {
      if (payload?.envelope && payload?.from !== playerId) handlers.onCommand?.(payload.envelope);
    })
    .on("broadcast", { event: "join" }, ({ payload }) => {
      if (payload?.player && payload?.from !== playerId) handlers.onJoin?.(payload.player);
    })
    .on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      handlers.onPresence?.(Object.keys(state));
    });
  // `subscribe()` returns the channel synchronously; the join completes later
  // via the status callback. Broadcast has no replay, so a client must not
  // send (e.g. a join request whose reply it needs) until it is actually
  // SUBSCRIBED — otherwise the reply can arrive before it is listening and is
  // lost (reproduced 2026-10-29 in the two-browser lobby run: the guest sat on
  // "Joining…" forever). Resolve on SUBSCRIBED; reject on error/timeout.
  await new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      channel.unsubscribe?.().catch?.(() => {});
      reject(new Error("Timed out joining the room channel."));
    }, subscribeTimeoutMs);
    channel.subscribe(async (status, error) => {
      if (status === "SUBSCRIBED") {
        try {
          await channel.track({ playerId, at: Date.now() });
        } catch {
          /* presence is advisory; broadcast still works */
        }
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve();
        }
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(new Error(`Room channel ${status.toLowerCase().replace("_", " ")}${error?.message ? `: ${error.message}` : ""}.`));
        } else {
          handlers.onStatus?.(status);
        }
      }
    });
  });
  return {
    async sendRoom(room) {
      rev += 1;
      await channel.send({ type: "broadcast", event: "room", payload: { room, from: playerId, session, rev } });
    },
    async sendCommand(envelope) {
      await channel.send({ type: "broadcast", event: "command", payload: { envelope, from: playerId } });
    },
    async sendJoin(player) {
      await channel.send({ type: "broadcast", event: "join", payload: { player, from: playerId } });
    },
    async leave() {
      await channel.unsubscribe();
    },
  };
}
