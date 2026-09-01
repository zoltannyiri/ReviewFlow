import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearReviewSession, getReviewSessionStorageKey, isRejectedReviewSession,
  readReviewSession, removeReviewSessionFromUrl, storeReviewSession,
} from '../src/reviewSession.js';

const createStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
};

test('URL token wins, then a validated token can be restored from session storage', () => {
  const storage = createStorage();
  const storageKey = getReviewSessionStorageKey({
    apiUrl: 'https://api.reviewflow.test/api', projectKey: 'public-key', baseUrl: 'https://site.test/',
  });
  const location = { href: 'https://site.test/tours?lang=hu&rf_session=url-token#top' };
  assert.deepEqual(readReviewSession({ storage, storageKey, location }), { token: 'url-token', source: 'url' });
  storeReviewSession({ token: 'validated-token', storage, storageKey });
  location.href = 'https://site.test/tours?lang=hu#top';
  assert.deepEqual(readReviewSession({ storage, storageKey, location }), { token: 'validated-token', source: 'storage' });
});

test('session URL cleanup preserves pathname, other query parameters and hash', () => {
  const location = { href: 'https://site.test/tours?lang=hu&rf_session=secret#details' };
  let replaced;
  const history = { state: { app: true }, replaceState: (state, title, href) => { replaced = { state, title, href }; } };
  removeReviewSessionFromUrl({ history, location });
  assert.deepEqual(replaced, {
    state: { app: true }, title: '', href: 'https://site.test/tours?lang=hu#details',
  });
});

test('only the active invalid token is removed and rejection statuses are explicit', () => {
  const storage = createStorage();
  const storageKey = 'reviewflow.session:test';
  storeReviewSession({ token: 'new-token', storage, storageKey });
  clearReviewSession({ token: 'old-token', storage, storageKey });
  assert.equal(storage.getItem(storageKey), 'new-token');
  clearReviewSession({ token: 'new-token', storage, storageKey });
  assert.equal(storage.getItem(storageKey), null);
  for (const status of [403, 404, 410]) assert.equal(isRejectedReviewSession({ status }), true);
  for (const status of [undefined, 400, 500]) assert.equal(isRejectedReviewSession({ status }), false);
});
