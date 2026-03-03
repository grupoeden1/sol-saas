'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/lib/credits-config';

// ─── Types ─────────────────────────────────────────────────────────────────

interface PricingConfig {
  creditsPerMInput: number;
  creditsPerMOutput: number;
  maxOutputTokens: number;
}

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  priceBrl: number;
  description: string | null;
  active: boolean;
  sortOrder: number;
}

// ─── Message profiles (hardcoded, client-side only) ────────────────────────

interface MessageProfile {
  label: string;
  inputTokens: number;
  outputTokens: number;
}

const MESSAGE_PROFILES: MessageProfile[] = [
  { label: 'Curta', inputTokens: 500, outputTokens: 200 },
  { label: 'Média', inputTokens: 2000, outputTokens: 1000 },
  { label: 'Longa', inputTokens: 5000, outputTokens: 3000 },
  { label: 'Pesada', inputTokens: 10000, outputTokens: 6000 },
  { label: 'Pipeline', inputTokens: 20000, outputTokens: 8192 },
];

// ─── Helper: calculate credits ─────────────────────────────────────────────

function calcCredits(inputTokens: number, outputTokens: number, config: PricingConfig): number {
  return Math.max(
    1,
    Math.ceil(
      (inputTokens / 1_000_000) * config.creditsPerMInput +
        (outputTokens / 1_000_000) * config.creditsPerMOutput,
    ),
  );
}

function calcMaxCredits(inputTokens: number, config: PricingConfig): number {
  return Math.max(
    1,
    Math.ceil(
      (inputTokens / 1_000_000) * config.creditsPerMInput +
        (config.maxOutputTokens / 1_000_000) * config.creditsPerMOutput,
    ),
  );
}

// ─── Main component ────────────────────────────────────────────────────────

