/**
 * Official Vessel voxel models.
 *
 * Each model is data: a list of boxes in voxel units, grouped for animation.
 * Boxes are `{ g, x, y, z, w, h, d, c }`:
 *   g  animation group (body | head | weapon | left | right | tail | base)
 *   x  horizontal offset, 0 = centre of the tile (negative is left)
 *   y  height above the ground (0 = feet)
 *   z  depth (positive is toward the viewer)
 *   w h d  size in voxels
 *   c  palette key (base | dark | light | accent | glow | metal | ink | eye)
 *
 * Nothing here is a reskin of another model: silhouettes, proportions, props and
 * focal points are authored per Vessel against docs/UNIT_VISUAL_DESIGNS.md. Shared
 * rigs are not used, and no two models share a part array.
 */

const b = (g, x, y, z, w, h, d, c) => ({ g, x, y, z, w, h, d, c });

/** Element palettes. Each element differs in hue *and* in material contrast. */
export const ELEMENT_PALETTES = Object.freeze({
  fire: { base: "#c2472a", dark: "#5e1d12", light: "#ff9a63", accent: "#ffd166", glow: "#ff7a3c", metal: "#d8c2a4", ink: "#2a0f0a", eye: "#ffe9a8" },
  water: { base: "#2f7fa8", dark: "#123c56", light: "#8fe0ff", accent: "#bff3ff", glow: "#67d5ff", metal: "#a9c6d8", ink: "#081f2c", eye: "#d8fbff" },
  earth: { base: "#8a6a43", dark: "#463122", light: "#d8b98a", accent: "#a8d08d", glow: "#e8c88a", metal: "#b8ab97", ink: "#241a12", eye: "#ffe6b0" },
  metal: { base: "#7d8aa3", dark: "#2f3a4d", light: "#ccd7ea", accent: "#9ef0ff", glow: "#7ad7ff", metal: "#e2ecff", ink: "#141a24", eye: "#d9f7ff" },
  wood: { base: "#4f8a4a", dark: "#26401f", light: "#a8d98a", accent: "#e6ff9a", glow: "#a4ff86", metal: "#9aa47c", ink: "#131f10", eye: "#e9ffbe" },
});

