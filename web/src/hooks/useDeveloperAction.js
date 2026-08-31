import { useEffect, useRef, useState } from 'react';

export const useDeveloperAction = (onSessionExpired) => {
  const active = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => () => active.current?.abort(), []);
  const run = async (request, onSuccess) => {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError('');
    try {
      const { data } = await request(controller.signal);
      if (!controller.signal.aborted) onSuccess(data);
    } catch (failure) {
      if (controller.signal.aborted) return;
      const status = failure.response?.status;
      if (status === 401) onSessionExpired();
      else setError(status === 400
        ? 'Ellenőrizd a megadott adatokat, a HTTPS-címet és az engedélyezett domaint.'
        : status === 403 || status === 404
          ? 'Az erőforrás nem érhető el, vagy nincs hozzáférésed.'
          : 'A művelet eredménye nem erősíthető meg. Újrapróbálás előtt frissítsd a listát, nehogy kétszer hozd létre.');
    } finally {
      active.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  };
  return { run, busy, error };
};
