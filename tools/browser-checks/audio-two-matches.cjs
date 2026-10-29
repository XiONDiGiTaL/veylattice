const { launch, newPage, mediaState, BASE } = require("./harness.cjs");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function playOut(page) {
  const t0 = Date.now();
  while (Date.now() - t0 < 300000) {
    if (!(await page.isHidden("#result-overlay"))) break;
    const btn = await page.$("#end-turn-btn");
    if (btn && (await btn.isEnabled())) await btn.click();
    await sleep(600);
  }
  return page.textContent("#result-title");
}
const playing = async (p) => (await mediaState(p)).elements.filter((e) => !e.paused).map((e) => e.src);
(async () => {
  const browser = await launch();
  const out = {};
  // A: index.html entry resolves tracks?
  {
    const { page, consoleLog, context } = await newPage(browser);
    await page.goto(BASE + "index.html", { waitUntil: "networkidle" });
    await page.mouse.click(5, 5); await sleep(2500);
    out.indexHtml = { media: await mediaState(page), status: await page.textContent("#audio-status"), errs: consoleLog.filter((c) => !/supabase|ERR_BLOCKED/.test(c.text)) };
    await context.close();
  }
  // B: match -> Main Menu button -> menu music; Play Again -> battle music.
  {
    const { page, consoleLog } = await newPage(browser);
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.mouse.click(5, 5); await sleep(1000);
    await page.click("#tab-menu"); await sleep(800);
    await page.click("#menu-practice"); await sleep(3000);
    out.r1 = await playOut(page); await sleep(1500);
    await page.click("#result-menu"); await sleep(2000);
    out.afterResultMenu = await playing(page);
    await page.click("#menu-practice"); await sleep(3000);
    out.secondBattle = await playing(page);
    out.r2 = await playOut(page); await sleep(1500);
    out.atResult2 = await playing(page);
    await page.click("#result-restart"); await sleep(3000);
    out.afterPlayAgain = await playing(page);
    out.log = (await mediaState(page)).log.map((l) => `${l.t} ${l.ev} ${l.src}`);
    out.errs = consoleLog.filter((c) => !/supabase\.co/.test(c.text) && !(c.type === "error" && /ERR_BLOCKED_BY_CLIENT/.test(c.text)));
  }
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
