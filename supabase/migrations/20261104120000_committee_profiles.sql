-- Optional details for each person's profile on the About page. They're public, so only add what the person has agreed to share.
-- Apply this before adding these columns to COMMITTEE_SELECT, or the site's build can't read the committee.
alter table public.committee_people
  add column bio text check (bio is null or char_length(bio) <= 200),
  add column studies text check (studies is null or char_length(studies) <= 80),
  add column ask_me_about text check (ask_me_about is null or char_length(ask_me_about) <= 80),
  add column discord text check (discord is null or discord ~ '^[a-z0-9_.]{2,32}$'),
  add column github text check (github is null or github ~ '^[A-Za-z0-9-]{1,39}$'),
  add column linkedin text check (linkedin is null or linkedin ~ '^[A-Za-z0-9_%-]{3,100}$');
