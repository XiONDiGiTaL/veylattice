# Asset request — dedicated Relic card frame

**Status: REQUESTED, NOT SUPPLIED.** No Relic frame exists in `CardFrames/`. Until the owner
supplies and approves a real asset, all 12 Relics keep the flagged neutral presentation
(`relic-pending` class, gold border, "RELIC FRAME PENDING" mid-label). They never borrow a
Vessel or Action frame. Nothing in this document is an asset: no frame was generated,
approximated or substituted. Written 2026-10-29.

## What is needed

One raster overlay, `CardFrames/overlays/relic.png`. Ideally also its `CardFrames/native/relic.png`
source crop, matching the conventions of the six approved frames:

| Property | Requirement | Source of the convention |
| --- | --- | --- |
| Canvas | **214 × 300 px** PNG with alpha, no stretching (pad, don't scale) | `frame-manifest.json` `canvas` |
| Illustration aperture | **Transparent** rectangle. Recommended `[19, 67, 179, 126]` (x, y, w, h), the same as the Action frame, so the existing illustration pipeline fits unchanged. Any other aperture is fine if it is measured into the manifest. | `frames.action.art` |
| Title band | Top band, left-aligned name area about 66% of the width, at the same height as the other frames (text is a DOM node at `top: 3.5%`) | `.approved-name` in styles.css |
| Flux cost | Upper-right circle, as on every frame (DOM text at `right: 4%; top: 2.5%`) | `.approved-cost` |
| Category emblem | A **Relic emblem** that is clearly not the Action "!" and not an element badge. It must not overlap the aperture. | FRAME_DIRECTIVE.md "category emblems" |
| Stat band | **None.** Relics have no Attack/Guard. Leave a neutral label strip around `top: 65.5%` (used for the "RELIC · persistent" line) | `.approved-mid` |
| Rules panel | Lower panel for effect text from `top: 72%`, with contrast suitable for the text colour you choose | `.approved-text` |
| Palette | Distinct from the five element frames and the periwinkle Action frame | ART_BIBLE.md |
| Delivery | Original-resolution PNG plus the measured manifest entry: `native`, `overlay`, `sourceCrop`, `offset`, `art` | `frame-manifest.json` schema v1 |

## What happens when it arrives (the integration checklist)

1. Add `frames.relic` to `CardFrames/frame-manifest.json`, and `relic` to `FRAME_GEOMETRY` in
   `src/render/approved-frame.js`. `tests/frames.test.js` already fails if the two drift or if
   the PNG isn't 214×300.
2. Change `frameKeyFor` so it returns `"relic"` for `category === "relic"`. Update the frames
   test that currently asserts Relics have no frame.
3. Replace the "RELIC FRAME PENDING" mid-label with the Relic line. Remove the `relic-pending`
   styling.
4. Check the result in the hand, Deck Builder, Shop, Collection, discard viewer and enlarged
   viewer at desktop and phone widths. Record it in CHANGELOG.md, TODO.md, AI_HANDOFF.md and
   docs/IMPLEMENTATION_LOG.md.
