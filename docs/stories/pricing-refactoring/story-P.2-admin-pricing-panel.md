# Story P.2 — Admin: Painel de Precificação com Simulador

**Epic:** 5.5 — Pricing Admin
**Story ID:** P.2
**Priority:** High
**Estimate:** 13 story points
**Status:** DONE
**Created by:** River (SM — story-development-cycle workflow)

---

## User Story

**As a** SOL administrator,
**I want** a pricing panel at /admin/pricing with a real-time simulator and editing of constants and packages,
**so that** I can control pricing without redeploying or accessing the database directly.

---

## Context

Story P.1 (Migration e Refatoração do Core de Créditos) estabeleceu o novo modelo de precificação no banco: tabela `pricing_config` com constantes editáveis e tabela `credit_packages` com pacotes configuráveis. O cache de `getPricingConfig()` tem TTL de 60s e função `invalidatePricingConfigCache()`.

**Estado atual (baseline — pós Story P.1):**
- Tabela `pricing_config` com seeds (CREDITS_PER_M_INPUT=500, CREDITS_PER_M_OUTPUT=2000, MAX_OUTPUT_TOKENS=8192): ✅ existe
- Tabela `credit_packages` com seeds (Starter, Pro, Max): ✅ existe
- `getPricingConfig()` com cache 60s e `invalidatePricingConfigCache()`: ✅ existe
- Rotas admin para pricing: ❌ **serão criadas nesta story**
- Página `/admin/pricing`: ❌ **será criada nesta story**
- Simulador de precificação: ❌ **será criado nesta story**

**O que NÃO muda:** chat, streaming SSE, autenticação, painel do aluno, webhook Stripe, admin console existente (`/admin`).

---

## Acceptance Criteria

### AC1: Simulador em tempo real com perfis de mensagem

- [ ] Seção "Custo por perfil de mensagem" na página `/admin/pricing`
- [ ] Tabela com perfis fixos: curta (800 in / 400 out), média (2000 / 1500), longa (3500 / 4000), pesada (8000 / 6000), pipeline (12000 / 8000)
- [ ] Cada perfil exibe: tokens input/output, créditos cobrados, custo real OpenAI (USD e BRL)
- [ ] Valores recalculados em tempo real conforme admin altera constantes (sem salvar)
- [ ] Métricas resumo: média créditos/msg, faixa min→max créditos

**Test:** Alterar CREDITS_PER_M_INPUT de 500 para 1000 no formulário → créditos de todos os perfis dobram no input component instantaneamente (sem save, sem reload).

---

### AC2: Calculadora custom de tokens → créditos

- [ ] Seção "Calculadora Custom" com campos editáveis: tokens de input + tokens de output
- [ ] Resultado: créditos cobrados (calculado em tempo real)
- [ ] Fórmula visível: `ceil((input/1M × rate_in) + (output/1M × rate_out)), min 1`

**Test:** Digitar 5000 input + 3000 output com defaults → exibe créditos calculados com a fórmula visível.

---

### AC3: Edição de constantes com save

- [ ] Campos editáveis inline: CREDITS_PER_M_INPUT, CREDITS_PER_M_OUTPUT, MAX_OUTPUT_TOKENS
- [ ] Validação: valores inteiros positivos
- [ ] Botão "Salvar configuração" com dialog de confirmação: "Tem certeza? Isso afeta todas as novas mensagens."
- [ ] Save via `PUT /api/admin/pricing` → atualiza banco + invalida cache
- [ ] Registra `updatedBy` (email do admin) e `updatedAt`
- [ ] Toast de sucesso após salvar

**Test:** Alterar CREDITS_PER_M_OUTPUT de 2000 para 3000 → confirmar → toast "Configuração salva" → enviar mensagem no chat em outra aba → créditos cobrados refletem novo valor.

---

### AC4: CRUD de pacotes

- [ ] Tabela de pacotes existentes com: nome, créditos, preço em R$, status (ativo/inativo), ações
- [ ] Para cada pacote: msgs estimadas (curta, média, pesada), custo OpenAI estimado, lucro, margem, markup
- [ ] Botão editar (inline ou modal) → `PUT /api/admin/packages/[id]`
- [ ] Botão criar novo pacote → `POST /api/admin/packages`
- [ ] Botão ativar/desativar → `PUT /api/admin/packages/[id]` com `{ active: boolean }`
- [ ] Pacote desativado não aparece na página `/credits` do aluno

