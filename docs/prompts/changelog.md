# SOL Prompt Architecture — Changelog

> Este arquivo registra todas as alteracoes na arquitetura de prompts do SOL.
> Referencia de arquitetura: [prompt-strategy.md](./prompt-strategy.md)

---

## v10.0 — 2026-03-04

**Prompt architecture created.**

### Adicionado
- Arquitetura de 3 camadas documentada em `prompt-strategy.md`
- Base System Prompt v2 documentado em `base-system-prompt.md` (extraido e expandido a partir de `apps/web/src/lib/prompts.ts`)
- Market Classification Prompt documentado em `classification-prompt.md`
- 5 modulos de Consciousness Level (Schwartz): unaware, problem, solution, product, aware
- 3 modulos de Sophistication Level: low (1-2), mid (3), high (4-5)
- 4 modulos de Combination: ad-modeled, ad-scratch, organic-modeled, organic-scratch
- 8 Proprietary Patterns: socratic-method, confrontation-structure, cta-third-party, scene-direction, scarcity-yielded, anti-patterns, first-frame, strategic-pyramid
- 4 Output Formats: script-ad, script-organic, script-modeled, script-scratch
- Este changelog

### Notas
- Modulos contextuais (Layer 2) e patterns (Layer 3) criados como placeholders — conteudo a ser escrito por Eden Corporate
- Base System Prompt v1 (em producao) permanece em `apps/web/src/lib/prompts.ts`
- Classificacao usa Claude Haiku; geracao usa Claude Sonnet
