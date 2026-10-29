// Acceptance checks for docs/UI_DESIGN_SYSTEM.md §9 (menu + Play dialog).
const { launch, newPage, BASE, mediaState } = require("./harness.cjs");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await launch();
  const res = [];
  const ok = (name, pass, detail) => { res.push({ name, pass, detail }); console.error((pass ? "PASS " : "FAIL ") + name + (detail !== undefined ? " :: " + JSON.stringify(detail).slice(0, 240) : "")); };
  const { page, consoleLog, context } = await newPage(browser, { viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => localStorage.setItem("veylattice.guide.seen.v1", "1"));
  await page.goto(BASE, { waitUntil: "networkidle" }); await sleep(800);
  ok("menu is entry point, no match on load", await page.evaluate(() => document.body.dataset.view === "menu" && document.querySelector("#tab-battle").disabled && !document.querySelector("#menu-continue").offsetParent));
  ok("no tab bar on menu; utilities present", await page.evaluate(() => !document.querySelector(".tabs").offsetParent && !!document.querySelector("#audio-toggle").offsetParent && !!document.querySelector("#profile-chip").offsetParent));
  const playBox = await page.locator("#menu-play").boundingBox();
  ok("Play visible above the fold (1440x900)", playBox && playBox.y + playBox.height <= 900, playBox);
  // keyboard: tab to Play, open with Enter, Esc closes, focus returns
  await page.focus("#menu-play"); await page.keyboard.press("Enter"); await sleep(400);
  ok("Play opens dialog (keyboard)", await page.evaluate(() => document.querySelector("#play-dialog").open));
  ok("focus moved into dialog", await page.evaluate(() => document.querySelector("#play-dialog").contains(document.activeElement)), await page.evaluate(() => document.activeElement.id));
  // Native modal: background is inert; focus may pass to browser UI (body) but never to page content outside the dialog.
  let escaped = false;
  for (let i = 0; i < 20; i++) { await page.keyboard.press("Tab"); const out = await page.evaluate(() => { const a = document.activeElement; return a && a !== document.body && !document.querySelector("#play-dialog").contains(a) ? (a.id || a.tagName) : null; }); if (out) { escaped = out; break; } }
  ok("modal: Tab never reaches page content behind the dialog", !escaped, escaped);
  await page.keyboard.press("Escape"); await sleep(300);
  ok("Esc closes dialog and focus returns to Play", await page.evaluate(() => !document.querySelector("#play-dialog").open && document.activeElement.id === "menu-play"));
  // every destination
  const dest = { "menu-decks": "decks", "menu-collection": "shop", "menu-shop": "shop", "menu-library": "library", "menu-roster": "roster", "menu-guide": "guide", "menu-lobby": "lobby" };
  for (const [id, view] of Object.entries(dest)) {
    await page.evaluate(() => document.querySelector("#tab-menu").click()); await sleep(250);
    await page.click("#" + id); await sleep(500);
    const v = await page.evaluate(() => document.body.dataset.view);
    const extra = id === "menu-collection" ? await page.evaluate(() => /Your collection/.test(document.querySelector("#shop-root").textContent)) : true;
    ok(`destination ${id} -> ${view}`, v === view && extra, { v, extra });
  }
  await page.click("#tab-menu"); await sleep(200);
  await page.click("#settings-shortcut"); await sleep(300);
  ok("settings shortcut -> profile", await page.evaluate(() => document.body.dataset.view === "profile"));
  ok("library labelled browse-only", await page.evaluate(() => { document.querySelector("#tab-library").click(); return /Browse only/i.test(document.querySelector("#view-library").textContent); }));
  // audio toggle mirrors settings + manager
  await page.click("#tab-menu"); await page.mouse.click(700, 880); await sleep(800);
  await page.click("#audio-toggle"); await sleep(300);
  const mutedState = await page.evaluate(() => ({ pressed: document.querySelector("#audio-toggle").getAttribute("aria-pressed"), box: document.querySelector("#settings-audio-mute").checked, status: document.querySelector("#audio-status").textContent }));
  ok("audio toggle mutes via profile settings", mutedState.pressed === "true" && mutedState.box === true && /muted/i.test(mutedState.status), mutedState);
  await page.click("#audio-toggle"); await sleep(600);
  const playing = (await mediaState(page)).elements.filter((e) => !e.paused).map((e) => e.src);
  ok("unmute resumes the menu theme", playing.includes("Veylattice_ Main Menu.mp3"), playing);
  // Solo Duel refuses an illegal deck: empty the active deck's cards in storage
  await page.evaluate(() => { const k = "veylattice.profile.v2"; const p = JSON.parse(localStorage.getItem(k)); p.economy.decks[0].cardIds = p.economy.decks[0].cardIds.slice(0, 12); localStorage.setItem(k, JSON.stringify(p)); });
  await page.reload({ waitUntil: "networkidle" }); await sleep(600);
  await page.click("#menu-play"); await sleep(400);
  const illegal = await page.evaluate(() => ({ disabled: document.querySelector("#menu-practice-deck").disabled, note: document.querySelector("#play-solo-status").textContent, badge: document.querySelector("#play-deck .vl-badge")?.textContent }));
  ok("Solo Duel refuses illegal deck with the reason", illegal.disabled && /can't be used/.test(illegal.note) && /Not legal/i.test(illegal.badge), illegal);
  // Quick practice starts a match from the dialog; battle music
  await page.click("#menu-practice"); await sleep(3000);
  ok("Quick Practice starts a match", await page.evaluate(() => document.body.dataset.view === "battle" && !document.querySelector("#play-dialog").open));
  // back to menu -> Return to match shown
  await page.click("#tab-menu"); await sleep(400);
  ok("Return to match shown while a match is live", await page.evaluate(() => !!document.querySelector("#menu-continue").offsetParent));
  // Difficulty select bound to settings
  await page.click("#menu-play"); await sleep(300);
  await page.selectOption("#play-difficulty", "veteran"); await sleep(300);
  ok("Play difficulty writes profile setting", await page.evaluate(() => JSON.parse(localStorage.getItem("veylattice.profile.v2")).settings.difficulty === "veteran" || document.querySelector("#settings-difficulty").value === "veteran"));
  await page.keyboard.press("Escape");
  ok("no console errors", consoleLog.filter((c) => /error/.test(c.type) && !/supabase|ERR_BLOCKED/.test(c.text)).length === 0, consoleLog.filter((c) => /error/.test(c.type) && !/supabase|ERR_BLOCKED/.test(c.text)));
  await context.close();
  // reduced motion
  for (const [label, setup] of [["prefers-reduced-motion", async (p) => p.emulateMedia({ reducedMotion: "reduce" })], ["setting", null]]) {
    const { page: p2, context: c2 } = await newPage(browser, { viewport: { width: 1440, height: 900 } });
    await p2.addInitScript((label) => { localStorage.setItem("veylattice.guide.seen.v1", "1"); if (label === "setting") { localStorage.setItem("veylattice.profile.v2", JSON.stringify({ id: "11111111-1111-4111-8111-111111111111", displayName: "Tester", settings: { reducedMotion: true } })); } }, label);
    if (setup) await setup(p2);
    await p2.goto(BASE, { waitUntil: "networkidle" }); await sleep(800);
    const r = await p2.evaluate(() => ({ motion: document.documentElement.dataset.motion, anim: getComputedStyle(document.querySelector(".vl-motes i")).animationName, hero: getComputedStyle(document.querySelector(".vl-fan-card--hero")).animationName }));
    ok(`reduced motion via ${label}`, r.motion === "reduced" && r.anim === "none" && r.hero === "none", r);
    await c2.close();
  }
  // phone: Play visible at 390x844, no overflow
  const { page: p3, context: c3 } = await newPage(browser, { viewport: { width: 390, height: 844 }, isMobile: true });
  await p3.addInitScript(() => localStorage.setItem("veylattice.guide.seen.v1", "1"));
  await p3.goto(BASE, { waitUntil: "networkidle" }); await sleep(800);
  const pb = await p3.locator("#menu-play").boundingBox();
  const sw = await p3.evaluate(() => document.documentElement.scrollWidth);
  ok("phone: Play visible without scrolling, no overflow", pb && pb.y + pb.height <= 844 && sw === 390, { pb, sw });
  const small = await p3.evaluate(() => [...document.querySelectorAll("#view-menu button, .top-actions button")].filter((b) => b.offsetParent).map((b) => { const r = b.getBoundingClientRect(); return { id: b.id || b.textContent.trim().slice(0, 20), w: Math.round(r.width), h: Math.round(r.height) }; }).filter((b) => b.h < 44 || b.w < 44));
  ok("phone: touch targets >= 44px", small.length === 0, small);
  await c3.close();
  await browser.close();
  console.log(JSON.stringify({ pass: res.filter((r) => r.pass).length, fail: res.filter((r) => !r.pass).length }));
})();
