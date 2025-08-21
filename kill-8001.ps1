# ====================================
# SCRIPT PARA MATAR PROCESSO NA PORTA 8001
# ====================================

Write-Host "=====================================" -ForegroundColor Yellow
Write-Host " MATANDO PROCESSO NA PORTA 8001" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Yellow

try {
    # Buscar processos usando a porta 8001
    $connections = Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue
    
    if ($connections) {
        foreach ($connection in $connections) {
            $pid = $connection.OwningProcess
            $processName = (Get-Process -Id $pid -ErrorAction SilentlyContinue).Name
            
            Write-Host "Encontrado processo: $processName (PID: $pid)" -ForegroundColor Cyan
            
            try {
                Stop-Process -Id $pid -Force
                Write-Host "[OK] Processo $pid ($processName) morto com sucesso" -ForegroundColor Green
            }
            catch {
                Write-Host "[ERRO] Falha ao matar processo $pid ($processName): $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    }
    else {
        Write-Host "[INFO] Nenhum processo encontrado usando a porta 8001" -ForegroundColor Blue
    }
    
    # Verificar se a porta ainda está em uso
    Start-Sleep -Seconds 1
    $remainingConnections = Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue
    
    if ($remainingConnections) {
        Write-Host "[WARNING] Porta 8001 ainda está em uso:" -ForegroundColor Yellow
        $remainingConnections | ForEach-Object {
            $pid = $_.OwningProcess
            $processName = (Get-Process -Id $pid -ErrorAction SilentlyContinue).Name
            Write-Host "  - $processName (PID: $pid)" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "[SUCCESS] Porta 8001 liberada!" -ForegroundColor Green
    }
}
catch {
    Write-Host "[ERRO] Erro ao executar script: $($_.Exception.Message)" -ForegroundColor Red
    
    # Fallback usando netstat
    Write-Host "Tentando método alternativo..." -ForegroundColor Yellow
    $netstatOutput = netstat -ano | Select-String ":8001"
    
    if ($netstatOutput) {
        foreach ($line in $netstatOutput) {
            $parts = $line -split '\s+'
            $pid = $parts[-1]
            
            if ($pid -ne "0") {
                Write-Host "Matando PID: $pid" -ForegroundColor Cyan
                try {
                    taskkill /PID $pid /F | Out-Null
                    Write-Host "[OK] PID $pid morto" -ForegroundColor Green
                }
                catch {
                    Write-Host "[ERRO] Falha ao matar PID $pid" -ForegroundColor Red
                }
            }
        }
    }
}

Write-Host "=====================================" -ForegroundColor Yellow
Read-Host "Pressione Enter para continuar"