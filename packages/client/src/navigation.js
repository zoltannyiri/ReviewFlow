export const observePathname = ({ onChange, windowRef = window }) => {
  const history = windowRef.history;
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  let pathname = windowRef.location.pathname;
  let destroyed = false;

  const notify = () => {
    if (destroyed || windowRef.location.pathname === pathname) return;
    const previousPathname = pathname;
    pathname = windowRef.location.pathname;
    onChange?.({ pathname, previousPathname });
  };
  const wrappedPushState = function (...args) {
    const result = originalPushState.apply(this, args);
    notify();
    return result;
  };
  const wrappedReplaceState = function (...args) {
    const result = originalReplaceState.apply(this, args);
    notify();
    return result;
  };
  const handlePopState = () => notify();

  history.pushState = wrappedPushState;
  history.replaceState = wrappedReplaceState;
  windowRef.addEventListener('popstate', handlePopState);

  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      windowRef.removeEventListener('popstate', handlePopState);
      if (history.pushState === wrappedPushState) history.pushState = originalPushState;
      if (history.replaceState === wrappedReplaceState) history.replaceState = originalReplaceState;
    },
  };
};
