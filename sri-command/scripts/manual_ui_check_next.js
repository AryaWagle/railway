const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

async function run() {
  const outDir = path.join(process.cwd(), "test-results", "manual-ui-check-next");
  fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const report = [];
  const shot = async (n) => p.screenshot({ path: path.join(outDir, n), fullPage: true });

  const pages = ["/overview", "/suppliers", "/analytics", "/what-if", "/model-insights"];
  for (const route of pages) {
    await p.goto(`http://127.0.0.1:3000${route}`, { waitUntil: "networkidle", timeout: 120000 });
    await p.waitForTimeout(1200);
    report.push(`Page ok ${route}`);
    await shot(`page-${route.replace(/\//g, "_").replace(/^_/, "")}.png`);
  }

  await p.goto("http://127.0.0.1:3000/suppliers", { waitUntil: "networkidle", timeout: 120000 });
  await p.waitForTimeout(1200);
  const searches = [
    "bangladesh",
    "india",
    "vietnam",
    "electronics",
    "apparel",
    "mexico",
    "germany",
    "turkiye",
    "logistics",
    "nonexistent987",
  ];
  const box = p.getByLabel("Facility search query").first();
  for (const q of searches) {
    await box.fill("");
    await box.fill(q);
    await p.keyboard.press("Enter");
    await p.waitForTimeout(1200);
    report.push(`Search ${q} -> ${p.url()}`);
  }
  await shot("suppliers-10-searches.png");

  await p.goto("http://127.0.0.1:3000/analytics", { waitUntil: "networkidle", timeout: 120000 });
  const tabs = ["Executive", "Trends", "Quality", "Portfolio (5k)"];
  for (const t of tabs) {
    await p.getByText(t, { exact: true }).first().click({ timeout: 10000 });
    await p.waitForTimeout(1000);
    report.push(`Analytics tab ok ${t}`);
  }
  await shot("analytics-tabs.png");

  await p.setViewportSize({ width: 390, height: 844 });
  await p.goto("http://127.0.0.1:3000/overview", { waitUntil: "networkidle", timeout: 120000 });
  await p.waitForTimeout(1000);
  await shot("overview-mobile.png");
  report.push("Mobile viewport shot captured");

  fs.writeFileSync(path.join(outDir, "report.txt"), report.join("\n") + "\n", "utf8");
  console.log(report.join("\n"));
  await b.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
