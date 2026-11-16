-- When each event last changed, for the sitemap's <lastmod> (scripts/write-pages.mjs), so search engines know which event pages to look at again.
-- Apply this before deploying the code that adds updated_at to LIVE_EVENT_COLUMNS, or the site's build can't read events.
grant select (updated_at) on public.events to anon;
