# calliope

Mars's music, audiobook and reading app, talking to ares: music from navidrome, audiobooks (human recordings and ares's kokoro voice) with read-along text, and the reading system (Kindle progress through kosync, reading paths, stats, highlights, New Yorker issues). Built with Expo (SDK 57, Expo Router), iOS only.

## tabs

- home: your month so far (recap), recently played, top picks (continue an audiobook, daylist, time-of-day mixes, card of the day); account behind the avatar
- music: pinned (favorites, mixes, playlists), albums, artists, songs, downloaded; album, artist, playlist and mix pages
- audiobooks: the current book (kindle and listening progress side by side), ready to listen, tonight on ares (books ticked for the night voice)
- reading: chips now / paths / highlights / issues / library
- search: music, audiobooks, books and highlights; stats (week, month, year, habits) while nothing is typed

Player (one for songs and books, mini player over the tab bar): background audio and lock screen, sleep timer, crossfade for songs, speed for books, smart shuffle, lyrics (tags, then LRCLIB), queue, downloads for offline. The book player shows the text and follows the sentence being read (scrolling picks back up 3 s after you scroll yourself); the Aa panel sets text size (14–32), line spacing and the page (book colors, dark or aegean), saved for every book; notes (typed or voice, transcribed on ares) go to the book's vault highlights. Card of the day shows Familiar's calculated card, the card drawn in Familiar and the written interpretation (from Familiar's backup on ares). Local notifications: reading reminder, card of the day, New Yorker mondays, audiobook ready.

Offline, the app shows the last saved copy; status, pin, position and note changes wait and sync when ares answers.

## connections

Account → connections:

- calliope api: address (default `http://ares:8087`, over Tailscale) and the bearer token (`TOKEN=` in `/srv/config/calliope/api.env` on ares)
- navidrome: address (default `http://ares:4533`), user and password; only a salted token is kept, never the password

Both live in the iPhone keychain (expo-secure-store). Plain http is allowed for `ares`, `*.ts.net` and local hosts (App Transport Security exceptions in `app.json`).

## updates, build and install

- JS changes ship over the air: merging to `main` runs `checks.yml`, then `ota.yml` publishes an EAS update on channel `production` (runtimeVersion = app version). The app checks on launch and when it comes to the foreground and applies the update when it goes to the background.
- Native changes need a new version in `app.json` and a build: `build-ios.yml` (manual run or a `v*` tag) builds an unsigned `Calliope.ipa` and publishes the release `latest`; on ares `~/ares/host/calliope/app-install.sh` downloads it and installs it with marsign (free Apple ID, re-signed daily).

## development

```bash
npm ci
npx tsc --noEmit
npx expo lint
npx expo export --platform ios   # what checks.yml runs
```

App icon: the aegean amphora, drawn in `assets/icon.svg`; `scripts/icons.py` renders `icon.png`, `icon-dark.png`, `icon-tinted.png` and `splash.png` from it (command in its docstring).
