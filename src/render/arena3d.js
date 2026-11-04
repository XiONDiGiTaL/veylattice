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
import { materialSettings, tileMarkers, disposeObjectResources } from "./arena-presentation.js";
import { FRAME_CANVAS } from "./approved-frame.js";
import { faceModel, loadArt, loadOverlay, paintFace } from "./formation-face.js";
import { modelFor } from "./models.js";
import { arenaMap, terrainAt } from "./terrain.js";

export const TILE = 1.15;
/**
 * Formation card geometry (ARENA-R2, 2026-11-04).
 *
 * Cards are the approved 214x300 frame canvas scaled into world units, so the
 * 3D slot and the DOM slot are the same shape and neither is stretched. The
 * rows are wider than the 5x5 grid on purpose: a substantial card reads at a
 * glance, and a 5x5 grid squeezed to card width is exactly the miniaturised
 * dashboard this composition replaces.
 */
export const CARD_WIDTH = 1.46;
export const CARD_ASPECT = FRAME_CANVAS.height / FRAME_CANVAS.width;
export const CARD_HEIGHT = CARD_WIDTH * CARD_ASPECT;
/** Lean of a standing card away from vertical; the face turns up to the camera. */
export const CARD_TILT = 0.44;
export const FIELD_Z = 3.5;
export const RELIC_Z = 6.3;
export const ACTION_STRIP_Z = 7.0;
const CARD_COLUMNS = Object.freeze([-2.4, -0.8, 0.8, 2.4]);
const FACE_SCALE = 1.5;

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

/**
 * Slot centres for one seat's card field. Seat 1 is the far side.
 *
 * Row order matches `formationSlots` in src/ui/fields.js: the Vessel row sits
 * against the grid and the Relic row behind it, so a formation reads from the
 * contested centre outwards. The action strip is a view of the hand, not a
 * third formation row, and sits past the Relic row.
 */
export function fieldLayout(seat) {
  const sign = seat === 1 ? -1 : 1;
  const row = (z) => CARD_COLUMNS.map((x) => ({ x, z }));
  return {
    vessels: row(sign * FIELD_Z),
    relics: row(sign * RELIC_Z),
    actions: row(sign * ACTION_STRIP_Z),
    discard: { x: 3.95, z: sign * FIELD_Z },
    platform: { z: sign * ((FIELD_Z + RELIC_Z) / 2) },
  };
}

/** World centre of a standing card slot, with its bottom edge on the table. */
export function cardAnchor(slot) {
  const lift = (CARD_HEIGHT / 2) * Math.cos(CARD_TILT);
  const push = (CARD_HEIGHT / 2) * Math.sin(CARD_TILT);
  return { x: slot.x, y: 0.3 + lift, z: slot.z + push };
}

/** Camera preset: elevated three-quarter on desktop, more top-down on narrow screens. */
/**
 * Camera preset. The elevated eye line is deliberate: with two rows of
 * standing cards at each end, a low camera lets the near row hide the far row.
 * Looking down over the formation keeps all eight slots of both seats legible
 * while the card faces stay turned up toward the viewer.
 */