**Test:** Criar pacote "Ultra" (2000 créditos, R$299,90) → aparece na tabela e em `/credits`. Desativar → não aparece em `/credits`. Reativar → aparece novamente.

---

### AC5: Stress test com cotação simulada

- [ ] Seção "Stress Test" com campo editável "Cotação USD/BRL" (apenas para simulação — não salva no banco)
- [ ] Mostra impacto na margem de cada pacote se o dólar mudar
- [ ] Mostra custo real por perfil de mensagem com a cotação simulada

**Test:** Informar cotação 6.50 → margem de cada pacote recalcula com custo OpenAI em R$ baseado nessa cotação.

---

### AC6: Alterações refletem imediatamente

- [ ] Após salvar config via PUT, `invalidatePricingConfigCache()` é chamada
- [ ] Próxima mensagem do chat usa novos valores (sem esperar TTL de 60s)
- [ ] Transações passadas mantêm snapshot da config vigente (campos `creditsPerMInput`, `creditsPerMOutput` no CreditTransaction)

**Test:** Salvar nova config → enviar mensagem imediatamente → CreditTransaction registra novos valores no snapshot.

---

### AC7: Snapshot garante auditoria retroativa

- [ ] CreditTransactions existentes mantêm seus valores de snapshot
- [ ] Novas transações usam config atualizada
- [ ] Admin pode comparar snapshots históricos com config atual

**Test:** Verificar que transações antigas têm snapshot com valores antigos enquanto novas têm valores novos.

---

### AC8: Apenas role ADMIN acessa

- [ ] Todas as rotas `/api/admin/pricing*` e `/api/admin/packages*` verificam `role: ADMIN` server-side
- [ ] Página `/admin/pricing` verifica `role: ADMIN` no Server Component → redirect `/chat` se não autorizado
- [ ] Retorna 403 para usuários não-admin

**Test:** Acessar `/admin/pricing` com role USER → redirect para `/chat`. `PUT /api/admin/pricing` com role USER → 403.

---

### AC9: Visual dark/solar consistente

- [ ] Dark theme com paleta solar (âmbar/dourado)
- [ ] Shadcn/UI + Tailwind
- [ ] Responsivo
- [ ] Loading states ao salvar
- [ ] Toast de confirmação após salvar

**Test:** Visual consistente com `/admin` existente. Funciona em mobile.

---

### AC10: Sem regressão no admin console existente

- [ ] `/admin` continua funcionando normalmente
- [ ] Métricas de usuários, uso e financeiras inalteradas
- [ ] Adição manual de créditos inalterada

**Test:** Abrir `/admin` → todas as métricas carregam. Adicionar créditos manualmente → funciona.

---

## Scope

**IN:**
- API routes: GET/PUT `/api/admin/pricing`, GET/POST `/api/admin/packages`, PUT `/api/admin/packages/[id]`
- Página `/admin/pricing` (Server + Client Components)
- Simulador em tempo real com perfis de mensagem
- Calculadora custom de tokens → créditos
- Edição de constantes de precificação com confirmação
- CRUD de pacotes de créditos
- Stress test com cotação simulada
- Seção de modelo explicativo (fórmulas)
- Invalidação de cache ao salvar

**OUT:**
- Gráficos ou charts (números e tabelas são suficientes)
- Histórico de alterações de pricing (log de auditoria)
- Bulk edit de pacotes
- A/B testing de precificação
- Integração com métricas financeiras do admin console (Story P.3)

---

## Dependencies

| Dependency | Story | Status |
|---|---|---|
| Tabela `pricing_config` no banco | P.1 | Blocked (prerequisite) |
| Tabela `credit_packages` no banco | P.1 | Blocked (prerequisite) |
| `getPricingConfig()` com cache e invalidação | P.1 | Blocked (prerequisite) |
| Middleware admin e `role: ADMIN` | 4.1 | Done |
| Layout e theme dark/solar | 1.4 | Done |

**Blocks:** Nenhum (paralelo com Story P.3).

---

## Subtasks

### Subtask 1 — API routes admin

**Arquivos novos:**
- `apps/web/src/app/api/admin/pricing/route.ts`
- `apps/web/src/app/api/admin/packages/route.ts`
- `apps/web/src/app/api/admin/packages/[id]/route.ts`

