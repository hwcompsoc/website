-- Cover images. The admin shrinks each image in the browser, which also strips location data from photos, and saves a full size
-- `<id>.jpg` and a small `<id>-thumb.jpg`. The public site copies them in when it builds, so it doesn't rely on Supabase being up.
alter table public.events add column cover_path text check (cover_path ~ '^[0-9a-f-]{36}\.jpg$');
grant select (cover_path) on public.events to anon;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-covers', 'event-covers', true, 5242880, array['image/jpeg']);

-- Public means a file can be read by its random address. Only the committee can list, add or remove files.
create policy "Committee can see event covers" on storage.objects
  for select to authenticated using (bucket_id = 'event-covers' and (select private.is_committee()));
create policy "Committee can add event covers" on storage.objects
  for insert to authenticated with check (bucket_id = 'event-covers' and (select private.is_committee()));
create policy "Committee can remove event covers" on storage.objects
  for delete to authenticated using (bucket_id = 'event-covers' and (select private.is_committee()));
