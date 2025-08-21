@echo off
if "%1"=="" (
    echo Uso: kill-port.cmd [PORTA]
    echo Exemplo: kill-port.cmd 8001
    pause
    exit /b 1
)

set PORT=%1
echo ====================================
echo  MATANDO PROCESSO NA PORTA %PORT%
echo ====================================

REM Buscar processo usando a porta especificada
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%PORT%') do (
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
netstat -ano | findstr :%PORT% >nul
if errorlevel 1 (
    echo [SUCCESS] Porta %PORT% liberada!
) else (
    echo [WARNING] Porta %PORT% ainda está em uso
    echo Processos restantes:
    netstat -ano | findstr :%PORT%
)

echo ====================================
pause