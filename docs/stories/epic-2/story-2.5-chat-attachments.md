# Story 2.5 — Suporte a Anexos de Arquivos no Chat

**Epic:** 2 — Chat Core com IA
**Story ID:** 2.5
**Priority:** High
**Estimate:** 13 story points
**Status:** Draft

---

## User Story

**As a** student,
**I want** to attach files to my chat messages as additional context for the AI,
**so that** I can get more accurate and personalized creative scripts based on my existing materials (briefings, existing creatives, visual references, support documents).

---

## Context

O sistema de chat (Story 2.3) e precificação (Story 3.6) já estão implementados e estáveis. O aluno pode enviar mensagens de texto e receber respostas via streaming SSE com dedução de custo real baseada em tokens. Esta story adiciona processamento de arquivos ao fluxo existente mantendo **retrocompatibilidade total** — mensagens sem anexo continuam usando `application/json` sem nenhuma alteração.

**Estado atual (baseline):**

- `POST /api/chat` aceita `application/json` com `{ conversationId, message }`: ✅ Story 2.3 — **funcional, não mudar**
- Gate pré-chamada com `estimateMaxCost`: ✅ Story 3.6 — **extender para incluir tokens de anexos**
- `calculateRealCost` + `deductCredits`: ✅ Story 3.6 — **extender metadata com campos de anexo**
- `CreditTransaction` com campos de auditoria: ✅ Story 3.6 — **adicionar hasAttachments, attachmentTypes, attachmentTokens**
- `countTokens` via tiktoken: ✅ Story 3.6 — **reusar para texto extraído de documentos**
- `calculateImageCost` (Vision API pricing): ❌ **não existe**
- Processamento de PDF/DOCX/TXT/MD: ❌ **não existe**
- Upload de arquivos no frontend: ❌ **não existe**
- `multipart/form-data` no endpoint de chat: ❌ **não existe**
- Dependências pdf-parse, mammoth, sharp: ❌ **não instaladas**

**O que NÃO muda:** Autenticação, streaming SSE, sistema de cotação cambial, idempotência de webhooks, sessão, mensagens sem anexo, Stripe Checkout, fluxo de webhooks, layout geral do chat.

---

## Subtasks

### Subtask 1: Migration Prisma — Campos de auditoria de anexos

**Escopo:** Adicionar campos de metadados de anexo à tabela `CreditTransaction`.

- [ ] Adicionar `hasAttachments Boolean @default(false)` em `CreditTransaction`
- [ ] Adicionar `attachmentTypes String[] @default([])` em `CreditTransaction` (tipos MIME)
- [ ] Adicionar `attachmentTokens Int?` em `CreditTransaction` (tokens extras dos arquivos)
- [ ] Criar migration: `pnpm db:migrate` aplica sem erros
- [ ] Nenhuma tabela nova — apenas campos opcionais adicionados
- [ ] Dados existentes: não impactados (novos campos têm defaults)

**Test:** Migration aplica sem erros. `prisma generate` produz tipos corretos. Campos novos aceitam valores default.

---

### Subtask 2: Instalar dependências em apps/web

**Escopo:** Adicionar pacotes de extração de arquivos.

- [ ] `pnpm add -w apps/web pdf-parse` — extração de texto de PDFs
- [ ] `pnpm add -w apps/web mammoth` — extração de texto de DOCX
- [ ] `pnpm add -w apps/web sharp` — leitura de dimensões de imagens (verificar se já existe como dep do Next.js — Next.js inclui sharp opcionalmente)
- [ ] `pnpm add -D -w apps/web @types/pdf-parse` — tipos TypeScript (se existirem)
- [ ] Verificar que `pnpm build` do Next.js 14 continua passando após instalar dependências
- [ ] Verificar que nenhuma dependência causa conflito com runtime do Next.js

**ATENÇÃO — Limitações conhecidas:**
- `pdf-parse`: PDFs escaneados retornam string vazia → código deve detectar e retornar erro
- `mammoth`: usa APIs Node.js → API Route DEVE usar `export const runtime = 'nodejs'`
- `sharp`: requer runtime Node.js → mesma restrição

