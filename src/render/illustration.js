/**
 * Card illustration pipeline.
 *
 * A Vessel's card art is not a separate asset: it is a projection of the same
 * `VOXEL_MODELS` definition the battlefield renders. That is the point. If a
 * model gains a weapon, a horn or a different building material, the card art
 * changes with it, so the illustrated character and the playable model cannot
 * drift apart.
 *
 * Everything here is deterministic (seeded from the card id) and pure: it
 * returns SVG markup, never touches the DOM, and is safe to call in tests.
 *
 * Layers, back to front:
 *   sky → distant ridges → horizon haze → ground → poster light → model →
 *   contact shadow → element motes → rarity treatment → vignette
 */

import { modelFor, modelHeight } from "./models.js";
import { sceneryFor, sceneMarkup, foregroundMarkup } from "./scenery.js";

/** Card art canvas. A 20:13 window reads as an illustration, not an icon. */
const W = 400;
const H = 310;

/* ------------------------------------------------------------------ *
 * Small deterministic helpers
 * ------------------------------------------------------------------ */

function hashString(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** mulberry32: identical output for identical seeds, on every platform. */
function rngFrom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function parseHex(hex) {
  const clean = String(hex).replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const int = Number.parseInt(full, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function toHex(rgb) {
  return `#${rgb
    .map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

/** Multiply a colour by a light factor, keeping it inside the sRGB gamut. */
function shade(hex, factor, tint) {
  const [r, g, b] = parseHex(hex);
  const mixed = tint ? [mix(r, tint[0], 0.18), mix(g, tint[1], 0.18), mix(b, tint[2], 0.18)] : [r, g, b];
  return toHex(mixed.map((v) => v * factor));
}

/** Push a colour toward its element's glow, used for rim light. */
function rim(hex, glow, amount = 0.35) {
  const [r, g, b] = parseHex(hex);
  const [gr, gg, gb] = parseHex(glow);
  return toHex([mix(r, gr, amount), mix(g, gg, amount), mix(b, gb, amount)]);
}

function alpha(hex, opacity) {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${Number(opacity.toFixed(3))})`;
}

/* ------------------------------------------------------------------ *
 * Tiny orthographic renderer
 * ------------------------------------------------------------------ */

/** Yaw/pitch of the "poster" camera: three-quarter, slightly above eye level. */
const CAMERA = Object.freeze({ yaw: 0.52, pitch: 0.13 });

/** Key light: high, from the left of frame, slightly in front. */
const LIGHT = Object.freeze((() => {
  const [x, y, z] = [-0.46, 0.82, 0.34];
  const length = Math.hypot(x, y, z);
  return [x / length, y / length, z / length];
})());

function projectPoint(point, camera) {
  const [x, y, z] = point;
  const cosYaw = Math.cos(camera.yaw);
  const sinYaw = Math.sin(camera.yaw);
  const x1 = x * cosYaw + z * sinYaw;
  const z1 = -x * sinYaw + z * cosYaw;
  const cosPitch = Math.cos(camera.pitch);
  const sinPitch = Math.sin(camera.pitch);
  const y2 = y * cosPitch - z1 * sinPitch;
  const z2 = y * sinPitch + z1 * cosPitch;
  return [x1, y2, z2];
}

/** Rotate a local offset by the part's own ry/rz, matching the CSS model. */
function rotateLocal(offset, part) {
  let [x, y, z] = offset;
  if (part.ry) {
    const a = (part.ry * Math.PI) / 180;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const nx = x * cos + z * sin;
    const nz = -x * sin + z * cos;
    x = nx;
    z = nz;
  }
  if (part.rz) {
    const a = (part.rz * Math.PI) / 180;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const nx = x * cos - y * sin;
    const ny = x * sin + y * cos;
    x = nx;
    y = ny;
  }
  return [x, y, z];
}

const FACE_DEFS = [
  { key: "front", normal: [0, 0, 1], corners: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]] },
  { key: "back", normal: [0, 0, -1], corners: [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]] },
  { key: "right", normal: [1, 0, 0], corners: [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]] },
  { key: "left", normal: [-1, 0, 0], corners: [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]] },
  { key: "top", normal: [0, 1, 0], corners: [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]] },
  { key: "bottom", normal: [0, -1, 0], corners: [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]] },
];

