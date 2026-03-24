'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Plan {
  id: string;
  name: string;
  creditsMonthly: number;
  priceInCents: number;
  stripePriceId: string | null;
  sortOrder: number;
}

interface Subscription {
  id: string;
  planId: string;
  status: 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'PAUSED';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  plan: {
    id: string;
    name: string;
    creditsMonthly: number;
    priceInCents: number;
  };
}

interface SubscriptionManagerProps {
  subscription: Subscription | null;
  availablePlans: Plan[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatBRL(cents: number): string {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const statusLabels: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Ativa', color: 'text-green-400 bg-green-500/10 border-green-500/30' },
  CANCELED: { label: 'Cancelada', color: 'text-red-400 bg-red-500/10 border-red-500/30' },
  PAST_DUE: { label: 'Pagamento pendente', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  PAUSED: { label: 'Pausada', color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30' },
};

// ─── Component ─────────────────────────────────────────────────────────────

export default function SubscriptionManager({
  subscription,
  availablePlans,
}: SubscriptionManagerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showChangePlan, setShowChangePlan] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'cancel' | 'reactivate' | null>(null);

  async function handleSubscribe(planId: string) {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/payments/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to start subscription');
      }

      if (data.sessionUrl) {
        window.location.href = data.sessionUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado');
      setLoading(false);
    }
  }

  async function handleCancel() {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/subscription/cancel', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to cancel subscription');
      }

      setSuccess('Assinatura agendada para cancelamento no final do periodo atual.');
      setConfirmAction(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cancelar assinatura');
    } finally {
      setLoading(false);
    }
  }

