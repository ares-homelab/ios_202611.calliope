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
