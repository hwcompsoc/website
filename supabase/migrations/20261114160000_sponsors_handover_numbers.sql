-- The Industry Liaison's sponsor list, each role's handover note, and the society's numbers each term.

-- Kept simple on purpose: four statuses, a contact and a follow-up date. A follow-up date becomes a task.
create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  status text not null default 'not-contacted' check (status in ('not-contacted', 'contacted', 'in-talks', 'approved')),
  contact_id uuid references public.directory_entries (id) on delete set null,
  website text check (website is null or website ~ '^https://\S+$'),
  notes text not null default '' check (length(notes) <= 2000),
  follow_up_on date,
  updated_by text default lower(auth.jwt() ->> 'email'),
  updated_at timestamptz not null default now()
);

create function private.sponsors_before_write() returns trigger
language plpgsql set search_path = ''
as $$ begin new.updated_at := now(); new.updated_by := lower(auth.jwt() ->> 'email'); return new; end; $$;
create trigger sponsors_before_write before insert or update on public.sponsors
  for each row execute function private.sponsors_before_write();

create function private.sponsors_tasks() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.follow_up_on is not distinct from old.follow_up_on then return null; end if;
  update public.tasks set status = 'done' where kind = 'sponsor' and status = 'open' and details ->> 'sponsor_id' = new.id::text;
  if new.follow_up_on is not null then
    insert into public.tasks (title, assignee_role, due_on, kind, details, created_by)
    values ('Follow up with ' || new.name, 'industry-liaison', new.follow_up_on, 'sponsor', jsonb_build_object('href', '/admin/sponsors', 'sponsor_id', new.id), null);
  end if;
  return null;
end;
$$;
create trigger sponsors_tasks after insert or update on public.sponsors
  for each row execute function private.sponsors_tasks();

-- One living note per role, for whoever holds it next.
create table public.handover_notes (
  role text primary key references public.committee_roles (key) on delete cascade on update cascade,
  body text not null default '' check (length(body) <= 20000),
  updated_by text default lower(auth.jwt() ->> 'email'),
  updated_at timestamptz not null default now()
);
create trigger handover_before_write before insert or update on public.handover_notes
  for each row execute function private.sponsors_before_write();

-- Who can write a role's note: whoever holds it, and anyone who sees everything.
create function private.holds_role(role_key text) returns boolean
language sql stable security definer set search_path = ''
as $$ select private.sees_all() or exists (select 1 from public.committee_member_roles where email = lower(auth.jwt() ->> 'email') and role = role_key) $$;
revoke all on function private.holds_role(text) from public, anon;
grant execute on function private.holds_role(text) to authenticated;

-- The society's numbers each term. Events and attendance are worked out in the admin; the rest is typed in.
create table public.term_numbers (
  term text primary key check (term ~ '^\d{4}-\d{2} (Semester 1|Semester 2|Summer)$'),
  discord_members integer check (discord_members is null or discord_members >= 0),
  instagram_followers integer check (instagram_followers is null or instagram_followers >= 0),
  linkedin_followers integer check (linkedin_followers is null or linkedin_followers >= 0),
  luma_signups integer check (luma_signups is null or luma_signups >= 0),
  website_visitors integer check (website_visitors is null or website_visitors >= 0),
  notes text not null default '' check (length(notes) <= 1000),
  updated_by text default lower(auth.jwt() ->> 'email'),
  updated_at timestamptz not null default now()
);
create trigger term_numbers_before_write before insert or update on public.term_numbers
  for each row execute function private.sponsors_before_write();

alter table public.sponsors enable row level security;
alter table public.handover_notes enable row level security;
alter table public.term_numbers enable row level security;
revoke all on public.sponsors, public.handover_notes, public.term_numbers from anon, authenticated;
grant select, insert, update, delete on public.sponsors, public.handover_notes, public.term_numbers to authenticated;
create policy "Committee can see sponsors" on public.sponsors for select to authenticated using ((select private.is_committee()));
create policy "Sponsor roles can add sponsors" on public.sponsors for insert to authenticated with check ((select private.can('sponsors')));
create policy "Sponsor roles can change sponsors" on public.sponsors for update to authenticated using ((select private.can('sponsors'))) with check ((select private.can('sponsors')));
create policy "Sponsor roles can remove sponsors" on public.sponsors for delete to authenticated using ((select private.can('sponsors')));
create policy "Committee can read handover notes" on public.handover_notes for select to authenticated using ((select private.is_committee()));
create policy "Role holders can start their note" on public.handover_notes for insert to authenticated with check ((select private.holds_role(role)));
create policy "Role holders can change their note" on public.handover_notes for update to authenticated using ((select private.holds_role(role))) with check ((select private.holds_role(role)));
create policy "Committee can read the numbers" on public.term_numbers for select to authenticated using ((select private.is_committee()));
create policy "Committee can add numbers" on public.term_numbers for insert to authenticated with check ((select private.is_committee()));
create policy "Committee can change numbers" on public.term_numbers for update to authenticated using ((select private.is_committee())) with check ((select private.is_committee()));
