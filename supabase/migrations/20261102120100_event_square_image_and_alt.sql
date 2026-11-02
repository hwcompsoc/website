-- Native needs a landscape image (cover_path), while Luma, Instagram and Discord need a square one. The square image is only handed to
-- organisers, so visitors and the site's build can't read its address. One description covers both, as they show the same thing.
alter table public.events add column square_path text check (square_path ~ '^[0-9a-f-]{36}\.jpg$');
alter table public.events add column cover_alt text not null default '' check (length(cover_alt) <= 300);
grant select (cover_alt) on public.events to anon;
