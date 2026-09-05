// Copyright (c) 2026 FC Auggen Manager. All rights reserved. Copying or duplication is prohibited.


import { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '../lib/apiClient';

export interface DashboardData {
  pflichtspiele: any[];
  spielberichte: any[];
  spieler: any[];
  verletzungen: any[];
  budget: any[];
  fetchedAt: string;
}

interface UseDashboardDataResult {
  data: DashboardData;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

const EMPTY: DashboardData = {
  pflichtspiele: [],
  spielberichte: [],
  spieler: [],
  verletzungen: [],
  budget: [],
  fetchedAt: '',
};

export function useDashboardData(intervalMs = 10_000): UseDashboardDataResult {
  const [data, setData] = useState<DashboardData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const mountedRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/dashboard?_t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: DashboardData = await res.json();
      if (!mountedRef.current) return;
      setData(json);
      setError(null);
      setLastUpdated(new Date());
    } catch (err: any) {
      if (!mountedRef.current) return;
      const msg = err?.message || 'Unbekannter Fehler';
      setError(msg);
      try {
        await apiFetch('/api/naomi/report-error', {
          method: 'POST',
          body: JSON.stringify({ source: 'useDashboardData', message: msg, timestamp: new Date().toISOString() }),
        });
      } catch { /* ignore */ }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    timerRef.current = setInterval(fetchData, intervalMs);
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchData, intervalMs]);

  return { data, loading, error, lastUpdated, refresh: fetchData };
}
