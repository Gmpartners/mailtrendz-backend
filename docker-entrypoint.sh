#!/bin/sh

# MailTrendz Docker Entrypoint
# Inicializa Node.js Backend + Python AI Service

set -e

echo "🚀 Starting MailTrendz Restructured System..."

# Verificar variáveis de ambiente obrigatórias
required_vars="MONGODB_URL JWT_SECRET OPENROUTER_API_KEY"

for var in $required_vars; do
    if [ -z "$(eval echo \$$var)" ]; then
        echo "❌ Missing required environment variable: $var"
        exit 1
    fi
done

echo "✅ Environment variables validated"

# Aguardar MongoDB estar disponível
echo "🔄 Waiting for MongoDB..."
until mongosh "$MONGODB_URL" --eval "quit(db.runCommand({ ping: 1 }).ok ? 0 : 2)" --quiet; do
    echo "MongoDB is unavailable - sleeping"
    sleep 2
done
echo "✅ MongoDB is ready"

# Função para iniciar Python AI Service
start_python_ai() {
    echo "🐍 Starting Python AI Service..."
    cd /app/src/ai-service
    
    # Verificar dependências Python
    python3 -c "import fastapi, uvicorn, motor" 2>/dev/null || {
        echo "❌ Python dependencies missing"
        exit 1
    }
    
    # Iniciar serviço Python em background
    python3 app.py &
    PYTHON_PID=$!
    
    # Aguardar Python AI estar pronto
    echo "🔄 Waiting for Python AI Service..."
    for i in $(seq 1 30); do
        if curl -f http://localhost:5000/health >/dev/null 2>&1; then
            echo "✅ Python AI Service is ready"
            break
        fi
        if [ $i -eq 30 ]; then
            echo "❌ Python AI Service failed to start"
            exit 1
        fi
        sleep 2
    done
    
    cd /app
}

# Função para iniciar Node.js Backend
start_nodejs() {
    echo "🟢 Starting Node.js Backend..."
    
    # Executar migração se necessário
    if [ "$RUN_MIGRATION" = "true" ]; then
        echo "🔄 Running database migration..."
        node dist/scripts/migrate-to-conversations.js || echo "⚠️ Migration warning (may be already done)"
    fi
    
    # Validar sistema
    if [ "$VALIDATE_SYSTEM" = "true" ]; then
        echo "🔍 Validating system..."
        node dist/scripts/validate-system.js || echo "⚠️ Validation warnings detected"
    fi
    
    # Iniciar aplicação principal
    echo "🚀 Starting main application..."
    exec node dist/server.js
}

# Função de cleanup
cleanup() {
    echo "🛑 Shutting down services..."
    if [ ! -z "$PYTHON_PID" ]; then
        kill $PYTHON_PID 2>/dev/null || true
    fi
    exit 0
}

# Configurar trap para cleanup
trap cleanup TERM INT

# Iniciar serviços baseado no modo
case "${SERVICE_MODE:-full}" in
    "nodejs-only")
        echo "🟢 Starting Node.js only mode"
        start_nodejs
        ;;
    "python-only")
        echo "🐍 Starting Python AI only mode"
        start_python_ai
        wait $PYTHON_PID
        ;;
    "full"|*)
        echo "🔄 Starting full system (Node.js + Python AI)"
        
        # Iniciar Python AI Service primeiro
        start_python_ai
        
        # Aguardar um pouco
        sleep 2
        
        # Iniciar Node.js Backend
        start_nodejs &
        NODEJS_PID=$!
        
        # Aguardar ambos os processos
        wait $NODEJS_PID
        ;;
esac