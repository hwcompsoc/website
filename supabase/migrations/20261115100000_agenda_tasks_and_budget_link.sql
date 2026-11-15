-- The Secretary's task to send the next agenda now belongs to its meeting and is kept in step here, rather than by the admin.
-- The admin used to cancel or complete every open agenda task when one meeting changed, and ignored it if that failed.
-- Also, the Treasurer's budget approval task now opens Money's budgets tab, where budgets are approved alongside each other.
-- And deleting an income entry cancels its deadline task.

-- Open agenda tasks made before this belong to the latest meeting, which is the only one the admin ever set a date for.
update public.tasks set details = details || jsonb_build_object('meeting',
    (select id from public.meetings where next_on is not null order by held_on desc, created_at desc limit 1))
  where kind = 'agenda' and status = 'open' and not details ? 'meeting';

-- Setting or moving the next meeting's date replaces that meeting's agenda task, due three days before (or today, if that's
-- sooner). Clearing it cancels the task. Saving the agenda's link completes it.
create function private.meetings_after_write() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.next_on is distinct from (case when tg_op = 'UPDATE' then old.next_on end) then
    update public.tasks set status = 'cancelled' where kind = 'agenda' and status = 'open' and details ->> 'meeting' = new.id::text;
    if new.next_on is not null then
      insert into public.tasks (title, notes, assignee_role, due_on, kind, details, created_by)
      values ('Send the agenda for the meeting on ' || to_char(new.next_on, 'FMDay FMDD FMMonth YYYY'),
        'Draft it on the Minutes page, under Next meeting. It fills itself in from the last minutes, open actions and anything people have asked to add.',
        'secretary', greatest(new.next_on - 3, private.uk_date(now())), 'agenda',
        jsonb_build_object('href', '/admin/minutes?tab=agenda', 'meeting', new.id), null);
    end if;
  end if;
  if new.next_agenda_link is not null and new.next_agenda_link is distinct from (case when tg_op = 'UPDATE' then old.next_agenda_link end) then
    update public.tasks set status = 'done' where kind = 'agenda' and status = 'open' and details ->> 'meeting' = new.id::text;
  end if;
  return null;
end;
$$;
create trigger meetings_after_write after insert or update of next_on, next_agenda_link on public.meetings
  for each row execute function private.meetings_after_write();
revoke all on function private.meetings_after_write() from public, anon, authenticated;

-- The same as before, except where the Treasurer's task links to.
create or replace function private.event_plans_after_write() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  ev public.events%rowtype;
begin
  select * into ev from public.events where id = new.event_id;
  if new.budget_status is distinct from (case when tg_op = 'UPDATE' then old.budget_status end) then
    update public.tasks set status = 'done' where event_id = new.event_id and kind = 'budget' and status = 'open';
    if new.budget_status = 'pending' then
      insert into public.tasks (title, notes, assignee_role, due_on, kind, event_id, details, created_by)
      values ('Approve the budget for ' || ev.title || ' (£' || to_char(private.budget_total(new.budget_lines), 'FM999990.00') || ')',
        'Approve it, approve a lower amount, or send it back with a reason, on the Money page under Event budgets.',
        'treasurer', current_date + 3, 'budget', new.event_id, jsonb_build_object('href', '/admin/money?tab=budgets'), null);
    elsif new.budget_status = 'sent-back' then
      insert into public.tasks (title, notes, assignee_email, assignee_role, due_on, kind, event_id, details, created_by)
      values ('Budget sent back: ' || ev.title, coalesce(nullif(new.budget_note, ''), 'The Treasurer sent the budget back. Check the Planning tab.'),
        new.lead_email, case when new.lead_email is null then 'events' end, current_date + 3, 'budget', new.event_id, private.event_href(new.event_id, 'planning'), null);
    end if;
  end if;
  -- A new lead takes over the event's open follow-up tasks.
  if tg_op = 'UPDATE' and new.lead_email is distinct from old.lead_email then
    update public.tasks set assignee_email = new.lead_email, assignee_role = case when new.lead_email is null then 'events' else assignee_role end
      where event_id = new.event_id and kind = 'post-event' and status = 'open';
  end if;
  -- Once the post-event form is in, the Social Media Managers get a recap post.
  if (new.post_event ->> 'submitted_at') is not null and (tg_op = 'INSERT' or (old.post_event ->> 'submitted_at') is null) then
    update public.tasks set status = 'done' where event_id = new.event_id and kind = 'post-event' and status = 'open';
    if not exists (select 1 from public.tasks where event_id = new.event_id and kind = 'post' and details ->> 'post' = 'recap') then
      insert into public.tasks (title, notes, assignee_role, due_on, kind, event_id, details, created_by)
      values ('Post a recap of ' || ev.title, 'Photos are in the event’s folder in Drive, if anyone has added them.', 'socials', current_date + 2, 'post', new.event_id,
        private.event_href(new.event_id, '') || jsonb_build_object('post', 'recap'), null);
    end if;
  end if;
  return null;
end;
$$;

-- Open approval tasks made before this.
update public.tasks set details = details || jsonb_build_object('href', '/admin/money?tab=budgets'),
    notes = 'Approve it, approve a lower amount, or send it back with a reason, on the Money page under Event budgets.'
  where kind = 'budget' and status = 'open' and assignee_role = 'treasurer';

-- Income can now be deleted from the admin. Deleting an entry cancels its deadline task, rather than leaving it for the Treasurer.
create function private.income_deleted() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.tasks set status = 'cancelled' where kind = 'deadline' and status = 'open' and details ->> 'income_id' = old.id::text;
  return null;
end;
$$;
create trigger income_deleted after delete on public.income
  for each row execute function private.income_deleted();
revoke all on function private.income_deleted() from public, anon, authenticated;
