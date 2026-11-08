# HW CompSoc website: motion audit

Audited 8 November 2026 from the source code (visitor site only, not the admin). I didn't run it in a browser, so check each "gap" on the live site before building it.

Every proposal here follows [MOTION-RULES.md](MOTION-RULES.md). Each one maps to one of the six verbs (select, click, type, load, drag, scroll), uses the tokens in `src/motion.ts` and `src/motion.css`, and needs a `?motion=reduced` and `?motion=off` fallback. Ideas that break the rules are listed at the end, with the reason, so they don't keep coming back.

## Summary

The site already has a strong, consistent motion system. The hero, the page wipe, the departures board and the 404 page are the high points. The gaps are mostly in three places:

1. **Overlays open and close with no motion.** The shadcn `animate-in`/`animate-out` classes on Dialog, Popover and Sheet do nothing, because `tailwindcss-animate` / `tw-animate-css` isn't installed. The calendar popover snaps open and shut, and dialogs snap shut.
2. **Small controls don't match the rest of the site.** The theme switch and the Privacy contents marker jump between states, while the nav, filters, committee tree and radio dot all slide.
3. **Copying and selecting text don't use the site's own "select" verb.** There's no `::selection` colour, and four copy buttons each confirm a copy in a different way.

The best opportunities, in order, are:

| # | Idea | Verb | Where | Size |
| --- | --- | --- | --- | --- |
| 1 | Site-wide `::selection` in the cyan select colour | Select | All pages | Tiny |
| 2 | One shared "copy" response: flash-select the copied text, then type "copied" | Select + Type | Footer, committee, calendar, Partners, guides | Small |
| 3 | Copy button on guide code blocks | Click + Select | Guide dialog | Small |
| 4 | Calendar popover builds in like a context menu | Load | Events, Home, event dialog | Small |
| 5 | Dialogs shrink back into the row or card they came from | Load (reversed) | Event and guide dialogs | Medium |
| 6 | Theme switch selection block slides | Select | Header, mobile menu | Tiny |
| 7 | Privacy contents marker slides between sections | Scroll | Privacy | Tiny |
| 8 | Committee file opens like an editor tab: filename types, values type | Type | About | Small |
| 9 | Photos build from pixels when they finish downloading | Load | Board, people strip, committee, dialog cover | Medium |
| 10 | Search matches highlighted in results, like `grep --color` | Select | Events, Resources | Small |

## 1. What's there now

### Shared motion components (`src/motion/`)

| Component | Verb | Used on |
| --- | --- | --- |
| `Select` (persist, flash, hover, driven) | Select | Hero headline, About intro, Join step numbers, window-bar filenames, 404 suggestion |
| `ClickBurst` + `GlobalBursts` | Click | Every press on the site; hero and 404 cursor clicks; Join step numbers |
| `Typed` | Type | Page intro paths, hero caption, empty states, form errors, "Email copied", 404 title bar |
| `PixelBuild` | Load | Hero grid, board rows, event dialog body, resource cards, committee photo, mobile menu, Partners form, draft alert |
| `PixelWipe` | Load | Every route change |
| `FlipText` | Load (departures board) | Board dates and times, list counts, journey numbers, value-list numbers, 404 code |
| `Reveal` | Scroll | Every `h1`, section heading and value-list title |
| `ScrollProgress` | Scroll | Header bar |
| `usePointerLean` | Drag | Hero cursor, 404 cursor |

### By page

| Page | Motion now |
| --- | --- |
| **Header** | Nav selection block slides (`layoutId`), hover underline draws, bar hides on scroll down, stepped scroll progress, logo cursor "clicks" on hover, Join arrow nudges, mobile menu builds from pixels and links slide in |
| **Home** | Hero sequence: grid builds, headline rises, cursor flies in, clicks, drags a selection, panel types "Hello, HW." and words rise, cursor returns and leans. Plays once per session. Journey links sweep and flip their number. Board rows sweep. Resource stack lifts and selects its filename. Headings reveal |
| **Events** | Intro path types, count flips, filter block slides, rows collapse and build in on filter, dates flip on filter, row sweep on hover, date block morphs into the dialog, dialog body builds, empty state types, checkbox tick is stepped |
| **Resources** (hidden until `VITE_SHOW_RESOURCES`) | Cards lift, filenames select, cards build in, slide and drop out on filter, grid height springs, guide grows out of its card, checklist progress is stepped |
| **Join** | Step numbers are clicked in order as they scroll in, FAQ question is selected when open, answers open and close smoothly |
| **About** | "For students." is selected on load, committee tree selection slides, photo builds on each change |
| **Partners** | Form builds in, focused label is selected, radio dot slides, invalid fields shake, errors type, draft alert builds |
| **404** | Title bar types the bad path, "404" flips, the cursor drags a selection over the suggestion or clicks Go home, then leans |
| **Privacy** | None, apart from the shared intro and footer |
| **Footer** | Link underlines draw, logo cursor nudges, "Email copied" types |

## 2. Gaps and proposals, by area

Priority: **P1** fixes something that looks broken or inconsistent. **P2** is a clear improvement. **P3** is polish.

