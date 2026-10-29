// Task 6: arena performance numbers. Headless Chromium + SwiftShader (CPU GL):
// absolute numbers are NOT a real phone GPU; use them comparatively.
const { launch, newPage, BASE } = require("./harness.cjs");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PROBE = `(() => {
  window.__draws = 0;
  for (const C of [WebGLRenderingContext, typeof WebGL2RenderingContext !== "undefined" ? WebGL2RenderingContext : null]) {
    if (!C) continue;
    for (const f of ["drawElements", "drawArrays"]) { const o = C.prototype[f]; C.prototype[f] = function () { window.__draws++; return o.apply(this, arguments); }; }
  }
  window.__long = [];
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push(Math.round(e.duration)); }).observe({ type: "longtask", buffered: true }); } catch {}
})();`;
async function sample(page, ms) {
  return page.evaluate(async (ms) => {
    const d0 = window.__draws; const iv = []; let last = performance.now(); const end = last + ms;
    await new Promise((res) => { const f = (t) => { iv.push(t - last); last = t; if (t < end) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
    iv.shift(); iv.sort((a, b) => a - b);
    if (!iv.length) return { fps: 0, p50: null, p95: null, max: null, drawsPerSec: Math.round((window.__draws - d0) / (ms / 1000)), note: "no complete frame in window" };
    const q = (p) => +iv[Math.min(iv.length - 1, Math.floor(p * iv.length))].toFixed(1);
    return { fps: +(iv.length / (ms / 1000)).toFixed(1), p50: q(0.5), p95: q(0.95), max: +iv[iv.length - 1].toFixed(1), drawsPerSec: Math.round((window.__draws - d0) / (ms / 1000)) };
  }, ms);
}
(async () => {
  const browser = await launch();
  const out = {};
  for (const [name, vp, mobile, throttle] of [["desktop-1366", { width: 1366, height: 860 }, false, 1], ["phone-390-dpr2-cpu4x", { width: 390, height: 844 }, true, 4]]) {
    const { page, context } = await newPage(browser, { viewport: vp, isMobile: mobile });
    await page.addInitScript(PROBE);
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle });
    const t0 = Date.now();
    await page.goto(BASE, { waitUntil: "load" });
    const loadMs = Date.now() - t0;
    await page.evaluate(() => document.querySelector("#tab-menu").click());
    await sleep(1500);
    const menuBefore = await sample(page, 3000);
    const t1 = Date.now();
    await page.evaluate(() => document.querySelector("#menu-practice").click());
    await page.waitForSelector("#arena-3d canvas", { timeout: 60000 });
    const canvasMs = Date.now() - t1;
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const firstFrameMs = Date.now() - t1;
    await sleep(1500);
    const canvasPx = await page.evaluate(() => { const c = document.querySelector("#arena-3d canvas"); return [c.width, c.height]; });
    const battleIdle = await sample(page, 5000);
    // Drag orbit
    const box = await page.locator("#arena-3d canvas").boundingBox();
    const dragP = sample(page, 3000);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
    for (let i = 0; i < 30; i++) { await page.mouse.move(box.x + box.width / 2 + Math.sin(i / 5) * 80, box.y + box.height / 2, { steps: 2 }); await sleep(60); }
    await page.mouse.up();
    const battleDrag = await dragP;
    // Tap a hand card (selection re-render) and time it
    const tTap = Date.now();
    await page.locator("#hand > button").first().click({ force: true });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const tapToFrameMs = Date.now() - tTap;
    // Leave the battle: does the hidden arena keep drawing?
    await page.evaluate(() => document.querySelector("#tab-menu").click());
    await sleep(1000);
    const menuAfter = await sample(page, 3000);
    await page.evaluate(() => document.querySelector("#arena-toggle") && document.querySelector("#tab-battle").click());
    await sleep(500);
    await page.evaluate(() => document.querySelector("#arena-toggle").click());
    await sleep(1000);
    const classicMode = await sample(page, 3000);
    const longTasks = await page.evaluate(() => window.__long.slice());
    const heap = await page.evaluate(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null);
    out[name] = { loadMs, canvasMs, firstFrameMs, tapToFrameMs, canvasPx, menuBefore, battleIdle, battleDrag, menuAfterBattle: menuAfter, battleClassicMode: classicMode, longTasks: { count: longTasks.length, max: Math.max(0, ...longTasks), total: longTasks.reduce((a, b) => a + b, 0) }, heapMB: heap };
    await context.close();
  }
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
