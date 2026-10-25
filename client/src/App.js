import React, { useState, useEffect } from 'react';
import JoinScreen from './screens/JoinScreen';
import HomeScreen from './screens/HomeScreen';
import ScoringScreen from './screens/ScoringScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import DeltaScreen from './screens/DeltaScreen';
import HostScreen from './screens/HostScreen';
import { setAuthToken, getSession, logout } from './api';
import './App.css';

const STORAGE_KEY = 'esc2026_participant';

// The bundle this page is running; null under the dev server
const MAIN_SCRIPT = document.querySelector('script[src*="/static/js/main"]')?.getAttribute('src') || null;

function readStored() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
}

export default function App() {
  const [participant, setParticipant] = useState(null);
  const [screen, setScreen] = useState('join'); // join | home | scoring | leaderboard | delta | host
  const [scoringRound, setScoringRound] = useState(null);
  const [leaderboardRound, setLeaderboardRound] = useState(null);
  const [rejoinName, setRejoinName] = useState('');
  // Contest year; null until Home loads the years and picks the newest. Not persisted,
  // so every launch opens on the newest year.
  const [year, setYear] = useState(null);

  useEffect(() => {
    const signedOut = (name) => {
      localStorage.removeItem(STORAGE_KEY);
      setAuthToken(null);
      setParticipant(null);
      setRejoinName(name || '');
      setScreen('join');
    };

    // The server is the source of truth: picks up a host PIN reset / 24h expiry (401)
    // and whether this participant is still on the default PIN
    const syncSession = () => {
      const p = readStored();
      if (!p || !p.token) return;
      getSession()
        .then(s => {
          if (s.default_pin === Boolean(p.default_pin)) return;
          const next = { ...p, default_pin: s.default_pin };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          setParticipant(next);
        })
        .catch(e => { if (e.status === 401) signedOut(p.name); });
    };

    // A tab left open across a deploy keeps running the old bundle (phones don't
    // reload on resume), so reload when a different bundle is live
    const checkForUpdate = () => {
      if (!MAIN_SCRIPT) return;
      fetch('/', { cache: 'no-store' })
        .then(r => r.text())
        .then(html => { if (!html.includes(MAIN_SCRIPT)) window.location.reload(); })
        .catch(() => {});
    };

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      checkForUpdate();
      syncSession();
    };

    const p = readStored();
    if (p && !p.token) {
      // Saved before PINs existed: sign in again (name prefilled)
      localStorage.removeItem(STORAGE_KEY);
      setRejoinName(p.name || '');
    } else if (p) {
      setAuthToken(p.token);
      setParticipant(p);
      setScreen('home');
      syncSession();
    }

    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const handleJoin = (p) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    setAuthToken(p.token);
    setParticipant(p);
    setScreen('home');
  };

  const handleLogout = () => {
    logout().catch(() => {});
    localStorage.removeItem(STORAGE_KEY);
    setAuthToken(null);
    setParticipant(null);
    setRejoinName('');
    setScreen('join');
  };

  const handlePinChanged = () => {
    const p = { ...participant, default_pin: false };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    setParticipant(p);
  };

  const goScore = (round) => { setScoringRound(round); setScreen('scoring'); };
  const goLeaderboard = (round) => { setLeaderboardRound(round); setScreen('leaderboard'); };
  const goHome = () => setScreen('home');
  const goDelta = () => setScreen('delta');
  const goHost = () => setScreen('host');

  if (screen === 'join') return <JoinScreen key={rejoinName} initialName={rejoinName} onJoin={handleJoin} />;
  if (screen === 'home') return <HomeScreen participant={participant} year={year} onYearChange={setYear} onScore={goScore} onLeaderboard={goLeaderboard} onDelta={goDelta} onHost={goHost} onLogout={handleLogout} onPinChanged={handlePinChanged} />;
  if (screen === 'scoring') return <ScoringScreen participant={participant} year={year} round={scoringRound} onBack={goHome} />;
  if (screen === 'leaderboard') return <LeaderboardScreen year={year} round={leaderboardRound} participant={participant} onBack={goHome} />;
  if (screen === 'delta') return <DeltaScreen participant={participant} year={year} onBack={goHome} />;
  if (screen === 'host') return <HostScreen year={year} onBack={goHome} />;
  return null;
}
