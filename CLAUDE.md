# Eurovision Scorer — Development Context

A local-WiFi web app for Eurovision watch parties, one contest year at a time. 2026 (Vienna) has ended and is read-only, and 2027 is set up with its line-up still to come. Participants score each act 1–10 for Song / Vocal / Staging. It runs as a single Docker container (port 3001), e.g. on an Unraid server. It's an iOS-optimised PWA (Add to Home Screen).

**Real deployment details** (server name, IP, the live `scores.db`, rollback tags) are in the gitignored `CLAUDE.local.md`. Read it before any deploy.

---

## Architecture

```
eurovision-scorer/
├── Dockerfile            # Single-stage Node 20 Alpine; builds React then serves via Express
├── docker-compose.yml    # Reference only — Unraid has no `docker compose`
├── server/
│   ├── index.js          # Express API + sql.js SQLite (routes registered inside initSqlJs().then)
│   ├── acts.js           # Per-year config + act data (2026: 15/15/25 acts, archived; 2027: empty)
│   └── package.json / package-lock.json
└── client/               # Create React App, React 18, StrictMode on
    ├── public/index.html # viewport-fit=cover + apple-mobile-web-app-* meta tags
    └── src/
        ├── App.js        # Screen router (state-based, no react-router)
        ├── api.js        # All fetch calls via one api() helper; throws Error(err.error)
        ├── index.css     # Global styles; Barlow Condensed via the .condensed class
        ├── components/ScoreRow.js   # One act: collapsible row with three 1–10 pickers
        ├── components/InviteQR.js   # Home-screen QR card + full-screen QR for guests to scan
        ├── components/ChangePinDialog.js  # Change-PIN modal opened from Home
        └── screens/
            ├── JoinScreen.js        # Enter name
            ├── HomeScreen.js        # Year switch + round cards for the selected year
            ├── ScoringScreen.js     # List of ScoreRows for a round
            ├── LeaderboardScreen.js # "By Act" / "By Voter" tabs
            ├── DeltaScreen.js       # "Opinion Tracker": SF vs Final per act
            └── HostScreen.js        # Password → lock/unlock rounds, list participants
```

---

## Backend (server/index.js)

**Runtime**: Node 20, Express, sql.js (pure-JS SQLite). better-sqlite3 needs native compilation, which fails on Alpine without build tools.

**Persistence**: the DB lives in memory. `run()` calls `saveDb()`, which debounces `db.export()` → `fs.writeFileSync(DB_PATH)` by 500ms. On SIGTERM/SIGINT (`docker stop`) the server calls `saveDbImmediate()` before exiting, so that last 500ms isn't lost. If that final save fails, it exits with code 1.

**Tables**: `participants(id, name UNIQUE, pin_hash)`, `sessions(token_hash, participant_id)`, `scores(participant_id, year, round, act_id, song/vocal/staging_score, UNIQUE(participant_id, year, round, act_id))`, `round_locks(year, round, locked 0/1, PK(year, round))`. Participants and sessions span all years; scores and locks are per year.

Boot-time migrations:
- `addYearColumn()`: rebuild `scores` / `round_locks` with a `year` column if it's missing, tagging every existing row as 2026 (SQLite can't alter a UNIQUE / PRIMARY KEY in place)
- seed a `round_locks` row for every year + round in `acts.js`
- add `pin_hash`
- give any participant with a NULL `pin_hash` the default PIN **1234**
- create a unique `name COLLATE NOCASE` index (it only logs a warning if existing names clash by case)
- delete expired sessions

**Identity (PIN + session token)**:
- Signing in takes a name plus a 4-digit PIN, which must be a string. A new name stores `scrypt(pin)` as `salt:hash`. An existing name must match its PIN.
- There is no "unclaimed" state. Pre-PIN participants and host resets both get `DEFAULT_PIN` (1234).
- Nobody can *choose* 1234, whether creating a name or changing a PIN. Join returns `default_pin: true` when someone signs in with it. The client stores that flag and shows a "change your PIN" banner on Home until they change it.
- Name lookup is `COLLATE NOCASE`, so "alex" hits Alex's PIN, and the unique index stops case-duplicates.
- After 5 wrong PINs a name is locked out for 5 minutes. This is tracked in memory and cleared on restart. Anyone can trigger it for any name; that's accepted as a party prank risk.
- A successful sign-in returns a random token. Only `sha256(token)` is stored. The client sends `Authorization: Bearer <token>`.
- **Sessions expire after 24 hours** (`SESSION_MAX_AGE`). Expired rows are purged at boot and on every sign-in.
- `requireParticipant` middleware resolves the token to `req.participant`. **Saving a score takes the participant from the session, never from the request body.**
- Reads (leaderboards, scores, delta) stay public.

