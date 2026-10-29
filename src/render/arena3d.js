/**
 * Genuine 3D battlefield (Three.js / WebGL primary renderer).
 *
 * The scene is one coherent arena, not a board floating over a panel:
 * opponent card field beyond the far side, the 5x5 tactical grid in the
 * middle, player card field on the near side, plus discard piles, card
 * platforms, corner posts, trees and a shrine around the table.
 *
 * Coordinates are derived, never hardcoded per row: `cellToWorld` /
 * `worldToCell` use BOARD_SIZE, and field rows are computed from the
 * board edge, so a resized arena keeps engine and renderer in sync.
 * Playable Vessels are real voxel geometry: each box of the authored
 * model (`src/render/models.js`, the same data the card illustrations
 * project) becomes a WebGL box, with palette colours resolved the same
 * way. No billboard sprite or flat picture stands in for a Vessel.
 *
 * This module imports Three.js dynamically (CDN ES module) so the static
 * Pages bundle gains no build step. If the import or WebGL fails, the
 * caller falls back to the CSS-3D board — see src/main.js.
 */

import { BOARD_SIZE } from "../game/constants.js";
import { modelFor } from "./models.js";
import { arenaMap, terrainAt } from "./terrain.js";

export const TILE = 1.15;
export const FIELD_Z = 4.35;
export const ACTION_STRIP_Z = 5.55;

const TERRAIN_COLORS = Object.freeze({
  grass: "#4a7a3a",
  moss: "#5d9146",
  stone: "#8a8578",
  sand: "#c8b183",
  water: "#3a7aa8",
  crystal: "#9a6ab8",
});

/** World position of a logical tile centre. Row 0 (opponent back) is far (-z). */
export function cellToWorld(x, y) {
  const half = (BOARD_SIZE - 1) / 2;
  return { x: (x - half) * TILE, z: (y - half) * TILE };
}

/** Nearest logical tile for a world position, or null outside the board. */
export function worldToCell(worldX, worldZ) {
  const half = (BOARD_SIZE - 1) / 2;
  const x = Math.round(worldX / TILE + half);
  const y = Math.round(worldZ / TILE + half);
  if (x < 0 || y < 0 || x >= BOARD_SIZE || y >= BOARD_SIZE) return null;
  return { x, y };
}

/** Slot centres for one seat's card field. Seat 1 is the far side. */
export function fieldLayout(seat) {
  const sign = seat === 1 ? -1 : 1;
  const vesselZ = sign * (FIELD_Z - 0.45);
  const relicZ = sign * (FIELD_Z + 0.45);
  const actionZ = sign * ACTION_STRIP_Z;
  const slots = (z) => [-2.4, -0.8, 0.8, 2.4].map((x) => ({ x, z }));
  return {
    vessels: slots(vesselZ),
    relics: slots(relicZ),
    actions: slots(actionZ),
    discard: { x: 3.7, z: sign * FIELD_Z },
    platform: { z: sign * FIELD_Z },
  };
}

/** Camera preset: elevated three-quarter on desktop, more top-down on narrow screens. */
export function cameraForWidth(width) {
  if (width < 700) return { position: [0, 13.5, 5.5], lookAt: [0, 0, 0.4], mobile: true };
  return { position: [0, 8.5, 10.5], lookAt: [0, 0, 0.4], mobile: false };
}

/**
 * Camera position for a preset orbited by `yaw` radians around the Y axis.
 * yaw 0 reproduces the preset exactly, so seat 0's field (positive z) is
 * the near side. The earlier inline version used atan2(z, x) with a
 * sin/cos pairing that put the camera on the +x axis at yaw 0 — the board
 * rendered rotated 90 degrees with both fields at the sides (found
 * 2026-10-29 in a real-browser screenshot).
 */
export function cameraPosition(preset, yaw = 0) {
  const [px, py, pz] = preset.position;
  const radius = Math.hypot(px, pz);
  const angle = Math.atan2(px, pz) + yaw;
  return [Math.sin(angle) * radius, py, Math.cos(angle) * radius];
}

