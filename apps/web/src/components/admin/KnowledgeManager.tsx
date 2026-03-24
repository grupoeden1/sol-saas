'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  tags: string[];
  isActive: boolean;
  documentCount: number;
  createdAt: string;
}

export default function KnowledgeManager() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const fetchCollections = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/knowledge/collections');
      if (res.ok) {
        const data = await res.json();
        setCollections(data.collections);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch('/api/admin/knowledge/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: description || undefined, tags }),
      });

      if (res.ok) {
        setName('');
        setDescription('');
        setTagsInput('');
        setShowCreate(false);
        await fetchCollections();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const res = await fetch(`/api/admin/knowledge/collections/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !currentActive }),
    });
    if (res.ok) {
      setCollections((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isActive: !currentActive } : c)),
      );
    }
  };

  const handleDelete = async (id: string, collName: string) => {
    if (!confirm(`Deletar colecao "${collName}" e todos os documentos? Esta acao nao pode ser desfeita.`)) {
      return;
    }

    const res = await fetch(`/api/admin/knowledge/collections/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setCollections((prev) => prev.filter((c) => c.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-solar-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-xl bg-solar-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-solar-600"
        >
          {showCreate ? 'Cancelar' : 'Nova Colecao'}
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="rounded-2xl border border-solar-800/20 bg-background-secondary/40 p-6 backdrop-blur-md"
        >
          <h3 className="mb-4 text-lg font-semibold text-foreground">Nova Colecao</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground-muted">Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Ex: Scripts de Alta Conversao"
                className="w-full rounded-xl border border-solar-800/30 bg-background/50 px-4 py-2.5 text-sm text-foreground placeholder:text-foreground-muted/50 focus:border-solar-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground-muted">Descricao</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descricao opcional da colecao"
                rows={2}
                className="w-full rounded-xl border border-solar-800/30 bg-background/50 px-4 py-2.5 text-sm text-foreground placeholder:text-foreground-muted/50 focus:border-solar-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground-muted">Tags (separadas por virgula)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="copy, vendas, ganchos"
                className="w-full rounded-xl border border-solar-800/30 bg-background/50 px-4 py-2.5 text-sm text-foreground placeholder:text-foreground-muted/50 focus:border-solar-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="rounded-xl bg-solar-500 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-solar-600 disabled:opacity-50"
            >
              {creating ? 'Criando...' : 'Criar Colecao'}
            </button>
          </div>
        </form>
      )}

      {/* Collections Grid */}
      {collections.length === 0 ? (
        <div className="rounded-2xl border border-solar-800/20 bg-background-secondary/40 p-12 text-center backdrop-blur-md">
          <p className="text-foreground-muted">Nenhuma colecao criada ainda.</p>
          <p className="mt-1 text-sm text-foreground-muted/70">
            Crie uma colecao para comecar a alimentar a base de conhecimento da IA.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((col) => (
            <div
              key={col.id}
              className="group relative rounded-2xl border border-solar-800/20 bg-background-secondary/40 p-5 backdrop-blur-md transition-all hover:border-solar-500/30"
            >
              {/* Active toggle */}
              <button
                onClick={() => handleToggleActive(col.id, col.isActive)}
                className={`absolute right-3 top-3 h-3 w-3 rounded-full transition-colors ${
                  col.isActive ? 'bg-green-500' : 'bg-zinc-600'
                }`}
                title={col.isActive ? 'Ativa' : 'Inativa'}
              />

              <Link href={`/admin/knowledge/${col.slug}`} className="block">
                <h3 className="text-lg font-semibold text-foreground group-hover:text-solar-400 transition-colors">
                  {col.name}
                </h3>
                {col.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-foreground-muted">
                    {col.description}
                  </p>
                )}

                {/* Tags */}
                {col.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {col.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-solar-500/10 px-2 py-0.5 text-xs text-solar-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Stats */}
                <div className="mt-4 flex items-center gap-4 text-xs text-foreground-muted">
                  <span>{col.documentCount} documento{col.documentCount !== 1 ? 's' : ''}</span>
                  <span>{col.isActive ? 'Ativa' : 'Inativa'}</span>
                </div>
              </Link>

              {/* Delete */}
              <button
                onClick={() => handleDelete(col.id, col.name)}
                className="mt-3 text-xs text-red-400/60 transition-colors hover:text-red-400"
              >
                Deletar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
