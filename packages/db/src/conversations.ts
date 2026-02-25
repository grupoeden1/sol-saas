import { prisma } from './index'
import type { MessageRole } from '@prisma/client'

// ─── Criar nova conversa ───────────────────────────────────────────────────

export async function createConversation(userId: string, title: string) {
  return prisma.conversation.create({
    data: {
      userId,
      // Truncar títulos longos no limite de 60 chars definido no schema
      title: title.slice(0, 60),
    },
  })
}

// ─── Buscar conversa com histórico de mensagens ────────────────────────────

export async function getConversationWithMessages(
  conversationId: string,
  userId: string,
) {
  return prisma.conversation.findFirst({
    where: {
      id: conversationId,
      userId, // scoped ao usuário logado — evita acesso cross-user
    },
    include: {
      messages: {
        orderBy: {
          createdAt: 'asc', // AC4: histórico ordenado cronologicamente
        },
      },
    },
  })
}

// ─── Listar conversas do usuário ──────────────────────────────────────────

export async function listConversations(userId: string) {
  return prisma.conversation.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      createdAt: true,
    },
  })
}

// ─── Adicionar mensagem a uma conversa ────────────────────────────────────

export async function addMessage(
  conversationId: string,
  role: MessageRole,
  content: string,
) {
  return prisma.message.create({
    data: {
      conversationId,
      role,
      content,
    },
  })
}
