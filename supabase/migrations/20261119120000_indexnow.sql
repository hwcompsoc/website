-- IndexNow: every 5 minutes, the `indexnow` edge function checks the live site and tells search engines which pages changed.
-- This table remembers the page fingerprints it last sent. Only the function, using the secret key, reads or writes it.
create table public.indexnow_state (
  id int primary key default 1 check (id = 1),
  pages jsonb not null,
  sent_at timestamptz not null default now()
);
alter table public.indexnow_state enable row level security;
revoke all on public.indexnow_state from anon, authenticated;

-- The schedule does nothing until the project's address is saved in Vault as `project_url`, such as https://<ref>.supabase.co.
create extension if not exists pg_cron;
select cron.schedule('indexnow', '*/5 * * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url' limit 1) || '/functions/v1/indexnow',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 30000)
  where exists (select 1 from vault.decrypted_secrets where name = 'project_url');
$$);
