import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  BACKGROUND_ROLES,
  SOUNDTRACK,
  STINGER_ROLES,
  createAudioManager,
  defaultAudioSettings,
  resolveTrackUrl,
  sanitizeAudioSettings,
  viewMusicRole,
} from "../src/audio/soundtrack.js";
import { sanitizeSettings } from "../src/net/profile.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Minimal stand-in for HTMLAudioElement with observable calls. */
class FakeAudio {
  constructor() {
    this.playCalls = 0;
    this.pauseCalls = 0;
    this.volume = 1;
    this.loop = false;
    this.src = "";
    this.ended = false;
    this.currentTime = 0;
    this.playBehavior = "ok";
    this.handlers = new Map();
  }
  play() {
    this.playCalls += 1;
    if (this.playBehavior === "reject") return Promise.reject(new Error("autoplay blocked"));
    return Promise.resolve();
  }
  pause() {
    this.pauseCalls += 1;
  }
  addEventListener(type, handler) {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type).push(handler);
  }
  removeEventListener(type, handler) {
    const list = this.handlers.get(type) ?? [];
    this.handlers.set(type, list.filter((h) => h !== handler));
  }
  emit(type) {
    for (const handler of this.handlers.get(type) ?? []) handler();
  }
}

function suppliedManifest() {
  const out = {};
  for (const [role, entry] of Object.entries(SOUNDTRACK)) {
    out[role] = { ...entry, file: `${role}.mp3`, status: "supplied" };
  }
  return out;
}

