import { expect, test } from "@playwright/test";

test("homepage renders in Dutch by default and English under /en", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "nl");
  await page.goto("/en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});
