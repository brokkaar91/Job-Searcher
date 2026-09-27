import path from "node:path";
import { expect, test } from "@playwright/test";
import { createTestUser, deleteUser, signIn } from "./helpers";

test.describe("onboarding", () => {
  let user: { email: string; id: string };
  test.beforeAll(async () => {
    user = await createTestUser("onboarding");
  });
  test.afterAll(async () => {
    await deleteUser(user.id);
  });

  test("CV upload → review → status → preferences → interests → values → matches", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await signIn(page, user.email, "/onboarding");
    await expect(page).toHaveURL(/\/onboarding\/cv/);
    await expect(page.getByText("Stap 1 van 5")).toBeVisible();

    // 1a. CV upload (parsed by the offline mock parser in dev/test)
    await page
      .locator("input[type=file]")
      .setInputFiles(path.join(__dirname, "fixtures/sample-cv.pdf"));
    await page.getByRole("button", { name: "Uploaden en analyseren" }).click();

    // 1b. Review: parsed skills are shown, name/contact data are not
    await expect(page).toHaveURL(/\/onboarding\/review/, { timeout: 30_000 });
    await expect(page.getByText("Apache Airflow")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Functietitel" }).first()).toHaveValue(
      "Senior Data Engineer",
    );
    await expect(page.getByText("Alex Morgan")).toHaveCount(0);
    await page.getByRole("button", { name: "Volgende" }).click();

    // 2. Languages
    await expect(page).toHaveURL(/\/onboarding\/status/);
    await page.getByRole("button", { name: "Volgende" }).click();

    // 3. Preferences
    await expect(page).toHaveURL(/\/onboarding\/preferences/);
    await page.getByLabel("Waar woon je?").selectOption("Amsterdam");
    await page.getByText("Hybride", { exact: true }).click();
    await page.getByRole("button", { name: "Volgende" }).click();

    // 4. Interests: 5 pages × 6 items
    await expect(page).toHaveURL(/\/onboarding\/interests/);
    for (let p = 0; p < 5; p++) {
      await expect(page.getByText(`pagina ${p + 1} van 5`)).toBeVisible();
      const groups = page.locator("fieldset");
      const count = await groups.count();
      for (let i = 0; i < count; i++) {
        // options: 1..5 → click "Leuk" (4) or "Weet niet" (3) via its visible label
        const option = groups
          .nth(i)
          .locator("label")
          .nth(i % 2 ? 3 : 2);
        await option.click();
        await expect(option.locator("input")).toBeChecked();
      }
      await page.getByRole("button", { name: p < 4 ? "Volgende vragen" : "Volgende" }).click();
    }

    // 5. Values → complete
    await expect(page).toHaveURL(/\/onboarding\/values/);
    await page.getByRole("button", { name: "Werkomstandigheden omhoog" }).click();
    await page.getByRole("button", { name: "Afronden en matches bekijken" }).click();
    await expect(page).toHaveURL(/\/matches/, { timeout: 30_000 });
  });
});
