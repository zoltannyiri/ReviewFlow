import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { once } from 'node:events';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../src/config/prisma.js';
import { runReplyChecks } from './helpers/replyChecks.js';

test('real PostgreSQL + HTTP: comment access, resolution and token safety (rolled back)', async (t) => {
  const rollback = new Error('ROLL_BACK_TEST_FIXTURES');
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = randomBytes(32).toString('hex');
  const marker = `reviewflow-test-${randomUUID()}`;
  let fixtureUserId;

  try {
    await prisma.$transaction(async (tx) => {
      // The real application uses this transaction client for the whole test.
      // No test row is committed, even when an assertion or HTTP call fails.
      const mocked = mock.module('../src/config/prisma.js', { defaultExport: tx });
      let server;
      try {
        const { default: app } = await import('../src/app.js');
        const passwordHash = await bcrypt.hash('integration-fixture-password', 4);
        const owner = await tx.user.create({ data: { email: `${marker}-owner@example.invalid`, passwordHash } });
        fixtureUserId = owner.id;
        const member = await tx.user.create({ data: { email: `${marker}-member@example.invalid`, passwordHash: 'not-a-login-password' } });
        const outsider = await tx.user.create({ data: { email: `${marker}-other@example.invalid`, passwordHash: 'not-a-login-password' } });
        const org = await tx.organization.create({ data: {
          name: marker, members: { create: [
            { userId: owner.id, role: 'OWNER' }, { userId: member.id, role: 'MEMBER' },
          ] },
        } });
        const otherOrg = await tx.organization.create({ data: {
          name: `${marker}-other`, members: { create: { userId: outsider.id, role: 'OWNER' } },
        } });
        const project = await tx.project.create({ data: { name: marker, organizationId: org.id, createdById: owner.id } });
        const otherProject = await tx.project.create({ data: { name: `${marker}-other`, organizationId: otherOrg.id, createdById: outsider.id } });
        const round = await tx.reviewRound.create({ data: { projectId: project.id, name: 'Review 1', version: 1, targetUrl: 'http://localhost:5173/test' } });
        const otherRound = await tx.reviewRound.create({ data: { projectId: otherProject.id, name: 'Other review', version: 1, targetUrl: 'http://localhost:5173/test' } });
        const emptyRound = await tx.reviewRound.create({ data: { projectId: project.id, name: 'Empty review', version: 2, targetUrl: 'http://localhost:5173/test' } });
        const commentData = { comment: 'Test feedback', pathname: '/test', tagName: 'h1', reviewElementId: 'hero-title', viewportWidth: 1280, viewportHeight: 800, elementX: 20, elementY: 40, elementWidth: 300, elementHeight: 60 };
        const comment = await tx.comment.create({ data: { ...commentData, reviewRoundId: round.id } });
        const otherComment = await tx.comment.create({ data: { ...commentData, reviewRoundId: otherRound.id } });
        const rawGuestToken = randomBytes(32).toString('hex');
        const tokenHash = createHash('sha256').update(rawGuestToken).digest('hex');
        const link = await tx.reviewLink.create({ data: { reviewRoundId: round.id, tokenHash } });
        const accessToken = (userId, overrides = {}) => jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
          issuer: 'reviewflow-api', audience: 'reviewflow-web', expiresIn: '5m', ...overrides,
        });
        const ownerToken = accessToken(owner.id);
        const memberToken = accessToken(member.id);
        const outsiderToken = accessToken(outsider.id);
        server = app.listen(0, '127.0.0.1');
        await once(server, 'listening');
        const base = `http://127.0.0.1:${server.address().port}/api`;
        const request = async (path, { token, method = 'GET', body } = {}) => {
          const headers = {};
          if (token) headers.Authorization = `Bearer ${token}`;
          if (body !== undefined) headers['Content-Type'] = 'application/json';
          const response = await fetch(`${base}${path}`, {
            method, headers, body: body === undefined ? undefined : JSON.stringify(body),
          });
          const text = await response.text();
          return { status: response.status, body: text.startsWith('{') ? JSON.parse(text) : text };
        };
        const resolve = (id, token, body = { status: 'RESOLVED' }) => request(`/comments/${id}`, { token, method: 'PATCH', body });

        await t.test('existing login and project/round APIs support developer navigation', async () => {
          const login = await request('/auth/login', { method: 'POST', body: { email: owner.email, password: 'integration-fixture-password' } });
          assert.equal(login.status, 200);
          const token = login.body.accessToken;
          const projects = await request('/projects', { token });
          assert.equal(projects.status, 200);
          assert.deepEqual(projects.body.projects.map((item) => item.id), [project.id]);
          const rounds = await request(`/projects/${project.id}/rounds`, { token });
          assert.equal(rounds.status, 200);
          assert.deepEqual(rounds.body.reviewRounds.map((item) => item.id), [emptyRound.id, round.id]);
          assert.equal((await request(`/rounds/${round.id}/comments`, { token })).status, 200);
        });

        await t.test('guest, missing, invalid, expired and wrong-audience tokens cannot resolve', async () => {
          for (const token of [undefined, rawGuestToken, 'invalid', accessToken(owner.id, { expiresIn: -1 }), accessToken(owner.id, { audience: 'other' })]) {
            assert.equal((await resolve(comment.id, token)).status, 401);
            assert.equal((await request(`/rounds/${round.id}/comments`, { token })).status, 401);
          }
        });
        await t.test('member can list own round; a foreign round and missing round both return 404', async () => {
          const own = await request(`/rounds/${round.id}/comments`, { token: memberToken });
          assert.equal(own.status, 200);
          assert.equal(own.body.comments.length, 1);
          assert.equal(own.body.comments[0].id, comment.id);
          for (const id of [otherRound.id, randomUUID()]) {
            assert.equal((await request(`/rounds/${id}/comments`, { token: memberToken })).status, 404);
          }
        });
        await t.test('accessible empty round returns an empty list', async () => {
          const result = await request(`/rounds/${emptyRound.id}/comments`, { token: ownerToken });
          assert.equal(result.status, 200);
          assert.deepEqual(result.body.comments, []);
        });
        await t.test('foreign comments cannot be resolved in either direction', async () => {
          assert.equal((await resolve(comment.id, outsiderToken)).status, 404);
          assert.equal((await resolve(otherComment.id, ownerToken)).status, 404);
          assert.equal((await resolve(randomUUID(), ownerToken)).status, 404);
          assert.equal((await tx.comment.findUnique({ where: { id: comment.id } })).status, 'OPEN');
          assert.equal((await tx.comment.findUnique({ where: { id: otherComment.id } })).status, 'OPEN');
        });
        await t.test('invalid UUIDs, statuses and extra ownership fields return 400', async () => {
          assert.equal((await resolve('invalid-id', ownerToken)).status, 400);
          assert.equal((await request('/rounds/invalid-id/comments', { token: ownerToken })).status, 400);
          for (const body of [{}, { status: 'OPEN' }, { status: 'REOPENED' }, { status: 42 }, { status: 'RESOLVED', reviewRoundId: otherRound.id }]) {
            assert.equal((await resolve(comment.id, ownerToken, body)).status, 400);
          }
        });
        await t.test('MEMBER can resolve; repeated resolution is safe and persists', async () => {
          assert.equal((await resolve(comment.id, memberToken)).body.comment.status, 'RESOLVED');
          assert.equal((await resolve(comment.id, ownerToken)).status, 200);
          const stored = await tx.comment.findUnique({ where: { id: comment.id } });
          assert.equal(stored.status, 'RESOLVED');
          assert.equal(stored.comment, commentData.comment);
          assert.equal(stored.reviewRoundId, round.id);
          assert.equal((await tx.reviewRound.findUnique({ where: { id: round.id } })).status, 'DRAFT');
        });
        await runReplyChecks(t, {
          tx, request, owner, comment, otherComment, emptyRound, round, link,
          ownerToken, memberToken, outsiderToken, rawGuestToken,
        });

        await t.test('revoked membership cannot list or resolve with an otherwise valid JWT', async () => {
          await tx.organizationMember.delete({ where: { organizationId_userId: { organizationId: org.id, userId: member.id } } });
          assert.equal((await resolve(comment.id, memberToken)).status, 404);
          assert.equal((await request(`/rounds/${round.id}/comments`, { token: memberToken })).status, 404);
          assert.equal((await request(`/comments/${comment.id}/replies`, { token: memberToken, method: 'POST', body: { message: 'No longer allowed' } })).status, 404);
        });
        await t.test('public routes still work without JWT and expose the resolved status', async () => {
          const review = await request(`/review/${rawGuestToken}`);
          assert.equal(review.status, 200);
          assert.ok(!JSON.stringify(review.body).includes(tokenHash));
          const publicComments = await request(`/review/${rawGuestToken}/comments?pathname=/test`);
          assert.equal(publicComments.status, 200);
          assert.equal(publicComments.body.comments[0].status, 'RESOLVED');
          const created = await request(`/review/${rawGuestToken}/comments`, {
            method: 'POST', body: { ...commentData, elementRect: { x: 20, y: 40, width: 300, height: 60 } },
          });
          assert.equal(created.status, 201);
          assert.equal(created.body.comment.status, 'OPEN');
        });
        await t.test('initial and repeated revocation never return tokenHash', async () => {
          for (let attempt = 0; attempt < 2; ++attempt) {
            const result = await request(`/links/${link.id}`, { token: ownerToken, method: 'DELETE' });
            assert.equal(result.status, 200);
            assert.equal(result.body.reviewLink.isActive, false);
            assert.ok(!Object.hasOwn(result.body.reviewLink, 'tokenHash'));
            assert.ok(!JSON.stringify(result.body).includes(rawGuestToken));
          }
          assert.equal((await request(`/review/${rawGuestToken}/comments`)).status, 410);
          assert.equal((await request(`/review/${rawGuestToken}/comments/${comment.id}/replies`, { method: 'POST', body: { message: 'No longer allowed' } })).status, 410);
        });
      } finally {
        if (server) await new Promise((resolve) => server.close(resolve));
        mocked.restore();
      }
      throw rollback;
    }, { timeout: 60000 });
  } catch (error) {
    if (error !== rollback) throw error;
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
    try {
      if (fixtureUserId) assert.equal(await prisma.user.findUnique({ where: { id: fixtureUserId } }), null, 'Test fixtures must be rolled back');
    } finally {
      await prisma.$disconnect();
    }
  }
});
