/**
 * Metal Vessels: brushed plates, visible hinges, rivets and etched alloys.
 * Metallic construction is expressed through hard edges, layered plates and
 * bright brushed rims rather than through a single grey tone.
 */

import { box, both, pair } from "./_parts.js";
import { construct, humanoid, serpent } from "./blueprints.js";

const METAL_CORE = [
  {
    id: "argent_nightlancer",
    element: "metal",
    tags: ["warrior", "tall", "lance"],
    idle: "breathe",
    sway: 0.6,
    palette: { accent: "#b6a4e8", glow: "#9d86e0" },
    pivots: { weapon: [2.55, 6.2, 0.6], head: [0, 9.8, 0], armL: [-2.0, 8.7, 0], armR: [2.0, 8.7, 0] },
    parts: [
      // ---- narrow legs in layered lamellar ----------------------------------
      ...pair("legL", "legR", 0.85, 0.0, 0, 1.35, 0.9, 1.9, "leather"),
      ...both("body", 0.85, 0.15, 0.85, 1.15, 0.5, 0.5, "metal", "metal"),
      ...pair("legL", "legR", 0.85, 0.9, 0, 1.15, 2.3, 1.35, "dark"),
      ...both("body", 0.85, 1.25, 0.72, 0.9, 1.5, 0.22, "light", "metal"),
      ...both("body", 0.85, 3.2, 0, 1.45, 0.6, 1.45, "metal", "metal"),
      ...pair("legL", "legR", 0.85, 3.7, 0, 1.3, 1.55, 1.5, "base"),

      // ---- lamellar skirt with stepped plates -------------------------------
      box("body", 0, 4.85, 0, 3.2, 1.0, 2.0, "dark"),
      box("body", 0, 4.05, 1.0, 2.6, 0.95, 0.3, "metal", "metal"),
      box("body", 0, 3.45, 1.02, 2.2, 0.85, 0.26, "dark", "metal"),
      box("body", -1.35, 4.2, 0.55, 0.85, 1.1, 1.2, "metal", "metal", { ry: -18 }),
      box("body", 1.35, 4.2, 0.55, 0.85, 1.1, 1.2, "metal", "metal", { ry: 18 }),
      box("body", 0, 4.6, -1.0, 2.4, 1.2, 0.3, "dark"),

      // ---- torso: matte underlayers, bright breastplate ---------------------
      box("body", 0, 5.85, 0, 2.85, 1.5, 1.85, "dark"),
      box("body", 0, 7.2, 0, 3.7, 2.1, 2.1, "base"),
      box("body", 0, 7.35, 1.12, 2.45, 1.6, 0.4, "light", "metal"),
      box("body", 0, 8.4, 1.3, 1.9, 0.24, 0.2, "accent", "crystal"),
      box("body", 0, 6.35, 1.02, 1.2, 0.65, 0.22, "metal", "metal"),
      box("body", 0, 8.9, 0, 3.0, 0.55, 1.9, "metal", "metal"),

      // ---- shoulders, arms, crescent-clasped helm ---------------------------
      ...both("body", 2.15, 8.55, 0, 1.55, 1.05, 2.15, "metal", "metal"),
      ...both("body", 2.7, 9.1, 0, 0.6, 0.55, 1.4, "light", "metal", { rz: -14 }),
      ...pair("armL", "armR", 2.15, 7.2, 0, 1.05, 1.4, 1.25, "dark"),
      ...pair("armL", "armR", 2.15, 5.75, 0, 1.15, 1.5, 1.35, "metal", "metal"),
      ...pair("armL", "armR", 2.15, 5.0, 0, 1.35, 0.8, 1.45, "dark"),

      box("head", 0, 9.35, 0, 1.1, 0.5, 1.1, "dark"),
      box("head", 0, 9.8, 0, 1.95, 2.05, 1.9, "metal", "metal"),
      box("head", 0, 10.2, 0.96, 1.45, 0.42, 0.22, "ink", "void"),
      ...both("head", 0.42, 10.28, 1.06, 0.28, 0.28, 0.12, "eye", "ember"),
      box("head", 0, 11.5, 0, 2.45, 0.32, 1.9, "light", "metal"),
      box("head", -1.1, 11.75, 0, 0.45, 0.85, 0.35, "accent", "metal", { rz: 24 }),
      box("head", 1.1, 11.75, 0, 0.45, 0.85, 0.35, "accent", "metal", { rz: -24 }),
      box("head", 0, 11.85, 0, 0.4, 0.5, 0.4, "accent", "crystal"),

      // ---- single shoulder banner, violet ribbon ---------------------------
      box("cloak", -2.05, 7.8, -0.9, 0.16, 5.2, 0.16, "metal", "metal"),
      box("cloak", -2.35, 8.6, -0.9, 1.0, 2.6, 0.18, "accent", "cloth"),
      box("cloak", -2.35, 7.6, -0.9, 0.85, 0.9, 0.16, "accent", "cloth", { rz: 12 }),
      box("cloak", 0.3, 5.9, -1.05, 0.45, 2.4, 0.16, "accent", "cloth", { rz: -8 }),

      // ---- the lance: long, straight, held away from the torso -------------
      box("weapon", 2.55, 0.4, 0.6, 0.4, 11.9, 0.4, "metal", "metal"),
      box("weapon", 2.55, 0.0, 0.6, 0.72, 0.55, 0.72, "dark"),
      box("weapon", 2.55, 11.9, 0.6, 0.95, 1.35, 0.42, "light", "metal"),
      box("weapon", 2.55, 13.2, 0.6, 0.45, 0.55, 0.3, "accent", "crystal"),
      box("weapon", 2.55, 9.0, 0.6, 1.5, 0.3, 0.75, "brass", "metal"),
      box("weapon", 2.55, 6.4, 0.6, 0.9, 0.22, 0.5, "accent", "metal"),
    ],
  },

  {
    id: "tidemark_astrologer",
    element: "metal",
    tags: ["mystic", "masked", "astrolabe"],
    idle: "breathe",
    sway: 0.9,
    pivots: { weapon: [2.7, 6.2, 0], head: [0, 7.9, 0], cloak: [0, 4.6, 0] },
    parts: [
      // ---- segmented midnight robe panels ----------------------------------
      box("body", 0, 0.1, 0.9, 2.9, 0.6, 0.5, "dark", "cloth"),
      box("body", 0, 0.2, 0, 3.5, 1.5, 2.5, "cloth"),
      box("body", 0, 1.6, 0, 3.0, 1.5, 2.2, "base"),
      box("body", 0, 3.0, 0, 2.6, 1.4, 2.0, "cloth"),
      box("body", -1.35, 1.2, 0.7, 0.55, 2.8, 0.3, "dark", "cloth", { ry: -12 }),
      box("body", 1.35, 1.4, 0.7, 0.55, 2.6, 0.3, "dark", "cloth", { ry: 12 }),
      box("body", 0, 1.75, 1.15, 1.5, 1.5, 0.22, "brass", "metal"),
      box("body", 0, 2.05, 1.28, 0.35, 0.85, 0.1, "accent", "crystal"),
      box("body", 0, 4.3, 0, 2.25, 1.5, 1.75, "base"),
      box("body", 0, 4.4, 0.92, 1.7, 1.15, 0.3, "brass", "metal"),

      // ---- slim arms, one raised to the instrument --------------------------
      ...both("body", 1.55, 5.5, 0, 1.2, 0.8, 1.6, "dark", "metal"),
      ...pair("armL", "armR", 1.6, 4.2, 0, 0.85, 1.5, 1.05, "cloth"),
      ...pair("armL", "armR", 1.6, 3.4, 0, 0.95, 0.9, 1.15, "leather"),
      box("armR", 2.45, 5.6, 0.4, 0.75, 1.5, 0.75, "base", "cloth", { rz: -24 }),

      // ---- masked face with one diagonal star notch -------------------------
      box("head", 0, 5.8, 0, 1.05, 0.4, 1.0, "dark"),
      box("head", 0, 6.2, 0, 1.9, 1.9, 1.75, "metal", "metal"),
      box("head", 0, 6.5, 0.88, 1.35, 0.9, 0.25, "light", "metal"),
      box("head", 0.2, 7.45, 1.0, 0.28, 0.32, 0.12, "accent", "crystal", { rz: 40 }),
      box("head", 0.2, 7.45, 1.0, 0.6, 0.14, 0.1, "accent", "crystal", { rz: 40 }),
      box("head", -0.35, 6.75, 1.02, 0.3, 0.28, 0.1, "ink", "void"),
      box("head", -1.05, 6.4, 0, 0.3, 1.5, 1.5, "base", "metal", { rz: 6 }),
      box("head", 1.05, 6.4, 0, 0.3, 1.5, 1.5, "base", "metal", { rz: -6 }),

      // ---- broken silver marker halo ---------------------------------------
      box("head", -1.5, 8.15, -0.4, 0.9, 0.28, 0.28, "light", "metal", { rz: 18 }),
      box("head", -0.55, 8.5, -0.4, 0.85, 0.26, 0.26, "light", "metal", { rz: 6 }),
      box("head", 1.45, 8.2, -0.4, 0.85, 0.26, 0.26, "base", "metal", { rz: -16 }),
      box("head", 0.65, 8.5, -0.4, 0.55, 0.22, 0.22, "accent", "crystal"),

      // ---- asymmetrical astrolabe beside the raised right hand -------------
      box("weapon", 2.65, 6.05, 0.4, 3.1, 0.22, 0.22, "brass", "metal", { ry: 18 }),
      box("weapon", 2.65, 4.9, 0.4, 0.22, 3.2, 0.22, "brass", "metal", { ry: 18 }),
      box("weapon", 2.65, 4.35, 0.4, 2.4, 0.18, 0.18, "light", "metal", { ry: -32 }),
      box("weapon", 2.65, 7.25, 0.4, 0.18, 2.3, 0.18, "light", "metal", { rz: 48 }),
      box("weapon", 2.65, 5.55, 0.4, 0.9, 0.9, 0.3, "ember", "crystal"),
      box("weapon", 2.65, 5.7, 0.55, 0.45, 0.45, 0.2, "eye", "ember"),
      box("weapon", 2.65, 3.9, 0.4, 0.5, 0.45, 0.5, "brass", "metal"),
    ],
  },

  {
    id: "ironwrought_hound",
    element: "metal",
    tags: ["construct", "low", "quadruped"],
    idle: "breathe",
    scale: 1.32,
    sway: 0.5,
    pivots: { head: [3.2, 2.9, 0], tail: [-2.9, 3.1, 0], weapon: [4.0, 2.6, 0] },
    parts: [
      // ---- low mechanical runner: piston ankles, paws, brass joints --------
      ...both("body", 2.0, 0.0, 0.95, 0.95, 0.42, 1.25, "dark"),
      ...both("body", 2.0, 0.42, 0.95, 0.6, 1.0, 0.55, "base", "metal"),
      ...both("body", 2.0, 1.32, 0.85, 0.95, 0.45, 0.8, "brass", "metal"),
      ...both("body", -1.75, 0.0, 0.95, 0.9, 0.4, 1.2, "dark"),
      ...both("body", -1.75, 0.4, 0.95, 0.55, 1.05, 0.5, "base", "metal"),
      ...both("body", -1.75, 1.35, 0.85, 0.9, 0.42, 0.75, "brass", "metal"),

      // ---- long low body with rib plates and dark joint gaps ---------------
      box("body", 0, 1.55, 0, 4.4, 1.55, 2.05, "dark", "metal"),
      box("body", 0, 1.5, 0, 3.7, 0.42, 1.9, "void", "void"),
      box("body", 0, 2.9, 0, 3.5, 0.4, 1.65, "base"),
      box("body", 0, 1.6, 1.12, 3.4, 0.9, 0.2, "base", "metal"),
      ...both("body", 0.4, 1.65, 1.02, 1.15, 0.3, 0.2, "light", "metal", { rz: 12 }),
      ...both("body", 0.4, 2.12, 1.02, 1.1, 0.28, 0.2, "light", "metal", { rz: 12 }),
      ...both("body", 0.4, 2.6, 1.0, 1.05, 0.26, 0.18, "base", "metal", { rz: 12 }),
      ...both("body", -1.4, 1.9, 0.95, 2.6, 0.14, 0.14, "brass", "metal", { rz: -26 }),
      ...both("body", 2.15, 2.1, 0, 1.3, 0.7, 1.95, "dark", "metal"),

      // ---- wedge head, offset amber lens, folded ears -----------------------
      box("body", 2.1, 2.3, 0, 1.25, 1.1, 1.5, "base", "metal", { rz: -8 }),
      box("head", 3.0, 2.25, 0, 1.9, 1.5, 1.95, "base", "metal"),
      box("head", 4.1, 2.4, 0, 1.35, 1.0, 1.55, "base", "metal", { rz: -6 }),
      box("head", 4.62, 2.55, 0, 0.4, 0.42, 1.0, "light", "metal"),
      box("head", 4.75, 2.5, 0, 0.55, 0.6, 1.2, "dark"),
      box("head", 4.2, 2.02, 0, 1.25, 0.42, 1.4, "void", "void"),
      box("head", 3.45, 2.95, 0.78, 0.72, 0.72, 0.3, "accent", "ember"),
      box("head", 3.45, 2.95, -0.78, 0.4, 0.4, 0.28, "dark"),
      ...both("head", 4.65, 1.95, 0.85, 0.7, 0.26, 0.4, "bone", "bone"),
      box("head", 2.7, 3.7, 0.62, 0.65, 0.85, 0.18, "base", "metal", { ry: -18 }),
      box("head", 2.7, 3.7, -0.62, 0.65, 0.85, 0.18, "base", "metal", { ry: 18 }),
      box("head", 2.35, 3.55, 0, 0.65, 0.5, 1.1, "dark"),

      // ---- short level segmented balancing tail ----------------------------
      box("tail", -2.55, 2.35, 0, 1.4, 0.5, 0.65, "metal", "metal"),
      box("tail", -3.4, 2.55, 0, 1.15, 0.42, 0.55, "base", "metal", { rz: 8 }),
      box("tail", -4.15, 2.75, 0, 0.8, 0.36, 0.45, "brass", "metal", { rz: 16 }),

      // ---- ground scuffs and a sensor wash keep the runner planted --------
      box("base", 2.0, 0.0, 1.15, 1.5, 0.12, 0.7, "dark", "void"),
      box("base", -1.9, 0.0, 1.1, 1.3, 0.1, 0.6, "dark", "void"),
      box("base", 4.85, 0.0, 0.75, 0.6, 0.22, 0.6, "accent", "ember"),
    ],
  },

  {
    id: "cloudbreak_coil",
    element: "metal",
    tags: ["dragon", "serpentine", "crest"],
    idle: "hover",
    sway: 1.1,
    pivots: { head: [2.9, 5.6, 0], tail: [-3.4, 2.4, 0], wingL: [-0.4, 4.6, 0], wingR: [0.4, 4.6, 0] },
    parts: [
      // ---- lean S-shaped airborne spine ------------------------------------
      box("tail", -3.6, 2.3, 0, 1.7, 0.85, 1.0, "base", "metal", { rz: 22 }),
      box("tail", -4.6, 2.95, 0, 1.4, 0.65, 0.8, "dark", "metal", { rz: 34 }),
      box("tail", -5.2, 3.35, 0, 0.95, 0.5, 0.6, "accent", "crystal"),
      box("body", -2.5, 2.7, 0, 1.9, 1.1, 1.3, "base", "metal", { rz: 14 }),
      box("body", -1.3, 3.25, 0, 2.0, 1.2, 1.4, "dark", "metal", { rz: 8 }),
      box("body", 0.0, 3.9, 0, 2.1, 1.25, 1.5, "base", "metal", { rz: -6 }),
      box("body", 1.2, 4.5, 0, 2.0, 1.2, 1.45, "dark", "metal", { rz: -14 }),
      box("body", 2.1, 5.15, 0, 1.7, 1.15, 1.35, "base", "metal", { rz: -20 }),
      // brushed scale edges
      box("body", -1.3, 3.9, 0.72, 1.6, 0.24, 0.16, "light", "metal", { rz: 8 }),
      box("body", 0.0, 4.5, 0.78, 1.6, 0.22, 0.16, "light", "metal", { rz: -6 }),
      box("body", 1.2, 5.1, 0.76, 1.5, 0.2, 0.16, "light", "metal", { rz: -14 }),

      // ---- neck, narrow blade snout, forked lightning crest ----------------
      box("head", 2.6, 5.75, 0, 1.9, 1.5, 1.7, "base", "metal"),
      box("head", 3.6, 5.95, 0, 1.5, 0.95, 1.35, "light", "metal", { rz: -8 }),
      box("head", 4.35, 6.15, 0, 0.9, 0.6, 0.95, "accent", "metal", { rz: -12 }),
      ...both("head", 2.75, 6.65, 0.72, 0.42, 0.38, 0.28, "eye", "ember"),
      box("head", 2.45, 7.2, 0, 0.35, 1.75, 0.35, "light", "metal", { rz: -16 }),
      box("head", 2.95, 6.95, 0, 0.35, 1.65, 0.35, "light", "metal", { rz: -30 }),
      box("head", 2.75, 7.85, 0, 0.45, 0.45, 0.45, "accent", "crystal"),
      box("head", 1.95, 6.6, 0.9, 1.2, 0.6, 0.25, "light", "metal", { rz: 12 }),
      box("head", 1.95, 6.6, -0.9, 1.2, 0.6, 0.25, "light", "metal", { rz: 12 }),

      // ---- three turbine fins concentrated near the neck -------------------
      box("wingL", 0.9, 5.05, 1.1, 1.5, 0.55, 0.2, "base", "metal", { rz: 26 }),
      box("wingL", 0.4, 5.4, 1.15, 1.0, 0.45, 0.18, "accent", "crystal", { rz: 40 }),
      box("wingR", 1.4, 4.65, -1.1, 1.5, 0.55, 0.2, "base", "metal", { rz: 26 }),
      box("wingR", 1.9, 4.7, -1.15, 1.0, 0.45, 0.18, "accent", "crystal", { rz: 40 }),
      box("wingL", -0.6, 4.4, 1.18, 1.35, 0.5, 0.18, "dark", "metal", { rz: 10 }),
      box("wingR", -0.1, 4.35, -1.18, 1.35, 0.5, 0.18, "dark", "metal", { rz: 10 }),

      // ---- charge paths and hover anchor -----------------------------------
      box("body", 0.4, 3.6, 0.78, 0.2, 2.4, 0.16, "accent", "crystal", { rz: -22 }),
      box("body", -1.9, 2.75, 0.62, 0.16, 1.6, 0.14, "accent", "crystal", { rz: 30 }),
      box("base", 0, 0.1, 0, 2.2, 0.2, 2.2, "void", "void"),
      box("base", 0, 0.35, 0, 0.9, 0.35, 0.9, "glow", "crystal"),
    ],
  },
];

