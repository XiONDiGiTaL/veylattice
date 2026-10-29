// Shared Playwright harness: local /veylattice/ server, three.js from npm,
// Supabase blocked (egress denies it here) unless a mock is supplied.
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const S = __dirname;
// Serve the repo so it is reachable under a /veylattice/ subpath (as on Pages),
// e.g. mkdir -p /tmp/www && ln -s "$PWD" /tmp/www/veylattice && python3 -m http.server 8100 -d /tmp/www
const BASE = process.env.VEYLATTICE_BASE || "http://127.0.0.1:8100/veylattice/";
// three@0.160.0 from npm (npm pack three@0.160.0 && tar xzf three-0.160.0.tgz), because the
// sandbox that wrote these checks could not reach cdn.jsdelivr.net. The page's CDN request is
// fulfilled from this file; set THREE_MODULE to its path.
const THREE = fs.readFileSync(process.env.THREE_MODULE || path.join(S, ".cache/three/package/build/three.module.js"));

async function launch(extraArgs = []) {
  return chromium.launch({
    args: [
      "--autoplay-policy=user-gesture-required",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--ignore-gpu-blocklist",
      ...extraArgs,
    ],
  });
}

// Observation-only audio probe: records every HTMLMediaElement that play() is
// called on, plus its lifecycle events. It does not alter playback.
const AUDIO_PROBE = `
(() => {
  window.__media = [];
  window.__mediaLog = [];
  const seen = new WeakSet();
  const orig = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    if (!seen.has(this)) {
      seen.add(this);
      window.__media.push(this);
      for (const ev of ["playing", "pause", "ended", "error"]) {
        this.addEventListener(ev, () => window.__mediaLog.push({ t: Math.round(performance.now()), ev, src: decodeURIComponent(this.currentSrc || this.src).split("/").pop() }));
      }
    }
    window.__mediaLog.push({ t: Math.round(performance.now()), ev: "play()", src: decodeURIComponent(this.src).split("/").pop() });
    const p = orig.apply(this, arguments);
    if (p && p.catch) p.catch((e) => window.__mediaLog.push({ t: Math.round(performance.now()), ev: "play-rejected:" + e.name, src: decodeURIComponent(this.src).split("/").pop() }));
    return p;
  };
})();`;

async function newPage(browser, { viewport = { width: 1366, height: 860 }, supabaseMock = null, clockOffsetMs = 0, isMobile = false } = {}) {
  const context = await browser.newContext({ viewport, isMobile, hasTouch: isMobile, deviceScaleFactor: isMobile ? 2 : 1 });
  const page = await context.newPage();
  const consoleLog = [];
  page.on("console", (m) => consoleLog.push({ type: m.type(), text: m.text() }));
  page.on("pageerror", (e) => consoleLog.push({ type: "pageerror", text: String(e && e.stack || e) }));
  page.on("requestfailed", (r) => consoleLog.push({ type: "requestfailed", text: `${r.url()} ${r.failure()?.errorText}` }));
  page.on("response", (r) => { if (r.status() >= 400) consoleLog.push({ type: "http" + r.status(), text: r.url() }); });
  await page.addInitScript(AUDIO_PROBE);
  if (clockOffsetMs) {
    await page.addInitScript(`(() => { const off = ${clockOffsetMs}; const N = Date.now.bind(Date); Date.now = () => N() + off; })();`);
  }
  await page.route("https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js", (r) =>
    r.fulfill({ status: 200, contentType: "text/javascript", body: THREE }));
  await page.route("https://cdn.jsdelivr.net/npm/@supabase/**", (r) =>
    supabaseMock ? r.fulfill({ status: 200, contentType: "text/javascript", body: supabaseMock }) : r.abort("blockedbyclient"));
  await page.route("https://*.supabase.co/**", (r) => r.abort("blockedbyclient"));
  return { context, page, consoleLog };
}

async function mediaState(page) {
  return page.evaluate(() => ({
    elements: window.__media.map((m) => ({ src: decodeURIComponent(m.currentSrc || m.src).split("/").pop(), paused: m.paused, t: +m.currentTime.toFixed(2), vol: +m.volume.toFixed(2), loop: m.loop, err: m.error && m.error.code })),
    log: window.__mediaLog.slice(),
  }));
}

module.exports = { launch, newPage, mediaState, BASE, S };