/**
 * Project one voxel box and return its visible, shaded faces in model space.
 * `y` is the bottom of the box, exactly as the CSS renderer reads it.
 */
function boxFaces(part, palette, glow) {
  const half = [part.w / 2, part.h / 2, part.d / 2];
  const centre = [part.x, part.y + part.h / 2, part.z];
  const colour = palette[part.c] ?? part.c ?? "#888888";
  const faces = [];

  for (const face of FACE_DEFS) {
    const normal = rotateLocal(face.normal, part);
    const rotated = projectPoint(normal, CAMERA);
    if (rotated[2] <= 0.02) continue;
    const points = [];
    let depth = 0;
    for (const corner of face.corners) {
      const local = rotateLocal(
        [corner[0] * half[0], corner[1] * half[1], corner[2] * half[2]],
        part,
      );
      const world = [centre[0] + local[0], centre[1] + local[1], centre[2] + local[2]];
      const projected = projectPoint(world, CAMERA);
      points.push(projected);
      depth += projected[2];
    }
    const lit = Math.max(0, normal[0] * LIGHT[0] + normal[1] * LIGHT[1] + normal[2] * LIGHT[2]);
    // Materials keep their identity: metal catches a hard highlight, crystal
    // glows from inside, cloth stays matte.
    let factor = 0.52 + lit * 0.72;
    if (part.m === "metal") factor = 0.44 + lit * 0.95;
    if (part.m === "crystal") factor = 0.66 + lit * 0.5;
    if (part.m === "glass") factor = 0.58 + lit * 0.62;
    if (part.m === "ember" || part.m === "glow") factor = 0.95 + lit * 0.25;
    faces.push({
      points,
      depth: depth / 4,
      fill: shade(colour, factor),
      edge: part.m === "crystal" || part.m === "ember" || part.m === "glow"
        ? rim(colour, glow, 0.45)
        : null,
      opacity: part.m === "glass" ? 0.82 : 1,
    });
  }
  return faces;
}

/**
 * Render a model into SVG polygons fitted to the frame.
 * Returns markup plus the projected footprint, which the scene uses to place
 * the contact shadow and the ground line under the character.
 */
function renderModel(model, options = {}) {
  const target = options.target ?? { left: 92, right: 308, top: 32, bottom: 214 };
  const palette = model.palette ?? ELEMENT_PALETTES[model.element] ?? ELEMENT_PALETTES.metal;
  const glow = palette.glow ?? "#ffffff";

  const faces = [];
  for (const part of model.parts) faces.push(...boxFaces(part, palette, glow));

  // Fit: project every corner, then scale/translate into the target window.
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const face of faces) {
    for (const [x, y] of face.points) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  const spanX = Math.max(0.001, maxX - minX);
  const spanY = Math.max(0.001, maxY - minY);
  const scale = Math.min(
    (target.right - target.left) / spanX,
    (target.bottom - target.top) / spanY,
  );
  const offsetX = target.left + ((target.right - target.left) - spanX * scale) / 2 - minX * scale;
  // Projected Y is up-positive while SVG Y grows downward: the tallest corner
  // maps to the top of the window, the lowest to the ground line.
  const offsetY = target.top + maxY * scale;

  // Painter's algorithm across the whole model, not per box: overlapping
  // weapons and capes must layer correctly.
  faces.sort((a, b) => a.depth - b.depth);

  const polygons = faces
    .map((face) => {
      const projected = face.points.map(([x, y]) => [x * scale + offsetX, y * -scale + offsetY]);
      const points = projected.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
      // Edge strokes on a five-pixel facet cost bytes and read as noise; keep
      // them only where the face is large enough for the outline to matter.
      const xs = projected.map(([x]) => x);
      const ys = projected.map(([, y]) => y);
      const area = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
      const edges = face.edge && area >= 9
        ? ` stroke="${face.edge}" stroke-width="0.8" stroke-opacity="0.75"`
        : "";
      const opacity = face.opacity < 1 ? ` fill-opacity="${face.opacity}"` : "";
      return `<polygon points="${points}" fill="${face.fill}"${edges}${opacity}/>`;
    })
    .join("");

  const footprint = {
    left: target.left,
    right: target.right,
    baseline: target.bottom,
    centreX: (target.left + target.right) / 2,
    height: spanY * scale,
  };
  return { markup: `<g class="art-figure">${polygons}</g>`, footprint };
}

