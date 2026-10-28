/**
 * Veylattice HUD controller.
 *
 * The DOM never decides legality: every interaction becomes a validated engine
 * command, and only accepted results replace the match state.
 *
 * Seat 1 is the human, Seat 2 is the tactical AI (src/game/ai.js). The AI is
 * driven by the same `applyCommand` path as the human; if the engine rejects a
 * command the state is unchanged and the rejection is surfaced in the log.
 */

import { createCatalog } from "./game/content.js";
import {
  applyCommand,
  canSummon,
  createMatch,
  getLegalActions,
  getLegalAttacks,
  getLegalMoves,
  isOver,
  unitAt,
} from "./game/engine.js";
import { BOARD_SIZE, ELEMENT_LABELS, MAX_UNITS_PER_SEAT } from "./game/constants.js";
import { previewDamage } from "./game/elemental-rules.js";
import {
  AI_ARCHETYPES,
  AI_DIFFICULTIES,
  decideNextCommands,
  resolveArchetype,
  resolveDifficulty,
} from "./game/ai.js";
import {
  createProfile,
  fileToAvatar,
  initialiseProfile,
  persistProfile,
  recordMatchResult,
  resetLocalProfile,
  sanitizeName,
} from "./net/profile.js";

const HUMAN_SEAT = 0;
const AI_SEAT = 1;
const MAX_LOG = 40;

const ELEMENT_ABBR = Object.freeze({
  wood: "WD",
  fire: "FI",
  earth: "EA",
  metal: "ME",
  water: "WA",
});

const ui = {
  catalog: null,
  match: null,
  profile: null,
  sync: { state: "local", message: "Local only" },
  selectedCard: null,
  selectedUnit: null,
  message: "Summon a Vessel into your three starting rows.",
  log: [],
  view: "battle",
  aiBusy: false,
  aiGeneration: 0,
  recorded: false,
  persistTimer: null,
};

/* ------------------------------ helpers ------------------------------ */

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
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function seededRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function coordLabel(x, y) {
  return `${String.fromCharCode(65 + x)}${y + 1}`;
}

