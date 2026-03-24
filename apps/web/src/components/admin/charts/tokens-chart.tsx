'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { MetricDataPoint } from './chart-container';

function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return String(value);
}

export default function TokensChart({ data }: { data: MetricDataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
        <XAxis dataKey="date" tick={{ fill: '#a1a1aa', fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={formatTokens} />
        <Tooltip
          contentStyle={{ backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#a1a1aa' }}
          formatter={(value) => [formatTokens(Number(value))]}
        />
        <Area
          type="monotone"
          dataKey="value"
          name="Input"
          stackId="tokens"
          stroke="#f59e0b"
          fill="#f59e0b"
          fillOpacity={0.3}
          animationDuration={300}
        />
        <Area
          type="monotone"
          dataKey="secondary"
          name="Output"
          stackId="tokens"
          stroke="#ea580c"
          fill="#ea580c"
          fillOpacity={0.3}
          animationDuration={300}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
