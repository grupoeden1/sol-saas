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
    // TODO: Fetch from API in Story 2.3
    // Mock data for now
    setTimeout(() => {
      setConversations([
        {
          id: '1',
          title: 'Primeira conversa com SOL',
          createdAt: new Date(Date.now() - 86400000),
        },
        {
          id: '2',
          title: 'Criação de oferta de curso online',
          createdAt: new Date(Date.now() - 3600000),
        },
      ]);
      setIsLoadingConversations(false);
    }, 500);
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (!currentConversationId) {
      setMessages([]);
      return;
    }

    setLoading(true);
    // TODO: Fetch messages from API in Story 2.3
    // Mock data for now
    setTimeout(() => {
      setMessages([
        {
          id: '1',
          role: 'user',
          content: 'Olá! Preciso de ajuda para criar uma oferta.',
          createdAt: new Date(Date.now() - 3600000),
        },
        {
          id: '2',
          role: 'assistant',
          content: 'Olá! ☀️ Claro, vou te ajudar a criar uma oferta diferenciada. Primeiro, me conte um pouco sobre o que você pretende oferecer. É um curso, mentoria, produto digital?',
          createdAt: new Date(Date.now() - 3500000),
        },
      ]);
      setLoading(false);
    }, 300);
  }, [currentConversationId]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    // TODO: Implement in Story 2.3
    // For now, just add to local state
    const newMessage: Message = {
      id: String(Date.now()),
      role: 'user',
      content,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setLoading(true);

    // Mock AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: 'Esta é uma resposta simulada. A integração com OpenAI será implementada na Story 2.3.',
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setLoading(false);
    }, 1000);
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
