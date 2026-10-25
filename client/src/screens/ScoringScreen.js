import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getActs, getMyScores, saveScore } from '../api';
import ScoreRow from '../components/ScoreRow';
import './ScoringScreen.css';

const ROUND_LABELS = { sf1: 'Semi-Final 1', sf2: 'Semi-Final 2', final: 'Grand Final' };

export default function ScoringScreen({ participant, year, round, onBack }) {
  const [acts, setActs] = useState([]);
  const [scores, setScores] = useState({});
  const [prevScores, setPrevScores] = useState({});
  const [saving, setSaving] = useState({});
  const [expandedAct, setExpandedAct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState('');
  const scoresRef = useRef({});

  useEffect(() => {
    Promise.all([getActs(year, round), getMyScores(participant.id)])
      .then(([actsData, allMyScores]) => {
        setActs(actsData);

        const myScoreData = allMyScores.filter(s => s.year === year);
        const scoreMap = {};
        myScoreData
          .filter(s => s.round === round)
          .forEach(s => {
            scoreMap[s.act_id] = {
              song: s.song_score,
              vocal: s.vocal_score,
              staging: s.staging_score,
            };
          });
        scoresRef.current = scoreMap;
        setScores(scoreMap);

        if (round === 'final') {
          const prevMap = {};
          actsData.forEach(act => {
            if (act.semifinalActId) {
              const prev = myScoreData.find(s => s.round === act.semifinal && s.act_id === act.semifinalActId);
              if (prev) {
                prevMap[act.id] = {
                  song: prev.song_score,
                  vocal: prev.vocal_score,
                  staging: prev.staging_score,
                  round: act.semifinal,
                };
              }
            }
          });
          setPrevScores(prevMap);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [year, round, participant.id]);

  // Reads latest scores from a ref to avoid stale closures on rapid taps,
  // and keeps the save side effect out of the setState updater (StrictMode runs updaters twice)
  const handleScore = useCallback((actId, field, value) => {
    const updated = { ...(scoresRef.current[actId] || {}), [field]: value };
    scoresRef.current = { ...scoresRef.current, [actId]: updated };
    setScores(scoresRef.current);

    if (updated.song && updated.vocal && updated.staging) {
      setSaving(s => ({ ...s, [actId]: true }));
      saveScore(year, round, {
        act_id: actId,
        song_score: updated.song,
        vocal_score: updated.vocal,
        staging_score: updated.staging,
      })
        .then(() => setSaveError(''))
        .catch(e => setSaveError(
          e.status === 401
            ? 'You\'ve been signed out — go back, sign in again, then rescore'
            : e.message === 'Round is locked'
              ? 'This round is locked — new scores are not being saved'
              : `Couldn't save your score: ${e.message}`
        ))
        .finally(() => setSaving(s => ({ ...s, [actId]: false })));
    }
  }, [year, round]);

  const completedCount = Object.values(scores).filter(s => s && s.song && s.vocal && s.staging).length;
  const totalActs = acts.length || 1; // prevent division by zero

  if (loading) return (
    <div className="scoring-loading">
      <div className="scoring-spinner" />
    </div>
  );

  return (
    <div className="scoring-screen">
      <div className="scoring-header">
        <button className="scoring-back" onClick={onBack}>←</button>
        <div className="scoring-header-center">
          <div className="scoring-round condensed">{year} {ROUND_LABELS[round]}</div>
          <div className="scoring-progress-text">{completedCount}/{acts.length} scored</div>
        </div>
        <div className="scoring-pct condensed">{Math.round((completedCount / totalActs) * 100)}%</div>
      </div>

      <div className="scoring-progress-bar">
        <div className="scoring-progress-fill" style={{ width: `${(completedCount / totalActs) * 100}%` }} />
      </div>

      {saveError && <div className="scoring-save-error">{saveError}</div>}

      <div className="scoring-list">
        {acts.map(act => (
          <ScoreRow
            key={act.id}
            act={act}
            score={scores[act.id] || {}}
            prevScore={prevScores[act.id] || null}
            saving={saving[act.id] || false}
            expanded={expandedAct === act.id}
            onToggle={() => setExpandedAct(expandedAct === act.id ? null : act.id)}
            onScore={handleScore}
          />
        ))}
      </div>
    </div>
  );
}
