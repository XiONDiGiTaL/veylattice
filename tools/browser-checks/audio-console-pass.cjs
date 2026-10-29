// Task 1: console + audio confirmation pass in headless Chromium.
const { launch, newPage, mediaState, BASE } = require("./harness.cjs");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const entry = process.argv[2] || BASE;

(async () => {
  const browser = await launch();
  const { page, consoleLog } = await newPage(browser);
  const mark = (label) => consoleLog.push({ type: "mark", text: "==== " + label });
  const report = {};
  mark("load " + entry);
  await page.goto(entry, { waitUntil: "networkidle" });
  await sleep(1500);
  report.firstView = await page.evaluate(() => [...document.querySelectorAll("section.view")].filter((s) => !s.hidden).map((s) => s.id));
  report.audioStatusBeforeGesture = await page.textContent("#audio-status");
  report.mediaBeforeGesture = await mediaState(page);

  // First trusted gesture.
  mark("first gesture");
  await page.mouse.click(5, 5);
  await sleep(2500);
  report.audioStatusAfterGesture = await page.textContent("#audio-status");
  report.mediaAfterGesture = await mediaState(page);

  const go = async (sel, label) => {
    mark("view " + label);
    // tab bar or menu link
    const tab = await page.$(`#tab-${label}`);
    if (tab && (await tab.isVisible())) await tab.click(); else await page.click(sel);
    await sleep(1800);
    return (await mediaState(page)).elements.filter((e) => !e.paused).map((e) => e.src);
  };
  await go("#tab-menu", "menu");
  report.playingOnMenu = (await mediaState(page)).elements.filter((e) => !e.paused).map((e) => e.src);
  report.playingOnDecks = await go("#menu-decks", "decks");
  report.decksText = (await page.textContent("#view-decks")).replace(/\s+/g, " ").slice(0, 300);
  report.playingOnShop = await go("#menu-shop", "shop");
  report.shopText = (await page.textContent("#view-shop")).replace(/\s+/g, " ").slice(0, 300);
  report.playingOnLobby = await go("#menu-lobby", "lobby");
  report.lobbyText = (await page.textContent("#view-lobby")).replace(/\s+/g, " ").slice(0, 600);
  report.playingOnProfile = await go("#menu-settings", "profile");
  report.audioStatusOnSettings = await page.textContent("#audio-status");

  // Practice match, then end turns until the match ends.
  mark("practice match");
  await go("#tab-menu", "menu");
  await page.click("#menu-practice");
  await sleep(4000);
  report.battle = await page.evaluate(() => ({
    canvas: !!document.querySelector("#view-battle canvas"),
    grid: document.querySelector("#grid-label")?.textContent,
    hand: document.querySelectorAll("#hand > *").length,
  }));
  report.playingOnBattle = (await mediaState(page)).elements.filter((e) => !e.paused).map((e) => e.src);
  const t0 = Date.now();
  let turns = 0;
  while (Date.now() - t0 < 240000) {
    if (!(await page.isHidden("#result-overlay"))) break;
    const btn = await page.$("#end-turn-btn");
    if (btn && (await btn.isEnabled())) { await btn.click(); turns += 1; }
    await sleep(700);
  }
  report.endTurnsClicked = turns;
  report.matchSeconds = Math.round((Date.now() - t0) / 1000);
  report.resultTitle = await page.textContent("#result-title").catch(() => null);
  report.resultReason = await page.textContent("#result-reason").catch(() => null);
  await sleep(3000);
  report.mediaAtResult = await mediaState(page);
  // Re-render pressure: click on overlay area / resize, make sure the sting doesn't replay.
  await page.setViewportSize({ width: 1200, height: 800 });
  await sleep(500);
  await page.setViewportSize({ width: 1366, height: 860 });
  await sleep(14000);
  report.mediaAfterSting = await mediaState(page);
  mark("return to menu");
  await page.click("#tab-menu").catch(() => {});
  await sleep(2000);
  report.playingAfterReturn = (await mediaState(page)).elements.filter((e) => !e.paused).map((e) => e.src);
  report.console = consoleLog;
  console.log(JSON.stringify(report, null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
