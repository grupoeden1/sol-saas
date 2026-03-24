'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Document {
  id: string;
  title: string;
  fileName: string | null;
  sourceType: string;
  fileSize: number | null;
  chunkCount: number;
  totalTokens: number;
  processingStatus: string;
  errorMessage: string | null;
  createdAt: string;
}

interface SearchResult {
  text: string;
  score: number;
  sourceTitle: string;
  sourceType: string;
  collectionName: string;
}

interface CollectionData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  tags: string[];
  isActive: boolean;
  qdrantName: string;
  documentCount: number;
  documents: Document[];
}

interface Props {
  collection: CollectionData;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '-';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function typeIcon(type: string): string {
  switch (type) {
    case 'PDF': return 'PDF';
    case 'DOCX': return 'DOC';
    case 'TXT': return 'TXT';
    case 'VIDEO': return 'VID';
    default: return '?';
  }
}

function statusBadge(status: string, errorMessage: string | null) {
  switch (status) {
    case 'QUEUED':
      return (
        <span className="inline-flex items-center gap-1 text-xs text-amber-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
          Na fila
        </span>
      );
    case 'PROCESSING':
      return (
        <span className="inline-flex items-center gap-1 text-xs text-blue-400">
          <span className="h-2 w-2 animate-spin rounded-full border border-blue-400 border-t-transparent" />
          Processando
        </span>
      );
    case 'COMPLETED':
      return (
        <span className="inline-flex items-center gap-1 text-xs text-green-400">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Concluido
        </span>
      );
    case 'FAILED':
      return (
        <span className="inline-flex items-center gap-1 text-xs text-red-400" title={errorMessage || ''}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          Falhou
        </span>
      );
    default:
      return <span className="text-xs text-foreground-muted">{status}</span>;
  }
}

export default function KnowledgeCollectionDetail({ collection }: Props) {
  const [documents, setDocuments] = useState<Document[]>(collection.documents);
  const [uploading, setUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchTime, setSearchTime] = useState<number | null>(null);

  // Poll for processing status
  useEffect(() => {
    const processingDocs = documents.filter(
      (d) => d.processingStatus === 'QUEUED' || d.processingStatus === 'PROCESSING',
    );
    if (processingDocs.length === 0) return;

    const interval = setInterval(async () => {
      for (const doc of processingDocs) {
        try {
          const res = await fetch(`/api/admin/knowledge/documents/${doc.id}/status`);
          if (res.ok) {
            const status = await res.json();
            setDocuments((prev) =>
              prev.map((d) =>
                d.id === doc.id
                  ? {
                      ...d,
                      processingStatus: status.processingStatus,
                      chunkCount: status.chunkCount ?? d.chunkCount,
                      totalTokens: status.totalTokens ?? d.totalTokens,
                      errorMessage: status.errorMessage,
                    }
                  : d,
              ),
            );
          }
        } catch {
          // Ignore polling errors
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [documents]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!uploadTitle) {
        // Auto-fill title from filename (without extension)
        setUploadTitle(file.name.replace(/\.[^.]+$/, ''));
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !uploadTitle.trim()) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('collectionId', collection.id);
      formData.append('title', uploadTitle.trim());
      formData.append('file', selectedFile);

      const res = await fetch('/api/admin/knowledge/documents', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        // Add new doc to list
        setDocuments((prev) => [
          {
            id: data.documentId,
            title: uploadTitle.trim(),
            fileName: selectedFile.name,
            sourceType: selectedFile.type.startsWith('video/') ? 'VIDEO' : 'PDF',
            fileSize: selectedFile.size,
            chunkCount: 0,
            totalTokens: 0,
            processingStatus: 'QUEUED',
            errorMessage: null,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
        setSelectedFile(null);
        setUploadTitle('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string, docTitle: string) => {
    if (!confirm(`Deletar "${docTitle}"? Os chunks e embeddings serao removidos.`)) return;

    const res = await fetch(`/api/admin/knowledge/documents/${docId}`, { method: 'DELETE' });
    if (res.ok) {
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    }
  };

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);

    try {
      const res = await fetch('/api/admin/knowledge/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          collections: [collection.qdrantName],
          limit: 5,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results);
        setSearchTime(data.searchTimeMs);
      }
    } finally {
      setSearching(false);
    }
  }, [searchQuery, collection.qdrantName]);

  return (
    <div className="space-y-8">
      {/* Upload Section */}
      <section className="rounded-2xl border border-solar-800/20 bg-background-secondary/40 p-6 backdrop-blur-md">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Upload de Documento</h2>
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground-muted">Titulo</label>
              <input
                type="text"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                required
                placeholder="Nome do documento"
                className="w-full rounded-xl border border-solar-800/30 bg-background/50 px-4 py-2.5 text-sm text-foreground placeholder:text-foreground-muted/50 focus:border-solar-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground-muted">Arquivo</label>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.docx,.txt,.md,.mp4,.mov,.avi,.webm,.mkv"
                className="w-full rounded-xl border border-solar-800/30 bg-background/50 px-4 py-2 text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-solar-500/20 file:px-3 file:py-1 file:text-xs file:font-medium file:text-solar-300"
              />
            </div>
          </div>

          {selectedFile && (
            <p className="text-xs text-foreground-muted">
              {selectedFile.name} ({formatFileSize(selectedFile.size)}) —{' '}
              {selectedFile.type.startsWith('video/') ? 'Video (sera transcrito e analisado)' : 'Documento'}
            </p>
          )}

          <button
            type="submit"
            disabled={uploading || !selectedFile || !uploadTitle.trim()}
            className="rounded-xl bg-solar-500 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-solar-600 disabled:opacity-50"
          >
            {uploading ? 'Enviando...' : 'Upload e Processar'}
          </button>
        </form>
      </section>

      {/* Documents List */}
      <section className="rounded-2xl border border-solar-800/20 bg-background-secondary/40 p-6 backdrop-blur-md">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Documentos ({documents.length})
        </h2>

        {documents.length === 0 ? (
          <p className="text-sm text-foreground-muted">Nenhum documento nesta colecao.</p>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-4 rounded-xl border border-solar-800/10 bg-background/30 px-4 py-3"
              >
                {/* Type Badge */}
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-solar-500/10 text-xs font-bold text-solar-400">
                  {typeIcon(doc.sourceType)}
                </span>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{doc.title}</p>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-foreground-muted">
                    {doc.fileName && <span>{doc.fileName}</span>}
                    <span>{formatFileSize(doc.fileSize)}</span>
                    {doc.processingStatus === 'COMPLETED' && (
                      <>
                        <span>{doc.chunkCount} chunks</span>
                        <span>{doc.totalTokens} tokens</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="shrink-0">{statusBadge(doc.processingStatus, doc.errorMessage)}</div>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(doc.id, doc.title)}
                  className="shrink-0 rounded-lg p-1.5 text-foreground-muted/50 transition-colors hover:text-red-400"
                  title="Deletar"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Search Test */}
      <section className="rounded-2xl border border-solar-800/20 bg-background-secondary/40 p-6 backdrop-blur-md">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Teste de Busca Semantica</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Digite uma pergunta para testar o RAG..."
            className="flex-1 rounded-xl border border-solar-800/30 bg-background/50 px-4 py-2.5 text-sm text-foreground placeholder:text-foreground-muted/50 focus:border-solar-500 focus:outline-none"
          />
          <button
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            className="shrink-0 rounded-xl bg-solar-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-solar-600 disabled:opacity-50"
          >
            {searching ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        {searchTime !== null && (
          <p className="mt-2 text-xs text-foreground-muted">
            {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''} em {searchTime}ms
          </p>
        )}

        {searchResults.length > 0 && (
          <div className="mt-4 space-y-3">
            {searchResults.map((result, i) => (
              <div
                key={i}
                className="rounded-xl border border-solar-800/10 bg-background/30 p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-solar-400">{result.sourceTitle}</span>
                  <span className="rounded-full bg-solar-500/10 px-2 py-0.5 text-xs text-solar-300">
                    Score: {(result.score * 100).toFixed(1)}%
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-foreground-muted">{result.text}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
