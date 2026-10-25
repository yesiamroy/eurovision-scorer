import React from 'react';
import './ScoreRow.css';

const ROUND_SHORT = { sf1: 'SF1', sf2: 'SF2' };

function ScorePicker({ value, onChange, label }) {
  return (
    <div className="score-picker">
      <div className="score-picker-label">{label}</div>
      <div className="score-picker-buttons">
        {[1,2,3,4,5,6,7,8,9,10].map(n => (
          <button
            key={n}
            className={`score-btn ${value === n ? 'score-btn-active' : ''} ${
              value && n <= value ? 'score-btn-filled' : ''
            }`}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ScoreRow({ act, score, prevScore, saving, expanded, onToggle, onScore }) {
  const total = (score.song && score.vocal && score.staging)
    ? score.song + score.vocal + score.staging
    : null;

  const prevTotal = prevScore && prevScore.song && prevScore.vocal && prevScore.staging
    ? prevScore.song + prevScore.vocal + prevScore.staging
    : null;

  const isComplete = score.song && score.vocal && score.staging;

  return (
    <div className={`score-row ${expanded ? 'score-row-expanded' : ''} ${isComplete ? 'score-row-done' : ''}`}>
      <div className="score-row-header" onClick={onToggle}>
        <div className="score-row-position condensed">{act.position}</div>
        <div className="score-row-flag">{act.flag}</div>
        <div className="score-row-info">
          <div className="score-row-country condensed">{act.country}</div>
          <div className="score-row-artist">{act.artist}</div>
          <div className="score-row-song">"{act.song}"</div>
        </div>
        <div className="score-row-right">
          {saving && <div className="score-saving-dot" />}
          {total !== null ? (
            <div className="score-total condensed">{total}</div>
          ) : (
            <div className="score-empty condensed">—</div>
          )}
          <div className={`score-chevron ${expanded ? 'score-chevron-open' : ''}`}>›</div>
        </div>
      </div>

      {expanded && (
        <div className="score-row-body">
          {prevScore && (
            <div className="score-prev-banner">
              <span className="score-prev-label">{ROUND_SHORT[prevScore.round]} scores:</span>
              <span className="score-prev-values">
                Song {prevScore.song} · Vocal {prevScore.vocal} · Staging {prevScore.staging}
                {prevTotal && <span className="score-prev-total"> = {prevTotal}</span>}
              </span>
            </div>
          )}

          <ScorePicker label="SONG" value={score.song} onChange={v => onScore(act.id, 'song', v)} />
          <ScorePicker label="VOCAL" value={score.vocal} onChange={v => onScore(act.id, 'vocal', v)} />
          <ScorePicker label="STAGING" value={score.staging} onChange={v => onScore(act.id, 'staging', v)} />

          {isComplete && (
            <div className="score-row-summary">
              <span className="score-summary-label">Total</span>
              <span className="score-summary-total condensed">{total} / 30</span>
              {prevTotal && (
                <span className={`score-delta ${total > prevTotal ? 'delta-up' : total < prevTotal ? 'delta-down' : 'delta-same'}`}>
                  {total > prevTotal ? `▲ +${total - prevTotal}` : total < prevTotal ? `▼ ${total - prevTotal}` : '= same'}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
