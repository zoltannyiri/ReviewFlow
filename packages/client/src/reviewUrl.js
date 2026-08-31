export const buildReviewTarget = (targetUrl, token) => {
  const url = new URL(targetUrl);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Invalid review URL');
  }
  url.searchParams.set('rf_session', token);
  return url.href;
};
