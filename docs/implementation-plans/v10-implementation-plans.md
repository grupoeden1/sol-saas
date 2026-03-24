# SOL v10.0 — Implementation Plans

> Created by @architect | Date: 2026-03-04
> Covers: Claude API Migration, Prompt Engine, Market Classifier, Epic 8 Feedback Loop

---

## 1. Claude API Migration (Phase 2)

### 1.1 Dependencies

**Remove:**
- `openai` (npm package)
- `tiktoken` (if still present)

**Add:**
- `@anthropic-ai/sdk` (latest)

```bash
cd apps/web && pnpm remove openai && pnpm add @anthropic-ai/sdk
```

### 1.2 Environment Variables

| Old | New |
|-----|-----|
| `OPENAI_API_KEY` | `ANTHROPIC_API_KEY` |
| `OPENAI_MODEL_DEFAULT` (gpt-4o-mini) | `ANTHROPIC_MODEL_DEFAULT` (claude-haiku-4-5-20251001) |
| `OPENAI_MODEL_FINAL` (gpt-4o) | `ANTHROPIC_MODEL_FINAL` (claude-sonnet-4-5-20250929) |

### 1.3 Files to Modify

#### A. `apps/web/src/app/api/chat/route.ts` — Main chat endpoint

**Current (OpenAI):**
```typescript
import OpenAI from 'openai';

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

// Streaming
const stream = await getOpenAI().chat.completions.create({
  model, messages, stream: true, temperature: 0.7,
  max_completion_tokens: config.maxOutputTokens,
});
for await (const chunk of stream) {
  const token = chunk.choices[0]?.delta?.content || '';
}
```

**Target (Anthropic):**
```typescript
import Anthropic from '@anthropic-ai/sdk';

let _anthropic: Anthropic | null = null;
function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

// Streaming
const stream = getAnthropic().messages.stream({
  model,
  max_tokens: config.maxOutputTokens,
  system: systemPrompt,
  messages: [...previousMsgs, { role: 'user', content: userContent }],
  temperature: 0.7,
});
for await (const event of stream) {
  if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
    const token = event.delta.text;
  }
}
// Token usage from final message
const finalMessage = await stream.finalMessage();
const inputTokens = finalMessage.usage.input_tokens;
const outputTokens = finalMessage.usage.output_tokens;
```

**Key differences:**
- `system` prompt is a top-level param, not a message
- `max_tokens` instead of `max_completion_tokens`
- Streaming events: `content_block_delta` with `text_delta` type
- Token counts from `stream.finalMessage().usage` — **eliminates tiktoken dependency**
- Vision: images as `{ type: 'image', source: { type: 'base64', media_type, data } }` instead of `image_url`

**Error handling:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

function getErrorMessage(error: unknown): string {
  if (error instanceof Anthropic.APIError) {
    if (error.status === 429) return 'Estamos com muitas solicitações...';
    if (error.status === 401) return 'Erro de autenticação com o serviço de IA...';
    if (error.status === 408 || error.status === 529) return 'A resposta demorou mais...';
  }
  return 'Ocorreu um erro ao processar sua mensagem...';
}
```

#### B. `apps/web/src/app/api/quiz/generate/route.ts` — Quiz generation

Same pattern as chat/route.ts. Additional changes:
- Model selection: always use `ANTHROPIC_MODEL_FINAL` (Sonnet) for generation
- Token counting: use `stream.finalMessage().usage` instead of `countRawTokens()`

#### C. `apps/web/src/lib/video/processor.ts` — Video analysis

**Current:** Uses `openai.chat.completions.create()` with `image_url` for frame analysis
**Target:** Use `anthropic.messages.create()` with base64 image blocks

```typescript
// Frame analysis with Claude Vision
const response = await getAnthropic().messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 2048,
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: frameAnalysisPrompt },
      ...frames.map(f => ({
        type: 'image' as const,
        source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data: f.base64 }
      }))
    ]
  }]
});
```

#### D. `packages/db/token-counter.ts` — Token counting

**Current:** Uses `tiktoken` for pre-call estimation
**Target:** Simplified estimation (no external dependency)

```typescript
// Simple estimation: ~4 chars per token (industry standard)
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// After API call, use actual usage from response
// finalMessage.usage.input_tokens / output_tokens
```

#### E. `apps/web/src/lib/prompts.ts` — System prompt

No code changes needed — system prompts are plain strings. Just ensure they're passed as `system` param (top-level) instead of as a message.

#### F. `apps/web/src/lib/file-processor.ts` — Attachment processing

Update image content block format from OpenAI's `image_url` to Anthropic's `image` block. Document text blocks remain the same.

### 1.4 Token Counting Strategy

**Pre-call estimation (gate):** Use `estimateTokens()` (~4 chars/token) for the credit gate. This is conservative and avoids external dependencies.

**Post-call actual:** Use `stream.finalMessage().usage.input_tokens` and `output_tokens` from the Anthropic API response. This is the source of truth for billing.

### 1.5 Migration Order

1. Install `@anthropic-ai/sdk`, update `.env`
2. Create `getAnthropic()` singleton pattern
3. Migrate `chat/route.ts` (main chat)
4. Migrate `quiz/generate/route.ts` (quiz generation)
5. Migrate `video/processor.ts` (vision analysis)
6. Update `token-counter.ts` (remove tiktoken)
7. Remove `openai` package
8. Run `pnpm typecheck` — zero errors
9. Manual test: chat, quiz generation, video analysis

---

## 2. Story 6.8: Market Classification

### 2.1 New File: `apps/web/src/lib/quiz/market-classifier.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';