| Endpoint | Purpose |
|----------|---------|
| `POST /api/participants/join` | `{name, pin}` → `{id, name, token}`; 400 bad PIN format, 403 wrong PIN, 429 locked out |
| `GET /api/session` | Token check → `{id, name, default_pin}` or 401 |
| `POST /api/logout` | Deletes this device's session |
| `POST /api/participants/me/pin` | **Auth required**. `{currentPin, newPin}`: changes the PIN, signs out the user's *other* sessions. New PIN can't be 1234. Wrong current PIN counts toward the lockout |
| `GET /api/participants` | `id, name, created_at` (never `pin_hash`) |
| `POST /api/participants/:id/reset-pin` | Host (`{password}`): set PIN to 1234 + delete all that participant's sessions |
| `GET /api/years` | Newest first: `[{year, city, archived, rounds: [{id, label, date, actCount}]}]` |
| `GET /api/years/:year/rounds/:round/acts` | Act list |
| `POST /api/years/:year/rounds/:round/scores` | **Auth required**. `{act_id, song_score, vocal_score, staging_score}`. 403 if the year is archived or the round is locked; 400 unless `act_id` is in that round; validates integers 1–10 |
| `GET /api/years/:year/rounds/:round/scores` | All scores in that round (+ `participant_name`) |
| `GET /api/years/:year/rounds/:round/leaderboard` | Averages per act, each row carries its `act` object |
| `POST /api/years/:year/rounds/:round/lock` | Host (`{locked, password}`); 403 for an archived year |
| `GET /api/years/:year/delta/:participant_id` | `[{act, sfScore, finalScore}]` for that year's Final acts that came from a semi |
| `GET /api/scores/participant/:id` | One participant's scores, **all years** (rows carry `year`) |
| `GET /api/locks` | All years: `[{year, round, locked}]` |
| `POST /api/auth` | Password check only |

`app.param('year')` / `app.param('round')` validate both path params, returning 404 for an unknown year or round, and set `req.year`, `req.yearData`, `req.round` and `req.roundData`.

**Env**: `PORT=3001`, `DB_PATH=/data/scores.db`, `HOST_PASSWORD` (defaults to `eurovision2026`).

**Locks are integers**: SQLite returns `0`/`1`, so check `locked === 1`. In JSX use `locked === 1 && …`, never `locked && …`, because React renders a bare `0`.

---

## Years and act data (server/acts.js)

`acts.js` exports `{ [year]: { city, archived, rounds: { sf1, sf2, final: { date, acts } } } }`. Everything else derives from it: the year list, the Home cards, lock rows, and validation.

- **`archived: true`** means the contest is over. The server refuses score writes and lock changes for it, whatever the lock rows say. Home shows only Leaderboard buttons and an ENDED badge, and the Host screen hides the lock buttons.
- **Not announced yet** = `acts: []` and `date: null`. Home shows "Line-up not announced yet" and a disabled "Coming soon" button, and hides the Opinion Tracker until the year's final has acts.
- **Adding next year's line-up**: fill in that year's `date` / `acts` (and `city`). Set the finished year to `archived: true`. To add a new year, add a key; its lock rows are created at boot.
- Every act has `id`, `position` (running order), `country`, `flag`, `artist` and `song`. Semi ids are `sf1-N` / `sf2-N`; Final ids are `gf-N`. Ids only need to be unique within a year + round.
- Final acts carry `semifinal` (`'sf1' | 'sf2' | null`) and `semifinalActId`, pointing at the same act's semi entry in the **same year**. These are used by the Delta screen and by ScoreRow's "SF scores" banner when scoring the Final. `null` means the act qualified directly (Big 5 + host).
- **Never renumber act ids once scores exist**: `scores.act_id` stores them.

---

## Frontend notes

- **Branding** is "Eurovision Scorer" (Join logo, Home header, page title, manifest). The `esc2026_*` localStorage keys keep their old names on purpose: renaming them would sign everyone out.
- **Year selection**: App holds `year`, which starts as `null`. Home loads `/api/years` and calls `onYearChange(prev => prev ?? newest)`, so every app launch opens on the newest year; it isn't persisted. The Home year switch changes it, and Scoring, Leaderboard, Delta and Host all take `year` as a prop.
- **Participant persistence**: `localStorage['esc2026_participant']` = `{id, name, token, default_pin}`. `api.js` keeps the token via `setAuthToken()`. On load, App goes straight to `home` and checks `GET /api/session` in the background. It checks again every time the app returns to the foreground (`visibilitychange`). The session response's `default_pin` is authoritative and overwrites the stored flag. A 401 (PIN reset by host, or the 24-hour expiry) sends the user back to `join` with their name prefilled. A stored participant without a token (from before PINs) also goes to `join` with the name prefilled. Thrown API errors carry `e.status`.
- **Stale tabs after a deploy**: phones don't reload a tab when you switch back to it, so a page opened before a deploy keeps running the old bundle. On `visibilitychange`, App fetches `/` and reloads if the live `index.html` no longer references this page's `static/js/main.*.js`. This is skipped under the dev server.
- **Sign-out**: the ✕ on Home opens an in-app confirmation (no `window.confirm`). It then calls `/api/logout` and clears storage.
- **Host screen**: participants are listed with a "Reset PIN" button (resets to 1234). It needs a second tap ("Confirm?"), and the armed state disarms after 4 seconds.
- **ScoringScreen `handleScore`**: reads and writes the latest scores through `scoresRef` to avoid stale closures when tapping fast. Keep the `saveScore` call out of any `setState` updater, because StrictMode double-invokes updaters. It saves only once all three categories are set. A failed save shows a red banner (special text for a 403 "Round is locked").
- **Invite QR** (`InviteQR`, on Join and at the top of Home): on Home it can be dismissed with ✕. That's remembered per device in `localStorage['esc2026_invite_hidden']`, and an "Invite friends" button in the extras brings it back. It encodes `window.location.origin`, i.e. whatever address the host opened the page with. It's generated client-side by `qrcode.react`, with no network calls. The server can't do this because inside Docker it only sees its bridge IP. When opened via `localhost` it shows a hint to use the network address instead. Tap the card for a full-screen QR.
- **Fonts**: Barlow / Barlow Condensed are bundled via `@fontsource/*` imports in `index.js` (no Google Fonts), so the app works on WiFi without internet.
- **Leaderboard**: names come from `/api/participants` (no UUIDs shown). The current user gets a "YOU" badge.

