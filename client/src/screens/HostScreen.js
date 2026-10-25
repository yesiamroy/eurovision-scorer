import React, { useState, useEffect } from 'react';
import { getLocks, setLock, getParticipants, authHost, resetPin, getYears } from '../api';
import './HostScreen.css';

const ROUNDS = [
  { id: 'sf1', label: 'Semi-Final 1', emoji: '🎤' },
  { id: 'sf2', label: 'Semi-Final 2', emoji: '🎵' },
  { id: 'final', label: 'Grand Final', emoji: '🏆' },
];

export default function HostScreen({ year, onBack }) {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [locks, setLocks] = useState({});
  const [participants, setParticipants] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState('');
  const [confirmReset, setConfirmReset] = useState(null);
  const [resetDone, setResetDone] = useState(null);
  const [archived, setArchived] = useState(false);

  useEffect(() => {
    if (authed) {
      getLocks().then(rows => {
        const m = {};
        rows.filter(r => r.year === year).forEach(r => { m[r.round] = r.locked; });
        setLocks(m);
      });
      getYears().then(ys => setArchived(!!ys.find(y => y.year === year)?.archived));
      getParticipants().then(setParticipants);
    }
  }, [authed, year]);

  const handleAuth = () => {
    authHost(password)
      .then(() => { setAuthed(true); setError(''); })
      .catch(() => setError('Wrong password'));
  };

  const handleToggleLock = async (round) => {
    const newLocked = !locks[round];
    setSaving(round);
    try {
      await setLock(year, round, newLocked, password);
      setLocks(prev => ({ ...prev, [round]: newLocked }));
    } catch (e) {
      setError('Failed: ' + e.message);
    } finally {
      setSaving('');
    }
  };

  // An armed "Confirm?" disarms itself so a stray tap later can't reset
  useEffect(() => {
    if (!confirmReset) return;
    const t = setTimeout(() => setConfirmReset(null), 4000);
    return () => clearTimeout(t);
  }, [confirmReset]);

  // First tap arms the button, second tap resets
  const handleResetPin = async (p) => {
    if (confirmReset !== p.id) { setConfirmReset(p.id); return; }
    setConfirmReset(null);
    setSaving(p.id);
    try {
      await resetPin(p.id, password);
      setError('');
      setResetDone(p.id);
    } catch (e) {
      setError('Failed: ' + e.message);
    } finally {
      setSaving('');
    }
  };

  return (
    <div className="host-screen">
      <div className="host-header">
        <button className="host-back" onClick={onBack}>←</button>
        <div className="host-title condensed">HOST CONTROLS</div>
        <div style={{width:40}} />
      </div>

      {!authed ? (
        <div className="host-auth">
          <div className="host-auth-icon">🎛️</div>
          <p className="host-auth-label">Enter host password</p>
          <input
            className="host-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAuth()}
          />
          {error && <p className="host-error">{error}</p>}
          <button className="host-btn" onClick={handleAuth}>Unlock →</button>
        </div>
      ) : (
        <div className="host-content">
          <div className="host-section-label condensed">{year} ROUND LOCKS</div>
          <div className="host-locks">
            {ROUNDS.map(r => (
              <div key={r.id} className="host-lock-row">
                <div className="host-lock-info">
                  <span className="host-lock-emoji">{r.emoji}</span>
                  <div>
                    <div className="host-lock-name condensed">{r.label}</div>
                    <div className="host-lock-status">
                      {archived
                        ? '🏁 Ended — scores are read-only'
                        : locks[r.id] ? '🔒 Locked — scoring disabled' : '🔓 Open — scoring active'}
                    </div>
                  </div>
                </div>
                {!archived && (
                  <button
                    className={`host-lock-btn ${locks[r.id] ? 'host-lock-btn-unlock' : 'host-lock-btn-lock'}`}
                    onClick={() => handleToggleLock(r.id)}
                    disabled={saving === r.id}
                  >
                    {saving === r.id ? '...' : locks[r.id] ? 'Unlock' : 'Lock'}
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="host-section-label condensed">PARTICIPANTS ({participants.length})</div>
          <div className="host-locks">
            {participants.map(p => (
              <div key={p.id} className="host-lock-row">
                <div>
                  <div className="host-lock-name condensed">{p.name}</div>
                  {resetDone === p.id && <div className="host-lock-status">✅ PIN reset to 1234</div>}
                </div>
                <button
                  className="host-lock-btn host-lock-btn-lock"
                  onClick={() => handleResetPin(p)}
                  disabled={saving === p.id}
                >
                  {saving === p.id ? '...' : confirmReset === p.id ? 'Confirm?' : 'Reset PIN'}
                </button>
              </div>
            ))}
          </div>
          {participants.length === 0 && <div className="host-no-participants">No one has joined yet</div>}
          <p className="host-hint host-reset-hint">
            Reset PIN sets it back to 1234 and signs that person out everywhere.
          </p>

          {error && <p className="host-error-inline">{error}</p>}
        </div>
      )}
    </div>
  );
}
