# Veylattice Voxel Art Bible

**Status:** Production-facing art direction concept. Every design is original and must be reviewed in-game for readability before being treated as final.

## 1. Visual target

Create stylized, handcrafted 3D voxel characters with the personality of miniature sculpted figures, not generic low-poly characters with pixel textures. Shapes should look intentionally assembled from cubes, rectangular prisms, stepped bevels, and a limited number of angular custom meshes. The final silhouette should remain legible at the game's tactical camera distance and at small card-art sizes.

**Core qualities:** bold silhouette, tactile materials, strong negative space, distinct proportions, restrained emissive details, expressive pose, and deliberate asymmetry. Each unit must be recognizable in monochrome from its outline alone.

## 2. Voxel construction rules

- Build characters from a designed hierarchy of modular voxel clusters, not a pile of identical cubes.
- Use large forms first: head/crest, torso, limbs, weapon, wings, tail, or signature prop. Add medium armor and material breaks second; reserve tiny details for close-up/card render.
- Keep the main silhouette readable at roughly 64-96 pixels tall on the battlefield. Important equipment should not merge into the torso from the standard camera angle.
- Use stepped contours and layered blocks to suggest sculpted forms. Avoid random noise, excessive micro-cubes, and uniform cube sizes.
- Use original proportions and shape language for each named unit. Reusing an animation rig or material family is allowed; reusing the same model with only a color swap is not.
- Distinguish body material from elemental energy. Emissive accents should be a small, controlled portion of the model and must not obscure the silhouette.
- Design front, side, rear, and three-quarter views. Check weapon clearance, foot placement, pivot points, and clipping during attacks.
- Every model needs a clear ground contact or a deliberately floating shadow/anchor. Floating units must not look like grounded units with invisible legs.
- Use simple, consistent scale references. Large units may be taller/wider, but the base footprint must remain compatible with the grid and occupancy rules.
- Create separate hit-react and defeat silhouettes; effects must not hide the unit's board location.

## 3. Elemental material language

Element identity must be visible through shape, material, emblem, and lighting, not color alone.

- **Wood:** carved grain bands, layered bark plates, root joints, leaf-like stepped fins, jade or sap-glass inserts. Avoid making every Wood unit a tree.
- **Fire:** blackened ceramic/obsidian, heat-cracked seams, ember cores, scorched bronze, upward-pointing silhouettes. Avoid covering the entire body in flames.
- **Earth:** sandstone, slate, clay, mineral seams, broad weight-bearing shapes, layered geological strata. Use stable horizontal masses.
- **Metal:** brushed steel, forged plates, rivets, hinges, clean mechanical joints, silver or brass inlays. Make mechanical details readable rather than noisy.
- **Water:** translucent blue-green glass, polished shell, wet stone, ribbon-like fins, suspended droplets, flowing negative space. Do not rely on a simple blue tint.
- **Otherworldly:** controlled impossible geometry, offset parts, non-Euclidean gaps, suspended shards, unusual symmetry. Keep the combat footprint and hitbox visually understandable.

## 4. Subtype silhouette grammar

- **Warrior:** humanoid stance, visible weapon, readable shoulders and head; differentiate rank and fighting style through stance, equipment, and proportions.
- **Beast:** animalistic center of mass, four or more articulated limbs or unmistakable creature locomotion; unique skull and back silhouette.
- **Mystic:** staff, focus, orbiting sigils, halo, or ritual apparatus; body posture should communicate casting rather than melee.
- **Construct:** engineered or assembled forms, clear joints, modular plates, weighty feet; avoid humanoid armor that could be mistaken for a Warrior.
- **Demon:** unsettling asymmetry, horns, contract marks, furnace cavities, or unnatural limbs; each Demon should have a different source of menace.
- **Dragon:** long spine, distinct head/crest, tail, wing or fin structure, and a readable serpentine profile; do not use the same dragon silhouette for every element.
- **Ancient:** monumental scale, geological or botanical mass, old carved features; should feel like a landmark that has begun to move.
- **Spirit:** floating or partially intangible body, lantern/mask/bell/ribbon focal shape, a readable center of mass and shadow.
- **Otherworldly:** unfamiliar proportions and deliberate spatial contradiction, but never an unreadable random cluster.

## 5. Model production package per unit

Every official Vessel needs:
1. Stable `modelId` and a unique concept brief.
2. Silhouette thumbnail in black.
3. Three-quarter hero render and front/side/rear reference views.
4. Palette/material swatches and emissive placement.
5. Voxel/blockout model with stated scale and grid footprint.
6. Rig/animation family assignment and notes for unique motion.
7. Idle, move, summon, attack, hit, and defeat states. Some states can share a rig, but the motion must suit the unit.
8. Standard camera readability check and card-frame crop.
9. Collision/footprint notes and clipping review.
10. Asset provenance and license record.

## 6. Animation language

Use shared rigs only where the anatomy supports them. A shared animation family is a production aid, not a requirement to make all units move alike.

