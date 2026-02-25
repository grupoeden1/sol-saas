'use client';

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
}

export default function ChatArea({ messages, loading }: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0 && !loading) {
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

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-background">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {loading && (
        <div className="flex justify-start mb-4">
          <div className="max-w-[70%]">
            <div className="rounded-lg p-4 bg-background-secondary border border-solar-800/30">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">☀️</span>
                <span className="text-sm font-semibold text-solar-300">SOL</span>
              </div>
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-solar-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-solar-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-solar-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
