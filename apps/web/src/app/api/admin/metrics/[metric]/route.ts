import { NextRequest, NextResponse } from 'next/server';
import { prisma, API_PRICING, DEFAULT_MODEL_PRICING } from '@sol/db';
import { auth } from '@/lib/auth';
import { z } from 'zod';

// ─── Validation ──────────────────────────────────────────────────────────────

const METRICS = ['users', 'messages', 'tokens', 'revenue', 'credits', 'api-cost', 'model-distribution'] as const;
const PERIODS = ['7d', '30d', '60d', '90d'] as const;
const GRANULARITIES = ['day', 'week', 'month'] as const;

const querySchema = z.object({
  period: z.enum(PERIODS).default('30d'),
  granularity: z.enum(GRANULARITIES).default('day'),
});

type Metric = (typeof METRICS)[number];
type Granularity = (typeof GRANULARITIES)[number];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function periodToDays(period: string): number {
  return parseInt(period.replace('d', ''), 10);
}

function granToSql(gran: Granularity): string {
  return gran; // 'day' | 'week' | 'month' maps directly to DATE_TRUNC argument
}

interface MetricDataPoint {
  date: string;
  value: number;
  secondary?: number;
  label?: string;
}

// ─── Query functions ─────────────────────────────────────────────────────────

type DateValueRow = { date: Date; value: bigint };
type DateDualRow = { date: Date; value: bigint; secondary: bigint };
type DateLabelRow = { date: Date; value: bigint; label: string | null };

async function queryUsers(days: number, gran: Granularity): Promise<MetricDataPoint[]> {
  const g = granToSql(gran);
  const rows = await prisma.$queryRawUnsafe<DateValueRow[]>(
    `SELECT DATE_TRUNC($1, "createdAt" AT TIME ZONE 'America/Sao_Paulo') AS date,
            COUNT(*)::bigint AS value
     FROM "User"
     WHERE "createdAt" >= NOW() - ($2::int || ' days')::interval
     GROUP BY date ORDER BY date ASC`,
    g, days,
  );
  return rows.map((r) => ({ date: r.date.toISOString().slice(0, 10), value: Number(r.value) }));
}

async function queryMessages(days: number, gran: Granularity): Promise<MetricDataPoint[]> {
  const g = granToSql(gran);

  // Total user messages per period
  const totalRows = await prisma.$queryRawUnsafe<DateValueRow[]>(
    `SELECT DATE_TRUNC($1, m."createdAt" AT TIME ZONE 'America/Sao_Paulo') AS date,
            COUNT(*)::bigint AS value
     FROM "Message" m
     WHERE m.role = 'user'
       AND m."createdAt" >= NOW() - ($2::int || ' days')::interval
     GROUP BY date ORDER BY date ASC`,
    g, days,
  );

  // Consumption transactions with attachments per period (1 tx ≈ 1 message)
  const attachRows = await prisma.$queryRawUnsafe<DateValueRow[]>(
    `SELECT DATE_TRUNC($1, "createdAt" AT TIME ZONE 'America/Sao_Paulo') AS date,
            COUNT(*)::bigint AS value
     FROM "CreditTransaction"
     WHERE type = 'consumption' AND "hasAttachments" = true
       AND "createdAt" >= NOW() - ($2::int || ' days')::interval
     GROUP BY date ORDER BY date ASC`,
    g, days,
  );

  const attachMap = new Map(attachRows.map((r) => [r.date.toISOString().slice(0, 10), Number(r.value)]));

  return totalRows.map((r) => {
    const dateStr = r.date.toISOString().slice(0, 10);
    return {
      date: dateStr,
      value: Number(r.value),
      secondary: attachMap.get(dateStr) ?? 0,
    };
  });
}

async function queryTokens(days: number, gran: Granularity): Promise<MetricDataPoint[]> {
  const g = granToSql(gran);
  const rows = await prisma.$queryRawUnsafe<DateDualRow[]>(
    `SELECT DATE_TRUNC($1, "createdAt" AT TIME ZONE 'America/Sao_Paulo') AS date,
            COALESCE(SUM("inputTokens"), 0)::bigint AS value,
            COALESCE(SUM("outputTokens"), 0)::bigint AS secondary
     FROM "CreditTransaction"
     WHERE type = 'consumption'
       AND "createdAt" >= NOW() - ($2::int || ' days')::interval
     GROUP BY date ORDER BY date ASC`,
    g, days,
  );
  return rows.map((r) => ({
    date: r.date.toISOString().slice(0, 10),
    value: Number(r.value),
    secondary: Number(r.secondary),
  }));
}

