# ux review (tapa de ux)

19/11/2026 · code only · rules: tapa-de-ux-en

reviewed: `src/theme.ts`, `src/components/` (ui, tabbar, reading), all screens in `src/app/`, contrast of the palettes in dark and light (6 at the time; aegean is now the only one). not reviewed: the running app on the iPhone, VoiceOver order, real Dynamic Type sizes (needs the live pass).

overall: the strongest app of the batch. A real design system (palettes with dark and light pairs, `useStyles`, no hard-coded colors), every icon button is forced to carry a label (`IconButton` requires `label`), 44pt targets on icon buttons, Dynamic Type isn't blocked anywhere, and errors offer "try again" and say when a saved copy is showing.

conflict flagged: the rules ask for sentence case, but calliope is lowercase on purpose (Mars's style). The project wins, so this isn't counted as a problem.

## blocks use

1. **every control says what it is**: of 86 pressables, only 4 declared a role, so VoiceOver read "Play all" as plain text instead of "Play all, button". **fixed** in the shared components: `Button`, `Chip` (with selected state), `IconButton`, `RowLink`, the section "see all" link, `BackBar` (now "back to …") and the avatar. The screen-level `Pressable`s got the role too (see follow-ups).
2. **every control says what it is**: the colored book blocks in reading stats had no name at all. **fixed**: they read the book title.
3. **contrast**: the review also darkened the gold palette's light accent (`#9C7A2A`, 4.0:1 on white). **dropped**: gold no longer exists, aegean is the only palette since #6 (light accent `#2C5A85`: 7.2 on white, 6.0 on raised; dark `#8FB8E0`: 9.3 on bg, all pass). Light `ok` `#3E8A4C` was 4.25:1 as text on white. **fixed**: `#357A42` (5.2). Light `warn` `#A8643A` passes where it's used (4.6 as text on white and under white button text; on `warnBg` it's only an icon, 3.9 against the 3:1 for non-text), so it's unchanged. Dark mode passes.

## confuses

4. **touch target**: chips are 34pt tall. **fixed**: `hitSlop` brings the tap area to 44 without changing the look.
5. **reading size**: text at 9, 10 and 10.5pt (stats day and month labels, tab bar names, the "ongoing" tag, the cover spine text), below Apple's 11pt minimum. Not changed, because the stats grid and the tab bar are sized around those numbers. Proposal: 11pt minimum, with the stats grid allowed to scroll sideways.

## finish

6. **one style per role**: about 22 font sizes, from 9 to 38. `fs()` keeps them consistent with the text scale, but `Button` uses fixed 13/14 instead of `fs()`. Proposal: a 6-step scale (12 / 13 / 15 / 17 / 22 / 28 before `fs`).
7. **few weights**: 5 Inter weights (400, 500, 600, 700, 800). Proposal: drop 800 (one place) and 500 where it sits next to 400.

follow-ups: **done** after the rebase: `accessibilityRole="button"` on every remaining `Pressable` (player, queue, library, settings, reader, stats and the rest; the note sheet's body is the one exception, it only catches taps). Labels where the text alone isn't enough: the stats month arrows ("earlier month" / "later month"), the calendar days (date, selected state), the path covers (book title), the recent-reads covers (title and percent), the library search box. Settings rows only act as a button when they open something; the tonight list carries its ticked state. Still to check on the iPhone in the live VoiceOver pass: reading order and how each one sounds.

---

# 20/11/2026 · code since the 19/11 review + live pass

reviewed: the code merged after the 19/11 review (reader, articles, library and shelves in the reading tab, book and fanfic pages with read/listen/offline, the aegean-only theme, the job that added roles to every `Pressable`), and the 19/11 proposals left as "not changed". live pass: `expo start --web` in a throwaway copy outside the repo, 390x844, dark and light, against a local mock api with made-up public-domain books (native modules shimmed, every non-localhost request blocked, no real token). screens: home, reading (now, library), audiobooks, book page, shelf, article, reader with its Aa panel, settings. not covered: player, readalong and lyrics (need a playing track), VoiceOver on the iPhone, real Dynamic Type.

## blocks use

1. **contrast**: text on the coloured cards (home "top picks", reading's "continue" card) was always white. On the gold swatch `#C9A46A` that is 2.3:1, and the 80% white eyebrow on the brown swatch was 4.4:1; mixes can bring their own colour from the api too. **fixed**: `inkOn(bg)` in `theme.ts` picks white or a warm ink per colour; every swatch now reads 4.9:1 or better, the card's buttons and progress line follow it.
2. **contrast (non-text)**: the "listening" series in the stats charts was a fixed `#E8A55C`, 2.1:1 on white in light mode. **fixed**: it uses the theme's `warn` (4.6:1 light, the same warm tone in dark).

## confuses

3. **touch targets**: in the reader's Aa panel the spacing and page chips were 34pt and the size steps 40pt; the continue card's "read" button 34pt; the footnote's "close" and "next chapter" were bare text. **fixed**: 44pt through `hitSlop` or `minHeight`, look unchanged.
4. **every control says what it is**: "open the original" in an article was plain bold text with `onPress`. **fixed**: a link role, underlined, 44pt tall. The current chapter in the chapter list is announced as selected; the library search field has a name ("search the library"); the "details" button on the continue card names the book.
5. **every control says what it is**: book and fanfic pages pass `label="back"` to `BackBar`, so VoiceOver read "back to back". **fixed**: plain "back".
6. **empty states show the way forward**: "no books here.", "no articles in wallabag.", "no books match." and "nothing open on the kindle right now." stopped there. **fixed**: each says what to do (pull to refresh, queue a book for tonight, clear the status filter, try fewer letters); the empty "now" view has an "open the library" button.
7. **the label stays visible**: in settings a long label ("wanted from apple music & plays") squeezed its value to "0 so…". **fixed**: the value keeps its width (up to 55%) and the label wraps.

## finish

8. **reading size** (19/11 #5, carried out): calendar days (9pt), weekday and month labels, hour marks (10pt) and tab names (10.5pt) are now 11pt; the grid cells and the 70pt tabs hold them.
9. **one style per role** (19/11 #6, part): `Button` text now follows `fs()` like the rest. The 6-step scale is still a proposal.
10. **few weights** (19/11 #7, part): Inter 800 is no longer loaded; `F.black` is 700. The 500-next-to-400 cases are still a proposal.
11. **one format per data type**: drawn covers (no cover image) broke long words mid-word ("Middlemar / ch", "Meditatio / ns"). **fixed**: the title size fits the longest word, and narrow covers show no text (the title is always printed next to them).

passes: the reader tints (every swatch, dark and light) keep body and muted text above 6:1; the aegean accent passes everywhere it's text; status on the book page is never colour alone (the kindle icon colour always comes with words); deleting an offline copy asks first.

not changed:
- the 6-step type scale (about 20 sizes remain) and merging 500 into 400: they touch every screen and want a look on the iPhone first.
- "saved · 12 MB" on the book page is the button that removes the offline copy. It asks before removing, so it's safe, but the label describes the state, not the action. Proposal: "saved · 12 MB" as text and a smaller "remove" next to it.
- the `Tile` values on the book page ("10h 00m", "20 nov") rely on `adjustsFontSizeToFit`, which works on iOS; on web they truncate. Fine on the phone.
- the web pass warns that a `Pressable` sits inside another (the continue cards); iOS doesn't mind, VoiceOver reads them as two buttons. Worth checking in the VoiceOver pass.

## unslop (polish mode)

direction: calliope is Mars's own library, listening room and reader in one; character *quiet, bookish, exact*; world: a reading room by the sea, aegean blue and paper; moments: the book covers and the reader page; signature: the lowercase voice.

audit: the screens were already designed (one palette, one family, no gradients, glows or emoji, no exclamation marks, no hype). Signs left: uppercase tracked eyebrows in a lowercase ui (STATUS, ABOUT, ON A PATH, NOW PLAYING, THIS WEEK, YOUR READING, CONTINUE, SIZE / LINE SPACING / PAGE, NOTE, settings groups, path sections), a purple avatar left from the old palettes, hard-coded chart and status colours outside the theme, white-on-gold cards, covers breaking words, uneven page padding (library at 24 instead of 20).

changes:
- **type**: every eyebrow and group label is lowercase at 12pt semibold, no wide tracking (`Eyebrow`, `Group`, settings, queue, readalong, issues, mix, reader panel, path cards, continue cards). One weight fewer (800).
- **color**: the avatar uses the aegean accent; the stats "listening" series and the issues dot come from the theme; coloured cards choose their ink by contrast.
- **spacing**: the library screen uses the page margin (20) like every other screen.
- **details**: drawn covers keep whole words.
- kept: the palette, Inter, the layout and order of every screen, the cover drawings and swatches, the tarot cards' gold and indigo on the mix page (a content moment, not chrome).

suggestions (not done): the cover drawings are the one place for a richer moment, for example a thin rule and the series number like a real spine label; the "your november so far" card could show the month as a small bar of reading vs listening instead of three numbers in a row.

checks: `npx tsc --noEmit`, `npx eslint src --max-warnings 0` and `npx expo export --platform ios` pass (they also passed on origin/main before the changes). No native change, so no version bump; nothing was published.

---

## tapa de ux audit (real skill, 20/11)

rules: tapa-de-ux-en (the copy is all English, so the pt-BR skill wasn't needed). code only: the 20/11 sweep branch, every screen in `src/app/`, `src/components/`, `theme.ts` and `format.ts`. no new live pass; no device. project identity wins: lowercase everywhere (the sentence-case rule and its capitals don't apply) and the aegean palette.

topics reviewed, in the table's order: hierarchy, typography, accessibility, color, buttons and actions, forms, states, ux writing, navigation, psychology. none was skipped; forms covers the connection screen and the search, filter and note fields.

### rule findings the sweep didn't cover

blocks use
1. **one style per role / every control says what it is**: no text was marked as a heading, so VoiceOver's headings rotor found nothing. **fixed**: screen titles, section heads, settings groups, the book and fanfic titles, the book page's section labels, stats card titles and the chapters sheet title carry the heading trait.
2. **every control says what it is**: the position and volume bars in the player (`Scrubber`) had no name, role or value; VoiceOver couldn't find or move them. **fixed**: adjustable, named "position" (reads "12:04 of 41:30", swipes 30 s in books and 10 s in songs) and "volume".
3. **touch target**: the music player's heart and more (36pt), its close handle (17pt tall, below Apple's 28pt floor) and the readalong header's two buttons (40pt). **fixed**: `hitSlop` to 44 and more, look unchanged.
4. **label always visible / every control says what it is**: the connection fields, wanted filter, tonight search, highlight search and readalong note had no name for VoiceOver (it read the placeholder or nothing). **fixed**.

confuses
5. **text grows without breaking**: `Button`, `Chip` and `Segmented` had fixed heights, which cut text at large Dynamic Type sizes. **fixed**: minimum heights; same look at the default size. The outline button (36pt) also gets `hitSlop` to 44.
6. **you are here / never color alone**: the active tab differed only by colour. **fixed**: heavier name and icon stroke. Smart shuffle on/off was colour only. **fixed**: a switch for VoiceOver and a tinted pill when on.
7. **every action responds (a disabled button says what's missing)**: in connections, "save" with no token and "sign in" with no password showed "…", as if loading. **fixed**: both stay active and say which field is empty.
8. **the right keyboard and autofill**: addresses open the url keyboard; user and password tell the phone what they are, so the password manager can fill them. **fixed**.
9. **every control says what it is (state)**: on/off settings ("new yorker on mondays", "audiobook ready") are announced as switches with their state; "about"/"summary" say expanded or collapsed; the Aa button says whether the panel is open; the sleep timer says its time left; each day of the week chart reads its reading and listening time.

finish
10. **one format for each kind of data**: plurals were fixed strings ("1 books", "1 songs", "1 chapters voiced"), and stats wrote durations as "1 h 5 min" / "12.3 h" while the rest of the app writes "1h 05m". **fixed**: `count()` in `format.ts` and the shared `hm` format in stats.
11. **missing data is not zero**: favourites, playlist and artist counts and recap plays showed "0 songs" before the data arrived. **fixed**: "— songs".
12. **text alignment (tabular figures)**: the player's running time jittered as digits changed width. **fixed**: tabular figures.
13. **one name for each thing**: the avatar was "profile and settings" for VoiceOver; the screen and every back button call it "account". **fixed**: "account".

### contradictions with the sweep
- **a status color has one meaning**: the sweep moved the stats "listening" series to the theme's `warn`, the colour of the offline banner, the "try again" buttons and failed connections. Contrast is right, but the chart now borrows the warning colour. Not changed (the warm listening tone predates the sweep, and a new hue is a palette call): see left open.
- nothing else the sweep did goes against a rule. The lowercase eyebrows follow the project (the rule's capitals don't apply), the 11pt minimum matches Apple, and `inkOn` and the 44pt fixes hold up.

### passes
offline (banner with what's saved, outbox listed, retried on its own), deleting (downloads, offline copies and the cache confirm with what's lost; status and pins are reversible), one family (Inter), both themes defined separately, no decoration (one shadow, on the floating cover), a visible five-place tab bar with names, sheets with a close button and swipe, empty states with a way forward (sweep).

### fixes
- `1ef6773` ux: one plural and duration format; missing counts show a dash (node tests in `tests/`, `npm test`, added to checks.yml)
- `5e6d417` a11y: headings, adjustable scrubbers, named fields and switch states
- `c786aee` ux: 44pt targets in the player, controls grow with text, active tab not colour alone
- `b0319e3` forms: connection fields autofill and say what's missing

### left open
- **status colour on the chart**: give "listening" its own role in the palette (a hue that isn't `warn`, e.g. a sea-green next to the aegean blue) or accept the overlap. Mars's call.
- **few weights**: Inter 400, 500, 600 and 700 are four weights; the rule asks for two or three. Merging 500 (sweep proposal) still wants a look on the phone.
- **reading size and scale**: body text is 16pt (`fs(14)`); the rule asks for 17 on iPhone. Belongs with the 6-step type scale the sweep left open; body 16 next to soft 15 is also less than a step apart.
- **one spacing scale**: spacing isn't on a 4 grid (`S.gap` 10, plus 6, 14, 18, 22). The values are consistent between screens, so it's a taste call, not a bug.
- **wait fits the time**: loading is a plain "loading…" line everywhere; skeletons for the lists would fit the rule. Needs the device to judge real timings.
- **Jakob**: option lists (player "more", sleep timer, settings pickers) open as alerts, while the book page uses an iOS action sheet. One pattern (action sheet) would be the iOS way.
- **motion under control**: the reader's chapters sheet slides and modals use the system transitions; check with Reduce Motion on the iPhone.
- **name says what's there**: "account" holds connections, playback, notifications and appearance; "settings" would say it better. Kept, since it's the name on every screen.
- **label instead of state** (sweep): "saved · 12 MB" removes the offline copy, and the settings row "offline copy · saved 14:02" clears it. Both confirm first.
- the uppercase author line on drawn covers is a cover imitation (content), kept.

### Mars must do
- merge PR #7 (OTA; no native change, no version bump).
- in the VoiceOver pass on the iPhone: the headings rotor, swiping the position bar, and the tab bar's heavier active name.
- decide the chart colour for "listening".

checks: `npx tsc --noEmit` (0 errors), `npx eslint src --max-warnings 0` (0 problems), `npm test` (3 of 3 pass), `npx expo export --platform ios` (bundle built).