/* ------------------------------------------------------------------ *
 * Environment
 * ------------------------------------------------------------------ */

/**
 * The scene behind the figure lives in `scenery.js`: one environment per
 * element, each with its own architecture, floor and weather, seeded per card
 * so two cards of the same element are staged differently.
 */

function motesMarkup(card, env, random, count) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const x = random() * W;
    const y = 30 + random() * (H - 60);
    const size = 1 + random() * (card.rarity === "mythic" ? 3.2 : 2);
    const drift = 0.35 + random() * 0.5;
    out.push(
      `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${size.toFixed(1)}" fill="${alpha(env.horizon, drift)}"/>`,
    );
  }
  return out.join("");
}

const RARITY_RANK = { common: 0, uncommon: 1, rare: 2, epic: 3, mythic: 4 };

function rarityMarkup(card, env, random) {
  const rank = RARITY_RANK[card.rarity] ?? 0;
  if (rank < 1) return "";
  const out = [];
  const arcs = rank >= 3 ? 3 : rank;
  for (let i = 0; i < arcs; i += 1) {
    const radius = 96 + i * 16;
    const start = random() * Math.PI * 2;
    const span = 0.5 + random() * 0.7;
    const x1 = W / 2 + Math.cos(start) * radius;
    const y1 = 150 + Math.sin(start) * radius * 0.5;
    const x2 = W / 2 + Math.cos(start + span) * radius;
    const y2 = 150 + Math.sin(start + span) * radius * 0.5;
    out.push(
      `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} A ${radius} ${(radius * 0.5).toFixed(1)} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="${alpha(env.horizon, 0.18 + rank * 0.05)}" stroke-width="${1 + rank * 0.35}"/>`,
    );
  }
  if (rank >= 3) {
    out.push(
      `<ellipse cx="${W / 2}" cy="150" rx="150" ry="86" fill="none" stroke="${alpha(env.horizon, 0.14)}" stroke-width="1"/>`,
    );
  }
  return out.join("");
}

/* ------------------------------------------------------------------ *
 * Action and Relic scenes
 * ------------------------------------------------------------------ */

