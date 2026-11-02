-- A live event needs both images and a description of them. Applied once the admin that can add them is on the site.
alter table public.events drop constraint checklist_complete_before_publishing;
alter table public.events add constraint checklist_complete_before_publishing check (
  status = 'draft' or (
    starts_at is not null and ends_at is not null
    and length(trim(venue)) > 0 and length(trim(description)) > 0
    and cover_path is not null and square_path is not null and length(trim(cover_alt)) > 0
    and native_url is not null
    and (not signup_required or luma_url is not null)
    and socials_sent
  )
);
