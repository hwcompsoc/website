-- Committee roles, what each can see and do, and the tasks the committee shares.
-- Roles here are separate from committee_members.role, which only says who is an Owner of the admin, and from committee_teams,
-- which is what the About page shows. Owners give people roles and change what each role can do at /admin/people.
-- Owners can always do everything, so the admin can be set up and fixed before anyone has a role.

create table public.committee_roles (
  key text primary key check (key ~ '^[a-z]+(-[a-z]+)*$' and length(key) <= 40),
  name text not null check (length(trim(name)) between 1 and 60),
  position integer not null default 0,
  -- The roles whose tasks this role can see, besides its own people's. '*' means everyone's.
  sees text[] not null default '{}',
  create_events boolean not null default false,
  finances boolean not null default false,
  content_calendar boolean not null default false,
  sponsors boolean not null default false
);
insert into public.committee_roles (key, name, position, sees, create_events, finances, content_calendar, sponsors) values
  ('president', 'President', 1, '{*}', true, true, true, true),
  ('vice-president', 'Vice President', 2, '{*}', true, true, true, true),
  ('secretary', 'Secretary', 3, '{}', false, false, false, false),
  ('treasurer', 'Treasurer', 4, '{}', false, true, false, false),
  ('events', 'Events Organiser', 5, '{events}', true, false, true, false),
  ('socials', 'Social Media Manager', 6, '{socials}', false, false, true, false),
  ('industry-liaison', 'Industry Liaison', 7, '{}', false, false, false, true),
  ('community', 'Community Manager', 8, '{}', false, false, false, false);

create table public.committee_member_roles (
  email text not null references public.committee_members (email) on delete cascade on update cascade,
  role text not null references public.committee_roles (key) on delete cascade on update cascade,
  primary key (email, role)
);

-- The name shown on tasks, instead of an email address.
alter table public.committee_members add column name text check (name is null or length(trim(name)) between 1 and 80);

create function private.my_email() returns text
language sql stable set search_path = ''
as $$ select lower(auth.jwt() ->> 'email') $$;

create function private.is_owner() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.committee_members where email = lower(auth.jwt() ->> 'email') and role = 'owner') $$;

-- Whether the signed-in person can do something: 'create_events', 'finances', 'content_calendar' or 'sponsors'.
create function private.can(permission text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.is_owner() or exists (
    select 1 from public.committee_member_roles m join public.committee_roles r on r.key = m.role
    where m.email = lower(auth.jwt() ->> 'email')
      and case permission when 'create_events' then r.create_events when 'finances' then r.finances
        when 'content_calendar' then r.content_calendar when 'sponsors' then r.sponsors else false end)
$$;

create function private.sees_all() returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.is_owner() or exists (
    select 1 from public.committee_member_roles m join public.committee_roles r on r.key = m.role
    where m.email = lower(auth.jwt() ->> 'email') and '*' = any (r.sees))
$$;

-- A task is yours if it's assigned to you or one of your roles, or you made it. You also see the tasks of the roles yours can see:
-- tasks given to that role, and tasks given to anyone who holds it.
create function private.can_see_task(assignee_email text, assignee_role text, made_by text) returns boolean
language sql stable security definer set search_path = ''
as $$
  with me as (select lower(auth.jwt() ->> 'email') as email),
  mine as (select r.key, r.sees from public.committee_member_roles m join public.committee_roles r on r.key = m.role, me where m.email = me.email)
  select private.is_committee() and (
    assignee_email = (select email from me) or made_by = (select email from me) or private.sees_all()
    or (assignee_role is not null and exists (select 1 from mine where mine.key = assignee_role or assignee_role = any (mine.sees)))
    or (assignee_email is not null and exists (
      select 1 from mine join public.committee_member_roles theirs on theirs.email = assignee_email where theirs.role = any (mine.sees))))
$$;

revoke all on function private.my_email(), private.is_owner(), private.can(text), private.sees_all(), private.can_see_task(text, text, text) from public, anon;
grant execute on function private.my_email(), private.is_owner(), private.can(text), private.sees_all(), private.can_see_task(text, text, text) to authenticated;

-- Everything the admin needs to know about the signed-in person, worked out the same way the database checks it.
create function public.my_access() returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'roles', coalesce((select jsonb_agg(role order by role) from public.committee_member_roles where email = lower(auth.jwt() ->> 'email')), '[]'::jsonb),
    'sees_all', private.sees_all(),
    'create_events', private.can('create_events'),
    'finances', private.can('finances'),
    'content_calendar', private.can('content_calendar'),
    'sponsors', private.can('sponsors'))
  where private.is_committee()
