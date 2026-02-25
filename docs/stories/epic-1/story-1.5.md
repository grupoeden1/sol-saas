# User Story: CI/CD Pipeline & Documentation

**ID:** 1.5
**Epic:** 1 - Foundation & Auth
**Status:** DRAFT

## Statement

As a developer, I want the CI/CD pipeline and project documentation to be complete and updated, so that the project is maintainable and ready for collaborative development.

## Context

O projeto foi inicializado e refatorado para usar `pnpm` e `PostgreSQL 17`. A infraestrutura de CI anteriormente configurada (`ci.yml`) ainda faz referência a `npm` e `Postgres 16`, o que causará falhas no pipeline. Além disso, o `README.md` precisa refletir o workflow real de instalação.

## Acceptance Criteria

1. **CI/CD Alignment:** `.github/workflows/ci.yml` atualizado para usar `pnpm` (via `pnpm/action-setup`) e `postgres:17-alpine`.
2. **Pipeline Stability:** Os jobs `lint`, `typecheck` e `build` devem estar configurados para rodar via `turbo`.
3. **Test Env Readiness:** Segredos de build (`DATABASE_URL`, `NEXTAUTH_SECRET`) devem estar devidamente mockados ou passados como envs no pipeline para evitar quebras no Next.js build.
4. **Documentation Setup:** `README.md` contém os passos exatos:
   - Clone do repositório.
   - Criação do `.env` a partir do `.env.example`.
   - Geração do `NEXTAUTH_SECRET`.
   - `docker compose up -d`.
   - `pnpm install`.
   - `pnpm db:migrate`.
5. **Quality Gate:** Nenhum erro de lint ou tipagem remanescente no monorepo.

## Technical Notes

- Usar `pnpm install` em vez de `npm ci` no pipeline.
- Considerar o uso de `turbo-cache` futuramente para acelerar o CI.
- O campo `packageManager` no `package.json` já foi adicionado e deve ser respeitado pelo CI.
