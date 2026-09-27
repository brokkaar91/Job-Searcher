-- JobMatch – core tables
-- Embedding dimension is fixed at 768 (default: multilingual-e5-base). See CLAUDE.md.

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- array_to_string is only STABLE; labels are plain text so this wrapper is safe to mark IMMUTABLE.
create or replace function public.label_search_text(en text, nl text, alts text[]) returns text
language sql immutable parallel safe as $$
  select lower(en || ' ' || coalesce(nl, '') || ' ' || coalesce(array_to_string(alts, ' '), ''));
$$;

-- ─── Reference data ──────────────────────────────────────────────────────────

create table public.esco_skills (
  uri text primary key,
  preferred_label_en text not null,
  preferred_label_nl text,
  alt_labels text[] not null default '{}',
  skill_type text not null default 'skill/competence' check (skill_type in ('skill/competence', 'knowledge', 'language', 'transversal')),
  broader_uris text[] not null default '{}',
  search_text text generated always as (public.label_search_text(preferred_label_en, preferred_label_nl, alt_labels)) stored,
  created_at timestamptz not null default now()
);
create index esco_skills_search_trgm on public.esco_skills using gin (search_text extensions.gin_trgm_ops);

create table public.esco_occupations (
  uri text primary key,
  code text,                       -- ESCO code, e.g. 2511.1
  isco_code char(4) not null,      -- ISCO-08 unit group
  preferred_label_en text not null,
  preferred_label_nl text,
  alt_labels text[] not null default '{}',
  riasec jsonb,                    -- {"R":0..1,"I":..,"A":..,"S":..,"E":..,"C":..}
  work_values jsonb,               -- {"achievement":0..1,...} (O*NET work values, 6 dims)
  essential_skill_uris text[] not null default '{}',
  optional_skill_uris text[] not null default '{}',
  search_text text generated always as (public.label_search_text(preferred_label_en, preferred_label_nl, alt_labels)) stored,
  created_at timestamptz not null default now()
);
create index esco_occupations_search_trgm on public.esco_occupations using gin (search_text extensions.gin_trgm_ops);
create index esco_occupations_isco on public.esco_occupations (isco_code);

create table public.city_locations (
  id serial primary key,
  name text not null,
  name_normalized text not null unique,
  province text,
  lat double precision not null,
  lng double precision not null
);

-- ─── Users ───────────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  locale text not null default 'nl' check (locale in ('nl', 'en')),
  role public.user_role not null default 'user',
  last_active_at timestamptz not null default now(),
  retention_warning_sent_at timestamptz,
  deletion_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.cv_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  version int not null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes int not null,
  parse_status public.cv_parse_status not null default 'pending',
  parse_error text,
  parsed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, version)
);

create table public.candidate_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  current_cv_id uuid references public.cv_files (id) on delete set null,
  headline text,
  summary text,
  seniority public.seniority_level,
  education_level smallint check (education_level between 1 and 8), -- EQF level, only used when a job explicitly requires it
  -- Work status (never nationality)
  needs_sponsorship boolean,
  permit_type public.work_permit_type,
  salary_norm_category public.salary_norm_category,
  -- Preferences: see src/core/matching/types.ts (CandidatePreferences) for the zod schema
  preferences jsonb not null default '{}'::jsonb,
  -- Interests / values
  riasec jsonb,            -- {"R":0..1,...}
  riasec_answers jsonb,    -- raw Mini-IP answers (30 items, 1..5)
  work_values jsonb,       -- ordered array of the 6 value keys, most important first
  -- Onboarding progress
  onboarding_step smallint not null default 0,
  onboarding_completed_at timestamptz,
  -- Parsed CV (redacted) and embedding
  parsed_cv jsonb,
  embedding extensions.vector(768),
  embedding_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger candidate_profiles_updated_at before update on public.candidate_profiles
  for each row execute function public.set_updated_at();

create table public.candidate_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  esco_uri text references public.esco_skills (uri) on delete set null,
  label text not null,
  last_used_year smallint,
  evidence text,
  source text not null default 'cv' check (source in ('cv', 'user')),
  confirmed boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index candidate_skills_user_uri on public.candidate_skills (user_id, esco_uri) where esco_uri is not null;
create index candidate_skills_user on public.candidate_skills (user_id);

create table public.candidate_experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  organisation text,
  esco_occupation_uri text references public.esco_occupations (uri) on delete set null,
  isco_code char(4),
  start_date date,
  end_date date,
  is_current boolean not null default false,
  description text,
  sort_order smallint not null default 0,
  embedding extensions.vector(768),
  created_at timestamptz not null default now()
);
create index candidate_experiences_user on public.candidate_experiences (user_id);

