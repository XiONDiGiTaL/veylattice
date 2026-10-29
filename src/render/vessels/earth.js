/**
 * Earth Vessels: sandstone strata, slate plates, mineral seams and heavy
 * horizontal mass. Each one is a different kind of terrain that stood up.
 */

import { box, both, pair } from "./_parts.js";
import { beast, construct, humanoid, spirit } from "./blueprints.js";

const EARTH_CORE = [
  {
    id: "dustveil_matriarch",
    element: "earth",
    tags: ["beast", "wide", "mandibles"],
    idle: "heavy",
    scale: 1.28,
    sway: 0.5,
    pivots: { head: [3.2, 3.0, 0], tail: [-2.9, 2.6, 0], weapon: [4.2, 2.4, 0] },
    parts: [
      // ---- six legs: digging paddles in front, braced behind --------------
      ...both("body", 2.2, 0.0, 1.0, 1.5, 0.42, 1.45, "stone", "stone"),
      ...both("body", 2.2, 0.4, 1.0, 1.3, 1.55, 1.2, "dark"),
      ...both("body", 0.45, 0.0, 1.15, 1.1, 0.4, 1.1, "stone", "stone"),
      ...both("body", 0.45, 0.38, 1.15, 1.0, 1.65, 1.0, "base"),
      ...both("body", -1.75, 0.0, 1.0, 1.5, 0.4, 1.4, "stone", "stone"),
      ...both("body", -1.75, 0.4, 0.95, 1.35, 1.5, 1.25, "dark", "matte", { rz: -8 }),
      ...both("body", 2.1, 0.05, 1.8, 1.4, 0.35, 0.7, "bone", "bone"),
      ...both("body", 0.4, 0.05, 1.75, 1.1, 0.32, 0.6, "bone", "bone"),

      // ---- low sandstone dome ---------------------------------------------
      box("body", -0.2, 2.35, 0, 6.2, 1.15, 3.5, "base"),
      box("body", -0.25, 3.45, 0, 5.0, 0.95, 3.0, "light"),
      box("body", -0.3, 4.35, 0, 3.35, 0.62, 2.2, "base"),
      box("body", -0.3, 3.05, 1.78, 4.6, 0.2, 0.12, "dark"),
      box("body", -0.3, 3.95, 1.55, 3.6, 0.18, 0.12, "dark"),
      box("body", -1.5, 2.5, 1.76, 0.22, 0.75, 0.1, "dark"),
      box("body", 0.6, 2.5, 1.76, 0.22, 0.75, 0.1, "dark"),
      box("body", -0.3, 2.9, -1.78, 4.2, 0.25, 0.12, "stone"),

      // ---- ring of slate cheek plates, like a mineral mane -----------------
      ...both("body", 2.6, 3.0, 1.35, 1.0, 1.5, 0.35, "stone", "stone", { rz: 12 }),
      ...both("body", 1.5, 3.1, 1.62, 0.85, 1.3, 0.3, "stone", "stone", { rz: -6 }),
      ...both("body", 0.4, 3.0, 1.7, 0.8, 1.15, 0.28, "dark", "stone", { rz: 10 }),
      ...both("body", 2.9, 3.4, 0, 0.4, 1.3, 1.8, "stone", "stone", { rz: 8 }),

      // ---- blunt layered mandibles and armoured brow -----------------------
      box("head", 3.55, 2.65, 0, 1.95, 1.7, 2.4, "base"),
      box("head", 3.6, 4.25, 0, 1.85, 0.6, 2.2, "light"),
      box("head", 4.15, 2.35, 0, 1.05, 0.55, 1.8, "dark"),
      ...both("head", 4.55, 2.0, 0.9, 1.7, 0.65, 0.5, "bone", "bone", { ry: 12, rz: -6 }),
      ...both("head", 4.25, 1.45, 0.95, 1.35, 0.55, 0.45, "light", "bone", { ry: 18, rz: -14 }),
      ...both("head", 3.85, 3.45, 0.9, 0.45, 0.45, 0.3, "ember", "ember"),
      ...both("head", 2.4, 4.6, 0.85, 0.35, 0.75, 0.3, "bone", "bone", { rz: -18 }),

      // ---- short mineral tail ----------------------------------------------
      box("tail", -3.4, 2.6, 0, 1.5, 0.9, 1.5, "stone", "stone"),
      box("tail", -4.3, 2.85, 0, 1.0, 0.7, 1.0, "dark"),
      box("tail", -4.8, 3.05, 0, 0.55, 0.5, 0.55, "accent", "crystal"),

      // ---- sifted dust furrow under the digging paddles -------------------
      box("base", 1.6, 0.0, 1.7, 3.4, 0.16, 0.75, "light", "matte"),
      box("base", -1.9, 0.0, 1.55, 2.6, 0.13, 0.6, "base", "matte"),
    ],
  },

  {
    id: "bastion_first_mountain",
    element: "earth",
    tags: ["construct", "tall", "blocky"],
    idle: "heavy",
    scale: 1.05,
    sway: 0.4,
    pivots: { head: [0, 4.4, 0], armL: [-3.9, 4.4, 0], armR: [3.9, 4.4, 0] },
    parts: [
      // ---- wedge feet, strata body ----------------------------------------
      ...both("body", 2.15, 0.0, 0.25, 2.25, 1.4, 3.2, "stone", "stone"),
      ...both("body", 2.15, 0.0, 1.55, 2.0, 0.55, 0.7, "dark"),
      box("body", 0, 0.35, 0, 6.3, 1.75, 3.4, "dark"),
      box("body", 0, 1.9, 0, 6.6, 2.0, 3.5, "stone"),
      box("body", 0, 3.9, 0, 6.9, 2.5, 3.6, "base"),
      box("body", 0, 2.75, 1.78, 5.5, 0.3, 0.14, "light"),
      box("body", 0, 4.55, 1.85, 5.9, 0.28, 0.14, "light"),
      box("body", 0, 5.2, -1.85, 6.0, 0.3, 0.14, "stone"),

      // ---- stair-stepped slate shoulders -----------------------------------
      ...both("body", 3.6, 6.15, 0, 1.6, 1.1, 3.0, "stone", "stone"),
      ...both("body", 3.2, 7.05, 0, 1.15, 0.75, 2.6, "dark"),
      ...both("body", 4.15, 5.55, 0, 0.75, 0.85, 2.4, "base", "stone", { rz: -6 }),

      // ---- pillar arms -----------------------------------------------------
      ...pair("armL", "armR", 3.95, 0.55, 0, 1.85, 4.6, 2.25, "stone", "stone"),
      ...both("armL", 3.95, 0.0, 0, 2.15, 0.65, 2.6, "dark"),
      ...both("body", 3.95, 3.65, 1.16, 1.4, 0.35, 0.14, "light"),
      ...both("body", 3.95, 1.75, 1.16, 1.3, 0.3, 0.14, "light"),

      // ---- chest recess with an amber core ---------------------------------
      box("body", 0, 2.35, 1.72, 2.35, 1.9, 0.4, "void", "void"),
      box("body", 0, 2.75, 1.9, 0.95, 0.95, 0.3, "ember", "ember"),
      box("body", 0, 3.45, 1.9, 1.35, 0.28, 0.3, "brass", "metal"),
      ...both("body", 1.45, 2.45, 1.88, 0.28, 1.6, 0.28, "accent", "crystal"),

      // ---- tiny inset head below the skyline --------------------------------
      box("head", 0, 4.55, 1.05, 2.2, 1.45, 1.4, "dark"),
      box("head", 0, 4.95, 1.8, 1.45, 0.28, 0.16, "ember", "ember"),
      box("head", 0, 4.5, -1.6, 2.6, 1.6, 0.55, "dark", "stone"),

      // ---- skyline crown -----------------------------------------------------
      box("body", -1.35, 6.4, -0.2, 1.1, 1.35, 2.4, "stone", "stone"),
      box("body", 0.15, 6.4, -0.2, 0.9, 0.95, 2.0, "base"),
      box("body", 1.45, 6.4, -0.2, 1.05, 1.6, 2.2, "stone", "stone", { rz: -5 }),
      box("body", 0.6, 6.65, 1.05, 0.3, 0.5, 0.4, "accent", "crystal"),
    ],
  },

  {
    id: "gilt_ash_bargainer",
    element: "earth",
    tags: ["demon", "horned", "broad"],
    idle: "breathe",
    sway: 0.7,
    pivots: { head: [0, 5.5, 0], weapon: [2.8, 6.4, 0] },
    parts: [
      // ---- squat legs under a wide sandstone merchant -----------------------
      ...pair("legL", "legR", 1.4, 0.0, 0, 1.7, 0.65, 2.05, "leather"),
      ...pair("legL", "legR", 1.4, 0.6, 0, 1.45, 1.45, 1.7, "dark"),
      ...both("body", 1.4, 2.0, 0.35, 1.35, 0.55, 1.25, "base"),
      box("body", 0, 2.0, 0, 4.4, 2.1, 2.8, "base"),
      box("body", 0, 3.95, 0, 5.15, 1.85, 3.0, "base"),
      box("body", 0, 2.2, 1.45, 3.2, 1.35, 0.35, "light"),
      box("body", 0, 3.15, 1.55, 2.6, 0.22, 0.16, "dark"),

      // ---- belt with hanging parchment seals --------------------------------
      box("body", 0, 1.85, 0, 4.55, 0.55, 2.95, "leather"),
      box("body", 0, 1.9, 1.5, 0.9, 0.6, 0.25, "brass", "metal"),
      box("body", -1.35, 0.75, 1.55, 0.55, 1.15, 0.2, "bone", "bone"),
      box("body", 0.15, 0.55, 1.6, 0.5, 1.35, 0.2, "bone", "bone"),
      box("body", 1.15, 0.9, 1.5, 0.5, 1.0, 0.2, "bone", "bone", { rz: 4 }),
      box("body", -1.35, 1.55, 1.62, 0.28, 0.28, 0.14, "ember", "ember"),

      // ---- massive sandstone wrist cuffs ------------------------------------
      ...both("body", 2.75, 2.1, 0, 1.45, 2.1, 2.1, "stone", "stone"),
      ...both("body", 2.75, 2.1, 1.1, 1.2, 1.8, 0.2, "dark"),
      ...pair("armL", "armR", 2.75, 4.1, 0, 1.2, 1.5, 1.5, "leather"),
      ...both("body", 2.75, 4.1, 0, 1.55, 0.55, 1.8, "brass", "metal"),

      // ---- cracked gold double mask, one horn and one stone stump ----------
      box("head", 0, 5.6, 0, 2.4, 2.0, 2.15, "base"),
      box("head", -0.55, 5.65, 1.05, 1.05, 1.75, 0.4, "brass", "metal", { ry: -5 }),
      box("head", 0.6, 5.65, 1.05, 1.05, 1.75, 0.4, "brass", "metal", { ry: 6 }),
      box("head", 0.05, 5.7, 1.12, 0.16, 1.6, 0.1, "void", "void"),
      ...both("head", 0.55, 6.55, 1.27, 0.3, 0.3, 0.14, "ember", "ember"),
      box("head", -1.45, 7.5, 0, 0.55, 1.75, 0.55, "bone", "bone", { rz: 14 }),
      box("head", -1.8, 8.85, 0, 0.55, 1.15, 0.5, "bone", "bone", { rz: 34 }),
      box("head", 1.45, 7.5, 0, 0.95, 0.6, 0.9, "stone", "stone"),
      box("head", 0, 7.55, 0, 1.2, 0.4, 1.3, "dark"),

      // ---- suspended balance scale ------------------------------------------
      box("weapon", 2.75, 5.7, 0.95, 0.22, 2.9, 0.22, "brass", "metal"),
      box("weapon", 2.75, 8.4, 0.95, 2.7, 0.22, 0.22, "brass", "metal"),
      box("weapon", 1.65, 7.8, 0.95, 0.9, 0.25, 0.9, "brass", "metal"),
      box("weapon", 3.85, 8.0, 0.95, 0.85, 0.22, 0.85, "dark", "metal"),
      box("weapon", 1.65, 7.95, 0.95, 0.18, 0.5, 0.18, "brass", "metal"),
      box("weapon", 3.85, 8.15, 0.95, 0.16, 0.45, 0.16, "brass", "metal"),
    ],
  },

  {
    id: "rootbound_witness",
    element: "earth",
    tags: ["ancient", "monolith", "roots"],
    idle: "breathe",
    scale: 1.08,
    sway: 0.4,
    pivots: { head: [0, 7.0, 0] },
    parts: [
      // ---- hidden root pedestals lift the slab off the ground --------------
      ...both("base", 1.25, 0.0, 0, 1.35, 0.75, 1.9, "stone", "stone"),
      ...both("base", 1.35, 0.0, 0.95, 1.05, 0.4, 0.5, "accent", "wood"),
      box("base", -0.6, 0.25, -1.2, 1.1, 0.5, 0.35, "accent", "wood", { ry: 20 }),
      box("base", 0.7, 0.25, 1.2, 1.0, 0.45, 0.3, "accent", "wood", { ry: -18 }),

      // ---- weathered slab with rust strata ---------------------------------
      box("body", 0, 0.7, 0, 2.85, 6.5, 1.85, "base"),
      box("body", 0, 0.95, -0.98, 3.2, 5.9, 0.32, "stone", "stone"),
      box("body", 0, 1.9, 0.94, 2.55, 0.3, 0.14, "light"),
      box("body", 0, 3.35, 0.94, 2.4, 0.28, 0.14, "light"),
      box("body", 0, 5.15, 0.94, 2.25, 0.26, 0.14, "light"),
      box("body", -0.95, 2.2, 0.96, 0.22, 3.4, 0.12, "dark"),
      box("body", 1.02, 2.6, 0.96, 0.2, 2.6, 0.12, "dark"),
      box("body", 0.55, 4.15, 1.0, 0.5, 0.5, 0.16, "accent", "crystal"),

      // ---- single carved horizontal eye -------------------------------------
      box("head", 0, 4.15, 0.9, 1.65, 0.55, 0.22, "ember", "ember"),
      box("head", 0, 4.05, 0.85, 1.95, 0.22, 0.16, "dark"),
      box("head", 0, 4.6, 0.85, 1.95, 0.22, 0.16, "dark"),

      // ---- crown of three unequal standing stones ---------------------------
      box("head", -1.3, 7.2, 0, 1.0, 2.2, 1.55, "stone", "stone", { rz: -5 }),
      box("head", 0.15, 7.2, 0, 0.9, 1.45, 1.3, "base"),
      box("head", 1.4, 7.2, 0, 1.0, 1.85, 1.5, "stone", "stone", { rz: 4 }),
      box("head", 0.15, 8.55, 0, 0.65, 0.5, 0.9, "bone", "bone"),
      box("head", -0.55, 8.4, 0.4, 0.35, 0.35, 0.35, "accent", "crystal"),

      // ---- hanging root tendrils --------------------------------------------
      box("cloak", -1.5, 3.6, 0.6, 0.3, 2.3, 0.3, "accent", "wood", { rz: 6 }),
      box("cloak", -1.55, 2.2, 0.55, 0.26, 1.8, 0.26, "wood", "wood", { rz: -4 }),
      box("cloak", 1.5, 4.0, 0.55, 0.28, 2.0, 0.28, "accent", "wood", { rz: -7 }),
      box("cloak", 1.6, 2.7, 0.5, 0.24, 1.6, 0.24, "wood", "wood", { rz: 5 }),
      box("cloak", -1.45, 1.15, -0.55, 0.24, 1.5, 0.24, "accent", "wood", { rz: 9 }),
      box("cloak", 1.35, 1.35, -0.6, 0.22, 1.3, 0.22, "wood", "wood", { rz: -8 }),
      box("body", -1.05, 5.6, 0.95, 0.28, 1.15, 0.14, "dark"),
      box("body", 1.0, 6.1, 0.95, 0.26, 0.95, 0.14, "dark"),
      box("body", 0, 6.35, 0.96, 0.75, 0.22, 0.12, "accent", "crystal"),
      box("base", 1.55, 0.05, 0.85, 0.6, 0.3, 0.55, "dark", "stone", { ry: 20 }),
    ],
  },
];

