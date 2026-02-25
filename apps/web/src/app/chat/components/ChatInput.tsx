'use client';

import { useState, KeyboardEvent, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120); // max 5 lines (~24px per line)
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [message]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!message.trim() || disabled) return;

    onSend(message);
    setMessage('');
  };

  return (
    <div className="border-t border-solar-800/30 bg-background-secondary p-4">
      <div className="max-w-4xl mx-auto flex gap-3">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Digite sua mensagem... (Enter para enviar, Shift+Enter para quebrar linha)"
          className="flex-1 bg-background border border-solar-800/30 rounded-lg p-3 text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-solar-500 focus:border-solar-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          rows={1}
          style={{ minHeight: '44px', maxHeight: '120px' }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          className="px-6 py-2 bg-solar-500/10 border border-solar-500/50 text-solar-300 rounded-lg hover:bg-solar-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
        >
          <span>Enviar</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
