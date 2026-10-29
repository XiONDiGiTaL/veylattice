const { execSync } = require("child_process");
// Stale bodies come from the commit before the cache-busting change (b488699).
const old = (f) => execSync(`git show b488699:${f}`, { cwd: require("path").join(__dirname, "..", "..") });
const { launch, newPage, BASE } = require("./harness.cjs");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await launch();
  // A: warm cache holds OLD unversioned modules; new HTML requests ?v= URLs.
  {
    const { page, consoleLog, context } = await newPage(browser);
    const reqs = [];
    page.on("request", (r) => { if (r.url().includes("/src/") && r.url().endsWith(".js") === false) reqs.push(r.url().split("/veylattice/")[1]); });
    for (const f of ["src/render/approved-frame.js", "src/game/lobby.js"]) await page.route(BASE + f, (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: old(f) }));
    await page.goto(BASE, { waitUntil: "networkidle" }); await sleep(800);
    await page.click("#tab-shop", { timeout: 3000 }); await sleep(400);
    console.log("A view after Shop:", await page.evaluate(() => document.body.dataset.view), "| booted:", await page.evaluate(() => window.__vlBoot.ok), "| versioned module requests:", reqs.filter((u) => /\?v=/.test(u)).length, "| errors:", JSON.stringify(consoleLog.filter((c) => /error/.test(c.type) && !/supabase|ERR_BLOCKED/.test(c.text))));
    await context.close();
  }
  // B: even a versioned URL serving a stale body: the boot guard must surface it.
  {
    const { page, consoleLog, context } = await newPage(browser);
    await page.route(/\/src\/game\/lobby\.js\?v=/, (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: old("src/game/lobby.js") }));
    await page.goto(BASE, { waitUntil: "networkidle" }); await sleep(1000);
    const banner = await page.$("#boot-failure");
    console.log("B banner:", banner ? (await banner.textContent()).slice(0, 160) : null);
    if (banner) {
      await page.unroute(/\/src\/game\/lobby\.js\?v=/);
      await page.click("#boot-failure button"); await page.waitForLoadState("networkidle"); await sleep(800);
      console.log("B after reload: url has fresh=", page.url().includes("fresh="), "booted:", await page.evaluate(() => window.__vlBoot.ok), "banner:", !!(await page.$("#boot-failure")));
    }
    await context.close();
  }
  await browser.close();
})();
