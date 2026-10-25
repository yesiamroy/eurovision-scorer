import React, { useState, useEffect } from 'react';
import { getLeaderboard, getParticipants, getRoundScores } from '../api';
import './LeaderboardScreen.css';

const ROUND_LABELS = { sf1: 'Semi-Final 1', sf2: 'Semi-Final 2', final: 'Grand Final' };

export default function LeaderboardScreen({ year, round, participant, onBack }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [roundScores, setRoundScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('acts');
  const [expandedAct, setExpandedAct] = useState(null);

  useEffect(() => {
    Promise.all([getLeaderboard(year, round), getParticipants(), getRoundScores(year, round)])
      .then(([lb, ps, rs]) => {
        setLeaderboard(lb);
        setParticipants(ps);
        setRoundScores(rs);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [year, round]);

  // Build participant lookup by id
  const participantMap = {};
  participants.forEach(p => { participantMap[p.id] = p; });

  // Get individual scores for a specific act
  const getActBreakdown = (act_id) => {
    return roundScores
      .filter(s => s.act_id === act_id && s.song_score && s.vocal_score && s.staging_score)
      .map(s => ({
        ...s,
        name: participantMap[s.participant_id]?.name || 'Unknown',
        total: s.song_score + s.vocal_score + s.staging_score,
      }))
      .sort((a, b) => b.total - a.total);
  };

  const participantTotals = participants.map(p => {
    const myScores = roundScores.filter(s => s.participant_id === p.id && s.song_score && s.vocal_score && s.staging_score);
    const total = myScores.reduce((sum, s) => sum + (s.song_score || 0) + (s.vocal_score || 0) + (s.staging_score || 0), 0);
    const count = myScores.length;
    return { ...p, total, count, avg: count > 0 ? (total / count).toFixed(1) : '0.0' };
  }).sort((a, b) => b.avg - a.avg);

  const medalFor = (i) => {
    if (i === 0) return '🥇';
    if (i === 1) return '🥈';
    if (i === 2) return '🥉';
    return null;
  };

  if (loading) return (
    <div className="lb-loading">
      <div className="lb-spinner" />
    </div>
  );

  return (
    <div className="lb-screen">
      <div className="lb-header">
        <button className="lb-back" onClick={onBack}>←</button>
        <div className="lb-title condensed">{year} {ROUND_LABELS[round]} LEADERBOARD</div>
        <div style={{width:40}} />
      </div>

      <div className="lb-tabs">
        <button className={`lb-tab ${view === 'acts' ? 'lb-tab-active' : ''}`} onClick={() => setView('acts')}>
          By Act
        </button>
        <button className={`lb-tab ${view === 'people' ? 'lb-tab-active' : ''}`} onClick={() => setView('people')}>
          By Voter
        </button>
      </div>

      {view === 'acts' && (
        <div className="lb-list">
          {leaderboard.length === 0 && (
            <div className="lb-empty">No scores yet for this round</div>
          )}
          {leaderboard.map((item, i) => {
            const isExpanded = expandedAct === item.act_id;
            const breakdown = isExpanded ? getActBreakdown(item.act_id) : [];
            return (
              <div key={item.act_id} className={`lb-act-card ${isExpanded ? 'lb-act-card-expanded' : ''}`}>
                <div className="lb-item lb-item-tappable" onClick={() => setExpandedAct(isExpanded ? null : item.act_id)}>
                  <div className="lb-rank condensed">
                    {medalFor(i) || <span className="lb-rank-num">{i + 1}</span>}
                  </div>
                  <div className="lb-flag">{item.act?.flag}</div>
                  <div className="lb-act-info">
                    <div className="lb-country condensed">{item.act?.country}</div>
                    <div className="lb-act-song">"{item.act?.song}"</div>
                    <div className="lb-subscores">
                      Song {item.avg_song} · Vocal {item.avg_vocal} · Staging {item.avg_staging}
                      <span className="lb-voter-count"> · {item.voter_count} voter{item.voter_count !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="lb-item-right">
                    <div className="lb-act-total condensed">{item.avg_total}</div>
                    <div className={`lb-chevron ${isExpanded ? 'lb-chevron-open' : ''}`}>›</div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="lb-breakdown">
                    {breakdown.map((s, bi) => (
                      <div key={s.participant_id} className={`lb-breakdown-row ${s.participant_id === participant.id ? 'lb-breakdown-me' : ''}`}>
                        <div className="lb-breakdown-rank condensed">{bi + 1}</div>
                        <div className="lb-breakdown-name condensed">
                          {s.name}
                          {s.participant_id === participant.id && <span className="lb-you-badge">YOU</span>}
                        </div>
                        <div className="lb-breakdown-scores">
                          <span className="lb-breakdown-cat">Song</span>
                          <span className="lb-breakdown-val">{s.song_score}</span>
                          <span className="lb-breakdown-cat">Vocal</span>
                          <span className="lb-breakdown-val">{s.vocal_score}</span>
                          <span className="lb-breakdown-cat">Staging</span>
                          <span className="lb-breakdown-val">{s.staging_score}</span>
                        </div>
                        <div className="lb-breakdown-total condensed">{s.total}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {view === 'people' && (
        <div className="lb-list">
          {participantTotals.length === 0 && (
            <div className="lb-empty">No participants yet</div>
          )}
          {participantTotals.map((p, i) => (
            <div key={p.id} className={`lb-item ${p.id === participant.id ? 'lb-item-me' : ''}`}>
              <div className="lb-rank condensed">
                {medalFor(i) || <span className="lb-rank-num">{i + 1}</span>}
              </div>
              <div className="lb-person-info">
                <div className="lb-person-name condensed">
                  {p.name}
                  {p.id === participant.id && <span className="lb-you-badge">YOU</span>}
                </div>
                <div className="lb-person-stats">{p.count} acts scored · avg {p.avg}/30 per act</div>
              </div>
              <div className="lb-act-total condensed">{p.total}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
