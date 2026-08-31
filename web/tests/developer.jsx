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
const round = { id: roundId, name: 'Első ügyfélkör', version: 1, status: 'REVIEWING' };
const fixtureToken = 'fixture-access-token-not-a-real-jwt';
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
  if (config.url === '/projects') {
    return respond(200, { projects: [
      { id: projectId, name: 'Kovács Klíma', organization: { name: 'Teszt ügynökség' } },
      { id: emptyProjectId, name: 'Új projekt', organization: { name: 'Teszt ügynökség' } },
    ] });
  }
  if (config.url === `/projects/${projectId}/rounds`) {
    return respond(200, { reviewRounds: [round, { ...round, id: emptyRoundId, version: 2, name: 'Üres review kör' }] });
  }
  if (config.url === `/projects/${emptyProjectId}/rounds`) return respond(200, { reviewRounds: [] });
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
