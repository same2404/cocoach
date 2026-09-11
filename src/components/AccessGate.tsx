import React from 'react';
import { ShieldCheck, Lock, Eye, EyeOff, KeyRound } from 'lucide-react';

const GATE_STORAGE_KEY = 'cocoach_access_granted';

export const APP_PASSWORD = 'Naomi29082017!!';

export const isAccessGranted = () => {
  try {
    return localStorage.getItem(GATE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

export const grantAccess = () => {
  try {
    localStorage.setItem(GATE_STORAGE_KEY, '1');
  } catch {
    /* noop */
  }
};

export const revokeAccess = () => {
  try {
    localStorage.removeItem(GATE_STORAGE_KEY);
  } catch {
    /* noop */
  }
};

export const isPublicLandingRoute = () => {
  try {
    return new URLSearchParams(window.location.search).get('page') === 'landing';
  } catch {
    return false;
  }
};

const AccessGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [granted, setGranted] = React.useState<boolean>(isAccessGranted());
  const [pw, setPw] = React.useState('');
  const [show, setShow] = React.useState(false);
  const [error, setError] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw === APP_PASSWORD) {
      grantAccess();
      setGranted(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  if (granted || isPublicLandingRoute()) {
    return <>{children}</>;
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '20px',
      background: 'radial-gradient(circle at 50% 30%, #1e293b 0%, #0f172a 70%)',
      color: '#e2e8f0',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: 24,
      textAlign: 'center',
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 20,
        background: 'linear-gradient(135deg, #10b981, #14b8a6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 10px 30px rgba(16,185,129,.35)',
      }}>
        <ShieldCheck size={38} color="#0f172a" />
      </div>

      <div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>
          CoCoach
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#94a3b8' }}>
          Geschützter Bereich · Bitte Zugangspasswort eingeben
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%', maxWidth: 360,
          background: '#1e293b', border: '1px solid #334155', borderRadius: 16,
          padding: 24, display: 'flex', flexDirection: 'column', gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
          <KeyRound size={18} color="#10b981" style={{ flexShrink: 0 }} />
          <input
            type={show ? 'text' : 'password'}
            value={pw}
            autoFocus
            onChange={(e) => { setPw(e.target.value); setError(false); }}
            placeholder="Passwort"
            style={{
              flex: 1, background: '#0f172a', color: '#f1f5f9', border: '1px solid #334155',
              borderRadius: 10, padding: '12px 40px 12px 12px', fontSize: 15, outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            aria-label="Passwort anzeigen"
            style={{
              position: 'absolute', right: 10, background: 'none', border: 'none',
              color: '#94a3b8', cursor: 'pointer', display: 'flex',
            }}
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {error && (
          <p style={{ margin: 0, fontSize: 12, color: '#f87171', fontWeight: 700 }}>
            Falsches Passwort. Bitte versuche es erneut.
          </p>
        )}

        <button
          type="submit"
          style={{
            background: 'linear-gradient(135deg, #10b981, #14b8a6)',
            color: '#0f172a', border: 'none', borderRadius: 12, padding: '13px',
            fontSize: 14, fontWeight: 900, textTransform: 'uppercase', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <Lock size={16} /> Zugang freischalten
        </button>
      </form>

      <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>
        Nur für freigeschaltete Trainer und Betreuer.
      </p>
    </div>
  );
};

export default AccessGate;
