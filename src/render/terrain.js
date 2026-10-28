/**
 * Battlefield dressing: the ground map and its props.
 *
 * IMPORTANT: everything here is decorative. `TERRAIN_KINDS[*].rules` is
 * explicitly "decorative" and the engine never reads this module. The arena is
 * authored as a miniature diorama, so a tile may *look* like shallow water,
 * moss or broken masonry without changing movement, line of sight or damage.
 * Any future gameplay terrain must be added to the rules engine and tests
 * first, then declared here.
 */

import { box } from "./vessels/_parts.js";

/** Terrain vocabulary. `lift` is presentation only (pixels of elevation). */
export const TERRAIN_KINDS = Object.freeze({
  grass: { id: "grass", label: "Grass", rules: "decorative", lift: 0, walkableLook: true },
  moss: { id: "moss", label: "Moss", rules: "decorative", lift: 2, walkableLook: true },
  stone: { id: "stone", label: "Ruins", rules: "decorative", lift: 5, walkableLook: true },
  water: { id: "water", label: "Shallows", rules: "decorative", lift: -3, walkableLook: true },
  crystal: { id: "crystal", label: "Crystal", rules: "decorative", lift: 3, walkableLook: true },
});

/**
 * Authored 7x7 layout, point-symmetric under a 180 degree rotation so neither
 * seat gets a visually privileged side. Row 0 is the opponent's back row.
 */
const LAYOUT = [
  ["stone", "stone", "grass", "grass", "grass", "stone", "stone"],
  ["grass", "grass", "grass", "moss", "grass", "grass", "grass"],
  ["grass", "water", "water", "moss", "water", "water", "grass"],
  ["stone", "stone", "grass", "crystal", "grass", "stone", "stone"],
  ["grass", "water", "water", "moss", "water", "water", "grass"],
  ["grass", "grass", "grass", "moss", "grass", "grass", "grass"],
  ["stone", "stone", "grass", "grass", "grass", "stone", "stone"],
];

/**
 * Props are placed at the back edge of a tile so a summoned Vessel stands in
 * front of them and never hides behind scenery. Placement is authored rather
 * than random so the arena is identical in every match and every test.
 */
const PROPS = [
  { x: 0, y: 0, kind: "tree", scale: 1.35, z: -1.5 },
  { x: 6, y: 6, kind: "tree", scale: 1.35, z: -1.5, flip: true },
  { x: 6, y: 0, kind: "column" },
  { x: 0, y: 6, kind: "column" },
  { x: 1, y: 0, kind: "rubble" },
  { x: 5, y: 6, kind: "rubble" },
  { x: 0, y: 3, kind: "rubble" },
  { x: 6, y: 3, kind: "crystal" },
  { x: 3, y: 3, kind: "crystal", scale: 0.85 },
  { x: 2, y: 2, kind: "reed", flip: true },
  { x: 4, y: 4, kind: "reed", flip: true },
  { x: 4, y: 2, kind: "reed" },
  { x: 2, y: 4, kind: "reed" },
  { x: 3, y: 0, kind: "tree", scale: 1.1, z: -1.4 },
  { x: 3, y: 6, kind: "tree", scale: 1.1, z: -1.4, flip: true },
];

