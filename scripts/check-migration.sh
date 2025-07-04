#!/bin/bash

echo "🚀 MailTrendz Backend - Verificação pós-migração"
echo "================================================"

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Função para verificar arquivo
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2 - Arquivo não encontrado: $1${NC}"
    fi
}

# Função para verificar diretório
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2 - Diretório não encontrado: $1${NC}"
    fi
}

# Função para verificar se arquivo NÃO existe
check_removed() {
    if [ ! -f "$1" ]; then
        echo -e "${GREEN}✅ $2 removido${NC}"
    else
        echo -e "${RED}❌ $2 ainda existe: $1${NC}"
    fi
}

echo ""
echo "1. Verificando estrutura de diretórios..."
echo "-----------------------------------------"
check_dir "src/database" "Diretório database"
check_dir "src/database/migrations" "Diretório migrations"
check_dir "src/database/seeds" "Diretório seeds"
check_dir "src/services/supabase" "Diretório services/supabase"

echo ""
echo "2. Verificando arquivos de configuração..."
echo "------------------------------------------"
check_file "src/config/supabase.config.ts" "Configuração Supabase"
check_file ".env.example" "Arquivo .env.example"
check_removed "src/config/database.config.ts" "MongoDB config"

echo ""
echo "3. Verificando migrations SQL..."
echo "---------------------------------"
check_file "src/database/migrations/001_initial_setup.sql" "Initial setup"
check_file "src/database/migrations/002_rls_policies.sql" "RLS policies"
check_file "src/database/complete-setup.sql" "Complete setup"

echo ""
echo "4. Verificando services..."
echo "---------------------------"
check_file "src/services/auth.service.ts" "Auth service (refatorado)"
check_file "src/services/project.service.ts" "Project service (refatorado)"
check_file "src/services/chat.service.ts" "Chat service (refatorado)"
check_file "src/services/supabase/storage.service.ts" "Storage service"
check_file "src/services/supabase/realtime.service.ts" "Realtime service"

echo ""
echo "5. Verificando middleware..."
echo "-----------------------------"
check_file "src/middleware/auth.middleware.ts" "Auth middleware (refatorado)"
check_file "src/middleware/api-usage.middleware.ts" "API usage middleware"

echo ""
echo "6. Verificando controllers..."
echo "------------------------------"
check_file "src/controllers/auth.controller.ts" "Auth controller"
check_file "src/controllers/project.controller.ts" "Project controller"
check_file "src/controllers/chat.controller.ts" "Chat controller"
check_file "src/controllers/ai.controller.ts" "AI controller"
check_file "src/controllers/user.controller.ts" "User controller"

echo ""
echo "7. Verificando remoção de models MongoDB..."
echo "--------------------------------------------"
check_removed "src/models/User.model.ts" "User model"
check_removed "src/models/Project.model.ts" "Project model"
check_removed "src/models/Chat.model.ts" "Chat model"

echo ""
echo "8. Verificando arquivos de documentação..."
echo "------------------------------------------"
check_file "MIGRATION_SUPABASE.md" "Documentação da migração"
check_file "MIGRATION_COMPLETE.md" "Status da migração"

echo ""
echo "9. Verificando package.json..."
echo "-------------------------------"
if grep -q "@supabase/supabase-js" package.json; then
    echo -e "${GREEN}✅ @supabase/supabase-js instalado${NC}"
else
    echo -e "${RED}❌ @supabase/supabase-js não encontrado${NC}"
fi

if ! grep -q "mongoose" package.json; then
    echo -e "${GREEN}✅ mongoose removido${NC}"
else
    echo -e "${RED}❌ mongoose ainda presente${NC}"
fi

if ! grep -q "bcryptjs" package.json; then
    echo -e "${GREEN}✅ bcryptjs removido${NC}"
else
    echo -e "${RED}❌ bcryptjs ainda presente${NC}"
fi

echo ""
echo "10. Verificando variáveis de ambiente..."
echo "-----------------------------------------"
if [ -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Arquivo .env encontrado - verifique se contém:${NC}"
    echo "   - SUPABASE_URL"
    echo "   - SUPABASE_ANON_KEY"
    echo "   - SUPABASE_SERVICE_ROLE"
else
    echo -e "${RED}❌ Arquivo .env não encontrado${NC}"
    echo "   Execute: cp .env.example .env"
fi

echo ""
echo "================================================"
echo "📋 Próximos passos:"
echo ""
echo "1. Execute as migrations no Supabase Dashboard:"
echo "   https://supabase.com/dashboard/project/kuhlihvgocoxscouzmeg/sql"
echo ""
echo "2. Configure o arquivo .env com as credenciais"
echo ""
echo "3. Execute o servidor:"
echo "   npm run dev"
echo ""
echo "4. Teste os endpoints:"
echo "   curl http://localhost:8000/health"
echo ""
echo "================================================"