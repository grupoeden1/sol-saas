# Story 2.3 — OpenAI Integration com Streaming

**Epic:** 2 — Chat Core com IA
**Story ID:** 2.3
**Priority:** High
**Estimate:** 8-13 story points
**Status:** In Progress

---

## User Story

**As a** student,
**I want** to receive AI-generated offers and creative scripts as they are written,
**so that** the response feels immediate and alive.

---

## Context

Esta story implementa o coração do SOL: a integração com a OpenAI para gerar ofertas e scripts de criativos via chat. A resposta deve chegar via streaming (Server-Sent Events) para dar sensação de resposta ao vivo, token por token. A API deve selecionar automaticamente o modelo correto (GPT-4o-mini para iterações, GPT-4o para outputs finais), persistir todas as mensagens no banco de dados, e tratar erros da OpenAI de forma amigável.

---

## Acceptance Criteria

### AC1: API Route `POST /api/chat`

- [ ] Rota criada em `apps/web/src/app/api/chat/route.ts`
- [ ] Valida autenticação via `auth()` do NextAuth — retorna `401` se não autenticado
- [ ] Recebe body: `{ conversationId: string | null, message: string }`
- [ ] Se `conversationId` é `null`, cria nova conversa no banco
- [ ] Se `conversationId` existe, valida que pertence ao usuário autenticado
- [ ] Retorna `400` se `message` vazio ou > 2000 caracteres

**Test:** Enviar mensagem sem autenticação → `401`. Enviar com `conversationId` de outro usuário → `403`.

---

### AC2: Seleção de Modelo OpenAI

- [ ] Lógica implementada para selecionar modelo:
  - **GPT-4o-mini** para mensagens exploratórias/iterativas (padrão)
  - **GPT-4o** quando usuário solicita output final (detectar palavras-chave: "final", "completo", "pronto para usar")
- [ ] Lógica documentada em comentário no código
- [ ] Modelo configurável via variável de ambiente `OPENAI_MODEL_DEFAULT` e `OPENAI_MODEL_FINAL`

**Test:** Enviar "me ajude a criar uma oferta" → usa GPT-4o-mini. Enviar "gere a versão final" → usa GPT-4o.

---

### AC3: Server-Sent Events (SSE) Streaming

- [ ] Resposta retornada como `text/event-stream`
- [ ] Tokens da OpenAI enviados ao cliente em tempo real: `data: {token}\n\n`
- [ ] Último evento: `data: [DONE]\n\n` sinaliza fim do stream
- [ ] Frontend consome stream e monta mensagem progressivamente
- [ ] Stream fecha automaticamente ao finalizar ou em caso de erro

**Test:** Enviar mensagem → tokens aparecem progressivamente no chat, não em bloco único.

---

### AC4: System Prompt

- [ ] System prompt define contexto do SOL:
  ```
  Você é o SOL, assistente de IA especializado em criação de ofertas de infoprodutos e scripts de criativos para anúncios digitais.

  Seu público são alunos do Space (programa de marketing digital da Eden Corporate). Eles vendem infoprodutos como cursos online, mentorias e ebooks.

  Seu objetivo: ajudar o aluno a criar ofertas diferenciadas e scripts de criativos únicos, evitando saturação no leilão de anúncios.

  Tom: profissional, direto, consultivo. Faça perguntas estratégicas quando necessário, mas seja conciso. Quando gerar um output final, estruture de forma clara e pronta para uso.
  ```
- [ ] System prompt carregado de `apps/web/src/lib/prompts.ts` (centralizável)

**Test:** Resposta da IA reflete tom consultivo e foco em ofertas/criativos.

---

### AC5: Persistência no Banco de Dados

- [ ] Mensagem do usuário salva no banco **antes** de chamar OpenAI
- [ ] Resposta completa da IA salva no banco **após** stream finalizar
- [ ] Ambas as mensagens vinculadas ao `conversationId`
- [ ] Timestamp `createdAt` registrado corretamente
- [ ] Transação atômica: se falhar ao salvar resposta da IA, mensagem do usuário permanece (não reverte)

**Test:** Enviar mensagem → verificar no banco que ambas (user + assistant) foram persistidas.

