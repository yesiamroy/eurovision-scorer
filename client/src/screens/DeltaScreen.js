import React, { useState, useEffect } from 'react';
import { getDelta } from '../api';
import './DeltaScreen.css';

export default function DeltaScreen({ participant, year, onBack }) {
  const [deltas, setDeltas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDelta(year, participant.id).then(d => {
      setDeltas(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [year, participant.id]);

  const scored = deltas.filter(d => d.sfScore && d.finalScore);
  const changed = scored.filter(d => {
    const sfT = d.sfScore.song_score + d.sfScore.vocal_score + d.sfScore.staging_score;
    const fT = d.finalScore.song_score + d.finalScore.vocal_score + d.finalScore.staging_score;
    return sfT !== fT;
  });

  if (loading) return (
    <div className="delta-loading">
      <div className="delta-spinner" />
    </div>
  );

  return (
    <div className="delta-screen">
      <div className="delta-header">
        <button className="delta-back" onClick={onBack}>←</button>
        <div className="delta-title condensed">{year} OPINION TRACKER</div>
        <div style={{width:40}} />
      </div>

      <div className="delta-summary">
        <div className="delta-stat">
          <div className="delta-stat-num condensed">{scored.length}</div>
          <div className="delta-stat-label">acts scored both rounds</div>
        </div>
        <div className="delta-stat">
          <div className="delta-stat-num condensed">{changed.length}</div>
          <div className="delta-stat-label">opinions changed</div>
        </div>
      </div>

      {scored.length === 0 && (
        <div className="delta-empty">
          Score acts in both a semi-final and the Grand Final to see how your opinion changed
        </div>
      )}

      <div className="delta-list">
        {scored.map(({ act, sfScore, finalScore }) => {
          const sfT = sfScore.song_score + sfScore.vocal_score + sfScore.staging_score;
          const fT = finalScore.song_score + finalScore.vocal_score + finalScore.staging_score;
          const diff = fT - sfT;

          return (
            <div key={act.id} className="delta-item">
              <div className="delta-item-header">
                <span className="delta-flag">{act.flag}</span>
                <div className="delta-act-info">
                  <div className="delta-country condensed">{act.country}</div>
                  <div className="delta-song">"{act.song}"</div>
                </div>
                {diff !== 0 && (
                  <div className={`delta-badge ${diff > 0 ? 'delta-up' : 'delta-down'}`}>
                    {diff > 0 ? `▲ +${diff}` : `▼ ${diff}`}
                  </div>
                )}
                {diff === 0 && <div className="delta-badge delta-same">= same</div>}
              </div>

              <div className="delta-scores">
                <div className="delta-score-col">
                  <div className="delta-col-label condensed">{act.semifinal === 'sf1' ? 'SF1' : 'SF2'}</div>
                  <div className="delta-score-row">
                    <span>Song</span><span className="delta-val">{sfScore.song_score}</span>
                    <span>Vocal</span><span className="delta-val">{sfScore.vocal_score}</span>
                    <span>Staging</span><span className="delta-val">{sfScore.staging_score}</span>
                  </div>
                  <div className="delta-total condensed">{sfT}</div>
                </div>
                <div className="delta-arrow">→</div>
                <div className="delta-score-col">
                  <div className="delta-col-label condensed">FINAL</div>
                  <div className="delta-score-row">
                    <span>Song</span>
                    <span className={`delta-val ${finalScore.song_score > sfScore.song_score ? 'up' : finalScore.song_score < sfScore.song_score ? 'down' : ''}`}>{finalScore.song_score}</span>
                    <span>Vocal</span>
                    <span className={`delta-val ${finalScore.vocal_score > sfScore.vocal_score ? 'up' : finalScore.vocal_score < sfScore.vocal_score ? 'down' : ''}`}>{finalScore.vocal_score}</span>
                    <span>Staging</span>
                    <span className={`delta-val ${finalScore.staging_score > sfScore.staging_score ? 'up' : finalScore.staging_score < sfScore.staging_score ? 'down' : ''}`}>{finalScore.staging_score}</span>
                  </div>
                  <div className={`delta-total condensed ${diff > 0 ? 'up' : diff < 0 ? 'down' : ''}`}>{fT}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
