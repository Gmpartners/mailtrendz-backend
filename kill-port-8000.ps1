# Kill Port 8000 - Script Simples e Eficiente
Write-Host "🔥 Matando processos na porta 8000..." -ForegroundColor Red

try {
    # Método 1: Usar Get-NetTCPConnection (mais moderno)
    $connections = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
    
    if ($connections) {
        $processIds = $connections | Select-Object -ExpandProperty OwningProcess | Sort-Object | Get-Unique
        
        foreach ($processId in $processIds) {
            Write-Host "🎯 Matando PID: $processId" -ForegroundColor Yellow
            taskkill /PID $processId /F | Out-Null
        }
        
        Write-Host "✅ Porta 8000 liberada!" -ForegroundColor Green
    } else {
        Write-Host "✅ Porta 8000 já está livre!" -ForegroundColor Green
    }
}
catch {
    # Método 2: Fallback usando netstat (compatibilidade)
    Write-Host "⚡ Usando método alternativo..." -ForegroundColor Yellow
    
    $netstatOutput = netstat -ano | findstr ":8000"
    
    if ($netstatOutput) {
        # Extrair PIDs usando regex mais simples
        $netstatOutput -split "`n" | ForEach-Object {
            if ($_ -match '(\d+)$') {
                $processId = $matches[1]
                Write-Host "🎯 Matando PID: $processId" -ForegroundColor Yellow
                taskkill /PID $processId /F 2>$null | Out-Null
            }
        }
        Write-Host "✅ Porta 8000 liberada!" -ForegroundColor Green
    } else {
        Write-Host "✅ Porta 8000 já está livre!" -ForegroundColor Green
    }
}

Write-Host "🚀 Execute agora: npm run dev" -ForegroundColor Cyan