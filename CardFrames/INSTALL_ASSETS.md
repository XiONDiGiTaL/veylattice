# Install the missing card-frame images

Copy this CardFrames folder into the repository root, merging with the existing CardFrames folder. Do not replace or delete FRAME_DIRECTIVE.md or ASSET_SESSION.md. Commit the six native PNGs, six transparent overlays and manifest. Existing game renderer integration is a separate task.

native/: cropped original-resolution images. overlays/: 214x300 RGBA canvases with transparent illustration apertures; artwork goes behind these images. Transparent padding preserves the original differing card proportions rather than stretching them. Source is a 572x1024 user-approved sheet, not high-resolution individual masters. The Action source colors are preserved.

Use existing FRAME_DIRECTIVE.md as the design authority. Do not redesign frames. Use per-frame coordinates, safe DOM text and canonical card data. Actions use the periwinkle ! frame, show Flux cost and effect, and have no Attack/Guard. Relics have no approved frame yet. Update CHANGELOG.md, TODO.md, AI_HANDOFF.md and docs/IMPLEMENTATION_LOG.md during integration.

Verification in this extraction: PNGs reopened, all six overlays are RGBA 214x300 and artwork centers are transparent. Browser/game integration was not run. These files were packaged locally, not uploaded to GitHub by this extraction.
