import api from './api.js';

// Authorization is attached only to developer requests, never to shared
// axios defaults or public review requests. Tokens are kept in React memory.
export const createDeveloperApi = (accessToken) => {
  const headers = { Authorization: `Bearer ${accessToken}` };
  return {
    get(path, { signal } = {}) {
      return api.get(path, { headers, signal });
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
