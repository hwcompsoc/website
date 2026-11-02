-- The questions on the Join page, edited in the admin. Anyone can read them, and any committee member can change them.
create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null check (length(trim(question)) between 1 and 120),
  answer text not null check (length(trim(answer)) between 1 and 600),
  position integer not null default 0
);
alter table public.faqs enable row level security;
revoke all on public.faqs from anon, authenticated;
grant select on public.faqs to anon;
grant select, insert, update, delete on public.faqs to authenticated;
create policy "Anyone can read questions" on public.faqs for select to anon, authenticated using (true);
create policy "Committee can add questions" on public.faqs for insert to authenticated with check ((select private.is_committee()));
create policy "Committee can edit questions" on public.faqs for update to authenticated using ((select private.is_committee())) with check ((select private.is_committee()));
create policy "Committee can delete questions" on public.faqs for delete to authenticated using ((select private.is_committee()));

-- Today's questions, as the site has them. The trigger is added afterwards, so seeding doesn't rebuild the site.
insert into public.faqs (position, question, answer) values
  (1, 'Do I need coding experience?', 'No. You can start with the community and look for beginner-friendly activities. Event details should explain any preparation or equipment needed.'),
  (2, 'How much does membership cost?', 'Check the official HW Union page for current membership options and any fees. This prototype does not set prices or take payment.'),
  (3, 'Can I try an event first?', 'Check the confirmed announcement on Discord. Eligibility and registration can vary by activity, so ask before assuming a place is available.'),
  (4, 'Who can I contact with a question?', 'Email compsci.society@hw.ac.uk, or ask through the society’s Discord. If you need an access adjustment for an event, contact the organisers before attending.');

create trigger faqs_rebuild_site after insert or update or delete on public.faqs
  for each statement execute function private.rebuild_site_for_content();