create table public.candidate_languages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  language char(2) not null,       -- ISO 639-1
  level public.cefr_level not null,
  unique (user_id, language)
);

-- ─── Companies & jobs ────────────────────────────────────────────────────────

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text unique,
  kvk_number text,
  is_recognised_sponsor boolean not null default false, -- IND erkend referent
  sponsor_checked_at timestamptz,
  size public.company_size,
  type public.company_type,
  website text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index companies_name_lower on public.companies (lower(name));
create trigger companies_updated_at before update on public.companies
  for each row execute function public.set_updated_at();

create table public.connectors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.connector_type not null,
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,       -- non-secret config (board token, feed url, …)
  sync_interval_minutes int not null default 360 check (sync_interval_minutes >= 15),
  source_priority int not null default 50 check (source_priority between 0 and 100), -- higher wins
  may_republish boolean not null default false,    -- licence flag
  expire_after_missed_runs int not null default 2,
  last_sync_at timestamptz,
  last_health jsonb,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger connectors_updated_at before update on public.connectors
  for each row execute function public.set_updated_at();

-- Encrypted credentials (AES-256-GCM, key in CONNECTOR_ENCRYPTION_KEY). Service role only.
create table public.connector_secrets (
  connector_id uuid primary key references public.connectors (id) on delete cascade,
  ciphertext text not null,
  updated_at timestamptz not null default now()
);

create table public.field_mappings (
  id uuid primary key default gen_random_uuid(),
  connector_id uuid not null references public.connectors (id) on delete cascade,
  version int not null,
  mapping jsonb not null,
  sample_record jsonb,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (connector_id, version)
);

create table public.connector_runs (
  id uuid primary key default gen_random_uuid(),
  connector_id uuid not null references public.connectors (id) on delete cascade,
  status public.run_status not null default 'queued',
  trigger text not null default 'schedule' check (trigger in ('schedule', 'manual')),
  triggered_by uuid references public.profiles (id) on delete set null,
  started_at timestamptz,
  finished_at timestamptz,
  counts jsonb not null default '{"fetched":0,"new":0,"updated":0,"unchanged":0,"duplicate":0,"failed":0,"expired":0}'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  log text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index connector_runs_connector on public.connector_runs (connector_id, created_at desc);

create table public.job_raw (
  id uuid primary key default gen_random_uuid(),
  connector_id uuid not null references public.connectors (id) on delete cascade,
  run_id uuid references public.connector_runs (id) on delete set null,
  external_id text not null,
  payload jsonb not null,
  payload_hash text not null,
  fetched_at timestamptz not null default now(),
  unique (connector_id, external_id, payload_hash)
);

create table public.dedup_groups (
  id uuid primary key default gen_random_uuid(),
  golden_job_id uuid,
  created_at timestamptz not null default now()
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  -- provenance
  source_id uuid references public.connectors (id) on delete set null, -- null = manual/seed
  external_id text,
  source_priority int not null default 50,
  source_url text,
  -- schema.org JobPosting core
  title text not null,
  description text not null default '',
  company_id uuid references public.companies (id) on delete set null,
  hiring_organization_name text,
  employment_types public.employment_type[] not null default '{}',
  date_posted date,
  valid_through timestamptz,
  apply_url text,
  apply_url_normalized text,
  city text,
  region text,
  postal_code text,
  country char(2) not null default 'NL',
  lat double precision,
  lng double precision,
  remote_policy public.remote_policy,
  hours_min smallint,
  hours_max smallint,
  -- salary normalised to gross EUR per month (excl. holiday allowance)
  salary_min_month numeric(10, 2),
  salary_max_month numeric(10, 2),
  salary_currency char(3) not null default 'EUR',
  salary_raw jsonb,
  -- language of the ad + required languages
  language char(2),
  language_requirements jsonb not null default '[]'::jsonb, -- [{"language":"nl","level":"B2","required":true}]
  visa_sponsorship boolean,
  -- classification
  esco_occupation_uri text references public.esco_occupations (uri) on delete set null,
  isco_code char(4),
  seniority public.seniority_level,
  esco_skills jsonb not null default '[]'::jsonb,          -- [{"uri":..,"label":..,"importance":"must"|"nice"}]
  education_requirement jsonb,                            -- {"min_eqf":6,"explicit":true} only if the ad states it
  work_values jsonb,
  classification_confidence numeric(3, 2),
  needs_review boolean not null default false,
  review_reasons text[] not null default '{}',
  moderation_note text,
  -- lifecycle
  status public.job_status not null default 'published',
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  missed_runs int not null default 0,
  -- dedup
  dedup_group_id uuid references public.dedup_groups (id) on delete set null,
  dedup_key text,
  is_golden boolean not null default true,
  content_hash text,
  embedding extensions.vector(768),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, external_id)
);
create index jobs_status_golden on public.jobs (status, is_golden);
create index jobs_apply_url_norm on public.jobs (apply_url_normalized);
create index jobs_dedup_key on public.jobs (dedup_key);
create index jobs_company on public.jobs (company_id);
create index jobs_needs_review on public.jobs (needs_review) where needs_review;
create index jobs_embedding_hnsw on public.jobs using hnsw (embedding extensions.vector_cosine_ops);
create trigger jobs_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();