export interface MarketClassification {
  awarenessLevel: number;     // 1-5 Schwartz
  sophisticationLevel: number; // 1-5
  awarenessJustification: string;
  sophisticationJustification: string;
}

const CLASSIFICATION_PROMPT = `Analise o contexto do aluno e classifique:

1. **Nível de Consciência (Schwartz 1-5):**
   1 = Inconsciente (não sabe que tem o problema)
   2 = Consciente do problema
   3 = Consciente da solução
   4 = Consciente do produto
   5 = Mais consciente (já conhece e confia)

2. **Sofisticação de Mercado (1-5):**
   1 = Mercado virgem
   2 = Poucos concorrentes
   3 = Competitivo
   4 = Saturado
   5 = Cético

Responda EXATAMENTE neste formato JSON:
{
  "awarenessLevel": <1-5>,
  "sophisticationLevel": <1-5>,
  "awarenessJustification": "<justificativa>",
  "sophisticationJustification": "<justificativa>"
}`;

export async function classifyMarket(
  quizAnswers: Record<string, string>,
  onboardingProfile: Record<string, string>,
): Promise<MarketClassification> {
  const context = buildClassificationContext(quizAnswers, onboardingProfile);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await getAnthropic().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      temperature: 0,
      system: CLASSIFICATION_PROMPT,
      messages: [{ role: 'user', content: context }],
    }, { signal: controller.signal });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const parsed = JSON.parse(text);

    return {
      awarenessLevel: clamp(parsed.awarenessLevel, 1, 5),
      sophisticationLevel: clamp(parsed.sophisticationLevel, 1, 5),
      awarenessJustification: parsed.awarenessJustification ?? '',
      sophisticationJustification: parsed.sophisticationJustification ?? '',
    };
  } catch (error) {
    console.warn('[Market Classifier] Failed, using defaults:', error);
    return {
      awarenessLevel: 3,
      sophisticationLevel: 3,
      awarenessJustification: 'Classificação automática indisponível — usando padrão.',
      sophisticationJustification: 'Classificação automática indisponível — usando padrão.',
    };
  } finally {
    clearTimeout(timeout);
  }
}
```

### 2.2 Schema Changes

Add to `QuizSession` in `packages/db/prisma/schema.prisma`:
```prisma
model QuizSession {
  // ... existing fields ...
  awarenessLevel       Int?
  sophisticationLevel  Int?
  awarenessJustification     String?  @db.Text
  sophisticationJustification String? @db.Text
}
```

### 2.3 Integration in `quiz/generate/route.ts`

Insert **before** `buildQuizPrompt()`:
```typescript
import { classifyMarket } from '@/lib/quiz/market-classifier';

// Classify market before building prompt
const classification = await classifyMarket(answerMap, onboardingAnswers);

// Persist classification
await prisma.quizSession.update({
  where: { id: quizSession.id },
  data: {
    awarenessLevel: classification.awarenessLevel,
    sophisticationLevel: classification.sophisticationLevel,
    awarenessJustification: classification.awarenessJustification,
    sophisticationJustification: classification.sophisticationJustification,
  },
});
```

---

## 3. Prompt Engine Architecture (Phase 3)

### 3.1 File Structure

```
apps/web/src/lib/prompt-engine/
├── index.ts              # assemblePrompt() — main entry point
├── base.ts               # Fixed base prompts (layer 1)
├── modules/
│   ├── index.ts           # Module registry & selector
│   ├── education.ts       # "Educação do problema" (awareness 1-2)
│   ├── differentiation.ts # "Diferenciação agressiva" (sophistication 4-5)
│   ├── trust.ts           # "Construção de confiança" (awareness 3-4)
│   ├── urgency.ts         # "Urgência e escassez" (sophistication 1-2)
│   └── social-proof.ts    # "Prova social" (general)
└── patterns/
    ├── index.ts           # Pattern loader
    └── library.ts         # Static patterns (later: DB-backed via Epic 8)
