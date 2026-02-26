'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

interface ChatAreaProps {
  messages: Message[];
  loading: boolean;
  showNoCredits: boolean;
}

export default function ChatArea({ messages, loading, showNoCredits }: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showNoCredits]);

  if (messages.length === 0 && !loading && !showNoCredits) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">☀️</div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Bem-vindo ao SOL
          </h2>
          <p className="text-foreground-muted">
            Comece uma conversa para criar ofertas de infoprodutos diferenciadas e scripts de criativos para anúncios digitais.
          </p>
        </div>
      </div>
    );
  }

  // Find the last assistant message to attach loading state
  const lastAssistantIndex = [...messages].reverse().findIndex(m => m.role === 'assistant');
  const loadingMessageIndex = lastAssistantIndex >= 0 ? messages.length - 1 - lastAssistantIndex : -1;

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-background">
      {messages.map((message, index) => (
        <MessageBubble
          key={message.id}
          message={message}
          isLoading={loading && index === loadingMessageIndex}
        />
      ))}

      {showNoCredits && (
        <div className="flex justify-center mb-4">
          <div className="max-w-lg w-full">
            <div className="rounded-lg p-4 bg-red-500/10 border border-red-500/30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                <p className="text-sm text-red-300 font-medium">
                  Você ficou sem créditos.
                </p>
              </div>
              <Link
                href="/credits/buy"
                className="shrink-0 px-4 py-1.5 bg-solar-500/20 border border-solar-500/50 text-solar-300 rounded-lg text-sm font-semibold hover:bg-solar-500/30 transition-colors"
              >
                Comprar créditos →
              </Link>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
