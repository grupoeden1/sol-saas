import { auth } from '@/lib/auth';
import { SYSTEM_PROMPT, detectFinalOutputIntent } from '@/lib/prompts';
import { processFiles, type ProcessedFile } from '@/lib/file-processor';
import {
  prisma,
  deductCredits,
  getPricingConfig,
  calculateCredits,
  calculateMaxCredits,
  InsufficientBalanceError,
} from '@sol/db';
import { countTokens, countRawTokens } from '@sol/db/token-counter';
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
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
    // Rate limiting: 30 requests per minute per IP
    const rl = rateLimit(`chat:${getClientIp(req)}`, { limit: 30, windowSeconds: 60 });
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    // Validar autenticação
    const session = await auth();
    if (!session?.user?.email) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Buscar usuário com saldo em créditos
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        credits: true,
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

      const formData = await req.formData();
      const rawMessage = formData.get('message');
      const rawConversationId = formData.get('conversationId');
      const files = formData.getAll('files').filter((f): f is File => f instanceof File);

      const parsed = chatSchema.safeParse({
        message: typeof rawMessage === 'string' ? rawMessage : '',
        conversationId: typeof rawConversationId === 'string' ? rawConversationId : null,
      });

      if (!parsed.success) {
        return new Response(parsed.error.issues[0]?.message ?? 'Invalid input', { status: 400 });
      }

      message = parsed.data.message;
      conversationId = parsed.data.conversationId;

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
      const body = await req.json();
      const parsed = chatSchema.safeParse(body);

      if (!parsed.success) {
        return new Response(parsed.error.issues[0]?.message ?? 'Invalid input', { status: 400 });
      }

      message = parsed.data.message;
      conversationId = parsed.data.conversationId;
    }

    // ── Fluxo unificado ───────────────────────────────────────────────────

    const imageFiles = processedFiles.filter((f): f is ProcessedFile & { type: 'image' } => f.type === 'image');
    const documentFiles = processedFiles.filter((f): f is ProcessedFile & { type: 'document' } => f.type === 'document');
    const hasAttachments = processedFiles.length > 0;

    // Criar ou validar conversa
    let conversation;

    if (conversationId) {
      conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId: user.id },
      });

      if (!conversation) {
        return new Response('Conversation not found or access denied', { status: 403 });
      }
    } else {
      conversation = await prisma.conversation.create({
        data: { userId: user.id, title: message.substring(0, 60) },
      });
    }

    // Salvar mensagem do usuário
    const contentParts: string[] = [];
    for (const doc of documentFiles) {
      contentParts.push(`[Documento: ${doc.filename}]`);
    }
    for (const img of imageFiles) {
      contentParts.push(`[Imagem: ${img.mimeType}]`);
    }
    contentParts.push(message);
    const savedContent = contentParts.join('\n');

    const userMessage = await prisma.message.create({
      data: { conversationId: conversation.id, role: 'user', content: savedContent },
    });

    // Buscar histórico
    const previousMessages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    // Escolher modelo
    const useFinalModel = detectFinalOutputIntent(message);
    let model = useFinalModel
      ? (process.env.OPENAI_MODEL_FINAL || 'gpt-4o')
      : (process.env.OPENAI_MODEL_DEFAULT || 'gpt-4o-mini');

    if (imageFiles.length > 0) {
      model = 'gpt-4o';
    }

    console.log(`[Chat API] model=${model} finalIntent=${useFinalModel} attachments=${processedFiles.length}`);

    // Preparar mensagens para OpenAI
    const historyMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...previousMessages
        .filter((m) => m.id !== userMessage.id)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ];

    let userOpenAIMessage: OpenAI.Chat.Completions.ChatCompletionMessageParam;

    if (hasAttachments) {
      const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];
      for (const doc of documentFiles) {
        userContent.push({ type: 'text', text: `[Documento: ${doc.filename}]\n${doc.text}` });
      }
      userContent.push({ type: 'text', text: message });
      for (const img of imageFiles) {
        userContent.push({
          type: 'image_url',
          image_url: { url: `data:${img.mimeType};base64,${img.base64}`, detail: 'auto' },
        });
      }
      userOpenAIMessage = { role: 'user', content: userContent };
    } else {
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
    tokenMessages.push({ role: 'user', content: message });
    const textInputTokens = countTokens(tokenMessages, model);

    const attachmentTokens = processedFiles.reduce((sum, f) => sum + f.tokens, 0);
    const totalInputTokens = textInputTokens + attachmentTokens;

    // Buscar config de pricing (cached, TTL 60s)
    const config = await getPricingConfig();

    // Gate: créditos máximos estimados
    const maxCredits = calculateMaxCredits(totalInputTokens, config);

    console.log(`[Chat API] inputTokens=${totalInputTokens} (text=${textInputTokens} attachments=${attachmentTokens}) maxCredits=${maxCredits}`);

    if (user.credits < maxCredits) {
      return new Response(JSON.stringify({
        error: 'insufficient_credits',
        required: maxCredits,
        available: user.credits,
      }), {
        status: 402,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Streaming OpenAI
    const stream = await getOpenAI().chat.completions.create({
      model,
      messages,
      stream: true,
      temperature: 0.7,
      max_completion_tokens: config.maxOutputTokens,
    });

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

          // Salvar resposta
          await prisma.message.create({
            data: { conversationId: conversation.id, role: 'assistant', content: fullResponse },
          });

          // Calcular créditos reais e deduzir
          const outputTokens = countRawTokens(fullResponse, model);
          const creditsUsed = calculateCredits(totalInputTokens, outputTokens, config);

          console.log(`[Chat API] outputTokens=${outputTokens} creditsUsed=${creditsUsed}`);

          let creditsAfterDeduction = user.credits;
          try {
            const result = await deductCredits(user.id, creditsUsed, {
              inputTokens: totalInputTokens,
              outputTokens,
              modelUsed: model,
              creditsPerMInput: config.creditsPerMInput,
              creditsPerMOutput: config.creditsPerMOutput,
              conversationTitle: conversation.title,
              hasAttachments,
              attachmentTypes: processedFiles.map(f =>
                f.type === 'image' ? f.mimeType : 'text/plain'
              ),
              attachmentTokens: attachmentTokens > 0 ? attachmentTokens : undefined,
            });
            creditsAfterDeduction = result.credits;
          } catch (deductError) {
            if (deductError instanceof InsufficientBalanceError) {
              console.warn('[Chat API] Credits insufficient post-stream:', deductError.message);
            } else {
              console.error('[Chat API] Credit deduction failed:', deductError);
            }

            try {
              await prisma.creditTransaction.create({
                data: {
                  userId: user.id,
                  amount: 0,
                  type: 'consumption',
                  description: `[Falha] ${conversation.title}`,
                  inputTokens: totalInputTokens,
                  outputTokens,
                  modelUsed: model,
                  creditsPerMInput: config.creditsPerMInput,
                  creditsPerMOutput: config.creditsPerMOutput,
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

            creditsAfterDeduction = 0;
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, conversationId: conversation.id, credits: creditsAfterDeduction })}\n\n`
            )
          );
          controller.close();
        } catch (error) {
          console.error('[Chat API] Streaming error:', error instanceof Error ? error.message : 'Unknown');
          const errorMessage = getErrorMessage(error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Credits-Remaining': String(user.credits),
      },
    });
  } catch (error) {
    console.error('[Chat API] Request error:', error instanceof Error ? error.message : 'Unknown');
    return new Response('Internal server error', { status: 500 });
  }
}

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
