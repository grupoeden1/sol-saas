# User Story: Análise IA do Vídeo

**ID:** 7.5
**Epic:** 7 - Video Processing
**Status:** DONE
**Agent:** @sm (draft) → @dev (implement) → @qa (review)
**Depends on:** Story 7.4 (Transcrição + Frames)

---

## Statement

As a developer,
I want the AI to analyze the transcription and frames to generate a rich description,
so that the script generation has maximum context from the reference video.

---

## Context

Segunda metade do pipeline: pega transcrição (AssemblyAI) + frames extraídos (FFmpeg) → GPT-4o Vision analisa cada frame visualmente → GPT-4o consolida tudo em uma descrição textual rica (ganchos, CTAs, estrutura, tom, técnicas de retenção). A `fullDescription` resultante é o que persiste no banco e alimenta o prompt de geração do roteiro.

---

## Acceptance Criteria

| # | Critério | Status |
|---|----------|--------|
| 1 | GPT-4o Vision recebe frames extraídos e descreve conteúdo visual de cada um (o que aparece, cenário, ações, texto na tela) | TODO |
| 2 | Salva `frameDescriptions` no VideoAnalysis | TODO |
| 3 | GPT-4o recebe transcrição + frame descriptions e gera análise estrutural: ganchos usados, CTAs, estrutura do vídeo (intro, corpo, conclusão), tom de comunicação, técnicas de retenção, pontos fortes e fracos | TODO |
| 4 | Salva `structureAnalysis` no VideoAnalysis | TODO |
| 5 | Gera `fullDescription` consolidada — texto completo que descreve o vídeo em detalhes suficientes para a IA gerar roteiro modelado sem ver o vídeo | TODO |
| 6 | Salva `fullDescription` no VideoAnalysis | TODO |
| 7 | Deleta arquivo de vídeo e frames temporários via `try/finally` — garantia de cleanup mesmo em caso de erro | TODO |
| 8 | Marca `processingStatus = COMPLETED` e registra `processingTimeMs` | TODO |
| 9 | Se análise GPT-4o falhar → marca FAILED com mensagem "Erro na análise do vídeo pela IA" | TODO |
| 10 | `fullDescription` alimenta o prompt de geração do roteiro (Story 6.5) quando path2 = MODELED | TODO |
| 11 | Tokens consumidos na análise (Vision + consolidação) são registrados para referência (não cobrados separadamente — incluídos no custo da geração do roteiro) | TODO |

---

## Technical Notes

- **Orquestrador:** Continuação de `lib/video/processor.ts` — após Story 7.4 completar
- **Vision API:** Enviar frames como `image_url` (base64) para GPT-4o com prompt descritivo
- **Consolidação:** Prompt específico para GPT-4o que recebe transcrição + frame descriptions e gera análise estrutural
- **fullDescription format:** Markdown estruturado com seções: "Transcrição", "Análise Visual", "Estrutura", "Ganchos", "CTAs", "Tom", "Técnicas de Retenção"
- **Cleanup:** `try/finally` garante que `fs.rm(videoPath)` e `fs.rm(framesDir)` são executados sempre
- **Referência:** Architecture v7.0 — workflow "Video Processing Pipeline" (steps 4-9)
- **Referência:** PRD v9.0 — FR23 (processamento de vídeo)
