'use client';

import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import NewConversationButton from './NewConversationButton';

interface Conversation {
  id: string;
  title: string;
  createdAt: Date;
}

interface ConversationSidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  isLoading: boolean;
}

export default function ConversationSidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  isLoading,
}: ConversationSidebarProps) {
  return (
    <div className="w-80 bg-background-secondary border-r border-solar-800/30 flex flex-col">
      <div className="p-4 border-b border-solar-800/30">
        <NewConversationButton onClick={onNewConversation} />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 bg-background border border-solar-800/30 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-foreground-muted text-sm">
              Nenhuma conversa ainda.
              <br />
              Clique em "Nova Conversa" para começar.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conversation) => {
              const isActive = conversation.id === currentConversationId;
              const title =
                conversation.title.length > 60
                  ? `${conversation.title.substring(0, 60)}...`
                  : conversation.title;

              return (
                <button
                  key={conversation.id}
                  onClick={() => onSelectConversation(conversation.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    isActive
                      ? 'bg-solar-500/10 border-solar-500/50 shadow-sm'
                      : 'bg-background border-solar-800/30 hover:bg-background-secondary hover:border-solar-500/30'
                  }`}
                >
                  <div className="font-medium text-foreground text-sm mb-1 line-clamp-2">
                    {title}
                  </div>
                  <div className="text-xs text-foreground-muted">
                    {formatDistanceToNow(conversation.createdAt, {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
