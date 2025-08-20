# MailTrendz Backend Starter - Ultra Simples
Write-Host "🚀 MailTrendz Backend Starter" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

# Etapa 1: Matar processos na porta 8000
Write-Host "🔥 Limpando porta 8000..." -ForegroundColor Red

try {
    $connections = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
    if ($connections) {
        $processIds = $connections | Select-Object -ExpandProperty OwningProcess | Sort-Object | Get-Unique
        foreach ($processId in $processIds) {
            taskkill /PID $processId /F | Out-Null
        }
        Write-Host "✅ Porta liberada!" -ForegroundColor Green
    } else {
        Write-Host "✅ Porta já livre!" -ForegroundColor Green
    }
}
catch {
    $netstatOutput = netstat -ano | findstr ":8000"
    if ($netstatOutput) {
        $netstatOutput -split "`n" | ForEach-Object {
            if ($_ -match '(\d+)$') {
                taskkill /PID $matches[1] /F 2>$null | Out-Null
            }
        }
        Write-Host "✅ Porta liberada!" -ForegroundColor Green
    }
}

# Etapa 2: Verificar se está no diretório correto
if (!(Test-Path "package.json")) {
    Write-Host "❌ package.json não encontrado!" -ForegroundColor Red
    Write-Host "🔍 Certifique-se de estar no diretório do backend" -ForegroundColor Yellow
    exit 1
}

# Etapa 3: Iniciar servidor
Write-Host "🚀 Iniciando servidor..." -ForegroundColor Cyan
npm run dev