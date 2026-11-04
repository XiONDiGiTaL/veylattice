/**
 * Formation card faces (ARENA-R2, 2026-11-04).
 *
 * One description of a card slot, rendered two ways:
 *   - DOM: the interactive formation rows in `index.html`, built on the same
 *     approved `CardFrames/` overlays as the hand, collection and deck builder.
 *   - Canvas: the field cards inside the 3D arena (`src/render/arena3d.js`),
 *     painted at the approved 214x300 geometry so a slot in the scene and a
 *     slot on the page are the same card, never a stretched approximation.
 *
 * Aspect ratio is never guessed: `FRAME_CANVAS` (214x300) is the approved
 * canvas and `faceGeometry` derives every text band from the frame's own art
 * aperture, so a manifest edit moves the bands with the aperture.
 *
 * Relics still have no approved frame (`CardFrames/FRAME_DIRECTIVE.md`), so
 * they keep the neutral relic presentation and a visible `FRAME PENDING` flag
 * in the DOM. They never borrow a Vessel frame.
 */

import { FRAME_CANVAS, FRAME_GEOMETRY, buildApprovedCard, frameKeyFor } from "./approved-frame.js";
import { illustrationDataUri } from "./illustration.js";

const ELEMENT_LABEL = Object.freeze({
  wood: "Wood",
  fire: "Fire",
  earth: "Earth",
  metal: "Metal",
  water: "Water",
});

/** Element rune letters. Shape + text, never colour alone. */
const ELEMENT_RUNE = Object.freeze({ wood: "W", fire: "F", earth: "E", metal: "M", water: "A" });

/** Geometry used when a card has no approved frame (Relics, empty plates). */
const NEUTRAL_ART = Object.freeze([19, 62, 176, 126]);

/**
 * Pixel bands for one approved frame, derived from its art aperture.
 * All values are in the 214x300 approved canvas space.
 */
export function faceGeometry(frameKey) {
  const art = FRAME_GEOMETRY[frameKey]?.art ?? NEUTRAL_ART;
  const [ax, ay, aw, ah] = art;
  const artBottom = ay + ah;
  return {
    width: FRAME_CANVAS.width,
    height: FRAME_CANVAS.height,
    art: { x: ax, y: ay, w: aw, h: ah },
    name: { x: 22, y: 15, w: 140, h: 24 },
    cost: { cx: 190, cy: 32, r: 20 },
    type: { x: 24, y: artBottom + 4, w: 166, h: 13 },
    text: { x: 24, y: artBottom + 21, w: 166, h: Math.max(24, 282 - (artBottom + 21)) },
  };
}

function guardText(slot) {
  const unit = slot.unit;
  if (!unit) return "";
  const max = Number.isFinite(unit.maxGuard) ? unit.maxGuard : Number.isFinite(slot.card?.guard) ? slot.card.guard : null;
  const current = Math.max(0, Number(unit.guard) || 0);
  return max === null ? `${current}` : `${current}/${max}`;
}

/**
 * Normalised presentation model for one formation slot. Pure: it reads the
 * slot data and returns text and flags, so rules never leak into drawing and
 * the shape can be tested without a DOM.
 */
