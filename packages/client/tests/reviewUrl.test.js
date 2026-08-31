import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReviewTarget } from '../src/reviewUrl.js';

test('review URL preserves query/hash and replaces a pre-existing session once', () => {
  const url = new URL(buildReviewTarget('https://demo.vercel.app/shop?lang=hu&rf_session=old#pricing', 'new token'));
  assert.equal(url.searchParams.get('lang'), 'hu');
  assert.deepEqual(url.searchParams.getAll('rf_session'), ['new token']);
  assert.equal(url.hash, '#pricing');
});
test('review URL rejects executable and credential-bearing destinations', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,x', 'https://user:pass@example.com', '/relative']) {
    assert.throws(() => buildReviewTarget(url, 'token'));
  }
});
