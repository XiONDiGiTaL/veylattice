/**
 * Printed card faces.
 *
 * Matches the art-direction reference (a sculpted ornamental frame, serif title,
 * Flux medallion top-right, element and category emblems, inset illustration
 * window, ATTACK/GUARD medallions for units) while every value printed on the
 * card comes from the canonical card definition. Text is rendered as SVG text,
 * not baked into a picture, so a card cannot ship a misspelled name or a stale
 * cost: `tests/card-face.test.js` re-reads the markup and compares it to the
 * catalog.
 *
 * Canvas: 1086 x 2048 (543:1024), the reference proportion. Everything is vector,
 * so any raster size is a render setting rather than a redesign.
 */

import { ELEMENT_LABELS } from "../game/constants.js";
import { cardCopy } from "../game/card-text.js";
import { illustrationSvg, illustrationDataUri } from "./illustration.js";
import { modelFor } from "./models.js";

export const CARD_WIDTH = 1086;
export const CARD_HEIGHT = 2048;

const SERIF = "Georgia, 'Iowan Old Style', 'Times New Roman', serif";
/**
 * Numbers get their own face. Georgia sets old-style (text) figures, where 3, 4,
 * 5, 7 and 9 drop below the baseline — that is why a cost or stat number looked
 * off-centre in its disc. This stack is guaranteed lining figures, and the
 * feature tag asks for them explicitly where the face supports it.
 */
const NUMERIC = "Cambria, 'Palatino Linotype', 'Times New Roman', Times, serif";
const NUMERIC_FEATURES = "font-feature-settings=\"'lnum' 1, 'tnum' 1\" font-variant-numeric=\"lining-nums tabular-nums\"";

/* ------------------------------------------------------------------ *
 * Element materials
 * ------------------------------------------------------------------ */

/**
 * Each element gets a coordinated frame material, not a colour wash: a metal
 * base, a stone inlay, a bright trim and the accent used for glyphs and seams.
 */
const MATERIALS = Object.freeze({
  wood: {
    edge: "#3f2a16", edgeLit: "#6b4a25", plate: "#24301f", plateLit: "#3a4a2c",
    inlay: "#1a2416", trim: "#c8b183", accent: "#8fdc7a", glyph: "#d9f3c2",
    engrave: "rgba(20, 30, 14, 0.55)", swatch: ["#2b3b22", "#16200f"],
  },
  fire: {
    edge: "#3a1512", edgeLit: "#7a2c1e", plate: "#2a1512", plateLit: "#40201a",
    inlay: "#1d0f0e", trim: "#c9a06a", accent: "#ff7a3c", glyph: "#ffd9a8",
    engrave: "rgba(30, 10, 8, 0.6)", swatch: ["#38140f", "#1a0908"],
  },
  earth: {
    edge: "#3b2c1a", edgeLit: "#6f5735", plate: "#2a2318", plateLit: "#3e3423",
    inlay: "#1e1a12", trim: "#c8a86f", accent: "#d8b98a", glyph: "#f0dcb4",
    engrave: "rgba(24, 18, 10, 0.55)", swatch: ["#33291a", "#1c160d"],
  },
  metal: {
    edge: "#2a3442", edgeLit: "#5d6b80", plate: "#222a36", plateLit: "#333d4d",
    inlay: "#161c26", trim: "#aebbcf", accent: "#9ef0ff", glyph: "#e2ecff",
    engrave: "rgba(14, 20, 28, 0.6)", swatch: ["#2b3442", "#161c26"],
  },
  water: {
    edge: "#182f3d", edgeLit: "#2f5f78", plate: "#16262f", plateLit: "#203845",
    inlay: "#0f1a21", trim: "#a8c6cf", accent: "#67d5ff", glyph: "#d8fbff",
    engrave: "rgba(8, 18, 24, 0.6)", swatch: ["#152731", "#0b151b"],
  },
  neutral: {
    edge: "#2b3038", edgeLit: "#525a66", plate: "#22262d", plateLit: "#333941",
    inlay: "#171a20", trim: "#b6bcc6", accent: "#c9d2de", glyph: "#e6ecf5",
    engrave: "rgba(12, 14, 18, 0.6)", swatch: ["#262b32", "#14171c"],
  },
});

