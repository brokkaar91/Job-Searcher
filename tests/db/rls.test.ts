/**
 * Database integration tests for Row Level Security.
 * Runs against a local Supabase (`pnpm db:start`). Skipped when DATABASE_URL is not set.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";

const url = process.env.DATABASE_URL;

describe.skipIf(!url)("row level security", () => {
  const client = new pg.Client({ connectionString: url });
  const alice = randomUUID();
  const bob = randomUUID();

  async function asUser<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    await client.query("begin");
    try {
      await client.query("set local role authenticated");
      await client.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: userId, role: "authenticated" }),
      ]);
      return await fn();
    } finally {
      await client.query("rollback");
    }
  }

  beforeAll(async () => {
    await client.connect();
    for (const [id, email] of [
      [alice, `alice-${alice}@test.local`],
      [bob, `bob-${bob}@test.local`],
    ]) {
      await client.query(
        `insert into auth.users (id, email, raw_user_meta_data, aud, role)
         values ($1, $2, $3, 'authenticated', 'authenticated')`,
        [
          id,
          email,
          {
            locale: "en",
            consents: { terms_privacy: true, ai_processing: true },
            policy_version: "test",
          },
        ],
      );
    }
  });

  afterAll(async () => {
    await client.query("delete from auth.users where id = any($1)", [[alice, bob]]);
    await client.end();
  });

  it("enables RLS on every table in the public schema", async () => {
    const { rows } = await client.query(
      `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
    );
    expect(rows.map((r) => r.relname)).toEqual([]);
  });

  it("creates profile, candidate profile and consents on signup", async () => {
    const { rows } = await client.query(
      "select p.locale, (select count(*) from consents c where c.user_id = p.id)::int as consents from profiles p where id = $1",
      [alice],
    );
    expect(rows[0]).toEqual({ locale: "en", consents: 2 });
  });

  it("users only see their own candidate data", async () => {
    await client.query("update candidate_profiles set headline = 'secret' where user_id = $1", [
      bob,
    ]);
    const rows = await asUser(
      alice,
      async () => (await client.query("select user_id from candidate_profiles")).rows,
    );
    expect(rows.map((r) => r.user_id)).toEqual([alice]);
  });

  it("users cannot escalate their own role", async () => {
    await expect(
      asUser(alice, () =>
        client.query("update profiles set role = 'admin' where id = $1", [alice]),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("users cannot read connector secrets or the audit log", async () => {
    const secrets = await asUser(
      alice,
      async () => (await client.query("select * from connector_secrets")).rows,
    );
    expect(secrets).toEqual([]);
    const audit = await asUser(
      alice,
      async () => (await client.query("select * from audit_log")).rows,
    );
    expect(audit).toEqual([]);
    await expect(
      asUser(alice, () => client.query("insert into audit_log (action) values ('x')")),
    ).rejects.toThrow(/permission denied/);
  });

  it("users cannot change match scores, only mark them as seen", async () => {
    await expect(
      asUser(alice, () =>
        client.query("update matches set total_score = 100 where user_id = $1", [alice]),
      ),
    ).rejects.toThrow(/permission denied/);
    await asUser(alice, () =>
      client.query("update matches set seen_at = now() where user_id = $1", [alice]),
    );
  });

  it("matching model versions are immutable", async () => {
    const v = Math.floor(Math.random() * 1e6) + 1000;
    const { rows } = await client.query(
      "insert into matching_model_versions (version, name, config) values ($1, 'test', '{}') returning id",
      [v],
    );
    await expect(
      client.query("update matching_model_versions set config = '{\"x\":1}' where id = $1", [
        rows[0].id,
      ]),
    ).rejects.toThrow(/immutable/);
    await client.query("delete from matching_model_versions where id = $1", [rows[0].id]);
  });
});
