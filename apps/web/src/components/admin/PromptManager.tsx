'use client';

import { useState, useEffect, useCallback } from 'react';

interface PromptData {
  key: string;
  label: string;
  description: string;
  category: string;
  defaultValue: string;
  currentValue: string | null;
  isOverridden: boolean;
}

export default function PromptManager() {
  const [prompts, setPrompts] = useState<PromptData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [showDefault, setShowDefault] = useState<string | null>(null);

  const fetchPrompts = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/prompts');
      if (res.ok) {
        const data = await res.json();
        setPrompts(data.prompts);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  const handleSave = async (key: string) => {
    const value = editValues[key];
    if (!value?.trim()) return;

    setSaving(key);
    try {
      const res = await fetch('/api/admin/prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: value.trim() }),
      });

      if (res.ok) {
        setPrompts((prev) =>
          prev.map((p) =>
            p.key === key
              ? { ...p, currentValue: value.trim(), isOverridden: true }
              : p,
          ),
        );
        setExpandedKey(null);
      }
    } finally {
      setSaving(null);
    }
  };

  const handleReset = async (key: string) => {
    if (!confirm('Resetar este prompt para o valor padrão?')) return;

    setSaving(key);
    try {
      const res = await fetch('/api/admin/prompts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });

      if (res.ok) {
        setPrompts((prev) =>
          prev.map((p) =>
            p.key === key
              ? { ...p, currentValue: null, isOverridden: false }
              : p,
          ),
        );
        setEditValues((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    } finally {
      setSaving(null);
    }
  };

  const toggleExpand = (key: string, prompt: PromptData) => {
    if (expandedKey === key) {
      setExpandedKey(null);
    } else {
      setExpandedKey(key);
      if (!(key in editValues)) {
        setEditValues((prev) => ({
          ...prev,
          [key]: prompt.currentValue ?? prompt.defaultValue,
        }));
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-solar-500 border-t-transparent" />
      </div>
    );
  }

  // Group prompts by category
  const categories = prompts.reduce<Record<string, PromptData[]>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {Object.entries(categories).map(([category, categoryPrompts]) => (
        <section key={category}>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-foreground-muted">
            {category}
          </h2>
          <div className="space-y-3">
            {categoryPrompts.map((prompt) => (
              <div
                key={prompt.key}
                className="rounded-2xl border border-solar-800/20 bg-background-secondary/40 backdrop-blur-md transition-all"
              >
                {/* Header row */}
                <button
                  type="button"
                  onClick={() => toggleExpand(prompt.key, prompt)}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {prompt.label}
                      </span>
                      {prompt.isOverridden ? (
                        <span className="rounded-full bg-solar-500/20 px-2 py-0.5 text-xs font-medium text-solar-300">
                          Customizado
                        </span>
                      ) : (
                        <span className="rounded-full bg-zinc-700/30 px-2 py-0.5 text-xs text-foreground-muted">
                          Padrão
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-foreground-muted">
                      {prompt.description}
                    </p>
                  </div>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className={`shrink-0 text-foreground-muted transition-transform ${expandedKey === prompt.key ? 'rotate-180' : ''}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {/* Expanded editor */}
                {expandedKey === prompt.key && (
                  <div className="border-t border-solar-800/10 px-5 pb-5 pt-4">
                    <textarea
                      value={editValues[prompt.key] ?? ''}
                      onChange={(e) =>
                        setEditValues((prev) => ({
                          ...prev,
                          [prompt.key]: e.target.value,
                        }))
                      }
                      rows={Math.min(
                        20,
                        Math.max(
                          5,
                          (editValues[prompt.key] ?? '').split('\n').length + 2,
                        ),
                      )}
                      className="w-full rounded-xl border border-solar-800/30 bg-background/50 px-4 py-3 font-mono text-sm leading-relaxed text-foreground placeholder:text-foreground-muted/50 focus:border-solar-500 focus:outline-none"
                    />

                    {/* Default preview toggle */}
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() =>
                          setShowDefault(
                            showDefault === prompt.key ? null : prompt.key,
                          )
                        }
                        className="text-xs text-foreground-muted/70 underline transition-colors hover:text-foreground-muted"
                      >
                        {showDefault === prompt.key
                          ? 'Ocultar valor padrão'
                          : 'Ver valor padrão'}
                      </button>
                      {showDefault === prompt.key && (
                        <pre className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-solar-800/10 bg-background/30 p-3 font-mono text-xs leading-relaxed text-foreground-muted">
                          {prompt.defaultValue}
                        </pre>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="mt-4 flex items-center gap-3">
                      <button
                        onClick={() => handleSave(prompt.key)}
                        disabled={saving === prompt.key}
                        className="rounded-xl bg-solar-500 px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-solar-600 disabled:opacity-50"
                      >
                        {saving === prompt.key ? 'Salvando...' : 'Salvar'}
                      </button>
                      {prompt.isOverridden && (
                        <button
                          onClick={() => handleReset(prompt.key)}
                          disabled={saving === prompt.key}
                          className="rounded-xl bg-red-500/10 px-5 py-2 text-sm font-medium text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-50"
                        >
                          Resetar para Padrão
                        </button>
                      )}
                      <button
                        onClick={() => setExpandedKey(null)}
                        className="rounded-xl bg-zinc-700/20 px-5 py-2 text-sm font-medium text-foreground-muted transition-all hover:bg-zinc-700/30"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
