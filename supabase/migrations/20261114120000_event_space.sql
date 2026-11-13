-- Everything about running an event beyond what the public site shows: who leads it, its budget, the venue booking,
-- requirements, risk assessment, the plan for the day and what happened afterwards. One row per event.
-- Publishing, changing and cancelling an event now creates and updates tasks, so nobody has to be told by message:
-- social posts for the Social Media Managers, a post-event form for the lead organiser and budget approval for the Treasurer.

create table public.event_plans (
  event_id uuid primary key references public.events (id) on delete cascade,
  lead_email text references public.committee_members (email) on delete set null on update cascade,
  -- [{item, amount}], amounts in pounds.
  budget_lines jsonb not null default '[]'::jsonb check (jsonb_typeof(budget_lines) = 'array'),
  budget_status text not null default 'none' check (budget_status in ('none', 'pending', 'approved', 'sent-back')),
  budget_approved numeric(9, 2) check (budget_approved is null or budget_approved >= 0),
  budget_note text not null default '' check (length(budget_note) <= 1000),
  budget_decided_by text,
  budget_decided_at timestamptz,
  venue_status text not null default 'not-booked' check (venue_status in ('not-booked', 'requested', 'confirmed', 'not-needed')),
  venue_reference text not null default '' check (length(venue_reference) <= 120),
  -- [{item, kind, done}]: tech, equipment, catering, accessibility, other.
  requirements jsonb not null default '[]'::jsonb check (jsonb_typeof(requirements) = 'array'),
  risk_status text not null default 'not-started' check (risk_status in ('not-started', 'drafted', 'done', 'not-needed')),
  risk_link text check (risk_link is null or risk_link ~ '^https://\S+$'),
  -- [{time, what, who}]
  run_sheet jsonb not null default '[]'::jsonb check (jsonb_typeof(run_sheet) = 'array'),
  -- {attendance, went_well, went_badly, run_again, notes, submitted_at, submitted_by}
  post_event jsonb not null default '{}'::jsonb check (jsonb_typeof(post_event) = 'object'),
  post_event_link text check (post_event_link is null or post_event_link ~ '^https://\S+$'),
  photos_link text check (photos_link is null or photos_link ~ '^https://\S+$'),
  updated_at timestamptz not null default now(),
  updated_by text default lower(auth.jwt() ->> 'email')
);

create function private.budget_total(lines jsonb) returns numeric
language sql immutable set search_path = ''
as $$ select coalesce(sum(nullif(line ->> 'amount', '')::numeric), 0) from jsonb_array_elements(lines) as line $$;

-- Organisers plan; the Treasurer decides on budgets. A budget of nothing is approved straight away, and raising an approved
-- budget sends it back for approval.
create function private.event_plans_before_write() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  -- No one signed in means the database itself, such as this migration or another trigger.
  system boolean := coalesce(auth.jwt() ->> 'email', '') = '';
  organiser boolean := system or private.can('create_events');
  treasurer boolean := system or private.can('finances');
  total numeric := private.budget_total(new.budget_lines);
begin
  new.updated_at := now();
  new.updated_by := lower(auth.jwt() ->> 'email');
  if tg_op = 'UPDATE' and not organiser and (
    new.lead_email, new.budget_lines, new.venue_status, new.venue_reference, new.requirements, new.risk_status, new.risk_link,
    new.run_sheet, new.post_event, new.post_event_link, new.photos_link
  ) is distinct from (
    old.lead_email, old.budget_lines, old.venue_status, old.venue_reference, old.requirements, old.risk_status, old.risk_link,
    old.run_sheet, old.post_event, old.post_event_link, old.photos_link
  ) then
    raise exception 'Only event organisers can change an event''s plan.';
  end if;
  if tg_op = 'INSERT' and not organiser then
    raise exception 'Only event organisers can plan events.';
  end if;

  if new.budget_status = 'pending' and total = 0 then
    -- Free: nothing for the Treasurer to approve.
    new.budget_status := 'approved';
    new.budget_approved := 0;
    new.budget_decided_by := 'automatic';
    new.budget_decided_at := now();
  elsif tg_op = 'UPDATE' and new.budget_status is distinct from old.budget_status and new.budget_status in ('approved', 'sent-back') then
    if not treasurer then
      raise exception 'Only the Treasurer can approve or send back a budget.';
    end if;
    new.budget_approved := case when new.budget_status = 'approved' then coalesce(new.budget_approved, total) else null end;
    new.budget_decided_by := lower(auth.jwt() ->> 'email');
    new.budget_decided_at := now();
  elsif tg_op = 'UPDATE' and old.budget_status = 'approved' and new.budget_lines is distinct from old.budget_lines and total > coalesce(old.budget_approved, 0) then
    new.budget_status := 'pending';
  elsif tg_op = 'UPDATE' and (new.budget_approved, new.budget_note) is distinct from (old.budget_approved, old.budget_note)
    and new.budget_status is not distinct from old.budget_status and not treasurer then
    raise exception 'Only the Treasurer can change an approved amount.';
  end if;
  return new;
end;
$$;
create trigger event_plans_before_write before insert or update on public.event_plans
  for each row execute function private.event_plans_before_write();

-- The event's own page in the admin, for tasks to link to.
create function private.event_href(event_id uuid, tab text) returns jsonb
language sql immutable set search_path = ''
as $$ select jsonb_build_object('href', '/admin/events/' || event_id || case when tab = '' then '' else '?tab=' || tab end) $$;

