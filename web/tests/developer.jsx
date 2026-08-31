import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AxiosError } from 'axios';
import api from '../src/api/api.js';
import DeveloperCommentsPage from '../src/pages/DeveloperCommentsPage.jsx';
import '../src/index.css';

const projectId = '11111111-1111-4111-8111-111111111111';
const emptyProjectId = '11111111-1111-4111-8111-111111111112';
const roundId = '22222222-2222-4222-8222-222222222222';
const emptyRoundId = '22222222-2222-4222-8222-222222222223';
const round = { id: roundId, name: 'Első ügyfélkör', version: 1, status: 'REVIEWING', targetUrl: 'https://kovacs-klima.vercel.app/' };
const fixtureToken = 'fixture-access-token-not-a-real-jwt';
const fixtureOrg = { id: '44444444-4444-4444-8444-444444444444', name: 'Teszt ügynökség' };
const addedProjects = [];
const addedRounds = [];
const fixtureProjects = [
  { id: projectId, name: 'Kovács Klíma', organization: fixtureOrg, role: 'OWNER',
    publicKey: 'fixture-kovacs-key', allowedDomains: ['https://kovacs-klima.vercel.app'] },
  { id: emptyProjectId, name: 'Új projekt', organization: fixtureOrg, role: 'OWNER',
    publicKey: 'fixture-empty-key', allowedDomains: ['http://localhost:5173'] },
];
const fixtureLinks = new Map();
let comments = [
  { id: '33333333-3333-4333-8333-333333333331', elementText: 'Főcím', comment: 'Legyen nagyobb a főcím.', pathname: '/test', status: 'OPEN' },
  { id: '33333333-3333-4333-8333-333333333332', elementText: 'Ajánlatkérés', comment: '<img src=x onerror=alert(1)> Ez csak szöveg.', pathname: '/contact', status: 'OPEN' },
  { id: '33333333-3333-4333-8333-333333333333', elementText: 'Lábléc', comment: 'A telefonszám javítva.', pathname: '/test', status: 'RESOLVED' },
].map((comment) => ({ ...comment, reviewRoundId: roundId, tagName: 'h1', reviewElementId: comment.id,
  viewportWidth: 1280, viewportHeight: 800, createdAt: '2026-08-31T12:00:00Z',
  replies: [{ id: `reply-${comment.id}`, commentId: comment.id, authorType: 'CLIENT',
    authorName: 'Ügyfél', message: 'Ezt még szeretném pontosítani.', createdAt: '2026-08-31T13:00:00Z' }],
}));

