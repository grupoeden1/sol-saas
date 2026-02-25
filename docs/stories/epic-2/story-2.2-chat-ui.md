# Story 2.2 — Chat UI: Interface e Histórico

**Epic:** 2 — Chat Core com IA
**Story ID:** 2.2
**Priority:** High
**Estimate:** 5-8 story points
**Status:** In Progress

---

## User Story

**As a** student,
**I want** a full-screen chat interface that displays my conversation history,
**so that** I can read and continue my interactions naturally.

---

## Context

Esta story implementa a interface visual do chat do SOL — a tela mais importante do produto. O chat deve ser full-screen, com área de mensagens scrollável, input fixo no rodapé, e sidebar/dropdown para navegar entre conversas anteriores. A experiência deve ser fluida e familiar (similar ao ChatGPT), com distinção visual clara entre mensagens do usuário e da IA. O dark theme solar deve ser aplicado consistentemente.

---

## Acceptance Criteria

### AC1: Página `/chat` com Área de Mensagens

- [ ] Página `/chat` criada em `apps/web/src/app/chat/page.tsx` (rota protegida)
- [ ] Layout aplicado via `apps/web/src/app/chat/layout.tsx` usando `AppLayout`
- [ ] Área de mensagens ocupa altura disponível (100vh - header - input)
- [ ] Scroll automático para a última mensagem ao carregar conversa
- [ ] Scroll suave ao receber nova mensagem
- [ ] Estado de carregamento visível enquanto busca mensagens do banco

**Test:** Acessar `/chat` após login → exibe interface de chat vazia inicialmente.

---

### AC2: Diferenciação Visual de Mensagens

- [ ] Mensagens do usuário:
  - Alinhadas à direita
  - Fundo: `bg-solar-500/10` (tom âmbar translúcido)
  - Borda: `border-solar-500/30`
  - Texto: `text-foreground`
- [ ] Mensagens da IA:
  - Alinhadas à esquerda
  - Fundo: `bg-background-secondary`
  - Borda: `border-solar-800/30`
  - Ícone ☀️ antes do conteúdo
- [ ] Timestamp exibido em cada mensagem (formato relativo: "há 2 minutos")
- [ ] Markdown básico renderizado no conteúdo (negrito, itálico, listas)

**Test:** Carregar conversa com múltiplas mensagens → mensagens do usuário e IA visualmente distintas.

---

### AC3: Input Fixo no Rodapé

- [ ] Input fixo na parte inferior da tela
- [ ] Textarea expansível (máx. 5 linhas) para permitir mensagens longas
- [ ] Botão "Enviar" (ícone de papel ou →)
- [ ] Atalho `Enter` → envia mensagem
- [ ] Atalho `Shift+Enter` → adiciona quebra de linha
- [ ] Input desabilitado enquanto aguarda resposta da IA
- [ ] Placeholder: "Digite sua mensagem... (Enter para enviar)"

**Test:** Digitar mensagem e pressionar Enter → mensagem enviada. Shift+Enter → quebra de linha.

---

### AC4: Sidebar de Conversas Anteriores

- [ ] Sidebar à esquerda (desktop) ou dropdown/modal (mobile)
- [ ] Lista todas as conversas do usuário ordenadas por `createdAt DESC`
- [ ] Cada item exibe: título da conversa (max 60 chars) + timestamp relativo
- [ ] Conversa atual destacada visualmente
- [ ] Clicar em conversa → carrega mensagens daquela conversa
- [ ] Skeleton loading enquanto carrega conversas

**Test:** Criar múltiplas conversas → sidebar lista todas. Clicar em conversa → carrega histórico.

---

### AC5: Botão "Nova Conversa"

- [ ] Botão "Nova Conversa" no topo da sidebar (ou header em mobile)
- [ ] Ao clicar, cria nova conversa vazia
- [ ] Chat limpo, pronto para receber primeira mensagem
- [ ] Título gerado automaticamente da primeira mensagem (implementado na Story 2.3)

**Test:** Clicar em "Nova Conversa" → chat limpo, input focado.

---

### AC6: Loading States

- [ ] Loading skeleton enquanto carrega conversas
- [ ] Spinner/animação enquanto aguarda primeira palavra do streaming
- [ ] Estado "digitando..." com animação de pontos quando IA está respondendo
- [ ] Input desabilitado durante processamento

**Test:** Enviar mensagem → loading state visível até primeira resposta.

---

## Technical Implementation Notes

### Component Structure

```
apps/web/src/app/chat/
├── layout.tsx           # AppLayout wrapper
├── page.tsx             # Main chat page
└── components/
    ├── ChatArea.tsx     # Messages display area
    ├── MessageBubble.tsx # Individual message component
    ├── ChatInput.tsx    # Input with keyboard shortcuts
    ├── ConversationSidebar.tsx # Sidebar with conversations list
    └── NewConversationButton.tsx
```

### ChatArea Component Example

```typescript
'use client';

import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';

export default function ChatArea({ messages }: { messages: Message[] }) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
```

### ChatInput Component Example

```typescript
'use client';

import { useState, KeyboardEvent } from 'react';

export default function ChatInput({ onSend, disabled }: Props) {
  const [message, setMessage] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (message.trim()) {
        onSend(message);
        setMessage('');
      }
    }
  };

  return (
    <div className="border-t border-solar-800/30 bg-background-secondary p-4">
      <div className="flex gap-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Digite sua mensagem... (Enter para enviar)"
          className="flex-1 bg-background border border-solar-800/30 rounded-md p-3 text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-solar-500 disabled:opacity-50"
          rows={1}
        />
        <button
          onClick={() => {
            if (message.trim()) {
              onSend(message);
              setMessage('');
            }
          }}
          disabled={disabled || !message.trim()}
          className="px-4 py-2 bg-solar-500/10 border border-solar-500/50 text-solar-300 rounded-md hover:bg-solar-500/20 disabled:opacity-50 transition-colors"
        >
          Enviar →
        </button>
      </div>
    </div>
  );
}
```

---

## Dependencies

- **Blocked by:** Story 2.1 (Schema de Conversations deve existir)
- **Blocks:** Story 2.3 (OpenAI Integration precisa da UI para exibir responses)

---

## Testing Checklist

- [ ] Página `/chat` carrega sem erros
- [ ] Mensagens do usuário e IA visualmente distintas
- [ ] Scroll automático funciona
- [ ] Enter envia mensagem, Shift+Enter quebra linha
- [ ] Sidebar lista conversas
- [ ] Botão "Nova Conversa" funciona
- [ ] Loading states visíveis
- [ ] Layout responsivo em mobile
- [ ] `pnpm run typecheck` passa sem erros

---

## Definition of Done

- [ ] Todos os ACs validados manualmente
- [ ] Página `/chat` implementada e funcionando
- [ ] Componentes de mensagem criados
- [ ] Input com atalhos de teclado funcional
- [ ] Sidebar de conversas implementada
- [ ] Loading states implementados
- [ ] Code review aprovado
- [ ] Nenhum erro de TypeScript (strict mode)
- [ ] Responsividade testada

---

## References

- **PRD:** [docs/prd.md](../../prd.md) — Story 2.2, Epic 2
- **Figma:** (se houver mockups)

---

## Notes for Developers

Esta é a UI principal do SOL. Foque em:
1. **UX fluida** — scroll suave, transitions, feedbacks visuais
2. **Acessibilidade** — atalhos de teclado, navegação por tab
3. **Performance** — virtualização de lista se histórico > 100 mensagens
4. **Dark theme** — paleta solar aplicada consistentemente

**Próxima Story:** 2.3 — OpenAI Integration com Streaming
