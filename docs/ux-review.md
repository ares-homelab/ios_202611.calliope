# ux review (tapa de ux)

19/11/2026 · code only · rules: tapa-de-ux-en

reviewed: `src/theme.ts`, `src/components/` (ui, tabbar, reading), all screens in `src/app/`, contrast of all 6 palettes in dark and light. not reviewed: the running app on the iPhone, VoiceOver order, real Dynamic Type sizes (needs the live pass).

overall: the strongest app of the batch. A real design system (palettes with dark and light pairs, `useStyles`, no hard-coded colors), every icon button is forced to carry a label (`IconButton` requires `label`), 44pt targets on icon buttons, Dynamic Type isn't blocked anywhere, and errors offer "try again" and say when a saved copy is showing.

conflict flagged: the rules ask for sentence case, but calliope is lowercase on purpose (Mars's style). The project wins, so this isn't counted as a problem.

## blocks use

1. **every control says what it is**: of 86 pressables, only 4 declared a role, so VoiceOver read "Play all" as plain text instead of "Play all, button". **fixed** in the shared components: `Button`, `Chip` (with selected state), `IconButton`, `RowLink`, the section "see all" link, `BackBar` (now "back to …") and the avatar. Screens that use their own `Pressable` with text still lack the role; list in the follow-ups.
2. **every control says what it is**: the colored book blocks in reading stats had no name at all. **fixed**: they read the book title.
3. **contrast**: in light mode the gold palette's accent `#9C7A2A` was 4.0:1 on white (3.6 on panels), used for links and as the background of buttons with white text. **fixed**: `#8A6A1F` (5.1 / 4.5). Light `ok` `#3E8A4C` (4.3) → `#357A42` (5.2). Light `warn` on its own background (3.9) → `#95552F` (5.0). The other 5 palettes and all of dark mode pass.

## confuses

4. **touch target**: chips are 34pt tall. **fixed**: `hitSlop` brings the tap area to 44 without changing the look.
5. **reading size**: text at 9, 10 and 10.5pt (stats day and month labels, tab bar names, the "ongoing" tag, the cover spine text), below Apple's 11pt minimum. Not changed, because the stats grid and the tab bar are sized around those numbers. Proposal: 11pt minimum, with the stats grid allowed to scroll sideways.

## finish

6. **one style per role**: about 22 font sizes, from 9 to 38. `fs()` keeps them consistent with the text scale, but `Button` uses fixed 13/14 instead of `fs()`. Proposal: a 6-step scale (12 / 13 / 15 / 17 / 22 / 28 before `fs`).
7. **few weights**: 5 Inter weights (400, 500, 600, 700, 800). Proposal: drop 800 (one place) and 500 where it sits next to 400.

follow-ups (not done, mechanical): `accessibilityRole="button"` on the remaining screen-level `Pressable`s (player, queue, library, settings). Best done during the live VoiceOver pass, so each one is checked as it's added.
