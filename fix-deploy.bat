@echo off
echo 🔧 MailTrendz - Aplicando correções de deploy...

REM Verificar se estamos no diretório correto
if not exist package.json (
    echo ❌ Execute este script no diretório raiz do backend
    pause
    exit /b 1
)

echo 📦 Instalando dependências...
call npm install

echo 🔍 Testando compilação TypeScript...
call npx tsc --noEmit

if %errorlevel% neq 0 (
    echo ❌ Erro na compilação TypeScript. Verifique os arquivos.
    pause
    exit /b 1
)

echo ✅ Compilação TypeScript bem-sucedida!

echo 🏗️ Buildando projeto...
call npm run build

if %errorlevel% neq 0 (
    echo ❌ Erro no build. Verifique os logs.
    pause
    exit /b 1
)

echo ✅ Build bem-sucedido!

echo 📤 Fazendo commit das correções...
git add .
git commit -m "🔧 Fix: Resolve all TypeScript compilation errors for production deploy

✅ Fixed Document interface conflicts in all models:
- Project.model.ts: Remove 'id' from Omit to avoid Document conflict
- Chat.model.backup.ts: Remove 'id' from Omit to avoid Document conflict
- Message.model.ts: Already fixed (kept for consistency)

✅ Fixed AI Service readonly array issues:
- Convert AI_MODELS.FALLBACKS readonly array to mutable
- Add proper OpenRouterResponse interface for type safety
- Replace timeout with AbortController for fetch requests
- Add null checks for API response properties

✅ Fixed Chat Service ObjectId/string type mismatches:
- Use ID_UTILS.toString() consistently for string conversion
- Use ID_UTILS.toObjectId() consistently for ObjectId conversion
- Fix project ID conversion in updateProject call

✅ Deployment ready:
- All TypeScript compilation errors resolved
- Type safety improved across services
- Render deployment should now succeed
- Frontend 401 errors should be resolved

Fixes: #typescript-compilation #render-deploy #401-unauthorized"

echo 🚀 Fazendo push para trigger deploy...
git push origin master

echo 🎉 Correções aplicadas com sucesso!
echo.
echo 📋 Próximos passos:
echo 1. Monitore o deploy no Render dashboard
echo 2. Verifique se não há mais erros TypeScript nos logs
echo 3. Teste o health check: curl https://mailtrendz-backend.onrender.com/api/v1/health
echo 4. Teste o frontend para ver se erro 401 foi resolvido
echo.
echo 🔗 Links importantes:
echo - Render Dashboard: https://dashboard.render.com
echo - Backend URL: https://mailtrendz-backend.onrender.com
echo - Health Check: https://mailtrendz-backend.onrender.com/api/v1/health

pause