export const EARTH_VESSELS = [
  ...EARTH_CORE,
  humanoid({ id: "rubble_warden", element: "earth", head: "helm", weapon: "hammer", offhand: "shield", cape: "none", crest: "spikes", stance: "wide", pauldrons: 1.35, hunch: 0.12, height: 0.88, bulk: 1.14, accent: "accent", tone: "stone" }),
  humanoid({ id: "clayfist_brawler", element: "earth", head: "mask", weapon: "fists", offhand: "none", cape: "none", crest: "none", stance: "bent", hunch: 0.25, pauldrons: 1.2, height: 0.96, bulk: 1.14, accent: "light", tone: "dark" }),
  humanoid({ id: "dust_sage", element: "earth", head: "hood", weapon: "staff", offhand: "lantern", cape: "short", crest: "none", robe: true, hunch: 0.34, height: 0.94, bulk: 0.94, accent: "light", tone: "cloth" }),
  beast({ id: "slatehorn_ram", element: "earth", posture: "low", horn: "ram", tail: "tusk", shell: true, height: 1.0, bulk: 1.16, scale: 1.14, accent: "bone", tone: "stone" }),
  humanoid({ id: "quarry_engineer", element: "earth", head: "mask", weapon: "spear", offhand: "lantern", cape: "none", crest: "none", stance: "normal", pack: true, pauldrons: 1.0, height: 0.97, bulk: 1.08, accent: "brass", tone: "base" }),
  construct({ id: "obsidian_mason", element: "earth", frame: "heavy", crest: "crown", height: 1.03, bulk: 1.2, accent: "light", tone: "dark" }),
  construct({ id: "tomb_colossus", element: "earth", frame: "tower", crest: "bell", height: 1.16, bulk: 1.3, accent: "bone", tone: "stone" }),
  spirit({ id: "crown_of_dust", element: "earth", form: "crowned", arms: 0, height: 1.12, bulk: 1.0, accent: "light", tone: "stone" }),
  // A broad, bald, bearded veteran: deep brown skin, a heavy square jaw, quilted
  // campaign coat, and a shield arm raised across the body. Nothing else in the
  // roster stands in this stance.
  humanoid({
    id: "oathstone_knight", element: "earth", human: true, head: "human",
    hair: "bald", beard: "full", pose: "guard", garment: "quilt",
    headW: 1.14, headH: 0.94, jaw: 1.2, nose: 1.15, ears: 1.1,
    palette: { skin: "#8a5a3c", skinShade: "#6b4229", hair: "#2b221b", eye: "#c69a52" },
    frame: 1.14, sleeves: "short", weapon: "sword", offhand: "shield",
    cape: "short", stance: "bent", height: 1.02, bulk: 1.14, accent: "light", tone: "cloth", pouch: true, pauldron: true,
  }),
];
