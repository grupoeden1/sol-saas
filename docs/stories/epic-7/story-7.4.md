# User Story: Pipeline de Processamento — Transcrição + Frames

**ID:** 7.4
**Epic:** 7 - Video Processing
**Status:** DONE
**Agent:** @sm (draft) → @dev (implement) → @qa (review)
**Depends on:** Story 7.1 (Infraestrutura), Story 7.2 (Schema), Story 7.3 (Upload)

---

## Statement

As a developer,
I want the video to be automatically transcribed and have frames extracted,
so that the AI can analyze the video content.

---

## Context

Primeira metade do pipeline de processamento: após upload, o vídeo é enviado para AssemblyAI (transcrição com speakers e sentiment) e FFmpeg extrai frames visuais. Ambos ocorrem em paralelo quando possível. Resultados intermediários são salvos no VideoAnalysis.

---

## Acceptance Criteria

| # | Critério | Status |
|---|----------|--------|
| 1 | Após upload, `processVideo()` inicia automaticamente em background | TODO |
| 2 | Status atualizado para `PROCESSING` no início | TODO |
| 3 | AssemblyAI: envia arquivo de vídeo → recebe transcrição com identificação de speakers e sentiment analysis | TODO |
| 4 | Salva `transcription` no VideoAnalysis (texto completo com marcação de speakers) | TODO |
| 5 | FFmpeg: extrai frames do vídeo (1 frame a cada 5 segundos) em formato JPEG | TODO |
| 6 | Frames salvos temporariamente em `VIDEO_TEMP_DIR` com nomes sequenciais | TODO |
| 7 | Error handling por etapa: se AssemblyAI falhar → status FAILED com mensagem "Erro na transcrição do vídeo" | TODO |
| 8 | Error handling: se FFmpeg falhar → status FAILED com mensagem "Erro na extração de frames" | TODO |
| 9 | Timeout total: 3 minutos — se exceder, marca como FAILED com "Processamento excedeu o tempo limite" | TODO |
| 10 | Status do banco atualizado a cada etapa para permitir polling granular | TODO |
| 11 | Resultados intermediários (transcrição + frames) disponíveis para a Story 7.5 | TODO |

---

## Technical Notes

- **Orquestrador:** `lib/video/processor.ts` — `processVideo(videoPath, videoAnalysisId)`
- **AssemblyAI:** `lib/video/assemblyai.ts` — `transcribe(videoPath)` retorna texto com speakers
- **FFmpeg:** `lib/video/ffmpeg.ts` — `extractFrames(videoPath, interval=5)` retorna array de paths
- **Timeout:** Usar `AbortController` com `setTimeout(180_000)` (3 minutos)
- **Paralelismo:** AssemblyAI e FFmpeg podem rodar em paralelo (`Promise.all`)
- **Referência:** Architecture v7.0 — workflow "Video Processing Pipeline" (steps 1-3)
