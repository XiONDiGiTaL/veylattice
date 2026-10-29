/**
 * Battlefield dressing: the ground map and its scenery.
 *
 * IMPORTANT: everything here is decorative. `TERRAIN_KINDS[*].rules` is
 * explicitly "decorative" and the engine never reads this module. The arena is
 * authored as a miniature diorama, so a tile may *look* like shallow water,
 * moss or a stone terrace without changing movement, line of sight or damage.
 * Any future gameplay terrain must be added to the rules engine and tests
 * first, then declared here.
 *
 * The arena is read as a physical model on a table: every tile is a block of
 * ground with a visible side, lawns, paving and sand sit at different heights,
 * water lies between raised banks, and the scenery is built from the same box
 * schema as the Vessels. `ENVIRONS` dresses the table *outside* the 5x5 grid so
 * the battlefield sits inside a garden instead of floating in an empty panel.
 */

import { BOARD_SIZE } from "../game/constants.js";
import { box } from "./vessels/_parts.js";

/** Terrain vocabulary. `lift` is presentation only (pixels of elevation). */
export const TERRAIN_KINDS = Object.freeze({
  grass: { id: "grass", label: "Lawn", rules: "decorative", lift: 6, walkableLook: true },
  moss: { id: "moss", label: "Clover", rules: "decorative", lift: 11, walkableLook: true },
  stone: { id: "stone", label: "Paving", rules: "decorative", lift: 16, walkableLook: true },
  sand: { id: "sand", label: "Path", rules: "decorative", lift: 3, walkableLook: true },
  water: { id: "water", label: "Pools", rules: "decorative", lift: 0, walkableLook: true },
  crystal: { id: "crystal", label: "Shrine", rules: "decorative", lift: 22, walkableLook: true },
});

/**
 * Authored 5x5 layout, point-symmetric under a 180 degree rotation so neither
 * seat gets a visually privileged side. Row 0 is the opponent's back row.
 *
 * Stone terraces hold the corners, a paved cross meets a water ring around the
 * raised shrine, and the remaining tiles are lawn. Every surface border is a
 * height step, which is what makes the board read as built terrain.
 */
const LAYOUT = [
  ["stone", "grass", "moss", "grass", "stone"],
  ["grass", "water", "sand", "water", "grass"],
  ["moss", "sand", "crystal", "sand", "moss"],
  ["grass", "water", "sand", "water", "grass"],
  ["stone", "grass", "moss", "grass", "stone"],
];

/** Deterministic jitter: the arena must be identical in every match. */
const wobble = (seed, spread = 1) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return (value - Math.floor(value) - 0.5) * spread;
};

/** A clump of cubic foliage: overlapping boxes instead of one green cube. */
function foliage(seed, { y, spread = 1.6, height = 1.2, palette, count = 6 }) {
  const parts = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + wobble(seed + i, 0.7);
    const radius = spread * (0.34 + Math.abs(wobble(seed * 3 + i, 0.5)));
    const size = 0.85 + Math.abs(wobble(seed * 7 + i, 0.45));
    parts.push(
      box(
        "body",
        Math.cos(angle) * radius,
        y + Math.abs(wobble(seed + i * 5, 0.5)) * height,
        Math.sin(angle) * radius * 0.75,
        size,
        size * 0.86,
        size,
        palette[i % palette.length],
        "matte",
        { rz: Math.round(wobble(seed * 2 + i, 26)) },
      ),
    );
  }
  return parts;
}

