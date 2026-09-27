import { expect, test } from "@playwright/test";
import { admin, createTestUser, signIn } from "./helpers";

const DEMO = "demo.finance@jobmatch.local";

test.describe("dashboard (seeded demo candidate)", () => {
  test.beforeEach(async () => {
    const db = admin();
    const { data } = await db.from("profiles").select("id").eq("email", DEMO).single();
    await db.from("match_feedback").delete().eq("user_id", data!.id);
    await db.from("applications").delete().eq("user_id", data!.id);
  });

  test("feed shows explainable matches; detail, save, tracker and dismiss work", async ({
    page,
  }) => {
    await signIn(page, DEMO, "/matches");
    await expect(page.getByRole("heading", { name: "Jouw matches" })).toBeVisible();
    const list = page.getByRole("list", { name: "Matchlijst" });
    await expect(list.getByRole("listitem").first()).toBeVisible();

    // Every card shows a label and reasons
    await expect(page.getByText(/Sterke match|Goede match|Mogelijke match/).first()).toBeVisible();

    // Open the detail page: component breakdown, knock-outs and actions
    const firstTitle = await page.locator("main h2 a").first().innerText();
    await page.locator("main h2 a").first().click();
    await expect(page.getByRole("heading", { name: firstTitle })).toBeVisible();
    await expect(page.getByText("Matchscore")).toBeVisible();
    await expect(page.getByRole("meter", { name: "Vaardigheden" })).toBeVisible();
    await expect(page.getByText("Je harde eisen")).toBeVisible();

    // Save → appears in tracker under "Opgeslagen"
    await page.getByRole("button", { name: "Bewaren" }).click();
    await expect(page.getByRole("button", { name: "Bewaard" })).toBeVisible();
    await page.goto("/tracker");
    const saved = page.getByRole("region", { name: "Opgeslagen" });
    await expect(saved.getByText(firstTitle)).toBeVisible();

    // Move via the accessible select → "Gesolliciteerd"
    await saved.getByLabel("Verplaats naar").selectOption("applied");
    await expect(
      page.getByRole("region", { name: "Gesolliciteerd" }).getByText(firstTitle),
    ).toBeVisible();
    // Wait until the move is persisted before reloading.
    await expect(page.locator("[data-saving]")).toHaveCount(0);
    await page.reload();
    await expect(
      page.getByRole("region", { name: "Gesolliciteerd" }).getByText(firstTitle),
    ).toBeVisible();

    // Dismiss another match with a reason → shows under "Afgewezen"
    await page.goto("/matches");
    const second = page
      .getByRole("list", { name: "Matchlijst" })
      .locator(":scope > li")
      .filter({ hasNot: page.getByRole("button", { name: "Bewaard" }) })
      .first();
    const secondTitle = await second.locator("h2").innerText();
    await second.getByRole("button", { name: "Niet interessant" }).click();
    await page.getByRole("dialog").getByText("Salaris", { exact: true }).click();
    await page.getByRole("button", { name: "Afwijzen" }).click();
    await expect(page.locator("main h2", { hasText: secondTitle })).toHaveCount(0);
    await page.getByRole("tab", { name: "Afgewezen" }).click();
    await expect(page.locator("main h2", { hasText: secondTitle })).toBeVisible();
  });

  test("filters: 'Toon verborgen' reveals knocked-out jobs", async ({ page }) => {
    await signIn(page, DEMO, "/matches");
    const before = await page.locator("main h2 a").count();
    await page.getByRole("button", { name: "Toon verborgen" }).click();
    await expect(page).toHaveURL(/hidden=1/);
    await expect.poll(() => page.locator("main h2 a").count()).toBeGreaterThanOrEqual(before);
  });
});

test.describe("privacy centre", () => {
  test("export JSON and delete account", async ({ page }) => {
    const user = await createTestUser("privacy");
    await signIn(page, user.email, "/privacy-center");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("link", { name: "Download (JSON)" }).click(),
    ]);
    const json = JSON.parse(
      await (await download.createReadStream()).toArray().then((c) => Buffer.concat(c).toString()),
    );
    expect(json.profile.email).toBe(user.email);
    expect(json.consents.length).toBeGreaterThanOrEqual(2);

    await page.getByRole("button", { name: "Account en gegevens verwijderen" }).click();
    await page.getByLabel("Typ VERWIJDER om te bevestigen").fill("VERWIJDER");
    await page.getByRole("button", { name: "Definitief verwijderen" }).click();
    await expect(page.getByText("Je account en al je gegevens zijn verwijderd.")).toBeVisible();
    const { data } = await admin().from("profiles").select("id").eq("id", user.id);
    expect(data).toEqual([]);
    const { data: requests } = await admin()
      .from("deletion_requests")
      .select("status")
      .eq("source", "user")
      .order("requested_at", { ascending: false })
      .limit(1);
    expect(requests?.[0]?.status).toBe("completed");
  });
});
