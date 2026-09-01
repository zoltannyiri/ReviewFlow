import { useMemo, useState } from 'react';
import { createDeveloperApi } from '../api/developerApi.js';
import { useDeveloperResource } from '../hooks/useDeveloperResource.js';
import RoundComments from './RoundComments.jsx';
import KanbanBoard from './KanbanBoard.jsx';
import NewProjectForm from './NewProjectForm.jsx';
import ProjectSetup from './ProjectSetup.jsx';
import ProjectOrigins from './ProjectOrigins.jsx';
import NewReviewRound from './NewReviewRound.jsx';

function ProjectRounds({ client, projectId, project, initialRoundId = '', onProjectUpdated, onSessionExpired }) {
  const resource = useDeveloperResource(client, `/projects/${projectId}/rounds`, onSessionExpired);
  const [roundId, setRoundId] = useState(initialRoundId);
  const [activeTab, setActiveTab] = useState('board'); // 'board' | 'comments' | 'setup'

  const rounds = resource.data?.reviewRounds || [];
  const selectedRound = rounds.find((r) => r.id === roundId);

  // Load tasks when round is selected
  const taskResource = useDeveloperResource(
    client,
    roundId ? `/rounds/${roundId}/tasks` : null,
    onSessionExpired
  );

  const tasks = taskResource.data?.tasks || [];

  const stats = useMemo(() => {
    const todo = tasks.filter((t) => t.status === 'TODO').length;
    const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const onHold = tasks.filter((t) => t.status === 'ON_HOLD').length;
    const done = tasks.filter((t) => t.status === 'DONE').length;
    const pages = new Set(tasks.map((t) => t.comment?.pathname).filter(Boolean)).size;

    return {
      total: tasks.length,
      todo,
      inProgress,
      onHold,
      done,
      pages,
    };
  }, [tasks]);

  return (
    <>
      <div className="dev-environment-grid">
        <ProjectOrigins
          client={client}
          project={project}
          onUpdated={onProjectUpdated}
          onSessionExpired={onSessionExpired}
        />
        <NewReviewRound
          client={client}
          project={project}
          onSessionExpired={onSessionExpired}
          onCreated={(round) => {
            resource.setData((current) => ({
              ...current,
              reviewRounds: [round, ...(current?.reviewRounds || [])],
            }));
            setRoundId(round.id);
            setActiveTab('board');
          }}
        />
      </div>

      {resource.loading && <p role="status">Review körök betöltése…</p>}
      {resource.error && (
        <div>
          <p role="alert" className="dev-error">{resource.error}</p>
          <button onClick={resource.refresh}>Újrapróbálás</button>
        </div>
      )}
      {!resource.loading && !resource.error && !rounds.length && (
        <p className="dev-muted">Ehhez a projekthez még nincs review kör.</p>
      )}

      {!!rounds.length && (
        <label className="dev-round-picker">
          Review kör
          <select value={roundId} onChange={(event) => setRoundId(event.target.value)}>
            <option value="">Válassz review kört…</option>
            {rounds.map((round) => (
              <option key={round.id} value={round.id}>
                #{round.version} · {round.name} · {round.status}
              </option>
            ))}
          </select>
        </label>
      )}

      {selectedRound && (
        <>
          {/* Obvious Project & Round Context Banner */}
          <div className="dev-context-bar">
            <div className="dev-context-info">
              <span className="dev-eyebrow">Aktív kontextus</span>
              <h2 style={{ fontSize: '18px', margin: '2px 0' }}>
                {project.name} · #{selectedRound.version} {selectedRound.name}
              </h2>
              <span className="dev-muted dev-small">
                Céloldal: {selectedRound.targetUrl}
              </span>
            </div>

            <div className="dev-context-stats">
              <div className="dev-stat-chip">
                <span>Érintett oldalak:</span>
                <strong>{stats.pages}</strong>
              </div>
              <div className="dev-stat-chip">
                <span>Teendő:</span>
                <strong>{stats.todo}</strong>
              </div>
              <div className="dev-stat-chip">
                <span>Folyamatban:</span>
                <strong style={{ color: '#2563eb' }}>{stats.inProgress}</strong>
              </div>
              <div className="dev-stat-chip">
                <span>Várakozik:</span>
                <strong style={{ color: '#b45309' }}>{stats.onHold}</strong>
              </div>
              <div className="dev-stat-chip">
                <span>Kész:</span>
                <strong style={{ color: '#16a34a' }}>{stats.done}</strong>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="dev-tabs" aria-label="Review nézetek">
            <button
              type="button"
              className={`dev-tab ${activeTab === 'board' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('board')}
            >
              Feladatok (Kanban tábla)
            </button>
            <button
              type="button"
              className={`dev-tab ${activeTab === 'comments' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('comments')}
            >
              Visszajelzések lista
            </button>
            <button
              type="button"
              className={`dev-tab ${activeTab === 'setup' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('setup')}
            >
              Bekötés és megosztás
            </button>
          </nav>

          {/* Active View */}
          {activeTab === 'setup' && (
            <ProjectSetup
              key={'setup-' + roundId}
              client={client}
              project={project}
              round={selectedRound}
              onSessionExpired={onSessionExpired}
            />
          )}

          {activeTab === 'board' && (
            <>
              {taskResource.loading && <p role="status">Feladatok betöltése…</p>}
              {taskResource.error && (
                <div className="dev-card">
                  <p role="alert" className="dev-error">{taskResource.error}</p>
                  <button onClick={taskResource.refresh}>Újrapróbálás</button>
                </div>
              )}
              {!taskResource.loading && (
                <KanbanBoard
                  key={'board-' + roundId}
                  client={client}
                  round={selectedRound}
                  tasks={tasks}
                  onTasksUpdated={(updater) => {
                    taskResource.setData((current) => ({
                      ...current,
                      tasks: typeof updater === 'function' ? updater(current?.tasks || []) : updater,
                    }));
                  }}
                  onSessionExpired={onSessionExpired}
                />
              )}
            </>
          )}

          {activeTab === 'comments' && (
            <RoundComments
              key={'comments-' + roundId}
              client={client}
              roundId={roundId}
              onSessionExpired={onSessionExpired}
            />
          )}
        </>
      )}
    </>
  );
}

export default function DeveloperWorkspace({ session, onLogout, onSessionExpired }) {
  const client = useMemo(() => createDeveloperApi(session.accessToken), [session.accessToken]);
  const resource = useDeveloperResource(client, '/projects', onSessionExpired);
  const [projectId, setProjectId] = useState('');
  const [adding, setAdding] = useState(false);
  const [created, setCreated] = useState(null);
  const selectedProject = resource.data?.projects.find((project) => project.id === projectId);

  return (
    <>
      <header className="dev-section-heading">
        <div>
          <p className="dev-eyebrow">Fejlesztői felület</p>
          <h1>Munkafolyamat és feladatok</h1>
          <p className="dev-muted">{session.user.email}</p>
        </div>
        <button onClick={onLogout}>Kijelentkezés</button>
      </header>

      {!adding && (
        <button className="dev-primary" disabled={!resource.data} onClick={() => setAdding(true)}>
          Új projekt hozzáadása
        </button>
      )}
      {!adding && (
        <button disabled={resource.loading} onClick={resource.refresh} style={{ marginLeft: '8px' }}>
          Projektlista frissítése
        </button>
      )}

      {adding && (
        <NewProjectForm
          client={client}
          onSessionExpired={onSessionExpired}
          onCancel={() => setAdding(false)}
          onCreated={(data) => {
            resource.setData((current) => ({
              ...current,
              projects: [data.project, ...current.projects],
            }));
            setCreated(data);
            setProjectId(data.project.id);
            setAdding(false);
          }}
        />
      )}

      {resource.loading && <p role="status">Projektek betöltése…</p>}
      {resource.error && (
        <div>
          <p role="alert" className="dev-error">{resource.error}</p>
          <button onClick={resource.refresh}>Újrapróbálás</button>
        </div>
      )}
      {resource.data?.projects.length === 0 && (
        <p className="dev-card dev-muted">
          Még nincs projekted. Az „Új projekt hozzáadása” gombbal kapcsolhatod be az első weboldaladat.
        </p>
      )}

      {resource.data?.projects.length > 0 && (
        <section className="dev-project-picker">
          <label>
            Projekt
            <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
              <option value="">Válassz projektet…</option>
              {resource.data.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} · {project.organization.name}
                </option>
              ))}
            </select>
          </label>
        </section>
      )}

      {selectedProject && (
        <ProjectRounds
          key={projectId}
          client={client}
          projectId={projectId}
          project={selectedProject}
          onProjectUpdated={(updated) =>
            resource.setData((current) => ({
              ...current,
              projects: current.projects.map((project) =>
                project.id === updated.id ? updated : project
              ),
            }))
          }
          initialRoundId={created?.project.id === projectId ? created.reviewRound.id : ''}
          onSessionExpired={onSessionExpired}
        />
      )}
    </>
  );
}
