'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import LogoWithText from '@/components/LogoWithText';
import LogoutButton from '@/components/LogoutButton';

interface Campaign {
  id: string;
  name: string;
  discountPercent: number | null;
  offerId: string | null;
}

export default function AdminUpsellPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/upsell');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro ao carregar configuração');
      setCampaignId(data.campaignId);
      setCampaigns(data.campaigns);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  async function handleSave() {
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const res = await fetch('/api/admin/upsell', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Erro ao salvar');
      }

      setSuccess('Configuração salva com sucesso!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado');
    } finally {
      setSaving(false);
    }
  }

  const selectedCampaign = campaigns.find((c) => c.id === campaignId);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a]">
      <div className="pointer-events-none absolute inset-0 z-0 opacity-20 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-solar-500/30 via-transparent to-transparent" />

      <header className="fixed left-0 right-0 top-4 z-50 mx-auto flex h-14 w-[calc(100%-2rem)] max-w-6xl items-center justify-between rounded-full border border-solar-800/30 bg-background-secondary/70 px-4 backdrop-blur-xl md:px-6">
        <div className="flex items-center gap-4">
          <Link href="/roteiros" className="flex items-center gap-2 text-solar-300 transition-all hover:opacity-80">
            <Logo size={24} />
            <LogoWithText height={14} className="hidden sm:block" />
          </Link>
          <span className="hidden h-5 w-px bg-solar-800/50 sm:block" />
          <span className="text-xs font-semibold uppercase tracking-widest text-solar-400">Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <LogoutButton />
        </div>
      </header>

      <main className="relative z-10 flex-1 px-4 pb-12 pt-28 md:px-8">
        <div className="mx-auto max-w-2xl space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Upsell One-Click</h1>
              <p className="mt-1 text-sm text-foreground-muted">
                Vincule uma promoção para exibir como banner de compra rápida no dashboard
              </p>
            </div>
            <Link
              href="/admin"
              className="rounded-xl bg-solar-500/10 px-4 py-2.5 text-sm font-medium text-solar-300 transition-all hover:bg-solar-500/20"
            >
              Voltar ao Painel
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-foreground-muted">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Carregando...
            </div>
          ) : (
            <div className="space-y-6">
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

              {/* Info */}
              <div className="rounded-2xl border border-solar-800/20 bg-background-secondary/40 p-5 backdrop-blur-md">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-solar-500/10">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-solar-400">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Como funciona</p>
                    <p className="mt-1 text-xs leading-relaxed text-foreground-muted">
                      Selecione uma promoção ativa com pacote de créditos vinculado. O banner aparecerá no dashboard
                      para os usuários que atendam aos filtros de audiência da promoção. Ao clicar, a compra será
                      realizada com 1 clique usando o cartão salvo do usuário.
                    </p>
                  </div>
                </div>
              </div>

              {/* Campaign Link */}
              <div className="rounded-2xl border border-solar-800/20 bg-background-secondary/40 p-5 backdrop-blur-md">
                <label className="mb-1 block text-sm font-semibold text-foreground">
                  Promoção Vinculada
                </label>
                <p className="mb-3 text-xs text-foreground-muted">
                  Selecione a promoção que será exibida como banner de upsell. Apenas promoções ativas com pacote de créditos vinculado são exibidas.
                </p>

                <select
                  value={campaignId ?? ''}
                  onChange={(e) => setCampaignId(e.target.value || null)}
                  className="w-full rounded-lg border border-solar-800/30 bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-solar-500/50 focus:ring-1 focus:ring-solar-500/20"
                >
                  <option value="">Nenhuma (upsell desativado)</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.discountPercent ? ` (${c.discountPercent}% OFF)` : ''}
                    </option>
                  ))}
                </select>

                {selectedCampaign && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-solar-500/20 bg-solar-500/5 px-3 py-2">
                    <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-green-400">
                      Ativa
                    </span>
                    <span className="text-sm text-foreground">{selectedCampaign.name}</span>
                    {selectedCampaign.discountPercent && (
                      <span className="ml-auto text-sm font-semibold text-solar-300">
                        {selectedCampaign.discountPercent}% OFF
                      </span>
                    )}
                  </div>
                )}

                {!campaignId && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-zinc-700/30 bg-zinc-800/20 px-3 py-2">
                    <span className="rounded-full bg-zinc-600/30 px-2 py-0.5 text-[10px] font-bold uppercase text-zinc-400">
                      Desativado
                    </span>
                    <span className="text-xs text-foreground-muted">
                      Nenhum banner de upsell será exibido
                    </span>
                  </div>
                )}

                {campaigns.length === 0 && (
                  <p className="mt-2 text-xs text-foreground-muted/60">
                    Nenhuma campanha ativa com pacote de créditos encontrada.{' '}
                    <Link href="/admin/promos" className="text-solar-400 hover:text-solar-300">
                      Criar campanha
                    </Link>
                  </p>
                )}
              </div>

              {/* Save */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full rounded-xl bg-solar-500 py-3 text-sm font-semibold text-white transition-all hover:bg-solar-400 disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar Configuração'}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
