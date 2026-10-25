import React, { useState, useEffect } from 'react';
import { getMyScores, getLocks, getYears } from '../api';
import InviteQR from '../components/InviteQR';
import ChangePinDialog from '../components/ChangePinDialog';
import './HomeScreen.css';

const ROUND_EMOJI = { sf1: '🎤', sf2: '🎵', final: '🏆' };

const INVITE_HIDDEN_KEY = 'esc2026_invite_hidden';

function readInviteHidden() {
  try { return localStorage.getItem(INVITE_HIDDEN_KEY) === '1'; } catch { return false; }
}

export default function HomeScreen({ participant, year, onYearChange, onScore, onLeaderboard, onDelta, onHost, onLogout, onPinChanged }) {
  const [years, setYears] = useState([]);
  const [myScores, setMyScores] = useState([]);
  const [locks, setLocks] = useState({});
  const [inviteHidden, setInviteHidden] = useState(readInviteHidden);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [changingPin, setChangingPin] = useState(false);
  const [pinChanged, setPinChanged] = useState(false);

  const setInvite = (hidden) => {
    setInviteHidden(hidden);
    try { localStorage.setItem(INVITE_HIDDEN_KEY, hidden ? '1' : '0'); } catch {}
  };

  useEffect(() => {
    getYears().then(ys => {
      setYears(ys);
      if (ys.length) onYearChange(prev => prev ?? ys[0].year); // default to the newest
    }).catch(() => {});
    getMyScores(participant.id).then(setMyScores).catch(() => {});
    getLocks().then(rows => {
      const m = {};
      rows.forEach(r => { m[`${r.year}-${r.round}`] = r.locked; });
      setLocks(m);
    }).catch(() => {});
  }, [participant.id, onYearChange]);

  const current = years.find(y => y.year === year);

  const scoredCount = (round) => myScores.filter(s =>
    s.year === year && s.round === round && s.song_score && s.vocal_score && s.staging_score
  ).length;

  const finalAnnounced = current && current.rounds.some(r => r.id === 'final' && r.actCount > 0);

  return (
    <div className="home-screen">
      <div className="home-header">
        <div className="home-header-left">
          <div className="home-heart">♥</div>
          <div className="home-title condensed">EUROVISION SCORER</div>
        </div>
        <button className="home-logout" onClick={() => setConfirmLogout(true)}>✕</button>
      </div>

      <div className="home-welcome">
        <span className="home-greeting">Hey, </span>
        <span className="home-name condensed">{participant.name}</span>
      </div>

      {participant.default_pin && (
        <button className="home-pin-warning" onClick={() => setChangingPin(true)}>
          ⚠️ You're using the default PIN 1234 — anyone could sign in as you. <strong>Change it</strong>
        </button>
      )}
      {pinChanged && <div className="home-pin-ok">✅ PIN changed</div>}

      {!inviteHidden && <InviteQR onDismiss={() => setInvite(true)} />}

      {years.length > 1 && (
        <div className="home-years" role="tablist">
          {years.map(y => (
            <button
              key={y.year}
              role="tab"
              aria-selected={y.year === year}
              className={`home-year condensed ${y.year === year ? 'home-year-active' : ''}`}
              onClick={() => onYearChange(y.year)}
            >
              {y.year}
            </button>
          ))}
        </div>
      )}

      {current && (
        <>
          <div className="home-section-label condensed">
            {current.year}{current.city ? ` · ${current.city.toUpperCase()}` : ''}
            {current.archived && <span className="home-year-ended"> · ENDED</span>}
          </div>
          <div className="home-rounds">
            {current.rounds.map(r => {
              const announced = r.actCount > 0;
              const count = scoredCount(r.id);
              const ended = current.archived;
              const locked = locks[`${current.year}-${r.id}`] === 1;
              const pct = announced ? Math.round((count / r.actCount) * 100) : 0;
              return (
                <div key={r.id} className="home-round-card">
                  <div className="home-round-header">
                    <div>
                      <div className="home-round-label condensed">{ROUND_EMOJI[r.id]} {r.label}</div>
                      <div className="home-round-date">
                        {announced
                          ? [r.date, `${r.actCount} acts`].filter(Boolean).join(' · ')
                          : 'Line-up not announced yet'}
                      </div>
                    </div>
                    {ended
                      ? <span className="home-locked-badge">ENDED</span>
                      : locked && <span className="home-locked-badge">LOCKED</span>}
                  </div>
                  {announced && (
                    <>
                      <div className="home-progress-bar">
                        <div className="home-progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="home-progress-label">{count}/{r.actCount} scored</div>
                    </>
                  )}
                  <div className="home-round-actions">
                    {!ended && (
                      <button
                        className="home-btn-primary"
                        onClick={() => onScore(r.id)}
                        disabled={!announced || locked}
                      >
                        {!announced ? 'Coming soon' : locked ? '🔒 Locked' : count > 0 ? 'Continue Scoring' : 'Start Scoring'}
                      </button>
                    )}
                    {announced && (
                      <button
                        className={ended ? 'home-btn-primary' : 'home-btn-secondary'}
                        onClick={() => onLeaderboard(r.id)}
                      >
                        Leaderboard
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="home-extras">
        {inviteHidden && (
          <button className="home-extra-btn" onClick={() => setInvite(false)}>
            <span>📱</span>
            <div>
              <div className="home-extra-title condensed">INVITE FRIENDS</div>
              <div className="home-extra-desc">Show the QR code again</div>
            </div>
          </button>
        )}
        {finalAnnounced && (
          <button className="home-extra-btn" onClick={onDelta}>
            <span>📊</span>
            <div>
              <div className="home-extra-title condensed">OPINION TRACKER</div>
              <div className="home-extra-desc">Did your {year} scores change between semi & final?</div>
            </div>
          </button>
        )}
        <button className="home-extra-btn" onClick={() => setChangingPin(true)}>
          <span>🔑</span>
          <div>
            <div className="home-extra-title condensed">CHANGE PIN</div>
            <div className="home-extra-desc">Pick a new 4-digit PIN for {participant.name}</div>
          </div>
        </button>
        <button className="home-extra-btn" onClick={onHost}>
          <span>🎛️</span>
          <div>
            <div className="home-extra-title condensed">HOST CONTROLS</div>
            <div className="home-extra-desc">Lock rounds & manage the party</div>
          </div>
        </button>
      </div>

      {changingPin && (
        <ChangePinDialog
          onClose={() => setChangingPin(false)}
          onChanged={() => { setChangingPin(false); setPinChanged(true); onPinChanged(); }}
        />
      )}

      {confirmLogout && (
        <div className="home-confirm-overlay" onClick={() => setConfirmLogout(false)}>
          <div className="home-confirm" onClick={e => e.stopPropagation()}>
            <div className="home-confirm-title condensed">SIGN OUT?</div>
            <p className="home-confirm-text">You'll need your PIN to get back in as {participant.name}.</p>
            <div className="home-round-actions">
              <button className="home-btn-secondary home-confirm-cancel" onClick={() => setConfirmLogout(false)}>
                Cancel
              </button>
              <button className="home-btn-primary" onClick={onLogout}>Sign Out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
