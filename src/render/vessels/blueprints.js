/**
 * Parametric voxel rigs.
 *
 * The core eighteen keep their hand-placed models. These builders exist because
 * a sixty-Vessel roster cannot be authored one box at a time without either
 * abandoning detail or abandoning the roster.
 *
 * A rig is an anatomical *body plan*, not a skin: the silhouette is decided by
 * structure — how many legs, how many necks and heads, whether the body walks
 * upright or coils, whether it has wings, arms, a tail or a shell. Colour,
 * height and bulk only refine that structure. Two Vessels may share a rig, but
 * not a silhouette; `tools/silhouette-report.mjs` measures the overlap of every
 * pair and `tests/models.test.js` fails when two get too close.
 *
 * Contract for every builder:
 *   - `y` is the bottom of a box above the tile surface;
 *   - at least 4 animation groups and 4 materials;
 *   - nothing below ground, nothing past x = ±6.6;
 *   - a focal point above 6 voxels once `scale` is applied.
 */

import { box, both, pair } from "./_parts.js";

const clean = (value) => Math.round(value * 1000) / 1000;

/** Scale a vertical offset and height by the Vessel's height factor. */
const v = (cfg, value) => clean(value * (cfg.height ?? 1));

/** Scale a horizontal offset and width by the Vessel's bulk factor. */
const u = (cfg, value) => clean(value * (cfg.bulk ?? 1));

function base(cfg, tags, idle = "breathe") {
  return {
    id: cfg.id,
    element: cfg.element,
    tags: tags.filter(Boolean),
    idle: cfg.idle ?? idle,
    scale: cfg.scale ?? 1,
    sway: cfg.sway ?? 0.7,
    pivots: {},
    parts: [],
    // Per-Vessel palette overrides: skin, hair and eye colour are identity, not
    // element decoration, so two humans of one element can look like two people.
    ...(cfg.palette ? { palette: { ...cfg.palette } } : {}),
  };
}

/* ------------------------------------------------------------------ *
 * Humanoid rig
 *
 * Structural axes: robe (skirt instead of legs), stance, a second arm pair,
 * wings, a tail, a hunched spine, and the head/weapon/offhand vocabulary.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Human anatomy
 *
 * A helmeted rig is not a person: players read people from a face, hair and bare
 * skin. `humanoid({ human: true })` swaps the helmet vocabulary for a head built
 * from a skull, jaw, nose, ears, brows and hair, exposes the forearms, and
 * dresses the body in cloth and leather instead of plate.
 * ------------------------------------------------------------------ */

/**
 * Human head.
 *
 * One skull block with identical features made every human a copy of the last
 * one. The face is now built from measurable proportions supplied per Vessel
 * (`headW`, `headH`, `jaw`, `nose`, `ears`) plus a hair and beard vocabulary, so
 * a broad bald veteran and a narrow long-faced woman cannot share a head.
 */
function humanHead(parts, cfg, headY) {
  const hair = cfg.hair ?? "short";
  const beard = cfg.beard ?? "none";
  const fw = cfg.headW ?? 1;
  const fh = cfg.headH ?? 1;
  const jaw = cfg.jaw ?? 1;
  const nose = cfg.nose ?? 1;
  const ears = cfg.ears ?? 1;

  // Neck, cranium, jaw. The jaw sits forward of the skull so the profile has a
  // chin instead of a flat front plane.
  parts.push(box("head", 0, headY - v(cfg, 0.55), 0, u(cfg, 0.8), v(cfg, 0.85), u(cfg, 0.8), "skin"));
  parts.push(box("head", 0, headY + v(cfg, 0.1), 0, u(cfg, 1.72 * fw), v(cfg, 1.5 * fh), u(cfg, 1.62), "skin"));
  parts.push(box("head", 0, headY - v(cfg, 0.22), u(cfg, 0.12), u(cfg, 1.44 * fw * jaw), v(cfg, 0.6), u(cfg, 1.5), "skin"));
  // A narrower jaw than cranium is what makes a face read as a face rather
  // than a helmet: the cheeks step in below the temples.
  parts.push(...both("head", u(cfg, 0.58 * fw), headY + v(cfg, 0.34), u(cfg, 0.5), u(cfg, 0.16), v(cfg, 0.6), u(cfg, 0.46), "skinShade"));
  parts.push(box("head", 0, headY + v(cfg, 1.0 * fh), u(cfg, 0.6), u(cfg, 1.5 * fw), v(cfg, 0.18), u(cfg, 0.26), "hair"));
  // Eyes: a socket, an iris and a brow. Three small boxes read as a face at
  // tile size where two flat ink rectangles read as a visor slit.
  parts.push(...both("head", u(cfg, 0.36 * fw), headY + v(cfg, 0.74), u(cfg, 0.86), u(cfg, 0.34), v(cfg, 0.26), u(cfg, 0.12), "ink"));
  parts.push(...both("head", u(cfg, 0.4 * fw), headY + v(cfg, 0.76), u(cfg, 0.9), u(cfg, 0.16), v(cfg, 0.14), u(cfg, 0.08), "eye"));
  parts.push(...both("head", u(cfg, 0.36 * fw), headY + v(cfg, 0.99), u(cfg, 0.88), u(cfg, 0.36 * fh), v(cfg, 0.12), u(cfg, 0.12), "hair"));
  // Nose bridge, tip and nostrils.
  parts.push(box("head", 0, headY + v(cfg, 0.36), u(cfg, 0.88), u(cfg, 0.3 * nose), v(cfg, 0.5), u(cfg, 0.3 * nose), "skinShade"));
  parts.push(box("head", 0, headY + v(cfg, 0.3), u(cfg, 0.94), u(cfg, 0.4 * nose), v(cfg, 0.14), u(cfg, 0.18), "ink"));
  // Mouth and a chin shadow.
  parts.push(box("head", 0, headY + v(cfg, 0.12), u(cfg, 0.84), u(cfg, 0.46 * jaw), v(cfg, 0.11), u(cfg, 0.12), "ink"));
  parts.push(box("head", 0, headY - v(cfg, 0.02), u(cfg, 0.8), u(cfg, 0.4 * fw * jaw), v(cfg, 0.1), u(cfg, 0.16), "skinShade"));
  parts.push(...both("head", u(cfg, 0.9 * fw), headY + v(cfg, 0.46), 0, u(cfg, 0.16), v(cfg, 0.46 * ears), u(cfg, 0.3 * ears), "skin"));

  // Hair. The cap stops behind the brow and the side strands sit behind the
  // cheeks, so the face stays open instead of disappearing into a hood shape.
  if (hair !== "bald" && hair !== "shaved") {
    parts.push(box("head", 0, headY + v(cfg, 1.5 * fh), -u(cfg, 0.24), u(cfg, 1.8 * fw), v(cfg, 0.42), u(cfg, 1.5), "hair"));
    parts.push(box("head", 0, headY + v(cfg, 1.1 * fh), -u(cfg, 0.72), u(cfg, 1.76 * fw), v(cfg, 0.55), u(cfg, 0.5), "hair"));
    parts.push(box("head", 0, headY + v(cfg, 0.35), -u(cfg, 0.9), u(cfg, 1.64 * fw), v(cfg, 1.3 * fh), u(cfg, 0.42), "hair"));
    parts.push(...both("head", u(cfg, 0.86 * fw), headY + v(cfg, 0.55), u(cfg, -0.3), u(cfg, 0.2), v(cfg, 1.15 * fh), u(cfg, 0.95), "hair"));
  }
  if (hair === "shaved") {
    // A cropped growth ring: hair exists but the skull reads through it.
    parts.push(box("head", 0, headY + v(cfg, 1.44 * fh), -u(cfg, 0.3), u(cfg, 1.72 * fw), v(cfg, 0.2), u(cfg, 1.42), "hair"));
    parts.push(...both("head", u(cfg, 0.88 * fw), headY + v(cfg, 0.3), -u(cfg, 0.55), u(cfg, 0.16), v(cfg, 0.9), u(cfg, 0.7), "hair"));
  }
  if (hair === "swept") {
    // Side part: a heavy sweep across the brow on one side only.
    parts.push(box("head", u(cfg, -0.3 * fw), headY + v(cfg, 1.52 * fh), u(cfg, 0.2), u(cfg, 1.4 * fw), v(cfg, 0.5), u(cfg, 0.6), "hair", "matte", { rz: -12 }));
    parts.push(box("head", u(cfg, 0.82 * fw), headY + v(cfg, 0.9), u(cfg, 0.3), u(cfg, 0.4), v(cfg, 1.25 * fh), u(cfg, 0.5), "hair", "matte", { rz: 10 }));
  }
  if (hair === "curls") {
    for (let i = 0; i < 6; i += 1) {
      const angle = (i / 6) * Math.PI * 2;
      parts.push(box("head", clean(Math.cos(angle) * 0.85) * u(cfg, fw), headY + v(cfg, 1.5 * fh) + (i % 2 ? 0.16 : 0), clean(Math.sin(angle) * 0.7) * u(cfg, 1), u(cfg, 0.5), v(cfg, 0.5), u(cfg, 0.5), "hair", "matte", { rz: i * 11 }));
    }
  }
  if (hair === "mohawk") {
    parts.push(box("head", 0, headY + v(cfg, 1.42 * fh), -u(cfg, 0.2), u(cfg, 0.34), v(cfg, 0.75), u(cfg, 1.5), "hair", "matte", { rx: -6 }));
    parts.push(...both("head", u(cfg, 0.9 * fw), headY + v(cfg, 0.3), -u(cfg, 0.55), u(cfg, 0.14), v(cfg, 0.9), u(cfg, 0.66), "hair"));
  }
  if (hair === "long" || hair === "braid") {
    parts.push(box("head", 0, headY - v(cfg, 1.7), -u(cfg, 0.96), u(cfg, 1.56 * fw), v(cfg, 2.6), u(cfg, 0.34), "hair"));
    parts.push(...both("head", u(cfg, 0.86 * fw), headY - v(cfg, 0.9), u(cfg, 0.42), u(cfg, 0.26), v(cfg, 1.9), u(cfg, 0.5), "hair"));
  }
  if (hair === "braid") {
    for (let i = 0; i < 4; i += 1) {
      parts.push(box("head", (i % 2 === 0 ? 0.16 : -0.16) * u(cfg, 1), headY - v(cfg, 2.0 + i * 0.62), -u(cfg, 1.02), u(cfg, 0.44 - i * 0.04), v(cfg, 0.62), u(cfg, 0.4), "hair", "matte", { rz: i % 2 === 0 ? 6 : -6 }));
    }
  }
  if (hair === "topknot") {
    parts.push(box("head", 0, headY + v(cfg, 1.92), -u(cfg, 0.5), u(cfg, 0.62), v(cfg, 0.6), u(cfg, 0.62), "hair"));
    parts.push(box("head", 0, headY + v(cfg, 2.4), -u(cfg, 0.8), u(cfg, 0.4), v(cfg, 0.9), u(cfg, 0.36), "hair", "matte", { rx: -26 }));
  }
  if (hair === "chignon") {
    parts.push(box("head", 0, headY + v(cfg, 1.05), -u(cfg, 1.06), u(cfg, 1.0), v(cfg, 0.95), u(cfg, 0.5), "hair"));
    parts.push(box("head", 0, headY + v(cfg, 1.28), -u(cfg, 1.24), u(cfg, 0.42), v(cfg, 0.28), u(cfg, 0.24), "brass", "metal"));
  }

  if (beard === "full") {
    parts.push(box("head", 0, headY - v(cfg, 0.72), u(cfg, 0.5), u(cfg, 1.22 * fw), v(cfg, 0.72), u(cfg, 0.7), "hair"));
    parts.push(...both("head", u(cfg, 0.56 * fw), headY + v(cfg, 0.3), u(cfg, 0.72), u(cfg, 0.2), v(cfg, 0.9), u(cfg, 0.3), "hair"));
    parts.push(box("head", 0, headY + v(cfg, 0.14), u(cfg, 0.94), u(cfg, 0.84 * fw), v(cfg, 0.18), u(cfg, 0.2), "hair"));
  } else if (beard === "stubble") {
    parts.push(box("head", 0, headY - v(cfg, 0.28), u(cfg, 0.42), u(cfg, 1.36 * fw * jaw), v(cfg, 0.55), u(cfg, 0.8), "skinShade"));
  } else if (beard === "goatee") {
    parts.push(box("head", 0, headY - v(cfg, 0.28), u(cfg, 0.82), u(cfg, 0.5), v(cfg, 0.62), u(cfg, 0.34), "hair"));
    parts.push(box("head", 0, headY + v(cfg, 0.24), u(cfg, 0.9), u(cfg, 0.44), v(cfg, 0.12), u(cfg, 0.18), "hair"));
  }
}

function humanoidHead(parts, cfg) {
  const accent = cfg.accent ?? "accent";
  const tone = cfg.tone ?? "base";
  const headY = v(cfg, 10.15);

  if (cfg.human) {
    humanHead(parts, cfg, headY);
    return;
  }
  // A lit neck column and a pale face plate are what stop a rig humanoid from
  // reading as a single coloured block: the head keeps its own value against
  // the torso, and the visor sits in shadow between them.
  parts.push(box("head", 0, v(cfg, 9.4), 0, u(cfg, 0.95), v(cfg, 0.75), u(cfg, 1.0), "dark"));
  parts.push(box("head", 0, v(cfg, 9.45), u(cfg, 0.55), u(cfg, 0.75), v(cfg, 0.2), u(cfg, 0.3), accent, "ember"));
  parts.push(box("head", 0, headY, 0, u(cfg, 2.15), v(cfg, 1.85), u(cfg, 1.95), tone));
  parts.push(box("head", 0, headY + v(cfg, 0.1), u(cfg, 1.02), u(cfg, 1.75), v(cfg, 1.25), u(cfg, 0.28), "bone", "matte"));
  parts.push(box("head", 0, headY + v(cfg, 0.55), u(cfg, 1.16), u(cfg, 1.5), v(cfg, 0.42), u(cfg, 0.22), "ink"));
  parts.push(...both("head", u(cfg, 0.4), headY + v(cfg, 0.6), u(cfg, 1.26), u(cfg, 0.32), v(cfg, 0.28), 0.12, accent));

  switch (cfg.head) {
    case "helm":
      parts.push(box("head", 0, headY + v(cfg, 1.55), 0, u(cfg, 2.35), v(cfg, 0.45), u(cfg, 2.1), "metal", "metal"));
      parts.push(box("head", 0, headY + v(cfg, 1.95), u(cfg, 0.4), u(cfg, 0.4), v(cfg, 0.95), u(cfg, 1.7), accent, "metal"));
      parts.push(...both("head", u(cfg, 1.2), headY - v(cfg, 0.25), u(cfg, 0.3), u(cfg, 0.35), v(cfg, 1.2), u(cfg, 1.5), "brass", "metal"));
      break;
    case "hood":
      parts.push(box("head", 0, headY + v(cfg, 0.9), 0, u(cfg, 2.45), v(cfg, 1.35), u(cfg, 2.25), "cloth"));
      parts.push(box("head", 0, headY + v(cfg, 0.2), u(cfg, 1.05), u(cfg, 1.9), v(cfg, 1.4), u(cfg, 0.4), "cloth"));
      parts.push(box("head", 0, headY + v(cfg, 1.95), -u(cfg, 0.4), u(cfg, 0.5), v(cfg, 0.85), u(cfg, 0.5), "cloth"));
      break;
    case "mask":
      parts.push(box("head", 0, headY + v(cfg, 0.35), u(cfg, 0.95), u(cfg, 1.75), v(cfg, 1.05), u(cfg, 0.35), "bone", "bone"));
      parts.push(box("head", 0, headY + v(cfg, 1.7), 0, u(cfg, 2.3), v(cfg, 0.4), u(cfg, 2.05), "dark"));
      parts.push(...both("head", u(cfg, 1.0), headY + v(cfg, 1.5), 0, u(cfg, 0.3), v(cfg, 0.8), u(cfg, 0.3), accent));
      break;
    case "crown":
      parts.push(box("head", 0, headY + v(cfg, 1.8), 0, u(cfg, 2.3), v(cfg, 0.35), u(cfg, 2.05), "brass", "metal"));
      parts.push(...both("head", u(cfg, 0.85), headY + v(cfg, 2.1), 0, u(cfg, 0.22), v(cfg, 0.9), u(cfg, 0.22), "brass", "metal"));
      parts.push(box("head", 0, headY + v(cfg, 2.15), u(cfg, 0.4), u(cfg, 0.2), v(cfg, 1.2), u(cfg, 0.2), accent));
      break;
    case "circlet":
      parts.push(box("head", 0, headY + v(cfg, 1.55), 0, u(cfg, 2.3), v(cfg, 0.28), u(cfg, 2.05), "brass", "metal"));
      parts.push(...both("head", u(cfg, 1.15), headY + v(cfg, 1.15), 0, u(cfg, 0.28), v(cfg, 0.85), u(cfg, 0.28), "bone", "bone"));
      break;
    case "skull":
      // Horned skull: a wider cranium, sunken sockets, tusks below the jaw.
      parts.push(box("head", 0, headY + v(cfg, 1.35), 0, u(cfg, 2.45), v(cfg, 0.75), u(cfg, 2.15), "bone", "bone"));
      parts.push(box("head", 0, headY + v(cfg, 0.2), u(cfg, 0.9), u(cfg, 1.85), v(cfg, 0.55), u(cfg, 0.6), "bone", "bone"));
      parts.push(...both("head", u(cfg, 0.62), headY + v(cfg, 0.72), u(cfg, 1.0), u(cfg, 0.5), v(cfg, 0.42), u(cfg, 0.22), "void", "void"));
      parts.push(...both("head", u(cfg, 0.5), headY - v(cfg, 0.25), u(cfg, 1.05), u(cfg, 0.22), v(cfg, 0.55), u(cfg, 0.22), "bone", "bone", { rz: 8 }));
      break;
    default:
      parts.push(box("head", 0, headY + v(cfg, 1.5), 0, u(cfg, 2.3), v(cfg, 0.3), u(cfg, 2.05), accent));
  }

  if (cfg.crest === "horns") {
    parts.push(box("head", u(cfg, 0.95), headY + v(cfg, 1.55), -u(cfg, 0.1), u(cfg, 0.3), v(cfg, 1.25), u(cfg, 0.35), "bone", "bone", { rz: 14 }));
    parts.push(box("head", -u(cfg, 0.95), headY + v(cfg, 1.55), -u(cfg, 0.1), u(cfg, 0.3), v(cfg, 1.25), u(cfg, 0.35), "bone", "bone", { rz: -14 }));
    parts.push(box("head", u(cfg, 1.25), headY + v(cfg, 2.55), -u(cfg, 0.1), u(cfg, 0.22), v(cfg, 0.8), u(cfg, 0.24), "bone", "bone", { rz: 30 }));
    parts.push(box("head", -u(cfg, 1.25), headY + v(cfg, 2.55), -u(cfg, 0.1), u(cfg, 0.22), v(cfg, 0.8), u(cfg, 0.24), "bone", "bone", { rz: -30 }));
  } else if (cfg.crest === "spikes") {
    for (const offset of [-0.75, 0, 0.75]) {
      parts.push(box("head", u(cfg, offset), headY + v(cfg, 1.75), -u(cfg, 0.3), u(cfg, 0.2), v(cfg, 0.85), u(cfg, 0.25), "metal", "metal", { rz: offset * 9 }));
    }
  } else if (cfg.crest === "feather") {
    parts.push(box("head", u(cfg, 0.55), headY + v(cfg, 1.7), -u(cfg, 0.6), u(cfg, 0.28), v(cfg, 1.6), u(cfg, 0.18), accent, "matte", { rz: 22 }));
    parts.push(box("head", -u(cfg, 0.4), headY + v(cfg, 1.6), -u(cfg, 0.65), u(cfg, 0.24), v(cfg, 1.25), u(cfg, 0.16), accent, "matte", { rz: -18 }));
  } else if (cfg.crest === "plume") {
    // A tall back-swept plume: reads as a different head at tile size.
    for (let i = 0; i < 3; i += 1) {
      parts.push(box("head", 0, headY + v(cfg, 1.6 + i * 0.55), -u(cfg, 0.7 - i * 0.15), u(cfg, 0.55 - i * 0.1), v(cfg, 0.75), u(cfg, 0.4), accent, "matte", { rz: -24 }));
    }
  }
}

