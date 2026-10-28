/**
 * Guided first match.
 *
 * The tutorial is a thin, pure overlay on top of a *real* practice match: each step
 * watches the engine events that already happened and advances when the player
 * performs the action. It never scripts a fake board, and it can be skipped or
 * ended at any point without leaving the match in a special state.
 *
 * Every step also accepts `endTurn`, so a step that is momentarily impossible
 * (no adjacent enemy on turn one, for example) can never trap the player.
 */

export const TUTORIAL_STEPS = Object.freeze([
  Object.freeze({
    id: "flux",
    title: "Your first turn is short",
    body: "You start with 1 Flux and the cheapest Vessel costs 2, so the opening turn is for cheap Actions or for passing. Flux refills and grows by one at the start of each of your turns, up to ten.",
    advanceOn: Object.freeze(["playAction", "playRelic"]),
  }),
  Object.freeze({
    id: "summon",
    title: "Summon your first Vessel",
    body: "Select a Vessel card in your hand, then click a glowing tile inside your deployment zone. One summon per turn.",
    advanceOn: Object.freeze(["summon"]),
  }),
  Object.freeze({
    id: "move",
    title: "Move it forward",
    body: "A freshly summoned Vessel cannot act until your next turn. Once it is ready, select it and click an outlined tile to move. Moving does not stop an attack.",
    advanceOn: Object.freeze(["move"]),
  }),
  Object.freeze({
    id: "attack",
    title: "Strike something",
    body: "With a Vessel selected, click an enemy in range to attack. Adjacent defenders retaliate, so a bad trade costs Guard too. Actions can also be played from hand.",
    advanceOn: Object.freeze(["attack", "playAction", "playRelic"]),
  }),
  Object.freeze({
    id: "endTurn",
    title: "Hand the turn over",
    body: "Press End Turn, or let the two-minute timer run out. The opponent now acts through the same rules engine you do.",
    advanceOn: Object.freeze(["endTurn"]),
  }),
]);

const STEP_IDS = new Set(TUTORIAL_STEPS.map((step) => step.id));

export function createTutorial() {
  return { step: 0, done: false, skipped: false };
}

export function tutorialStep(tutorial) {
  if (!tutorial || tutorial.done) return null;
  return TUTORIAL_STEPS[tutorial.step] ?? null;
}

/**
 * Apply an engagement event. Returns a new tutorial object; never mutates input.
 * @param {object} tutorial
 * @param {string} eventType engine event type or "start"
 */
export function advanceTutorial(tutorial, eventType) {
  if (!tutorial || tutorial.done) return tutorial ?? createTutorial();
  const step = TUTORIAL_STEPS[tutorial.step];
  if (!step) return { ...tutorial, done: true };

  const advances = step.advanceOn.includes(eventType) || eventType === "endTurn";
  if (!advances) return tutorial;

  const next = tutorial.step + 1;
  if (next >= TUTORIAL_STEPS.length) {
    return { ...tutorial, step: TUTORIAL_STEPS.length, done: true };
  }
  return { ...tutorial, step: next };
}

export function skipTutorial(tutorial) {
  return { ...(tutorial ?? createTutorial()), done: true, skipped: true };
}

/** True when a step id is part of the shipped script (guards stale stored state). */
export function isTutorialStep(id) {
  return STEP_IDS.has(id);
}
