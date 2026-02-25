#!/bin/bash

# Script de teste E2E para validar setup completo do projeto SOL
# Story 1.1 - Project Bootstrap & Infrastructure

set -e  # Exit on error

echo "🧪 Iniciando teste E2E do setup do projeto SOL..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

test_step() {
    echo -e "${YELLOW}▶ $1${NC}"
}

test_passed() {
    echo -e "${GREEN}✓ $1${NC}"
    ((TESTS_PASSED++))
}

test_failed() {
    echo -e "${RED}✗ $1${NC}"
    ((TESTS_FAILED++))
}

# 1. Verificar arquivos de configuração
test_step "1. Verificando arquivos de configuração..."

if [ -f "package.json" ] && [ -f "turbo.json" ] && [ -f ".gitignore" ]; then
    test_passed "Arquivos de configuração Turborepo existem"
else
    test_failed "Arquivos de configuração Turborepo ausentes"
fi

if [ -f "docker-compose.yml" ] && [ -f ".dockerignore" ]; then
    test_passed "Arquivos Docker existem"
else
    test_failed "Arquivos Docker ausentes"
fi

if [ -f ".env.example" ]; then
    test_passed "Arquivo .env.example existe"
else
    test_failed "Arquivo .env.example ausente"
fi

# 2. Verificar estrutura de pacotes
test_step "2. Verificando estrutura de pacotes..."

if [ -d "packages/db" ] && [ -f "packages/db/package.json" ]; then
    test_passed "Pacote packages/db existe"
else
    test_failed "Pacote packages/db ausente"
fi

if [ -f "packages/db/prisma/schema.prisma" ]; then
    test_passed "Schema Prisma existe"
else
    test_failed "Schema Prisma ausente"
fi

if [ -d "apps/web" ] && [ -f "apps/web/package.json" ]; then
    test_passed "Aplicação apps/web existe"
else
    test_failed "Aplicação apps/web ausente"
fi

# 3. Verificar configurações Next.js
test_step "3. Verificando configurações Next.js..."

if [ -f "apps/web/next.config.ts" ] && [ -f "apps/web/tsconfig.json" ]; then
    test_passed "Arquivos de configuração Next.js existem"
else
    test_failed "Arquivos de configuração Next.js ausentes"
fi

if [ -f "apps/web/tailwind.config.ts" ] && [ -f "apps/web/postcss.config.mjs" ]; then
    test_passed "Configuração Tailwind existe"
else
    test_failed "Configuração Tailwind ausente"
fi

# 4. Verificar páginas App Router
test_step "4. Verificando páginas App Router..."

if [ -f "apps/web/src/app/layout.tsx" ] && [ -f "apps/web/src/app/page.tsx" ]; then
    test_passed "Páginas App Router existem"
else
    test_failed "Páginas App Router ausentes"
fi

if [ -f "apps/web/src/app/globals.css" ]; then
    test_passed "Arquivo globals.css existe"
else
    test_failed "Arquivo globals.css ausente"
fi

# 5. Verificar CI/CD
test_step "5. Verificando CI/CD..."

if [ -f ".github/workflows/ci.yml" ]; then
    test_passed "Workflow GitHub Actions existe"
else
    test_failed "Workflow GitHub Actions ausente"
fi

# 6. Verificar README
test_step "6. Verificando documentação..."

if [ -f "README.md" ]; then
    test_passed "README.md existe"
else
    test_failed "README.md ausente"
fi

# 7. Verificar Docker (se Docker está disponível)
test_step "7. Verificando Docker..."

if command -v docker &> /dev/null; then
    if docker compose version &> /dev/null; then
        test_passed "Docker Compose está instalado"
    else
        test_failed "Docker Compose não está instalado"
    fi
else
    echo -e "${YELLOW}⚠ Docker não está instalado (skip)${NC}"
fi

# Resumo
echo ""
echo "========================================="
echo "📊 RESUMO DOS TESTES"
echo "========================================="
echo -e "${GREEN}Testes passados: $TESTS_PASSED${NC}"
echo -e "${RED}Testes falhados: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ Todos os testes passaram!${NC}"
    echo -e "${GREEN}🎉 Setup do projeto SOL está completo e correto!${NC}"
    exit 0
else
    echo -e "${RED}✗ Alguns testes falharam. Verifique a configuração.${NC}"
    exit 1
fi
