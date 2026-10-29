// Task 2: two independent browser contexts play an online-lobby match over a
// relayed Supabase Realtime test double (Supabase itself is unreachable from
// this sandbox: egress 403). Usage: node lobby-e2e.cjs [guestClockOffsetMs]
const fs = require("fs");
const path = require("path");
const { launch, newPage, BASE, S } = require("./harness.cjs");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MOCK = fs.readFileSync(path.join(S, "supabase-mock.js"), "utf8");
const skew = Number(process.argv[2] || 0);
const MAX_TURNS = Number(process.argv[3] || 6);

(async () => {
  const browser = await launch();
  const out = { skewMs: skew, steps: [] };
  const step = (name, ok, detail) => { out.steps.push({ name, ok, detail }); console.error((ok ? "PASS " : "FAIL ") + name + (detail ? " :: " + JSON.stringify(detail).slice(0, 300) : "")); };
  const A = await newPage(browser, { supabaseMock: MOCK });
  const B = await newPage(browser, { supabaseMock: MOCK, clockOffsetMs: skew });
  const peers = { A, B };
  // Relay: ordered per destination.
  const queues = { A: Promise.resolve(), B: Promise.resolve() };
  const relayLog = [];
  for (const [me, other] of [["A", "B"], ["B", "A"]]) {
    await peers[me].page.exposeBinding("__relaySend", (_src, name, msg) => {
      relayLog.push({ from: me, kind: msg.kind, event: msg.event });
      queues[other] = queues[other].then(() => sleep(60)).then(() =>
        peers[other].page.evaluate(([n, m]) => (globalThis.__relayDeliver ? globalThis.__relayDeliver(n, m) : false), [name, msg]).catch(() => false));
    });
  }
  for (const p of [A, B]) {
    await p.page.goto(BASE, { waitUntil: "networkidle" });
    await p.page.mouse.click(5, 5);
    await p.page.click("#tab-lobby");
    await sleep(500);
  }
  const lobbyText = (p) => p.page.textContent("#lobby-root").then((t) => t.replace(/\s+/g, " "));

  // 1. Host creates.
  await A.page.click("#lobby-root >> text=Create room");
  await sleep(1200);
  const h3 = await A.page.textContent("#lobby-root h3").catch(() => "");
  const code = (h3.match(/Room ([A-Z0-9]{6})/) || [])[1];
  step("host creates room", !!code, { h3 });

  // 2. Guest joins.
  await B.page.fill("#lobby-code-input", code);
  await B.page.click("#lobby-root >> text=Join room");
  let joined = false;
  for (let i = 0; i < 20 && !joined; i += 1) {
    await sleep(400);
    const t = await lobbyText(B);
    joined = /Seat 2 — You/.test(t) && /Seat 1 — /.test(t) && !/Seat 1 — open/.test(t);
  }
  step("guest seated after join", joined, { guest: (await lobbyText(B)).slice(0, 400) });
  const hostSeesGuest = /Seat 2 — (?!open)/.test(await lobbyText(A));
  step("host sees guest seated", hostSeesGuest, { host: (await lobbyText(A)).slice(0, 400) });
  if (!joined || !hostSeesGuest) { finish(); return; }

  // 3. Deck + ready, both.
  for (const p of [A, B]) {
    await p.page.selectOption("#lobby-root select", { index: 1 });
    await sleep(500);
  }
  for (const p of [A, B]) {
    await p.page.click("#lobby-root >> text=Ready up");
    await sleep(700);
  }
  await sleep(800);
  const aReady = await lobbyText(A), bReady = await lobbyText(B);
  step("both seats READY on both clients", (aReady.match(/READY/g) || []).length === 2 && (bReady.match(/READY/g) || []).length === 2, { aReady: aReady.slice(0, 500), bReady: bReady.slice(0, 500) });
  const startEnabled = await A.page.isEnabled("#lobby-root >> text=Start match");
  step("host Start enabled", startEnabled);
  if (!startEnabled) { finish(); return; }

  // 4. Start.
  await A.page.click("#lobby-root >> text=Start match");
  await sleep(3000);
  const views = await Promise.all([A, B].map((p) => p.page.evaluate(() => document.body.dataset.view)));
  step("both clients enter battle", views.every((v) => v === "battle"), { views });
  for (const p of [A, B]) {
    if ((await p.page.textContent("#arena-toggle")).match(/classic/i)) await p.page.click("#arena-toggle");
    await sleep(400);
  }

  const fingerprint = (p) => p.page.evaluate(() => ({
    turn: document.querySelector("#turn-number")?.textContent?.trim(),
    owner: document.querySelector("#turn-owner")?.textContent?.trim(),
    me: document.querySelector("#player-vitality")?.textContent?.trim(),
    foe: document.querySelector("#enemy-vitality")?.textContent?.trim(),
    myFlux: document.querySelector("#flux-count")?.textContent?.trim(),
    myField: document.querySelector("#player-vessel-slots")?.dataset.occupied,
    foeField: document.querySelector("#enemy-vessel-slots")?.dataset.occupied,
    myUnitCount: document.querySelector("#unit-count")?.textContent?.trim(),
    cells: [...document.querySelectorAll("#board .cell")].map((c) => c.getAttribute("aria-label").replace(", legal summon tile", "")).filter((l) => !/empty$/.test(l)),
    over: !document.querySelector("#result-overlay").hidden,
    log: [...document.querySelectorAll("#log-list li")].slice(0, 4).map((li) => li.textContent.trim()),
  }));
  const agree = async (label) => {
    await sleep(1500);
    const [fa, fb] = await Promise.all([fingerprint(A), fingerprint(B)]);
    const same = fa.turn === fb.turn && fa.me === fb.foe && fa.foe === fb.me && fa.myField === fb.foeField && fa.foeField === fb.myField && JSON.stringify(fa.cells) === JSON.stringify(fb.cells);
    step(`states agree: ${label}`, same, same ? { turn: fa.turn, units: fa.cells.length, fieldsA: [fa.myField, fa.foeField], fieldsB: [fb.myField, fb.foeField] } : { fa, fb });
    return { fa, fb, same };
  };
  await agree("after start");

  // 5. Play turns: active side summons one affordable Vessel if it can, then ends turn.
  const whoseTurn = async () => {
    for (const [k, p] of Object.entries(peers)) if (await p.page.isEnabled("#end-turn-btn")) return k;
    return null;
  };
  let summons = 0;
  for (let t = 0; t < MAX_TURNS; t += 1) {
    const k = await whoseTurn();
    if (!k) { step("an active seat exists", false, { turn: t }); break; }
    const p = peers[k].page;
    const cards = await p.$$("#hand .card.vessel, #hand .card.Vessel, #hand .card");
    let summoned = false;
    for (const c of cards) {
      const cls = await c.getAttribute("class");
      if (!/vessel/i.test(cls)) continue;
      if (await c.$(".unaffordable")) continue;
      await c.click();
      await sleep(300);
      const legal = await p.$("#board .cell.legal");
      if (legal) {
        await legal.click();
        await sleep(400);
        const confirm = await p.$("#play-card-btn:not([disabled])");
        if (confirm && (await confirm.isVisible())) { await confirm.click(); await sleep(300); }
        summoned = true; summons += 1;
        break;
      }
      await p.click("#cancel-btn").catch(() => {});
    }
    await agree(`turn ${t + 1} after ${k} ${summoned ? "summon" : "no summon"}`);
    await p.click("#end-turn-btn");
    await agree(`turn ${t + 1} after ${k} end turn`);
  }
  step("at least one summon synced", summons > 0, { summons });

  // 6. Forged / invalid commands injected straight into the host's channel.
  const inject = async (envelope) => {
    await A.page.evaluate(([n, env]) => globalThis.__relayDeliver(n, { kind: "broadcast", event: "command", payload: { envelope: env, from: "forger" } }), [`veylattice-room-${code}`, envelope]);
    await sleep(500);
    return (await fingerprint(A)).log[0];
  };
  const active = await whoseTurn();
  const guestId = await B.page.evaluate(() => JSON.parse(Object.values(localStorage).find((v) => v.includes('"id"') && v.includes("displayName")) || "{}").id ?? null).catch(() => null);
  const first = await inject({ seq: 999, commandId: "f0", seat: 1, playerId: guestId, command: { type: "endTurn" } });
  const expected = Number((first.match(/expected seq (\d+)/) || [])[1]);
  step("forged command rejected: stale/out-of-order seq", /rejected/i.test(first) && Number.isFinite(expected), { first });
  const hostId = await A.page.evaluate(() => JSON.parse(Object.values(localStorage).find((v) => v.includes('"id"') && v.includes("displayName")) || "{}").id ?? null).catch(() => null);
  const foeOfActive = active === "A" ? 1 : 0;
  const activeSeat = active === "A" ? 0 : 1;
  const forged = [
    ["malformed (no id)", { seq: expected, seat: activeSeat, command: { type: "endTurn" } }, /needs an id/],
    ["non-active seat", { seq: expected, commandId: "f2", seat: foeOfActive, playerId: guestId, command: { type: "endTurn" } }, /not the active seat/],
    ["author does not own seat", { seq: expected, commandId: "f3", seat: activeSeat, playerId: "intruder", command: { type: "endTurn" } }, /does not own/],
    ["engine-illegal summon from the right author", { seq: expected, commandId: "f4", seat: activeSeat, playerId: activeSeat === 0 ? hostId : guestId, command: { type: "summon", instanceId: "no-such-card", x: 0, y: 0 } }, /rejected|diverged/],
  ];
  for (const [label, env, re] of forged) {
    const before = await fingerprint(A);
    const line = await inject(env);
    const after = await fingerprint(A);
    step(`forged command rejected: ${label}`, re.test(line) && before.turn === after.turn && JSON.stringify(before.cells) === JSON.stringify(after.cells), { line });
  }
  await agree("after forged commands");

  // 7. Optional: idle through one turn deadline (120 s) and confirm both pass it identically.
  if (process.env.E2E_TIMEOUT === "1") {
    const before = await fingerprint(A);
    await sleep(126000);
    const { fa } = await agree("after an idle 120 s turn deadline");
    step("deadline passed the turn", fa.turn !== before.turn || fa.owner !== before.owner, { before: before.owner, after: fa.owner, log: fa.log });
  }

  // 8. Guest leaves mid-match: host must be told, board frozen, no AI takeover.
  await B.page.click("#tab-lobby");
  await sleep(500);
  await B.page.click("#lobby-root >> text=Leave room");
  await sleep(2000);
  const guestAfter = await B.page.evaluate(() => ({ battleTabDisabled: document.querySelector("#tab-battle").disabled, view: document.body.dataset.view }));
  step("leaver: match cleared, no AI takeover", guestAfter.battleTabDisabled === true, guestAfter);
  const hostMsg = await A.page.textContent("#game-message");
  const hostEndTurn = await A.page.isEnabled("#end-turn-btn");
  await A.page.click("#tab-lobby");
  await sleep(800);
  const hostH3 = await A.page.textContent("#lobby-root h3").catch(() => "");
  step("host told opponent left; board frozen", /opponent left/i.test(hostMsg) && !hostEndTurn && /finished/.test(hostH3), { hostMsg, hostEndTurn, hostH3 });
  await A.page.click("#lobby-root >> text=Leave room");
  await sleep(800);
  const hostAfter = await A.page.evaluate(() => ({ battleTabDisabled: document.querySelector("#tab-battle").disabled, lobby: document.querySelector("#lobby-root").textContent.includes("Create room") }));
  step("host leaves: back to Create/Join, match cleared", hostAfter.battleTabDisabled && hostAfter.lobby, hostAfter);
  finish();

  function finish() {
    out.relayCounts = relayLog.reduce((m, r) => { const k = `${r.from}:${r.kind}:${r.event ?? ""}`; m[k] = (m[k] || 0) + 1; return m; }, {});
    out.consoleA = A.consoleLog.filter((c) => !/supabase\.co|ERR_BLOCKED_BY_CLIENT|ERR_ABORTED/.test(c.text));
    out.consoleB = B.consoleLog.filter((c) => !/supabase\.co|ERR_BLOCKED_BY_CLIENT|ERR_ABORTED/.test(c.text));
    console.log(JSON.stringify(out, null, 1));
    browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
