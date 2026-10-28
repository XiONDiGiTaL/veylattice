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
import {
  BOARD_SIZE,
  ELEMENT_LABELS,
  MAX_RELICS_PER_SEAT,
  MAX_UNITS_PER_SEAT,
} from "./game/constants.js";
import { previewDamage } from "./game/elemental-rules.js";
import {
  AI_ARCHETYPES,
  AI_DIFFICULTIES,
  decideNextCommands,
  resolveArchetype,
  resolveDifficulty,
} from "./game/ai.js";
import {
  accountStatus,
  createAccountForProfile,
  createProfile,
  fileToAvatar,
  initialiseProfile,
  persistProfile,
  recordMatchResult,
  resetLocalProfile,
  sanitizeName,
  signInToAccount,
  signOutOfAccount,
} from "./net/profile.js";
import { formatCode, normaliseCode, readSession, rotateRecoveryCode } from "./net/account.js";
import { modelFor } from "./render/models.js";
import { buildPlaceholderModel, buildVoxelModel } from "./render/voxel.js";
import { ARENA, propsAt, terrainAt } from "./render/terrain.js";
import {
  TUTORIAL_STEPS,
  advanceTutorial,
  createTutorial,
  skipTutorial,
  tutorialStep,
} from "./ui/tutorial.js";

const GUIDE_SEEN_KEY = "veylattice.guide.seen.v1";

