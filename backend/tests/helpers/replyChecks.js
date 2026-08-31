import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';

export const runReplyChecks = async (t, {
  tx, request, owner, comment, otherComment, emptyRound, round, link,
  ownerToken, memberToken, outsiderToken, rawGuestToken,
}) => {
  const developer = (id, token, body = { message: 'Developer reply' }) =>
    request(`/comments/${id}/replies`, { token, method: 'POST', body });
  const guest = (id, token = rawGuestToken, body = { message: 'Guest reply' }) =>
    request(`/review/${token}/comments/${id}/replies`, { method: 'POST', body });
  let developerReply;
  let clientReply;

  await t.test('developer reply persists with server-authored identity and unchanged status', async () => {
    await tx.user.update({ where: { id: owner.id }, data: { firstName: 'Teszt', lastName: 'Fejlesztő' } });
    const result = await developer(comment.id, ownerToken, { message: '  Javítottam, kérlek nézd meg.  ' });
    assert.equal(result.status, 201);
    developerReply = result.body.reply;
    assert.equal(developerReply.authorName, 'Teszt Fejlesztő');
    assert.equal(developerReply.authorType, 'DEVELOPER');
    assert.equal(developerReply.message, 'Javítottam, kérlek nézd meg.');
    assert.ok(!Object.hasOwn(developerReply, 'authorId'));
    assert.ok(!Object.hasOwn(developerReply, 'reviewLinkId'));
    const stored = await tx.commentReply.findUnique({ where: { id: developerReply.id } });
    assert.equal(stored.authorId, owner.id);
    assert.equal(stored.reviewLinkId, null);
    assert.equal((await tx.comment.findUnique({ where: { id: comment.id } })).status, 'RESOLVED');
  });

  await t.test('guest and foreign developers cannot use the protected reply endpoint', async () => {
    for (const token of [undefined, rawGuestToken, 'invalid']) {
      assert.equal((await developer(comment.id, token)).status, 401);
    }
    assert.equal((await developer(comment.id, outsiderToken)).status, 404);
    assert.equal((await developer(otherComment.id, ownerToken)).status, 404);
    assert.equal((await developer(randomUUID(), ownerToken)).status, 404);
    assert.equal((await developer(comment.id, memberToken)).status, 201);
  });

  await t.test('guest replies are scoped to the exact round, not merely the project', async () => {
    const otherVersionComment = await tx.comment.create({ data: {
      reviewRoundId: emptyRound.id, comment: 'Another version', pathname: '/test', tagName: 'h1',
      viewportWidth: 1280, viewportHeight: 800, elementX: 0, elementY: 0, elementWidth: 100, elementHeight: 30,
    } });
    assert.equal((await guest(otherVersionComment.id)).status, 404);
    assert.equal((await guest(otherComment.id)).status, 404);
    assert.equal((await guest(randomUUID())).status, 404);
    const result = await guest(comment.id, rawGuestToken, { message: '<img src=x onerror=alert(1)>\nÍgy már jó.' });
    assert.equal(result.status, 201);
    clientReply = result.body.reply;
    assert.equal(clientReply.authorType, 'CLIENT');
    assert.equal(clientReply.authorName, 'Ügyfél');
    const stored = await tx.commentReply.findUnique({ where: { id: clientReply.id } });
    assert.equal(stored.authorId, null);
    assert.equal(stored.reviewLinkId, link.id);
    assert.equal((await tx.comment.findUnique({ where: { id: comment.id } })).status, 'RESOLVED');
  });

  await t.test('any valid guest link for the same round can join the conversation', async () => {
    const token = randomBytes(32).toString('hex');
    await tx.reviewLink.create({ data: { reviewRoundId: round.id, tokenHash: createHash('sha256').update(token).digest('hex') } });
    assert.equal((await guest(comment.id, token)).status, 201);
  });

  await t.test('expired, revoked, unknown and malformed guest links cannot reply', async () => {
    for (const settings of [{ isActive: false }, { expiresAt: new Date(Date.now() - 60000) }]) {
      const token = randomBytes(32).toString('hex');
      await tx.reviewLink.create({ data: {
        reviewRoundId: round.id, tokenHash: createHash('sha256').update(token).digest('hex'), ...settings,
      } });
      assert.equal((await guest(comment.id, token)).status, 410);
    }
    assert.equal((await guest(comment.id, randomBytes(32).toString('hex'))).status, 404);
    assert.equal((await guest(comment.id, 'not-a-review-token')).status, 404);
  });

  await t.test('both reply endpoints reject invalid input and author/status impersonation', async () => {
    const before = await tx.commentReply.count({ where: { commentId: comment.id } });
    for (const body of [{}, { message: ' ' }, { message: 123 }, { message: 'x'.repeat(5001) },
      { message: '\0' }, { message: 'text', authorType: 'DEVELOPER' },
      { message: 'text', authorName: 'Impersonation' }, { message: 'text', authorId: owner.id },
      { message: 'text', status: 'OPEN' }]) {
      assert.equal((await developer(comment.id, ownerToken, body)).status, 400);
      assert.equal((await guest(comment.id, rawGuestToken, body)).status, 400);
    }
    assert.equal((await developer('bad-id', ownerToken)).status, 400);
    assert.equal((await guest('bad-id')).status, 400);
    assert.equal(await tx.commentReply.count({ where: { commentId: comment.id } }), before);
    assert.equal((await guest(comment.id, rawGuestToken, { message: 'x'.repeat(5000) })).status, 201);
  });

  await t.test('developer and public comment reads restore the same ordered, safe reply data', async () => {
    const privateRead = await request(`/rounds/${round.id}/comments`, { token: ownerToken });
    const publicRead = await request(`/review/${rawGuestToken}/comments?pathname=/test`);
    const replies = privateRead.body.comments.find((item) => item.id === comment.id).replies;
    assert.deepEqual(publicRead.body.comments.find((item) => item.id === comment.id).replies, replies);
    assert.ok(replies.some((item) => item.id === developerReply.id));
    assert.ok(replies.some((item) => item.id === clientReply.id));
    const sorted = [...replies].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
    assert.deepEqual(replies, sorted);
    replies.forEach((reply) => {
      assert.ok(!Object.hasOwn(reply, 'authorId'));
      assert.ok(!Object.hasOwn(reply, 'reviewLinkId'));
    });
    assert.ok(!JSON.stringify(replies).includes(rawGuestToken));
    const resolved = await request(`/comments/${comment.id}`, { token: ownerToken, method: 'PATCH', body: { status: 'RESOLVED' } });
    assert.deepEqual(resolved.body.comment.replies, replies);
    assert.equal((await tx.reviewRound.findUnique({ where: { id: round.id } })).status, 'DRAFT');
  });
};
