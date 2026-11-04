-- An event's category now only says what format it is, because a workshop could also count as "Industry", say.
-- Guides have their own categories, which don't change. Apply this before the admin that offers the new ones is on the site.
alter table public.events drop constraint events_category_check;
update public.events set category = case category when 'Community' then 'Social' when 'Industry' then 'Talk' else category end where category in ('Community', 'Industry');
alter table public.events add constraint events_category_check check (category in ('Workshop', 'Talk', 'Social'));
