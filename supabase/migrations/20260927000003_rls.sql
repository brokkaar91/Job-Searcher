-- JobMatch – Row Level Security on ALL tables + column-level update grants.

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Reference data: readable by everyone, writable by admins.
create policy "esco_skills read" on public.esco_skills for select using (true);
create policy "esco_skills admin write" on public.esco_skills for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "esco_occupations read" on public.esco_occupations for select using (true);
create policy "esco_occupations admin write" on public.esco_occupations for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "city_locations read" on public.city_locations for select using (true);

-- Profiles: own row; admins read all and may change roles.
create policy "profiles select own" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "profiles update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles admin update" on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());
-- Users may only touch harmless columns; role changes go through the admin server action (service role).
revoke update on public.profiles from authenticated;
grant update (locale, last_active_at) on public.profiles to authenticated;

-- Candidate data: owner full access, admins read.
create policy "candidate_profiles own" on public.candidate_profiles for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "candidate_profiles admin read" on public.candidate_profiles for select to authenticated using (public.is_admin());
create policy "candidate_skills own" on public.candidate_skills for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "candidate_experiences own" on public.candidate_experiences for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "candidate_languages own" on public.candidate_languages for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "cv_files own read" on public.cv_files for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "cv_files own insert" on public.cv_files for insert to authenticated with check (user_id = auth.uid());
create policy "cv_files own delete" on public.cv_files for delete to authenticated using (user_id = auth.uid());
-- Embeddings / parse results are written by the worker (service role) only.
revoke update on public.candidate_profiles from authenticated;
grant update (
  headline, summary, seniority, education_level,
  preferences, riasec, riasec_answers, work_values, onboarding_step, onboarding_completed_at, current_cv_id
) on public.candidate_profiles to authenticated;
revoke update on public.cv_files from authenticated;

-- Companies & published jobs: readable by signed-in users.
create policy "companies read" on public.companies for select using (true);
create policy "companies admin write" on public.companies for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "jobs read published" on public.jobs for select to authenticated using ((status = 'published' and is_golden) or public.is_admin());
create policy "jobs read matched" on public.jobs for select to authenticated using (
  exists (select 1 from public.matches m where m.job_id = jobs.id and m.user_id = auth.uid())
  or exists (select 1 from public.applications a where a.job_id = jobs.id and a.user_id = auth.uid())
);
create policy "jobs admin write" on public.jobs for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Connector infrastructure: admin only. connector_secrets: NO policies → service role only.
create policy "connectors admin" on public.connectors for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "field_mappings admin" on public.field_mappings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "connector_runs admin read" on public.connector_runs for select to authenticated using (public.is_admin());
create policy "job_raw admin read" on public.job_raw for select to authenticated using (public.is_admin());
create policy "dedup_groups admin read" on public.dedup_groups for select to authenticated using (public.is_admin());

-- Matching model: active version is public (transparency page); admins see all and insert new ones.
create policy "model versions read active" on public.matching_model_versions for select using (is_active or public.is_admin());
create policy "model versions admin insert" on public.matching_model_versions for insert to authenticated with check (public.is_admin());

-- Matches: owner reads; may only mark as seen. Written by the worker (service role).
create policy "matches own read" on public.matches for select to authenticated using (user_id = auth.uid());
create policy "matches own update" on public.matches for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update on public.matches from authenticated;
grant update (seen_at) on public.matches to authenticated;

create policy "match_feedback own" on public.match_feedback for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "match_feedback admin read" on public.match_feedback for select to authenticated using (public.is_admin());
create policy "applications own" on public.applications for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "applications admin read" on public.applications for select to authenticated using (public.is_admin());
create policy "alert_settings own" on public.alert_settings for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "alert_deliveries own read" on public.alert_deliveries for select to authenticated using (user_id = auth.uid());

-- Consents: append-only for the owner.
create policy "consents own read" on public.consents for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "consents own insert" on public.consents for insert to authenticated with check (user_id = auth.uid());

create policy "deletion_requests own" on public.deletion_requests for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "deletion_requests own insert" on public.deletion_requests for insert to authenticated with check (user_id = auth.uid());
create policy "deletion_requests admin update" on public.deletion_requests for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Audit log: admins read; nobody but the service role / definer functions writes. Never updated.
create policy "audit_log admin read" on public.audit_log for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.audit_log from authenticated, anon;

create policy "employer_accounts admin" on public.employer_accounts for all to authenticated using (public.is_admin()) with check (public.is_admin());
