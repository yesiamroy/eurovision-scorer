const express = require('express');
const cors = require('cors');
const initSqlJs = require('sql.js');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const years = require('./acts');

const ROUND_LABELS = { sf1: 'Semi-Final 1', sf2: 'Semi-Final 2', final: 'Grand Final' };

const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = process.env.DB_PATH || '/data/scores.db';
const HOST_PASSWORD = process.env.HOST_PASSWORD || 'eurovision2026';

app.use(cors());
app.use(express.json());

const clientBuild = path.join(__dirname, '../client/build');
if (fs.existsSync(clientBuild)) {
  app.use(express.static(clientBuild));
}

let db;

let saveTimer = null;
function saveDb() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      const data = db.export();
      fs.writeFileSync(DB_PATH, Buffer.from(data));
    } catch (e) {
      // A throw inside a timer would crash the process; log and retry on the next write
      console.error('Failed to save DB:', e);
    }
  }, 500);
}

function saveDbImmediate() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function run(sql, params = []) {
  db.run(sql, params);
  saveDb();
}

function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return undefined;
}

function all(sql, params = []) {
  const results = [];
  const stmt = db.prepare(sql);
  stmt.bind(params);
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// ─── IDENTITY ─────────────────────────────────────────────────────────────────
// Each name is protected by a 4-digit PIN; each signed-in device holds a random
// session token. Only hashes of PINs and tokens are stored.

const PIN_RE = /^\d{4}$/;
const DEFAULT_PIN = '1234'; // pre-PIN participants and host resets get this
const SESSION_MAX_AGE = '-24 hours'; // SQLite datetime modifier: sign-ins last a day
const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCKOUT_MS = 5 * 60 * 1000;
const pinFailures = new Map(); // participant_id -> { count, lockedUntil }

function hashPin(pin) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(pin, salt, 32).toString('hex')}`;
}

function verifyPin(pin, stored) {
  const [salt, hash] = stored.split(':');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), crypto.scryptSync(pin, salt, 32));
}

const isPinLocked = id => (pinFailures.get(id)?.lockedUntil || 0) > Date.now();

function recordPinFailure(id) {
  const count = (pinFailures.get(id)?.count || 0) + 1;
  pinFailures.set(id, count >= MAX_PIN_ATTEMPTS
    ? { count: 0, lockedUntil: Date.now() + PIN_LOCKOUT_MS }
    : { count, lockedUntil: 0 });
}

const PIN_LOCKED_ERROR = { error: 'Too many wrong PINs — try again in a few minutes' };

const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');

function issueToken(participant_id) {
  run(`DELETE FROM sessions WHERE created_at <= datetime('now', ?)`, [SESSION_MAX_AGE]);
  const token = crypto.randomBytes(32).toString('hex');
  run('INSERT INTO sessions (token_hash, participant_id) VALUES (?, ?)', [sha256(token), participant_id]);
  return token;
}

function requireParticipant(req, res, next) {
  const m = /^Bearer ([0-9a-f]+)$/.exec(req.get('Authorization') || '');
  const tokenHash = m && sha256(m[1]);
  const participant = tokenHash && get(`
    SELECT p.id, p.name FROM sessions s JOIN participants p ON p.id = s.participant_id
    WHERE s.token_hash = ? AND s.created_at > datetime('now', ?)
  `, [tokenHash, SESSION_MAX_AGE]);
  if (!participant) return res.status(401).json({ error: 'Not signed in' });
  req.participant = participant;
  req.tokenHash = tokenHash;
  next();
}

const SCORES_TABLE = `
  CREATE TABLE IF NOT EXISTS scores (
    id TEXT PRIMARY KEY,
    participant_id TEXT NOT NULL,
    year INTEGER NOT NULL,
    round TEXT NOT NULL,
    act_id TEXT NOT NULL,
    song_score INTEGER,
    vocal_score INTEGER,
    staging_score INTEGER,
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (participant_id) REFERENCES participants(id),
    UNIQUE(participant_id, year, round, act_id)
  )
`;

const ROUND_LOCKS_TABLE = `
  CREATE TABLE IF NOT EXISTS round_locks (
    year INTEGER NOT NULL,
    round TEXT NOT NULL,
    locked INTEGER DEFAULT 0,
    locked_at TEXT,
    PRIMARY KEY (year, round)
  )
