import assert from 'node:assert/strict';

export const runSetupChecks = async (t, { tx, request, org, ownerToken, memberToken, outsiderToken }) => {
  const input = { organizationId: org.id, name: 'Valódi projekt próba', targetUrl: 'https://example-project.vercel.app/shop?lang=hu#pricing' };
  let project;
  let round;
  let link;
  const origin = 'https://example-project.vercel.app';
  await t.test('organization list is member-only and project onboarding creates the initial round atomically', async () => {
    assert.equal((await request('/organizations')).status, 401);
    const organizations = await request('/organizations', { token: ownerToken });
    assert.deepEqual(organizations.body.organizations.map((item) => item.id), [org.id]);
    const result = await request('/projects/onboard', { token: ownerToken, method: 'POST', body: input });
    assert.equal(result.status, 201);
    ({ project, reviewRound: round } = result.body);
    assert.deepEqual(project.allowedDomains, [origin]);
    assert.equal(round.version, 1);
    assert.equal(round.targetUrl, input.targetUrl);
    assert.equal(round.projectId, project.id);
    assert.equal(project.role, 'OWNER');
    assert.equal(await tx.reviewRound.count({ where: { projectId: project.id } }), 1);
  });
  await t.test('invalid input and foreign organizations cannot create partial projects', async () => {
    const before = await tx.project.count();
    assert.equal((await request('/projects/onboard', { method: 'POST', body: input })).status, 401);
    assert.equal((await request('/projects/onboard', { token: outsiderToken, method: 'POST', body: input })).status, 404);
    for (const body of [{ ...input, name: 1 }, { ...input, name: ' ' }, { ...input, targetUrl: 'javascript:alert(1)' },
      { ...input, targetUrl: 'http://public.test' }, { ...input, createdById: 'forged' }]) {
      assert.equal((await request('/projects/onboard', { token: ownerToken, method: 'POST', body })).status, 400);
    }
    assert.equal(await tx.project.count(), before);
  });
  await t.test('owners manage exact origins and members create rounds only on those origins', async () => {
    const localOrigin = 'http://localhost:4173';
    const updated = await request('/projects/' + project.id + '/origins', {
      token: ownerToken,
      method: 'PATCH',
      body: { origins: [origin, localOrigin + '/preview?mode=dev', localOrigin + '/duplicate'] },
    });
    assert.equal(updated.status, 200);
    assert.deepEqual(updated.body.project.allowedDomains, [origin, localOrigin]);
    assert.equal(updated.body.project.role, 'OWNER');

    assert.equal((await request('/projects/' + project.id + '/origins', {
      token: memberToken, method: 'PATCH', body: { origins: [origin, localOrigin, 'http://localhost:4174'] },
    })).status, 403);
    assert.equal((await request('/projects/' + project.id + '/origins', {
      token: outsiderToken, method: 'PATCH', body: { origins: [origin, localOrigin] },
    })).status, 404);
    for (const origins of [[], ['http://public.test'], ['https://user:secret@example.com']]) {
      assert.equal((await request('/projects/' + project.id + '/origins', {
        token: ownerToken, method: 'PATCH', body: { origins },
      })).status, 400);
    }
    assert.equal((await request('/projects/' + project.id + '/origins', {
      token: ownerToken, method: 'PATCH', body: { origins: [localOrigin] },
    })).status, 409);

    const created = await request('/projects/' + project.id + '/rounds', {
      token: memberToken,
      method: 'POST',
      body: { name: 'Helyi fejlesztői kör', targetUrl: localOrigin + '/checkout?rf_session=old#payment' },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.reviewRound.version, 2);
    assert.equal(created.body.reviewRound.targetUrl, localOrigin + '/checkout#payment');
    assert.equal((await request('/projects/' + project.id + '/rounds', {
      token: memberToken, method: 'POST', body: { name: 'Tiltott cél', targetUrl: 'https://other.vercel.app' },
    })).status, 400);
    assert.equal((await request('/projects/' + project.id + '/rounds', {
      token: memberToken, method: 'POST', body: { name: 'Nem biztonságos cél', targetUrl: 'http://public.test' },
    })).status, 400);
    assert.equal((await request('/rounds/' + created.body.reviewRound.id, {
      token: memberToken, method: 'PATCH', body: { targetUrl: 'https://other.vercel.app' },
    })).status, 400);
  });
  await t.test('generated link is usable, secrets are one-time only, and foreign members cannot generate links', async () => {
    assert.equal((await request('/rounds/' + round.id + '/links', { token: outsiderToken, method: 'POST', body: {} })).status, 404);
    const result = await request('/rounds/' + round.id + '/links', { token: ownerToken, method: 'POST', body: {} });
    assert.equal(result.status, 201);
    link = result.body.reviewLink;
    assert.match(link.token, /^[0-9a-f]{64}$/);
    assert.equal(new URL(link.reviewUrl).pathname, '/r/' + link.token);
    const listed = await request('/rounds/' + round.id + '/links', { token: ownerToken });
    assert.ok(!JSON.stringify(listed.body).includes(link.token));
    assert.ok(!JSON.stringify(listed.body).includes('tokenHash'));
    const read = await request('/review/' + link.token, { origin: new URL(process.env.FRONTEND_URL).origin });
    assert.equal(read.status, 200);
    assert.equal(read.body.review.reviewRound.targetUrl, input.targetUrl);
  });
  await t.test('cross-origin SDK requests and preflights accept only the configured project origin', async () => {
    const path = '/review/' + link.token + '/comments';
    const preflight = await request(path, { method: 'OPTIONS', origin, headers: { 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
    assert.equal((await request(path, { origin })).status, 200);
    for (const invalid of ['https://other.vercel.app', 'null', 'https://example-project.vercel.app.evil.test']) {
      const result = await request(path, { origin: invalid });
      assert.equal(result.status, 403);
      assert.equal(result.headers.get('access-control-allow-origin'), null);
      assert.equal((await request(path, { method: 'OPTIONS', origin: invalid, headers: { 'Access-Control-Request-Method': 'POST' } })).status, 403);
      assert.equal((await request(path, { method: 'POST', origin: invalid, body: {} })).status, 403);
    }
    // The ReviewFlow frontend can read link metadata, not another origin's comments.
    assert.equal((await request(path, { origin: new URL(process.env.FRONTEND_URL).origin })).status, 403);
  });
  await t.test('SDK connection checks validate project key and origin, persist status and respect revocation', async () => {
    const statusPath = '/rounds/' + round.id + '/connection';
    const connect = '/review/' + link.token + '/connection';
    assert.equal((await request(statusPath, { token: outsiderToken })).status, 404);
    assert.equal((await request(statusPath, { token: ownerToken })).body.lastConnectedAt, null);
    assert.equal((await request(connect, { method: 'POST', origin, body: { projectKey: 'wrong-project' } })).status, 403);
    assert.equal((await request(connect, { method: 'POST', body: { projectKey: project.publicKey } })).status, 403);
    assert.equal((await request(connect, { method: 'POST', origin, body: { projectKey: project.publicKey } })).status, 200);
    const connected = await request(statusPath, { token: ownerToken });
    assert.equal(connected.body.origin, origin);
    assert.ok(connected.body.lastConnectedAt);
    assert.equal((await request('/links/' + link.id, { token: ownerToken, method: 'DELETE' })).status, 200);
    assert.equal((await request(connect, { method: 'POST', origin, body: { projectKey: project.publicKey } })).status, 410);
    assert.equal((await request('/review/' + link.token, { origin })).status, 410);
  });
  await t.test('public SDK modules are served cross-origin without exposing server files', async () => {
    const sdk = await request('/../sdk/index.js', { origin });
    assert.equal(sdk.status, 200);
    assert.equal(sdk.headers.get('access-control-allow-origin'), '*');
    assert.ok(sdk.body.includes('ReviewFlow'));
    assert.equal((await request('/../sdk/commentPanel.js', { origin })).status, 200);
    assert.equal((await request('/../sdk/.env', { origin })).status, 404);
    assert.equal((await request('/../sdk/server.js', { origin })).status, 404);
  });
};