export function faceModel(slot) {
  const index = Number.isInteger(slot?.index) ? slot.index + 1 : 1;
  const kind = slot?.kind === "relic" ? "relic" : "vessel";
  const owner = slot?.seat === 1 ? "ENEMY" : "YOUR";
  if (!slot?.occupied || !slot?.card) {
    return {
      key: slot?.key ?? `empty:${kind}:${index}`,
      empty: true,
      kind,
      ownerLabel: `${owner} FORMATION`,
      title: kind === "relic" ? `RELIC SOCKET ${index}` : `VESSEL SLOT ${index}`,
      hint: kind === "relic" ? "Set a persistent Relic" : "Summon a Vessel here",
      rune: kind === "relic" ? "HEX" : "DIAMOND",
      geometry: faceGeometry(null),
      frameKey: null,
      pendingFrame: false,
      status: "",
      selected: false,
    };
  }

  const card = slot.card;
  const frameKey = frameKeyFor(card);
  const element = card.element ?? "metal";
  const isVessel = kind === "vessel";
  const stats = isVessel
    ? `ATK ${slot.unit?.attack ?? card.attack ?? "—"} · GD ${guardText(slot) || card.guard || "—"}`
    : "ONGOING · PERSISTENT";
  const status = isVessel && slot.unit && slot.unit.ready === false ? "SPENT" : "";
  return {
    key: slot.key,
    empty: false,
    kind,
    frameKey,
    pendingFrame: !frameKey,
    title: card.name ?? (isVessel ? "Vessel" : "Relic"),
    cost: card.cost ?? "",
    element,
    elementLabel: ELEMENT_LABEL[element] ?? "Metal",
    rune: ELEMENT_RUNE[element] ?? "M",
    subtype: card.subtype ?? (isVessel ? "Vessel" : "Relic"),
    typeLine: `${(ELEMENT_LABEL[element] ?? "Metal").toUpperCase()} · ${String(card.subtype ?? (isVessel ? "VESSEL" : "RELIC")).toUpperCase()}`,
    stats,
    status,
    guardBroken: isVessel && slot.unit ? Math.max(0, Number(slot.unit.guard) || 0) === 0 : false,
    text: slot.effectText || card.flavorText || "",
    geometry: faceGeometry(frameKey),
    ownerLabel: `${owner} FORMATION`,
    selected: Boolean(slot.unit?.selected),
  };
}

/** Truncate to a width using an injected measurer, so it is testable. */
export function truncateToWidth(text, maxWidth, measure) {
  const value = String(text ?? "");
  if (!value) return "";
  if (measure(value) <= maxWidth) return value;
  const ellipsis = "…";
  let low = 0;
  let high = value.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (measure(value.slice(0, mid) + ellipsis) <= maxWidth) low = mid;
    else high = mid - 1;
  }
  return low <= 0 ? "" : value.slice(0, low) + ellipsis;
}

/* --------------------------- image assets --------------------------- */