const RARITY = Object.freeze({
  common: { gem: "#9aa6b4", ring: 0, label: "COMMON" },
  uncommon: { gem: "#7fd08a", ring: 1, label: "UNCOMMON" },
  rare: { gem: "#7ab8ff", ring: 2, label: "RARE" },
  epic: { gem: "#c99aff", ring: 3, label: "EPIC" },
  mythic: { gem: "#ffc46b", ring: 4, label: "MYTHIC" },
});

function materialsFor(element) {
  return MATERIALS[element] ?? MATERIALS.neutral;
}

/* ------------------------------------------------------------------ *
 * Glyphs
 * ------------------------------------------------------------------ */

/** Element emblem glyphs, drawn inside a circular medallion. */
const ELEMENT_GLYPH = {
  fire: `<path d="M0 -26 C10 -12 18 -6 18 6 C18 18 10 26 0 26 C-10 26 -18 18 -18 5 C-18 -6 -9 -9 -6 -22 C-3 -16 -2 -12 0 -26 Z"/>
         <path d="M0 2 C5 8 7 12 7 17 C7 22 4 25 0 25 C-4 25 -7 22 -7 17 C-7 12 -3 8 0 2 Z" opacity="0.55"/>`,
  water: `<path d="M0 -26 C12 -8 20 2 20 12 C20 21 11 27 0 27 C-11 27 -20 21 -20 12 C-20 2 -12 -8 0 -26 Z"/>
          <path d="M-7 12 C-7 17 -3 21 1 21" fill="none" stroke-width="3" stroke-linecap="round" opacity="0.6"/>`,
  earth: `<path d="M0 -26 L22 -8 L14 24 L-14 24 L-22 -8 Z"/>
          <path d="M0 -26 L8 -4 L0 24 L-8 -4 Z" opacity="0.4"/>`,
  metal: `<path d="M0 -25 L19 -17 L19 8 L0 26 L-19 8 L-19 -17 Z"/>
          <circle cx="0" cy="-2" r="9" fill="none" stroke-width="4" opacity="0.75"/>`,
  wood: `<path d="M0 26 C-16 14 -20 -2 -12 -14 C-6 -23 6 -25 13 -18 C20 -11 18 0 11 4 C5 8 -3 4 -2 -3 C-1 -9 6 -11 9 -6" fill="none" stroke-width="6" stroke-linecap="round"/>`,
};

/** Category/subtype glyph families. The label text always names the subtype. */
const KIND_GLYPH = {
  blade: `<path d="M0 -26 L7 -10 L7 12 L0 20 L-7 12 L-7 -10 Z"/><rect x="-14" y="12" width="28" height="5"/><rect x="-3" y="17" width="6" height="10"/>`,
  staff: `<rect x="-3" y="-16" width="6" height="42" rx="3"/><circle cx="0" cy="-22" r="10" fill="none" stroke-width="5"/>`,
  cog: `<circle cx="0" cy="0" r="14" fill="none" stroke-width="5"/><path d="M0 -26 v8 M0 18 v8 M-26 0 h8 M18 0 h8 M-18 -18 l6 6 M12 12 l6 6 M-18 18 l6 -6 M12 -12 l6 -6" stroke-width="5" stroke-linecap="round"/>`,
  claw: `<path d="M-16 20 C-6 6 -4 -6 -8 -22 M2 22 C10 8 12 -4 9 -20 M-2 20 C-2 8 1 -2 6 -12" fill="none" stroke-width="6" stroke-linecap="round"/>`,
  rune: `<circle cx="0" cy="0" r="22" fill="none" stroke-width="4"/><path d="M0 -14 L0 14 M-11 -6 L11 8 M-11 8 L11 -6" stroke-width="5" stroke-linecap="round"/>`,
  wing: `<path d="M-22 12 C-14 -6 -2 -16 18 -22 C14 -8 14 4 22 12 C6 10 -8 12 -22 20 Z"/>`,
  action: `<path d="M0 -26 L6 -6 L26 0 L6 6 L0 26 L-6 6 L-26 0 L-6 -6 Z"/>`,
  relic: `<path d="M0 -24 L18 -10 L12 20 L0 26 L-12 20 L-18 -10 Z"/><circle cx="0" cy="-2" r="7" fill="none" stroke-width="4"/>`,
};

const SUBTYPE_GLYPH = {
  warrior: "blade", knight: "blade", guardian: "blade", rogue: "blade", archer: "blade",
  mage: "staff", priest: "staff", mystic: "staff", artificer: "cog", construct: "cog",
  beast: "claw", dragon: "claw", demon: "claw", spirit: "rune", ancient: "rune",
  otherworldly: "rune",
};