**GET /api/admin/pricing:**
```typescript
import { auth } from '@/auth'
import { prisma } from '@sol/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [configRows, packages] = await Promise.all([
    prisma.pricingConfig.findMany(),
    prisma.creditPackage.findMany({ orderBy: { credits: 'asc' } }),
  ])

  const config = Object.fromEntries(configRows.map(r => [r.key, r.value]))

  return NextResponse.json({
    config: {
      creditsPerMInput: config['CREDITS_PER_M_INPUT'] ?? 500,
      creditsPerMOutput: config['CREDITS_PER_M_OUTPUT'] ?? 2000,
      maxOutputTokens: config['MAX_OUTPUT_TOKENS'] ?? 8192,
    },
    packages,
  })
}
```

**PUT /api/admin/pricing:**
```typescript
import { z } from 'zod'
import { invalidatePricingConfigCache } from '@/lib/pricing'

const schema = z.object({
  creditsPerMInput: z.number().int().positive().optional(),
  creditsPerMOutput: z.number().int().positive().optional(),
  maxOutputTokens: z.number().int().positive().optional(),
})

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const updates: Record<string, number> = {}
  if (parsed.data.creditsPerMInput != null) updates['CREDITS_PER_M_INPUT'] = parsed.data.creditsPerMInput
  if (parsed.data.creditsPerMOutput != null) updates['CREDITS_PER_M_OUTPUT'] = parsed.data.creditsPerMOutput
  if (parsed.data.maxOutputTokens != null) updates['MAX_OUTPUT_TOKENS'] = parsed.data.maxOutputTokens

  await prisma.$transaction(
    Object.entries(updates).map(([key, value]) =>
      prisma.pricingConfig.upsert({
        where: { key },
        update: { value, updatedBy: session.user!.email! },
        create: { key, value, updatedBy: session.user!.email! },
      })
    )
  )

  invalidatePricingConfigCache()

  return NextResponse.json({ success: true })
}
```

**POST /api/admin/packages:**
```typescript
const packageSchema = z.object({
  name: z.string().min(1).max(50),
  credits: z.number().int().positive(),
  priceInCents: z.number().int().positive(),
})

export async function POST(req: NextRequest) {
  // auth + role check...
  const parsed = packageSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const pkg = await prisma.creditPackage.create({ data: parsed.data })
  return NextResponse.json({ package: pkg }, { status: 201 })
}
```

**PUT /api/admin/packages/[id]:**
```typescript
const updateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  credits: z.number().int().positive().optional(),
  priceInCents: z.number().int().positive().optional(),
  active: z.boolean().optional(),
})

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  // auth + role check...
  const parsed = updateSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const pkg = await prisma.creditPackage.update({
    where: { id: params.id },
    data: parsed.data,
  })
  return NextResponse.json({ package: pkg })
}
```

**Todas as rotas:** Verificação `role: ADMIN` server-side. Validação Zod. Ao atualizar pricing config: `invalidatePricingConfigCache()`.

---

### Subtask 2 — Página /admin/pricing com Simulador

**Arquivo:** `apps/web/src/app/admin/pricing/page.tsx` (NOVO — Server Component)
**Componentes Client:** `apps/web/src/components/admin/pricing/` (NOVOS)

A página é dividida em 6 seções:

**Seção 1: Configuração Atual**
```
┌─────────────────────────────────────────────────┐
│ Configuração de Precificação                     │
├─────────────────────────────────────────────────┤
│ CREDITS_PER_M_INPUT    [ 500  ]                 │
│ CREDITS_PER_M_OUTPUT   [ 2000 ]                 │
│ MAX_OUTPUT_TOKENS      [ 8192 ]                 │
│                                                  │
│ [Salvar configuração]                            │
└─────────────────────────────────────────────────┘
```
- Campos editáveis inline com validação (inteiros positivos)
- Botão "Salvar" com dialog de confirmação
- Ao salvar: PUT /api/admin/pricing → toast de sucesso

