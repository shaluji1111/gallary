'use client';
import { useState, useEffect, useCallback } from 'react';
import Gallery from '@/components/Gallery';

const CORRECT_PASSWORD = process.env.NEXT_PUBLIC_GALLERY_PASSWORD || 'shalu';
const STORAGE_KEY = 'gallery_auth';

export default function HomePage() {
  const [authed, setAuthed] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'true') setAuthed(true);
    }
    setChecking(false);
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (input.toLowerCase().trim() === CORRECT_PASSWORD.toLowerCase().trim()) {
      localStorage.setItem(STORAGE_KEY, 'true');
      setAuthed(true);
      setError('');
    } else {
      setError('Incorrect password. Please try again.');
      setInput('');
    }
  }, [input]);

  const handleLockOut = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAuthed(false);
  }, []);

  if (checking) return null;

  if (!authed) {
    return (
      <main className="lock-screen">
        <div className="lock-card">
          <div className="lock-ornament">💍</div>
          <h1 className="lock-title">Sourav &amp; Family</h1>
          <p className="lock-subtitle">A Wedding to Remember</p>
          <div className="lock-divider" />
          <form onSubmit={handleSubmit}>
            <label className="lock-label" htmlFor="password">Gallery Password</label>
            <input
              id="password"
              className="lock-input"
              type="password"
              placeholder="Enter password"
              value={input}
              onChange={e => setInput(e.target.value)}
              autoFocus
              autoComplete="off"
            />
            <button className="lock-btn" type="submit">
              View Gallery →
            </button>
            {error && <p className="lock-error">{error}</p>}
          </form>
          <p className="lock-hint">Access restricted to family &amp; friends</p>
        </div>
      </main>
    );
  }

  return <Gallery onLockOut={handleLockOut} />;
}