```

### 3.2 Module Selection Logic

```typescript
// modules/index.ts
export function selectModules(
  classification: MarketClassification,
  path1: 'AD' | 'ORGANIC',
  path2: 'MODELED' | 'FROM_SCRATCH',
): PromptModule[] {
  const modules: PromptModule[] = [];

  // Awareness-based
  if (classification.awarenessLevel <= 2) modules.push(educationModule);
  if (classification.awarenessLevel >= 3 && classification.awarenessLevel <= 4) modules.push(trustModule);

  // Sophistication-based
  if (classification.sophisticationLevel >= 4) modules.push(differentiationModule);
  if (classification.sophisticationLevel <= 2) modules.push(urgencyModule);

  // Always include
  modules.push(socialProofModule);

  return modules;
}
```

### 3.3 Integration with existing `prompt-builder.ts`

The Prompt Engine **wraps** the existing `buildQuizPrompt()`:

```typescript
// prompt-engine/index.ts
export function assemblePrompt(
  context: PromptContext,
  classification: MarketClassification,
): BuiltPrompt {
  // Layer 1: Base prompt (fixed)
  const base = getBasePrompt(context.path1, context.path2);

  // Layer 2: Contextual modules
  const modules = selectModules(classification, context.path1, context.path2);
  const moduleContent = modules.map(m => m.content).join('\n\n');

  // Layer 3: Pattern library (from DB or static)
  const patterns = loadPatterns(extractNiche(context.onboarding));

  // Assemble system prompt
  const systemPrompt = [base, moduleContent, patterns].filter(Boolean).join('\n\n---\n\n');

  // User prompt: same as existing buildQuizPrompt
  const { userPrompt } = buildQuizPrompt(context);

  return { systemPrompt, userPrompt, modulesUsed: modules.map(m => m.id) };
}
```

### 3.4 Migration Path

1. Create `prompt-engine/` directory with base, modules, patterns
2. Update `quiz/generate/route.ts` to use `assemblePrompt()` instead of `buildQuizPrompt()`
3. Keep `prompt-builder.ts` as-is (still used for user prompt construction)
4. Add `modules_used` tracking to `CreditTransaction`

---

## 4. Epic 8: Feedback Loop Data Layer (Phase 4)

### 4.1 Prisma Schema Additions

```prisma
// ─── Feedback Loop ──────────────────────────────────────────────────────

enum ContentType {
  PAID
  ORGANIC
}

enum PerformanceStatus {
  PRODUCED
  PUBLISHED
  METRICS
  ANALYZED
}

enum Classification {
  TERRIBLE
  BAD
  AVERAGE
  GOOD
  EXCELLENT
}

model ScriptPerformance {
  id                  String             @id @default(cuid())
  conversationId      String             @unique
  userId              String
  contentType         ContentType
  status              PerformanceStatus  @default(PRODUCED)
  niche               String
  modulesUsed         String[]           @default([])
  awarenessLevel      Int                // 1-5
  sophisticationLevel Int                // 1-5
  classification      Classification?
  executionScore      Int?               // 1-5
  executionAnalysis   String?            @db.Text

  conversation        Conversation       @relation(fields: [conversationId], references: [id])
  user                User               @relation(fields: [userId], references: [id])
  metrics             PerformanceMetrics[]
  analysis            ExecutionAnalysis?

  createdAt           DateTime           @default(now())
  updatedAt           DateTime           @updatedAt

  @@index([niche, classification])
  @@index([contentType, createdAt])
  @@index([awarenessLevel, sophisticationLevel])
  @@index([userId])
}

model PerformanceMetrics {
  id                    String            @id @default(cuid())
  scriptPerformanceId   String
  snapshotDay           Int               // 1, 3, 7, 14, 30
  // Paid metrics
  impressions           Int?
  ctr                   Float?
  cpc                   Float?
  cpm                   Float?
  cpa                   Float?
  roas                  Float?
  hookRate              Float?
  retention             Float?
  // Organic metrics
  views                 Int?
  likes                 Int?
  comments              Int?
  shares                Int?
  saves                 Int?

  scriptPerformance     ScriptPerformance @relation(fields: [scriptPerformanceId], references: [id], onDelete: Cascade)

  createdAt             DateTime          @default(now())

  @@unique([scriptPerformanceId, snapshotDay])
}

model ExecutionAnalysis {
  id                    String            @id @default(cuid())
  scriptPerformanceId   String            @unique
  videoUrl              String?
  originalScript        String            @db.Text
  comparisonResult      String            @db.Text
  score                 Int               // 1-5
  improvementSuggestions String[]         @default([])

  scriptPerformance     ScriptPerformance @relation(fields: [scriptPerformanceId], references: [id], onDelete: Cascade)

  createdAt             DateTime          @default(now())
}

