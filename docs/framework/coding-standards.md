# Coding Standards — SOL (Eden Corporate)

> Padrões obrigatórios para todos os agentes que geram código neste projeto.
> Aplicável a SOL e todos os produtos futuros da Eden Corporate.

---

## TypeScript

- **Strict mode obrigatório** — `"strict": true` no tsconfig
- Proibido: `any`, `as unknown as`, `@ts-ignore` sem justificativa documentada
- Tipos explícitos em funções públicas e retornos de API
- Interfaces para objetos de domínio, `type` para unions e utilitários

## Estrutura de Arquivos (Next.js App Router)

```
apps/web/
  app/
    (auth)/          # Rotas de login e cadastro
    (dashboard)/     # Rotas protegidas do usuário
    api/             # API Routes — toda lógica de backend aqui
  components/
    ui/              # Componentes Shadcn/UI base
    [feature]/       # Componentes específicos de cada feature
  lib/
    auth.ts          # Configuração NextAuth
    db.ts            # Cliente Prisma singleton
    stripe.ts        # Cliente Stripe
    openai.ts        # Cliente OpenAI
  types/             # Tipos globais do projeto
```

## Nomenclatura

- **Arquivos:** kebab-case (`chat-message.tsx`, `user-service.ts`)
- **Componentes React:** PascalCase (`ChatMessage`, `UserCard`)
- **Funções e variáveis:** camelCase (`getUserById`, `chatHistory`)
- **Constantes:** UPPER_SNAKE_CASE (`MAX_CREDITS`, `API_TIMEOUT`)
- **Tipos e Interfaces:** PascalCase com prefixo descritivo (`UserProps`, `ChatMessageType`)

## API Routes

- Sempre validar input com Zod antes de processar
- Sempre retornar erros com status HTTP correto (400, 401, 403, 404, 500)
- Nunca expor stack traces em produção
- Autenticação verificada no início de toda rota protegida

```typescript
// Padrão obrigatório para API Routes
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error }, { status: 400 })

  // lógica aqui
}
```

## Banco de Dados

- Cliente Prisma como singleton em `lib/db.ts`
- Nunca instanciar `new PrismaClient()` fora do singleton
- Transactions para operações que afetam múltiplas tabelas
- Índices definidos no schema para campos de busca frequente

## Componentes React

- Componentes funcionais com hooks — sem class components
- Props tipadas com interface explícita
- Server Components por padrão — Client Components apenas quando necessário (`'use client'`)
- Nunca buscar dados diretamente em Client Components — usar Server Components ou API Routes

## Segurança

- Variáveis de ambiente sensíveis nunca no frontend (sem `NEXT_PUBLIC_` em chaves secretas)
- Sanitização de input em toda entrada do usuário
- Rate limiting em rotas de IA para controlar custo
- Verificar ownership antes de qualquer operação em dado do usuário

## Git

- Commits em português seguindo conventional commits: `feat:`, `fix:`, `chore:`, `docs:`
- Branches: `feature/nome-da-feature`, `fix/nome-do-bug`
- Nunca commitar `.env` — apenas `.env.example`
- PR obrigatório para `main` — nunca push direto
