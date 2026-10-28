# AI Handoff - Start Here

## Verified baseline
- Repository: XiONDiGiTaL/Veylattice. Branch: main.
- Verified parent/base commit for this tracking change: 33c4b4885cebcd2c5b70135a1a1c64cdb8170931.
- This file belongs to the subsequent tracking-docs commit; inspect git history for its actual hash. Do not treat the recorded parent as the latest forever.
- Last scope: documentation/directives only; no game code, services or migrations changed.
- Remote edits used the GitHub connector; no local checkout/working-tree inspection was performed in this session. Inspect your own working tree before editing.

## Read first
AI_INSTRUCTIONS.md, CHANGELOG.md, TODO.md, GAME_RULES.md, ROADMAP.md, TECHNICAL_ARCHITECTURE.md, docs/IMPLEMENTATION_PROMPT.md, docs/TRANSCRIPT_RECONCILIATION.md and relevant art/world/content specifications. Canonical newer rules override historical threshold combat/two-copy deck proposals.

## Recent changes
- Expanded design docs commit: b42c38ada7eae2177d8e98cfd69ce16ed70b9670.
- Transcript/art reconciliation commit: 33c4b4885cebcd2c5b70135a1a1c64cdb8170931.
- Current tracking change: AI_INSTRUCTIONS.md, CHANGELOG.md, TODO.md, AI_HANDOFF.md. It mandates continued Markdown history and actionable task/handoff maintenance.

## Implemented versus specified
The previously inspected src/main.js is an early DOM prototype: grid, card selection/basic summoning, old threshold attack flow and turn-switch scaffolding. Its opponent is not autonomous; full movement, persistent Guard/retaliation and complete match victory flow need implementation. Re-inspect before relying on this snapshot.
Specifications exist for modes, shop/Stash, ranks, server architecture, seven arenas, three bonds, Forge and 18 unique voxel designs. Those specifications do not establish functioning UI, backend, production models or tests.

## Tests and verification
No test, build or browser command was executed during these documentation sessions. GitHub push results confirmed the two prior commits. No passing gameplay tests are claimed. Actual task-start commands and observed outcomes must be recorded by the implementing agent.

## Current blockers and decisions
- No known design-doc blocker to starting offline M1.
- Proposed numerical rules need playtesting; keep them configurable and document changes.
- Backend project selection, migrations, deployment, paid services and license changes need separate authorization.
- Preserve current proprietary license and original assets; screenshot characters are references, not reusable assets.
- Standard Practice is prebuilt-only/reward-free; custom Forge cards need separate non-reward Custom Practice/Casual access.
- Free Codex has Lore Bonds, Elemental Confluences, Tactical Combinations and Arena Intelligence sections.

## Next three executable steps
1. M1-001: inspect current branch/history/tree and source; establish a minimal runnable test harness and record current behavior versus GAME_RULES.md. Check that static HTTP startup still works.
2. M1-002: extract pure match state/command validation from src/main.js with injectable clock/RNG and immutable printed definitions; test illegal commands do not mutate state.
3. M1-003/M1-004: implement and test legal movement, persistent Guard/retaliation, direct attacks/win states and turn/Flux/draw/mulligan sequencing; then integrate timer/HUD in M1-005.

## End-of-session requirement
Update CHANGELOG.md with actual changes/tests, TODO.md with statuses/evidence/blockers and this handoff with a fresh verified baseline and concrete next steps. Preserve prior work; never claim completion from a plan, empty file or unrun test. Record engineering rationale and evidence only, not private chain-of-thought or secrets.
