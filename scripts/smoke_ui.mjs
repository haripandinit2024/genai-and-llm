/**
 * End-to-end UI smoke test driven through the Chrome DevTools Protocol.
 *
 * Usage (from the repo root, with the backend and `npm run dev` already running):
 *   1. start Chrome with remote debugging:
 *        chrome --headless=new --remote-debugging-port=9222 --user-data-dir=.chrome-profile
 *   2. node scripts/smoke_ui.mjs
 *
 * Environment overrides: APP_URL (default http://localhost:5174/), CDP_PORT (default 9222).
 */

const APP_URL = process.env.APP_URL ?? "http://localhost:5174/";
const CDP_PORT = process.env.CDP_PORT ?? "9222";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function findPageTarget() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
      const targets = await response.json();
      const page = targets.find((target) => target.type === "page" && target.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      /* chrome is still starting */
    }
    await sleep(500);
  }
  throw new Error(`No debuggable page on port ${CDP_PORT}. Start Chrome with --remote-debugging-port.`);
}

class DevTools {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      const resolver = this.pending.get(message.id);
      if (resolver) {
        this.pending.delete(message.id);
        resolver(message);
      }
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve) => {
      this.pending.set(id, resolve);
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const response = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    const result = response.result?.result;
    if (response.result?.exceptionDetails) {
      throw new Error(response.result.exceptionDetails.text);
    }
    return result?.value;
  }
}

const checks = [];
function check(name, ok, detail = "") {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function waitFor(devtools, expression, description, timeoutMs = 25_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if (await devtools.evaluate(expression)) return true;
    } catch {
      /* page mid-navigation */
    }
    await sleep(300);
  }
  throw new Error(`Timed out waiting for ${description}`);
}

const clickButton = (label) => `(() => {
  const nodes = [...document.querySelectorAll('button')];
  const target = nodes.find((node) => (node.textContent || '').includes(${JSON.stringify(label)}) && !node.disabled);
  if (!target) return false;
  target.click();
  return true;
})()`;

/**
 * The chat reply and the composer settle in the same React commit, so a button
 * can be present a tick before it is safe to click. Wait for the label to exist
 * *and* be enabled, otherwise the click is silently dropped and every later
 * assertion is testing stale state.
 */
const waitForEnabledButton = (label) => `(() => {
  const nodes = [...document.querySelectorAll('button')];
  const target = nodes.find((node) => (node.textContent || '').includes(${JSON.stringify(label)}));
  return !!target && !target.disabled;
})()`;

async function clickWhenReady(devtools, label, timeoutMs = 25_000) {
  await waitFor(devtools, waitForEnabledButton(label), `"${label}" to become clickable`, timeoutMs);
  const clicked = await devtools.evaluate(clickButton(label));
  if (!clicked) throw new Error(`Could not click "${label}" after it became enabled.`);
}

const consoleOutput = "document.querySelector('.console-output')?.innerText ?? ''";

/**
 * Icons are only "unique" if their rendered geometry differs. This derives a
 * signature from each <svg>'s drawing children and compares icons *by button
 * kind*, not by DOM instance: twelve "Open in chat" buttons are supposed to
 * share a glyph, but "Open in chat" and "Visualize" must not.
 *
 * Two failure modes matter, and they are opposites:
 *   inconsistent — one button kind rendering different glyphs on different rows
 *   collisions   — two different button kinds rendering the same glyph
 */
const iconGeometryAudit = (groups) => `(() => {
  const signature = (svg) => {
    if (!svg) return "MISSING";
    const parts = [...svg.querySelectorAll('path, line, circle, rect, polyline, polygon')]
      .map((node) => node.tagName + ':' + (node.getAttribute('d') ?? node.getAttribute('x1') ?? node.getAttribute('cx') ?? node.getAttribute('points') ?? ''));
    return parts.length ? parts.join('|') : "EMPTY";
  };
  const report = {};
  for (const [name, selector] of Object.entries(${JSON.stringify(groups)})) {
    const nodes = [...document.querySelectorAll(selector)];
    const byLabel = new Map();
    let missing = 0;
    for (const node of nodes) {
      const label = (node.innerText || '').trim().split('\\n')[0] || node.getAttribute('aria-label') || '(unlabelled)';
      const sig = signature(node.querySelector('svg.icon'));
      if (sig === 'MISSING' || sig === 'EMPTY') missing += 1;
      if (!byLabel.has(label)) byLabel.set(label, new Set());
      byLabel.get(label).add(sig);
    }
    const inconsistent = [...byLabel.entries()]
      .filter(([, sigs]) => sigs.size > 1)
      .map(([label]) => label);
    const bySignature = new Map();
    for (const [label, sigs] of byLabel) {
      for (const sig of sigs) {
        if (!bySignature.has(sig)) bySignature.set(sig, []);
        bySignature.get(sig).push(label);
      }
    }
    const collisions = [...bySignature.values()].filter((labels) => labels.length > 1);
    report[name] = { count: nodes.length, kinds: byLabel.size, missing, inconsistent, collisions };
  }
  return report;
})()`;

