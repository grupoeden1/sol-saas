'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { MetricDataPoint } from './chart-container';

export default function UsersChart({ data }: { data: MetricDataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
        <XAxis dataKey="date" tick={{ fill: '#a1a1aa', fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#a1a1aa' }}
          itemStyle={{ color: '#f59e0b' }}
        />
        <Line
          type="monotone"
          dataKey="value"
          name="Cadastros"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#f59e0b' }}
          animationDuration={300}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