// Only this explicit test entry point installs a mock adapter. Production
// imports neither this file nor fixture credentials. No network writes occur.
api.defaults.adapter = async (config) => {
  await new Promise((resolve) => setTimeout(resolve, 120));
  const respond = (status, data) => {
    const response = { status, data, statusText: String(status), config, headers: {} };
    if (status >= 400) throw new AxiosError('Fixture request failed', 'ERR_BAD_RESPONSE', config, null, response);
    return response;
  };
  const payload = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;

  if (config.url === '/auth/login') {
    if (payload.email !== 'developer@example.invalid' || payload.password !== 'fixture-password') {
      return respond(401, { message: 'Invalid credentials' });
    }
    return respond(200, { accessToken: fixtureToken, user: { id: 'fixture-user', email: payload.email } });
  }
  if (config.headers.get('Authorization') !== `Bearer ${fixtureToken}` ||
      document.getElementById('expired-session').checked) {
    return respond(401, { message: 'Expired session' });
  }
  if (config.method === 'get' && document.getElementById('fail-load').checked) {
    return respond(500, { message: 'Simulated load error' });
  }
  if (config.url === '/organizations') return respond(200, { organizations: [fixtureOrg] });
  if (config.url === '/projects/onboard') {
    if (document.getElementById('fail-save').checked) return respond(500, { message: 'Simulated save error' });
    const url = new URL(payload.targetUrl);
    const project = { id: crypto.randomUUID(), name: payload.name, organization: fixtureOrg,
      publicKey: 'fixture-public-project-key', allowedDomains: [url.origin], role: 'OWNER' };
    const reviewRound = { id: crypto.randomUUID(), projectId: project.id, targetUrl: url.href,
      name: 'Első ügyfél review', version: 1, status: 'DRAFT' };
    addedProjects.unshift(project);
    addedRounds.push(reviewRound);
    return respond(201, { project, reviewRound });
  }
  if (config.url.endsWith('/connection')) return respond(200, { lastConnectedAt: null, origin: null });
  if (/^\/rounds\/[^/]+\/links$/.test(config.url)) {
    const id = config.url.split('/')[2];
    const saved = fixtureLinks.get(id) || [];
    if (config.method === 'get') return respond(200, { reviewLinks: saved });
    if (document.getElementById('fail-save').checked) return respond(500, { message: 'Simulated save error' });
    const link = { id: crypto.randomUUID(), isActive: true, createdAt: new Date().toISOString(), expiresAt: payload.expiresAt };
    fixtureLinks.set(id, [link, ...saved]);
    return respond(201, { reviewLink: { ...link, reviewUrl: window.location.origin + '/r/fixture-not-a-real-review-token' } });
  }
  if (config.method === 'delete' && config.url.startsWith('/links/')) {
    if (document.getElementById('fail-save').checked) return respond(500, { message: 'Simulated save error' });
    for (const saved of fixtureLinks.values()) {
      const link = saved.find((item) => item.id === config.url.split('/').at(-1));
      if (link) { link.isActive = false; return respond(200, { reviewLink: { ...link } }); }
    }
  }
  const originRoute = config.url.match(/^\/projects\/([^/]+)\/origins$/);
  if (config.method === 'patch' && originRoute) {
    if (document.getElementById('fail-save').checked) return respond(500, { message: 'Simulated save error' });
    const project = [...addedProjects, ...fixtureProjects].find((item) => item.id === originRoute[1]);
    if (!project) return respond(404, { message: 'Not found' });
    project.allowedDomains = [...new Set(payload.origins.map((item) => new URL(item).origin))];
    return respond(200, { project: structuredClone(project) });
  }
  const projectRoundsRoute = config.url.match(/^\/projects\/([^/]+)\/rounds$/);
  if (projectRoundsRoute) {
    const requestedProjectId = projectRoundsRoute[1];
    const saved = addedRounds.filter((item) => item.projectId === requestedProjectId);
    const builtIn = requestedProjectId === projectId
      ? [round, { ...round, id: emptyRoundId, version: 2, name: 'Üres review kör' }]
      : [];
    if (config.method === 'get') return respond(200, { reviewRounds: [...saved, ...builtIn] });
    if (config.method === 'post') {
      if (document.getElementById('fail-save').checked) return respond(500, { message: 'Simulated save error' });
      const reviewRound = { id: crypto.randomUUID(), projectId: requestedProjectId, targetUrl: new URL(payload.targetUrl).href,
        name: payload.name, version: saved.length + builtIn.length + 1, status: 'DRAFT' };
      addedRounds.unshift(reviewRound);
      return respond(201, { reviewRound });
    }
  }
  for (const added of addedRounds) {
    if (config.url === '/rounds/' + added.id + '/comments') return respond(200, { reviewRound: added, comments: [] });
  }
  if (config.url === '/projects') {
    return respond(200, { projects: [
      ...addedProjects,
      ...fixtureProjects,
    ] });
  }
  if (config.url === `/rounds/${roundId}/comments`) return respond(200, { reviewRound: round, comments: structuredClone(comments) });
  if (config.url === `/rounds/${emptyRoundId}/comments`) return respond(200, { reviewRound: { ...round, id: emptyRoundId, version: 2, name: 'Üres review kör' }, comments: [] });
  if (config.method === 'post' && config.url.endsWith('/replies')) {
    if (document.getElementById('fail-save').checked) return respond(500, { message: 'Simulated save error' });
    const id = config.url.split('/').at(-2);
    const comment = comments.find((item) => item.id === id);
    if (!comment) return respond(404, { message: 'Not found' });
    const reply = { id: crypto.randomUUID(), commentId: id, authorType: 'DEVELOPER',
      authorName: 'Teszt fejlesztő', message: payload.message, createdAt: new Date().toISOString() };
    comments = comments.map((item) => item.id === id ? { ...item, replies: [...item.replies, reply] } : item);
    document.getElementById('request-result').textContent = `Válasz mentve: ${comment.elementText}`;
    return respond(201, { reply });
  }
  if (config.method === 'patch' && config.url.startsWith('/comments/')) {
    if (document.getElementById('fail-save').checked) return respond(500, { message: 'Simulated save error' });
    const id = config.url.split('/').at(-1);
    const comment = comments.find((item) => item.id === id);
    if (!comment) return respond(404, { message: 'Not found' });
    if (payload.status !== 'RESOLVED') return respond(400, { message: 'Invalid status' });
    comments = comments.map((item) => item.id === id ? { ...item, status: 'RESOLVED' } : item);
    document.getElementById('request-result').textContent = `Mentve: ${comment.elementText} → RESOLVED`;
    return respond(200, { comment: structuredClone(comments.find((item) => item.id === id)) });
  }
  return respond(404, { message: 'Unknown fixture route' });
};

createRoot(document.getElementById('root')).render(
  <StrictMode><DeveloperCommentsPage /></StrictMode>
);
