# User Story: Link Analysis — Cole Qualquer Link Social

**ID:** 12.3
**Epic:** 12 — Ad Intelligence & Content Discovery
**Status:** draft
**Priority:** High
**Agent:** @sm (draft) -> @dev (implement) -> @qa (review)
**Depends on:** Story 12.1 (Database Schema), Story 12.5 (Format Classifier)

---

## Statement

As a student,
I want to paste any social media post link and have the AI analyze it automatically,
so that I can use any reference I find online.

---

## Context

O aluno frequentemente encontra referencias criativas navegando nas redes sociais. Esta story permite que ele cole qualquer link de post social (TikTok, Instagram, YouTube, Facebook) e o SOL extraia automaticamente metadados, preview e classifique o formato via Claude Vision. A deteccao de plataforma e feita via regex no backend. Metadados sao extraidos preferencialmente via oEmbed (endpoints publicos, sem autenticacao), enriquecidos com APIs oficiais quando disponiveis (ex: YouTube Data API v3 para views/likes detalhados). Imagens sao classificadas automaticamente pelo FormatClassifier (Story 12.5). Videos exibem thumbnail + metadados, com opcao de upload manual para analise profunda via Epic 7. O custo da classificacao via Claude Vision e deduzido do saldo do aluno. O componente `<LinkAnalyzer />` e reutilizavel: usado no quiz (Caminhos 1A e 1B) e como feature standalone em `/references`. Prevencao de SSRF: URLs validadas contra allowlist de dominios antes de qualquer chamada.

---

## Acceptance Criteria

| # | Criterio | Status |
|---|----------|--------|
| 1 | `POST /api/references/analyze-link` aceita URL de post social. Detecta plataforma automaticamente via regex: `tiktok.com` -> TikTok, `instagram.com/p/` ou `/reel/` -> Instagram, `youtube.com/watch` ou `youtu.be` ou `/shorts/` -> YouTube, `facebook.com` -> Facebook | TODO |
| 2 | Para cada plataforma, usa API oficial para extrair metadados: YouTube (Data API v3 -> title, views, likes, duration, thumbnail, publishedAt), Instagram (oEmbed -> thumbnail, title, author; Graph API se disponivel -> likes, comments), TikTok (oEmbed -> title, author, thumbnail; Research API se aprovada -> views, likes, shares), Facebook (oEmbed -> title, author, thumbnail) | TODO |
| 3 | Se midia e imagem: exibe inline + envia para Claude Vision para classificacao automatica de formato | TODO |
| 4 | Se midia e video: exibe thumbnail + metadados. Aluno pode optar por "Analisar video completo" que abre upload manual para pipeline do Epic 7 (AssemblyAI + FFmpeg + Vision) | TODO |
| 5 | Classificacao de formato via Claude Vision (`claude-haiku-4-5-20251001` para economia): analisa thumbnail/imagem e retorna formato classificado (top 5, testemunho, tutorial, etc) com confianca (alta/media/baixa). Se confianca baixa, sugere ao aluno confirmar/corrigir | TODO |
| 6 | Custo da classificacao em creditos: deduzido do saldo do aluno (mesma logica FR5). Gate pre-chamada inclui tokens da imagem | TODO |
| 7 | Resultado salvo em `creative_references` com `source_url`, metadados extraidos, `format_classification` e `structure_analysis` | TODO |
| 8 | Componente reutilizavel `<LinkAnalyzer />`: input de URL com paste detection, loading state durante analise, card de resultado com preview + metadados + formato classificado. Usado no quiz (Caminhos 1A e 1B) e como feature standalone em `/references` | TODO |
| 9 | Erro de URL invalida ou plataforma nao suportada: mensagem clara ao aluno. Erro de API: fallback "Nao foi possivel analisar este link. Tente fazer upload manual." | TODO |

---

## Technical Notes

- **oEmbed endpoints (publicos, sem autenticacao):**
  - YouTube: `https://www.youtube.com/oembed?url={url}&format=json`
  - Instagram: `https://api.instagram.com/oembed?url={url}&format=json`
  - TikTok: `https://www.tiktok.com/oembed?url={url}`
  - Facebook: `https://www.facebook.com/plugins/post/oembed.json/?url={url}`
- **Enrichment com API oficial:** Para YouTube, se `YOUTUBE_API_KEY` disponivel, enriquecer oEmbed com Data API v3 (views, likes, duration, publishedAt). Chamada extra: `GET https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id={videoId}&key={apiKey}`
- **Platform detection regex (server-side):**
  - TikTok: `/tiktok\.com\/@[\w.-]+\/video\/\d+|tiktok\.com\/t\/\w+|vm\.tiktok\.com\/\w+/`
  - Instagram: `/instagram\.com\/(p|reel|reels)\/[\w-]+/`
  - YouTube: `/youtube\.com\/watch\?v=[\w-]+|youtu\.be\/[\w-]+|youtube\.com\/shorts\/[\w-]+/`
  - Facebook: `/facebook\.com\/[\w.]+\/(posts|videos|photos)\/|fb\.watch\/\w+/`
- **SSRF prevention:** Validar URL contra allowlist de dominios ANTES de qualquer fetch:
  - Dominios permitidos: `tiktok.com`, `vm.tiktok.com`, `instagram.com`, `youtube.com`, `youtu.be`, `facebook.com`, `fb.watch`
  - Rejeitar IPs privados (127.0.0.1, 10.x, 192.168.x, etc)
  - Rejeitar URLs com credenciais embutidas (`user:pass@host`)
