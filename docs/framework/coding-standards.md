# Coding Standards — SOL (Eden Corporate)

> Padrões obrigatórios para todos os agentes que geram código neste projeto.
> Aplicável a SOL e todos os produtos futuros da Eden Corporate.
> Última atualização: 2026-03-06

---

## TypeScript

- **Strict mode obrigatório** — `"strict": true` no tsconfig
- Proibido: `any`, `as unknown as`, `@ts-ignore` sem justificativa documentada
- Tipos explícitos em funções públicas e retornos de API
- Interfaces para objetos de domínio, `type` para unions e utilitários

## Estrutura de Arquivos (Next.js App Router)

```
apps/web/src/
  app/
    login/             # Autenticação (login, register, forgot-password)
    dashboard/         # Dashboard do usuário
    onboarding/        # Fluxo de onboarding
    profile/           # Perfil do expert
    quiz/              # Quiz de diagnóstico
    roteiros/          # Roteiros gerados pela IA
    credits/           # Compra e gestão de créditos
    admin/             # Console admin (layout próprio)
    api/               # API Routes — toda lógica de backend aqui
  components/
    admin/             # Componentes do admin console
    dashboard/         # Componentes do dashboard
    layout/            # AppLayout, CreditsBadge, CreditsProvider
    performance/       # Tracking de performance de roteiros
    profile/           # Form do expert profile
    quiz/              # Engine do quiz
    tts/               # Text-to-speech (ElevenLabs)
    video/             # Upload e processamento de vídeo
  lib/
    auth.ts            # Configuração NextAuth v5
    stripe.ts          # Cliente Stripe (singleton)
    rate-limit.ts      # Rate limiting in-memory
    ai/                # Adaptadores de IA (Anthropic + OpenAI)
    knowledge/         # RAG: chunker, embeddings, qdrant, retriever
    prompt-engine/     # Montagem de prompts (3 camadas)
    quiz/              # Lógica do quiz (questions, classifier)
    tts/               # Cliente ElevenLabs (singleton)
    video/             # AssemblyAI + FFmpeg + processor
  types/               # Tipos globais (.d.ts)
```

## Nomenclatura

- **Arquivos:** kebab-case (`credit-summary.tsx`, `rate-limit.ts`)
- **Componentes React:** PascalCase (`CreditSummary`, `TtsButton`)
- **Funções e variáveis:** camelCase (`getUserById`, `chatHistory`)
- **Constantes:** UPPER_SNAKE_CASE (`MAX_CREDITS`, `API_TIMEOUT`)
- **Tipos e Interfaces:** PascalCase com prefixo descritivo (`UserProps`, `AiAdapter`, `StreamResult`)
- **Enums Prisma:** UPPER_SNAKE_CASE para valores (`IN_PROGRESS`, `COMPLETED`)

## API Routes

- Sempre validar input com Zod antes de processar
- Sempre retornar erros com status HTTP correto (400, 401, 402, 403, 404, 410, 429, 500)
- Nunca expor stack traces em produção
- Autenticação verificada no início de toda rota protegida
- Rate limiting em rotas de IA e serviços externos

```typescript
// Padrão obrigatório para API Routes
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit'

const schema = z.object({ /* ... */ })

export async function POST(req: Request) {
  // Rate limit (quando aplicável)
  const rl = rateLimit(`feature:${getClientIp(req)}`, { limit: 10, windowSeconds: 60 })
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  // Auth
  const session = await auth()
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Validação
  const body = schema.safeParse(await req.json())
  if (!body.success) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Lógica aqui
}
```

## Banco de Dados

- Prisma Client como singleton em `packages/db/src/index.ts` — importar via `@sol/db`
- Nunca instanciar `new PrismaClient()` fora do singleton
- Nunca importar `@prisma/client` diretamente nas rotas — usar `@sol/db`
- Transactions para operações que afetam múltiplas tabelas
- Índices definidos no schema para campos de busca frequente
- Lógica de negócio em módulos separados: `credits.ts`, `pricing.ts`, `conversations.ts`, etc.
- Token counter importado via `@sol/db/token-counter` (separado por usar WASM)

## Pricing & Créditos

- Todo cálculo de custo centralizado em `packages/db/src/pricing.ts`
- Cada serviço externo tem sua função: `calculateCredits()`, `calculateAssemblyAiCredits()`, `calculateEmbeddingCredits()`, `calculateElevenLabsCredits()`
- Configuração via `PricingConfig` no banco — editável pelo admin sem deploy
- Credit gate obrigatório antes de chamar APIs pagas (verificar saldo antes da chamada)
- Dedução atômica com `WHERE credits >= N` para prevenir saldo negativo
- `CreditTransaction` registra auditoria completa (tokens, modelo, serviço, custo)

## Adaptadores de IA

- Toda chamada à IA passa pela interface `AiAdapter` (`lib/ai/types.ts`)
- Factory: `getAiAdapter(provider)` retorna o adapter correto
- Nunca instanciar `Anthropic()` ou `OpenAI()` diretamente nas API Routes
- Provider configurável pelo admin via `AppConfig` (sem redeploy)
- Dois métodos: `stream()` para geração iterativa, `complete()` para chamadas pontuais

## Componentes React

- Componentes funcionais com hooks — sem class components
- Props tipadas com interface explícita
- Server Components por padrão — Client Components apenas quando necessário (`'use client'`)
- Nunca buscar dados diretamente em Client Components — usar Server Components ou API Routes
- Componentes organizados por feature em `components/{feature}/`
- Componentes globais (Logo, LogoutButton) na raiz de `components/`

## Clients de Serviços Externos

- Sempre singleton lazy (inicializado no primeiro uso)
- Padrão: `let _client: T | null = null; function getClient(): T { ... }`
- Exemplos: `lib/tts/elevenlabs.ts`, `lib/video/assemblyai.ts`, `lib/knowledge/qdrant.ts`
- Nunca instanciar clients dentro de handlers de request

## Segurança

- Variáveis de ambiente sensíveis nunca no frontend (sem `NEXT_PUBLIC_` em chaves secretas)
- Sanitização de input em toda entrada do usuário (Zod)
- Rate limiting em rotas de IA e serviços externos para controlar custo
- Verificar ownership antes de qualquer operação em dado do usuário
- Admin routes verificam `role === 'ADMIN'` no middleware E na API Route
- Webhooks Stripe verificam assinatura via `stripe.webhooks.constructEvent()`

## Git

- Commits em português seguindo conventional commits: `feat:`, `fix:`, `chore:`, `docs:`
- Branches: `feature/nome-da-feature`, `fix/nome-do-bug`
- Nunca commitar `.env` — apenas `.env.example`
- PR obrigatório para `main` — nunca push direto