/** Blade and shield icons for the stat medallions. */
const SWORD_ICON = `<g><path d="M2 -22 L8 -12 L8 12 L2 20 L-4 12 L-4 -12 Z"/><rect x="-14" y="12" width="28" height="6" rx="2"/><rect x="-3" y="18" width="7" height="12" rx="2"/><circle cx="0" cy="32" r="4"/></g>`;
const SHIELD_ICON = `<g><path d="M0 -24 L18 -16 L18 4 C18 16 9 24 0 30 C-9 24 -18 16 -18 4 L-18 -16 Z"/><path d="M0 -14 L10 -9 L10 3 C10 10 5 15 0 19 C-5 15 -10 10 -10 3 L-10 -9 Z" opacity="0.45"/></g>`;

/* ------------------------------------------------------------------ *
 * Text helpers
 * ------------------------------------------------------------------ */

/** Average glyph advance as a fraction of the font size, for a serif face. */
const ADVANCE = 0.5;
/** Bold serif runs wider; titles are fitted with this estimate. */
const ADVANCE_BOLD = 0.58;

/**
 * Largest font size at which `text` still fits `maxWidth`.
 * Card titles must never be clipped or hidden behind the cost medallion.
 */
export function fitFont(text, maxWidth, startSize, minSize = 44, bold = false) {
  const perChar = bold ? ADVANCE_BOLD : ADVANCE;
  let size = startSize;
  while (size > minSize && String(text).length * size * perChar > maxWidth) size -= 2;
  return size;
}

/**
 * Baseline that optically centres digits of `size` in a circle at `cy`.
 * A text box's baseline sits about half a cap height below centre; using the
 * font's metrics here is what stops the cost looking low in its medallion.
 */
function costBaseline(cy, size) {
  // Lining figures sit at roughly 0.68 em above the baseline, so half of that
  // centres the ink, not the em box. (Georgia's old-style 3/4/5/7/9 descend
  // ~0.18 em below the baseline, which is what used to pull costs off-centre.)
  return Number(cy + size * 0.34).toFixed(1);
}

function escapeXml(text) {
  return String(text).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  })[ch]);
}

/**
 * Greedy word wrap against an estimated advance width.
 *
 * SVG has no automatic wrapping, and a card that silently overflows its panel is
 * a production failure, so the caller also gets `overflow` to shrink the type.
 */
export function wrapText(text, maxWidth, fontSize, maxLines = 999) {
  const words = String(text).replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length === 0) return { lines: [], overflow: false };
  const perChar = fontSize * ADVANCE;
  const limit = Math.max(4, Math.floor(maxWidth / perChar));
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= limit || current === "") {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
    if (lines.length > maxLines) break;
  }
  if (current && lines.length <= maxLines) lines.push(current);
  const overflow = lines.length > maxLines || lines.some((line) => line.length > limit + 2);
  return { lines: lines.slice(0, maxLines), overflow };
}

function textBlock(lines, x, y, lineHeight, extra = "") {
  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${(y + index * lineHeight).toFixed(1)}" ${extra}>${escapeXml(line)}</text>`,
    )
    .join("");
}

/* ------------------------------------------------------------------ *
 * Frame pieces
 * ------------------------------------------------------------------ */

