-- Committee meetings: what the minutes said should come back next time, when the next meeting is, and items people want on its agenda.
-- The minutes and agendas themselves live in the society's Google Drive. Only their links are kept here.

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 120),
  held_on date not null,
  minutes_link text check (minutes_link is null or minutes_link ~ '^https://\S+$'),
  -- Things the meeting agreed to come back to, from the minutes' "Next meeting" section.
  carried_forward text[] not null default '{}',
  -- The meeting after this one, and its agenda once the Secretary has saved it.
  next_on date,
  next_agenda_link text check (next_agenda_link is null or next_agenda_link ~ '^https://\S+$'),
  created_by text default lower(auth.jwt() ->> 'email'),
  created_at timestamptz not null default now()
);
create index meetings_by_date on public.meetings (held_on desc);

-- Anyone on the committee can ask for something to be on the next agenda. Items are marked used once an agenda includes them.
create table public.agenda_items (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 200),
  added_by text default lower(auth.jwt() ->> 'email'),
  added_at timestamptz not null default now(),
  used boolean not null default false
);

alter table public.meetings enable row level security;
alter table public.agenda_items enable row level security;
revoke all on public.meetings, public.agenda_items from anon, authenticated;
grant select, insert, update, delete on public.meetings, public.agenda_items to authenticated;
create policy "Committee can read meetings" on public.meetings for select to authenticated using ((select private.is_committee()));
create policy "Committee can add meetings" on public.meetings for insert to authenticated with check ((select private.is_committee()));
create policy "Committee can change meetings" on public.meetings for update to authenticated using ((select private.is_committee())) with check ((select private.is_committee()));
create policy "Committee can delete meetings" on public.meetings for delete to authenticated using ((select private.is_committee()));
create policy "Committee can read agenda items" on public.agenda_items for select to authenticated using ((select private.is_committee()));
create policy "Committee can add agenda items" on public.agenda_items for insert to authenticated with check ((select private.is_committee()));
create policy "Committee can change agenda items" on public.agenda_items for update to authenticated using ((select private.is_committee())) with check ((select private.is_committee()));
create policy "Committee can delete agenda items" on public.agenda_items for delete to authenticated using ((select private.is_committee()));
