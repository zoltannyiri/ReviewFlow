import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

const calls = [];
let failure = null;
const record = async (args) => {
  if (failure) throw new Error(failure);
  calls.push(args);
  return { id: 'reply', message: args.message };
};
mock.module('../src/services/commentReplyService.js', {
  namedExports: { createDeveloperReply: record, createGuestReply: record },
});
const { createDeveloper, createGuest } = await import('../src/controllers/commentReplyController.js');
const commentId = '11111111-1111-4111-8111-111111111111';
const user = { id: 'authenticated-user', firstName: 'Teszt' };
const invoke = async (handler, body, id = commentId) => {
  const response = {
    status(code) { this.code = code; return this; },
    json(value) { this.body = value; return this; },
  };
  await handler({ user, params: { id, token: 'guest-token' }, body }, response);
  return response;
};

test('reply endpoints reject invalid IDs before using services', async () => {
  const before = calls.length;
  for (const handler of [createDeveloper, createGuest]) {
    for (const id of ['bad-id', '123', `${commentId}extra`]) {
      assert.equal((await invoke(handler, { message: 'hello' }, id)).code, 400);
    }
  }
  assert.equal(calls.length, before);
});

test('reply endpoints reject blank, oversized, non-text and forged-author payloads', async () => {
  const before = calls.length;
  for (const handler of [createDeveloper, createGuest]) {
    for (const body of [undefined, null, [], {}, { message: '' }, { message: '  \n ' },
      { message: 1 }, { message: ['text'] }, { message: 'x'.repeat(5001) }, { message: '\0' },
      { message: 'ok', authorType: 'DEVELOPER' }, { message: 'ok', authorName: 'Someone' },
      { message: 'ok', authorId: commentId }, { message: 'ok', status: 'RESOLVED' }]) {
      assert.equal((await invoke(handler, body)).code, 400);
    }
  }
  assert.equal(calls.length, before);
});

test('developer identity comes from middleware, guest identity from the URL token', async () => {
  assert.equal((await invoke(createDeveloper, { message: 'Reply' })).code, 201);
  assert.deepEqual(calls.at(-1), { user, commentId, message: 'Reply' });
  assert.equal((await invoke(createGuest, { message: 'x'.repeat(5000) })).code, 201);
  assert.deepEqual(calls.at(-1), { token: 'guest-token', commentId, message: 'x'.repeat(5000) });
});

test('reply endpoint errors hide foreign comments and explain expired/revoked links', async () => {
  try {
    for (const [code, expected] of [
      ['COMMENT_NOT_FOUND', 404], ['REVIEW_LINK_NOT_FOUND', 404],
      ['REVIEW_LINK_INACTIVE', 410], ['REVIEW_LINK_EXPIRED', 410],
    ]) {
      failure = code;
      assert.equal((await invoke(createGuest, { message: 'Reply' })).code, expected);
    }
  } finally {
    failure = null;
  }
});
