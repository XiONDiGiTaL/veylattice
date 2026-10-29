const { launch, newPage, BASE } = require("./harness.cjs");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tag = process.argv[2] || "before";
const views = (process.argv[3] || "menu,lobby").split(",");
(async () => {
  const browser = await launch();
  const out = {};
  for (const [name, vp, mobile] of [["desktop", { width: 1440, height: 900 }, false], ["tablet", { width: 820, height: 1180 }, true], ["mobile", { width: 390, height: 844 }, true]]) {
    const { page, consoleLog, context } = await newPage(browser, { viewport: vp, isMobile: mobile });
    await page.addInitScript(() => { try { localStorage.setItem("veylattice.guide.seen.v1", "1"); } catch {} });
    await page.goto(BASE, { waitUntil: "networkidle" });
    await sleep(1200);
    for (const v of views) {
      if (v === "play") { await page.evaluate(() => document.querySelector("#tab-menu").click()); await sleep(300); const b = await page.$("#menu-play"); if (b) { await b.click(); await sleep(900); } }
      else { await page.evaluate((v) => document.querySelector(`#tab-${v}`)?.click(), v); await sleep(900); }
      const t0 = Date.now(); await page.screenshot({ path: `ms-${tag}-${v}-${name}.png`, timeout: 60000 }); console.error(v, name, Date.now() - t0, "ms");
      out[`${v}-${name}`] = await page.evaluate(() => ({ docW: document.documentElement.scrollWidth, docH: document.documentElement.scrollHeight, vw: innerWidth, vh: innerHeight }));
    }
    out[`errors-${name}`] = consoleLog.filter((c) => /error/.test(c.type) && !/supabase|ERR_BLOCKED/.test(c.text)).map((c) => c.text.slice(0, 200));
    await context.close();
  }
  console.log(JSON.stringify(out));
  await browser.close();
})();