function managerWith(manifest, extra = {}) {
  const created = [];
  const manager = createAudioManager({
    manifest,
    baseUrl: "https://xiondigital.net/veylattice/",
    fadeMs: 0,
    createAudio: () => {
      const element = new FakeAudio();
      created.push(element);
      return element;
    },
    ...extra,
  });
  return { manager, created };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test("real manifest: all six roles exist and name the supplied files", () => {
  const expected = {
    menu: "Veylattice_ Main Menu.mp3",
    battle: "Veylattice_ Battle.mp3",
    preparations: "Veylattice_ Planning.mp3",
    shop: "Veylattice_ Shop.mp3",
    victory: "Veylattice_ Victory.mp3",
    defeat: "Veylattice_ Defeat.mp3",
  };
  for (const role of [...BACKGROUND_ROLES, ...STINGER_ROLES]) {
    assert.ok(SOUNDTRACK[role], `role ${role} present`);
    assert.equal(SOUNDTRACK[role].file, expected[role], `${role} file`);
    assert.equal(SOUNDTRACK[role].status, "supplied", `${role} must be flagged supplied`);
    assert.ok(existsSync(join(repoRoot, "music", expected[role])), `${role} file on disk`);
  }
  for (const role of BACKGROUND_ROLES) assert.equal(SOUNDTRACK[role].loop, true);
  for (const role of STINGER_ROLES) assert.equal(SOUNDTRACK[role].loop, false);
});

test("manifest files, when supplied, must exist under music/ (no dangling references)", () => {
  for (const entry of Object.values(SOUNDTRACK)) {
    if (entry.file) {
      assert.ok(existsSync(join(repoRoot, "music", entry.file)), `missing file: music/${entry.file}`);
    }
  }
});

test("track URLs resolve under the Pages subpath, never root-relative", () => {
  assert.equal(
    resolveTrackUrl("https://xiondigital.net/veylattice/", "menu.mp3"),
    "https://xiondigital.net/veylattice/music/menu.mp3",
  );
  assert.equal(
    resolveTrackUrl("http://localhost:8001/veylattice/", "battle.mp3"),
    "http://localhost:8001/veylattice/music/battle.mp3",
  );
  assert.equal(resolveTrackUrl("", "shop.mp3"), "music/shop.mp3");
  assert.equal(resolveTrackUrl("https://xiondigital.net/veylattice", "shop.mp3"), "https://xiondigital.net/veylattice/music/shop.mp3");
  assert.equal(resolveTrackUrl("https://xiondigital.net/veylattice/", null), null);
  assert.equal(
    resolveTrackUrl("https://xiondigital.net/veylattice/", "Veylattice_ Main Menu.mp3"),
    "https://xiondigital.net/veylattice/music/Veylattice_%20Main%20Menu.mp3",
  );
});

test("view mapping: menu-family views, decks, shop, battle, and the silent result screen", () => {
  for (const view of ["menu", "guide", "roster", "library", "profile", "lobby"]) {
    assert.equal(viewMusicRole(view), "menu", view);
  }
  assert.equal(viewMusicRole("decks"), "preparations");
  assert.equal(viewMusicRole("shop"), "shop");
  assert.equal(viewMusicRole("battle"), "battle");
  assert.equal(viewMusicRole("battle", { matchOver: true }), null);
});

test("background: re-rendering the same role never restarts the track", () => {
  const { manager, created } = managerWith(suppliedManifest());
  assert.equal(manager.playBackground("menu"), "playing");
  assert.equal(created.length, 1);
  assert.equal(created[0].playCalls, 1);
  assert.equal(manager.playBackground("menu"), "playing");
  assert.equal(manager.playBackground("menu"), "playing");
  assert.equal(created[0].playCalls, 1, "same role must not replay");
  assert.equal(created.length, 1, "no second element");
});

test("background: rapid navigation reuses one element and ends on the latest track", () => {
  const { manager, created } = managerWith(suppliedManifest());
  manager.playBackground("menu");
  manager.playBackground("battle");
  manager.playBackground("shop");
  assert.equal(created.length, 1, "one background element total, no overlapping copies");
  assert.ok(created[0].src.endsWith("music/shop.mp3"), created[0].src);
  assert.equal(manager.currentRole, "shop");
});

test("stingers: at most once per match key; unknown roles ignored; draws have no cue", () => {
  const { manager, created } = managerWith(suppliedManifest());
  assert.equal(manager.playStinger("victory", 7), "playing");
  const plays = created[created.length - 1].playCalls;
  assert.equal(manager.playStinger("victory", 7), "already-played");
  assert.equal(created[created.length - 1].playCalls, plays, "same match must not replay");
  assert.equal(manager.playStinger("victory", 8), "playing", "a new match may play again");
  assert.equal(manager.playStinger("draw", 8), "ignored", "there is no draw cue");
  assert.equal(manager.playStinger("menu", 8), "ignored", "background roles are not stingers");
});

test("missing files: no element, no crash, honest unavailable status", () => {
  const empty = {};
  for (const [role, entry] of Object.entries(SOUNDTRACK)) {
    empty[role] = { ...entry, file: null, status: "missing" };
  }
  const { manager, created } = managerWith(empty);
  assert.equal(manager.playBackground("menu"), "unavailable");
  assert.equal(manager.playStinger("victory", 1), "unavailable");
  assert.equal(created.length, 0, "missing files must not even create an element");
  assert.equal(manager.status, "unavailable");
});

test("muting keeps music muted across screen changes; unmuting resumes the pending track", () => {
  const { manager, created } = managerWith(suppliedManifest());
  manager.playBackground("menu");
  assert.equal(created[0].volume, 0.8, "music volume = master(1) * music(0.8)");
  manager.applySettings({ muted: true });
  assert.equal(manager.status, "muted");
  assert.equal(created[0].volume, 0);
  assert.equal(manager.playBackground("battle"), "muted", "screen change must not unmute");
  assert.equal(created[0].playCalls, 1, "muted switch must not start playback");
  manager.applySettings({ muted: false });
  assert.equal(manager.status, "playing");
  assert.ok(created[0].src.endsWith("music/battle.mp3"), "pending role resumes on unmute");
});

test("rejected playback reports blocked (never playing) and retries on unlock", async () => {
  const bad = [];
  const m3 = createAudioManager({
    manifest: suppliedManifest(),
    baseUrl: "https://xiondigital.net/veylattice/",
    fadeMs: 0,
    createAudio: () => {
      const element = new FakeAudio();
      element.playBehavior = "reject";
      bad.push(element);
      return element;
    },
  });
  m3.playBackground("menu");
  await tick();
  assert.equal(m3.status, "blocked");
  assert.equal(m3.pendingRole, "menu");
  m3.unlock();
  await tick();
  assert.equal(bad[0].playCalls, 2, "unlock retries the pending track");
});

test("audio element errors surface as error status without throwing", () => {
  const { manager, created } = managerWith(suppliedManifest());
  manager.playBackground("battle");
  created[0].emit("error");
  assert.equal(manager.status, "error");
});

test("tab hidden pauses and visible resumes; user pause is respected on return", () => {
  const { manager, created } = managerWith(suppliedManifest());
  manager.playBackground("menu");
  manager.handleHidden();
  assert.equal(created[0].pauseCalls, 1);
  manager.handleVisible();
  assert.equal(created[0].playCalls, 2, "resume after tab restore");
  manager.pause();
  manager.handleHidden();
  manager.handleVisible();
  assert.equal(created[0].playCalls, 2, "user-paused music must not auto-resume");
});

test("settings sanitise: volumes clamp, bad types fall back, mute is strictly boolean", () => {
  assert.deepEqual(sanitizeAudioSettings({ master: 2, music: -1, sfx: "loud", muted: "yes" }), {
    master: 1,
    music: 0,
    sfx: 0.8,
    muted: false,
  });
  assert.deepEqual(sanitizeAudioSettings(null), defaultAudioSettings());
  assert.deepEqual(sanitizeAudioSettings({ muted: true }), { ...defaultAudioSettings(), muted: true });
});

test("profile settings carry audio preferences through sanitisation", () => {
  const clean = sanitizeSettings({ audio: { master: 0.5, music: 0.25, sfx: 1, muted: true } });
  assert.deepEqual(clean.audio, { master: 0.5, music: 0.25, sfx: 1, muted: true });
  assert.deepEqual(sanitizeSettings({}).audio, defaultAudioSettings());
});

test("stop + dispose: no lingering role, status returns to idle", () => {
  const { manager, created } = managerWith(suppliedManifest());
  manager.playBackground("menu");
  manager.stopBackground();
  assert.equal(manager.currentRole, null);
  assert.equal(manager.status, "idle");
  manager.playBackground("battle");
  manager.dispose();
  assert.equal(manager.status, "idle");
  assert.equal(manager.currentRole, null);
  assert.ok(created[0].pauseCalls >= 1);
});
