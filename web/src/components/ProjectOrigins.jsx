import { useState } from 'react';
import { useDeveloperAction } from '../hooks/useDeveloperAction.js';

export default function ProjectOrigins({ client, project, onUpdated, onSessionExpired }) {
  const [origin, setOrigin] = useState('');
  const action = useDeveloperAction(onSessionExpired);
  const origins = project.allowedDomains || [];
  const canEdit = ['OWNER', 'ADMIN'].includes(project.role);

  const save = (nextOrigins, onSuccess) => action.run(
    (signal) => client.patch(`/projects/${project.id}/origins`, { origins: nextOrigins }, { signal }),
    (data) => {
      onUpdated(data.project);
      onSuccess?.();
    },
  );

  return <section className="dev-card dev-environment" aria-labelledby="project-origins-title">
    <p className="dev-eyebrow">Projektkörnyezetek</p>
    <h2 id="project-origins-title">Hol fusson a véleményezés?</h2>
    <p className="dev-muted">Egy projekthez több pontos origin tartozhat, például a Vercel-cím és a helyi fejlesztői szerver.</p>
    <ul className="dev-origin-list">
      {origins.map((item) => <li key={item}>
        <code>{item}</code>
        {canEdit && <button type="button" disabled={action.busy || origins.length === 1}
          aria-label={`${item} eltávolítása`} onClick={() => save(origins.filter((candidate) => candidate !== item))}>
          Eltávolítás
        </button>}
      </li>)}
    </ul>
    {!canEdit && <p className="dev-small dev-muted">Új origint a szervezet tulajdonosa vagy adminisztrátora vehet fel.</p>}
    {canEdit && <form className="dev-inline-form" onSubmit={(event) => {
      event.preventDefault();
      if (!origin.trim()) return;
      save([...origins, origin], () => setOrigin(''));
    }}>
      <label htmlFor="project-origin">Új origin vagy weboldal URL</label>
      <input id="project-origin" type="url" value={origin} onChange={(event) => setOrigin(event.target.value)}
        maxLength={2048} required disabled={action.busy} placeholder="http://localhost:5173" />
      <p className="dev-small dev-muted">Publikus oldalnál HTTPS kell; HTTP csak localhoston engedélyezett. Az útvonalat automatikusan levágjuk.</p>
      <button className="dev-primary" type="submit" disabled={action.busy || !origin.trim()}>
        {action.busy ? 'Mentés…' : 'Origin hozzáadása'}
      </button>
    </form>}
    {action.error && <p role="alert" className="dev-error">{action.error}</p>}
  </section>;
}
