/**
 * Profile sanitisation and stats tests.
 *
 * Everything restored from localStorage or the database is untrusted input, so
 * these functions are the boundary that keeps a tampered profile from reaching
 * the UI or the cloud row.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_NAME_LENGTH,
  recordMatchResult,
  sanitizeAvatar,
  sanitizeName,
  sanitizeProfile,
  sanitizeSettings,
  sanitizeStats,
} from "../src/net/profile.js";

test("display names are trimmed, control characters removed and clamped", () => {
  assert.equal(sanitizeName("  Ashen  "), "Ashen");
  assert.equal(sanitizeName("Bad\u0000Name\u001b"), "BadName");
  assert.equal(sanitizeName("x".repeat(80)).length, MAX_NAME_LENGTH);
  assert.equal(sanitizeName(""), "Wanderer");
  assert.equal(sanitizeName(null), "Wanderer");
  assert.equal(sanitizeName(42), "Wanderer");
});

test("avatars must be small base64 PNG, JPEG or WebP data urls", () => {
  const ok = `data:image/png;base64,${Buffer.from("tiny").toString("base64")}`;
  assert.equal(sanitizeAvatar(ok), ok);
  assert.equal(sanitizeAvatar("data:image/svg+xml,<svg onload=alert(1)>"), null);
  assert.equal(sanitizeAvatar("javascript:alert(1)"), null);
  assert.equal(sanitizeAvatar("https://example.com/a.png"), null);
  assert.equal(sanitizeAvatar("data:image/png;base64," + "A".repeat(80_000)), null);
  assert.equal(sanitizeAvatar(null), null);
});

test("settings only accept known difficulties, styles and booleans", () => {
  assert.deepEqual(sanitizeSettings({ difficulty: "veteran", archetype: "warden", reducedMotion: true }), {
    difficulty: "veteran",
    archetype: "warden",
    reducedMotion: true,
    showCoordinates: true,
    audio: { master: 1, music: 0.8, sfx: 0.8, muted: false },
  });
  const rejected = sanitizeSettings({
    difficulty: "impossible",
    archetype: "cheat",
    reducedMotion: "yes",
    showCoordinates: 0,
  });
  assert.equal(rejected.difficulty, "standard");
  assert.equal(rejected.archetype, "vanguard");
  assert.equal(rejected.reducedMotion, false);
  assert.equal(rejected.showCoordinates, true);
  assert.deepEqual(sanitizeSettings(null).difficulty, "standard");
});

test("stats are clamped to non-negative integers", () => {
  const stats = sanitizeStats({ games: 5, wins: 3, losses: -2, draws: 1.5, currentStreak: 2 });
  assert.equal(stats.games, 5);
  assert.equal(stats.wins, 3);
  assert.equal(stats.losses, 0);
  assert.equal(stats.draws, 0);
  assert.equal(stats.currentStreak, 2);
  assert.equal(sanitizeStats("nonsense").games, 0);
});

test("a forged or missing id is replaced, never trusted", () => {
  const fallback = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
  assert.equal(sanitizeProfile({ id: "../../etc/passwd" }, fallback).id, fallback);
  assert.equal(sanitizeProfile({ id: 123 }, fallback).id, fallback);
  const good = "11111111-2222-4333-8444-555555555555";
  assert.equal(sanitizeProfile({ id: good }, fallback).id, good);
  assert.match(sanitizeProfile({}, undefined).id, /^[0-9a-f-]{36}$/);
});

test("match results update the record without mutating the input", () => {
  const base = { games: 0, wins: 0, losses: 0, draws: 0, currentStreak: 0, bestStreak: 0 };
  const win1 = recordMatchResult(base, "win");
  const win2 = recordMatchResult(win1, "win");
  const loss = recordMatchResult(win2, "loss");
  const draw = recordMatchResult(loss, "draw");

  assert.equal(base.games, 0, "input stats are untouched");
  assert.equal(win2.wins, 2);
  assert.equal(win2.currentStreak, 2);
  assert.equal(win2.bestStreak, 2);
  assert.equal(loss.losses, 1);
  assert.equal(loss.currentStreak, 0);
  assert.equal(loss.bestStreak, 2, "best streak survives a loss");
  assert.equal(draw.draws, 1);
  assert.equal(draw.games, 4);
  assert.match(draw.lastPlayedAt, /^\d{4}-\d{2}-\d{2}T/);
});
