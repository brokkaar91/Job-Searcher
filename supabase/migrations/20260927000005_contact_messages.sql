-- Employer contact form (public placeholder page). Written by a server action with the service role.
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) <= 200),
  email text not null check (char_length(email) <= 320),
  company text check (char_length(company) <= 200),
  message text not null check (char_length(message) <= 5000),
  locale text,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.contact_messages enable row level security;
create policy "contact_messages admin" on public.contact_messages for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
