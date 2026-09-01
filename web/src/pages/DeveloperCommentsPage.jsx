import { useCallback, useState } from 'react';
import DeveloperLogin from '../components/DeveloperLogin.jsx';
import DeveloperWorkspace from '../components/DeveloperWorkspace.jsx';
import './DeveloperCommentsPage.css';

const SESSION_STORAGE_KEY = 'reviewflow_developer_session';

const getInitialSession = () => {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.accessToken && parsed?.user) {
      return parsed;
    }
  } catch {
    // Storage might be restricted
  }
  return null;
};

export default function DeveloperCommentsPage() {
  const [session, setSession] = useState(getInitialSession);
  const [notice, setNotice] = useState('');

  const handleLogin = useCallback((newSession) => {
    setSession(newSession);
    try {
      if (newSession) {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
      } else {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch {
      // Storage might be restricted
    }
  }, []);

  const logout = useCallback(() => {
    handleLogin(null);
    setNotice('Kijelentkeztél ebből a böngészőoldalból.');
  }, [handleLogin]);

  const expireSession = useCallback(() => {
    handleLogin(null);
    setNotice('A munkamenet lejárt. Jelentkezz be újra.');
  }, [handleLogin]);

  return (
    <div className="developer-page">
      <div className="dev-brand"><span aria-hidden="true">RF</span> ReviewFlow</div>
      <main>
        {session ? (
          <DeveloperWorkspace
            session={session}
            onLogout={logout}
            onSessionExpired={expireSession}
          />
        ) : (
          <DeveloperLogin
            notice={notice}
            onLogin={handleLogin}
          />
        )}
      </main>
    </div>
  );
}
