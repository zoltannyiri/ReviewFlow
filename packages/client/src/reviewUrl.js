export const buildReviewTarget = (targetUrl, token, { focusCommentId, pathname } = {}) => {
  const url = new URL(targetUrl);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Invalid review URL');
  }
  if (pathname) {
    url.pathname = pathname.startsWith('/') ? pathname : `/${pathname}`;
  }
  url.searchParams.set('rf_session', token);
  if (focusCommentId) {
    url.searchParams.set('rf_focus', focusCommentId);
  }
  return url.href;
};
