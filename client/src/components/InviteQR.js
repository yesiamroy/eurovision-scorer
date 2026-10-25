import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import './InviteQR.css';

// Uses the address this page was opened with, so it always matches the server
// (inside Docker the server can't see its own LAN IP, but the browser can)
const INVITE_URL = window.location.origin;
const IS_LOCAL = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);

export default function InviteQR({ className = '', onDismiss }) {
  const [enlarged, setEnlarged] = useState(false);
  const displayUrl = INVITE_URL.replace(/^https?:\/\//, '');

  return (
    <>
      <div className={`invite-card ${className}`}>
        <button className="invite-open" onClick={() => setEnlarged(true)}>
          <div className="invite-qr-small">
            <QRCodeSVG value={INVITE_URL} size={72} marginSize={0} />
          </div>
          <div>
            <div className="invite-title condensed">INVITE FRIENDS</div>
            <div className="invite-url">{displayUrl}</div>
            <div className="invite-hint">
              {IS_LOCAL ? 'Open via the server\'s network address to share' : 'Tap to show full screen'}
            </div>
          </div>
        </button>
        {onDismiss && (
          <button className="invite-dismiss" onClick={onDismiss} aria-label="Hide invite QR code">✕</button>
        )}
      </div>

      {enlarged && (
        <div className="invite-overlay" onClick={() => setEnlarged(false)}>
          <div className="invite-overlay-title condensed">SCAN TO JOIN THE PARTY</div>
          <div className="invite-qr-large">
            <QRCodeSVG value={INVITE_URL} size={512} marginSize={0} />
          </div>
          <div className="invite-overlay-url condensed">{displayUrl}</div>
          <div className="invite-overlay-hint">Tap anywhere to close</div>
        </div>
      )}
    </>
  );
}
