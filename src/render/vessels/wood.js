/**
 * Wood Vessels: carved bark bands, root joints, leaf-stepped fins, moss and
 * sap-glass. Wood is expressed through organic asymmetry and grain, not by
 * painting every unit leaf-green.
 */

import { box, both } from "./_parts.js";
import { beast, construct, drake, humanoid, spirit } from "./blueprints.js";

const WOOD_CORE = [
  {
    id: "hollowroot_oracle",
    element: "wood",
    tags: ["mystic", "robed", "staff"],
    idle: "breathe",
    scale: 1.12,
    sway: 0.9,
    palette: { base: "#6b7a4a", light: "#e6e2c0" },
    pivots: { head: [0, 5.6, 0], weapon: [2.3, 1.0, 0.4] },
    parts: [
      // ---- wide pear-shaped robe of layered bark strips --------------------
      box("body", 0, 0.15, 0, 4.9, 1.45, 3.2, "dark", "wood"),
      box("body", 0, 1.5, 0, 4.35, 1.3, 2.85, "base", "wood"),
      box("body", 0, 2.7, 0, 3.7, 1.25, 2.45, "base", "wood"),
      box("body", 0, 3.75, 0, 3.0, 1.0, 2.05, "dark", "wood"),
      box("body", 0, 4.55, 0, 2.55, 0.7, 1.8, "base", "wood"),
      box("body", -1.75, 0.95, 0.95, 0.55, 2.4, 0.3, "wood", "wood", { ry: -8 }),
      box("body", 1.8, 1.05, 0.9, 0.5, 2.3, 0.28, "wood", "wood", { ry: 8 }),
      box("body", 0, 1.9, 1.45, 0.8, 2.6, 0.24, "dark", "wood", { rz: 3 }),
      box("body", -0.95, 1.55, 1.42, 0.5, 2.3, 0.22, "base", "wood"),
      box("body", 1.0, 1.6, 1.4, 0.45, 2.2, 0.2, "light", "wood"),
      box("body", -2.0, 2.5, 0.6, 0.5, 0.5, 0.5, "accent", "wood"),
      box("body", 1.95, 3.0, 0.4, 0.45, 0.4, 0.45, "light", "wood"),
      // forked root feet
      ...both("base", 1.05, 0.0, 0.7, 0.9, 0.35, 1.6, "dark", "wood"),
      ...both("base", 0.7, 0.0, -0.8, 0.65, 0.3, 1.0, "wood", "wood", { ry: 22 }),

      // ---- large oval timber mask with a hollow seed-light -----------------
      box("head", 0, 4.85, 0, 1.1, 0.35, 1.1, "dark", "wood"),
      box("head", 0, 5.1, 0, 2.7, 2.5, 1.6, "light", "wood"),
      box("head", 0, 5.45, 0.68, 1.55, 1.7, 0.45, "void", "void"),
      box("head", 0, 6.0, 0.86, 0.5, 0.5, 0.16, "eye", "ember"),
      box("head", 0, 5.15, 0.86, 1.9, 0.18, 0.2, "dark", "wood"),
      box("head", -1.3, 5.5, 0, 0.4, 1.8, 1.3, "base", "wood"),
      box("head", 1.3, 5.5, 0, 0.4, 1.8, 1.3, "base", "wood"),
      box("head", 0, 7.35, 0, 2.2, 0.4, 1.5, "base", "wood"),
      // crooked single antler
      box("head", -1.5, 7.55, 0, 0.34, 1.9, 0.34, "bone", "wood", { rz: 12 }),
      box("head", -1.85, 9.1, 0, 0.3, 1.1, 0.3, "bone", "wood", { rz: 34 }),
      box("head", -2.15, 10.0, 0, 0.26, 0.65, 0.26, "bone", "wood", { rz: 52 }),
      box("head", -1.25, 8.65, 0, 0.75, 0.26, 0.26, "bone", "wood", { rz: -28 }),

      // ---- staff over the shoulder with three seed lamps -------------------
      box("weapon", 2.55, 0.1, 0.4, 0.4, 7.7, 0.4, "base", "wood"),
      box("weapon", 2.55, 7.6, 0.4, 0.36, 2.1, 0.36, "wood", "wood", { rz: -14 }),
      box("weapon", 3.0, 9.5, 0.4, 0.3, 0.95, 0.3, "base", "wood", { rz: -36 }),
      box("weapon", 2.3, 9.0, 0.4, 0.7, 0.18, 0.18, "accent", "wood", { rz: 20 }),
      box("weapon", 2.9, 7.85, 0.4, 0.55, 0.34, 0.24, "brass", "metal"),
      box("weapon", 2.9, 7.5, 0.4, 0.4, 0.46, 0.32, "ember", "ember"),
      box("weapon", 2.68, 6.9, 0.4, 0.46, 0.3, 0.22, "brass", "metal"),
      box("weapon", 2.68, 6.55, 0.4, 0.36, 0.44, 0.3, "accent", "ember"),
      box("weapon", 2.42, 5.9, 0.4, 0.4, 0.28, 0.2, "brass", "metal"),
      box("weapon", 2.42, 5.55, 0.4, 0.32, 0.4, 0.28, "ember", "ember"),

      // ---- moss and cream fungal details ------------------------------------
      box("body", -1.25, 3.6, 0.55, 0.6, 0.28, 0.4, "accent", "matte", { ry: 12 }),
      box("body", 1.2, 3.25, -0.5, 0.55, 0.26, 0.36, "accent", "matte", { ry: -14 }),
      box("body", 0.45, 4.55, -0.55, 0.5, 0.32, 0.32, "bone", "bone"),
      box("body", -0.7, 0.4, 1.5, 0.6, 0.26, 0.28, "bone", "bone"),
      box("body", 1.55, 0.35, 1.45, 0.5, 0.24, 0.26, "bone", "bone"),
    ],
  },

  {
    id: "verdant_colossus",
    element: "wood",
    tags: ["ancient", "huge", "branches"],
    idle: "heavy",
    scale: 0.96,
    sway: 0.6,
    pivots: { head: [0, 4.4, 0], armL: [-3.6, 5.0, 0], armR: [3.6, 5.0, 0], cloak: [0, 6.6, 0] },
    parts: [
      // ---- two root legs with a visible gap between them -------------------
      ...both("body", 2.2, 0.0, 0.3, 2.2, 2.4, 2.6, "dark", "wood"),
      ...both("body", 2.2, 0.0, 1.5, 2.55, 0.55, 1.0, "wood", "wood"),
      ...both("body", 3.2, 0.25, 0.9, 0.8, 1.3, 0.9, "accent", "wood", { rz: -22 }),
      ...both("body", 2.0, 2.3, 0.2, 2.2, 0.45, 2.2, "accent", "matte"),

      // ---- narrower trunk body so the root legs stay visible ---------------
      box("body", 0, 2.55, 0, 4.7, 2.15, 2.8, "base"),
      box("body", 0, 4.55, 0, 5.5, 0.9, 2.9, "dark"),
      box("body", 0, 2.85, 1.42, 3.2, 1.35, 0.3, "accent", "matte"),
      box("body", 0, 2.6, 1.48, 4.2, 0.45, 0.2, "dark", "wood"),
      box("body", -1.6, 2.9, 1.5, 0.26, 1.8, 0.14, "light", "wood"),
      box("body", 1.35, 3.1, 1.5, 0.24, 1.6, 0.14, "wood", "wood"),

      // ---- low face knot between the shoulders ------------------------------
      box("head", 0, 4.35, 0.9, 2.0, 1.45, 1.2, "wood", "wood"),
      box("head", 0, 4.6, 1.52, 1.65, 0.9, 0.25, "dark", "wood"),
      ...both("head", 0.46, 4.98, 1.62, 0.32, 0.28, 0.14, "ember", "ember"),
      box("head", 0, 5.65, 0.9, 1.35, 0.4, 1.05, "accent", "matte"),
      box("body", -2.95, 4.55, 0, 2.2, 1.9, 2.8, "base", "wood", { rz: -9 }),
      box("body", 2.95, 4.55, 0, 2.2, 1.9, 2.8, "base", "wood", { rz: 9 }),
      box("body", -2.7, 5.8, 0, 1.3, 0.4, 2.4, "dark", "wood", { rz: -10 }),
      box("body", 2.7, 5.8, 0, 1.3, 0.4, 2.4, "dark", "wood", { rz: 10 }),

      // ---- left arm is a hanging root bundle -------------------------------
      box("armL", -3.65, 2.2, 0.2, 0.6, 2.8, 0.6, "wood", "wood"),
      box("armL", -3.95, 0.9, 0.3, 0.45, 2.2, 0.45, "dark", "wood", { rz: 8 }),
      box("armL", -3.35, 0.6, 0.25, 0.4, 2.4, 0.4, "accent", "wood", { rz: -6 }),
      box("armL", -3.8, 0.15, 0.9, 0.38, 1.4, 0.38, "wood", "wood", { rz: 14 }),

      // ---- right arm is a mossy stone fist ---------------------------------
      box("armR", 3.65, 2.3, 0.2, 1.3, 2.3, 1.5, "accent", "matte"),
      box("armR", 3.7, 2.5, 1.0, 1.05, 1.5, 0.3, "stone", "stone"),
      box("armR", 3.65, 0.5, 0.3, 1.55, 2.0, 1.7, "stone", "stone"),
      box("armR", 3.65, 0.55, 1.2, 1.2, 0.5, 0.3, "light", "stone"),
      box("armR", 4.05, 1.05, 1.25, 0.45, 0.9, 0.3, "accent", "matte"),

      // ---- flat square-cut canopy and fungal shelves -----------------------
      box("cloak", 0, 6.6, 0, 7.4, 0.7, 3.2, "base", "wood"),
      box("cloak", 0, 7.3, 0, 6.2, 0.55, 2.7, "light", "wood"),
      box("cloak", -1.7, 7.85, 0, 2.9, 0.5, 2.3, "light", "wood"),
      box("cloak", 1.75, 7.85, 0, 2.7, 0.5, 2.2, "light", "wood"),
      box("cloak", 0, 8.35, -0.3, 3.2, 0.4, 1.7, "base", "wood"),
      box("cloak", -3.5, 7.65, 1.0, 1.1, 0.3, 0.9, "bone", "bone"),
      box("cloak", 3.45, 7.65, -0.9, 1.0, 0.28, 0.85, "bone", "bone"),
      box("cloak", -2.3, 8.1, -0.9, 0.9, 0.26, 0.8, "bone", "bone"),
      box("cloak", 2.5, 8.15, 0.85, 0.85, 0.24, 0.7, "bone", "bone"),
      box("cloak", 0.4, 8.7, 0, 0.6, 0.7, 0.6, "accent", "matte", { rz: 18 }),
      box("cloak", -0.5, 6.85, 1.3, 0.4, 1.1, 0.24, "accent", "wood", { rz: -12 }),
    ],
  },

  {
    id: "bell_unmoored",
    element: "wood",
    tags: ["spirit", "floating", "bell"],
    idle: "hover",
    sway: 1.2,
    palette: { accent: "#d8f0a8", glow: "#c8ff9e" },
    pivots: { head: [0, 4.6, 0], body: [0, 3.0, 0], tail: [0, 1.6, 0] },
    parts: [
      // ---- floating inverted temple bell of carved dark wood ---------------
      box("body", 0, 2.1, 0, 4.15, 1.25, 4.15, "dark", "wood"),
      box("body", 0, 3.35, 0, 3.65, 1.15, 3.65, "base", "wood"),
      box("body", 0, 4.5, 0, 3.05, 1.05, 3.05, "base", "wood"),
      box("body", 0, 1.75, 0, 4.55, 0.38, 4.55, "wood", "wood"),
      box("body", 0, 5.55, 0, 2.3, 0.5, 2.3, "dark", "wood"),
      // grain bands
      box("body", 0, 2.85, 1.9, 3.9, 0.2, 0.14, "dark", "wood"),
      box("body", 0, 3.95, 1.7, 3.4, 0.18, 0.12, "dark", "wood"),
      box("body", -1.7, 2.4, 0, 0.16, 1.5, 3.6, "dark", "wood"),
      box("body", 1.7, 2.4, 0, 0.16, 1.5, 3.6, "dark", "wood"),
      // irregular side opening with the pale-jade clapper inside
      box("body", 2.05, 2.45, 0.6, 0.35, 1.5, 1.5, "void", "void"),
      box("body", 1.6, 2.55, 0.6, 0.5, 1.3, 1.2, "light", "crystal"),
      box("body", 1.6, 3.2, 0.6, 0.35, 0.35, 0.9, "accent", "crystal"),

      // ---- root handle ------------------------------------------------------
      box("head", 0, 6.0, 0, 0.8, 1.2, 0.8, "wood", "wood", { rz: 6 }),
      box("head", 0, 7.15, 0, 1.25, 0.42, 0.55, "dark", "wood", { rz: -8 }),
      box("head", 0, 7.5, 0, 0.75, 0.5, 0.4, "wood", "wood", { rz: 16 }),
      box("head", 0.55, 6.5, 0, 0.28, 1.0, 0.28, "dark", "wood", { rz: 24 }),
      box("head", -0.55, 6.6, 0, 0.26, 0.9, 0.26, "dark", "wood", { rz: -24 }),

      // ---- five prayer charms orbiting the rim ----------------------------
      box("tail", -2.5, 0.85, 0.8, 0.55, 1.15, 0.16, "bone", "bone", { ry: -18 }),
      box("tail", -2.6, 1.75, 0.2, 0.5, 0.95, 0.15, "light", "wood", { ry: -32 }),
      box("tail", 2.55, 0.7, -0.7, 0.52, 1.2, 0.16, "bone", "bone", { ry: 22 }),
      box("tail", 2.4, 1.9, 0.4, 0.48, 0.9, 0.15, "light", "wood", { ry: 30 }),
      box("tail", -0.6, 0.5, 2.45, 0.55, 1.1, 0.16, "bone", "bone", { ry: 8 }),
      box("tail", 1.1, 2.2, 2.3, 0.5, 0.8, 0.15, "light", "wood", { ry: -10 }),
      box("tail", -2.5, 0.6, 0.8, 0.2, 0.2, 0.2, "accent", "crystal"),

      // ---- square-edged sound ring and floating anchor ---------------------
      box("body", 0, 6.9, 0, 1.9, 0.14, 0.14, "glow", "crystal"),
      box("body", 0, 6.9, 1.0, 1.4, 0.12, 0.12, "glow", "crystal", { ry: 40 }),
      box("base", 0, 0.1, 0, 1.6, 0.18, 1.6, "void", "void"),
      box("base", -0.4, 0.28, 0.4, 0.5, 0.25, 0.5, "wood", "wood", { ry: 24 }),
      box("base", 0.5, 0.2, -0.4, 0.4, 0.2, 0.4, "dark", "wood", { ry: -18 }),

      // ---- rim brackets and grain splits ------------------------------------
      box("body", 0, 1.5, 1.95, 2.4, 0.22, 0.2, "dark", "wood"),
      box("body", 1.95, 1.5, 0, 0.2, 0.22, 2.4, "dark", "wood"),
      box("body", -1.4, 5.05, 1.2, 0.5, 0.9, 0.2, "dark", "wood", { rz: -8 }),
      box("body", 1.3, 4.95, -1.15, 0.45, 0.8, 0.18, "dark", "wood", { rz: 8 }),
    ],
  },
];

