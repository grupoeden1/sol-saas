import { auth } from '@/lib/auth';
import { SYSTEM_PROMPT, detectFinalOutputIntent } from '@/lib/prompts';
import { processFiles, type ProcessedFile } from '@/lib/file-processor';
import {
  prisma,
  deductCredits,
  ensureTodayRate,
  InsufficientBalanceError,
} from '@sol/db';
import {
  countTokens,
  countRawTokens,
  estimateMaxCost,
  calculateRealCost,
  MAX_OUTPUT_TOKENS,
} from '@sol/db/token-counter';
import OpenAI from 'openai';
import { z } from 'zod';

export const runtime = 'nodejs';

const chatSchema = z.object({
  conversationId: z.string().nullish(),
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
      },
    });

    if (!user) {
      return new Response('User not found', { status: 404 });
    }

    // ── Detecção de Content-Type ──────────────────────────────────────────
    const contentType = req.headers.get('content-type') ?? '';
    const isMultipart = contentType.includes('multipart/form-data');

    let message: string;
    let conversationId: string | null | undefined;
    let processedFiles: ProcessedFile[] = [];

    if (isMultipart) {
      // ── Guard: limite de payload (30 MB) ──────────────────────────────
      const contentLength = req.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > 30 * 1024 * 1024) {
        return new Response(
          JSON.stringify({ error: 'Payload excede o limite de 30 MB.' }),
          { status: 413, headers: { 'Content-Type': 'application/json' } },
        );
      }

      // ── NOVO fluxo: multipart/form-data com arquivos ──────────────────
      const formData = await req.formData();
      const rawMessage = formData.get('message');
      const rawConversationId = formData.get('conversationId');
      const files = formData.getAll('files').filter((f): f is File => f instanceof File);

      // Validar campos com Zod
      const parsed = chatSchema.safeParse({
        message: typeof rawMessage === 'string' ? rawMessage : '',
        conversationId: typeof rawConversationId === 'string' ? rawConversationId : null,
      });

      if (!parsed.success) {
        return new Response(parsed.error.issues[0]?.message ?? 'Invalid input', { status: 400 });
      }

      message = parsed.data.message;
      conversationId = parsed.data.conversationId;

      // Processar arquivos (se houver)
      if (files.length > 0) {
        try {
          processedFiles = await processFiles(files);
        } catch (error) {
          return new Response(JSON.stringify({
            error: error instanceof Error ? error.message : 'Erro ao processar arquivos',
          }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
      }
    } else {
      // ── FLUXO EXISTENTE: application/json — intocado ──────────────────
      const body = await req.json();
      const parsed = chatSchema.safeParse(body);

      if (!parsed.success) {
        return new Response(parsed.error.issues[0]?.message ?? 'Invalid input', { status: 400 });
      }

      message = parsed.data.message;
      conversationId = parsed.data.conversationId;
    }

    // ── Daqui para baixo: fluxo unificado ─────────────────────────────────

    // Separar arquivos processados por tipo
    const imageFiles = processedFiles.filter((f): f is ProcessedFile & { type: 'image' } => f.type === 'image');
    const documentFiles = processedFiles.filter((f): f is ProcessedFile & { type: 'document' } => f.type === 'document');
    const hasAttachments = processedFiles.length > 0;

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

    // Montar conteúdo da mensagem do usuário para salvar no banco
    // Documentos: prefixar [Documento: filename] para histórico
    // Imagens: marcar [Imagem: filename] para histórico
    const contentParts: string[] = [];
    for (const doc of documentFiles) {
      contentParts.push(`[Documento: ${doc.filename}]`);
    }
    for (const img of imageFiles) {
      contentParts.push(`[Imagem: ${img.mimeType}]`);
    }
    contentParts.push(message);
    const savedContent = contentParts.join('\n');

    // Salvar mensagem do usuário no banco
    const userMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: savedContent,
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
    let model = useFinalModel
      ? (process.env.OPENAI_MODEL_FINAL || 'gpt-4o')
      : (process.env.OPENAI_MODEL_DEFAULT || 'gpt-4o-mini');

    // Model forcing: imagem → gpt-4o (Vision API requer modelo completo)
    if (imageFiles.length > 0) {
      model = 'gpt-4o';
    }

    console.log(`[Chat API] model=${model} finalIntent=${useFinalModel} attachments=${processedFiles.length}`);

    // Preparar mensagens para OpenAI
    const historyMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...previousMessages
        .filter((m) => m.id !== userMessage.id)
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
    ];

    // Montar mensagem do usuário para OpenAI (com anexos se houver)
    let userOpenAIMessage: OpenAI.Chat.Completions.ChatCompletionMessageParam;

    if (hasAttachments) {
      // Content array com documentos, texto e imagens
      const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];

      // Documentos como texto prefixado
      for (const doc of documentFiles) {
        userContent.push({
          type: 'text',
          text: `[Documento: ${doc.filename}]\n${doc.text}`,
        });
      }

      // Texto da mensagem do usuário
      userContent.push({ type: 'text', text: message });

      // Imagens como image_url
      for (const img of imageFiles) {
        userContent.push({
          type: 'image_url',
          image_url: {
            url: `data:${img.mimeType};base64,${img.base64}`,
            detail: 'auto',
          },
        });
      }

      userOpenAIMessage = { role: 'user', content: userContent };
    } else {
      // Sem anexos: content é string (comportamento original)
      userOpenAIMessage = { role: 'user', content: message };
    }

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      ...historyMessages,
      userOpenAIMessage,
    ];

    // ── Token counting & gate pré-chamada ─────────────────────────────────
    const tokenMessages = historyMessages.map((m) => ({
      role: String(m.role),
      content: typeof m.content === 'string' ? m.content : '',
    }));
    // Contar tokens do histórico + mensagem de texto do user
    tokenMessages.push({ role: 'user', content: message });
    const textInputTokens = countTokens(tokenMessages, model);

    // Tokens de anexos (documentos via tiktoken + imagens via Vision pricing)
    const attachmentTokens = processedFiles.reduce((sum, f) => sum + f.tokens, 0);
    const totalInputTokens = textInputTokens + attachmentTokens;

    // Buscar cotação do dia (lazy refresh)
    const exchangeRate = await ensureTodayRate('USD-BRL');

    // Gate: estimar custo máximo (input real + MAX_OUTPUT_TOKENS de output)
    const maxCostCents = estimateMaxCost(totalInputTokens, model, exchangeRate);

    console.log(`[Chat API] inputTokens=${totalInputTokens} (text=${textInputTokens} attachments=${attachmentTokens}) maxCostCents=${maxCostCents} (gate: input + ${MAX_OUTPUT_TOKENS} output tokens)`);

    // Pré-check: saldo suficiente para cobrir custo máximo estimado
    if (user.balanceCents < maxCostCents) {
      return new Response(JSON.stringify({
        error: 'insufficient_credits',
        required: maxCostCents,
        available: user.balanceCents,
      }), {
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
      max_tokens: MAX_OUTPUT_TOKENS,
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
          const realCost = calculateRealCost(totalInputTokens, outputTokens, model, exchangeRate);

          console.log(`[Chat API] outputTokens=${outputTokens} realCost=${realCost.costCents}`);

          let balanceAfterDeduction = user.balanceCents;
          try {
            const result = await deductCredits(user.id, realCost.costCents, {
              exchangeRate,
              inputTokens: totalInputTokens,
              outputTokens,
              modelUsed: model,
              costUsd: realCost.costUsd,
              conversationTitle: conversation.title,
              maxOutputTokens: MAX_OUTPUT_TOKENS,
              hasAttachments,
              attachmentTypes: processedFiles.map(f =>
                f.type === 'image' ? f.mimeType : 'text/plain'
              ),
              attachmentTokens: attachmentTokens > 0 ? attachmentTokens : undefined,
            });
            balanceAfterDeduction = result.balanceCents;
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
                  description: `[Falha] ${conversation.title}`,
                  exchangeRate,
                  inputTokens: totalInputTokens,
                  outputTokens,
                  modelUsed: model,
                  costUsd: realCost.costUsd,
                  maxOutputTokens: MAX_OUTPUT_TOKENS,
                  hasAttachments,
                  attachmentTypes: processedFiles.map(f =>
                    f.type === 'image' ? f.mimeType : 'text/plain'
                  ),
                  attachmentTokens: attachmentTokens > 0 ? attachmentTokens : undefined,
                },
              });
            } catch (auditError) {
              console.error('[Chat API] Failed to write audit trail:', auditError);
            }

            balanceAfterDeduction = 0;
          }

          // Enviar evento de conclusão com saldo pós-dedução
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, conversationId: conversation.id, balanceCents: balanceAfterDeduction })}\n\n`
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
        'X-Balance-Cents': String(user.balanceCents),
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
