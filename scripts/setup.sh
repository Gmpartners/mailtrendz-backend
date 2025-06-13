#!/bin/bash

# ✅ SCRIPT DE SETUP COMPLETO - MAILTRENDZ
# Configura todo o ambiente de desenvolvimento

set -e  # Parar em caso de erro

echo "🚀 MailTrendz - Setup Completo do Ambiente"
echo "=========================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para logging
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script na raiz do projeto MailTrendz"
    exit 1
fi

echo -e "${BLUE}"
echo "   __  __       _ _ _____                    _     "
echo "  |  \/  |     (_) |_   _|                  | |    "
echo "  | .  . | __ _ _| | | |_ __ ___ _ __   __| |____"
echo "  | |\/| |/ _\` | | | | | '__/ _ \ '_ \ / _\` |_  /"
echo "  | |  | | (_| | | | | | | |  __/ | | | (_| |/ / "
echo "  \_|  |_/\__,_|_|_| \_/_|  \___|_| |_|\__,_/___|"
echo "                                                  "
echo -e "${NC}"

# 1. Verificar dependências do sistema
log "Verificando dependências do sistema..."

# Node.js
if ! command -v node &> /dev/null; then
    error "Node.js não encontrado. Instale Node.js 18+ primeiro."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2)
log "Node.js versão: $NODE_VERSION"

# Python
if ! command -v python3 &> /dev/null; then
    error "Python 3 não encontrado. Instale Python 3.11+ primeiro."
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
log "Python versão: $PYTHON_VERSION"

# Docker (opcional)
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
    log "Docker versão: $DOCKER_VERSION"
else
    warn "Docker não encontrado. Docker é opcional mas recomendado."
fi

# 2. Configurar arquivos de ambiente
log "Configurando arquivos de ambiente..."

if [ ! -f ".env" ]; then
    log "Criando arquivo .env a partir do .env.example..."
    cp .env.example .env
    
    # Gerar JWT secrets aleatórios
    JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_urlsafe(32))")
    REFRESH_SECRET=$(openssl rand -base64 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_urlsafe(32))")
    
    # Substituir valores no .env
    sed -i.bak "s/seu_jwt_secret_super_secreto_aqui_2024/$JWT_SECRET/" .env
    sed -i.bak "s/seu_refresh_token_secret_aqui_2024/$REFRESH_SECRET/" .env
    rm -f .env.bak
    
    log "Arquivo .env criado com secrets gerados automaticamente"
    warn "IMPORTANTE: Configure suas chaves de API no arquivo .env"
else
    log "Arquivo .env já existe"
fi

# 3. Instalar dependências Node.js
log "Instalando dependências Node.js..."
npm install

# 4. Configurar Python AI Service
log "Configurando Python AI Service..."

cd src/ai-service

# Criar ambiente virtual Python se não existir
if [ ! -d "venv" ]; then
    log "Criando ambiente virtual Python..."
    python3 -m venv venv
fi

# Ativar ambiente virtual
log "Ativando ambiente virtual Python..."
source venv/bin/activate

# Instalar dependências Python
log "Instalando dependências Python..."
pip install --upgrade pip
pip install -r requirements.txt

# Voltar para diretório raiz
cd ../..

# 5. Verificar MongoDB
log "Verificando MongoDB..."

if command -v mongod &> /dev/null; then
    log "MongoDB encontrado no sistema"
elif command -v docker &> /dev/null; then
    log "MongoDB será executado via Docker"
else
    warn "MongoDB não encontrado. Você pode:"
    echo "  1. Instalar MongoDB localmente"
    echo "  2. Usar Docker para executar MongoDB"
    echo "  3. Usar MongoDB Atlas (cloud)"
fi

# 6. Criar diretórios necessários
log "Criando diretórios necessários..."
mkdir -p logs
mkdir -p src/ai-service/logs
mkdir -p uploads

# 7. Compilar TypeScript
log "Compilando TypeScript..."
npm run build

# 8. Executar validações
log "Executando validações..."
if [ -f "scripts/validate-setup.js" ]; then
    node scripts/validate-setup.js
fi

# 9. Informações finais
echo ""
echo -e "${GREEN}✅ Setup concluído com sucesso!${NC}"
echo ""
echo -e "${BLUE}Próximos passos:${NC}"
echo "1. Configure suas chaves de API no arquivo .env:"
echo "   - OPENROUTER_API_KEY (para IA)"
echo "   - MONGODB_URL (se usando MongoDB remoto)"
echo ""
echo "2. Inicie os serviços:"
echo "   ${YELLOW}Opção A - Docker (recomendado):${NC}"
echo "   docker-compose up -d"
echo ""
echo "   ${YELLOW}Opção B - Manual:${NC}"
echo "   # Terminal 1 - MongoDB (se local)"
echo "   mongod"
echo ""
echo "   # Terminal 2 - Python AI Service"
echo "   cd src/ai-service && source venv/bin/activate && python app.py"
echo ""
echo "   # Terminal 3 - Node.js API"
echo "   npm run dev"
echo ""
echo "3. Acesse a aplicação:"
echo "   - API Node.js: http://localhost:8000"
echo "   - Python AI Service: http://localhost:5000"
echo "   - Documentação: http://localhost:8000/docs"
echo ""
echo -e "${GREEN}🎉 MailTrendz está pronto para desenvolvimento!${NC}"