function tutorialSeen() {
  try {
    return localStorage.getItem(GUIDE_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markGuideSeen() {
  try {
    localStorage.setItem(GUIDE_SEEN_KEY, "1");
  } catch {
    /* storage can be disabled; the guide still works */
  }
}

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
  view: "menu",
  tutorial: null,
  tutorialMode: false,
  aiBusy: false,
  aiGeneration: 0,
  recorded: false,
  persistTimer: null,
  accountBusy: false,
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

/* ------------------------- card description ------------------------- */

/** One line of plain English for a typed effect. Display only. */
function effectSummary(def) {
  const effect = def?.effect;
  if (!effect) return def?.flavorText ?? "";
  switch (effect.kind) {
    case "damage":
      return `Deal ${effect.amount} damage, resolved elementally.`;
    case "damageAll":
      return `Deal ${effect.amount} damage to every enemy Vessel.`;
    case "heal":
      return `Restore ${effect.amount} Guard to a Vessel you control.`;
    case "buff":
      return `Grant +${effect.attack ?? 0} Attack and +${effect.guard ?? 0} Guard permanently.`;
    case "draw":
      return `Draw ${effect.amount} card${effect.amount === 1 ? "" : "s"}.`;
    case "nexusDamage":
      return `Deal ${effect.amount} damage to the enemy Nexus.`;
    case "attackAura":
      return `Relic · your Vessels' attacks deal +${effect.amount}.`;
    case "armorAura":
      return `Relic · your Nexus takes ${effect.amount} less damage.`;
    case "mendAura":
      return `Relic · at the start of your turn, heal ${effect.amount} Guard.`;
    case "guardAura":
      return `Relic · your Vessels have +${effect.amount} Guard.`;
    default:
      return def.flavorText ?? "";
  }
}

function categoryLabel(def) {
  if (def.category === "action") return "Action";
  if (def.category === "relic") return "Relic";
  return "Vessel";
}

/**
 * Resolve the selected hand card into what the UI and the engine agree on.
 * Legality comes from the engine's own enumeration, never from the DOM.
 */
function selectedCardEntry() {
  if (!ui.match || !ui.selectedCard) return null;
  const card = ui.match.players[HUMAN_SEAT].hand.find((c) => c.instanceId === ui.selectedCard);
  if (!card) return null;
  const def = ui.match.catalog.get(card.cardId);
  if (!def) return null;
  const legal = getLegalActions(ui.match);

  if (def.category === "action") {
    const entry = legal.actions.find((a) => a.instanceId === ui.selectedCard);
    return {
      ...def,
      instanceId: ui.selectedCard,
      playable: Boolean(entry),
      targeting: entry?.targeting ?? def.targeting,
      targetIds: entry?.targetIds ?? [],
    };
  }
  if (def.category === "relic") {
    const entry = legal.relics.find((a) => a.instanceId === ui.selectedCard);
    return { ...def, instanceId: ui.selectedCard, playable: Boolean(entry), targeting: "none", targetIds: [] };
  }
  return { ...def, instanceId: ui.selectedCard, playable: true, targeting: "none", targetIds: [] };
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
      case "playAction": {
        const where = event.targetId ? ` on a Vessel at ${coordLabel(event.x, event.y)}` : "";
        entries.push(`${who} cast ${event.name} for ${event.cost} Flux${where}.`);
        break;
      }
      case "playRelic":
        entries.push(`${who} set ${event.name} for ${event.cost} Flux.`);
        break;
      case "actionDamage": {
        const packets = event.packets ?? [];
        const total = packets.reduce((sum, p) => sum + p.packet.damage, 0);
        const spread = packets.length > 1 ? ` across ${packets.length} Vessels` : "";
        entries.push(`${who}'s ${cardName(event.cardId)} dealt ${total} damage${spread}.`);
        break;
      }
      case "actionHeal":
        entries.push(`${who}'s ${cardName(event.cardId)} restored ${event.healed} Guard.`);
        break;
      case "actionBuff":
        entries.push(
          `${who}'s ${cardName(event.cardId)} empowered a Vessel (Attack ${event.attack}, Guard ${event.guard}/${event.guardMax}).`,
        );
        break;
      case "relicMend":
        entries.push(`${seatLabel(event.seat)}'s Relic restored ${event.healed} Guard at the start of the turn.`);
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

function cardName(cardId) {
  return ui.match?.catalog?.get(cardId)?.name ?? "a card";
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

function newMatch(options = {}) {
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
  $('#result-overlay').hidden = true;
  ui.tutorialMode = options.guided === true;
  ui.tutorial = ui.tutorialMode ? createTutorial() : null;
  if (ui.tutorialMode) {
    setMessage("Guided match: follow the checklist above the battlefield.");
  } else {
    setMessage(
      `${currentArchetype().label} on ${currentDifficulty().label.toLowerCase()} difficulty. Summon into your three home rows, then advance on the enemy Nexus.`,
    );
  }
  render();
  showView("battle");
  if (ui.match.active === AI_SEAT) runAiTurn();
}

function dispatch(command) {
  const now = Date.now();
  // Snapshot positions and Guard values before the command so the presentation
  // layer can animate a hit that the new state no longer describes.
  const before = snapshotUnits(ui.match);
  const result = applyCommand(ui.match, command, { now });
  if (result.state !== ui.match) ui.match = result.state;
  if (!result.ok) {
    setMessage(result.message);
    render();
    return false;
  }
  logEvents(result.events, "You");
  // The tutorial only watches events the engine already accepted. The engine
  // calls a passed turn `turnEnd`; the guide speaks of it as ending the turn.
  for (const event of result.events) {
    if (ui.tutorial && !ui.tutorial.done) {
      const tutorialEvent = event.type === "turnEnd" ? "endTurn" : event.type;
      ui.tutorial = advanceTutorial(ui.tutorial, tutorialEvent);
    }
  }
  render();
  playEvents(result.events, before);
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

    // One frame per command so a move-then-attack plan animates from the cell
    // the Vessel actually moved to, not from its final position in this state.
    const frames = [];
    for (const command of decision.commands) {
      const frame = snapshotUnits(ui.match);
      const outcome = applyCommand(ui.match, command, { now: Date.now() });
      // A deadline may materialize a timeout even though this command is rejected.
      if (outcome.state !== ui.match) ui.match = outcome.state;
      if (!outcome.ok) {
        pushLog(`Opponent command rejected (${outcome.code}): ${outcome.message}`);
        break;
      }
      logEvents(outcome.events, "Opponent");
      frames.push({ events: outcome.events, before: frame });
      if (isOver(ui.match)) break;
    }

    render();
    for (const frame of frames) {
      if (generation !== ui.aiGeneration) break;
      await playEvents(frame.events, frame.before);
    }
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
    const entry = selectedCardEntry();
    if (!entry) {
      ui.selectedCard = null;
      render();
      return;
    }

    if (entry.category === "action") {
      if (entry.targeting === "none") {
        setMessage(`${entry.name} needs no target — press Play selected card.`);
        return;
      }
      if (occupant && entry.targetIds.includes(occupant.id)) {
        if (dispatch({ type: "playAction", instanceId: entry.instanceId, targetId: occupant.id })) {
          ui.selectedCard = null;
          ui.selectedUnit = null;
        }
        return;
      }
      setMessage(`Choose a highlighted target for ${entry.name}.`);
      return;
    }

    if (entry.category === "relic") {
      setMessage(`${entry.name} is a Relic — press Play selected card to set it.`);
      return;
    }

    if (canSummon(ui.match, ui.selectedCard, x, y)) {
      if (dispatch({ type: "summon", instanceId: ui.selectedCard, x, y })) {
        ui.selectedCard = null;
        ui.selectedUnit = null;
        setMessage(`${entry.name} deployed to ${coordLabel(x, y)} — it acts from your next turn.`);
        render();
      }
    } else {
      setMessage(summonBlockReason(entry, x, y));
      render();
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
        setMessage(`${unit.name} struck ${occupant.name} at ${coordLabel(x, y)}.`);
        render();
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

function playSelectedCard() {
  if (!humanCanAct()) return;
  const entry = selectedCardEntry();
  if (!entry) {
    setMessage("Select a card in your hand first.");
    return;
  }
  if (entry.category === "vessel") {
    setMessage(vesselSelectionMessage(entry, entry.instanceId));
    return;
  }
  if (!entry.playable) {
    setMessage(`${entry.name} cannot be played right now (Flux, targets or Relic limit).`);
    return;
  }
  if (entry.category === "action") {
    if (entry.targeting !== "none") {
      setMessage(`Choose a highlighted target for ${entry.name}.`);
      return;
    }    if (dispatch({ type: "playAction", instanceId: entry.instanceId })) {
      ui.selectedCard = null;
      ui.selectedUnit = null;
      setMessage(`${entry.name} resolved and went to the discard pile.`);
      render();
    }
    return;
  }
  if (dispatch({ type: "playRelic", instanceId: entry.instanceId })) {
    ui.selectedCard = null;
    ui.selectedUnit = null;
    setMessage(`${entry.name} is set in your back row.`);
    render();
  }
}

/**
 * Tell the player where a Vessel can go, or exactly why it cannot be summoned yet.
 * The count comes from the engine's own enumeration, so the message can never
 * promise a tile the engine would reject.
 */
function vesselSelectionMessage(def, instanceId) {
  const match = ui.match;
  const player = match.players[HUMAN_SEAT];
  const summon = getLegalActions(match).summons.find((s) => s.instanceId === instanceId);
  const cells = summon?.cells.length ?? 0;
  if (cells > 0) {
    return `${def.name}: ${ELEMENT_LABELS[def.element]} Vessel, ${def.cost} Flux. ${cells} legal tiles are highlighted.`;
  }
  if (player.summonUsed >= 1) {
    return `${def.name}: you have already summoned this turn. End the turn to summon again.`;
  }
  const count = Object.values(match.units).filter((u) => u.owner === HUMAN_SEAT).length;
  if (count >= MAX_UNITS_PER_SEAT) {
    return `${def.name}: you already control ${MAX_UNITS_PER_SEAT} Vessels — the maximum.`;
  }
  if (player.flux < def.cost) {
    return `${def.name} costs ${def.cost} Flux and you have ${player.flux}. End the turn to gain Flux.`;
  }
  return `${def.name}: no legal summon tile right now.`;
}

/** Explain *why* a summon failed using the rule that rejected it. */
function summonBlockReason(card, x, y) {
  const match = ui.match;
  const player = match.players[HUMAN_SEAT];
  if (unitAt(match, x, y)) return `${coordLabel(x, y)} already holds a Vessel.`;
  if (y < BOARD_SIZE - 3) {
    return `${coordLabel(x, y)} is outside your deployment zone — summon inside your three home rows.`;
  }
  if (player.summonUsed >= 1) return "You have already summoned this turn. End the turn to summon again.";
  const count = Object.values(match.units).filter((u) => u.owner === HUMAN_SEAT).length;
  if (count >= MAX_UNITS_PER_SEAT) return `You already control ${MAX_UNITS_PER_SEAT} Vessels — the maximum.`;
  if (player.flux < (card?.cost ?? 0)) {
    return `${card?.name ?? "That card"} costs ${card?.cost ?? 0} Flux and you have ${player.flux}.`;
  }
  return `${coordLabel(x, y)} is not a legal summon tile.`;
}

function cancelSelection() {
  if (!ui.selectedCard && !ui.selectedUnit) return;
  ui.selectedCard = null;
  ui.selectedUnit = null;
  setMessage("Selection cleared.");
  render();
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

/* --------------------------- presentation --------------------------- */

/**
 * Combat presentation.
 *
 * The engine is the only authority on what happened; this layer reads the
 * events it emitted and animates the result. Nothing here can change state,
 * and every effect is skipped under reduced-motion settings.
 */

function fxEnabled() {
  if (ui.profile?.settings?.reducedMotion) return false;
  if (typeof matchMedia !== "function") return true;
  return !matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function snapshotUnits(state) {
  if (!state) return {};
  return Object.fromEntries(
    Object.values(state.units).map((unit) => [
      unit.id,
      {
        name: unit.name,
        x: unit.x,
        y: unit.y,
        guard: unit.guard,
        maxGuard: unit.maxGuard,
      },
    ]),
  );
}

function cellAt(x, y) {
  if (!Number.isInteger(x) || !Number.isInteger(y)) return null;
  return document.querySelectorAll("#board .cell")[y * BOARD_SIZE + x] ?? null;
}

function pulse(node, className, ms) {
  if (!node) return;
  node.classList.add(className);
  setTimeout(() => node.classList.remove(className), ms);
}

function floatText(host, text, className = "") {
  if (!host) return;
  const node = el("span", { class: `dmg-float ${className}`.trim(), text });
  host.append(node);
  setTimeout(() => node.remove(), 900);
}

/** Count a Guard number down instead of swapping it instantly. */
function tickGuard(unitId, from, to) {
  const unit = ui.match?.units?.[unitId];
  const cell = unit ? cellAt(unit.x, unit.y) : null;
  const node = cell?.querySelector(".unit-stats .gd");
  if (!node || from === to) return;
  const target = Math.max(0, to);
  const started = performance.now();
  const render = (now) => {
    const t = Math.min(1, (now - started) / 280);
    const value = Math.round(from + (target - from) * t);
    node.textContent = `${value}/${unit.maxGuard}`;
    if (t < 1) requestAnimationFrame(render);
  };
  requestAnimationFrame(render);
  pulse(cell, "fx-hit", 320);
}

async function playEvents(events, before) {
  if (!fxEnabled() || !Array.isArray(events)) return;
  const known = before ?? {};

  for (const event of events) {
    switch (event.type) {
      case "summon": {
        const cell = cellAt(event.x, event.y);
        pulse(cell, "fx-spawn", 320);
        break;
      }
      case "move": {
        pulse(cellAt(event.to.x, event.to.y), "fx-step", 260);
        break;
      }
      case "playRelic": {
        pulse($("#back-row"), "fx-buff", 520);
        break;
      }
      case "attack": {
        const a = known[event.attackerId];
        const d = known[event.defenderId];
        if (!a || !d) break;
        const attackerCell = cellAt(a.x, a.y);
        const defenderCell = cellAt(d.x, d.y);
        if (attackerCell) {
          attackerCell.style.setProperty("--fx-dx", `${(d.x - a.x) * 26}px`);
          attackerCell.style.setProperty("--fx-dy", `${(d.y - a.y) * 26}px`);
          pulse(attackerCell, "fx-lunge", 400);
        }
        await sleep(120);
        pulse(defenderCell, "fx-hit", 420);
        floatText(
          defenderCell,
          `-${event.attackPacket.damage}`,
          event.attackPacket.relation === "advantage" ? "advantage" : "",
        );
        tickGuard(event.defenderId, d.guard, event.defenderGuard);
        await sleep(190);

        if (event.retaliationPacket) {
          pulse(attackerCell, "fx-hit", 380);
          floatText(attackerCell, `-${event.retaliationPacket.damage}`, "retaliation");
          tickGuard(event.attackerId, a.guard, event.attackerGuard);
          await sleep(170);
        }
        break;
      }
      case "actionDamage": {
        for (const hit of event.packets ?? []) {
          const unit = known[hit.unitId];
          if (!unit) continue;
          const cell = cellAt(unit.x, unit.y);
          pulse(cell, "fx-cast-hit", 460);
          floatText(cell, `-${hit.packet.damage}`, hit.packet.relation === "advantage" ? "advantage" : "");
          tickGuard(hit.unitId, unit.guard, hit.guardAfter);
        }
        await sleep(240);
        break;
      }
      case "actionHeal":
      case "relicMend": {
        const unit = known[event.unitId];
        if (!unit) break;
        const cell = cellAt(unit.x, unit.y);
        pulse(cell, "fx-heal", 520);
        floatText(cell, `+${event.healed}`, "heal");
        await sleep(140);
        break;
      }
      case "actionBuff": {
        const unit = known[event.unitId];
        if (!unit) break;
        const cell = cellAt(unit.x, unit.y);
        pulse(cell, "fx-buff", 520);
        await sleep(120);
        break;
      }
      case "nexusHit": {
        const nexus = event.seat === HUMAN_SEAT ? $("#enemy-nexus") : $("#player-nexus");
        pulse($("#board"), "fx-shake", 460);
        pulse(nexus, "fx-nexus-hit", 560);
        floatText(nexus, `-${event.damage}`, "nexus");
        await sleep(200);
        break;
      }
      case "defeat": {
        const unit = known[event.unitId];
        if (!unit) break;
        const cell = cellAt(unit.x, unit.y);
        if (!cell) break;
        // The unit is already gone from state, so show a ghost chip crumbling.
        const ghost = el("span", { class: "unit enemy fx-ghost" }, [
          el("strong", { class: "unit-name", text: unit.name }),
          el("span", { class: "unit-stats", text: `GD 0/${unit.maxGuard}` }),
        ]);
        cell.append(ghost);
        setTimeout(() => ghost.remove(), 520);
        await sleep(150);
        break;
      }
      default:
        break;
    }
  }
}

/* ---------------------------- rendering ---------------------------- */

function renderBoard() {
  const board = $("#board");
  board.replaceChildren();
  const match = ui.match;
  if (!match) return;
  const interact = humanCanAct();
  const attacks = interact && ui.selectedUnit ? getLegalAttacks(match, ui.selectedUnit) : [];
  const attackIds = new Set(attacks.filter((a) => a.type === "unit").map((a) => a.unitId));
  const moves = interact && ui.selectedUnit ? getLegalMoves(match, ui.selectedUnit) : [];
  const moveKeys = new Set(moves.map((m) => `${m.x},${m.y}`));
  const showCoords = ui.profile?.settings?.showCoordinates !== false;

  // A selected Action highlights the only cells the engine would accept.
  const card = interact && ui.selectedCard ? selectedCardEntry() : null;
  const summonCard = card?.category === "vessel" ? card : null;
  const targetKeys = new Set();
  if (card?.category === "action" && card.targeting !== "none") {
    for (const id of card.targetIds) {
      const unit = match.units[id];
      if (unit) targetKeys.add(`${unit.x},${unit.y}`);
    }
  }

  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      const occupant = unitAt(match, x, y);
      const legalSummon = summonCard ? canSummon(match, summonCard.instanceId, x, y) : false;
      const zone = y <= 2 ? "zone-opponent" : y <= 3 ? "zone-contested" : "zone-home";
      const classes = ["cell", zone];
      if (legalSummon) classes.push("legal");
      else if (summonCard && !occupant && y > BOARD_SIZE - 4) classes.push("deploy-blocked");
      if (moveKeys.has(`${x},${y}`)) classes.push("move");
      if (occupant && attackIds.has(occupant.id)) classes.push("attack");
      if (targetKeys.has(`${x},${y}`)) classes.push("target");
      if (occupant && ui.selectedUnit === occupant.id) classes.push("selected");

      const cell = el("button", {
        type: "button",
        class: classes.join(" "),
        role: "gridcell",
        "aria-label": `${coordLabel(x, y)}${
          occupant
            ? `, ${occupant.name}, Attack ${occupant.attack}, Guard ${Math.max(0, occupant.guard)} of ${occupant.maxGuard}`
            : ", empty"
        }${legalSummon ? ", legal summon tile" : ""}`,
        onclick: () => onCellClick(x, y),
      });

      // Decorative ground and props. They are painted behind the unit and never
      // affect legality: `terrain.js` is not imported by the rules engine.
      const terrain = terrainAt(x, y);
      cell.dataset.terrain = terrain.id;
      cell.style.setProperty("--lift", `${terrain.lift}px`);
      cell.append(el("span", { class: "cell-ground", "aria-hidden": "true" }));
      for (const prop of propsAt(x, y)) {
        const propNode = buildVoxelModel(
          { ...prop.model, id: `${prop.model.id}_${x}_${y}`, scale: (prop.model.scale ?? 1) * prop.scale },
          { className: "cell-prop-model", label: "" },
        );
        const holder = el("span", {
          class: `cell-prop ${prop.kind}${prop.flip ? " is-flipped" : ""}`,
          "aria-hidden": "true",
        });
        holder.append(propNode);
        cell.append(holder);
      }

      if (occupant) {
        const badge = el("span", {
          class: `element-badge ${occupant.element}`,
          text: ELEMENT_ABBR[occupant.element] ?? "??",
        });
        const name = el("strong", { class: "unit-name", text: occupant.name });
        const stats = el("span", { class: "unit-stats" }, [
          el("span", { class: "stat atk", text: String(occupant.attack) }),
          el("span", { class: "stat gd", text: `${Math.max(0, occupant.guard)}/${occupant.maxGuard}` }),
        ]);
        const guardPct = occupant.maxGuard > 0 ? (Math.max(0, occupant.guard) / occupant.maxGuard) * 100 : 0;
        const guardBar = el("span", { class: "guard-bar", "aria-hidden": "true" }, [
          el("i", { style: `width:${guardPct.toFixed(1)}%` }),
        ]);
        const model = modelFor(occupant.cardId);
        const stage = el("span", { class: "model-stage", "aria-hidden": "true" }, [
          model ? buildVoxelModel(model, { className: "on-board" }) : buildPlaceholderModel(occupant.name),
          el("i", { class: "model-shadow" }),
        ]);
        // Readiness is shown by dimming the model plus the selection panel text;
        // a text flag would eat the corner of an already small tile.
        const unit = el(
          "span",
          {
            class: `unit ${occupant.owner === HUMAN_SEAT ? "friendly" : "enemy"} ${occupant.element} ${
              occupant.ready ? "ready" : "unready"
            }`,
          },
          [
            stage,
            badge,
            name,
            stats,
            guardBar,
          ],
        );
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
    const kind = def.category;
    const affordable = player.flux > 0 && player.flux >= def.cost;
    const button = el("button", {
      type: "button",
      class: `card ${def.element} ${kind}${ui.selectedCard === card.instanceId ? " selected" : ""}`,
      disabled: interactive ? undefined : "disabled",
      onclick: () => {
        if (!humanCanAct()) return;
        ui.selectedCard = ui.selectedCard === card.instanceId ? null : card.instanceId;
        ui.selectedUnit = null;
        if (!ui.selectedCard) {
          setMessage("Selection cleared.");
        } else if (kind === "vessel") {
          setMessage(vesselSelectionMessage(def, card.instanceId));
        } else if (kind === "relic") {
          setMessage(`${def.name}: press Play selected card to set this Relic (${def.cost} Flux).`);
        } else {
          setMessage(
            def.targeting === "none"
              ? `${def.name}: press Play selected card (${def.cost} Flux).`
              : `${def.name}: choose a highlighted target.`,
          );
        }
        render();
      },
    });
    button.append(
      el("span", { class: "cost" + (affordable ? "" : " unaffordable"), text: String(def.cost) }),
      el("span", { class: "card-element", text: ELEMENT_LABELS[def.element] ?? def.element }),
      el("span", { class: "card-kind", text: categoryLabel(def) }),
      el("h3", { text: def.name }),
    );
    if (kind === "vessel") {
      button.append(
        el("p", { class: "card-role", text: def.role ?? "Vessel" }),
        el("div", { class: "card-stats" }, [
          el("span", { text: `ATK ${def.attack ?? "—"}` }),
          el("span", { text: `GD ${def.guard ?? "—"}` }),
          el("span", { text: `MV ${def.movement ?? "—"}` }),
          el("span", { text: `RG ${def.range ?? "—"}` }),
        ]),
      );
    } else {
      button.append(el("p", { class: "card-effect", text: effectSummary(def) }));
    }
    button.append(el("p", { class: "card-flavor", text: def.flavorText ?? "" }));
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
      const entry = selectedCardEntry();
      if (def.category !== "vessel") {
        panel.append(
          el("h4", { text: def.name }),
          el("p", {
            class: "muted",
            text: `${ELEMENT_LABELS[def.element]} · ${categoryLabel(def)} · ${def.cost} Flux`,
          }),
          el("p", { text: effectSummary(def) }),
          el("p", { class: "card-flavor", text: def.flavorText ?? "" }),
        );
        if (def.category === "action" && def.targeting !== "none") {
          panel.append(
            el("p", {
              class: "preview",
              text: entry?.targetIds?.length
                ? "Click a highlighted Vessel to cast."
                : "No legal target right now.",
            }),
          );
        }
        return;
      }
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

function renderRelics() {
  const slots = $("#back-row");
  if (!slots || !ui.match) return;
  const relics = ui.match.players[HUMAN_SEAT].relics;
  slots.replaceChildren();
  for (let index = 0; index < MAX_RELICS_PER_SEAT; index += 1) {
    const relic = relics[index];
    const def = relic ? ui.match.catalog.get(relic.cardId) : null;
    slots.append(
      el("div", { class: `relic-slot${def ? " filled" : ""}` }, [
        el("span", { class: "slot-index", text: `SLOT ${index + 1}` }),
        def
          ? el("div", { class: "slot-body" }, [
              el("strong", { text: def.name }),
              el("span", { class: "slot-element", text: ELEMENT_LABELS[def.element] ?? def.element }),
              el("span", { class: "slot-effect", text: effectSummary(def) }),
            ])
          : el("p", { class: "slot-empty", text: "Empty — set a Relic from your hand" }),
      ]),
    );
  }
  const label = `${relics.length} / ${MAX_RELICS_PER_SEAT}`;
  $("#relic-count").textContent = label;
  $("#back-row-count").textContent = label;
}

/* ----------------------------- menu & guide ----------------------------- */

function renderMenuState() {
  const live = Boolean(ui.match) && !isOver(ui.match);
  const continueButton = $("#menu-continue");
  if (continueButton) continueButton.hidden = !live;
  const battleTab = $("#tab-battle");
  if (battleTab) battleTab.disabled = !ui.match;
  const context = $("#menu-context");
  if (!context) return;
  if (!ui.match) {
    context.textContent = "No match in progress. Practice is free, unranked, and needs no account.";
  } else if (isOver(ui.match)) {
    context.textContent = `Last match finished — ${ui.match.result?.winnerSeat === HUMAN_SEAT ? "victory" : "defeat"}. Starting again records a new result.`;
  } else {
    context.textContent = `Match in progress · turn ${ui.match.turn} · ${ui.match.active === HUMAN_SEAT ? "your move" : "opponent acting"}.`;
  }
}

function renderMenuModels() {
  const host = $("#menu-models");
  if (!host || host.childElementCount > 0) return;
  // The four clearest silhouettes in the roster, chosen for the first
  // impression: a knight, a lancer, a fortress and a spirit.
  const showcase = [
    "vessel_ashen_crownblade",
    "vessel_argent_nightlancer",
    "vessel_bastion_first_mountain",
    "vessel_lantern_lost_choir",
  ];
  for (const id of showcase) {
    const model = modelFor(id);
    if (!model) continue;
    host.append(el("div", { class: "menu-model" }, [buildVoxelModel(model, { className: "hero" })]));
  }
}

/**
 * Drag or arrow-key rotation for a model. The same model node is used in
 * matches, so the showcase cannot hide an unfinished in-game asset.
 */
function enableModelSpin(stage, modelNode) {
  let spin = -32;
  let dragging = false;
  let startX = 0;
  let startSpin = spin;
  const apply = () => modelNode.style.setProperty("--spin", `${spin}deg`);
  apply();

  stage.addEventListener("pointerdown", (event) => {
    dragging = true;
    startX = event.clientX;
    startSpin = spin;
    stage.setPointerCapture?.(event.pointerId);
    stage.classList.add("is-spinning");
  });
  stage.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    spin = startSpin + (event.clientX - startX) * 0.9;
    apply();
  });
  const end = () => {
    dragging = false;
    stage.classList.remove("is-spinning");
  };
  stage.addEventListener("pointerup", end);
  stage.addEventListener("pointercancel", end);
  stage.addEventListener("pointerleave", end);
  stage.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    spin += event.key === "ArrowLeft" ? -22 : 22;
    apply();
  });
}

function renderRoster() {
  const grid = $("#roster-grid");
  if (!grid || !ui.catalog || grid.childElementCount > 0) return;
  for (const vessel of ui.catalog.cards.filter((card) => card.category === "vessel")) {
    const model = modelFor(vessel.id);
    const modelNode = model
      ? buildVoxelModel(model, { label: vessel.name })
      : buildPlaceholderModel(vessel.name);
    const stage = el("div", {
      class: "roster-stage",
      tabindex: "0",
      role: "group",
      "aria-label": `${vessel.name} voxel model. Drag, or use the left and right arrow keys, to rotate.`,
    }, [modelNode]);
    if (model) enableModelSpin(stage, modelNode);
    const ability = vessel.abilities?.[0]?.text ?? vessel.designDescription ?? "";
    grid.append(
      el("article", { class: `roster-card ${vessel.element}` }, [
        stage,
        el("div", { class: "roster-meta" }, [
          el("span", { class: `element-badge ${vessel.element}`, text: ELEMENT_LABELS[vessel.element] ?? vessel.element }),
          el("h3", { text: vessel.name }),
          el("p", { class: "muted small", text: vessel.role ?? vessel.subtypes?.join(", ") ?? "Vessel" }),
          el("dl", { class: "roster-stats" }, [
            el("div", { html: `ATK <strong>${vessel.attack}</strong>` }),
            el("div", { html: `GD <strong>${vessel.guard}</strong>` }),
            el("div", { html: `MV <strong>${vessel.movement}</strong>` }),
            el("div", { html: `RG <strong>${vessel.range}</strong>` }),
          ]),
          el("p", { class: "roster-flavor", text: vessel.flavorText ?? "" }),
          el("p", { class: "roster-ability muted small", text: ability }),
        ]),
      ]),
    );
  }
}

function renderTutorial() {
  const panel = $("#tutorial-panel");
  if (!panel) return;
  const step = tutorialStep(ui.tutorial);
  panel.hidden = !step;
  if (!step) return;
  $("#tutorial-step").textContent = String(ui.tutorial.step + 1);
  $("#tutorial-total").textContent = String(TUTORIAL_STEPS.length);
  $("#tutorial-title").textContent = step.title;
  const hint = tutorialHint(step);
  $("#tutorial-body").textContent = hint ? `${step.body} ${hint}` : step.body;
}

/** State-aware nudge so a guided step is never silently impossible. */
function tutorialHint(step) {
  if (!ui.match || !humanCanAct()) return "";
  const legal = getLegalActions(ui.match);
  if (step.id === "summon" && legal.summons.length === 0) {
    return "No Vessel in hand can be summoned right now — end the turn to keep going.";
  }
  if (step.id === "move" && legal.units.every((entry) => entry.moves.length === 0)) {
    return "Your Vessel cannot move yet — end the turn to ready it.";
  }
  if (step.id === "attack" && legal.units.every((entry) => entry.attacks.length === 0)) {
    return "Nothing is in range yet — end the turn when you are ready.";
  }
  return "";
}

function renderPrompt() {
  const node = $("#game-message");
  if (!node) return;
  node.textContent = ui.message;
  const entry = ui.selectedCard ? selectedCardEntry() : null;
  let state = "idle";
  if (!ui.match) state = "idle";
  else if (ui.match.phase === "over") state = "over";
  else if (ui.match.active !== HUMAN_SEAT || ui.aiBusy) state = "waiting";
  else if (entry?.category === "vessel") state = "deploy";
  else if (entry?.category === "action" && entry.targeting !== "none") state = "target";
  else if (ui.selectedUnit) state = "command";
  node.dataset.state = state;
  const selecting = Boolean(ui.selectedCard || ui.selectedUnit);
  const cancel = $("#cancel-btn");
  if (cancel) cancel.disabled = !(humanCanAct() && selecting);
  const barCancel = $("#turn-bar-cancel");
  if (barCancel) barCancel.hidden = !(humanCanAct() && selecting);
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
    `${aiPlayer.hand.length} cards · ${Object.values(match.units).filter((u) => u.owner === AI_SEAT).length} Vessels · ` +
    `${aiPlayer.relics.length} Relics`;
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
  renderMenuState();
  const match = ui.match;
  if (!match) return;
  renderBoard();
  renderHand();
  renderSelectedPanel();
  renderTimer();
  renderOpponent();
  renderRelics();
  renderLog();
  renderTutorial();
  renderPrompt();

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

  const entry = selectedCardEntry();
  const playBtn = $("#play-card-btn");
  const needsTarget = entry?.category === "action" && entry.targeting !== "none";
  playBtn.disabled = !(
    canAct &&
    entry &&
    entry.playable &&
    entry.category !== "vessel" &&
    !needsTarget
  );
  playBtn.textContent = !entry
    ? "Play selected card"
    : entry.category === "vessel"
      ? "Choose a cell to summon"
      : needsTarget
        ? "Choose a target on the board"
        : `Play ${entry.name}`;

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
  renderAccount();
}

/* ---------------------------- accounts ---------------------------- */

function setAccountStatus(text) {
  const node = $("#account-status");
  if (node) node.textContent = text;
}

function renderAccount() {
  if (!ui.profile) return;
  const status = accountStatus();
  $("#account-signed-in").hidden = !status.signedIn;
  $("#account-signed-out").hidden = status.signedIn;
  $("#account-create").disabled = ui.accountBusy;
  $("#account-signin").disabled = ui.accountBusy;
  if (status.signedIn) {
    const session = readSession();
    $("#account-id").textContent = status.accountId.slice(0, 8);
    $("#account-code-display").textContent = session ? formatCode(session.code) : "—";
  }
}

function updateSettings(patch) {
  ui.profile = { ...ui.profile, settings: { ...ui.profile.settings, ...patch } };
  renderProfileForm();
  scheduleSave();
  render();
}

const VIEWS = Object.freeze({
  menu: "#view-menu",
  battle: "#view-battle",
  guide: "#view-guide",
  roster: "#view-roster",
  profile: "#view-profile",
});

function showView(requested) {
  const view = requested === "battle" && !ui.match ? "menu" : requested;
  ui.view = view;
  for (const [name, selector] of Object.entries(VIEWS)) {
    const node = $(selector);
    if (node) node.hidden = name !== view;
    const tab = $(`#tab-${name}`);
    if (tab) {
      tab.classList.toggle("active", name === view);
      tab.setAttribute("aria-selected", String(name === view));
    }
  }
  if (view === "battle") render();
  else if (view === "profile") renderProfileForm();
  else if (view === "roster") renderRoster();
  else if (view === "menu") renderMenuState();
  else if (view === "guide") markGuideSeen();
  if (typeof window !== "undefined" && window.scrollTo) {
    window.scrollTo({ top: 0, behavior: ui.profile?.settings?.reducedMotion ? "auto" : "smooth" });
  }
}

/* ------------------------------ wiring ------------------------------ */

function bind() {
  for (const name of Object.keys(VIEWS)) {
    const tab = $(`#tab-${name}`);
    if (tab) tab.addEventListener("click", () => showView(name));
  }
  $("#profile-chip").addEventListener("click", () => showView("profile"));
  $("#brand-home").addEventListener("click", () => showView("menu"));

  $("#menu-practice").addEventListener("click", () => newMatch());
  $("#menu-tutorial").addEventListener("click", () => newMatch({ guided: true }));
  $("#menu-continue").addEventListener("click", () => showView("battle"));
  $("#menu-guide").addEventListener("click", () => showView("guide"));
  $("#menu-roster").addEventListener("click", () => showView("roster"));
  $("#menu-settings").addEventListener("click", () => showView("profile"));
  $("#guide-start").addEventListener("click", () => newMatch({ guided: true }));
  $("#guide-back").addEventListener("click", () => showView("menu"));
  $("#roster-menu").addEventListener("click", () => showView("menu"));
  $("#cancel-btn").addEventListener("click", cancelSelection);
  $("#turn-bar-cancel").addEventListener("click", cancelSelection);
  $("#tutorial-skip").addEventListener("click", () => {
    ui.tutorial = skipTutorial(ui.tutorial);
    markGuideSeen();
    setMessage("Tutorial skipped. The full rules stay available under How to Play.");
    render();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (ui.view !== "battle") return;
    if (ui.selectedCard || ui.selectedUnit) {
      event.preventDefault();
      cancelSelection();
    }
  });

  $("#result-restart").addEventListener("click", () => {
    $("#result-overlay").hidden = true;
    newMatch();
  });
  $("#result-menu").addEventListener("click", () => {
    $("#result-overlay").hidden = true;
    showView("menu");
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

  $("#play-card-btn").addEventListener("click", playSelectedCard);

  // ---- account controls ----
  $("#account-create").addEventListener("click", async () => {
    if (ui.accountBusy) return;
    ui.accountBusy = true;
    renderAccount();
    setAccountStatus("Creating account…");
    try {
      const { profile, code } = await createAccountForProfile(ui.profile);
      ui.profile = profile;
      ui.sync = { state: "synced", message: "Signed in" };
      renderProfileForm();
      setAccountStatus(`Account created. Your recovery code is ${formatCode(code)} — write it down.`);
    } catch (error) {
      setAccountStatus(error.message);
    } finally {
      ui.accountBusy = false;
      renderAccount();
    }
  });

  $("#account-signin").addEventListener("click", async () => {
    const raw = $("#account-code").value;
    if (!normaliseCode(raw)) {
      setAccountStatus("Enter a recovery code first.");
      return;
    }
    if (ui.accountBusy) return;
    ui.accountBusy = true;
    renderAccount();
    setAccountStatus("Checking the recovery code…");
    try {
      ui.profile = await signInToAccount(raw);
      ui.sync = { state: "synced", message: "Signed in" };
      $("#account-code").value = "";
      renderProfileForm();
      render();
      setAccountStatus("Signed in. This device now uses the account's name, avatar, settings and record.");
    } catch (error) {
      setAccountStatus(error.message);
    } finally {
      ui.accountBusy = false;
      renderAccount();
    }
  });

  $("#account-copy").addEventListener("click", async () => {
    const session = readSession();
    if (!session) return;
    try {
      await navigator.clipboard.writeText(formatCode(session.code));
      setAccountStatus("Recovery code copied.");
    } catch {
      setAccountStatus("Copy failed — select the code and copy it manually.");
    }
  });

  $("#account-rotate").addEventListener("click", async () => {
    if (ui.accountBusy) return;
    const confirmed = window.confirm(
      "Issue a new recovery code? The current code stops working immediately, and anything holding the old one loses access.",
    );
    if (!confirmed) return;
    ui.accountBusy = true;
    renderAccount();
    try {
      const code = await rotateRecoveryCode();
      setAccountStatus(`New recovery code: ${formatCode(code)} — write it down.`);
    } catch (error) {
      setAccountStatus(error.message);
    } finally {
      ui.accountBusy = false;
      renderAccount();
    }
  });

  $("#account-signout").addEventListener("click", async () => {
    const confirmed = window.confirm(
      "Sign out on this device? The account and its record stay in the cloud; this browser continues as a guest profile.",
    );
    if (!confirmed) return;
    signOutOfAccount();
    await saveProfile();
    renderProfileForm();
    setAccountStatus("Signed out. This browser is a guest profile again.");
  });

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
    const [vessels, extras] = await Promise.all(
      ["./src/cards/starter-set.json", "./src/cards/actions-relics.json"].map(async (path) => {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`Card data request failed (${response.status}) for ${path}.`);
        return response.json();
      }),
    );
    ui.catalog = createCatalog([...vessels, ...extras]);
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
  renderAccount();
  setAccountStatus(
    accountStatus().signedIn
      ? "Signed in. Your record follows the recovery code, not this browser."
      : "Guest profile. Create an account to carry this name, avatar and record to another device.",
  );
  renderMenuModels();
  renderMenuState();
  renderProfileForm();
  const arenaName = $("#arena-name");
  if (arenaName) arenaName.textContent = ARENA.name;
  $("#board")?.setAttribute("data-arena", ARENA.id);
  // First visit: open the rules page rather than dropping straight into a match.
  showView(tutorialSeen() ? "menu" : "guide");
}

boot();
