-- The content calendar: everyone whose role can see it sees every social post task, not only their own team's.
-- Posts are tasks of kind 'post'. Each records its platforms in details.platforms: {instagram, discord, linkedin}, each
-- {state: 'todo' | 'posted' | 'skipped', link}.

create function private.can_see_post(kind text) returns boolean
language sql stable security definer set search_path = ''
as $$ select kind = 'post' and private.can('content_calendar') $$;
revoke all on function private.can_see_post(text) from public, anon;
grant execute on function private.can_see_post(text) to authenticated;

drop policy "Committee sees the tasks they're allowed to" on public.tasks;
create policy "Committee sees the tasks they're allowed to" on public.tasks for select to authenticated
  using ((select private.can_see_task(assignee_email, assignee_role, created_by)) or (select private.can_see_post(kind)));
drop policy "Committee can change tasks they can see" on public.tasks;
create policy "Committee can change tasks they can see" on public.tasks for update to authenticated
  using ((select private.can_see_task(assignee_email, assignee_role, created_by)) or (select private.can_see_post(kind)))
  with check ((select private.is_committee()));
