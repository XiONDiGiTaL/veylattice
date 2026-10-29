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
      const mod = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
      return mod.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    })().catch((error) => {
      clientPromise = null;
      throw error;
    });
  }
  return clientPromise;
}

/**
 * Join a room channel. Handlers: onRoom(room, fromId), onCommand(envelope),
 * onPresence(playerIds[]). Returns { sendRoom, sendCommand, leave }.
 */
export async function joinRoomChannel(code, playerId, handlers = {}) {
  const client = await getOnlineClient();
  const channel = client.channel(`veylattice-room-${code}`, {
    config: { broadcast: { self: false }, presence: { key: playerId } },
  });
  channel
    .on("broadcast", { event: "room" }, ({ payload }) => {
      if (payload?.room && payload?.from !== playerId) handlers.onRoom?.(payload.room, payload.from);
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
  await channel.subscribe(async (status) => {
    if (status === "SUBSCRIBED") await channel.track({ playerId, at: Date.now() });
  });
  return {
    async sendRoom(room) {
      await channel.send({ type: "broadcast", event: "room", payload: { room, from: playerId } });
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
