/**
 * Deck Builder, Shop and Online Lobby UI.
 *
 * Self-contained view layer: it never decides legality itself. Deck
 * legality comes from src/game/decks.js (engine validateDeck +
 * ownership), shop accounting from src/game/economy.js, and room rules
 * from src/game/lobby.js. Everything saved goes through the host's
 * `saveProfile` callback, so decks, collection and Shards persist on
 * the local profile (keyed to its id) and survive refresh.
 *
 * The host (src/main.js) supplies:
 *   getCatalog(), getProfile(), saveProfile(profile),
 *   activeDeckId(), setActiveDeckId(id),
 *   startPracticeWithDeck(cardIds),
 *   startOnlineMatch({ room, mySeat, decks, seed, channel }),
 *   applyRemoteCommand(envelope)
 *
 * Honest limits, shown in the Lobby view itself: online matches are
 * peer-validated (every remote command is re-validated by the local
 * engine), NOT server-authoritative, and grant no rewards or rank.
 * Deck lists are shared with the opponent at match start so both
 * clients can build the same match; hands are never shared (each
 * client shuffles locally from the shared seed and only its own hand
 * is displayed).
 */

import { buildPracticeDeck, validateDeck } from "../game/content.js";
import {
  createDeck,
  deleteDeck,
  duplicateDeck,
  sanitizeDecks,
  upsertDeck,
  validateDeckWithOwnership,
} from "../game/decks.js";
import {
  PACK_PRICE,
  RARITY_PRICES,
  dissolve,
  dissolvePreview,
  purchasePack,
  purchaseSingle,
  sanitizeEconomy,
  starterCollection,
} from "../game/economy.js";
import {
  canStart,
  createRoom,
  isRoomCode,
  joinRoom,
  leaveRoom,
  mergeRemoteRoom,
  setReady,
  setSeatDeck,
  startMatch,
} from "../game/lobby.js";
import { effectSummary } from "../game/card-text.js";
import { buildApprovedCard } from "../render/approved-frame.js";
import { illustrationDataUri } from "../render/illustration.js";
import { joinRoomChannel } from "../net/online.js";

const el = (tag, props = {}, children = []) => {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "dataset") Object.assign(node.dataset, value);
    else if (key.startsWith("on")) node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value !== undefined && value !== null) node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
};
const $ = (selector) => document.querySelector(selector);

const ELEMENT_LABELS = { wood: "Wood", fire: "Fire", earth: "Earth", metal: "Metal", water: "Water" };

function cardMini(card, owned = null) {
  const wrap = el("div", { class: "sys-card" });
  wrap.append(buildApprovedCard(card, { artUri: illustrationDataUri(card), effectText: effectSummary(card) }));
  wrap.append(el("span", { class: "sys-card-name", text: card.name }));
  const bits = [`${card.cost} Flux`, ELEMENT_LABELS[card.element] ?? "", card.rarity ?? ""].filter(Boolean).join(" · ");
  wrap.append(el("span", { class: "sys-card-meta", text: bits }));
  if (owned !== null) wrap.append(el("span", { class: "sys-card-owned", text: `Owned ${owned}` }));
  return wrap;
}