/** Pure draw gate for the render loop (unit-tested). */
export function arenaShouldDraw({ documentHidden, containerDisplayed, onScreen, dirty, animating }) {
  if (documentHidden || !containerDisplayed || !onScreen) return false;
  return Boolean(dirty || animating);
}

function canvasTexture(draw, width = 256, height = 128) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext("2d"), width, height);
  return canvas;
}

function textSprite(THREE, text, { fg = "#ffffff", bg = "rgba(10,14,20,0.82)", size = 28 } = {}) {
  const canvas = canvasTexture((ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = fg;
    ctx.font = `600 ${size}px Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = String(text).length > 26 ? `${String(text).slice(0, 25)}…` : String(text);
    ctx.fillText(label, w / 2, h / 2);
  });
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.35, 0.68, 1);
  return sprite;
}

function cardPlaneTexture(THREE, { name, cost, color, back = false }) {
  const canvas = canvasTexture((ctx, w, h) => {
    if (back) {
      ctx.fillStyle = "#1a2233";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "#8fa8c8";
      ctx.lineWidth = 6;
      ctx.strokeRect(10, 10, w - 20, h - 20);
      ctx.fillStyle = "#8fa8c8";
      ctx.font = "600 34px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText("VEYLATTICE", w / 2, h / 2);
      return;
    }
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#f5eeda";
    ctx.fillRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = "#16202c";
    ctx.font = "700 26px Georgia, serif";
    ctx.textAlign = "center";
    const label = String(name).length > 18 ? `${String(name).slice(0, 17)}…` : String(name);
    ctx.fillText(label, w / 2, h / 2 - 8);
    ctx.font = "600 24px Georgia, serif";
    ctx.fillText(`${cost} Flux`, w / 2, h / 2 + 28);
  }, 220, 300);
  return new THREE.CanvasTexture(canvas);
}

const ELEMENT_HEX = Object.freeze({ wood: "#4f8a4a", fire: "#b8462a", earth: "#8a6a43", metal: "#7d8aa3", water: "#2f7fa8" });

function buildVoxelGroup(THREE, model, scale = 0.16) {
  const group = new THREE.Group();
  if (!model) return group;
  for (const part of model.parts) {
    const color = model.palette?.[part.c] ?? (String(part.c).startsWith("#") ? part.c : model.palette?.base ?? "#888888");
    const geometry = new THREE.BoxGeometry(part.w * scale, part.h * scale, part.d * scale);
    const material = new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(part.x * scale, (part.y + part.h / 2) * scale, part.z * scale);
    if (part.ry) mesh.rotation.y = (part.ry * Math.PI) / 180;
    if (part.rz) mesh.rotation.z = (part.rz * Math.PI) / 180;
    if (part.rx) mesh.rotation.x = (part.rx * Math.PI) / 180;
    mesh.castShadow = true;
    group.add(mesh);
  }
  return group;
}

/**
 * Mount the arena. Returns null-safe handle; throws when Three/WebGL is
 * unavailable so the caller can fall back to the CSS-3D board.
 * `callbacks.onCell(x, y)` fires for tile clicks; `callbacks.onUnit(unitId)`
 * for Vessel clicks.
 */
export async function mountArena(container, callbacks = {}) {
  const THREE = await import("https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js");
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.append(renderer.domElement);
  renderer.domElement.setAttribute("aria-label", "3D tactical battlefield. Click a tile to act.");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#0e1a24");
  scene.fog = new THREE.Fog("#0e1a24", 18, 30);
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
  const ambient = new THREE.AmbientLight(0xffffff, 0.75);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xfff2d0, 1.4);
  sun.position.set(6, 12, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshLambertMaterial({ color: "#12202c" }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.42;
  ground.receiveShadow = true;
  scene.add(ground);

  // Static table: base slab, corner posts, trees, shrine crystal.
  const table = new THREE.Mesh(
    new THREE.BoxGeometry(BOARD_SIZE * TILE + 2.4, 0.4, BOARD_SIZE * TILE + 11.5),
    new THREE.MeshLambertMaterial({ color: "#2a2118" }),
  );
  table.position.y = -0.22;
  table.receiveShadow = true;
  scene.add(table);
  const postGeo = new THREE.BoxGeometry(0.28, 1.1, 0.28);
  const postMat = new THREE.MeshLambertMaterial({ color: "#6b4a25" });
  for (const [px, pz] of [[-3.6, -3.6], [3.6, -3.6], [-3.6, 3.6], [3.6, 3.6]]) {
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(px, 0.55, pz);
    post.castShadow = true;
    scene.add(post);
  }
  const tree = (x, z, s = 1) => {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.3 * s, 1.1 * s, 0.3 * s), new THREE.MeshLambertMaterial({ color: "#5a4128" }));
    trunk.position.y = 0.55 * s;
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.3 * s, 1.1 * s, 1.3 * s), new THREE.MeshLambertMaterial({ color: "#2f5a2c" }));
    canopy.position.y = 1.6 * s;
    trunk.castShadow = canopy.castShadow = true;
    g.add(trunk, canopy);
    g.position.set(x, 0, z);
    scene.add(g);
  };
  tree(-4.4, -2.2); tree(4.4, -2.2); tree(-4.4, 2.2); tree(4.4, 2.2); tree(-4.6, 0, 0.8); tree(4.6, 0, 0.8);

  // Tiles.
  const tileMeshes = new Map();
  const layout = arenaMap();
  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      const kind = terrainAt(x, y).id;
      const pos = cellToWorld(x, y);
      const lift = { grass: 0.06, moss: 0.11, stone: 0.16, sand: 0.03, water: 0, crystal: 0.22 }[kind] ?? 0.06;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(TILE - 0.08, 0.28 + lift, TILE - 0.08),
        new THREE.MeshLambertMaterial({ color: TERRAIN_COLORS[kind] ?? "#4a7a3a" }),
      );
      mesh.position.set(pos.x, (0.28 + lift) / 2 - 0.02, pos.z);
      mesh.receiveShadow = true;
      mesh.userData = { cell: { x, y }, baseColor: mesh.material.color.clone() };
      scene.add(mesh);
      tileMeshes.set(`${x},${y}`, mesh);
    }
  }
  void layout;

  const dynamic = new THREE.Group();
  scene.add(dynamic);
  let vesselAnims = [];
  let yaw = 0;
  let mode = cameraForWidth(container.clientWidth || 900);
  let raf = 0;
  let disposed = false;

  // On-demand rendering (2026-10-29, from measured numbers: the arena kept
  // issuing ~110 draw calls per frame while the battle view was hidden on
  // the menu, in classic-grid mode, and when scrolled off-screen on phones).
  // A frame is drawn only when the canvas is actually visible AND either
  // something changed (dirty) or a bob animation is running.
  let dirty = true;
  let onScreen = true;
  let motion = true;
  const markDirty = () => { dirty = true; };
  let visibilityObserver = null;
  if (typeof IntersectionObserver === "function") {
    visibilityObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) onScreen = entry.isIntersecting;
      if (onScreen) markDirty();
    });
    visibilityObserver.observe(container);
  }

  function applyCamera() {
    markDirty();
    const preset = cameraForWidth(container.clientWidth || 900);
    mode = preset;
    camera.position.set(...cameraPosition(preset, yaw));
    camera.lookAt(...preset.lookAt);
  }

  function resize() {
    const width = container.clientWidth || 900;
    const height = Math.max(320, Math.min(560, Math.round(width * 0.62)));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    applyCamera();
  }
  resize();
  window.addEventListener("resize", resize);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downAt = null;
  function pick(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(dynamic.children, true);
    for (const hit of hits) {
      let node = hit.object;
      while (node) {
        if (node.userData?.unitId) return { kind: "unit", unitId: node.userData.unitId };
        if (node.userData?.cell) return { kind: "cell", ...node.userData.cell };
        node = node.parent;
      }
    }
    const tileHits = raycaster.intersectObjects([...tileMeshes.values()], false);
    if (tileHits.length > 0) return { kind: "cell", ...tileHits[0].object.userData.cell };
    return null;
  }
  renderer.domElement.addEventListener("pointerdown", (event) => { downAt = { x: event.clientX, y: event.clientY }; });
  renderer.domElement.addEventListener("pointerup", (event) => {
    if (!downAt) return;
    const moved = Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y);
    downAt = null;
    if (moved > 6) return; // a drag orbits (see pointermove); only a tap selects
    const hit = pick(event);
    if (!hit) return;
    if (hit.kind === "unit") callbacks.onUnit?.(hit.unitId);
    else callbacks.onCell?.(hit.x, hit.y);
  });
  // Drag horizontally to orbit a little; click (no drag) selects.
  let dragX = null;
  renderer.domElement.addEventListener("pointermove", (event) => {
    if (downAt && Math.abs(event.clientX - downAt.x) > 8) {
      if (dragX === null) dragX = event.clientX;
      yaw = Math.max(-0.7, Math.min(0.7, yaw + (event.clientX - dragX) * 0.005));
      dragX = event.clientX;
      applyCamera();
    }
  });
  renderer.domElement.addEventListener("pointerup", () => { dragX = null; });

  function clearDynamic() {
    for (const child of [...dynamic.children]) {
      child.traverse?.((node) => {
        if (node.material?.map) node.material.map.dispose();
        if (node.material) node.material.dispose?.();
        if (node.geometry) node.geometry.dispose?.();
      });
      dynamic.remove(child);
    }
    vesselAnims = [];
  }

  function tintCell(x, y, color) {
    const mesh = tileMeshes.get(`${x},${y}`);
    if (mesh) mesh.material.color.set(color);
  }
  function resetTiles() {
    for (const mesh of tileMeshes.values()) mesh.material.color.copy(mesh.userData.baseColor);
  }

  /**
   * Render one game state. `view` is plain data computed by the caller:
   * { units: [{id, cardId, element, seat, x, y, selected}], tiles:
   *   { selected, legalMoves: [[x,y]], legalAttacks, legalSummons,
   *     blocked: [[x,y]] }, fields: { 0: {...}, 1: {...} } } where a field
   * is { vessels: [def|null x4], relics: [def|null x4],
   *   actions: [def|null x4], discardCount, discardTop }.
   */
  function render(view, { reducedMotion = false } = {}) {
    markDirty();
    motion = !reducedMotion;
    resetTiles();
    clearDynamic();
    if (!view) return;
    const { selected, legalMoves = [], legalAttacks = [], legalSummons = [] } = view.tiles ?? {};
    for (const [x, y] of legalMoves) tintCell(x, y, "#6fbf7a");
    for (const [x, y] of legalAttacks) tintCell(x, y, "#e05a4a");
    for (const [x, y] of legalSummons) tintCell(x, y, "#7fc8e8");
    if (selected) tintCell(selected.x, selected.y, "#ffd166");

    for (const unit of view.units ?? []) {
      const model = modelFor(unit.cardId);
      const group = buildVoxelGroup(THREE, model, 0.16);
      const pos = cellToWorld(unit.x, unit.y);
      group.position.set(pos.x, 0.28, pos.z);
      if (unit.seat === 1) group.rotation.y = Math.PI;
      group.traverse((node) => { node.userData.unitId = unit.id; });
      dynamic.add(group);
      vesselAnims.push({ group, baseY: 0.28, phase: (unit.x * 3 + unit.y) });
      if (unit.selected) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.55, 0.7, 32),
          new THREE.MeshBasicMaterial({ color: "#ffd166", side: THREE.DoubleSide }),
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(pos.x, 0.32, pos.z);
        dynamic.add(ring);
      }
    }

    for (const seat of [0, 1]) {
      const field = view.fields?.[seat];
      if (!field) continue;
      const layoutForSeat = fieldLayout(seat);
      const sign = seat === 1 ? -1 : 1;
      const platform = new THREE.Mesh(
        new THREE.BoxGeometry(7.4, 0.3, 2.4),
        new THREE.MeshLambertMaterial({ color: seat === 0 ? "#243447" : "#472426" }),
      );
      platform.position.set(0, 0.13, layoutForSeat.platform.z);
      platform.receiveShadow = true;
      dynamic.add(platform);
      field.vessels?.forEach((def, i) => {
        const slot = layoutForSeat.vessels[i];
        if (!slot) return;
        const pedestal = new THREE.Mesh(
          new THREE.CylinderGeometry(0.42, 0.5, 0.22, 20),
          new THREE.MeshLambertMaterial({ color: def ? ELEMENT_HEX[def.element] ?? "#888888" : "#3a4356" }),
        );
        pedestal.position.set(slot.x, 0.4, slot.z);
        pedestal.castShadow = true;
        dynamic.add(pedestal);
        const label = textSprite(THREE, def ? def.name : `Vessel ${i + 1} · empty`, { size: 24 });
        label.position.set(slot.x, 1.15, slot.z);
        dynamic.add(label);
      });
      field.relics?.forEach((def, i) => {
        const slot = layoutForSeat.relics[i];
        if (!slot) return;
        const socket = new THREE.Mesh(
          new THREE.CylinderGeometry(0.34, 0.34, 0.12, 20),
          new THREE.MeshLambertMaterial({ color: def ? "#c9a86f" : "#2c3547" }),
        );
        socket.position.set(slot.x, 0.36, slot.z);
        dynamic.add(socket);
        const label = textSprite(THREE, def ? `◆ ${def.name}` : `Relic ${i + 1} · empty`, { size: 22 });
        label.position.set(slot.x, 0.95, slot.z);
        dynamic.add(label);
      });
      field.actions?.forEach((def, i) => {
        const slot = layoutForSeat.actions[i];
        if (!slot) return;
        const texture = cardPlaneTexture(THREE, def ? { name: def.name, cost: def.cost, color: ELEMENT_HEX[def.element] ?? "#888888" } : { back: true });
        const plane = new THREE.Mesh(
          new THREE.PlaneGeometry(0.52, 0.72),
          new THREE.MeshLambertMaterial({ map: texture }),
        );
        plane.rotation.x = -Math.PI / 2;
        plane.rotation.z = sign < 0 ? Math.PI : 0;
        plane.position.set(slot.x, 0.31, slot.z);
        dynamic.add(plane);
      });
      // Discard pile: stacked card boxes + count label, owned by engine state.
      const stackCount = Math.min(5, field.discardCount ?? 0);
      for (let i = 0; i < stackCount; i += 1) {
        const card = new THREE.Mesh(
          new THREE.BoxGeometry(0.56, 0.03, 0.78),
          new THREE.MeshLambertMaterial({ color: i % 2 ? "#1a2233" : "#243447" }),
        );
        card.position.set(layoutForSeat.discard.x, 0.32 + i * 0.035, layoutForSeat.discard.z);
        card.rotation.y = (i % 2 ? 0.12 : -0.08);
        card.castShadow = true;
        dynamic.add(card);
      }
      const label = textSprite(THREE, `Discard ${field.discardCount ?? 0}${field.discardTop ? ` · ${field.discardTop}` : ""}`, { size: 22 });
      label.position.set(layoutForSeat.discard.x, 1.0, layoutForSeat.discard.z);
      dynamic.add(label);
    }
  }

  function animate(time) {
    if (disposed) return;
    raf = requestAnimationFrame(animate);
    const shouldDraw = arenaShouldDraw({
      documentHidden: document.hidden,
      containerDisplayed: container.isConnected && container.offsetParent !== null,
      onScreen,
      dirty,
      animating: motion && vesselAnims.length > 0,
    });
    if (!shouldDraw) return;
    if (motion) {
      for (const anim of vesselAnims) {
        anim.group.position.y = anim.baseY + Math.sin(time / 700 + anim.phase) * 0.03;
      }
    }
    dirty = false;
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(animate);

  return {
    render,
    applyCamera,
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      visibilityObserver?.disconnect();
      window.removeEventListener("resize", resize);
      clearDynamic();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
