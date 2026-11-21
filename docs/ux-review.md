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
