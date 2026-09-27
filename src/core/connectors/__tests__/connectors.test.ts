import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createConnector, CONNECTORS } from "..";
import { mapRecord, suggestMapping, extractItems, parseFeed, type FieldMapping } from "../mapping";
import { htmlToText, employmentFromText, remoteFromText, redact } from "../util";

const fixture = (f: string) =>
  readFileSync(path.join(import.meta.dirname, "../__fixtures__", f), "utf8");
const NOW = new Date("2026-09-27T12:00:00Z");

/** Mock fetch that routes URLs (regex) to fixture bodies and records calls. */
function mockFetch(routes: [RegExp, string | (() => string), number?][]) {
  const calls: string[] = [];
  const fn = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    const route = routes.find(([re]) => re.test(url));
    if (!route) return new Response("not found", { status: 404 });
    const body = typeof route[1] === "function" ? route[1]() : route[1];
    return new Response(body, { status: route[2] ?? 200 });
  });
  return { fetch: fn as unknown as typeof fetch, calls };
}

async function collect<T>(it: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const x of it) out.push(x);
  return out;
}

describe("connector registry", () => {
  it("has the six MVP connectors, each with fetch/map/healthcheck", () => {
    expect(Object.keys(CONNECTORS).sort()).toEqual([
      "adzuna",
      "generic_feed",
      "greenhouse",
      "lever",
      "personio",
      "recruitee",
    ]);
    for (const def of Object.values(CONNECTORS)) {
      expect(typeof def.fetch).toBe("function");
      expect(typeof def.map).toBe("function");
      expect(typeof def.healthcheck).toBe("function");
    }
  });
});

describe("Adzuna", () => {
  const { fetch, calls } = mockFetch([
    [/search\/1\?/, fixture("adzuna-page1.json")],
    [/search\/2\?/, fixture("adzuna-page2.json")],
  ]);
  const c = createConnector("adzuna", {
    config: { resultsPerPage: 2, maxPages: 5 },
    credentials: { appId: "id", appKey: "secret" },
    fetch,
    now: NOW,
  });

  it("paginates, applies since as max_days_old, and maps to CanonicalJob", async () => {
    const raws = await collect(c.fetch(new Date("2026-09-20T12:00:00Z")));
    expect(raws).toHaveLength(3);
    expect(calls[0]).toContain("max_days_old=7");
    expect(calls).toHaveLength(2);
    const job = c.map(raws[0]);
    expect(job).toMatchObject({
      externalId: "4512345678",
      title: "Senior Data Engineer",
      companyName: "Canal Analytics B.V.",
      city: "Amsterdam",
      region: "Noord-Holland",
      employmentTypes: ["full_time"],
      salary: { min: 70000, max: 90000, unit: "year", currency: "EUR", isEstimate: false },
      datePosted: "2026-09-20",
    });
    expect(job.description).toContain("Amsterdam…");
    expect(c.map(raws[1]).salary?.isEstimate).toBe(true);
  });

  it("never logs credentials", () => {
    expect(redact("https://x/search/1?app_id=abc&app_key=secret")).toBe(
      "https://x/search/1?app_id=***&app_key=***",
    );
  });

  it("healthcheck reports HTTP errors", async () => {
    const bad = createConnector("adzuna", {
      config: {},
      credentials: { appId: "x", appKey: "y" },
      fetch: mockFetch([[/./, "denied", 401]]).fetch,
    });
    expect(await bad.healthcheck()).toMatchObject({ ok: false });
  });
});

describe("Greenhouse", () => {
  const { fetch } = mockFetch([
    [/boards\/tuliptech\/jobs/, fixture("greenhouse-jobs.json")],
    [/boards\/tuliptech$/, JSON.stringify({ name: "Tulip Tech" })],
  ]);
  const c = createConnector("greenhouse", { config: { boardToken: "tuliptech" }, fetch });

  it("filters by updated_at and decodes double-encoded HTML", async () => {
    const raws = await collect(c.fetch(new Date("2026-09-01T00:00:00Z")));
    expect(raws).toHaveLength(1);
    const job = c.map(raws[0]);
    expect(job).toMatchObject({
      externalId: "7001001",
      title: "Backend Engineer (Go)",
      companyName: "Tulip Tech",
      city: "Utrecht",
      remotePolicy: "hybrid",
      employmentTypes: ["full_time"],
      datePosted: "2026-09-01",
    });
    expect(job.description).toContain("You will build Go services.");
    expect(job.description).toContain("• Kubernetes");
    expect(job.description).not.toMatch(/<|&lt;/);
  });

  it("healthcheck", async () => {
    expect(await c.healthcheck()).toEqual({ ok: true, message: 'OK – board "Tulip Tech"' });
  });
});

describe("Lever", () => {
  const { fetch, calls } = mockFetch([
    [/api\.eu\.lever\.co\/v0\/postings\/brightlane/, fixture("lever-postings.json")],
  ]);
  const c = createConnector("lever", {
    config: { site: "brightlane", companyName: "Brightlane Payments" },
    fetch,
  });

  it("uses the EU endpoint and maps lists, workplace type and salary range", async () => {
    const [raw] = await collect(c.fetch(null));
    expect(calls[0]).toMatch(/^https:\/\/api\.eu\.lever\.co/);
    const job = c.map(raw);
    expect(job).toMatchObject({
      title: "Product Designer",
      companyName: "Brightlane Payments",
      city: "Amsterdam",
      remotePolicy: "hybrid",
      employmentTypes: ["full_time"],
      salary: { min: 60000, max: 75000, unit: "year", currency: "EUR" },
    });
    expect(job.description).toContain("What you bring");
    expect(job.description).toContain("• Figma");
    expect(job.applyUrl).toMatch(/\/apply$/);
  });
});

