# Technical Architecture

## Initial stack
HTML5, CSS, vanilla JavaScript ES modules, JSON card data. LocalStorage/IndexedDB only when persistence is needed. Vitest is a candidate for tests once tooling is introduced. Three.js and glTF/GLB are planned after the rules loop is stable.

## Separation of concerns
1. Domain data: card definitions and validated IDs.
2. Match state: players, decks, hands, discard, board, turn, Flux, Vitality.
3. Rules: elemental modifiers, movement, targeting, combat, effects, win condition.
4. Controller: translates UI intent into rules commands.
5. Presentation: DOM now; Three.js later.
6. Persistence: local settings/decks if needed.

Rules modules must not access the DOM. UI must not decide legality or resolve combat. Validate actions at the engine boundary, return structured success/failure, and do not mutate card-definition objects. Keep random sources injectable for tests.

Early builds should be static-hostable on GitHub Pages and use relative paths. Do not require server secrets or a backend for the single-player prototype. Add tooling only when useful and document commands.
