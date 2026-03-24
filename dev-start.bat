@echo off
echo ========================================
echo   SOL SaaS - Ambiente de Desenvolvimento
echo ========================================
echo.

:: 1. Docker (PostgreSQL)
echo [1/3] Iniciando Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
echo       Aguardando container sol-postgres...
:wait_docker
docker ps >nul 2>&1
if errorlevel 1 (
    timeout /t 3 /nobreak >nul
    goto wait_docker
)
docker start sol-postgres >nul 2>&1
echo       PostgreSQL OK!
echo.

:: 2. Stripe CLI (webhook listener)
echo [2/3] Iniciando Stripe CLI (webhooks)...
start "Stripe CLI" cmd /k "stripe listen --forward-to http://localhost:3000/api/webhooks/stripe"
echo       Stripe CLI rodando em janela separada.
echo.

:: 3. Dev server
echo [3/3] Iniciando dev server...
cd /d "%~dp0"
start "SOL Dev Server" cmd /k "pnpm dev"
echo       Dev server rodando em janela separada.
echo.

echo ========================================
echo   Tudo pronto! Acesse:
echo   Local:  http://localhost:3000
echo   Rede:   http://192.168.0.228:3000
echo ========================================
echo.
echo   Pressione qualquer tecla para fechar esta janela.
pause >nul
