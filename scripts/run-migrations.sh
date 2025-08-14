#!/bin/bash

# Script para executar migrations no Supabase
# Certifique-se de ter o Supabase CLI instalado: https://supabase.com/docs/guides/cli

echo "🚀 Iniciando execução das migrations do MailTrendz..."

# Verifica se as variáveis de ambiente estão definidas
if [ -z "$SUPABASE_PROJECT_ID" ]; then
    echo "❌ Erro: SUPABASE_PROJECT_ID não definido"
    echo "Execute: export SUPABASE_PROJECT_ID=kuhlihvgocoxscouzmeg"
    exit 1
fi

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "❌ Erro: SUPABASE_ACCESS_TOKEN não definido"
    echo "Obtenha seu token em: https://app.supabase.com/account/tokens"
    exit 1
fi

# Executa as migrations
echo "📄 Executando migration 001_initial_setup.sql..."
supabase db push --db-url "postgresql://postgres:QySe2ZBsnUB60yNB@db.kuhlihvgocoxscouzmeg.supabase.co:5432/postgres" < src/database/migrations/001_initial_setup.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration 001 executada com sucesso!"
else
    echo "❌ Erro ao executar migration 001"
    exit 1
fi

echo "📄 Executando migration 002_rls_policies.sql..."
supabase db push --db-url "postgresql://postgres:QySe2ZBsnUB60yNB@db.kuhlihvgocoxscouzmeg.supabase.co:5432/postgres" < src/database/migrations/002_rls_policies.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration 002 executada com sucesso!"
else
    echo "❌ Erro ao executar migration 002"
    exit 1
fi

echo "📄 Executando seed 001_initial_data.sql..."
supabase db push --db-url "postgresql://postgres:QySe2ZBsnUB60yNB@db.kuhlihvgocoxscouzmeg.supabase.co:5432/postgres" < src/database/seeds/001_initial_data.sql

if [ $? -eq 0 ]; then
    echo "✅ Seed executado com sucesso!"
else
    echo "❌ Erro ao executar seed"
    exit 1
fi

echo "🎉 Todas as migrations foram executadas com sucesso!"
echo "📝 Próximos passos:"
echo "   1. Atualize o arquivo .env com as credenciais do Supabase"
echo "   2. Execute: npm run dev"
echo "   3. Teste a API em http://localhost:8000"