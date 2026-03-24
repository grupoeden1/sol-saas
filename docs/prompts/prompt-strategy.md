# SOL Prompt Strategy — Arquitetura de 3 Camadas

> Versão: 10.0
> Última atualização: 2026-03-04
> Autor: Eden Corporate

---

## Visão Geral

O SOL utiliza uma arquitetura de prompts em **3 camadas** que permite gerar scripts de criativos altamente contextualizados para cada aluno. Em vez de um único prompt monolítico, o sistema monta dinamicamente a instrução final a partir de módulos independentes, selecionados com base na classificação do mercado do aluno.

```
┌─────────────────────────────────────────────────────┐
│                  PROMPT FINAL (runtime)              │
│                                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │  Layer 1: Base System Prompt                  │  │
│  │  (identidade, tom, princípios)                │  │
│  └───────────────────────────────────────────────┘  │
│                        +                             │
│  ┌───────────────────────────────────────────────┐  │
│  │  Layer 2: Contextual Modules                  │  │
│  │  - Consciousness Level (1-5)                  │  │
│  │  - Sophistication Level (1-5)                 │  │
│  │  - Combination Module (AD/ORG × MOD/SCRATCH)  │  │
│  └───────────────────────────────────────────────┘  │
│                        +                             │
│  ┌───────────────────────────────────────────────┐  │
│  │  Layer 3: Proprietary Patterns                │  │
│  │  (técnicas, CTAs, direção de cena)            │  │
│  └───────────────────────────────────────────────┘  │
│                        +                             │
│  ┌───────────────────────────────────────────────┐  │
│  │  Contexto do Aluno + Análise de Vídeo         │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## Layer 1: Base System Prompt

**Arquivo de referência:** `apps/web/src/lib/prompts.ts` → `SYSTEM_PROMPT`
**Documentação completa:** [`base-system-prompt.md`](./base-system-prompt.md)

O Base System Prompt define:

- **Identidade dual:** especialista em viralização + copywriting direto
- **Tom híbrido:** mentor experiente + diretor de cena
- **7 categorias de conteúdo:** Venda Direta, Autoridade/Educação, Opinião/Posicionamento, Bastidores/Vulnerabilidade, Comunidade/Pertencimento, Storytelling/Narrativa, Ponte (pessoal→nicho)
- **10 princípios contextuais** que guiam toda geração
- **Regras de produção/edição** para scripts práticos
- **Formato obrigatório de saída** (estrutura de roteiro)

Este prompt é **sempre incluído** em toda requisição. Ele é o alicerce sobre o qual os módulos contextuais são montados.

---

## Layer 2: Contextual Modules

Os módulos contextuais são selecionados automaticamente pelo **Prompt Engine** com base na classificação retornada pelo **Market Classifier**.

### 2.1 Consciousness Level (Níveis de Consciência — Schwartz)

Baseado nos 5 níveis de consciência de Eugene Schwartz:

| Nível | Arquivo | Descrição |
|-------|---------|-----------|
| 1 - Unaware | [`modules/consciousness-unaware.md`](./modules/consciousness-unaware.md) | O público não sabe que tem um problema |
| 2 - Problem-Aware | [`modules/consciousness-problem.md`](./modules/consciousness-problem.md) | Sabe que tem um problema, não conhece soluções |
| 3 - Solution-Aware | [`modules/consciousness-solution.md`](./modules/consciousness-solution.md) | Conhece soluções, não conhece o produto |
| 4 - Product-Aware | [`modules/consciousness-product.md`](./modules/consciousness-product.md) | Conhece o produto, ainda não comprou |
| 5 - Most Aware | [`modules/consciousness-aware.md`](./modules/consciousness-aware.md) | Conhece o produto e está pronto para comprar |

Cada módulo contém instruções específicas sobre:
- Tipo de hook a usar
- Nível de explicação necessário
- Quanto contexto fornecer sobre o problema/solução
- Tom e velocidade do script

### 2.2 Sophistication Level (Nível de Sofisticação)

Mede o quanto o mercado já foi exposto a ofertas similares:

| Nível | Arquivo | Descrição |
|-------|---------|-----------|
| 1-2 (Low) | [`modules/sophistication-low.md`](./modules/sophistication-low.md) | Mercado virgem, promessas diretas funcionam |
| 3 (Mid) | [`modules/sophistication-mid.md`](./modules/sophistication-mid.md) | Mercado aquecido, precisa de diferenciação |
| 4-5 (High) | [`modules/sophistication-high.md`](./modules/sophistication-high.md) | Mercado saturado, requer mecanismos únicos e storytelling |

### 2.3 Combination Modules (AD/ORGANIC × MODELED/FROM_SCRATCH)

Define a abordagem com base no tipo de conteúdo e método de criação:

| Combinação | Arquivo | Caso de Uso |
|------------|---------|-------------|
| AD + MODELED | [`modules/combination-ad-modeled.md`](./modules/combination-ad-modeled.md) | Anúncio pago baseado em referência existente |
| AD + FROM_SCRATCH | [`modules/combination-ad-scratch.md`](./modules/combination-ad-scratch.md) | Anúncio pago criado do zero |
| ORGANIC + MODELED | [`modules/combination-organic-modeled.md`](./modules/combination-organic-modeled.md) | Conteúdo orgânico baseado em referência |
| ORGANIC + FROM_SCRATCH | [`modules/combination-organic-scratch.md`](./modules/combination-organic-scratch.md) | Conteúdo orgânico criado do zero |

---

## Layer 3: Proprietary Patterns

Técnicas proprietárias da Eden Corporate que são injetadas no prompt conforme o contexto:

| Pattern | Arquivo | Quando Usar |
|---------|---------|-------------|
| Método Socrático | [`patterns/socratic-method.md`](./patterns/socratic-method.md) | Consciousness 1-2, para guiar o público a uma conclusão |
| Estrutura de Confrontação | [`patterns/confrontation-structure.md`](./patterns/confrontation-structure.md) | Opinião/Posicionamento, Sophistication 3+ |
| CTA Third-Party | [`patterns/cta-third-party.md`](./patterns/cta-third-party.md) | Todos os scripts — técnica de CTA indireto |
| Direção de Cena | [`patterns/scene-direction.md`](./patterns/scene-direction.md) | Todos os scripts — instruções visuais e de filmagem |
| Escassez Cedida | [`patterns/scarcity-yielded.md`](./patterns/scarcity-yielded.md) | Venda Direta, Consciousness 4-5 |
| Anti-Patterns | [`patterns/anti-patterns.md`](./patterns/anti-patterns.md) | Referência negativa — o que NÃO fazer |
| Primeiro Frame | [`patterns/first-frame.md`](./patterns/first-frame.md) | Todos os scripts — técnica de hook visual |
| Pirâmide Estratégica | [`patterns/strategic-pyramid.md`](./patterns/strategic-pyramid.md) | Planejamento de conteúdo macro |

---

## Como os Módulos São Selecionados

### Passo 1: Market Classifier (Claude Haiku)

Antes de gerar qualquer script, o sistema executa o **Market Classifier** — um prompt leve que roda no Claude Haiku para classificar o mercado do aluno.

**Prompt de classificação:** [`classification-prompt.md`](./classification-prompt.md)

**Input:** Informações do aluno (nicho, produto, público-alvo, referências)

**Output (JSON):**
```json
{
  "consciousness_level": 3,
  "sophistication_level": 4,
  "persona_summary": "Mulheres 25-40 que já tentaram dietas...",
  "creative_angles": ["...", "...", "..."],
  "recommended_categories": ["Storytelling/Narrativa", "Autoridade/Educação", "Ponte"],
  "recommended_formats": ["VSL curto", "Reels educativo", "Carrossel"]
}
```

### Passo 2: Prompt Engine Selects Modules

Com base na classificação, o Prompt Engine:

1. Carrega o **Base System Prompt** (sempre)
2. Seleciona o módulo de **Consciousness** correspondente ao nível retornado
3. Seleciona o módulo de **Sophistication** correspondente à faixa retornada
4. Seleciona o módulo de **Combination** com base no tipo de conteúdo (AD/ORGANIC) e método (MODELED/FROM_SCRATCH)
5. Injeta **Patterns** relevantes com base nas categorias recomendadas
6. Anexa o **contexto do aluno** (dados do formulário, briefing)
7. Anexa a **análise de vídeo** (se o aluno forneceu vídeo de referência)

### Passo 3: Assembly & Generation (Claude Sonnet)

O prompt final montado é enviado ao Claude Sonnet para geração do script.

```
PROMPT FINAL =
  base_system_prompt
  + consciousness_module
  + sophistication_module
  + combination_module
  + selected_patterns[]
  + student_context
  + video_analysis (opcional)
  + output_format_instructions