function humanoidWeapon(parts, cfg) {
  const accent = cfg.accent ?? "accent";
  const hands = humanHands(cfg);
  const wx = hands.main[0];
  const handY = hands.main[1];
  // Hand depth, minus the depth the original stand pose used, so every
  // pre-existing humanoid keeps its exact old geometry at rest.
  const dz = hands.main[2] - u(cfg, 0.55);
  switch (cfg.weapon) {
    case "sword":
      // Grip, pommel, a wide guard, a tapering blade and a fuller. The old
      // sword was one flat slab with no guard line, so it read as a plank.
      parts.push(box("weapon", wx, handY, 0.55 + dz, 0.46, v(cfg, 0.95), 0.46, "leather"));
      parts.push(box("weapon", wx, handY - 0.2, 0.55 + dz, 0.6, 0.26, 0.6, "brass", "metal"));
      parts.push(box("weapon", wx, handY + v(cfg, 0.85), 0.55 + dz, 1.7, 0.3, 0.55, "brass", "metal"));
      parts.push(box("weapon", wx, handY + v(cfg, 1.15), 0.55 + dz, 0.34, v(cfg, 4.2), 0.46, "light", "metal"));
      parts.push(box("weapon", wx, handY + v(cfg, 5.35), 0.55 + dz, 0.26, v(cfg, 0.6), 0.38, "light", "metal", { rz: -6 }));
      parts.push(box("weapon", wx, handY + v(cfg, 1.4), 0.79 + dz, 0.1, v(cfg, 3.7), 0.1, accent));
      break;
    case "axe":
      // Long haft, a socket, and two swept blades: a one-rectangle "axe" reads
      // as a flag on a pole.
      parts.push(box("weapon", wx, handY - v(cfg, 0.9), 0.45 + dz, 0.44, v(cfg, 4.9), 0.44, "wood"));
      parts.push(box("weapon", wx, handY + v(cfg, 2.55), 0.45 + dz, 0.7, v(cfg, 1.1), 0.6, "brass", "metal"));
      // Stepped cutting edges: three shrinking boxes trace an arc, which is what
      // separates an axe blade from a rectangular paddle.
      parts.push(box("weapon", wx + 0.55, handY + v(cfg, 2.5), 0.45 + dz, 0.85, v(cfg, 1.35), 0.28, "metal", "metal"));
      parts.push(box("weapon", wx + 1.1, handY + v(cfg, 2.75), 0.45 + dz, 0.42, v(cfg, 0.95), 0.24, "metal", "metal"));
      parts.push(box("weapon", wx + 1.32, handY + v(cfg, 2.95), 0.45 + dz, 0.16, v(cfg, 0.6), 0.2, "light", "metal"));
      parts.push(box("weapon", wx - 0.5, handY + v(cfg, 2.62), 0.45 + dz, 0.7, v(cfg, 1.0), 0.26, "metal", "metal"));
      parts.push(box("weapon", wx - 0.92, handY + v(cfg, 2.84), 0.45 + dz, 0.34, v(cfg, 0.7), 0.2, "metal", "metal"));
      parts.push(box("weapon", wx - 1.1, handY + v(cfg, 3.0), 0.45 + dz, 0.14, v(cfg, 0.44), 0.18, accent, "metal"));
      parts.push(box("weapon", wx, handY + v(cfg, 3.55), 0.45 + dz, 0.3, v(cfg, 0.55), 0.3, "metal", "metal"));
      break;
    case "spear":
      parts.push(box("weapon", wx, handY - v(cfg, 1.6), 0.45 + dz, 0.34, v(cfg, 8.6), 0.34, "wood"));
      parts.push(box("weapon", wx, handY + v(cfg, 6.9), 0.45 + dz, 0.46, v(cfg, 1.7), 0.36, "light", "metal"));
      parts.push(box("weapon", wx, handY + v(cfg, 8.5), 0.45 + dz, 0.26, v(cfg, 0.6), 0.26, "light", "metal"));
      parts.push(box("weapon", wx, handY + v(cfg, 6.4), 0.45 + dz, 1.05, 0.26, 0.5, accent, "metal"));
      break;
    case "staff":
      parts.push(box("weapon", wx, handY - 0.6, 0.3 + dz, 0.28, v(cfg, 6.4), 0.28, "wood"));
      parts.push(box("weapon", wx, handY + v(cfg, 5.75), 0.3 + dz, 0.75, 0.35, 0.75, "brass", "metal"));
      parts.push(box("weapon", wx, handY + v(cfg, 6.15), 0.3 + dz, 0.55, v(cfg, 1.05), 0.55, accent, "crystal"));
      parts.push(box("weapon", wx, handY + v(cfg, 7.05), 0.3 + dz, 0.3, v(cfg, 0.35), 0.3, "bone", "bone"));
      break;
    case "bow":
      // The bow is held out in front of the chest, so it is anchored to the
      // hand the draw pose computes rather than to a point beside the hip.
      parts.push(box("weapon", wx, handY + v(cfg, 0.1), dz, 0.28, v(cfg, 4.6), 0.4, "wood"));
      parts.push(box("weapon", wx + 0.08, handY + v(cfg, 0.7), dz, 0.2, v(cfg, 0.8), 0.32, accent, "metal", { rx: 16 }));
      parts.push(box("weapon", wx + 0.08, handY + v(cfg, 4.4), dz, 0.2, v(cfg, 0.8), 0.32, accent, "metal", { rx: -16 }));
      parts.push(box("weapon", wx + 0.26, handY + v(cfg, 0.3), dz, 0.07, v(cfg, 4.9), 0.07, "bone", "bone"));
      parts.push(box("weapon", wx + 0.2, handY + v(cfg, 2.6), dz + 0.4, 0.1, v(cfg, 1.1), 0.1, "light", "metal"));
      break;
    case "daggers":
      parts.push(box("weapon", wx, handY + 0.2, 0.5 + dz, 0.4, v(cfg, 1.9), 0.34, "light", "metal", { rz: -8 }));
      parts.push(box("weapon", hands.off[0], handY + 0.2, 0.5 + dz, 0.36, v(cfg, 1.5), 0.3, accent, "metal", { rz: 10 }));
      parts.push(box("weapon", wx, handY + v(cfg, 2.0), 0.5 + dz, 0.24, v(cfg, 0.55), 0.24, "light", "metal"));
      break;
    case "wire":
      // A taut wire held in both hands: the only horizontal weapon line in the
      // roster, so the Razorline Duelist cannot be confused with another duelist
      // no matter which way the camera turns.
      parts.push(box("weapon", wx, handY, 0.5 + dz, 0.4, v(cfg, 0.9), 0.4, "leather"));
      parts.push(box("weapon", hands.off[0], handY + v(cfg, 0.35), 0.5 + dz, 0.55, v(cfg, 0.7), 0.55, "brass", "metal"));
      parts.push(box("weapon", (wx + hands.off[0]) / 2, handY + v(cfg, 0.56), 0.5 + dz, Math.abs(wx - hands.off[0]), v(cfg, 0.17), 0.16, "light", "metal"));
      parts.push(box("weapon", u(cfg, 2.75), handY + v(cfg, 0.55), 0.5 + dz, u(cfg, 0.4), v(cfg, 0.18), 0.16, accent, "metal"));
      parts.push(box("weapon", u(cfg, -0.35), handY + v(cfg, 0.6), 0.5 + dz, u(cfg, 0.7), v(cfg, 0.07), 0.08, accent, "metal"));
      break;
    case "hammer":
      parts.push(box("weapon", wx, handY, 0.35 + dz, 0.44, v(cfg, 3.2), 0.44, "wood"));
      parts.push(box("weapon", wx, handY + v(cfg, 2.9), 0.35 + dz, 1.6, v(cfg, 1.2), 1.15, "stone", "stone"));
      parts.push(box("weapon", wx, handY + v(cfg, 2.95), 0.35 + dz, 0.95, v(cfg, 0.5), 0.2, accent, "metal"));
      break;
    case "scythe":
      parts.push(box("weapon", wx, handY - 0.6, 0.25 + dz, 0.26, v(cfg, 6.6), 0.26, "dark"));
      parts.push(box("weapon", wx - 0.35, handY + v(cfg, 5.8), 0.25 + dz, 1.35, 0.3, 0.32, "light", "metal", { rz: 26 }));
      parts.push(box("weapon", wx - 1.2, handY + v(cfg, 6.45), 0.25 + dz, 0.95, 0.24, 0.26, accent, "metal", { rz: 54 }));
      break;
    case "fists":
      parts.push(box("weapon", wx, handY + 0.1, 0.5 + dz, 0.9, v(cfg, 1.0), 0.95, "leather"));
      parts.push(box("weapon", wx, handY + v(cfg, 0.5), 0.62 + dz, 0.55, v(cfg, 0.35), 0.3, accent, "metal"));
      break;
    default:
      parts.push(box("weapon", wx, handY + 0.2, 0.45 + dz, 0.34, v(cfg, 1.7), 0.34, "light", "metal"));
  }
}

function humanoidOffhand(parts, cfg) {
  const hands = humanHands(cfg);
  const offX = hands.off[0];
  const handY = hands.off[1];
  const dz = hands.off[2] - u(cfg, 0.55);
  const accent = cfg.accent ?? "accent";
  switch (cfg.offhand) {
    case "shield":
      // A kite shield: a broad top, a tapered point, a rim and a boss. Held at
      // the hand the pose computes, not floating beside the hip.
      parts.push(box("armL", offX, handY + v(cfg, 1.05), 0.72 + dz, 0.46, v(cfg, 1.85), 2.5, "stone", "stone"));
      parts.push(box("armL", offX, handY - v(cfg, 0.75), 0.72 + dz, 0.46, v(cfg, 1.85), 1.9, "stone", "stone"));
      parts.push(box("armL", offX, handY - v(cfg, 1.5), 0.72 + dz, 0.42, v(cfg, 0.9), 1.1, "stone", "stone"));
      // Rim and boss sit proud of the face, so the shield is not a flat card.
      parts.push(box("armL", offX, handY + v(cfg, 1.1), 1.9 + dz, 0.3, v(cfg, 1.8), 0.22, "metal", "metal"));
      parts.push(box("armL", offX, handY + v(cfg, 0.85), 1.98 + dz, 0.9, v(cfg, 0.9), 0.34, "brass", "metal"));
      parts.push(box("armL", offX, handY + v(cfg, 1.15), 2.12 + dz, 0.34, v(cfg, 0.36), 0.2, accent));
      break;
    case "tome":
      parts.push(box("armL", offX, handY + v(cfg, 0.4), 0.75 + dz, 0.4, v(cfg, 1.3), 1.5, "cloth"));
      parts.push(box("armL", offX + 0.1, handY + v(cfg, 0.55), 1.6 + dz, 0.2, v(cfg, 0.9), 0.9, accent, "crystal"));
      break;
    case "orb":
      parts.push(box("armL", offX, handY + v(cfg, 0.9), 0.75 + dz, 0.9, v(cfg, 0.85), 0.9, accent, "crystal"));
      parts.push(box("armL", offX, handY + v(cfg, 0.3), 0.75 + dz, 1.0, v(cfg, 0.55), 1.0, "brass", "metal"));
      break;
    case "lantern":
      parts.push(box("armL", offX, handY - v(cfg, 0.1), 0.6 + dz, 0.24, v(cfg, 1.0), 0.24, "metal", "metal"));
      parts.push(box("armL", offX, handY + v(cfg, 0.7), 0.6 + dz, 0.7, v(cfg, 0.9), 0.7, "crystal", "glass"));
      parts.push(box("armL", offX, handY + v(cfg, 1.0), 0.6 + dz, 0.34, v(cfg, 0.35), 0.34, accent));
      break;
    case "buckler":
      parts.push(box("armL", offX, handY + v(cfg, 0.7), 0.7 + dz, 0.34, v(cfg, 1.7), 1.6, "brass", "metal"));
      parts.push(box("armL", offX - 0.1, handY + v(cfg, 1.4), 1.5 + dz, 0.22, v(cfg, 0.32), 0.4, accent));
      break;
    case "brazier":
      parts.push(box("armL", offX, handY - v(cfg, 0.15), 0.55 + dz, 1.0, v(cfg, 0.55), 1.0, "brass", "metal"));
      parts.push(box("armL", offX, handY + v(cfg, 0.4), 0.55 + dz, 0.78, v(cfg, 0.85), 0.78, accent, "ember"));
      break;
    default:
      break;
  }
}

/**
 * Shared upper-body mass. `lean` shifts the chest and head forward in z, which
 * is what turns an upright knight into a hunched brute without new rigs.
 */
/**
 * Human upper body: a cloth tunic over a leather belt, a hide shoulder yoke and
 * skin where the sleeves end. No breastplate, no pauldron slabs — the point of a
 * human Vessel is that you can see a person under the equipment.
 */
