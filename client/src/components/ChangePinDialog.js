import React, { useState } from 'react';
import { changePin } from '../api';
import './ChangePinDialog.css';

const digits = v => v.replace(/\D/g, '').slice(0, 4);

function PinInput({ placeholder, value, onChange, autoFocus }) {
  return (
    <input
      className="pin-dialog-input"
      type="password"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(digits(e.target.value))}
      autoFocus={autoFocus}
    />
  );
}

// Uses the overlay/card styles from HomeScreen.css (home-confirm-*)
export default function ChangePinDialog({ onClose, onChanged }) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [repeatPin, setRepeatPin] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const complete = [currentPin, newPin, repeatPin].every(p => p.length === 4);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!complete) return;
    if (newPin !== repeatPin) { setError('The new PINs don\'t match'); return; }
    setSaving(true);
    setError('');
    try {
      await changePin(currentPin, newPin);
      onChanged();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="home-confirm-overlay" onClick={onClose}>
      <form className="home-confirm" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="home-confirm-title condensed">CHANGE PIN</div>
        <PinInput placeholder="Current PIN" value={currentPin} onChange={setCurrentPin} autoFocus />
        <PinInput placeholder="New PIN" value={newPin} onChange={setNewPin} />
        <PinInput placeholder="New PIN again" value={repeatPin} onChange={setRepeatPin} />
        <p className="home-confirm-text">Your other devices will be signed out.</p>
        {error && <p className="pin-dialog-error">{error}</p>}
        <div className="home-round-actions">
          <button type="button" className="home-btn-secondary home-confirm-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="home-btn-primary" disabled={!complete || saving}>
            {saving ? 'Saving…' : 'Change PIN'}
          </button>
        </div>
      </form>
    </div>
  );
}
