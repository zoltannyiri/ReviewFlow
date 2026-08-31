import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

const calls = [];
mock.module('../src/services/commentService.js', {
  namedExports: {
    getDeveloperComments: async (args) => {
      calls.push(args);
      return { reviewRound: { id: args.reviewRoundId }, comments: [] };
    },
    resolveComment: async (args) => {
      calls.push(args);
      return { id: args.commentId, status: 'RESOLVED' };
    },
  },
});
const { list, update } = await import('../src/controllers/developerCommentController.js');
const id = '11111111-1111-4111-8111-111111111111';
const invoke = async (handler, paramsId, body) => {
  const res = {
    status(value) { this.code = value; return this; },
    json(value) { this.body = value; return this; },
  };
  await handler({ params: { id: paramsId }, user: { id: 'authenticated-user' }, body }, res);
  return res;
};

test('invalid UUIDs return 400 before reaching either service', async () => {
  for (const invalid of ['bad-id', '123', `${id}extra`, undefined]) {
    const before = calls.length;
    assert.equal((await invoke(list, invalid)).code, 400);
    assert.equal((await invoke(update, invalid, { status: 'RESOLVED' })).code, 400);
    assert.equal(calls.length, before);
  }
});

test('unsupported states and mass-assignment payloads are rejected', async () => {
  for (const body of [undefined, null, [], {}, { status: 'OPEN' }, { status: 'REOPENED' },
    { status: 1 }, { status: ['RESOLVED'] }, { status: 'resolved' },
    { status: 'RESOLVED', reviewRoundId: id }, { status: 'RESOLVED', comment: 'replace' }]) {
    const before = calls.length;
    assert.equal((await invoke(update, id, body)).code, 400);
    assert.equal(calls.length, before);
  }
});

test('resolve uses authenticated identity and returns the persisted comment', async () => {
  const res = await invoke(update, id, { status: 'RESOLVED' });
  assert.equal(res.code, 200);
  assert.deepEqual(calls.at(-1), { userId: 'authenticated-user', commentId: id });
  assert.deepEqual(res.body, { success: true, comment: { id, status: 'RESOLVED' } });
});

test('list uses authenticated identity and returns round metadata', async () => {
  const res = await invoke(list, id);
  assert.equal(res.code, 200);
  assert.deepEqual(calls.at(-1), { userId: 'authenticated-user', reviewRoundId: id });
  assert.deepEqual(res.body.comments, []);
});
