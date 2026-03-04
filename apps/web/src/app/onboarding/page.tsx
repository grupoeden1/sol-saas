'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';

interface OnboardingProfile {
  id: string;
  name: string;
  answers: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

const ONBOARDING_QUESTIONS = [
  { key: 'O1', label: 'Descreva seu produto/serviço de forma detalhada', type: 'text' as const, placeholder: 'Ex: "curso online de emagrecimento, R$197, entrego em videoaulas gravadas"' },
  { key: 'O2', label: 'Promessa ou resultado que o produto entrega', type: 'text' as const, placeholder: 'Ex: "perder 3kg em 5 dias com a dieta da selva"' },
  { key: 'O3', label: 'Qual o público-alvo do seu produto?', type: 'text' as const, placeholder: 'Ex: "mulheres 30-50 anos que querem emagrecer"' },
  { key: 'O4', label: 'Qual a principal dor/problema do seu público?', type: 'text' as const, placeholder: 'Ex: "não conseguem perder peso com dietas restritivas"' },
  { key: 'O5', label: 'Qual seu diferencial competitivo?', type: 'text' as const, placeholder: 'Ex: "método sem restrição alimentar com suporte individual"' },
  {
    key: 'O6', label: 'O público já sabe que tem o problema que você resolve?', type: 'select' as const,
    options: [
      { value: 'A', label: 'Não sabem que têm o problema' },
      { value: 'B', label: 'Sabem que têm, mas não conhecem soluções' },
      { value: 'C', label: 'Conhecem soluções, mas não a sua' },
      { value: 'D', label: 'SOL define' },
    ],
  },
  {
    key: 'O7', label: 'Faixa de preço do produto', type: 'select' as const,
    options: [
      { value: 'A', label: 'Até R$97' },
      { value: 'B', label: 'R$97–R$297' },
      { value: 'C', label: 'R$297–R$997' },
      { value: 'D', label: 'R$997–R$2.997' },
      { value: 'E', label: '+R$2.997' },
    ],
  },
  {
    key: 'O8', label: 'Em qual(is) rede(s) social(is) você publica?', type: 'select' as const,
    options: [
      { value: 'A', label: 'Instagram' },
      { value: 'B', label: 'TikTok' },
      { value: 'C', label: 'Ambos' },
      { value: 'D', label: 'Outra' },
    ],
  },
  {
    key: 'O9', label: 'Já rodou anúncios pagos?', type: 'select' as const,
    options: [
      { value: 'A', label: 'Sim, ativamente' },
      { value: 'B', label: 'Sim, mas parei' },
      { value: 'C', label: 'Nunca' },
      { value: 'D', label: 'Pretendo começar' },
    ],
  },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<OnboardingProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    setLoading(true);
    const res = await fetch('/api/onboarding');
    if (res.ok) {
      setProfiles(await res.json());
    }
    setLoading(false);
  }

  function startNew() {
    setEditingId(null);
    setName('');
    setAnswers({});
    setError('');
    setShowForm(true);
  }

