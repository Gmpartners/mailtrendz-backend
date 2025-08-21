@echo off
echo ====================================
echo  MATANDO PROCESSO NA PORTA 8001
echo ====================================

REM Buscar processo usando a porta 8001
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8001') do (
    if not "%%a"=="0" (
        echo Encontrado PID: %%a
        echo Matando processo %%a...
        taskkill /PID %%a /F >nul 2>&1
        if errorlevel 1 (
            echo [ERRO] Falha ao matar processo %%a
        ) else (
            echo [OK] Processo %%a morto com sucesso
        )
    )
)

REM Verificar se a porta ainda está em uso
netstat -ano | findstr :8001 >nul
if errorlevel 1 (
    echo [SUCCESS] Porta 8001 liberada!
) else (
    echo [WARNING] Porta 8001 ainda está em uso
    echo Processos restantes:
    netstat -ano | findstr :8001
)

echo ====================================
pause