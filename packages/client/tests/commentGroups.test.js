import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCommentGroupKey, getCommentGroupTitle, groupComments,
} from '../src/commentGroups.js';

const comment = (overrides = {}) => ({
  id: 'one', pathname: '/test', tagName: 'h1',
  reviewElementId: null, elementId: null,
  elementX: 10.5, elementY: 20, elementWidth: 200, elementHeight: 40,
  viewportWidth: 1280, viewportHeight: 720,
  ...overrides,
});

test('review IDs group comments even when DOM IDs, text and coordinates change', () => {
  const first = comment({ reviewElementId: 'hero', elementId: 'old' });
  const second = comment({ id: 'two', reviewElementId: 'hero', elementId: 'new',
    elementX: 100, elementText: 'New heading' });
  assert.equal(groupComments([first, second]).length, 1);
});

test('review ID has priority over a shared HTML ID', () => {
  assert.equal(groupComments([
    comment({ reviewElementId: 'a', elementId: 'shared' }),
    comment({ reviewElementId: 'b', elementId: 'shared' }),
  ]).length, 2);
});

test('HTML ID groups comments without review IDs', () => {
  assert.equal(groupComments([
    comment({ elementId: 'cta' }),
    comment({ id: 'two', elementId: 'cta', elementY: 400 }),
  ]).length, 1);
});

test('review IDs and HTML IDs use separate namespaces', () => {
  assert.notEqual(getCommentGroupKey(comment({ reviewElementId: 'hero' })),
    getCommentGroupKey(comment({ elementId: 'hero' })));
});

test('the same target on different pages stays separate', () => {
  assert.equal(groupComments([
    comment({ reviewElementId: 'hero', pathname: '/one' }),
    comment({ reviewElementId: 'hero', pathname: '/two' }),
  ]).length, 2);
});

test('matching saved geometry is grouped without stable IDs', () => {
  assert.equal(groupComments([comment(), comment({ id: 'two' })]).length, 1);
});

test('geometry fallback distinguishes positions, tags and viewport sizes', () => {
  for (const difference of [
    { elementX: 80 }, { elementY: 90 }, { elementWidth: 220 },
    { elementHeight: 50 }, { tagName: 'button' }, { viewportWidth: 375 },
  ]) {
    assert.notEqual(getCommentGroupKey(comment()),
      getCommentGroupKey(comment(difference)));
  }
});

test('missing coordinates do not lump distinct persisted comments together', () => {
  assert.notEqual(
    getCommentGroupKey(comment({ elementX: null })),
    getCommentGroupKey(comment({ id: 'two', elementX: null }))
  );
});

test('separator characters and quotes cannot collide in group keys', () => {
  assert.notEqual(
    getCommentGroupKey(comment({ pathname: '/a', reviewElementId: 'b:review:c' })),
    getCommentGroupKey(comment({ pathname: '/a:review:b', reviewElementId: 'c' }))
  );
});

test('grouping preserves API order, retains all statuses and does not mutate input', () => {
  const first = Object.freeze(comment({ reviewElementId: 'hero', status: 'OPEN' }));
  const second = Object.freeze(comment({ id: 'two', reviewElementId: 'hero', status: 'RESOLVED' }));
  const input = Object.freeze([first, second]);
  const [group] = groupComments(input);
  assert.deepEqual(group.comments, [first, second]);
  assert.deepEqual(groupComments([]), []);
});

test('panel title uses latest text then stable identity then tag name', () => {
  assert.equal(getCommentGroupTitle({ comments: [comment({ elementText: '  Hero  ' })] }), 'Hero');
  assert.equal(getCommentGroupTitle({ comments: [comment({ reviewElementId: 'hero' })] }), 'hero');
  assert.equal(getCommentGroupTitle({ comments: [comment({ elementId: 'cta' })] }), 'cta');
  assert.equal(getCommentGroupTitle({ comments: [comment()] }), 'h1');
});
