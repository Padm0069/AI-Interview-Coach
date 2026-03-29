import { useState, useCallback } from 'react';

const STORAGE_KEY = 'interview_history';

// ── useHistory ─────────────────────────────────────────────────
// Manages interview attempt history in localStorage.
// Each attempt: { id, date, role, difficulty, evaluation, fillerCount, wordCount }
export function useHistory() {
  // Initialise from localStorage on first render
  const [history, setHistory] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Called by useInterview after a successful evaluation
  const saveAttempt = useCallback((attempt) => {
    const entry = { id: Date.now(), date: new Date().toISOString(), ...attempt };
    setHistory(prev => {
      const updated = [entry, ...prev].slice(0, 20); // cap at 20 entries
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); }
      catch { console.warn('localStorage full — history not saved'); }
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  }, []);

  return { history, saveAttempt, clearHistory };
}