alter table public.dedup_groups
  add constraint dedup_groups_golden_fk foreign key (golden_job_id) references public.jobs (id) on delete set null;

-- ─── Matching ────────────────────────────────────────────────────────────────

create table public.matching_model_versions (
  id uuid primary key default gen_random_uuid(),
  version int not null unique,
  name text not null,
  notes text,
  config jsonb not null,  -- ModelConfig: weights, knockouts, thresholds, salary norms (see src/core/matching/config.ts)
  is_active boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  activated_by uuid references public.profiles (id) on delete set null
);
create unique index matching_model_versions_one_active on public.matching_model_versions (is_active) where is_active;

-- Model versions are immutable (only activation fields may change).
create or replace function public.protect_model_version() returns trigger
language plpgsql as $$
begin
  if new.config is distinct from old.config or new.version <> old.version or new.name <> old.name then
    raise exception 'matching_model_versions are immutable; create a new version instead';
  end if;
  return new;
end $$;
create trigger matching_model_versions_immutable before update on public.matching_model_versions
  for each row execute function public.protect_model_version();

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  model_version_id uuid not null references public.matching_model_versions (id),
  total_score numeric(5, 2) not null,
  label text not null check (label in ('strong', 'good', 'possible', 'weak')),
  component_scores jsonb not null,
  explanation jsonb not null,     -- {reasons:[{key,params}], gaps:[...], notes:[...]}
  knockouts jsonb not null,       -- [{rule,status,reasonKey,params}]
  knocked_out boolean not null default false,
  limited_data boolean not null default false,
  input_hash text not null,
  seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, job_id)
);
create index matches_user_score on public.matches (user_id, knocked_out, total_score desc);
create trigger matches_updated_at before update on public.matches
  for each row execute function public.set_updated_at();

create table public.match_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  match_id uuid references public.matches (id) on delete set null,
  type public.feedback_type not null,
  reason text check (reason in ('salary', 'location', 'role', 'language', 'sponsorship', 'seniority', 'company', 'contract', 'already_applied', 'other')),
  comment text check (char_length(comment) <= 1000),
  created_at timestamptz not null default now()
);
create index match_feedback_user_job on public.match_feedback (user_id, job_id, created_at desc);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  status public.application_status not null default 'saved',
  position int not null default 0,
  notes text check (char_length(notes) <= 5000),
  saved_at timestamptz not null default now(),
  applied_at timestamptz,
  interview_at timestamptz,
  offer_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, job_id)
);
create trigger applications_updated_at before update on public.applications
  for each row execute function public.set_updated_at();

create table public.alert_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  enabled boolean not null default false,
  frequency public.alert_frequency not null default 'weekly',
  min_score smallint not null default 70 check (min_score between 0 and 100),
  only_sponsoring boolean not null default false,
  updated_at timestamptz not null default now()
);
create trigger alert_settings_updated_at before update on public.alert_settings
  for each row execute function public.set_updated_at();

-- Prepared for phase 2 (alert e-mails): delivery log.
create table public.alert_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  match_ids uuid[] not null,
  sent_at timestamptz not null default now()
);

-- ─── Compliance ──────────────────────────────────────────────────────────────

-- Append-only consent history; current state = latest row per (user, type).
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.consent_type not null,
  granted boolean not null,
  policy_version text not null,
  created_at timestamptz not null default now()
);
create index consents_user_type on public.consents (user_id, type, created_at desc);

create table public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  email_hash text not null,
  reason text,
  source text not null default 'user' check (source in ('user', 'retention', 'admin')),
  status public.deletion_status not null default 'pending',
  requested_at timestamptz not null default now(),
  processed_at timestamptz
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,           -- no FK: must survive user deletion
  actor_role text,         -- 'user' | 'admin' | 'system'
  action text not null,    -- e.g. 'match.compute', 'connector.update', 'model.activate'
  entity_type text,
  entity_id text,
  model_version_id uuid,
  input_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_action_time on public.audit_log (action, created_at desc);
create index audit_log_entity on public.audit_log (entity_type, entity_id);

-- ─── Prepared for later phases (employer portal) ─────────────────────────────

create table public.employer_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now()
);
