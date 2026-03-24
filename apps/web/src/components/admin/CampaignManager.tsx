'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ─── Types ─────────────────────────────────────────────────────────────────

interface CampaignMetrics {
  totalDeliveries: number;
  viewed: number;
  clicked: number;
  converted: number;
  dismissed: number;
  viewRate: number;
  clickRate: number;
  conversionRate: number;
  dismissRate: number;
}

interface Campaign {
  id: string;
  name: string;
  title: string;
  message: string;
  offerType: 'CREDIT_PACKAGE' | 'SUBSCRIPTION_PLAN' | 'CUSTOM';
  offerId: string | null;
  discountPercent: number | null;
  filters: {
    creditsMin?: number;
    creditsMax?: number;
    inactiveDays?: number;
    messagesMin?: number;
    messagesMax?: number;
  };
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ENDED';
  startsAt: string | null;
  endsAt: string | null;
  _count: { deliveries: number };
  metrics: CampaignMetrics;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  name: string;
  title: string;
  message: string;
  offerType: 'CREDIT_PACKAGE' | 'SUBSCRIPTION_PLAN' | 'CUSTOM';
  offerId: string;
  discountPercent: string;
  creditsMin: string;
  creditsMax: string;
  inactiveDays: string;
  messagesMin: string;
  messagesMax: string;
  startsAt: string;
  endsAt: string;
}

const emptyForm: FormData = {
  name: '',
  title: '',
  message: '',
  offerType: 'CREDIT_PACKAGE',
  offerId: '',
  discountPercent: '',
  creditsMin: '',
  creditsMax: '',
  inactiveDays: '',
  messagesMin: '',
  messagesMax: '',
  startsAt: '',
  endsAt: '',
};

type ModalMode = 'closed' | 'create' | 'edit';

// ─── Helpers ───────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-zinc-500/10 text-zinc-400',
  ACTIVE: 'bg-green-500/10 text-green-400',
  PAUSED: 'bg-amber-500/10 text-amber-400',
  ENDED: 'bg-red-500/10 text-red-400',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  ACTIVE: 'Ativa',
  PAUSED: 'Pausada',
  ENDED: 'Encerrada',
};

const OFFER_TYPE_LABELS: Record<string, string> = {
  CREDIT_PACKAGE: 'Pacote de Creditos',
  SUBSCRIPTION_PLAN: 'Plano de Assinatura',
  CUSTOM: 'Personalizado',
};

