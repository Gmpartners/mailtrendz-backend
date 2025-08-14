# Guia Completo: Stripe CLI e Webhooks para Desenvolvimento

## 🚀 Instalação do Stripe CLI

### Windows
```bash
# Via Chocolatey (recomendado)
choco install stripe-cli

# Via Scoop
scoop install stripe

# Via Download direto
# Baixe de: https://github.com/stripe/stripe-cli/releases
```

### macOS
```bash
# Via Homebrew
brew install stripe/stripe-cli/stripe
```

### Linux
```bash
# Via snap
sudo snap install stripe

# Via download direto
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_linux_x86_64.tar.gz
tar -xvf stripe_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin
```

## 🔑 Configuração Inicial

### 1. Login no Stripe CLI
```bash
stripe login
# Siga as instruções para autorizar o CLI
```

### 2. Verificar Configuração
```bash
stripe config --list
```

## 🔄 Configuração de Webhooks Locais

### 1. Iniciar Listener de Webhooks
```bash
# Para desenvolvimento local (porta 8000)
stripe listen --forward-to localhost:8000/api/v1/webhooks/stripe

# Com eventos específicos
stripe listen --events invoice.payment_succeeded,invoice.payment_failed,customer.subscription.updated --forward-to localhost:8000/api/v1/webhooks/stripe

# Com filtros avançados
stripe listen \
  --events invoice.payment_succeeded,invoice.payment_failed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,checkout.session.completed \
  --forward-to localhost:8000/api/v1/webhooks/stripe
```

### 2. Obter Webhook Secret
```bash
# O comando listen mostra o webhook secret
# Exemplo de saída:
# > Ready! Your webhook signing secret is whsec_1234567890abcdef...
# Copie este valor para sua variável STRIPE_WEBHOOK_SECRET no .env
```

### 3. Configurar Variáveis de Ambiente
```bash
# No arquivo .env
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdef...
```

## 🧪 Comandos de Teste

### 1. Simular Eventos de Pagamento
```bash
# Pagamento bem-sucedido
stripe trigger invoice.payment_succeeded

# Pagamento falhado
stripe trigger invoice.payment_failed

# Nova assinatura
stripe trigger customer.subscription.created

# Assinatura atualizada
stripe trigger customer.subscription.updated

# Checkout concluído
stripe trigger checkout.session.completed
```

### 2. Simular com Dados Específicos
```bash
# Criar invoice e simular pagamento
stripe invoices create --customer cus_123456 --auto-advance
stripe trigger invoice.payment_succeeded --override invoice:in_123456

# Criar subscription e simular eventos
stripe subscriptions create --customer cus_123456 --price price_123456
stripe trigger customer.subscription.updated --override subscription:sub_123456
```

### 3. Testar com Produtos Reais
```bash
# Listar produtos
stripe products list

# Listar preços
stripe prices list

# Criar checkout session de teste
stripe checkout sessions create \
  --success-url="http://localhost:3000/success" \
  --cancel-url="http://localhost:3000/cancel" \
  --payment-method-types="card" \
  --line-items="[{\"price\":\"price_1234567890\",\"quantity\":1}]" \
  --mode="subscription"
```

## 📊 Monitoramento em Tempo Real

### 1. Logs de Webhooks
```bash
# Ver logs em tempo real
stripe logs tail

# Filtrar por tipo de evento
stripe logs tail --filter-event-type invoice.payment_succeeded

# Filtrar por account
stripe logs tail --filter-account acct_123456
```

### 2. Listar Webhooks Endpoints
```bash
stripe webhook_endpoints list
```

### 3. Testar Webhook Endpoint
```bash
stripe webhook_endpoints create \
  --url="https://seu-site.com/api/v1/webhooks/stripe" \
  --enabled-events="invoice.payment_succeeded,invoice.payment_failed"
```

## 🔧 Scripts de Automação