- **Humanoid fighters:** weight shift, weapon-specific windup, planted recovery.
- **Quadrupeds:** shoulder-driven gait, head tracking, forepaw strike, tail balance.
- **Mystics:** controlled hover, sigil rotation, staff/focus motion, compact cast burst.
- **Constructs:** delayed mechanical starts, heavy footfall, hinge-driven attacks, brief settling.
- **Serpentine dragons:** traveling body wave, head-led turns, tail lag, coil/strike.
- **Floating spirits:** gentle bob, orbiting components, delayed particle motion, clear attack snap.
- **Otherworldly:** restrained discontinuity or offset movement, but stable attack timing and readable hit reactions.

Do not let animation change board position or hitbox unless the game rules explicitly do so. VFX must not conceal tactical information.

## 7. Rendering and technical constraints

- Use Three.js only after the core gameplay loop is stable, unless a separate approved art prototype is needed.
- Prefer instanced/reused voxel geometry and shared materials where appropriate for performance, but preserve bespoke per-unit silhouettes.
- Keep model metadata separate from gameplay stats. A renderer must never determine rules.
- Use deterministic model IDs and graceful fallbacks if a model asset is missing.
- Support reduced motion and a low-effects setting. Emissive effects, particles, and shadows should scale down gracefully.
- Use transparent backgrounds for card portrait renders where the pipeline supports them; in-world models must still read against all arena palettes.
- Avoid costly per-cube draw calls. Combine meshes or instance repeated parts where technically appropriate.
- Record target polygon/voxel complexity after the first performance prototype instead of inventing a hard budget before measurement.

## 8. Quality gate

A model is not complete because it exists in a 3D scene. Review:
- Can it be identified from silhouette alone?
- Is it distinct from every other unit in the roster?
- Does the element read without color?
- Are weapon, limbs, and effects legible from the actual camera?
- Does it fit its grid footprint?
- Are attack, hit, and defeat animations clear?
- Does it avoid clipping and excessive particle clutter?
- Does its card-frame crop preserve the identifying feature?
- Are the asset and any dependencies licensed appropriately?

Failing any critical readability or originality check means the model needs revision.

## 9. Implementation status (2026-10-28 art pass)

This section records what the codebase actually does, so the rest of this document is read as
direction plus a real pipeline rather than an aspiration.

### Renderer

- **CSS 3D, no dependencies.** `src/render/voxel.js` builds each box as one node with front, right and
  top faces inside a `preserve-3d` scene. One CSS variable (`--u`) sets the voxel size, so the same
  model is 43 px on a phone tile and 170 px in the roster.
- **Material response.** Face colours are computed in JavaScript from a per-material table
  (`matte`, `metal`, `stone`, `cloth`, `leather`, `wood`, `bone`, `crystal`, `glass`, `ember`,
  `void`). CSS filters are deliberately not used: they flatten 3D transforms and cost draw time.
  Per-face borders were removed after measurement — at 2–3 px per voxel a 1 px border consumed the
  fill and turned models into noise.
- **Articulated pivots.** A group can rotate around an authored pivot
  (`pivots: { weapon: [x, y, z] }`): wrist, shoulder, neck, hip, tail root. Default pivots are the
  lowest, front-most box of the group. Attack animations use the weapon, head and tail pivots.
- **Angled parts.** `rx/ry/rz` rotate individual boxes, used for fins, banners, lances, antlers and
  blade snouts.
- **Camera.** Catalogue view uses a three-quarter camera (`rotateX(-13deg) rotateY(-32deg)`) with the
  spin overridable per instance; the roster lets the player drag or arrow-key the model through a
  full turn.
- **Idle languages.** `breathe`, `heavy`, `hover`, `sway`, `none`, authored per unit.

### Roster

- All **18 official Vessels** have individually authored models, 30–59 boxes each, **728 boxes
  total**, in `src/render/vessels/{fire,water,earth,metal,wood}.js`.
- Every model declares 4 or more animation groups and 4 or more materials. A test enforces these
  floors, uniqueness of silhouette (including rotations), palette-key validity, material validity,
  pivot validity and the tile footprint.
- Missing models are impossible for the official roster; `modelFor()` returns `null` and the board
  renders a visibly marked placeholder instead of a silent cube.

### Arena

- `src/render/terrain.js` supplies an authored, point-symmetric ground map (grass, moss, ruins,
  shallows, crystal) with per-kind elevation and props at the back edge of tiles.
- Terrain is **decorative**: `rules: "decorative"`, no engine import, and a test that fails if the
  rules engine or AI ever read it.
- Presentation: stone plinth, corner posts, per-tile thickness and bevel, contact shadow under each
  unit, key light from the upper left, edge vignette, and a 7° camera tilt on the board surface.

### Not done / limitations

- No GLB meshes, no GPU lighting, no shadows beyond CSS drop shadows. The "lighting" is authored
  shading, not a light pass.
- No skeletal deformation: limbs rotate as rigid voxel groups.
- Props do not react to units, and there is no destructible scenery.
- The Wyrm of the Drowned Vault and the Verdant Colossus are the weakest silhouettes in the roster at
  tile size; both need another authored pass (clearer coil/head separation, and a lighter canopy that
  separates from the trunk).
- Phone tiles (43 px) prioritise stat readability; models read as colour + shape only at that size.
