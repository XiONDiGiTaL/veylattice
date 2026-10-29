/**
 * Official Vessel voxel models.
 *
 * Models are authored data, not code: every box carries an animation group, a
 * palette key, a material response and an optional rotation. The five element
 * palettes define a whole material world per element (ceramic, cloth, stone,
 * brass, bone, crystal, void), so element identity survives in monochrome.
 *
 * Definitions live next to their element in `./vessels/`; this module owns the
 * palettes, assembly, and the stable-id lookup the renderer and tests use.
 */

import { FIRE_VESSELS } from "./vessels/fire.js";
import { WATER_VESSELS } from "./vessels/water.js";
import { EARTH_VESSELS } from "./vessels/earth.js";
import { METAL_VESSELS } from "./vessels/metal.js";
import { WOOD_VESSELS } from "./vessels/wood.js";

/** Element palettes. Each element differs in hue *and* in material contrast. */
export const ELEMENT_PALETTES = Object.freeze({
  fire: {
    base: "#b8462a", dark: "#4a1710", light: "#ff9a63", accent: "#ffd166",
    glow: "#ff6a2a", ember: "#ff7a3c", metal: "#d8c2a4", ink: "#1a0906", eye: "#ffe9a8",
    stone: "#6b3a2c", cloth: "#8c2f22", leather: "#3a2118", wood: "#5c3220",
    bone: "#e8d9bd", crystal: "#ff8a3c", brass: "#c98f45", void: "#140708",
    skin: "#c98a63", skinShade: "#a5694a", hair: "#241812",
  },
  water: {
    base: "#2f7fa8", dark: "#0f3348", light: "#8fe0ff", accent: "#bff3ff",
    glow: "#67d5ff", ember: "#7fe6ff", metal: "#a9c6d8", ink: "#061722", eye: "#d8fbff",
    stone: "#3d5566", cloth: "#1b4a63", leather: "#16262e", wood: "#2c3f46",
    bone: "#dff1f5", crystal: "#7fe6ff", brass: "#c2a06a", void: "#05121b",
    skin: "#d09a74", skinShade: "#ab7852", hair: "#221c1a",
  },
  earth: {
    base: "#8a6a43", dark: "#3f2c1e", light: "#d8b98a", accent: "#a8d08d",
    glow: "#e8c88a", ember: "#f0c070", metal: "#b8ab97", ink: "#1c130c", eye: "#ffe6b0",
    stone: "#7b7466", cloth: "#6b573c", leather: "#4a3524", wood: "#5d4327",
    bone: "#e6dcc4", crystal: "#9fd6a8", brass: "#b08a4e", void: "#150f09",
    skin: "#c69b70", skinShade: "#a27a56", hair: "#33241a",
  },
  metal: {
    base: "#7d8aa3", dark: "#232b3a", light: "#ccd7ea", accent: "#9ef0ff",
    glow: "#7ad7ff", ember: "#9ef0ff", metal: "#e2ecff", ink: "#0b1018", eye: "#d9f7ff",
    stone: "#5a6478", cloth: "#33405a", leather: "#242c3a", wood: "#3c4658",
    bone: "#dbe6f5", crystal: "#8fe4ff", brass: "#c9a468", void: "#080c12",
    skin: "#d5a682", skinShade: "#ae8160", hair: "#2b2730",
  },
  wood: {
    base: "#4f8a4a", dark: "#1f3319", light: "#a8d98a", accent: "#e6ff9a",
    glow: "#a4ff86", ember: "#c8ff9e", metal: "#9aa47c", ink: "#0c1509", eye: "#e9ffbe",
    stone: "#5f6152", cloth: "#3a5b33", leather: "#33401f", wood: "#58412a",
    bone: "#e2e4c0", crystal: "#b6f08a", brass: "#a68a4e", void: "#090f07",
    skin: "#c89a70", skinShade: "#a4794f", hair: "#3a2a18",
  },
});

const VESSEL_MODELS = [
  ...FIRE_VESSELS,
  ...WATER_VESSELS,
  ...EARTH_VESSELS,
  ...METAL_VESSELS,
  ...WOOD_VESSELS,
];

/**
 * Models keyed by the canonical card id.
 *
 * The `vessel_` prefix is added here once so the renderer's lookup key is the
 * same stable id the engine and the card catalog use; there is no second naming
 * scheme to drift.
 */
export const VOXEL_MODELS = Object.freeze(
  Object.fromEntries(
    VESSEL_MODELS.map((model) => {
      const id = `vessel_${model.id}`;
      return [
        id,
        Object.freeze({
          ...model,
          id,
          palette: Object.freeze({ ...ELEMENT_PALETTES[model.element], ...model.palette }),
          parts: Object.freeze(model.parts.map((part) => Object.freeze(part))),
        }),
      ];
    }),
  ),
);

export const MODEL_IDS = Object.freeze(Object.keys(VOXEL_MODELS));

/** Model lookup with an explicit placeholder marker instead of a silent fallback. */
export function modelFor(cardId) {
  return VOXEL_MODELS[cardId] ?? null;
}

/** Focal height in voxels, used to frame the tile stage. */
export function modelHeight(model) {
  return model.parts.reduce((max, part) => Math.max(max, part.y + part.h), 0);
}

/** Widest extent in voxels, used by the showcase framing and the QA report. */
export function modelWidth(model) {
  return model.parts.reduce((max, part) => Math.max(max, Math.abs(part.x) + part.w / 2), 0) * 2;
}
