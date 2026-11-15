-- Tests for the committee's rules in the database: who can see and do what, and the tasks each step hands on.
-- It acts as each person in turn, so row level security and the triggers apply exactly as they do in the admin.
--
-- Run it against the TEST project only, as the postgres role: paste it into the SQL editor, or use psql or the Supabase MCP.
-- It never keeps anything. It ends by raising an error on purpose, which undoes everything it did, so:
--   "PASSED: all N checks ..."  means every rule held.
--   "FAIL: ..."                 names the first rule that didn't. Nothing it did is kept either way.
-- It also switches off the site rebuild trigger while it runs (undone with everything else), so a test event never deploys.

do $test$
declare
  pres   constant text := 'rules-test-president@example.invalid';
  treas  constant text := 'rules-test-treasurer@example.invalid';
  org    constant text := 'rules-test-organiser@example.invalid';
  social constant text := 'rules-test-socials@example.invalid';
  member constant text := 'rules-test-member@example.invalid';
  passed text[] := '{}';
  ev uuid; ev2 uuid; meet uuid; meet2 uuid; today date := (now() at time zone 'Europe/London')::date; claim uuid; own uuid; company uuid; grant_id uuid; n int; t public.tasks%rowtype; c public.expense_claims%rowtype; p public.event_plans%rowtype; starts timestamptz := date_trunc('hour', now()) + interval '30 days 17 hours';
