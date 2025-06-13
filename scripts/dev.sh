#!/bin/bash

# ✅ SCRIPT DE DESENVOLVIMENTO - MAILTRENDZ
# Inicia todos os serviços necessários para desenvolvimento

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[DEV]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Banner
echo -e "${BLUE}"
echo "🚀 MailTrendz - Ambiente de Desenvolvimento"
echo "=========================================="
echo -e "${NC}"

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script na raiz do projeto MailTrendz"
    exit 1
fi

# Função para cleanup ao sair
cleanup() {
    echo ""
    log "Parando serviços..."
    
    # Parar processos em background
    jobs -p | xargs -r kill
    
    # Parar Docker se estiver rodando
    if command -v docker-compose &> /dev/null; then
        docker-compose down 2>/dev/null || true
    fi
    
    echo -e "${GREEN}👋 Serviços parados. Até logo!${NC}"
    exit 0
}

# Configurar trap para cleanup
trap cleanup SIGINT SIGTERM

# Verificar .env
if [ ! -f ".env" ]; then
    error "Arquivo .env não encontrado. Execute ./scripts/setup.sh primeiro."
    exit 1
fi

# Opções de execução
echo "Escolha como executar os serviços:"
echo "1) Docker Compose (recomendado - tudo automatizado)"
echo "2) Manual (cada serviço separadamente)"
echo "3) Híbrido (MongoDB via Docker, serviços manual)"

read -p "Opção (1-3): " choice

case $choice in
    1)
        # Docker Compose
        log "Iniciando com Docker Compose..."
        
        if ! command -v docker-compose &> /dev/null; then
            error "Docker Compose não encontrado. Instale Docker primeiro."
            exit 1
        fi
        
        # Verificar se já está rodando
        if docker-compose ps | grep -q "Up"; then
            warn "Alguns serviços já estão rodando. Reiniciando..."
            docker-compose down
        fi
        
        # Iniciar serviços
        log "Iniciando MongoDB..."
        docker-compose up -d mongodb
        
        log "Aguardando MongoDB inicializar..."
        sleep 10
        
        log "Iniciando Python AI Service..."
        docker-compose up -d python-ai
        
        log "Aguardando Python AI Service..."
        sleep 15
        
        log "Iniciando Node.js API..."
        docker-compose up -d nodejs-api
        
        log "Todos os serviços iniciados!"
        
        # Mostrar logs em tempo real
        echo ""
        log "Exibindo logs em tempo real (Ctrl+C para parar):"
        docker-compose logs -f
        ;;
        
    2)
        # Manual
        log "Iniciando serviços manualmente..."
        
        # Verificar dependências
        if ! command -v mongod &> /dev/null; then
            error "MongoDB não encontrado. Instale MongoDB ou use opção Docker."
            exit 1
        fi
        
        if [ ! -d "src/ai-service/venv" ]; then
            error "Ambiente virtual Python não encontrado. Execute ./scripts/setup.sh primeiro."
            exit 1
        fi
        
        # Iniciar MongoDB
        log "Iniciando MongoDB..."
        mongod --dbpath ./data/db --logpath ./logs/mongodb.log --fork 2>/dev/null || {
            # Se falhar, tentar sem especificar dbpath
            mongod --fork --logpath ./logs/mongodb.log 2>/dev/null || {
                warn "Falha ao iniciar MongoDB. Certifique-se de que não há outra instância rodando."
            }
        }
        
        sleep 5
        
        # Iniciar Python AI Service
        log "Iniciando Python AI Service..."
        cd src/ai-service
        source venv/bin/activate
        python app.py &
        PYTHON_PID=$!
        cd ../..
        
        sleep 10
        
        # Iniciar Node.js API
        log "Iniciando Node.js API..."
        npm run dev &
        NODE_PID=$!
        
        log "Todos os serviços iniciados!"
        
        # Aguardar
        wait
        ;;
        
    3)
        # Híbrido
        log "Iniciando modo híbrido..."
        
        # MongoDB via Docker
        log "Iniciando MongoDB via Docker..."
        docker-compose up -d mongodb
        sleep 10
        
        # Python AI Service manual
        log "Iniciando Python AI Service..."
        cd src/ai-service
        if [ ! -d "venv" ]; then
            error "Ambiente virtual Python não encontrado. Execute ./scripts/setup.sh primeiro."
            exit 1
        fi
        source venv/bin/activate
        python app.py &
        PYTHON_PID=$!
        cd ../..
        
        sleep 10
        
        # Node.js API manual
        log "Iniciando Node.js API..."
        npm run dev &
        NODE_PID=$!
        
        log "Serviços iniciados (MongoDB=Docker, AI+API=Manual)!"
        
        # Aguardar
        wait
        ;;
        
    *)
        error "Opção inválida"
        exit 1
        ;;
esac

# Status dos serviços
echo ""
log "Verificando status dos serviços..."

# Função para verificar serviço
check_service() {
    local url=$1
    local name=$2
    
    if curl -s "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $name: OK${NC}"
    else
        echo -e "${RED}❌ $name: FALHA${NC}"
    fi
}

sleep 5

check_service "http://localhost:5000/health" "Python AI Service"
check_service "http://localhost:8000/api/v1/health" "Node.js API"

# URLs úteis
echo ""
echo -e "${BLUE}🔗 URLs Úteis:${NC}"
echo "📱 API Node.js: http://localhost:8000"
echo "🐍 Python AI Service: http://localhost:5000"
echo "📚 Documentação API: http://localhost:8000/docs"
echo "🧠 Python AI Docs: http://localhost:5000/docs"
echo "🔍 Health Check Node.js: http://localhost:8000/api/v1/health"
echo "🔍 Health Check Python: http://localhost:5000/health"

# Comandos úteis
echo ""
echo -e "${BLUE}📋 Comandos Úteis:${NC}"
echo "🧪 Testar Python AI: curl http://localhost:5000/health"
echo "🧪 Testar Node.js API: curl http://localhost:8000/api/v1/health"
echo "📊 Ver logs Python: tail -f src/ai-service/logs/*.log"
echo "📊 Ver logs Node.js: tail -f logs/*.log"

if [ "$choice" == "1" ]; then
    echo "🐳 Ver logs Docker: docker-compose logs -f"
    echo "🐳 Parar Docker: docker-compose down"
fi

echo ""
log "Ambiente de desenvolvimento pronto! Pressione Ctrl+C para parar todos os serviços."

# Manter script rodando
if [ "$choice" != "1" ]; then
    wait
fi