function loadImage(src) {
  return new Promise((resolve) => {
    if (typeof Image !== "function") {
      resolve(null);
      return;
    }
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

const overlayCache = new Map();
/** Approved overlay PNG for a frame key, cached per base path. */
export function loadOverlay(frameKey, base = "./") {
  const frame = FRAME_GEOMETRY[frameKey];
  if (!frame) return Promise.resolve(null);
  const src = `${base}${frame.overlay}`;
  if (!overlayCache.has(src)) overlayCache.set(src, loadImage(src));
  return overlayCache.get(src);
}

const artCache = new Map();
/** Full illustration for a card (same voxel-derived SVG as the card faces). */
export function loadArt(card) {
  if (!card?.id) return Promise.resolve(null);
  if (!artCache.has(card.id)) artCache.set(card.id, loadImage(illustrationDataUri(card)));
  return artCache.get(card.id);
}

/* ---------------------------- painting ----------------------------- */

function roundedRect(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function fitText(ctx, text, maxWidth) {
  const measure = (value) => ctx.measureText(value).width;
  return truncateToWidth(text, maxWidth, measure);
}

/** Cover-fit an image inside a rect without distorting it. */
function drawCover(ctx, image, rect) {
  const ratio = Math.max(rect.w / image.width, rect.h / image.height);
  const w = image.width * ratio;
  const h = image.height * ratio;
  ctx.drawImage(image, rect.x + (rect.w - w) / 2, rect.y + (rect.h - h) / 2, w, h);
}

function elementRune(ctx, rune, cx, cy, r, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = `700 ${Math.round(r * 1.1)}px Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(rune, cx, cy + 0.5);
  ctx.restore();
}

function paintText(ctx, model) {
  const g = model.geometry;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // Name on the frame's name bar.
  ctx.fillStyle = "#1c2416";
  ctx.font = "700 15px Georgia, serif";
  ctx.fillText(fitText(ctx, model.title, g.name.w), g.name.x, g.name.y + 16);

  // Cost in the cost circle.
  ctx.fillStyle = "#20261c";
  ctx.font = "700 22px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText(String(model.cost), g.cost.cx, g.cost.cy + 8);

  // Type line and stats on the band under the art aperture.
  ctx.textAlign = "left";
  ctx.fillStyle = "#3a4230";
  ctx.font = "600 10px Georgia, serif";
  // 52/45 split: at the old 62/36 the stats clipped to "ATK 4 · G…", which is
  // exactly the number a player needs mid-combat.
  ctx.fillText(fitText(ctx, model.typeLine, g.type.w * 0.52), g.type.x, g.type.y + 10);
  ctx.textAlign = "right";
  ctx.fillStyle = "#1c2416";
  ctx.font = "700 10px Georgia, serif";
  ctx.fillText(fitText(ctx, model.stats, g.type.w * 0.45), g.type.x + g.type.w, g.type.y + 10);

  // Rules / flavour text in the lower panel.
  if (model.text) {
    ctx.textAlign = "left";
    ctx.fillStyle = "#2a3126";
    ctx.font = "400 10.5px Georgia, serif";
    const words = String(model.text).split(/\s+/);
    const lines = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > g.text.w && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
      if (lines.length >= 5) break;
    }
    if (line && lines.length < 5) lines.push(line);
    lines.forEach((entry, i) => ctx.fillText(fitText(ctx, entry, g.text.w), g.text.x, g.text.y + 11 + i * 13));
  }

  paintStatus(ctx, model);
}

/**
 * Status badge (SPENT / READY …) in the bottom-right of the art aperture.
 *
 * It used to share the stat band with `ATK 4 · GD 2/3` and overprinted it —
 * the badge now sits on the illustration with its own plate, so a status
 * never hides a number.
 */
function paintStatus(ctx, model) {
  if (!model.status) return;
  const g = model.geometry;
  ctx.save();
  ctx.font = "700 9px Georgia, serif";
  const label = String(model.status);
  const w = ctx.measureText(label).width + 10;
  const h = 15;
  const x = g.art.x + g.art.w - w - 4;
  const y = g.art.y + g.art.h - h - 4;
  roundedRect(ctx, x, y, w, h, 3);
  ctx.fillStyle = "rgba(8,12,18,0.8)";
  ctx.fill();
  ctx.strokeStyle = label === "SPENT" ? "rgba(230,150,120,0.9)" : "rgba(140,220,170,0.9)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = label === "SPENT" ? "#f0b39d" : "#a8e8bf";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + w / 2, y + h / 2 + 0.5);
  ctx.restore();
}

function paintEmpty(ctx, model) {
  const { width, height } = model.geometry;
  const friendly = model.ownerLabel.startsWith("YOUR");
  const accent = friendly ? "#5f89b8" : "#a4596a";
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#131c2b");
  gradient.addColorStop(1, "#080c15");
  ctx.fillStyle = gradient;
  roundedRect(ctx, 3, 3, width - 6, height - 6, 10);
  ctx.fill();

  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  roundedRect(ctx, 7, 7, width - 14, height - 14, 9);
  ctx.stroke();

  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 1;
  roundedRect(ctx, 15, 15, width - 30, height - 30, 7);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(206,220,242,0.62)";
  ctx.font = "600 9px Georgia, serif";
  ctx.fillText(model.ownerLabel, width / 2, 44);

  elementRune(ctx, model.kind === "relic" ? "R" : "V", width / 2, 128, 30, accent);

  ctx.fillStyle = "#dbe6f5";
  ctx.font = "700 14px Georgia, serif";
  ctx.fillText(model.title, width / 2, 200);

  ctx.fillStyle = "rgba(196,210,232,0.75)";
  ctx.font = "400 10.5px Georgia, serif";
  wrapCentred(ctx, model.hint, width / 2, 222, width - 44, 13);

  ctx.fillStyle = "rgba(160,180,206,0.55)";
  ctx.font = "600 8.5px Georgia, serif";
  ctx.fillText(model.kind === "relic" ? "4 PER SEAT" : "4 PER SEAT · FRONT ROW", width / 2, height - 26);
}

function wrapCentred(ctx, text, cx, y, maxWidth, lineHeight) {
  const words = String(text ?? "").split(/\s+/).filter(Boolean);
  let line = "";
  let offset = 0;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, cx, y + offset);
      offset += lineHeight;
      line = word;
    } else {
      line = next;
    }
  }
  if (line) ctx.fillText(line, cx, y + offset);
}

function paintFramed(ctx, model, images) {
  const g = model.geometry;
  ctx.fillStyle = "#151d16";
  roundedRect(ctx, 3, 3, g.width - 6, g.height - 6, 10);
  ctx.fill();
  if (images.art) {
    ctx.save();
    roundedRect(ctx, g.art.x, g.art.y, g.art.w, g.art.h, 4);
    ctx.clip();
    drawCover(ctx, images.art, g.art);
    ctx.restore();
  }
  if (images.overlay) ctx.drawImage(images.overlay, 0, 0, g.width, g.height);
  paintText(ctx, model);
  if (model.selected) {
    ctx.strokeStyle = "#c9a86f";
    ctx.lineWidth = 4;
    roundedRect(ctx, 5, 5, g.width - 10, g.height - 10, 8);
    ctx.stroke();
  }
}

/**
 * Neutral Relic presentation. Not an approved frame: obsidian plate, gold
 * rule, the relic's own artwork and information. Kept visibly distinct from a
 * Vessel so the pending frame is never mistaken for an approval.
 */
function paintNeutral(ctx, model, images) {
  const g = model.geometry;
  const plate = ctx.createLinearGradient(0, 0, 0, g.height);
  plate.addColorStop(0, "#1b2333");
  plate.addColorStop(1, "#0a0f19");
  ctx.fillStyle = plate;
  roundedRect(ctx, 4, 4, g.width - 8, g.height - 8, 9);
  ctx.fill();

  if (images.art) {
    ctx.save();
    roundedRect(ctx, 12, 12, g.width - 24, 150, 5);
    ctx.clip();
    drawCover(ctx, images.art, { x: 12, y: 12, w: g.width - 24, h: 150 });
    ctx.restore();
  }
  ctx.strokeStyle = "#c9a86f";
  ctx.lineWidth = 2;
  roundedRect(ctx, 8, 8, g.width - 16, g.height - 16, 8);
  ctx.stroke();
  ctx.strokeStyle = "rgba(201,168,111,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(24, 178);
  ctx.lineTo(g.width - 24, 178);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = "#f5eeda";
  ctx.font = "700 14px Georgia, serif";
  ctx.fillText(fitText(ctx, model.title, 132), 18, 200);
  ctx.textAlign = "right";
  ctx.fillStyle = "#c9a86f";
  ctx.font = "700 15px Georgia, serif";
  ctx.fillText(String(model.cost ?? ""), g.width - 20, 200);

  ctx.textAlign = "left";
  ctx.fillStyle = "#cbb183";
  ctx.font = "600 9px Georgia, serif";
  ctx.fillText(fitText(ctx, model.typeLine, g.width - 40), 18, 214);

  ctx.fillStyle = "#c3cee0";
  ctx.font = "400 10px Georgia, serif";
  if (model.text) {
    const words = String(model.text).split(/\s+/);
    let line = "";
    let offset = 0;
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > g.width - 40 && line) {
        ctx.fillText(line, 18, 232 + offset);
        offset += 13;
        line = word;
      } else {
        line = next;
      }
      if (offset > 50) break;
    }
    if (line && offset <= 50) ctx.fillText(fitText(ctx, line, g.width - 40), 18, 232 + offset);
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(201,168,111,0.7)";
  ctx.font = "600 8px Georgia, serif";
  ctx.fillText("RELIC · FRAME PENDING", g.width / 2, g.height - 16);
  // Element rune on the art's top-left corner, the slot the approved frames
  // use for their element mark. At (24, 196) it sat on top of the card name.
  elementRune(ctx, model.rune, 30, 30, 9, "#f2dfa0");
  if (model.selected) {
    ctx.strokeStyle = "#f2dfa0";
    ctx.lineWidth = 4;
    roundedRect(ctx, 5, 5, g.width - 10, g.height - 10, 8);
    ctx.stroke();
  }
}

/**
 * Paint one slot face onto a 214x300 canvas context.
 * `images` = { overlay, art } and may be partial while assets load; the call
 * is idempotent so the arena repaints when a late image arrives.
 */
export function paintFace(ctx, model, images = {}) {
  ctx.save();
  ctx.clearRect(0, 0, model.geometry.width, model.geometry.height);
  if (model.empty) paintEmpty(ctx, model);
  else if (model.frameKey) paintFramed(ctx, model, images);
  else paintNeutral(ctx, model, images);
  ctx.restore();
}

/* --------------------------- DOM rendering -------------------------- */

/** Recessed, labelled plate for an empty formation slot. */
export function buildEmptyPlate(slot, model = faceModel(slot), hint = model.hint) {
  const plate = document.createElement("span");
  plate.className = `formation-plate formation-plate-${model.kind}`;
  const owner = document.createElement("span");
  owner.className = "plate-owner";
  owner.textContent = model.ownerLabel;
  const rune = document.createElement("span");
  rune.className = "plate-rune";
  rune.setAttribute("aria-hidden", "true");
  rune.textContent = model.kind === "relic" ? "⬢" : "◆";
  const title = document.createElement("span");
  title.className = "plate-title";
  title.textContent = model.title;
  const hintNode = document.createElement("span");
  hintNode.className = "plate-hint";
  hintNode.textContent = hint;
  plate.append(owner, rune, title, hintNode);
  return plate;
}

/**
 * Contents for one formation slot: a complete approved card face when the slot
 * is occupied, a labelled plate when it is empty. The caller owns the button,
 * its handlers and its accessible name; this only draws the card.
 */
export function buildSlotContents(slot, { base = "./", hint = null } = {}) {
  const model = faceModel(slot);
  if (model.empty) return [buildEmptyPlate(slot, model, hint ?? model.hint)];

  const card = slot.unit
    ? { ...slot.card, attack: slot.unit.attack ?? slot.card.attack, guard: model.kind === "vessel" ? guardText(slot) || slot.card.guard : slot.card.guard }
    : slot.card;
  const face = buildApprovedCard(card, {
    artUri: illustrationDataUri(slot.card),
    effectText: model.text,
    base,
  });
  face.classList.add("formation-face", `formation-face-${model.kind}`);
  if (model.pendingFrame) face.classList.add("is-pending-frame");

  const nodes = [face];
  if (model.status) {
    const status = document.createElement("span");
    status.className = `formation-status is-${model.status.toLowerCase()}`;
    status.textContent = model.status;
    nodes.push(status);
  }
  if (model.guardBroken) {
    const broken = document.createElement("span");
    broken.className = "formation-status is-broken";
    broken.textContent = "GUARD BROKEN";
    nodes.push(broken);
  }
  if (model.pendingFrame) {
    const flag = document.createElement("span");
    flag.className = "formation-pending";
    flag.textContent = "FRAME PENDING";
    flag.title = "Relics have no owner-approved frame yet; this is the neutral presentation, not a Vessel frame.";
    nodes.push(flag);
  }
  return nodes;
}
