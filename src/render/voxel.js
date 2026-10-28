/**
 * Dependency-free CSS 3D voxel renderer.
 *
 * Each box is built from three visible faces (front, right, top) inside a
 * `preserve-3d` scene. The whole model is scaled by the `--u` CSS variable, so the
 * same markup works at 40px on a phone tile and 90px in the roster showcase.
 *
 * This module only *displays* models. It never decides gameplay state.
 */

const FACES = ["front", "right", "top"];

function boxElement(part, palette) {
  const box = document.createElement("div");
  box.className = "vox-box";
  const colour = palette[part.c] ?? palette.base;
  box.style.setProperty("--c", colour);
  box.style.setProperty("--w", `calc(var(--u) * ${part.w})`);
  box.style.setProperty("--h", `calc(var(--u) * ${part.h})`);
  box.style.setProperty("--d", `calc(var(--u) * ${part.d})`);
  box.style.setProperty(
    "--t",
    `translate3d(calc(var(--u) * ${part.x}), calc(var(--u) * ${-part.y}), calc(var(--u) * ${part.z}))`,
  );
  if (part.c === "glow" || part.c === "eye" || part.c === "accent") {
    box.classList.add(`is-${part.c}`);
  }
  for (const face of FACES) {
    const el = document.createElement("i");
    el.className = `vox-face vox-${face}`;
    box.append(el);
  }
  return box;
}

/**
 * Build a model node.
 * @param {object} model entry from VOXEL_MODELS
 * @param {{ className?: string, label?: string }} [options]
 */
export function buildVoxelModel(model, options = {}) {
  const root = document.createElement("div");
  root.className = "vox-model";
  if (options.className) root.classList.add(options.className);
  root.dataset.modelId = model.id;
  // Low-slung beasts are authored in voxel units like everything else; a per-model
  // scale keeps them readable on a tile without redrawing their proportions.
  if (model.scale && model.scale !== 1) root.style.setProperty("--scale", String(model.scale));
  root.setAttribute("role", "img");
  root.setAttribute("aria-label", options.label ?? "Vessel");

  const body = document.createElement("div");
  body.className = "vox-body";

  const groups = new Map();
  for (const part of model.parts) {
    const name = part.g ?? "body";
    if (!groups.has(name)) {
      const group = document.createElement("div");
      group.className = "vox-group";
      group.dataset.group = name;
      groups.set(name, group);
      body.append(group);
    }
    groups.get(name).append(boxElement(part, model.palette));
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
  box.style.setProperty("--w", "calc(var(--u) * 3)");
  box.style.setProperty("--h", "calc(var(--u) * 3)");
  box.style.setProperty("--d", "calc(var(--u) * 3)");
  box.style.setProperty("--t", "translate3d(0, calc(var(--u) * -1.5), 0)");
  for (const face of FACES) {
    const el = document.createElement("i");
    el.className = `vox-face vox-${face}`;
    box.append(el);
  }
  body.append(box);
  root.append(body);
  return root;
}