/** One glyph family per effect kind, so the emblem states what the card does. */
const EFFECT_GLYPHS = {
  damage: (c) => `
    <path d="M150 150 L250 66" stroke="${c}" stroke-width="9" stroke-linecap="round" opacity="0.9"/>
    <path d="M176 168 L262 96" stroke="${c}" stroke-width="5" stroke-linecap="round" opacity="0.65"/>
    <path d="M128 128 L214 58" stroke="${c}" stroke-width="3" stroke-linecap="round" opacity="0.5"/>`,
  damageAll: (c) => `
    <circle cx="200" cy="122" r="58" fill="none" stroke="${c}" stroke-width="4" opacity="0.8"/>
    <circle cx="200" cy="122" r="84" fill="none" stroke="${c}" stroke-width="2" opacity="0.5"/>
    ${[0, 60, 120, 180, 240, 300]
      .map((deg) => {
        const a = (deg * Math.PI) / 180;
        return `<path d="M${200 + Math.cos(a) * 26} ${122 + Math.sin(a) * 26} L${200 + Math.cos(a) * 60} ${122 + Math.sin(a) * 60}" stroke="${c}" stroke-width="5" stroke-linecap="round" opacity="0.75"/>`;
      })
      .join("")}`,
  heal: (c) => `
    <path d="M200 68 C232 104 244 122 244 140 a44 44 0 0 1 -88 0 c0 -18 12 -36 44 -72 Z" fill="none" stroke="${c}" stroke-width="5" opacity="0.9"/>
    <path d="M200 96 v58 M172 126 h56" stroke="${c}" stroke-width="6" stroke-linecap="round" opacity="0.8"/>`,
  buff: (c) => `
    <path d="M200 62 L246 96 L228 166 L172 166 L154 96 Z" fill="none" stroke="${c}" stroke-width="5" opacity="0.85"/>
    <path d="M200 88 v54 M176 112 h48" stroke="${c}" stroke-width="7" stroke-linecap="round" opacity="0.75"/>`,
  draw: (c) => `
    ${[-16, 0, 16]
      .map(
        (rot) =>
          `<rect x="176" y="74" width="52" height="82" rx="8" transform="rotate(${rot} 202 115)" fill="none" stroke="${c}" stroke-width="4" opacity="0.8"/>`,
      )
      .join("")}
    <path d="M202 100 v44 M188 132 l14 14 14 -14" stroke="${c}" stroke-width="4" fill="none" opacity="0.85"/>`,
  nexusDamage: (c) => `
    <path d="M200 54 L214 104 L200 154 L186 104 Z" fill="none" stroke="${c}" stroke-width="5" opacity="0.9"/>
    <path d="M132 170 h136" stroke="${c}" stroke-width="6" stroke-linecap="round" opacity="0.7"/>
    <path d="M158 154 l84 -84" stroke="${c}" stroke-width="3" opacity="0.55"/>`,
  nexusHeal: (c) => `
    <path d="M200 60 L232 96 v58 a32 32 0 0 1 -64 0 V96 Z" fill="none" stroke="${c}" stroke-width="5" opacity="0.85"/>
    <path d="M200 96 v48 M182 118 h36" stroke="${c}" stroke-width="5" stroke-linecap="round" opacity="0.8"/>`,
  drain: (c) => `
    <path d="M148 92 a52 52 0 1 1 104 0" fill="none" stroke="${c}" stroke-width="5" opacity="0.85"/>
    <path d="M200 144 v46 M186 176 l14 14 14 -14" stroke="${c}" stroke-width="5" fill="none" opacity="0.8"/>`,
  stun: (c) => `
    <circle cx="200" cy="120" r="56" fill="none" stroke="${c}" stroke-width="4" opacity="0.8" stroke-dasharray="16 12"/>
    <path d="M168 88 l64 64 M232 88 l-64 64" stroke="${c}" stroke-width="5" stroke-linecap="round" opacity="0.75"/>`,
  revive: (c) => `
    <path d="M200 170 v-52" stroke="${c}" stroke-width="5" opacity="0.8"/>
    <circle cx="200" cy="96" r="34" fill="none" stroke="${c}" stroke-width="5" opacity="0.85"/>
    <path d="M200 62 v-6 M200 136 v6 M166 96 h-6 M240 96 h6" stroke="${c}" stroke-width="4" stroke-linecap="round" opacity="0.7"/>`,
  ready: (c) => `
    <path d="M200 158 v-72 M200 86 l-22 26 M200 86 l22 26" stroke="${c}" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.9"/>
    <circle cx="200" cy="168" r="10" fill="${c}" opacity="0.7"/>`,
  flux: (c) => `
    <circle cx="200" cy="118" r="46" fill="none" stroke="${c}" stroke-width="4" opacity="0.8"/>
    <circle cx="200" cy="118" r="16" fill="${c}" opacity="0.75"/>
    <path d="M200 44 v20 M200 172 v20 M126 118 h20 M254 118 h20" stroke="${c}" stroke-width="4" stroke-linecap="round" opacity="0.6"/>`,
  attackAura: (c) => `
    <path d="M200 60 L252 90 v56 L200 176 L148 146 V90 Z" fill="none" stroke="${c}" stroke-width="4" opacity="0.8"/>
    <path d="M176 140 L224 92 M224 96 v-4 h-4" stroke="${c}" stroke-width="5" stroke-linecap="round" opacity="0.75"/>`,
  armorAura: (c) => `
    <path d="M200 58 L250 82 v56 a52 52 0 0 1 -50 40 a52 52 0 0 1 -50 -40 V82 Z" fill="none" stroke="${c}" stroke-width="5" opacity="0.85"/>
    <path d="M200 92 v56" stroke="${c}" stroke-width="4" opacity="0.6"/>`,
  mendAura: (c) => `
    <circle cx="200" cy="118" r="58" fill="none" stroke="${c}" stroke-width="4" opacity="0.75"/>
    <circle cx="200" cy="118" r="34" fill="none" stroke="${c}" stroke-width="3" opacity="0.6"/>
    <path d="M200 100 v34 M184 118 h32" stroke="${c}" stroke-width="6" stroke-linecap="round" opacity="0.85"/>`,
  guardAura: (c) => `
    <path d="M200 54 L240 74 v46 L200 168 L160 120 V74 Z" fill="none" stroke="${c}" stroke-width="5" opacity="0.85"/>
    <path d="M200 78 L222 92 v28 L200 140 L178 120 V92 Z" fill="${c}" opacity="0.35"/>`,
  wardAura: (c) => `
    ${[70, 46, 24]
      .map(
        (r) =>
          `<circle cx="200" cy="118" r="${r}" fill="none" stroke="${c}" stroke-width="${r > 50 ? 2 : 4}" opacity="${r > 50 ? 0.45 : 0.85}"/>`,
      )
      .join("")}`,
  swiftAura: (c) => `
    <path d="M150 100 h60 l-14 -18 M150 128 h88 l-16 -20 M150 156 h52 l-12 -18" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.85"/>`,
  drawAura: (c) => `
    <circle cx="200" cy="112" r="52" fill="none" stroke="${c}" stroke-width="4" opacity="0.8"/>
    <path d="M200 74 v48 M184 108 l16 16 16 -16" stroke="${c}" stroke-width="5" fill="none" opacity="0.85"/>
    <path d="M172 158 h56" stroke="${c}" stroke-width="3" opacity="0.6"/>`,
};

