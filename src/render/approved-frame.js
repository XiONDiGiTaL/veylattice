/**
 * Approved-frame card compositor.
 *
 * Uses the owner-approved raster frames in CardFrames/ (never regenerated
 * or substituted) with the geometry from CardFrames/frame-manifest.json:
 * canvas 214x300, per-frame illustration apertures. The illustration sits
 * BEHIND the transparent overlay, inside its aperture only; title, cost,
 * stats and rules text are DOM text nodes above the frame, so canonical
 * data can never be baked stale into an image.
 *
 * Frame mapping: Vessel -> its element frame; Action -> action frame;
 * Relic -> NO approved frame exists (see CardFrames/FRAME_DIRECTIVE.md),
 * so Relics render in a clearly flagged neutral presentation and are
 * tracked as pending in TODO.md. Relics never borrow a Vessel frame.
 *
 * Geometry here mirrors frame-manifest.json; tests/frames.test.js
 * asserts the two stay in sync, so a manifest edit without a code edit
 * fails loudly instead of silently stretching a frame.
 */

export const FRAME_CANVAS = Object.freeze({ width: 214, height: 300 });
export const FRAME_ASPECT = FRAME_CANVAS.width / FRAME_CANVAS.height;

/** [x, y, w, h] art apertures from frame-manifest.json. */
export const FRAME_GEOMETRY = Object.freeze({
  wood: Object.freeze({ overlay: "CardFrames/overlays/wood.png", art: [19, 62, 175, 130] }),
  fire: Object.freeze({ overlay: "CardFrames/overlays/fire.png", art: [19, 62, 179, 130] }),
  earth: Object.freeze({ overlay: "CardFrames/overlays/earth.png", art: [19, 68, 175, 117] }),
  water: Object.freeze({ overlay: "CardFrames/overlays/water.png", art: [19, 68, 179, 117] }),
  metal: Object.freeze({ overlay: "CardFrames/overlays/metal.png", art: [19, 67, 176, 113] }),
  action: Object.freeze({ overlay: "CardFrames/overlays/action.png", art: [19, 67, 179, 126] }),
});

/** Which approved frame a card uses, or null when none is approved (Relics). */
export function frameKeyFor(card) {
  if (!card || typeof card !== "object") return null;
  if (card.category === "action") return "action";
  if (card.category === "vessel" && FRAME_GEOMETRY[card.element]) return card.element;
  return null;
}

function pct(value, total) {
  return `${(value / total) * 100}%`;
}

/**
 * Build a card face element. `artUri` is the full-background illustration
 * (same voxel model as the battlefield unit); `effectText` is canonical
 * rules text supplied by the caller. `base` prefixes asset URLs so the
 * component works under /veylattice/ and at the repo root.
 */
export function buildApprovedCard(card, { artUri = "", effectText = "", base = "./" } = {}) {
  const frameKey = frameKeyFor(card);
  const frame = frameKey ? FRAME_GEOMETRY[frameKey] : null;
  const root = document.createElement("div");
  root.className = `approved-card${frame ? ` frame-${frameKey}` : " relic-pending"}`;
  root.setAttribute("role", "img");
  root.setAttribute("aria-label", `${card.name ?? "Card"} — ${card.element ?? ""} ${card.category ?? ""}, ${card.cost ?? "?"} Flux`);

  if (frame) {
    const art = document.createElement("img");
    art.className = "approved-art";
    art.src = artUri;
    art.alt = "";
    art.setAttribute("aria-hidden", "true");
    const [ax, ay, aw, ah] = frame.art;
    art.style.left = pct(ax, FRAME_CANVAS.width);
    art.style.top = pct(ay, FRAME_CANVAS.height);
    art.style.width = pct(aw, FRAME_CANVAS.width);
    art.style.height = pct(ah, FRAME_CANVAS.height);
    root.append(art);
    const overlay = document.createElement("img");
    overlay.className = "approved-overlay";
    overlay.src = `${base}${frame.overlay}`;
    overlay.alt = "";
    overlay.setAttribute("aria-hidden", "true");
    root.append(overlay);
  } else {
    const art = document.createElement("img");
    art.className = "approved-art approved-art-full";
    art.src = artUri;
    art.alt = "";
    art.setAttribute("aria-hidden", "true");
    root.append(art);
  }

  const name = document.createElement("span");
  name.className = "approved-name";
  name.textContent = card.name ?? "";
  root.append(name);

  const cost = document.createElement("span");
  cost.className = "approved-cost";
  cost.textContent = String(card.cost ?? "");
  root.append(cost);

  const mid = document.createElement("span");
  mid.className = "approved-mid";
  if (card.category === "vessel") mid.textContent = `ATK ${card.attack ?? "—"} · GD ${card.guard ?? "—"}`;
  else if (card.category === "relic") mid.textContent = "RELIC FRAME PENDING";
  else mid.textContent = (card.element ? `${String(card.element).toUpperCase()} ` : "") + "ACTION";
  root.append(mid);

  const text = document.createElement("span");
  text.className = "approved-text";
  text.textContent = effectText || card.flavorText || "";
  root.append(text);
  return root;
}