function frameMarkup(material, rarity, ids) {
  const mat = materialsFor(material);
  const gem = RARITY[rarity] ?? RARITY.common;
  const rings = gem.ring;
  const corners = [];
  const corner = (cx, cy, sx, sy) =>
    `<g transform="translate(${cx} ${cy}) scale(${sx} ${sy})">
       <path d="M0 74 L0 26 Q0 0 26 0 L74 0" fill="none" stroke="${mat.trim}" stroke-width="7" opacity="0.85"/>
       <circle cx="30" cy="30" r="${9 + rings * 1.6}" fill="${mat.plateLit}" stroke="${mat.trim}" stroke-width="3"/>
       <circle cx="30" cy="30" r="${3.4 + rings}" fill="${gem.gem}" opacity="0.9"/>
     </g>`;
  corners.push(corner(26, 26, 1, 1), corner(CARD_WIDTH - 26, 26, -1, 1));
  corners.push(corner(26, CARD_HEIGHT - 26, 1, -1), corner(CARD_WIDTH - 26, CARD_HEIGHT - 26, -1, -1));

  // Ornamental side studs keep the silhouette identical while materials change.
  const studs = [];
  for (let i = 0; i < 3 + rings; i += 1) {
    const y = 620 + i * 200;
    if (y > CARD_HEIGHT - 240) break;
    studs.push(
      `<g><rect x="18" y="${y}" width="26" height="86" rx="10" fill="${mat.edge}" stroke="${mat.edgeLit}" stroke-width="3"/>
         <circle cx="31" cy="${y + 43}" r="6" fill="${gem.gem}" opacity="0.65"/></g>`,
      `<g><rect x="${CARD_WIDTH - 44}" y="${y}" width="26" height="86" rx="10" fill="${mat.edge}" stroke="${mat.edgeLit}" stroke-width="3"/>
         <circle cx="${CARD_WIDTH - 31}" cy="${y + 43}" r="6" fill="${gem.gem}" opacity="0.65"/></g>`,
    );
  }

  return `
  <rect x="0" y="0" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="46" fill="url(#${ids.bg})"/>
  <rect x="10" y="10" width="${CARD_WIDTH - 20}" height="${CARD_HEIGHT - 20}" rx="40" fill="none" stroke="${mat.edge}" stroke-width="18"/>
  <rect x="26" y="26" width="${CARD_WIDTH - 52}" height="${CARD_HEIGHT - 52}" rx="30" fill="url(#${ids.plate})" stroke="${mat.edgeLit}" stroke-width="5"/>
  <rect x="44" y="44" width="${CARD_WIDTH - 88}" height="${CARD_HEIGHT - 88}" rx="22" fill="none" stroke="${mat.trim}" stroke-width="2.5" opacity="0.55"/>
  ${studs.join("")}
  ${corners.join("")}
  <g opacity="0.9">${categoryBandTexture(mat)}</g>`;
}

function categoryBandTexture(mat) {
  // Engraved lattice on the header strip and footer plate.
  const lines = [];
  for (let x = 70; x < CARD_WIDTH - 70; x += 46) {
    lines.push(`<line x1="${x}" y1="60" x2="${x + 26}" y2="150" stroke="${mat.engrave}" stroke-width="2"/>`);
  }
  return lines.join("");
}

function medallion(cx, cy, r, mat, options = {}) {
  const fill = options.fill ?? "url(#medal)";
  return `
    <circle cx="${cx}" cy="${cy}" r="${r + 8}" fill="${mat.edge}" stroke="${mat.edgeLit}" stroke-width="4"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${mat.trim}" stroke-width="5"/>
    <circle cx="${cx}" cy="${cy}" r="${r - 12}" fill="none" stroke="${mat.accent}" stroke-width="1.6" opacity="0.5"/>`;
}