**Test:** `pnpm build` passa sem erros. `import pdfParse from 'pdf-parse'`, `import mammoth from 'mammoth'`, `import sharp from 'sharp'` resolvem corretamente.

---

### Subtask 3: `calculateImageCost` em packages/db

**Escopo:** Função de cálculo de custo de imagem conforme pricing da OpenAI Vision API.

**Arquivo:** `packages/db/src/token-counter.ts` (adicionar ao existente)

- [ ] Função `calculateImageCost(width: number, height: number, detail: 'low' | 'high' | 'auto'): number`
- [ ] Implementação por `detail`:
  - `'low'`: sempre **85 tokens** fixos
  - `'high'`:
    1. Redimensionar para caber em 2048×2048 (escalar pela maior dimensão)
    2. Escalar para que menor dimensão = 768
    3. Calcular tiles de 512×512: `Math.ceil(scaledWidth / 512) × Math.ceil(scaledHeight / 512)`
    4. Custo = `(tiles × 170) + 85`
  - `'auto'`: usar `'high'` se qualquer dimensão > 512, `'low'` caso contrário
- [ ] Exportar de `packages/db/src/index.ts`

**Testes unitários:**

| Input | Detail | Expected |
|-------|--------|----------|
| 512×512 | `low` | 85 tokens |
| 1024×1024 | `high` | `(Math.ceil(768/512) × Math.ceil(768/512) × 170) + 85` = `(2 × 2 × 170) + 85` = 765 tokens |
| 2048×4096 | `high` | Redimensiona para 1024×2048, depois escala para 768×1536 → `(2 × 3 × 170) + 85` = 1105 tokens |
| 256×256 | `auto` | 85 tokens (ambas dimensões ≤ 512 → usa low) |
| 1920×1080 | `auto` | high detail aplicado (dimensão > 512) |

---

### Subtask 4: Funções de extração e validação de arquivos

**Escopo:** Módulo para processar cada tipo de arquivo suportado.

**Arquivo:** `apps/web/src/lib/file-processor.ts` (NOVO)

**Constantes:**

```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES_PER_MSG = 3;
const MAX_DOC_CHARS = 50_000;

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'text/plain', 'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;
```

**Tipos:**

```typescript
type ProcessedFile =
  | { type: 'image'; width: number; height: number; base64: string; mimeType: string; tokens: number }
  | { type: 'document'; text: string; filename: string; tokens: number };
```

**Funções:**

- [ ] `validateFile(file: File): { valid: boolean; error?: string }`
  - Tipo MIME contra allowlist
  - Tamanho máximo 10MB
  - Retorna erro descritivo em português (ex: "Tipo de arquivo não suportado: application/zip")
- [ ] `extractTextFromPDF(buffer: Buffer): Promise<{ text: string; isEmpty: boolean }>`
  - Usa `pdf-parse`
  - Se texto extraído é vazio ou < 10 caracteres → `isEmpty: true`
  - Usado para detectar PDFs escaneados
- [ ] `extractTextFromDOCX(buffer: Buffer): Promise<string>`
  - Usa `mammoth`
  - Retorna texto plano (não HTML)
- [ ] `extractTextFromPlain(buffer: Buffer): string`
  - Leitura direta do buffer como UTF-8
  - Usado para TXT e MD
- [ ] `getImageDimensions(buffer: Buffer): Promise<{ width: number; height: number }>`
  - Usa `sharp` apenas para metadata, sem transformação de imagem
- [ ] `processFile(file: File): Promise<ProcessedFile>`
  - Orquestra: validação → buffer → extração → contagem de tokens
  - Para documentos: valida que texto extraído ≤ 50.000 caracteres, **rejeita se exceder** (nunca trunca)
  - Para PDFs: detecta texto vazio e rejeita com mensagem clara
  - Para imagens: lê dimensões, calcula tokens via `calculateImageCost(w, h, 'auto')`, converte para base64
  - Retorna `ProcessedFile` tipado
- [ ] `processFiles(files: File[]): Promise<ProcessedFile[]>`
  - Valida máximo 3 arquivos
  - Processa cada arquivo via `processFile()`
  - Se qualquer arquivo falhar → throw com mensagem clara identificando qual arquivo

