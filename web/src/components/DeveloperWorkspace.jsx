import { useMemo, useState } from 'react';
import { createDeveloperApi } from '../api/developerApi.js';
import { useDeveloperResource } from '../hooks/useDeveloperResource.js';
import RoundComments from './RoundComments.jsx';

function ProjectRounds({ client, projectId, onSessionExpired }) {
  const resource = useDeveloperResource(client, `/projects/${projectId}/rounds`, onSessionExpired);
  const [roundId, setRoundId] = useState('');

  if (resource.loading) return <p role="status">Review körök betöltése…</p>;
  if (resource.error) return <div><p role="alert" className="dev-error">{resource.error}</p>
    <button onClick={resource.refresh}>Újrapróbálás</button></div>;
  const rounds = resource.data?.reviewRounds || [];
  if (!rounds.length) return <p className="dev-muted">Ehhez a projekthez még nincs review kör.</p>;

  return (
    <>
      <label className="dev-round-picker">Review kör
        <select value={roundId} onChange={(event) => setRoundId(event.target.value)}>
          <option value="">Válassz review kört…</option>
          {rounds.map((round) => <option key={round.id} value={round.id}>
            #{round.version} · {round.name} · {round.status}
          </option>)}
        </select>
      </label>
      {roundId && <RoundComments key={roundId} client={client} roundId={roundId} onSessionExpired={onSessionExpired} />}
    </>
  );
}

export default function DeveloperWorkspace({ session, onLogout, onSessionExpired }) {
  const client = useMemo(() => createDeveloperApi(session.accessToken), [session.accessToken]);
  const resource = useDeveloperResource(client, '/projects', onSessionExpired);
  const [projectId, setProjectId] = useState('');

  return (
    <>
      <header className="dev-section-heading">
        <div><p className="dev-eyebrow">Fejlesztői felület</p><h1>Megjegyzések kezelése</h1>
          <p className="dev-muted">{session.user.email}</p></div>
        <button onClick={onLogout}>Kijelentkezés</button>
      </header>
      {resource.loading && <p role="status">Projektek betöltése…</p>}
      {resource.error && <div><p role="alert" className="dev-error">{resource.error}</p>
        <button onClick={resource.refresh}>Újrapróbálás</button></div>}
      {resource.data?.projects.length === 0 && <p className="dev-card dev-muted">Még nincs elérhető projekted. A projekt és a review kör létrehozása egyelőre a meglévő API-val történik.</p>}
      {resource.data?.projects.length > 0 && <section className="dev-project-picker">
        <label>Projekt
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <option value="">Válassz projektet…</option>
            {resource.data.projects.map((project) => <option key={project.id} value={project.id}>
              {project.name} · {project.organization.name}
            </option>)}
          </select>
        </label>
      </section>}
      {projectId && <ProjectRounds key={projectId} client={client} projectId={projectId} onSessionExpired={onSessionExpired} />}
    </>
  );
}