export default function PricingSimulator() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Config state (editable locally)
  const [config, setConfig] = useState<PricingConfig>({
    creditsPerMInput: 500,
    creditsPerMOutput: 2000,
    maxOutputTokens: 8192,
  });

  // Packages state
  const [packages, setPackages] = useState<CreditPackage[]>([]);

  // Custom calculator state
  const [customInput, setCustomInput] = useState(2000);
  const [customOutput, setCustomOutput] = useState(1000);

  // OpenAI cost field (client-side only, not saved)
  const [usdBrlRate, setUsdBrlRate] = useState(6.0);

  // ─── Load data ─────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/pricing');
      if (!res.ok) throw new Error('Failed to load pricing data');
      const data = await res.json();
      setConfig(data.config);
      setPackages(data.packages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Save config ───────────────────────────────────────────────────────

  async function handleSaveConfig() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Erro ao salvar');
      }
      setSuccess('Configuração salva com sucesso! Cache invalidado.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  // ─── Save package ──────────────────────────────────────────────────────

  async function handleSavePackage(pkg: CreditPackage) {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/packages/${pkg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: pkg.name,
          credits: pkg.credits,
          priceBrl: pkg.priceBrl,
          description: pkg.description,
          active: pkg.active,
          sortOrder: pkg.sortOrder,
        }),
      });
      if (!res.ok) throw new Error('Erro ao salvar pacote');
      setSuccess(`Pacote "${pkg.name}" atualizado!`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar pacote');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-foreground-muted">
        <svg className="h-5 w-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Carregando...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Simulador de Pricing</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Edite valores e veja o impacto em tempo real. Salve para aplicar.
        </p>
      </div>

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

      {/* ── Section 1: PricingConfigForm ─────────────────────────────────── */}
      <section className="rounded-2xl border border-solar-800/20 bg-background-secondary/40 p-6 backdrop-blur-md">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Configuração de Pricing</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground-muted">
              Créditos / 1M Input Tokens
            </label>
            <input
              type="number"
              value={config.creditsPerMInput}
              onChange={(e) => setConfig((c) => ({ ...c, creditsPerMInput: parseInt(e.target.value) || 0 }))}
              min={1}
              className="w-full rounded-lg border border-solar-800/30 bg-background-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-solar-500/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground-muted">
              Créditos / 1M Output Tokens
            </label>
            <input
              type="number"
              value={config.creditsPerMOutput}
              onChange={(e) => setConfig((c) => ({ ...c, creditsPerMOutput: parseInt(e.target.value) || 0 }))}
              min={1}
              className="w-full rounded-lg border border-solar-800/30 bg-background-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-solar-500/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground-muted">
              Max Output Tokens
            </label>
            <input
              type="number"
              value={config.maxOutputTokens}
              onChange={(e) => setConfig((c) => ({ ...c, maxOutputTokens: parseInt(e.target.value) || 0 }))}
              min={256}
              max={32768}
              className="w-full rounded-lg border border-solar-800/30 bg-background-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-solar-500/50"
            />
          </div>
        </div>
        <button
          onClick={handleSaveConfig}
          disabled={saving}
          className="mt-4 rounded-lg bg-solar-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-solar-400 disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar Configuração'}
        </button>
      </section>

      {/* ── Section 2: MessageProfileSimulator ───────────────────────────── */}
      <section className="rounded-2xl border border-solar-800/20 bg-background-secondary/40 p-6 backdrop-blur-md">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Perfis de Mensagem</h2>
        <p className="mb-4 text-sm text-foreground-muted">
          Custo em créditos por tipo de mensagem com a configuração atual.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-solar-500/5 text-xs uppercase text-foreground-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Perfil</th>
                <th className="px-4 py-3 font-semibold">Input</th>
                <th className="px-4 py-3 font-semibold">Output</th>
                <th className="px-4 py-3 font-semibold">Créditos</th>
                <th className="px-4 py-3 font-semibold">Gate (max)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-solar-800/20">
              {MESSAGE_PROFILES.map((profile) => (
                <tr key={profile.label} className="transition-all hover:bg-solar-500/5">
                  <td className="px-4 py-3 font-medium text-foreground">{profile.label}</td>
                  <td className="px-4 py-3 text-foreground-muted">{profile.inputTokens.toLocaleString()}</td>
                  <td className="px-4 py-3 text-foreground-muted">{profile.outputTokens.toLocaleString()}</td>
                  <td className="px-4 py-3 text-solar-300 font-medium">
                    {calcCredits(profile.inputTokens, profile.outputTokens, config)}
                  </td>
                  <td className="px-4 py-3 text-foreground-muted">
                    {calcMaxCredits(profile.inputTokens, config)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Section 3: CustomCalculator ──────────────────────────────────── */}
      <section className="rounded-2xl border border-solar-800/20 bg-background-secondary/40 p-6 backdrop-blur-md">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Calculadora Personalizada</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground-muted">
              Input Tokens
            </label>
            <input
              type="number"
              value={customInput}
              onChange={(e) => setCustomInput(parseInt(e.target.value) || 0)}
              min={0}
              className="w-full rounded-lg border border-solar-800/30 bg-background-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-solar-500/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground-muted">
              Output Tokens
            </label>
            <input
              type="number"
              value={customOutput}
              onChange={(e) => setCustomOutput(parseInt(e.target.value) || 0)}
              min={0}
              className="w-full rounded-lg border border-solar-800/30 bg-background-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-solar-500/50"
            />
          </div>
          <div className="flex items-end">
            <div className="rounded-lg border border-solar-500/30 bg-solar-500/10 px-4 py-2 text-center">
              <p className="text-xs text-foreground-muted">Créditos</p>
              <p className="text-xl font-bold text-solar-300">
                {calcCredits(customInput, customOutput, config)}
              </p>
            </div>
          </div>
          <div className="flex items-end">
            <div className="rounded-lg border border-solar-800/30 bg-background-secondary px-4 py-2 text-center">
              <p className="text-xs text-foreground-muted">Gate (max)</p>
              <p className="text-xl font-bold text-foreground-muted">
                {calcMaxCredits(customInput, config)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 4: PackagesTable ─────────────────────────────────────── */}
      <section className="rounded-2xl border border-solar-800/20 bg-background-secondary/40 p-6 backdrop-blur-md">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Pacotes de Créditos</h2>
        <div className="space-y-4">
          {packages.map((pkg, idx) => (
            <div key={pkg.id} className="rounded-xl border border-solar-800/20 bg-background-secondary p-4">
              <div className="grid gap-3 sm:grid-cols-5">
                <div>
                  <label className="mb-1 block text-xs text-foreground-muted">Nome</label>
                  <input
                    type="text"
                    value={pkg.name}
                    onChange={(e) => {
                      const updated = [...packages];
                      updated[idx] = { ...updated[idx], name: e.target.value };
                      setPackages(updated);
                    }}
                    className="w-full rounded-lg border border-solar-800/30 bg-background-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-solar-500/50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-foreground-muted">Créditos</label>
                  <input
                    type="number"
                    value={pkg.credits}
                    onChange={(e) => {
                      const updated = [...packages];
                      updated[idx] = { ...updated[idx], credits: parseInt(e.target.value) || 0 };
                      setPackages(updated);
                    }}
                    min={1}
                    className="w-full rounded-lg border border-solar-800/30 bg-background-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-solar-500/50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-foreground-muted">Preço (centavos BRL)</label>
                  <input
                    type="number"
                    value={pkg.priceBrl}
                    onChange={(e) => {
                      const updated = [...packages];
                      updated[idx] = { ...updated[idx], priceBrl: parseInt(e.target.value) || 0 };
                      setPackages(updated);
                    }}
                    min={100}
                    className="w-full rounded-lg border border-solar-800/30 bg-background-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-solar-500/50"
                  />
                </div>
                <div className="flex items-end">
                  <div className="text-sm">
                    <p className="text-foreground-muted">{formatPrice(pkg.priceBrl)}</p>
                    <p className="text-xs text-foreground-muted/60">
                      {(pkg.priceBrl / pkg.credits / 100).toFixed(2)} R$/crédito
                    </p>
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-2 text-sm text-foreground-muted">
                    <input
                      type="checkbox"
                      checked={pkg.active}
                      onChange={(e) => {
                        const updated = [...packages];
                        updated[idx] = { ...updated[idx], active: e.target.checked };
                        setPackages(updated);
                      }}
                      className="rounded accent-solar-500"
                    />
                    Ativo
                  </label>
                  <button
                    onClick={() => handleSavePackage(pkg)}
                    className="rounded-lg bg-solar-500/20 px-3 py-1.5 text-xs font-medium text-solar-300 transition-all hover:bg-solar-500/30"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 5: StressTest ────────────────────────────────────────── */}
      <section className="rounded-2xl border border-solar-800/20 bg-background-secondary/40 p-6 backdrop-blur-md">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Stress Test — Mensagens por Pacote</h2>
        <p className="mb-4 text-sm text-foreground-muted">
          Quantas mensagens de cada perfil cabem em cada pacote?
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-solar-500/5 text-xs uppercase text-foreground-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Pacote</th>
                <th className="px-4 py-3 font-semibold">Créditos</th>
                {MESSAGE_PROFILES.map((p) => (
                  <th key={p.label} className="px-4 py-3 font-semibold">{p.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-solar-800/20">
              {packages.filter((p) => p.active).map((pkg) => (
                <tr key={pkg.id} className="transition-all hover:bg-solar-500/5">
                  <td className="px-4 py-3 font-medium text-foreground">{pkg.name}</td>
                  <td className="px-4 py-3 text-solar-300">{pkg.credits}</td>
                  {MESSAGE_PROFILES.map((profile) => {
                    const cost = calcCredits(profile.inputTokens, profile.outputTokens, config);
                    const msgs = Math.floor(pkg.credits / cost);
                    return (
                      <td key={profile.label} className="px-4 py-3 text-foreground-muted">
                        ~{msgs}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Section 6: PricingExplainer (custo OpenAI) ────────────────────── */}
      <section className="rounded-2xl border border-solar-800/20 bg-background-secondary/40 p-6 backdrop-blur-md">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Custo Real OpenAI</h2>
        <p className="mb-4 text-sm text-foreground-muted">
          Cotação USD-BRL informada manualmente (não salva no banco). Calcula custo real da API.
        </p>
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-foreground-muted">
            USD-BRL (cotação manual)
          </label>
          <input
            type="number"
            value={usdBrlRate}
            onChange={(e) => setUsdBrlRate(parseFloat(e.target.value) || 0)}
            min={0.01}
            step={0.01}
            className="w-48 rounded-lg border border-solar-800/30 bg-background-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-solar-500/50"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-solar-500/5 text-xs uppercase text-foreground-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Perfil</th>
                <th className="px-4 py-3 font-semibold">Custo USD (gpt-4o-mini)</th>
                <th className="px-4 py-3 font-semibold">Custo BRL</th>
                <th className="px-4 py-3 font-semibold">Créditos cobrados</th>
                <th className="px-4 py-3 font-semibold">Margem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-solar-800/20">
              {MESSAGE_PROFILES.map((profile) => {
                // gpt-4o-mini: $0.15/1M input, $0.60/1M output
                const costUsd =
                  (profile.inputTokens / 1_000_000) * 0.15 +
                  (profile.outputTokens / 1_000_000) * 0.60;
                const costBrl = costUsd * usdBrlRate;
                const creditsUsed = calcCredits(profile.inputTokens, profile.outputTokens, config);

                // Average price per credit from Pro package (6990/250 = 27.96 centavos)
                const proPkg = packages.find((p) => p.name === 'Pro') ?? packages[1];
                const centsPerCredit = proPkg ? proPkg.priceBrl / proPkg.credits : 29.9;
                const revenueBrl = (creditsUsed * centsPerCredit) / 100;
                const margin = revenueBrl > 0 ? ((revenueBrl - costBrl) / revenueBrl) * 100 : 0;

                return (
                  <tr key={profile.label} className="transition-all hover:bg-solar-500/5">
                    <td className="px-4 py-3 font-medium text-foreground">{profile.label}</td>
                    <td className="px-4 py-3 text-foreground-muted">${costUsd.toFixed(6)}</td>
                    <td className="px-4 py-3 text-foreground-muted">R$ {costBrl.toFixed(4)}</td>
                    <td className="px-4 py-3 text-solar-300 font-medium">{creditsUsed}</td>
                    <td className={`px-4 py-3 font-medium ${margin > 50 ? 'text-green-400' : margin > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                      {margin.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