---

## iOS safe area (critical)

`index.html` must keep `viewport-fit=cover`, `apple-mobile-web-app-capable` and `black-translucent`.

Screen headers use:
```css
padding-top: calc(env(safe-area-inset-top, 0px) + 16px);   /* Home uses + 20px */
```
Scrollable screens use:
```css
padding-bottom: max(40px, env(safe-area-inset-bottom));
```
JoinScreen has no safe-area padding; it is vertically centred.

**Debug trick**: put a fixed red `body::before` with `height: env(safe-area-inset-top, 50px)` in `index.html`. No bar means a stale build is being served.

---

## Deploying on Unraid

Unraid's Docker has no `docker compose` / `docker-compose`, so the image is built from source on the server.

- **Build source**: `/mnt/user/appdata/eurovision-scorer/` (the usual Unraid appdata location)
- **Data**: that same folder is mounted as `/data`, so `scores.db` sits next to the source. **Never overwrite or delete `scores.db`**; it holds every score.
- **Schema changes are one-way**: images from before the per-year migration can't read a migrated `scores.db`. Back up `scores.db` before deploying a schema change; rolling back the image means restoring the matching backup too.
- **Container**: `eurovision-scorer`, port `3001→3001`, volume `/mnt/user/appdata/eurovision-scorer → /data`. If it was created from an Unraid template, the template lives in `/boot/config/plugins/dockerMan/templates-user/`.

Deploy changes (server at e.g. `192.168.1.50`):
```bash
# from your computer, in this repo
rsync -av --exclude .git --exclude node_modules --exclude client/build --exclude scores.db \
  ./ root@192.168.1.50:/mnt/user/appdata/eurovision-scorer/

ssh root@192.168.1.50
cd /mnt/user/appdata/eurovision-scorer
docker build -t eurovision-scorer .
```
Then recreate the container. Unraid's `update_container` script tries to pull from a registry, which fails for this local image. Instead, replicate the template's run command. Keeping the `dockerman` label means the Unraid UI still manages it:
```bash
docker stop eurovision-scorer && docker rm eurovision-scorer
docker run -d --name=eurovision-scorer --net=bridge \
  -e TZ="<your timezone>" -e HOST_OS="Unraid" -e HOST_HOSTNAME="<server name>" -e HOST_CONTAINERNAME="eurovision-scorer" \
  -e HOST_PASSWORD=<host password> -l net.unraid.docker.managed=dockerman \
  -p 3001:3001/tcp -v /mnt/user/appdata/eurovision-scorer:/data:rw eurovision-scorer:latest
```
Tag the old image first (`docker tag <old-id> eurovision-scorer:previous`) so you can roll back.
Watch out for the Docker layer cache: if a stale `index.html` is being served, rebuild with `docker build --no-cache`.

---

## Known issues / watch-outs

1. **No real-time sync**: the leaderboard is a snapshot. Go back and reopen it to refresh.
2. **Default host password**: `HOST_PASSWORD` defaults to `eurovision2026`, which is public in this repo. Set your own. The server logs a warning only when the variable is missing entirely.
3. **PINs are party-grade, not real security**: they travel over plain HTTP on the LAN, and 4 digits can be guessed slowly despite the lockout. Anyone still on the default 1234 (migrated or reset) is open to anyone who knows that default, until they act on the Home banner and change it.
4. **No delete/reset**: to reset, stop the container, move `scores.db` aside, and start it again.
5. **Out-of-order saves**: changing a completed act's score rapidly fires several POSTs. Nothing guarantees the last tap lands last.

---

## Local development

```bash
# Terminal 1 — server (DB_PATH must be writable locally)
cd server && npm install && DB_PATH=./scores.db node index.js     # :3001

# Terminal 2 — client
cd client && npm install && npm start                                 # :3000, talks to :3001
```