function humanTorso(parts, cfg, lean = 0) {
  const accent = cfg.accent ?? "accent";
  const tone = cfg.tone ?? "base";
  const frame = cfg.frame ?? 1;
  const sleeve = cfg.sleeves ?? "short";
  const hip = u(cfg, 2.9 * frame);

  // Tapered body: hips, a pinched waist, a wide chest and a collar. The single
  // torso box was the reason every human looked like the same mannequin.
  const chest = u(cfg, 3.05 * frame);
  const waist = u(cfg, 2.3 * frame);
  parts.push(box("body", 0, v(cfg, 4.55), 0, hip, v(cfg, 1.4), u(cfg, 1.85), tone, "cloth"));
  parts.push(box("body", 0, v(cfg, 5.9), 0, waist, v(cfg, 0.95), u(cfg, 1.72), tone, "cloth"));
  parts.push(box("body", 0, v(cfg, 6.8), lean * 0.7, chest, v(cfg, 1.75), u(cfg, 1.95), tone, "cloth"));
  parts.push(box("body", 0, v(cfg, 8.5), lean * 1.3, chest * 0.86, v(cfg, 0.5), u(cfg, 1.86), typeof tone === "string" ? tone : "cloth", "cloth"));
  // Belt, buckle and hip wrap.
  parts.push(box("body", 0, v(cfg, 5.72), 0, waist + u(cfg, 0.24), v(cfg, 0.4), u(cfg, 1.9), "leather"));
  parts.push(box("body", 0, v(cfg, 5.74), u(cfg, 0.96), u(cfg, 0.5), v(cfg, 0.34), u(cfg, 0.2), "brass", "metal"));
  parts.push(box("body", 0, v(cfg, 4.62), u(cfg, 0.9), u(cfg, 2.2 * frame), v(cfg, 0.65), u(cfg, 0.22), "leather"));
  // Neck and a collar that sits behind the chin.
  parts.push(box("body", 0, v(cfg, 8.95), lean * 1.6, u(cfg, 1.0), v(cfg, 0.55), u(cfg, 0.95), "skin"));
  parts.push(box("body", 0, v(cfg, 8.82), lean * 1.5, chest * 0.8, v(cfg, 0.34), u(cfg, 1.6), "dark", "cloth"));
  // Shoulder deltoids: the joint that makes arms belong to the body.
  parts.push(...both("body", chest * 0.48, v(cfg, 8.15), lean * 1.1, u(cfg, 0.95), v(cfg, 0.85), u(cfg, 1.35), tone, "cloth"));
  // Baldric and a chest knot: cloth identity instead of engraved steel.
  parts.push(box("body", u(cfg, 0.62), v(cfg, 6.0), u(cfg, 1.02), u(cfg, 0.28), v(cfg, 2.4), u(cfg, 0.18), accent, "cloth", { rz: 13 }));
  parts.push(box("body", 0, v(cfg, 6.5), u(cfg, 1.03), u(cfg, 0.4), v(cfg, 0.4), u(cfg, 0.16), "brass", "metal"));

  // Garment layers: a person wears cloth that wrinkles, scales, quilts or
  // hangs. Without them every human wore the same coloured box.
  const garment = cfg.garment ?? "tunic";
  if (garment === "quilt") {
    for (let row = 0; row < 3; row += 1) {
      const y = v(cfg, 5.6 + row * 0.62);
      parts.push(box("body", 0, y, u(cfg, 1.86), u(cfg, 2.8 * frame), v(cfg, 0.13), u(cfg, 0.16), "ink", "cloth"));
      for (let i = 0; i < 3; i += 1) {
        parts.push(box("body", u(cfg, (-0.9 + i * 0.9) * frame), y + v(cfg, 0.05), u(cfg, 1.98), u(cfg, 0.14), v(cfg, 0.14), u(cfg, 0.1), accent, "matte"));
      }
    }
  } else if (garment === "scale") {
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        parts.push(box("body", u(cfg, (-0.95 + col * 0.95) * frame + (row % 2 ? 0.3 : 0)), v(cfg, 5.55 + row * 0.5), u(cfg, 1.9), u(cfg, 0.78), v(cfg, 0.42), u(cfg, 0.2), row % 2 ? "light" : "metal", "metal"));
      }
    }
  } else if (garment === "mail") {
    // Three rings across, three down. A denser grid became visual noise at card
    // size and pushed the longest illustrations past their asset budget.
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        parts.push(box("body", u(cfg, (-0.98 + col * 0.98) * frame), v(cfg, 5.6 + row * 0.95), u(cfg, 1.92), u(cfg, 0.34), v(cfg, 0.34), u(cfg, 0.14), "metal", "metal"));
      }
    }
  } else if (garment === "coat") {
    // Long coat: two front panels falling past the knees, with a collar.
    parts.push(box("body", u(cfg, 0.75 * frame), v(cfg, 1.35), u(cfg, 0.95), u(cfg, 1.2), v(cfg, 3.6), u(cfg, 0.26), tone, "cloth", { rz: 3 }));
    parts.push(box("body", u(cfg, -0.75 * frame), v(cfg, 1.35), u(cfg, 0.95), u(cfg, 1.2), v(cfg, 3.6), u(cfg, 0.26), tone, "cloth", { rz: -3 }));
    parts.push(box("body", 0, v(cfg, 8.55), u(cfg, 1.5), u(cfg, 2.4 * frame), v(cfg, 0.85), u(cfg, 0.5), tone, "cloth", { rz: 0 }));
    parts.push(box("body", u(cfg, 0.3), v(cfg, 4.4), u(cfg, 0.35), u(cfg, 0.24), v(cfg, 4.5), u(cfg, 0.22), accent, "cloth"));
  }

  humanArms(parts, cfg, lean);

  // Small kit details that make a silhouette: scarf, bracer, pouch, mantle.
  if (cfg.scarf) {
    parts.push(box("body", 0, v(cfg, 8.6), u(cfg, 1.4), u(cfg, 2.5 * frame), v(cfg, 0.5), u(cfg, 0.7), accent, "cloth"));
    parts.push(box("body", u(cfg, 1.05), v(cfg, 7.4), u(cfg, 1.5), u(cfg, 0.5), v(cfg, 1.4), u(cfg, 0.3), accent, "cloth", { rz: 9 }));
  }
  if (cfg.pouch) {
    parts.push(box("body", u(cfg, -1.5 * frame), v(cfg, 4.65), u(cfg, 0.7), u(cfg, 0.85), v(cfg, 0.8), u(cfg, 0.55), "leather"));
    parts.push(box("body", u(cfg, -1.5 * frame), v(cfg, 5.3), u(cfg, 0.72), u(cfg, 0.7), v(cfg, 0.16), u(cfg, 0.4), accent, "metal"));
  }
  if (cfg.quiver) {
    // A back quiver with visible fletching: a rearward, upward mass that no
    // other human carries, and the one piece of kit an archer must read from
    // behind.
    parts.push(box("cloak", u(cfg, -1.1), v(cfg, 4.4), u(cfg, -1.25), u(cfg, 0.85), v(cfg, 2.6), u(cfg, 0.8), "leather", "leather", { rz: -14 }));
    for (let i = 0; i < 3; i += 1) {
      parts.push(box("cloak", u(cfg, -1.55 + i * 0.4), v(cfg, 6.7), u(cfg, -1.3), u(cfg, 0.16), v(cfg, 1.5), u(cfg, 0.16), "bone", "bone", { rz: -8 }));
      parts.push(box("cloak", u(cfg, -1.62 + i * 0.4), v(cfg, 8.1), u(cfg, -1.32), u(cfg, 0.3), v(cfg, 0.45), u(cfg, 0.14), accent, "matte", { rz: -8 }));
    }
  }
  if (cfg.mantle) {
    parts.push(box("body", 0, v(cfg, 7.7), lean * 1.2, u(cfg, 3.5 * frame), v(cfg, 1.3), u(cfg, 2.15), "dark", "cloth"));
    parts.push(box("body", 0, v(cfg, 7.55), u(cfg, 1.55) + lean, u(cfg, 2.4 * frame), v(cfg, 0.4), u(cfg, 0.3), accent, "cloth"));
  }
  if (cfg.hood) {
    // A pushed-back hood: a bunched collar behind the neck with a peak. It is
    // the only rearward head mass in the human set.
    parts.push(box("cloak", 0, v(cfg, 8.7), u(cfg, -1.15), u(cfg, 2.1 * frame), v(cfg, 1.5), u(cfg, 0.85), "leather", "leather"));
    parts.push(box("cloak", 0, v(cfg, 9.9), u(cfg, -1.3), u(cfg, 1.4), v(cfg, 0.8), u(cfg, 0.6), "leather", "leather", { rx: -18 }));
    parts.push(box("cloak", 0, v(cfg, 8.2), u(cfg, -0.9), u(cfg, 3.2 * frame), v(cfg, 0.55), u(cfg, 1.5), "leather", "leather"));
  }
  if (cfg.pauldron) {
    // One shoulder only: asymmetric armour breaks the mirrored silhouette the
    // five humans used to share.
    parts.push(box("body", u(cfg, -2.1 * frame), v(cfg, 8.15), u(cfg, 0.1), u(cfg, 1.35), v(cfg, 1.0), u(cfg, 1.7), "stone", "stone", { rz: 8 }));
    parts.push(box("body", u(cfg, -2.25 * frame), v(cfg, 8.9), u(cfg, 0.05), u(cfg, 1.0), v(cfg, 0.35), u(cfg, 1.35), accent, "metal"));
  }
}

/* ------------------------------------------------------------------ *
 * Human arms and hands
 *
 * Every human previously hung both arms straight down, so five different
 * characters stood identically at rest. A pose is a shoulder-elbow-hand chain
 * per side; weapons and off-hand props anchor to the hand point that pose
 * computes, which is what stops a sword from floating beside a hip.
 * ------------------------------------------------------------------ */

const ARM_POSES = Object.freeze({
  // `x`/`y`/`z` are in raw voxel units; `x` is mirrored for the other arm.
  stand: { R: { elbow: [2.4, 6.6, 0.2], hand: [2.5, 5.05, 0.55] }, L: { elbow: [2.4, 6.6, 0.2], hand: [2.5, 5.05, 0.55] } },
  guard: { R: { elbow: [2.7, 6.7, 0.35], hand: [2.55, 5.35, 1.0] }, L: { elbow: [2.35, 7.15, 1.0], hand: [1.55, 6.5, 1.9] } },
  draw: { R: { elbow: [2.6, 7.4, 1.1], hand: [2.35, 7.95, 1.75] }, L: { elbow: [2.1, 8.1, 0.3], hand: [1.5, 8.25, 1.05] } },
  shoulder: { R: { elbow: [2.95, 7.7, 0.15], hand: [2.45, 6.35, 1.0] }, L: { elbow: [2.45, 6.5, 0.15], hand: [2.6, 5.05, 0.45] } },
  carry: { R: { elbow: [2.7, 6.9, 0.3], hand: [2.7, 5.2, 0.75] }, L: { elbow: [2.2, 7.0, 1.1], hand: [2.05, 5.9, 1.9] } },
  hip: { R: { elbow: [3.3, 7.2, 0.1], hand: [2.05, 5.35, 0.35] }, L: { elbow: [2.2, 7.05, 1.0], hand: [1.6, 6.1, 1.7] } },
});

/** Hand anchors a pose produces, in scaled voxel units. */
function humanHands(cfg) {
  const pose = ARM_POSES[cfg.pose ?? "stand"] ?? ARM_POSES.stand;
  return {
    main: [u(cfg, pose.R.hand[0]), v(cfg, pose.R.hand[1]), u(cfg, pose.R.hand[2])],
    off: [u(cfg, -pose.L.hand[0]), v(cfg, pose.L.hand[1]), u(cfg, pose.L.hand[2])],
    mainElbow: [u(cfg, pose.R.elbow[0]), v(cfg, pose.R.elbow[1]), u(cfg, pose.R.elbow[2])],
    offElbow: [u(cfg, -pose.L.elbow[0]), v(cfg, pose.L.elbow[1]), u(cfg, pose.L.elbow[2])],
  };
}

/** One limb segment between two anchor points, tilted into the screen plane. */
function armSegment(parts, group, a, b, thickness, color, material) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const span = Math.hypot(dx, dy);
  const length = Math.max(span, 0.35) + thickness * 0.55;
  // The box's long axis is vertical, so a segment that points downwards is the
  // same axis as one that points up: fold the angle into +/-90 degrees.
  let angle = (Math.atan2(dx, dy) * 180) / Math.PI;
  if (angle > 90) angle -= 180;
  if (angle < -90) angle += 180;
  parts.push(
    box(group, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - length / 2, (a[2] + b[2]) / 2, thickness, length, thickness + Math.abs(dz) * 0.4, color, material, { rz: clean(angle) }),
  );
}

function humanArm(parts, cfg, side, shoulder, elbow, hand, lean) {
  const sleeve = cfg.sleeves ?? "short";
  const tone = cfg.tone ?? "base";
  const group = side === "R" ? "armR" : "armL";
  const sx = side === "R" ? 1 : -1;
  const upper = sleeve === "long" ? tone : "skin";
  const fore = sleeve === "none" ? "skin" : sleeve === "long" ? tone : "skin";
  const shoulderPoint = [sx * shoulder[0], shoulder[1], shoulder[2] + lean * 1.2];
  armSegment(parts, group, shoulderPoint, elbow, u(cfg, 0.92), upper, "matte");
  armSegment(parts, group, elbow, hand, u(cfg, 0.8), fore, "matte");
  if (sleeve === "short") {
    // Rolled sleeve end above the elbow.
    parts.push(box(group, (shoulderPoint[0] + elbow[0]) / 2, elbow[1] + v(cfg, 0.75), (shoulderPoint[2] + elbow[2]) / 2, u(cfg, 1.0), v(cfg, 0.55), u(cfg, 1.05), tone, "cloth"));
  }
  if (cfg.bracer && side === "R") {
    parts.push(box(group, (elbow[0] + hand[0]) / 2, hand[1] + v(cfg, 0.45), hand[2], u(cfg, 0.95), v(cfg, 0.8), u(cfg, 0.95), "leather"));
  }
  // Hand: a distinct block, so the arm ends somewhere.
  parts.push(box(group, hand[0], hand[1] - v(cfg, 0.15), hand[2], u(cfg, 0.82), v(cfg, 0.62), u(cfg, 0.85), "skin"));
}

function humanArms(parts, cfg, lean = 0) {
  const frame = cfg.frame ?? 1;
  const hands = humanHands(cfg);
  const shoulder = [u(cfg, 2.02 * frame), v(cfg, 8.55), 0];
  humanArm(parts, cfg, "R", shoulder, hands.mainElbow, hands.main, lean);
  humanArm(parts, cfg, "L", shoulder, hands.offElbow, hands.off, lean);
  // Bare shoulders get a hide cap rather than a steel slab.
  if ((cfg.sleeves ?? "short") !== "long") {
    parts.push(...both("body", u(cfg, 2.15 * frame), v(cfg, 8.35), lean * 1.5, u(cfg, 1.15), v(cfg, 0.62), u(cfg, 1.45), "leather"));
  }
}

function humanoidTorso(parts, cfg, lean = 0) {
  const accent = cfg.accent ?? "accent";
  const tone = cfg.tone ?? "base";
  if (cfg.human) {
    humanTorso(parts, cfg, lean);
    return;
  }
  const pad = cfg.pauldrons ?? 1;
  parts.push(box("body", 0, v(cfg, 4.95), 0, u(cfg, 3.2), v(cfg, 1.1), u(cfg, 2.0), "dark"));
  parts.push(box("body", 0, v(cfg, 5.0), 0, u(cfg, 3.75), v(cfg, 0.48), u(cfg, 2.15), "leather"));
  parts.push(box("body", 0, v(cfg, 5.05), u(cfg, 1.05), u(cfg, 0.9), v(cfg, 0.5), u(cfg, 0.28), "brass", "metal"));
  parts.push(box("body", 0, v(cfg, 5.95), lean, u(cfg, 2.95), v(cfg, 1.3), u(cfg, 1.85), tone));
  parts.push(box("body", 0, v(cfg, 7.15), lean * 1.4, u(cfg, 3.85), v(cfg, 1.95), u(cfg, 2.25), tone));
  parts.push(box("body", 0, v(cfg, 7.3), u(cfg, 1.18) + lean * 1.4, u(cfg, 2.75), v(cfg, 1.55), u(cfg, 0.4), "light"));
  parts.push(box("body", 0, v(cfg, 8.45), u(cfg, 1.4) + lean * 1.8, u(cfg, 2.1), v(cfg, 0.22), u(cfg, 0.24), accent));
  parts.push(box("body", 0, v(cfg, 8.95), lean * 1.9, u(cfg, 3.25), v(cfg, 0.65), u(cfg, 2.05), "dark"));

  // Pauldrons scale with the Vessel: plain, spiked, or a wide slab that reads
  // as a completely different shoulder line from the front.
  // Pauldrons grow in width and height with the shoulder line, but not in depth:
  // scaling depth by `pad` turned a heavy knight's shoulders into flat boards
  // seen edge-on from the three-quarter camera.
  parts.push(...both("body", u(cfg, 2.3 * pad), v(cfg, 8.5), lean * 1.6, u(cfg, 1.7 * pad), v(cfg, 1.15 * pad), u(cfg, 1.55 + 0.55 * pad), "metal", "metal"));
  if (pad > 1.15) {
    parts.push(...both("body", u(cfg, 2.9), v(cfg, 9.1), lean * 1.6, u(cfg, 0.5), v(cfg, 0.9), u(cfg, 0.5), "bone", "bone", { rz: -20 }));
  }
  parts.push(...both("body", u(cfg, 2.72), v(cfg, 9.3), lean * 1.6, u(cfg, 0.45), v(cfg, 0.7), u(cfg, 0.45), "bone", "bone", { rz: -12 }));
  parts.push(...pair("armL", "armR", u(cfg, 2.42), v(cfg, 7.25), lean * 1.2, u(cfg, 1.05), v(cfg, 1.55), u(cfg, 1.3), "dark"));
  parts.push(...pair("armL", "armR", u(cfg, 2.42), v(cfg, 5.75), lean * 0.8, u(cfg, 1.15), v(cfg, 1.55), u(cfg, 1.35), tone));
  parts.push(...pair("armL", "armR", u(cfg, 2.42), v(cfg, 4.9), lean * 0.6, u(cfg, 1.3), v(cfg, 0.85), u(cfg, 1.45), "leather"));

  if (cfg.arms === 4) {
    // Second pair, angled out and back: a four-armed silhouette cannot be
    // mistaken for the standard two-arm frame from any camera.
    for (const side of [-1, 1]) {
      parts.push(box("armR", side * u(cfg, 3.3), v(cfg, 7.9), u(cfg, -0.6), u(cfg, 1.0), v(cfg, 1.1), u(cfg, 1.1), tone, "matte", { rz: side * -34 }));
      parts.push(box("armR", side * u(cfg, 4.0), v(cfg, 7.1), u(cfg, -0.9), u(cfg, 0.85), v(cfg, 1.0), u(cfg, 0.95), tone, "matte", { rz: side * -52 }));
      parts.push(box("armR", side * u(cfg, 4.45), v(cfg, 6.55), u(cfg, -1.0), u(cfg, 0.6), v(cfg, 0.75), u(cfg, 0.7), accent, "crystal"));
    }
  }

  if (cfg.wings) {
    for (const side of [1, -1]) {
      if (cfg.wings === "feather") {
        parts.push(box("weapon", side * u(cfg, 2.9), v(cfg, 8.1), u(cfg, -1.2), u(cfg, 1.5), v(cfg, 2.4), u(cfg, 0.3), accent, "matte", { rz: side * 26 }));
        parts.push(box("weapon", side * u(cfg, 4.0), v(cfg, 9.0), u(cfg, -1.35), u(cfg, 1.7), v(cfg, 1.9), u(cfg, 0.24), cfg.wingTone ?? "bone", "matte", { rz: side * 44 }));
      } else {
        parts.push(box("weapon", side * u(cfg, 2.8), v(cfg, 8.2), u(cfg, -1.1), u(cfg, 1.4), v(cfg, 0.55), u(cfg, 0.4), tone, "matte", { rz: side * 20 }));
        parts.push(box("weapon", side * u(cfg, 4.1), v(cfg, 8.7), u(cfg, -1.2), u(cfg, 1.8), v(cfg, 1.5), u(cfg, 0.18), cfg.wingTone ?? "cloth", "matte", { rz: side * 34 }));
      }
    }
  }

  if (cfg.pack) {
    // Back-mounted kit: a frame, a hanging chain and a bucket. It gives the
    // Engineer a rearward mass no other humanoid carries.
    parts.push(box("cloak", 0, v(cfg, 5.5), u(cfg, -1.35), u(cfg, 2.0), v(cfg, 2.4), u(cfg, 0.5), "leather"));
    parts.push(box("cloak", 0, v(cfg, 7.9), u(cfg, -1.4), u(cfg, 1.7), v(cfg, 0.45), u(cfg, 0.6), "brass", "metal"));
    for (let i = 0; i < 3; i += 1) {
      parts.push(box("cloak", u(cfg, -0.55 + i * 0.5), v(cfg, 5.3 - i * 0.55), u(cfg, -1.6), u(cfg, 0.28), v(cfg, 0.5), u(cfg, 0.28), "metal", "metal"));
    }
    parts.push(box("cloak", u(cfg, 0.1), v(cfg, 3.7), u(cfg, -1.62), u(cfg, 0.85), v(cfg, 0.95), u(cfg, 0.85), "metal", "metal"));
    parts.push(box("cloak", u(cfg, 0.1), v(cfg, 4.55), u(cfg, -1.62), u(cfg, 0.95), v(cfg, 0.2), u(cfg, 0.95), "brass", "metal"));
    parts.push(box("body", 0, v(cfg, 7.15), u(cfg, 1.2) + 0, u(cfg, 3.5), v(cfg, 0.3), u(cfg, 0.28), "leather"));
  }

  if (cfg.tail) {
    parts.push(box("tail", 0, v(cfg, 4.6), u(cfg, -1.9), u(cfg, 0.55), v(cfg, 0.55), u(cfg, 0.6), tone, "matte", { rx: -20 }));
    parts.push(box("tail", 0, v(cfg, 3.9), u(cfg, -2.7), u(cfg, 0.42), v(cfg, 0.42), u(cfg, 0.45), tone, "matte", { rx: -34 }));
    parts.push(box("tail", 0, v(cfg, 3.2), u(cfg, -3.4), u(cfg, 0.3), v(cfg, 0.3), u(cfg, 0.34), accent, "matte", { rx: -48 }));
  }
}

