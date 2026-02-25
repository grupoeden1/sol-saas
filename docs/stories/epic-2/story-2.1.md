# User Story: Database Schema — Conversations & Messages

**ID:** 2.1
**Epic:** 2 - Chat Core com IA
**Status:** DONE
**Agent:** @sm (draft) → @dev (implement) → @qa (review)

---

## Statement

As a developer,
I want the database schema for conversations and messages,
so that chat history can be persisted and retrieved.

---

## Context

O schema do Prisma já foi inicializado com os modelos `Conversation` e `Message` na migration inicial (`20260225045419_init`). Esta story formaliza a entrega e garante que:

1. Os modelos estejam corretos e alinhados com o PRD.
2. Existam funções de repositório em `packages/db/src/conversations.ts` para encapsular o acesso ao banco.
3. A query de histórico ordene mensagens por `created_at ASC`.

---

## Acceptance Criteria

| #   | Critério                                                                                                                                    | Status                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1   | Migration Prisma cria tabela `conversations` com: `id`, `user_id` (FK → users), `title` (gerado da 1ª mensagem, max 60 chars), `created_at` | ✅ Migrado via `init`                                 |
| 2   | Migration cria tabela `messages` com: `id`, `conversation_id` (FK), `role` (enum: `user` \| `assistant`), `content` (text), `created_at`    | ✅ Migrado via `init`                                 |
| 3   | Relações Prisma corretamente tipadas — `user.conversations`, `conversation.messages`                                                        | ✅ Schema completo                                    |
| 4   | Query de carregamento do histórico ordena mensagens por `created_at ASC`                                                                    | ✅ Implementado em `packages/db/src/conversations.ts` |

---

## Technical Notes

- **Schema:** `packages/db/prisma/schema.prisma` — modelos `Conversation` e `Message`
- **Repository:** `packages/db/src/conversations.ts` — funções de repositório exportadas
- **Client:** `packages/db/src/index.ts` — singleton Prisma Client rexportando tudo

### Schema dos Modelos

```prisma
model Conversation {
  id        String    @id @default(cuid())
  userId    String
  title     String    @db.VarChar(60)
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages  Message[]
  createdAt DateTime  @default(now())
  @@index([userId])
}

model Message {
  id             String       @id @default(cuid())
  conversationId String
  role           MessageRole
  content        String       @db.Text
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  createdAt      DateTime     @default(now())
  @@index([conversationId])
}

enum MessageRole {
  user
  assistant
}
```

### Repository Functions

```typescript
// packages/db/src/conversations.ts
createConversation(userId, title);
getConversationWithMessages(conversationId, userId); // ordena messages por createdAt ASC
listConversations(userId);
addMessage(conversationId, role, content);
```
