-- Most events go on Native, but not all, so an organiser can skip that step. A live event needs a Native link or that choice.
-- Apply this before the admin that sends native_skipped is on the site, or saving an event fails.
alter table public.events add column native_skipped boolean not null default false;
alter table public.events drop constraint checklist_complete_before_publishing;
alter table public.events add constraint checklist_complete_before_publishing check (
  status = 'draft' or (
    starts_at is not null and ends_at is not null
    and length(trim(venue)) > 0 and length(trim(description)) > 0
    and cover_path is not null and square_path is not null and length(trim(cover_alt)) > 0
    and (native_url is not null or native_skipped)
    and (not signup_required or luma_url is not null)
    and socials_sent
  )
);
