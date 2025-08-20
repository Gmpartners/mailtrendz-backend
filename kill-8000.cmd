@echo off
echo 🔥 Matando processos na porta 8000...

REM Encontrar e matar processos na porta 8000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000') do (
    echo 🎯 Matando PID: %%a
    taskkill /PID %%a /F >nul 2>&1
)

echo ✅ Porta 8000 liberada!
echo 🚀 Execute agora: npm run dev