create function private.uk_date(at timestamptz) returns date
language sql stable set search_path = ''
as $$ select (at at time zone 'Europe/London')::date $$;

-- Tasks that follow a budget: approval for the Treasurer, and a note back to the lead if it's sent back.
create function private.event_plans_after_write() returns trigger
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
        'Approve it, approve a lower amount, or send it back with a reason, on the event’s Planning tab.',
        'treasurer', current_date + 3, 'budget', new.event_id, private.event_href(new.event_id, 'planning'), null);
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
create trigger event_plans_after_write after insert or update on public.event_plans
  for each row execute function private.event_plans_after_write();

-- Publishing creates the social posts and the post-event form. Moving the date moves them; cancelling or unpublishing closes them.
create function private.events_tasks() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  starts date := private.uk_date(new.starts_at);
  ends date := private.uk_date(coalesce(new.ends_at, new.starts_at));
  lead text;
begin
  insert into public.event_plans (event_id) values (new.id) on conflict do nothing;
  select lead_email into lead from public.event_plans where event_id = new.id;
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    if not exists (select 1 from public.tasks where event_id = new.id and kind = 'post' and details ->> 'post' = 'announce' and status <> 'cancelled') then
      insert into public.tasks (title, assignee_role, due_on, kind, event_id, details, created_by)
      values ('Announce ' || new.title, 'socials', current_date, 'post', new.id, private.event_href(new.id, '') || jsonb_build_object('post', 'announce'), null);
    end if;
    if starts - 7 > current_date and not exists (select 1 from public.tasks where event_id = new.id and kind = 'post' and details ->> 'post' = 'week' and status <> 'cancelled') then
      insert into public.tasks (title, assignee_role, due_on, kind, event_id, details, created_by)
      values ('Remind people about ' || new.title || ': one week to go', 'socials', starts - 7, 'post', new.id, private.event_href(new.id, '') || jsonb_build_object('post', 'week'), null);
    end if;
    if starts > current_date and not exists (select 1 from public.tasks where event_id = new.id and kind = 'post' and details ->> 'post' = 'day' and status <> 'cancelled') then
      insert into public.tasks (title, assignee_role, due_on, kind, event_id, details, created_by)
      values (new.title || ' is today: remind people', 'socials', starts, 'post', new.id, private.event_href(new.id, '') || jsonb_build_object('post', 'day'), null);
    end if;
    if not exists (select 1 from public.tasks where event_id = new.id and kind = 'post-event' and status <> 'cancelled') then
      insert into public.tasks (title, notes, assignee_email, assignee_role, due_on, kind, event_id, details, created_by)
      values ('Fill in the post-event form for ' || new.title, 'How many came, what went well and what didn’t, and whether to run it again. Add photos to the event’s folder too.',
        lead, case when lead is null then 'events' end, ends + 2, 'post-event', new.id, private.event_href(new.id, 'after'), null);
    end if;
  elsif tg_op = 'UPDATE' and new.status = 'published' and new.starts_at is distinct from old.starts_at then
    update public.tasks set due_on = starts - 7 where event_id = new.id and kind = 'post' and details ->> 'post' = 'week' and status = 'open';
    update public.tasks set due_on = starts where event_id = new.id and kind = 'post' and details ->> 'post' = 'day' and status = 'open';
    update public.tasks set due_on = ends + 2 where event_id = new.id and kind = 'post-event' and status = 'open';
  elsif tg_op = 'UPDATE' and new.status <> 'published' and old.status = 'published' then
    update public.tasks set status = 'cancelled' where event_id = new.id and kind in ('post', 'post-event') and status = 'open';
    if new.status = 'cancelled' then
      insert into public.tasks (title, notes, assignee_role, due_on, kind, event_id, details, created_by)
      values ('Post that ' || new.title || ' is cancelled', 'Update Native and Luma too, if the organiser hasn’t.', 'socials', current_date, 'post', new.id,
        private.event_href(new.id, '') || jsonb_build_object('post', 'cancelled'), null);
    end if;
  end if;
  return null;
end;
$$;
create trigger events_tasks after insert or update on public.events
  for each row execute function private.events_tasks();

-- Social posts are tasks now, so publishing no longer waits for the "sent to socials" tick.
alter table public.events drop constraint checklist_complete_before_publishing;
alter table public.events add constraint checklist_complete_before_publishing check (
  status = 'draft' or (
    starts_at is not null and ends_at is not null
    and length(trim(venue)) > 0 and length(trim(description)) > 0
    and cover_path is not null and square_path is not null and length(trim(cover_alt)) > 0
    and (native_url is not null or native_skipped)
    and (not signup_required or luma_url is not null)
  )
);

-- Every existing event gets a plan.
insert into public.event_plans (event_id) select id from public.events on conflict do nothing;

alter table public.event_plans enable row level security;
revoke all on public.event_plans from anon, authenticated;
grant select, insert, update on public.event_plans to authenticated;
create policy "Committee can read event plans" on public.event_plans for select to authenticated using ((select private.is_committee()));
create policy "Organisers can start event plans" on public.event_plans for insert to authenticated with check ((select private.can('create_events')));
create policy "Organisers and the Treasurer can change event plans" on public.event_plans for update to authenticated
  using ((select private.can('create_events')) or (select private.can('finances')))
  with check ((select private.can('create_events')) or (select private.can('finances')));
