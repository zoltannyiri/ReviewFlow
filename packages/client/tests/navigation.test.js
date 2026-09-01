import test from 'node:test';
import assert from 'node:assert/strict';
import { observePathname } from '../src/navigation.js';

test('pushState, replaceState and popstate report pathname changes and cleanup restores history', () => {
  const listeners = new Map();
  const windowRef = {
    location: { pathname: '/' },
    addEventListener: (name, handler) => listeners.set(name, handler),
    removeEventListener: (name, handler) => { if (listeners.get(name) === handler) listeners.delete(name); },
  };
  const update = (url) => { windowRef.location.pathname = new URL(url, 'https://site.test').pathname; };
  const originalPushState = function (state, title, url) { update(url); };
  const originalReplaceState = function (state, title, url) { update(url); };
  windowRef.history = { pushState: originalPushState, replaceState: originalReplaceState };
  const changes = [];
  const observer = observePathname({ windowRef, onChange: (change) => changes.push(change) });

  windowRef.history.pushState(null, '', '/tours?day=1');
  windowRef.history.replaceState(null, '', '/contact#form');
  windowRef.location.pathname = '/back';
  listeners.get('popstate')();
  assert.deepEqual(changes, [
    { previousPathname: '/', pathname: '/tours' },
    { previousPathname: '/tours', pathname: '/contact' },
    { previousPathname: '/contact', pathname: '/back' },
  ]);

  observer.destroy();
  assert.equal(windowRef.history.pushState, originalPushState);
  assert.equal(windowRef.history.replaceState, originalReplaceState);
  assert.equal(listeners.has('popstate'), false);
  windowRef.history.pushState(null, '', '/after-destroy');
  assert.equal(changes.length, 3);
});