async function queryRevenue(days: number, gran: Granularity): Promise<MetricDataPoint[]> {
  const g = granToSql(gran);
  const rows = await prisma.$queryRawUnsafe<DateValueRow[]>(
    `SELECT DATE_TRUNC($1, ct."createdAt" AT TIME ZONE 'America/Sao_Paulo') AS date,
            COALESCE(SUM(cp."priceBrl"), 0)::bigint AS value
     FROM "CreditTransaction" ct
     JOIN "CreditPackage" cp ON ct.amount = cp.credits
     WHERE ct.type = 'purchase' AND ct."stripePaymentId" IS NOT NULL
       AND ct."createdAt" >= NOW() - ($2::int || ' days')::interval
     GROUP BY date ORDER BY date ASC`,
    g, days,
  );
  return rows.map((r) => ({ date: r.date.toISOString().slice(0, 10), value: Number(r.value) }));
}

async function queryCredits(days: number, gran: Granularity): Promise<MetricDataPoint[]> {
  const g = granToSql(gran);
  const rows = await prisma.$queryRawUnsafe<DateDualRow[]>(
    `SELECT DATE_TRUNC($1, "createdAt" AT TIME ZONE 'America/Sao_Paulo') AS date,
            COALESCE(SUM(CASE WHEN type = 'purchase' THEN amount ELSE 0 END), 0)::bigint AS value,
            COALESCE(SUM(CASE WHEN type = 'consumption' THEN ABS(amount) ELSE 0 END), 0)::bigint AS secondary
     FROM "CreditTransaction"
     WHERE "createdAt" >= NOW() - ($2::int || ' days')::interval
     GROUP BY date ORDER BY date ASC`,
    g, days,
  );
  return rows.map((r) => ({
    date: r.date.toISOString().slice(0, 10),
    value: Number(r.value),
    secondary: Number(r.secondary),
  }));
}

async function queryApiCost(days: number, gran: Granularity): Promise<MetricDataPoint[]> {
  const g = granToSql(gran);
  type CostRow = { date: Date; model: string | null; total_input: bigint; total_output: bigint };
  const rows = await prisma.$queryRawUnsafe<CostRow[]>(
    `SELECT DATE_TRUNC($1, "createdAt" AT TIME ZONE 'America/Sao_Paulo') AS date,
            "modelUsed" AS model,
            COALESCE(SUM("inputTokens"), 0)::bigint AS total_input,
            COALESCE(SUM("outputTokens"), 0)::bigint AS total_output
     FROM "CreditTransaction"
     WHERE type = 'consumption'
       AND "createdAt" >= NOW() - ($2::int || ' days')::interval
     GROUP BY date, "modelUsed" ORDER BY date ASC`,
    g, days,
  );

  // Aggregate cost per date
  const costMap = new Map<string, number>();
  for (const row of rows) {
    const dateStr = row.date.toISOString().slice(0, 10);
    const pricing = API_PRICING[row.model ?? ''] ?? DEFAULT_MODEL_PRICING;
    const inputCost = (Number(row.total_input) / 1_000_000) * pricing.input;
    const outputCost = (Number(row.total_output) / 1_000_000) * pricing.output;
    costMap.set(dateStr, (costMap.get(dateStr) ?? 0) + inputCost + outputCost);
  }

  return Array.from(costMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value: Math.round(value * 100) / 100 }));
}

async function queryModelDistribution(days: number, gran: Granularity): Promise<MetricDataPoint[]> {
  const g = granToSql(gran);
  const rows = await prisma.$queryRawUnsafe<DateLabelRow[]>(
    `SELECT DATE_TRUNC($1, "createdAt" AT TIME ZONE 'America/Sao_Paulo') AS date,
            COUNT(*)::bigint AS value,
            "modelUsed" AS label
     FROM "CreditTransaction"
     WHERE type = 'consumption'
       AND "createdAt" >= NOW() - ($2::int || ' days')::interval
     GROUP BY date, "modelUsed" ORDER BY date ASC`,
    g, days,
  );
  return rows.map((r) => ({
    date: r.date.toISOString().slice(0, 10),
    value: Number(r.value),
    label: r.label ?? 'unknown',
  }));
}

// ─── Route handler ───────────────────────────────────────────────────────────

const QUERY_MAP: Record<Metric, (days: number, gran: Granularity) => Promise<MetricDataPoint[]>> = {
  'users': queryUsers,
  'messages': queryMessages,
  'tokens': queryTokens,
  'revenue': queryRevenue,
  'credits': queryCredits,
  'api-cost': queryApiCost,
  'model-distribution': queryModelDistribution,
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ metric: string }> },
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { metric } = await params;
  if (!METRICS.includes(metric as Metric)) {
    return NextResponse.json({ error: `Invalid metric: ${metric}. Valid: ${METRICS.join(', ')}` }, { status: 400 });
  }

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    period: url.searchParams.get('period') ?? undefined,
    granularity: url.searchParams.get('granularity') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid params' }, { status: 400 });
  }

  const { period, granularity } = parsed.data;
  const days = periodToDays(period);

  try {
    const queryFn = QUERY_MAP[metric as Metric];
    const data = await queryFn(days, granularity);
    return NextResponse.json({ data, period, granularity });
  } catch (error) {
    console.error(`[Admin Metrics] Error querying ${metric}:`, error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
