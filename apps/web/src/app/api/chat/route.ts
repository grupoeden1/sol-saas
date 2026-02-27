import { auth } from '@/lib/auth';
import { SYSTEM_PROMPT, detectFinalOutputIntent } from '@/lib/prompts';
import {
  prisma,
  deductCredits,
  ensureTodayRate,
  InsufficientBalanceError,
} from '@sol/db';
import { countTokens, countRawTokens, calculateCostCents } from '@sol/db/token-counter';
import OpenAI from 'openai';
import { z } from 'zod';

const chatSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1).max(2000),
});

// Lazy singleton — avoid instantiation at module load (breaks next build without env vars)
let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

export async function POST(req: Request) {
  try {
    // Validar autenticação
    const session = await auth();
    if (!session?.user?.email) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Buscar usuário com campos de saldo
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        balanceCents: true,
        minBalanceCents: true,
      },
    });

    if (!user) {
      return new Response('User not found', { status: 404 });
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

    console.log(`[Chat API] model=${model} finalIntent=${useFinalModel}`);

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

    // ── Token counting & cost estimation (Story 3.6) ──────────────────────
    const tokenMessages = messages.map((m) => ({
      role: String(m.role),
      content: typeof m.content === 'string' ? m.content : '',
    }));
    const inputTokens = countTokens(tokenMessages, model);

    // Buscar cotação do dia (lazy refresh)
    const exchangeRate = await ensureTodayRate('USD-BRL');

    // Calcular custo estimado do input (sem output ainda)
    const estimated = calculateCostCents(inputTokens, 0, model, exchangeRate);

    console.log(`[Chat API] inputTokens=${inputTokens} estimatedCost=${estimated.costCents}`);

    // Pré-check: saldo suficiente para cobrir ao menos o custo do input
    if (user.balanceCents - estimated.costCents < user.minBalanceCents) {
      return new Response(JSON.stringify({ error: 'insufficient_credits' }), {
        status: 402,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Iniciar streaming da OpenAI
    const stream = await getOpenAI().chat.completions.create({
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

          // ── Calcular custo real (input + output) e deduzir ────────────
          const outputTokens = countRawTokens(fullResponse, model);
          const realCost = calculateCostCents(inputTokens, outputTokens, model, exchangeRate);

          console.log(`[Chat API] outputTokens=${outputTokens} realCost=${realCost.costCents}`);

          let balanceRemaining = user.balanceCents;
          try {
            const result = await deductCredits(user.id, realCost.costCents, {
              exchangeRate,
              inputTokens,
              outputTokens,
              modelUsed: model,
              costUsd: realCost.costUsd,
            });
            balanceRemaining = result.balanceCents;
          } catch (deductError) {
            // Race condition: saldo insuficiente após stream.
            // Resposta já entregue — registrar audit trail para visibilidade.
            if (deductError instanceof InsufficientBalanceError) {
              console.warn('[Chat API] Balance insufficient post-stream (response already delivered):', deductError.message);
            } else {
              console.error('[Chat API] Credit deduction failed:', deductError);
            }

            // Audit trail: registrar tentativa falha para rastreabilidade
            try {
              await prisma.creditTransaction.create({
                data: {
                  userId: user.id,
                  amount: 0,
                  type: 'consumption',
                  description: `Dedução falha: ${realCost.costCents} centavos (${inputTokens + outputTokens} tokens, ${model}) — saldo insuficiente pós-stream`,
                  exchangeRate,
                  inputTokens,
                  outputTokens,
                  modelUsed: model,
                  costUsd: realCost.costUsd,
                },
              });
            } catch (auditError) {
              console.error('[Chat API] Failed to write audit trail:', auditError);
            }

            balanceRemaining = 0;
          }

          // Enviar evento de conclusão com saldo pós-dedução
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, conversationId: conversation.id, balanceRemaining })}\n\n`
            )
          );
          controller.close();
        } catch (error) {
          // OpenAI error → nenhuma dedução
          console.error('[Chat API] Streaming error:', error instanceof Error ? error.message : 'Unknown');

          const errorMessage = getErrorMessage(error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`)
          );
          controller.close();
        }
      },
    });

    // Header com saldo pré-dedução para feedback imediato no badge
    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Balance-Remaining': String(user.balanceCents),
      },
    });
  } catch (error) {
    console.error('[Chat API] Request error:', error instanceof Error ? error.message : 'Unknown');
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
