interface MetricCardProps {
  label: string;
  value: string;
  change: string | null;
}

export default function MetricCard({ label, value, change }: MetricCardProps) {
  const isPositive = change && change.startsWith('+');
  const isNegative = change && change.startsWith('-');

  return (
    <div className="rounded-2xl border border-solar-800/20 bg-background-secondary/40 p-5 backdrop-blur-md transition-all hover:border-solar-500/30 hover:bg-background-secondary/60">
      <p className="text-sm font-medium text-foreground-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold text-solar-300">{value}</p>
      {change && (
        <p className={`mt-2 text-xs ${isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-foreground-muted'}`}>
          {change}
        </p>
      )}
    </div>
  );
}
