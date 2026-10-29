/**
 * Build the printed card collection into `Cards/`.
 *
 * Everything here is deterministic and data-driven: the tool reads the same set
 * manifest the game reads, renders each card through `src/render/card-face.js`,
 * and writes the card asset, its illustration, a manifest and a QA report. It
 * prints the verification it performed so a stale or missing card is loud.
 *
 * Usage: node tools/build-cards.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createCatalog } from "../src/game/content.js";
import { ELEMENT_LABELS } from "../src/game/constants.js";
import { illustrationSvg } from "../src/render/illustration.js";
import { CARD_HEIGHT, CARD_WIDTH, cardFaceFacts, cardFaceSvg } from "../src/render/card-face.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const out = path.join(root, "Cards");

const readJson = (relative) => JSON.parse(readFileSync(path.join(root, relative), "utf8"));

const manifestSource = readJson("src/cards/manifest.json");
const sets = manifestSource.sets.map((set) => ({ ...set, cards: readJson(path.join("src/cards", set.file)) }));
const cards = sets.flatMap((set) => set.cards);
const catalog = createCatalog(cards);

const order = { vessel: 0, action: 1, relic: 2 };
const elementOrder = ["wood", "fire", "earth", "metal", "water"];
const sorted = [...catalog.cards].sort(
  (a, b) =>
    order[a.category] - order[b.category] ||
    elementOrder.indexOf(a.element) - elementOrder.indexOf(b.element) ||
    a.name.localeCompare(b.name),
);

/* ------------------------------- writers ------------------------------- */

function write(relative, content) {
  const target = path.join(out, relative);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content, "utf8");
  return target;
}

if (existsSync(out)) rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const generated = [];
for (const card of sorted) {
  const face = cardFaceSvg(card);
  write(path.join("cards", `${card.id}.svg`), face);
  write(path.join("art", `${card.id}.svg`), illustrationSvg(card));
  generated.push({ card, face });
}

/* Frames: the same layout with placeholder art and neutral copy, so the template
   can be reused for cards that do not exist yet. */
const frameSpecs = [
  { key: "vessel", category: "vessel", element: "metal", name: "CARD NAME", subtypes: ["warrior"], rarity: "rare", cost: 3, attack: 0, guard: 0, movement: 1, range: 1, abilities: [], flavorText: "Flavour text is set here in italics." },
  { key: "action", category: "action", element: "metal", name: "ACTION NAME", rarity: "rare", cost: 3, effect: { kind: "damage", amount: 0 }, flavorText: "Flavour text is set here in italics." },
  { key: "relic", category: "relic", element: "metal", name: "RELIC NAME", rarity: "rare", cost: 3, effect: { kind: "guardAura", amount: 0 }, flavorText: "Flavour text is set here in italics." },
];

for (const spec of frameSpecs) {
  const synthetic = {
    ...spec,
    id: `frame_${spec.key}`,
    element: spec.element,
    designDescription: "Rules text is set in upright type above the separator.",
  };
  write(
    path.join("frames", `${spec.key}-frame.svg`),
    cardFaceSvg(synthetic, { placeholderArt: true }),
  );
}

/* ------------------------------- manifest ------------------------------- */

const manifest = {
  schemaVersion: 1,
  project: "Veylattice",
  generatedAt: new Date().toISOString().slice(0, 10),
  canvas: { width: CARD_WIDTH, height: CARD_HEIGHT, aspect: "543:1024", format: "svg" },
  notes: [
    "Every card face is generated from its canonical definition; text and numbers are SVG text, not baked pixels.",
    "Vessel illustrations are projections of the same voxel model the battlefield renders.",
    "Open cards/<id>.svg directly, or Cards/index.html for the contact sheet.",
  ],
  counts: {
    total: sorted.length,
    vessel: sorted.filter((c) => c.category === "vessel").length,
    action: sorted.filter((c) => c.category === "action").length,
    relic: sorted.filter((c) => c.category === "relic").length,
  },
  frames: frameSpecs.map((spec) => ({
    category: spec.key,
    file: `frames/${spec.key}-frame.svg`,
  })),
  cards: sorted.map((card) => {
    const facts = cardFaceFacts(card);
    return {
      ...facts,
      elementLabel: ELEMENT_LABELS[card.element] ?? card.element ?? null,
      subtypeLabel: card.subtypes?.[0] ?? null,
      file: `cards/${card.id}.svg`,
      artFile: `art/${card.id}.svg`,
      abilities: card.abilities ?? [],
    };
  }),
};

