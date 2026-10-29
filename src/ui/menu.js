/**
 * Main menu + Play (mode selection) dialog. Canonical design:
 * docs/UI_DESIGN_SYSTEM.md §4.1–4.2.
 *
 * Every action here calls an existing working system through `ctx`; this
 * module adds presentation and validation feedback only. It never starts a
 * match on load, never invents a mode (no local hot-seat: not implemented),
 * and Solo Duel refuses an illegal or unowned active deck with the reason.
 */

import { validateDeckWithOwnership } from "../game/decks.js";
import { sanitizeEconomy } from "../game/economy.js";

/**
 * Pure: the active deck's readiness for a Solo Duel. Used by the dialog and
 * by tests. Returns { deck, ok, errors, counts, reason }.
 */
export function activeDeckStatus(economyRaw, catalog) {
  const economy = sanitizeEconomy(economyRaw);
  const deck = economy.decks.find((d) => d.id === economy.activeDeckId) ?? null;
  if (!deck) {
    return { deck: null, ok: false, errors: [], counts: null, reason: "No active deck. Build or select one in the Deck Builder." };
  }
  if (!catalog) {
    return { deck, ok: false, errors: [], counts: null, reason: "Card data is still loading." };
  }
  const check = validateDeckWithOwnership(deck.cardIds, catalog, economy.collection);
  return {
    deck,
    ok: check.ok,
    errors: check.errors,
    counts: check.counts,
    reason: check.ok ? "" : `"${deck.name}" can't be used yet: ${check.errors[0]}${check.errors.length > 1 ? ` (+${check.errors.length - 1} more)` : ""}`,
  };
}

/** Pure: whether ambient menu motion should run. */
export function menuMotionAllowed({ prefersReduced = false, settingReduced = false } = {}) {
  return !prefersReduced && !settingReduced;
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) if (child) node.append(child);
  return node;
}

/** Deck summary block (`.vl-deck`) shared by the Play dialog and the lobby. */
export function deckSummaryNode(status, { emptyText } = {}) {
  const wrap = el("div", { class: `vl-deck${status.ok ? " is-legal" : " is-illegal"}` });
  if (!status.deck) {
    wrap.append(el("p", { class: "vl-deck-empty", text: emptyText ?? status.reason }));
    return wrap;
  }
  const counts = status.counts;
  wrap.append(
    el("div", { class: "vl-deck-row" }, [
      el("span", { class: "vl-deck-name", text: status.deck.name }),
      el("span", { class: `vl-badge ${status.ok ? "vl-badge--ok" : "vl-badge--danger"}`, text: status.ok ? "Legal" : "Not legal" }),
    ]),
  );
  if (counts) {
    wrap.append(
      el("p", { class: "vl-deck-meta", text: `${counts.total} cards · ${counts.vessels} Vessels · ${counts.actions} Actions · ${counts.relics} Relics` }),
    );
  }
  if (!status.ok && status.reason) wrap.append(el("p", { class: "vl-deck-error", text: status.reason }));
  return wrap;
}

/**
 * Wire the menu. ctx: { getProfile, getCatalog, newMatch(options), showView(view),
 * openShopTab(tab), updateSettings(patch), difficulties, archetypes,
 * resolveDifficulty, resolveArchetype }.
 */
