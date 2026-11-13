-- Expense claims and income, for the Treasurer. The SU's finance system stays the record that counts: this tracks what's
-- owed, what's been approved and what's come in, and links to receipts kept in the society's Drive.
--
-- Claims paid back by the SU or the society need approval, from the Treasurer, or from the President or Vice President when the
-- claim is the Treasurer's own. Claims paid back by an outside company or a sponsor don't touch society money, so they're only
-- tracked. Whoever made the claim confirms when they've been paid, since they're the one who knows.

create table public.expense_claims (
  id uuid primary key default gen_random_uuid(),
  claimant_email text not null default lower(auth.jwt() ->> 'email') references public.committee_members (email) on update cascade,
  description text not null check (length(trim(description)) between 1 and 200),
  amount numeric(9, 2) not null check (amount > 0),
  spent_on date not null default current_date,
  payer text not null check (payer in ('su', 'company', 'sponsor')),
  payer_name text not null default '' check (length(payer_name) <= 120),
  event_id uuid references public.events (id) on delete set null,
  receipt_link text check (receipt_link is null or receipt_link ~ '^https://\S+$'),
  -- su: submitted -> approved -> sent -> paid, or sent-back. company and sponsor: tracking -> sent -> paid.
  status text not null default 'submitted' check (status in ('submitted', 'sent-back', 'approved', 'tracking', 'sent', 'paid')),
  note text not null default '' check (length(note) <= 1000),
  decided_by text,
  decided_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index expense_claims_by_claimant on public.expense_claims (claimant_email);
create index expense_claims_by_event on public.expense_claims (event_id) where event_id is not null;

create function private.is_treasurer_of(claimant text) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.committee_member_roles where email = claimant and role = 'treasurer') $$;

-- Who may approve this claim: someone who sees finances, and never the person who made it.
create function private.can_approve(claimant text) returns boolean
language sql stable security definer set search_path = ''
as $$ select private.can('finances') and claimant <> lower(auth.jwt() ->> 'email') $$;

create function private.expense_claims_before_write() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  me text := lower(auth.jwt() ->> 'email');
  mine boolean := new.claimant_email = me;
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.claimant_email := me;
    new.status := case when new.payer = 'su' then 'submitted' else 'tracking' end;
    new.decided_by := null; new.decided_at := null; new.paid_at := null; new.note := '';
    return new;
  end if;
  new.claimant_email := old.claimant_email;
  new.created_at := old.created_at;
  if new.status is not distinct from old.status then
    -- Details can change while it's waiting or sent back, by whoever made it.
    if (new.description, new.amount, new.spent_on, new.payer, new.payer_name, new.event_id, new.receipt_link) is distinct from
       (old.description, old.amount, old.spent_on, old.payer, old.payer_name, old.event_id, old.receipt_link)
       and not (mine and old.status in ('submitted', 'sent-back', 'tracking')) then
      raise exception 'Only whoever made the claim can change it, and only before it’s approved.';
    end if;
    if new.note is distinct from old.note and not private.can_approve(old.claimant_email) then
      raise exception 'Only the Treasurer can add a note.';
    end if;
    return new;
  end if;
  if old.status in ('submitted') and new.status in ('approved', 'sent-back') then
    if not private.can_approve(old.claimant_email) then raise exception 'Only the Treasurer can approve or send back a claim, and not their own.'; end if;
    new.decided_by := me; new.decided_at := now();
  elsif old.status = 'sent-back' and new.status = 'submitted' and mine then
    new.note := old.note;
  elsif old.status = 'approved' and new.status = 'sent' and private.can_approve(old.claimant_email) then
    null;
  elsif old.status = 'tracking' and new.status = 'sent' and mine then
    null;
  elsif old.status = 'sent' and new.status = 'paid' and mine then
    new.paid_at := now();
  else
    raise exception 'That claim can’t move from % to % here.', old.status, new.status;
  end if;
  return new;
end;
$$;
create trigger expense_claims_before_write before insert or update on public.expense_claims
  for each row execute function private.expense_claims_before_write();

