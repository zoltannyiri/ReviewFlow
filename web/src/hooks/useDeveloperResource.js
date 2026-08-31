import { useEffect, useState } from 'react';

export const useDeveloperResource = (client, path, onSessionExpired) => {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState(null);
  const key = `${path}:${revision}`;

  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();

    client.get(path, { signal: controller.signal }).then(({ data }) => {
      if (!controller.signal.aborted) setResult({ key, data, error: '' });
    }).catch((error) => {
      if (controller.signal.aborted) return;
      if (error.response?.status === 401) {
        onSessionExpired();
        return;
      }
      setResult({
        key, data: null,
        error: error.response?.status === 404
          ? 'A kért review kör nem található, vagy nincs hozzáférésed.'
          : 'Az adatokat nem sikerült betölteni. Próbáld újra.',
      });
    });

    return () => controller.abort();
  }, [client, path, key, onSessionExpired]);

  return {
    data: result?.key === key ? result.data : null,
    error: result?.key === key ? result.error : '',
    loading: Boolean(path && result?.key !== key),
    refresh: () => setRevision((value) => value + 1),
    setData: (update) => setResult((current) => current?.key === key
      ? { ...current, data: update(current.data) } : current),
  };
};