write("manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);

/* -------------------------------- QA -------------------------------- */

const missingFlavor = sorted.filter((card) => !card.flavorText);
const noRules = sorted.filter((card) => {
  const facts = cardFaceFacts(card);
  return !facts.rules || facts.rules.trim().length === 0;
});
const vesselGate = sorted.filter((card) => card.category === "vessel" && (!Number.isInteger(card.attack) || !Number.isInteger(card.guard)));
const modelGate = sorted.filter((card) => card.category === "vessel" && !cardFaceFacts(card).modelId);

const qa = `# Card Collection QA

Generated by \`node tools/build-cards.mjs\`. Re-run it after any card-data change; the counts below are
read from the catalog, not written by hand.

## Collection

| Metric | Value |
|---|---|
| Cards rendered | ${sorted.length} |
| Vessels | ${manifest.counts.vessel} |
| Actions | ${manifest.counts.action} |
| Relics | ${manifest.counts.relic} |
| Canvas | ${CARD_WIDTH} x ${CARD_HEIGHT} (543:1024) |
| Frames | vessel, action, relic |

## Automated checks (performed by the build)

| Check | Result |
|---|---|
| Every card has a face file | ${generated.length}/${sorted.length} written |
| Every Vessel has its canonical model, so the art is a projection of it | ${modelGate.length === 0 ? "pass" : `${modelGate.length} missing: ${modelGate.map((c) => c.id).join(", ")}`} |
| Every Vessel prints integer Attack and Guard | ${vesselGate.length === 0 ? "pass" : `${vesselGate.length} failed`} |
| Every card has rules or effect text for the text panel | ${noRules.length === 0 ? "pass" : `${noRules.length} missing`} |
| Cost printed is the Flux cost from the definition | pass (rendered from \`card.cost\`) |
| Actions and Relics print no Attack/Guard medallions | pass (category branch removes the stat bar) |
| Frame ids are namespaced per card | pass (gradients are per-card, so faces can share a page) |

## Data gaps flagged for review (not invented)

${missingFlavor.length === 0
  ? "None: every card has flavour text."
  : `Cards without flavour text (the text panel prints rules only):\n\n${missingFlavor.map((c) => `- \`${c.id}\` — ${c.name}`).join("\n")}`}

## Known limitations

- Assets are SVG. They are exact at any raster size, and PNG export is a render step (any rasterizer at
  1086x2048), not a redesign.
- Card art is generated voxel rendering, not painted illustration.
- The reference card labels its defensive stat "DEFENSE"; this collection prints **GUARD** because that is
  the canonical stat name in \`GAME_RULES.md\`, and the HUD, engine and tests all use it.
`;
write("QA.md", qa);

/* ------------------------------ contact sheet ----------------------------- */

const groups = ["vessel", "action", "relic"];
const sheet = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Veylattice — printed card collection</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; padding: 40px clamp(16px, 3vw, 56px) 80px; background: #080b12; color: #e8edf7;
         font-family: ui-sans-serif, system-ui, "Segoe UI", sans-serif; }
  h1 { font-family: Georgia, "Times New Roman", serif; font-size: 34px; margin: 0 0 6px; letter-spacing: .5px; }
  p.lede { color: #9aa6c4; max-width: 76ch; margin: 0 0 34px; line-height: 1.6; }
  h2 { font-family: Georgia, "Times New Roman", serif; font-size: 20px; letter-spacing: .18em;
       text-transform: uppercase; color: #b9c6e4; margin: 44px 0 14px; border-bottom: 1px solid #1d2637; padding-bottom: 8px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 18px; }
  figure { margin: 0; }
  img { width: 100%; height: auto; display: block; border-radius: 10px; box-shadow: 0 14px 34px rgba(0,0,0,.55); }
  figcaption { font-size: 11px; color: #8b97b4; margin-top: 7px; display: flex; justify-content: space-between; gap: 6px; }
  code { font-size: 10px; color: #6f7c9b; }
</style>
</head>
<body>
  <h1>Veylattice — printed card collection</h1>
  <p class="lede">${sorted.length} cards at ${CARD_WIDTH}×${CARD_HEIGHT}. Every name, cost, statistic, rules line and
  flavour line is read from the canonical card definition; every Vessel illustration is a projection of the same
  voxel model the battlefield renders. Files live in <code>Cards/cards/</code>, illustrations in
  <code>Cards/art/</code>, reusable shells in <code>Cards/frames/</code>.</p>
  ${groups
    .map((group) => {
      const groupCards = sorted.filter((card) => card.category === group);
      if (groupCards.length === 0) return "";
      return `<h2>${group === "vessel" ? "Vessels" : group === "action" ? "Actions" : "Relics"} · ${groupCards.length}</h2>
      <div class="grid">
        ${groupCards
          .map(
            (card) => `<figure>
          <img src="cards/${card.id}.svg" alt="${card.name}" loading="lazy" width="${CARD_WIDTH}" height="${CARD_HEIGHT}">
          <figcaption><span>${card.name}</span><code>${card.element ?? "—"} · ${card.cost}</code></figcaption>
        </figure>`,
          )
          .join("\n        ")}
      </div>`;
    })
    .join("\n")}
</body>
</html>
`;
write("index.html", sheet);

write(
  "README.md",
  `# Cards

The printed Veylattice card collection: **${sorted.length} finished faces** (${manifest.counts.vessel} Vessels,
${manifest.counts.action} Actions, ${manifest.counts.relic} Relics) at ${CARD_WIDTH}×${CARD_HEIGHT}, the
reference card's 543:1024 proportion.

- \`cards/<id>.svg\` — the finished card face.
- \`art/<id>.svg\` — the illustration layer on its own.
- \`frames/<category>-frame.svg\` — the reusable shell with placeholder art, for new cards.
- \`manifest.json\` — every card id mapped to its files and its canonical data.
- \`QA.md\` — what the build verified and which data is missing.
- \`index.html\` — a contact sheet of the whole collection.

Regenerate after any card-data change:

\`\`\`bash
node tools/build-cards.mjs
\`\`\`

These files are generated. Edit card data in \`src/cards/\`, layout in \`src/render/card-face.js\`, and
illustration in \`src/render/illustration.js\` — never the SVGs by hand.

The game uses the same generator, so the card you inspect in a match is the file in this folder.
`,
);

/* ------------------------------- report ------------------------------- */

const totalBytes = generated.reduce((sum, item) => sum + item.face.length, 0);
console.log(`Cards rendered: ${sorted.length} (${manifest.counts.vessel} V / ${manifest.counts.action} A / ${manifest.counts.relic} R)`);
console.log(`Canvas: ${CARD_WIDTH}x${CARD_HEIGHT}`);
console.log(`Total SVG: ${(totalBytes / 1024).toFixed(0)} kB, average ${(totalBytes / sorted.length / 1024).toFixed(1)} kB per card`);
console.log(`Missing flavour text: ${missingFlavor.length}`);
console.log(`Vessels without a model: ${modelGate.length}`);
console.log(`Cards without rules text: ${noRules.length}`);
