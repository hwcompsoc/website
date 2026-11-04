-- Optional details people ask about before coming to an event.
-- Apply this before adding these columns to LIVE_EVENT_COLUMNS, or the site's build can't read events.
alter table public.events
  add column cost text check (cost is null or char_length(cost) <= 60),
  add column open_to text check (open_to is null or char_length(open_to) <= 80);

grant select (cost, open_to) on public.events to anon;
