# JobMatch

> **NL** – JobMatch is een vacatureplatform voor iedereen die in Nederland werk zoekt. Je uploadt je
> cv, doorloopt een korte onboarding (< 10 min) en krijgt **uitlegbare** matches: bij elke vacature
> zie je waarom hij past, wat er nog ontbreekt en hoe de score is opgebouwd. Beheerders koppelen
> vacaturebronnen via connectors en beheren het (geversioneerde) matchingmodel.

JobMatch is a job-matching web app for the Dutch labour market (Dutch first, English as secondary
UI language). Because it operates in employment, it is treated as a **high-risk AI system under the
EU AI Act**: see [Compliance](#compliance).

## Features

- **Candidates:** CV upload (PDF/DOCX) with PII redaction and parsing, ESCO-based skill review,
  language levels (CEFR), preferences (location, travel time, salary, hours, contract), O\*NET
  Mini-IP interest test (RIASEC) and work values.
- **Explainable matches:**
  - Layer A has knock-outs: language, location/travel time, salary, contract and education.
  - Layer B scores six weighted components.
  - Every match carries its top-3 reasons, skill gaps and a per-component breakdown.
- **Dashboard:** filterable feed with search, match detail page, kanban application tracker,
  profile with a "profile strength" indicator, alerts and a privacy centre (JSON export, account
  deletion).
- **Admin backoffice (`/admin`):**
  - Connector SDK: Adzuna, Greenhouse, Lever, Recruitee, Personio XML, plus a generic JSON/XML
    feed with a visual mapping editor.
  - Pipeline: raw → map → enrich → 4-layer dedup → embeddings → matching, with run logs.
  - Versioned matching model: weights, knock-outs and thresholds, with test-before-activate.
  - Job moderation, users and deletions, analytics, and an audit-log viewer.
- **UI:**
  - Built on Tailwind v4 and Radix: accordion, tooltip, sheet, drawer, ⌘K command palette,
    skeletons, score rings and a bento grid.
  - Light and dark themes, WCAG 2.1 AA (checked with axe in CI), and a mobile-first layout.

## Stack

| Layer           | Choice                                                                               |
| --------------- | ------------------------------------------------------------------------------------ |
| Web             | Next.js 16 (App Router, Turbopack), React 19, TypeScript strict, Tailwind v4          |
| i18n            | next-intl v4 – `nl` (default, `/…`) and `en` (`/en/…`)                                |
| Data            | Supabase (Postgres 17 + pgvector, Auth, Storage), RLS on every table                  |
| Background jobs | pg-boss in a separate Node worker (`worker/`)                                         |
| AI              | Claude for CV parsing / job classification (optional; `mock` provider for dev/tests) |
| Embeddings      | local `multilingual-e5-base` (768d) – or `fake` for dev/tests                          |
| Tests           | Vitest (unit + DB integration), Playwright (E2E + axe accessibility)                  |

See [`CLAUDE.md`](./CLAUDE.md) for the architecture decisions and project conventions.

## Local development

Requirements: Node 22, pnpm 10, Docker (for local Supabase).

```bash
pnpm install
pnpm db:start                 # local Supabase in Docker; prints URL + keys
cp .env.example .env.local    # fill in the keys printed by db:start
                              # CONNECTOR_ENCRYPTION_KEY: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
pnpm db:reset                 # apply migrations
pnpm seed                     # ESCO subset, 16 companies, 50 jobs, 5 demo candidates + matches
pnpm dev                      # http://localhost:3000
pnpm worker                   # optional: background jobs (or set INLINE_SYNC=1)
```

**Signing in:**

- Magic links go to the local Mailpit inbox at http://127.0.0.1:54324.
- Demo accounts are `demo.data@`, `demo.nurse@`, `demo.ux@`, `demo.finance@` and
  `demo.logistics@jobmatch.local`.
- The admin account is `admin@jobmatch.local`.
- To make any other account an admin, run `pnpm make-admin you@example.com`.

For offline development, keep `PARSER_PROVIDER=mock` and `EMBEDDING_PROVIDER=fake`: nothing leaves
your machine.

### Commands

```bash
pnpm dev / pnpm build / pnpm start
pnpm worker          # connector sync, enrichment, embeddings, matching, expiry, retention
pnpm typecheck       # next typegen && tsc
pnpm lint
pnpm test            # vitest (DB tests need a running local Supabase)
pnpm test:e2e        # playwright; builds must exist (pnpm build)
pnpm db:types        # regenerate src/lib/supabase/database.types.ts
pnpm esco:import     # reconcile the ESCO subset with the official ESCO API
```

## Project layout

```
src/app/[locale]/(public)   public pages (home, how matching works, employers, FAQ, legal, auth)
src/app/[locale]/(app)      signed-in area (onboarding, matches, tracker, profile, alerts, privacy)
src/app/[locale]/admin      admin backoffice (requireAdmin() in layout AND every action)
src/core                    pure TypeScript domain code: matching engine, connectors, pipeline,
                            providers, PII redaction, assessments, ESCO helpers
src/server                  server-only queries, actions, auth guards, audit
src/components              ui/ primitives, magic/ showcase components, feature components
worker/                     pg-boss worker (imports src/core + src/server)
supabase/migrations         schema, RLS, functions, storage
supabase/seed               seed data (fictional companies)
```

## Adding job sources

The goal is to connect the major Dutch job boards and employer ATSs.

1. **Board or ATS with an API:**
   - Implement a `Connector` in `src/core/connectors/<name>.ts` with `fetch`, `map` and
     `healthcheck`.
   - Give it a zod config schema.
   - Register it in `CONNECTORS` (`src/core/connectors/index.ts`).
   - Add a recorded fixture in `__fixtures__` and a test.
2. **Plain JSON/XML feed:** no code needed. In `/admin/connectors`, add a *Generic feed* connector
   and map its fields in the mapping editor.
3. **Credentials:** entered in the admin UI and stored AES-256-GCM encrypted in
   `connector_secrets`. The service role reads them; they are never sent to the browser.

## Deployment (EU)

| Component | Where                          | Notes                                                                 |
| --------- | ------------------------------ | --------------------------------------------------------------------- |
| Database  | Supabase, EU region (Frankfurt) | `supabase link` + `supabase db push`; enable Google OAuth if wanted   |
| Web app   | Vercel, region `fra1`          | `vercel.json`; set all env vars from `.env.example`                   |
| Worker    | Fly.io, region `ams`           | `fly deploy --config worker/fly.toml --dockerfile worker/Dockerfile`   |

**Worker requirements:**

- `DATABASE_URL` must use the session pooler, because pg-boss needs session mode.
- The worker creates the `pgboss` schema on first start.
- When `EMBEDDING_PROVIDER=local`, it caches the e5 model on the `/data` volume.

**CI** (`.github/workflows/ci.yml`):

- Every push runs lint, typecheck and unit tests.
- A second job starts Supabase, seeds it and runs the DB and E2E suites (including axe).

## Compliance

- **Protected attributes:** the matching input never contains name, age, gender, photo,
  nationality or address. This is enforced by an allow-list schema and a property-based test.
- **PII redaction:** CV text is redacted before parsing or embedding.
- **Audit log:** every match computation and every admin mutation writes an `audit_log` row.
  Matching model versions are immutable.
- **No automated rejection:** knocked-out jobs are hidden but can always be shown.
- **Consent and retention:** registration requires explicit consent. Inactive accounts are warned
  and then deleted after 12 months, which is configurable.
- **Legal texts:** the privacy and AI statements are placeholders and must be reviewed by a lawyer
  before launch.