export function humanoid(cfg) {
  const model = base(cfg, [cfg.build, cfg.head, cfg.weapon, cfg.stance, cfg.arms === 4 ? "four-arms" : null]);
  const parts = model.parts;
  const accent = cfg.accent ?? "accent";
  const tone = cfg.tone ?? "base";
  const stance = cfg.stance ?? "normal";
  const legX = u(cfg, stance === "wide" ? 1.42 : stance === "narrow" ? 0.78 : 1.02);
  const lean = cfg.hunch ?? 0;

  if (cfg.robe === "split") {
    // Split tabard: a short flared skirt over visible boots. A columnar robe
    // gives no waist and no legs, which is why two robe wearers measured 0.917
    // against each other; the tabard keeps the cloth read but restores both.
    parts.push(box("body", 0, v(cfg, 1.85), 0, u(cfg, 2.55), v(cfg, 3.45), u(cfg, 1.85), tone, "cloth"));
    parts.push(box("body", 0, v(cfg, 0.85), 0, u(cfg, 3.15), v(cfg, 1.1), u(cfg, 2.15), tone, "cloth"));
    parts.push(box("body", 0, v(cfg, 0.1), 0, u(cfg, 3.35), v(cfg, 0.85), u(cfg, 2.25), "dark", "cloth"));
    parts.push(box("body", 0, v(cfg, 2.9), 0, u(cfg, 2.95), v(cfg, 0.55), u(cfg, 2.05), "leather"));
    parts.push(box("body", 0, v(cfg, 2.9), u(cfg, 1.04), u(cfg, 0.65), v(cfg, 0.55), u(cfg, 0.22), accent, "metal"));
    parts.push(...pair("legL", "legR", u(cfg, 0.85), 0, 0.15, u(cfg, 1.05), v(cfg, 0.62), u(cfg, 1.55), "leather"));
    parts.push(...pair("legL", "legR", u(cfg, 0.85), v(cfg, 0.62), 0.1, u(cfg, 0.85), v(cfg, 1.1), u(cfg, 1.05), "dark"));
    parts.push(box("body", 0, v(cfg, 1.0), u(cfg, 1.04), u(cfg, 0.45), v(cfg, 2.3), u(cfg, 0.12), "dark", "cloth"));
    parts.push(box("body", 0, v(cfg, 0.15), u(cfg, -1.08), u(cfg, 1.95), v(cfg, 1.5), u(cfg, 0.14), accent, "cloth"));
  } else if (cfg.robe) {
    // Robed body plan: no separated legs, a stepped skirt instead.
    parts.push(box("body", 0, 0.05, 0, u(cfg, 3.4), v(cfg, 1.85), u(cfg, 2.25), tone, "cloth"));
    parts.push(box("body", 0, v(cfg, 1.7), 0, u(cfg, 3.0), v(cfg, 1.75), u(cfg, 2.05), tone, "cloth"));
    parts.push(box("body", 0, v(cfg, 3.3), 0, u(cfg, 2.6), v(cfg, 1.7), u(cfg, 1.9), "dark", "cloth"));
    parts.push(box("body", 0, 0, 0, u(cfg, 3.65), v(cfg, 0.32), u(cfg, 2.45), "leather"));
    parts.push(box("body", 0, v(cfg, 0.35), u(cfg, 1.18), u(cfg, 0.9), v(cfg, 4.5), u(cfg, 0.18), accent, "cloth"));
    parts.push(box("body", 0, 0.2, u(cfg, -1.16), u(cfg, 2.7), v(cfg, 4.8), u(cfg, 0.2), "cloth", "cloth"));
    parts.push(box("body", u(cfg, 1.55), 0.25, 0, u(cfg, 0.35), v(cfg, 4.0), u(cfg, 1.5), "cloth", "cloth"));
    parts.push(box("body", u(cfg, -1.55), 0.25, 0, u(cfg, 0.35), v(cfg, 4.0), u(cfg, 1.5), "cloth", "cloth"));
  } else if (stance === "bent") {
    // Deep-crouched legs: knees forward, weight low. A different profile.
    parts.push(...pair("legL", "legR", legX, 0, 0.75, u(cfg, 1.55), v(cfg, 0.9), u(cfg, 2.6), "leather"));
    parts.push(...pair("legL", "legR", legX, v(cfg, 0.9), 1.15, u(cfg, 1.3), v(cfg, 1.6), u(cfg, 1.5), "metal", "metal", { rx: 26 }));
    parts.push(...pair("legL", "legR", legX * 0.96, v(cfg, 2.4), 0.35, u(cfg, 1.5), v(cfg, 0.75), u(cfg, 1.6), "dark"));
    parts.push(...pair("legL", "legR", legX * 0.9, v(cfg, 3.1), -0.25, u(cfg, 1.55), v(cfg, 1.5), u(cfg, 1.8), tone, "matte", { rx: -18 }));
  } else if (stance === "stilt") {
    parts.push(...pair("legL", "legR", legX * 0.7, 0, 0.1, u(cfg, 0.75), v(cfg, 0.7), u(cfg, 1.7), "dark"));
    parts.push(...pair("legL", "legR", legX * 0.7, v(cfg, 0.7), 0.05, u(cfg, 0.5), v(cfg, 3.0), u(cfg, 0.55), "metal", "metal"));
    parts.push(...pair("legL", "legR", legX * 0.7, v(cfg, 3.7), 0, u(cfg, 0.75), v(cfg, 0.55), u(cfg, 1.05), "brass", "metal"));
    parts.push(...pair("legL", "legR", legX * 0.9, v(cfg, 4.25), 0, u(cfg, 1.15), v(cfg, 0.95), u(cfg, 1.35), tone));
  } else if (cfg.human) {
    // Human legs: a boot with a visible ankle, a wrapped shin, a knee strap and
    // a cloth thigh that is narrower than the hip, so the body has a waistline.
    const humanLegX = legX * 0.94;
    parts.push(...pair("legL", "legR", humanLegX, 0, 0.25, u(cfg, 1.3), v(cfg, 0.5), u(cfg, 1.6), "leather"));
    parts.push(...pair("legL", "legR", humanLegX, v(cfg, 0.5), 0.35, u(cfg, 1.24), v(cfg, 0.34), u(cfg, 1.72), "leather"));
    parts.push(...pair("legL", "legR", humanLegX, v(cfg, 0.84), 0.12, u(cfg, 1.02), v(cfg, 1.55), u(cfg, 1.16), tone, "cloth"));
    parts.push(...pair("legL", "legR", humanLegX, v(cfg, 2.3), 0.05, u(cfg, 1.16), v(cfg, 0.42), u(cfg, 1.3), "leather"));
    parts.push(...pair("legL", "legR", humanLegX, v(cfg, 2.7), 0, u(cfg, 1.2), v(cfg, 1.9), u(cfg, 1.42), tone, "cloth"));
    parts.push(...pair("legL", "legR", humanLegX, v(cfg, 2.66), u(cfg, 0.62), u(cfg, 0.9), v(cfg, 0.16), u(cfg, 0.14), accent, "matte"));
  } else {
    parts.push(...pair("legL", "legR", legX, 0, 0.2, u(cfg, 1.5), v(cfg, 0.85), u(cfg, 2.1), "leather"));
    parts.push(...pair("legL", "legR", legX, v(cfg, 0.85), 0.1, u(cfg, 1.25), v(cfg, 1.75), u(cfg, 1.45), "metal", "metal"));
    parts.push(...pair("legL", "legR", legX, v(cfg, 2.55), 0, u(cfg, 1.45), v(cfg, 0.6), u(cfg, 1.55), "dark"));
    parts.push(...pair("legL", "legR", legX, v(cfg, 3.1), 0, u(cfg, 1.5), v(cfg, 1.95), u(cfg, 1.75), tone));
  }

  humanoidTorso(parts, cfg, lean);
  humanoidHead(parts, cfg);
  humanoidWeapon(parts, cfg);
  humanoidOffhand(parts, cfg);

  if (cfg.cape && cfg.cape !== "none") {
    // A cloak is three tapering panels, not a slab: the shoulder section is
    // widest, the hem is narrow, and the cloth tone is darker than the body so
    // it reads as a separate layer at tile size.
    const long = cfg.cape === "long";
    const capeTone = cfg.capeTone ?? "dark";
    parts.push(box("cloak", 0, v(cfg, 8.05), u(cfg, -1.05), u(cfg, 3.3 * (cfg.frame ?? 1)), v(cfg, 1.15), u(cfg, 0.32), capeTone, "cloth"));
    parts.push(box("cloak", 0, v(cfg, long ? 4.9 : 6.2), u(cfg, -1.1), u(cfg, 2.9 * (cfg.frame ?? 1)), v(cfg, long ? 3.2 : 2.0), u(cfg, 0.28), capeTone, "cloth"));
    if (long) {
      parts.push(box("cloak", 0, v(cfg, 2.1), u(cfg, -1.0), u(cfg, 2.2 * (cfg.frame ?? 1)), v(cfg, 2.9), u(cfg, 0.26), capeTone, "cloth"));
      parts.push(box("cloak", u(cfg, -1.15), v(cfg, 3.4), u(cfg, -1.04), u(cfg, 0.55), v(cfg, 4.0), u(cfg, 0.24), capeTone, "cloth", { rz: 4 }));
      parts.push(box("cloak", u(cfg, 1.1), v(cfg, 3.6), u(cfg, -1.04), u(cfg, 0.5), v(cfg, 3.8), u(cfg, 0.24), capeTone, "cloth", { rz: -4 }));
    }
    parts.push(box("cloak", 0, v(cfg, 8.9), u(cfg, -0.9), u(cfg, 2.5 * (cfg.frame ?? 1)), v(cfg, 0.32), u(cfg, 0.4), accent, "cloth"));
  }

  // Two extra accents keep the material count honest and break flat colours.
  parts.push(box("body", u(cfg, -1.5), v(cfg, 7.6), u(cfg, 1.2) + lean, u(cfg, 0.35), v(cfg, 0.9), u(cfg, 0.2), accent, "ember"));
  parts.push(box("body", 0, v(cfg, 6.35), u(cfg, 0.98) + lean, u(cfg, 0.7), v(cfg, 0.6), u(cfg, 0.16), "ink", "void"));

  model.pivots = {
    head: [0, v(cfg, 10.05), lean * 2],
    weapon: humanHands(cfg).main,
    armL: [u(cfg, -2.4), v(cfg, 7.9), 0],
    armR: [u(cfg, 2.4), v(cfg, 7.9), 0],
    cloak: [0, v(cfg, 9.0), u(cfg, -1.1)],
  };
  return model;
}

/* ------------------------------------------------------------------ *
 * Beast skull vocabulary
 *
 * Shared by the heavy and lean body plans so horns, brows and jaws stay one
 * design language. `skull: "wedge"` trades the blunt heavy-beast cranium for the
 * long tapered muzzle, narrow cheeks and dropped jaw of a predator.
 * ------------------------------------------------------------------ */

const BLUNT_SKULL = Object.freeze({ len: 1, h: 1, w: 1, jaw: 1, plate: 1.35, snout: 1 });

function beastHead(parts, cfg, { hx, neckY, rise = 0, spread = 0, skull = "blunt" }) {
  const tone = cfg.tone ?? "base";
  const wedge = skull === "wedge";

  // Neck: a thick rising column, then a separate skull block. Before this the
  // skull sat flush against the shoulder mass and disappeared into it.
  parts.push(box("head", hx - u(cfg, 0.15), neckY + v(cfg, 0.5) + rise, spread * 0.5, u(cfg, wedge ? 1.05 : 1.25), v(cfg, 1.9), u(cfg, wedge ? 1.3 : 1.55), tone, "matte", { rz: -26 }));

  // Where the skull sits. The wedge head is built upward from here so the
  // cranium, brow and muzzle can be separate masses.
  const top = neckY + v(cfg, 1.8) + rise;

  if (wedge) {
    // A predator skull is a tall cranium, a brow, a long low muzzle and a
    // dropped jaw. One long box (the old approach) read as a plank.
    const cw = spread * 0.95;
    parts.push(box("head", hx + u(cfg, 0.9), top, cw, u(cfg, 1.32), v(cfg, 1.4), u(cfg, 1.55), tone));
    parts.push(box("head", hx + u(cfg, 0.92), top + v(cfg, 1.4), cw, u(cfg, 0.92), v(cfg, 0.24), u(cfg, 1.2), "bone", "bone"));
    parts.push(box("head", hx + u(cfg, 1.62), top + v(cfg, 0.98), cw, u(cfg, 0.46), v(cfg, 0.34), u(cfg, 1.62), "dark"));
    parts.push(box("head", hx + u(cfg, 2.1), top + v(cfg, 0.48), cw, u(cfg, 1.5), v(cfg, 0.7), u(cfg, 0.98), tone));
    parts.push(box("head", hx + u(cfg, 2.86), top + v(cfg, 0.58), cw, u(cfg, 0.32), v(cfg, 0.52), u(cfg, 0.72), "ink"));
    parts.push(box("head", hx + u(cfg, 1.98), top + v(cfg, 0.2), cw, u(cfg, 1.5), v(cfg, 0.36), u(cfg, 0.92), "dark"));
    parts.push(...both("head", hx + u(cfg, 2.46), top + v(cfg, 0.06), cw + u(cfg, 0.32), u(cfg, 0.2), v(cfg, 0.38), u(cfg, 0.2), "bone", "bone"));
    parts.push(...both("head", hx + u(cfg, 1.68), top + v(cfg, 1.06), cw + u(cfg, 0.6), u(cfg, 0.26), v(cfg, 0.26), u(cfg, 0.22), "eye"));
    parts.push(...both("head", hx + u(cfg, 1.2), top + v(cfg, 0.32), cw + u(cfg, 0.76), u(cfg, 0.72), v(cfg, 0.62), u(cfg, 0.16), "dark"));
  } else {
    parts.push(box("head", hx + u(cfg, 0.45), neckY + v(cfg, 1.7) + rise, spread * 0.7, u(cfg, 0.95), v(cfg, 0.85), u(cfg, 1.1), "dark"));
    parts.push(box("head", hx + u(cfg, 1.15), neckY + v(cfg, 1.75) + rise, spread * 0.95, u(cfg, 1.9), v(cfg, 1.5), u(cfg, 1.95), tone));
    // Pale face plate and dark jaw: value contrast is what makes the head read
    // at tile size even when the silhouette overlaps the body.
    parts.push(box("head", hx + u(cfg, 1.2), neckY + v(cfg, 1.9) + rise, spread * 0.95 + u(cfg, 1.05), u(cfg, 1.35), v(cfg, 0.95), u(cfg, 0.2), "bone", "bone"));
    parts.push(box("head", hx + u(cfg, 2.15), neckY + v(cfg, 1.4) + rise, spread * 1.05, u(cfg, 1.05), v(cfg, 0.6), u(cfg, 1.45), "dark"));
    parts.push(...both("head", hx + u(cfg, 1.6), neckY + v(cfg, 1.2) + rise, spread * 1.05 + u(cfg, 0.45), u(cfg, 0.2), v(cfg, 0.35), u(cfg, 0.16), "bone", "bone"));
    parts.push(...both("head", hx + u(cfg, 1.55), neckY + v(cfg, 2.3) + rise, spread * 0.95 + u(cfg, 1.08), u(cfg, 0.32), v(cfg, 0.3), u(cfg, 0.14), "eye"));
  }

  // Horns attach to the cranium, so their base follows the skull plan.
  const hornBase = wedge ? top + v(cfg, 1.15) : neckY + v(cfg, 2.3) + rise;
  if (cfg.horn === "ram") {
    parts.push(box("head", hx + u(cfg, 0.6), hornBase, 0, u(cfg, 0.55), v(cfg, 0.45), u(cfg, 0.6), "bone", "bone", { rz: 24 }));
    parts.push(box("head", hx + u(cfg, 0.05), hornBase - v(cfg, 0.25), 0, u(cfg, 0.5), v(cfg, 0.5), u(cfg, 0.55), "bone", "bone", { rz: 52 }));
    parts.push(box("head", hx - u(cfg, 0.4), hornBase - v(cfg, 0.8), 0, u(cfg, 0.42), v(cfg, 0.42), u(cfg, 0.5), "bone", "bone", { rz: 74 }));
  } else if (cfg.horn === "antler") {
    for (const side of [1, -1]) {
      parts.push(box("head", hx + u(cfg, 0.6), hornBase - v(cfg, 0.2), side * u(cfg, 0.55), u(cfg, 0.28), v(cfg, 1.5), u(cfg, 0.28), "bone", "bone", { rz: side * 18 }));
      parts.push(box("head", hx + u(cfg, 0.2), hornBase + v(cfg, 0.9), side * u(cfg, 0.8), u(cfg, 0.24), v(cfg, 1.0), u(cfg, 0.24), "bone", "bone", { rz: side * 44 }));
      parts.push(box("head", hx + u(cfg, 1.1), hornBase + v(cfg, 0.6), side * u(cfg, 0.8), u(cfg, 0.24), v(cfg, 0.9), u(cfg, 0.24), "bone", "bone", { rz: side * -36 }));
    }
  } else if (cfg.horn === "tusk") {
    const tuskY = wedge ? top + v(cfg, 0.15) : neckY + v(cfg, 0.8) + rise;
    parts.push(box("head", hx + u(cfg, 2.0), tuskY, 0, u(cfg, 0.75), v(cfg, 0.35), u(cfg, 0.3), "bone", "bone", { rz: 12 }));
    parts.push(box("head", hx + u(cfg, 2.2), tuskY + v(cfg, 0.15), u(cfg, 0.45), u(cfg, 0.55), v(cfg, 0.3), u(cfg, 0.24), "bone", "bone"));
  } else if (cfg.horn === "spike") {
    parts.push(box("head", hx + u(cfg, 0.5), hornBase + v(cfg, 0.1), 0, u(cfg, 0.24), v(cfg, 1.1), u(cfg, 0.24), "bone", "bone", { rz: 30 }));
  }
}