**Mensagens de erro (em português):**

| Cenário | Mensagem |
|---------|----------|
| MIME inválido | `"Tipo de arquivo não suportado: {mime}. Tipos aceitos: JPEG, PNG, GIF, WEBP, PDF, TXT, MD, DOCX."` |
| Tamanho > 10MB | `"Arquivo '{filename}' excede o limite de 10MB ({size}MB)."` |
| PDF escaneado | `"Este PDF não contém texto legível. Envie como imagem ou digite o conteúdo."` |
| Documento > 50k chars | `"Documento '{filename}' muito grande ({chars} caracteres). Máximo: 50.000 caracteres (~25 páginas)."` |
| Mais de 3 arquivos | `"Máximo de 3 arquivos por mensagem."` |

**Testes:**

- [ ] PDF com texto → extrai corretamente, `isEmpty: false`
- [ ] PDF escaneado (sem texto) → detecta, `isEmpty: true`, retorna erro
- [ ] DOCX → extrai texto plano
- [ ] TXT e MD → leitura direta
- [ ] Imagem JPEG → dimensões corretas, base64 válido
- [ ] Arquivo > 10MB → rejeitado com mensagem clara
- [ ] Tipo MIME não suportado (ex: .zip) → rejeitado com mensagem clara
- [ ] Documento > 50.000 caracteres → rejeitado com mensagem clara (não truncado)
- [ ] 4 arquivos → rejeitado com mensagem clara

---

### Subtask 5: Refatorar `POST /api/chat`

**Escopo:** Aceitar `multipart/form-data` com arquivos, mantendo retrocompatibilidade total com `application/json`.

**Arquivo:** `apps/web/src/app/api/chat/route.ts`

**Mudanças:**

- [ ] Adicionar `export const runtime = 'nodejs'` no topo (obrigatório para mammoth e sharp)
- [ ] Detectar Content-Type: `multipart/form-data` vs `application/json`
- [ ] Se `application/json` → fluxo existente **intocado, zero mudanças**
- [ ] Se `multipart/form-data`:

```
POST /api/chat (multipart/form-data)
  ├─ auth check
  ├─ parse FormData: message, conversationId, files (File[])
  ├─ processFiles(files) → ProcessedFile[]
  │   ├─ se falhar → 400 com mensagem clara, sem OpenAI, sem dedução
  │   └─ separar em imageFiles[] e documentFiles[]
  ├─ calcular tokens extras:
  │   ├─ documentTokens = sum(countTokens(text) for each document)
  │   ├─ imageTokens = sum(tokens for each image)
  │   └─ attachmentTokens = documentTokens + imageTokens
  ├─ mount messages (system prompt + resumo + nova) — como já funciona
  ├─ totalInputTokens = countTokens(messages) + attachmentTokens
  ├─ determinar modelo:
  │   ├─ se imageFiles.length > 0 → model = 'gpt-4o' (Vision requer modelo completo)
  │   └─ se não → lógica existente
  ├─ getExchangeRate("USD-BRL") → exchangeRate
  ├─ estimateMaxCost(totalInputTokens, model, exchangeRate) → maxCostCents
  ├─ fetch user.balanceCents
  ├─ GATE: balanceCents < maxCostCents → 402
  ├─ save user message
  ├─ montar payload OpenAI:
  │   ├─ imagens: content array com { type: 'image_url', image_url: { url: 'data:{mime};base64,{b64}', detail: 'auto' } }
  │   ├─ documentos: prefixo na mensagem: "[Documento: {filename}]\n{text}\n\n"
  │   └─ múltiplos documentos: cada um no seu bloco de prefixo
  ├─ stream OpenAI with max_tokens: 8192
  │   ├─ success:
  │   │   ├─ save assistant message
  │   │   ├─ calculateRealCost(totalInputTokens, outputTokens, model, exchangeRate)
  │   │   ├─ deductCredits(userId, costCents, {
  │   │   │     ...existingMetadata,
  │   │   │     hasAttachments: true,
  │   │   │     attachmentTypes: [...mimeTypes],
  │   │   │     attachmentTokens
  │   │   │   })
  │   │   └─ send { done: true, conversationId, balanceCents }
  │   └─ error:
  │       ├─ send { error: message }
  │       └─ NO deduction
  └─ header: X-Balance-Cents
```