const VESSEL_MODELS = [
  {
    id: "ashen_crownblade",
    element: "fire",
    tags: ["warrior", "tall", "blade"],
    palette: {},
    parts: [
      b("body", 0, 0, 0, 1.6, 3, 1.6, "dark"),
      b("body", -1.2, 0, 0, 1.4, 3, 1.6, "dark"),
      b("body", 0, 3, 0, 4.4, 4.4, 2.2, "base"),
      b("body", 0, 4.6, 1.1, 2.6, 1.6, 0.6, "accent"),
      b("body", -2.5, 6.2, 0, 1.4, 1.6, 2.2, "metal"),
      b("body", 2.5, 6.2, 0, 1.4, 1.6, 2.2, "metal"),
      b("head", 0, 9.4, 0, 2.4, 2.4, 2.2, "base"),
      b("head", 0, 11.2, 0, 1.2, 1, 1.6, "accent"),
      b("head", -1.1, 11.6, 0, 0.7, 1.2, 0.8, "accent"),
      b("head", 1.1, 11.6, 0, 0.7, 1.2, 0.8, "accent"),
      b("head", 0, 9.7, 1.2, 1.6, 0.5, 0.3, "eye"),
      b("weapon", 3.2, 3.4, 0.4, 0.7, 8.4, 0.7, "light"),
      b("weapon", 3.2, 3.0, 0.4, 2.2, 0.6, 0.9, "metal"),
      b("body", -1.6, 3.4, -1.2, 2.8, 4.4, 0.6, "dark"),
    ],
  },
  {
    id: "argent_nightlancer",
    element: "metal",
    tags: ["warrior", "tall", "lance"],
    palette: { base: "#5d6a86", accent: "#cfd8ea" },
    parts: [
      b("body", -0.9, 0, 0, 1.2, 4, 1.2, "dark"),
      b("body", 0.9, 0, 0, 1.2, 4, 1.2, "dark"),
      b("body", 0, 4, 0, 3.4, 4.4, 1.8, "base"),
      b("body", 0, 5.6, 0.9, 2.2, 0.6, 0.4, "accent"),
      b("body", -2, 6.6, 0, 1.2, 1.2, 1.6, "metal"),
      b("body", 2, 6.6, 0, 1.2, 1.2, 1.6, "metal"),
      b("head", 0, 9.2, 0, 2, 2.2, 1.8, "metal"),
      b("head", 0, 11, 0, 2.6, 0.8, 1.4, "accent"),
      b("head", 0, 9.5, 1, 1.2, 0.4, 0.3, "eye"),
      b("weapon", 2.4, -0.4, 0.4, 0.5, 12.4, 0.5, "metal"),
      b("weapon", 2.4, 11.6, 0.4, 1.4, 1.4, 0.6, "accent"),
      b("weapon", 2.4, 2.4, 0.4, 1, 0.5, 0.9, "dark"),
      b("body", -1.4, 5.4, -1.1, 0.5, 3.6, 0.4, "accent"),
    ],
  },
  {
    id: "mireglass_stalker",
    element: "water",
    tags: ["beast", "low", "quadruped"],
    // Low quadrupeds are scaled up so a 5-voxel body still fills the tile.
    scale: 1.4,
    palette: { base: "#3f8ea8", accent: "#bff3ff" },
    parts: [
      b("body", 0, 2.2, 0, 5.2, 2.2, 2.6, "base"),
      b("body", 0, 3.6, 0, 3.6, 1, 2, "light"),
      b("body", -2.2, 1.4, 0, 1.2, 2.6, 1.2, "dark"),
      b("body", 2.2, 1.4, 0, 1.2, 2.6, 1.2, "dark"),
      b("body", -1.6, 0, 0, 1, 1.6, 1, "base"),
      b("body", 1.6, 0, 0, 1, 1.6, 1, "base"),
      b("head", 3.2, 3.2, 0, 2.4, 1.8, 2.2, "base"),
      b("head", 4.6, 3.4, 1, 1.2, 1, 1.2, "light"),
      b("head", 4, 3.6, 0.8, 0.5, 0.5, 0.4, "eye"),
      b("weapon", 4.4, 1.6, -0.9, 2, 0.6, 0.6, "accent"),
      b("tail", -3.2, 2.6, 0, 2.4, 1, 1, "base"),
      b("tail", -4.6, 3.4, 0, 1.4, 1.4, 1.4, "accent"),
    ],
  },
  {
    id: "dustveil_matriarch",
    element: "earth",
    tags: ["beast", "wide", "mandibles"],
    scale: 1.35,
    palette: { base: "#8a6a43", accent: "#d8b98a" },
    parts: [
      b("body", 0, 2.4, 0, 6, 2.6, 3.2, "base"),
      b("body", 0, 5, 0, 4.4, 1.2, 2.4, "light"),
      b("body", -2.6, 5.2, 0, 1.6, 1.4, 2.6, "dark"),
      b("body", 2.6, 5.2, 0, 1.6, 1.4, 2.6, "dark"),
      b("body", -2.4, 0, 0, 1.2, 2.6, 1.2, "dark"),
      b("body", 2.4, 0, 0, 1.2, 2.6, 1.2, "dark"),
      b("body", -1, 0, 0, 1, 1.4, 1, "base"),
      b("body", 1, 0, 0, 1, 1.4, 1, "base"),
      b("head", 3.4, 3.4, 0, 2.2, 2, 2.4, "base"),
      b("head", 4.4, 2.6, -1.2, 1.8, 0.8, 0.8, "accent"),
      b("head", 4.4, 2.6, 1.2, 1.8, 0.8, 0.8, "accent"),
      b("head", 4, 4, 0.9, 0.5, 0.5, 0.4, "eye"),
      b("tail", -3.4, 2.8, 0, 2, 0.8, 1.4, "dark"),
    ],
  },
  {
    id: "hollowroot_oracle",
    element: "wood",
    tags: ["mystic", "robed", "staff"],
    palette: { base: "#4f8a4a", accent: "#e6ff9a" },
    parts: [
      b("body", 0, 0, 0, 4.6, 2.4, 2.6, "dark"),
      b("body", 0, 2.2, 0, 3.6, 2.4, 2.2, "base"),
      b("body", 0, 4.4, 0, 2.8, 2.2, 1.8, "base"),
      b("body", 0, 6.4, 0, 1.8, 1.2, 1.4, "dark"),
      b("head", 0, 7.4, 0, 2.2, 2.4, 1.8, "light"),
      b("head", 0, 8, 1, 1.4, 0.9, 0.3, "ink"),
      b("head", -0.6, 8.2, 1.1, 0.3, 0.3, 0.2, "glow"),
      b("head", 0.6, 8.2, 1.1, 0.3, 0.3, 0.2, "glow"),
      b("weapon", 2.2, 0.4, 0.4, 0.6, 9, 0.6, "base"),
      b("weapon", 2.2, 9.2, 0.4, 1.6, 1.6, 1.6, "accent"),
      b("body", -1.8, 5.4, -0.9, 1, 1, 1, "accent"),
      b("body", 1.4, 6.6, -1.1, 0.8, 0.8, 0.8, "glow"),
    ],
  },
  {
    id: "tidemark_astrologer",
    element: "metal",
    tags: ["mystic", "masked", "astrolabe"],
    palette: { base: "#4f5f7a", accent: "#9ef0ff" },
    parts: [
      b("body", 0, 0, 0, 4.2, 2.2, 2.4, "dark"),
      b("body", 0, 2, 0, 3.4, 3, 2, "base"),
      b("body", 0, 4.8, 0, 2.6, 2, 1.6, "base"),
      b("head", 0, 6.6, 0, 2, 2.2, 1.8, "metal"),
      b("head", 0, 7.2, 0.9, 1.2, 0.5, 0.3, "eye"),
      b("head", 0, 8.8, 0, 3, 0.4, 0.4, "accent"),
      b("weapon", 2.6, 5.4, 0, 0.5, 4.6, 0.5, "metal"),
      b("weapon", 2.6, 7.4, 0, 2.6, 0.4, 0.4, "accent"),
      b("weapon", 2.6, 7.4, 0, 0.4, 2.6, 0.4, "accent"),
      b("weapon", 2.6, 5.2, 0, 1.8, 0.3, 1.8, "glow"),
      b("body", -1.8, 4.4, -1, 0.4, 2.6, 0.4, "accent"),
    ],
  },
  {
    id: "bastion_first_mountain",
    element: "earth",
    tags: ["construct", "tall", "blocky"],
    palette: { base: "#7d6a55", accent: "#a8d08d" },
    parts: [
      b("body", -1.6, 0, 0, 2, 3, 2.4, "dark"),
      b("body", 1.6, 0, 0, 2, 3, 2.4, "dark"),
      b("body", 0, 2.6, 0, 6, 5.4, 3.2, "base"),
      b("body", 0, 4.4, 1.7, 2, 1.6, 0.4, "glow"),
      b("body", -3.6, 6.4, 0, 1.8, 2.4, 2.8, "dark"),
      b("body", 3.6, 6.4, 0, 1.8, 2.4, 2.8, "dark"),
      b("head", 0, 8.2, 0, 3, 2, 2.6, "base"),
      b("head", 0, 8.8, 1.4, 2, 0.5, 0.3, "eye"),
      b("head", 0, 10.4, 0, 2.2, 0.8, 2, "accent"),
      b("body", 0, 7.6, -1.8, 4, 3.2, 0.6, "dark"),
    ],
  },
  {
    id: "ironwrought_hound",
    element: "metal",
    tags: ["construct", "low", "quadruped"],
    scale: 1.4,
    palette: { base: "#6f7a8c", accent: "#f2b25c" },
    parts: [
      b("body", 0, 2, 0, 4.8, 2, 2.2, "base"),
      b("body", 0, 3.4, 0, 3.4, 0.8, 1.8, "metal"),
      b("body", -1.8, 0, 0, 0.9, 2.2, 0.9, "dark"),
      b("body", 1.8, 0, 0, 0.9, 2.2, 0.9, "dark"),
      b("body", -1.8, 0.6, 0, 1.4, 0.5, 1.4, "metal"),
      b("body", 1.8, 0.6, 0, 1.4, 0.5, 1.4, "metal"),
      b("head", 2.9, 3, 0, 2.2, 1.6, 2, "base"),
      b("head", 4, 3.2, 0, 0.9, 1, 1.4, "dark"),
      b("head", 3.4, 3.6, 0.7, 0.6, 0.6, 0.4, "accent"),
      b("tail", -3, 3, 0, 1.8, 0.6, 0.6, "metal"),
      b("tail", -4, 3.6, 0, 0.9, 1.2, 0.9, "base"),
    ],
  },
  {
    id: "cinder_maw",
    element: "fire",
    tags: ["demon", "low", "jaws"],
    scale: 1.35,
    palette: { base: "#8e2f1e", accent: "#ffd166" },
    parts: [
      b("body", 0, 2.2, 0, 5.4, 2.4, 2.8, "base"),
      b("body", 0, 3.8, 0, 3.4, 0.8, 2, "glow"),
      b("body", -2, 0, 0, 1.2, 2.4, 1.2, "dark"),
      b("body", 2, 0, 0, 1.2, 2.4, 1.2, "dark"),
      b("body", -0.4, 0, 0, 1, 1.6, 1, "dark"),
      b("body", 0.8, 0, 0, 1, 1.6, 1, "dark"),
      b("head", 3.4, 3.2, 0, 2.6, 1.4, 2.6, "base"),
      b("head", 3.4, 1.8, 0, 2.6, 1, 2.2, "dark"),
      b("head", 4.6, 2.6, 0, 0.8, 0.8, 1.8, "accent"),
      b("head", 3.6, 3.6, 1, 0.5, 0.5, 0.4, "eye"),
      b("tail", -3.4, 3, 0, 2, 1.2, 1, "base"),
      b("tail", -4.2, 3.8, 0, 1, 1, 1, "glow"),
    ],
  },
  {
    id: "gilt_ash_bargainer",
    element: "earth",
    tags: ["demon", "horned", "broad"],
    palette: { base: "#7a5a3a", accent: "#e8c66a" },
    parts: [
      b("body", -1, 0, 0, 1.4, 3.4, 1.4, "dark"),
      b("body", 1, 0, 0, 1.4, 3.4, 1.4, "dark"),
      b("body", 0, 3.2, 0, 5, 4.6, 2.8, "base"),
      b("body", 0, 5, 1.5, 3, 2, 0.4, "accent"),
      b("body", -3.2, 6, 0, 1.6, 1.8, 2, "metal"),
      b("body", 3.2, 6, 0, 1.6, 1.8, 2, "metal"),
      b("head", 0, 8.4, 0, 2.6, 2.4, 2.2, "metal"),
      b("head", -1.6, 10.4, 0, 1.6, 1.4, 0.9, "dark"),
      b("head", 1.6, 10.4, 0, 1.6, 1.4, 0.9, "dark"),
      b("head", 0, 9, 1.2, 1.6, 0.5, 0.3, "eye"),
      b("body", -2.4, 2.4, 1, 0.8, 2.6, 0.4, "light"),
      b("body", 2.4, 2.4, 1, 0.8, 2.6, 0.4, "light"),
    ],
  },
  {
    id: "wyrm_drowned_vault",
    element: "water",
    tags: ["dragon", "serpentine", "long"],
    palette: { base: "#2f6f92", accent: "#bff3ff" },
    parts: [
      b("body", -3.4, 1.8, 0, 2.4, 2, 2.2, "base"),
      b("body", -1.4, 2.6, 0, 2.6, 2.2, 2.4, "base"),
      b("body", 1, 3.4, 0, 2.6, 2.2, 2.4, "light"),
      b("body", 3.2, 4.4, 0, 2, 1.8, 2, "base"),
      b("head", 5, 5.4, 0, 2.6, 1.8, 2, "base"),
      b("head", 6.4, 5.6, 0, 1, 0.9, 1.4, "accent"),
      b("head", 5.4, 6, 0.8, 0.5, 0.5, 0.4, "eye"),
      b("head", 4.6, 7.2, 0, 0.8, 1.4, 0.8, "accent"),
      b("head", 3.4, 7.4, 0, 0.6, 1.2, 0.6, "accent"),
      b("body", -0.6, 1, 1.3, 3, 0.4, 0.6, "light"),
      b("body", -0.6, 1, -1.3, 3, 0.4, 0.6, "light"),
      b("tail", -5, 1.6, 0, 2, 1.2, 1.2, "base"),
    ],
  },
  {
    id: "cloudbreak_coil",
    element: "metal",
    tags: ["dragon", "serpentine", "crest"],
    palette: { base: "#6a7890", accent: "#9ef0ff" },
    parts: [
      b("body", -3.6, 2.4, 0, 2.2, 1.8, 2, "base"),
      b("body", -1.6, 3.2, 0, 2.4, 2, 2.2, "metal"),
      b("body", 0.8, 4.2, 0, 2.4, 2, 2.2, "base"),
      b("body", 3, 5.2, 0, 1.8, 1.6, 1.8, "metal"),
      b("head", 4.6, 6, 0, 2.4, 1.8, 2, "base"),
      b("head", 6, 6.2, 0, 1, 1, 1.2, "accent"),
      b("head", 5, 6.6, 0.8, 0.5, 0.5, 0.4, "eye"),
      b("head", 4.4, 7.8, 0, 0.6, 1.6, 0.6, "accent"),
      b("head", 5.4, 8, 0, 0.6, 1.2, 0.6, "accent"),
      b("body", -0.4, 2, 1.2, 2.6, 0.4, 0.6, "accent"),
      b("body", -0.4, 2, -1.2, 2.6, 0.4, 0.6, "accent"),
      b("tail", -5.2, 2.2, 0, 2, 1, 1, "metal"),
    ],
  },
  {
    id: "verdant_colossus",
    element: "wood",
    tags: ["ancient", "huge", "branches"],
    palette: { base: "#3f6b39", accent: "#a8d98a" },
    parts: [
      b("body", -2, 0, 0, 2.4, 4, 2.4, "dark"),
      b("body", 2, 0, 0, 2.4, 4, 2.4, "dark"),
      b("body", 0, 3.6, 0, 7, 6, 3.4, "base"),
      b("body", 0, 6, 1.8, 4.4, 2.4, 0.5, "accent"),
      b("body", -4.4, 7, 0, 2, 2.6, 2.6, "dark"),
      b("body", 4.4, 7, 0, 2, 2.6, 2.6, "dark"),
      b("head", 0, 9.6, 0, 2.8, 2, 2.4, "base"),
      b("head", 0, 10, 1.3, 1.6, 0.5, 0.3, "eye"),
      b("head", -1.4, 11.6, 0, 0.8, 2.4, 0.8, "accent"),
      b("head", 1.4, 11.6, 0, 0.8, 2.4, 0.8, "accent"),
      b("head", 0, 12.2, 0, 0.8, 1.8, 0.8, "dark"),
      b("body", 0, 8.2, -2, 4.6, 3.4, 0.6, "dark"),
    ],
  },
  {
    id: "rootbound_witness",
    element: "earth",
    tags: ["ancient", "monolith", "roots"],
    palette: { base: "#6b6353", accent: "#a8d08d" },
    parts: [
      b("body", 0, 0, 0, 4.6, 2, 2.8, "dark"),
      b("body", 0, 1.8, 0, 3.6, 6.4, 2.2, "base"),
      b("body", 0, 5, 1.2, 1.6, 0.5, 0.2, "eye"),
      b("body", 0, 6.6, 1.2, 2.4, 0.4, 0.2, "eye"),
      b("body", -2.4, 2.4, 0.8, 0.7, 4.4, 0.7, "accent"),
      b("body", 2.4, 3.2, 0.8, 0.7, 3.6, 0.7, "accent"),
      b("head", 0, 8.2, 0, 2.6, 1.6, 2, "base"),
      b("head", -1.4, 9.8, 0, 0.7, 2, 0.7, "dark"),
      b("head", 1.4, 9.8, 0, 0.7, 2, 0.7, "dark"),
      b("body", 0, 0, 1.6, 1, 1.2, 0.6, "accent"),
    ],
  },
  {
    id: "lantern_lost_choir",
    element: "water",
    tags: ["spirit", "floating", "lantern"],
    palette: { base: "#3b6f8c", accent: "#bff3ff" },
    parts: [
      b("body", 0, 3.4, 0, 3, 3, 3, "dark"),
      b("body", 0, 4.2, 1.5, 1.6, 1.4, 0.4, "glow"),
      b("head", 0, 6.6, 0, 1.8, 1.4, 1.8, "metal"),
      b("head", 0, 8, 0, 0.6, 0.8, 0.6, "accent"),
      b("body", -2, 1.6, 0, 0.6, 3, 0.6, "light"),
      b("body", 2, 1.6, 0, 0.6, 3, 0.6, "light"),
      b("body", 0, 0.8, 1.6, 0.5, 2.6, 0.5, "accent"),
      b("body", -1.2, 6.4, -0.8, 0.6, 0.6, 0.6, "glow"),
      b("body", 1.2, 6.4, -0.8, 0.6, 0.6, 0.6, "glow"),
      b("body", 0, 0, 0, 1.6, 1, 1.6, "glow"),
    ],
  },
  {
    id: "bell_unmoored",
    element: "wood",
    tags: ["spirit", "floating", "bell"],
    palette: { base: "#4f7a44", accent: "#e6ff9a" },
    parts: [
      b("body", 0, 2.6, 0, 1.8, 2, 1.8, "dark"),
      b("body", 0, 1.4, 0, 3, 1.4, 3, "base"),
      b("body", 0, 0.6, 0, 3.6, 0.8, 3.6, "metal"),
      b("head", 0, 4.4, 0, 0.8, 0.8, 0.8, "accent"),
      b("body", 0, 5.2, 0, 0.4, 1.2, 0.4, "dark"),
      b("body", -2.4, 1, 0, 0.8, 1.6, 0.8, "accent"),
      b("body", 2.4, 0.6, 0, 0.8, 2, 0.8, "accent"),
      b("body", 0, 3.2, 1.6, 0.6, 2.4, 0.6, "accent"),
      b("body", 0, 0, 0, 1.4, 0.6, 1.4, "glow"),
      b("body", -1.6, 3.6, -1, 0.5, 1.6, 0.5, "light"),
    ],
  },
  {
    id: "star_eater",
    element: "fire",
    tags: ["otherworldly", "floating", "void"],
    palette: { base: "#2c2130", accent: "#ffb347", glow: "#ff7a3c" },
    parts: [
      b("body", 0, 2, 0, 3.4, 4.4, 2.6, "base"),
      b("body", 0, 4, 1.4, 2, 2, 0.6, "glow"),
      b("head", 0, 7, 0, 2, 1.8, 1.8, "dark"),
      b("head", 0, 7.4, 1, 1.2, 0.6, 0.3, "accent"),
      b("body", -3.2, 5.4, 0, 1.6, 0.6, 1.6, "accent"),
      b("body", 3.2, 5.4, 0, 1.6, 0.6, 1.6, "accent"),
      b("body", 0, 9, 0, 1.2, 1.2, 1.2, "glow"),
      b("body", -2.6, 1.2, 0, 0.8, 2.4, 0.8, "dark"),
      b("body", 2.6, 1.2, 0, 0.8, 2.4, 0.8, "dark"),
      b("body", 0, 0, 0, 2.4, 0.8, 2.4, "accent"),
      b("body", -1.4, 6.6, -1.2, 0.5, 0.5, 0.5, "glow"),
      b("body", 1.4, 6.6, -1.2, 0.5, 0.5, 0.5, "glow"),
    ],
  },
  {
    id: "unwritten_guest",
    element: "water",
    tags: ["otherworldly", "floating", "shards"],
    palette: { base: "#3d5a74", accent: "#d8fbff" },
    parts: [
      b("body", 0, 1.4, 0, 3, 4.6, 2.2, "base"),
      b("body", -1.6, 0.4, 0, 0.8, 3.4, 0.8, "light"),
      b("body", 1.6, 0.4, 0, 0.8, 3.4, 0.8, "light"),
      b("body", 0, 6, 0, 1.4, 1.2, 1.4, "dark"),
      b("head", 0, 7.6, 0, 2, 2, 1.8, "accent"),
      b("head", 0, 7.8, 1, 1.2, 0.7, 0.3, "ink"),
      b("body", -2.2, 5, 0, 1, 2.4, 1, "light"),
      b("body", 2.2, 5, 0, 1, 2.4, 1, "light"),
      b("body", 0, 4.4, -1.4, 2.6, 3.4, 0.5, "dark"),
      b("body", -0.8, 8.8, 0, 0.5, 1.4, 0.5, "glow"),
      b("body", 0.8, 9, 0, 0.5, 1, 0.5, "glow"),
    ],
  },
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
