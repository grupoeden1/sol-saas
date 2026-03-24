'use client';

import { useState, useEffect, type ReactNode } from 'react';

const PERIODS = ['7d', '30d', '60d', '90d'] as const;
const GRANULARITIES = [
  { value: 'day', label: 'Dia' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mês' },
] as const;

export interface MetricDataPoint {
  date: string;
  value: number;
  secondary?: number;
  label?: string;
}

interface ChartContainerProps {
  title: string;
  metric: string;
  children: (data: MetricDataPoint[]) => ReactNode;
}

export default function ChartContainer({ title, metric, children }: ChartContainerProps) {
  const [period, setPeriod] = useState<string>('30d');
  const [granularity, setGranularity] = useState<string>('day');
  const [data, setData] = useState<MetricDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);

    fetch(`/api/admin/metrics/${metric}?period=${period}&granularity=${granularity}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error('fetch failed');
        return res.json();
      })
      .then((json) => {
        setData(json.data ?? []);
        setLoading(false);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(true);
        setData([]);
        setLoading(false);
      });

    return () => controller.abort();
  }, [metric, period, granularity]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
        <div className="flex gap-1.5">
          {/* Period selector */}
          <div className="flex rounded-lg border border-zinc-700 bg-zinc-800/50 p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
                  period === p
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          {/* Granularity selector */}
          <div className="flex rounded-lg border border-zinc-700 bg-zinc-800/50 p-0.5">
            {GRANULARITIES.map((g) => (
              <button
                key={g.value}
                onClick={() => setGranularity(g.value)}
                className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
                  granularity === g.value
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-[300px]">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center text-sm text-red-400/70">
            Erro ao carregar dados
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-600">
              <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M7 16l4-4 4 4 5-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-xs text-zinc-500">Sem dados para o período selecionado</span>
          </div>
        ) : (
          children(data)
        )}
      </div>
    </div>
  );
}
