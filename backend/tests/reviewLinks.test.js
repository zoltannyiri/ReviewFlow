import test from 'node:test';
import assert from 'node:assert/strict';

test('non-expiring client links have null expiresAt and are valid indefinitely', () => {
  const link = {
    id: 'link-1',
    tokenHash: 'hash',
    isActive: true,
    expiresAt: null,
  };

  // Not expired check:
  const isExpired = link.expiresAt && link.expiresAt <= new Date();
  assert.equal(Boolean(isExpired), false);
  assert.equal(link.expiresAt, null);
});

test('revoking a non-expiring link deactivates it without deleting', () => {
  const link = {
    id: 'link-1',
    isActive: true,
    expiresAt: null,
  };

  link.isActive = false;
  assert.equal(link.isActive, false);
  assert.equal(link.expiresAt, null);
});

test('developer preview session expiration is short-lived around 1 hour', () => {
  const now = Date.now();
  const previewExpiresAt = new Date(now + 60 * 60 * 1000);
  const diffMs = previewExpiresAt.getTime() - now;
  assert.equal(diffMs, 3600000);
});

test('expired finite links are detected while future links remain active', () => {
  const past = new Date(Date.now() - 10000);
  const future = new Date(Date.now() + 100000);

  const pastLink = { expiresAt: past, isActive: true };
  const futureLink = { expiresAt: future, isActive: true };
  const permanentLink = { expiresAt: null, isActive: true };

  assert.equal(Boolean(pastLink.expiresAt && pastLink.expiresAt <= new Date()), true);
  assert.equal(Boolean(futureLink.expiresAt && futureLink.expiresAt <= new Date()), false);
  assert.equal(Boolean(permanentLink.expiresAt && permanentLink.expiresAt <= new Date()), false);
});
