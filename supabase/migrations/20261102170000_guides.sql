-- The guides on the Resources page, edited in the admin. Drafts are hidden, samples show with a tag, and a confirmed guide has someone looking after it.
-- Visitors and the site's build can't read who that is. Any committee member can change guides, but only a draft can be deleted.
create table public.guides (
  id uuid primary key default gen_random_uuid(),
  -- The guide's permanent address: /resources/<slug>.
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 60),
  title text not null check (length(trim(title)) between 1 and 80),
  category text not null default 'Learning' check (category in ('Learning', 'Community', 'Support')),
  kind text not null default 'Starter guide' check (length(trim(kind)) between 1 and 40),
  description text not null default '' check (length(description) <= 200),
  body text not null default '' check (length(body) <= 20000),
  status text not null default 'draft' check (status in ('draft', 'sample', 'confirmed')),
  maintainer text not null default '' check (length(maintainer) <= 80),
  reviewed_on date,
  position integer not null default 0,
  published_at timestamptz,
  constraint public_guides_are_complete check (status = 'draft' or (length(trim(description)) > 0 and length(trim(body)) > 0)),
  constraint confirmed_guides_are_looked_after check (status <> 'confirmed' or (length(trim(maintainer)) > 0 and reviewed_on is not null))
);

create function private.guides_before_write() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.published_at is not null and new.slug <> old.slug then
    raise exception 'A guide''s address can''t change once it has been published.';
  end if;
  if new.status <> 'draft' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;
create trigger guides_before_write before insert or update on public.guides
  for each row execute function private.guides_before_write();

alter table public.guides enable row level security;
revoke all on public.guides from anon, authenticated;
grant select (slug, title, category, kind, description, body, status, reviewed_on, position) on public.guides to anon;
grant select, insert, update, delete on public.guides to authenticated;
create policy "Anyone can read public guides" on public.guides for select to anon using (status <> 'draft');
create policy "Committee can read all guides" on public.guides for select to authenticated using ((select private.is_committee()));
create policy "Committee can add guides" on public.guides for insert to authenticated with check ((select private.is_committee()));
create policy "Committee can edit guides" on public.guides for update to authenticated using ((select private.is_committee())) with check ((select private.is_committee()));
create policy "Committee can delete draft guides" on public.guides for delete to authenticated using ((select private.is_committee()) and status = 'draft');

-- Today's guides, as the site has them. The rebuild trigger is added afterwards, so seeding doesn't rebuild the site.
insert into public.guides (position, slug, title, category, kind, description, status, body) values
(1, 'git', 'Git, without the guesswork.', 'Learning', 'Starter guide', 'A short introduction to repositories, commits and a useful first workflow.', 'sample', $guide$## Start small. Keep a useful record.

Git records changes to a project. A repository is the place where that history lives; a commit is a named snapshot you can return to. Start in a practice folder, make one change and describe it clearly.

### A small example

```
# In a new practice folder
git init
git status
```

These are selectable instructions. This page never runs commands or changes files. Use a practice project and ask for help if the environment is unfamiliar.

### One useful next step

Bring a specific question to the community: what did you try, what did you expect and what happened? A small, clear example gives someone else a good place to start helping.

### Your own progress

This checklist stays in the open guide. It is a personal prompt, not a qualification or a record sent to the society.

- [ ] Read the introduction
- [ ] Try one small step
- [ ] Write down a question or next step$guide$),
(2, 'web', 'Make your first web page.', 'Learning', 'Workshop notes', 'Meet HTML, CSS and the small steps that turn an idea into something you can open.', 'sample', $guide$## A page begins with a few building blocks.

HTML gives a page structure. CSS describes how it looks. Begin with one heading, one paragraph and one link. Open your file in a browser and change one thing at a time.

### A small example

```
<h1>Hello, world.</h1>
<p>My first small step.</p>
```

These are selectable instructions. This page never runs commands or changes files. Use a practice project and ask for help if the environment is unfamiliar.

### One useful next step

Bring a specific question to the community: what did you try, what did you expect and what happened? A small, clear example gives someone else a good place to start helping.

### Your own progress

This checklist stays in the open guide. It is a personal prompt, not a qualification or a record sent to the society.

- [ ] Read the introduction
- [ ] Try one small step
- [ ] Write down a question or next step$guide$),
(3, 'contribute', 'Make a small contribution.', 'Community', 'Contribution guide', 'Find a manageable task, explain your change and ask someone to review it.', 'sample', $guide$## A small change can be a useful change.

Look for a clear task with a named reviewer. Read the project instructions, ask about anything unclear and keep your first change small enough to explain in a few sentences.

### A small example

1. Read the project instructions
2. Choose one clear task
3. Explain your change
4. Ask for review

### One useful next step

Bring a specific question to the community: what did you try, what did you expect and what happened? A small, clear example gives someone else a good place to start helping.

### Your own progress

This checklist stays in the open guide. It is a personal prompt, not a qualification or a record sent to the society.

- [ ] Read the introduction
- [ ] Try one small step
- [ ] Write down a question or next step$guide$),
(4, 'support', 'You don’t have to figure it out alone.', 'Support', 'Support directory', 'A proposed home for official academic and wellbeing support destinations.', 'sample', $guide$## A route to the right support.

This proposed directory would link to official university academic and wellbeing services. Those destinations have not yet been confirmed, so this preview provides no service links or contact guarantees.

### One useful next step

Use the university’s official website to find its current services. The society email can help with society questions; it is not a staffed wellbeing support service.

### Your own progress

This checklist stays in the open guide. It is a personal prompt, not a qualification or a record sent to the society.

- [ ] Find the right official service
- [ ] Check its current contact details
- [ ] Ask for support when you need it$guide$);

-- The same rule as events: a change only rebuilds the site if the public can see it.
create trigger guides_rebuild_site after insert or update or delete on public.guides
  for each row execute function private.rebuild_site();
