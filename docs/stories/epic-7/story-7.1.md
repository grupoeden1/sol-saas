# User Story: Infraestrutura de Processamento de Vídeo

**ID:** 7.1
**Epic:** 7 - Video Processing
**Status:** DONE
**Agent:** @sm (draft) → @dev (implement) → @qa (review)
**Depends on:** Epic 1 (Foundation — Docker)

---

## Statement

As a developer,
I want the video processing infrastructure set up in Docker,
so that video uploads can be processed in the pipeline.

---

## Context

O caminho 2A (Vídeo Modelado) requer processamento de vídeo: transcrição, extração de frames e análise por IA. Esta story configura a infraestrutura: FFmpeg no container Docker, diretório temporário, AssemblyAI SDK, limites configuráveis e variáveis de ambiente.

---

## Acceptance Criteria

| # | Critério | Status |
|---|----------|--------|
| 1 | FFmpeg instalado no Docker container via `apt-get install ffmpeg` no Dockerfile | TODO |
| 2 | Diretório temporário configurável via env var `VIDEO_TEMP_DIR` (default: `/tmp/sol-uploads/`) | TODO |
| 3 | Cleanup automático de arquivos temporários implementado via `try/finally` — garantia de que arquivos são deletados mesmo em caso de erro | TODO |
| 4 | Limites configuráveis: `VIDEO_MAX_DURATION_SECONDS=300` (5 min), `VIDEO_MAX_SIZE_MB=500` | TODO |
| 5 | AssemblyAI SDK (`assemblyai` npm package) instalado no workspace `apps/web` | TODO |
| 6 | Variável `ASSEMBLYAI_API_KEY` lida de env e validada no startup (erro claro se ausente) | TODO |
| 7 | `.env.example` atualizado com todas as novas env vars: `ASSEMBLYAI_API_KEY`, `VIDEO_MAX_DURATION_SECONDS`, `VIDEO_MAX_SIZE_MB`, `VIDEO_TEMP_DIR` | TODO |
| 8 | FFmpeg wrapper (`lib/video/ffmpeg.ts`): função `extractFrames(videoPath, interval)` que retorna array de frame paths | TODO |
| 9 | AssemblyAI client (`lib/video/assemblyai.ts`): função `transcribe(videoPath)` que retorna transcrição com speakers e sentiment | TODO |
| 10 | docker-compose.yml atualizado se necessário (volume para temp dir) | TODO |

---

## Technical Notes

- **Dockerfile:** Adicionar `RUN apt-get update && apt-get install -y ffmpeg` antes do build
- **FFmpeg wrapper:** `lib/video/ffmpeg.ts` — usa `child_process.spawn` para executar FFmpeg
- **AssemblyAI client:** `lib/video/assemblyai.ts` — usa SDK oficial `assemblyai`
- **Cleanup:** Toda operação com arquivos temporários deve usar `try/finally` para garantir deleção
- **Referência:** Architecture v7.0 — "Video Processor" e "Video Processing Pipeline"
