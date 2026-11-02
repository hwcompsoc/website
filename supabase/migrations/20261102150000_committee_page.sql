-- What the About page says about the committee, edited in the admin. This is separate from committee_members, which decides who can sign in:
-- someone can appear here without an account, and the other way round. Anyone can read it, and any committee member can change it.
create table public.committee_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 60),
  description text not null default '' check (length(description) <= 200),
  position integer not null default 0
);
create table public.committee_people (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.committee_teams (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  photo_path text check (photo_path ~ '^[0-9a-f-]{36}\.(jpg|webp)$'),
  position integer not null default 0
);
create index committee_people_team on public.committee_people (team_id, position);

alter table public.committee_teams enable row level security;
alter table public.committee_people enable row level security;
revoke all on public.committee_teams, public.committee_people from anon, authenticated;
grant select on public.committee_teams, public.committee_people to anon;
grant select, insert, update, delete on public.committee_teams, public.committee_people to authenticated;

create policy "Anyone can read teams" on public.committee_teams for select to anon, authenticated using (true);
create policy "Committee can add teams" on public.committee_teams for insert to authenticated with check ((select private.is_committee()));
create policy "Committee can edit teams" on public.committee_teams for update to authenticated using ((select private.is_committee())) with check ((select private.is_committee()));
create policy "Committee can delete teams" on public.committee_teams for delete to authenticated using ((select private.is_committee()));
create policy "Anyone can read people" on public.committee_people for select to anon, authenticated using (true);
create policy "Committee can add people" on public.committee_people for insert to authenticated with check ((select private.is_committee()));
create policy "Committee can edit people" on public.committee_people for update to authenticated using ((select private.is_committee())) with check ((select private.is_committee()));
create policy "Committee can delete people" on public.committee_people for delete to authenticated using ((select private.is_committee()));

-- Photos, square and small. Public means a file can be read by its random address. Only the committee can list, add or remove files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('committee-photos', 'committee-photos', true, 1048576, array['image/jpeg', 'image/webp']);
create policy "Committee can see committee photos" on storage.objects
  for select to authenticated using (bucket_id = 'committee-photos' and (select private.is_committee()));
create policy "Committee can add committee photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'committee-photos' and (select private.is_committee()));
create policy "Committee can remove committee photos" on storage.objects
  for delete to authenticated using (bucket_id = 'committee-photos' and (select private.is_committee()));

-- Any change rebuilds the site. Once per statement, so reordering two rows only asks once.
create function private.rebuild_site_for_content() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  hook text;
begin
  select decrypted_secret into hook from vault.decrypted_secrets where name = 'vercel_deploy_hook' limit 1;
  if hook is not null then
    perform net.http_post(url := hook, headers := '{"Content-Type":"application/json"}'::jsonb, body := '{}'::jsonb, timeout_milliseconds := 30000);
  end if;
  return null;
end;
$$;
revoke all on function private.rebuild_site_for_content() from public, anon, authenticated;

-- Today's committee, as the site has it. The triggers are added afterwards, so seeding doesn't rebuild the site.
with teams (position, name, description) as (values
  (1, 'President', 'Helps coordinate the society and its direction.'),
  (2, 'Vice President', 'Supports the president and keeps projects moving.'),
  (3, 'Secretary', 'Helps maintain records and continuity.'),
  (4, 'Treasurer', 'Helps keep the society’s finances organised.'),
  (5, 'Industry Liaison', 'Helps build conversations with organisations and supporters.'),
  (6, 'Community Manager', 'Helps people find their place in the community.'),
  (7, 'Social Media Manager', 'Shares what’s happening on Instagram and Discord.'),
  (8, 'Events team', 'Helps turn activity ideas into welcoming experiences.')
), added as (
  insert into public.committee_teams (position, name, description) select position, name, description from teams returning id, name
), people (team, position, name) as (values
  ('President', 1, 'Ryan Dawson'),
  ('Vice President', 1, 'Thomas Prowse'),
  ('Secretary', 1, 'Ella Koleola'),
  ('Treasurer', 1, 'Nathan Walker'),
  ('Industry Liaison', 1, 'Lewis Robertson'),
  ('Community Manager', 1, 'Kevin Paul Job'),
  ('Social Media Manager', 1, 'Amanda Zhang'),
  ('Events team', 1, 'Divine Halim'),
  ('Events team', 2, 'Alex Munoz Rueda'),
  ('Events team', 3, 'Raymond Shell'),
  ('Events team', 4, 'Pierrie Touaro')
)
insert into public.committee_people (team_id, position, name)
select added.id, people.position, people.name from people join added on added.name = people.team;

create trigger committee_teams_rebuild_site after insert or update or delete on public.committee_teams
  for each statement execute function private.rebuild_site_for_content();
create trigger committee_people_rebuild_site after insert or update or delete on public.committee_people
  for each statement execute function private.rebuild_site_for_content();
