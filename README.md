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

## Font sizes

Every piece of text on the site and in the admin uses one of these roles, set once in `src/website.css`. To change a size, change its token. `npm test` fails on any other size.

| Token | Size | Used for |
|---|---|---|
| `--fs-page` | 33–58px | The main heading on a public page |
| `--fs-section` | 28–36px | Section headings and admin page titles |
| `--fs-card` | 22px | Card and dialog titles |
| `--fs-subhead` | 18px | Small headings and admin card headings |
| `--fs-body` | 16px | Reading text, buttons, links, inputs and navigation |
| `--fs-sm` | 13px | Captions, metadata and hints |
| `--pixel-lg` | 22px | Pixel font: dates and numbers |
| `--pixel-sm` | 11px | Pixel font: labels and tags |
| `--fs-display` | 88–176px | The 404 number only |

Tailwind's `text-xs`, `text-sm`, `text-base` and `text-lg` point at these tokens. Keep `--fs-body` at 16px or above, because iPhone Safari zooms the page when a field's text is any smaller.

## Events

The committee manages events at `/admin`, a separate site in `src/admin` that loads only for people who open it. They sign in with a password. Events live in Supabase, and the rules for who can do what, and for what an event needs before it can go live, are in `supabase/migrations`. The site copies live events, the committee, the FAQs, the guides and the documents in when it builds (`scripts/fetch-events.mjs`, `scripts/live-content.mjs`), and publishing or changing them triggers a rebuild. The committee shown on the About page is edited at `/admin/committee`, which is separate from who can sign in, the questions on the Join page at `/admin/faqs`, the guides on the Resources page at `/admin/guides`, and approved PDFs on the About page at `/admin/documents`. `/admin/help` explains all of this for the committee, so keep it true when a page changes. Each event has a landscape image, shown on the site and used on Native, and a square one for Luma, Instagram and Discord. Both are shrunk in the browser and stored in Supabase. The same build step copies the landscape image in, so visitors never load it from Supabase. Each build also publishes the same public details as `live-events.json`, `live-committee.json`, `live-faqs.json`, `live-guides.json` and `live-documents.json`, which the admin compares with what was saved to show when a change has really gone live.

Owners change who has access at `/admin/people`, which creates accounts and shows temporary passwords that people must change when they first sign in. It uses the `committee-access` edge function in `supabase/functions`, because creating accounts needs the secret key. There must always be an Owner, and nobody can change their own access, so to hand over, make the new person an Owner and let them remove you. If nobody can get in, set `role` to `owner` in the `committee_members` table in Supabase, then use `node scripts/committee-accounts.mjs`: it creates missing accounts, `--reset <email>` replaces a password, and `--remove-old` deletes accounts for people no longer on the list. It needs the Supabase secret key, so run it in your own terminal. The addresses aren't kept in this repository, because it's public.

### Minutes

`/admin/minutes` turns a Teams transcript into a first draft of a meeting's minutes. The browser strips the timestamps (`cleanTranscript` in `src/admin-rules.ts`), then the `generate-minutes` edge function checks the person is on the committee and asks Cloudflare Workers AI to write them. The transcript isn't stored, and the function logs who used it and how long the transcript was, never what it said. The minutes are kept only when someone saves them to Drive. Workers AI has a free daily allowance of 10,000 neurons, which is enough for several meetings a day. It resets at midnight UTC.

To set it up, create an API token in Cloudflare with the Workers AI permission, then:

```
supabase functions deploy generate-minutes
supabase secrets set CLOUDFLARE_ACCOUNT_ID=<account id> CLOUDFLARE_AI_TOKEN=<token>
```

To try a different model, set `MINUTES_MODEL` to its Workers AI name. It needs a context window of at least 32,000 tokens. Gemini's free tier isn't an option, because Google's terms only allow its paid tier for apps used in the UK.

### Google Drive

`/admin/drive` shows one folder of the society's Google account to the whole committee, and **Save to Drive** on the Minutes page saves minutes as Google Docs in a `Minutes` folder inside it. Drive is the only copy: the site keeps nothing. Everything goes through the `google-drive` edge function, which holds the connection in the `google_drive` table that only the secret key can read. It only lists, reads and creates, and refuses to show anything outside the chosen folder. It asks Google for full Drive access because the narrower permission can't add files to a folder the app didn't create.

To set it up, signed in to Google as the society's account:

1. In [Google Cloud](https://console.cloud.google.com), create a project and enable the **Google Drive API**.
2. In **Google Auth Platform**, set it up as an **External** app. Under **Data access**, add the `https://www.googleapis.com/auth/drive` scope. Under **Audience**, choose **Publish app**. While it's in testing, Google ends the connection after 7 days. It doesn't need Google's review, because only the society's account uses it.
3. Under **Clients**, create a **Web application** client with these redirect URIs: `https://<the site's address>/admin/drive` and `http://127.0.0.1:5173/admin/drive`.
4. Add its ID and secret to Supabase, in each project that should use it: `supabase secrets set GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=...`.
5. Deploy the function with `supabase functions deploy google-drive --no-verify-jwt`, and apply the migration.
6. An Owner opens `/admin/drive`, chooses **Connect Google Drive**, signs in as the society's account, clicks past the "unverified app" warning, and chooses the folder.

If the society's Google password changes, Google may end the connection. The Drive page then asks an Owner to connect again.

### Resources switch

The Resources page is switched off unless `VITE_SHOW_RESOURCES` is `true`. While it's off, the menus and Home leave it out, `/resources` and every guide's address show the not-found page, and the sitemap, link previews and the site's download leave the guides out. The admin still works as usual and says the page is off. To switch it on, add `VITE_SHOW_RESOURCES=true` in Vercel's environment variables for Production and redeploy, or put it in `.env.local` locally. Even when it's on, the page only appears once at least one guide is confirmed. Confirmed guides are still published in `live-guides.json` either way, so the admin can tell when a change has gone live.

### Test database

The site uses the production Supabase project unless `.env.local` names another. Copy `.env.example` to `.env.local` and fill in the test project's address and publishable key, then restart `npm run dev`. The site, the admin, `npm run build` and `scripts/committee-accounts.mjs` all follow it, and the test project has no deploy hook, so saving there can't rebuild the live site. Delete the file and restart to go back. The local content copies refresh themselves. Vercel has no `.env.local`, and a production build stops if `VITE_SUPABASE_URL` is set there. A new migration has to be applied to both projects.

`scripts/qa`, `qa` and the planning notes are local and ignored by git.
