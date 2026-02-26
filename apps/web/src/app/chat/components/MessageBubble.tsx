'use client';

import Lottie from 'lottie-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useState } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

interface MessageBubbleProps {
  message: Message;
  isLoading?: boolean;
}

export default function MessageBubble({ message, isLoading = false }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [animationData, setAnimationData] = useState<unknown>(null);

  useEffect(() => {
    if (!isUser) {
      fetch('/animations/sol-logo.json')
        .then((res) => res.json())
        .then((data) => setAnimationData(data))
        .catch(() => {});
    }
  }, [isUser]);

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
              {isLoading && animationData ? (
                <div className="w-7 h-7 flex-shrink-0">
                  <Lottie
                    animationData={animationData}
                    loop
                    autoplay
                    initialSegment={[0, 100]}
                    style={{ width: 28, height: 28 }}
                  />
                </div>
              ) : (
                <span className="text-xl">☀️</span>
              )}
              <span className="text-sm font-semibold text-solar-300">SOL</span>
              {isLoading && (
                <span className="flex gap-1 ml-1">
                  <span className="w-1.5 h-1.5 bg-solar-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-solar-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-solar-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </span>
              )}
            </div>
          )}

          {message.content && (
            <div className="text-foreground whitespace-pre-wrap break-words">
              {message.content}
            </div>
          )}

          {!isLoading && (
            <div className="mt-2 text-xs text-foreground-muted">
              {formatDistanceToNow(message.createdAt, { addSuffix: true, locale: ptBR })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

