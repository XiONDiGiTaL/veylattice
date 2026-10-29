# CardFrames — Approved Card Design Baseline

Source: the six-frame Gemini sheet supplied and accepted by the owner on 2026-10-28. Preserve the approved artwork; do not regenerate or substitute CSS/vector approximations without owner approval.

## Files and status
- `native/*.png`: six individually cropped, original-resolution frames, with rounded-corner exterior alpha.
- `overlays/*.png`: the same art on transparent 214x300 canvases; illustration apertures are transparent, while element/category emblems are preserved.
- `frame-manifest.json`: measured per-frame regions, source crop coordinates, canvas offsets and source SHA-256.
- `card-frames.js`, `card-frames.css`: optional isolated DOM compositor, not integrated into the battle/roster UI by this asset delivery.
- `index.html`: standalone local preview; serve the repository over HTTP and visit `CardFrames/`.

This is raster artwork from a 572x1024 sheet, with individual frames approximately 213x286–295 pixels. Transparent padding aligns canvases without stretching the source. These are UI-size baselines, not high-resolution print masters; upscaling does not create detail. Masks and regions are extraction estimates, not editable original layers. Inspect at intended UI size before integration.

## Mandatory use
Use these approved images as the visual basis for hand cards, roster cards and future deck/collection/shop views. Presentation only: never change stats, effects, rarity, legality or card IDs to fit a frame. Preserve frame proportions, edge treatment, palettes and category emblems. Use the manifest for each frame rather than assuming all source regions match.

Vessels select wood/fire/earth/metal/water by canonical element. Actions always select the periwinkle `action` frame, with its existing ! emblem, no Attack/Guard icons and no unit stat values. Actions retain the upper-right Flux cost. Relics have no approved template yet: flag them for design review rather than pretending a Vessel frame is canon for Relics.

The source Action artwork area is ivory and its lower panel is dark gray. This delivery preserves that accepted artwork; render light effect text on its dark panel. It has no dedicated stat band. Do not silently recolor its panels or treat its upper-right empty circle as a second category badge.

## Compositing
Layer illustration behind the transparent overlay; place title, cost, stats and exact rules/flavor text above it as safe text nodes. Do not bake current match damage, temporary buffs or user data into baseline assets. Print base Attack/Guard on static cards; show dynamic values separately when appropriate. Exactly one sword/Attack and one shield/Guard may be added by the application on Vessels only. No duplicated badges or decorative combat symbols. Do not insert numbers into the element badge.

Use canonical names, Flux costs, effects and stats. Preserve rules text exactly; prioritize it over flavor. Long text requires an accessible enlarged/details view, not unreadable font shrinking or clipping rules. Keep keyboard interactions, readable contrast and reduced motion. No innerHTML with user card text. Resolve assets with module-relative URLs so the current /veylattice/ base works; do not hardcode /Veylattice/ or root-only asset paths.

## Integration acceptance
1. All six overlays load, with no external labels/background or network errors.
2. Illustration renders behind the frame, without covering its category emblem.
3. Names/cost/stats/effects come from data; Action has cost and no unit stats.
4. All five elements plus Action are checked in hand and enlarged views, including narrow screens.
5. Unknown categories fail visibly; Relics remain explicitly unapproved until designed.
6. Preserve the current working game, CSS-3D models and engine. Do not replace the live card renderer until smoke checks pass.
7. Update CHANGELOG.md, TODO.md, AI_HANDOFF.md and docs/IMPLEMENTATION_LOG.md with actual changes and tests, distinguishing asset preparation, repository installation and live UI integration.

## Binary installation
If this directive was committed before the image files, copy the complete `CardFrames` folder from the supplied asset ZIP into the repository root and commit it. The directory is not installed or production-ready until its PNGs, manifest, compositor and styles exist together. Do not claim images were uploaded from this directive alone.

## Integration status (2026-10-29)

The overlays are now used by the actual card pipeline:
`src/render/approved-frame.js` composites the approved overlay over the
card illustration (manifest art aperture, 214x300, never stretched) for
the Card Library, Deck Builder, Shop, Collection, discard viewer and
enlarged card viewer. UPDATE 2026-10-29 (later session): the battle hand
is migrated too (`buildHandCardFace` in approved-frame.js, 214:300 via CSS
aspect-ratio, measured 0.713 in the browser at desktop 104 px and phone 92 px
widths). The hand hides only the rules line, which would render at ~6 px;
the inspector and the double-click viewer show the full canonical text,
per "Long text requires an accessible enlarged/details view". The legacy
vector hand face is no longer rendered. Relics remain explicitly pending: no approved
dedicated Relic frame exists, so Relics use a functional neutral
presentation with a "Relic frame pending" flag (see TODO.md and
docs/RELIC_FRAME_REQUEST.md for the exact asset specification).
