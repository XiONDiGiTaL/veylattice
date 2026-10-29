const fs = require("fs"); const path = require("path");
const { launch, newPage, BASE, S } = require("./harness.cjs");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MOCK = fs.readFileSync(path.join(S, "supabase-mock.js"), "utf8");
(async () => {
  const browser = await launch();
  const A = await newPage(browser, { supabaseMock: MOCK, viewport: { width: 1440, height: 900 } });
  const B = await newPage(browser, { supabaseMock: MOCK, viewport: { width: 390, height: 844 }, isMobile: true });
  const peers = { A, B }; const q = { A: Promise.resolve(), B: Promise.resolve() };
  for (const [me, other] of [["A", "B"], ["B", "A"]]) {
    await peers[me].page.exposeBinding("__relaySend", (_s, name, msg) => { q[other] = q[other].then(() => sleep(40)).then(() => peers[other].page.evaluate(([n, m]) => globalThis.__relayDeliver?.(n, m), [name, msg]).catch(() => {})); });
  }
  for (const p of [A, B]) { await p.page.addInitScript(() => localStorage.setItem("veylattice.guide.seen.v1", "1")); await p.page.goto(BASE, { waitUntil: "networkidle" }); await p.page.click("#tab-lobby").catch(async () => { await p.page.click("#menu-lobby"); }); await sleep(600); }
  await A.page.screenshot({ path: "lob-empty-desktop.png" });
  await B.page.screenshot({ path: "lob-empty-mobile.png", fullPage: true });
  await A.page.click("#lobby-root button:has-text('Create room')"); await sleep(1200);
  await A.page.screenshot({ path: "lob-hostwait-desktop.png" });
  const code = ((await A.page.textContent("#lobby-root .vl-room-code")).match(/([A-HJ-NP-Z2-9]{6})/) || [])[1];
  await B.page.fill("#lobby-code-input", code); await B.page.click("#lobby-root button:has-text('Join room')"); await sleep(250);
  await B.page.screenshot({ path: "lob-joining-mobile.png" });
  await sleep(1500);
  await A.page.selectOption("#lobby-root select", { index: 1 }); await sleep(500);
  await B.page.selectOption("#lobby-root select", { index: 1 }); await sleep(500);
  await B.page.click("#lobby-root button:has-text('Ready up')"); await sleep(800);
  await A.page.screenshot({ path: "lob-room-desktop.png" });
  await B.page.screenshot({ path: "lob-room-mobile.png", fullPage: true });
  console.log(JSON.stringify({ code, errA: A.consoleLog.filter((c) => /error/.test(c.type) && !/supabase|ERR_/.test(c.text)), errB: B.consoleLog.filter((c) => /error/.test(c.type) && !/supabase|ERR_/.test(c.text)), overflowB: await B.page.evaluate(() => document.documentElement.scrollWidth) }));
  await browser.close();
})();
