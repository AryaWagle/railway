const { chromium } = require("playwright");

async function run() {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });

  await p.goto("http://127.0.0.1:3001/overview", { waitUntil: "networkidle", timeout: 120000 });
  await p.getByLabel("Open navigation menu").click({ timeout: 10000 });
  await p.getByRole("link", { name: "Suppliers" }).click({ timeout: 10000 });
  await p.waitForTimeout(900);
  console.log("next_mobile_nav_ok", p.url());

  await p.goto("http://127.0.0.1:8501", { waitUntil: "domcontentloaded", timeout: 120000 });
  await p.waitForTimeout(2500);
  const collapseGlyph = p.getByText("keyboard_double_arrow_left").first();
  if (await collapseGlyph.count()) {
    await collapseGlyph.click({ timeout: 5000 });
    await p.waitForTimeout(1200);
  }
  const hasCollapsed = await p.locator('button[data-testid="collapsedControl"]').count();
  console.log("streamlit_collapsed_control_count_after_close", hasCollapsed);

  await b.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