### 1. Script de Setup Completo
```bash
#!/bin/bash
# setup-stripe-dev.sh

echo "🚀 Configurando ambiente Stripe para desenvolvimento..."

# Verificar se CLI está instalado
if ! command -v stripe &> /dev/null; then
    echo "❌ Stripe CLI não encontrado. Instale primeiro!"
    exit 1
fi

# Login
echo "🔑 Fazendo login no Stripe..."
stripe login

# Iniciar listener
echo "👂 Iniciando listener de webhooks..."
stripe listen \
  --events invoice.payment_succeeded,invoice.payment_failed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,checkout.session.completed \
  --forward-to localhost:8000/api/v1/webhooks/stripe &

STRIPE_PID=$!
echo "✅ Listener iniciado com PID: $STRIPE_PID"

# Aguardar Ctrl+C
trap "kill $STRIPE_PID" INT
wait $STRIPE_PID
```

### 2. Script de Teste de Pagamentos
```bash
#!/bin/bash
# test-payments.sh

echo "🧪 Testando cenários de pagamento..."

# Teste 1: Pagamento bem-sucedido
echo "✅ Simulando pagamento bem-sucedido..."
stripe trigger invoice.payment_succeeded
sleep 2

# Teste 2: Pagamento falhado
echo "❌ Simulando pagamento falhado..."
stripe trigger invoice.payment_failed
sleep 2

# Teste 3: Nova assinatura
echo "🆕 Simulando nova assinatura..."
stripe trigger customer.subscription.created
sleep 2

# Teste 4: Assinatura cancelada
echo "🚫 Simulando cancelamento de assinatura..."
stripe trigger customer.subscription.deleted
sleep 2

echo "✅ Todos os testes executados!"
```

## 🌐 Configuração para Produção

### 1. Criar Webhook Endpoint
```bash
# Criar endpoint para produção
stripe webhook_endpoints create \
  --url="https://sua-api.com/api/v1/webhooks/stripe" \
  --enabled-events="invoice.payment_succeeded,invoice.payment_failed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,checkout.session.completed" \
  --description="MailTrendz Production Webhooks"
```

### 2. Configurar Retry Logic
```bash
# Configurar retry automático (via dashboard Stripe)
# 1. Acesse https://dashboard.stripe.com/webhooks
# 2. Selecione seu endpoint
# 3. Configure retry logic para 3 tentativas com delays crescentes
```

## 🔍 Debugging e Troubleshooting

### 1. Verificar Status do Webhook
```bash
# Listar últimos eventos
stripe events list --limit 10

# Detalhes de um evento específico
stripe events retrieve evt_123456789
```

### 2. Reenviar Eventos
```bash
# Reenviar evento específico
stripe events resend evt_123456789

# Reenviar para endpoint específico
stripe events resend evt_123456789 --webhook-endpoint we_123456789
```

### 3. Verificar Logs
```bash
# Ver logs do servidor local
tail -f logs/app.log | grep "webhook"

# Ver logs específicos do Stripe
stripe logs tail --filter-event-type invoice.payment_succeeded
```

## 🛡️ Segurança e Boas Práticas

### 1. Validação de Assinatura
- SEMPRE valide a assinatura do webhook
- Use STRIPE_WEBHOOK_SECRET do ambiente correto
- Implemente timeout para requests de webhook

### 2. Idempotência
- Processe cada evento apenas uma vez
- Use event_id como chave de idempotência
- Mantenha registro de eventos processados

### 3. Rate Limiting
- Exclua webhook endpoints do rate limiting
- Configure timeouts apropriados
- Implemente circuit breaker para falhas consecutivas

## 📝 Checklist de Desenvolvimento

- [ ] Stripe CLI instalado e configurado
- [ ] Webhook listener rodando localmente
- [ ] STRIPE_WEBHOOK_SECRET configurado no .env
- [ ] Todos os event handlers implementados
- [ ] Testes de pagamento executados com sucesso
- [ ] Logs de webhook funcionando
- [ ] Validação de assinatura implementada
- [ ] Sistema de idempotência funcionando
- [ ] Rate limiting configurado corretamente
- [ ] Scripts de teste automatizados