/**
 * Dependency-free CSS 3D voxel renderer.
 *
 * A model is a list of boxes in voxel units. Every box becomes a real 3D
 * rectangular prism with three visible faces. Face colours are precomputed per
 * material in JavaScript instead of being produced with CSS filters: filters on
 * 3D-transformed elements are expensive and flatten the depth cue, while a
 * material response keeps steel, cloth, stone and glass visually distinct.
 *
 * Box schema:
 *   g  animation group (body | head | weapon | armL | armR | legL | legR |
 *      tail | wingL | wingR | cloak | prop | base)
 *   x  horizontal offset, 0 = centre of the tile (positive is right)
 *   y  height of the box's *bottom* above the ground (0 = feet)
 *   z  depth, positive is toward the viewer
 *   w h d  size in voxels
 *   c  palette key, or a raw `#rrggbb` for props
 *   m  material key (matte | metal | stone | cloth | leather | wood | bone |
 *      crystal | glass | ember | void)
 *   rx ry rz  optional rotation in degrees around the box's own centre
 *
 * This module only *displays* models. It never decides gameplay state.
 */

const MATERIAL_RESPONSE = Object.freeze({
  matte: { front: 1, side: 0.7, top: 1.14, edge: 0.16, glow: 0 },
  metal: { front: 1.06, side: 0.56, top: 1.4, edge: 0.42, glow: 0 },
  stone: { front: 0.98, side: 0.68, top: 1.12, edge: 0.2, glow: 0 },
  cloth: { front: 0.94, side: 0.76, top: 1.06, edge: 0.1, glow: 0 },
  leather: { front: 0.9, side: 0.64, top: 1.08, edge: 0.14, glow: 0 },
  wood: { front: 0.95, side: 0.67, top: 1.13, edge: 0.16, glow: 0 },
  bone: { front: 1.02, side: 0.78, top: 1.16, edge: 0.22, glow: 0 },
  crystal: { front: 1.1, side: 0.72, top: 1.32, edge: 0.34, glow: 0.55 },
  glass: { front: 0.92, side: 0.62, top: 1.26, edge: 0.3, glow: 0.45 },
  ember: { front: 1.16, side: 0.82, top: 1.42, edge: 0.5, glow: 1 },
  void: { front: 0.78, side: 0.5, top: 0.96, edge: 0.28, glow: 0.2 },
});

/** Materials that self-illuminate a little even in the roster showcase. */
const LUMINOUS = new Set(["crystal", "glass", "ember"]);