$$;
revoke all on function public.my_access() from public, anon;
grant execute on function public.my_access() to authenticated;

alter table public.committee_roles enable row level security;
alter table public.committee_member_roles enable row level security;
revoke all on public.committee_roles, public.committee_member_roles from anon, authenticated;
grant select, insert, update, delete on public.committee_roles, public.committee_member_roles to authenticated;
create policy "Committee can see roles" on public.committee_roles for select to authenticated using ((select private.is_committee()));
create policy "Owners can add roles" on public.committee_roles for insert to authenticated with check ((select private.is_owner()));
create policy "Owners can change roles" on public.committee_roles for update to authenticated using ((select private.is_owner())) with check ((select private.is_owner()));
create policy "Owners can remove roles" on public.committee_roles for delete to authenticated using ((select private.is_owner()));
create policy "Committee can see who holds each role" on public.committee_member_roles for select to authenticated using ((select private.is_committee()));
create policy "Owners can give roles" on public.committee_member_roles for insert to authenticated with check ((select private.is_owner()));
create policy "Owners can take roles away" on public.committee_member_roles for delete to authenticated using ((select private.is_owner()));

-- Owners can name anyone, and everyone can name themselves. Only the name: access still changes through committee-access.
grant update (name) on public.committee_members to authenticated;
create policy "Owners and the person can change a name" on public.committee_members for update to authenticated
  using ((select private.is_owner()) or email = (select private.my_email()))
  with check ((select private.is_owner()) or email = (select private.my_email()));

-- Only the roles allowed to create events can add, change or delete them.
drop policy "Committee can add events" on public.events;
drop policy "Committee can edit events" on public.events;
drop policy "Committee can delete drafts" on public.events;
create policy "Event roles can add events" on public.events
  for insert to authenticated with check ((select private.can('create_events')));
create policy "Event roles can edit events" on public.events
  for update to authenticated using ((select private.can('create_events'))) with check ((select private.can('create_events')));
create policy "Event roles can delete drafts" on public.events
  for delete to authenticated using ((select private.can('create_events')) and status = 'draft');

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 160),
  notes text not null default '' check (length(notes) <= 4000),
  -- A person, a whole role (anyone in it can pick it up), or both: a role's task someone has picked up.
  assignee_email text references public.committee_members (email) on delete set null on update cascade,
  assignee_role text references public.committee_roles (key) on delete set null on update cascade,
  due_on date,
  status text not null default 'open' check (status in ('open', 'done', 'cancelled')),
  -- What made it: 'task' by hand, 'action' from minutes, and other kinds from the admin's own flows.
  kind text not null default 'task' check (kind ~ '^[a-z]+(-[a-z]+)*$' and length(kind) <= 30),
  event_id uuid references public.events (id) on delete cascade,
  link text check (link is null or link ~ '^https://\S+$'),
  details jsonb not null default '{}'::jsonb,
  created_by text default lower(auth.jwt() ->> 'email'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  done_by text,
  done_at timestamptz
);
create index tasks_open_by_due on public.tasks (due_on) where status = 'open';
create index tasks_by_event on public.tasks (event_id) where event_id is not null;
create index tasks_by_assignee on public.tasks (assignee_email);

create function private.tasks_before_write() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  if new.status = 'done' and (tg_op = 'INSERT' or old.status <> 'done') then
    new.done_at := now();
    new.done_by := coalesce(lower(auth.jwt() ->> 'email'), new.done_by);
  elsif new.status <> 'done' then
    new.done_at := null;
    new.done_by := null;
  end if;
  return new;
end;
$$;
create trigger tasks_before_write before insert or update on public.tasks
  for each row execute function private.tasks_before_write();

alter table public.tasks enable row level security;
revoke all on public.tasks from anon, authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
create policy "Committee sees the tasks they're allowed to" on public.tasks for select to authenticated
  using ((select private.can_see_task(assignee_email, assignee_role, created_by)));
create policy "Committee can add tasks" on public.tasks for insert to authenticated
  with check ((select private.is_committee()) and created_by = (select private.my_email()));
create policy "Committee can change tasks they can see" on public.tasks for update to authenticated
  using ((select private.can_see_task(assignee_email, assignee_role, created_by)))
  with check ((select private.is_committee()));
-- Deleting is for mistakes: whoever made it, or someone who sees everything. Finished work is marked done or cancelled instead.
create policy "Makers and leads can delete tasks" on public.tasks for delete to authenticated
  using ((select private.is_committee()) and (created_by = (select private.my_email()) or (select private.sees_all())));
