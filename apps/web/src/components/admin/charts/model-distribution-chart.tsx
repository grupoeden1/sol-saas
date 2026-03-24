'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { MetricDataPoint } from './chart-container';

function shortModelName(model: string): string {
  if (model.includes('sonnet')) return 'Sonnet';
  if (model.includes('haiku')) return 'Haiku';
  if (model.includes('gpt-4o-mini')) return 'GPT-4o-mini';
  if (model.includes('gpt-4o')) return 'GPT-4o';
  return model;
}

interface PivotedRow {
  date: string;
  [model: string]: number | string;
}

export default function ModelDistributionChart({ data }: { data: MetricDataPoint[] }) {
  const { pivoted, models } = useMemo(() => {
    const modelSet = new Set<string>();
    const dateMap = new Map<string, Record<string, number>>();

    for (const point of data) {
      const model = shortModelName(point.label ?? 'unknown');
      modelSet.add(model);
      const existing = dateMap.get(point.date) ?? {};
      existing[model] = (existing[model] ?? 0) + point.value;
      dateMap.set(point.date, existing);
    }

    const models = Array.from(modelSet).sort();
    const pivoted: PivotedRow[] = Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ date, ...counts }));

    return { pivoted, models };
  }, [data]);

  const COLORS: Record<string, string> = {
    'Sonnet': '#f59e0b',
    'Haiku': '#fb923c',
    'GPT-4o': '#60a5fa',
    'GPT-4o-mini': '#93c5fd',
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={pivoted}>
        <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
        <XAxis dataKey="date" tick={{ fill: '#a1a1aa', fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#a1a1aa' }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }} />
        {models.map((model) => (
          <Bar
            key={model}
            dataKey={model}
            stackId="models"
            fill={COLORS[model] ?? '#71717a'}
            radius={[2, 2, 0, 0]}
            animationDuration={300}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
