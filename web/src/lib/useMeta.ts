import { useEffect, useState } from "react";

export type Meta = {
  instanceName: string;
  pokemonNumber: number;
  pokemonName: string;
  branch: string;
  dbPath: string;
  nodeVersion: string;
  environment: string;
};

export function useMeta(): {
  meta: Meta | null;
  loading: boolean;
  error: string | null;
} {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/meta")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Meta>;
      })
      .then(setMeta)
      .catch(() => setError("Failed to load meta"))
      .finally(() => setLoading(false));
  }, []);

  return { meta, loading, error };
}
