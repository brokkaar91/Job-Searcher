import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers";

async function audit(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const summary = results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.length}× ${v.nodes[0]?.target.join(" ")}`,
  );
  expect(summary, summary.join("\n")).toEqual([]);
}

test.describe("accessibility (axe, WCAG 2.1 AA)", () => {
  for (const path of [
    "/",
    "/how-matching-works",
    "/faq",
    "/employers",
    "/login",
    "/register",
    "/en/privacy",
  ]) {
    test(`public ${path}`, async ({ page }) => {
      await page.goto(path);
      await audit(page);
    });
  }

  for (const scheme of ["light", "dark"] as const) {
    test(`app pages (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await signIn(page, "demo.data@jobmatch.local", "/matches");
      await audit(page);
      await page.locator("main h2 a").first().click();
      await expect(page.getByText("Matchscore")).toBeVisible();
      await audit(page);
      for (const p of ["/tracker", "/profile", "/privacy-center", "/alerts"]) {
        await page.goto(p);
        await audit(page);
      }
    });
  }

  test("onboarding step (interests)", async ({ page }) => {
    await signIn(page, "demo.nurse@jobmatch.local", "/onboarding/interests");
    await audit(page);
  });
});
