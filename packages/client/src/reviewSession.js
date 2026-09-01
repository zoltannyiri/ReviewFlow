const SESSION_PARAMETER = 'rf_session';
const FOCUS_PARAMETER = 'rf_focus';

export const getReviewSessionStorageKey = ({ apiUrl, projectKey, baseUrl = window.location.href }) => {
  const origin = new URL(apiUrl, baseUrl).origin;
  return `reviewflow.session:${origin}:${projectKey || 'legacy'}`;
};

export const readReviewSession = ({ storage = window.sessionStorage, storageKey, location = window.location }) => {
  const urlToken = new URL(location.href).searchParams.get(SESSION_PARAMETER);
  if (urlToken) return { token: urlToken, source: 'url' };
  try {
    const storedToken = storage.getItem(storageKey);
    return storedToken ? { token: storedToken, source: 'storage' } : null;
  } catch {
    return null;
  }
};

export const storeReviewSession = ({ token, storage = window.sessionStorage, storageKey }) => {
  try { storage.setItem(storageKey, token); } catch { /* Storage may be unavailable. */ }
};

export const clearReviewSession = ({ token, storage = window.sessionStorage, storageKey }) => {
  try {
    if (!token || storage.getItem(storageKey) === token) storage.removeItem(storageKey);
  } catch { /* Storage may be unavailable. */ }
};

export const removeReviewSessionFromUrl = ({ history = window.history, location = window.location }) => {
  const url = new URL(location.href);
  if (!url.searchParams.has(SESSION_PARAMETER)) return;
  url.searchParams.delete(SESSION_PARAMETER);
  history.replaceState(history.state, '', url.href);
};

export const readReviewFocus = ({ location = window.location } = {}) => {
  return new URL(location.href).searchParams.get(FOCUS_PARAMETER);
};

export const removeReviewFocusFromUrl = ({ history = window.history, location = window.location } = {}) => {
  const url = new URL(location.href);
  if (!url.searchParams.has(FOCUS_PARAMETER)) return;
  url.searchParams.delete(FOCUS_PARAMETER);
  history.replaceState(history.state, '', url.href);
};

export const isRejectedReviewSession = (error) => [403, 404, 410].includes(error?.status);
