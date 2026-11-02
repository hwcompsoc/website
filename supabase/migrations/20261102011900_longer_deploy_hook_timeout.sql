-- Calls to the Vercel deploy hook were timing out at the default 5 seconds, some during the address lookup, which could leave an
-- event waiting for a rebuild that never started. Allow 30 seconds.
create or replace function private.rebuild_site() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  hook text;
begin
  if (tg_op <> 'INSERT' and old.status <> 'draft') or (tg_op <> 'DELETE' and new.status <> 'draft') then
    select decrypted_secret into hook from vault.decrypted_secrets where name = 'vercel_deploy_hook' limit 1;
    if hook is not null then
      perform net.http_post(url := hook, headers := '{"Content-Type":"application/json"}'::jsonb, body := '{}'::jsonb, timeout_milliseconds := 30000);
    end if;
  end if;
  return null;
end;
$$;
