export const isLocalHost = (hostname) => ['localhost', '127.0.0.1', '[::1]'].includes(hostname);

export const parseTargetUrl = (value) => {
  if (typeof value !== 'string' || value.length > 2048) throw new Error('INVALID_TARGET_URL');
  let url;
  try { url = new URL(value.trim()); } catch { throw new Error('INVALID_TARGET_URL'); }
  if (url.username || url.password ||
      (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLocalHost(url.hostname)))) {
    throw new Error('INVALID_TARGET_URL');
  }
  url.searchParams.delete('rf_session');
  return url;
};

export const isAllowedOrigin = (origin, project, targetUrl) => {
  let target;
  try { target = parseTargetUrl(targetUrl); } catch { return false; }
  const domains = project.allowedDomains || [];
  if (!domains.length) return origin === target.origin;
  return domains.some((domain) => {
    if (typeof domain !== 'string') return false;
    if (domain.includes('://')) {
      try { return origin === parseTargetUrl(domain).origin; } catch { return false; }
    }
    // Legacy hostnames authorize only the round's exact origin, never subdomains.
    return (domain === target.hostname || domain === target.host) && origin === target.origin;
  });
};

export const frontendOrigin = () => {
  try { return new URL(process.env.FRONTEND_URL).origin; } catch { return null; }
};
