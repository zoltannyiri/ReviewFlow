import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTargetUrl, isAllowedOrigin, normalizeAllowedOrigins } from '../src/utils/projectUrl.js';

test('project URL normalization preserves paths, queries and fragments and strips old sessions', () => {
  const url = parseTargetUrl(' HTTPS://Demo.Vercel.App/shop?q=one&rf_session=old#details ');
  assert.equal(url.origin, 'https://demo.vercel.app');
  assert.equal(url.searchParams.get('q'), 'one');
  assert.equal(url.searchParams.has('rf_session'), false);
  assert.equal(url.hash, '#details');
});
test('external URLs require HTTPS, forbid credentials and executable protocols', () => {
  for (const input of [null, 42, '', '//example.com', 'javascript:alert(1)', 'data:text/html,x',
    'https://user:password@example.com', 'http://example.com', 'https://' + 'x'.repeat(2048)]) {
    assert.throws(() => parseTargetUrl(input));
  }
  for (const url of ['http://localhost:5173/test', 'http://127.0.0.1:5000', 'http://[::1]:5173']) {
    assert.ok(parseTargetUrl(url));
  }
});
test('allowed origins are exact, never Vercel wildcards or hostname suffix matches', () => {
  const project = { allowedDomains: ['https://demo.vercel.app'] };
  const target = 'https://demo.vercel.app/test';
  assert.equal(isAllowedOrigin('https://demo.vercel.app', project, target), true);
  for (const origin of ['null', 'http://demo.vercel.app', 'https://demo.vercel.app:8443',
    'https://other.vercel.app', 'https://demo.vercel.app.evil.test']) {
    assert.equal(isAllowedOrigin(origin, project, target), false);
  }
});
test('legacy empty and hostname allowlists authorize only the exact round origin', () => {
  for (const allowedDomains of [[], ['localhost']]) {
    assert.equal(isAllowedOrigin('http://localhost:5173', { allowedDomains }, 'http://localhost:5173/test'), true);
    assert.equal(isAllowedOrigin('http://localhost:5174', { allowedDomains }, 'http://localhost:5173/test'), false);
  }
});
test('allowed origin input is normalized, deduplicated and bounded', () => {
  assert.deepEqual(normalizeAllowedOrigins([
    'https://Demo.Vercel.App/path?q=1',
    'https://demo.vercel.app/other',
    'http://localhost:5173/app',
  ]), ['https://demo.vercel.app', 'http://localhost:5173']);
  for (const values of [[], ['http://public.test'], ['https://user:secret@example.com'],
    Array.from({ length: 21 }, (_, index) => `https://app-${index}.test`)]) {
    assert.throws(() => normalizeAllowedOrigins(values));
  }
  assert.deepEqual(normalizeAllowedOrigins([], { allowEmpty: true }), []);
});
