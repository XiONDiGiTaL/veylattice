# Changelog

Engineering history, not a list of promised features. Keep entries under Unreleased until an actual release is designated. Preserve history and distinguish implementation, specification and verification.

## Unreleased

### 2026-10-28 - TRACK-001 - AI continuity tracking
- Added CHANGELOG.md, TODO.md and AI_HANDOFF.md; strengthened AI_INSTRUCTIONS.md to require updates for every meaningful session.
- Added stable task IDs, acceptance criteria, truthful test reporting, blockers and next-step handoffs.
- Scope: documentation only. No gameplay behavior, schema, service or deployment changes.
- Tests: Not run; no application code changed. Browser execution and gameplay tests are not claimed.
- Known limitation: the core match engine and subsequent roadmap features still require implementation.
- Commit reference: this entry belongs to its containing commit; verified parent is 33c4b4885cebcd2c5b70135a1a1c64cdb8170931.

### 2026-10-28 - DOC-002 - Supplied transcript and visual identity
- Commit: 33c4b4885cebcd2c5b70135a1a1c64cdb8170931. GitHub push returned this commit successfully.
- Updated ART_BIBLE.md and added docs/TRANSCRIPT_RECONCILIATION.md.
- Incorporated the pasted historical transcript and screenshot direction; clarified free Codex sections, Custom Practice versus prebuilt Practice, arena/bond Guard behavior and original creature-family silhouettes.
- Scope: specifications only; models, Codex, Forge, hazards and bonds were not implemented by this change.
- Tests: Not run; documentation-only update. No deployment or migrations.

### 2026-10-28 - DOC-001 - Expanded production specification
- Commit: b42c38ada7eae2177d8e98cfd69ce16ed70b9670. GitHub push returned this commit successfully.
- Updated AI_INSTRUCTIONS.md, GAME_RULES.md, PROJECT_BRIEF.md, TECHNICAL_ARCHITECTURE.md, ROADMAP.md and README.md.
- Added docs/MODES_AND_LOBBIES.md, docs/PROGRESSION_AND_CONTENT.md, docs/UNIT_VISUAL_DESIGNS.md and docs/IMPLEMENTATION_PROMPT.md.
- Specified persistent Guard/retaliation, three-copy decks, timers, AI/tag/ranked modes, collection economy, content expansion and 18 bespoke Vessel visual briefs.
- Scope: documentation only; no implementation or finished 3D assets implied.
- Tests: Not run; no gameplay code changed. No deployment or migrations.

## Entry template
Use a dated heading with stable task/session IDs. Record Added/Changed/Fixed/Removed as applicable; affected paths; behavior and decision summary; exact commands and observed results (or Not run with reason); known limitations; migration/deployment impact; verified base or existing commit reference. Do not fabricate a self-referential commit hash or expose secrets.
