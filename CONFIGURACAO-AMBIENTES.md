# 🔧 Configuração de Ambientes - MailTrendz Backend

## 📋 Arquivos de Configuração

### 🔒 Segurança
- ✅ Arquivos `.env` foram removidos do controle de versão
- ✅ Use `.env.example` como referência
- ✅ Nunca commite arquivos `.env` com credenciais reais

### 🛠️ Configuração Local (Desenvolvimento)
1. Copie `.env.example` para `.env`
2. Configure as variáveis com suas credenciais
3. Execute: `npm run dev`
4. API disponível em: `http://localhost:8000`

### 🚀 Configuração Produção
1. Use `.env.production` como referência
2. Configure no servidor: `/var/www/mailtrendz/backend`
3. API disponível em: `http://206.189.234.162:8000`
4. Proxy Nginx: porta 80 → 8000

## 🔗 Variáveis Importantes

### 🔑 Obrigatórias
- `SUPABASE_URL` - URL do banco Supabase
- `SUPABASE_SERVICE_ROLE` - Chave de serviço Supabase
- `OPENROUTER_API_KEY` - Chave da API OpenRouter
- `JWT_SECRET` - Segredo JWT (mude em produção!)

### 🌐 URLs e CORS
- `FRONTEND_URL` - URL do frontend
- `ALLOWED_ORIGINS` - Domínios permitidos no CORS

### 💳 Stripe (Pagamentos)
- `STRIPE_SECRET_KEY` - Chave secreta Stripe
- `STRIPE_PRICE_*` - IDs dos preços configurados

## 📝 Notas Importantes

- Supabase é compartilhado entre dev/prod
- Stripe está em modo teste
- OpenRouter API é compartilhada
- Lembre-se de atualizar `ALLOWED_ORIGINS` quando fizer deploy do frontend
- JWT_SECRET deve ser alterado para produção!
