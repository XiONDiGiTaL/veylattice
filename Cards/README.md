# Cards

The printed Veylattice card collection: **107 finished faces** (65 Vessels,
30 Actions, 12 Relics) at 1086×2048, the
reference card's 543:1024 proportion.

- `cards/<id>.svg` — the finished card face.
- `art/<id>.svg` — the illustration layer on its own.
- `frames/<category>-frame.svg` — the reusable shell with placeholder art, for new cards.
- `manifest.json` — every card id mapped to its files and its canonical data.
- `QA.md` — what the build verified and which data is missing.
- `index.html` — a contact sheet of the whole collection.

Regenerate after any card-data change:

```bash
node tools/build-cards.mjs
```

These files are generated. Edit card data in `src/cards/`, layout in `src/render/card-face.js`, and
illustration in `src/render/illustration.js` — never the SVGs by hand.

The game uses the same generator, so the card you inspect in a match is the file in this folder.
