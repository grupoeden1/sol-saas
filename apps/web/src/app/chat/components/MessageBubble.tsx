'use client';

import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[70%] ${isUser ? 'order-2' : 'order-1'}`}>
        <div
          className={`rounded-lg p-4 ${
            isUser
              ? 'bg-solar-500/10 border border-solar-500/30'
              : 'bg-background-secondary border border-solar-800/30'
          }`}
        >
          {!isUser && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">☀️</span>
              <span className="text-sm font-semibold text-solar-300">SOL</span>
            </div>
          )}

          <div className="text-foreground whitespace-pre-wrap break-words">
            {message.content}
          </div>

          <div className="mt-2 text-xs text-foreground-muted">
            {formatDistanceToNow(message.createdAt, { addSuffix: true, locale: ptBR })}
          </div>
        </div>
      </div>
    </div>
  );
}