function emblemFor(card, env) {
  const kind = card.effect?.kind ?? (card.category === "relic" ? "armorAura" : "damage");
  const glyph = EFFECT_GLYPHS[kind] ?? EFFECT_GLYPHS.damage;
  return glyph(env.glow);
}

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

function defsFor(card, env) {
  const [skyTop, skyLow] = env.sky;
  // Shared ids: one gradient set for every card, so the markup stays small
  // enough to inline as a data URI.
  return `<defs>
    <linearGradient id="sky-fill" x1="0" y1="0" x2="0.15" y2="1">
      <stop offset="0" stop-color="${skyTop}"/>
      <stop offset="0.62" stop-color="${skyLow}"/>
      <stop offset="1" stop-color="${env.mid}"/>
    </linearGradient>
    <radialGradient id="horizon-glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${alpha(env.glow, 0.42)}"/>
      <stop offset="0.5" stop-color="${alpha(env.glow, 0.14)}"/>
      <stop offset="1" stop-color="${alpha(env.glow, 0)}"/>
    </radialGradient>
    <linearGradient id="fog-fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${alpha(env.glow, 0)}"/>
      <stop offset="0.55" stop-color="${alpha(env.glow, 0.26)}"/>
      <stop offset="1" stop-color="${alpha(env.glow, 0)}"/>
    </linearGradient>
    <linearGradient id="ground-fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${env.ground}"/>
      <stop offset="1" stop-color="${shade(env.ground, 0.5)}"/>
    </linearGradient>
    <radialGradient id="vignette-${card.id}" cx="0.5" cy="0.44" r="0.8">
      <stop offset="0.62" stop-color="rgba(0,0,0,0)"/>
      <stop offset="1" stop-color="rgba(3,5,9,0.62)"/>
    </radialGradient>
  </defs>`;
}

/**
 * Full card illustration for one card.
 *
 * Vessels are rendered from their canonical voxel model. Actions and Relics
 * get an emblem scene built from their effect kind, in their element's
 * environment, so the art explains the card.
 */
const SVG_CACHE = new Map();
const URI_CACHE = new Map();

/**
 * Illustrations are pure functions of the card, so the markup is memoised: the
 * hand re-renders on every command and re-encoding 28 kB of SVG per card per
 * frame is wasted work.
 */
export function illustrationSvg(card, options = {}) {
  const key = `${card?.id ?? "?"}:${options.figure === false ? "scene" : "card"}`;
  const cached = SVG_CACHE.get(key);
  if (cached) return cached;
  const svg = buildIllustration(card, options);
  SVG_CACHE.set(key, svg);
  return svg;
}