function elementEmblem(x, y, element, mat, ids) {
  const g = ELEMENT_GLYPH[element] ?? ELEMENT_GLYPH.earth;
  return `<g transform="translate(${x} ${y})">
    ${medallion(0, 0, 58, mat, { fill: `url(#${ids.medal})` })}
    <g fill="${mat.glyph}" stroke="${mat.glyph}" stroke-width="2" stroke-linejoin="round" transform="scale(1.25)">${g}</g>
  </g>
  <g transform="translate(${x} ${y + 78})">
    <rect x="-72" y="-20" width="144" height="40" rx="9" fill="${mat.inlay}" stroke="${mat.trim}" stroke-width="2" opacity="0.95"/>
    <text x="0" y="10" text-anchor="middle" font-family="${SERIF}" font-size="25" letter-spacing="3" fill="${mat.glyph}">${escapeXml(
      (ELEMENT_LABELS[element] ?? element).toUpperCase(),
    )}</text>
  </g>`;
}

function kindEmblem(x, y, card, mat, ids) {
  const key = card.category === "action" ? "action" : card.category === "relic" ? "relic" : SUBTYPE_GLYPH[card.subtypes?.[0]] ?? "rune";
  const glyph = KIND_GLYPH[key] ?? KIND_GLYPH.rune;
  const label =
    card.category === "vessel"
      ? String(card.subtypes?.[0] ?? "vessel").toUpperCase()
      : card.category.toUpperCase();
  return `<g transform="translate(${x} ${y})">
    ${medallion(0, 0, 58, mat, { fill: `url(#${ids.medal})` })}
    <g fill="${mat.glyph}" stroke="${mat.glyph}" stroke-width="2" stroke-linejoin="round" transform="scale(1.05)">${glyph}</g>
  </g>
  <g transform="translate(${x} ${y + 78})">
    <rect x="-74" y="-20" width="148" height="40" rx="9" fill="${mat.inlay}" stroke="${mat.trim}" stroke-width="2" opacity="0.95"/>
    <text x="0" y="10" text-anchor="middle" font-family="${SERIF}" font-size="25" letter-spacing="3" fill="${mat.glyph}">${escapeXml(label)}</text>
  </g>`;
}

/* ------------------------------------------------------------------ *
 * Sections
 * ------------------------------------------------------------------ */

function illustrationMarkup(card, mat, options = {}) {
  if (options.placeholderArt) {
    const w = CARD_WIDTH - 184;
    return `<g>
      <rect x="84" y="312" width="${w + 16}" height="716" rx="16" fill="${mat.edge}" stroke="${mat.edgeLit}" stroke-width="4"/>
      <rect x="92" y="320" width="${w}" height="700" rx="10" fill="${mat.inlay}"/>
      <g opacity="0.35" stroke="${mat.accent}" stroke-width="2">
        ${Array.from({ length: 18 }, (_, i) => `<line x1="${92 + i * 50}" y1="1020" x2="${142 + i * 50}" y2="320"/>`).join("")}
      </g>
      <text x="${CARD_WIDTH / 2}" y="680" text-anchor="middle" font-family="${SERIF}" font-size="54" letter-spacing="10" fill="${mat.glyph}" opacity="0.8">ILLUSTRATION</text>
      <text x="${CARD_WIDTH / 2}" y="740" text-anchor="middle" font-family="${SERIF}" font-size="28" letter-spacing="4" fill="${mat.glyph}" opacity="0.5">1086 × 2048 · 543:1024</text>
    </g>`;
  }
  const art = illustrationSvg(card);
  const window = { x: 92, y: 320, w: CARD_WIDTH - 184, h: 700 };
  // The illustration is embedded as a nested SVG cropped to the window: the card
  // art and the battlefield art stay literally the same asset.
  const inner = art
    .replace(/^<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "");
  return `
  <g>
    <rect x="${window.x - 8}" y="${window.y - 8}" width="${window.w + 16}" height="${window.h + 16}" rx="16" fill="${mat.edge}" stroke="${mat.edgeLit}" stroke-width="4"/>
    <clipPath id="art-clip-${card.id}">
      <rect x="${window.x}" y="${window.y}" width="${window.w}" height="${window.h}" rx="10"/>
    </clipPath>
    <g clip-path="url(#art-clip-${card.id})">
      <svg x="${window.x}" y="${window.y}" width="${window.w}" height="${window.h}" viewBox="0 0 400 310" preserveAspectRatio="xMidYMid slice">${inner}</svg>
    </g>
    <rect x="${window.x}" y="${window.y}" width="${window.w}" height="${window.h}" rx="10" fill="none" stroke="${mat.trim}" stroke-width="3" opacity="0.75"/>
  </g>`;
}

function statMedallion(cx, cy, value, label, icon, mat, ids) {
  // Four separate zones so nothing collides at thumbnail size: the icon badge at
  // the top of the disc, an engraved rule, the number in the lower half, and the
  // label outside the medallion. The number is drawn twice — a wide dark halo,
  // then a white face with a thin dark keyline — because a single outline is not
  // enough over a bright metal medallion.
  const digits = String(value);
  const size = digits.length > 1 ? 86 : 96;
  const baseline = 78;
  return `<g transform="translate(${cx} ${cy})">
    ${medallion(0, 0, 112, mat, { fill: `url(#${ids.medal})` })}
    <circle cx="0" cy="-66" r="38" fill="${mat.inlay}" stroke="${mat.accent}" stroke-width="2.5" opacity="0.95"/>
    <g transform="translate(0 -66) scale(0.92)" fill="${mat.glyph}" stroke="${mat.glyph}" stroke-width="1.8" stroke-linejoin="round">${icon}</g>
    <path d="M-54 -20 H54" stroke="${mat.trim}" stroke-width="2.5" opacity="0.75"/>
    <circle cx="-54" cy="-20" r="3" fill="${mat.accent}" opacity="0.8"/>
    <circle cx="54" cy="-20" r="3" fill="${mat.accent}" opacity="0.8"/>
    <text x="0" y="${baseline}" text-anchor="middle" font-family="${NUMERIC}" ${NUMERIC_FEATURES} font-size="${size}" font-weight="700"
      fill="${mat.inlay}" stroke="${mat.inlay}" stroke-width="18" stroke-linejoin="round" opacity="0.85">${escapeXml(digits)}</text>
    <text x="0" y="${baseline}" text-anchor="middle" font-family="${NUMERIC}" ${NUMERIC_FEATURES} font-size="${size}" font-weight="700"
      fill="#ffffff" stroke="${mat.inlay}" stroke-width="4" paint-order="stroke" stroke-linejoin="round">${escapeXml(digits)}</text>
  </g>
  <g transform="translate(${cx} ${cy + 152})">
    <rect x="-62" y="-23" width="124" height="44" rx="10" fill="${mat.inlay}" stroke="${mat.trim}" stroke-width="2" opacity="0.95"/>
    <text x="0" y="9" text-anchor="middle" font-family="${SERIF}" font-size="24" letter-spacing="3.5" fill="${mat.glyph}">${label}</text>
  </g>`;
}

function statBar(card, mat, ids) {
  const y = 1092;
  return `
  <g>
    ${statMedallion(154, y, card.attack, "ATTACK", SWORD_ICON, mat, ids)}
    ${statMedallion(CARD_WIDTH - 154, y, card.guard, "GUARD", SHIELD_ICON, mat, ids)}
    <g transform="translate(${CARD_WIDTH / 2} ${y})">
      <rect x="-176" y="-46" width="352" height="92" rx="40" fill="${mat.inlay}" stroke="${mat.trim}" stroke-width="3"/>
      <path d="M-176 -18 h352" stroke="${mat.engrave}" stroke-width="2"/>
      <path d="M-176 18 h352" stroke="${mat.engrave}" stroke-width="2"/>
      <text x="0" y="12" text-anchor="middle" font-family="${SERIF}" font-size="30" letter-spacing="4" fill="${mat.glyph}" opacity="0.9">COMBAT</text>
    </g>
  </g>
  <g transform="translate(${CARD_WIDTH / 2} ${y + 122})">
    <rect x="-190" y="-26" width="380" height="52" rx="12" fill="${mat.plate}" stroke="${mat.edgeLit}" stroke-width="2"/>
    <text x="0" y="9" text-anchor="middle" font-family="${SERIF}" font-size="24" letter-spacing="3" fill="${mat.glyph}" opacity="0.85">
      MOVEMENT ${card.movement}  ·  RANGE ${card.range}
    </text>
  </g>`;
}

function categoryBand(card, mat) {
  const y = 1092;
  const label = card.category === "action" ? "ACTION" : "RELIC";
  return `
  <g transform="translate(${CARD_WIDTH / 2} ${y - 20})">
    <path d="M-420 0 H-140" stroke="${mat.trim}" stroke-width="4"/>
    <path d="M140 0 H420" stroke="${mat.trim}" stroke-width="4"/>
    <circle cx="-140" cy="0" r="12" fill="${mat.accent}" opacity="0.8"/>
    <circle cx="140" cy="0" r="12" fill="${mat.accent}" opacity="0.8"/>
  </g>
  <g transform="translate(${CARD_WIDTH / 2} ${y + 40})">
    <rect x="-250" y="-40" width="500" height="80" rx="40" fill="${mat.inlay}" stroke="${mat.trim}" stroke-width="3"/>
    <text x="0" y="15" text-anchor="middle" font-family="${SERIF}" font-size="46" font-weight="700" letter-spacing="12" fill="${mat.glyph}">${label}</text>
  </g>
  <text x="${CARD_WIDTH / 2}" y="${y + 150}" text-anchor="middle" font-family="${SERIF}" font-size="22" letter-spacing="3" fill="${mat.glyph}" opacity="0.55">
    ELEMENTALLY RESOLVED · NO COMBAT STATISTICS
  </text>`;
}

function textPanel(card, mat, copy) {
  const top = card.category === "vessel" ? 1300 : 1300;
  const width = CARD_WIDTH - 184;
  const x = 92;
  const padX = 54;
  const innerWidth = width - padX * 2;
  const hasFlavor = Boolean(copy.flavor);
  const rulesFont = card.category === "vessel" ? 42 : 44;
  const maxLines = hasFlavor ? 6 : 8;
  let rules = wrapText(copy.rules, innerWidth, rulesFont, maxLines);
  let font = rulesFont;
  // Shrink before clipping: unreadable type is a production failure too.
  while (rules.overflow && font > 30) {
    font -= 2;
    rules = wrapText(copy.rules, innerWidth, font, maxLines);
  }
  const lineHeight = Math.round(font * 1.35);
  const rulesHeight = Math.max(lineHeight, rules.lines.length * lineHeight);
  const flavorFont = 34;
  const flavor = hasFlavor ? wrapText(copy.flavor, innerWidth, flavorFont, 4) : { lines: [] };
  const flavorLineHeight = Math.round(flavorFont * 1.4);
  const separatorY = top + 100 + rulesHeight + 34;
  const panelHeight = Math.max(430, 190 + rulesHeight + (hasFlavor ? flavor.lines.length * flavorLineHeight + 60 : 0));

  return `
  <g>
    <rect x="${x}" y="${top}" width="${width}" height="${panelHeight}" rx="18" fill="${mat.inlay}" stroke="${mat.trim}" stroke-width="3.5"/>
    <rect x="${x + 10}" y="${top + 10}" width="${width - 20}" height="${panelHeight - 20}" rx="14" fill="none" stroke="${mat.engrave}" stroke-width="2"/>
    ${textBlock(
      rules.lines,
      x + padX,
      top + 92,
      lineHeight,
      `font-family="${SERIF}" font-size="${font}" fill="#f4efe4"`,
    )}
    ${
      hasFlavor
        ? `<line x1="${x + padX}" y1="${separatorY}" x2="${x + width - padX}" y2="${separatorY}" stroke="${mat.trim}" stroke-width="2" opacity="0.6"/>
           ${textBlock(
             flavor.lines,
             x + padX,
             separatorY + 54,
             flavorLineHeight,
             `font-family="${SERIF}" font-size="${flavorFont}" font-style="italic" fill="#cfc6b4"`,
           )}`
        : ""
    }
  </g>`;
}

function plateMarkup(card, mat) {
  const gem = RARITY[card.rarity] ?? RARITY.common;
  return `
  <g transform="translate(${CARD_WIDTH / 2} ${CARD_HEIGHT - 112})">
    <rect x="-300" y="-30" width="600" height="60" rx="16" fill="${mat.plate}" stroke="${mat.edgeLit}" stroke-width="3"/>
    <path d="M-300 0 h600" stroke="${mat.engrave}" stroke-width="1.5" opacity="0.7"/>
    <g transform="translate(-96 0)">
      <path d="M0 -15 L13 -6 L9 13 L0 19 L-9 13 L-13 -6 Z" fill="${gem.gem}" opacity="0.9"/>
      <circle cx="0" cy="1" r="4" fill="#0b0f16" opacity="0.55"/>
    </g>
    <text x="16" y="9" text-anchor="middle" font-family="${SERIF}" font-size="26" letter-spacing="6" fill="${mat.glyph}" opacity="0.85">${gem.label}</text>
  </g>`;
}

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

/**
 * Full printed card face for one canonical card definition.
 * @returns {string} standalone SVG markup at 1086x2048
 */
export function cardFaceSvg(card, options = {}) {
  if (!card || !card.id) throw new Error("cardFaceSvg needs a card definition.");
  const element = card.category === "vessel" ? card.element : card.element ?? "neutral";
  const mat = materialsFor(element);
  const copy = cardCopy(card);
  const headline =
    card.category === "vessel"
      ? `Element: ${ELEMENT_LABELS[card.element] ?? card.element} / ${titleCase(card.subtypes?.[0] ?? "vessel")} Vessel`
      : `Element: ${ELEMENT_LABELS[card.element] ?? card.element ?? "Neutral"} / ${copy.categoryLabel}`;
  const cost = String(card.cost);
  // Ids are namespaced per card: several faces can share a page (roster, QA sheet)
  // without inheriting the first card's gradients.
  const ids = {
    bg: `cf-bg-${card.id}`,
    plate: `cf-plate-${card.id}`,
    medal: `cf-medal-${card.id}`,
    title: `cf-title-${card.id}`,
  };
  const titleSize = fitFont(card.name, 700, 88, 44, true);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" class="card-face" role="img" aria-label="${escapeXml(
    `${card.name}, ${ELEMENT_LABELS[card.element] ?? card.element ?? "neutral"} ${copy.categoryLabel}, cost ${cost}${
      card.category === "vessel" ? `, Attack ${card.attack}, Guard ${card.guard}` : ""
    }`,
  )}">
  <defs>
    <linearGradient id="${ids.bg}" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="${mat.swatch[0]}"/>
      <stop offset="1" stop-color="${mat.swatch[1]}"/>
    </linearGradient>
    <linearGradient id="${ids.plate}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${mat.plateLit}"/>
      <stop offset="0.5" stop-color="${mat.plate}"/>
      <stop offset="1" stop-color="${mat.inlay}"/>
    </linearGradient>
    <radialGradient id="${ids.medal}" cx="0.35" cy="0.3" r="0.8">
      <stop offset="0" stop-color="${mat.plateLit}"/>
      <stop offset="0.62" stop-color="${mat.plate}"/>
      <stop offset="1" stop-color="${mat.edge}"/>
    </radialGradient>
    <linearGradient id="${ids.title}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#dddddd"/>
    </linearGradient>
  </defs>
  ${frameMarkup(element, card.rarity, ids)}

  <!-- header -->
  <g>
    <rect x="70" y="62" width="770" height="128" rx="18" fill="${mat.inlay}" stroke="${mat.trim}" stroke-width="3" opacity="0.95"/>
    <text x="108" y="152" font-family="${SERIF}" font-size="${titleSize}" font-weight="700" fill="url(#${ids.title})" letter-spacing="1">${escapeXml(
      card.name,
    )}</text>
  </g>
  <g>
    <rect x="70" y="206" width="${CARD_WIDTH - 140}" height="66" rx="12" fill="${mat.plate}" stroke="${mat.edgeLit}" stroke-width="2.5"/>
    <text x="104" y="250" font-family="${SERIF}" font-size="34" fill="${mat.glyph}" letter-spacing="1.2">${escapeXml(headline)}</text>
  </g>
  <g>
    ${medallion(CARD_WIDTH - 118, 128, 104, mat, { fill: `url(#${ids.medal})` })}
    <g transform="translate(${CARD_WIDTH - 118} 128)">
      <circle cx="0" cy="0" r="86" fill="${mat.inlay}" opacity="0.55"/>
      <circle cx="0" cy="0" r="86" fill="none" stroke="${mat.accent}" stroke-width="1.5" opacity="0.45"/>
      <text x="0" y="${costBaseline(0, cost.length > 1 ? 104 : 118)}" text-anchor="middle" font-family="${NUMERIC}" ${NUMERIC_FEATURES} font-size="${
        cost.length > 1 ? 104 : 118
      }" font-weight="700" fill="${mat.inlay}" stroke="${mat.inlay}" stroke-width="20" stroke-linejoin="round" opacity="0.8">${escapeXml(
        cost,
      )}</text>
      <text x="0" y="${costBaseline(0, cost.length > 1 ? 104 : 118)}" text-anchor="middle" font-family="${NUMERIC}" ${NUMERIC_FEATURES} font-size="${
        cost.length > 1 ? 104 : 118
      }" font-weight="700" fill="#ffffff" stroke="${mat.inlay}" stroke-width="4.5" paint-order="stroke" stroke-linejoin="round">${escapeXml(
        cost,
      )}</text>
    </g>
  </g>

  <!-- illustration and emblems -->
  ${illustrationMarkup(card, mat, options)}
  ${elementEmblem(172, 404, element, mat, ids)}
  ${kindEmblem(CARD_WIDTH - 172, 404, card, mat, ids)}

  <!-- stats or category band -->
  ${card.category === "vessel" ? statBar(card, mat, ids) : categoryBand(card, mat)}

  <!-- rules and flavour -->
  ${textPanel(card, mat, copy)}
  ${plateMarkup(card, mat)}
</svg>`;
}

/** Data URI for CSS/img use in the game and in previews. */
export function cardFaceDataUri(card) {
  const svg = cardFaceSvg(card).replace(/\s+/g, " ").trim();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function titleCase(text) {
  return String(text).replace(/^./, (c) => c.toUpperCase());
}

/** Values a QA pass compares against the catalog. */
export function cardFaceFacts(card) {
  return {
    id: card.id,
    name: card.name,
    category: card.category,
    element: card.element ?? null,
    subtype: card.subtypes?.[0] ?? null,
    rarity: card.rarity,
    cost: card.cost,
    attack: card.category === "vessel" ? card.attack : null,
    guard: card.category === "vessel" ? card.guard : null,
    movement: card.category === "vessel" ? card.movement : null,
    range: card.category === "vessel" ? card.range : null,
    rules: cardCopy(card).rules,
    flavor: card.flavorText ?? "",
    modelId: card.category === "vessel" ? modelFor(card.id)?.id ?? null : null,
    art: illustrationDataUri(card).length,
  };
}
