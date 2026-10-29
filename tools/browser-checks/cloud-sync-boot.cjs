const { launch, newPage, BASE } = require("./harness.cjs");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await launch();
  // 1) Hanging cloud: tabs must be usable immediately.
  {
    const { page, consoleLog } = await newPage(browser);
    await page.unroute("https://*.supabase.co/**"); await page.route("https://*.supabase.co/**", () => {});
    const t0 = Date.now();
    await page.goto(BASE, { waitUntil: "domcontentloaded" }); await sleep(2000);
    for (const tab of ["shop", "decks", "lobby"]) {
      await page.click(`#tab-${tab}`); await sleep(300);
      console.log(`hang t=${Date.now() - t0}`, tab, "root children:", await page.evaluate((t) => document.querySelector(`#${t}-root`).children.length, tab));
    }
    console.log("hang chip:", await page.textContent("#profile-chip-sync").catch(() => null));
    await sleep(17000);
    console.log("hang chip later:", await page.textContent("#profile-chip-sync").catch(() => null), "errors:", JSON.stringify(consoleLog.filter((c) => /error/.test(c.type) && !/supabase|ERR_BLOCKED/.test(c.text))));
    await page.close();
  }
  // 2) Reachable cloud with a NEWER remote row: name/stats adopted, economy kept, purchase during sync kept.
  {
    const { page, consoleLog } = await newPage(browser);
    await page.unroute("https://*.supabase.co/**");
    let saves = 0;
    await page.route("https://*.supabase.co/rest/v1/rpc/veylattice_profile_get", async (r) => {
      await sleep(3000); // slow cloud: the user acts meanwhile
      const id = JSON.parse(r.request().postData()).p_id;
      r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id, display_name: "CloudName", avatar: null, settings: {}, stats: { wins: 7, losses: 2, draws: 0, streak: 1, bestStreak: 3 }, updated_at: "2099-01-01T00:00:00Z" }) });
    });
    await page.route("https://*.supabase.co/rest/v1/rpc/veylattice_profile_save", (r) => { saves++; r.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }); });
    await page.goto(BASE, { waitUntil: "domcontentloaded" }); await sleep(1200);
    await page.click("#tab-shop"); await sleep(300);
    await page.click("#shop-root button:has-text('Buy pack')"); await sleep(300);
    const during = await page.evaluate(() => document.querySelector(".sys-balance")?.textContent);
    await sleep(4500);
    const after = await page.evaluate(() => ({ balance: document.querySelector(".sys-balance")?.textContent, chip: document.querySelector("#profile-chip-sync")?.textContent, name: document.querySelector("#profile-chip")?.textContent.replace(/\s+/g, " ").trim().slice(0, 60), stored: (() => { const p = JSON.parse(localStorage.getItem("veylattice.profile.v2")); return { name: p.displayName, shards: p.economy?.shards, stats: p.stats }; })() }));
    console.log("cloud during:", during, "| after:", JSON.stringify(after), "| saves:", saves, "| errors:", JSON.stringify(consoleLog.filter((c) => /error/.test(c.type))));
  }
  await browser.close();
})();
