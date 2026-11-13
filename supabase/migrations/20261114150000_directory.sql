-- The help directory: things that rarely change and are useful to look up. Contacts at the SU, the department, the careers
-- service, venues and companies; useful links; and who holds each login. Never passwords: a login entry says who has it and
-- where it's kept, so it can be handed over.

create table public.directory_entries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('contact', 'link', 'login')),
  name text not null check (length(trim(name)) between 1 and 120),
  -- For a contact, their role or organisation. For a link or login, what it's for.
  about text not null default '' check (length(about) <= 200),
  email text check (email is null or email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  phone text check (phone is null or length(phone) <= 40),
  url text check (url is null or url ~ '^https://\S+$'),
  holder_email text references public.committee_members (email) on delete set null on update cascade,
  notes text not null default '' check (length(notes) <= 1000),
  -- Company contacts the Industry Liaison looks after, so the sponsor list can show them.
  organisation text not null default '' check (length(organisation) <= 120),
  updated_by text default lower(auth.jwt() ->> 'email'),
  updated_at timestamptz not null default now()
);

create function private.directory_before_write() returns trigger
language plpgsql set search_path = ''
as $$ begin new.updated_at := now(); new.updated_by := lower(auth.jwt() ->> 'email'); return new; end; $$;
create trigger directory_before_write before insert or update on public.directory_entries
  for each row execute function private.directory_before_write();

alter table public.directory_entries enable row level security;
revoke all on public.directory_entries from anon, authenticated;
grant select, insert, update, delete on public.directory_entries to authenticated;
create policy "Committee can read the directory" on public.directory_entries for select to authenticated using ((select private.is_committee()));
create policy "Committee can add to the directory" on public.directory_entries for insert to authenticated with check ((select private.is_committee()));
create policy "Committee can change the directory" on public.directory_entries for update to authenticated using ((select private.is_committee())) with check ((select private.is_committee()));
create policy "Committee can remove from the directory" on public.directory_entries for delete to authenticated using ((select private.is_committee()));