function buildIllustration(card, options = {}) {
  if (!card || !card.id) throw new Error("illustrationSvg needs a card with an id.");
  // The roster stage shows a live, rotatable model, so it asks for the scene
  // without the painted figure: same environment, no duplicate character.
  const withFigure = options.figure !== false;
  const model = card.category === "vessel" ? modelFor(card.id) : null;
  const random = rngFrom(hashString(card.id));
  const env = sceneryFor(card.element);
  const horizon = 200;
  const scene = sceneMarkup(card, random, env).markup;
  const rank = RARITY_RANK[card.rarity] ?? 0;
  const label = card.name ?? card.id;

  let subject = "";
  let shadowX = W / 2;
  let shadowRx = 84;
  if (model && withFigure) {
    const { markup, footprint } = renderModel(model, {
      // A diorama, not a portrait: the figure leaves room for the place behind
      // it, but it still has to dominate the window. At the old 92..308 box the
      // subject occupied barely half the frame and read as a miniature beside
      // full-background card art.
      target: { left: 58, right: 342, top: 38 + (rank >= 3 ? 4 : 0), bottom: horizon + 26 },
    });
    subject = markup;
    shadowX = footprint.centreX;
    shadowRx = Math.max(46, footprint.right - footprint.left) * 0.34;
  } else if (!model) {
    // Actions and Relics are effects, not creatures: the emblem is the subject,
    // so it is staged large, lit from behind, and set on a plinth.
    const plinth =
      card.category === "relic"
        ? `<g opacity="0.95">
             <ellipse cx="200" cy="${horizon + 27}" rx="86" ry="15" fill="${alpha(env.deep, 0.85)}"/>
             <rect x="150" y="${horizon + 10}" width="100" height="14" fill="${env.stone}"/>
             <rect x="142" y="${horizon + 24}" width="116" height="10" fill="${env.deep}"/>
             <rect x="150" y="${horizon + 10}" width="100" height="2" fill="${alpha(env.stoneLit, 0.7)}"/>
           </g>`
        : "";
    subject =
      `${plinth}<g class="art-emblem">` +
      `<ellipse cx="200" cy="140" rx="104" ry="104" fill="url(#emblem-glow)"/>` +
      `<g transform="translate(200 142) scale(1.5) translate(-200 -120)">${emblemFor(card, env)}</g>` +
      `</g>`;
    shadowRx = 96;
  }

  // A taller model earns a taller figure in frame; keep the ground line fixed.
  const heightNote = model ? ` data-voxel-height="${modelHeight(model).toFixed(2)}"` : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="card-illustration" role="img" aria-label="${escapeAttr(label)} — ${escapeAttr(card.category ?? "card")} illustration"${heightNote}>
  ${defsFor(card, env)}
  ${scene}
  <ellipse cx="${shadowX.toFixed(1)}" cy="${horizon + 27}" rx="${shadowRx.toFixed(1)}" ry="13" fill="rgba(0,0,0,0.45)"/>
  ${subject}
  ${foregroundMarkup(card, random, env)}
  ${rarityMarkup(card, env, random)}
  ${motesMarkup(card, env, random, 8 + rank * 5)}
  <rect width="${W}" height="${H}" fill="url(#vignette-${card.id})"/>
</svg>`;
}

function escapeAttr(text) {
  return String(text).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[ch]);
}

/** Same SVG as a data URI, for CSS backgrounds and <img> sources. */
export function illustrationDataUri(card, options = {}) {
  const key = `${card?.id ?? "?"}:${options.figure === false ? "scene" : "card"}`;
  const cached = URI_CACHE.get(key);
  if (cached) return cached;
  const svg = illustrationSvg(card, options).replace(/\s+/g, " ").trim();
  const uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  URI_CACHE.set(key, uri);
  return uri;
}

/** Addressable art metadata used by the compliance tests. */
export function illustrationSource(card) {
  const model = card.category === "vessel" ? modelFor(card.id) : null;
  return {
    cardId: card.id,
    category: card.category,
    modelId: model?.id ?? null,
    partCount: model?.parts.length ?? 0,
    palette: model?.palette ?? null,
    expression: card.effect?.kind ?? null,
  };
}