/** Prop geometry, authored with the same box schema as the Vessel roster. */
export const PROP_MODELS = Object.freeze({
  tree: {
    id: "prop_tree",
    scale: 1.0,
    idle: "none",
    parts: [
      // Buttressed trunk with roots.
      box("body", 0, 0, 0, 0.9, 3.1, 0.9, "#5a4128", "wood"),
      box("body", -0.55, 0, 0.1, 0.5, 0.9, 0.6, "#4a3521", "wood", { rz: 18 }),
      box("body", 0.6, 0, -0.1, 0.5, 1.1, 0.55, "#4a3521", "wood", { rz: -22 }),
      box("body", 0, 2.6, 0, 0.55, 1.6, 0.55, "#6b4d2f", "wood"),
      box("body", -0.6, 3.1, 0.1, 0.5, 1.0, 0.5, "#5a4128", "wood", { rz: 32 }),
      box("body", 0.6, 3.2, -0.1, 0.45, 0.9, 0.45, "#4d3722", "wood", { rz: -30 }),
      // Layered canopy: three tiers, four greens, one lit cap.
      box("body", 0, 3.3, 0, 3.6, 1.2, 3.4, "#2f5a2c", "matte"),
      box("body", 0.2, 4.35, 0.1, 3.0, 1.0, 2.9, "#3f7434", "matte"),
      box("body", -0.15, 5.25, 0, 2.3, 0.9, 2.2, "#4f8b3c", "matte"),
      box("body", 0.2, 6.05, -0.05, 1.5, 0.6, 1.4, "#63a344", "matte"),
      box("body", 1.6, 3.9, 0.5, 0.9, 0.6, 0.85, "#58973f", "matte"),
      box("body", -1.65, 3.6, -0.4, 0.85, 0.55, 0.8, "#3a6b30", "matte"),
      box("body", 0.75, 4.9, -1.15, 0.95, 0.5, 0.75, "#63a344", "matte"),
      box("body", -0.9, 5.5, 0.45, 0.8, 0.45, 0.7, "#7ab64a", "matte"),
    ],
  },
  pine: {
    id: "prop_pine",
    scale: 1.0,
    idle: "none",
    parts: [
      box("body", 0, 0, 0, 0.55, 1.4, 0.55, "#4a3524", "wood"),
      box("body", 0, 1.2, 0, 2.7, 0.7, 2.5, "#254a2a", "matte"),
      box("body", 0, 1.85, 0, 2.2, 0.65, 2.05, "#2d5c30", "matte"),
      box("body", 0, 2.45, 0, 1.7, 0.6, 1.6, "#376f37", "matte"),
      box("body", 0, 3.0, 0, 1.2, 0.55, 1.15, "#42803c", "matte"),
      box("body", 0, 3.5, 0, 0.6, 0.5, 0.6, "#4f9542", "matte"),
      box("body", 0.8, 1.5, 0.3, 0.55, 0.4, 0.5, "#1f3f24", "matte"),
    ],
  },
  bush: {
    id: "prop_bush",
    scale: 1.0,
    idle: "none",
    parts: [
      ...foliage(1.7, { y: 0.05, spread: 1.5, height: 0.9, count: 6, palette: ["#3d7b34", "#4f9440", "#5aa349", "#2f6329"] }),
      ...foliage(4.2, { y: 0.5, spread: 0.9, height: 0.7, count: 4, palette: ["#63a344", "#7ab64a", "#4f8b3c"] }),
      box("body", 0, 0, 0, 1.5, 0.6, 1.4, "#335c2b", "matte"),
    ],
  },
  hedge: {
    id: "prop_hedge",
    scale: 1.0,
    idle: "none",
    parts: [
      box("body", 0, 0, 0, 3.4, 0.5, 1.2, "#2d5226", "matte"),
      box("body", 0, 0.5, 0, 3.5, 0.55, 1.25, "#3a6b30", "matte"),
      box("body", 0, 1.05, 0, 3.4, 0.5, 1.2, "#477f38", "matte"),
      box("body", 0, 1.55, 0, 3.1, 0.35, 1.1, "#569543", "matte"),
      box("body", -1.2, 1.35, 0.1, 0.55, 0.4, 0.65, "#63a344", "matte"),
      box("body", 1.15, 1.25, -0.1, 0.5, 0.4, 0.6, "#3a6b30", "matte"),
      box("body", 0.2, 1.8, 0, 0.6, 0.28, 0.5, "#7ab64a", "matte"),
    ],
  },
  rock: {
    id: "prop_rock",
    scale: 1.0,
    idle: "none",
    parts: [
      box("body", 0, 0, 0, 1.9, 0.7, 1.6, "#6a7060", "stone", { ry: 14 }),
      box("body", -0.4, 0.6, 0.1, 1.2, 0.65, 1.05, "#7b8271", "stone", { ry: -18 }),
      box("body", 0.55, 0.55, -0.25, 0.85, 0.5, 0.8, "#5b6254", "stone", { ry: 28 }),
      box("body", -0.45, 1.15, 0.05, 0.7, 0.28, 0.62, "#4f7a3e", "matte"),
      box("body", 0.5, 0.02, 0.7, 0.5, 0.28, 0.45, "#7b8271", "stone", { rz: 8 }),
    ],
  },
  ruin: {
    id: "prop_ruin",
    scale: 1.0,
    idle: "none",
    parts: [
      // A gateway arch: plinth, two piers, a broken span and hanging vines.
      box("body", 0, 0, 0, 2.9, 0.45, 2.2, "#6d7268", "stone"),
      box("body", -0.9, 0.45, 0, 0.85, 3.5, 0.9, "#828777", "stone"),
      box("body", 0.95, 0.45, 0, 0.8, 2.3, 0.85, "#767c6d", "stone"),
      box("body", -0.2, 3.55, 0, 2.4, 0.6, 1.0, "#8d927f", "stone", { rz: 3 }),
      box("body", -0.15, 4.1, 0, 1.5, 0.45, 0.72, "#767c6d", "stone", { rz: -5 }),
      box("body", 0.3, 4.6, 0, 0.6, 0.4, 0.6, "#8d927f", "stone", { rz: 14 }),
      box("body", 1.0, 2.7, 0.2, 0.6, 0.55, 0.55, "#5f6459", "stone", { ry: 22 }),
      box("body", -0.95, 3.9, 0, 0.95, 0.32, 0.8, "#4f7a3e", "matte"),
      box("body", -0.7, 2.6, 0.55, 0.16, 1.5, 0.16, "#3f6b3c", "matte"),
      box("body", 0.9, 3.6, 0.5, 0.14, 1.2, 0.14, "#3f6b3c", "matte"),
    ],
  },
  column: {
    id: "prop_column",
    scale: 1.0,
    idle: "none",
    parts: [
      box("body", 0, 0, 0, 1.5, 0.35, 1.5, "#6d7268", "stone"),
      box("body", 0, 0.35, 0, 1.0, 2.6, 1.0, "#8a9086", "stone"),
      box("body", 0, 1.2, 0, 1.16, 0.2, 1.16, "#9aa094", "stone"),
      box("body", 0, 2.05, 0, 1.16, 0.2, 1.16, "#9aa094", "stone"),
      box("body", 0, 2.9, 0, 1.25, 0.35, 1.25, "#767c6d", "stone", { rz: 4 }),
      box("body", 0.35, 2.95, 0.3, 0.4, 0.5, 0.4, "#5f6459", "stone", { rz: 22 }),
      box("body", -0.4, 1.9, 0.5, 0.18, 1.1, 0.18, "#3f6b3c", "matte"),
    ],
  },
  stairs: {
    id: "prop_stairs",
    scale: 1.0,
    idle: "none",
    parts: [
      box("body", 0, 0, 0.75, 2.8, 0.42, 0.9, "#7d8278", "stone"),
      box("body", 0, 0.42, 0, 2.6, 0.42, 0.9, "#8a8f83", "stone"),
      box("body", 0, 0.84, -0.75, 2.4, 0.42, 0.85, "#969a8b", "stone"),
      box("body", -1.45, 0, 0.1, 0.28, 1.25, 1.9, "#6a7066", "stone"),
      box("body", 1.45, 0, 0.1, 0.28, 1.25, 1.9, "#6a7066", "stone"),
      box("body", 0, 1.26, -0.75, 2.2, 0.2, 0.5, "#4f7a3e", "matte"),
      box("body", -0.6, 0.84, 0.05, 0.4, 0.18, 0.4, "#4f7a3e", "matte"),
    ],
  },
  statue: {
    id: "prop_statue",
    scale: 1.0,
    idle: "none",
    parts: [
      box("body", 0, 0, 0, 2.0, 0.5, 2.0, "#5f6a72", "stone"),
      box("body", 0, 0.5, 0, 1.6, 0.35, 1.6, "#7c858a", "stone"),
      box("body", 0, 0.85, 0, 1.1, 1.5, 1.0, "#93a0a0", "stone"),
      box("body", 0, 2.35, 0, 0.75, 0.7, 0.7, "#a8b3b0", "stone"),
      box("body", 0, 3.05, 0, 1.0, 0.3, 0.95, "#8d9a98", "stone"),
      box("body", 0.6, 1.3, 0.35, 0.35, 1.1, 0.3, "#7c858a", "stone", { rz: -12 }),
      box("body", -0.62, 1.15, 0.2, 0.3, 1.3, 0.3, "#7c858a", "stone", { rz: 10 }),
      box("body", 0, 0.55, 0.85, 1.0, 0.22, 0.2, "#b6c0b8", "stone"),
      box("body", 0.2, 1.9, 0.5, 0.3, 0.25, 0.2, "#4f7a3e", "matte"),
    ],
  },
  shrine: {
    id: "prop_shrine",
    scale: 1.0,
    idle: "none",
    parts: [
      box("body", 0, 0, 0, 2.6, 0.4, 2.6, "#5f6a72", "stone"),
      box("body", 0, 0.4, 0, 2.0, 0.35, 2.0, "#828b90", "stone"),
      box("body", -0.75, 0.75, 0, 0.45, 1.9, 0.45, "#93a0a0", "stone"),
      box("body", 0.75, 0.75, 0, 0.45, 1.9, 0.45, "#93a0a0", "stone"),
      box("body", 0, 2.65, 0, 2.3, 0.38, 2.1, "#a8b3b0", "stone"),
      box("body", 0, 3.03, 0, 1.8, 0.22, 1.6, "#8d9a98", "stone"),
      box("body", 0, 0.75, 0, 0.8, 1.0, 0.8, "#7fd8e0", "crystal"),
      box("body", 0, 1.45, 0, 0.5, 0.7, 0.5, "#d6fbff", "crystal"),
      box("body", 0, 2.2, 0, 0.3, 0.5, 0.3, "#eafcff", "crystal"),
      box("body", -1.05, 0.75, 0.6, 0.3, 0.4, 0.3, "#9fe3e8", "crystal"),
      box("body", 1.05, 0.75, -0.6, 0.3, 0.4, 0.3, "#9fe3e8", "crystal"),
    ],
  },
  flowers: {
    id: "prop_flowers",
    scale: 1.0,
    idle: "none",
    parts: [
      box("body", 0, 0, 0, 1.6, 0.28, 1.5, "#3d6b33", "matte"),
      box("body", -0.4, 0.28, 0.15, 0.14, 0.75, 0.14, "#4f8b3c", "matte"),
      box("body", 0.25, 0.28, -0.1, 0.14, 0.6, 0.14, "#4f8b3c", "matte"),
      box("body", 0.1, 0.28, 0.45, 0.14, 0.85, 0.14, "#4f8b3c", "matte"),
      box("body", 0.55, 0.28, 0.1, 0.12, 0.5, 0.12, "#4f8b3c", "matte"),
      box("body", -0.4, 1.03, 0.15, 0.4, 0.32, 0.4, "#e8c96a", "matte"),
      box("body", 0.25, 0.88, -0.1, 0.36, 0.3, 0.36, "#e58fa8", "matte"),
      box("body", 0.1, 1.13, 0.45, 0.34, 0.3, 0.34, "#f0f2e0", "matte"),
      box("body", 0.55, 0.78, 0.1, 0.3, 0.26, 0.3, "#b98edc", "matte"),
    ],
  },
  coral: {
    id: "prop_coral",
    scale: 1.0,
    idle: "none",
    parts: [
      box("body", 0, 0, 0, 1.1, 0.3, 1.1, "#2b6f7d", "matte"),
      box("body", -0.2, 0.3, 0, 0.36, 1.4, 0.36, "#54c0c8", "crystal", { rz: 8 }),
      box("body", -0.48, 1.45, 0.1, 0.32, 0.75, 0.32, "#8ee6e0", "crystal", { rz: 26 }),
      box("body", 0.32, 0.3, -0.1, 0.32, 1.1, 0.32, "#3fa8b8", "crystal", { rz: -12 }),
      box("body", 0.6, 1.2, 0, 0.28, 0.6, 0.28, "#b07fd8", "crystal", { rz: -34 }),
      box("body", 0.05, 0.3, 0.42, 0.26, 0.65, 0.26, "#7fd8d2", "crystal", { rz: 16 }),
      box("body", -0.05, 0.3, -0.45, 0.24, 0.5, 0.24, "#8ee6e0", "crystal", { rz: -18 }),
    ],
  },
  reed: {
    id: "prop_reed",
    scale: 1.0,
    idle: "none",
    parts: [
      box("body", -0.4, 0, 0, 0.22, 2.3, 0.22, "#3f6b3c", "matte", { rz: 8 }),
      box("body", 0.1, 0, 0.2, 0.2, 2.8, 0.2, "#4f7f42", "matte", { rz: -5 }),
      box("body", 0.5, 0, -0.1, 0.2, 1.9, 0.2, "#35603a", "matte", { rz: 14 }),
      box("body", 0.15, 2.75, 0.2, 0.36, 0.6, 0.32, "#8fae6a", "matte"),
      box("body", -0.05, 2.1, -0.2, 0.18, 0.9, 0.18, "#4f7f42", "matte", { rz: -12 }),
    ],
  },
  lily: {
    id: "prop_lily",
    scale: 1.0,
    idle: "none",
    parts: [
      box("body", -0.55, 0, 0.15, 1.0, 0.12, 0.95, "#3f8f6a", "matte", { rz: 12 }),
      box("body", 0.6, 0, -0.35, 0.85, 0.12, 0.8, "#4aa377", "matte", { rz: -18 }),
      box("body", 0.15, 0, 0.7, 0.7, 0.12, 0.65, "#357f5e", "matte", { rz: 24 }),
      box("body", -0.55, 0.12, 0.15, 0.3, 0.22, 0.3, "#f2c8de", "matte"),
      box("body", 0.6, 0.12, -0.35, 0.26, 0.2, 0.26, "#f6f0d8", "matte"),
      box("body", -0.55, 0.34, 0.15, 0.16, 0.12, 0.16, "#ffe2a0", "matte"),
    ],
  },
  lantern: {
    id: "prop_lantern",
    scale: 1.0,
    idle: "none",
    parts: [
      box("body", 0, 0, 0, 1.0, 0.3, 1.0, "#5f6a72", "stone"),
      box("body", 0, 0.3, 0, 0.34, 1.5, 0.34, "#8a9086", "stone"),
      box("body", 0, 1.8, 0, 0.9, 0.25, 0.9, "#767c6d", "stone"),
      box("body", 0, 2.05, 0, 0.62, 0.66, 0.62, "#ffd489", "ember"),
      box("body", 0, 2.71, 0, 0.95, 0.28, 0.95, "#8a9086", "stone", { rz: 8 }),
      box("body", 0, 2.99, 0, 0.4, 0.24, 0.4, "#a8b3b0", "stone"),
    ],
  },
  banner: {
    id: "prop_banner",
    scale: 1.0,
    idle: "none",
    parts: [
      box("body", 0, 0, 0, 0.55, 0.3, 0.55, "#5f6a72", "stone"),
      box("body", 0, 0.3, 0, 0.22, 4.2, 0.22, "#8a6a3f", "wood"),
      box("body", 0, 3.9, 0.32, 1.1, 0.16, 0.14, "#b08a4e", "metal"),
      box("body", 0.05, 2.1, 0.34, 0.95, 1.9, 0.1, "#c9b17a", "cloth"),
      box("body", 0.05, 1.7, 0.34, 0.95, 0.42, 0.1, "#8f7a4c", "cloth"),
      box("body", 0.05, 3.15, 0.42, 0.4, 0.5, 0.1, "#7fd8e0", "crystal"),
    ],
  },
  log: {
    id: "prop_log",
    scale: 1.0,
    idle: "none",
    parts: [
      box("body", 0, 0, 0, 2.1, 0.6, 0.72, "#5a4128", "wood", { rz: 4 }),
      box("body", 0.9, 0.05, 0, 0.7, 0.5, 0.66, "#7a5a38", "wood"),
      box("body", -0.7, 0.2, 0.2, 0.5, 0.3, 0.4, "#4f7a3e", "matte"),
      box("body", 0.2, 0.6, -0.1, 0.4, 0.24, 0.4, "#3d6b33", "matte"),
    ],
  },
});

