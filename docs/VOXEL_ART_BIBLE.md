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

## 4b. Body plans: share a rig, never a silhouette

The roster is too large to hand-place every box, so most Vessels are built by parametric
rigs in `src/render/vessels/blueprints.js`. A rig is an **anatomical body plan**, not a
skin. Structure decides the outline; colour, height and bulk only refine it.

| Rig | Structural axes |
|---|---|
| `humanoid` | lower body `robe` (columnar skirt, no legs) / `robe: "split"` (short flared tabard over visible boots) / legs; stance `normal` / `wide` / `narrow` / `bent` / `stilt`; a second arm pair (`arms: 4`); wings; tail; hunch; pauldron scale; back `pack`; head (helm, hood, mask, crown, circlet, skull); weapon (`sword`, `axe`, `spear`, `staff`, `bow`, `daggers`, `wire`, `hammer`, `scythe`, `fists`); offhand (`shield`, `buckler`, `tome`, `orb`, `lantern`, `brazier`); crest (`horns`, `spikes`, `feather`, `plume`) |
| `beast` | build `heavy` / `lean`; posture `low` / `tall` / `prowl` / `rear`; 4 or 6 legs; 1–3 heads; horns `ram` / `antler` / `tusk` / `spike`; tail `whip` / `fan` / `club`; shell |
| `serpent` | coiled body, 1–3 necks, coil count, cobra hood, forelimbs, no legs at all |
| `construct` | frame `heavy` / `slim` / `quad` / `tower`; crest `crown` / `chimney` / `ring` / `bell` / `antenna`; head count |
| `drake` | plan `wings` / `wyvern` / `lindworm`; neck count; horns `crown` / `swept` |
| `spirit` | form `veiled` / `wraith` / `crowned` / `core`; arm count |

Rules that follow from this:

- **A subtype is not a silhouette.** Two Constructs must not both be a two-legged chassis
  because they share a subtype. The Clockwork Hydra is a `serpent` (coils, three fanned
  necks, brass scale plates, no legs); the Ironstep Sentinel is a `slim` construct (piston
  legs, one sealed lamp head, antenna spine). They are not variants of one another.
- **A head must survive the projection.** A skull flush against the shoulder mass merges
  into it at tile size. Every rig gives the head its own neck column, a pale (`bone`) face
  plate and a dark jaw or visor, so the head keeps its own value against the torso.
- **One beast rig is not one animal.** `build: "heavy"` is the barrel-chested plan: short
  thick limbs, a single wide body slab, a blunt skull and a full saddle blanket — the Rams,
  the Warden, the Bulwark. `build: "lean"` is a separate plan, not a resized heavy one:
  proportional long limbs that always meet the belly line, a deep narrow ribcage forward over
  the forelegs, a waist that tucks up and narrows behind it, a back that arches over the
  chest, a forward-reaching neck, a two-mass skull (tall cranium + long low muzzle + dropped
  jaw) and a long counterbalancing tail — the Brine Hound, the Bramble Stalker, the Glass-Horn
  Charger. Stature follows posture inside that plan: `low` stands level, `prowl` drops the
  chest and raises the haunches, `rear` rises on the hind legs with the forelimbs clear of
  the ground.
- **Compute limb length, do not author it.** A reared animal's hind legs are longer, not
  floating beneath a raised chest. The lean plan stacks its leg segments as fractions of the
  belly line so any posture keeps contact with the body.
- **Audit before declaring a model done.** `node tools/silhouette-report.mjs` rasterises
  every model from the front and the side and reports the most similar pairs by IoU.
  Treat anything at or above 0.90 as too close and change the *structure* (stance, leg count,
  neck, shell, frame), not the palette.

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

- All **60 Vessels** have models, 30–59 boxes each, in
  `src/render/vessels/{fire,water,earth,metal,wood}.js`. The original eighteen are hand-placed;
  the rest are built by the rigs in `blueprints.js`, each with its own body-plan configuration.
- Every rig model is verified against every other: `tools/silhouette-report.mjs` rasterises each
  model from two angles and prints the worst IoU pairs. The current worst pair is 0.895 (a slim
  duelist and a slim engineer, which differ in stance, reach and pack); no pair reaches 0.90, and
  the Hydra and the Ironstep Sentinel — the pair that used to be twins — score 0.485.
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
- The Wyrm of the Drowned Vault and the Verdant Colossus are still the weakest hand-authored
  silhouettes at tile size; both need another authored pass (clearer coil/head separation, and a
  lighter canopy that separates from the trunk).
- Rig humanoids were the weakest group: four slim soldiers shared one outline. They now differ in
  body plan, not colour — a bent low lunge (Reef Duelist), a pike-and-pack engineer (Quarry
  Engineer), a split tabard over boots (Emberwright Adept) and a horizontal wire-blade (Razorline
  Duelist). The worst humanoid pair in the roster is 0.877, under the 0.90 bar, but several robed
  figures still sit in the 0.86–0.877 band and would benefit from authored geometry.
- The lean beast plan is measured at 0.35–0.62 IoU against the heavy plan, so the two plans no
  longer read as one animal.
- Pauldrons scale in width and height but not depth: `pad`-scaled depth turned a broad-shouldered
  knight's shoulders into flat boards seen edge-on from the three-quarter camera.
- Phone tiles (43 px) prioritise stat readability; models read as colour + shape only at that size.

## Human anatomy (ART-006)

A helmet is not a person. Every human Vessel is built from a skull with a jaw that steps in from
the temples, eyes with a socket, an iris and a brow, a nose with a nostril shadow, a mouth and a
chin shadow, and ears. Face proportions are per-Vessel (`headW`, `headH`, `jaw`, `nose`, `ears`)
rather than one shared head, and skin, hair and eye colour are palette overrides so two humans of
the same element are two people.

Hair plans: `short`, `long`, `braid`, `topknot`, `bald`, `shaved`, `swept`, `curls`, `mohawk`,
`chignon`. Beards: `none`, `stubble`, `goatee`, `full`.

Bodies carry a hips/waist/chest taper, a collar, shoulder deltoids and narrower legs. Garments
(`tunic`, `quilt`, `scale`, `mail`, `coat`, `hide`) and kit (scarf, bracer, pouch, quiver, hood,
single pauldron) are what separate two fighters of one element.

Poses: `stand`, `guard`, `draw`, `shoulder`, `carry`, `hip`. A pose is a shoulder-elbow-hand chain
per side, and weapons and off-hand props anchor to the hand it computes - a sword is never left
floating beside a hip.

## Arena ground (ART-006)

The arena is one raised landmass, not a painted grid. Each tile is a block: a top face with its
material, a voxel grain and a lit corner, and a side wall rotated by the negative of the arena tilt
so it is a real vertical face. Height steps between surfaces (water 0, sand 3, grass 6, moss 11,
stone 16, shrine 22 px) are what make the board read as terrain rather than a diagram. Scenery is
authored per tile at the back edge, and units stand on the tile face at board scale, upright.

## 2026-10-29 note

Card illustration and in-game voxel model are the same character: the
illustration pipeline projects the voxel box data, and the Three.js
arena builds the same boxes as WebGL geometry. Silhouette, proportions,
armour, weapons, accessories, materials and colours must correspond
across all three. A model change changes the card art with it; a card
illustration must never depict a different character from its model.
