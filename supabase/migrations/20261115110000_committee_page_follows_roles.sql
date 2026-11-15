-- The About page's committee follows the roles Owners give on the People page, so a handover only changes one place.
-- A team on the Committee page can follow one role. Giving someone that role puts them in the team, taking it away removes
-- them, and renaming them on People renames them here. Photos, bios and order are still edited on the Committee page, and a
-- team that follows no role works as before. Roles still only ever come from People, which only Owners can change: nothing on
-- the Committee page can give anyone access.

alter table public.committee_teams add column role text unique references public.committee_roles (key) on delete set null on update cascade;
-- Which About page entry each role holder has, if their role's team exists and they have a name.
alter table public.committee_member_roles add column person_id uuid references public.committee_people (id) on delete set null;

-- Today's teams follow the role with the same name, and the Events team follows Events Organisers.
update public.committee_teams t set role = r.key from public.committee_roles r where lower(trim(t.name)) = lower(trim(r.name));
update public.committee_teams set role = 'events'
  where lower(trim(name)) = 'events team' and role is null and not exists (select 1 from public.committee_teams where role = 'events');

-- Changes made here by the database itself, rather than by someone editing the Committee page.
create function private.syncing() returns boolean
language sql stable set search_path = ''
as $$ select coalesce(current_setting('compsoc.syncing', true), '') = 'on' $$;

-- Puts one role holder on the About page: the entry in their role's team with their name, if there's one nobody else holds,
-- so its photo and bio are kept, or else a new entry at the end of the team.
create function private.show_role_holder(holder text, role_key text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  team uuid;
  who text;
  person uuid;
begin
  select id into team from public.committee_teams where role = role_key;
  select name into who from public.committee_members where email = holder;
  if team is null or who is null then return; end if;
  perform set_config('compsoc.syncing', 'on', true);
  select p.id into person from public.committee_people p
    where p.team_id = team and lower(trim(p.name)) = lower(trim(who))
      and not exists (select 1 from public.committee_member_roles m where m.person_id = p.id)
    order by p.position limit 1;
  if person is null then
    insert into public.committee_people (team_id, name, position)
    values (team, who, coalesce((select max(position) from public.committee_people where team_id = team), 0) + 1)
    returning id into person;
  end if;
  update public.committee_member_roles set person_id = person where email = holder and role = role_key;
  perform set_config('compsoc.syncing', '', true);
end;
$$;

create function private.member_roles_follow() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.show_role_holder(new.email, new.role);
  elsif old.person_id is not null then
    perform set_config('compsoc.syncing', 'on', true);
    delete from public.committee_people where id = old.person_id;
    perform set_config('compsoc.syncing', '', true);
  end if;
  return null;
end;
$$;
create trigger member_roles_follow after insert or delete on public.committee_member_roles
  for each row execute function private.member_roles_follow();

-- A new name renames their entries. Someone named for the first time is added to their roles' teams.
create function private.member_name_follow() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  held record;
begin
  if new.name is not distinct from old.name or new.name is null then return null; end if;
  perform set_config('compsoc.syncing', 'on', true);
  update public.committee_people set name = new.name
    where id in (select person_id from public.committee_member_roles where email = new.email and person_id is not null);
  perform set_config('compsoc.syncing', '', true);
  for held in select role from public.committee_member_roles where email = new.email and person_id is null loop
    perform private.show_role_holder(new.email, held.role);
  end loop;
  return null;
end;
$$;
create trigger member_name_follow after update of name on public.committee_members
  for each row execute function private.member_name_follow();

-- A team that starts following a role gets its holders. One that stops keeps its people, no longer tied to anyone.
create function private.team_role_follow() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  holder record;
begin
  if tg_op = 'UPDATE' and new.role is not distinct from old.role then return null; end if;
  if tg_op = 'UPDATE' and old.role is not null then
    update public.committee_member_roles set person_id = null
      where role = old.role and person_id in (select id from public.committee_people where team_id = new.id);
  end if;
  if new.role is not null then
    for holder in select email from public.committee_member_roles where role = new.role loop
      perform private.show_role_holder(holder.email, new.role);
    end loop;
  end if;
  return null;
end;
$$;
create trigger team_role_follow after insert or update of role on public.committee_teams
  for each row execute function private.team_role_follow();

-- Only Owners choose which role a team follows.
create function private.teams_role_owner_only() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if coalesce(auth.jwt() ->> 'email', '') <> '' and not private.is_owner()
     and new.role is distinct from (case when tg_op = 'UPDATE' then old.role end) then
    raise exception 'Only an Owner can choose which role a team follows.';
  end if;
  return new;
end;
$$;
create trigger teams_role_owner_only before insert or update of role on public.committee_teams
  for each row execute function private.teams_role_owner_only();

-- Someone on the About page because of their role is renamed, moved or removed on the People page, not here.
create function private.people_follow_roles() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  holder text;
begin
  if private.syncing() or coalesce(auth.jwt() ->> 'email', '') = '' then return case when tg_op = 'DELETE' then old else new end; end if;
  select coalesce(m.name, m.email) into holder from public.committee_member_roles r join public.committee_members m on m.email = r.email
    where r.person_id = old.id limit 1;
  if holder is not null and (tg_op = 'DELETE' or new.name is distinct from old.name or new.team_id is distinct from old.team_id) then
    raise exception '% is here because of their role. An Owner changes their name or role on the People page.', holder;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
create trigger people_follow_roles before update or delete on public.committee_people
  for each row execute function private.people_follow_roles();

revoke all on function private.syncing(), private.show_role_holder(text, text), private.member_roles_follow(), private.member_name_follow(),
  private.team_role_follow(), private.teams_role_owner_only(), private.people_follow_roles() from public, anon, authenticated;

-- Anyone who already holds a role, and has a name, joins their role's team.
do $backfill$
declare
  held record;
begin
  for held in select email, role from public.committee_member_roles where person_id is null loop
    perform private.show_role_holder(held.email, held.role);
  end loop;
end
$backfill$;