/**
 * Scenery inside a tile, at the back edge so a Vessel stands in front of it.
 * Placement is authored rather than random so the arena is identical in every
 * match and every test.
 */
const PROPS = [
  // Rim terraces: architecture framing the far corners.
  { x: 0, y: 0, kind: "ruin", scale: 0.92, z: -1.15 },
  { x: 4, y: 4, kind: "ruin", scale: 0.92, z: -1.15, flip: true },
  { x: 0, y: 0, kind: "column", scale: 0.72, z: -1.45 },
  { x: 4, y: 4, kind: "column", scale: 0.72, z: -1.45, flip: true },
  { x: 0, y: 0, kind: "bush", scale: 0.7, z: -1.0, flip: true },
  { x: 4, y: 4, kind: "bush", scale: 0.7, z: -1.0 },
  { x: 4, y: 0, kind: "tree", scale: 0.92, z: -1.25 },
  { x: 0, y: 4, kind: "tree", scale: 0.92, z: -1.25, flip: true },
  { x: 4, y: 0, kind: "bush", scale: 0.62, z: -1.0, flip: true },
  { x: 0, y: 4, kind: "bush", scale: 0.62, z: -1.0 },
  { x: 0, y: 0, kind: "pine", scale: 0.72, z: -1.6 },
  { x: 4, y: 4, kind: "pine", scale: 0.72, z: -1.6, flip: true },
  // Shrine terrace and its approach.
  { x: 2, y: 2, kind: "shrine", scale: 0.78, z: -1.25 },
  { x: 2, y: 2, kind: "lantern", scale: 0.62, z: -0.6 },
  { x: 1, y: 2, kind: "stairs", scale: 0.72, z: -1.3, flip: true },
  { x: 3, y: 2, kind: "stairs", scale: 0.72, z: -1.3 },
  { x: 1, y: 2, kind: "rock", scale: 0.55, z: -0.7 },
  { x: 3, y: 2, kind: "rock", scale: 0.55, z: -0.7, flip: true },
  { x: 1, y: 2, kind: "flowers", scale: 0.72, z: -0.5, flip: true },
  { x: 3, y: 2, kind: "flowers", scale: 0.72, z: -0.5 },
  { x: 2, y: 1, kind: "banner", scale: 0.86, z: -1.3 },
  { x: 2, y: 3, kind: "banner", scale: 0.86, z: -1.3, flip: true },
  // Garden growth.
  { x: 1, y: 0, kind: "bush", scale: 0.78, z: -1.2 },
  { x: 3, y: 4, kind: "bush", scale: 0.78, z: -1.2, flip: true },
  { x: 1, y: 0, kind: "flowers", scale: 0.8, z: -0.65 },
  { x: 3, y: 4, kind: "flowers", scale: 0.8, z: -0.65, flip: true },
  { x: 0, y: 1, kind: "hedge", scale: 0.7, z: -1.32 },
  { x: 4, y: 3, kind: "hedge", scale: 0.7, z: -1.32, flip: true },
  { x: 0, y: 1, kind: "flowers", scale: 0.62, z: -0.6 },
  { x: 4, y: 3, kind: "flowers", scale: 0.62, z: -0.6, flip: true },
  { x: 4, y: 1, kind: "bush", scale: 0.72, z: -1.2 },
  { x: 0, y: 3, kind: "bush", scale: 0.72, z: -1.2, flip: true },
  { x: 4, y: 1, kind: "log", scale: 0.72, z: -0.75, flip: true },
  { x: 0, y: 3, kind: "log", scale: 0.72, z: -0.75 },
  { x: 1, y: 4, kind: "flowers", scale: 0.85, z: -1.2 },
  { x: 3, y: 0, kind: "flowers", scale: 0.85, z: -1.2, flip: true },
  { x: 1, y: 4, kind: "bush", scale: 0.6, z: -0.7, flip: true },
  { x: 3, y: 0, kind: "bush", scale: 0.6, z: -0.7 },
  { x: 4, y: 2, kind: "flowers", scale: 0.78, z: -1.25, flip: true },
  { x: 0, y: 2, kind: "flowers", scale: 0.78, z: -1.25 },
  { x: 3, y: 1, kind: "log", scale: 0.78, z: -1.25 },
  { x: 1, y: 3, kind: "log", scale: 0.78, z: -1.25, flip: true },
  { x: 3, y: 1, kind: "bush", scale: 0.6, z: -0.7 },
  { x: 1, y: 3, kind: "bush", scale: 0.6, z: -0.7, flip: true },
  // Water ring: lily pads, reeds, coral and bank rocks.
  { x: 1, y: 1, kind: "lily", scale: 1.0, z: -1.1 },
  { x: 3, y: 3, kind: "lily", scale: 1.0, z: -1.1, flip: true },
  { x: 1, y: 1, kind: "coral", scale: 0.66, z: -0.6 },
  { x: 3, y: 3, kind: "coral", scale: 0.66, z: -0.6, flip: true },
  { x: 3, y: 1, kind: "reed", scale: 0.85, z: -1.15 },
  { x: 1, y: 3, kind: "reed", scale: 0.85, z: -1.15, flip: true },
  { x: 3, y: 1, kind: "lily", scale: 0.8, z: -0.55, flip: true },
  { x: 1, y: 3, kind: "lily", scale: 0.8, z: -0.55 },
  { x: 0, y: 2, kind: "lantern", scale: 0.72, z: -1.35 },
  { x: 4, y: 2, kind: "lantern", scale: 0.72, z: -1.35, flip: true },
  { x: 2, y: 0, kind: "statue", scale: 0.7, z: -1.3 },
  { x: 2, y: 4, kind: "statue", scale: 0.7, z: -1.3, flip: true },
  { x: 2, y: 0, kind: "hedge", scale: 0.6, z: -1.0, flip: true },
  { x: 2, y: 4, kind: "hedge", scale: 0.6, z: -1.0 },
];