---

### AC6: Tratamento de Erros

- [ ] Erros da OpenAI (rate limit, timeout, invalid API key) retornam resposta amigável no chat:
  - Rate limit: "Estamos com muitas solicitações no momento. Tente novamente em alguns segundos."
  - Timeout: "A resposta demorou mais do que o esperado. Por favor, tente novamente."
  - Erro genérico: "Ocorreu um erro ao processar sua mensagem. Nossa equipe foi notificada."
- [ ] Erros logados com `console.error` (incluir `conversationId`, `userId`, erro completo)
- [ ] Stream fecha corretamente mesmo em caso de erro
- [ ] Frontend exibe mensagem de erro inline no chat (não quebra a interface)

**Test:** Simular erro da OpenAI (API key inválida) → mensagem amigável exibida no chat.

---

## Technical Implementation Notes

### API Route Structure

```typescript
// apps/web/src/app/api/chat/route.ts
import { auth } from '@/lib/auth';
import { prisma } from '@sol/db';
import OpenAI from 'openai';

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { conversationId, message } = await req.json();

  // Validação, criação de conversa, seleção de modelo...

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...previousMessages,
      { role: 'user', content: message },
    ],
    stream: true,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const token = chunk.choices[0]?.delta?.content || '';
          if (token) {
            controller.enqueue(encoder.encode(`data: ${token}\n\n`));
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        console.error('Streaming error:', error);
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

### Frontend Integration

```typescript
// apps/web/src/app/chat/page.tsx
const handleSendMessage = async (content: string) => {
  setMessages((prev) => [...prev, { role: 'user', content, id: tempId }]);

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId: currentConversationId, message: content }),
  });

  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  let aiMessage = '';

  while (true) {
    const { done, value } = await reader!.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const token = line.slice(6);
        if (token === '[DONE]') break;
        aiMessage += token;
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: aiMessage, id: aiTempId },
        ]);
      }
    }
  }
};
```

---

## Dependencies

- **Blocked by:** Story 2.2 (UI deve estar pronta)
- **Blocks:** Story 2.4 (Créditos Insuficientes precisa da API funcionando)
- **External:** OpenAI API key configurada em `.env`

---

## Testing Checklist

- [ ] `POST /api/chat` retorna `401` sem autenticação
- [ ] Streaming funciona e tokens aparecem progressivamente
- [ ] Mensagens persistidas corretamente no banco
- [ ] System prompt aplicado nas respostas
- [ ] Seleção de modelo (mini vs full) funciona
- [ ] Erros da OpenAI tratados com mensagens amigáveis
- [ ] `pnpm run typecheck` passa sem erros
- [ ] Testar com conversas longas (> 10 mensagens)

---

## Definition of Done

- [ ] Todos os ACs validados manualmente
- [ ] API Route `/api/chat` implementada e testada
- [ ] Streaming SSE funcionando no frontend
- [ ] Mensagens persistidas no banco
- [ ] System prompt configurado
- [ ] Tratamento de erros implementado
- [ ] Code review aprovado
- [ ] Nenhum erro de TypeScript (strict mode)
- [ ] Testado com OpenAI API real

---

## Environment Variables Required

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL_DEFAULT=gpt-4o-mini
OPENAI_MODEL_FINAL=gpt-4o
```

---

## References

- **PRD:** [docs/prd.md](../../prd.md) — Story 2.3, Epic 2
- **OpenAI Docs:** https://platform.openai.com/docs/api-reference/streaming
- **Next.js Streaming:** https://nextjs.org/docs/app/building-your-application/routing/router-handlers#streaming

---

## Notes for Developers

**Performance:**
- O streaming SSE é crítico para a UX — não carregue todas as mensagens da conversa no context se histórico > 20 mensagens (use apenas as últimas 20)
- Use `gpt-4o-mini` como padrão para reduzir custos — GPT-4o só quando realmente necessário

**Security:**
- Validar sempre que `conversationId` pertence ao usuário autenticado
- NUNCA expor API key da OpenAI no frontend
- Rate limiting será implementado no Epic 4 (opcional no MVP)

**Próxima Story:** 2.4 — Estado Inline de Créditos Insuficientes
