-- The site launches without example guides: the originals become drafts for the committee to finish, and "sample" stops being a status.
update public.guides set status = 'draft' where status = 'sample';

alter table public.guides drop constraint guides_status_check;
alter table public.guides add constraint guides_status_check check (status in ('draft', 'confirmed'));