### Site-wide

**P1: No `::selection` style.** The site's idea is "you're the cursor" and its signature move is a cyan selection sweep, but when a visitor really selects text they get the browser's default blue. Add one rule to `src/motion.css`:

```css
::selection{background:var(--select-strong);color:var(--on-accent)}
```

Use `--select-strong` because selected body text is small. This isn't an animation, but it's the cheapest way to make the concept feel real. Check that it doesn't fight the `.select-fill` copies, which already have `user-select:none`.

**P1: One "copy" response everywhere.** Copying is the most computer-like thing a visitor does here, but it's confirmed in four different ways now:

| Where | Now |
| --- | --- |
| Footer email (`Footer.tsx`) | Tick icon, "Email copied" types |
| Committee Discord handle (`CommitteeExplorer.tsx` `CopyHandle`) | " copied" appears as plain text |
| Calendar address (`CalendarMenu.tsx` `CopyLink`) | Icon swaps, label swaps |
| Partners "Copy our address" (`Partners.tsx`) | Label swaps |

Proposal: a shared `useCopy` hook and a small `<Copied/>` piece. On a successful copy:

1. The copied text gets a `Select mode="flash"` sweep, so it looks selected, the way it does when you press Ctrl+C. `flash` mode already exists.
2. The confirmation types out with `Typed` (`copied`, no caret).
3. The button's burst comes from `GlobalBursts` as it does now.

Total under 600ms. In reduced motion, the label swaps with no sweep. This also removes four copies of the same clipboard and timer code.

**P2: Arrow nudge isn't used everywhere.** The arrow nudges on hover on board rows, journey links and the Join button, but not on `RouteLink`, `External`, `LinkButton`, the hero "Next up" card or the governance "Open" buttons. Add one shared rule: `→` moves `translateX(4px)` and `↗` moves `translate(2px,-2px)` on hover and `:focus-visible`, using `--dur-hover`. That covers most of the links on the site.

**P2: Overlays have no motion (`ui/dialog.tsx`, `ui/popover.tsx`, `ui/sheet.tsx`).** Their `data-[state=open]:animate-in fade-in-0 zoom-in-95` classes need `tw-animate-css`, which isn't installed, so they do nothing. Don't install it: zoom and fade aren't in the site's motion language. Instead, delete the dead classes and add the motion below (popover, dialog close, sheet). The overlays should fade over `dur.instant` (120ms) rather than appearing in one frame.

**P3: Photos pop in when they load.** Board thumbnails, the Home people strip, committee faces and the dialog cover are lazy-loaded and appear in one frame. Proposal: `PixelBuild` with `trigger="manual"` and `play` set by the image's `onLoad` (and `complete` for cached images), with a small `scatter` grid of about 6×4 and 300ms, so it reads like a progressive image decoding. Only play it when the image actually arrives late (not already `complete` on mount), so nobody sees fake loading. This makes "Load" mean real loading.

### Header

**P2: Theme switch jumps (`ThemeSwitch.tsx`).** The active option changes background in one frame, while the filter control right below it on Events slides. Use the same `m.span layoutId` indicator as `FilterOptions`, with a separate `layoutId` for the header and the mobile menu.

**P3: Theme change itself.** When the theme flips, the whole page repaints at once. Don't use a full-screen effect: the 450ms wipe is the only one the rules allow. A small option is a stepped cross-out on the icon that is switching off and a `PixelBuild` on the one switching on, at icon size.

### Home

**P2: "Who you'll meet" has no motion and no links (`Home.tsx` `People`).** It's the only section on Home without any motion, and the faces aren't links even though every person has an address (`/about#slug`). Proposal:
- Make each face a link to that person's profile.
- Faces build in with `PixelBuild` when they first scroll into view, staggered by `stagger`, as one moment for the section.
- On hover or focus, the name is selected with `Select mode="hover"`, the same as window-bar filenames.

`.avatar-build` in `src/motion.css` isn't used anywhere. Use it here or delete it.

**P3: Hero footer row (`01 / MEET  02 / MAKE  03 / BELONG`).** It's static under a panel that does everything else. Flip the three numbers with `FlipText` (`trigger="manual"`) when the words finish rising. It's still part of the hero's moment, so it doesn't add a second one. Skip it on repeat visits, as the rest of the hero does.

**P3: "Next up" card.** It fades in. Type its `Next up` label with `Typed` as the card appears, to match the panel caption. It's under 60 characters.

### Events

**P2: Calendar popover snaps open (`CalendarMenu.tsx`).** It's the site's only menu and it appears in one frame. Build it like a desktop context menu: `PixelBuild` with `cols={4} rows={6} order="diagonal"` and about 200ms, starting from the corner nearest the button. Each link gets the same selection sweep as board rows on hover and focus. Closing takes one frame (`dur.instant`).

**P2: Search matches aren't highlighted.** When someone searches, show the matching part of each title and venue with a static `--select-strong` mark, like `grep --color`. It's static, so it doesn't count as a performing highlight, and it reuses the select colour so it's on concept. The board already replays its flips when the search changes, which is enough motion. Apply the same to Resources.