function parseOptionalInt(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const num = parseInt(value, 10);
  return isNaN(num) ? undefined : num;
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function CampaignManager() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [modalMode, setModalMode] = useState<ModalMode>('closed');
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);

  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ─── Fetch campaigns ──────────────────────────────────────────────────────

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/promos');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to fetch campaigns');
      setCampaigns(data.campaigns);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar campanhas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // ─── Modal controls ───────────────────────────────────────────────────────

  function openCreate() {
    setForm(emptyForm);
    setEditingCampaignId(null);
    setModalMode('create');
    setAudienceCount(null);
    setError('');
    setSuccess('');
  }

  function openEdit(campaign: Campaign) {
    setForm({
      name: campaign.name,
      title: campaign.title,
      message: campaign.message,
      offerType: campaign.offerType,
      offerId: campaign.offerId ?? '',
      discountPercent: campaign.discountPercent != null ? String(campaign.discountPercent) : '',
      creditsMin: campaign.filters.creditsMin != null ? String(campaign.filters.creditsMin) : '',
      creditsMax: campaign.filters.creditsMax != null ? String(campaign.filters.creditsMax) : '',
      inactiveDays: campaign.filters.inactiveDays != null ? String(campaign.filters.inactiveDays) : '',
      messagesMin: campaign.filters.messagesMin != null ? String(campaign.filters.messagesMin) : '',
      messagesMax: campaign.filters.messagesMax != null ? String(campaign.filters.messagesMax) : '',
      startsAt: campaign.startsAt ? campaign.startsAt.slice(0, 16) : '',
      endsAt: campaign.endsAt ? campaign.endsAt.slice(0, 16) : '',
    });
    setEditingCampaignId(campaign.id);
    setModalMode('edit');
    setAudienceCount(null);
    setError('');
    setSuccess('');
  }

  function closeModal() {
    setModalMode('closed');
    setEditingCampaignId(null);
    setForm(emptyForm);
    setAudienceCount(null);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  // ─── Preview audience ─────────────────────────────────────────────────────

  async function handlePreviewAudience() {
    setPreviewLoading(true);
    setAudienceCount(null);

    try {
      const filters: Record<string, number> = {};
      const creditsMin = parseOptionalInt(form.creditsMin);
      const creditsMax = parseOptionalInt(form.creditsMax);
      const inactiveDays = parseOptionalInt(form.inactiveDays);
      const messagesMin = parseOptionalInt(form.messagesMin);
      const messagesMax = parseOptionalInt(form.messagesMax);

      if (creditsMin !== undefined) filters.creditsMin = creditsMin;
      if (creditsMax !== undefined) filters.creditsMax = creditsMax;
      if (inactiveDays !== undefined) filters.inactiveDays = inactiveDays;
      if (messagesMin !== undefined) filters.messagesMin = messagesMin;
      if (messagesMax !== undefined) filters.messagesMax = messagesMax;

      const res = await fetch('/api/admin/promos/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to preview');
      setAudienceCount(data.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao prever audiencia');
    } finally {
      setPreviewLoading(false);
    }
  }

  // ─── Submit form ──────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    if (!form.name.trim() || !form.title.trim() || !form.message.trim()) {
      setError('Nome, titulo e mensagem sao obrigatorios.');
      setSaving(false);
      return;
    }

    const filters: Record<string, number> = {};
    const creditsMin = parseOptionalInt(form.creditsMin);
    const creditsMax = parseOptionalInt(form.creditsMax);
    const inactiveDays = parseOptionalInt(form.inactiveDays);
    const messagesMin = parseOptionalInt(form.messagesMin);
    const messagesMax = parseOptionalInt(form.messagesMax);

    if (creditsMin !== undefined) filters.creditsMin = creditsMin;
    if (creditsMax !== undefined) filters.creditsMax = creditsMax;
    if (inactiveDays !== undefined) filters.inactiveDays = inactiveDays;
    if (messagesMin !== undefined) filters.messagesMin = messagesMin;
    if (messagesMax !== undefined) filters.messagesMax = messagesMax;

    const discountPercent = parseOptionalInt(form.discountPercent);

    try {
      if (modalMode === 'create') {
        const res = await fetch('/api/admin/promos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name.trim(),
            title: form.title.trim(),
            message: form.message.trim(),
            offerType: form.offerType,
            offerId: form.offerId.trim() || undefined,
            discountPercent,
            filters,
            startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
            endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Failed to create campaign');
        setSuccess(`Campanha "${data.campaign.name}" criada com sucesso!`);
      } else {
        const res = await fetch('/api/admin/promos', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingCampaignId,
            name: form.name.trim(),
            title: form.title.trim(),
            message: form.message.trim(),
            offerType: form.offerType,
            offerId: form.offerId.trim() || null,
            discountPercent: discountPercent ?? null,
            filters,
            startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
            endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Failed to update campaign');
        setSuccess(`Campanha "${data.campaign.name}" atualizada com sucesso!`);
      }

      closeModal();
      await fetchCampaigns();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado');
    } finally {
      setSaving(false);
    }
  }

  // ─── Status transition ────────────────────────────────────────────────────

  async function handleStatusChange(campaignId: string, newStatus: string) {
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/promos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: campaignId, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to update status');
      setSuccess(`Status alterado para ${STATUS_LABELS[newStatus] ?? newStatus} com sucesso!`);
      await fetchCampaigns();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao alterar status');
    }
  }

  // ─── Toggle metrics ───────────────────────────────────────────────────────

  function toggleExpanded(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-foreground-muted">
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Carregando campanhas...
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

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Campanhas Promocionais</h2>
        <button
          onClick={openCreate}
          className="rounded-lg bg-solar-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-solar-400"
        >
          Nova Campanha
        </button>
      </div>

      {/* Campaigns Table */}
      <div className="overflow-x-auto rounded-2xl border border-solar-800/20 bg-background-secondary/40 backdrop-blur-md">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-solar-800/20">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">Nome</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">Status</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">Tipo Oferta</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">Desconto</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">Entregas</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">Criada em</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-foreground-muted">
                  Nenhuma campanha cadastrada.
                </td>
              </tr>
            )}
            {campaigns.map((campaign) => (
              <>
                <tr key={campaign.id} className="border-b border-solar-800/10 last:border-b-0">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleExpanded(campaign.id)}
                      className="text-left font-medium text-foreground hover:text-solar-300 transition-colors"
                    >
                      {campaign.name}
                      <span className="ml-1.5 text-xs text-foreground-muted">
                        {expandedId === campaign.id ? '▲' : '▼'}
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[campaign.status]}`}>
                      {STATUS_LABELS[campaign.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground-muted">
                    {OFFER_TYPE_LABELS[campaign.offerType]}
                  </td>
                  <td className="px-4 py-3 text-foreground-muted">
                    {campaign.discountPercent != null ? `${campaign.discountPercent}%` : '—'}
                  </td>
                  <td className="px-4 py-3 text-foreground-muted">
                    {campaign._count.deliveries}
                  </td>
                  <td className="px-4 py-3 text-foreground-muted">
                    {new Date(campaign.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {campaign.status === 'DRAFT' && (
                        <>
                          <button
                            onClick={() => openEdit(campaign)}
                            className="rounded-lg border border-solar-800/30 px-3 py-1 text-xs text-foreground-muted transition-all hover:border-solar-500/30 hover:text-foreground"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleStatusChange(campaign.id, 'ACTIVE')}
                            className="rounded-lg bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400 transition-all hover:bg-green-500/20"
                          >
                            Ativar
                          </button>
                        </>
                      )}
                      {campaign.status === 'ACTIVE' && (
                        <>
                          <button
                            onClick={() => handleStatusChange(campaign.id, 'PAUSED')}
                            className="rounded-lg bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400 transition-all hover:bg-amber-500/20"
                          >
                            Pausar
                          </button>
                          <button
                            onClick={() => handleStatusChange(campaign.id, 'ENDED')}
                            className="rounded-lg bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400 transition-all hover:bg-red-500/20"
                          >
                            Encerrar
                          </button>
                        </>
                      )}
                      {campaign.status === 'PAUSED' && (
                        <>
                          <button
                            onClick={() => handleStatusChange(campaign.id, 'ACTIVE')}
                            className="rounded-lg bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400 transition-all hover:bg-green-500/20"
                          >
                            Reativar
                          </button>
                          <button
                            onClick={() => handleStatusChange(campaign.id, 'ENDED')}
                            className="rounded-lg bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400 transition-all hover:bg-red-500/20"
                          >
                            Encerrar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>

                {/* Expanded metrics row */}
                {expandedId === campaign.id && (
                  <tr key={`${campaign.id}-metrics`} className="border-b border-solar-800/10">
                    <td colSpan={7} className="px-4 py-4">
                      <div className="rounded-xl border border-solar-800/20 bg-background-secondary/60 p-4">
                        <div className="mb-3">
                          <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                            Metricas da Campanha
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
                          <div>
                            <p className="text-xs text-foreground-muted">Total Entregas</p>
                            <p className="text-lg font-semibold text-foreground">
                              {campaign.metrics.totalDeliveries}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-foreground-muted">Visualizacoes</p>
                            <p className="text-lg font-semibold text-foreground">
                              {campaign.metrics.viewed}
                              <span className="ml-1 text-xs font-normal text-foreground-muted">
                                ({campaign.metrics.viewRate}%)
                              </span>
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-foreground-muted">Cliques</p>
                            <p className="text-lg font-semibold text-foreground">
                              {campaign.metrics.clicked}
                              <span className="ml-1 text-xs font-normal text-foreground-muted">
                                ({campaign.metrics.clickRate}%)
                              </span>
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-foreground-muted">Conversoes</p>
                            <p className="text-lg font-semibold text-green-400">
                              {campaign.metrics.converted}
                              <span className="ml-1 text-xs font-normal text-foreground-muted">
                                ({campaign.metrics.conversionRate}%)
                              </span>
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-foreground-muted">Dispensadas</p>
                            <p className="text-lg font-semibold text-foreground">
                              {campaign.metrics.dismissed}
                              <span className="ml-1 text-xs font-normal text-foreground-muted">
                                ({campaign.metrics.dismissRate}%)
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Campaign details */}
                        <div className="mt-4 border-t border-solar-800/20 pt-4">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                              <p className="text-xs text-foreground-muted">Titulo</p>
                              <p className="text-sm text-foreground">{campaign.title}</p>
                            </div>
                            <div>
                              <p className="text-xs text-foreground-muted">Mensagem</p>
                              <p className="text-sm text-foreground line-clamp-2">{campaign.message}</p>
                            </div>
                            <div>
                              <p className="text-xs text-foreground-muted">Filtros</p>
                              <p className="text-sm text-foreground">
                                {Object.entries(campaign.filters)
                                  .filter(([, v]) => v !== undefined && v !== null)
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .join(', ') || 'Nenhum filtro'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-foreground-muted">Periodo</p>
                              <p className="text-sm text-foreground">
                                {campaign.startsAt
                                  ? new Date(campaign.startsAt).toLocaleDateString('pt-BR')
                                  : 'Sem inicio'}{' '}
                                —{' '}
                                {campaign.endsAt
                                  ? new Date(campaign.endsAt).toLocaleDateString('pt-BR')
                                  : 'Sem fim'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal (Create/Edit) */}
      {modalMode !== 'closed' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-solar-800/30 bg-background-secondary p-6 shadow-2xl">
            <h3 className="mb-4 text-lg font-semibold text-foreground">
              {modalMode === 'create' ? 'Nova Campanha Promocional' : 'Editar Campanha'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground-muted">
                  Nome da Campanha
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="Ex: Black Friday 2026"
                  className="w-full rounded-lg border border-solar-800/30 bg-background-secondary px-3 py-2 text-sm text-foreground placeholder-foreground-muted/50 outline-none transition focus:border-solar-500/50 focus:ring-1 focus:ring-solar-500/20"
                />
              </div>

              {/* Title */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground-muted">
                  Titulo do Popup
                </label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                  placeholder="Ex: Oferta Especial!"
                  className="w-full rounded-lg border border-solar-800/30 bg-background-secondary px-3 py-2 text-sm text-foreground placeholder-foreground-muted/50 outline-none transition focus:border-solar-500/50 focus:ring-1 focus:ring-solar-500/20"
                />
              </div>

              {/* Message */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground-muted">
                  Mensagem
                </label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  required
                  rows={3}
                  placeholder="Texto da mensagem promocional..."
                  className="w-full rounded-lg border border-solar-800/30 bg-background-secondary px-3 py-2 text-sm text-foreground placeholder-foreground-muted/50 outline-none transition focus:border-solar-500/50 focus:ring-1 focus:ring-solar-500/20"
                />
              </div>

              {/* Offer Type + Offer ID + Discount */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground-muted">
                    Tipo de Oferta
                  </label>
                  <select
                    name="offerType"
                    value={form.offerType}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-solar-800/30 bg-background-secondary px-3 py-2 text-sm text-foreground outline-none transition focus:border-solar-500/50 focus:ring-1 focus:ring-solar-500/20"
                  >
                    <option value="CREDIT_PACKAGE">Pacote de Creditos</option>
                    <option value="SUBSCRIPTION_PLAN">Plano de Assinatura</option>
                    <option value="CUSTOM">Personalizado</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground-muted">
                    ID da Oferta
                  </label>
                  <input
                    type="text"
                    name="offerId"
                    value={form.offerId}
                    onChange={handleChange}
                    placeholder="ID do pacote/plano"
                    className="w-full rounded-lg border border-solar-800/30 bg-background-secondary px-3 py-2 text-sm text-foreground placeholder-foreground-muted/50 outline-none transition focus:border-solar-500/50 focus:ring-1 focus:ring-solar-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground-muted">
                    Desconto (%)
                  </label>
                  <input
                    type="number"
                    name="discountPercent"
                    value={form.discountPercent}
                    onChange={handleChange}
                    min="1"
                    max="100"
                    placeholder="Ex: 20"
                    className="w-full rounded-lg border border-solar-800/30 bg-background-secondary px-3 py-2 text-sm text-foreground placeholder-foreground-muted/50 outline-none transition focus:border-solar-500/50 focus:ring-1 focus:ring-solar-500/20"
                  />
                </div>
              </div>

              {/* Filters Section */}
              <div className="rounded-xl border border-solar-800/20 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground-muted">Filtros de Audiencia</p>
                  <button
                    type="button"
                    onClick={handlePreviewAudience}
                    disabled={previewLoading}
                    className="rounded-lg bg-solar-500/10 px-3 py-1.5 text-xs font-medium text-solar-300 transition-all hover:bg-solar-500/20 disabled:opacity-50"
                  >
                    {previewLoading ? 'Calculando...' : 'Prever Audiencia'}
                  </button>
                </div>

                {audienceCount !== null && (
                  <div className="mb-3 rounded-lg bg-solar-500/10 p-2 text-center">
                    <p className="text-sm text-solar-300">
                      <span className="font-semibold">{audienceCount}</span> usuario{audienceCount !== 1 ? 's' : ''} corresponde{audienceCount !== 1 ? 'm' : ''} aos filtros
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs text-foreground-muted">Creditos Min</label>
                    <input
                      type="number"
                      name="creditsMin"
                      value={form.creditsMin}
                      onChange={handleChange}
                      min="0"
                      placeholder="0"
                      className="w-full rounded-lg border border-solar-800/30 bg-background-secondary px-3 py-1.5 text-sm text-foreground placeholder-foreground-muted/50 outline-none transition focus:border-solar-500/50 focus:ring-1 focus:ring-solar-500/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-foreground-muted">Creditos Max</label>
                    <input
                      type="number"
                      name="creditsMax"
                      value={form.creditsMax}
                      onChange={handleChange}
                      min="0"
                      placeholder="100"
                      className="w-full rounded-lg border border-solar-800/30 bg-background-secondary px-3 py-1.5 text-sm text-foreground placeholder-foreground-muted/50 outline-none transition focus:border-solar-500/50 focus:ring-1 focus:ring-solar-500/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-foreground-muted">Dias Inativo</label>
                    <input
                      type="number"
                      name="inactiveDays"
                      value={form.inactiveDays}
                      onChange={handleChange}
                      min="0"
                      placeholder="30"
                      className="w-full rounded-lg border border-solar-800/30 bg-background-secondary px-3 py-1.5 text-sm text-foreground placeholder-foreground-muted/50 outline-none transition focus:border-solar-500/50 focus:ring-1 focus:ring-solar-500/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-foreground-muted">Msgs Min</label>
                    <input
                      type="number"
                      name="messagesMin"
                      value={form.messagesMin}
                      onChange={handleChange}
                      min="0"
                      placeholder="0"
                      className="w-full rounded-lg border border-solar-800/30 bg-background-secondary px-3 py-1.5 text-sm text-foreground placeholder-foreground-muted/50 outline-none transition focus:border-solar-500/50 focus:ring-1 focus:ring-solar-500/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-foreground-muted">Msgs Max</label>
                    <input
                      type="number"
                      name="messagesMax"
                      value={form.messagesMax}
                      onChange={handleChange}
                      min="0"
                      placeholder="500"
                      className="w-full rounded-lg border border-solar-800/30 bg-background-secondary px-3 py-1.5 text-sm text-foreground placeholder-foreground-muted/50 outline-none transition focus:border-solar-500/50 focus:ring-1 focus:ring-solar-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Date range */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground-muted">
                    Inicio (opcional)
                  </label>
                  <input
                    type="datetime-local"
                    name="startsAt"
                    value={form.startsAt}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-solar-800/30 bg-background-secondary px-3 py-2 text-sm text-foreground outline-none transition focus:border-solar-500/50 focus:ring-1 focus:ring-solar-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground-muted">
                    Fim (opcional)
                  </label>
                  <input
                    type="datetime-local"
                    name="endsAt"
                    value={form.endsAt}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-solar-800/30 bg-background-secondary px-3 py-2 text-sm text-foreground outline-none transition focus:border-solar-500/50 focus:ring-1 focus:ring-solar-500/20"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-solar-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-solar-400 disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : modalMode === 'create' ? 'Criar Campanha' : 'Salvar Alteracoes'}
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