describe("Recruitee", () => {
  const { fetch } = mockFetch([
    [/noordzee\.recruitee\.com\/api\/offers/, fixture("recruitee-offers.json")],
  ]);
  const c = createConnector("recruitee", { config: { company: "noordzee" }, fetch });

  it("maps hours, hourly salary and on-site policy", async () => {
    const [raw] = await collect(c.fetch(null));
    expect(c.map(raw)).toMatchObject({
      externalId: "998877",
      city: "Waalwijk",
      country: "NL",
      remotePolicy: "onsite",
      employmentTypes: ["full_time"],
      hoursMin: 38,
      hoursMax: 40,
      salary: { min: 14.5, max: 16, unit: "hour" },
    });
  });
});

describe("Personio", () => {
  const { fetch } = mockFetch([[/frisia\.jobs\.personio\.de\/xml/, fixture("personio-feed.xml")]]);
  const c = createConnector("personio", { config: { company: "frisia" }, fetch });

  it("parses the XML feed and job descriptions", async () => {
    const raws = await collect(c.fetch(null));
    expect(raws).toHaveLength(2);
    const job = c.map(raws[0]);
    expect(job).toMatchObject({
      externalId: "1234567",
      title: "Process Engineer",
      companyName: "Frisia Dairy Innovations",
      city: "Leeuwarden",
      employmentTypes: ["full_time"],
      applyUrl: "https://frisia.jobs.personio.de/job/1234567",
    });
    expect(job.description).toContain("Your profile\n• PLC programming");
    expect(c.map(raws[1]).employmentTypes).toEqual(expect.arrayContaining(["internship"]));
  });
});

describe("generic feed + mapping engine", () => {
  const mapping: FieldMapping = {
    format: "xml",
    itemsPath: "$.feed.job[*]",
    fields: {
      externalId: { path: "$.attr_ref", transform: "none" },
      title: { path: "$.functie", transform: "trim" },
      description: { path: "$.omschrijving", transform: "html_to_text" },
      companyName: { path: "$.bedrijf", transform: "none" },
      city: { path: "$.plaats", transform: "none" },
      salaryText: { path: "$.salaris", transform: "salary_text" },
      employmentTypes: { path: "$.dienstverband", transform: "employment_text" },
      applyUrl: { path: "$.link", transform: "none" },
      datePosted: { path: "$.datum", transform: "date" },
      country: { transform: "none", default: "NL" },
    },
  };

  it("maps XML items with templates, transforms and defaults", async () => {
    const { fetch } = mockFetch([[/feed\.xml/, fixture("generic-feed.xml")]]);
    const c = createConnector("generic_feed", {
      config: { url: "https://hollandsebouw.example/feed.xml", mapping },
      fetch,
    });
    const raws = await collect(c.fetch(null));
    expect(raws).toHaveLength(2);
    const job = c.map(raws[0]);
    expect(job).toMatchObject({
      externalId: "HB-001",
      title: "Projectleider Infra",
      description: "Je leidt infraprojecten in de regio Zwolle.",
      companyName: "Hollandse Bouw & Infra",
      country: "NL",
      employmentTypes: ["full_time"],
      salary: { min: 4800, max: 6200, unit: "month", currency: "EUR" },
      datePosted: "2026-09-12",
    });
    expect(c.map(raws[1]).employmentTypes).toEqual(["part_time"]);
    expect(await c.healthcheck()).toMatchObject({ ok: true });
  });

  it("reports missing required fields in the preview", () => {
    const r = mapRecord({ functie: "X" }, { ...mapping, fields: { title: mapping.fields.title } });
    expect(r.job).toBeNull();
    expect(r.errors).toEqual([
      "externalId: required field is empty",
      "description: required field is empty",
    ]);
  });

  it("supports templates", () => {
    const r = mapRecord(
      { id: 1, t: "Chef", d: "Koken", city: "Delft", country: "NL" },
      {
        format: "json",
        itemsPath: "$[*]",
        fields: {
          externalId: { path: "$.id", transform: "none" },
          title: { path: "$.t", transform: "none" },
          description: { template: "{{$.d}} in {{$.city}}", transform: "none" },
        },
      },
    );
    expect(r.job?.description).toBe("Koken in Delft");
  });

  it("suggests a mapping from a sample JSON item and it maps the demo feed", () => {
    const doc = parseFeed(
      readFileSync(
        path.join(import.meta.dirname, "../../../../public/demo/jobs-feed.json"),
        "utf8",
      ),
      "json",
    );
    const items = extractItems(doc, "$.jobs[*]");
    const suggestion = suggestMapping(items[0] as Record<string, unknown>, "json", "$.jobs[*]");
    const r = mapRecord(items[0], suggestion);
    expect(r.errors).toEqual([]);
    expect(r.job).toMatchObject({
      externalId: "demo-101",
      title: "Junior Data Analyst",
      companyName: "Canal Analytics",
      city: "Amsterdam",
      employmentTypes: ["full_time"],
      salary: { min: 3400, max: 4200, unit: "month" },
    });
  });
});

describe("text helpers", () => {
  it("converts HTML to text", () => {
    expect(htmlToText("<p>Hallo&nbsp;<b>wereld</b></p><ul><li>een</li><li>twee</li></ul>")).toBe(
      "Hallo wereld\n\n• een\n• twee",
    );
  });
  it("detects remote policy and employment types", () => {
    expect(remoteFromText("Amsterdam (Hybrid)")).toBe("hybrid");
    expect(remoteFromText("Fully remote")).toBe("remote");
    expect(employmentFromText("Parttime / tijdelijk")).toEqual(["part_time", "temporary"]);
  });
});
