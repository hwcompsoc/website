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

`npm run dev` serves the site with live reload, and `motion-lab.html` is a development workbench for the motion components. `npm run build` writes the deployable site to `dist`. Vercel runs it using `vercel.json`.

## Layout

- `src/pages`, `src/components`: the site. `src/components/ui` holds the shadcn/ui components it uses.
- `src/motion`, `src/motion.ts`: the motion system. `scripts/webkit-guard.test.mjs` fails on animation patterns that stutter on iPhones.
- `src/content.ts`: events, guides and committee text.
- `src/router.ts`: real paths, back and forward, and scroll restore. `route()` in `src/content.ts` decides what each address shows, and `vercel.json` sends every address to the app.
- `src/website.css`: styles, with the colour tokens and the dark theme. `src/motion.css`: motion component styles.
- `src/theme.ts`: light and dark themes. A short script in `index.html` applies the theme before first paint, so keep the two in step.

`scripts/qa`, `qa` and the planning notes are local and ignored by git.