-- Each step hands the claim to the next person as a task.
create function private.expense_claims_tasks() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  approver text := case when private.is_treasurer_of(new.claimant_email) then 'president' else 'treasurer' end;
  who text := coalesce((select name from public.committee_members where email = new.claimant_email), new.claimant_email);
  what text := '£' || to_char(new.amount, 'FM999990.00') || ' for ' || new.description;
  href jsonb := jsonb_build_object('href', '/admin/money', 'claim_id', new.id);
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then return null; end if;
  update public.tasks set status = 'done' where kind = 'claim' and status = 'open' and details ->> 'claim_id' = new.id::text;
  if new.status = 'submitted' then
    insert into public.tasks (title, assignee_role, due_on, kind, event_id, details, created_by)
    values ('Approve ' || who || '’s claim: ' || what, approver, current_date + 5, 'claim', new.event_id, href, null);
  elsif new.status = 'sent-back' then
    insert into public.tasks (title, notes, assignee_email, due_on, kind, details, created_by)
    values ('Your claim was sent back: ' || what, coalesce(nullif(new.note, ''), 'Check the Money page.'), new.claimant_email, current_date + 5, 'claim', href, null);
  elsif new.status = 'approved' then
    insert into public.tasks (title, notes, assignee_role, due_on, kind, details, created_by)
    values ('Submit ' || who || '’s claim to the SU: ' || what, 'Then mark it as sent on the Money page.', approver, current_date + 5, 'claim', href, null);
  elsif new.status in ('tracking', 'sent') then
    insert into public.tasks (title, notes, assignee_email, due_on, kind, details, created_by)
    values (case when new.status = 'tracking' then 'Send your claim to ' || coalesce(nullif(new.payer_name, ''), 'whoever pays it back') || ': ' || what else 'Confirm when you’ve been paid: ' || what end,
      case when new.status = 'tracking' then 'Then mark it as sent on the Money page.' else 'Mark it as paid on the Money page once the money arrives.' end,
      new.claimant_email, current_date + case when new.status = 'tracking' then 5 else 21 end, 'claim', href, null);
  end if;
  return null;
end;
$$;
create trigger expense_claims_tasks after insert or update on public.expense_claims
  for each row execute function private.expense_claims_tasks();

-- Money coming in, and grants being applied for. A grant's deadline becomes a task for the Treasurer.
create table public.income (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('membership', 'tickets', 'sponsorship', 'grant', 'other')),
  description text not null check (length(trim(description)) between 1 and 200),
  amount numeric(9, 2) not null check (amount >= 0),
  -- applying (grants), expected (invoiced or promised), received, or declined.
  status text not null default 'expected' check (status in ('applying', 'expected', 'received', 'declined')),
  due_on date,
  received_on date,
  event_id uuid references public.events (id) on delete set null,
  recorded_by text default lower(auth.jwt() ->> 'email'),
  created_at timestamptz not null default now()
);

create function private.income_tasks() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (new.status, new.due_on) is not distinct from (old.status, old.due_on) then return null; end if;
  update public.tasks set status = 'done' where kind = 'deadline' and status = 'open' and details ->> 'income_id' = new.id::text;
  if new.status in ('applying', 'expected') and new.due_on is not null then
    insert into public.tasks (title, assignee_role, due_on, kind, details, created_by)
    values (case when new.status = 'applying' then 'Grant application due: ' else 'Chase payment: ' end || new.description, 'treasurer', new.due_on, 'deadline',
      jsonb_build_object('href', '/admin/money?tab=income', 'income_id', new.id), null);
  end if;
  return null;
end;
$$;
create trigger income_tasks after insert or update on public.income
  for each row execute function private.income_tasks();

alter table public.expense_claims enable row level security;
alter table public.income enable row level security;
revoke all on public.expense_claims, public.income from anon, authenticated;
grant select, insert, update, delete on public.expense_claims, public.income to authenticated;
create policy "People see their own claims, and finance roles see all" on public.expense_claims for select to authenticated
  using ((select private.is_committee()) and (claimant_email = (select private.my_email()) or (select private.can('finances'))));
create policy "Committee can claim expenses" on public.expense_claims for insert to authenticated with check ((select private.is_committee()));
create policy "Claimants and finance roles can update claims" on public.expense_claims for update to authenticated
  using ((select private.is_committee()) and (claimant_email = (select private.my_email()) or (select private.can('finances'))))
  with check ((select private.is_committee()));
create policy "Claimants can delete claims still waiting" on public.expense_claims for delete to authenticated
  using (claimant_email = (select private.my_email()) and status in ('submitted', 'sent-back', 'tracking'));
create policy "Finance roles see income" on public.income for select to authenticated using ((select private.can('finances')));
create policy "Finance roles add income" on public.income for insert to authenticated with check ((select private.can('finances')));
create policy "Finance roles change income" on public.income for update to authenticated using ((select private.can('finances'))) with check ((select private.can('finances')));
create policy "Finance roles delete income" on public.income for delete to authenticated using ((select private.can('finances')));