  async function handleReactivate() {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/subscription/reactivate', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to reactivate subscription');
      }

      setSuccess('Assinatura reativada com sucesso!');
      setConfirmAction(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao reativar assinatura');
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePlan(planId: string) {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/subscription/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to change plan');
      }

      setSuccess(`Plano alterado para ${data.newPlan.name} com sucesso!`);
      setShowChangePlan(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao alterar plano');
    } finally {
      setLoading(false);
    }
  }

  // ─── No subscription — show available plans ────────────────────────────────

  if (!subscription) {
    return (
      <div className="rounded-2xl border border-solar-800/20 bg-background-secondary p-6">
        <h2 className="mb-2 text-lg font-semibold text-foreground">Assinatura</h2>
        <p className="mb-4 text-sm text-foreground-muted">
          Voce nao possui uma assinatura ativa. Escolha um plano para receber creditos mensais automaticamente.
        </p>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {availablePlans.length === 0 ? (
          <p className="text-sm text-foreground-muted">Nenhum plano disponivel no momento.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {availablePlans.map((plan) => (
              <div
                key={plan.id}
                className="flex flex-col justify-between rounded-xl border border-solar-800/20 bg-background-secondary/60 p-4"
              >
                <div>
                  <h3 className="text-base font-semibold text-foreground">{plan.name}</h3>
                  <p className="mt-1 text-2xl font-bold text-solar-300">
                    {formatBRL(plan.priceInCents)}
                    <span className="text-sm font-normal text-foreground-muted">/mes</span>
                  </p>
                  <p className="mt-2 text-sm text-foreground-muted">
                    {plan.creditsMonthly.toLocaleString('pt-BR')} creditos/mes
                  </p>
                </div>
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading}
                  className="mt-4 w-full rounded-lg bg-solar-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-solar-400 disabled:opacity-50"
                >
                  {loading ? 'Processando...' : 'Assinar'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── Active subscription ───────────────────────────────────────────────────

  const statusInfo = statusLabels[subscription.status] ?? {
    label: subscription.status,
    color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30',
  };

  return (
    <div className="rounded-2xl border border-solar-800/20 bg-background-secondary p-6">
      <div className="mb-4 flex items-start justify-between">
        <h2 className="text-lg font-semibold text-foreground">Sua Assinatura</h2>
        <span
          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusInfo.color}`}
        >
          {statusInfo.label}
        </span>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 p-3">
          <p className="text-sm text-green-400">{success}</p>
        </div>
      )}

      {/* Plan Details */}
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wider text-foreground-muted">Plano</p>
          <p className="mt-1 text-base font-semibold text-foreground">
            {subscription.plan.name}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-foreground-muted">Valor</p>
          <p className="mt-1 text-base font-semibold text-solar-300">
            {formatBRL(subscription.plan.priceInCents)}/mes
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-foreground-muted">Creditos Mensais</p>
          <p className="mt-1 text-base font-semibold text-foreground">
            {subscription.plan.creditsMonthly.toLocaleString('pt-BR')}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-foreground-muted">Periodo Atual</p>
          <p className="mt-1 text-sm text-foreground">
            {formatDate(subscription.currentPeriodStart)} — {formatDate(subscription.currentPeriodEnd)}
          </p>
        </div>
      </div>

      {/* Cancel at period end warning */}
      {subscription.cancelAtPeriodEnd && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="text-sm text-amber-300">
            Sua assinatura sera cancelada em {formatDate(subscription.currentPeriodEnd)}.
            Voce pode reativar antes dessa data.
          </p>
        </div>
      )}

      {/* Confirm action dialog */}
      {confirmAction && (
        <div className="mb-4 rounded-xl border border-solar-800/30 bg-background-secondary/80 p-4">
          <p className="text-sm font-medium text-foreground">
            {confirmAction === 'cancel'
              ? 'Tem certeza que deseja cancelar sua assinatura? Voce continuara tendo acesso ate o final do periodo atual.'
              : 'Deseja reativar sua assinatura?'}
          </p>
          <div className="mt-3 flex gap-3">
            <button
              onClick={confirmAction === 'cancel' ? handleCancel : handleReactivate}
              disabled={loading}
              className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all disabled:opacity-50 ${
                confirmAction === 'cancel'
                  ? 'bg-red-500 hover:bg-red-400'
                  : 'bg-solar-500 hover:bg-solar-400'
              }`}
            >
              {loading ? 'Processando...' : 'Confirmar'}
            </button>
            <button
              onClick={() => setConfirmAction(null)}
              className="rounded-lg border border-solar-800/30 px-4 py-2 text-sm text-foreground-muted transition-all hover:border-solar-500/30"
            >
              Voltar
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      {!confirmAction && subscription.status === 'ACTIVE' && (
        <div className="flex flex-wrap gap-3">
          {!subscription.cancelAtPeriodEnd && (
            <>
              <button
                onClick={() => setShowChangePlan(!showChangePlan)}
                className="rounded-lg bg-solar-500/10 px-4 py-2 text-sm font-medium text-solar-300 transition-all hover:bg-solar-500/20"
              >
                Trocar Plano
              </button>
              <button
                onClick={() => setConfirmAction('cancel')}
                className="rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 transition-all hover:bg-red-500/10"
              >
                Cancelar Assinatura
              </button>
            </>
          )}
          {subscription.cancelAtPeriodEnd && (
            <button
              onClick={() => setConfirmAction('reactivate')}
              className="rounded-lg bg-solar-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-solar-400"
            >
              Reativar Assinatura
            </button>
          )}
        </div>
      )}

      {/* Change Plan Panel */}
      {showChangePlan && (
        <div className="mt-4 rounded-xl border border-solar-800/20 bg-background-secondary/60 p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Selecione um novo plano</h3>
          {availablePlans.filter((p) => p.id !== subscription.planId).length === 0 ? (
            <p className="text-sm text-foreground-muted">Nenhum outro plano disponivel.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {availablePlans
                .filter((p) => p.id !== subscription.planId)
                .map((plan) => {
                  const isUpgrade = plan.priceInCents > subscription.plan.priceInCents;
                  return (
                    <div
                      key={plan.id}
                      className="flex flex-col justify-between rounded-lg border border-solar-800/20 p-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-foreground">{plan.name}</h4>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              isUpgrade
                                ? 'bg-green-500/10 text-green-400'
                                : 'bg-amber-500/10 text-amber-400'
                            }`}
                          >
                            {isUpgrade ? 'Upgrade' : 'Downgrade'}
                          </span>
                        </div>
                        <p className="mt-1 text-lg font-bold text-solar-300">
                          {formatBRL(plan.priceInCents)}
                          <span className="text-xs font-normal text-foreground-muted">/mes</span>
                        </p>
                        <p className="text-xs text-foreground-muted">
                          {plan.creditsMonthly.toLocaleString('pt-BR')} creditos/mes
                        </p>
                      </div>
                      <button
                        onClick={() => handleChangePlan(plan.id)}
                        disabled={loading}
                        className="mt-3 w-full rounded-lg bg-solar-500/10 px-3 py-2 text-xs font-semibold text-solar-300 transition-all hover:bg-solar-500/20 disabled:opacity-50"
                      >
                        {loading ? 'Processando...' : 'Selecionar'}
                      </button>
                    </div>
                  );
                })}
            </div>
          )}
          <button
            onClick={() => setShowChangePlan(false)}
            className="mt-3 text-xs text-foreground-muted hover:text-foreground"
          >
            Fechar
          </button>
        </div>
      )}
    </div>
  );
}
