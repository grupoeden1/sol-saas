'use client';

import { useCredits } from '@/components/layout/CreditsProvider';
import { useState, useEffect } from 'react';
import ChatArea from './components/ChatArea';
import ChatInput from './components/ChatInput';
import ConversationSidebar from './components/ConversationSidebar';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

interface Conversation {
  id: string;
  title: string;
  createdAt: Date;
}

export default function ChatPage() {
  const { credits, updateCredits } = useCredits();

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  // noCredits: inicia com base no saldo do contexto; atualiza conforme respostas da API
  const [noCredits, setNoCredits] = useState(credits === 0);
  const [showNoCreditsAlert, setShowNoCreditsAlert] = useState(false);

  // Sincronizar noCredits quando o contexto de créditos mudar (ex: navegação entre páginas)
  useEffect(() => {
    setNoCredits(credits === 0);
  }, [credits]);

  // Load conversations on mount
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
  useEffect(() => {
    if (!currentConversationId) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/conversations/${currentConversationId}/messages`);
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
    };

    fetchMessages();
  }, [currentConversationId]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || loading || noCredits) return;

    // Ocultar alerta anterior se houver
    setShowNoCreditsAlert(false);

    // Adicionar mensagem do usuário à UI imediatamente
    const userMessageId = `temp-user-${Date.now()}`;
    const userMessage: Message = {
      id: userMessageId,
      role: 'user',
      content,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: currentConversationId,
          message: content,
        }),
      });

      // AC1/AC2: tratar 402 - créditos insuficientes
      if (res.status === 402) {
        // Remover a mensagem do usuário (não foi persistida no banco)
        setMessages((prev) => prev.filter((msg) => msg.id !== userMessageId));
        setNoCredits(true);
        setShowNoCreditsAlert(true);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      // AC3: ler saldo atualizado do header e propagar para o badge em tempo real
      const creditsRemaining = res.headers.get('X-Credits-Remaining');
      if (creditsRemaining !== null) {
        const parsed = parseInt(creditsRemaining, 10);
        if (!isNaN(parsed)) {
          updateCredits(parsed);
          setNoCredits(parsed === 0);
        }
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      const decoder = new TextDecoder();
      let aiMessage = '';
      const aiMessageId = `temp-ai-${Date.now()}`;

      // Adicionar mensagem vazia do assistente que será preenchida via streaming
      setMessages((prev) => [
        ...prev,
        {
          id: aiMessageId,
          role: 'assistant',
          content: '',
          createdAt: new Date(),
        },
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
                    msg.id === aiMessageId
                      ? { ...msg, content: `❌ ${data.error}` }
                      : msg
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
                // AC3/AC5 Story 3.2: atualizar saldo pós-dedução do evento done
                if (typeof data.creditsRemaining === 'number') {
                  updateCredits(data.creditsRemaining);
                  setNoCredits(data.creditsRemaining === 0);
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
          content: '❌ Erro ao enviar mensagem. Por favor, tente novamente.',
          createdAt: new Date(),
        },
      ]);
      setLoading(false);
    }
  };

  const handleNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setShowNoCreditsAlert(false);
  };

  const handleSelectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    setShowNoCreditsAlert(false);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] -mx-4 -my-6">
      <ConversationSidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        isLoading={isLoadingConversations}
      />

      <div className="flex-1 flex flex-col">
        <ChatArea messages={messages} loading={loading} showNoCredits={showNoCreditsAlert} />
        <ChatInput onSend={handleSendMessage} disabled={loading} noCredits={noCredits} />
      </div>
    </div>
  );
}
