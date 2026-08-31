import { useState } from 'react';
import { useDeveloperResource } from '../hooks/useDeveloperResource.js';
import { useDeveloperAction } from '../hooks/useDeveloperAction.js';

export default function NewProjectForm({ client, onCreated, onCancel, onSessionExpired }) {
  const organizations = useDeveloperResource(client, '/organizations', onSessionExpired);
  const action = useDeveloperAction(onSessionExpired);
  const [name, setName] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [selectedOrg, setSelectedOrg] = useState('');
  const options = organizations.data?.organizations || [];
  const organizationId = selectedOrg || options[0]?.id || '';
  return <section className="dev-card dev-onboarding" aria-labelledby="new-project-title">
    <p className="dev-eyebrow">1. Saját weboldal hozzáadása</p>
    <h2 id="new-project-title">Új projekt</h2>
    <p>A meglévő weboldaladat kapcsoljuk össze a ReviewFlow-val. A forráskódot nem másoljuk át.</p>
    {organizations.loading && <p role="status">Szervezetek betöltése…</p>}
    {organizations.error && <div><p role="alert" className="dev-error">{organizations.error}</p>
      <button onClick={organizations.refresh}>Újrapróbálás</button></div>}
    {organizations.data && !options.length && <p role="status">Még nem vagy szervezet tagja. A projektfelvételhez szervezeti tagság szükséges.</p>}
    <form onSubmit={(event) => {
      event.preventDefault();
      if (!organizationId) return;
      action.run((signal) => client.post('/projects/onboard', { organizationId, name, targetUrl }, { signal }), onCreated);
    }}>
      <label htmlFor="project-organization">Szervezet</label>
      <select id="project-organization" value={organizationId} onChange={(event) => setSelectedOrg(event.target.value)} required disabled={action.busy || !options.length}>
        {!options.length && <option value="">Nincs elérhető szervezet</option>}
        {options.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
      </select>
      <label htmlFor="project-name">Projekt neve</label>
      <input id="project-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={160} required disabled={action.busy} placeholder="Például: Kovács Klíma weboldal" />
      <label htmlFor="project-url">Weboldal URL-je</label>
      <input id="project-url" type="url" value={targetUrl} onChange={(event) => setTargetUrl(event.target.value)} maxLength={2048} required disabled={action.busy} placeholder="https://sajat-projekt.vercel.app" />
      <p className="dev-small dev-muted">HTTPS-cím szükséges; helyi próbához http://localhost is használható. Az SDK-t egyszer be kell építened a céloldalba.</p>
      {action.error && <p role="alert" className="dev-error">{action.error}</p>}
      <div className="dev-actions">
        <button className="dev-primary" type="submit" disabled={action.busy || !organizationId || !name.trim()}>{action.busy ? 'Létrehozás…' : 'Projekt és első review kör létrehozása'}</button>
        <button type="button" onClick={onCancel} disabled={action.busy}>Mégse</button>
      </div>
    </form>
  </section>;
}
