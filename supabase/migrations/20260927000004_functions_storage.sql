-- JobMatch – auth hooks, RPC helpers, storage bucket + policies.

-- New auth user → profile (+ consents passed as signup metadata, + empty candidate profile).
-- Metadata shape: {"locale":"nl","consents":{"terms_privacy":true,"ai_processing":true},"policy_version":"2026-09"}
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  loc text := case when meta->>'locale' in ('nl', 'en') then meta->>'locale' else 'nl' end;
  c record;
begin
  insert into public.profiles (id, email, locale) values (new.id, new.email, loc)
  on conflict (id) do nothing;
  insert into public.candidate_profiles (user_id) values (new.id) on conflict do nothing;
  insert into public.alert_settings (user_id) values (new.id) on conflict do nothing;
  if jsonb_typeof(meta->'consents') = 'object' then
    for c in select key, value from jsonb_each(meta->'consents') loop
      if c.key in ('terms_privacy', 'ai_processing', 'employer_sharing', 'marketing') then
        insert into public.consents (user_id, type, granted, policy_version)
        values (new.id, c.key::public.consent_type, (c.value)::text::boolean, coalesce(meta->>'policy_version', 'unknown'));
      end if;
    end loop;
  end if;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Current consent state per type.
create or replace view public.current_consents with (security_invoker = true) as
  select distinct on (user_id, type) user_id, type, granted, policy_version, created_at
  from public.consents
  order by user_id, type, created_at desc;

-- Record activity (used for the retention job). Cheap: only writes once per hour.
create or replace function public.touch_last_active() returns void
language sql security definer set search_path = public as $$
  update public.profiles set last_active_at = now(), retention_warning_sent_at = null
  where id = auth.uid() and last_active_at < now() - interval '1 hour';
$$;
revoke all on function public.touch_last_active() from public;
grant execute on function public.touch_last_active() to authenticated;

-- ESCO autocomplete (trigram + prefix), bilingual.
create or replace function public.search_esco_skills(q text, lim int default 10)
returns table (uri text, preferred_label_en text, preferred_label_nl text, skill_type text, score real)
language sql stable set search_path = public, extensions as $$
  select s.uri, s.preferred_label_en, s.preferred_label_nl, s.skill_type,
         greatest(similarity(s.search_text, lower(q)), case when s.search_text like '%' || lower(q) || '%' then 0.5 else 0 end)::real as score
  from public.esco_skills s
  where s.search_text % lower(q) or s.search_text like '%' || lower(q) || '%'
  order by score desc, length(s.preferred_label_en)
  limit least(lim, 25);
$$;
grant execute on function public.search_esco_skills(text, int) to anon, authenticated;

create or replace function public.search_esco_occupations(q text, lim int default 10)
returns table (uri text, isco_code char(4), preferred_label_en text, preferred_label_nl text, score real)
language sql stable set search_path = public, extensions as $$
  select o.uri, o.isco_code, o.preferred_label_en, o.preferred_label_nl,
         greatest(similarity(o.search_text, lower(q)), case when o.search_text like '%' || lower(q) || '%' then 0.5 else 0 end)::real as score
  from public.esco_occupations o
  where o.search_text % lower(q) or o.search_text like '%' || lower(q) || '%'
  order by score desc, length(o.preferred_label_en)
  limit least(lim, 25);
$$;
grant execute on function public.search_esco_occupations(text, int) to anon, authenticated;

-- Near-duplicate candidates for dedup layer 4 (service role only).
create or replace function public.similar_jobs(p_job_id uuid, p_min_similarity float default 0.9, p_limit int default 5)
returns table (job_id uuid, similarity float)
language sql stable set search_path = public, extensions as $$
  select j.id, 1 - (j.embedding <=> src.embedding) as similarity
  from public.jobs j, (select embedding from public.jobs where id = p_job_id) src
  where j.id <> p_job_id and j.embedding is not null and src.embedding is not null
    and j.status in ('published', 'pending_review')
    and 1 - (j.embedding <=> src.embedding) > p_min_similarity
  order by j.embedding <=> src.embedding
  limit p_limit;
$$;
revoke all on function public.similar_jobs(uuid, float, int) from public, anon, authenticated;
grant execute on function public.similar_jobs(uuid, float, int) to service_role;

-- ─── Storage: private CV bucket, files at cvs/<user_id>/<version>-<name> ───────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cvs', 'cvs', false, 10485760,
        array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do nothing;

create policy "cv owner read" on storage.objects for select to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "cv owner insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "cv owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);
