const { launch, newPage, BASE } = require("./harness.cjs");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tag = process.argv[2] || "before";
(async () => {
  const browser = await launch();
  const res = {};
  for (const [name, vp, mobile] of [["desktop", { width: 1366, height: 860 }, false], ["mobile", { width: 390, height: 844 }, true]]) {
    const { page, consoleLog, context } = await newPage(browser, { viewport: vp, isMobile: mobile });
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.click("#tab-menu").catch(() => {});
    await page.evaluate(() => document.querySelector("#menu-practice").click());
    await sleep(4000);
    await page.screenshot({ path: `shot-${tag}-${name}.png`, fullPage: true });
    res[name] = await page.evaluate(() => {
      const r = (s) => { const b = document.querySelector(s)?.getBoundingClientRect(); return b ? [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)] : null; };
      const cards = [...document.querySelectorAll("#hand > *")].map((c) => { const b = c.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height), +(b.width / b.height).toFixed(3)]; });
      return { doc: [document.documentElement.scrollWidth, document.documentElement.scrollHeight], hand: r("#hand"), rail: r(".hand-rail"), board: r("#arena-3d"), endTurn: r("#end-turn-btn"), cards, frames: document.querySelectorAll("#hand .approved-card").length, overflowX: document.documentElement.scrollWidth > innerWidth };
    });
    res[name].errors = consoleLog.filter((c) => /error|pageerror/.test(c.type) && !/ERR_BLOCKED/.test(c.text));
    await context.close();
  }
  console.log(JSON.stringify(res, null, 1));
  await browser.close();
})();