**Seção 2: Custo por Perfil de Mensagem**
```
┌──────────────────────────────────────────────────────────────────────┐
│ Custo por Perfil de Mensagem                                         │
├──────────┬──────────┬──────────┬──────────┬────────┬────────────────┤
│ Perfil   │ Input    │ Output   │ Créditos │ USD    │ BRL            │
├──────────┼──────────┼──────────┼──────────┼────────┼────────────────┤
│ Curta    │ 800      │ 400      │ 2        │ $0.003 │ R$ 0,02        │
│ Média    │ 2000     │ 1500     │ 4        │ $0.013 │ R$ 0,08        │
│ Longa    │ 3500     │ 4000     │ 10       │ $0.034 │ R$ 0,20        │
│ Pesada   │ 8000     │ 6000     │ 16       │ $0.054 │ R$ 0,32        │
│ Pipeline │ 12000    │ 8000     │ 22       │ $0.076 │ R$ 0,46        │
├──────────┼──────────┼──────────┼──────────┼────────┼────────────────┤
│ Média    │          │          │ ~11      │        │                │
│ Faixa    │          │          │ 2–22     │        │                │
└──────────┴──────────┴──────────┴──────────┴────────┴────────────────┘
```
- Atualiza em tempo real conforme admin altera constantes (usa valores do formulário, não salvos)
- Custo OpenAI baseado em pricing da API (input: $2.50/1M, output: $10.00/1M para GPT-4o)
- BRL calculado com cotação do stress test (se informada)

**Seção 3: Calculadora Custom**
```
┌──────────────────────────────────────────────────┐
│ Calculadora Custom                                │
├──────────────────────────────────────────────────┤
│ Tokens de input:  [ 5000 ]                       │
│ Tokens de output: [ 3000 ]                       │
│                                                   │
│ Créditos: 9                                       │
│ Fórmula: ceil((5000/1M × 500) + (3000/1M × 2000))│
└──────────────────────────────────────────────────┘
```

**Seção 4: Pacotes**
```
┌────────────────────────────────────────────────────────────────────────────┐
│ Pacotes de Créditos                                                        │
├──────────┬──────────┬──────────┬────────┬──────────┬──────────┬───────────┤
│ Nome     │ Créditos │ Preço    │ Status │ Msgs est.│ Margem   │ Ações     │
├──────────┼──────────┼──────────┼────────┼──────────┼──────────┼───────────┤
│ Starter  │ 100      │ R$29,90  │ Ativo  │ ~25-50   │ 85%      │ [✏️][🔴] │
│ Pro      │ 500      │ R$99,90  │ Ativo  │ ~125-250 │ 90%      │ [✏️][🔴] │
│ Max      │ 1200     │ R$199,90 │ Ativo  │ ~300-600 │ 92%      │ [✏️][🔴] │
├──────────┴──────────┴──────────┴────────┴──────────┴──────────┴───────────┤
│ [+ Criar Novo Pacote]                                                      │
└────────────────────────────────────────────────────────────────────────────┘
```
- Msgs estimadas: faixa baseada em perfil curta (max msgs) a pesada (min msgs)
- Margem calculada: (receita - custo OpenAI estimado) / receita × 100
- Editar abre modal/inline com campos: nome, créditos, preço
- Ativar/desativar toggle

**Seção 5: Stress Test**
```
┌──────────────────────────────────────────────────┐
│ Stress Test — Câmbio                              │
├──────────────────────────────────────────────────┤
│ Cotação USD/BRL: [ 6.00 ]                        │
│                                                   │
│ Impacto por pacote:                               │
│ Starter: margem 82% (era 85%)                    │
│ Pro: margem 87% (era 90%)                        │
│ Max: margem 89% (era 92%)                        │
│                                                   │
│ ⚠️ NÃO salva no banco — apenas simulação         │
└──────────────────────────────────────────────────┘
```

**Seção 6: Modelo Explicativo**
```
┌──────────────────────────────────────────────────┐
│ Como funciona o modelo                            │
├──────────────────────────────────────────────────┤
│ Compra: credits += pacote.credits                │
│ Consumo: credits -= ceil((in/1M × rate_in) +     │
│                         (out/1M × rate_out))     │
│ Min: 1 crédito por mensagem                      │
│                                                   │
│ O câmbio afeta a margem do operador, não o aluno.│
│ Ajuste CREDITS_PER_M_* para compensar variações. │
└──────────────────────────────────────────────────┘
```

**Implementação:** A página Server Component carrega dados iniciais. Toda a interatividade (edição, simulação, calculadora) em Client Components que usam `useState` para preview em tempo real sem salvar.

---

### Subtask 3 — UI consistente

