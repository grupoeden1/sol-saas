'use client';

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);

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
    if (!content.trim() || loading) return;

    // Add user message to UI immediately
    const userMessage: Message = {
      id: `temp-user-${Date.now()}`,
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

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      const decoder = new TextDecoder();
      let aiMessage = '';
      const aiMessageId = `temp-ai-${Date.now()}`;

      // Add empty AI message that will be populated via streaming
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
                // Handle error
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
                // Stream complete, update conversation ID if new
                if (data.conversationId && !currentConversationId) {
                  setCurrentConversationId(data.conversationId);
                  // Reload conversations list
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
                setLoading(false);
                break;
              }

              if (data.token) {
                aiMessage += data.token;
                // Update AI message progressively
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
  };

  const handleSelectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
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
        <ChatArea messages={messages} loading={loading} />
        <ChatInput onSend={handleSendMessage} disabled={loading} />
      </div>
    </div>
  );
}