```

---

## Montagem em Runtime

```typescript
// Pseudocódigo da montagem
async function assemblePrompt(studentInput: StudentInput): Promise<string> {
  // 1. Classificar mercado (Haiku — rápido e barato)
  const classification = await classifyMarket(studentInput);

  // 2. Carregar módulos
  const base = loadModule('base-system-prompt');
  const consciousness = loadModule(`consciousness-${classification.consciousness_level}`);
  const sophistication = loadModule(`sophistication-${getSophisticationBand(classification.sophistication_level)}`);
  const combination = loadModule(`combination-${studentInput.type}-${studentInput.method}`);

  // 3. Selecionar patterns
  const patterns = selectPatterns(classification, studentInput);

  // 4. Montar contexto do aluno
  const context = buildStudentContext(studentInput, classification);

  // 5. Selecionar formato de saída
  const outputFormat = loadOutputFormat(studentInput.type, studentInput.method);

  // 6. Montar prompt final
  return [base, consciousness, sophistication, combination, ...patterns, context, outputFormat].join('\n\n---\n\n');
}
```

---

## Formato Obrigatório de Saída

Todos os scripts gerados devem seguir a estrutura documentada em:

- [`output-formats/script-ad.md`](./output-formats/script-ad.md) — Scripts para anúncios pagos
- [`output-formats/script-organic.md`](./output-formats/script-organic.md) — Scripts para conteúdo orgânico
- [`output-formats/script-modeled.md`](./output-formats/script-modeled.md) — Scripts modelados a partir de referência
- [`output-formats/script-scratch.md`](./output-formats/script-scratch.md) — Scripts criados do zero

A estrutura mínima inclui:
1. **Hook** (primeiros 3 segundos)
2. **Corpo** (desenvolvimento com técnica aplicada)
3. **CTA** (chamada para ação)
4. **Direção de cena** (instruções de filmagem/edição)

---

## Referências

- Base System Prompt atual: `apps/web/src/lib/prompts.ts`
- Changelog de versões: [`changelog.md`](./changelog.md)
- Eugene Schwartz — *Breakthrough Advertising* (níveis de consciência)
- Eden Corporate — Metodologia Space (patterns proprietários)