  function startEdit(profile: OnboardingProfile) {
    setEditingId(profile.id);
    setName(profile.name);
    setAnswers(profile.answers);
    setError('');
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este perfil?')) return;

    const res = await fetch(`/api/onboarding/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setProfiles((prev) => prev.filter((p) => p.id !== id));
    } else {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? 'Erro ao excluir perfil');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const missing = ONBOARDING_QUESTIONS.filter((q) => !answers[q.key]?.trim());
    if (missing.length > 0 || !name.trim()) {
      setError('Preencha todos os campos obrigatórios.');
      setSaving(false);
      return;
    }

    const url = editingId ? `/api/onboarding/${editingId}` : '/api/onboarding';
    const method = editingId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), answers }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? 'Erro ao salvar perfil');
      setSaving(false);
      return;
    }

    setSaving(false);
    setShowForm(false);
    loadProfiles();
  }

  function selectProfile(profileId: string) {
    router.push(`/quiz?profileId=${profileId}`);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a]">
        <div className="text-foreground-muted">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a]">
      <div className="pointer-events-none absolute inset-0 z-0 opacity-20 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-solar-500/30 via-transparent to-transparent" />

      <header className="fixed left-0 right-0 top-4 z-50 mx-auto flex h-14 w-[calc(100%-2rem)] max-w-4xl items-center justify-between rounded-full border border-solar-800/30 bg-background-secondary/70 px-4 backdrop-blur-xl md:px-6">
        <Link href="/roteiros" className="flex items-center gap-2 text-solar-300 transition-all hover:opacity-80">
          <Logo size={24} />
          <span className="text-sm font-semibold">SOL</span>
        </Link>
        <span className="text-xs font-semibold uppercase tracking-widest text-solar-400">Onboarding</span>
      </header>

      <main className="relative z-10 flex-1 px-4 pb-12 pt-28 md:px-8">
        <div className="mx-auto max-w-3xl space-y-8">

          {!showForm ? (
            <>
              <div className="flex items-end justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Meus Perfis</h1>
                  <p className="mt-1 text-sm text-foreground-muted">
                    Selecione um perfil para iniciar o quiz ou crie um novo.
                  </p>
                </div>
                <button
                  onClick={startNew}
                  className="rounded-xl bg-solar-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-solar-400"
                >
                  Novo Perfil
                </button>
              </div>

              {profiles.length === 0 ? (
                <div className="rounded-2xl border border-solar-800/30 bg-background-secondary p-8 text-center">
                  <p className="text-foreground-muted">Nenhum perfil cadastrado.</p>
                  <button
                    onClick={startNew}
                    className="mt-4 rounded-xl bg-solar-500/10 px-4 py-2 text-sm font-medium text-solar-300 transition-all hover:bg-solar-500/20"
                  >
                    Criar primeiro perfil
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {profiles.map((profile) => (
                    <div
                      key={profile.id}
                      className="flex items-center justify-between rounded-2xl border border-solar-800/30 bg-background-secondary p-4 transition-all hover:border-solar-500/30"
                    >
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => selectProfile(profile.id)}
                      >
                        <h3 className="font-medium text-foreground">{profile.name}</h3>
                        <p className="mt-0.5 text-xs text-foreground-muted">
                          Criado em {new Date(profile.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => selectProfile(profile.id)}
                          className="rounded-lg bg-solar-500 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-solar-400"
                        >
                          Iniciar Quiz
                        </button>
                        <button
                          onClick={() => startEdit(profile)}
                          className="rounded-lg bg-solar-500/10 px-3 py-1.5 text-xs font-medium text-solar-300 transition-all hover:bg-solar-500/20"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(profile.id)}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-400 transition-all hover:bg-red-500/10"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-foreground">
                  {editingId ? 'Editar Perfil' : 'Novo Perfil'}
                </h1>
                <button
                  onClick={() => setShowForm(false)}
                  className="rounded-lg px-3 py-1.5 text-sm text-foreground-muted transition-all hover:bg-background-secondary"
                >
                  Voltar
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Nome do perfil (produto/nicho)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Curso de Marketing Digital"
                    className="w-full rounded-xl border border-solar-800/30 bg-background-secondary px-4 py-3 text-sm text-foreground placeholder:text-foreground-muted/50 focus:border-solar-500/50 focus:outline-none"
                  />
                </div>

                {ONBOARDING_QUESTIONS.map((q) => (
                  <div key={q.key}>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      <span className="mr-2 text-solar-400">{q.key}.</span>
                      {q.label}
                    </label>
                    {q.type === 'text' ? (
                      <textarea
                        value={answers[q.key] ?? ''}
                        onChange={(e) => setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))}
                        placeholder={q.placeholder}
                        rows={3}
                        className="w-full rounded-xl border border-solar-800/30 bg-background-secondary px-4 py-3 text-sm text-foreground placeholder:text-foreground-muted/50 focus:border-solar-500/50 focus:outline-none"
                      />
                    ) : (
                      <div className="space-y-2">
                        {q.options.map((opt) => (
                          <label
                            key={opt.value}
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-all ${
                              answers[q.key] === opt.value
                                ? 'border-solar-500/50 bg-solar-500/10 text-foreground'
                                : 'border-solar-800/30 bg-background-secondary text-foreground-muted hover:border-solar-500/30'
                            }`}
                          >
                            <input
                              type="radio"
                              name={q.key}
                              value={opt.value}
                              checked={answers[q.key] === opt.value}
                              onChange={(e) => setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))}
                              className="sr-only"
                            />
                            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-solar-500/50 text-xs">
                              {answers[q.key] === opt.value ? '●' : opt.value}
                            </span>
                            {opt.label}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {error && (
                  <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-xl bg-solar-500 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-solar-400 disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : editingId ? 'Atualizar Perfil' : 'Criar Perfil'}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