- [ ] Se processamento de qualquer arquivo falhar → 400, nenhum crédito deduzido, nenhuma chamada à OpenAI
- [ ] Se OpenAI falhar após receber os arquivos → nenhum crédito deduzido (comportamento existente mantido)
- [ ] Buffers dos arquivos descartados após montar o payload OpenAI — nenhuma persistência

**Test:** Gate aceita com anexo → stream → deduz custo real incluindo tokens de anexo. Gate rejeita com anexo grande (saldo insuficiente) → 402. Arquivo inválido → 400 antes de qualquer OpenAI. JSON sem arquivo → fluxo antigo intocado.

---

### Subtask 6: Atualizar frontend — ChatInput com anexos

**Escopo:** Adicionar botão de anexo e preview de arquivos selecionados no input do chat.

**Arquivo:** `apps/web/src/app/chat/page.tsx` (componente `ChatInput`)

**UI:**

- [ ] Botão de anexo (ícone paperclip SVG inline) à esquerda do textarea
- [ ] `<input type="file" />` hidden com `accept` para tipos suportados, `multiple`
- [ ] Limite de 3 arquivos no frontend (desabilitar botão após 3 selecionados)
- [ ] Preview dos anexos entre o textarea e a área de mensagens:
  - Imagens: thumbnail 48×48px com `object-fit: cover`, border-radius
  - Documentos: ícone de arquivo + nome truncado (max 20 chars) + tamanho formatado
  - Botão `×` em cada anexo para remover
- [ ] Validação client-side:
  - Rejeitar arquivo > 10MB antes do upload → mensagem de erro inline
  - Rejeitar tipo MIME não permitido → mensagem de erro inline
- [ ] Envio:
  - Se há anexos → `FormData` com `message`, `conversationId`, `files`
  - Se não há anexos → `JSON` com `{ conversationId, message }` (comportamento atual preservado)
- [ ] Loading state: indicador "Processando arquivo..." enquanto request em andamento com anexos
- [ ] Após envio bem-sucedido: limpar preview de anexos

**Visual (alinhado com design system):**
- Botão paperclip: `text-foreground-muted/50`, hover `text-foreground-muted`
- Preview area: `bg-background-secondary/50`, border `border-solar-800/20`, rounded
- Thumbnail: border `border-solar-800/30`, rounded-lg
- Remove button: `text-foreground-muted/50`, hover `text-red-400`

---

### Subtask 7: Exibição de anexos nas mensagens do chat

**Escopo:** Indicar visualmente que uma mensagem incluiu anexos.

**Arquivo:** `apps/web/src/app/chat/page.tsx` (componente `MessageBubble`)

- [ ] Mensagens que incluíram imagens (sessão atual): exibir thumbnail clicável acima do texto
- [ ] Mensagens que incluíram documentos: exibir badge com ícone de arquivo + nome
- [ ] **IMPORTANTE:** Como arquivos **não são persistidos**, ao recarregar a página os previews reais não estarão disponíveis
  - Para a sessão atual: exibir preview real (imagem/nome do arquivo mantidos em estado local)
  - Para mensagens históricas (pós-reload): não exibir preview — o texto da mensagem já contém o contexto usado
- [ ] Interface `Message` pode ser extendida com campo opcional para anexos da sessão atual:

```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  attachments?: Array<{
    type: 'image' | 'document';
    name: string;
    previewUrl?: string; // blob URL para imagens (sessão atual apenas)
  }>;
}
```

**Visual:**
- Badge de documento: `bg-solar-500/10`, border `border-solar-500/30`, `text-solar-300`, rounded-lg, ícone de arquivo + nome
- Thumbnail de imagem: max-width 200px, rounded-lg, border `border-solar-800/30`, cursor pointer

---

### Subtask 8: Testes de integração

**Escopo:** Garantir cobertura dos fluxos com e sem anexo.

