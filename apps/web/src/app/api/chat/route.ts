import { auth } from '@/lib/auth';
import { SYSTEM_PROMPT, detectFinalOutputIntent } from '@/lib/prompts';
import { prisma, deductCredits } from '@sol/db';
import OpenAI from 'openai';
import { z } from 'zod';

const chatSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1).max(2000),
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    // Validar autenticação
    const session = await auth();
    if (!session?.user?.email) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return new Response('User not found', { status: 404 });
    }

    // Verificar saldo de créditos antes de qualquer chamada externa (AC1 - Story 2.4)
    if (user.credits === 0) {
      return new Response(JSON.stringify({ error: 'insufficient_credits' }), {
        status: 402,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse e validar body com Zod
    const body = await req.json();
    const parsed = chatSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(parsed.error.issues[0]?.message ?? 'Invalid input', { status: 400 });
    }

    const { conversationId, message } = parsed.data;

    // Criar ou validar conversa
    let conversation;

    if (conversationId) {
      // Validar que a conversa pertence ao usuário
      conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId: user.id,
        },
      });

      if (!conversation) {
        return new Response('Conversation not found or access denied', { status: 403 });
      }
    } else {
      // Criar nova conversa
      conversation = await prisma.conversation.create({
        data: {
          userId: user.id,
          title: message.substring(0, 60),
        },
      });
    }

    // Salvar mensagem do usuário no banco
    const userMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message,
      },
    });

    // Buscar últimas 20 mensagens da conversa para contexto
    const previousMessages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    // Detectar se deve usar modelo final ou iterativo
    const useFinalModel = detectFinalOutputIntent(message);
    const model = useFinalModel
      ? (process.env.OPENAI_MODEL_FINAL || 'gpt-4o')
      : (process.env.OPENAI_MODEL_DEFAULT || 'gpt-4o-mini');

    console.log(`[Chat API] Using model: ${model} (final intent: ${useFinalModel})`);

    // Preparar mensagens para OpenAI
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...previousMessages
        .filter((m) => m.id !== userMessage.id)
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      { role: 'user', content: message },
    ];

    // Iniciar streaming da OpenAI
    const stream = await openai.chat.completions.create({
      model,
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 1000,
    });

    // Criar ReadableStream para Server-Sent Events
    const encoder = new TextEncoder();
    let fullResponse = '';

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const token = chunk.choices[0]?.delta?.content || '';
            if (token) {
              fullResponse += token;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
            }
          }

          // Salvar resposta completa no banco
          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              role: 'assistant',
              content: fullResponse,
            },
          });

          // Deduzir 1 crédito após stream bem-sucedido (Story 3.2)
          let creditsRemaining = user.credits;
          try {
            creditsRemaining = await deductCredits(user.id, 1);
          } catch (deductError) {
            // Race condition: saldo chegou a zero entre o check inicial e a dedução.
            // A resposta já foi entregue ao aluno — apenas loga.
            console.error('[Chat API] Credit deduction failed (response already delivered):', deductError);
            creditsRemaining = 0;
          }

          // Enviar evento de conclusão com saldo pós-dedução
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, conversationId: conversation.id, creditsRemaining })}\n\n`
            )
          );
          controller.close();
        } catch (error) {
          console.error('[Chat API] Streaming error:', {
            conversationId: conversation.id,
            userId: user.id,
            error,
          });

          const errorMessage = getErrorMessage(error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`)
          );
          controller.close();
        }
      },
    });

    // Incluir saldo atual no header para atualização em tempo real do badge (AC3 - Story 2.4)
    // Nota: deducção real de créditos é implementada na Story 3.2
    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Credits-Remaining': String(user.credits),
      },
    });
  } catch (error) {
    console.error('[Chat API] Request error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

/**
 * Retorna mensagem de erro amigável baseada no erro da OpenAI
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof OpenAI.APIError) {
    if (error.status === 429) {
      return 'Estamos com muitas solicitações no momento. Tente novamente em alguns segundos.';
    }
    if (error.status === 401) {
      return 'Erro de autenticação com o serviço de IA. Nossa equipe foi notificada.';
    }
    if (error.code === 'timeout') {
      return 'A resposta demorou mais do que o esperado. Por favor, tente novamente.';
    }
  }

  return 'Ocorreu um erro ao processar sua mensagem. Nossa equipe foi notificada.';
}
