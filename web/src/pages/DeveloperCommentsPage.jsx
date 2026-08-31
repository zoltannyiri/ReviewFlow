import { useCallback, useState } from 'react';
import DeveloperLogin from '../components/DeveloperLogin.jsx';
import DeveloperWorkspace from '../components/DeveloperWorkspace.jsx';
import './DeveloperCommentsPage.css';

export default function DeveloperCommentsPage() {
  const [session, setSession] = useState(null);
  const [notice, setNotice] = useState('');
  const logout = useCallback(() => {
    setSession(null);
    setNotice('Kijelentkeztél ebből a böngészőoldalból.');
  }, []);
  const expireSession = useCallback(() => {
    setSession(null);
    setNotice('A munkamenet lejárt. Jelentkezz be újra.');
  }, []);

  return (
    <div className="developer-page">
      <div className="dev-brand"><span aria-hidden="true">RF</span> ReviewFlow</div>
      <main>
        {session
          ? <DeveloperWorkspace session={session} onLogout={logout} onSessionExpired={expireSession} />
          : <DeveloperLogin notice={notice} onLogin={setSession} />}
      </main>
    </div>
  );
}
