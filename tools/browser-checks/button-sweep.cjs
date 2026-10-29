// Click every visible, enabled button in each view and record JS errors.
const { launch, newPage, BASE } = require("./harness.cjs");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SKIP = /reset|delete|sign out|forget|leave room|create room|join room|dissolve|buy|copy/i;
(async () => {
  const browser = await launch();
  const { page, consoleLog } = await newPage(browser);
  page.on("dialog", (d) => d.dismiss());
  await page.goto(BASE, { waitUntil: "networkidle" });
  const report = [];
  for (const view of ["menu", "guide", "roster", "library", "decks", "shop", "lobby", "profile"]) {
    await page.click(`#tab-${view}`); await sleep(500);
    const count = await page.$$eval(`#view-${view} button`, (b) => b.length);
    let clicked = 0;
    for (let i = 0; i < Math.min(count, 60); i++) {
      await page.click(`#tab-${view}`).catch(() => {}); await sleep(100);
      const handle = (await page.$$(`#view-${view} button`))[i];
      if (!handle) continue;
      const label = ((await handle.textContent()) || "").trim().slice(0, 40);
      if (SKIP.test(label) || /practice|tutorial|continue/i.test((await handle.getAttribute("id")) || "")) continue;
      if (!(await handle.isVisible()) || !(await handle.isEnabled())) continue;
      const before = consoleLog.length;
      await handle.click({ timeout: 2000 }).catch(() => {});
      clicked++;
      await sleep(150);
      // close any modal
      await page.keyboard.press("Escape").catch(() => {});
      const errs = consoleLog.slice(before).filter((c) => /error/.test(c.type) && !/supabase|ERR_BLOCKED/.test(c.text));
      if (errs.length) report.push({ view, label, errs: errs.map((e) => e.text.slice(0, 200)) });
    }
    report.push({ view, buttons: count, clicked });
  }
  console.log(JSON.stringify(report, null, 1));
  await browser.close();
})();
