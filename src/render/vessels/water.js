/**
 * Water Vessels: translucent aqua glass, wet shell, pearl bone and ribbon-like
 * fins. Every silhouette is built from flowing or suspended negative space so
 * the element reads without relying on blue.
 */

import { box, both } from "./_parts.js";
import { beast, construct, humanoid, spirit } from "./blueprints.js";

const WATER_CORE = [
  {
    id: "mireglass_stalker",
    element: "water",
    tags: ["beast", "low", "quadruped"],
    idle: "breathe",
    scale: 1.3,
    sway: 0.7,
    pivots: { head: [3.4, 2.4, 0], tail: [-2.4, 2.2, 0], weapon: [4.4, 1.8, 0] },
    parts: [
      // ---- compact hindquarters, disproportionately long forelimbs -------
      ...both("body", 2.25, 0.0, 0, 1.3, 0.5, 1.95, "base"),
      ...both("body", 2.25, 0.5, 0, 1.25, 1.55, 1.45, "dark"),
      ...both("body", 1.55, 0.9, 0.2, 1.1, 1.85, 1.15, "dark"),
      ...both("body", 1.9, 0.0, 0.35, 1.0, 1.4, 1.05, "base"),
      ...both("body", 1.45, 0.0, 1.15, 0.75, 0.35, 0.55, "bone", "bone"),
      ...both("body", 2.15, 0.0, 1.15, 0.75, 0.35, 0.55, "bone", "bone"),
      ...both("body", 1.8, 0.0, 1.15, 0.55, 0.3, 0.5, "bone", "bone"),

      // ---- long low body under a stepped glass carapace ------------------
      box("body", -0.5, 1.75, 0, 3.9, 1.95, 2.8, "base"),
      box("body", -0.5, 1.7, 0, 3.4, 0.45, 2.2, "bone", "bone"),
      box("body", -0.6, 3.6, 0, 3.3, 0.62, 2.35, "light", "glass"),
      box("body", -0.7, 4.15, 0, 2.5, 0.5, 1.8, "accent", "glass"),
      box("body", -0.8, 4.6, 0, 1.5, 0.35, 1.1, "light", "glass"),
      box("body", -0.5, 4.55, 1.35, 2.4, 0.28, 0.25, "light", "crystal"),
      box("body", -0.5, 3.95, -1.35, 2.4, 0.28, 0.25, "light", "crystal"),

      // ---- ribs showing through the glass --------------------------------
      box("body", -1.4, 2.0, 1.42, 0.3, 1.35, 0.14, "bone", "bone"),
      box("body", -0.5, 2.0, 1.42, 0.3, 1.35, 0.14, "bone", "bone"),
      box("body", 0.4, 2.0, 1.42, 0.3, 1.35, 0.14, "bone", "bone"),

      // ---- shovel snout, six backward gill fins --------------------------
      box("head", 2.35, 2.25, 0, 1.85, 1.5, 2.3, "base"),
      box("head", 3.7, 2.45, 0, 1.55, 0.85, 2.35, "light", "bone"),
      box("head", 4.5, 2.55, 0, 0.5, 0.55, 1.9, "accent", "crystal"),
      ...both("head", 3.95, 3.35, 0.95, 0.4, 0.4, 0.3, "ember", "ember"),
      ...both("head", 4.55, 2.85, 0.72, 0.28, 0.22, 0.28, "ink", "void"),
      box("head", 2.4, 2.0, 0, 1.6, 0.5, 1.5, "dark"),
      // three fins per side, swept backwards
      ...both("head", 3.9, 3.5, 1.2, 1.5, 0.55, 0.22, "light", "glass", { rz: 22 }),
      ...both("head", 3.4, 3.9, 1.25, 1.4, 0.5, 0.22, "accent", "glass", { rz: 30 }),
      ...both("head", 2.9, 4.2, 1.2, 1.2, 0.45, 0.2, "light", "glass", { rz: 38 }),
      ...both("head", 3.7, 3.0, -1.2, 1.5, 0.7, 0.22, "base", "glass", { rz: -18 }),

      // ---- paddle tail ----------------------------------------------------
      box("tail", -2.5, 2.15, 0, 1.75, 1.25, 1.6, "base"),
      box("tail", -3.7, 2.45, 0, 1.4, 0.9, 1.1, "dark"),
      box("tail", -4.6, 3.1, 0, 1.35, 1.9, 0.25, "light", "glass", { rz: -10 }),
      box("tail", -4.55, 1.75, 0, 1.1, 0.9, 0.22, "accent", "glass"),

      // ---- wet contact patches so the crouch is anchored to the tile -----
      box("base", -0.6, 0.0, 1.35, 2.2, 0.14, 0.6, "dark", "glass"),
      box("base", 1.9, 0.0, 1.3, 1.4, 0.12, 0.55, "base", "glass"),
    ],
  },

  {
    id: "wyrm_drowned_vault",
    element: "water",
    tags: ["dragon", "serpentine", "long"],
    idle: "sway",
    scale: 1.05,
    sway: 1.3,
    pivots: {
      head: [1.4, 5.0, 0],
      tail: [-1.9, 1.6, 0],
      wingL: [-0.6, 3.0, 0],
      wingR: [0.6, 3.0, 0],
    },
    parts: [
      // ---- tight coil at the base -----------------------------------------
      box("body", 0, 0.4, 1.7, 2.0, 1.5, 1.8, "light", "matte"),
      box("body", 1.5, 0.45, 1.0, 1.9, 1.5, 1.7, "base", "matte", { ry: 45 }),
      box("body", 1.75, 0.5, -0.5, 1.9, 1.6, 1.7, "light", "matte", { ry: 90 }),
      box("body", 0.85, 0.45, -1.7, 1.9, 1.5, 1.7, "base", "matte", { ry: 135 }),
      box("body", -0.8, 0.5, -1.7, 1.9, 1.55, 1.7, "light", "matte", { ry: 200 }),
      box("body", -1.8, 0.5, -0.4, 1.9, 1.5, 1.7, "base", "matte", { ry: 250 }),
      box("body", -1.6, 0.45, 1.1, 1.9, 1.5, 1.7, "light", "matte", { ry: 300 }),
      // shell-white belly plates ride the outside of the coil
      box("body", 0, 0.3, 2.6, 1.5, 0.7, 0.2, "bone", "bone"),
      box("body", 2.6, 0.4, 0, 0.2, 0.7, 1.3, "bone", "bone"),
      box("body", -2.6, 0.4, 0, 0.2, 0.7, 1.3, "bone", "bone"),

      // ---- body rising in a clear S, not a hidden neck --------------------
      box("body", 0.1, 1.7, 0.9, 2.0, 1.3, 2.0, "base", "matte", { rz: -6 }),
      box("body", 0.0, 2.9, 0.6, 1.95, 1.35, 1.9, "light", "matte", { rz: 4 }),
      box("body", 0.4, 4.0, 0.4, 1.9, 1.3, 1.85, "base", "matte", { rz: -8 }),
      box("body", 0.9, 5.0, 0.3, 1.85, 1.25, 1.8, "light", "matte", { rz: -12 }),
      // dorsal fin ridges
      box("body", 0.1, 1.9, -0.9, 1.2, 1.4, 0.2, "accent", "glass", { rz: 10 }),
      box("body", 0.2, 3.1, -0.75, 1.1, 1.3, 0.2, "light", "glass", { rz: -8 }),
      box("body", 0.55, 4.2, -0.6, 1.0, 1.2, 0.2, "accent", "glass", { rz: 12 }),

      // ---- head, jaw and crown of broken bronze bells ---------------------
      box("head", 1.55, 6.0, 0.2, 2.5, 1.9, 2.2, "base"),
      box("head", 2.65, 6.1, 0.2, 1.1, 1.1, 1.7, "light"),
      box("head", 3.15, 6.2, 0.2, 0.5, 0.6, 1.2, "accent", "crystal"),
      box("head", 2.0, 5.55, 0.2, 2.2, 0.55, 1.9, "bone", "bone"),
      ...both("head", 2.0, 7.1, 0.9, 0.5, 0.4, 0.3, "ember", "ember"),
      ...both("head", 1.8, 7.4, 0.6, 0.6, 0.9, 0.35, "accent", "crystal", { rz: -18 }),
      box("head", 1.0, 7.9, 0.2, 0.8, 0.9, 0.8, "brass", "metal"),
      box("head", 1.9, 8.0, 0.2, 1.05, 1.15, 1.0, "brass", "metal"),
      box("head", 2.8, 7.85, 0.2, 0.7, 0.8, 0.7, "brass", "metal", { rz: 12 }),
      box("head", 1.9, 9.2, 0.2, 0.2, 0.45, 0.2, "brass", "metal"),
      ...both("head", 2.1, 6.2, -1.05, 1.5, 1.0, 0.2, "light", "glass", { rz: -12 }),

      // ---- finned tail ----------------------------------------------------
      box("tail", -2.3, 1.3, 0.8, 1.6, 1.1, 1.3, "base", "matte", { rz: 14 }),
      box("tail", -3.3, 2.0, 0.6, 1.3, 0.9, 1.0, "light"),
      box("tail", -4.0, 2.9, 0.5, 1.4, 1.9, 0.22, "light", "glass", { rz: 14 }),
      // ---- a ring of water marks the tile its coil occupies ----------------
      box("base", 0, 0.0, 2.45, 3.6, 0.16, 0.5, "dark", "glass"),
      box("base", 0, 0.0, -2.45, 3.6, 0.16, 0.5, "base", "glass"),
      box("base", 2.45, 0.0, 0, 0.5, 0.16, 3.6, "base", "glass"),
      box("base", -2.45, 0.0, 0, 0.5, 0.16, 3.6, "dark", "glass"),
    ],
  },

  {
    id: "lantern_lost_choir",
    element: "water",
    tags: ["spirit", "floating", "lantern"],
    idle: "hover",
    sway: 0.6,
    pivots: { head: [0, 6.5, 0], body: [0, 4.4, 0], weapon: [0, 4.4, 0] },
    parts: [
      // ---- hexagonal dark-metal cage, no humanoid torso -------------------
      box("body", 0, 1.95, 0, 3.15, 0.55, 3.15, "metal", "metal"),
      box("body", 0, 1.6, 0, 3.6, 0.4, 3.6, "dark"),
      box("body", 0, 6.35, 0, 2.45, 0.55, 2.45, "metal", "metal"),
      box("body", 0, 6.85, 0, 1.1, 0.4, 1.1, "brass", "metal"),
      box("body", 0, 2.5, 1.55, 0.28, 3.85, 0.28, "metal", "metal"),
      box("body", 0, 2.5, -1.55, 0.28, 3.85, 0.28, "metal", "metal"),
      box("body", 1.4, 2.5, 0.78, 0.28, 3.85, 0.28, "metal", "metal"),
      box("body", -1.4, 2.5, 0.78, 0.28, 3.85, 0.28, "metal", "metal"),
      box("body", 1.4, 2.5, -0.78, 0.28, 3.85, 0.28, "metal", "metal"),
      box("body", -1.4, 2.5, -0.78, 0.28, 3.85, 0.28, "metal", "metal"),
      box("body", 0, 4.3, 0, 1.55, 0.2, 1.55, "brass", "metal"),
      box("body", 2.05, 4.3, 0, 1.0, 0.22, 0.22, "metal", "metal"),
      box("body", -2.05, 4.3, 0, 1.0, 0.22, 0.22, "metal", "metal"),
      box("body", 1.15, 2.1, 1.15, 0.3, 0.3, 0.3, "brass", "metal"),
      box("body", -1.15, 2.1, 1.15, 0.3, 0.3, 0.3, "brass", "metal"),
      box("body", 0, 6.0, 1.15, 0.9, 0.22, 0.2, "brass", "metal"),

      // ---- blue-glass lantern body with a warm pearl flame ----------------
      box("body", 0, 2.55, 0, 2.45, 3.6, 2.45, "base", "glass"),
      box("body", 0, 2.7, 0, 1.9, 3.3, 1.9, "light", "glass"),
      box("body", 0, 3.3, 0, 1.15, 1.85, 1.15, "ember", "ember"),
      box("body", 0, 3.7, 0, 0.7, 0.95, 0.7, "eye", "ember"),
      box("body", 0, 5.35, 0, 1.85, 0.35, 1.85, "glow", "crystal"),

      // ---- three mask fragments orbiting at unequal heights ---------------
      box("head", -1.75, 5.55, 0.55, 0.95, 0.8, 0.35, "bone", "bone", { ry: -24 }),
      box("head", -1.75, 5.85, 0.72, 0.4, 0.18, 0.1, "ink", "void"),
      box("head", 1.85, 6.9, 0.3, 0.85, 0.75, 0.32, "bone", "bone", { ry: 32 }),
      box("head", 1.85, 7.15, 0.45, 0.35, 0.16, 0.1, "ink", "void"),
      box("head", 0.3, 1.15, 1.6, 0.9, 0.7, 0.3, "bone", "bone", { ry: 8 }),
      box("head", 0.3, 1.4, 1.74, 0.35, 0.15, 0.1, "ink", "void"),

      // ---- two ribbon streams hanging below -------------------------------
      box("tail", -1.1, 0.2, 1.1, 0.32, 1.85, 0.24, "light", "glass", { rz: 4 }),
      box("tail", -1.35, 0.0, 1.1, 0.55, 0.35, 0.26, "accent", "glass", { rz: -14 }),
      box("tail", 1.25, 0.4, 1.05, 0.3, 1.6, 0.24, "light", "glass", { rz: -5 }),
      box("tail", 1.5, 0.15, 1.05, 0.5, 0.35, 0.26, "accent", "glass", { rz: 14 }),
      box("base", 0, 0.15, 0, 1.5, 0.22, 1.5, "glow", "crystal"),
    ],
  },

  {
    id: "unwritten_guest",
    element: "water",
    tags: ["otherworldly", "floating", "shards"],
    idle: "hover",
    sway: 0.5,
    pivots: { head: [0.5, 6.2, 0], cloak: [0, 5.4, 0] },
    parts: [
      // ---- inverted teardrop of suspended rain-glass slabs ----------------
      box("body", 0, 3.9, 0, 2.6, 3.3, 1.9, "void", "void"),
      box("body", -0.85, 3.1, 0.9, 1.1, 3.6, 0.35, "base", "glass", { rz: 4 }),
      box("body", 0.0, 2.7, 1.0, 1.2, 4.3, 0.3, "light", "glass"),
      box("body", 0.9, 3.3, 0.9, 1.05, 3.3, 0.35, "base", "glass", { rz: -5 }),
      box("body", -0.6, 3.6, -0.95, 1.4, 3.0, 0.3, "dark", "glass", { rz: -3 }),
      box("body", 0.75, 3.4, -0.95, 1.2, 3.2, 0.28, "base", "glass", { rz: 6 }),
      box("body", 0.0, 1.6, 0.55, 1.55, 2.1, 0.4, "dark", "glass"),
      box("body", 0.0, 2.2, 9e-1, 0.28, 2.5, 0.16, "void", "void"),
      box("body", -1.3, 4.4, 0.2, 0.35, 2.4, 0.3, "light", "crystal", { rz: 8 }),
      box("body", 1.35, 4.2, 0.2, 0.32, 2.6, 0.28, "accent", "crystal", { rz: -8 }),

      // ---- blank faceplate offset from the vertical axis ------------------
      box("head", 0.5, 6.15, 0.6, 1.95, 1.85, 0.55, "bone", "matte"),
      box("head", 0.5, 6.35, 0.9, 1.55, 1.4, 0.2, "light", "bone"),
      box("head", 0.5, 7.15, 0.92, 0.8, 0.18, 0.1, "ink", "void"),
      box("head", -0.1, 6.5, 0.95, 0.2, 0.22, 0.12, "ink", "void"),
      box("head", 1.1, 6.5, 0.95, 0.2, 0.22, 0.12, "ink", "void"),

      // ---- cloak flows upward into three broad broken panels --------------
      box("cloak", -1.5, 5.9, -0.3, 1.35, 2.9, 0.28, "base", "glass", { rz: 16 }),
      box("cloak", 0.0, 6.2, -0.55, 1.3, 3.6, 0.28, "light", "glass"),
      box("cloak", 1.55, 5.8, -0.3, 1.3, 2.7, 0.28, "base", "glass", { rz: -16 }),
      box("cloak", -1.9, 7.9, -0.35, 0.9, 1.4, 0.24, "dark", "glass", { rz: 26 }),
      box("cloak", 1.95, 7.7, -0.35, 0.85, 1.2, 0.24, "dark", "glass", { rz: -26 }),
      box("cloak", 0.0, 8.4, -0.6, 0.9, 1.1, 0.24, "accent", "glass", { rz: 4 }),
      box("cloak", -0.95, 7.65, -0.42, 0.72, 1.5, 0.22, "base", "glass", { rz: 10 }),
      box("cloak", 1.0, 7.5, -0.42, 0.7, 1.3, 0.22, "light", "glass", { rz: -10 }),
      box("body", 0.0, 4.6, 1.12, 0.55, 1.9, 0.2, "accent", "glass"),
      box("body", -1.05, 2.05, 0.95, 0.5, 1.65, 0.22, "base", "glass", { rz: 5 }),
      box("body", 1.1, 2.25, 0.92, 0.48, 1.5, 0.22, "light", "glass", { rz: -5 }),

      // ---- shards settling upward, no hands or feet ------------------------
      box("base", 0, 0.15, 0, 1.9, 0.25, 1.9, "void", "void"),
      box("base", -0.7, 0.4, 0.7, 0.5, 1.1, 0.5, "light", "crystal", { ry: 18 }),
      box("base", 0.75, 0.35, 0.6, 0.45, 0.9, 0.45, "accent", "crystal", { ry: -22 }),
      box("base", 0.2, 0.5, -0.8, 0.4, 0.75, 0.4, "base", "crystal"),
    ],
  },
];

