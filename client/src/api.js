const BASE = process.env.REACT_APP_API_URL || '';

let authToken = null;
export const setAuthToken = (token) => { authToken = token; };

async function api(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    const e = new Error(err.error || `HTTP ${res.status}`);
    e.status = res.status;
    throw e;
  }
  return res.json();
}

export const joinParticipant = (name, pin) =>
  api('/api/participants/join', { method: 'POST', body: JSON.stringify({ name, pin }) });

export const getSession = () => api('/api/session');

export const logout = () => api('/api/logout', { method: 'POST' });

export const changePin = (currentPin, newPin) =>
  api('/api/participants/me/pin', { method: 'POST', body: JSON.stringify({ currentPin, newPin }) });

export const resetPin = (participant_id, password) =>
  api(`/api/participants/${participant_id}/reset-pin`, { method: 'POST', body: JSON.stringify({ password }) });

// Newest year first: [{ year, city, archived, rounds: [{ id, label, date, actCount }] }]
export const getYears = () => api('/api/years');

const roundPath = (year, round) => `/api/years/${year}/rounds/${round}`;

export const getActs = (year, round) => api(`${roundPath(year, round)}/acts`);

export const saveScore = (year, round, data) =>
  api(`${roundPath(year, round)}/scores`, { method: 'POST', body: JSON.stringify(data) });

// All years; rows carry `year` and `round`
export const getMyScores = (participant_id) =>
  api(`/api/scores/participant/${participant_id}`);

export const getLeaderboard = (year, round) => api(`${roundPath(year, round)}/leaderboard`);

export const getRoundScores = (year, round) => api(`${roundPath(year, round)}/scores`);

// All years; rows are { year, round, locked }
export const getLocks = () => api('/api/locks');

export const setLock = (year, round, locked, password) =>
  api(`${roundPath(year, round)}/lock`, { method: 'POST', body: JSON.stringify({ locked, password }) });

export const getDelta = (year, participant_id) => api(`/api/years/${year}/delta/${participant_id}`);

export const getParticipants = () => api('/api/participants');

export const authHost = (password) =>
  api('/api/auth', { method: 'POST', body: JSON.stringify({ password }) });
