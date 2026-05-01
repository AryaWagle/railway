import { test, expect } from "@playwright/test";

test.describe("visual / functional smoke", () => {
  test("overview HUD renders", async ({ page }) => {
    await page.goto("/overview");
    await expect(page.getByRole("heading", { name: /GLOBAL COMMAND/i })).toBeVisible();
    await expect(page.locator("#main-content")).toBeVisible();
  });

  test("analytics page renders", async ({ page }) => {
    await page.goto("/analytics");
    await expect(page.getByRole("heading", { name: /ANALYTICS COMMAND/i })).toBeVisible();
  });

  test("skip link targets main content", async ({ page }) => {
    await page.goto("/overview");
    const skip = page.getByRole("link", { name: /skip to main content/i });
    await expect(skip).toBeAttached();
    await skip.focus();
    await expect(skip).toBeFocused();
  });
});