const describeGeometry = (result) =>
  result.collisions.length
    ? `collide: ${JSON.stringify(result.collisions)}`
    : result.inconsistent.length
      ? `inconsistent: ${JSON.stringify(result.inconsistent)}`
      : result.count === 0
        ? "group was empty — selector matched nothing"
        : `${result.kinds} kinds / ${result.count} buttons, all distinct`;

const checkGeometry = (group, result) =>
  check(
    `"${group}" have one distinct icon per action`,
    result.count > 0 &&
      result.missing === 0 &&
      result.inconsistent.length === 0 &&
      result.collisions.length === 0,
    describeGeometry(result),
  );

async function main() {
  const socketUrl = await findPageTarget();
  const socket = new WebSocket(socketUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve);
    socket.addEventListener("error", reject);
  });
  const devtools = new DevTools(socket);

  await devtools.send("Page.enable");
  await devtools.send("Runtime.enable");
  await devtools.send("Page.navigate", { url: APP_URL });

  await waitFor(devtools, "!!document.querySelector('.sidebar')", "the studio shell");
  check("shell renders", true);

  await waitFor(
    devtools,
    "document.body.innerText.includes('Backend online')",
    "the backend health chip",
    20_000,
  );
  check("backend reachable from the UI", true);

  // ── Chat: quick action, then Run Code ──
  await clickWhenReady(devtools, "Fibonacci Sequence");
  await waitFor(devtools, "!!document.querySelector('.code-block-container')", "a generated snippet");
  await waitFor(devtools, "!!document.querySelector('.console-entry')", "console activity");
  check("chat generates a runnable snippet", true);

  // Must wait for the button to be enabled, otherwise the click is a no-op and
  // the assertions below would pass on the assistant's prose instead.
  await clickWhenReady(devtools, "Run Code");
  await waitFor(
    devtools,
    "document.querySelector('.console-output')?.innerText.includes('First 15 Fibonacci numbers') ?? false",
    "sandbox stdout in the console",
  );
  check("Run Code streams real sandbox output", true);

  // Assert against the console body (real execution output), not document.body,
  // which also contains the generated snippet and the assistant's explanation.
  const consoleText = await devtools.evaluate(consoleOutput);
  // `.console-status` is uppercased in CSS, so compare case-insensitively.
  const statusText = (
    await devtools.evaluate("document.querySelector('.console-status')?.innerText ?? ''")
  ).trim();
  check(
    "console reports a clean exit",
    /status=0/.test(consoleText) && statusText.toLowerCase() === "success",
    `${statusText} · ${(consoleText.match(/status=\d+[^\n]*/) ?? ["no status line"])[0]}`,
  );

  // ── Visualizer views ──
  await clickWhenReady(devtools, "Visualizer Studio");
  await waitFor(devtools, "!!document.querySelector('.array-container')", "the sorting canvas");
  check("sorting visualizer renders", true);

  await clickWhenReady(devtools, "Stack & Queue");
  await waitFor(devtools, "document.querySelectorAll('.structure-panel').length >= 2", "stack and queue panels");
  const structures = await devtools.evaluate("document.querySelector('.structure-grid')?.innerText ?? ''");
  check("stack and queue are independent", structures.includes("Stack (LIFO)") && structures.includes("Queue (FIFO)"));

  await clickWhenReady(devtools, "Binary Tree");
  await waitFor(devtools, "document.querySelectorAll('.tree-canvas circle').length >= 7", "tree nodes");
  check("binary search tree draws nodes", true);

  // ── Presets ──
  await clickWhenReady(devtools, "Presets Library");
  await waitFor(devtools, "document.querySelectorAll('.preset-card').length >= 10", "the preset grid");
  const presetCount = await devtools.evaluate("document.querySelectorAll('.preset-card').length");
  check("presets load from the backend", presetCount >= 10, `${presetCount} cards`);

  // ── Diff studio ──
  await clickWhenReady(devtools, "Diff Viewer");
  await waitFor(devtools, "!!document.querySelector('.diff-editor')", "the diff editor");
  await clickWhenReady(devtools, "Run refactor pass");
  await waitFor(devtools, "document.querySelectorAll('.finding').length >= 1", "refactor findings");
  const diffChips = await devtools.evaluate("document.querySelector('.diff-stats')?.innerText ?? ''");
  check("refactor pass reports findings", /rewrites applied|findings/.test(diffChips), diffChips.replace(/\n/g, " "));

  // ── Benchmarks ──
  await clickWhenReady(devtools, "Benchmarks");
  await waitFor(devtools, "!!document.querySelector('.benchmark-table')", "the benchmark table");
  await clickWhenReady(devtools, "Run benchmark");
  await waitFor(devtools, "document.querySelectorAll('.benchmark-row').length >= 5", "benchmark rows");
  const benchmarkText = await devtools.evaluate("document.querySelector('.benchmark-table')?.innerText ?? ''");
  check("benchmarks produce measurements", benchmarkText.includes("ms"), benchmarkText.split("\n")[1]);

  // ── Icon system ────────────────────────────────────────────────────────
  // Guards the invariants the registry is supposed to hold, so a future edit
  // cannot quietly reintroduce a raw lucide import, a zero-size glyph or an
  // unlabelled icon-only control.
  await clickWhenReady(devtools, "Chat Studio");

  const auditExpression = `(() => {
    const scope = document.querySelector('.app-container');
    const svgs = [...scope.querySelectorAll('svg')];
    const bare = svgs.filter((svg) => !svg.classList.contains('icon'));
    const collapsed = svgs.filter((svg) => {
      const box = svg.getBoundingClientRect();
      return box.width === 0 || box.height === 0;
    });
    const badA11y = svgs.filter((svg) => {
      const hidden = svg.getAttribute('aria-hidden') === 'true';
      const label = svg.getAttribute('aria-label');
      if (hidden && label) return true;
      if (!hidden && !label) return true;
      return Boolean(label) && svg.getAttribute('role') !== 'img';
    });
    const namelessIconButtons = [...scope.querySelectorAll('button')]
      .filter((button) => button.querySelector('svg.icon') && !button.textContent.trim())
      .filter((button) => !button.getAttribute('aria-label') && !button.getAttribute('title'))
      .length;
    return {
      total: svgs.length,
      bare: bare.length,
      collapsed: collapsed.length,
      badA11y: badA11y.length,
      namelessIconButtons,
    };
  })()`;

  const audit = await devtools.evaluate(auditExpression);
  check(
    "every icon goes through the <Icon> wrapper",
    audit.total > 0 && audit.bare === 0,
    `${audit.total} icons, ${audit.bare} raw`,
  );
  check("no icon renders at zero size", audit.collapsed === 0, `${audit.collapsed} collapsed`);
  check(
    "icons are correctly exposed to assistive tech",
    audit.badA11y === 0,
    `${audit.badA11y} malformed of ${audit.total}`,
  );
  check(
    "icon-only buttons expose an accessible name",
    audit.namelessIconButtons === 0,
    `${audit.namelessIconButtons} unnamed`,
  );

  // Each studio view must render exactly the one icon that identifies it, in the
  // sidebar, the top bar and the page heading — that is the consistency rule.
  const headingExpression = (viewLabel) => `(() => {
    const heading = document.querySelector('.view-heading, .viz-title');
    const headingIcons = heading ? heading.querySelectorAll('svg.icon').length : 0;
    const navIcons = [...document.querySelectorAll('.sidebar-nav-item')]
      .filter((item) => item.textContent.includes(${JSON.stringify(viewLabel)}))
      .map((item) => item.querySelectorAll('svg.icon').length);
    const topbarIcons = document.querySelectorAll('.topbar-title svg.icon').length;
    return { headingIcons, navIcons, topbarIcons };
  })()`;

  const views = ["Chat Studio", "Visualizer Studio", "Benchmarks", "Diff Viewer", "Presets Library"];
  const headingReport = [];
  for (const label of views) {
    await clickWhenReady(devtools, label);
    await sleep(150);
    const result = await devtools.evaluate(headingExpression(label));
    headingReport.push(`${label}: nav=${result.navIcons.join("/")} top=${result.topbarIcons} head=${result.headingIcons}`);
    if (result.topbarIcons !== 1 || result.navIcons.some((count) => count !== 1)) {
      check(`"${label}" is identified by exactly one icon`, false, JSON.stringify(result));
    } else if (label !== "Chat Studio" && result.headingIcons < 1) {
      check(`"${label}" is identified by exactly one icon`, false, `heading has no icon`);
    } else {
      check(`"${label}" is identified by exactly one icon`, true);
    }
  }

  // Diff stats and preset actions used to be bare text — assert the glyphs are
  // actually painted, not just present in the DOM.
  await clickWhenReady(devtools, "Diff Viewer");
  await clickWhenReady(devtools, "Run refactor pass");
  await waitFor(devtools, "document.querySelectorAll('.finding').length >= 1", "refactor findings");
  const diffIconCounts = await devtools.evaluate(`(() => ({
    stats: document.querySelectorAll('.diff-stats .diff-chip svg.icon').length,
    panes: document.querySelectorAll('.pane-title svg.icon').length,
    findings: document.querySelectorAll('.finding-icon svg.icon').length,
    toggles: document.querySelectorAll('.segmented button svg.icon').length,
  }))()`);
  check(
    "diff studio is fully iconographic",
    diffIconCounts.stats >= 3 &&
      diffIconCounts.panes === 2 &&
      diffIconCounts.findings >= 1 &&
      diffIconCounts.toggles === 2,
    JSON.stringify(diffIconCounts),
  );

  await clickWhenReady(devtools, "Presets Library");
  await waitFor(devtools, "document.querySelectorAll('.preset-card').length >= 10", "the preset grid");
  const galleryIconCounts = await devtools.evaluate(`(() => ({
    heading: document.querySelectorAll('.view-heading svg.icon').length,
    search: document.querySelectorAll('.search-box svg.icon').length,
    actions: document.querySelectorAll('.preset-actions .btn-code-action svg.icon').length,
    cards: document.querySelectorAll('.preset-card').length,
  }))()`);
  check(
    "preset gallery is fully iconographic",
    galleryIconCounts.heading === 1 &&
      galleryIconCounts.search === 1 &&
      galleryIconCounts.actions >= galleryIconCounts.cards,
    JSON.stringify(galleryIconCounts),
  );

  console.log(`\n  icon headings → ${headingReport.join(" | ")}`);

  // ── Icon geometry is distinct wherever two glyphs sit side by side ───────
  // These groups live on the chat view, so navigate back before auditing.
  await clickWhenReady(devtools, "Chat Studio");
  await waitFor(devtools, "!!document.querySelector('.code-block-container')", "the chat transcript");
  const groups = {
    "sidebar nav": ".sidebar-nav-item",
    "agent cards": ".agent-card",
    "console tools": ".console-tools .icon-btn",
    "code block actions": ".code-actions .btn-code-action",
  };
  const chatGeometry = await devtools.evaluate(iconGeometryAudit(groups));
  for (const [group, result] of Object.entries(chatGeometry)) {
    checkGeometry(group, result);
  }

  await clickWhenReady(devtools, "Visualizer Studio");
  checkGeometry(
    "visualizer modes",
    (await devtools.evaluate(
      iconGeometryAudit({ "visualizer modes": ".viz-header .viz-controls .btn-viz-control" }),
    ))["visualizer modes"],
  );

  // The structure-operation buttons all render together in Stack & Queue and
  // used to share a single "+"/"↺" pair, so this is the highest-value group.
  await clickWhenReady(devtools, "Stack & Queue");
  checkGeometry(
    "stack & queue operations",
    (await devtools.evaluate(
      iconGeometryAudit({
        "stack & queue operations": ".structure-grid ~ .viz-toolbar .btn-viz-control, .viz-section .btn-viz-control",
      }),
    ))["stack & queue operations"],
  );

  await clickWhenReady(devtools, "Presets Library");
  await waitFor(devtools, "document.querySelectorAll('.preset-card').length >= 10", "the preset grid");
  // Target the individual buttons, not the .preset-actions wrapper — the wrapper
  // holds two icons, so auditing it would only ever read the first one.
  checkGeometry(
    "preset actions",
    (await devtools.evaluate(
      iconGeometryAudit({ "preset actions": ".preset-card .preset-actions .btn-code-action" }),
    ))["preset actions"],
  );

  // The per-preset icons live on the welcome screen's quick actions, not on the
  // gallery cards (a card only shows a tag, complexity and two action buttons).
  // Reload so the transcript is empty and the welcome screen is on screen again.
  await devtools.send("Page.navigate", { url: APP_URL });
  await waitFor(devtools, "!!document.querySelector('.quick-action-card')", "the welcome quick actions");
  checkGeometry(
    "welcome quick actions",
    (await devtools.evaluate(
      iconGeometryAudit({ "welcome quick actions": ".quick-action-card" }),
    ))["welcome quick actions"],
  );

  socket.close();
  const failed = checks.filter((entry) => !entry.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} UI checks passed.`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((error) => {
  console.error(`\nUI smoke test failed: ${error.message}`);
  process.exit(1);
});
