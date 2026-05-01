const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

async function bodyHas(page, text) {
  const t = await page.locator("body").innerText();
  return t.toLowerCase().includes(text.toLowerCase());
}

async function run() {
  const outDir = path.join(process.cwd(), "test-results", "manual-ui-check-streamlit");
  fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const report = [];

  await p.goto("http://127.0.0.1:8501", { waitUntil: "domcontentloaded", timeout: 120000 });
  await p.waitForTimeout(4500);
  await p.screenshot({ path: path.join(outDir, "overview-initial.png"), fullPage: true });
  report.push("Overview loaded");

  // sac.menu is canvas-like in headless runs; switch pages by clicking menu bands in sidebar.
  const sidebarClicks = [
    { y: 165, expect: "Executive homepage", name: "Overview" },
    { y: 200, expect: "Supplier directory", name: "Suppliers" },
    { y: 234, expect: "Interactive analytics view", name: "Analytics" },
    { y: 270, expect: "Score a supplier (what-if)", name: "Score a supplier" },
    { y: 304, expect: "ROC AUC", name: "Model insights" },
  ];

  for (const row of sidebarClicks) {
    await p.mouse.click(110, row.y);
    await p.waitForTimeout(2200);
    const ok = await bodyHas(p, row.expect);
    report.push(`Page ${row.name}: ${ok ? "ok" : "not-detected"}`);
    await p.screenshot({ path: path.join(outDir, `page-${row.name.replace(/\s+/g, "-").toLowerCase()}.png`), fullPage: true });
  }

  // If suppliers detected, run searches.
  await p.mouse.click(110, 200);
  await p.waitForTimeout(1800);
  if (await bodyHas(p, "Supplier directory")) {
    const search = p.getByLabel("Search").first();
    const searches = ["SUP-00001", "SUP-00012", "Electronics", "India", "Textiles", "SUP-00100", "Auto", "Chem", "SUP-00333", "NonExistingSupplierXYZ"];
    for (const q of searches) {
      await search.fill("");
      await search.fill(q);
      await p.waitForTimeout(1200);
      report.push(`Search run ${q}`);
    }
    await p.screenshot({ path: path.join(outDir, "suppliers-10-searches.png"), fullPage: true });
  } else {
    report.push("Suppliers page not reliably detected in headless sidebar interaction");
  }

  // Analytics tabs if on Analytics page
  await p.mouse.click(110, 234);
  await p.waitForTimeout(1800);
  if (await bodyHas(p, "Interactive analytics view")) {
    const tabs = ["Executive", "Trends", "Quality & Correlations", "Data Export"];
    for (const t of tabs) {
      await p.getByRole("tab", { name: t }).click({ timeout: 10000 });
      await p.waitForTimeout(1000);
      report.push(`Analytics tab ${t}: ok`);
    }
    await p.screenshot({ path: path.join(outDir, "analytics-tabs.png"), fullPage: true });
  } else {
    report.push("Analytics page not reliably detected in headless sidebar interaction");
  }

  await p.setViewportSize({ width: 390, height: 844 });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: path.join(outDir, "mobile-current.png"), fullPage: true });
  report.push("Mobile screenshot captured");

  fs.writeFileSync(path.join(outDir, "report.txt"), report.join("\n") + "\n", "utf8");
  console.log(report.join("\n"));
  await b.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
