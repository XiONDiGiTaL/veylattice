import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { applyStamp, expectedStamp, moduleFiles } from "../tools/stamp-assets.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");

test("index.html asset stamp is current (run `npm run stamp` after changing src/ or CSS)", () => {
  assert.equal(applyStamp(html, expectedStamp()), html);
});

test("import map versions every module under src/, and only real files", () => {
  const match = html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
  assert.ok(match, "import map present");
  const { imports } = JSON.parse(match[1]);
  const files = moduleFiles();
  assert.deepEqual(Object.keys(imports).sort(), [...files].sort());
  for (const [key, value] of Object.entries(imports)) {
    assert.match(value, new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\?v=[0-9a-f]{10}$`));
  }
});

test("the import map precedes every module script, and the entry is versioned", () => {
  const mapAt = html.indexOf('<script type="importmap">');
  const firstModule = html.indexOf('<script type="module"');
  assert.ok(mapAt > -1 && firstModule > mapAt, "import map must come first");
  assert.match(html, /<script type="module" src="\.\/src\/main\.js\?v=[0-9a-f]{10}"><\/script>/);
  assert.equal((html.match(/<script type="importmap">/g) ?? []).length, 1, "exactly one import map");
});

test("stylesheets are versioned and never root-relative (Pages subpath)", () => {
  assert.match(html, /<link rel="stylesheet" href="\.\/styles\.css\?v=[0-9a-f]{10}">/);
  assert.match(html, /<link rel="stylesheet" href="\.\/battlefield\.css\?v=[0-9a-f]{10}">/);
  assert.doesNotMatch(html, /(src|href)="\/(src|styles|battlefield|music|CardFrames)/);
});

test("a boot guard exists outside the module graph and main.js reports a finished boot", () => {
  assert.match(html, /window\.__vlBoot = \{ ok: false/);
  const main = readFileSync(join(root, "src", "main.js"), "utf8");
  assert.match(main, /window\.__vlBoot\.ok = true/);
});
