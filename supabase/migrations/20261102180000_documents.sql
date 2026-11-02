-- Approved society documents on the About page, such as the constitution. There's no draft stage: uploading one publishes it.
-- Anyone can read them, and any committee member can change them.
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 120),
  approved_on date not null,
  file_path text not null check (file_path ~ '^[0-9a-f-]{36}\.pdf$'),
  size_bytes integer not null check (size_bytes > 0),
  position integer not null default 0
);
alter table public.documents enable row level security;
revoke all on public.documents from anon, authenticated;
grant select on public.documents to anon;
grant select, insert, update, delete on public.documents to authenticated;
create policy "Anyone can read documents" on public.documents for select to anon, authenticated using (true);
create policy "Committee can add documents" on public.documents for insert to authenticated with check ((select private.is_committee()));
create policy "Committee can edit documents" on public.documents for update to authenticated using ((select private.is_committee())) with check ((select private.is_committee()));
create policy "Committee can delete documents" on public.documents for delete to authenticated using ((select private.is_committee()));

-- PDFs of up to 20 MB. Public means a file can be read by its random address. Only the committee can list, add or remove files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('society-documents', 'society-documents', true, 20971520, array['application/pdf']);
create policy "Committee can see society documents" on storage.objects
  for select to authenticated using (bucket_id = 'society-documents' and (select private.is_committee()));
create policy "Committee can add society documents" on storage.objects
  for insert to authenticated with check (bucket_id = 'society-documents' and (select private.is_committee()));
create policy "Committee can remove society documents" on storage.objects
  for delete to authenticated using (bucket_id = 'society-documents' and (select private.is_committee()));

create trigger documents_rebuild_site after insert or update or delete on public.documents
  for each statement execute function private.rebuild_site_for_content();
