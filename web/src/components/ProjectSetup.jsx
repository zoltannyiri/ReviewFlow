import { useState } from 'react';
import api from '../api/api.js';
import { useDeveloperResource } from '../hooks/useDeveloperResource.js';
import { useDeveloperAction } from '../hooks/useDeveloperAction.js';
import { buildReviewTarget } from '@reviewflow/client/reviewUrl';

function CopyText({ label, value, multiline = false }) {
  const [notice, setNotice] = useState('');
  return <div className="dev-copy">
    <label>{label}<textarea readOnly value={value} rows={multiline ? 6 : 2} spellCheck={false} /></label>
    <button type="button" onClick={async () => {
      try { await navigator.clipboard.writeText(value); setNotice('Kimásolva.'); }
      catch { setNotice('Jelöld ki a mező tartalmát, és másold ki kézzel.'); }
    }}>{label} másolása</button>
    <span role="status" className="dev-small">{notice}</span>
  </div>;
}

export default function ProjectSetup({ client, project, round, onSessionExpired }) {
  const links = useDeveloperResource(client, '/rounds/' + round.id + '/links', onSessionExpired);
  const connection = useDeveloperResource(client, '/rounds/' + round.id + '/connection', onSessionExpired);
  const action = useDeveloperAction(onSessionExpired);
  const previewAction = useDeveloperAction(onSessionExpired);
  const [issued, setIssued] = useState(null);
  const [previewHref, setPreviewHref] = useState('');
  const [days, setDays] = useState('7');
  const apiUrl = new URL(api.defaults.baseURL || '/api', window.location.origin);
  const moduleUrl = new URL('/sdk/index.js', apiUrl.origin).href;
  const safeJson = (value) => JSON.stringify(value).replaceAll('<', '\\u003c');
  const snippet = ['<script type="module">',
    '  import ReviewFlow from ' + safeJson(moduleUrl) + ';',
    '  ReviewFlow.init(' + safeJson({ apiUrl: apiUrl.href.replace(/\/$/, ''), projectKey: project.publicKey }) + ');',
    '</script>'].join('\n');
  const local = (host) => ['localhost', '127.0.0.1', '[::1]'].includes(host);
  let externalTarget = false;
  try { externalTarget = !local(new URL(round.targetUrl).hostname); } catch { /* Old invalid URLs. */ }
  const localOnly = externalTarget && (local(apiUrl.hostname) || local(window.location.hostname) || apiUrl.protocol !== 'https:');
  const storedLinks = links.data?.reviewLinks || [];
  return <section className="dev-card dev-onboarding" aria-labelledby="setup-title">
    <p className="dev-eyebrow">Bekötés és megosztás</p>
    <h2 id="setup-title">Indulhat az ügyfél review</h2>
    <p className="dev-url">Céloldal: {round.targetUrl || 'Nincs beállítva'}</p>
    <div className="dev-preview-action">
      <button className="dev-primary" disabled={previewAction.busy} onClick={() => {
        const opened = window.open('about:blank', '_blank');
        if (opened) opened.opener = null;
        previewAction.run(
          (signal) => client.post('/rounds/' + round.id + '/preview', {}, { signal }),
          ({ preview }) => {
            const href = buildReviewTarget(preview.targetUrl, preview.token);
            setPreviewHref(href);
            links.setData((current) => current ? ({ ...current, reviewLinks: [{
              id: preview.id, reviewRoundId: round.id, isActive: true,
              expiresAt: preview.expiresAt, createdAt: preview.createdAt,
            }, ...current.reviewLinks] }) : current);
            if (opened && !opened.closed) opened.location.replace(href);
            else window.open(href, '_blank', 'noopener,noreferrer');
          },
        ).then((data) => { if (!data && opened && !opened.closed) opened.close(); });
      }}>{previewAction.busy ? 'Megnyitás…' : 'Megnyitás review módban'}</button>
      <span className="dev-small dev-muted">Új, egy órán át érvényes ideiglenes review-sessionnel.</span>
    </div>
    {previewAction.error && <p role="alert" className="dev-error">{previewAction.error}</p>}
    {previewHref && <p className="dev-small">Ha az új lapot blokkolta a böngésző, <a href={previewHref} target="_blank" rel="noopener noreferrer">nyisd meg innen</a>.</p>}
    {localOnly && <p role="status" className="dev-warning">Jelenleg helyi konfigurációt használsz. Külső ügyfelekhez publikus HTTPS ReviewFlow frontend és API kell; a localhost cím az ügyfél saját gépére mutat.</p>}
    <details open>
      <summary>1. SDK beépítése a céloldalba</summary>
      <p>A kódot egyszer, a céloldal közös HTML-elrendezésébe, a body végére illeszd be, majd telepítsd újra a projektedet. Csak review linkkel aktiválódik.</p>
      <CopyText label="Beépítési kód" value={snippet} multiline />
      <p className="dev-small">React/Next.js esetén a kódnak a böngészőben kell lefutnia, nem a szerveren. A script importálása után hívd az init függvényt; a visszaadott példány destroy() függvényével takaríts unmountkor. A CSP-ben az SDK és az API címét is engedélyezni kell.</p>
    </details>
    <div className="dev-setup-section">
      <h3>2. Ügyféllink létrehozása</h3>
      <p className="dev-small">A link birtokosa fiók nélkül hozzáfér a kör visszajelzéseihez. Csak annak küldd el, akinek ezt engedélyezed.</p>
      <label>Link érvényessége<select value={days} onChange={(event) => setDays(event.target.value)} disabled={action.busy}>
        <option value="7">7 nap</option><option value="30">30 nap</option><option value="0">Visszavonásig</option>
      </select></label>
      <button className="dev-primary" disabled={action.busy || links.loading || Boolean(links.error)} onClick={() => action.run(
        (signal) => client.post('/rounds/' + round.id + '/links', {
          expiresAt: Number(days) ? new Date(Date.now() + Number(days) * 86400000).toISOString() : null,
        }, { signal }), ({ reviewLink }) => {
          setIssued(reviewLink);
          links.setData((current) => ({ ...current, reviewLinks: [reviewLink, ...current.reviewLinks] }));
        })}>{action.busy ? 'Mentés…' : 'Új ügyféllink generálása'}</button>
      {issued && <div className="dev-issued">
        <CopyText label="Ügyféllink" value={issued.reviewUrl} />
        <a className="dev-link-button" href={issued.reviewUrl} target="_blank" rel="noopener noreferrer">Review megnyitása új lapon</a>
        <p className="dev-small">Másold ki most: a teljes linket biztonsági okból később nem tudjuk visszaolvasni. Új linket bármikor generálhatsz, a régit pedig visszavonhatod.</p>
      </div>}
      {action.error && <p role="alert" className="dev-error">{action.error}</p>}
      {links.loading && <p role="status">Linkek betöltése…</p>}
      {links.error && <p role="alert" className="dev-error">{links.error}</p>}
      <button onClick={links.refresh} disabled={action.busy || links.loading}>Linklista frissítése</button>
      {!links.loading && !links.error && !storedLinks.length && <p>Még nincs ügyféllink ehhez a körhöz.</p>}
      <ul className="dev-link-list">{storedLinks.map((link) => {
        const expired = link.expiresAt && new Date(link.expiresAt) <= new Date();
        return <li key={link.id}>
          <span>{!link.isActive ? 'Visszavont' : expired ? 'Lejárt' : 'Aktív'} · {new Date(link.createdAt).toLocaleString('hu-HU')}
            {link.expiresAt && ' · Lejár: ' + new Date(link.expiresAt).toLocaleString('hu-HU')}</span>
          {link.isActive && <button disabled={action.busy || links.loading} onClick={() => action.run(
            (signal) => client.remove('/links/' + link.id, { signal }), ({ reviewLink }) => {
              links.setData((current) => ({ ...current, reviewLinks: current.reviewLinks.map((item) => item.id === link.id ? reviewLink : item) }));
              if (issued?.id === link.id) setIssued(null);
            })}>Link visszavonása</button>}
        </li>;
      })}</ul>
    </div>
    <div className="dev-setup-section">
      <h3>3. Beépítés ellenőrzése</h3>
      <p>Nyisd meg az ügyféllinket, majd a céloldalt. Utána frissítsd itt a kapcsolat állapotát.</p>
      {connection.loading ? <p role="status">Kapcsolat ellenőrzése…</p>
        : connection.error ? <p role="alert" className="dev-error">{connection.error}</p>
          : connection.data?.lastConnectedAt ? <p role="status" className="dev-success">Utolsó sikeres SDK-kapcsolat: {new Date(connection.data.lastConnectedAt).toLocaleString('hu-HU')} · {connection.data.origin}</p>
            : <p role="status">Még nem érkezett SDK-visszajelzés ebből a review körből.</p>}
      <button onClick={connection.refresh} disabled={connection.loading}>Kapcsolat állapotának frissítése</button>
      <p className="dev-small dev-muted">Ez az API-kapcsolat legutóbbi időpontja, nem folyamatos rendelkezésreállás- vagy tulajdonjog-ellenőrzés. A Vercel-jelszóvédelmet nem kerüli meg.</p>
    </div>
  </section>;
}
