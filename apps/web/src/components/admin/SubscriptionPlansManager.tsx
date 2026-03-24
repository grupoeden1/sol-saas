'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ─── Types ─────────────────────────────────────────────────────────────────

interface StripeProductRecord {
  id: string;
  stripeProductId: string;
  stripePriceId: string;
  priceInCents: number;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
}

interface Plan {
  id: string;
  name: string;
  creditsMonthly: number;
  priceInCents: number;
  stripeProductId: string | null;
  stripePriceId: string | null;
  active: boolean;
  sortOrder: number;
  _count: { subscriptions: number };
  stripeProductRecords: StripeProductRecord[];
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  name: string;
  creditsMonthly: string;
  priceInCents: string;
  sortOrder: string;
}

const emptyForm: FormData = { name: '', creditsMonthly: '', priceInCents: '', sortOrder: '0' };

type ModalMode = 'closed' | 'create' | 'edit';

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatBRL(cents: number): string {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function SubscriptionPlansManager() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [visibilityEnabled, setVisibilityEnabled] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);

  const [modalMode, setModalMode] = useState<ModalMode>('closed');
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/subscriptions');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to fetch plans');
      setPlans(data.plans);
      setVisibilityEnabled(data.subscriptionsEnabled === true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  async function handleToggleVisibility() {
    setTogglingVisibility(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionsEnabled: !visibilityEnabled }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to update visibility');
      }

      setVisibilityEnabled(!visibilityEnabled);
      setSuccess(`Assinaturas ${!visibilityEnabled ? 'visíveis' : 'ocultas'} para os usuários.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao alterar visibilidade');
    } finally {
      setTogglingVisibility(false);
    }
  }

  function openCreate() {
    setForm(emptyForm);
    setEditingPlanId(null);
    setModalMode('create');
    setError('');
    setSuccess('');
  }

  function openEdit(plan: Plan) {
    setForm({
      name: plan.name,
      creditsMonthly: String(plan.creditsMonthly),
      priceInCents: String(plan.priceInCents),
      sortOrder: String(plan.sortOrder),
    });
    setEditingPlanId(plan.id);
    setModalMode('edit');
    setError('');
    setSuccess('');
  }

  function closeModal() {
    setModalMode('closed');
    setEditingPlanId(null);
    setForm(emptyForm);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    const creditsMonthly = parseInt(form.creditsMonthly, 10);
    const priceInCents = parseInt(form.priceInCents, 10);
    const sortOrder = parseInt(form.sortOrder, 10);

    if (!form.name.trim() || isNaN(creditsMonthly) || creditsMonthly <= 0) {
      setError('Nome e créditos mensais devem ser preenchidos corretamente.');
      setSaving(false);
      return;
    }

    if (isNaN(priceInCents) || priceInCents <= 0) {
      setError('Preço em centavos deve ser um número positivo.');
      setSaving(false);
      return;
    }

    try {
      if (modalMode === 'create') {
        const res = await fetch('/api/admin/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name.trim(),
            creditsMonthly,
            priceInCents,
            sortOrder: isNaN(sortOrder) ? 0 : sortOrder,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Failed to create plan');
        setSuccess(`Plano "${data.plan.name}" criado com sucesso!`);
      } else {
        const res = await fetch('/api/admin/subscriptions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingPlanId,
            name: form.name.trim(),
            creditsMonthly,
            priceInCents,
            sortOrder: isNaN(sortOrder) ? 0 : sortOrder,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Failed to update plan');
        setSuccess(`Plano "${data.plan.name}" atualizado com sucesso!`);
      }

      closeModal();
      await fetchPlans();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(plan: Plan) {
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: plan.id, active: !plan.active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to toggle plan');
      setSuccess(`Plano "${plan.name}" ${!plan.active ? 'ativado' : 'desativado'} com sucesso!`);
      await fetchPlans();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao alterar status do plano');
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-foreground-muted">
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Carregando planos...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3">
          <p className="text-sm text-green-400">{success}</p>
        </div>
      )}

      {/* Visibility Toggle */}
      <div className="flex items-center justify-between rounded-2xl border border-solar-800/20 bg-background-secondary/40 p-4 backdrop-blur-md">
        <div>
          <p className="text-sm font-semibold text-foreground">Exibir para usuários</p>
          <p className="mt-0.5 text-xs text-foreground-muted">
            {visibilityEnabled
              ? 'O painel de assinaturas está visível no dashboard dos usuários.'
              : 'O painel de assinaturas está oculto no dashboard dos usuários.'}
          </p>
        </div>
        <button
          onClick={handleToggleVisibility}
          disabled={togglingVisibility}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
            visibilityEnabled ? 'bg-green-500' : 'bg-zinc-600'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
              visibilityEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Planos de Assinatura</h2>
        <button
          onClick={openCreate}
          className="rounded-lg bg-solar-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-solar-400"
        >
          Novo Plano
        </button>
      </div>

      {/* Plans Table */}
      <div className="overflow-x-auto rounded-2xl border border-solar-800/20 bg-background-secondary/40 backdrop-blur-md">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-solar-800/20">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">Nome</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">Creditos/Mes</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">Preco</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">Assinantes</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">Stripe</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">Status</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {plans.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-foreground-muted">
                  Nenhum plano cadastrado.
                </td>
              </tr>
            )}
            {plans.map((plan) => (
              <tr key={plan.id} className="border-b border-solar-800/10 last:border-b-0">
                <td className="px-4 py-3 font-medium text-foreground">{plan.name}</td>
                <td className="px-4 py-3 text-foreground-muted">
                  {plan.creditsMonthly.toLocaleString('pt-BR')}
                </td>
                <td className="px-4 py-3 text-foreground-muted">{formatBRL(plan.priceInCents)}</td>
                <td className="px-4 py-3 text-foreground-muted">{plan._count.subscriptions}</td>
                <td className="px-4 py-3">
                  {plan.stripeProductId ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
                      Configurado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
                      Pendente
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggleActive(plan)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                      plan.active
                        ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                        : 'bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/20'
                    }`}
                  >
                    {plan.active ? 'Ativo' : 'Inativo'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => openEdit(plan)}
                    className="rounded-lg border border-solar-800/30 px-3 py-1 text-xs text-foreground-muted transition-all hover:border-solar-500/30 hover:text-foreground"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stripe Records Info */}
      {plans.some((p) => p.stripeProductRecords.length > 1) && (
        <div className="rounded-2xl border border-solar-800/20 bg-background-secondary/40 p-4 backdrop-blur-md">
          <h3 className="mb-3 text-sm font-semibold text-foreground-muted">Historico de Precos Stripe</h3>
          {plans
            .filter((p) => p.stripeProductRecords.length > 1)
            .map((plan) => (
              <div key={plan.id} className="mb-3 last:mb-0">
                <p className="text-sm font-medium text-foreground">{plan.name}</p>
                <div className="mt-1 space-y-1">
                  {plan.stripeProductRecords.map((rec) => (
                    <p key={rec.id} className="text-xs text-foreground-muted">
                      {formatBRL(rec.priceInCents)} — {rec.status === 'ACTIVE' ? 'Atual' : 'Arquivado'}{' '}
                      <span className="text-foreground-muted/50">({rec.stripePriceId})</span>
                    </p>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Modal (Create/Edit) */}
      {modalMode !== 'closed' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-solar-800/30 bg-background-secondary p-6 shadow-2xl">
            <h3 className="mb-4 text-lg font-semibold text-foreground">
              {modalMode === 'create' ? 'Novo Plano de Assinatura' : 'Editar Plano'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground-muted">
                  Nome do Plano
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="Ex: Plano Starter"
                  className="w-full rounded-lg border border-solar-800/30 bg-background-secondary px-3 py-2 text-sm text-foreground placeholder-foreground-muted/50 outline-none transition focus:border-solar-500/50 focus:ring-1 focus:ring-solar-500/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground-muted">
                  Creditos Mensais
                </label>
                <input
                  type="number"
                  name="creditsMonthly"
                  value={form.creditsMonthly}
                  onChange={handleChange}
                  required
                  min="1"
                  step="1"
                  placeholder="500"
                  className="w-full rounded-lg border border-solar-800/30 bg-background-secondary px-3 py-2 text-sm text-foreground placeholder-foreground-muted/50 outline-none transition focus:border-solar-500/50 focus:ring-1 focus:ring-solar-500/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground-muted">
                  Preco em Centavos (BRL)
                </label>
                <input
                  type="number"
                  name="priceInCents"
                  value={form.priceInCents}
                  onChange={handleChange}
                  required
                  min="1"
                  step="1"
                  placeholder="4990 = R$ 49,90"
                  className="w-full rounded-lg border border-solar-800/30 bg-background-secondary px-3 py-2 text-sm text-foreground placeholder-foreground-muted/50 outline-none transition focus:border-solar-500/50 focus:ring-1 focus:ring-solar-500/20"
                />
                {form.priceInCents && !isNaN(parseInt(form.priceInCents, 10)) && (
                  <p className="mt-1 text-xs text-foreground-muted">
                    = {formatBRL(parseInt(form.priceInCents, 10))}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground-muted">
                  Ordem de Exibicao
                </label>
                <input
                  type="number"
                  name="sortOrder"
                  value={form.sortOrder}
                  onChange={handleChange}
                  min="0"
                  step="1"
                  placeholder="0"
                  className="w-full rounded-lg border border-solar-800/30 bg-background-secondary px-3 py-2 text-sm text-foreground placeholder-foreground-muted/50 outline-none transition focus:border-solar-500/50 focus:ring-1 focus:ring-solar-500/20"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-solar-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-solar-400 disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : modalMode === 'create' ? 'Criar Plano' : 'Salvar Alteracoes'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-solar-800/30 px-5 py-2.5 text-sm text-foreground-muted transition-all hover:border-solar-500/30"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