model PerformanceThreshold {
  id           String      @id @default(cuid())
  contentType  ContentType
  metricKey    String      // "roas", "retention", etc.
  terribleMax  Float
  badMax       Float
  averageMax   Float
  goodMax      Float
  updatedAt    DateTime    @updatedAt
  updatedBy    String

  @@unique([contentType, metricKey])
}
```

### 4.2 Relations to Add

In existing models:
```prisma
model Conversation {
  // ... existing fields ...
  scriptPerformance  ScriptPerformance?
}

model User {
  // ... existing fields ...
  scriptPerformances ScriptPerformance[]
}
```

### 4.3 API Routes Structure

```
apps/web/src/app/api/
├── scripts/
│   └── [id]/
│       ├── performance/
│       │   └── route.ts         # POST: create ScriptPerformance
│       │                        # PATCH: update status (PUBLISHED)
│       ├── metrics/
│       │   └── route.ts         # POST: add PerformanceMetrics snapshot
│       └── execution-analysis/
│           └── route.ts         # POST: upload video + analyze
├── admin/
│   ├── results/
│   │   └── route.ts             # GET: aggregated results dashboard
│   └── intelligence/
│       └── route.ts             # GET: accumulated intelligence
```

### 4.4 Performance Classifier

```typescript
// apps/web/src/lib/performance/classifier.ts
export async function classifyPerformance(
  performanceId: string,
): Promise<Classification> {
  const perf = await prisma.scriptPerformance.findUnique({
    where: { id: performanceId },
    include: { metrics: { orderBy: { snapshotDay: 'desc' }, take: 1 } },
  });

  const latestMetric = perf.metrics[0];
  const thresholds = await prisma.performanceThreshold.findMany({
    where: { contentType: perf.contentType },
  });

  const primaryMetric = perf.contentType === 'PAID'
    ? latestMetric.roas
    : latestMetric.retention;

  const threshold = thresholds.find(t =>
    t.metricKey === (perf.contentType === 'PAID' ? 'roas' : 'retention')
  );

  if (primaryMetric <= threshold.terribleMax) return 'TERRIBLE';
  if (primaryMetric <= threshold.badMax) return 'BAD';
  if (primaryMetric <= threshold.averageMax) return 'AVERAGE';
  if (primaryMetric <= threshold.goodMax) return 'GOOD';
  return 'EXCELLENT';
}
```

### 4.5 Seed Data

```typescript
// In prisma/seed.ts
await prisma.performanceThreshold.createMany({
  data: [
    { contentType: 'PAID', metricKey: 'roas', terribleMax: 0.5, badMax: 1.0, averageMax: 2.0, goodMax: 4.0, updatedBy: 'seed' },
    { contentType: 'ORGANIC', metricKey: 'retention', terribleMax: 0.10, badMax: 0.20, averageMax: 0.35, goodMax: 0.50, updatedBy: 'seed' },
  ],
});
```

### 4.6 Implementation Order

1. **Story 8.1:** Schema + migration + seed
2. **Story 8.2:** Performance registration API + UI stepper
3. **Story 8.3:** Metrics collection API + classifier + UI form
4. **Story 8.4:** Execution analysis (reuse video pipeline) + comparison prompt
5. **Story 8.5:** Admin results dashboard (Server Components + aggregation queries)
6. **Story 8.6:** Intelligence dashboard + export feature

---

## 5. Risk Areas & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Claude API streaming format differs from OpenAI | Chat breaks | Test streaming thoroughly; use `@anthropic-ai/sdk` built-in stream helper |
| Token estimation without tiktoken is less accurate | Credit gate too generous/strict | Use conservative 4-char estimate for gate; actual usage from API response for billing |
| Market classifier timeout (10s) | Delays generation | Fallback defaults (3,3); run classifier in parallel with other setup |
| Video pipeline changes (Vision API format) | Video analysis breaks | Test with actual video upload; base64 format is simpler than OpenAI URL approach |
| Prisma migration on production | Downtime | All new fields are nullable or have defaults; additive-only changes |

---

## 6. Testing Checklist

- [ ] Chat streaming works with Claude API (text, with attachments, with images)
- [ ] Quiz generation works with Claude API (all 4 path combinations)
- [ ] Video analysis works with Claude Vision
- [ ] Market classification returns valid results (temperature=0, deterministic)
- [ ] Credit gate + deduction uses API response usage (not tiktoken)
- [ ] Prompt Engine assembles correct prompt based on classification
- [ ] Performance registration lifecycle (PRODUCED → PUBLISHED → METRICS → ANALYZED)
- [ ] Metrics collection with auto-classification
- [ ] Admin dashboards load with aggregated data
- [ ] `pnpm typecheck` passes with zero errors
- [ ] `.env.example` updated with new vars
