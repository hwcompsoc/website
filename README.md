# HW CompSoc website

The visitor website for the Heriot-Watt Computer Science Society. React, Vite and Motion, hosted on Vercel.

## Run it

```
npm install
npm run dev
npm run build
npm run preview
npm test
```

`npm run dev` serves the site with live reload. `npm run build` writes the deployable site to `dist`. Vercel runs it using `vercel.json`.

## Layout

- `src/pages`, `src/components`: the site. `src/components/ui` holds the shadcn/ui components it uses.
- `src/motion`, `src/motion.ts`: the motion system. `scripts/webkit-guard.test.mjs` fails on animation patterns that stutter on iPhones.
- `src/content.ts`: how the content copied from Supabase becomes what the site shows. `src/guide-format.ts`: the simple formatting guides are written in.
- `src/router.ts`: real paths, back and forward, and scroll restore. `route()` in `src/content.ts` decides what each address shows, and `vercel.json` sends every address to the app.
- `src/website.css`: styles, with the colour tokens and the dark theme. `src/motion.css`: motion component styles.
- `src/share.ts`, `scripts/write-pages.mjs`: what a link to each address previews as. The build writes a real page per address, because link previews don't run the app. It uses Vercel's production address, or `SITE_URL` if that's set.
- `src/pages/Privacy.tsx`: the privacy note. It states what the site stores and contacts, so if that changes, such as by adding analytics, change the note too.
- `src/calendar.ts`: the calendar feed at `/events.ics`, one file per event and the links that add them. The build writes the files, so they don't exist under `npm run dev`.
- `src/theme.ts`: light and dark themes. A short script in `index.html` applies the theme before first paint, so keep the two in step.

## Events

The committee manages events at `/admin`, a separate site in `src/admin` that loads only for people who open it. They sign in with a password. Events live in Supabase, and the rules for who can do what, and for what an event needs before it can go live, are in `supabase/migrations`. The site copies live events, the committee, the FAQs, the guides and the documents in when it builds (`scripts/fetch-events.mjs`, `scripts/live-content.mjs`), and publishing or changing them triggers a rebuild. The committee shown on the About page is edited at `/admin/committee`, which is separate from who can sign in, the questions on the Join page at `/admin/faqs`, the guides on the Resources page at `/admin/guides`, and approved PDFs on the About page at `/admin/documents`. `/admin/help` explains all of this for the committee, so keep it true when a page changes. Each event has a landscape image, shown on the site and used on Native, and a square one for Luma, Instagram and Discord. Both are shrunk in the browser and stored in Supabase. The same build step copies the landscape image in, so visitors never load it from Supabase. Each build also publishes the same public details as `live-events.json`, `live-committee.json`, `live-faqs.json`, `live-guides.json` and `live-documents.json`, which the admin compares with what was saved to show when a change has really gone live.

Owners change who has access at `/admin/people`, which creates accounts and shows temporary passwords that people must change when they first sign in. It uses the `committee-access` edge function in `supabase/functions`, because creating accounts needs the secret key. There must always be an Owner, and nobody can change their own access, so to hand over, make the new person an Owner and let them remove you. If nobody can get in, set `role` to `owner` in the `committee_members` table in Supabase, then use `node scripts/committee-accounts.mjs`: it creates missing accounts, `--reset <email>` replaces a password, and `--remove-old` deletes accounts for people no longer on the list. It needs the Supabase secret key, so run it in your own terminal. The addresses aren't kept in this repository, because it's public.

`scripts/qa`, `qa` and the planning notes are local and ignored by git.
