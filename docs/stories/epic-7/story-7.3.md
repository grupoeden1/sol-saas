# User Story: Upload de Vídeo com Progresso

**ID:** 7.3
**Epic:** 7 - Video Processing
**Status:** DONE
**Agent:** @sm (draft) → @dev (implement) → @qa (review)
**Depends on:** Story 7.1 (Infraestrutura), Story 7.2 (Schema)

---

## Statement

As a student,
I want to upload a reference video and see the processing progress,
so that I know the system is analyzing my video.

---

## Context

No caminho 2A (Vídeo Modelado), a pergunta 2A.2 pede upload de vídeo de referência. O aluno faz drag & drop ou seleciona arquivo, vê progresso de upload, e depois acompanha o processamento (30–120 segundos). O frontend faz polling do status até COMPLETED ou FAILED.

---

## Acceptance Criteria

| # | Critério | Status |
|---|----------|--------|
| 1 | Componente `video-upload.tsx` com drag & drop + seleção de arquivo, integrado à pergunta 2A.2 no quiz | TODO |
| 2 | Validação client-side: tipo (mp4, mov, avi, webm), tamanho ≤ VIDEO_MAX_SIZE_MB, mensagens de erro claras | TODO |
| 3 | Barra de progresso de upload visível durante envio | TODO |
| 4 | `POST /api/video/upload` recebe `multipart/form-data` com campos `video` (File) e `quizSessionId` (String) | TODO |
| 5 | Validação server-side: tipo MIME, tamanho, duração (via FFprobe/FFmpeg). 400 com mensagem clara se inválido | TODO |
| 6 | Salva arquivo em `VIDEO_TEMP_DIR` com nome único (`${videoAnalysisId}.ext`) | TODO |
| 7 | Cria `VideoAnalysis` no banco com status `QUEUED` | TODO |
| 8 | Retorna `{ videoAnalysisId, status: 'QUEUED' }` — processamento continua assíncrono | TODO |
| 9 | `GET /api/video/status/[id]` retorna `{ id, status, processingTimeMs?, errorMessage? }` | TODO |
| 10 | Componente `processing-status.tsx` faz polling a cada 3 segundos e exibe status amigável: "Transcrevendo áudio...", "Analisando frames...", "Consolidando análise..." | TODO |
| 11 | Se FAILED, exibe erro amigável com botão "Tentar novamente" (permite re-upload) | TODO |
| 12 | Se COMPLETED, indica visualmente que análise está pronta e aluno pode continuar quiz | TODO |

---

## Technical Notes

- **Componentes:** `components/video/video-upload.tsx`, `components/video/processing-status.tsx`
- **API Routes:** `apps/web/src/app/api/video/upload/route.ts`, `apps/web/src/app/api/video/status/[id]/route.ts`
- **Upload:** Next.js API Route com `export const runtime = 'nodejs'` para acesso a filesystem
- **Assíncrono:** Após salvar arquivo e criar VideoAnalysis com QUEUED, inicia processamento sem bloquear resposta. Pode usar `Promise` sem await ou setTimeout(0)
- **Polling:** Frontend usa `setInterval` ou `useEffect` com polling para `GET /api/video/status/[id]`
- **Referência:** Architecture v7.0 — "Video API" e "Video Processing Pipeline"