/** Camera preset: elevated three-quarter on desktop, more top-down on narrow screens. */
export function cameraForWidth(width) {
  // Both presets are solved against the eight-slot field, not eyeballed: the
  // near Relic row stands at z = RELIC_Z with its base on the table, so at a
  // closer eye line its bottom edge falls past NDC y = -1 and the row is cut
  // off by the canvas. These values keep every card of both seats inside the
  // frame with a margin (checked in-browser at 1360x900 and 390x844).
  // Phones frame the grid alone, large and readable. The eight formation cards
  // are carried by the DOM rails at a readable card width (battlefield.css),
  // because a 390px canvas can only show an eight-card field as a miniature —
  // which is the thing this composition is meant to stop doing.
  if (width < 700) return { position: [0, 9.2, 5.6], lookAt: [0, 0.1, 0.4], mobile: true };
  return { position: [0, 13.2, 11.0], lookAt: [0, 0.2, 1.2], mobile: false };
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

function buildVoxelGroup(THREE, model, scale = 0.16) {
  const group = new THREE.Group();
  if (!model) return group;
  for (const part of model.parts) {
    const color = model.palette?.[part.c] ?? (String(part.c).startsWith("#") ? part.c : model.palette?.base ?? "#888888");
    const geometry = new THREE.BoxGeometry(part.w * scale, part.h * scale, part.d * scale);
    const material = new THREE.MeshStandardMaterial(materialSettings(part, model.palette));
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
  // The table is sized from the formation constants, not a magic number, so
  // the slab always ends just past the last card row.
  const tableWidth = CARD_COLUMNS[3] * 2 + CARD_WIDTH + 2.4;
  const tableDepth = (RELIC_Z + (CARD_HEIGHT / 2) * Math.sin(CARD_TILT)) * 2 + 1.2;
  const table = new THREE.Mesh(
    new THREE.BoxGeometry(tableWidth, 0.4, tableDepth),
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
      // Gaps between tiles show the dark table beneath, so the 5x5 grid reads
      // as 25 distinct tiles from the arena camera instead of coloured bands.
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(TILE - 0.18, 0.28 + lift, TILE - 0.18),
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
  /**
   * Card-face textures outlive a render pass: every UI update rebuilds the
   * dynamic group, but a face only repaints when its content or an asset
   * changes. They are excluded from the per-pass resource sweep (they are
   * owned by this mount, not by the group) and disposed on teardown.
   */
  const faceTextures = new Map();
  const faceKeep = new Set();

  function faceTextureFor(slot, sign) {
    const model = faceModel(slot);
    const key = [
      model.key, model.empty ? "e" : "f", model.frameKey ?? "-",
      model.title, model.cost, model.stats, model.status,
      model.selected ? "s" : "", model.pendingFrame ? "p" : "",
      sign, (model.text ?? "").length,
    ].join("|");
    const cached = faceTextures.get(key);
    if (cached) return cached.texture;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(model.geometry.width * FACE_SCALE);
    canvas.height = Math.round(model.geometry.height * FACE_SCALE);
    const ctx = canvas.getContext("2d");
    ctx.scale(FACE_SCALE, FACE_SCALE);
    // Paint immediately (frame colour, text, empty plate), then repaint once
    // the approved overlay and illustration have decoded.
    paintFace(ctx, model, {});
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy?.() ?? 1);
    const entry = { texture, canvas, ctx, painted: false };
    faceTextures.set(key, entry);
    faceKeep.add(texture);

    Promise.all([loadOverlay(model.frameKey, "./"), model.card ? loadArt(model.card) : Promise.resolve(null)])
      .then(([overlay, art]) => {
        if (disposed) return;
        paintFace(ctx, model, { overlay, art });
        entry.painted = true;
        texture.needsUpdate = true;
        markDirty();
      })
      .catch(() => {});
    return texture;
  }

  /** One standing card face: a thin slab body plus the painted front. */
  function buildCard(slot, slotPosition, { width = CARD_WIDTH, height = CARD_HEIGHT } = {}) {
    // Derived from the slot, not passed in: the caller no longer needs a sign
    // local, and a slot can never be painted with the other seat's tint.
    const sign = slot.seat === 1 ? -1 : 1;
    const anchor = cardAnchor(slotPosition);
    const group = new THREE.Group();
    group.position.set(anchor.x, anchor.y, anchor.z);
    group.rotation.x = -CARD_TILT;
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, 0.05),
      new THREE.MeshLambertMaterial({ color: slot.occupied ? "#1a2233" : "#0c1320" }),
    );
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ map: faceTextureFor(slot, sign) }),
    );
    face.position.z = 0.028;
    group.add(face);
    group.traverse((node) => {
      node.userData.slot = { seat: slot.seat, kind: slot.kind, index: slot.index };
      if (slot.unit?.id) node.userData.unitId = slot.unit.id;
    });
    dynamic.add(group);
    return group;
  }
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
    // Taller viewport than the pedestal era: the composition now has to show a
    // 5x5 grid plus two card rows at each end without cropping a formation.
    // Near-square: a 5x5 grid plus four card rows is a deep scene, and a wide
    // letterbox viewport can only show it by shrinking the cards.
    // Capped by the viewport as well as the width: the formation cards are a
    // fixed fraction of the canvas height, so an uncapped square canvas on a
    // wide desktop column grew the page without growing the cards on screen.
    const viewportCap = Math.round((window.innerHeight || 900) * 0.78);
    const height = Math.max(400, Math.min(860, Math.round(width * 1.02), viewportCap));
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
        // A formation card is a card first: clicking it selects the slot (and
        // the unit through it), rather than resolving to the tile behind it.
        // `kind` stays "slot" (the click target) and the card row travels as
        // `slotKind`, so the caller never confuses the two.
        if (node.userData?.slot) {
          const slot = node.userData.slot;
          return { kind: "slot", slotKind: slot.kind, seat: slot.seat, index: slot.index, unitId: node.userData.unitId ?? null };
        }
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
    if (hit.kind === "slot") callbacks.onSlot?.(hit);
    else if (hit.kind === "unit") callbacks.onUnit?.(hit.unitId);
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
    disposeObjectResources(dynamic, faceKeep);
    dynamic.clear();
    vesselAnims = [];
  }

  function tintCell(x, y, color) {
    const mesh = tileMeshes.get(`${x},${y}`);
    if (mesh) mesh.material.color.lerp(new THREE.Color(color), 0.32);
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

    for (const marker of tileMarkers(view.tiles)) {
      const pos = cellToWorld(marker.x, marker.y);
      const tile = tileMeshes.get(`${marker.x},${marker.y}`);
      const surface = tile ? tile.position.y + tile.geometry.parameters.height / 2 + 0.035 : 0.4;
      const colors = { move: "#84c497", attack: "#e68b7c", summon: "#c6b777", selected: "#f2dfa0", blocked: "#9a99a0" };
      const shape = { move: 32, attack: 4, summon: 6, selected: 4, blocked: 4 }[marker.kind];
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.39, 0.43, shape),
        new THREE.MeshBasicMaterial({ color: colors[marker.kind], side: THREE.DoubleSide, transparent: true, opacity: 0.9, depthWrite: false }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.rotation.z = marker.kind === "selected" ? Math.PI / 4 : 0;
      ring.position.set(pos.x, surface, pos.z);
      dynamic.add(ring);
      if (marker.kind === "attack" || marker.kind === "blocked") {
        for (const angle of [-Math.PI / 4, Math.PI / 4]) {
          const bar = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.012, 0.035), new THREE.MeshBasicMaterial({ color: colors[marker.kind] }));
          bar.rotation.y = angle;
          bar.position.set(pos.x, surface + 0.005, pos.z);
          dynamic.add(bar);
        }
      }
    }

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

    // On phones the formation rows are the DOM rails, so the scene stays the
    // tactical grid rather than shrinking eight cards into a postage stamp.
    for (const seat of mode?.mobile ? [] : [0, 1]) {
      const field = view.fields?.[seat];
      if (!field) continue;
      const layoutForSeat = fieldLayout(seat);

      // One plinth under both formation rows. It reads as a carved table, not
      // a panel in a dashboard, and frames the eight slots of that seat.
      const platform = new THREE.Mesh(
        new THREE.BoxGeometry(CARD_COLUMNS[3] * 2 + CARD_WIDTH + 0.9, 0.26, RELIC_Z - FIELD_Z + CARD_HEIGHT * 0.7 + 1.1),
        new THREE.MeshLambertMaterial({ color: seat === 0 ? "#243447" : "#40222a" }),
      );
      platform.position.set(0, 0.12, layoutForSeat.platform.z);
      platform.receiveShadow = true;
      dynamic.add(platform);

      // Eight persistent slots per seat: four Vessels against the grid, four
      // Relics behind. An empty slot is still a card-shaped space with its
      // ownership and category, never a pedestal or a floating label.
      const rows = [
        { kind: "vessel", entries: field.vessels ?? [], positions: layoutForSeat.vessels },
        { kind: "relic", entries: field.relics ?? [], positions: layoutForSeat.relics },
      ];
      for (const row of rows) {
        row.positions.forEach((position, index) => {
          const entry = row.entries[index] ?? null;
          const card = entry?.card ?? null;
          const unit = row.kind === "vessel" ? entry?.unit ?? null : null;
          buildCard(
            {
              key: `seat${seat}:${row.kind}:${index}`,
              seat, kind: row.kind, index,
              card, unit, occupied: Boolean(card || unit),
              effectText: entry?.effectText ?? "",
            },
            position,
          );
        });
      }

      // Action staging is NOT drawn as a third row: it is a view of the hand,
      // which the hand rail already shows, and a row behind standing Relics is
      // invisible from the arena camera (it would only add depth and clutter).
      // The eight persistent slots stay the only formation rows.
      // Discard pile: stacked card boxes on the table, owned by engine state.
      // No floating label here: both HUDs already print DISCARD n and the
      // plaque sat over the last Vessel slot. A label that covers a card face
      // is worse than no label.
      const stackCount = Math.min(5, field.discardCount ?? 0);
      for (let i = 0; i < stackCount; i += 1) {
        const card = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.03, 0.7),
          new THREE.MeshLambertMaterial({ color: i % 2 ? "#1a2233" : "#243447" }),
        );
        card.position.set(layoutForSeat.discard.x, 0.32 + i * 0.035, layoutForSeat.discard.z);
        card.rotation.y = (i % 2 ? 0.12 : -0.08);
        card.castShadow = true;
        dynamic.add(card);
      }
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
      for (const entry of faceTextures.values()) entry.texture.dispose();
      faceTextures.clear();
      disposeObjectResources(scene);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