export const WOOD_VESSELS = [
  ...WOOD_CORE,
  humanoid({ id: "thornwood_sentinel", element: "wood", head: "helm", weapon: "spear", offhand: "shield", cape: "none", crest: "horns", stance: "wide", pauldrons: 1.25, hunch: 0.15, height: 1.0, bulk: 1.1, accent: "light", tone: "wood" }),
  beast({ id: "bramble_stalker", element: "wood", build: "lean", posture: "prowl", horn: "spike", tail: "whip", legs: 6, height: 0.96, bulk: 1.0, scale: 1.14, accent: "light", tone: "dark" }),
  beast({ id: "mossback_warden", element: "wood", posture: "tall", horn: "tusk", tail: "club", shell: true, height: 1.1, bulk: 1.3, scale: 1.02, accent: "crystal", tone: "stone" }),
  humanoid({ id: "whisperleaf_oracle", element: "wood", head: "hood", weapon: "staff", offhand: "tome", cape: "short", crest: "feather", robe: true, wings: "feather", wingTone: "wood", height: 0.95, bulk: 0.9, accent: "light", tone: "cloth" }),
  humanoid({ id: "grove_harrier", element: "wood", head: "hood", weapon: "daggers", offhand: "none", cape: "short", crest: "none", stance: "narrow", hunch: 0.4, wings: "feather", wingTone: "wood", height: 0.94, bulk: 0.86, accent: "light", tone: "dark" }),
  beast({ id: "antlered_bulwark", element: "wood", posture: "rear", horn: "antler", tail: "whip", height: 1.14, bulk: 1.22, scale: 1.05, accent: "bone", tone: "base" }),
  spirit({ id: "willow_veil_priest", element: "wood", form: "veiled", height: 1.06, bulk: 1.0, accent: "light", tone: "cloth" }),
  drake({ id: "canopy_wyrm", element: "wood", plan: "wyvern", wings: "broad", necks: 1, horns: "swept", height: 1.05, bulk: 1.05, accent: "light", tone: "dark", wingTone: "wood" }),
  spirit({ id: "first_bloom", element: "wood", form: "core", arms: 0, height: 1.0, bulk: 1.06, accent: "light", tone: "dark" }),
  // The only archer at full draw: bow arm out, string hand at the cheek, quiver
  // on the back, olive skin under a long chestnut mane.
  humanoid({
    id: "thornmarch_ranger", element: "wood", human: true, head: "human",
    hair: "long", beard: "none", pose: "draw", garment: "hide",
    headW: 0.88, headH: 1.02, jaw: 0.92, nose: 0.9, ears: 0.95,
    palette: { skin: "#b98a5e", skinShade: "#96683f", hair: "#4a2c18", eye: "#9fbf72" },
    frame: 0.9, sleeves: "long", weapon: "bow", offhand: "none",
    cape: "short", stance: "normal", height: 0.97, bulk: 0.94, accent: "light", tone: "cloth", quiver: true, pouch: true, hood: true,
  }),
];