- **Classificacao de formato:** Delegada ao `FormatClassifier` (Story 12.5). Usa `claude-haiku-4-5-20251001` para economia de tokens
- **Custo em creditos:** Segue mesma logica de `deductCredits` do FR5. Gate pre-chamada verifica saldo antes de enviar imagem ao Vision
- **Componente `<LinkAnalyzer />`:** `apps/web/components/references/link-analyzer.tsx`
  - Paste detection via `onPaste` event no input
  - Loading skeleton durante chamada API
  - Card de resultado com: thumbnail, titulo, plataforma (badge), metricas, formato classificado (badge com cor por confianca)
  - Acoes: "Usar como Referencia" (salva em creative_references), "Analisar Video Completo" (redirect para upload Epic 7)
- **Referencia:** PRD v12.0 — FR37, Epic 12 Story 12.3

---

## Tasks / Subtasks

- [ ] Criar `LinkAnalyzerService` em `apps/web/lib/services/link-analyzer.ts` com:
  - [ ] Metodo `analyzeLink(url: string): Promise<LinkAnalysisResult>` — orquestra deteccao + extracao + classificacao
  - [ ] Funcao `detectPlatform(url: string): Platform | null` — regex para 4 plataformas
  - [ ] Funcao `validateUrl(url: string): boolean` — SSRF prevention (allowlist de dominios, rejeitar IPs privados)
  - [ ] Funcao `extractVideoId(url: string, platform: Platform): string` — extrai ID do video/post da URL
- [ ] Implementar chamadas oEmbed para cada plataforma:
  - [ ] YouTube oEmbed + enriquecimento opcional via Data API v3
  - [ ] Instagram oEmbed (+ Graph API se token disponivel)
  - [ ] TikTok oEmbed (+ Research API se aprovada)
  - [ ] Facebook oEmbed
- [ ] Criar API route `POST /api/references/analyze-link` em `apps/web/app/api/references/analyze-link/route.ts` com:
  - [ ] Validacao do body (url obrigatoria)
  - [ ] Autenticacao do usuario (session check)
  - [ ] Validacao SSRF da URL
  - [ ] Chamada ao LinkAnalyzerService
  - [ ] Gate de creditos pre-chamada Vision (se imagem)
  - [ ] Deducao de creditos apos classificacao
  - [ ] Persistencia em `creative_references`
  - [ ] Resposta tipada com referencia + classificacao
- [ ] Criar componente `<LinkAnalyzer />` em `apps/web/components/references/link-analyzer.tsx` com:
  - [ ] Input de URL com paste detection (`onPaste` event)
  - [ ] Validacao client-side basica (formato de URL)
  - [ ] Loading state/skeleton durante analise
  - [ ] Card de resultado: thumbnail, titulo, plataforma badge, metricas, formato classificado
  - [ ] Acao "Usar como Referencia" (persiste creative_references vinculada ao quiz)
  - [ ] Acao "Analisar Video Completo" (redirect para upload manual — Epic 7)
- [ ] Implementar error handling:
  - [ ] URL invalida: mensagem "URL invalida. Cole o link completo do post."
  - [ ] Plataforma nao suportada: mensagem "Plataforma nao suportada. Tente TikTok, Instagram, YouTube ou Facebook."
  - [ ] Erro de API: fallback "Nao foi possivel analisar este link. Tente fazer upload manual."

---

## File List

- `apps/web/lib/services/link-analyzer.ts` — LinkAnalyzerService com deteccao, extracao e orquestracao (NOVO)
- `apps/web/app/api/references/analyze-link/route.ts` — API route POST /api/references/analyze-link (NOVO)
- `apps/web/components/references/link-analyzer.tsx` — Componente LinkAnalyzer reutilizavel (NOVO)

---

## Definition of Done

- [ ] As 4 plataformas sao detectadas corretamente via regex (TikTok, Instagram, YouTube, Facebook)
- [ ] oEmbed retorna metadados validos para cada plataforma (thumbnail, titulo, autor)
- [ ] YouTube enrichment via Data API v3 retorna views, likes, duration quando API key disponivel
- [ ] Classificacao de formato funciona para imagens via Claude Vision (formato + confianca)
- [ ] Creditos deduzidos corretamente apos classificacao (gate pre-chamada + deducao)
- [ ] `creative_references` persistida com todos os metadados e classificacao
- [ ] Componente `<LinkAnalyzer />` renderiza corretamente: paste detection, loading, card de resultado
- [ ] SSRF prevention funciona: URLs fora da allowlist rejeitadas, IPs privados bloqueados
- [ ] Erro de URL invalida/plataforma nao suportada mostra mensagem clara (nao erro tecnico)
- [ ] Fallback gracioso quando API falha: mensagem amigavel + sugestao de upload manual
- [ ] TypeScript compila sem erros (`tsc --noEmit`)

---

## Dependencies

- Story 12.1 — tabela `creative_references` existe
- Story 12.5 — `FormatClassifier` (classificacao automatica de formato via Claude Vision)
- Epic 1 (Foundation) — autenticacao, sessao de usuario
- Epic 3 — logica de creditos (`deductCredits`, gate pre-chamada)
- Epic 7 — pipeline de video (redirect para upload manual quando aluno quer analise profunda)
