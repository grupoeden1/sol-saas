import * as fs from 'fs/promises';
import {
  prisma,
  updateKbDocumentStatus,
  createKbChunks,
  getPromptOverride,
} from '@sol/db';
import {
  extractTextFromPDF,
  extractTextFromDOCX,
  extractTextFromPlain,
} from '@/lib/file-processor';
import { chunkText } from './chunker';
import { generateEmbeddings } from './embeddings';
import {
  ensureCollection,
  upsertPoints,
  generatePointId,
  type QdrantPoint,
} from './qdrant';
import { deleteKbFiles } from './storage';
import { estimateTokens } from '@sol/db/token-counter';

/**
 * Process a document through the full KB pipeline:
 * 1. Read file → Extract text
 * 2. Chunk text
 * 3. Generate embeddings
 * 4. Upsert to Qdrant
 * 5. Save chunks to Prisma
 */
export async function processKbDocument(
  documentId: string,
  filePath: string,
): Promise<void> {
  const startTime = Date.now();

  try {
    // Mark as processing
    await updateKbDocumentStatus(documentId, 'PROCESSING');

    // Load document record
    const doc = await prisma.kbDocument.findUnique({
      where: { id: documentId },
      include: { collection: { select: { qdrantName: true } } },
    });

    if (!doc) throw new Error('Document not found');

    // Read file
    const buffer = await fs.readFile(filePath);

    // Extract text based on type
    let text: string;
    switch (doc.sourceType) {
      case 'PDF': {
        const result = await extractTextFromPDF(buffer);
        if (result.isEmpty) throw new Error('PDF não contém texto legível');
        text = result.text;
        break;
      }
      case 'DOCX':
        text = await extractTextFromDOCX(buffer);
        break;
      case 'TXT':
        text = extractTextFromPlain(buffer);
        break;
      default:
        throw new Error(`Unsupported document type: ${doc.sourceType}`);
    }

    if (!text || text.trim().length === 0) {
      throw new Error('Documento vazio ou sem texto legível');
    }

    // Chunk text
    const chunks = chunkText(text, { maxTokens: 500, overlapTokens: 50 });
    if (chunks.length === 0) {
      throw new Error('Nenhum chunk gerado a partir do texto');
    }

    // Generate embeddings
    const chunkTexts = chunks.map((c) => c.text);
    const embeddings = await generateEmbeddings(chunkTexts);
    const embeddingTokens = chunkTexts.reduce((sum, t) => sum + estimateTokens(t), 0);

    // Ensure Qdrant collection exists
    await ensureCollection(doc.collection.qdrantName);

    // Build Qdrant points
    const points: QdrantPoint[] = chunks.map((chunk, i) => ({
      id: generatePointId(),
      vector: embeddings[i],
      payload: {
        documentId: doc.id,
        chunkIndex: chunk.index,
        text: chunk.text,
        sourceType: doc.sourceType,
        sourceTitle: doc.title,
        collectionId: doc.collectionId,
      },
    }));

    // Upsert to Qdrant
    await upsertPoints(doc.collection.qdrantName, points);

    // Save chunks to Prisma
    await createKbChunks(
      documentId,
      chunks.map((chunk, i) => ({
        text: chunk.text,
        tokenCount: chunk.tokenCount,
        qdrantPointId: points[i].id,
        chunkIndex: chunk.index,
      })),
    );

    const totalTokens = chunks.reduce((sum, c) => sum + c.tokenCount, 0);
    const processingTimeMs = Date.now() - startTime;

    // Mark as completed
    await updateKbDocumentStatus(documentId, 'COMPLETED', {
      textContent: text,
      chunkCount: chunks.length,
      totalTokens,
      embeddingTokens,
      processingTimeMs,
    });

    console.log(
      `[KB Processor] Document ${documentId} completed: ${chunks.length} chunks, ${totalTokens} tokens, ${processingTimeMs}ms`,
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Erro desconhecido no processamento';

    await updateKbDocumentStatus(documentId, 'FAILED', {
      errorMessage,
      processingTimeMs: Date.now() - startTime,
    });

    console.error(`[KB Processor] Document ${documentId} failed:`, errorMessage);
  } finally {
    // Clean up temporary files
    await deleteKbFiles(documentId);
  }
}

/**
 * Process a video through the KB pipeline:
 * 1. Transcribe (AssemblyAI)
 * 2. Extract frames (FFmpeg)
 * 3. Describe frames + analyze structure (AI)
 * 4. Chunk combined text
 * 5. Generate embeddings + store in Qdrant
 */
export async function processKbVideo(
  documentId: string,
  videoPath: string,
): Promise<void> {
  const startTime = Date.now();

  try {
    await updateKbDocumentStatus(documentId, 'PROCESSING');

    const doc = await prisma.kbDocument.findUnique({
      where: { id: documentId },
      include: { collection: { select: { qdrantName: true } } },
    });

    if (!doc) throw new Error('Document not found');

    // Dynamic imports to avoid loading heavy deps when not needed
    const { transcribe } = await import('@/lib/video/assemblyai');
    const { extractFrames } = await import('@/lib/video/ffmpeg');
    const { getAiAdapter } = await import('@/lib/ai');
    const { getAiConfig } = await import('@sol/db');

    let framePaths: string[] = [];

    try {
      // Step 1 & 2: Transcription + Frame extraction in parallel
      const [transcriptionResult, frames] = await Promise.all([
        transcribe(videoPath),
        extractFrames(videoPath, 5),
      ]);

      framePaths = frames;
      const transcription = transcriptionResult.text;

      // Step 3: Describe frames + analyze structure
      const aiConfig = await getAiConfig();
      const adapter = getAiAdapter(aiConfig.provider);

      // Describe frames
      let frameDescriptions = '';
      if (frames.length > 0) {
        const selectedFrames =
          frames.length <= 10
            ? frames
            : frames
                .filter((_, i) => i % Math.ceil(frames.length / 10) === 0)
                .slice(0, 10);

        const descriptions: string[] = [];
        for (let i = 0; i < selectedFrames.length; i++) {
          const frameBuffer = await fs.readFile(selectedFrames[i]);
          const base64 = frameBuffer.toString('base64');

          const result = await adapter.complete({
            model: aiConfig.finalModel,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: (await getPromptOverride('PROMPT_VIDEO_FRAME_DESC')) ?? 'Descreva este frame de um vídeo em português. Inclua: o que aparece na cena, cenário, ações, texto na tela, expressões faciais, e qualquer elemento visual relevante. Seja conciso (2-3 frases).',
                  },
                  { type: 'image', base64, mimeType: 'image/jpeg' },
                ],
              },
            ],
            maxTokens: 200,
          });

          descriptions.push(
            `[Frame ${i + 1}/${selectedFrames.length}]: ${result.text || 'Sem descrição'}`,
          );
        }

        frameDescriptions = descriptions.join('\n\n');
      }

      // Step 4: Structure analysis
      let structureAnalysis = '';
      if (transcription || frameDescriptions) {
        const result = await adapter.complete({
          model: aiConfig.finalModel,
          maxTokens: 1500,
          temperature: 0.3,
          systemPrompt:
            (await getPromptOverride('PROMPT_VIDEO_STRUCTURE')) ?? 'Você é um especialista em análise de vídeos de marketing e anúncios criativos. Analise o vídeo a partir da transcrição e descrição visual dos frames.',
          messages: [
            {
              role: 'user',
              content: `Analise este vídeo e identifique:

## TRANSCRIÇÃO
${transcription || 'Não disponível'}

## DESCRIÇÃO VISUAL DOS FRAMES
${frameDescriptions || 'Não disponível'}

---

Retorne uma análise estruturada com:
1. **Ganchos usados** — quais técnicas de gancho foram usadas nos primeiros segundos
2. **CTA** — qual o call-to-action e como é apresentado
3. **Estrutura** — como o vídeo é organizado (intro, corpo, conclusão)
4. **Tom de comunicação** — direto, empático, provocador, etc
5. **Técnicas de retenção** — o que mantém o espectador assistindo
6. **Pontos fortes** — o que funciona bem no vídeo
7. **Pontos a melhorar** — o que poderia ser melhor

Responda em português.`,
            },
          ],
        });

        structureAnalysis = result.text || '';
      }

      // Step 5: Combine text for chunking
      const combinedText = `# Análise do Vídeo: ${doc.title}

## Transcrição
${transcription || 'Não disponível'}

## Análise Visual
${frameDescriptions || 'Não disponível'}

## Análise Estrutural
${structureAnalysis || 'Não disponível'}`;

      // Step 6: Chunk, embed, store
      const chunks = chunkText(combinedText, { maxTokens: 500, overlapTokens: 50 });

      if (chunks.length > 0) {
        const chunkTexts = chunks.map((c) => c.text);
        const embeddings = await generateEmbeddings(chunkTexts);
        const embeddingTokens = chunkTexts.reduce((sum, t) => sum + estimateTokens(t), 0);

        await ensureCollection(doc.collection.qdrantName);

        const points: QdrantPoint[] = chunks.map((chunk, i) => ({
          id: generatePointId(),
          vector: embeddings[i],
          payload: {
            documentId: doc.id,
            chunkIndex: chunk.index,
            text: chunk.text,
            sourceType: 'VIDEO',
            sourceTitle: doc.title,
            collectionId: doc.collectionId,
          },
        }));

        await upsertPoints(doc.collection.qdrantName, points);

        await createKbChunks(
          documentId,
          chunks.map((chunk, i) => ({
            text: chunk.text,
            tokenCount: chunk.tokenCount,
            qdrantPointId: points[i].id,
            chunkIndex: chunk.index,
          })),
        );

        const totalTokens = chunks.reduce((sum, c) => sum + c.tokenCount, 0);

        await updateKbDocumentStatus(documentId, 'COMPLETED', {
          textContent: combinedText,
          videoTranscription: transcription,
          videoAnalysis: `${frameDescriptions}\n\n${structureAnalysis}`,
          chunkCount: chunks.length,
          totalTokens,
          embeddingTokens,
          processingTimeMs: Date.now() - startTime,
        });
      } else {
        await updateKbDocumentStatus(documentId, 'COMPLETED', {
          textContent: combinedText,
          videoTranscription: transcription,
          videoAnalysis: `${frameDescriptions}\n\n${structureAnalysis}`,
          chunkCount: 0,
          processingTimeMs: Date.now() - startTime,
        });
      }

      console.log(
        `[KB Processor] Video ${documentId} completed: ${chunks.length} chunks, ${Date.now() - startTime}ms`,
      );
    } finally {
      // Cleanup temp files
      const { cleanup: cleanupVideo } = await import('@/lib/video/ffmpeg');
      await cleanupVideo(videoPath);
      if (framePaths.length > 0) {
        const path = await import('path');
        await cleanupVideo(path.dirname(framePaths[0]));
      }
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Erro desconhecido no processamento de vídeo';

    await updateKbDocumentStatus(documentId, 'FAILED', {
      errorMessage,
      processingTimeMs: Date.now() - startTime,
    });

    console.error(`[KB Processor] Video ${documentId} failed:`, errorMessage);
  }
}
