// Test double for @supabase/supabase-js Realtime broadcast + presence, relayed
// between independent Playwright browser contexts by the Node harness.
// Modelled semantics (from realtime-js docs/behaviour): subscribe() returns
// the channel synchronously and reports SUBSCRIBED asynchronously; broadcast
// is fire-and-forget with NO replay — a receiver that has not joined yet
// misses the message; `self: false` suppresses echo; send() before joining is
// still delivered (realtime-js falls back to the REST broadcast endpoint).
// This is NOT Supabase. It verifies the app-level protocol only.
const JOIN_DELAY = Number(globalThis.__MOCK_JOIN_DELAY ?? 400);
const channels = new Map();
globalThis.__relayDeliver = (name, msg) => {
  const ch = channels.get(name);
  if (!ch || !ch.joined) return false;
  ch._deliver(msg);
  return true;
};
class Channel {
  constructor(name, config) {
    this.name = name;
    this.config = config || {};
    this.handlers = [];
    this.joined = false;
    this.presence = {};
    channels.set(name, this);
  }
  on(type, filter, cb) { this.handlers.push({ type, filter, cb }); return this; }
  subscribe(cb) {
    setTimeout(() => {
      this.joined = true;
      globalThis.__relaySend(this.name, { kind: "presence_join", key: this.config?.presence?.key });
      cb && cb("SUBSCRIBED");
    }, JOIN_DELAY);
    return this;
  }
  async track(meta) {
    this.presence[this.config?.presence?.key] = [meta];
    this._emitPresence();
    globalThis.__relaySend(this.name, { kind: "presence", key: this.config?.presence?.key, meta });
    return "ok";
  }
  presenceState() { return this.presence; }
  async send(msg) {
    globalThis.__relaySend(this.name, { kind: "broadcast", event: msg.event, payload: msg.payload });
    if (this.config?.broadcast?.self) this._deliver({ kind: "broadcast", event: msg.event, payload: msg.payload });
    return "ok";
  }
  async unsubscribe() {
    this.joined = false;
    channels.delete(this.name);
    globalThis.__relaySend(this.name, { kind: "presence_leave", key: this.config?.presence?.key });
    return "ok";
  }
  _emitPresence() {
    for (const h of this.handlers) if (h.type === "presence" && h.filter?.event === "sync") h.cb();
  }
  _deliver(msg) {
    if (msg.kind === "presence") { this.presence[msg.key] = [msg.meta]; this._emitPresence(); return; }
    if (msg.kind === "presence_leave") { delete this.presence[msg.key]; this._emitPresence(); return; }
    if (msg.kind === "presence_join") {
      // Real presence hands a joiner the full current state; emulate by
      // re-announcing our own tracked meta.
      const mine = this.presence[this.config?.presence?.key];
      if (mine) globalThis.__relaySend(this.name, { kind: "presence", key: this.config?.presence?.key, meta: mine[0] });
      return;
    }
    for (const h of this.handlers) if (h.type === "broadcast" && h.filter?.event === msg.event) h.cb({ payload: msg.payload });
  }
}
export function createClient() {
  return { channel: (name, config) => new Channel(name, config) };
}