/* ------------------------------------------------------------------ *
 * Quadruped rigs
 *
 * Two body plans, because "a beast" is not one animal. The heavy plan is a
 * barrel-chested bruiser; the lean plan (`build: "lean"`) is a long-limbed
 * predator with a deep narrow ribcage over a tucked waist.
 *
 * Structural axes: build (heavy / lean), posture (low / tall / prowl / rear),
 * leg count (4 / 6), head count (1 / 2 / 3), hull, horns and tail shape.
 * ------------------------------------------------------------------ */

export function beast(cfg) {
  if (cfg.build === "lean") return predator(cfg);
  const model = base(cfg, [cfg.posture ?? "low", cfg.horn ?? "none", cfg.tail ?? "whip"], "heavy");
  const parts = model.parts;
  const accent = cfg.accent ?? "accent";
  const tone = cfg.tone ?? "base";
  const posture = cfg.posture ?? "low";
  const heads = cfg.heads ?? 1;
  const legX = u(cfg, 1.75);
  const legLift = posture === "rear" ? 1.35 : 1;
  const bodyY = v(cfg, posture === "rear" ? 3.9 : 2.6);

  // Legs: front pair under the chest, hind pair under the haunches, plus an
  // extra middle pair for six-legged creatures.
  const legs = [
    ["legR", legX, bodyY * 0.55],
    ["legL", -legX, bodyY * 0.55],
    ["legR", legX * 0.7, bodyY * 0.35],
    ["legL", -legX * 0.7, bodyY * 0.35],
  ];
  for (const [group, x, y] of legs) {
    const far = Math.abs(x) === legX ? 0 : -u(cfg, 0.55);
    parts.push(box(group, x, 0, far, u(cfg, 0.95), v(cfg, 0.7 * legLift), u(cfg, 1.0), "dark"));
    parts.push(box(group, x, v(cfg, 0.7 * legLift), far, u(cfg, 0.8), v(cfg, 1.2 * legLift), u(cfg, 0.85), tone));
    parts.push(box(group, x, v(cfg, 1.9 * legLift), far, u(cfg, 0.95), v(cfg, 0.85), u(cfg, 0.95), "leather", "leather"));
  }
  if ((cfg.legs ?? 4) === 6) {
    for (const side of [1, -1]) {
      parts.push(box(side > 0 ? "legR" : "legL", side * u(cfg, 1.5), 0, u(cfg, 0.2), u(cfg, 0.7), v(cfg, 0.6), u(cfg, 0.8), "dark"));
      parts.push(box(side > 0 ? "legR" : "legL", side * u(cfg, 1.5), v(cfg, 0.6), u(cfg, 0.2), u(cfg, 0.6), v(cfg, 1.1), u(cfg, 0.7), tone));
    }
  }

  // Barrel body, belly and spine plates.
  parts.push(box("body", 0, bodyY, 0, u(cfg, 4.1), v(cfg, 1.95), u(cfg, 2.6), tone));
  parts.push(box("body", 0, bodyY + v(cfg, 0.3), 0, u(cfg, 3.6), v(cfg, 0.5), u(cfg, 2.35), "dark"));
  parts.push(box("body", 0, bodyY + v(cfg, 1.75), 0, u(cfg, 4.0), v(cfg, 0.45), u(cfg, 2.0), "stone", "stone"));
  parts.push(box("body", 0, bodyY + v(cfg, 0.4), u(cfg, 1.35), u(cfg, 3.9), v(cfg, 1.4), u(cfg, 0.18), accent));

  // A shell turns the whole back into a dome: a different animal.
  if (cfg.shell) {
    for (let i = 0; i < 3; i += 1) {
      parts.push(box("body", 0, bodyY + v(cfg, 1.9 + i * 0.35), 0, u(cfg, 4.1 - i * 0.6), v(cfg, 0.55), u(cfg, 2.9 - i * 0.4), "stone", "stone"));
    }
    parts.push(box("body", 0, bodyY + v(cfg, 2.9), 0, u(cfg, 1.6), v(cfg, 0.4), u(cfg, 1.2), accent, "crystal"));
  }

  for (let i = 0; i < 3; i += 1) {
    parts.push(
      box("body", u(cfg, -1.2 + i * 1.15), bodyY + v(cfg, 2.0), u(cfg, -0.4), u(cfg, 0.3), v(cfg, 0.75 + i * 0.15), u(cfg, 0.3), accent, "bone", { rz: -8 + i * 8 }),
    );
  }

  // Neck and head(s). Each head gets its own neck so a hydra reads as one.
  const neckBase = u(cfg, posture === "rear" ? 1.9 : 2.6);
  const neckY = bodyY + v(cfg, posture === "rear" ? 1.9 : 0.6);
  for (let head = 0; head < heads; head += 1) {
    const spread = heads === 1 ? 0 : (head - (heads - 1) / 2) * u(cfg, 1.3);
    const rise = heads === 1 ? 0 : Math.abs(head - (heads - 1) / 2) * v(cfg, 0.45);
    beastHead(parts, cfg, { hx: neckBase + spread * 0.5, neckY, rise, spread });
  }

  // Tail: whip, fan or club.
  if (cfg.tail === "fan") {
    parts.push(box("tail", u(cfg, -2.3), bodyY + v(cfg, 0.4), 0, u(cfg, 1.1), v(cfg, 0.55), u(cfg, 0.6), tone, "matte", { rz: 16 }));
    for (let i = 0; i < 3; i += 1) {
      parts.push(box("tail", u(cfg, -3.4), bodyY + v(cfg, 0.2), u(cfg, -0.5 + i * 0.5), u(cfg, 1.2), v(cfg, 1.3), u(cfg, 0.16), accent, "matte", { rz: 30 + i * 6 }));
    }
  } else if (cfg.tail === "club") {
    parts.push(box("tail", u(cfg, -2.3), bodyY + v(cfg, 0.4), 0, u(cfg, 1.1), v(cfg, 0.55), u(cfg, 0.6), tone, "matte", { rz: 16 }));
    parts.push(box("tail", u(cfg, -3.4), bodyY + v(cfg, 0.15), 0, u(cfg, 0.9), v(cfg, 0.7), u(cfg, 0.7), "stone", "stone", { rz: 28 }));
    parts.push(box("tail", u(cfg, -3.7), bodyY + v(cfg, 0.5), 0, u(cfg, 0.5), v(cfg, 0.4), u(cfg, 0.4), accent, "crystal", { rz: 28 }));
  } else {
    parts.push(box("tail", u(cfg, -2.3), bodyY + v(cfg, 0.4), 0, u(cfg, 1.1), v(cfg, 0.55), u(cfg, 0.6), tone, "matte", { rz: 16 }));
    parts.push(box("tail", u(cfg, -3.3), bodyY, 0, u(cfg, 1.0), v(cfg, 0.4), u(cfg, 0.45), tone, "matte", { rz: 30 }));
    parts.push(box("tail", u(cfg, -4.1), bodyY - v(cfg, 0.55), 0, u(cfg, 0.8), v(cfg, 0.32), u(cfg, 0.34), accent, "matte", { rz: 44 }));
  }

  // Saddle cloth reads from the tactical camera; heavy creatures get plating.
  if (!cfg.shell) {
    parts.push(box("body", 0, bodyY + v(cfg, 1.2), u(cfg, 1.3), u(cfg, 1.9), v(cfg, 0.85), u(cfg, 0.22), "brass", "metal"));
    parts.push(box("body", 0, bodyY + v(cfg, 1.65), u(cfg, 0.1), u(cfg, 2.2), v(cfg, 0.3), u(cfg, 2.2), "cloth", "cloth"));
    parts.push(box("body", 0, bodyY + v(cfg, 0.8), u(cfg, 1.4), u(cfg, 2.6), v(cfg, 1.15), u(cfg, 0.16), "cloth", "cloth"));
  } else {
    parts.push(box("body", 0, bodyY + v(cfg, 0.8), u(cfg, 1.45), u(cfg, 3.2), v(cfg, 0.9), u(cfg, 0.2), "brass", "metal"));
  }

  model.pivots = {
    head: [u(cfg, 3.0), bodyY + v(cfg, 2.0), 0],
    tail: [u(cfg, -2.2), bodyY + v(cfg, 0.5), 0],
  };
  return model;
}

/* ------------------------------------------------------------------ *
 * Lean predator plan
 *
 * A heavy beast recoloured is still a heavy beast. A hound, a stalker and a
 * charger get different *masses in different places*: long narrow limbs, a deep
 * ribcage that is taller than it is wide, a waist that tucks up and narrows
 * behind it, a back that arches over the chest, a forward-reaching neck and a
 * long counterbalancing tail. The barrel of the heavy rig is gone entirely.
 *
 * Posture is structural: `low` stands level, `prowl` crouches with the chest
 * down and the haunches high, `rear` rises on the hind legs with the forelimbs
 * held clear of the ground.
 * ------------------------------------------------------------------ */

export function predator(cfg) {
  const posture = cfg.posture ?? "low";
  const model = base(cfg, ["lean", posture, cfg.horn ?? "none", cfg.tail ?? "whip"], "breathe");
  const parts = model.parts;
  const tone = cfg.tone ?? "base";
  const accent = cfg.accent ?? "accent";
  const heads = cfg.heads ?? 1;
  const crouch = posture === "prowl";
  const reared = posture === "rear";
  const bodyY = v(cfg, reared ? 5.4 : crouch ? 3.55 : 4.35);

  const chestX = u(cfg, crouch ? 1.45 : 1.15);
  const waistX = -u(cfg, 1.45);
  const track = u(cfg, 0.82);

  // Limbs are stacked proportionally to the belly line, so they always meet the
  // body. Hard-coded segment heights left the reared charger's hind legs
  // floating a whole unit below its raised chest.
  const padH = v(cfg, 0.34);
  const reach = bodyY + v(cfg, 0.3);
  const span = reach - padH;
  const limb = (group, x, z, scale) => {
    const cannon = span * 0.46;
    const hock = span * 0.14;
    const thigh = span * 0.4;
    parts.push(box(group, x, 0, z, u(cfg, 0.66 * scale), padH, u(cfg, 0.82 * scale), "dark"));
    parts.push(box(group, x - u(cfg, 0.1), padH, z, u(cfg, 0.44 * scale), cannon, u(cfg, 0.5 * scale), tone));
    parts.push(box(group, x - u(cfg, 0.18), padH + cannon, z, u(cfg, 0.5 * scale), hock, u(cfg, 0.58), "dark", "matte", { rz: 26 }));
    parts.push(box(group, x, padH + cannon + hock * 0.82, z, u(cfg, 0.6 * scale), thigh, u(cfg, 0.68), tone));
    parts.push(box(group, x, reach - v(cfg, 0.86), z, u(cfg, 0.78 * scale), v(cfg, 0.86), u(cfg, 0.94), "leather", "leather"));
  };

  // ---- hind legs always carry the animal; forelimbs depend on posture -----
  limb("legR", -u(cfg, 2.15), track, 1.18);
  limb("legL", -u(cfg, 2.15), -track, 1.18);
  const frontX = u(cfg, crouch ? 1.85 : 2.0);
  if (reared) {
    for (const side of [1, -1]) {
      const group = side > 0 ? "legR" : "legL";
      parts.push(box(group, frontX - u(cfg, 0.35), bodyY - v(cfg, 0.55), side * track, u(cfg, 0.48), v(cfg, 1.45), u(cfg, 0.52), tone, "matte", { rz: 58 }));
      parts.push(box(group, frontX + u(cfg, 0.9), bodyY - v(cfg, 1.45), side * track, u(cfg, 0.6), v(cfg, 0.5), u(cfg, 0.7), "dark", "matte", { rz: 72 }));
      parts.push(box(group, frontX + u(cfg, 1.45), bodyY - v(cfg, 1.6), side * track, u(cfg, 0.3), v(cfg, 0.26), u(cfg, 0.3), "bone", "bone"));
    }
  } else {
    limb("legR", frontX, track, 1);
    limb("legL", frontX, -track, 1);
  }
  if ((cfg.legs ?? 4) === 6) {
    for (const side of [1, -1]) {
      const group = side > 0 ? "legR" : "legL";
      parts.push(box(group, 0, 0, side * track, u(cfg, 0.5), v(cfg, 0.3), u(cfg, 0.56), "dark"));
      parts.push(box(group, 0, v(cfg, 0.3), side * track, u(cfg, 0.4), reach - v(cfg, 0.7), u(cfg, 0.45), tone));
      parts.push(box(group, 0, reach - v(cfg, 0.9), side * track, u(cfg, 0.55), v(cfg, 0.5), u(cfg, 0.6), "dark", "matte", { rz: -18 }));
    }
  }

  // ---- deep ribcage forward, tucked waist behind: the girth change --------
  parts.push(box("body", chestX, bodyY, 0, u(cfg, 3.1), v(cfg, 2.0), u(cfg, 1.9), tone));
  parts.push(box("body", chestX, bodyY - v(cfg, 0.5), 0, u(cfg, 2.3), v(cfg, 1.05), u(cfg, 1.45), "dark"));
  parts.push(box("body", waistX, bodyY + v(cfg, 0.55), 0, u(cfg, 2.9), v(cfg, 1.3), u(cfg, 1.45), tone));
  parts.push(box("body", waistX, bodyY + v(cfg, 0.1), 0, u(cfg, 2.1), v(cfg, 0.62), u(cfg, 1.15), "dark"));
  // Back arch: highest over the shoulders, falling away toward the hips.
  parts.push(box("body", chestX - u(cfg, 0.25), bodyY + v(cfg, 1.92), 0, u(cfg, 2.5), v(cfg, 0.5), u(cfg, 1.65), "dark"));
  parts.push(box("body", waistX, bodyY + v(cfg, 1.78), 0, u(cfg, 2.3), v(cfg, 0.34), u(cfg, 1.25), "dark"));

  // ---- shoulder blades and a row of spine knobs ---------------------------
  // Thin rib bars were removed: at card size they read as debris floating beside
  // the body. A shoulder mass and a spine ridge carry the same anatomy.
  parts.push(...both("body", chestX - u(cfg, 0.15), bodyY + v(cfg, 1.05), u(cfg, 0.84), u(cfg, 0.2), v(cfg, 1.05), u(cfg, 0.86), "leather", "leather", { rz: 18 }));
  parts.push(box("body", chestX + u(cfg, 0.35), bodyY + v(cfg, 0.5), 0, u(cfg, 1.5), v(cfg, 1.1), u(cfg, 1.7), tone));
  parts.push(box("body", chestX + u(cfg, 0.4), bodyY - v(cfg, 0.1), 0, u(cfg, 1.2), v(cfg, 0.8), u(cfg, 1.45), "dark"));
  for (let i = 0; i < 5; i += 1) {
    const t = i / 4;
    parts.push(
      box("body", chestX - u(cfg, 0.3) - t * u(cfg, 2.5), bodyY + v(cfg, 2.26 - t * 0.4), 0, u(cfg, 0.32), v(cfg, 0.42 + (1 - t) * 0.26), u(cfg, 0.28), accent, "bone", { rz: -14 }),
    );
  }

  // ---- long neck reaching forward, wedge skull ---------------------------
  const neckBase = u(cfg, reared ? 1.6 : crouch ? 2.15 : 2.45);
  const neckY = bodyY + v(cfg, reared ? 2.05 : crouch ? 0.15 : 0.6);
  for (let head = 0; head < heads; head += 1) {
    const spread = heads === 1 ? 0 : (head - (heads - 1) / 2) * u(cfg, 1.3);
    const rise = heads === 1 ? 0 : Math.abs(head - (heads - 1) / 2) * v(cfg, 0.45);
    beastHead(parts, cfg, { hx: neckBase + spread * 0.5, neckY, rise, spread, skull: "wedge" });
  }

  // ---- long counterbalancing tail ---------------------------------------
  const tailY = bodyY + v(cfg, 0.9);
  if (cfg.tail === "fan") {
    parts.push(box("tail", waistX - u(cfg, 1.2), tailY, 0, u(cfg, 1.5), v(cfg, 0.45), u(cfg, 0.5), tone, "matte", { rz: 10 }));
    for (let i = 0; i < 3; i += 1) {
      parts.push(box("tail", waistX - u(cfg, 2.35), tailY - v(cfg, 0.2), u(cfg, -0.42 + i * 0.42), u(cfg, 1.02), v(cfg, 1.02), u(cfg, 0.16), accent, "matte", { rz: 24 + i * 8 }));
    }
  } else if (cfg.tail === "club") {
    parts.push(box("tail", waistX - u(cfg, 1.2), tailY, 0, u(cfg, 1.5), v(cfg, 0.42), u(cfg, 0.5), tone, "matte", { rz: 12 }));
    parts.push(box("tail", waistX - u(cfg, 2.6), tailY - v(cfg, 0.5), 0, u(cfg, 0.95), v(cfg, 0.75), u(cfg, 0.72), "stone", "stone", { rz: 30 }));
    parts.push(box("tail", waistX - u(cfg, 2.9), tailY - v(cfg, 0.15), 0, u(cfg, 0.5), v(cfg, 0.42), u(cfg, 0.42), accent, "crystal", { rz: 30 }));
  } else {
    parts.push(box("tail", waistX - u(cfg, 1.3), tailY, 0, u(cfg, 1.6), v(cfg, 0.4), u(cfg, 0.45), tone, "matte", { rz: 14 }));
    parts.push(box("tail", waistX - u(cfg, 2.8), tailY - v(cfg, 0.5), 0, u(cfg, 1.5), v(cfg, 0.3), u(cfg, 0.34), tone, "matte", { rz: 26 }));
    parts.push(box("tail", waistX - u(cfg, 4.05), tailY - v(cfg, 1.05), 0, u(cfg, 1.15), v(cfg, 0.24), u(cfg, 0.26), accent, "matte", { rz: 38 }));
  }

  // ---- saddle strap and a light harness, never a full cloth blanket ------
  parts.push(box("body", 0, bodyY + v(cfg, 1.35), 0, u(cfg, 2.2), v(cfg, 0.24), u(cfg, 1.75), "cloth", "cloth"));
  parts.push(box("body", chestX, bodyY + v(cfg, 1.1), u(cfg, 0.95), u(cfg, 0.9), v(cfg, 0.7), u(cfg, 0.2), "brass", "metal"));

  model.pivots = {
    head: [u(cfg, 3.1), neckY + v(cfg, 1.4), 0],
    tail: [waistX - u(cfg, 1.2), tailY, 0],
  };
  return model;
}