function parseHex(hex) {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  const int = Number.parseInt(full, 16);
  if (Number.isNaN(int)) return [128, 128, 128];
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function shade(hex, factor) {
  const [r, g, b] = parseHex(hex);
  const apply = (channel) => Math.max(0, Math.min(255, Math.round(channel * factor)));
  return `rgb(${apply(r)}, ${apply(g)}, ${apply(b)})`;
}

function materialKey(part) {
  if (part.m && MATERIAL_RESPONSE[part.m]) return part.m;
  // Palette keys imply a sensible default surface; a part can always override.
  if (part.c === "metal" || part.c === "brass") return "metal";
  if (part.c === "stone") return "stone";
  if (part.c === "cloth") return "cloth";
  if (part.c === "leather") return "leather";
  if (part.c === "wood") return "wood";
  if (part.c === "bone") return "bone";
  if (part.c === "crystal") return "crystal";
  if (part.c === "glow" || part.c === "eye") return "ember";
  if (part.c === "ink" || part.c === "void") return "void";
  return "matte";
}

function colourFor(part, palette) {
  const raw = palette[part.c] ?? (typeof part.c === "string" && part.c.startsWith("#") ? part.c : palette.base);
  if (raw?.startsWith("#")) {
    const material = MATERIAL_RESPONSE[materialKey(part)];
    return {
      front: shade(raw, material.front),
      side: shade(raw, material.side),
      top: shade(raw, material.top),
      edge: shade(raw, 1 + material.edge),
      glow: material.glow,
      raw,
      material: materialKey(part),
    };
  }
  return null;
}

function boxElement(part, palette = {}) {
  const box = document.createElement("div");
  box.className = "vox-box";
  const raw = palette[part.c] ?? palette.base ?? (String(part.c).startsWith("#") ? part.c : "#808080");
  const tones = colourFor(part, palette) ?? {
    front: raw,
    side: raw,
    top: raw,
    edge: raw,
    glow: 0,
  };
  const material = tones.material ?? materialKey(part);
  box.dataset.material = material;
  box.style.setProperty("--c", tones.front);
  box.style.setProperty("--cs", tones.side);
  box.style.setProperty("--ct", tones.top);
  box.style.setProperty("--ce", tones.edge);
  if (tones.glow) {
    box.classList.add("is-emissive");
    box.style.setProperty("--glow", String(tones.glow));
  }
  box.style.setProperty("--w", `calc(var(--u) * ${part.w})`);
  box.style.setProperty("--h", `calc(var(--u) * ${part.h})`);
  box.style.setProperty("--d", `calc(var(--u) * ${part.d})`);
  box.style.setProperty(
    "--t",
    `translate3d(calc(var(--u) * ${part.x}), calc(var(--u) * ${-(part.y + part.h / 2)}), calc(var(--u) * ${part.z}))`,
  );
  if (part.rx || part.ry || part.rz) {
    box.style.setProperty(
      "--r",
      `rotateZ(${part.rz ?? 0}deg) rotateX(${part.rx ?? 0}deg) rotateY(${part.ry ?? 0}deg)`,
    );
  }
  for (const face of ["front", "right", "top"]) {
    const el = document.createElement("i");
    el.className = `vox-face vox-${face}`;
    box.append(el);
  }
  return box;
}

/**
 * Default pivot for a group: the lowest, front-most box centre. A model can
 * override any group with `pivots: { weapon: [x, y, z] }`.
 */
function pivotFor(model, group) {
  const override = model.pivots?.[group];
  if (override) return override;
  const parts = model.parts.filter((part) => (part.g ?? "body") === group);
  if (parts.length === 0) return [0, 0, 0];
  const minY = Math.min(...parts.map((part) => part.y));
  const centreX = parts.reduce((sum, part) => sum + part.x, 0) / parts.length;
  return [centreX, minY, 0];
}

/**
 * Build a model node.
 * @param {object} model entry from VOXEL_MODELS (or a prop definition)
 * @param {{ className?: string, label?: string, spin?: number }} [options]
 */
export function buildVoxelModel(model, options = {}) {
  const root = document.createElement("div");
  root.className = "vox-model";
  if (options.className) root.classList.add(options.className);
  root.dataset.modelId = model.id;
  root.dataset.idle = model.idle ?? "breathe";
  if (model.scale && model.scale !== 1) root.style.setProperty("--scale", String(model.scale));
  if (options.spin !== undefined) root.style.setProperty("--spin", `${options.spin}deg`);
  root.setAttribute("role", "img");
  root.setAttribute("aria-label", options.label ?? "Vessel");

  const body = document.createElement("div");
  body.className = "vox-body";
  body.style.setProperty("--sway", String(model.sway ?? 1));

  const groups = new Map();
  for (const part of model.parts) {
    const name = part.g ?? "body";
    if (!groups.has(name)) {
      const group = document.createElement("div");
      group.className = "vox-group";
      group.dataset.group = name;
      const [px, py, pz] = pivotFor(model, name);
      group.style.setProperty("--ox", `calc(var(--u) * ${px})`);
      group.style.setProperty("--oy", `calc(var(--u) * ${-py})`);
      group.style.setProperty("--oz", `calc(var(--u) * ${pz})`);
      groups.set(name, group);
      body.append(group);
    }
    groups.get(name).append(boxElement(part, model.palette ?? {}));
  }

  root.append(body);
  return root;
}

/** Placeholder used when a card has no authored model, clearly marked as such. */
export function buildPlaceholderModel(label) {
  const root = document.createElement("div");
  root.className = "vox-model is-placeholder";
  root.dataset.placeholder = "true";
  root.setAttribute("role", "img");
  root.setAttribute("aria-label", `${label} (placeholder model)`);
  const body = document.createElement("div");
  body.className = "vox-body";
  const box = document.createElement("div");
  box.className = "vox-box";
  box.style.setProperty("--c", "#6a6a6a");
  box.style.setProperty("--cs", "#4a4a4a");
  box.style.setProperty("--ct", "#8a8a8a");
  box.style.setProperty("--ce", "#9a9a9a");
  box.style.setProperty("--w", "calc(var(--u) * 3)");
  box.style.setProperty("--h", "calc(var(--u) * 3)");
  box.style.setProperty("--d", "calc(var(--u) * 3)");
  box.style.setProperty("--t", "translate3d(0, calc(var(--u) * -1.5), 0)");
  for (const face of ["front", "right", "top"]) {
    const el = document.createElement("i");
    el.className = `vox-face vox-${face}`;
    box.append(el);
  }
  body.append(box);
  root.append(body);
  return root;
}

/** Materials that glow are listed for the CSS/QA checks. */
export const GLOWING_MATERIALS = Object.freeze([...LUMINOUS]);
