import { BOARD_SIZE } from "../game/constants.js";

/** Presentation only: never calculates legal moves or card targets. */
export function materialSettings(part, palette = {}) {
  const color = palette[part.c] ?? (String(part.c).startsWith("#") ? part.c : palette.base ?? "#888888");
  const settings = { color, roughness: 0.85, metalness: 0.02 };
  if (part.m === "metal" || part.m === "brass") Object.assign(settings, { roughness: 0.32, metalness: 0.72 });
  if (part.m === "glass") Object.assign(settings, { roughness: 0.18, metalness: 0.05, transparent: true, opacity: 0.72, depthWrite: false });
  if (part.m === "crystal") Object.assign(settings, { roughness: 0.3, metalness: 0.15, emissive: color, emissiveIntensity: 0.16 });
  if (part.m === "ember" || part.m === "glow") Object.assign(settings, { emissive: color, emissiveIntensity: 0.65, roughness: 0.5 });
  return settings;
}

/** Shapes supplement colour. Inputs are already engine-derived view data. */
export function tileMarkers(tiles = {}) {
  const result = [];
  const seen = new Set();
  const add = (kind, x, y) => {
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= BOARD_SIZE || y >= BOARD_SIZE) return;
    const key = `${kind}:${x},${y}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push({ kind, x, y });
  };
  for (const [key, kind] of [["legalMoves", "move"], ["legalAttacks", "attack"], ["legalSummons", "summon"], ["blocked", "blocked"]]) {
    for (const cell of tiles[key] ?? []) if (Array.isArray(cell)) add(kind, cell[0], cell[1]);
  }
  if (tiles.selected) add("selected", tiles.selected.x, tiles.selected.y);
  return result;
}

/**
 * Dispose shared geometry/material/texture objects at most once per traversal.
 *
 * `keep` (optional Set) holds resources owned by the caller rather than by the
 * swept group — the arena's cached card-face textures survive a render pass.
 * Materials are always swept; only textures can be retained.
 */
export function disposeObjectResources(root, keep = null) {
  const resources = new Set();
  root.traverse((node) => {
    if (node.geometry) resources.add(node.geometry);
    for (const material of [node.material].flat().filter(Boolean)) {
      resources.add(material);
      for (const value of Object.values(material)) {
        if (!value?.isTexture) continue;
        if (keep?.has?.(value)) continue;
        resources.add(value);
      }
    }
  });
  for (const resource of resources) resource.dispose?.();
}