/* ------------------------------------------------------------------ *
 * Construct rig
 *
 * Structural axes: frame (heavy / slim / quad / tower), crest, head count.
 * ------------------------------------------------------------------ */

export function construct(cfg) {
  const frame = cfg.frame ?? "heavy";
  const model = base(cfg, [frame, cfg.crest ?? "none"], "heavy");
  const parts = model.parts;
  const accent = cfg.accent ?? "accent";
  const tone = cfg.tone ?? "metal";

  if (frame === "quad") {
    // Four-legged walking chassis: low, wide, cannon on the spine.
    const legX = u(cfg, 2.0);
    for (const side of [1, -1]) {
      for (const z of [0.85, -0.85]) {
        parts.push(box(side > 0 ? "legR" : "legL", side * legX, 0, u(cfg, z), u(cfg, 0.75), v(cfg, 1.1), u(cfg, 0.9), "dark"));
        parts.push(box(side > 0 ? "legR" : "legL", side * legX, v(cfg, 1.1), u(cfg, z), u(cfg, 0.6), v(cfg, 1.3), u(cfg, 0.7), tone, "metal"));
        parts.push(box(side > 0 ? "legR" : "legL", side * legX, v(cfg, 2.4), u(cfg, z), u(cfg, 1.0), v(cfg, 0.4), u(cfg, 1.1), "stone", "stone"));
      }
    }
    parts.push(box("body", 0, v(cfg, 2.7), 0, u(cfg, 4.6), v(cfg, 1.5), u(cfg, 3.0), tone, "metal"));
    parts.push(box("body", 0, v(cfg, 3.0), u(cfg, 1.4), u(cfg, 3.4), v(cfg, 0.6), u(cfg, 0.35), "light", "metal"));
    parts.push(box("body", 0, v(cfg, 4.2), 0, u(cfg, 2.2), v(cfg, 1.3), u(cfg, 2.2), "dark"));
    parts.push(box("body", 0, v(cfg, 4.5), u(cfg, 1.3), u(cfg, 1.0), v(cfg, 0.9), u(cfg, 0.3), accent, "crystal"));
    // Spine cannon rather than a head.
    parts.push(box("weapon", 0, v(cfg, 5.4), u(cfg, -0.2), u(cfg, 1.5), v(cfg, 0.9), u(cfg, 3.4), tone, "metal", { rx: -8 }));
    parts.push(box("weapon", 0, v(cfg, 5.5), u(cfg, 1.5), u(cfg, 1.0), v(cfg, 0.7), u(cfg, 1.1), "dark"));
    parts.push(box("weapon", 0, v(cfg, 5.6), u(cfg, 1.8), u(cfg, 0.7), v(cfg, 0.45), u(cfg, 0.4), accent, "ember"));
    parts.push(...both("body", u(cfg, 1.7), v(cfg, 2.8), 0, u(cfg, 0.6), v(cfg, 1.0), u(cfg, 2.2), "brass", "metal"));
    // Hip actuators and hip plates: the quad frame needs visible machinery
    // between the tread pads and the hull, or it reads as a floating box.
    for (const side of [1, -1]) {
      parts.push(box(side > 0 ? "legR" : "legL", side * u(cfg, 2.6), v(cfg, 2.7), 0, u(cfg, 0.55), v(cfg, 0.9), u(cfg, 0.5), "brass", "metal"));
      parts.push(box(side > 0 ? "legR" : "legL", side * u(cfg, 2.9), v(cfg, 2.9), 0, u(cfg, 0.3), v(cfg, 0.35), u(cfg, 0.3), accent, "crystal"));
      parts.push(box("body", side * u(cfg, 1.2), v(cfg, 3.4), u(cfg, 1.5), u(cfg, 1.0), v(cfg, 0.55), u(cfg, 0.2), "brass", "metal"));
      // Hull vents.
      parts.push(box("body", side * u(cfg, 2.05), v(cfg, 3.6), u(cfg, -0.4), u(cfg, 0.25), v(cfg, 0.85), u(cfg, 1.2), "dark"));
    }
    // Hanging chain-fists: a swinging melee arm on each flank.
    for (const side of [1, -1]) {
      parts.push(box("armR", side * u(cfg, 3.1), v(cfg, 3.4), u(cfg, 1.2), u(cfg, 0.35), v(cfg, 1.1), u(cfg, 0.35), "dark"));
      parts.push(box("armR", side * u(cfg, 3.2), v(cfg, 2.35), u(cfg, 1.35), u(cfg, 0.8), v(cfg, 0.7), u(cfg, 0.8), "stone", "stone"));
      parts.push(box("armR", side * u(cfg, 3.25), v(cfg, 2.6), u(cfg, 1.5), u(cfg, 0.45), v(cfg, 0.3), u(cfg, 0.2), accent, "ember"));
    }
    // Furnace grate across the chin of the hull.
    for (let i = 0; i < 3; i += 1) {
      parts.push(box("body", u(cfg, -0.9 + i * 0.9), v(cfg, 3.7), u(cfg, 2.05), u(cfg, 0.5), v(cfg, 0.28), u(cfg, 0.2), "brass", "metal"));
    }
    parts.push(box("body", 0, v(cfg, 0.55), u(cfg, 2.6), u(cfg, 2.4), v(cfg, 0.35), u(cfg, 0.6), "stone", "stone"));
    if (cfg.crest === "ring") {
      parts.push(box("body", 0, v(cfg, 5.2), u(cfg, -1.2), u(cfg, 2.6), v(cfg, 0.25), u(cfg, 0.25), "brass", "metal"));
    } else if (cfg.crest === "chimney") {
      parts.push(box("body", u(cfg, -1.6), v(cfg, 5.4), 0, u(cfg, 0.9), v(cfg, 2.0), u(cfg, 0.9), "dark"));
      parts.push(box("body", u(cfg, -1.6), v(cfg, 7.4), 0, u(cfg, 1.2), v(cfg, 0.3), u(cfg, 1.2), accent, "ember"));
    }
    model.pivots = { weapon: [0, v(cfg, 5.6), 0], head: [0, v(cfg, 4.6), 0] };
    return model;
  }

  if (frame === "tower") {
    // Tracked pillar: no legs at all, a broad tread base and a tall shaft.
    parts.push(box("body", 0, 0, 0, u(cfg, 4.4), v(cfg, 1.1), u(cfg, 3.4), "dark"));
    parts.push(box("body", 0, v(cfg, 0.35), 0, u(cfg, 4.0), v(cfg, 0.5), u(cfg, 3.0), "stone", "stone"));
    for (let i = 0; i < 4; i += 1) {
      parts.push(box("body", 0, v(cfg, 1.2 + i * 1.3), 0, u(cfg, 3.6 - i * 0.1), v(cfg, 1.2), u(cfg, 2.6 - i * 0.1), tone, "metal"));
    }
    parts.push(box("body", 0, v(cfg, 6.2), u(cfg, 1.1), u(cfg, 1.6), v(cfg, 1.5), u(cfg, 0.3), "light", "metal"));
    parts.push(box("body", 0, v(cfg, 6.9), u(cfg, 1.3), u(cfg, 0.9), v(cfg, 0.9), u(cfg, 0.25), accent, "crystal"));
    // Rotating head assembly.
    parts.push(box("head", 0, v(cfg, 7.6), 0, u(cfg, 2.4), v(cfg, 1.2), u(cfg, 2.2), tone, "metal"));
    parts.push(box("head", 0, v(cfg, 7.9), u(cfg, 1.1), u(cfg, 1.6), v(cfg, 0.45), u(cfg, 0.25), accent, "ember"));
    parts.push(...both("head", u(cfg, 1.5), v(cfg, 8.4), 0, u(cfg, 0.4), v(cfg, 1.1), u(cfg, 0.4), "brass", "metal"));
    // Corner buttresses: the shaft is masonry, so it needs mass at the edges.
    for (const side of [1, -1]) {
      parts.push(box("body", side * u(cfg, 1.85), v(cfg, 1.1), u(cfg, 1.35), u(cfg, 0.75), v(cfg, 4.6), u(cfg, 0.7), "stone", "stone", { rz: side * -3 }));
      parts.push(box("body", side * u(cfg, 1.9), v(cfg, 2.2), u(cfg, 1.5), u(cfg, 0.55), v(cfg, 0.5), u(cfg, 0.3), "brass", "metal"));
    }
    // Banded courses and carved glyph plates reading up the tower.
    for (let i = 0; i < 3; i += 1) {
      parts.push(box("body", 0, v(cfg, 1.6 + i * 1.5), 0, u(cfg, 3.9), v(cfg, 0.3), u(cfg, 2.9), "stone", "stone"));
      parts.push(box("body", 0, v(cfg, 1.75 + i * 1.5), u(cfg, 1.55), u(cfg, 1.5), v(cfg, 0.5), u(cfg, 0.18), "brass", "metal"));
      parts.push(box("body", u(cfg, 1.1), v(cfg, 2.0 + i * 1.5), u(cfg, 1.6), u(cfg, 0.35), v(cfg, 0.7), u(cfg, 0.14), accent, "crystal"));
    }
    // Sarcophagus wings: two stone slabs lashed to the flanks with chain.
    for (const side of [1, -1]) {
      parts.push(box("body", side * u(cfg, 2.5), v(cfg, 2.2), u(cfg, -0.4), u(cfg, 0.55), v(cfg, 3.4), u(cfg, 1.9), "stone", "stone", { rz: side * 2 }));
      parts.push(box("body", side * u(cfg, 2.55), v(cfg, 3.4), u(cfg, -0.4), u(cfg, 0.35), v(cfg, 0.9), u(cfg, 1.2), "bone", "bone"));
      parts.push(box("body", side * u(cfg, 2.6), v(cfg, 1.4), u(cfg, 0.9), u(cfg, 0.2), v(cfg, 1.4), u(cfg, 0.2), "brass", "metal", { rz: side * 8 }));
    }
    // Grave lamps at the tread corners.
    for (const side of [1, -1]) {
      parts.push(box("body", side * u(cfg, 1.6), v(cfg, 1.1), u(cfg, 1.6), u(cfg, 0.55), v(cfg, 0.7), u(cfg, 0.55), "brass", "metal"));
      parts.push(box("body", side * u(cfg, 1.6), v(cfg, 1.35), u(cfg, 1.72), u(cfg, 0.35), v(cfg, 0.4), u(cfg, 0.16), accent, "ember"));
    }
    // Chained censers hang off the flanks on swinging arms.
    for (const side of [1, -1]) {
      parts.push(box(side > 0 ? "armR" : "armL", side * u(cfg, 2.25), v(cfg, 5.6), u(cfg, 0.9), u(cfg, 0.3), v(cfg, 1.6), u(cfg, 0.3), "brass", "metal"));
      parts.push(box(side > 0 ? "armR" : "armL", side * u(cfg, 2.3), v(cfg, 4.5), u(cfg, 1.05), u(cfg, 0.65), v(cfg, 0.85), u(cfg, 0.65), "brass", "metal"));
      parts.push(box(side > 0 ? "armR" : "armL", side * u(cfg, 2.3), v(cfg, 4.75), u(cfg, 1.2), u(cfg, 0.4), v(cfg, 0.35), u(cfg, 0.16), accent, "ember"));
    }
    // A tattered banner lashed to the shaft.
    parts.push(box("cloak", u(cfg, -1.95), v(cfg, 4.0), u(cfg, -0.1), u(cfg, 1.5), v(cfg, 3.2), u(cfg, 0.12), "cloth", "cloth"));
    parts.push(box("cloak", u(cfg, -2.1), v(cfg, 3.2), u(cfg, -0.1), u(cfg, 0.9), v(cfg, 2.0), u(cfg, 0.1), "cloth", "cloth"));
    if (cfg.crest === "bell") {
      parts.push(box("head", 0, v(cfg, 8.8), 0, u(cfg, 2.6), v(cfg, 0.4), u(cfg, 0.4), "brass", "metal"));
      parts.push(box("head", 0, v(cfg, 9.2), 0, u(cfg, 1.8), v(cfg, 1.1), u(cfg, 1.8), "brass", "metal"));
      parts.push(box("head", 0, v(cfg, 10.3), 0, u(cfg, 0.5), v(cfg, 0.5), u(cfg, 0.5), accent, "crystal"));
      // Clapper, swinging free under the bell mouth.
      parts.push(box("weapon", 0, v(cfg, 8.35), 0, u(cfg, 0.22), v(cfg, 0.9), u(cfg, 0.22), "brass", "metal"));
      parts.push(box("weapon", 0, v(cfg, 8.1), 0, u(cfg, 0.5), v(cfg, 0.5), u(cfg, 0.5), "brass", "metal"));
      parts.push(box("head", 0, v(cfg, 9.35), u(cfg, 1.5), u(cfg, 0.9), v(cfg, 0.3), u(cfg, 0.2), "brass", "metal"));
      parts.push(box("head", 0, v(cfg, 9.3), u(cfg, -1.6), u(cfg, 0.7), v(cfg, 0.4), u(cfg, 0.2), accent, "ember"));
    }
    model.pivots = { head: [0, v(cfg, 7.8), 0] };
    return model;
  }

  const slim = frame === "slim";
  const legX = u(cfg, slim ? 0.85 : 1.3);
  const torsoW = slim ? 2.9 : 3.8;
  const shoulder = slim ? 1.1 : 1.5;

  parts.push(...pair("legL", "legR", legX, 0, 0, u(cfg, slim ? 0.85 : 1.15), v(cfg, 0.75), u(cfg, slim ? 1.2 : 1.7), "dark"));
  parts.push(...pair("legL", "legR", legX, v(cfg, 0.75), 0, u(cfg, slim ? 0.7 : 0.95), v(cfg, slim ? 2.5 : 1.9), u(cfg, slim ? 0.8 : 1.1), tone, "metal"));
  if (slim) {
    // Exposed piston shafts: thin, bright, and clearly separate legs.
    parts.push(...pair("legL", "legR", legX + u(cfg, 0.45), v(cfg, 1.0), 0, u(cfg, 0.25), v(cfg, 2.0), u(cfg, 0.25), "brass", "metal"));
  }
  parts.push(...pair("legL", "legR", legX, v(cfg, slim ? 3.25 : 2.65), 0, u(cfg, slim ? 1.2 : 1.55), v(cfg, 0.55), u(cfg, slim ? 1.4 : 1.8), "stone", "stone"));
  parts.push(box("body", 0, v(cfg, slim ? 3.8 : 3.2), 0, u(cfg, slim ? 2.0 : 2.6), v(cfg, 1.1), u(cfg, 1.8), "dark"));

  parts.push(box("body", 0, v(cfg, slim ? 4.9 : 4.3), 0, u(cfg, torsoW), v(cfg, slim ? 2.9 : 2.4), u(cfg, slim ? 1.9 : 2.3), tone, "metal"));
  parts.push(box("body", 0, v(cfg, 4.5), u(cfg, 1.15), u(cfg, torsoW * 0.66), v(cfg, 1.8), u(cfg, 0.35), "light", "metal"));
  parts.push(box("body", 0, v(cfg, slim ? 5.6 : 5.25), u(cfg, 1.4), u(cfg, 0.95), v(cfg, 0.95), u(cfg, 0.24), accent, "crystal"));
  parts.push(box("body", 0, v(cfg, 4.9), u(cfg, 1.52), u(cfg, 1.15), v(cfg, 0.35), u(cfg, 0.18), "brass", "metal"));
  parts.push(box("body", 0, v(cfg, slim ? 7.9 : 6.65), 0, u(cfg, torsoW + 0.3), v(cfg, 0.5), u(cfg, 2.1), "dark"));

  parts.push(...both("body", u(cfg, slim ? 1.8 : 2.45), v(cfg, slim ? 7.4 : 6.35), 0, u(cfg, shoulder), v(cfg, slim ? 0.95 : 1.35), u(cfg, slim ? 1.5 : 2.3), "stone", "stone"));
  parts.push(...pair("armL", "armR", u(cfg, slim ? 2.0 : 2.6), v(cfg, slim ? 5.6 : 4.75), 0, u(cfg, slim ? 0.85 : 1.15), v(cfg, 1.55), u(cfg, slim ? 1.0 : 1.4), tone, "metal"));
  parts.push(...pair("armL", "armR", u(cfg, slim ? 2.0 : 2.6), v(cfg, slim ? 4.1 : 3.2), 0, u(cfg, slim ? 0.95 : 1.3), v(cfg, 1.5), u(cfg, slim ? 1.1 : 1.55), "dark"));
  parts.push(...both("body", u(cfg, slim ? 2.1 : 2.7), v(cfg, 2.4), 0, u(cfg, slim ? 1.1 : 1.65), v(cfg, 1.25), u(cfg, slim ? 1.2 : 1.7), "stone", "stone"));

  const headY = v(cfg, slim ? 8.5 : 7.1);
  parts.push(box("head", 0, headY - v(cfg, 0.35), 0, u(cfg, slim ? 1.0 : 1.25), v(cfg, 0.35), u(cfg, 1.2), "dark"));
  parts.push(box("head", 0, headY, 0, u(cfg, slim ? 1.6 : 2.0), v(cfg, slim ? 1.8 : 1.5), u(cfg, slim ? 1.5 : 1.8), tone, "metal"));
  parts.push(box("head", 0, headY + v(cfg, 0.55), u(cfg, 0.95), u(cfg, slim ? 1.1 : 1.5), v(cfg, 0.4), u(cfg, 0.22), "ink", "void"));
  parts.push(...both("head", u(cfg, 0.4), headY + v(cfg, 0.6), u(cfg, 1.05), u(cfg, 0.28), v(cfg, 0.24), u(cfg, 0.12), accent));

  if ((cfg.heads ?? 1) > 1) {
    for (let index = 1; index < (cfg.heads ?? 1); index += 1) {
      const side = index % 2 === 0 ? 1 : -1;
      const step = Math.ceil(index / 2);
      parts.push(
        box("head", side * u(cfg, 1.15 * step), headY - v(cfg, 1.0 - step * 0.2), u(cfg, -0.2), u(cfg, 0.65), v(cfg, 1.4), u(cfg, 0.65), tone, "metal", { rz: side * -22 }),
      );
      parts.push(box("head", side * u(cfg, 1.7 * step), headY + v(cfg, 0.25), u(cfg, 0.1), u(cfg, 1.1), v(cfg, 0.9), u(cfg, 1.1), tone, "metal"));
      parts.push(box("head", side * u(cfg, 2.05 * step), headY + v(cfg, 0.45), u(cfg, 0.35), u(cfg, 0.3), v(cfg, 0.18), u(cfg, 0.1), accent));
    }
  }

  if (cfg.crest === "chimney") {
    parts.push(box("head", 0, headY + v(cfg, 1.5), u(cfg, -0.4), u(cfg, 1.1), v(cfg, 2.3), u(cfg, 1.0), "dark"));
    parts.push(box("head", 0, headY + v(cfg, 3.75), u(cfg, -0.4), u(cfg, 1.45), v(cfg, 0.3), u(cfg, 1.3), accent, "ember"));
    parts.push(box("head", 0, headY + v(cfg, 1.85), u(cfg, 0.15), u(cfg, 0.7), v(cfg, 1.1), u(cfg, 0.2), accent, "ember"));
  } else if (cfg.crest === "crown") {
    parts.push(box("head", 0, headY + v(cfg, 1.6), 0, u(cfg, 2.1), v(cfg, 0.3), u(cfg, 1.9), "brass", "metal"));
    for (const offset of [-0.75, 0, 0.75]) {
      parts.push(box("head", u(cfg, offset), headY + v(cfg, 1.9), 0, u(cfg, 0.22), v(cfg, 0.9), u(cfg, 0.22), "brass", "metal"));
    }
  } else if (cfg.crest === "ring") {
    parts.push(box("head", 0, headY + v(cfg, 1.8), 0, u(cfg, 2.6), v(cfg, 0.28), u(cfg, 0.28), "brass", "metal"));
    parts.push(box("head", u(cfg, 1.2), headY + v(cfg, 1.1), 0, u(cfg, 0.28), v(cfg, 1.6), u(cfg, 0.28), "brass", "metal"));
    parts.push(box("head", u(cfg, -1.2), headY + v(cfg, 1.1), 0, u(cfg, 0.28), v(cfg, 1.6), u(cfg, 0.28), "brass", "metal"));
  } else if (cfg.crest === "antenna") {
    parts.push(box("head", 0, headY + v(cfg, 1.4), 0, u(cfg, 0.2), v(cfg, 2.4), u(cfg, 0.2), "brass", "metal"));
    parts.push(box("head", 0, headY + v(cfg, 3.8), 0, u(cfg, 0.7), v(cfg, 0.7), u(cfg, 0.7), accent, "crystal"));
  }

  parts.push(box("body", u(cfg, -2.2), v(cfg, 5.5), u(cfg, -1.1), u(cfg, 0.9), v(cfg, 0.9), u(cfg, 0.25), "brass", "metal"));
  parts.push(box("body", u(cfg, -2.2), v(cfg, 5.75), u(cfg, -1.2), u(cfg, 0.35), v(cfg, 0.35), u(cfg, 0.14), accent, "crystal"));
  parts.push(box("body", 0, v(cfg, 3.55), u(cfg, 1.0), u(cfg, 2.8), v(cfg, 0.3), u(cfg, 0.2), "brass", "metal"));

  model.pivots = {
    head: [0, headY, 0],
    armL: [u(cfg, -2.5), v(cfg, 6.0), 0],
    armR: [u(cfg, 2.5), v(cfg, 6.0), 0],
  };
  return model;
}

