import api from './api.js';

// Authorization is attached only to developer requests, never to shared
// axios defaults or public review requests. Tokens are kept in React memory.
export const createDeveloperApi = (accessToken) => {
  const headers = { Authorization: `Bearer ${accessToken}` };
  return {
    post(path, body, { signal } = {}) {
      return api.post(path, body, { headers, signal });
    },
    remove(path, { signal } = {}) {
      return api.delete(path, { headers, signal });
    },
    get(path, { signal } = {}) {
      return api.get(path, { headers, signal });
    },
    patch(path, body, { signal } = {}) {
      return api.patch(path, body, { headers, signal });
    },
    resolveComment(id, { signal } = {}) {
      return api.patch(`/comments/${encodeURIComponent(id)}`, {
        status: 'RESOLVED',
      }, { headers, signal });
    },
    replyToComment(id, message, { signal } = {}) {
      return api.post(`/comments/${encodeURIComponent(id)}/replies`, {
        message,
      }, { headers, signal });
    },
  };
};
