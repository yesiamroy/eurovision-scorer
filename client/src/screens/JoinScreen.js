import React, { useState } from 'react';
import { joinParticipant } from '../api';
import InviteQR from '../components/InviteQR';
import './JoinScreen.css';

export default function JoinScreen({ initialName = '', onJoin }) {
  const [name, setName] = useState(initialName);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = name.trim() && /^\d{4}$/.test(pin);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    try {
      const p = await joinParticipant(trimmed, pin);
      onJoin(p);
    } catch (e) {
      setError(e.message);
      setPin('');
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter') handleSubmit(); };

  return (
    <div className="join-screen">
      <div className="join-bg">
        <div className="join-star s1" />
        <div className="join-star s2" />
        <div className="join-star s3" />
        <div className="join-star s4" />
        <div className="join-star s5" />
      </div>
      <div className="join-content">
        <div className="join-logo">
          <div className="join-heart">♥</div>
          <div className="join-title condensed">EUROVISION</div>
          <div className="join-city condensed">SCORER</div>
        </div>
        <div className="join-card">
          <p className="join-prompt">Enter your name to join the watch party</p>
          <input
            className="join-input"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={handleKey}
            maxLength={30}
            autoFocus={!initialName}
          />
          <input
            className="join-input join-pin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            placeholder="4-digit PIN"
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            onKeyDown={handleKey}
            autoFocus={!!initialName}
          />
          <p className="join-pin-hint">New here? Pick any 4 digits. Back again? Use the same PIN.</p>
          {error && <p className="join-error">{error}</p>}
          <button
            className="join-btn"
            onClick={handleSubmit}
            disabled={loading || !canSubmit}
          >
            {loading ? 'Joining...' : 'Join Party →'}
          </button>
        </div>
        <p className="join-note">Your PIN keeps your scores yours — forgot it? Ask the host to reset it</p>
        <InviteQR className="invite-card-join" />
      </div>
    </div>
  );
}