export const METAL_VESSELS = [
  ...METAL_CORE,
  humanoid({ id: "copper_squire", element: "metal", head: "helm", weapon: "sword", offhand: "buckler", cape: "short", crest: "none", stance: "narrow", pauldrons: 1.15, height: 0.9, bulk: 0.9, accent: "light", tone: "base" }),
  humanoid({ id: "lattice_artificer", element: "metal", head: "mask", weapon: "staff", offhand: "tome", cape: "short", crest: "none", stance: "stilt", height: 0.95, bulk: 0.98, accent: "glow", tone: "cloth" }),
  humanoid({ id: "razorline_duelist", element: "metal", head: "mask", weapon: "wire", offhand: "none", cape: "long", crest: "none", stance: "narrow", height: 0.99, bulk: 0.88, accent: "light", tone: "dark" }),
  // Tall, narrow-faced and fair, with an auburn braid and a mail coat. She rests
  // the axe head against her shoulder: the only human holding a weapon up.
  humanoid({
    id: "ironvow_paladin", element: "metal", human: true, head: "human",
    hair: "braid", beard: "none", pose: "shoulder", garment: "mail",
    headW: 0.9, headH: 1.08, jaw: 0.9, nose: 0.85, ears: 0.9,
    palette: { skin: "#e6bf9f", skinShade: "#c29474", hair: "#6d3a22", eye: "#8fbfd6" },
    frame: 0.98, sleeves: "long", weapon: "axe", offhand: "none",
    cape: "long", capeTone: "cloth", stance: "normal", height: 1.07, bulk: 1.0, accent: "brass", tone: "base", bracer: true,
  }),
  humanoid({ id: "null_choir_cantor", element: "metal", head: "mask", weapon: "staff", offhand: "orb", cape: "long", crest: "none", robe: true, arms: 4, height: 1.04, bulk: 1.0, accent: "glow", tone: "cloth" }),
  // Ironstep is a narrow piston-legged walker with a single lamp head and an
  // antenna spine: deliberately nothing like the coiled hydra below.
  construct({ id: "ironstep_sentinel", element: "metal", frame: "slim", crest: "antenna", height: 1.02, bulk: 0.88, accent: "glow", tone: "metal" }),
  humanoid({ id: "stormforge_lancer", element: "metal", head: "helm", weapon: "spear", offhand: "shield", cape: "short", crest: "plume", stance: "wide", pauldrons: 1.3, height: 1.08, bulk: 1.04, accent: "glow", tone: "base" }),
  // The hydra is a serpent, not a two-legged chassis: coils, three fanned
  // necks, no legs, brass scale plates along the spine.
  serpent({ id: "clockwork_hydra", element: "metal", body: "coiled", heads: 3, coils: 3, forelegs: true, hood: false, height: 1.02, bulk: 1.12, scale: 1.06, accent: "glow", tone: "metal" }),
  construct({ id: "quiet_engine", element: "metal", frame: "quad", crest: "ring", height: 1.14, bulk: 1.1, accent: "glow", tone: "dark" }),
];
