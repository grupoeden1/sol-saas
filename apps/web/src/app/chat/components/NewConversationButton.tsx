'use client';

interface NewConversationButtonProps {
  onClick: () => void;
}

export default function NewConversationButton({ onClick }: NewConversationButtonProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-solar-500/10 border border-solar-500/50 text-solar-300 rounded-lg hover:bg-solar-500/20 transition-colors font-medium"
    >
      <span className="text-lg">+</span>
      <span>Nova Conversa</span>
    </button>
  );
}