function escapeXml(value) {
  return String(value).replace(/[<>&'"]/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

/** Generated placeholder art (never uploaded; it is just an inline SVG). */
function emblemAvatar(seed, label) {
  const palettes = [
    ["#7ad7ff", "#b58bff"],
    ["#ff8551", "#ffd166"],
    ["#6fd08c", "#7ad7ff"],
    ["#b9c6e8", "#8f7bff"],
  ];
  const index = Math.abs([...String(seed)].reduce((a, c) => a + c.charCodeAt(0), 0)) % palettes.length;
  const [a, b] = palettes[index];
  const initial = String(label || "?").trim().charAt(0).toUpperCase() || "?";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>` +
    `<rect width="64" height="64" rx="14" fill="#121627"/>` +
    `<circle cx="32" cy="32" r="24" fill="url(#g)" opacity="0.28"/>` +
    `<text x="32" y="42" font-family="Segoe UI, sans-serif" font-size="26" font-weight="700" ` +
    `fill="#e8ecf8" text-anchor="middle">${escapeXml(initial)}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function avatarFor(profile) {
  return profile?.avatar ?? emblemAvatar(profile?.displayName ?? "You", profile?.displayName ?? "You");
}

function setMessage(text) {
  ui.message = text;
  const node = $("#game-message");
  if (node) node.textContent = text;
}

function humanCanAct() {
  return (
    Boolean(ui.match) &&
    !isOver(ui.match) &&
    ui.match.active === HUMAN_SEAT &&
    !ui.aiBusy &&
    ui.view === "battle"
  );
}

/* ------------------------------ logging ------------------------------ */

function logEvents(events, actor) {
  const entries = [];
  const who = actor ?? "Seat";
  for (const event of events) {
    switch (event.type) {
      case "summon":
        entries.push(`${who} summoned a Vessel for ${event.cost} Flux to ${coordLabel(event.x, event.y)}.`);
        break;
      case "move":
        entries.push(`${who} moved a Vessel to ${coordLabel(event.to.x, event.to.y)}.`);
        break;
      case "attack": {
        const packet = event.attackPacket;
        const retaliation = event.retaliationPacket
          ? ` Retaliation ${event.retaliationPacket.damage} (${event.retaliationPacket.reason}).`
          : " No retaliation.";
        entries.push(
          `${who} attacked for ${packet.damage} (${packet.reason}). ` +
            `Defender Guard ${Math.max(0, event.defenderGuard)}.${retaliation}`,
        );
        break;
      }
      case "defeat":
        entries.push(`${seatLabel(event.seat)} lost a Vessel — it was discarded.`);
        break;
      case "nexusHit":
        entries.push(`${who} struck the Nexus for ${event.damage}. Vitality now ${event.vitality}.`);
        break;
      case "fatigue":
        entries.push(`${seatLabel(event.seat)}'s empty deck dealt ${event.amount} fatigue damage.`);
        break;
      case "mulligan":
        entries.push(`${who} used a mulligan (1 Flux).`);
        break;
      case "turnStart":
        entries.push(
          `Round ${event.turn} — ${event.seat === HUMAN_SEAT ? "your" : "opponent's"} turn begins ` +
            `with ${event.maxFlux} maximum Flux.`,
        );
        break;
      case "turnEnd":
        entries.push(
          event.reason === "timeout"
            ? `${seatLabel(event.seat)}'s turn deadline passed; the turn was passed automatically.`
            : `${seatLabel(event.seat)} ended the turn.`,
        );
        break;
      case "gameOver":
        entries.push("The match is complete.");
        break;
      default:
        break;
    }
  }
  if (entries.length === 0) return;
  for (const text of entries) pushLog(text);
}

function seatLabel(seat) {
  return seat === HUMAN_SEAT ? "You" : "Opponent";
}

function pushLog(text) {
  const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  ui.log.unshift({ text, stamp });
  ui.log = ui.log.slice(0, MAX_LOG);
}

/* ------------------------------ match ------------------------------ */

function currentDifficulty() {
  return resolveDifficulty(ui.profile?.settings?.difficulty);
}

function currentArchetype() {
  return resolveArchetype(ui.profile?.settings?.archetype);
}

function newMatch() {
  ui.aiGeneration += 1;
  ui.aiBusy = false;
  ui.recorded = false;
  const seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
  ui.match = createMatch({
    catalog: ui.catalog,
    rng: seededRng(seed),
    now: Date.now(),
  });
  ui.selectedCard = null;
  ui.selectedUnit = null;
  ui.log = [];
  setMessage(
    `${currentArchetype().label} on ${currentDifficulty().label.toLowerCase()} difficulty. Summon into your three starting rows and advance on the enemy Nexus.`,
  );
  render();
}

function dispatch(command) {
  const now = Date.now();
  const result = applyCommand(ui.match, command, { now });
  if (result.state !== ui.match) ui.match = result.state;
  if (!result.ok) {
    setMessage(result.message);
    render();
    return false;
  }
  logEvents(result.events, "You");
  render();
  return true;
}

function pace() {
  return ui.profile?.settings?.reducedMotion ? 40 : 360;
}

async function runAiTurn() {
  if (!ui.match || isOver(ui.match) || ui.match.active !== AI_SEAT) return;
  const generation = ui.aiGeneration;
  ui.aiBusy = true;
  ui.selectedCard = null;
  ui.selectedUnit = null;
  $("#opponent-status").textContent = "Thinking…";
  $("#opponent-avatar").classList.add("thinking");
  render();

  const difficulty = ui.profile?.settings?.difficulty ?? "standard";
  const archetype = ui.profile?.settings?.archetype ?? "vanguard";
  let safety = 0;

  while (generation === ui.aiGeneration && safety < 80) {
    safety += 1;
    const match = ui.match;
    if (!match || isOver(match) || match.active !== AI_SEAT) break;

    const before = match.version;
    const decision = decideNextCommands(match, AI_SEAT, {
      difficulty,
      archetype,
      rng: Math.random,
      now: () => (typeof performance !== "undefined" ? performance.now() : Date.now()),
    });

    for (const command of decision.commands) {
      const outcome = applyCommand(ui.match, command, { now: Date.now() });
      // A deadline may materialize a timeout even though this command is rejected.
      if (outcome.state !== ui.match) ui.match = outcome.state;
      if (!outcome.ok) {
        pushLog(`Opponent command rejected (${outcome.code}): ${outcome.message}`);
        break;
      }
      logEvents(outcome.events, "Opponent");
      if (isOver(ui.match)) break;
    }

    render();
    if (isOver(ui.match)) break;
    if (ui.match.version === before) break; // nothing changed: never spin
    await sleep(pace());
  }

  if (generation !== ui.aiGeneration) return;
  ui.aiBusy = false;
  $("#opponent-avatar").classList.remove("thinking");
  render();
  if (isOver(ui.match)) onMatchEnd();
}

function onMatchEnd() {
  if (!ui.match || ui.match.phase !== "over" || ui.recorded) return;
  ui.recorded = true;
  const { winnerSeat, reason } = ui.match.result;
  const outcome = winnerSeat === null ? "draw" : winnerSeat === HUMAN_SEAT ? "win" : "loss";
  ui.profile = {
    ...ui.profile,
    stats: recordMatchResult(ui.profile?.stats, outcome),
  };
  renderResult(outcome, reason);
  saveProfile();
}

/* --------------------------- persistence --------------------------- */

function scheduleSave(delay = 500) {
  clearTimeout(ui.persistTimer);
  ui.persistTimer = setTimeout(saveProfile, delay);
}

async function saveProfile() {
  if (!ui.profile) return;
  ui.sync = { state: "saving", message: "Saving…" };
  renderSync();
  const result = await persistProfile(ui.profile);
  ui.profile = result.profile;
  ui.sync = result.sync;
  renderChip();
  renderSync();
}

function renderSync() {
  const node = $("#profile-sync");
  if (node) {
    node.textContent = ui.sync.message;
    node.dataset.state = ui.sync.state;
  }
  const chip = $("#profile-chip-sync");
  if (chip) chip.textContent = ui.sync.message;
}

function renderChip() {
  if (!ui.profile) return;
  $("#profile-chip-avatar").src = avatarFor(ui.profile);
  $("#profile-chip-name").textContent = ui.profile.displayName;
  renderSync();
}

/* -------------------------- interaction -------------------------- */

function onCellClick(x, y) {
  if (!humanCanAct()) {
    if (ui.aiBusy) setMessage("The opponent is still acting.");
    return;
  }
  const occupant = unitAt(ui.match, x, y);

  if (ui.selectedCard) {
    if (canSummon(ui.match, ui.selectedCard, x, y)) {
      if (dispatch({ type: "summon", instanceId: ui.selectedCard, x, y })) {
        ui.selectedCard = null;
        ui.selectedUnit = null;
      }
    } else {
      setMessage(`Illegal summon square ${coordLabel(x, y)}: use an empty cell in your deployment rows.`);
    }
    return;
  }

  if (occupant && occupant.owner === HUMAN_SEAT) {
    ui.selectedUnit = occupant.id;
    ui.selectedCard = null;
    setMessage(
      `${occupant.name}: Attack ${occupant.attack}, Guard ${occupant.guard}/${occupant.maxGuard}, ` +
        `movement ${occupant.movement}, range ${occupant.range}.`,
    );
    render();
    return;
  }

  if (ui.selectedUnit) {
    const unit = ui.match.units[ui.selectedUnit];
    if (!unit) {
      ui.selectedUnit = null;
      render();
      return;
    }
    if (occupant && occupant.owner !== unit.owner) {
      if (dispatch({ type: "attack", unitId: unit.id, targetId: occupant.id })) {
        ui.selectedUnit = null;
      }
      return;
    }
    const legal = getLegalMoves(ui.match, unit.id).some((m) => m.x === x && m.y === y);
    if (legal) {
      if (dispatch({ type: "move", unitId: unit.id, x, y })) {
        ui.selectedUnit = unit.id;
        setMessage(`Moved to ${coordLabel(x, y)}. This Vessel may still attack.`);
      }
      return;
    }
    setMessage("That cell is not a legal destination.");
    return;
  }

  setMessage("Select one of your Vessels first.");
}

function onNexusClick() {
  if (!humanCanAct() || !ui.selectedUnit) {
    if (humanCanAct()) setMessage("Select one of your Vessels on the enemy home row first.");
    return;
  }
  if (dispatch({ type: "attack", unitId: ui.selectedUnit, target: "nexus" })) {
    ui.selectedUnit = null;
  }
}

/* ---------------------------- rendering ---------------------------- */

function renderBoard() {
  const board = $("#board");
  board.replaceChildren();
  const match = ui.match;
  const interact = humanCanAct();
  const attacks = interact && ui.selectedUnit ? getLegalAttacks(match, ui.selectedUnit) : [];
  const attackIds = new Set(attacks.filter((a) => a.type === "unit").map((a) => a.unitId));
  const moves = interact && ui.selectedUnit ? getLegalMoves(match, ui.selectedUnit) : [];
  const moveKeys = new Set(moves.map((m) => `${m.x},${m.y}`));
  const showCoords = ui.profile?.settings?.showCoordinates !== false;

  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      const occupant = unitAt(match, x, y);
      const legalSummon =
        interact && ui.selectedCard ? canSummon(match, ui.selectedCard, x, y) : false;
      const classes = ["cell"];
      if (legalSummon) classes.push("legal");
      if (moveKeys.has(`${x},${y}`)) classes.push("move");
      if (occupant && attackIds.has(occupant.id)) classes.push("attack");
      if (occupant && ui.selectedUnit === occupant.id) classes.push("selected");

      const cell = el("button", {
        type: "button",
        class: classes.join(" "),
        role: "gridcell",
        "aria-label": `${coordLabel(x, y)}${
          occupant
            ? `, ${occupant.name}, Attack ${occupant.attack}, Guard ${occupant.guard} of ${occupant.maxGuard}`
            : ", empty"
        }`,
        onclick: () => onCellClick(x, y),
      });

      if (occupant) {
        const badge = el("span", {
          class: `element-badge ${occupant.element}`,
          text: ELEMENT_ABBR[occupant.element] ?? "??",
        });
        const name = el("strong", { class: "unit-name", text: occupant.name });
        const stats = el("span", {
          class: "unit-stats",
          text: `ATK ${occupant.attack} · GD ${Math.max(0, occupant.guard)}/${occupant.maxGuard}`,
        });
        const flags = [];
        if (!occupant.ready) flags.push("UNREADY");
        else if (!occupant.hasAttacked && !occupant.hasMoved) flags.push("READY");
        const unit = el("span", { class: `unit ${occupant.owner === HUMAN_SEAT ? "friendly" : "enemy"}` }, [
          badge,
          name,
          stats,
          flags.length ? el("span", { class: "unit-flag", text: flags.join(" · ") }) : null,
        ]);
        cell.append(unit);
      } else if (showCoords) {
        cell.append(el("span", { class: "coord", text: coordLabel(x, y) }));
      }
      board.append(cell);
    }
  }
}

function renderHand() {
  const hand = $("#hand");
  hand.replaceChildren();
  const match = ui.match;
  const interactive = humanCanAct();
  // The human's hand is always the one on screen, including during the AI turn.
  const player = match.players[HUMAN_SEAT];
  for (const card of player.hand) {
    const def = match.catalog.get(card.cardId);
    if (!def) continue;
    const affordable = player.flux > 0 && player.flux >= def.cost;
    const button = el("button", {
      type: "button",
      class: `card ${def.element}${ui.selectedCard === card.instanceId ? " selected" : ""}`,
      disabled: interactive ? undefined : "disabled",
      onclick: () => {
        if (!humanCanAct()) return;
        ui.selectedCard = ui.selectedCard === card.instanceId ? null : card.instanceId;
        ui.selectedUnit = null;
        setMessage(
          ui.selectedCard
            ? `${def.name}: ${ELEMENT_LABELS[def.element]} ${def.category}, ${def.cost} Flux. Choose a highlighted cell.`
            : "Selection cleared.",
        );
        render();
      },
    });
    button.append(
      el("span", { class: "cost" + (affordable ? "" : " unaffordable"), text: String(def.cost) }),
      el("span", { class: "card-element", text: ELEMENT_LABELS[def.element] ?? def.element }),
      el("h3", { text: def.name }),
      el("p", { class: "card-role", text: def.role ?? def.category }),
      el("div", { class: "card-stats" }, [
        el("span", { text: `ATK ${def.attack ?? "—"}` }),
        el("span", { text: `GD ${def.guard ?? "—"}` }),
        el("span", { text: `MV ${def.movement ?? "—"}` }),
        el("span", { text: `RG ${def.range ?? "—"}` }),
      ]),
      el("p", { class: "card-flavor", text: def.flavorText ?? "" }),
    );
    hand.append(button);
  }
  $("#hand-count").textContent = String(player.hand.length);
  $("#deck-count-hand").textContent = String(player.deck.length);
}

function renderSelectedPanel() {
  const panel = $("#selected-card");
  panel.replaceChildren();
  panel.className = "selected-card";
  const match = ui.match;

  if (ui.selectedCard) {
    const card = match.players[HUMAN_SEAT].hand.find((c) => c.instanceId === ui.selectedCard);
    const def = card ? match.catalog.get(card.cardId) : null;
    if (def) {
      panel.append(
        el("h4", { text: def.name }),
        el("p", {
          class: "muted",
          text: `${ELEMENT_LABELS[def.element]} · ${def.subtypes?.join(", ") ?? def.category} · Cost ${def.cost}`,
        }),
        el("p", {
          text: `Attack ${def.attack ?? "—"} · Guard ${def.guard ?? "—"} · Movement ${def.movement ?? "—"} · Range ${def.range ?? "—"}`,
        }),
        el("p", { class: "card-flavor", text: def.flavorText ?? "" }),
      );
      return;
    }
  }

  if (ui.selectedUnit) {
    const unit = match.units[ui.selectedUnit];
    if (unit) {
      panel.append(
        el("h4", { text: unit.name }),
        el("p", {
          class: "muted",
          text: `${ELEMENT_LABELS[unit.element]} · ${unit.subtype ?? "vessel"} · Guard ${Math.max(0, unit.guard)} of ${unit.maxGuard}`,
        }),
        el("p", {
          text: `${unit.ready ? "Ready" : "Unready"} · ${unit.hasMoved ? "Moved" : "Can move"} · ${unit.hasAttacked ? "Attacked" : "Can attack"}`,
        }),
        el("p", { class: "muted", text: `Movement ${unit.movement} · Range ${unit.range}` }),
      );
      const attacks = humanCanAct() ? getLegalAttacks(match, unit.id) : [];
      const targets = Object.values(match.units).filter((u) => attacks.some((a) => a.unitId === u.id));
      if (targets.length > 0) {
        const preview = targets
          .map((target) => {
            const p = previewDamage(unit.attack, unit.element, target.element);
            return `${target.name} takes ${p.damage}${p.relation === "neutral" ? "" : ` (${p.relation})`}`;
          })
          .join("; ");
        panel.append(el("p", { class: "preview", text: preview }));
      } else if (attacks.some((a) => a.type === "nexus")) {
        panel.append(el("p", { class: "preview", text: `Nexus hit for ${unit.attack}.` }));
      }
      return;
    }
  }

  panel.classList.add("empty");
  panel.textContent = "Select a card or a Vessel.";
}

function renderTimer() {
  const match = ui.match;
  const timer = $("#timer");
  if (!match || match.deadlineAt === null) {
    timer.textContent = "—";
    timer.classList.remove("danger");
    return;
  }
  const remaining = Math.max(0, match.deadlineAt - Date.now());
  const seconds = Math.ceil(remaining / 1000);
  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, "0");
  timer.textContent = `${mm}:${ss}`;
  timer.classList.toggle("danger", remaining <= 20_000);
  timer.setAttribute("aria-label", `${seconds} seconds remaining in this turn`);
}

function renderOpponent() {
  const match = ui.match;
  const archetype = currentArchetype();
  const difficulty = currentDifficulty();
  $("#opponent-avatar").src = emblemAvatar(archetype.id, archetype.label);
  $("#opponent-name").textContent = `The ${archetype.label}`;
  const aiPlayer = match.players[AI_SEAT];
  $("#opponent-style").textContent =
    `${difficulty.label} difficulty · ${archetype.description} · ${aiPlayer.flux} Flux · ` +
    `${aiPlayer.hand.length} cards · ${Object.values(match.units).filter((u) => u.owner === AI_SEAT).length} Vessels`;
  $("#opponent-difficulty").textContent = difficulty.label.toUpperCase();
  if (!ui.aiBusy) $("#opponent-status").textContent = match.active === AI_SEAT ? "Ready" : "Waiting";
}

function renderLog() {
  const list = $("#log-list");
  list.replaceChildren();
  if (ui.log.length === 0) {
    list.append(el("li", { class: "muted", text: "No events yet." }));
    return;
  }
  for (const entry of ui.log) {
    list.append(el("li", {}, [el("span", { class: "log-time", text: entry.stamp }), el("span", { text: entry.text })]));
  }
}

function render() {
  const match = ui.match;
  if (!match) return;
  renderBoard();
  renderHand();
  renderSelectedPanel();
  renderTimer();
  renderOpponent();
  renderLog();

  const human = match.players[HUMAN_SEAT];
  $("#player-vitality").textContent = String(human.vitality);
  $("#enemy-vitality").textContent = String(match.players[AI_SEAT].vitality);
  $("#turn-number").textContent = String(match.turn);
  $("#turn-owner").textContent =
    match.phase === "over"
      ? "Match complete"
      : match.active === HUMAN_SEAT
        ? "Your turn"
        : "Opponent's turn";

  $("#flux-count").textContent = `${human.flux} / ${human.maxFlux}`;
  const track = $("#flux-track");
  track.replaceChildren();
  for (let i = 0; i < 10; i += 1) {
    track.append(el("span", { class: `flux-orb${i < human.flux ? " active" : ""}` }));
  }
  $("#deck-count").textContent = String(human.deck.length);
  $("#discard-count").textContent = String(human.discard.length);
  const unitCount = Object.values(match.units).filter((u) => u.owner === HUMAN_SEAT).length;
  $("#unit-count").textContent = `${unitCount} / ${MAX_UNITS_PER_SEAT}`;

  const actions = getLegalActions(match);
  const canAct = humanCanAct();
  $("#mulligan-btn").disabled =
    !canAct || !ui.selectedCard || !actions.canMulligan || match.active !== HUMAN_SEAT;
  $("#end-turn-btn").disabled = !canAct;

  const nexus = $("#enemy-nexus");
  const canStrike =
    canAct && ui.selectedUnit
      ? getLegalAttacks(match, ui.selectedUnit).some((a) => a.type === "nexus")
      : false;
  nexus.classList.toggle("ready", canStrike);

  renderChip();
}

function renderResult(outcome, reason) {
  const overlay = $("#result-overlay");
  overlay.hidden = false;
  $("#result-title").textContent =
    outcome === "win" ? "Victory" : outcome === "loss" ? "Defeat" : "Draw";
  const reasons = {
    vitality: "A Nexus reached zero Vitality.",
    simultaneous: "Both Nexuses were destroyed at once.",
    surrender: "A seat surrendered.",
    fatigue: "The deck ran out and fatigue finished the match.",
    timeout: "The match ended on a turn deadline.",
  };
  $("#result-reason").textContent = reasons[reason] ?? reason ?? "";
  const stats = ui.profile?.stats ?? { wins: 0, losses: 0, draws: 0, currentStreak: 0 };
  $("#result-record").textContent = `${stats.wins}–${stats.losses}${stats.draws ? `–${stats.draws}` : ""}`;
  $("#result-streak").textContent = String(stats.currentStreak);
}

/* --------------------------- profile view --------------------------- */

function renderProfileForm() {
  const profile = ui.profile;
  if (!profile) return;
  $("#profile-avatar").src = avatarFor(profile);
  $("#profile-chip-avatar").src = avatarFor(profile);
  $("#profile-chip-name").textContent = profile.displayName;
  $("#profile-name").value = profile.displayName;
  $("#profile-name-count").textContent = String(profile.displayName.length);
  $("#profile-id").value = profile.id;

  const difficultySelect = $("#settings-difficulty");
  difficultySelect.replaceChildren(
    ...Object.values(AI_DIFFICULTIES).map((d) =>
      el("option", { value: d.id, text: d.label, selected: d.id === profile.settings.difficulty ? "selected" : undefined }),
    ),
  );
  const archetypeSelect = $("#settings-archetype");
  archetypeSelect.replaceChildren(
    ...Object.values(AI_ARCHETYPES).map((a) =>
      el("option", { value: a.id, text: `The ${a.label}`, selected: a.id === profile.settings.archetype ? "selected" : undefined }),
    ),
  );
  $("#difficulty-help").textContent = resolveDifficulty(profile.settings.difficulty).description;
  $("#archetype-help").textContent = resolveArchetype(profile.settings.archetype).description;
  $("#settings-motion").checked = profile.settings.reducedMotion === true;
  $("#settings-coords").checked = profile.settings.showCoordinates !== false;

  const stats = profile.stats;
  $("#stat-games").textContent = String(stats.games);
  $("#stat-wins").textContent = String(stats.wins);
  $("#stat-losses").textContent = String(stats.losses);
  $("#stat-draws").textContent = String(stats.draws);
  $("#stat-streak").textContent = String(stats.currentStreak);
  $("#stat-best").textContent = String(stats.bestStreak);
  $("#stat-last").textContent = stats.lastPlayedAt
    ? `Last match recorded ${new Date(stats.lastPlayedAt).toLocaleString()}.`
    : "No matches recorded yet.";
  renderSync();
}

function updateSettings(patch) {
  ui.profile = { ...ui.profile, settings: { ...ui.profile.settings, ...patch } };
  renderProfileForm();
  scheduleSave();
  render();
}

function showView(view) {
  ui.view = view;
  const battle = view === "battle";
  $("#view-battle").hidden = !battle;
  $("#view-profile").hidden = battle;
  $("#tab-battle").classList.toggle("active", battle);
  $("#tab-profile").classList.toggle("active", !battle);
  $("#tab-battle").setAttribute("aria-selected", String(battle));
  $("#tab-profile").setAttribute("aria-selected", String(!battle));
  if (battle) render();
  else renderProfileForm();
}

/* ------------------------------ wiring ------------------------------ */

function bind() {
  $("#tab-battle").addEventListener("click", () => showView("battle"));
  $("#tab-profile").addEventListener("click", () => showView("profile"));
  $("#profile-chip").addEventListener("click", () => showView("profile"));

  $("#restart-btn").addEventListener("click", () => {
    newMatch();
    if (ui.match.active === AI_SEAT) runAiTurn();
  });
  $("#result-restart").addEventListener("click", () => {
    $("#result-overlay").hidden = true;
    newMatch();
  });
  $("#result-profile").addEventListener("click", () => {
    $("#result-overlay").hidden = true;
    showView("profile");
  });

  $("#end-turn-btn").addEventListener("click", () => {
    if (!humanCanAct()) return;
    if (dispatch({ type: "endTurn" })) {
      ui.selectedCard = null;
      ui.selectedUnit = null;
      render();
      runAiTurn();
    }
  });
  $("#mulligan-btn").addEventListener("click", () => {
    if (!humanCanAct() || !ui.selectedCard) return;
    if (dispatch({ type: "mulligan", instanceId: ui.selectedCard })) {
      ui.selectedCard = null;
      ui.selectedUnit = null;
      render();
    }
  });
  $("#enemy-nexus").addEventListener("click", onNexusClick);
  $("#player-nexus").addEventListener("click", () => {
    setMessage("Your Nexus is the objective the opponent must reach. It never retaliates.");
  });
  $("#log-clear").addEventListener("click", () => {
    ui.log = [];
    renderLog();
  });

  // ---- profile controls ----
  $("#profile-name").addEventListener("input", (event) => {
    const value = event.target.value.slice(0, 24);
    $("#profile-name-count").textContent = String(value.length);
    ui.profile = { ...ui.profile, displayName: sanitizeName(value) };
    $("#profile-chip-name").textContent = ui.profile.displayName;
    $("#profile-avatar").src = avatarFor(ui.profile);
    $("#profile-chip-avatar").src = avatarFor(ui.profile);
    scheduleSave(700);
  });
  $("#profile-name").addEventListener("blur", (event) => {
    const clean = sanitizeName(event.target.value);
    event.target.value = clean;
    ui.profile = { ...ui.profile, displayName: clean };
    renderProfileForm();
    saveProfile();
  });

  $("#avatar-input").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const status = $("#avatar-status");
    status.textContent = "Processing image…";
    try {
      const avatar = await fileToAvatar(file);
      ui.profile = { ...ui.profile, avatar };
      renderProfileForm();
      status.textContent = `Avatar updated (${Math.round(avatar.length / 1024)} KB).`;
      await saveProfile();
    } catch (error) {
      status.textContent = error.message;
    }
  });
  $("#avatar-clear").addEventListener("click", async () => {
    ui.profile = { ...ui.profile, avatar: null };
    renderProfileForm();
    $("#avatar-status").textContent = "Avatar removed.";
    await saveProfile();
  });

  $("#settings-difficulty").addEventListener("change", (event) =>
    updateSettings({ difficulty: event.target.value }),
  );
  $("#settings-archetype").addEventListener("change", (event) =>
    updateSettings({ archetype: event.target.value }),
  );
  $("#settings-motion").addEventListener("change", (event) =>
    updateSettings({ reducedMotion: event.target.checked }),
  );
  $("#settings-coords").addEventListener("change", (event) =>
    updateSettings({ showCoordinates: event.target.checked }),
  );

  $("#profile-save").addEventListener("click", () => saveProfile());
  $("#profile-copy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(ui.profile.id);
      $("#profile-reset-status").textContent = "Profile id copied.";
    } catch {
      $("#profile-reset-status").textContent = "Copy failed — select the field and copy manually.";
    }
  });
  $("#profile-reset").addEventListener("click", async () => {
    const confirmed = window.confirm(
      "Forget this device's profile? Your cloud row stays where it is, but this browser will start a new identity and your stats here will no longer be linked.",
    );
    if (!confirmed) return;
    resetLocalProfile();
    ui.profile = createProfile();
    renderProfileForm();
    await saveProfile();
    $("#profile-reset-status").textContent = "New local profile created and synced.";
  });

  setInterval(() => {
    if (!ui.match) return;
    renderTimer();
    if (isOver(ui.match) || ui.match.deadlineAt === null || ui.aiBusy) return;
    if (Date.now() < ui.match.deadlineAt) return;
    const result = applyCommand(ui.match, { type: "timeout" }, { now: Date.now() });
    if (result.state !== ui.match) ui.match = result.state;
    logEvents(result.events, "Deadline");
    render();
    if (isOver(ui.match)) {
      onMatchEnd();
      return;
    }
    if (ui.match.active === AI_SEAT) runAiTurn();
  }, 250);
}

/* ------------------------------- boot ------------------------------- */

async function boot() {
  bind();
  try {
    const response = await fetch("./src/cards/starter-set.json");
    if (!response.ok) throw new Error(`Card data request failed (${response.status}).`);
    const cards = await response.json();
    ui.catalog = createCatalog(cards);
  } catch (error) {
    console.error(error);
    setMessage(
      "Could not load card data. Serve this folder over HTTP (for example: python -m http.server 8000).",
    );
    return;
  }

  const initial = await initialiseProfile();
  ui.profile = initial.profile;
  ui.sync = initial.sync;
  renderChip();
  renderProfileForm();
  newMatch();
  if (ui.match.active === AI_SEAT) runAiTurn();
}

boot();
