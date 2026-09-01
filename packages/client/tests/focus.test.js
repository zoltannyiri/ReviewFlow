import test from 'node:test';
import assert from 'node:assert/strict';
import { readReviewFocus, removeReviewFocusFromUrl } from '../src/reviewSession.js';
import { buildReviewTarget } from '../src/reviewUrl.js';

test('readReviewFocus extracts rf_focus query parameter', () => {
  const location = { href: 'https://site.test/tours?rf_session=token123&rf_focus=comment-456#section' };
  assert.equal(readReviewFocus({ location }), 'comment-456');

  const withoutFocus = { href: 'https://site.test/tours?rf_session=token123' };
  assert.equal(readReviewFocus({ location: withoutFocus }), null);
});

test('removeReviewFocusFromUrl deletes rf_focus while preserving path, params and hash', () => {
  const location = { href: 'https://site.test/tours?page=2&rf_focus=comment-456&theme=dark#hero' };
  let replaced;
  const history = {
    state: { nav: 1 },
    replaceState: (state, title, href) => { replaced = { state, title, href }; },
  };

  removeReviewFocusFromUrl({ history, location });
  assert.deepEqual(replaced, {
    state: { nav: 1 },
    title: '',
    href: 'https://site.test/tours?page=2&theme=dark#hero',
  });
});

test('buildReviewTarget supports focusCommentId and pathname options', () => {
  const url = buildReviewTarget('https://turazzvelunk.vercel.app', 'temp-token-xyz', {
    pathname: '/turak',
    focusCommentId: 'comment-abc',
  });
  const parsed = new URL(url);
  assert.equal(parsed.pathname, '/turak');
  assert.equal(parsed.searchParams.get('rf_session'), 'temp-token-xyz');
  assert.equal(parsed.searchParams.get('rf_focus'), 'comment-abc');
});
