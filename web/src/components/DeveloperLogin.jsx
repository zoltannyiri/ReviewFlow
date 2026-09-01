import { useState } from 'react';
import api from '../api/api.js';

export default function DeveloperLogin({ onLogin, notice }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');

    try {
      if (mode === 'login') {
        const { data } = await api.post('/auth/login', {
          email: email.trim(),
          password,
        });
        setPassword('');
        onLogin({ accessToken: data.accessToken, user: data.user });
      } else {
        if (!organizationName.trim()) {
          setError('A szervezet vagy ügynökség nevének megadása kötelező.');
          setBusy(false);
          return;
        }
        if (password.length < 8) {
          setError('A jelszónak legalább 8 karakter hosszúnak kell lennie.');
          setBusy(false);
          return;
        }

        const { data } = await api.post('/auth/register', {
          email: email.trim(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          organizationName: organizationName.trim(),
        });
        setPassword('');
        onLogin({ accessToken: data.accessToken, user: data.user });
      }
    } catch (err) {
      if (mode === 'login') {
        setError(
          err.response?.status === 401
            ? 'Hibás e-mail-cím vagy jelszó.'
            : 'A bejelentkezés nem sikerült. Próbáld újra.'
        );
      } else {
        if (err.response?.status === 409) {
          setError('Ezzel az e-mail-címmel már létezik fiók.');
        } else if (err.response?.data?.message) {
          setError(err.response.data.message);
        } else {
          setError('A regisztráció nem sikerült. Próbáld újra.');
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="dev-login dev-card" aria-labelledby="login-title">
      <p className="dev-eyebrow">Fejlesztői felület</p>
      <h1 id="login-title">
        {mode === 'login' ? 'Bejelentkezés' : 'Fejlesztői regisztráció'}
      </h1>
      <p className="dev-muted">
        {mode === 'login'
          ? 'Jelentkezz be a ReviewFlow-fiókoddal a feladatok és visszajelzések kezeléséhez.'
          : 'Hozz létre ingyenes fejlesztői fiókot és indítsd el a weboldal-véleményezést.'}
      </p>

      <div style={{ display: 'flex', gap: '8px', margin: '16px 0', borderBottom: '1px solid #e2e8f0' }}>
        <button
          type="button"
          className={`dev-tab ${mode === 'login' ? 'is-active' : ''}`}
          onClick={() => {
            setMode('login');
            setError('');
          }}
          style={{ padding: '8px 16px', fontSize: '14px' }}
        >
          Bejelentkezés
        </button>
        <button
          type="button"
          className={`dev-tab ${mode === 'register' ? 'is-active' : ''}`}
          onClick={() => {
            setMode('register');
            setError('');
          }}
          style={{ padding: '8px 16px', fontSize: '14px' }}
        >
          Új fiók regisztrálása
        </button>
      </div>

      {notice && <p role="status" className="dev-notice">{notice}</p>}

      <form onSubmit={submit}>
        {mode === 'register' && (
          <>
            <label htmlFor="developer-org">
              Szervezet / Cég neve
              <input
                id="developer-org"
                type="text"
                required
                placeholder="pl. WebStúdió Kft."
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                disabled={busy}
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label htmlFor="developer-firstname">
                Vezetéknév
                <input
                  id="developer-firstname"
                  type="text"
                  placeholder="Kovács"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={busy}
                />
              </label>
              <label htmlFor="developer-lastname">
                Keresztnév
                <input
                  id="developer-lastname"
                  type="text"
                  placeholder="János"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={busy}
                />
              </label>
            </div>
          </>
        )}

        <label htmlFor="developer-email">
          E-mail-cím
          <input
            id="developer-email"
            type="email"
            autoComplete="username"
            required
            placeholder="fejleszto@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={busy}
          />
        </label>

        <label htmlFor="developer-password">
          Jelszó {mode === 'register' && <span className="dev-muted dev-small">(legalább 8 karakter)</span>}
          <input
            id="developer-password"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={mode === 'register' ? 8 : undefined}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={busy}
          />
        </label>

        {error && <p role="alert" className="dev-error">{error}</p>}

        <button className="dev-primary" disabled={busy} type="submit" style={{ marginTop: '8px' }}>
          {busy
            ? mode === 'login'
              ? 'Bejelentkezés…'
              : 'Regisztráció…'
            : mode === 'login'
            ? 'Bejelentkezés'
            : 'Fiók létrehozása és belépés'}
        </button>
      </form>

      <p className="dev-small dev-muted">
        Az ügyfeleidnek továbbra sem kell fiók: ők közvetlenül a megosztott linken keresztül véleményezik az oldalt.
      </p>
    </section>
  );
}