export function mountMenu(ctx) {
  const $ = (selector) => document.querySelector(selector);
  const dialog = $("#play-dialog");
  const playButton = $("#menu-play");
  let opener = null;

  const prefersReduced = () =>
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

  function applyMotionPreference() {
    const allowed = menuMotionAllowed({
      prefersReduced: prefersReduced(),
      settingReduced: ctx.getProfile()?.settings?.reducedMotion === true,
    });
    document.documentElement.dataset.motion = allowed ? "full" : "reduced";
    return allowed;
  }

  function renderSolo() {
    const status = activeDeckStatus(ctx.getProfile()?.economy, ctx.getCatalog());
    const host = $("#play-deck");
    if (host) host.replaceChildren(deckSummaryNode(status));
    const start = $("#menu-practice-deck");
    if (start) {
      start.disabled = !status.ok;
      start.setAttribute("aria-describedby", "play-solo-status");
    }
    const note = $("#play-solo-status");
    if (note) note.textContent = status.ok ? "" : status.reason;

    const settings = ctx.getProfile()?.settings ?? {};
    const diff = $("#play-difficulty");
    if (diff) {
      diff.replaceChildren(
        ...Object.values(ctx.difficulties).map((d) =>
          el("option", { value: d.id, text: d.label, selected: d.id === settings.difficulty ? "selected" : undefined }),
        ),
      );
    }
    const arch = $("#play-archetype");
    if (arch) {
      arch.replaceChildren(
        ...Object.values(ctx.archetypes).map((a) =>
          el("option", { value: a.id, text: `The ${a.label}`, selected: a.id === settings.archetype ? "selected" : undefined }),
        ),
      );
    }
    const help = $("#play-opponent-help");
    if (help) {
      help.textContent = `${ctx.resolveDifficulty(settings.difficulty).description} ${ctx.resolveArchetype(settings.archetype).description}`;
    }
    return status;
  }

  function openPlay() {
    if (!dialog) return;
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : playButton;
    renderSolo();
    if (typeof dialog.showModal === "function") {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
    // Focus the first available action, not the close button.
    const first = dialog.querySelector("#menu-practice-deck:not([disabled])") ?? dialog.querySelector("#menu-practice");
    first?.focus();
  }

  function closePlay() {
    if (!dialog) return;
    if (typeof dialog.close === "function" && dialog.open) dialog.close();
    else dialog.removeAttribute("open");
  }

  dialog?.addEventListener("close", () => {
    (opener && document.contains(opener) ? opener : playButton)?.focus?.();
  });
  // Click on the backdrop (the dialog element itself, outside its content) closes.
  dialog?.addEventListener("click", (event) => {
    if (event.target === dialog) closePlay();
  });
  for (const node of dialog?.querySelectorAll("[data-close-dialog]") ?? []) {
    node.addEventListener("click", closePlay);
  }

  playButton?.addEventListener("click", openPlay);
  $("#menu-practice")?.addEventListener("click", () => {
    closePlay();
    ctx.newMatch();
  });
  $("#menu-tutorial")?.addEventListener("click", () => {
    closePlay();
    ctx.newMatch({ guided: true });
  });
  $("#menu-practice-deck")?.addEventListener("click", () => {
    const status = renderSolo();
    if (!status.ok) return; // reason already shown in the dialog
    closePlay();
    ctx.newMatch({ humanDeck: status.deck.cardIds });
  });
  $("#play-edit-deck")?.addEventListener("click", () => {
    closePlay();
    ctx.showView("decks");
  });
  $("#play-online")?.addEventListener("click", () => {
    closePlay();
    ctx.showView("lobby");
  });
  $("#play-difficulty")?.addEventListener("change", (event) => {
    ctx.updateSettings({ difficulty: event.target.value });
    renderSolo();
  });
  $("#play-archetype")?.addEventListener("change", (event) => {
    ctx.updateSettings({ archetype: event.target.value });
    renderSolo();
  });
  $("#menu-collection")?.addEventListener("click", () => ctx.openShopTab("collection"));

  // Card-fan parallax: transform-only, pointer-driven (no rAF loop), off
  // when motion is reduced.
  const fan = $("#menu-fan");
  const stage = $(".vl-menu-stage");
  if (fan && stage) {
    stage.parentElement?.addEventListener("pointermove", (event) => {
      if (document.documentElement.dataset.motion !== "full") return;
      const rect = stage.getBoundingClientRect();
      const dx = (event.clientX - (rect.left + rect.width / 2)) / Math.max(1, rect.width);
      const dy = (event.clientY - (rect.top + rect.height / 2)) / Math.max(1, rect.height);
      fan.style.setProperty("--px", Math.max(-1, Math.min(1, dx)).toFixed(3));
      fan.style.setProperty("--py", Math.max(-1, Math.min(1, dy)).toFixed(3));
    });
    stage.parentElement?.addEventListener("pointerleave", () => {
      fan.style.setProperty("--px", "0");
      fan.style.setProperty("--py", "0");
    });
  }

  window.matchMedia?.("(prefers-reduced-motion: reduce)").addEventListener?.("change", applyMotionPreference);
  applyMotionPreference();

  return {
    openPlay,
    closePlay,
    renderSolo,
    applyMotionPreference,
    isPlayOpen: () => Boolean(dialog?.open),
  };
}