export const WATER_VESSELS = [
  ...WATER_CORE,
  humanoid({ id: "tidecaller_acolyte", element: "water", head: "circlet", weapon: "staff", offhand: "orb", cape: "short", crest: "none", robe: true, height: 0.9, bulk: 0.88, accent: "crystal", tone: "cloth" }),
  humanoid({ id: "reef_duelist", element: "water", head: "circlet", weapon: "sword", offhand: "buckler", cape: "none", crest: "feather", stance: "bent", pauldrons: 1.15, height: 0.94, bulk: 0.96, accent: "light", tone: "base" }),
  spirit({ id: "saltglass_siren", element: "water", form: "wraith", arms: 4, height: 1.0, bulk: 0.94, accent: "crystal", tone: "cloth" }),
  beast({ id: "brine_hound", element: "water", build: "lean", posture: "low", horn: "none", tail: "fan", height: 1.02, bulk: 0.94, scale: 1.15, accent: "crystal", tone: "dark" }),
  humanoid({ id: "abyssal_cartographer", element: "water", head: "hood", weapon: "staff", offhand: "tome", cape: "short", crest: "none", stance: "stilt", hunch: 0.3, height: 1.0, bulk: 1.04, accent: "brass", tone: "cloth" }),
  humanoid({ id: "riptide_monk", element: "water", head: "mask", weapon: "fists", offhand: "none", cape: "none", crest: "none", stance: "bent", hunch: 0.2, height: 0.99, bulk: 1.0, accent: "light", tone: "base" }),
  construct({ id: "leviathan_shard", element: "water", frame: "heavy", crest: "chimney", height: 1.05, bulk: 1.3, accent: "crystal", tone: "stone" }),
  spirit({ id: "hollow_current", element: "water", form: "wraith", arms: 2, height: 1.16, bulk: 1.02, accent: "glow", tone: "dark" }),
  // A deep-brown spearman with cropped hair, bare arms and a scale coat. The
  // spear is gripped high, so his stance reads as braced behind a shield.
  humanoid({
    id: "tidewall_sentinel", element: "water", human: true, head: "human",
    hair: "shaved", beard: "stubble", pose: "guard", garment: "scale",
    headW: 1.06, headH: 1.0, jaw: 1.1, nose: 1.1, ears: 1.05,
    palette: { skin: "#7c4b31", skinShade: "#5d3623", hair: "#1c1614", eye: "#a8dcd0" },
    frame: 1.08, sleeves: "none", weapon: "spear", offhand: "shield",
    cape: "none", stance: "wide", height: 1.0, bulk: 1.06, accent: "crystal", tone: "cloth", scarf: true,
  }),
];
