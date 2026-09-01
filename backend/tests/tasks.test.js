import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

const calls = [];
mock.module('../src/services/taskService.js', {
  namedExports: {
    VALID_TASK_STATUSES: ['TODO', 'IN_PROGRESS', 'ON_HOLD', 'DONE'],
    getRoundTasks: async (args) => {
      calls.push({ action: 'getRoundTasks', ...args });
      return { reviewRound: { id: args.reviewRoundId }, tasks: [] };
    },
    getTaskById: async (args) => {
      calls.push({ action: 'getTaskById', ...args });
      return { id: args.taskId, status: 'TODO' };
    },
    updateTask: async (args) => {
      calls.push({ action: 'updateTask', ...args });
      return {
        id: args.taskId,
        status: args.status,
        position: args.position,
        title: args.title,
        comment: {
          id: 'mock-comment-id',
          status: args.status === 'DONE' ? 'RESOLVED' : 'OPEN',
        },
      };
    },
  },
});

const { listByRound, getOne, update } = await import('../src/controllers/taskController.js');

const validUuid = '11111111-1111-4111-8111-111111111111';
const invoke = async (handler, paramsId, body) => {
  const res = {
    statusCode: 200,
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; },
  };
  await handler({ params: { id: paramsId }, user: { id: 'auth-user-123' }, body }, res);
  return res;
};

test('task controller rejects invalid UUIDs with 400', async () => {
  for (const invalid of ['bad-uuid', '1234', '', undefined]) {
    const before = calls.length;
    assert.equal((await invoke(listByRound, invalid)).statusCode, 400);
    assert.equal((await invoke(getOne, invalid)).statusCode, 400);
    assert.equal((await invoke(update, invalid, { status: 'IN_PROGRESS' })).statusCode, 400);
    assert.equal(calls.length, before);
  }
});

test('task controller validates status values', async () => {
  for (const invalidStatus of ['INVALID', 'open', 'resolved', 'todo', 123, null]) {
    const before = calls.length;
    const res = await invoke(update, validUuid, { status: invalidStatus });
    assert.equal(res.statusCode, 400);
    assert.equal(calls.length, before);
  }
});

test('task controller allows valid statuses and passes authenticated user', async () => {
  for (const validStatus of ['TODO', 'IN_PROGRESS', 'ON_HOLD', 'DONE']) {
    const res = await invoke(update, validUuid, { status: validStatus });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.task.status, validStatus);
    const lastCall = calls.at(-1);
    assert.equal(lastCall.action, 'updateTask');
    assert.equal(lastCall.userId, 'auth-user-123');
    assert.equal(lastCall.taskId, validUuid);
    assert.equal(lastCall.status, validStatus);
  }
});

test('task controller listByRound retrieves tasks for authenticated user', async () => {
  const res = await invoke(listByRound, validUuid);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.deepEqual(res.body.tasks, []);
  const lastCall = calls.at(-1);
  assert.equal(lastCall.action, 'getRoundTasks');
  assert.equal(lastCall.userId, 'auth-user-123');
  assert.equal(lastCall.reviewRoundId, validUuid);
});