- [ ] POST /api/chat com PDF (texto legível) → texto extraído usado como contexto → resposta coerente da IA
- [ ] POST /api/chat com imagem JPEG → Vision API processa → modelo forçado para gpt-4o
- [ ] POST /api/chat com DOCX → texto extraído → resposta coerente
- [ ] POST /api/chat com JSON (sem arquivo) → fluxo existente sem alteração (retrocompatibilidade)
- [ ] POST /api/chat com 4 arquivos → 400 "Máximo de 3 arquivos por mensagem."
- [ ] POST /api/chat com arquivo > 10MB → 400 com mensagem clara
- [ ] POST /api/chat com PDF escaneado → 400 "Este PDF não contém texto legível..."
- [ ] POST /api/chat com documento > 50.000 caracteres → 400 com mensagem clara (não truncado)
- [ ] POST /api/chat com tipo MIME inválido (ex: .zip) → 400 com mensagem clara
- [ ] Gate bloqueando quando saldo insuficiente para mensagem + arquivo grande → 402
- [ ] `CreditTransaction` registra `hasAttachments: true`, `attachmentTypes`, `attachmentTokens` após mensagem com anexo
- [ ] `CreditTransaction` registra `hasAttachments: false` (default) para mensagem sem anexo
- [ ] Badge de créditos atualiza corretamente após mensagem com anexo (via `X-Balance-Cents` + evento `done`)
- [ ] Modelo forçado para `gpt-4o` quando imagem anexada; modelo default quando apenas documentos
- [ ] `pnpm typecheck` passa sem erros
- [ ] `pnpm build` passa sem erros

---

## Acceptance Criteria

### AC1: Upload de até 3 arquivos por mensagem
- [ ] Aluno pode anexar 1, 2 ou 3 arquivos por mensagem, com ou sem texto acompanhante
- [ ] Mais de 3 arquivos → rejeitado com mensagem clara

### AC2: Tipos suportados
- [ ] Imagens: JPEG, PNG, GIF, WEBP (processadas via OpenAI Vision API)
- [ ] Documentos de texto: PDF, TXT, MD (conteúdo extraído como texto plano)
- [ ] Documentos ricos: DOCX (conteúdo extraído como texto plano)
- [ ] Tipos não suportados → rejeitados com mensagem clara identificando o tipo

### AC3: Limites de tamanho e conteúdo
- [ ] Arquivos > 10MB rejeitados com mensagem clara (validação client-side e server-side)
- [ ] Documentos > 50.000 caracteres REJEITADOS com mensagem clara (nunca truncado silenciosamente)

### AC4: Detecção de PDFs escaneados
- [ ] PDFs escaneados (sem texto extraível) detectados e rejeitados
- [ ] Mensagem clara ao aluno: sugestão de enviar como imagem ou digitar o conteúdo

### AC5: Modelo forçado para GPT-4o com imagens
- [ ] Quando imagem é anexada, sistema força uso de GPT-4o (Vision API) independente do modelo padrão
- [ ] Gate de custo máximo calcula com preço do modelo efetivamente usado (GPT-4o, não GPT-4o-mini)

### AC6: Tokens de anexos incluídos no custo
- [ ] Tokens do conteúdo do arquivo somados ao input no cálculo do gate e da dedução real
- [ ] Documentos: tokens via tiktoken sobre o texto extraído
- [ ] Imagens: tokens fixos calculados por resolução (Vision API pricing) via `calculateImageCost`

### AC7: Saldo NUNCA negativo
- [ ] Gate verifica saldo suficiente para custo total (texto + tokens de anexos + 8192 output tokens)
- [ ] Saldo insuficiente → 402 (mesmo comportamento existente, só com input tokens maiores)

### AC8: Arquivos não persistidos
- [ ] Arquivos processados inteiramente em memória no backend
- [ ] Nunca persistidos em disco, storage externo ou banco de dados
- [ ] Buffers descartados após montar payload OpenAI

### AC9: Retrocompatibilidade total
- [ ] Mensagens `application/json` sem anexo funcionam sem alteração (zero mudanças no fluxo existente)
- [ ] Detecção automática via Content-Type header

