import { useState } from 'react';
import api from '../api/api.js';

export default function DeveloperLogin({ onLogin, notice }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email: email.trim(), password });
      setPassword('');
      onLogin({ accessToken: data.accessToken, user: data.user });
    } catch (error) {
      setError(error.response?.status === 401
        ? 'Hibás e-mail-cím vagy jelszó.'
        : 'A bejelentkezés nem sikerült. Próbáld újra.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="dev-login dev-card" aria-labelledby="login-title">
      <p className="dev-eyebrow">Fejlesztői felület</p>
      <h1 id="login-title">Visszajelzésekből kész feladatok.</h1>
      <p className="dev-muted">Jelentkezz be a meglévő ReviewFlow-fiókoddal a kommentek kezeléséhez.</p>
      {notice && <p role="status" className="dev-notice">{notice}</p>}
      <form onSubmit={submit}>
        <label htmlFor="developer-email">E-mail-cím</label>
        <input id="developer-email" type="email" autoComplete="username" required
          value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} />
        <label htmlFor="developer-password">Jelszó</label>
        <input id="developer-password" type="password" autoComplete="current-password" required
          value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} />
        {error && <p role="alert" className="dev-error">{error}</p>}
        <button className="dev-primary" disabled={busy} type="submit">
          {busy ? 'Bejelentkezés…' : 'Bejelentkezés'}
        </button>
      </form>
      <p className="dev-small dev-muted">Az ügyfélnek továbbra sem kell fiók: ő a vendéglinken keresztül véleményez.</p>
    </section>
  );
}
