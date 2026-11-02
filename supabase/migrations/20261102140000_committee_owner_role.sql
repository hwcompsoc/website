-- Owners decide who can use the admin. Changes go through the committee-access edge function, which holds the secret key that creating
-- accounts needs, so signed-in people still only have read access to this table. There must always be at least one owner.
-- Who the owners are is set separately, because this repository is public.
alter table public.committee_members add column role text not null default 'member' check (role in ('member', 'owner'));

create function private.keep_one_owner() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if old.role = 'owner' and (tg_op = 'DELETE' or new.role <> 'owner') then
    perform 1 from public.committee_members where role = 'owner' for update;
    if not exists (select 1 from public.committee_members where role = 'owner' and email <> old.email) then
      raise exception 'There must always be at least one Owner.';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;
revoke all on function private.keep_one_owner() from public, anon, authenticated;
create trigger committee_members_keep_one_owner before update or delete on public.committee_members
  for each row execute function private.keep_one_owner();