### AC10: Auditoria de anexos
- [ ] `CreditTransaction` de consumo registra: `hasAttachments` (Boolean), `attachmentTypes` (String[]), `attachmentTokens` (Int)
- [ ] Mensagens sem anexo: `hasAttachments: false`, `attachmentTypes: []`, `attachmentTokens: null`

### AC11: Runtime Node.js
- [ ] API Route configurada com `export const runtime = 'nodejs'` (não edge)
- [ ] mammoth e sharp funcionam corretamente

### AC12: Sem regressão
- [ ] Streaming SSE funciona como antes
- [ ] Sistema de cotação cambial inalterado
- [ ] Idempotência de webhooks inalterada
- [ ] Autenticação e sessão inalteradas
- [ ] Histórico de conversas funciona como antes

### AC13: Frontend UX
- [ ] Botão de anexo visível e acessível no input do chat
- [ ] Preview de anexos selecionados antes do envio
- [ ] Remoção individual de anexos antes do envio
- [ ] Validação client-side imediata (10MB, tipo MIME)

---

## Files to Create/Modify

| File | Action | Mudança |
|------|--------|---------|
| `packages/db/prisma/schema.prisma` | MODIFY | Adicionar hasAttachments, attachmentTypes, attachmentTokens em CreditTransaction |
| `packages/db/prisma/migrations/.../migration.sql` | CREATE | Migration com campos de anexo |
| `packages/db/src/token-counter.ts` | MODIFY | Adicionar `calculateImageCost(width, height, detail)` |
| `packages/db/src/index.ts` | MODIFY | Exportar `calculateImageCost` |
| `apps/web/src/lib/file-processor.ts` | CREATE | validateFile, extractTextFromPDF/DOCX/Plain, getImageDimensions, processFile, processFiles |
| `apps/web/src/app/api/chat/route.ts` | MODIFY | `runtime = 'nodejs'`, dual Content-Type, file processing, model forcing, attachment metadata |
| `apps/web/src/app/chat/page.tsx` | MODIFY | ChatInput com botão de anexo + preview; MessageBubble com exibição de anexos |
| `apps/web/package.json` | MODIFY | Adicionar pdf-parse, mammoth, sharp como dependências |

---

## Dependencies

- **Blocked by:** Story 2.3 (streaming OpenAI funcional) ✅ Done
- **Blocked by:** Story 3.6 (gate pré-chamada, dedução custo real, CreditTransaction com auditoria) ✅ Done
- **Blocks:** Nenhuma — feature aditiva ao chat existente
- **New dependencies:** `pdf-parse`, `mammoth`, `sharp` (npm packages para apps/web)

---

## Implementation Plan

### Ordem de implementação

1. **Subtask 1** (Migration) — schema primeiro, campos de auditoria necessários para dedução
2. **Subtask 2** (Dependências) — instalar antes de implementar extração
3. **Subtask 3** (calculateImageCost) — independente, pode ser testado isoladamente
4. **Subtask 4** (file-processor.ts) — depende de Subtask 2 e 3
5. **Subtask 5** (API chat route) — depende de Subtasks 1, 3, 4
6. **Subtask 6** (Frontend input) — depende de Subtask 5 (API pronta)
7. **Subtask 7** (Frontend exibição) — depende de Subtask 6
8. **Subtask 8** (Testes integração) — depende de todas as anteriores

### Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| pdf-parse retorna string vazia para PDFs escaneados | Detectar texto vazio e retornar 400 com orientação ao aluno |
| mammoth/sharp requerem Node.js runtime | `export const runtime = 'nodejs'` obrigatório na API Route |
| Pico de memória com 3 arquivos × 10MB | 30MB max por request. Com 200 concorrentes (NFR8), ~6GB pior caso teórico — improvável. Monitorar. |
| Custo de Vision API maior que texto | Gate calcula com GPT-4o pricing quando imagem presente. Aluno vê custo antes (via 402 se insuficiente). |

---

## Constants

