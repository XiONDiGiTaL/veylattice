/**
 * Silhouette audit.
 *
 * "Two Vessels can share a rig, but not a silhouette" is a promise the roster
 * makes in its own documentation. This measures it: every model is rasterised
 * from the front and from the side, and every pair is compared with an
 * intersection-over-union score. Run it after adding or editing a model.
 *
 *   node tools/silhouette-report.mjs          # worst 20 pairs
 *   node tools/silhouette-report.mjs 0.85     # pairs at or above a threshold
 */

import { VOXEL_MODELS } from "../src/render/models.js";

const RES = 0.25;

function raster(model, plane) {
  const cells = new Set();
  for (const part of model.parts) {
    const { x, y, z, w, h, d } = part;
    const a0 = plane === "front" ? x - w / 2 : z - d / 2;
    const a1 = plane === "front" ? x + w / 2 : z + d / 2;
    for (let a = Math.floor(a0 / RES); a <= Math.ceil(a1 / RES); a += 1) {
      for (let b = Math.floor(y / RES); b <= Math.ceil((y + h) / RES); b += 1) {
        cells.add(`${a},${b}`);
      }
    }
  }
  return cells;
}

function iou(a, b) {
  let intersection = 0;
  for (const cell of a) if (b.has(cell)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

export function silhouettePairs(models = VOXEL_MODELS) {
  const ids = Object.keys(models);
  const rasters = new Map(
    ids.map((id) => [id, { front: raster(models[id], "front"), side: raster(models[id], "side") }]),
  );
  const pairs = [];
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const a = rasters.get(ids[i]);
      const b = rasters.get(ids[j]);
      pairs.push({
        score: (iou(a.front, b.front) + iou(a.side, b.side)) / 2,
        a: ids[i],
        b: ids[j],
      });
    }
  }
  return pairs.sort((left, right) => right.score - left.score);
}

if ((process.argv[1] ?? "").endsWith("silhouette-report.mjs")) {
  const threshold = Number(process.argv[2] ?? NaN);
  const pairs = silhouettePairs();
  const shown = Number.isFinite(threshold)
    ? pairs.filter((pair) => pair.score >= threshold)
    : pairs.slice(0, 20);
  console.log(
    Number.isFinite(threshold)
      ? `${shown.length} pairs at or above ${threshold}`
      : "Most similar silhouette pairs (mean of front and side IoU):",
  );
  for (const pair of shown) {
    console.log(pair.score.toFixed(3), pair.a.replace("vessel_", ""), "|", pair.b.replace("vessel_", ""));
  }
}