/* ------------------------------------------------------------------ *
 * Serpent rig — no legs, a coiled tail and one or more necks
 * ------------------------------------------------------------------ */

export function serpent(cfg) {
  const model = base(cfg, [cfg.body ?? "coiled", cfg.heads === 1 ? "single-head" : "hydra", cfg.hood ? "hood" : null], "hover");
  const parts = model.parts;
  const accent = cfg.accent ?? "accent";
  const tone = cfg.tone ?? "base";
  const heads = cfg.heads ?? 3;
  const coils = cfg.coils ?? 2;

  // The base: stacked coils, widest at the ground, tapering as they rise.
  for (let i = 0; i < coils; i += 1) {
    const y = v(cfg, 0.15 + i * 0.95);
    const radius = u(cfg, 3.5 - i * 0.55);
    parts.push(box("body", 0, y, 0, radius * 2, v(cfg, 0.85), radius * 2 * 0.72, i % 2 ? tone : "dark"));
    parts.push(box("body", u(cfg, radius * 0.55), y + v(cfg, 0.1), u(cfg, radius * 0.5), u(cfg, 0.55), v(cfg, 0.7), u(cfg, 1.4), "brass", "metal"));
    parts.push(box("body", u(cfg, -radius * 0.55), y + v(cfg, 0.1), u(cfg, radius * 0.5), u(cfg, 0.55), v(cfg, 0.7), u(cfg, 1.4), "brass", "metal"));
    parts.push(box("body", 0, y, u(cfg, -radius * 0.62), u(cfg, radius * 1.5), v(cfg, 0.35), u(cfg, 0.3), accent));
  }
  // A raised trunk rising out of the coil.
  const trunkY = v(cfg, 0.6 + coils * 0.95);
  parts.push(box("body", 0, trunkY, u(cfg, -0.1), u(cfg, 1.9), v(cfg, 2.4), u(cfg, 1.7), tone));
  parts.push(box("body", 0, trunkY + v(cfg, 0.9), u(cfg, 0.85), u(cfg, 1.1), v(cfg, 1.0), u(cfg, 0.2), accent));

  // Short clawed forelimbs, folded against the trunk.
  if (cfg.forelegs) {
    for (const side of [1, -1]) {
      parts.push(box(side > 0 ? "armR" : "armL", side * u(cfg, 1.55), trunkY + v(cfg, 0.9), u(cfg, 0.75), u(cfg, 1.0), v(cfg, 0.55), u(cfg, 1.4), tone, "matte", { rz: side * -22 }));
      parts.push(box(side > 0 ? "armR" : "armL", side * u(cfg, 2.1), trunkY + v(cfg, 0.35), u(cfg, 1.25), u(cfg, 0.55), v(cfg, 0.35), u(cfg, 0.9), "bone", "bone", { rz: side * -34 }));
    }
  }

  // Necks fan out from a collar; each has a bend so heads sit at different
  // heights and angles rather than in a row.
  const collarY = trunkY + v(cfg, 2.0);
  const neckSpread = heads === 1 ? 0 : u(cfg, 1.35);
  for (let head = 0; head < heads; head += 1) {
    const t = heads === 1 ? 0 : head / (heads - 1) - 0.5;
    const side = t;
    const height = v(cfg, 2.6 - Math.abs(t) * 1.0);
    const hx = side * neckSpread;
    // Neck: two segments, angled outward then up.
    parts.push(box("head", hx * 0.6, collarY, side * u(cfg, 0.9), u(cfg, 0.85), height * 0.6, u(cfg, 0.85), tone, "matte", { rz: -side * 26 }));
    parts.push(box("head", hx, collarY + height * 0.55, side * u(cfg, 1.35), u(cfg, 0.75), height * 0.55, u(cfg, 0.75), tone, "matte", { rz: side * 14 }));
    const headY = collarY + height * 1.0;
    // Skull, jaw, eyes and horn.
    parts.push(box("head", hx, headY, side * u(cfg, 1.75), u(cfg, 1.5), v(cfg, 1.0), u(cfg, 1.9), tone));
    parts.push(box("head", hx, headY - v(cfg, 0.4), side * u(cfg, 2.1), u(cfg, 1.25), v(cfg, 0.45), u(cfg, 1.5), "dark"));
    parts.push(box("head", hx, headY + v(cfg, 1.0), side * u(cfg, 1.9), u(cfg, 1.1), v(cfg, 0.35), u(cfg, 1.2), accent));
    parts.push(...both("head", hx + u(cfg, 0.45), headY + v(cfg, 0.45), side * u(cfg, 2.2), u(cfg, 0.3), v(cfg, 0.26), u(cfg, 0.12), "eye"));
    parts.push(box("head", hx, headY + v(cfg, 1.1), side * u(cfg, 2.2), u(cfg, 0.28), v(cfg, 0.9), u(cfg, 0.28), "bone", "bone", { rz: 22 }));
    parts.push(box("head", hx + u(cfg, 0.4), headY + v(cfg, 1.6), side * u(cfg, 2.4), u(cfg, 0.22), v(cfg, 0.7), u(cfg, 0.22), "bone", "bone", { rz: 40 }));
  }

  // Spread hood: a cobra-like plate that changes the outline completely.
  if (cfg.hood) {
    for (const side of [1, -1]) {
      parts.push(box("body", side * u(cfg, 1.9), trunkY + v(cfg, 1.4), u(cfg, 0.4), u(cfg, 1.9), v(cfg, 2.3), u(cfg, 0.25), tone, "matte", { rz: side * 22 }));
      parts.push(box("body", side * u(cfg, 2.5), trunkY + v(cfg, 1.9), u(cfg, 0.3), u(cfg, 0.9), v(cfg, 1.4), u(cfg, 0.2), accent, "matte", { rz: side * 34 }));
    }
  }

  // Tail tip curling out of the coil.
  parts.push(box("tail", u(cfg, -3.4), v(cfg, 0.5), u(cfg, -0.6), u(cfg, 1.6), v(cfg, 0.5), u(cfg, 0.5), tone, "matte", { rz: 24 }));
  parts.push(box("tail", u(cfg, -4.3), v(cfg, 1.0), u(cfg, -0.8), u(cfg, 1.2), v(cfg, 0.4), u(cfg, 0.4), tone, "matte", { rz: 48 }));
  parts.push(box("tail", u(cfg, -4.7), v(cfg, 2.0), u(cfg, -1.0), u(cfg, 0.5), v(cfg, 1.0), u(cfg, 0.25), accent, "matte", { rz: 70 }));
  // Ventral plates down the front of the coil.
  for (let i = 0; i < 3; i += 1) {
    parts.push(box("body", 0, v(cfg, 0.6 + i * 0.9), u(cfg, 2.3 + i * 0.35), u(cfg, 2.0), v(cfg, 0.3), u(cfg, 0.16), "brass", "metal"));
  }
  // Gear/scale detail so the metal serpent still reads as clockwork.
  parts.push(box("body", u(cfg, 1.2), trunkY + v(cfg, 0.3), u(cfg, 1.0), u(cfg, 0.6), v(cfg, 0.6), u(cfg, 0.2), accent, "crystal"));
  parts.push(box("body", u(cfg, -1.2), trunkY + v(cfg, 1.2), u(cfg, 0.9), u(cfg, 0.5), v(cfg, 0.5), u(cfg, 0.2), "brass", "metal"));

  model.pivots = {
    head: [0, collarY, 0],
    tail: [u(cfg, -3.2), v(cfg, 0.6), 0],
  };
  return model;
}

/* ------------------------------------------------------------------ *
 * Drake rig
 *
 * Structural axes: plan (wings / wyvern / lindworm), neck count, horns.
 * ------------------------------------------------------------------ */

export function drake(cfg) {
  const plan = cfg.plan ?? "wings";
  const model = base(cfg, [plan, cfg.wings ?? "swept", cfg.horns ?? "none"], "hover");
  const parts = model.parts;
  const accent = cfg.accent ?? "accent";
  const tone = cfg.tone ?? "base";
  const necks = cfg.necks ?? 1;

  const bodyY = v(cfg, plan === "lindworm" ? 1.6 : 2.4);
  const legX = u(cfg, plan === "wyvern" ? 1.9 : 1.5);

  // Legs: wyverns stand on two powerful legs with wing-arms; lindworms barely.
  for (const [group, x] of [["legR", legX], ["legL", -legX]]) {
    parts.push(box(group, x, 0.5, 0.4, u(cfg, 1.2), v(cfg, 1.5), u(cfg, 1.35), "dark"));
    parts.push(box(group, x, 0.0, 0.6, u(cfg, 1.45), v(cfg, 0.55), u(cfg, 1.9), "leather"));
  }
  if (plan === "wyvern") {
    for (const [group, x] of [["armR", legX * 0.55], ["armL", -legX * 0.55]]) {
      parts.push(box(group, x, v(cfg, 2.4), u(cfg, 0.9), u(cfg, 0.5), v(cfg, 1.4), u(cfg, 0.5), tone, "matte"));
      parts.push(box(group, x, v(cfg, 1.2), u(cfg, 1.1), u(cfg, 0.6), v(cfg, 0.4), u(cfg, 0.6), "bone", "bone"));
    }
  }

  parts.push(box("body", 0, bodyY, 0, u(cfg, plan === "lindworm" ? 2.9 : 3.6), v(cfg, plan === "lindworm" ? 1.9 : 2.3), u(cfg, plan === "lindworm" ? 3.4 : 2.9), tone));
  parts.push(box("body", 0, bodyY + v(cfg, 0.2), u(cfg, 1.35), u(cfg, 2.9), v(cfg, 1.4), u(cfg, 0.2), "light"));
  parts.push(box("body", 0, bodyY + v(cfg, 2.0), 0, u(cfg, 3.1), v(cfg, 0.5), u(cfg, 2.4), "stone", "stone"));

  // Necks: a lindworm gets a long, low serpentine neck; others one upright one.
  const neckCount = Math.max(1, necks);
  for (let neck = 0; neck < neckCount; neck += 1) {
    const t = neckCount === 1 ? 0 : neck / (neckCount - 1) - 0.5;
    const baseX = u(cfg, 2.2) + t * u(cfg, 0.9);
    const baseY = bodyY + v(cfg, 1.0);
    if (plan === "lindworm") {
      for (let seg = 0; seg < 3; seg += 1) {
        parts.push(
          box("head", baseX + seg * u(cfg, 0.75), baseY + seg * v(cfg, 0.45), t * u(cfg, 1.0), u(cfg, 1.0), v(cfg, 0.9), u(cfg, 1.1), tone, "matte", { rz: -seg * 8 }),
        );
      }
    } else {
      parts.push(box("head", baseX, baseY + v(cfg, 0.6), t * u(cfg, 0.6), u(cfg, 1.25), v(cfg, 1.4), u(cfg, 1.35), tone, "matte", { rz: -26 }));
      parts.push(box("head", baseX + u(cfg, 0.8), baseY + v(cfg, 1.35), t * u(cfg, 0.8), u(cfg, 1.15), v(cfg, 1.35), u(cfg, 1.25), tone, "matte", { rz: -8 }));
    }
    const hx = baseX + u(cfg, plan === "lindworm" ? 2.4 : 1.7);
    const hy = baseY + v(cfg, plan === "lindworm" ? 1.5 : 1.9);
    parts.push(box("head", hx, hy, t * u(cfg, 1.0), u(cfg, 1.55), v(cfg, 1.1), u(cfg, 1.55), tone));
    parts.push(box("head", hx + u(cfg, 0.85), hy - v(cfg, 0.15), t * u(cfg, 1.0), u(cfg, 1.15), v(cfg, 0.75), u(cfg, 1.25), "dark"));
    parts.push(...both("head", hx + u(cfg, 0.3), hy + v(cfg, 0.55), t * u(cfg, 1.0) + u(cfg, 0.4), u(cfg, 0.26), v(cfg, 0.22), u(cfg, 0.12), "eye"));

    if (cfg.horns === "crown") {
      parts.push(box("head", hx - u(cfg, 0.5), hy + v(cfg, 0.95), t * u(cfg, 1.0), u(cfg, 0.3), v(cfg, 1.3), u(cfg, 0.3), "bone", "bone", { rz: 20 }));
      parts.push(box("head", hx - u(cfg, 1.0), hy + v(cfg, 0.7), t * u(cfg, 1.0) + u(cfg, 0.45), u(cfg, 0.26), v(cfg, 1.0), u(cfg, 0.26), "bone", "bone", { rz: 42 }));
      parts.push(box("head", hx - u(cfg, 1.0), hy + v(cfg, 0.7), t * u(cfg, 1.0) - u(cfg, 0.45), u(cfg, 0.26), v(cfg, 1.0), u(cfg, 0.26), "bone", "bone", { rz: 42 }));
    } else if (cfg.horns === "swept") {
      parts.push(box("head", hx - u(cfg, 0.7), hy + v(cfg, 0.6), t * u(cfg, 1.0), u(cfg, 0.24), v(cfg, 1.6), u(cfg, 0.24), "bone", "bone", { rz: 34 }));
      parts.push(box("head", hx - u(cfg, 1.35), hy + v(cfg, 1.4), t * u(cfg, 1.0), u(cfg, 0.2), v(cfg, 1.0), u(cfg, 0.2), "bone", "bone", { rz: 66 }));
    }
  }

  // Chest sigil and dorsal fin.
  parts.push(box("body", 0, bodyY + v(cfg, 0.75), u(cfg, 1.5), u(cfg, 1.7), v(cfg, 1.0), u(cfg, 0.25), accent, "crystal"));
  for (let i = 0; i < 3; i += 1) {
    parts.push(box("body", u(cfg, -0.8 + i * 0.8), bodyY + v(cfg, 2.3), 0, u(cfg, 0.26), v(cfg, 0.85 - i * 0.12), u(cfg, 1.0), "bone", "bone", { rz: -10 + i * 8 }));
  }

  // Wings: full membranes, folded, or wyvern wing-arms.
  if (plan !== "lindworm") {
    for (const side of [1, -1]) {
      parts.push(box("weapon", side * u(cfg, 1.8), bodyY + v(cfg, 1.8), u(cfg, -0.9), u(cfg, 1.6), v(cfg, 0.4), u(cfg, 0.4), tone, "matte", { rz: side * 22 }));
      parts.push(box("weapon", side * u(cfg, 2.9), bodyY + v(cfg, 2.4), u(cfg, -0.95), u(cfg, 2.0), v(cfg, 0.35), u(cfg, 0.35), tone, "matte", { rz: side * 8 }));
      parts.push(
        box("weapon", side * u(cfg, 2.6), bodyY + v(cfg, 0.8), u(cfg, -0.75), u(cfg, 1.9), v(cfg, 1.7), u(cfg, 0.16), cfg.wingTone ?? "cloth", "matte", { rz: side * 16 }),
      );
      parts.push(
        box("weapon", side * u(cfg, 3.7), bodyY + v(cfg, 0.9), u(cfg, -0.8), u(cfg, 1.3), v(cfg, 1.4), u(cfg, 0.14), cfg.wingTone ?? "cloth", "matte", { rz: side * 4 }),
      );
      parts.push(box("weapon", side * u(cfg, 4.2), bodyY + v(cfg, 2.15), u(cfg, -0.95), u(cfg, 0.5), v(cfg, 0.35), u(cfg, 0.28), accent, "crystal"));
    }
  } else {
    // Lindworm: vestigial fins instead of wings.
    for (const side of [1, -1]) {
      parts.push(box("weapon", side * u(cfg, 1.6), bodyY + v(cfg, 1.9), u(cfg, -0.6), u(cfg, 0.7), v(cfg, 1.2), u(cfg, 0.14), cfg.wingTone ?? "cloth", "matte", { rz: side * 30 }));
    }
  }

  // Tail: long for the lindworm, finned for the rest.
  parts.push(box("tail", u(cfg, -2.6), bodyY + v(cfg, 0.2), 0, u(cfg, 1.7), v(cfg, 0.6), u(cfg, 0.65), tone, "matte", { rz: 14 }));
  parts.push(box("tail", u(cfg, -4.0), bodyY - v(cfg, 0.25), 0, u(cfg, 1.4), v(cfg, 0.44), u(cfg, 0.5), tone, "matte", { rz: 28 }));
  if (plan === "lindworm") {
    parts.push(box("tail", u(cfg, -5.2), bodyY - v(cfg, 0.2), 0, u(cfg, 1.3), v(cfg, 0.36), u(cfg, 0.4), tone, "matte", { rz: 44 }));
    parts.push(box("tail", u(cfg, -6.2), bodyY + v(cfg, 0.1), 0, u(cfg, 1.0), v(cfg, 0.3), u(cfg, 0.3), accent, "matte", { rz: 58 }));
  } else {
    parts.push(box("tail", u(cfg, -5.0), bodyY + v(cfg, 0.25), 0, u(cfg, 0.9), v(cfg, 0.9), u(cfg, 0.18), accent, "matte", { rz: 40 }));
  }

  model.pivots = {
    head: [u(cfg, 3.1), bodyY + v(cfg, 2.2), 0],
    tail: [u(cfg, -2.4), bodyY + v(cfg, 0.3), 0],
    weapon: [0, bodyY + v(cfg, 2.2), u(cfg, -0.9)],
  };
  return model;
}