**P3: Cancelled rows.** A cancelled event shows a "Cancelled" tag only. Draw a 2px strike line through the title from left to right (`scaleX`, `--dur-ui`) as the row builds in. Under reduced motion, show the line with no animation.

### Event and guide dialogs

**P2: Dialogs snap shut (`DetailDialog.tsx`).** They grow out of their row or card (`MorphDate`, `OpenFrom`), but they close in one frame, so the trip only goes one way. On close, run the same FLIP in reverse back to the origin rect over `dur.ui`, if the row or card is still on screen. Otherwise fade over `dur.instant`. Radix unmounts on close, so this needs `forceMount` on the content plus `AnimatePresence`, or a short close state before `onClose`. Focus must still return to the opener (`useReturnFocus`).

**P2: Copy button on guide code blocks (`GuideBody.tsx`).** Code blocks are the most compsci thing on the site and have no tools. Add a small window bar above each `pre` with the language or `snippet` on the left and **Copy** on the right. Copying uses the shared copy response above: the code is flash-selected and `copied` types out. Keyboard users can already reach the `pre` (`tabIndex={0}`), so the button goes next to it.

**P3: Checklist completion (`GuideBody.tsx` `Checklist`).** The progress bar already fills in steps. When the last box is ticked, fire one `ClickBurst` at the end of the bar and type `all done` into the status line. This is a reaction to what the visitor did, so it fits "Respond, don't perform".

### Join

**P3: "Say hi to …" link.** It's the only place a real person is named in the steps. Show their committee photo with the same pixel build used for the people strip when step 01 comes into view. It's small and it fits the step-number moment that's already there.

The FAQ and step numbers are well covered. Don't add more here.

### About

**P2: Committee profile changes with no motion except the photo (`CommitteeExplorer.tsx`).** The explorer looks like a code editor, but switching people doesn't feel like opening a file. Proposal:
- The tab filename (`person.file`) types out with `Typed` (`speed={.02}`), as page intro paths do.
- The `dl` values (`studies:`, `ask_me_about:`, `discord:` …) type out one line after another. Each is short, so the total stays under the ~60-character and 600ms limits. The bio is body text, so it doesn't animate.
- The status line `3 of 9` flips with `FlipText`.
- Keep the photo build as it is.

On phones the profile opens inline, so only type the filename there to keep it fast.

**P3: Governance "Open" buttons.** These get the shared arrow nudge (see "Arrow nudge" above). Nothing else is needed.

### Partners

**P3: Submit press.** "Open in email app" works like any other button. On a valid submit, the `Mail` icon could move up-right as if sent (`translate(2px,-2px)` then back, `dur.ui`) before the email app opens. Keep it under 300ms so it never delays the handoff.

Otherwise this page is well covered: building form, selected labels, sliding dot, shake and typed errors. Don't add more.

### Privacy

**P2: Contents marker jumps (`Privacy.tsx`).** The current section is shown with a left border that jumps from item to item as you scroll. Make it a single `m.span layoutId="toc-marker"` that slides with `spring.layout`, like the nav block. This is the Scroll verb and it's smooth movement, which the rules call for. With motion off, it jumps.

### 404

No gaps. It's the most complete page.

## 3. Ideas left out on purpose

These come up a lot for compsci sites, and each one breaks a rule in [MOTION-RULES.md](MOTION-RULES.md).

| Idea | Rule it breaks |
| --- | --- |
| Matrix rain, animated code backgrounds, particle fields | No ambient loops ("Once, not forever"), and they don't map to a verb |
| CRT scanlines, glitch effects, neon glow text | No glows or blur effects. Flicker risks the flashing rule |
| Terminal boot sequence before the page (`> loading compsoc...`) | No fake loading in front of content that's already there. It also holds content hostage |
| Konami code, hidden terminal commands | No easter egg commands |
| Scrolling ticker of upcoming events | No marquees or ticker tapes |
| Countdown to the next event | No ticking countdowns or live clocks |
| 3D rotating logo or WebGL hero | No 3D or WebGL |
| Pinned "how it works" scroll story | No scroll-jacking or pinned scroll scenes |
| Custom cursor trail | No ambient loops; the cursor set in `src/cursor.ts` already covers this |
| Typing whole paragraphs | `Typed` is limited to about 60 characters, and body paragraphs don't animate |

## 4. Suggested order

1. `::selection`, theme switch slide and Privacy marker slide. These are tiny CSS or `layoutId` changes with no new components.
2. Remove the dead `animate-in` classes and `.avatar-build` (or reuse it), and add the overlay fades.
3. Shared copy response, then use it for the guide code-block Copy button.
4. Calendar popover build, then the dialog close FLIP.
5. Committee file-open typing, people strip build and links.
6. Search highlights, image load builds, then the P3 polish.

For each change: add a case to `scripts/motion.test.mjs` if it adds a token or helper, run `npm test` and `npm run build`, check `?motion=reduced` and `?motion=off`, and check on an iPhone for the WebKit rules (full `transform`, no `steps()`, remove covers when they're done).
