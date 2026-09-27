import { expect, test } from "@playwright/test";
import { admin, createTestUser, deleteUser, signIn } from "./helpers";

const ADMIN = "admin@jobmatch.local";
const connectorName = `E2E demo feed ${Date.now()}`;

test.describe("admin backoffice", () => {
  test.afterAll(async () => {
    const db = admin();
    const { data } = await db.from("connectors").select("id").eq("name", connectorName);
    for (const c of data ?? []) {
      await db.from("jobs").delete().eq("source_id", c.id);
      await db.from("connectors").delete().eq("id", c.id);
    }
    // Restore the default model as active.
    const { data: v1 } = await db
      .from("matching_model_versions")
      .select("id")
      .eq("version", 1)
      .single();
    await db.from("matching_model_versions").update({ is_active: false }).eq("is_active", true);
    await db.from("matching_model_versions").update({ is_active: true }).eq("id", v1!.id);
  });

  test("non-admins cannot access /admin (server-side check)", async ({ page }) => {
    const user = await createTestUser("nonadmin");
    await signIn(page, user.email, "/admin");
    await expect(page.getByText(/404|not found|niet gevonden/i).first()).toBeVisible();
    await deleteUser(user.id);
  });

  test("add a connector, map the feed, run a sync and view the log", async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    await signIn(page, ADMIN, "/admin/connectors/new");
    await page.getByLabel("Naam", { exact: true }).fill(connectorName);
    await page.getByLabel("Type").selectOption("generic_feed");
    await page.getByLabel("Feed-URL").fill(`${baseURL}/demo/jobs-feed.json`);
    await page.getByRole("button", { name: "Aanmaken" }).click();
    await expect(page.getByRole("heading", { name: connectorName })).toBeVisible();

    // Mapping editor: load sample → suggest → preview valid → save
    await page.getByRole("link", { name: "Mapping bewerken" }).click();
    await page.getByLabel("Pad naar items (JSONPath)").fill("$.jobs[*]");
    await page.getByRole("button", { name: "Voorbeeld laden" }).click();
    await expect(page.getByText("3 items in feed")).toBeVisible();
    await page.getByRole("button", { name: "Voorstel doen" }).click();
    await expect(page.getByText("Geldig", { exact: true })).toBeVisible();
    await expect(page.getByText('"externalId": "demo-101"')).toBeVisible();
    await page.getByRole("button", { name: /Opslaan als versie 1/ }).click();
    await expect(page.getByText("Mapping versie 1 opgeslagen")).toBeVisible();

    // Sync now (inline in E2E) → run appears with counts
    await page.getByRole("link", { name: connectorName }).click();
    await page.getByRole("button", { name: "Nu synchroniseren" }).click();
    await expect(page.getByText(/Sync (succeeded|partial)/)).toBeVisible({ timeout: 60_000 });
    await page.reload();
    const run = page.getByRole("link", { name: /\d{2}:\d{2}/ }).first();
    await run.click();
    await expect(page.getByRole("heading", { name: /Sync-run/ })).toBeVisible();
    await expect(page.getByText("sync finished")).toBeVisible();

    // Audit log records the admin action
    await page.goto("/admin/audit?action=connector.");
    await expect(page.getByText("connector.create").first()).toBeVisible();
  });

  test("adjust weights as a new model version, test it and activate it", async ({ page }) => {
    test.setTimeout(120_000);
    await signIn(page, ADMIN, "/admin/matching");
    await expect(page.getByText("Totaal 100%")).toBeVisible();
    const skills = page.getByRole("slider", { name: "Vaardigheden" });
    const experience = page.getByRole("slider", { name: "Relevante ervaring" });
    await skills.focus();
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowLeft");
    await expect(page.getByText("Totaal 95%")).toBeVisible();
    await experience.focus();
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");
    await expect(page.getByText("Totaal 100%")).toBeVisible();

    await page.getByRole("button", { name: "Test", exact: true }).click();
    await expect(page.getByRole("cell", { name: /Senior Data Engineer/ }).first()).toBeVisible();

    await page.getByLabel("Naam", { exact: true }).fill("E2E: meer gewicht op ervaring");
    await page.getByRole("button", { name: "Opslaan als nieuwe versie" }).click();
    await expect(page.getByText(/aangemaakt \(nog niet actief\)/)).toBeVisible();
    await page.reload();
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Activeren" }).first().click();
    await expect(page.getByText(/Geactiveerd/)).toBeVisible({ timeout: 60_000 });
    await page.reload();
    await expect(
      page
        .getByRole("row", { name: /E2E: meer gewicht op ervaring/ })
        .first()
        .getByText("Actief"),
    ).toBeVisible();
  });
});