/* ------------------------------------------------------------------ *
 * Spirit rig
 *
 * Structural axes: form (veiled / core / crowned / wraith), arms, tails.
 * ------------------------------------------------------------------ */

export function spirit(cfg) {
  const form = cfg.form ?? "veiled";
  const model = base(cfg, [form, "floating"], "hover");
  const parts = model.parts;
  const accent = cfg.accent ?? "accent";
  const tone = cfg.tone ?? "cloth";
  const hemY = 0.35;
  const arms = cfg.arms ?? 2;

  if (form === "wraith") {
    // No robe: a torn torso trailing into separate tattered tails.
    parts.push(box("body", 0, v(cfg, 3.4), 0, u(cfg, 3.0), v(cfg, 2.6), u(cfg, 1.7), tone));
    parts.push(box("body", 0, v(cfg, 3.5), u(cfg, 0.95), u(cfg, 2.2), v(cfg, 1.2), u(cfg, 0.18), accent));
    for (let i = 0; i < 5; i += 1) {
      const x = u(cfg, -2.2 + i * 1.1);
      const h = v(cfg, 1.2 + (i % 2) * 0.8);
      parts.push(box("cloak", x, v(cfg, 3.5) - h, u(cfg, 0.2), u(cfg, 0.45), h, u(cfg, 0.5), tone, "cloth", { rz: -12 + i * 6 }));
      parts.push(box("cloak", x * 1.1, v(cfg, 3.5) - h - v(cfg, 0.8), u(cfg, 0.1), u(cfg, 0.3), v(cfg, 0.9), u(cfg, 0.3), "void", "void", { rz: -16 + i * 8 }));
    }
    parts.push(box("body", 0, v(cfg, 6.1), 0, u(cfg, 1.1), v(cfg, 0.4), u(cfg, 1.1), "dark"));
    // Open rib cage: three pairs of ribs around a void, so a wraith reads as
    // hollow rather than as a robe with a hole painted on it.
    for (let i = 0; i < 3; i += 1) {
      for (const side of [1, -1]) {
        parts.push(box("body", side * u(cfg, 1.25), v(cfg, 4.0 + i * 0.75), u(cfg, 0.85), u(cfg, 0.9), v(cfg, 0.28), u(cfg, 0.75), "bone", "bone", { rz: side * -12 }));
      }
      parts.push(box("body", 0, v(cfg, 4.15 + i * 0.75), u(cfg, 0.9), u(cfg, 0.45), v(cfg, 0.22), u(cfg, 0.2), accent, "ember"));
    }
    parts.push(box("body", 0, v(cfg, 5.85), 0, u(cfg, 2.5), v(cfg, 0.32), u(cfg, 1.4), "bone", "bone"));
    // Three lower tendrils, each with a bright tip.
    for (const offset of [-1.5, 0, 1.5]) {
      parts.push(box("cloak", u(cfg, offset), v(cfg, 1.1), u(cfg, 0.2), u(cfg, 0.35), v(cfg, 2.4), u(cfg, 0.35), tone, "cloth", { rz: offset * 6 }));
      parts.push(box("cloak", u(cfg, offset * 1.15), 0.05, u(cfg, 0.25), u(cfg, 0.24), v(cfg, 1.2), u(cfg, 0.24), "void", "void"));
      parts.push(box("cloak", u(cfg, offset * 1.2), v(cfg, 1.0), u(cfg, 0.3), u(cfg, 0.22), v(cfg, 0.4), u(cfg, 0.22), accent, "crystal"));
    }
    parts.push(box("head", 0, v(cfg, 6.5), 0, u(cfg, 1.9), v(cfg, 1.8), u(cfg, 1.7), tone));
    parts.push(box("head", 0, v(cfg, 6.85), u(cfg, 0.9), u(cfg, 1.35), v(cfg, 1.2), u(cfg, 0.2), "void", "void"));
    parts.push(...both("head", u(cfg, 0.34), v(cfg, 7.35), u(cfg, 1.0), u(cfg, 0.24), v(cfg, 0.2), u(cfg, 0.1), "eye"));
    parts.push(box("head", 0, v(cfg, 8.4), 0, u(cfg, 2.1), v(cfg, 0.5), u(cfg, 0.28), tone, "cloth"));
  } else {
    // A robe that tapers rather than ending in feet.
    parts.push(box("body", 0, hemY, 0, u(cfg, 2.4), v(cfg, 1.6), u(cfg, 2.0), tone));
    parts.push(box("body", 0, hemY + v(cfg, 1.6), 0, u(cfg, 3.2), v(cfg, 1.5), u(cfg, 2.3), tone));
    parts.push(box("body", 0, hemY + v(cfg, 3.0), 0, u(cfg, 3.6), v(cfg, 1.2), u(cfg, 2.1), "dark"));
    parts.push(box("body", 0, v(cfg, 4.9), 0, u(cfg, 3.1), v(cfg, 1.9), u(cfg, 1.9), tone));
    parts.push(box("body", 0, v(cfg, 5.0), u(cfg, 1.05), u(cfg, 2.2), v(cfg, 1.1), u(cfg, 0.18), accent, "crystal"));
    parts.push(box("head", 0, v(cfg, 6.6), 0, u(cfg, 1.2), v(cfg, 0.4), u(cfg, 1.2), "dark"));
    parts.push(box("head", 0, v(cfg, 7.0), 0, u(cfg, 2.2), v(cfg, 1.9), u(cfg, 2.0), tone));
    parts.push(box("head", 0, v(cfg, 7.35), u(cfg, 1.0), u(cfg, 1.55), v(cfg, 1.3), u(cfg, 0.25), "void", "void"));
    parts.push(...both("head", u(cfg, 0.38), v(cfg, 7.85), u(cfg, 1.14), u(cfg, 0.26), v(cfg, 0.22), u(cfg, 0.1), "eye"));
  }

  // Shoulders and sleeves (skipped by wraiths, which have no robe body).
  if (form !== "wraith") {
    parts.push(...both("body", u(cfg, 2.0), v(cfg, 5.9), 0, u(cfg, 1.25), v(cfg, 0.9), u(cfg, 1.75), "dark"));
  }
  if (arms > 0) {
    parts.push(...pair("armL", "armR", u(cfg, 2.2), v(cfg, form === "wraith" ? 5.2 : 3.9), 0.1, u(cfg, 0.95), v(cfg, 2.1), u(cfg, 1.35), tone));
    parts.push(...pair("armL", "armR", u(cfg, 2.25), v(cfg, form === "wraith" ? 4.85 : 3.55), 0.25, u(cfg, 0.75), v(cfg, 0.6), u(cfg, 0.95), accent));
  }
  if (arms === 4) {
    for (const side of [1, -1]) {
      parts.push(box("armR", side * u(cfg, 3.1), v(cfg, 5.4), u(cfg, -0.5), u(cfg, 0.8), v(cfg, 1.5), u(cfg, 0.9), "dark", "cloth", { rz: side * -34 }));
      parts.push(box("armR", side * u(cfg, 3.6), v(cfg, 4.6), u(cfg, -0.9), u(cfg, 0.6), v(cfg, 0.7), u(cfg, 0.7), accent, "crystal"));
    }
  }

  if (form === "crowned") {
    if (form !== "wraith") parts.push(box("head", 0, v(cfg, 8.85), 0, u(cfg, 2.45), v(cfg, 0.8), u(cfg, 0.3), tone));
    parts.push(box("head", 0, v(cfg, 9.5), 0, u(cfg, 2.1), v(cfg, 0.28), u(cfg, 1.9), "brass", "metal"));
    for (const offset of [-0.8, 0, 0.8]) {
      parts.push(box("head", u(cfg, offset), v(cfg, 9.75), 0, u(cfg, 0.22), v(cfg, 1.0), u(cfg, 0.22), "brass", "metal"));
    }
    parts.push(box("head", 0, v(cfg, 10.6), u(cfg, 0.3), u(cfg, 0.24), v(cfg, 0.24), u(cfg, 0.24), accent, "crystal"));
    // The crown floats: drifting mantle, loosened dust and a trailing hem give
    // the crowned form its own animated silhouette.
    parts.push(box("cloak", u(cfg, -1.35), v(cfg, 7.0), u(cfg, -0.9), u(cfg, 1.0), v(cfg, 2.6), u(cfg, 0.16), tone, "cloth", { rz: 10 }));
    parts.push(box("cloak", u(cfg, 1.35), v(cfg, 7.4), u(cfg, -0.9), u(cfg, 0.9), v(cfg, 2.1), u(cfg, 0.16), tone, "cloth", { rz: -10 }));
    parts.push(box("cloak", 0, v(cfg, 8.55), 0, u(cfg, 2.9), v(cfg, 0.35), u(cfg, 0.3), "brass", "metal"));
    for (let i = 0; i < 4; i += 1) {
      parts.push(box("tail", u(cfg, -1.8 + i * 1.2), v(cfg, 1.0 + (i % 2) * 0.7), u(cfg, 0.5), u(cfg, 0.28), v(cfg, 1.1), u(cfg, 0.28), accent, "matte", { rz: -14 + i * 9 }));
    }
    parts.push(box("tail", 0, v(cfg, 0.1), 0, u(cfg, 2.4), v(cfg, 0.2), u(cfg, 1.9), tone, "matte"));
  } else if (form === "core") {
    parts.push(box("head", 0, v(cfg, 9.0), 0, u(cfg, 1.1), v(cfg, 1.1), u(cfg, 1.1), accent, "crystal"));
    parts.push(box("head", 0, v(cfg, 9.2), 0, u(cfg, 0.5), v(cfg, 0.5), u(cfg, 0.5), "bone", "bone"));
    parts.push(box("head", u(cfg, 1.25), v(cfg, 8.7), 0, u(cfg, 0.5), v(cfg, 1.5), u(cfg, 0.16), "bone", "bone", { rz: 18 }));
    parts.push(box("head", u(cfg, -1.25), v(cfg, 8.7), 0, u(cfg, 0.5), v(cfg, 1.5), u(cfg, 0.16), "bone", "bone", { rz: -18 }));
    // Cage of pale petals around the seed-heart, plus roots and drifting motes.
    for (let i = 0; i < 6; i += 1) {
      const angle = (i / 6) * 360;
      const dx = Math.cos((angle * Math.PI) / 180) * u(cfg, 1.55);
      const dz = Math.sin((angle * Math.PI) / 180) * u(cfg, 1.35);
      parts.push(box(i % 2 ? "cloak" : "head", u(cfg, 0) + dx, v(cfg, 8.35), dz, u(cfg, 0.35), v(cfg, 1.5), u(cfg, 0.3), "bone", "bone", { rz: 14, ry: angle }));
      parts.push(box("tail", dx * 0.6, v(cfg, 6.6), dz * 0.6, u(cfg, 0.2), v(cfg, 0.9), u(cfg, 0.2), accent, "crystal", { ry: angle }));
    }
    parts.push(box("head", 0, v(cfg, 10.25), 0, u(cfg, 0.9), v(cfg, 0.35), u(cfg, 0.9), "bone", "bone"));
    for (const side of [1, -1]) {
      parts.push(box("body", side * u(cfg, 0.85), v(cfg, 5.6), u(cfg, 0.7), u(cfg, 0.28), v(cfg, 2.4), u(cfg, 0.28), "bone", "bone", { rz: side * 8 }));
      parts.push(box("body", side * u(cfg, 1.5), v(cfg, 6.9), u(cfg, 0.5), u(cfg, 0.3), v(cfg, 0.4), u(cfg, 0.3), accent, "ember"));
    }
  } else if (form !== "wraith") {
    parts.push(box("head", 0, v(cfg, 9.1), 0, u(cfg, 1.9), v(cfg, 0.45), u(cfg, 0.3), "crystal", "crystal"));
    parts.push(box("head", 0, v(cfg, 9.55), 0, u(cfg, 0.35), v(cfg, 1.1), u(cfg, 0.35), accent, "crystal"));
  }

  if (form !== "wraith") {
    parts.push(box("body", u(cfg, 1.75), v(cfg, 6.3), u(cfg, -0.15), u(cfg, 0.45), v(cfg, 1.1), u(cfg, 0.45), "bone", "bone", { rz: 18 }));
    parts.push(box("body", u(cfg, -1.75), v(cfg, 6.0), u(cfg, -0.1), u(cfg, 0.35), v(cfg, 0.9), u(cfg, 0.35), "bone", "bone", { rz: -22 }));
    parts.push(box("body", 0, hemY + v(cfg, 1.0), u(cfg, 1.1), u(cfg, 2.5), v(cfg, 0.3), u(cfg, 1.7), "dark"));
    for (let i = 0; i < 3; i += 1) {
      const x = u(cfg, -1.0 + i);
      parts.push(box("body", x, 0.0, u(cfg, 0.6), u(cfg, 0.32), v(cfg, 0.65), u(cfg, 0.36), "dark"));
      parts.push(box("body", x - u(cfg, 0.12), 0.0, u(cfg, -0.55), u(cfg, 0.26), v(cfg, 0.85), u(cfg, 0.3), "dark"));
    }
    parts.push(box("body", u(cfg, -1.7), hemY + v(cfg, 2.0), u(cfg, 0.8), u(cfg, 0.34), v(cfg, 2.2), u(cfg, 0.2), "void", "void"));
    parts.push(box("body", u(cfg, 1.5), hemY + v(cfg, 3.2), u(cfg, 0.7), u(cfg, 0.3), v(cfg, 1.7), u(cfg, 0.18), "void", "void"));
  }
  parts.push(box("body", u(cfg, 1.6), hemY + v(cfg, 1.0), u(cfg, -0.8), u(cfg, 0.42), v(cfg, 0.42), u(cfg, 0.42), accent, "ember"));

  model.pivots = {
    head: [0, v(cfg, 7.1), 0],
    armL: [u(cfg, -2.1), v(cfg, 5.7), 0],
    armR: [u(cfg, 2.1), v(cfg, 5.7), 0],
  };
  return model;
}
