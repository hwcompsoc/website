-- The `indexnow` function reads the site's address from its state row, rather than a function secret, so a project only sends
-- anything once it has that row. Production has one: insert into public.indexnow_state (site, pages) values ('https://hwcompsoc.com', '{}');
-- The test project has none, so it never tells search engines about the real site.
alter table public.indexnow_state add column site text;
