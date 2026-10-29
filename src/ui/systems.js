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
  function adoptRoom(next) {
    if (!next || next.code !== state.room?.code) return;
    if (state.room && next.updatedAt < state.room.updatedAt) return;
    state.room = next;
    let mine = next.seats.find((s) => s.playerId === profile().id);
    if (!mine && next.status === "waiting") {
      // Guest fallback: seat ourselves in a room the host broadcast
      // before our join message was processed, then broadcast it back.
      const seated = joinRoom(next, profile());
      if (!seated.error) {
        state.room = seated.room;
        mine = seated.room.seats.find((s) => s.playerId === profile().id);
        broadcastRoom();
      }
    }
    if (mine) state.mySeat = mine.seat;
    renderLobby();
    if (next.status === "in_match" && next.matchSeed !== null && !ctx.isOnline()) {
      startOnlineFromRoom(next);
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
    const channel = await joinRoomChannel(code, profile().id, {
      onRoom: (room) => adoptRoom(room),
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
      onPresence: () => renderLobby(),
    });
    state.channel = channel;
    return channel;
  }

  function renderLobby() {
    const host = $("#lobby-root");
    if (!host || !catalog()) return;
    host.replaceChildren();
    host.append(el("p", { class: "sys-warning", text: "Online lobby — peer-validated preview. Every remote command is re-validated by your engine (seat, sequence, command id, legality) and illegal commands are rejected. This is NOT server-authoritative multiplayer: no Edge Functions are deployed, so online matches grant no rewards, rank or currency, and a determined client could still desync its own view. Server-authoritative validation is tracked as blocked pending owner approval and a database migration." }));
    if (state.transportError) host.append(el("p", { class: "sys-errors", text: `Online transport unavailable: ${state.transportError} — rooms cannot be created or joined from this browser right now. Local Practice, Deck Builder and Shop still work.` }));
    if (state.lobbyMessage) host.append(el("p", { class: "sys-status", text: state.lobbyMessage }));

    if (!state.room) {
      host.append(el("div", { class: "sys-row" }, [
        el("button", { type: "button", class: "button primary", text: "Create room", onclick: async () => {
          try {
            state.room = createRoom({ host: profile() });
            state.mySeat = 0;
            await ensureChannel(state.room.code);
            await state.channel.sendRoom(state.room).catch(() => {});
            state.lobbyMessage = `Room ${state.room.code} created. Share the code with your opponent.`;
          } catch (error) {
            state.transportError = String(error?.message ?? error);
          }
          renderLobby();
        } }),
        el("input", { type: "text", placeholder: "Room code (6 letters/digits)", id: "lobby-code-input" }),
        el("button", { type: "button", class: "button secondary", text: "Join room", onclick: async () => {
          const input = $("#lobby-code-input");
          const code = (input?.value ?? "").trim().toUpperCase();
          if (!isRoomCode(code)) { state.lobbyMessage = "Enter a 6-character room code."; renderLobby(); return; }
          try {
            const channel = await ensureChannel(code);
            state.room = { code, status: "waiting", seats: [], updatedAt: Date.now() };
            await channel.sendJoin?.({ id: profile().id, displayName: profile().displayName }).catch(() => {});
            // Fallback: the host broadcasts room state on join; if nothing
            // arrives, the joiner is told to check the code and retry.
            state.lobbyMessage = `Joining room ${code}… if no room appears within a few seconds, check the code and try again.`;
          } catch (error) {
            state.transportError = String(error?.message ?? error);
          }
          renderLobby();
        } }),
      ]));
      host.append(el("p", { class: "muted small", text: "Two players, one room: the host creates it, the guest joins by code, both pick a legal owned deck, both ready up, and the host starts. Deck lists are shared at match start so both clients build the same match; hands are shuffled locally from the shared seed and never broadcast." }));
      return;
    }

    const room = state.room;
    host.append(el("h3", { text: `Room ${room.code} — ${room.status}` }));
    const myDeckOptions = decks().map((d) => ({ deck: d, check: deckValidation(d) }));
    for (const seat of room.seats) {
      const isMine = seat.playerId === profile().id;
      const seatNode = el("div", { class: "sys-seat" }, [
        el("strong", { text: seat.playerId ? (isMine ? `Seat ${seat.seat + 1} — You (${seat.displayName})` : `Seat ${seat.seat + 1} — ${seat.displayName}`) : `Seat ${seat.seat + 1} — open` }),
        el("span", { class: "muted small", text: seat.ready ? "READY" : "Not ready" }),
      ]);
      if (isMine) {
        seatNode.append(el("select", { onchange: (e) => {
          const deck = decks().find((d) => d.id === e.target.value);
          if (!deck) return;
          const result = setSeatDeck(room, profile().id, deck.id);
          if (result.error) { state.lobbyMessage = result.error; renderLobby(); return; }
          state.room = { ...result.room, seats: result.room.seats.map((s) => s.playerId === profile().id ? { ...s, deckCards: deck.cardIds } : s) };
          broadcastRoom();
          renderLobby();
        } }, [
          el("option", { value: "", text: "Select a deck…" }),
          ...myDeckOptions.map(({ deck, check }) => el("option", { value: deck.id, selected: seat.deckId === deck.id ? "selected" : undefined, text: `${deck.name}${check.ok ? "" : " (illegal — cannot ready)"}` })),
        ]));
        seatNode.append(el("button", { type: "button", class: "button secondary small", text: seat.ready ? "Unready" : "Ready up", disabled: !seat.deckId ? "disabled" : undefined, onclick: () => {
          const result = setReady(state.room, profile().id, !seat.ready);
          if (result.error) { state.lobbyMessage = result.error; renderLobby(); return; }
          state.room = result.room;
          broadcastRoom();
          renderLobby();
        } }));
      } else if (seat.deckId) {
        seatNode.append(el("span", { class: "muted small", text: `Deck selected` }));
      }
      host.append(seatNode);
    }
    host.append(el("div", { class: "sys-row" }, [
      el("button", { type: "button", class: "button primary", text: "Start match", disabled: canStart(room) && state.mySeat === 0 ? undefined : "disabled", onclick: () => {
        const result = startMatch(room, (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
        if (result.error) { state.lobbyMessage = result.error; renderLobby(); return; }
        state.room = result.room;
        broadcastRoom();
        startOnlineFromRoom(result.room);
      } }),
      el("button", { type: "button", class: "button secondary", text: "Copy room code", onclick: async () => {
        try { await navigator.clipboard.writeText(room.code); state.lobbyMessage = "Room code copied."; } catch { state.lobbyMessage = `Room code: ${room.code}`; }
        renderLobby();
      } }),
      el("button", { type: "button", class: "button danger", text: "Leave room", onclick: async () => {
        const next = leaveRoom(room, profile().id);
        if (state.channel) await state.channel.sendRoom(next).catch(() => {});
        await state.channel?.leave().catch(() => {});
        state.channel = null;
        state.room = null;
        state.mySeat = null;
        ctx.endOnlineMatch?.();
        renderLobby();
      } }),
    ]));
    if (!canStart(room)) host.append(el("p", { class: "muted small", text: "The match starts only when both seats are filled, each with a deck selected, and both players are ready. Changing a deck clears readiness." }));
  }

  function render(view) {
    seedStarterIfNeeded();
    if (view === "decks") renderDecks();
    else if (view === "shop") renderShop();
    else if (view === "lobby") renderLobby();
  }

  return { render, renderDecks, renderShop, renderLobby, seedStarterIfNeeded };
}
