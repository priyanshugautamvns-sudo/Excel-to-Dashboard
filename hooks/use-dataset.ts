"use client";

import { useEffect, useState } from "react";
import { getDataset } from "@/lib/client-store";
import type { StoredDataset } from "@/lib/types";

export function useDataset(id?: string | null) {
  const [dataset, setDataset] = useState<StoredDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getDataset(id)
      .then((loaded) => {
        if (!mounted) return;
        setDataset(loaded);
        setError(loaded ? null : "No dataset found. Upload a file to generate a dashboard.");
      })
      .catch((caught) => {
        if (!mounted) return;
        setError(caught instanceof Error ? caught.message : "Unable to load dataset.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  return { dataset, loading, error };
}
