'use client';

import ChartContainer from './chart-container';
import UsersChart from './users-chart';
import MessagesChart from './messages-chart';
import TokensChart from './tokens-chart';
import RevenueChart from './revenue-chart';
import CreditsChart from './credits-chart';
import ApiCostChart from './api-cost-chart';
import ModelDistributionChart from './model-distribution-chart';

export default function AdminChartsSection() {
  return (
    <section>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-foreground-muted">
        Tendências
      </h2>

      <div className="space-y-4">
        {/* Revenue — full width */}
        <ChartContainer title="Faturamento (R$)" metric="revenue">
          {(data) => <RevenueChart data={data} />}
        </ChartContainer>

        {/* 2-column grid */}
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartContainer title="Novos Cadastros" metric="users">
            {(data) => <UsersChart data={data} />}
          </ChartContainer>
          <ChartContainer title="Mensagens Enviadas" metric="messages">
            {(data) => <MessagesChart data={data} />}
          </ChartContainer>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartContainer title="Tokens Consumidos (Input / Output)" metric="tokens">
            {(data) => <TokensChart data={data} />}
          </ChartContainer>
          <ChartContainer title="Custo API (USD)" metric="api-cost">
            {(data) => <ApiCostChart data={data} />}
          </ChartContainer>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartContainer title="Créditos Vendidos vs Consumidos" metric="credits">
            {(data) => <CreditsChart data={data} />}
          </ChartContainer>
          <ChartContainer title="Distribuição por Modelo" metric="model-distribution">
            {(data) => <ModelDistributionChart data={data} />}
          </ChartContainer>
        </div>
      </div>
    </section>
  );
}
