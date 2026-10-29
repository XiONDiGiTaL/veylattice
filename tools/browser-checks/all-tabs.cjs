const { launch, newPage, BASE } = require("./harness.cjs");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await launch();
  for (const [name, vp, mobile] of [["desktop", { width: 1366, height: 860 }, false], ["phone", { width: 390, height: 844 }, true]]) {
    const { page, consoleLog, context } = await newPage(browser, { viewport: vp, isMobile: mobile });
    await page.goto(BASE, { waitUntil: "networkidle" });
    const results = [];
    const tabs = await page.$$eval("nav.tabs .tab", (b) => b.map((x) => x.id));
    for (const id of tabs) {
      const before = consoleLog.length;
      try { await page.click("#" + id, { timeout: 4000 }); } catch (e) { results.push([id, "CLICK FAILED: " + e.message.split("\n")[0]]); continue; }
      await sleep(700);
      const st = await page.evaluate(() => ({ view: document.body.dataset.view, visible: [...document.querySelectorAll("section.view")].filter((s) => !s.hidden).map((s) => s.id), len: [...document.querySelectorAll("section.view")].filter((s) => !s.hidden).map((s) => s.textContent.trim().length) }));
      results.push([id, JSON.stringify(st), consoleLog.slice(before).filter((c) => !/supabase|ERR_BLOCKED|ERR_ABORTED/.test(c.text)).map((c) => c.type + ":" + c.text.slice(0, 150))]);
    }
    await page.click("#tab-menu");
    const links = await page.$$eval("#view-menu button", (b) => b.filter((x) => !x.hidden).map((x) => x.id).filter(Boolean));
    for (const id of links) {
      if (/practice|tutorial|continue/.test(id)) continue;
      await page.click("#tab-menu"); await sleep(300);
      try { await page.click("#" + id, { timeout: 4000 }); } catch (e) { results.push([id, "CLICK FAILED: " + e.message.split("\n")[0]]); continue; }
      await sleep(600);
      results.push([id, await page.evaluate(() => document.body.dataset.view)]);
    }
    console.log("=== " + name); for (const r of results) console.log(JSON.stringify(r));
    console.log("console:", JSON.stringify(consoleLog.filter((c) => !/supabase|ERR_BLOCKED|ERR_ABORTED/.test(c.text))));
    await context.close();
  }
  await browser.close();
})();
