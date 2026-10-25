# Eurovision Scorer

Watch-party scoring app for Eurovision, one contest year at a time. Guests on the
local WiFi score each act 1–10 for Song / Vocal / Staging from their phones.

It's a single Docker container that runs on any Docker host (a NAS, a Raspberry Pi,
a Mac with Docker Desktop), including an Unraid server.

- **2026 (Vienna)**: ended. Scores and leaderboards are kept, read-only.
- **2027**: set up, line-up not announced yet.

## Features

- Score each act on Song / Vocal / Staging (1–10 each); a score saves once all three are set
- Leaderboard per round, by act and by voter
- Opinion Tracker: compare your Grand Final scores with your semi-final scores for the same acts
- Year switch on Home; past years stay browsable
- Name + 4-digit PIN sign-in, so nobody can score as someone else
- Invite QR on the Join and Home screens for guests to scan
- Host controls: lock/unlock rounds, see participants, reset a forgotten PIN
- Add to Home Screen on iPhone or Android for an app-like experience
- No internet needed, just the local WiFi (fonts and QR codes are bundled)

## Joining (guests)

1. Scan the invite QR on the host's phone, or open the address the host gives you
   (e.g. `http://192.168.1.50:3001`)
2. Enter your name and pick a 4-digit PIN (any except `1234`)
3. Use the same name and PIN to sign in on another device. Sessions last 24 hours

Forgot your PIN? The host can reset it to `1234`. Sign in with that, and the Home
screen will ask you to change it.

### Add to Home Screen

- **iPhone:** in Safari, tap Share → "Add to Home Screen". It opens full-screen, like an app.
- **Android:** in Chrome, tap ⋮ → "Add to Home screen". The app is served over plain
  HTTP, so Android adds a shortcut that opens in a Chrome tab rather than a
  full-screen app. It works the same either way.

## Host controls

Open Host Controls in the app and enter the host password (default `eurovision2026`).
From there you can:

- Lock/unlock each round (locked = no more scoring). Archived years can't be changed
- See everyone who has joined, and reset a participant's PIN to `1234`

The password comes from the `HOST_PASSWORD` environment variable. Change it from the
default before a party.

## Adding next year's line-up

All contest data lives in `server/acts.js`. When the line-up is announced:

1. Fill in that year's `city`, and each round's `date` and `acts`
2. For Final acts that came through a semi, set `semifinal` and `semifinalActId`
3. Set the finished year to `archived: true`
4. Deploy

To add a further year, add a new key; its rounds are set up at boot.
Don't renumber act ids once anyone has scored them.

## Running it

You need a machine on the party WiFi with Docker. The container needs port 3001 and
a folder mounted at `/data`, where it keeps `scores.db`.

**With Docker Compose:** edit the volume path and `HOST_PASSWORD` in
`docker-compose.yml`, then:

```bash
docker compose up -d --build
```

**With plain Docker:**

```bash
docker build -t eurovision-scorer .
docker run -d --name eurovision-scorer -p 3001:3001 \
  -v /path/to/data:/data -e HOST_PASSWORD=your-password eurovision-scorer
```

Then open `http://<that machine's IP>:3001`. Use the network IP, not `localhost`,
so the invite QR points somewhere guests' phones can reach.

To update, pull the new code, rebuild the image, and recreate the container.
Your scores stay in the `/data` folder.

**Back up `scores.db` and never delete it.** It holds every score.

### On an Unraid server

Unraid has no `docker compose`, so build the image from source on the server and
start the container with `docker run`. For a server at e.g. `192.168.1.50`:

```bash
rsync -av --exclude .git --exclude node_modules --exclude client/build --exclude scores.db \
  ./ root@192.168.1.50:/mnt/user/appdata/eurovision-scorer/
ssh root@192.168.1.50 'cd /mnt/user/appdata/eurovision-scorer && docker build -t eurovision-scorer .'
```

The full `docker run` command (with the labels that keep it in the Unraid UI),
rollback steps and watch-outs are in [CLAUDE.md](CLAUDE.md#deploying-on-unraid).

## Local development

```bash
cd server && npm install && DB_PATH=./scores.db node index.js   # API on :3001
cd client && npm install && npm start                           # UI on :3000
```