`;

// Migration: before multi-year support everything was 2026 and these tables had no
// year column. SQLite can't change a UNIQUE / PRIMARY KEY in place, so rebuild the table.
function addYearColumn(table, createSql, columns) {
  const cols = all(`PRAGMA table_info(${table})`).map(c => c.name);
  if (cols.length === 0 || cols.includes('year')) return;
  db.exec(`
    BEGIN;
    ALTER TABLE ${table} RENAME TO ${table}_pre_years;
    ${createSql};
    INSERT INTO ${table} (year, ${columns}) SELECT 2026, ${columns} FROM ${table}_pre_years;
    DROP TABLE ${table}_pre_years;
    COMMIT;
  `);
  console.log(`Migrated ${table} to per-year (existing rows → 2026)`);
}

function initDb() {
  db.run(`
    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  addYearColumn('scores', SCORES_TABLE, 'id, participant_id, round, act_id, song_score, vocal_score, staging_score, updated_at');
  addYearColumn('round_locks', ROUND_LOCKS_TABLE, 'round, locked, locked_at');
  db.run(SCORES_TABLE);
  db.run(ROUND_LOCKS_TABLE);
  // Migration: participants created before PINs existed have pin_hash NULL
  if (!all('PRAGMA table_info(participants)').some(c => c.name === 'pin_hash')) {
    db.run('ALTER TABLE participants ADD COLUMN pin_hash TEXT');
  }
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      participant_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (participant_id) REFERENCES participants(id)
    )
  `);
  // Every participant has a PIN: anyone from before PINs existed gets the default
  all('SELECT id FROM participants WHERE pin_hash IS NULL').forEach(p => {
    db.run('UPDATE participants SET pin_hash = ? WHERE id = ?', [hashPin(DEFAULT_PIN), p.id]);
  });
  // Names are matched case-insensitively at sign-in, so the DB must not hold "Alex" and "alex"
  try {
    db.run('CREATE UNIQUE INDEX IF NOT EXISTS participants_name_nocase ON participants(name COLLATE NOCASE)');
  } catch (e) {
    console.error('⚠️  Participant names differ only by case — rename one to enforce unique names:', e.message);
  }
  db.run(`DELETE FROM sessions WHERE created_at <= datetime('now', ?)`, [SESSION_MAX_AGE]);
  Object.entries(years).forEach(([year, y]) => {
    Object.keys(y.rounds).forEach(round => {
      db.run('INSERT OR IGNORE INTO round_locks (year, round, locked) VALUES (?, ?, 0)', [Number(year), round]);
    });
  });
  saveDb();
}

// Boot
initSqlJs().then(SQL => {
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  initDb();

  // Flush the debounced save on `docker stop` (SIGTERM) / Ctrl-C, or the last 500ms of writes are lost
  ['SIGTERM', 'SIGINT'].forEach(sig => process.on(sig, () => {
    try {
      saveDbImmediate();
    } catch (e) {
      console.error('Failed to save DB on shutdown:', e);
      process.exit(1);
    }
    process.exit(0);
  }));

  // ─── PARTICIPANTS ───────────────────────────────────────────────────────────

  app.post('/api/participants/join', (req, res) => {
    const { name, pin } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name required' });
    if (typeof pin !== 'string' || !PIN_RE.test(pin)) return res.status(400).json({ error: 'PIN must be 4 digits' });
    const trimmed = name.trim();
    // NOCASE so "alex" can't sidestep Alex's PIN
    let participant = get('SELECT * FROM participants WHERE name = ? COLLATE NOCASE', [trimmed]);

    if (!participant) {
      if (pin === DEFAULT_PIN) return res.status(400).json({ error: `Pick a PIN other than ${DEFAULT_PIN}` });
      const id = uuidv4();
      run('INSERT INTO participants (id, name, pin_hash) VALUES (?, ?, ?)', [id, trimmed, hashPin(pin)]);
      participant = get('SELECT * FROM participants WHERE id = ?', [id]);
    } else {
      if (isPinLocked(participant.id)) return res.status(429).json(PIN_LOCKED_ERROR);
      if (!verifyPin(pin, participant.pin_hash)) {
        recordPinFailure(participant.id);
        return res.status(403).json({ error: `Wrong PIN for "${participant.name}". Not you? Pick another name.` });
      }
      pinFailures.delete(participant.id);
    }

    res.json({
      id: participant.id,
      name: participant.name,
      token: issueToken(participant.id),
      default_pin: pin === DEFAULT_PIN, // client prompts them to change it
    });
  });

  app.post('/api/participants/me/pin', requireParticipant, (req, res) => {
    const { currentPin, newPin } = req.body;
    const { id } = req.participant;
    if (typeof newPin !== 'string' || !PIN_RE.test(newPin)) return res.status(400).json({ error: 'New PIN must be 4 digits' });
    if (newPin === DEFAULT_PIN) return res.status(400).json({ error: `Pick a PIN other than ${DEFAULT_PIN}` });
    if (isPinLocked(id)) return res.status(429).json(PIN_LOCKED_ERROR);

    const { pin_hash } = get('SELECT pin_hash FROM participants WHERE id = ?', [id]);
    if (typeof currentPin !== 'string' || !PIN_RE.test(currentPin) || !verifyPin(currentPin, pin_hash)) {
      recordPinFailure(id);
      return res.status(403).json({ error: 'Current PIN is wrong' });
    }
    pinFailures.delete(id);

    run('UPDATE participants SET pin_hash = ? WHERE id = ?', [hashPin(newPin), id]);
    // Sign out every other device that got in with the old PIN
    run('DELETE FROM sessions WHERE participant_id = ? AND token_hash != ?', [id, req.tokenHash]);
    res.json({ ok: true });
  });

  app.get('/api/session', requireParticipant, (req, res) => {
    const { pin_hash } = get('SELECT pin_hash FROM participants WHERE id = ?', [req.participant.id]);
    res.json({ ...req.participant, default_pin: verifyPin(DEFAULT_PIN, pin_hash) });
  });

  app.post('/api/logout', requireParticipant, (req, res) => {
    run('DELETE FROM sessions WHERE token_hash = ?', [req.tokenHash]);
    res.json({ ok: true });
  });

  app.get('/api/participants', (req, res) => {
    res.json(all('SELECT id, name, created_at FROM participants ORDER BY name'));
  });

  // Host: forgotten PIN — resets it to the default and signs the participant out everywhere
  app.post('/api/participants/:id/reset-pin', (req, res) => {
    if (req.body.password !== HOST_PASSWORD) return res.status(403).json({ error: 'Wrong password' });
    run('UPDATE participants SET pin_hash = ? WHERE id = ?', [hashPin(DEFAULT_PIN), req.params.id]);
    run('DELETE FROM sessions WHERE participant_id = ?', [req.params.id]);
    pinFailures.delete(req.params.id);
    res.json({ ok: true });
  });

  // ─── YEARS & ACTS ───────────────────────────────────────────────────────────
  // Everything per-contest lives under /api/years/:year/rounds/:round/...

  app.param('year', (req, res, next, value) => {
    if (!years[value]) return res.status(404).json({ error: 'Year not found' });
    req.year = Number(value);
    req.yearData = years[value];
    next();
  });

  // Runs after 'year' (params resolve left to right), so yearData is set
  app.param('round', (req, res, next, value) => {
    const round = req.yearData && req.yearData.rounds[value];
    if (!round) return res.status(404).json({ error: 'Round not found' });
    req.round = value;
    req.roundData = round;
    next();
  });

  // Newest first — the client defaults to the first entry
  app.get('/api/years', (req, res) => {
    res.json(Object.entries(years)
      .map(([year, y]) => ({
        year: Number(year),
        city: y.city,
        archived: y.archived,
        rounds: Object.entries(y.rounds).map(([id, r]) => ({
          id, label: ROUND_LABELS[id], date: r.date, actCount: r.acts.length,
        })),
      }))
      .sort((a, b) => b.year - a.year));
  });

  app.get('/api/years/:year/rounds/:round/acts', (req, res) => {
    res.json(req.roundData.acts);
  });

  // ─── SCORES ─────────────────────────────────────────────────────────────────

  app.post('/api/years/:year/rounds/:round/scores', requireParticipant, (req, res) => {
    const { year, round } = req;
    const { act_id, song_score, vocal_score, staging_score } = req.body;
    const participant_id = req.participant.id; // from the session, never the request body

    if (req.yearData.archived) return res.status(403).json({ error: `Eurovision ${year} has ended — scores are read-only` });
    if (!req.roundData.acts.some(a => a.id === act_id)) return res.status(400).json({ error: 'Unknown act' });

    const validate = v => v === null || v === undefined || (Number.isInteger(v) && v >= 1 && v <= 10);
    if (!validate(song_score) || !validate(vocal_score) || !validate(staging_score)) {
      return res.status(400).json({ error: 'Scores must be 1-10' });
    }

    const lock = get('SELECT locked FROM round_locks WHERE year = ? AND round = ?', [year, round]);
    if (lock && lock.locked === 1) return res.status(403).json({ error: 'Round is locked' });

    const existing = get('SELECT id FROM scores WHERE participant_id = ? AND year = ? AND round = ? AND act_id = ?',
      [participant_id, year, round, act_id]);

    if (existing) {
      run(`UPDATE scores SET song_score=?, vocal_score=?, staging_score=?, updated_at=datetime('now')
           WHERE id=?`,
        [song_score ?? null, vocal_score ?? null, staging_score ?? null, existing.id]);
    } else {
      const id = uuidv4();
      run(`INSERT INTO scores (id, participant_id, year, round, act_id, song_score, vocal_score, staging_score)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, participant_id, year, round, act_id, song_score ?? null, vocal_score ?? null, staging_score ?? null]);
    }
    res.json({ ok: true });
  });

  // All years; rows carry `year` and `round`
  app.get('/api/scores/participant/:participant_id', (req, res) => {
    const rows = all(`
      SELECT s.*, p.name as participant_name FROM scores s
      JOIN participants p ON p.id = s.participant_id
      WHERE s.participant_id = ?
    `, [req.params.participant_id]);
    res.json(rows);
  });

  app.get('/api/years/:year/rounds/:round/scores', (req, res) => {
    res.json(all(`
      SELECT s.*, p.name as participant_name FROM scores s
      JOIN participants p ON p.id = s.participant_id WHERE s.year = ? AND s.round = ?
    `, [req.year, req.round]));
  });

  app.get('/api/years/:year/rounds/:round/leaderboard', (req, res) => {
    const rows = all(`
      SELECT act_id,
        COUNT(*) as voter_count,
        ROUND(AVG(CAST(song_score AS REAL)), 2) as avg_song,
        ROUND(AVG(CAST(vocal_score AS REAL)), 2) as avg_vocal,
        ROUND(AVG(CAST(staging_score AS REAL)), 2) as avg_staging,
        ROUND(AVG(CAST(song_score AS REAL) + CAST(vocal_score AS REAL) + CAST(staging_score AS REAL)), 2) as avg_total
      FROM scores
      WHERE year = ? AND round = ? AND song_score IS NOT NULL AND vocal_score IS NOT NULL AND staging_score IS NOT NULL
      GROUP BY act_id ORDER BY avg_total DESC
    `, [req.year, req.round]);

    const actMap = {};
    req.roundData.acts.forEach(a => { actMap[a.id] = a; });
    res.json(rows.map(r => ({ ...r, act: actMap[r.act_id] || null })));
  });

  // ─── AUTH ───────────────────────────────────────────────────────────────────

  app.post('/api/auth', (req, res) => {
    const { password } = req.body;
    if (password === HOST_PASSWORD) {
      res.json({ ok: true });
    } else {
      res.status(403).json({ error: 'Wrong password' });
    }
  });

  // ─── LOCKS ──────────────────────────────────────────────────────────────────

  app.get('/api/locks', (req, res) => {
    res.json(all('SELECT * FROM round_locks'));
  });

  app.post('/api/years/:year/rounds/:round/lock', (req, res) => {
    const { year, round } = req;
    const { locked, password } = req.body;
    if (password !== HOST_PASSWORD) return res.status(403).json({ error: 'Wrong password' });
    if (req.yearData.archived) return res.status(403).json({ error: `Eurovision ${year} has ended` });
    run(`UPDATE round_locks SET locked = ?, locked_at = datetime('now') WHERE year = ? AND round = ?`,
      [locked ? 1 : 0, year, round]);
    res.json({ ok: true, year, round, locked });
  });

  // ─── DELTA ──────────────────────────────────────────────────────────────────

  app.get('/api/years/:year/delta/:participant_id', (req, res) => {
    const { participant_id } = req.params;
    const { year } = req;
    const finalActs = (req.yearData.rounds.final?.acts || []).filter(a => a.semifinalActId);
    const results = finalActs.map(fa => {
      const sfScore = get('SELECT * FROM scores WHERE participant_id = ? AND year = ? AND round = ? AND act_id = ?',
        [participant_id, year, fa.semifinal, fa.semifinalActId]);
      const finalScore = get("SELECT * FROM scores WHERE participant_id = ? AND year = ? AND round = 'final' AND act_id = ?",
        [participant_id, year, fa.id]);
      return { act: fa, sfScore: sfScore || null, finalScore: finalScore || null };
    });
    res.json(results);
  });

  // Fallback
  app.get('*', (req, res) => {
    const indexPath = path.join(clientBuild, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Frontend not built. Run: cd client && npm run build');
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎵 Eurovision Scorer running on port ${PORT}`);
    if (!process.env.HOST_PASSWORD) {
      console.log('⚠️  HOST_PASSWORD not set — using the default password');
    }
  });
});
