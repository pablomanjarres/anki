import { useCallback, useEffect, useState } from 'react';

export function useResource<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion(value => value + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    load().then(value => { if (active) setData(value); })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Could not load data.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load, version]);

  return { data, error, loading, reload };
}