| Constant | Value | Location | Purpose |
|----------|-------|----------|---------|
| `MAX_FILE_SIZE` | `10 * 1024 * 1024` (10MB) | `apps/web/src/lib/file-processor.ts` | Tamanho máximo por arquivo |
| `MAX_FILES_PER_MSG` | `3` | `apps/web/src/lib/file-processor.ts` | Máximo de arquivos por mensagem |
| `MAX_DOC_CHARS` | `50_000` | `apps/web/src/lib/file-processor.ts` | Limite de caracteres por documento |
| `ALLOWED_MIME_TYPES` | (ver Subtask 4) | `apps/web/src/lib/file-processor.ts` | Allowlist de tipos MIME |

---

## Testing Checklist

- [ ] Migration aplica sem erros (`pnpm db:migrate`)
- [ ] `calculateImageCost` com low detail → 85 tokens
- [ ] `calculateImageCost` com high detail → tiles calculados corretamente
- [ ] `calculateImageCost` com auto detail → seleciona low/high por threshold
- [ ] `validateFile` rejeita MIME inválido com mensagem clara
- [ ] `validateFile` rejeita arquivo > 10MB com mensagem clara
- [ ] `extractTextFromPDF` extrai texto de PDF normal
- [ ] `extractTextFromPDF` detecta PDF escaneado (texto vazio)
- [ ] `extractTextFromDOCX` extrai texto plano de DOCX
- [ ] `extractTextFromPlain` lê TXT e MD corretamente
- [ ] `processFile` rejeita documento > 50.000 caracteres
- [ ] `processFiles` rejeita quando > 3 arquivos
- [ ] API chat com JSON → fluxo antigo intocado (retrocompatibilidade)
- [ ] API chat com multipart + PDF → texto extraído como contexto
- [ ] API chat com multipart + imagem → Vision API, modelo forçado para gpt-4o
- [ ] API chat com multipart + DOCX → texto extraído como contexto
- [ ] API chat com arquivo inválido → 400, sem chamada OpenAI, sem dedução
- [ ] Gate aceita com anexos → stream → deduz custo real incluindo tokens de anexo
- [ ] Gate rejeita com anexo grande + saldo baixo → 402
- [ ] `CreditTransaction` registra `hasAttachments`, `attachmentTypes`, `attachmentTokens`
- [ ] Badge de créditos atualiza após mensagem com anexo
- [ ] Frontend: botão de anexo funcional
- [ ] Frontend: preview de imagens e documentos
- [ ] Frontend: remoção individual de anexos
- [ ] Frontend: validação client-side (10MB, MIME type)
- [ ] `pnpm typecheck` passa sem erros
- [ ] `pnpm build` passa sem erros

---

## Definition of Done

- [ ] Migration aplicada com sucesso (campos de auditoria de anexos)
- [ ] `calculateImageCost` implementada e testada
- [ ] `file-processor.ts` funcional com todos os tipos suportados
- [ ] `POST /api/chat` aceita `multipart/form-data` e `application/json` (retrocompatível)
- [ ] Modelo forçado para GPT-4o quando imagem presente
- [ ] Gate inclui tokens de anexos no cálculo de custo máximo
- [ ] Dedução real inclui tokens de anexos
- [ ] `CreditTransaction` registra metadados de anexo
- [ ] Saldo nunca fica negativo
- [ ] Arquivos processados em memória, nunca persistidos
- [ ] Frontend com botão de anexo, preview e envio via FormData
- [ ] Todos os ACs validados
- [ ] Testes de integração passam
- [ ] TypeScript strict: sem `any`, sem `as unknown`
- [ ] `pnpm typecheck` e `pnpm build` passam sem erros

---

## References

- **PRD v5.0:** [docs/prd.md](../../prd.md) — FR11, Story 2.5
- **Architecture v4.0:** [docs/architecture.md](../../architecture.md) — Chat API (multipart), calculateImageCost, CreditTransaction with attachment fields, Core Workflow (18 steps)
- **Story 2.3 (baseline):** [story-2.3-openai-integration.md](./story-2.3-openai-integration.md) — Streaming SSE existente
- **Story 3.6 (baseline):** [story-3.6-pricing-refactoring.md](../epic-3/story-3.6-pricing-refactoring.md) — Gate + Real Cost, deductCredits, estimateMaxCost
- **OpenAI Vision API Pricing:** Tiles 512×512, low=85 tokens, high=(tiles×170)+85
