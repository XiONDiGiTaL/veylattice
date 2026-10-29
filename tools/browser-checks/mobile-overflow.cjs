const { launch, newPage, BASE } = require("./harness.cjs");
(async () => {
  const browser = await launch();
  const { page } = await newPage(browser, { viewport: { width: 390, height: 844 }, isMobile: true });
  await page.goto(BASE, { waitUntil: "networkidle" });
  for (const view of ["menu", "battle"]) {
    if (view === "battle") { await page.evaluate(() => document.querySelector("#menu-practice").click()); await page.waitForTimeout(3000); }
    else await page.evaluate(() => document.querySelector("#tab-menu").click());
    const r = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const out = [];
      for (const n of document.querySelectorAll("body *")) {
        const b = n.getBoundingClientRect();
        if (b.width && b.right > vw + 1 && getComputedStyle(n).position !== "fixed") out.push({ tag: n.tagName, id: n.id, cls: String(n.className).slice(0, 40), right: Math.round(b.right), w: Math.round(b.width) });
      }
      return { vw, innerWidth, scrollW: document.documentElement.scrollWidth, offenders: out.slice(0, 12) };
    });
    console.log(view, JSON.stringify(r));
  }
  await browser.close();
})();