export function mountSystems(ctx) {
  const state = {
    editingId: null,
    draft: [],
    search: "",
    category: "all",
    element: "all",
    sort: "name",
    shopTab: "packs",
    lastOpening: null,
    shopMessage: "",
    lobbyMessage: "",
    room: null,
    channel: null,
    mySeat: null,
    transportError: null,
    connection: "offline", // offline | connecting | connected | error
    joining: false,
    lastAction: null, // retry target after a transport failure
  };

  const catalog = () => ctx.getCatalog();
  const profile = () => ctx.getProfile();
  const economy = () => sanitizeEconomy(profile()?.economy);
  const decks = () => sanitizeDecks(economy().decks);
  const byId = (id) => catalog()?.byId?.get(id) ?? catalog()?.cards?.find((c) => c.id === id);

  function persist(nextProfile) {
    ctx.saveProfile(nextProfile);
  }
  function setEconomy(nextEconomy) {
    persist({ ...profile(), economy: nextEconomy });
  }
  function setDecks(nextDecks, activeDeckId) {
    const next = { ...economy(), decks: nextDecks };
    if (activeDeckId !== undefined) next.activeDeckId = activeDeckId;
    setEconomy(next);
  }

  /** Seed a starter deck + bound starter collection for profiles that have none. */
  function seedStarterIfNeeded() {
    const cat = catalog();
    if (!cat || decks().length > 0) return;
    const starterIds = buildPracticeDeck(cat);
    const deck = createDeck("Starter Lattice", starterIds);
    setEconomy({
      ...economy(),
      collection: starterCollection(starterIds),
      decks: [deck],
      activeDeckId: deck.id,
    });
  }

  /* ------------------------------ decks ------------------------------ */

  function deckValidation(deck) {
    return validateDeckWithOwnership(deck.cardIds, catalog(), economy().collection);
  }

  function filteredCards() {
    const cat = catalog();
    if (!cat) return [];
    let list = cat.cards.filter((card) =>
      (state.category === "all" || card.category === state.category) &&
      (state.element === "all" || card.element === state.element) &&
      (state.search === "" || card.name.toLowerCase().includes(state.search.toLowerCase())),
    );
    const by = {
      name: (a, b) => a.name.localeCompare(b.name),
      cost: (a, b) => a.cost - b.cost || a.name.localeCompare(b.name),
      rarity: (a, b) => (a.rarity ?? "").localeCompare(b.rarity ?? "") || a.name.localeCompare(b.name),
    }[state.sort] ?? ((a, b) => a.name.localeCompare(b.name));
    return [...list].sort(by);
  }

  function renderDecks() {
    const host = $("#decks-root");
    if (!host || !catalog()) return;
    host.replaceChildren();
    const activeId = ctx.activeDeckId();
    const list = decks();
    host.append(el("p", { class: "muted small", text: "Build from the canonical card manifest. A deck needs 20–40 cards, at least 10 Vessels and 5 Actions, at most 3 copies of any card — and you must own every copy you put in it. Illegal decks can be saved as drafts, but they cannot start a match." }));

    const actions = el("div", { class: "sys-row" }, [
      el("button", { type: "button", class: "button primary", text: "New deck", onclick: () => {
        const deck = createDeck(`Deck ${list.length + 1}`);
        const result = upsertDeck(list, deck);
        setDecks(result.decks);
        state.editingId = deck.id;
        state.draft = [];
        renderDecks();
      } }),
    ]);
    host.append(actions);

    for (const deck of list) {
      const check = deckValidation(deck);
      const counts = check.counts;
      const card = el("div", { class: "sys-deck" }, [
        el("div", { class: "sys-deck-head" }, [
          el("strong", { text: deck.name }),
          el("span", { class: "muted small", text: `${counts.total} cards · ${counts.vessels} Vessels · ${counts.actions} Actions · ${counts.relics} Relics` }),
          el("span", { class: check.ok ? "pill ok" : "pill bad", text: check.ok ? "LEGAL" : "ILLEGAL" }),
          activeId === deck.id ? el("span", { class: "pill", text: "ACTIVE" }) : null,
        ]),
      ]);
      if (!check.ok) card.append(el("ul", { class: "sys-errors" }, check.errors.map((e) => el("li", { text: e }))));
      card.append(el("div", { class: "sys-row" }, [
        el("button", { type: "button", class: "button secondary small", text: state.editingId === deck.id ? "Close editor" : "Edit", onclick: () => {
          state.editingId = state.editingId === deck.id ? null : deck.id;
          state.draft = [...deck.cardIds];
          renderDecks();
        } }),
        el("button", { type: "button", class: "button secondary small", text: "Use for next match", disabled: check.ok ? undefined : "disabled", onclick: () => {
          ctx.setActiveDeckId(deck.id);
          renderDecks();
        } }),
        el("button", { type: "button", class: "button secondary small", text: "Play practice with this deck", disabled: check.ok ? undefined : "disabled", onclick: () => ctx.startPracticeWithDeck(deck.cardIds) }),
        el("button", { type: "button", class: "button secondary small", text: "Duplicate", onclick: () => {
          const result = duplicateDeck(list, deck.id);
          setDecks(result.decks);
          renderDecks();
        } }),
        el("button", { type: "button", class: "button secondary small", text: "Rename", onclick: () => {
          const name = window.prompt("Deck name:", deck.name);
          if (name === null) return;
          const result = upsertDeck(list, { ...deck, name });
          setDecks(result.decks);
          renderDecks();
        } }),
        el("button", { type: "button", class: "button danger small", text: "Delete", onclick: () => {
          if (!window.confirm(`Delete "${deck.name}"?`)) return;
          const next = deleteDeck(list, deck.id);
          setDecks(next, ctx.activeDeckId() === deck.id ? (next[0]?.id ?? null) : undefined);
          renderDecks();
        } }),
      ]));
      if (state.editingId === deck.id) card.append(renderDeckEditor(deck));
      host.append(card);
    }
    if (list.length === 0) host.append(el("p", { class: "muted", text: "No decks yet. Create one above." }));
  }

  function renderDeckEditor(deck) {
    const draft = state.draft;
    const counts = {};
    for (const id of draft) counts[id] = (counts[id] ?? 0) + 1;
    const check = validateDeckWithOwnership(draft, catalog(), economy().collection);
    const editor = el("div", { class: "sys-editor" });
    editor.append(el("div", { class: "sys-row" }, [
      el("input", { type: "search", placeholder: "Search cards…", value: state.search, oninput: (e) => { state.search = e.target.value; renderDecks(); } }),
      el("select", { onchange: (e) => { state.category = e.target.value; renderDecks(); } }, [
        ["all", "All types"], ["vessel", "Vessels"], ["action", "Actions"], ["relic", "Relics"],
      ].map(([v, label]) => el("option", { value: v, selected: state.category === v ? "selected" : undefined, text: label }))),
      el("select", { onchange: (e) => { state.element = e.target.value; renderDecks(); } }, [
        ["all", "All elements"], ...Object.entries(ELEMENT_LABELS),
      ].map(([v, label]) => el("option", { value: v, selected: state.element === v ? "selected" : undefined, text: label }))),
      el("select", { onchange: (e) => { state.sort = e.target.value; renderDecks(); } }, [
        ["name", "Sort: name"], ["cost", "Sort: cost"], ["rarity", "Sort: rarity"],
      ].map(([v, label]) => el("option", { value: v, selected: state.sort === v ? "selected" : undefined, text: label }))),
    ]));
    editor.append(el("p", { class: "muted small", text: `Draft: ${draft.length} cards · ${check.counts.vessels} Vessels · ${check.counts.actions} Actions · ${check.counts.relics} Relics` }));
    if (!check.ok) editor.append(el("ul", { class: "sys-errors" }, check.errors.map((e) => el("li", { text: e }))));
    editor.append(el("div", { class: "sys-row" }, [
      el("button", { type: "button", class: "button primary small", text: "Save deck", onclick: () => {
        const result = upsertDeck(decks(), { ...deck, cardIds: draft });
        if (result.error) { window.alert(result.error); return; }
        setDecks(result.decks);
        state.editingId = null;
        renderDecks();
      } }),
      el("button", { type: "button", class: "button secondary small", text: "Clear draft", onclick: () => { state.draft = []; renderDecks(); } }),
    ]));
    const grid = el("div", { class: "sys-grid" });
    for (const card of filteredCards()) {
      const owned = economy().collection[card.id]?.qty ?? 0;
      const inDraft = counts[card.id] ?? 0;
      const tile = cardMini(card, owned);
      tile.append(el("div", { class: "sys-row" }, [
        el("button", { type: "button", class: "button secondary small", text: `Add (${inDraft}/3)`, disabled: inDraft >= 3 || draft.length >= 40 || owned <= inDraft ? "disabled" : undefined, onclick: () => { state.draft = [...state.draft, card.id]; renderDecks(); } }),
        inDraft > 0 ? el("button", { type: "button", class: "button secondary small", text: "Remove", onclick: () => {
          const next = [...state.draft];
          next.splice(next.indexOf(card.id), 1);
          state.draft = next;
          renderDecks();
        } }) : null,
      ]));
      grid.append(tile);
    }
    editor.append(grid);
    return editor;
  }

  /* ------------------------------ shop ------------------------------ */

  function renderShop() {
    const host = $("#shop-root");
    if (!host || !catalog()) return;
    host.replaceChildren();
    const econ = economy();
    host.append(el("p", { class: "sys-balance", text: `Balance: ${econ.shards} Lattice Shards` }));
    host.append(el("p", { class: "muted small", text: "Packs cost 300 Shards and contain exactly 5 Common cards + 1 Rare-or-better card. Singles cost by rarity (Common 60, Uncommon 100, Rare 240, Epic 600, Mythic 1200) and can only be bought for cards you have discovered. Dissolving pays Common 10, Uncommon 15, Rare 40, Epic 100, Mythic 200 per copy. Starter copies are bound and can never be dissolved; dissolving that would break a saved deck is blocked. Prices are the shipped local defaults from the progression document, not final balance." }));
    if (state.shopMessage) host.append(el("p", { class: "sys-status", text: state.shopMessage }));

    host.append(el("div", { class: "sys-row" }, [
      el("button", { type: "button", class: "button primary", text: `Buy pack — ${PACK_PRICE} Shards`, disabled: econ.shards < PACK_PRICE ? "disabled" : undefined, onclick: () => {
        const operationId = `pack-${Date.now()}-${Math.floor(Math.random() * 0xffffffff).toString(36)}`;
        const result = purchasePack(economy(), catalog(), operationId, Math.random);
        if (result.error) { state.shopMessage = result.error; renderShop(); return; }
        setEconomy(result.economy);
        state.lastOpening = result.opening;
        state.shopMessage = `Pack opened: ${result.opening.cards.map((id) => byId(id)?.name ?? id).join(", ")}.`;
        renderShop();
      } }),
      el("button", { type: "button", class: "button secondary", text: "Collection", onclick: () => { state.shopTab = "collection"; renderShop(); } }),
      el("button", { type: "button", class: "button secondary", text: "Singles", onclick: () => { state.shopTab = "singles"; renderShop(); } }),
    ]));

    if (state.lastOpening) {
      const reveal = el("div", { class: "sys-opening" }, [el("h3", { text: "Last pack opened" })]);
      const grid = el("div", { class: "sys-grid" });
      for (const id of state.lastOpening.cards) {
        const card = byId(id);
        if (card) grid.append(cardMini(card, economy().collection[id]?.qty ?? 0));
      }
      reveal.append(grid);
      host.append(reveal);
    }

    if (state.shopTab === "collection") {
      const grid = el("div", { class: "sys-grid" });
      for (const card of catalog().cards) {
        const entry = economy().collection[card.id];
        if (!entry?.discovered) continue;
        const tile = cardMini(card, entry.qty);
        tile.append(el("span", { class: "muted small", text: entry.boundQty > 0 ? `${entry.boundQty} bound starter ${entry.boundQty === 1 ? "copy" : "copies"} protected` : "No bound copies" }));
        tile.append(el("div", { class: "sys-row" }, [
          el("button", { type: "button", class: "button secondary small", text: "Dissolve 1", disabled: (entry.qty - entry.boundQty) < 1 ? "disabled" : undefined, onclick: () => {
            const preview = dissolvePreview(economy(), catalog(), card.id, 1, decks());
            if (!preview.ok) { state.shopMessage = preview.error; renderShop(); return; }
            if (!window.confirm(`Dissolve 1 copy of ${card.name} for ${preview.payout} Shards? This cannot be undone.`)) return;
            const result = dissolve(economy(), catalog(), card.id, 1, decks());
            if (result.error) { state.shopMessage = result.error; renderShop(); return; }
            setEconomy(result.economy);
            state.shopMessage = `Dissolved 1 copy of ${card.name} for ${result.payout} Shards.`;
            renderShop();
          } }),
        ]));
        grid.append(tile);
      }
      host.append(el("h3", { text: "Your collection (discovered cards only — undiscovered cards are not listed as owned)" }));
      host.append(grid);
    }

    if (state.shopTab === "singles") {
      const grid = el("div", { class: "sys-grid" });
      for (const card of catalog().cards) {
        const entry = economy().collection[card.id];
        if (!entry?.discovered) continue;
        const price = RARITY_PRICES[card.rarity]?.buy;
        if (price === undefined) continue;
        const tile = cardMini(card, entry.qty);
        tile.append(el("button", { type: "button", class: "button secondary small", text: `Buy Single — ${price}`, disabled: economy().shards < price ? "disabled" : undefined, onclick: () => {
          const result = purchaseSingle(economy(), catalog(), card.id);
          if (result.error) { state.shopMessage = result.error; renderShop(); return; }
          setEconomy(result.economy);
          state.shopMessage = `Bought 1 copy of ${card.name} for ${price} Shards.`;
          renderShop();
        } }));
        grid.append(tile);
      }
      host.append(el("h3", { text: "Singles — discovered cards only" }));
      host.append(grid);
    }
  }

  /* ------------------------------ lobby ------------------------------ */

  function broadcastRoom() {
    if (state.channel && state.room) state.channel.sendRoom(state.room).catch(() => {});
  }
  function adoptRoom(next, fromId) {
    if (!next || next.code !== state.room?.code) return;
    const wasLive = ctx.isOnline();
    const merged = mergeRemoteRoom(state.room, next, { myId: profile().id, fromId });
    state.room = merged.room;
    let mine = state.room.seats?.find((s) => s.playerId === profile().id);
    if (!mine && state.room.status === "waiting" && Array.isArray(state.room.seats) && state.room.seats.length) {
      // Guest fallback: seat ourselves in a room the host broadcast before
      // our join message was processed, then broadcast it back.
      const seated = joinRoom(state.room, profile());
      if (!seated.error) {
        state.room = seated.room;
        mine = seated.room.seats.find((s) => s.playerId === profile().id);
        broadcastRoom();
      }
    }
    if (mine) {
      state.mySeat = mine.seat;
      state.joining = false;
    }
    if (wasLive && (merged.event === "left" || state.room.status === "finished" || state.room.status === "closed")) {
      ctx.abandonOnlineMatch?.("Your opponent left the room. The online match has ended with no result (online preview matches record nothing). Leave the room to return to the lobby.");
    }
    renderLobby();
    if (state.room.status === "in_match" && state.room.matchSeed !== null && !wasLive) {
      startOnlineFromRoom(state.room);
    }
  }
  function startOnlineFromRoom(room) {
    const mySeat = room.seats.find((s) => s.playerId === profile().id)?.seat;
    if (mySeat === undefined) return;
    const myDeck = decks().find((d) => d.id === room.seats[mySeat].deckId);
    const foeSeat = mySeat === 0 ? 1 : 0;
    const foeCards = room.seats[foeSeat].deckCards;
    if (!myDeck || !Array.isArray(foeCards)) {
      state.lobbyMessage = "Cannot start: the opponent's deck list has not arrived yet. Ask them to re-select their deck.";
      renderLobby();
      return;
    }
    const ordered = mySeat === 0 ? [myDeck.cardIds, foeCards] : [foeCards, myDeck.cardIds];
    const legality = ordered.map((ids) => validateDeck(ids, catalog()));
    if (legality.some((c) => !c.ok)) {
      state.lobbyMessage = `Cannot start: a deck failed validation — ${legality.flatMap((c) => c.errors).join(" ")}`;
      renderLobby();
      return;
    }
    ctx.startOnlineMatch({ room, mySeat, decks: ordered, seed: room.matchSeed, channel: state.channel });
  }

  async function ensureChannel(code) {
    if (state.channel) return state.channel;
    state.connection = "connecting";
    renderLobby();
    let channel;
    try {
      channel = await joinRoomChannel(code, profile().id, {
      onRoom: (room, fromId) => adoptRoom(room, fromId),
      onCommand: (envelope) => ctx.applyRemoteCommand(envelope),
      onJoin: async (player) => {
        // Host answers a join request with the current room state so the
        // joiner can seat itself; guests ignore other guests' joins.
        if (state.room && state.mySeat === 0) {
          const result = joinRoom(state.room, player);
          if (!result.error) {
            state.room = result.room;
            await channel.sendRoom(state.room).catch(() => {});
            renderLobby();
          }
        }
      },
      onPresence: (ids) => {
        state.presence = ids;
        // Only someone we have actually seen present can be reported as lost.
        state.seenPresent = new Set([...(state.seenPresent ?? []), ...ids]);
        if (ctx.isOnline() && state.room && state.mySeat !== null && state.mySeat !== undefined) {
          const foe = state.room.seats?.[state.mySeat === 0 ? 1 : 0]?.playerId;
          if (foe && !ids.includes(foe)) ctx.onlineNotice?.("Opponent connection lost. Reconnection is not supported in this preview: if they do not return, leave the room.");
        }
        // Broadcast has no replay: whenever the member set changes, the host
        // re-sends the room so a late or reconnecting peer converges.
        if (state.room && state.mySeat === 0) broadcastRoom();
        renderLobby();
      },
      onStatus: (status) => {
        state.connection = "error";
        state.lobbyMessage = `Room connection ${status.toLowerCase().replace("_", " ")} — leave and rejoin the room.`;
        renderLobby();
      },
    });
    } catch (error) {
      state.connection = "error";
      throw error;
    }
    state.connection = "connected";
    state.channel = channel;
    return channel;
  }

  /* Lobby presentation — docs/UI_DESIGN_SYSTEM.md §4.3. Every value shown
     comes from state.room (src/game/lobby.js) or the local decks; nothing is
     simulated. Legality and start permission are re-checked by lobby.js. */
  const CONNECTION_BADGE = {
    offline: ["vl-badge--muted", "Not connected"],
    connecting: ["vl-badge--info", "Connecting…"],
    connected: ["vl-badge--ok", "Connected"],
    error: ["vl-badge--danger", "Connection error"],
  };

  function deckStatusFor(cardIds, name, { owned = true } = {}) {
    if (!Array.isArray(cardIds)) return { deck: null, ok: false, counts: null, reason: "No deck selected yet." };
    const check = owned
      ? validateDeckWithOwnership(cardIds, catalog(), economy().collection)
      : validateDeck(cardIds, catalog());
    return {
      deck: { name: name || "Selected deck", cardIds },
      ok: check.ok,
      counts: check.counts,
      reason: check.ok ? "" : check.errors[0] ?? "Deck is not legal.",
    };
  }

  function deckBlock(status, emptyText) {
    const wrap = el("div", { class: `vl-deck${status.ok ? " is-legal" : " is-illegal"}` });
    if (!status.deck) {
      wrap.append(el("p", { class: "vl-deck-empty", text: emptyText ?? status.reason }));
      return wrap;
    }
    wrap.append(el("div", { class: "vl-deck-row" }, [
      el("span", { class: "vl-deck-name", text: status.deck.name }),
      el("span", { class: `vl-badge ${status.ok ? "vl-badge--ok" : "vl-badge--danger"}`, text: status.ok ? "Legal" : "Not legal" }),
    ]));
    if (status.counts) {
      const c = status.counts;
      wrap.append(el("p", { class: "vl-deck-meta", text: `${c.total} cards · ${c.vessels} Vessels · ${c.actions} Actions · ${c.relics} Relics` }));
    }
    if (!status.ok && status.reason) wrap.append(el("p", { class: "vl-deck-error", text: status.reason }));
    return wrap;
  }

  function lobbyLimits() {
    return el("details", { class: "vl-details" }, [
      el("summary", { text: "What this preview does — and does not — do" }),
      el("ul", {}, [
        el("li", { text: "Every remote command is re-validated by your own engine (seat, sequence, command id, legality); illegal commands are rejected." }),
        el("li", { text: "It is NOT server-authoritative multiplayer: no Edge Functions are deployed, so online matches grant no rewards, rank or currency." }),
        el("li", { text: "Hands are never broadcast, but both clients shuffle from a shared seed, so a modified client could reconstruct them." }),
        el("li", { text: "Reconnection is not supported: reloading the page leaves the match." }),
      ]),
    ]);
  }

  async function runLobbyAction(action) {
    state.lastAction = action;
    state.transportError = null;
    try {
      await action();
    } catch (error) {
      state.transportError = String(error?.message ?? error);
      state.joining = false;
    }
    renderLobby();
  }

  function createRoomAction() {
    return runLobbyAction(async () => {
      state.room = createRoom({ host: profile() });
      state.mySeat = 0;
      try {
        await ensureChannel(state.room.code);
      } catch (error) {
        state.room = null;
        state.mySeat = null;
        throw error;
      }
      await state.channel.sendRoom(state.room).catch(() => {});
      state.lobbyMessage = "Room created. Share the code with your opponent.";
    });
  }

  function joinRoomAction(code) {
    return runLobbyAction(async () => {
      state.joining = true;
      // Placeholder until the host's room arrives (shown as the joining
      // state immediately). updatedAt 0 so the first real room is always
      // adopted, whatever the two clocks say.
      state.room = { code, status: "waiting", seats: [], updatedAt: 0 };
      let channel;
      try {
        channel = await ensureChannel(code);
      } catch (error) {
        state.room = null;
        throw error;
      }
      await channel.sendJoin?.({ id: profile().id, displayName: profile().displayName }).catch(() => {});
      state.lobbyMessage = "";
    });
  }

  function seatPanel(room, seat) {
    const isMine = seat.playerId === profile().id;
    const empty = !seat.playerId;
    const node = el("article", { class: `vl-seat vl-seat--${seat.seat}${seat.ready ? " is-ready" : ""}${empty ? " is-empty" : ""}`, "aria-label": `Seat ${seat.seat + 1}` });
    if (empty) {
      node.append(
        el("div", { class: "vl-seat-head" }, [
          el("span", { class: "vl-seat-emblem", text: "?" }),
          el("div", {}, [el("p", { class: "vl-seat-name", text: "Open seat" }), el("p", { class: "vl-muted", text: "Waiting for an opponent — share the room code." })]),
        ]),
      );
      return node;
    }
    const name = seat.displayName || "Player";
    node.append(el("div", { class: "vl-seat-head" }, [
      el("span", { class: "vl-seat-emblem", text: name.trim().charAt(0).toUpperCase() || "?" }),
      el("div", {}, [
        el("p", { class: "vl-seat-name", text: name }),
        el("div", { class: "vl-seat-tags" }, [
          isMine ? el("span", { class: "vl-badge vl-badge--info", text: "You" }) : null,
          seat.seat === 0 ? el("span", { class: "vl-badge vl-badge--muted", text: "Host" }) : null,
          !isMine && state.seenPresent?.has(seat.playerId) && !(state.presence ?? []).includes(seat.playerId)
            ? el("span", { class: "vl-badge vl-badge--warn", text: "Connection lost" })
            : null,
        ]),
      ]),
    ]));
    // Deck: mine is validated with ownership; the opponent's list is
    // validated against the rules (ownership is theirs to prove).
    const deckList = isMine ? decks().find((d) => d.id === seat.deckId) : null;
    const status = isMine
      ? (deckList ? deckStatusFor(deckList.cardIds, deckList.name) : deckStatusFor(null))
      : deckStatusFor(seat.deckCards, seat.deckName || "Opponent's deck", { owned: false });
    node.append(deckBlock(status, isMine ? "Select a deck below." : "No deck selected yet."));
    node.append(el("span", { class: `vl-ready${seat.ready ? " is-ready" : ""}`, text: seat.ready ? "Ready" : "Not ready" }));

    if (isMine && room.status !== "in_match" && room.status !== "finished") {
      const options = decks().map((d) => ({ deck: d, check: deckValidation(d) }));
      const select = el("select", { class: "vl-select", "aria-label": "Your deck for this room", onchange: (e) => {
        const deck = decks().find((d) => d.id === e.target.value);
        if (!deck) return;
        const result = setSeatDeck(state.room, profile().id, deck.id);
        if (result.error) { state.lobbyMessage = result.error; renderLobby(); return; }
        state.room = { ...result.room, seats: result.room.seats.map((s) => s.playerId === profile().id ? { ...s, deckCards: deck.cardIds, deckName: deck.name } : s) };
        broadcastRoom();
        renderLobby();
      } }, [
        el("option", { value: "", text: "Select a deck…" }),
        ...options.map(({ deck, check }) => el("option", { value: deck.id, selected: seat.deckId === deck.id ? "selected" : undefined, text: `${deck.name}${check.ok ? "" : " (not legal)"}` })),
      ]);
      const deckOk = Boolean(deckList) && status.ok;
      const readyBtn = el("button", {
        type: "button",
        class: `vl-btn ${seat.ready ? "vl-btn--secondary" : "vl-btn--primary"}`,
        text: seat.ready ? "Unready" : "Ready up",
        disabled: !seat.ready && !deckOk ? "disabled" : undefined,
        title: !seat.ready && !deckOk ? "Select a legal, owned deck first" : undefined,
        onclick: () => {
          const result = setReady(state.room, profile().id, !seat.ready);
          if (result.error) { state.lobbyMessage = result.error; renderLobby(); return; }
          state.room = result.room;
          broadcastRoom();
          renderLobby();
        },
      });
      node.append(el("div", { class: "vl-mode-actions" }, [select, readyBtn]));
    }
    return node;
  }

  function startBlocker(room) {
    if (state.mySeat !== 0) return "Only the host can start the match.";
    if (!room.seats.every((s) => s.playerId)) return "Waiting for an opponent to join.";
    if (!room.seats.every((s) => s.deckId)) return "Both players must select a deck.";
    if (!room.seats.every((s) => s.ready)) return "Both players must be ready.";
    return canStart(room) ? "" : "Not ready to start.";
  }

  function renderLobby() {
    const host = $("#lobby-root");
    if (!host || !catalog()) return;
    host.replaceChildren();
    const root = el("div", { class: "vl-lobby" });
    host.append(root);
    const [badgeClass, badgeText] = CONNECTION_BADGE[state.connection] ?? CONNECTION_BADGE.offline;
    root.append(el("div", { class: "vl-lobby-bar" }, [
      el("div", { class: "vl-lobby-badges" }, [
        el("span", { class: "vl-badge vl-badge--preview", text: "Preview · peer-validated" }),
        el("span", { class: `vl-badge ${badgeClass}`, text: badgeText, role: "status" }),
        el("span", { class: "vl-badge vl-badge--muted", text: "No rewards · no rank" }),
      ]),
      el("button", { type: "button", class: "vl-btn vl-btn--quiet", text: "← Back to menu", onclick: () => ctx.showView?.("menu") }),
    ]));

    if (state.transportError) {
      root.append(el("div", { class: "vl-error", role: "alert" }, [
        el("strong", { text: "Online transport unavailable. " }),
        `${state.transportError}. Rooms cannot be created or joined from this browser right now; Practice, Deck Builder and Shop still work. `,
        state.lastAction ? el("button", { type: "button", class: "vl-btn vl-btn--secondary", text: "Retry", onclick: () => state.lastAction && runLobbyAction(state.lastAction) }) : null,
      ]));
    }
    if (state.lobbyMessage) root.append(el("p", { class: "vl-status", role: "status", text: state.lobbyMessage }));

    const room = state.room;
    const mySeatEntry = room?.seats?.find?.((s) => s.playerId === profile().id);

    if (!room || (!mySeatEntry && !state.joining)) {
      // No room: host, join, and your deck.
      const active = decks().find((d) => d.id === ctx.activeDeckId?.()) ?? decks()[0];
      const busy = state.connection === "connecting";
      const codeInput = el("input", { type: "text", class: "vl-input vl-input--code", id: "lobby-code-input", inputmode: "text", autocomplete: "off", maxlength: "6", placeholder: "CODE", "aria-label": "Room code (6 characters)" });
      const joinBtn = el("button", { type: "button", class: "vl-btn vl-btn--secondary", text: "Join room", disabled: busy ? "disabled" : undefined, onclick: () => {
        const code = (codeInput.value ?? "").trim().toUpperCase();
        if (!isRoomCode(code)) { state.lobbyMessage = "Enter the 6-character room code from your host."; renderLobby(); $("#lobby-code-input")?.focus(); return; }
        joinRoomAction(code);
      } });
      codeInput.addEventListener("keydown", (e) => { if (e.key === "Enter") joinBtn.click(); });
      root.append(el("div", { class: "vl-lobby-grid" }, [
        el("section", { class: "vl-panel", "aria-labelledby": "lobby-host-title" }, [
          el("h2", { class: "vl-panel-title", id: "lobby-host-title", text: "Host a room" }),
          el("p", { class: "vl-muted", text: "Create a room, then send the 6-character code to your opponent." }),
          el("button", { type: "button", class: "vl-btn vl-btn--primary vl-btn--lg", text: "Create room", "aria-busy": busy && state.room ? "true" : undefined, disabled: busy ? "disabled" : undefined, onclick: () => createRoomAction() }),
        ]),
        el("section", { class: "vl-panel", "aria-labelledby": "lobby-join-title" }, [
          el("h2", { class: "vl-panel-title", id: "lobby-join-title", text: "Join with a code" }),
          el("p", { class: "vl-muted", text: "Enter the code your host shared." }),
          el("div", { class: "vl-join-row" }, [codeInput, joinBtn]),
        ]),
        el("section", { class: "vl-panel", "aria-labelledby": "lobby-deck-title" }, [
          el("h2", { class: "vl-panel-title", id: "lobby-deck-title", text: "Your deck" }),
          deckBlock(active ? deckStatusFor(active.cardIds, active.name) : deckStatusFor(null), "No saved deck yet."),
          el("button", { type: "button", class: "vl-btn vl-btn--quiet", text: "Open Deck Builder", onclick: () => ctx.showView?.("decks") }),
        ]),
      ]));
      root.append(lobbyLimits());
      return;
    }

    if (state.joining && !mySeatEntry) {
      root.append(el("section", { class: "vl-panel vl-empty", "aria-live": "polite" }, [
        el("span", { class: "vl-spinner", "aria-hidden": "true" }),
        el("p", { text: `Joining room ${room.code}… waiting for the host to seat you.` }),
        el("p", { class: "vl-muted", text: "If nothing happens within a few seconds, check the code with your host." }),
        el("button", { type: "button", class: "vl-btn vl-btn--quiet", text: "Cancel", onclick: () => leaveCurrentRoom() }),
      ]));
      return;
    }

    // In a room.
    const STATUS_LABEL = { waiting: ["vl-badge--muted", "Waiting"], ready: ["vl-badge--ok", "Both ready"], in_match: ["vl-badge--info", "Match in progress"], finished: ["vl-badge--warn", "Finished"], closed: ["vl-badge--muted", "Closed"] };
    const [statusClass, statusText] = STATUS_LABEL[room.status] ?? STATUS_LABEL.waiting;
    const copyBtn = el("button", { type: "button", class: "vl-btn vl-btn--secondary", text: "Copy code", onclick: async () => {
      try { await navigator.clipboard.writeText(room.code); state.lobbyMessage = "Room code copied."; } catch { state.lobbyMessage = `Room code: ${room.code}`; }
      renderLobby();
    } });
    root.append(el("section", { class: "vl-panel", "aria-labelledby": "room-title" }, [
      el("div", { class: "vl-room-head" }, [
        el("div", {}, [
          el("h2", { class: "vl-panel-title", id: "room-title", text: "Duel room" }),
          el("div", { class: "vl-room-code", "aria-label": `Room code ${room.code.split("").join(" ")}` }, [el("small", { text: "Code" }), room.code]),
        ]),
        el("div", { class: "vl-lobby-badges" }, [el("span", { class: `vl-badge ${statusClass}`, text: statusText }), copyBtn]),
      ]),
    ]));

    const seats = room.seats.length === 2 ? room.seats : [];
    root.append(el("div", { class: "vl-seats" }, [
      seats[0] ? seatPanel(room, seats[0]) : null,
      el("span", { class: "vl-versus", "aria-hidden": "true", text: "VS" }),
      seats[1] ? seatPanel(room, seats[1]) : null,
    ]));

    const blocker = room.status === "in_match" || room.status === "finished" ? "" : startBlocker(room);
    const isHost = state.mySeat === 0;
    root.append(el("div", { class: "vl-room-actions" }, [
      el("div", { class: "vl-room-actions-main" }, [
        isHost && room.status !== "in_match" && room.status !== "finished"
          ? el("button", { type: "button", class: "vl-btn vl-btn--primary vl-btn--lg", text: "Start match", disabled: blocker ? "disabled" : undefined, "aria-describedby": "start-blocker", onclick: () => {
              const result = startMatch(state.room, (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
              if (result.error) { state.lobbyMessage = result.error; renderLobby(); return; }
              state.room = result.room;
              broadcastRoom();
              startOnlineFromRoom(result.room);
            } })
          : null,
        room.status === "in_match" && ctx.isOnline()
          ? el("button", { type: "button", class: "vl-btn vl-btn--primary", text: "Return to match", onclick: () => ctx.showView?.("battle") })
          : null,
        el("p", { class: "vl-status", id: "start-blocker", text: blocker || (!isHost && room.status === "ready" ? "Waiting for the host to start." : "") }),
      ]),
      el("button", { type: "button", class: "vl-btn vl-btn--danger", text: "Leave room", onclick: () => leaveCurrentRoom() }),
    ]));
    root.append(lobbyLimits());
  }

  async function leaveCurrentRoom() {
    const room = state.room;
    if (room && Array.isArray(room.seats) && room.seats.length) {
      const next = leaveRoom(room, profile().id);
      if (state.channel) await state.channel.sendRoom(next).catch(() => {});
    }
    await state.channel?.leave().catch(() => {});
    state.channel = null;
    state.room = null;
    state.mySeat = null;
    state.joining = false;
    state.connection = "offline";
    state.presence = null;
    state.seenPresent = null;
    state.lobbyMessage = "";
    ctx.endOnlineMatch?.();
    renderLobby();
  }

  function render(view) {
    seedStarterIfNeeded();
    if (view === "decks") renderDecks();
    else if (view === "shop") renderShop();
    else if (view === "lobby") renderLobby();
  }

  /** Open the Shop on a given tab ("collection" | "singles" | null). */
  function setShopTab(tab) {
    state.shopTab = tab === "collection" || tab === "singles" ? tab : "packs";
  }

  return { render, renderDecks, renderShop, renderLobby, seedStarterIfNeeded, setShopTab };
}