/** Prop geometry, authored with the same box schema as the Vessel roster. */
export const PROP_MODELS = Object.freeze({
  tree: {
    id: "prop_tree",
    scale: 1.1,
    idle: "none",
    parts: [
      box("body", 0, 0, 0, 1.1, 2.6, 1.1, "#4a3524", "wood"),
      box("body", -0.5, 2.2, 0, 0.7, 1.1, 0.7, "#4a3524", "wood", { rz: 18 }),
      box("body", 0.55, 2.35, 0, 0.6, 0.95, 0.6, "#3d2c1d", "wood", { rz: -22 }),
      box("body", 0, 3.1, 0, 3.0, 1.35, 3.0, "#3f5d3a", "matte"),
      box("body", 0.15, 4.35, 0, 2.2, 1.0, 2.2, "#4a6b40", "matte"),
      box("body", -0.4, 5.25, 0, 1.25, 0.7, 1.25, "#5c7a42", "matte"),
      box("body", 0.6, 3.6, 1.35, 0.9, 0.5, 0.4, "#6b8a4a", "matte", { ry: 20 }),
    ],
  },
  column: {
    id: "prop_column",
    scale: 1.0,
    idle: "none",
    parts: [
      box("body", 0, 0, 0, 2.3, 0.55, 2.3, "#5a6478", "stone"),
      box("body", 0, 0.55, 0, 1.5, 3.6, 1.5, "#6a7488", "stone"),
      box("body", 0, 1.4, 0.76, 1.1, 0.28, 0.14, "#7d8798", "stone"),
      box("body", 0, 2.8, 0.76, 1.05, 0.24, 0.14, "#49525f", "stone"),
      box("body", 0, 4.1, 0, 1.9, 0.45, 1.9, "#5a6478", "stone", { rz: 4 }),
      box("body", 0.35, 4.55, 0, 0.9, 0.35, 1.2, "#6a7488", "stone", { rz: -12 }),
      box("body", -0.9, 0.0, 0.7, 0.7, 0.4, 0.7, "#49525f", "stone", { ry: 24 }),
      box("body", 0.9, 0.6, -0.5, 0.5, 0.3, 0.5, "#49525f", "stone", { ry: -18 }),
    ],
  },
  crystal: {
    id: "prop_crystal",
    scale: 1.0,
    idle: "none",
    parts: [
      box("body", 0, 0, 0, 1.7, 0.35, 1.7, "#3d5566", "stone"),
      box("body", -0.35, 0.35, 0, 0.7, 2.3, 0.7, "#7fe6ff", "crystal", { rz: 6 }),
      box("body", -0.5, 2.65, 0, 0.5, 1.1, 0.5, "#bff3ff", "crystal", { rz: 14 }),
      box("body", 0.5, 0.35, 0.15, 0.55, 1.6, 0.55, "#67d5ff", "crystal", { rz: -12 }),
      box("body", 0.55, 1.95, 0.1, 0.4, 0.7, 0.4, "#bff3ff", "crystal", { rz: -24 }),
      box("body", 0.1, 0.35, -0.6, 0.45, 1.1, 0.45, "#67d5ff", "crystal", { rz: 18 }),
    ],
  },
  rubble: {
    id: "prop_rubble",
    scale: 1.0,
    idle: "none",
    parts: [
      box("body", -0.5, 0, 0, 1.3, 0.6, 1.1, "#5a6478", "stone", { ry: 18 }),
      box("body", 0.7, 0, 0.2, 0.9, 0.45, 0.8, "#49525f", "stone", { ry: -24 }),
      box("body", 0.15, 0.55, -0.3, 0.7, 0.4, 0.6, "#6a7488", "stone", { ry: 34 }),
      box("body", -0.9, 0, 0.6, 0.5, 0.3, 0.45, "#3d4552", "stone"),
    ],
  },
  reed: {
    id: "prop_reed",
    scale: 1.0,
    idle: "none",
    parts: [
      box("body", -0.4, 0, 0, 0.22, 2.1, 0.22, "#4a6b40", "matte", { rz: 8 }),
      box("body", 0.1, 0, 0.2, 0.2, 2.6, 0.2, "#5c7a42", "matte", { rz: -5 }),
      box("body", 0.5, 0, -0.1, 0.2, 1.8, 0.2, "#3f5d3a", "matte", { rz: 14 }),
      box("body", 0.15, 2.55, 0.2, 0.34, 0.55, 0.3, "#8fae6a", "matte"),
    ],
  },
});

export const ARENA = Object.freeze({
  id: "verdant_sanctum",
  name: "The Verdant Sanctum",
  subtitle: "A forgotten shrine where the grid itself is carved stone",
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
