# 🚀 CHECKLIST DE DEPLOYMENT - MAILTRENDZ

## ✅ ANTES DO DEPLOYMENT

### 1. Preparação do Ambiente
- [ ] Backend funcionando localmente na porta 8000
- [ ] Frontend funcionando e conectando ao backend
- [ ] Todas as traduções funcionando corretamente
- [ ] Testes básicos passando

### 2. Configuração do Stripe
- [ ] Chaves de produção configuradas (`sk_live_...`)
- [ ] Webhook configurado no Dashboard do Stripe
- [ ] Preços de produção criados
- [ ] Método de pagamento de teste removido

### 3. Banco de Dados
- [ ] Migrações aplicadas no Supabase de produção
- [ ] RLS (Row Level Security) configurado
- [ ] Dados de teste removidos ou sanitizados
- [ ] Backup do banco de dados feito

## 🌐 CONFIGURAÇÃO DE PRODUÇÃO

### 1. Variáveis de Ambiente
```bash
# Stripe Produção
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# API URLs
BACKEND_URL_PROD=https://api.mailtrendz.com
FRONTEND_URL_PROD=https://app.mailtrendz.com

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# OpenRouter IA
OPENROUTER_API_KEY=...

# Outros
NODE_ENV=production
PORT=8000
```

### 2. Configuração do Webhook no Stripe

#### Dashboard URL: https://dashboard.stripe.com/webhooks

**Endpoint URL:**
```
https://api.mailtrendz.com/api/v1/webhooks/stripe
```

**Eventos para selecionar:**
- [x] `checkout.session.completed`
- [x] `customer.subscription.created`
- [x] `customer.subscription.updated`
- [x] `customer.subscription.deleted`
- [x] `invoice.payment_succeeded` ⚡ **CRÍTICO**
- [x] `invoice.payment_failed` ⚡ **CRÍTICO**
- [x] `invoice.upcoming`
- [x] `customer.subscription.trial_will_end`

**Após criar:**
1. Copiar o "Signing secret" (whsec_...)
2. Configurar STRIPE_WEBHOOK_SECRET
3. Testar com: `stripe trigger invoice.payment_succeeded`

## 🔧 DEPLOYMENT STEPS

### 1. Deploy do Backend
```bash
# Build
npm run build

# Deploy (exemplo para diferentes plataformas)

# Heroku
git push heroku main

# Railway
railway up

# Render
# Configure via dashboard

# VPS
pm2 start dist/server.js --name "mailtrendz-api"
```

### 2. Deploy do Frontend
```bash
# Build com URL de produção
VITE_API_URL=https://api.mailtrendz.com npm run build

# Deploy
# Netlify / Vercel / outro serviço
```

### 3. Configuração DNS
```
api.mailtrendz.com → Backend
app.mailtrendz.com → Frontend
```

### 4. Configuração HTTPS
- [ ] Certificados SSL configurados
- [ ] Redirecionamento HTTP → HTTPS
- [ ] CORS configurado para domínios de produção

## ✅ VERIFICAÇÕES PÓS-DEPLOYMENT

### 1. Testes Básicos
```bash
# Health check geral
curl https://api.mailtrendz.com/health

# Health check do webhook
curl https://api.mailtrendz.com/api/v1/webhooks/health

# Teste de autenticação
curl -X POST https://api.mailtrendz.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### 2. Testes de Stripe
```bash
# No dashboard do Stripe, ir em Webhooks > Tentativas
# Verificar se webhook está sendo entregue

# Teste de renovação (cuidado - cobrará de verdade!)
stripe trigger invoice.payment_succeeded --api-key sk_live_...
```

### 3. Monitoramento

#### Logs para monitorar:
```bash
# Webhooks
tail -f logs/combined.log | grep webhook

# Renovações
tail -f logs/combined.log | grep "Credits renewed"

# Erros
tail -f logs/error.log
```

#### Alertas para configurar:
- [ ] Webhook com mais de 5 falhas consecutivas
- [ ] Assinaturas expirando sem renovação
- [ ] Erros 5xx no backend
- [ ] Tempo de resposta > 2s

## 🚨 ROLLBACK PLAN

### Se algo der errado:

1. **Webhook não funcionando:**
   ```bash
   # Voltar para chaves de teste temporariamente
   # Configurar webhook local com ngrok
   ```

2. **Backend com problemas:**
   ```bash
   # Deploy da versão anterior
   git revert HEAD
   git push heroku main
   ```

3. **Banco de dados corrompido:**
   ```bash
   # Restaurar do backup
   # Aplicar migrações manualmente
   ```

## 📊 MONITORAMENTO CONTÍNUO

### 1. Métricas Importantes
- Taxa de sucesso dos webhooks (>95%)
- Tempo de resposta da API (<2s)
- Renovações automáticas funcionando
- Sem erros críticos nos logs

### 2. Dashboards
- Stripe Dashboard: Assinaturas e webhooks
- Supabase Dashboard: Performance do banco
- Logs da aplicação: Erros e atividade

### 3. Testes Regulares
- **Diário**: Health checks automáticos
- **Semanal**: Teste de renovação com conta de teste
- **Mensal**: Auditoria completa do sistema

## 🎯 SCRIPTS DE MANUTENÇÃO

```bash
# Sincronizar dados do Stripe (rodar se necessário)
npm run fix-subscription

# Verificar saúde dos webhooks
npm run test-webhooks

# Backup do banco de dados
# (configurar cronjob)
```

## ✅ CHECKLIST FINAL

- [ ] Webhook configurado e testado
- [ ] Chaves de produção ativas
- [ ] SSL funcionando
- [ ] DNS apontando corretamente
- [ ] Monitoring configurado
- [ ] Backup strategy implementada
- [ ] Documentação atualizada
- [ ] Equipe treinada sobre o sistema

---

**🚀 PRONTO PARA PRODUÇÃO!**

> **Nota importante:** Teste sempre em ambiente de staging primeiro. 
> Mantenha as chaves de teste ativas até ter certeza que produção está funcionando perfeitamente.