# Browser checks (Playwright, headless Chromium)

These are the scripts behind the 2026-10-29 verification recorded in `docs/IMPLEMENTATION_LOG.md`.
They are not part of `npm test`, because they need Playwright, Chromium and a local static server.

```
mkdir -p /tmp/www && ln -s "$PWD" /tmp/www/veylattice
python3 -m http.server 8100 --bind 127.0.0.1 -d /tmp/www &
(cd tools/browser-checks && mkdir -p .cache/three && cd .cache/three && npm pack three@0.160.0 && tar xzf three-0.160.0.tgz)
node tools/browser-checks/audio-console-pass.cjs      # console + soundtrack across views and a full match
node tools/browser-checks/audio-two-matches.cjs       # index.html entry, Main Menu / Play Again stingers
node tools/browser-checks/lobby-e2e.cjs -5000 6       # two contexts, guest clock -5 s, 6 turns
E2E_TIMEOUT=1 node tools/browser-checks/lobby-e2e.cjs 3000 6   # + an idle 120 s deadline
node tools/browser-checks/arena-perf.cjs              # draw calls / frame intervals, desktop vs phone
node tools/browser-checks/battle-layout.cjs after     # hand/board geometry + full-page screenshots
node tools/browser-checks/mobile-overflow.cjs         # elements wider than a 390 px viewport
```

What these checks can and cannot prove:

- **Audio:** the probe records `play()` calls, rejections and media events on the real
  `HTMLMediaElement`s, and whether `currentTime` advances. That proves the browser decoded and
  played the file. It does **not** prove anyone heard it: headless Chromium has no speakers.
- **Lobby:** `supabase-mock.js` is a *test double* for Supabase Realtime (no replay, async
  SUBSCRIBED, `self: false`), relayed between two isolated browser contexts. It verifies the
  app-level protocol, not Supabase itself.
- **Performance:** WebGL runs on SwiftShader (CPU), so absolute fps is not a phone GPU number.
  Draw-call counts and relative before/after numbers are what these checks are for.
- Supabase REST is blocked in these runs. The two "Failed to load resource" console errors per
  load come from that block, not from the app.
