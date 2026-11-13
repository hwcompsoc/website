-- The society's Google Drive connection: one row, made when an Owner connects the society's Google account in the admin.
-- The refresh token can read the society's Drive and add to it, so only the google-drive server function, using the secret
-- key, can read or change this table. Nobody signed in to the site can see it, not even an Owner.
create table public.google_drive (
  id smallint primary key default 1 check (id = 1),
  refresh_token text not null,
  account text not null,
  root_id text,
  root_name text,
  minutes_id text,
  connected_by text not null,
  connected_at timestamptz not null default now()
);
alter table public.google_drive enable row level security;
revoke all on public.google_drive from anon, authenticated;