begin
  alter table public.events disable trigger events_rebuild_site;

  -- The committee: one person per role, and a member with no role.
  insert into public.committee_members (email, role, name) values
    (pres, 'member', 'Test President'), (treas, 'member', 'Test Treasurer'), (org, 'member', 'Test Organiser'),
    (social, 'member', 'Test Socials'), (member, 'member', 'Test Member');
  insert into public.committee_member_roles (email, role) values
    (pres, 'president'), (treas, 'treasurer'), (org, 'events'), (social, 'socials');

  ------------------------------------------------------------------ Events: who can make them
  perform set_config('request.jwt.claims', json_build_object('email', member, 'role', 'authenticated')::text, true); set local role authenticated;
  begin
    insert into public.events (title, slug) values ('Not allowed', 'rules-test-not-allowed');
    raise exception using message = 'NO ERROR';
  exception when others then if sqlerrm = 'NO ERROR' then raise exception 'FAIL: someone with no event role created an event'; end if; end;
  passed := passed || 'only event roles can create events'::text;

  perform set_config('request.jwt.claims', json_build_object('email', org, 'role', 'authenticated')::text, true); set local role authenticated;
  insert into public.events (title, slug, starts_at, ends_at, venue, description, cover_path, square_path, cover_alt, native_skipped, signup_required)
    values ('Rules test workshop', 'rules-test-workshop', starts, starts + interval '2 hours', 'EM 2.50', 'A test.',
      '00000000-0000-0000-0000-000000000000.jpg', '00000000-0000-0000-0000-000000000001.jpg', 'A test image', true, false)
    returning id into ev;
  insert into public.events (title, slug) values ('Rules test free event', 'rules-test-free') returning id into ev2;
  select count(*) into n from public.event_plans where event_id in (ev, ev2);
  if n <> 2 then raise exception 'FAIL: new events should each get a plan (got %)', n; end if;
  passed := passed || 'every new event gets a plan'::text;

  ------------------------------------------------------------------ Budgets
  update public.event_plans set lead_email = org where event_id = ev;
  update public.event_plans set budget_lines = '[{"item":"Pizza","amount":"40"}]', budget_status = 'pending' where event_id = ev;
  reset role; perform set_config('request.jwt.claims', '', true);
  select count(*) into n from public.tasks where event_id = ev and kind = 'budget' and status = 'open' and assignee_role = 'treasurer';
  if n <> 1 then raise exception 'FAIL: sending a budget should give the Treasurer one task (got %)', n; end if;
  select * into t from public.tasks where event_id = ev and kind = 'budget' and status = 'open';
  if t.details ->> 'href' is distinct from '/admin/money?tab=budgets' then raise exception 'FAIL: the Treasurer''s budget task should open Money''s budgets (got %)', t.details ->> 'href'; end if;
  passed := passed || 'sending a budget gives the Treasurer a task, which opens Money''s budgets'::text;

  perform set_config('request.jwt.claims', json_build_object('email', org, 'role', 'authenticated')::text, true); set local role authenticated;
  begin
    update public.event_plans set budget_status = 'approved' where event_id = ev;
    raise exception using message = 'NO ERROR';
  exception when others then if sqlerrm = 'NO ERROR' then raise exception 'FAIL: an organiser approved their own budget'; end if; end;
  passed := passed || 'organisers can''t approve budgets'::text;

  update public.event_plans set budget_lines = '[]', budget_status = 'pending' where event_id = ev2;
  select * into p from public.event_plans where event_id = ev2;
  if p.budget_status <> 'approved' or p.budget_decided_by <> 'automatic' then raise exception 'FAIL: a free budget should be approved automatically (got %, %)', p.budget_status, p.budget_decided_by; end if;
  passed := passed || 'a free budget is approved straight away'::text;

  perform set_config('request.jwt.claims', json_build_object('email', member, 'role', 'authenticated')::text, true); set local role authenticated;
  update public.event_plans set venue_status = 'confirmed' where event_id = ev;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: a member with no role changed an event plan'; end if;
  passed := passed || 'members with no role can''t change plans'::text;

  perform set_config('request.jwt.claims', json_build_object('email', treas, 'role', 'authenticated')::text, true); set local role authenticated;
  begin
    update public.event_plans set venue_status = 'confirmed' where event_id = ev;
    raise exception using message = 'NO ERROR';
  exception when others then if sqlerrm = 'NO ERROR' then raise exception 'FAIL: the Treasurer changed the plan, not just the budget'; end if; end;
  passed := passed || 'the Treasurer can decide budgets but not change plans'::text;

  update public.event_plans set budget_status = 'approved', budget_approved = 35 where event_id = ev;
  reset role; perform set_config('request.jwt.claims', '', true);
  select * into p from public.event_plans where event_id = ev;
  if p.budget_status <> 'approved' or p.budget_approved <> 35 or p.budget_decided_by <> treas then raise exception 'FAIL: the Treasurer''s approval wasn''t recorded (got %, %, %)', p.budget_status, p.budget_approved, p.budget_decided_by; end if;
  select count(*) into n from public.tasks where event_id = ev and kind = 'budget' and status = 'open';
  if n <> 0 then raise exception 'FAIL: approving should close the budget task (% still open)', n; end if;
  passed := passed || 'the Treasurer can approve a lower amount, and the task closes'::text;

  perform set_config('request.jwt.claims', json_build_object('email', org, 'role', 'authenticated')::text, true); set local role authenticated;
  update public.event_plans set budget_lines = '[{"item":"Pizza","amount":"50"}]' where event_id = ev;
  reset role; perform set_config('request.jwt.claims', '', true);
  select * into p from public.event_plans where event_id = ev;
  select count(*) into n from public.tasks where event_id = ev and kind = 'budget' and status = 'open' and assignee_role = 'treasurer';
  if p.budget_status <> 'pending' or n <> 1 then raise exception 'FAIL: spending more than approved should go back to the Treasurer (got %, % tasks)', p.budget_status, n; end if;
  passed := passed || 'raising an approved budget sends it back for approval'::text;

  ------------------------------------------------------------------ Publishing and the tasks it makes
  perform set_config('request.jwt.claims', json_build_object('email', org, 'role', 'authenticated')::text, true); set local role authenticated;
  update public.events set status = 'published' where id = ev;
  reset role; perform set_config('request.jwt.claims', '', true);
  select count(*) into n from public.tasks where event_id = ev and kind = 'post' and status = 'open' and assignee_role = 'socials' and details ->> 'post' in ('announce', 'week', 'day');
  if n <> 3 then raise exception 'FAIL: publishing should give the Social Media Managers 3 posts (got %)', n; end if;
  select * into t from public.tasks where event_id = ev and kind = 'post-event' and status = 'open';
  if t.assignee_email is distinct from org then raise exception 'FAIL: the post-event form should go to the lead organiser (got %)', t.assignee_email; end if;
  passed := passed || 'publishing makes the three posts and the lead''s post-event form'::text;

  perform set_config('request.jwt.claims', json_build_object('email', org, 'role', 'authenticated')::text, true); set local role authenticated;
  update public.events set starts_at = starts + interval '10 days', ends_at = starts + interval '10 days 2 hours' where id = ev;
  reset role; perform set_config('request.jwt.claims', '', true);
  select * into t from public.tasks where event_id = ev and kind = 'post' and details ->> 'post' = 'week' and status = 'open';
  if t.due_on <> ((starts + interval '10 days') at time zone 'Europe/London')::date - 7 then raise exception 'FAIL: moving the date should move the week-before post (due %)', t.due_on; end if;
  passed := passed || 'moving the date moves the posts'::text;

  perform set_config('request.jwt.claims', json_build_object('email', org, 'role', 'authenticated')::text, true); set local role authenticated;
  update public.event_plans set lead_email = pres where event_id = ev;
  reset role; perform set_config('request.jwt.claims', '', true);
  select * into t from public.tasks where event_id = ev and kind = 'post-event' and status = 'open';
  if t.assignee_email is distinct from pres then raise exception 'FAIL: a new lead should take over the post-event form (got %)', t.assignee_email; end if;
  passed := passed || 'a new lead takes over the post-event form'::text;

  ------------------------------------------------------------------ Who sees which tasks
  perform set_config('request.jwt.claims', json_build_object('email', social, 'role', 'authenticated')::text, true); set local role authenticated;
  select count(*) into n from public.tasks where event_id = ev and kind = 'post';
  if n <> 3 then raise exception 'FAIL: a Social Media Manager should see the event''s 3 posts (saw %)', n; end if;
  select count(*) into n from public.tasks where event_id = ev and kind = 'budget';
  if n <> 0 then raise exception 'FAIL: a Social Media Manager saw budget tasks (%)', n; end if;
  perform set_config('request.jwt.claims', json_build_object('email', org, 'role', 'authenticated')::text, true); set local role authenticated;
  select count(*) into n from public.tasks where event_id = ev and kind = 'post';
  if n <> 3 then raise exception 'FAIL: an Events Organiser, who can see the content calendar, should see the posts (saw %)', n; end if;
  perform set_config('request.jwt.claims', json_build_object('email', member, 'role', 'authenticated')::text, true); set local role authenticated;
  select count(*) into n from public.tasks where event_id = ev;
  if n <> 0 then raise exception 'FAIL: a member with no role saw the event''s tasks (%)', n; end if;
  perform set_config('request.jwt.claims', json_build_object('email', pres, 'role', 'authenticated')::text, true); set local role authenticated;
  select count(*) into n from public.tasks where event_id = ev and kind = 'budget';
  if n <> 2 then raise exception 'FAIL: the President should see every task, including both budget tasks (saw %)', n; end if;
  passed := passed || 'each role sees its own tasks, and the President sees everyone''s'::text;

  perform set_config('request.jwt.claims', json_build_object('email', member, 'role', 'authenticated')::text, true); set local role authenticated;
  begin
    insert into public.tasks (title, assignee_role, created_by) values ('Forged', 'treasurer', pres);
    raise exception using message = 'NO ERROR';
  exception when others then if sqlerrm = 'NO ERROR' then raise exception 'FAIL: a task was made in someone else''s name'; end if; end;
  passed := passed || 'nobody can make a task in someone else''s name'::text;

  ------------------------------------------------------------------ After the event, and cancelling
  perform set_config('request.jwt.claims', json_build_object('email', org, 'role', 'authenticated')::text, true); set local role authenticated;
  update public.event_plans set post_event = jsonb_build_object('attendance', 30, 'submitted_at', now()) where event_id = ev;
  reset role; perform set_config('request.jwt.claims', '', true);
  select count(*) into n from public.tasks where event_id = ev and kind = 'post' and details ->> 'post' = 'recap' and assignee_role = 'socials';
  if n <> 1 then raise exception 'FAIL: the post-event form should give the Social Media Managers a recap post (got %)', n; end if;
  select count(*) into n from public.tasks where event_id = ev and kind = 'post-event' and status = 'open';
  if n <> 0 then raise exception 'FAIL: filling in the form should close its task'; end if;
  passed := passed || 'the post-event form closes its task and asks for a recap'::text;

  perform set_config('request.jwt.claims', json_build_object('email', org, 'role', 'authenticated')::text, true); set local role authenticated;
  update public.events set status = 'cancelled' where id = ev;
  reset role; perform set_config('request.jwt.claims', '', true);
  select count(*) into n from public.tasks where event_id = ev and kind = 'post' and status = 'open' and details ->> 'post' <> 'cancelled';
  if n <> 0 then raise exception 'FAIL: cancelling should close the event''s posts (% still open)', n; end if;
  select count(*) into n from public.tasks where event_id = ev and kind = 'post' and status = 'open' and details ->> 'post' = 'cancelled';
  if n <> 1 then raise exception 'FAIL: cancelling should ask for a cancellation post (got %)', n; end if;
  passed := passed || 'cancelling closes the posts and asks for a cancellation post'::text;

  ------------------------------------------------------------------ Expense claims
  perform set_config('request.jwt.claims', json_build_object('email', member, 'role', 'authenticated')::text, true); set local role authenticated;
  insert into public.expense_claims (claimant_email, description, amount, payer, receipt_link, status)
    values (pres, 'Pizza', 12, 'su', 'https://drive.google.com/x', 'paid') returning id into claim;
  reset role; perform set_config('request.jwt.claims', '', true);
  select * into c from public.expense_claims where id = claim;
  if c.claimant_email <> member or c.status <> 'submitted' then raise exception 'FAIL: a new claim should be the claimant''s own and waiting for approval (got %, %)', c.claimant_email, c.status; end if;
  select count(*) into n from public.tasks where kind = 'claim' and status = 'open' and assignee_role = 'treasurer' and details ->> 'claim_id' = claim::text;
  if n <> 1 then raise exception 'FAIL: a claim should give the Treasurer a task (got %)', n; end if;
  passed := passed || 'a claim can''t be made in someone else''s name or skip approval, and goes to the Treasurer'::text;

  perform set_config('request.jwt.claims', json_build_object('email', member, 'role', 'authenticated')::text, true); set local role authenticated;
  begin
    update public.expense_claims set status = 'approved' where id = claim;
    raise exception using message = 'NO ERROR';
  exception when others then if sqlerrm = 'NO ERROR' then raise exception 'FAIL: a claimant approved their own claim'; end if; end;
  perform set_config('request.jwt.claims', json_build_object('email', social, 'role', 'authenticated')::text, true); set local role authenticated;
  select count(*) into n from public.expense_claims where id = claim;
  if n <> 0 then raise exception 'FAIL: someone without finances saw another person''s claim'; end if;
  passed := passed || 'claims are private to the claimant and finance roles, and nobody approves their own'::text;

  perform set_config('request.jwt.claims', json_build_object('email', treas, 'role', 'authenticated')::text, true); set local role authenticated;
  update public.expense_claims set status = 'approved' where id = claim;
  reset role; perform set_config('request.jwt.claims', '', true);
  select * into c from public.expense_claims where id = claim;
  select count(*) into n from public.tasks where kind = 'claim' and status = 'open' and details ->> 'claim_id' = claim::text and title like 'Submit%' and assignee_role = 'treasurer';
  if c.status <> 'approved' or c.decided_by <> treas or n <> 1 then raise exception 'FAIL: approving should record who and hand on a task to submit it (got %, %, % tasks)', c.status, c.decided_by, n; end if;
  passed := passed || 'the Treasurer approves, and gets a task to submit it to the SU'::text;

  perform set_config('request.jwt.claims', json_build_object('email', member, 'role', 'authenticated')::text, true); set local role authenticated;
  begin
    update public.expense_claims set amount = 99 where id = claim;
    raise exception using message = 'NO ERROR';
  exception when others then if sqlerrm = 'NO ERROR' then raise exception 'FAIL: a claim''s amount changed after approval'; end if; end;
  passed := passed || 'an approved claim can''t be changed'::text;

  perform set_config('request.jwt.claims', json_build_object('email', treas, 'role', 'authenticated')::text, true); set local role authenticated;
  update public.expense_claims set status = 'sent' where id = claim;
  begin
    update public.expense_claims set status = 'paid' where id = claim;
    raise exception using message = 'NO ERROR';
  exception when others then if sqlerrm = 'NO ERROR' then raise exception 'FAIL: the Treasurer marked someone else''s claim paid'; end if; end;
  perform set_config('request.jwt.claims', json_build_object('email', member, 'role', 'authenticated')::text, true); set local role authenticated;
  update public.expense_claims set status = 'paid' where id = claim;
  reset role; perform set_config('request.jwt.claims', '', true);
  select * into c from public.expense_claims where id = claim;
  select count(*) into n from public.tasks where kind = 'claim' and status = 'open' and details ->> 'claim_id' = claim::text;
  if c.status <> 'paid' or c.paid_at is null or n <> 0 then raise exception 'FAIL: only the claimant confirms payment, which closes every task (got %, %, % open)', c.status, c.paid_at, n; end if;
  passed := passed || 'only the claimant confirms they''ve been paid'::text;

  perform set_config('request.jwt.claims', json_build_object('email', treas, 'role', 'authenticated')::text, true); set local role authenticated;
  insert into public.expense_claims (description, amount, payer, receipt_link) values ('Prizes', 20, 'su', 'https://drive.google.com/y') returning id into own;
  begin
    update public.expense_claims set status = 'approved' where id = own;
    raise exception using message = 'NO ERROR';
  exception when others then if sqlerrm = 'NO ERROR' then raise exception 'FAIL: the Treasurer approved their own claim'; end if; end;
  reset role; perform set_config('request.jwt.claims', '', true);
  select count(*) into n from public.tasks where kind = 'claim' and status = 'open' and assignee_role = 'president' and details ->> 'claim_id' = own::text;
  if n <> 1 then raise exception 'FAIL: the Treasurer''s own claim should go to the President (got %)', n; end if;
  perform set_config('request.jwt.claims', json_build_object('email', pres, 'role', 'authenticated')::text, true); set local role authenticated;
  update public.expense_claims set status = 'approved' where id = own;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: the President couldn''t approve the Treasurer''s claim'; end if;
  passed := passed || 'the Treasurer''s own claim goes to the President'::text;

  perform set_config('request.jwt.claims', json_build_object('email', member, 'role', 'authenticated')::text, true); set local role authenticated;
  insert into public.expense_claims (description, amount, payer, payer_name, receipt_link) values ('Taxi', 15, 'company', 'Acme', 'https://drive.google.com/z') returning id into company;
  reset role; perform set_config('request.jwt.claims', '', true);
  select * into c from public.expense_claims where id = company;
  select count(*) into n from public.tasks where kind = 'claim' and status = 'open' and assignee_email = member and details ->> 'claim_id' = company::text;
  if c.status <> 'tracking' or n <> 1 then raise exception 'FAIL: a company''s claim is only tracked, with a task for the claimant (got %, %)', c.status, n; end if;
  perform set_config('request.jwt.claims', json_build_object('email', treas, 'role', 'authenticated')::text, true); set local role authenticated;
  begin
    update public.expense_claims set status = 'approved' where id = company;
    raise exception using message = 'NO ERROR';
  exception when others then if sqlerrm = 'NO ERROR' then raise exception 'FAIL: a company''s claim went through society approval'; end if; end;
  passed := passed || 'claims paid back by a company are tracked, not approved'::text;

  ------------------------------------------------------------------ Income, sponsors and handover notes
  perform set_config('request.jwt.claims', json_build_object('email', member, 'role', 'authenticated')::text, true); set local role authenticated;
  select count(*) into n from public.income;
  if n <> 0 then raise exception 'FAIL: someone without finances saw income (%)', n; end if;
  passed := passed || 'only finance roles see income'::text;

  perform set_config('request.jwt.claims', json_build_object('email', treas, 'role', 'authenticated')::text, true); set local role authenticated;
  insert into public.income (kind, description, amount, status, due_on) values ('grant', 'Rules test grant', 200, 'applying', current_date + 14) returning id into grant_id;
  reset role; perform set_config('request.jwt.claims', '', true);
  select count(*) into n from public.tasks where kind = 'deadline' and status = 'open' and assignee_role = 'treasurer' and details ->> 'income_id' = grant_id::text;
  if n <> 1 then raise exception 'FAIL: a grant deadline should be a task for the Treasurer (got %)', n; end if;
  perform set_config('request.jwt.claims', json_build_object('email', treas, 'role', 'authenticated')::text, true); set local role authenticated;
  update public.income set status = 'received', received_on = current_date where id = grant_id;
  reset role; perform set_config('request.jwt.claims', '', true);
  select count(*) into n from public.tasks where kind = 'deadline' and status = 'open' and details ->> 'income_id' = grant_id::text;
  if n <> 0 then raise exception 'FAIL: receiving the money should close the deadline task'; end if;
  passed := passed || 'a grant deadline becomes a task, closed when the money arrives'::text;

  perform set_config('request.jwt.claims', json_build_object('email', member, 'role', 'authenticated')::text, true); set local role authenticated;
  begin
    insert into public.sponsors (name) values ('Not allowed Ltd');
    raise exception using message = 'NO ERROR';
  exception when others then if sqlerrm = 'NO ERROR' then raise exception 'FAIL: someone without the sponsors permission added a sponsor'; end if; end;
  perform set_config('request.jwt.claims', json_build_object('email', pres, 'role', 'authenticated')::text, true); set local role authenticated;
  insert into public.sponsors (name, follow_up_on) values ('Rules Test Ltd', current_date + 5);
  reset role; perform set_config('request.jwt.claims', '', true);
  select count(*) into n from public.tasks where kind = 'sponsor' and status = 'open' and assignee_role = 'industry-liaison' and title = 'Follow up with Rules Test Ltd';
  if n <> 1 then raise exception 'FAIL: a sponsor follow-up should be a task for the Industry Liaison (got %)', n; end if;
  passed := passed || 'only sponsor roles change sponsors, and a follow-up becomes a task'::text;

  perform set_config('request.jwt.claims', json_build_object('email', treas, 'role', 'authenticated')::text, true); set local role authenticated;
  insert into public.handover_notes (role, body) values ('treasurer', 'Test note') on conflict (role) do update set body = excluded.body;
  begin
    insert into public.handover_notes (role, body) values ('president', 'Not mine') on conflict (role) do update set body = excluded.body;
    raise exception using message = 'NO ERROR';
  exception when others then if sqlerrm = 'NO ERROR' then raise exception 'FAIL: the Treasurer wrote the President''s handover note'; end if; end;
  passed := passed || 'people write only their own role''s handover note'::text;

  ------------------------------------------------------------------ Meetings and the Secretary's agenda task
  perform set_config('request.jwt.claims', json_build_object('email', member, 'role', 'authenticated')::text, true); set local role authenticated;
  insert into public.meetings (title, held_on) values ('Rules test meeting', today - 7) returning id into meet;
  insert into public.meetings (title, held_on) values ('Rules test other meeting', today - 14) returning id into meet2;
  update public.meetings set next_on = today + 10 where id = meet;
  update public.meetings set next_on = today + 1 where id = meet2;
  reset role; perform set_config('request.jwt.claims', '', true);
  select * into t from public.tasks where kind = 'agenda' and status = 'open' and details ->> 'meeting' = meet::text;
  if t.id is null or t.assignee_role is distinct from 'secretary' or t.due_on <> today + 7 then raise exception 'FAIL: setting the next meeting should give the Secretary a task three days before (got %, %)', t.assignee_role, t.due_on; end if;
  select * into t from public.tasks where kind = 'agenda' and status = 'open' and details ->> 'meeting' = meet2::text;
  if t.due_on is distinct from today then raise exception 'FAIL: a meeting less than three days away should make the agenda due today (got %)', t.due_on; end if;
  passed := passed || 'setting the next meeting gives the Secretary an agenda task, due three days before'::text;

  perform set_config('request.jwt.claims', json_build_object('email', member, 'role', 'authenticated')::text, true); set local role authenticated;
  update public.meetings set next_on = today + 12 where id = meet;
  reset role; perform set_config('request.jwt.claims', '', true);
  select count(*) into n from public.tasks where kind = 'agenda' and status = 'open' and details ->> 'meeting' = meet::text and due_on = today + 9;
  if n <> 1 then raise exception 'FAIL: moving the meeting should replace its agenda task with one due three days before the new date'; end if;
  select count(*) into n from public.tasks where kind = 'agenda' and status = 'open' and details ->> 'meeting' in (meet::text, meet2::text);
  if n <> 2 then raise exception 'FAIL: moving one meeting touched another''s agenda task (% open, expected 2)', n; end if;
  passed := passed || 'moving a meeting moves only its own agenda task'::text;

  perform set_config('request.jwt.claims', json_build_object('email', member, 'role', 'authenticated')::text, true); set local role authenticated;
  update public.meetings set next_agenda_link = 'https://docs.google.com/document/d/rules-test' where id = meet;
  update public.meetings set next_on = null where id = meet2;
  reset role; perform set_config('request.jwt.claims', '', true);
  select count(*) into n from public.tasks where kind = 'agenda' and status = 'done' and details ->> 'meeting' = meet::text;
  if n <> 1 then raise exception 'FAIL: saving the agenda should complete its task (got % done)', n; end if;
  select count(*) into n from public.tasks where kind = 'agenda' and status = 'open' and details ->> 'meeting' in (meet::text, meet2::text);
  if n <> 0 then raise exception 'FAIL: clearing a meeting''s date should cancel its agenda task (% open)', n; end if;
  passed := passed || 'saving the agenda completes the task, and clearing the date cancels it'::text;

  reset role; perform set_config('request.jwt.claims', '', true);
  raise exception 'PASSED: all % checks. Everything this test did has been undone. %', cardinality(passed), array_to_string(passed, '; ');
end
$test$;
