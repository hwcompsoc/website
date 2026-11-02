-- Events, and who may manage them. The checklist is enforced here, so nothing can publish an event that skipped a step.
-- The committee's email addresses are added separately, because this repository is public.

create schema if not exists private;
grant usage on schema private to authenticated;

create table public.committee_members (
  email text primary key check (email = lower(email) and email like '%@%'),
  created_at timestamptz not null default now()
);
alter table public.committee_members enable row level security;
revoke all on public.committee_members from anon, authenticated;

create function private.is_committee() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.committee_members where email = lower(auth.jwt() ->> 'email')) $$;
revoke all on function private.is_committee() from public, anon;
grant execute on function private.is_committee() to authenticated;

grant select on public.committee_members to authenticated;
create policy "Committee can see the committee" on public.committee_members
  for select to authenticated using ((select private.is_committee()));

-- Stops strangers creating accounts or using up the sign-in email allowance. Switched on in Auth > Hooks.
create function public.hook_restrict_signup_to_committee(event jsonb) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if exists (select 1 from public.committee_members where email = lower(event -> 'user' ->> 'email')) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'This sign-in is for the CompSoc committee.'));
end;
$$;
revoke all on function public.hook_restrict_signup_to_committee(jsonb) from public, anon, authenticated;
grant execute on function public.hook_restrict_signup_to_committee(jsonb) to supabase_auth_admin;

create table public.events (
  id uuid primary key default gen_random_uuid(),
  -- The event's permanent address and calendar ID: /events/<slug>.
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 60),
  title text not null check (length(trim(title)) between 1 and 80),
  category text not null default 'Workshop' check (category in ('Workshop', 'Community', 'Industry')),
  level text not null default 'Everyone welcome' check (length(trim(level)) between 1 and 40),
  starts_at timestamptz,
  ends_at timestamptz,
  venue text not null default '' check (length(venue) <= 120),
  description text not null default '' check (length(description) <= 600),
  signup_required boolean not null default true,
  native_url text check (native_url ~ '^https://\S+$'),
  luma_url text check (luma_url ~ '^https://\S+$'),
  socials_sent boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published', 'cancelled')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  constraint ends_after_start check (ends_at > starts_at),
  constraint checklist_complete_before_publishing check (
    status = 'draft' or (
      starts_at is not null and ends_at is not null
      and length(trim(venue)) > 0 and length(trim(description)) > 0
      and native_url is not null
      and (not signup_required or luma_url is not null)
      and socials_sent
    )
  )
);
create index events_public_by_date on public.events (starts_at) where status <> 'draft';

create function private.events_before_write() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  if tg_op = 'UPDATE' and old.published_at is not null and new.slug <> old.slug then
    raise exception 'An event''s address can''t change once it has been published.';
  end if;
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;
create trigger events_before_write before insert or update on public.events
  for each row execute function private.events_before_write();

alter table public.events enable row level security;

-- Visitors, and the site's build, can only read the public columns of live events.
revoke all on public.events from anon, authenticated;
grant select (slug, title, category, level, starts_at, ends_at, venue, description, signup_required, luma_url, status) on public.events to anon;
grant select, insert, update, delete on public.events to authenticated;

create policy "Anyone can read live events" on public.events
  for select to anon using (status in ('published', 'cancelled'));
create policy "Committee can read all events" on public.events
  for select to authenticated using ((select private.is_committee()));
create policy "Committee can add events" on public.events
  for insert to authenticated with check ((select private.is_committee()));
create policy "Committee can edit events" on public.events
  for update to authenticated using ((select private.is_committee())) with check ((select private.is_committee()));
create policy "Committee can delete drafts" on public.events
  for delete to authenticated using ((select private.is_committee()) and status = 'draft');

-- Any change the public can see rebuilds the site, which copies live events in. It does nothing until the
-- Vercel deploy hook is saved in Vault as `vercel_deploy_hook`.
create extension if not exists pg_net with schema extensions;

create function private.rebuild_site() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  hook text;
begin
  if (tg_op <> 'INSERT' and old.status <> 'draft') or (tg_op <> 'DELETE' and new.status <> 'draft') then
    select decrypted_secret into hook from vault.decrypted_secrets where name = 'vercel_deploy_hook' limit 1;
    if hook is not null then
      perform net.http_post(url := hook, headers := '{"Content-Type":"application/json"}'::jsonb, body := '{}'::jsonb);
    end if;
  end if;
  return null;
end;
$$;
revoke all on function private.rebuild_site() from public, anon, authenticated;
create trigger events_rebuild_site after insert or update or delete on public.events
  for each row execute function private.rebuild_site();
