'use client';

import { useCredits } from '@/components/layout/CreditsProvider';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Logo from '@/components/Logo';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const LottieLogo = dynamic(() => import('@/components/LottieLogo'), { ssr: false });

// ─── Constants (client-side validation) ───────────────────────
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES_PER_MSG = 3;
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'text/plain', 'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  attachments?: Array<{
    type: 'image' | 'document';
    name: string;
    previewUrl?: string;
  }>;
}

interface Conversation {
  id: string;
  title: string;
  createdAt: Date;
}

// ── ConversationSidebar ──────────────────────────────────────
function ConversationSidebar({
  conversations,
  currentId,
  onSelect,
  onNew,
  isLoading,
  isOpen,
  onClose,
}: {
  conversations: Conversation[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  isLoading: boolean;
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed bottom-4 left-4 top-24 z-40 flex w-72 flex-col overflow-hidden rounded-2xl border border-solar-800/20 bg-background-secondary/80 backdrop-blur-xl transition-transform duration-300 md:relative md:top-0 md:h-[calc(100dvh-7rem)] md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-[120%]'
        }`}
        role="listbox"
        aria-label="Conversas"
      >
        <div className="p-3">
          <button
            onClick={() => { onNew(); onClose(); }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-solar-500/30 bg-solar-500/10 px-4 py-2.5 text-sm font-medium text-solar-300 transition-all hover:bg-solar-500/20"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nova Conversa
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-16 w-full" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-foreground-muted">
              Nenhuma conversa ainda
            </p>
          ) : (
            <div className="space-y-1">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  role="option"
                  aria-selected={currentId === conv.id}
                  onClick={() => { onSelect(conv.id); onClose(); }}
                  className={`w-full rounded-lg px-3 py-3 text-left transition-all ${
                    currentId === conv.id
                      ? 'border border-solar-500/50 bg-solar-500/5'
                      : 'border border-transparent hover:border-solar-500/20 hover:bg-solar-500/5'
                  }`}
                >
                  <p className="truncate text-sm font-medium text-foreground">{conv.title}</p>
                  <p className="mt-0.5 text-xs text-foreground-muted">
                    {formatDistanceToNow(conv.createdAt, { addSuffix: true, locale: ptBR })}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

// ── MessageBubble ────────────────────────────────────────────
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const handleCopy = () => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className="max-w-[80%] md:max-w-[70%]">
        {!isUser && (
          <div className="mb-1.5 flex items-center gap-1.5">
            <Logo size={16} />
            <span className="text-xs font-medium text-solar-300">SOL</span>
          </div>
        )}

        {/* Attachment previews (session-only, not persisted) */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {message.attachments.map((att, idx) => (
              att.type === 'image' && att.previewUrl ? (
                <img
                  key={idx}
                  src={att.previewUrl}
                  alt={att.name}
                  className="max-w-[200px] rounded-lg border border-solar-800/30 object-cover"
                />
              ) : att.type === 'document' ? (
                <div key={idx} className="flex items-center gap-1.5 rounded-lg border border-solar-500/30 bg-solar-500/10 px-2.5 py-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-solar-300">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span className="max-w-[120px] truncate text-xs text-solar-300">{att.name}</span>
                </div>
              ) : null
            ))}
          </div>
        )}

        <div className={`relative rounded-2xl px-4 py-3 ${
          isUser ? 'bg-solar-500/10 text-foreground' : 'group bg-background-secondary text-foreground'
        }`}>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {message.content}
          </p>

          {!isUser && message.content && (
            <button
              onClick={handleCopy}
              aria-label="Copiar resposta"
              className="absolute right-2 top-2 rounded-md p-1 text-foreground-muted/50 transition-all hover:bg-solar-500/10 hover:text-foreground-muted md:opacity-0 md:group-hover:opacity-100"
            >
              {copied ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-solar-300">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
          )}
        </div>

        <p className={`mt-1 text-xs text-foreground-muted/60 ${isUser ? 'text-right' : 'text-left'}`}>
          {formatDistanceToNow(message.createdAt, { addSuffix: true, locale: ptBR })}
        </p>
      </div>
    </div>
  );
}

// ── LoadingDots ──────────────────────────────────────────────
function LoadingDots() {
  return (
    <div className="mb-4 flex justify-start">
      <div>
        <div className="mb-1.5 flex items-center gap-1.5">
          <Logo size={16} />
          <span className="text-xs font-medium text-solar-300">SOL</span>
        </div>
        <div
          className="inline-flex items-center gap-1.5 rounded-2xl border border-solar-800/20 bg-background-secondary px-4 py-3"
          aria-label="Carregando resposta"
        >
          <div className="loading-dot" />
          <div className="loading-dot" />
          <div className="loading-dot" />
        </div>
      </div>
    </div>
  );
}

// ── ChatInput ────────────────────────────────────────────────
function ChatInput({
  onSend,
  disabled,
  noCredits,
}: {
  onSend: (msg: string, files?: File[]) => void;
  disabled: boolean;
  noCredits: boolean;
}) {
  const [value, setValue] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Map file index → blob URL (only for images)
  const previewUrlsRef = useRef<Map<number, string>>(new Map());

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled || noCredits) return;
    onSend(trimmed, files.length > 0 ? files : undefined);
    setValue('');
    // Revoke blob URLs
    previewUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    previewUrlsRef.current = new Map();
    setFiles([]);
    setFileError(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = '44px';
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? []);
    if (selectedFiles.length === 0) return;

    setFileError(null);

    const totalFiles = files.length + selectedFiles.length;
    if (totalFiles > MAX_FILES_PER_MSG) {
      setFileError('Máximo de 3 arquivos por mensagem.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    for (const file of selectedFiles) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        setFileError(`Tipo de arquivo não suportado: ${file.type}.`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        setFileError(`Arquivo '${file.name}' excede o limite de 10MB (${sizeMB}MB).`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    // Create preview URLs for images, indexed by their position in the new files array
    setFiles(prev => {
      const base = prev.length;
      for (let i = 0; i < selectedFiles.length; i++) {
        if (IMAGE_MIMES.has(selectedFiles[i].type)) {
          const url = URL.createObjectURL(selectedFiles[i]);
          previewUrlsRef.current.set(base + i, url);
        }
      }
      return [...prev, ...selectedFiles];
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      // Revoke blob URL for this specific file
      const url = previewUrlsRef.current.get(index);
      if (url) URL.revokeObjectURL(url);

      // Rebuild map with shifted indices
      const newMap = new Map<number, string>();
      previewUrlsRef.current.forEach((u, i) => {
        if (i < index) newMap.set(i, u);
        else if (i > index) newMap.set(i - 1, u);
      });
      previewUrlsRef.current = newMap;

      return prev.filter((_, i) => i !== index);
    });
    setFileError(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div className="absolute bottom-4 left-0 right-0 z-10 px-4 md:px-8">
      <div className="mx-auto max-w-4xl">
        {/* File previews */}
        {files.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2 rounded-xl border border-solar-800/20 bg-background-secondary/50 p-2">
            {files.map((file, idx) => (
              <div key={idx} className="group/file relative flex items-center gap-2 rounded-lg border border-solar-800/30 bg-background-secondary px-2.5 py-1.5">
                {IMAGE_MIMES.has(file.type) ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="h-12 w-12 rounded object-cover"
                    onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                  />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-solar-300">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                )}
                <div className="min-w-0">
                  <p className="max-w-[120px] truncate text-xs text-foreground">{file.name}</p>
                  <p className="text-xs text-foreground-muted/60">{formatFileSize(file.size)}</p>
                </div>
                <button
                  onClick={() => removeFile(idx)}
                  className="ml-1 shrink-0 rounded p-0.5 text-foreground-muted/50 transition-all hover:text-red-400"
                  aria-label={`Remover ${file.name}`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* File error */}
        {fileError && (
          <p className="mb-2 text-xs text-red-400">{fileError}</p>
        )}

        {/* Input bar */}
        <div className="flex items-end gap-2 rounded-2xl border border-solar-800/30 bg-background-secondary/80 p-2 shadow-xl shadow-black/20 backdrop-blur-xl md:p-3">
          {/* Attachment button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || noCredits || files.length >= MAX_FILES_PER_MSG}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-foreground-muted/50 transition-all hover:bg-solar-500/10 hover:text-foreground-muted disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Anexar arquivo"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ALLOWED_MIME_TYPES.join(',')}
            onChange={handleFileChange}
            className="hidden"
          />

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            disabled={disabled || noCredits}
            placeholder={noCredits ? 'Compre créditos para continuar...' : 'Digite sua mensagem...'}
            className={`chat-textarea flex-1 resize-none rounded-xl bg-transparent px-4 py-3 text-sm text-foreground outline-none transition-all ${
              noCredits
                ? 'cursor-not-allowed opacity-50 placeholder:text-red-400/60'
                : 'placeholder:text-foreground-muted/40 focus:text-foreground'
            }`}
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={disabled || noCredits || !value.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-solar-500 text-background transition-all hover:bg-solar-600 hover:shadow-lg hover:shadow-solar-500/25 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Enviar mensagem"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-0.5">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ChatPage ────────────────────────────────────────────
export default function ChatPage() {
  const { balanceCents, updateCredits } = useCredits();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [noCredits, setNoCredits] = useState(balanceCents <= 0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [initialIdHandled, setInitialIdHandled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNoCredits(balanceCents <= 0);
  }, [balanceCents]);

  // Load conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await fetch('/api/conversations');
        if (res.ok) {
          const data = await res.json();
          setConversations(
            data.map((conv: { id: string; title: string; createdAt: string }) => ({
              ...conv,
              createdAt: new Date(conv.createdAt),
            }))
          );
        }
      } catch (error) {
        console.error('Failed to load conversations:', error);
      } finally {
        setIsLoadingConversations(false);
      }
    };
    fetchConversations();
  }, []);

  // Load messages when conversation changes
  const handleSelectConversation = useCallback(async (id: string) => {
    setCurrentConversationId(id);
    setLoading(true);
    try {
      const res = await fetch(`/api/conversations/${id}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(
          data.map((msg: { id: string; role: string; content: string; createdAt: string }) => ({
            ...msg,
            createdAt: new Date(msg.createdAt),
          }))
        );
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Open conversation from URL query param (?id=xxx)
  useEffect(() => {
    if (initialIdHandled || isLoadingConversations) return;
    const id = searchParams.get('id');
    if (id) {
      handleSelectConversation(id);
    }
    setInitialIdHandled(true);
  }, [initialIdHandled, isLoadingConversations, searchParams, handleSelectConversation]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNewConversation = useCallback(() => {
    setCurrentConversationId(null);
    setMessages([]);
  }, []);

  const handleSendMessage = useCallback(async (content: string, files?: File[]) => {
    if (!content.trim() || loading || noCredits) return;

    // Build attachments metadata for the user message (session-only previews)
    const attachments: Message['attachments'] = files?.map(file => ({
      type: IMAGE_MIMES.has(file.type) ? 'image' as const : 'document' as const,
      name: file.name,
      previewUrl: IMAGE_MIMES.has(file.type) ? URL.createObjectURL(file) : undefined,
    }));

    const userMessageId = `temp-user-${Date.now()}`;
    const userMessage: Message = {
      id: userMessageId,
      role: 'user',
      content,
      createdAt: new Date(),
      attachments,
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      let res: Response;

      if (files && files.length > 0) {
        // Multipart/form-data — with attachments
        const formData = new FormData();
        formData.append('message', content);
        if (currentConversationId) {
          formData.append('conversationId', currentConversationId);
        }
        for (const file of files) {
          formData.append('files', file);
        }
        // Do NOT set Content-Type — browser generates boundary automatically
        res = await fetch('/api/chat', {
          method: 'POST',
          body: formData,
        });
      } else {
        // JSON — existing flow unchanged
        res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: currentConversationId,
            message: content,
          }),
        });
      }

      if (res.status === 402) {
        setMessages((prev) => prev.filter((msg) => msg.id !== userMessageId));
        setNoCredits(true);
        updateCredits(0);
        setLoading(false);
        return;
      }

      if (res.status === 400) {
        const errorData = await res.json().catch(() => null);
        const errorMsg = errorData?.error ?? 'Erro ao processar sua solicitação.';
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: errorMsg,
            createdAt: new Date(),
          },
        ]);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const balanceHeader = res.headers.get('X-Balance-Cents');
      if (balanceHeader !== null) {
        const parsed = parseInt(balanceHeader, 10);
        if (!isNaN(parsed)) {
          updateCredits(parsed);
          setNoCredits(parsed <= 0);
        }
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let aiMessage = '';
      const aiMessageId = `temp-ai-${Date.now()}`;

      setMessages((prev) => [
        ...prev,
        { id: aiMessageId, role: 'assistant', content: '', createdAt: new Date() },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            try {
              const data = JSON.parse(dataStr);

              if (data.error) {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === aiMessageId ? { ...msg, content: data.error } : msg
                  )
                );
                setLoading(false);
                return;
              }

              if (data.done) {
                if (data.conversationId && !currentConversationId) {
                  setCurrentConversationId(data.conversationId);
                  const convRes = await fetch('/api/conversations');
                  if (convRes.ok) {
                    const convData = await convRes.json();
                    setConversations(
                      convData.map((conv: { id: string; title: string; createdAt: string }) => ({
                        ...conv,
                        createdAt: new Date(conv.createdAt),
                      }))
                    );
                  }
                }
                if (typeof data.balanceCents === 'number') {
                  updateCredits(data.balanceCents);
                  setNoCredits(data.balanceCents <= 0);
                }
                setLoading(false);
                break;
              }

              if (data.token) {
                aiMessage += data.token;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === aiMessageId ? { ...msg, content: aiMessage } : msg
                  )
                );
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
          createdAt: new Date(),
        },
      ]);
      setLoading(false);
    }
  }, [currentConversationId, loading, noCredits, updateCredits]);

  return (
    <div className="mx-auto flex h-[calc(100dvh-6rem)] w-[calc(100%-2rem)] max-w-5xl overflow-hidden md:gap-6">
      {/* Desktop Sidebar */}
      <div className="hidden shrink-0 md:block md:w-72">
        <ConversationSidebar
          conversations={conversations}
          currentId={currentConversationId}
          onSelect={handleSelectConversation}
          onNew={handleNewConversation}
          isLoading={isLoadingConversations}
          isOpen={true}
          onClose={() => {}}
        />
      </div>

      {/* Chat Area */}
      <div className="relative flex flex-1 flex-col overflow-hidden rounded-2xl bg-transparent">
        {/* Mobile sidebar toggle */}
        <div className="relative z-10 flex items-center border-b border-solar-800/20 bg-background-secondary/50 px-3 py-2 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-foreground-muted transition-all hover:bg-solar-500/10 hover:text-foreground"
            aria-label="Abrir lista de conversas"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="ml-2 text-sm font-medium text-foreground-muted">Conversas</span>
        </div>

        {/* Mobile Overlay Sidebar */}
        <div className="md:hidden">
          <ConversationSidebar
            conversations={conversations}
            currentId={currentConversationId}
            onSelect={handleSelectConversation}
            onNew={handleNewConversation}
            isLoading={isLoadingConversations}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        </div>

        {/* Messages */}
        <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-32 pt-6 md:px-8" role="log" aria-live="polite">
          {messages.length === 0 && !loading ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <LottieLogo size={140} className="mb-2" />
              <h2 className="mb-2 text-xl font-semibold text-foreground">Bem-vindo ao SOL</h2>
              <p className="mb-6 max-w-sm text-sm text-foreground-muted">
                Descreva seu produto, público e contexto. A IA vai criar um script de criativo personalizado para você.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  'Script para anúncio de Pilates',
                  'Criativo para lançamento digital',
                  'Copy para stories de wellness',
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(suggestion)}
                    disabled={noCredits}
                    className="rounded-full border border-solar-800/30 px-4 py-2 text-xs text-foreground-muted transition-all hover:border-solar-500/30 hover:text-solar-300 disabled:opacity-40"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {loading && messages[messages.length - 1]?.content === '' && (
                <LoadingDots />
              )}

              {noCredits && (
                <div role="alert" className="my-4 rounded-xl border border-solar-500/50 bg-solar-500/10 p-4">
                  <p className="text-sm text-solar-300">
                    Você ficou sem créditos.{' '}
                    <Link href="/credits/buy" className="font-medium underline transition-all hover:text-solar-200">
                      Comprar créditos →
                    </Link>
                  </p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <ChatInput onSend={handleSendMessage} disabled={loading} noCredits={noCredits} />
      </div>
    </div>
  );
}
