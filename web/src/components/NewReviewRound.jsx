import { useState } from 'react';
import { useDeveloperAction } from '../hooks/useDeveloperAction.js';

export default function NewReviewRound({ client, project, onCreated, onSessionExpired }) {
  const [name, setName] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const action = useDeveloperAction(onSessionExpired);
  const origins = project.allowedDomains || [];

  return <section className="dev-card dev-environment" aria-labelledby="new-round-title">
    <p className="dev-eyebrow">Új változat</p>
    <h2 id="new-round-title">Új review kör indítása</h2>
    <p className="dev-muted">Minden kör külön ügyféllinket és külön megjegyzéslistát kap. A cél lehet éles előnézet vagy localhost is.</p>
    <form onSubmit={(event) => {
      event.preventDefault();
      action.run((signal) => client.post(`/projects/${project.id}/rounds`, { name, targetUrl }, { signal }), (data) => {
        setName('');
        setTargetUrl('');
        onCreated(data.reviewRound);
      });
    }}>
      <label htmlFor="round-name">Review kör neve</label>
      <input id="round-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={160}
        required disabled={action.busy} placeholder="Például: Mobilnézet javítások" />
      <label htmlFor="round-target-url">Megnyitandó oldal URL-je</label>
      <input id="round-target-url" type="url" value={targetUrl} onChange={(event) => setTargetUrl(event.target.value)}
        maxLength={2048} required disabled={action.busy} placeholder="http://localhost:5173/checkout" />
      {!!origins.length && <div className="dev-origin-choices" aria-label="Engedélyezett originek">
        <span className="dev-small dev-muted">Gyors kitöltés:</span>
        {origins.map((item) => <button key={item} type="button" disabled={action.busy}
          onClick={() => setTargetUrl(item + '/')}>{item}</button>)}
      </div>}
      {action.error && <p role="alert" className="dev-error">{action.error}</p>}
      <button className="dev-primary" type="submit" disabled={action.busy || !name.trim() || !targetUrl.trim()}>
        {action.busy ? 'Létrehozás…' : 'Review kör létrehozása'}
      </button>
    </form>
  </section>;
}
