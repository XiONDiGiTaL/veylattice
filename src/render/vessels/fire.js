/**
 * Fire Vessels: heat-cracked ceramic, blackened obsidian, scorched bronze and
 * upward-pointing silhouettes. Fire identity is carried by the material breaks
 * and the ember seams, never by a global orange tint.
 */

import { box, both, pair } from "./_parts.js";

export const FIRE_VESSELS = [
  {
    id: "ashen_crownblade",
    element: "fire",
    tags: ["warrior", "tall", "blade"],
    idle: "breathe",
    sway: 0.8,
    pivots: { weapon: [2.9, 5.5, 0.7], head: [0, 10.1, 0], armL: [-2.4, 8.9, 0], armR: [2.4, 8.9, 0] },
    parts: [
      // ---- legs: ceramic greaves over charcoal joints -------------------
      ...pair("legL", "legR", 1.05, 0, 0, 1.85, 1.3, 2.35, "leather"),
      ...both("body", 1.05, 0.15, 0.95, 1.5, 0.7, 0.6, "metal", "metal"),
      ...pair("legL", "legR", 1.05, 1.3, 0, 1.5, 2.0, 1.7, "base"),
      ...both("body", 1.05, 1.55, 0.9, 1.05, 1.5, 0.4, "metal", "metal"),
      ...both("body", 1.05, 3.15, 0, 1.95, 0.8, 1.95, "metal", "metal"),
      ...both("body", 1.05, 3.5, 0.4, 0.5, 0.45, 0.5, "accent", "ember"),
      ...pair("legL", "legR", 1.05, 3.5, 0, 1.6, 1.75, 1.8, "dark"),

      // ---- hips, belt and the ragged half-cape --------------------------
      box("body", 0, 5.0, 0, 3.6, 1.3, 2.2, "dark"),
      box("body", 0, 5.02, 0, 4.1, 0.55, 2.35, "leather"),
      box("body", 0, 5.06, 1.2, 0.95, 0.6, 0.35, "brass", "metal"),
      box("body", 0, 3.1, 1.06, 1.25, 2.1, 0.28, "cloth"),
      box("body", 0, 2.45, 1.02, 0.8, 0.9, 0.22, "cloth"),
      box("body", 0, 3.9, -1.25, 3.5, 5.9, 0.32, "cloth"),
      box("body", -1.3, 2.5, -1.2, 1.0, 1.6, 0.26, "cloth"),
      box("body", 0.9, 2.2, -1.2, 1.1, 1.4, 0.26, "cloth"),
      box("cloak", -1.15, 7.9, -1.0, 2.1, 0.45, 2.4, "cloth"),

      // ---- torso: waist, broad ceramic chest, collar ---------------------
      box("body", 0, 6.3, 0, 3.15, 1.5, 2.0, "base"),
      box("body", 0, 7.55, 0, 4.2, 2.05, 2.4, "base"),
      box("body", 0, 7.7, 1.28, 3.0, 1.75, 0.5, "light"),
      box("body", 0, 8.9, 1.45, 2.3, 0.28, 0.26, "ember", "ember"),
      box("body", 0, 7.0, 1.15, 1.2, 0.9, 0.22, "dark"),
      box("body", 0, 9.45, 0, 3.4, 0.8, 2.2, "dark"),
      box("body", 0, 9.0, -1.28, 3.0, 1.2, 0.4, "metal", "metal"),

      // ---- shoulders and arms -------------------------------------------
      ...both("body", 2.3, 9.0, 0, 1.85, 1.4, 2.45, "metal", "metal"),
      ...both("body", 2.95, 9.75, 0, 0.75, 0.9, 0.75, "bone", "bone", { rz: -12 }),
      ...pair("armL", "armR", 2.45, 7.6, 0, 1.2, 1.55, 1.45, "dark"),
      ...pair("armL", "armR", 2.45, 5.95, 0, 1.3, 1.7, 1.5, "metal", "metal"),
      ...pair("armL", "armR", 2.45, 5.1, 0, 1.55, 0.95, 1.65, "leather"),

      // ---- crown helm ----------------------------------------------------
      box("head", 0, 9.85, 0, 1.25, 0.55, 1.25, "dark"),
      box("head", 0, 10.2, 0, 2.35, 2.0, 2.15, "base"),
      box("head", 0, 10.72, 1.06, 1.65, 0.45, 0.25, "ink", "void"),
      ...both("head", 0.45, 10.75, 1.17, 0.35, 0.32, 0.14, "ember", "ember"),
      ...both("head", 1.18, 10.35, 0, 0.35, 1.2, 1.65, "metal", "metal"),
      box("head", 0, 12.1, 0, 2.6, 0.5, 2.3, "brass", "metal"),
      box("head", -1.1, 12.45, 0, 0.55, 1.15, 0.55, "bone", "bone", { rz: 4 }),
      box("head", -0.55, 12.45, 0, 0.5, 1.5, 0.5, "bone", "bone"),
      box("head", 0.1, 12.45, 0, 0.45, 0.75, 0.45, "bone", "bone", { rz: -6 }),
      box("head", 1.0, 12.45, 0, 0.5, 1.3, 0.5, "bone", "bone", { rz: 8 }),

      // ---- greatsword: heavy, wider at the ember-cut tip -----------------
      box("weapon", 2.85, 5.0, 0.7, 0.5, 1.6, 0.5, "leather"),
      box("weapon", 2.85, 4.65, 0.7, 0.9, 0.6, 0.8, "accent", "metal"),
      box("weapon", 2.85, 6.55, 0.7, 2.85, 0.55, 0.8, "brass", "metal"),
      box("weapon", 2.85, 7.05, 0.7, 1.25, 5.2, 0.58, "light", "metal"),
      box("weapon", 2.85, 12.15, 0.7, 0.95, 0.75, 0.5, "light", "metal", { rz: -6 }),
      box("weapon", 3.32, 7.2, 0.92, 0.3, 4.7, 0.22, "ember", "ember"),
      box("weapon", 2.85, 7.4, 0.98, 0.28, 4.2, 0.16, "dark", "void"),
    ],
  },

  {
    id: "cinder_maw",
    element: "fire",
    tags: ["demon", "low", "jaws"],
    idle: "heavy",
    scale: 1.32,
    sway: 0.6,
    pivots: { head: [3.4, 3.0, 0], tail: [-3.2, 3.0, 0], weapon: [4.3, 2.5, 0] },
    parts: [
      // ---- oversized forelegs, tiny rear haunches ------------------------
      ...both("body", 2.5, 0.0, 0, 1.95, 0.8, 2.15, "dark"),
      ...both("body", 2.5, 0.75, 0, 1.65, 1.45, 1.85, "base"),
      ...both("body", 2.5, 0.0, 1.05, 1.55, 0.42, 0.55, "bone", "bone"),
      ...both("body", 3.15, 0.0, 0.55, 0.45, 0.35, 0.5, "bone", "bone"),
      ...both("body", 2.6, 1.9, 0, 1.85, 0.7, 2.0, "stone", "stone"),
      ...both("body", 2.0, 0.0, 0, 1.5, 0.65, 1.7, "dark"),
      ...both("body", 2.0, 0.6, 0, 1.3, 1.35, 1.5, "base"),

      // ---- front-heavy body with furnace cavities between the ribs -------
      box("body", 0, 2.15, 0, 5.4, 2.8, 3.0, "base"),
      box("body", 0, 2.1, 0, 4.6, 0.6, 2.4, "void", "void"),
      box("body", -1.5, 2.55, 1.5, 0.75, 1.6, 0.35, "void", "void"),
      box("body", -0.4, 2.55, 1.5, 0.75, 1.6, 0.35, "void", "void"),
      box("body", 0.8, 2.55, 1.5, 0.75, 1.6, 0.35, "void", "void"),
      box("body", -1.5, 2.85, 1.55, 0.3, 1.0, 0.2, "ember", "ember"),
      box("body", -0.4, 2.85, 1.55, 0.3, 1.0, 0.2, "ember", "ember"),
      box("body", 0.8, 2.85, 1.55, 0.3, 1.0, 0.2, "ember", "ember"),
      box("body", 0, 4.9, 0, 4.6, 0.7, 1.15, "stone", "stone"),
      box("body", -1.2, 5.5, 0, 0.55, 0.9, 0.55, "bone", "bone", { rz: 8 }),
      box("body", 0.5, 5.5, 0, 0.55, 1.15, 0.55, "bone", "bone", { rz: -6 }),
      ...both("body", 2.4, 4.3, 0, 1.5, 0.95, 2.0, "metal", "metal"),

      // ---- furnace chimney ------------------------------------------------
      box("body", -0.2, 4.6, -0.3, 1.75, 2.4, 1.7, "dark"),
      box("body", -0.2, 6.85, -0.3, 1.2, 0.42, 1.2, "ember", "ember"),
      box("body", -0.2, 7.15, -0.3, 1.55, 0.3, 1.55, "brass", "metal"),
      box("body", -0.2, 5.2, 0.6, 1.15, 1.2, 0.25, "ember", "ember"),

      // ---- split obsidian jaws -------------------------------------------
      box("head", 3.5, 3.05, 0, 2.5, 1.8, 2.7, "base"),
      box("head", 3.5, 4.1, 0, 2.2, 0.55, 2.2, "dark"),
      box("head", 4.75, 3.2, 0, 1.15, 0.95, 2.3, "light", "stone"),
      box("head", 4.2, 2.85, 0.95, 0.4, 0.5, 0.4, "bone", "bone"),
      box("head", 4.2, 2.85, -0.95, 0.4, 0.5, 0.4, "bone", "bone"),
      box("head", 3.7, 2.0, 1.05, 2.3, 0.95, 0.85, "dark", "matte", { ry: 8 }),
      box("head", 3.7, 2.0, -1.05, 2.3, 0.95, 0.85, "dark", "matte", { ry: -8 }),
      box("head", 3.6, 2.55, 0, 1.9, 0.9, 1.5, "ember", "ember"),
      ...both("head", 4.4, 3.65, 0.88, 0.42, 0.42, 0.3, "ember", "ember"),
      ...both("head", 3.95, 4.75, 0.9, 0.45, 1.35, 0.45, "bone", "bone", { rz: -16 }),
      box("head", 2.35, 2.9, 0, 1.1, 1.35, 2.0, "dark"),

      // ---- clinker tail ---------------------------------------------------
      box("tail", -3.25, 3.1, 0, 1.8, 0.85, 1.05, "base"),
      box("tail", -4.2, 2.55, 0, 1.4, 0.7, 0.85, "dark"),
      box("tail", -4.9, 2.1, 0, 0.85, 0.55, 0.65, "stone", "stone", { rz: 12 }),

      // ---- scorched hoof patches anchor the lurching stance ----------------
      box("base", 2.5, 0.0, 1.15, 1.5, 0.12, 0.7, "ember", "ember"),
      box("base", -2.2, 0.0, -1.1, 1.2, 0.1, 0.6, "dark", "void"),
    ],
  },

  {
    id: "star_eater",
    element: "fire",
    tags: ["otherworldly", "floating", "void"],
    idle: "hover",
    sway: 0.4,
    pivots: { head: [0, 4.6, 0], weapon: [0, 4.6, 0], wingL: [-2.6, 4.4, 0], wingR: [2.6, 4.4, 0] },
    parts: [
      // ---- suspended eclipse core ----------------------------------------
      box("body", 0, 3.4, 0, 3.2, 3.2, 1.1, "void", "void"),
      box("body", 0, 3.75, 0.6, 2.5, 2.5, 0.35, "dark"),
      box("body", 0, 4.3, 0.78, 1.55, 1.55, 0.2, "ember", "ember"),
      box("body", 0, 4.75, 0.9, 0.9, 0.7, 0.14, "eye", "ember"),
      ...both("body", 1.75, 4.0, 0, 0.35, 2.0, 1.15, "crystal", "crystal"),
      box("body", 0, 2.3, 0, 3.9, 0.35, 1.25, "ember", "ember"),
      box("body", 0, 7.4, 0, 3.9, 0.35, 1.25, "ember", "ember"),

      // ---- the crescent: unequal arms that never close -------------------
      box("wingL", -2.55, 1.4, 0, 1.15, 2.4, 1.1, "void", "void", { rz: -12 }),
      box("wingL", -2.95, 3.6, 0, 1.0, 2.2, 1.0, "dark", "void", { rz: -20 }),
      box("wingL", -2.5, 5.7, 0, 1.1, 2.1, 1.05, "void", "void", { rz: -32 }),
      box("wingL", -1.4, 7.3, 0, 1.3, 1.1, 1.1, "void", "void", { rz: -46 }),
      box("wingL", -3.05, 2.6, 0.6, 0.25, 3.6, 0.2, "ember", "ember", { rz: -16 }),
      box("wingR", 2.55, 1.4, 0, 1.15, 2.4, 1.1, "void", "void", { rz: 12 }),
      box("wingR", 2.95, 3.6, 0, 1.0, 2.2, 1.0, "dark", "void", { rz: 20 }),
      box("wingR", 2.5, 5.7, 0, 1.1, 2.1, 1.05, "void", "void", { rz: 32 }),
      box("wingR", 1.4, 7.3, 0, 1.3, 1.1, 1.1, "void", "void", { rz: 46 }),
      box("wingR", 3.05, 2.6, 0.6, 0.25, 3.6, 0.2, "ember", "ember", { rz: 16 }),

      // ---- three disconnected square rings receding inward ---------------
      box("body", 0, 8.1, 0, 5.2, 0.3, 0.3, "void", "void"),
      box("body", 0, 8.5, 0, 5.2, 0.3, 0.3, "void", "void"),
      box("body", -2.45, 8.1, 0, 0.3, 0.7, 0.3, "void", "void"),
      box("body", 2.45, 8.1, 0, 0.3, 0.7, 0.3, "void", "void"),
      box("body", 0, 8.3, -1.7, 3.8, 0.26, 0.26, "dark", "void"),
      box("body", -1.8, 8.3, -1.7, 0.26, 0.5, 0.26, "dark", "void"),
      box("body", 1.8, 8.3, -1.7, 0.26, 0.5, 0.26, "dark", "void"),
      box("body", 0, 8.2, -2.5, 2.6, 0.22, 0.22, "dark", "void"),
      box("body", -1.25, 8.2, -2.5, 0.22, 0.4, 0.22, "dark", "void"),
      box("body", 1.25, 8.2, -2.5, 0.22, 0.4, 0.22, "dark", "void"),

      // ---- pinpoints and a stable anchor shadow ---------------------------
      box("body", -2.1, 6.6, 0.7, 0.35, 0.35, 0.35, "ember", "ember"),
      box("body", 2.2, 5.4, 0.7, 0.3, 0.3, 0.3, "ember", "ember"),
      box("body", 0.9, 1.5, 0.5, 0.28, 0.28, 0.28, "ember", "ember"),
      box("base", 0, 0.0, 0, 2.4, 0.22, 2.4, "void", "void"),
      box("base", -1.3, 0.15, 0.9, 0.7, 0.35, 0.7, "stone", "stone", { ry: 18 }),
      box("base", 1.35, 0.15, -0.8, 0.6, 0.32, 0.6, "stone", "stone", { ry: -22 }),
    ],
  },
];
