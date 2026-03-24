import { auth } from '@/lib/auth';
import { getSystemPrompt, detectFinalOutputIntent } from '@/lib/prompts';
import { processFiles, type ProcessedFile } from '@/lib/file-processor';
import {
  prisma,
  deductCredits,
  getPricingConfig,
  calculateCredits,
  calculateMaxCredits,
  InsufficientBalanceError,
  getAiConfig,
} from '@sol/db';
import { countTokens } from '@sol/db/token-counter';
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { getAiAdapter, type UserContentBlock } from '@/lib/ai';
import { z } from 'zod';

export const runtime = 'nodejs';

const chatSchema = z.object({
  conversationId: z.string().nullish(),
  message: z.string().min(1).max(2000),
});

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

    // If conversation is linked to a quiz, load video analysis + expert profile for context
    let videoContext = '';
    let expertContext = '';
    if (conversation.quizSessionId) {
      const quizSession = await prisma.quizSession.findUnique({
        where: { id: conversation.quizSessionId },
        select: { useExpertProfile: true },
      });

      const va = await prisma.videoAnalysis.findUnique({
        where: { quizSessionId: conversation.quizSessionId },
        select: { processingStatus: true, fullDescription: true },
      });
      if (va?.processingStatus === 'COMPLETED' && va.fullDescription) {
        videoContext = `\n\n---\nCONTEXTO DO VÍDEO REFERÊNCIA (análise feita por IA):\n${va.fullDescription}\n---\nUse as informações acima sobre o vídeo referência ao ajustar ou iterar sobre o roteiro.`;
      }

      // Include expert profile context when the original quiz used it
      if (quizSession?.useExpertProfile) {
        const profile = await prisma.expertProfile.findUnique({
          where: { userId: user.id },
          select: {
            fullName: true, occupation: true, communicationStyle: true,
            preferredTone: true, coreValues: true, marketFrustration: true,
            bio: true, careerOrigin: true, audienceIdentity: true,
            communityName: true, personalStory: true,
          },
        });
        if (profile) {
          const fields = Object.entries(profile)
            .filter(([, v]) => v !== null && v !== '' && (!Array.isArray(v) || v.length > 0))
            .map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join('\n');
          if (fields) {
            expertContext = `\n\n---\nPERFIL PESSOAL DO EXPERT (usar para personalização):\n${fields}\n---`;
          }
        }
      }
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
    const aiConfig = await getAiConfig();
    const adapter = getAiAdapter(aiConfig.provider);
    const useFinalModel = detectFinalOutputIntent(message);
    let model = useFinalModel ? aiConfig.finalModel : aiConfig.defaultModel;

    if (imageFiles.length > 0) {
      model = aiConfig.finalModel; // Vision needs the powerful model
    }

    console.log(`[Chat API] provider=${aiConfig.provider} model=${model} finalIntent=${useFinalModel} attachments=${processedFiles.length}`);

    // RAG Knowledge Base context
    let knowledgeContext = '';
    try {
      const { retrieveKnowledge } = await import('@/lib/knowledge/retriever');
      const ragResult = await retrieveKnowledge(message, {
        maxChunks: 5,
        maxTokens: 2000,
        minScore: 0.3,
      });
      if (ragResult.chunks.length > 0) {
        const formatted = ragResult.chunks
          .map((c, i) => `[${i + 1}] (${c.sourceTitle}): ${c.text}`)
          .join('\n\n');
        knowledgeContext = `\n\n---\nCONHECIMENTO DA BASE (relevante para esta pergunta):\n${formatted}\n---\nUse as informações acima como referência ao responder.`;
      }
    } catch (err) {
      console.warn('[Chat API] RAG retrieval failed, continuing without:', err instanceof Error ? err.message : '');
    }

    // Preparar mensagens
    const baseSystemPrompt = await getSystemPrompt();
    const systemPrompt = baseSystemPrompt + videoContext + expertContext + knowledgeContext;

    const historyMsgs = previousMessages
      .filter((m) => m.id !== userMessage.id)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    // Build user message content
    let userContent: UserContentBlock[] | string;

    if (hasAttachments) {
      const contentBlocks: UserContentBlock[] = [];
      for (const doc of documentFiles) {
        contentBlocks.push({ type: 'text', text: `[Documento: ${doc.filename}]\n${doc.text}` });
      }
      contentBlocks.push({ type: 'text', text: message });
      for (const img of imageFiles) {
        contentBlocks.push({
          type: 'image',
          base64: img.base64,
          mimeType: img.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
        });
      }
      userContent = contentBlocks;
    } else {
      userContent = message;
    }

    // ── Token counting & gate pré-chamada ─────────────────────────────────
    const tokenMessages = previousMessages
      .filter((m) => m.id !== userMessage.id)
      .map((m) => ({ role: m.role, content: m.content }));
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

    // Streaming AI API
    const streamResult = await adapter.stream({
      model,
      systemPrompt,
      messages: historyMsgs,
      userContent,
      maxTokens: config.maxOutputTokens,
      temperature: 0.7,
    });

    const encoder = new TextEncoder();
    let fullResponse = '';

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const token of streamResult.textStream) {
            fullResponse += token;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
          }

          // Salvar resposta
          await prisma.message.create({
            data: { conversationId: conversation.id, role: 'assistant', content: fullResponse },
          });

          // Get actual token usage from API response
          const { inputTokens: actualInputTokens, outputTokens: actualOutputTokens } = await streamResult.usage();

          // Calcular créditos reais e deduzir
          const creditsUsed = calculateCredits(actualInputTokens, actualOutputTokens, config);

          console.log(`[Chat API] inputTokens=${actualInputTokens} outputTokens=${actualOutputTokens} creditsUsed=${creditsUsed}`);

          let creditsAfterDeduction = user.credits;
          try {
            const result = await deductCredits(user.id, creditsUsed, {
              inputTokens: actualInputTokens,
              outputTokens: actualOutputTokens,
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
                  inputTokens: actualInputTokens,
                  outputTokens: actualOutputTokens,
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
  // Provider-agnostic: both Anthropic.APIError and OpenAI.APIError have .status
  if (error != null && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status;
    if (status === 429) {
      return 'Estamos com muitas solicitações no momento. Tente novamente em alguns segundos.';
    }
    if (status === 401) {
      return 'Erro de autenticação com o serviço de IA. Nossa equipe foi notificada.';
    }
    if (status === 408 || status === 529) {
      return 'A resposta demorou mais do que o esperado. Por favor, tente novamente.';
    }
  }

  return 'Ocorreu um erro ao processar sua mensagem. Nossa equipe foi notificada.';
}
