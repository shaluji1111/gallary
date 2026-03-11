'use client';
import { useState, useEffect, useCallback } from 'react';
import Gallery from '@/components/Gallery';

const CORRECT_PASSWORD = process.env.NEXT_PUBLIC_GALLERY_PASSWORD || 'shalu';
const ADMIN_PASSWORD = `${CORRECT_PASSWORD}-admin`;
const STORAGE_KEY = 'gallery_auth';
const ADMIN_STORAGE_KEY = 'gallery_admin';

export default function HomePage() {
  const [authed, setAuthed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      const storedAdmin = localStorage.getItem(ADMIN_STORAGE_KEY);
      if (stored === 'true') setAuthed(true);
      if (storedAdmin === 'true') setIsAdmin(true);
    }
    setChecking(false);
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const val = input.toLowerCase().trim();
    if (val === CORRECT_PASSWORD.toLowerCase().trim()) {
      localStorage.setItem(STORAGE_KEY, 'true');
      setAuthed(true);
      setError('');
    } else if (val === ADMIN_PASSWORD.toLowerCase().trim()) {
      localStorage.setItem(STORAGE_KEY, 'true');
      localStorage.setItem(ADMIN_STORAGE_KEY, 'true');
      setAuthed(true);
      setIsAdmin(true);
      setError('');
    } else {
      setError('Incorrect password. Please try again.');
      setInput('');
    }
  }, [input]);

  const handleLockOut = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ADMIN_STORAGE_KEY);
    setAuthed(false);
    setIsAdmin(false);
  }, []);

  if (checking) return null;

  if (!authed) {
    return (
      <main className="lock-screen">
        <div className="lock-card">
          <span className="lock-ornament">💍</span>
          <h1 className="lock-title">Sourav &amp; Family</h1>
          <p className="lock-subtitle">Wedding Gallery</p>
          <div className="lock-divider" />
          
          <form onSubmit={handleSubmit}>
            <div className="lock-input-group">
              <label className="lock-label" htmlFor="password">Access Code</label>
              <input
                id="password"
                className="lock-input"
                type="password"
                placeholder="••••••"
                value={input}
                onChange={e => setInput(e.target.value)}
                autoFocus
                autoComplete="off"
              />
            </div>
            
            <button className="lock-btn" type="submit">
              Unlock Memories
            </button>
            
            {error && <p className="lock-error">{error}</p>}
          </form>
          
          <p className="lock-hint">Private access for friends and family</p>
        </div>
      </main>
    );
  }

  return <Gallery onLockOut={handleLockOut} isAdmin={isAdmin} />;
}