// The diorama must cover the rule grid exactly, or the arena would render a
// different battlefield from the one the engine validates against.
if (LAYOUT.length !== BOARD_SIZE || LAYOUT.some((row) => row.length !== BOARD_SIZE)) {
  throw new Error(
    `terrain.js layout is ${LAYOUT.length} rows; BOARD_SIZE is ${BOARD_SIZE}. Update both together.`,
  );
}

export const ARENA = Object.freeze({
  id: "verdant_sanctum",
  name: "The Verdant Sanctum",
  subtitle: "A stepped garden where the grid itself is carved stone",
  colonnade: true,
});

/** Terrain for a logical tile. Always returns a decorative kind. */
export function terrainAt(x, y) {
  const row = LAYOUT[y];
  if (!row) return TERRAIN_KINDS.grass;
  return TERRAIN_KINDS[row[x]] ?? TERRAIN_KINDS.grass;
}

/** Props that sit at the back of a tile, already resolved to model objects. */
export function propsAt(x, y) {
  return PROPS.filter((prop) => prop.x === x && prop.y === y).map((prop) => ({
    model: PROP_MODELS[prop.kind],
    scale: prop.scale ?? 1,
    offsetZ: prop.z ?? -0.9,
    flip: Boolean(prop.flip),
    kind: prop.kind,
  }));
}

export function arenaMap() {
  return LAYOUT.map((row) => row.slice());
}