- Dark theme com paleta solar (âmbar/dourado) — consistente com `/admin`
- Shadcn/UI components: Input, Button, Dialog, Table, Card, Badge, Toast
- Responsivo: tabelas com scroll horizontal em mobile
- Loading states: spinner no botão ao salvar config/pacote
- Toast via `sonner` (ou componente existente): sucesso e erro
- Confirmação obrigatória antes de salvar pricing config
- Seções colapsáveis para mobile

---

### Subtask 4 — Testes

**Testes de API:**
- `GET /api/admin/pricing` retorna config e pacotes (200 para admin, 403 para user)
- `PUT /api/admin/pricing` atualiza valores e invalida cache (200 para admin, 403 para user, 400 para input inválido)
- `POST /api/admin/packages` cria pacote (201 para admin, 403 para user, 400 para input inválido)
- `PUT /api/admin/packages/[id]` edita pacote (200 para admin, 403 para user)
- Pacote desativado não aparece em `/credits` do aluno

**Testes de integração:**
- Alterar config → cache invalidado → próxima mensagem usa nova config
- Criar pacote → aparece em `/credits`
- Desativar pacote → não aparece em `/credits`

**Testes de UI:**
- Simulador atualiza em tempo real ao alterar constantes
- Calculadora calcula corretamente
- Dialog de confirmação aparece ao salvar
- Toast exibido após save

**Testes de não-regressão:**
- `/admin` existente funciona normalmente
- Chat com dedução de créditos funciona
- Webhook Stripe funciona

---

## File List

| File | Action | Description |
|---|---|---|
| `apps/web/src/app/api/admin/pricing/route.ts` | CREATE | GET (retorna config + pacotes) e PUT (atualiza config + invalida cache) |
| `apps/web/src/app/api/admin/packages/route.ts` | CREATE | GET (lista pacotes) e POST (cria pacote) |
| `apps/web/src/app/api/admin/packages/[id]/route.ts` | CREATE | PUT (edita pacote, ativar/desativar) |
| `apps/web/src/app/admin/pricing/page.tsx` | CREATE | Server Component — carrega dados iniciais |
| `apps/web/src/components/admin/pricing/PricingConfigForm.tsx` | CREATE | Client Component — edição de constantes com confirmação |
| `apps/web/src/components/admin/pricing/MessageProfileSimulator.tsx` | CREATE | Client Component — tabela de perfis com cálculo em tempo real |
| `apps/web/src/components/admin/pricing/CustomCalculator.tsx` | CREATE | Client Component — calculadora de tokens → créditos |
| `apps/web/src/components/admin/pricing/PackagesTable.tsx` | CREATE | Client Component — CRUD de pacotes |
| `apps/web/src/components/admin/pricing/StressTest.tsx` | CREATE | Client Component — simulação de câmbio |
| `apps/web/src/components/admin/pricing/PricingExplainer.tsx` | CREATE | Seção explicativa das fórmulas |
| `apps/web/src/app/admin/page.tsx` | UPDATE | Adicionar link para /admin/pricing |

---

## Risks

| Risk | Mitigation |
|---|---|
| Simulador pode ficar lento com muitos cálculos em tempo real | Usar `useMemo` para cálculos derivados. Debounce em inputs se necessário |
| Admin pode salvar valores incorretos (ex: CREDITS_PER_M_OUTPUT = 0) | Validação Zod: inteiros positivos. Dialog de confirmação |
| Cache invalidation pode não funcionar em deploy multi-instance | No MVP, single instance (VPS). Se escalar, usar Redis pub/sub para invalidação |
| Cotação do stress test pode confundir admin (não é salva) | Label claro: "NÃO salva no banco — apenas simulação" |
| Muitos Client Components podem aumentar bundle size | Code splitting automático do Next.js. Lazy load de seções secundárias |

---

## Definition of Done

- [ ] API routes GET/PUT pricing e CRUD packages implementadas e protegidas
- [ ] Página `/admin/pricing` renderiza com dados do banco
- [ ] Simulador de perfis atualiza em tempo real
- [ ] Calculadora custom funciona
- [ ] Edição de constantes com confirmação e toast
- [ ] CRUD de pacotes funcional
- [ ] Stress test com cotação simulada
- [ ] Cache invalidado ao salvar config
- [ ] Apenas role ADMIN acessa
- [ ] Visual dark/solar consistente
- [ ] `pnpm typecheck` passa
- [ ] `pnpm build` passa
- [ ] Sem regressão em: admin console, chat, webhook, auth
