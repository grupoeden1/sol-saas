'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { MetricDataPoint } from './chart-container';

function formatBRL(cents: number): string {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

export default function RevenueChart({ data }: { data: MetricDataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
        <XAxis dataKey="date" tick={{ fill: '#a1a1aa', fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => formatBRL(v)} />
        <Tooltip
          contentStyle={{ backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#a1a1aa' }}
          formatter={(value) => [formatBRL(Number(value)), 'Faturamento']}
        />
        <Bar
          dataKey="value"
          name="Faturamento"
          fill="#f59e0b"
          radius={[4, 4, 0, 0]}
          animationDuration={300}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
