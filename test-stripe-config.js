const Stripe = require('stripe');
require('dotenv').config();

// Usar a mesma chave do seu .env
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

async function checkStripeConfig() {
  console.log('🔍 Verificando configuração da Stripe...');
  console.log('Stripe Key:', process.env.STRIPE_SECRET_KEY?.substring(0, 12) + '...');
  console.log('Webhook Secret:', process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 12) + '...');
  
  try {
    // Teste 1: Verificar se conseguimos nos conectar à Stripe
    console.log('\n1️⃣ Testando conexão com Stripe API...');
    const account = await stripe.accounts.retrieve();
    console.log('✅ Conectado à Stripe:', account.display_name || account.id);
    console.log('Mode:', account.livemode ? 'LIVE' : 'TEST');
    
  } catch (error) {
    console.error('❌ Erro conectando à Stripe:', error.message);
    return;
  }
  
  try {
    // Teste 2: Listar webhooks configurados
    console.log('\n2️⃣ Listando webhooks configurados...');
    const webhooks = await stripe.webhookEndpoints.list();
    
    if (webhooks.data.length === 0) {
      console.log('⚠️ Nenhum webhook configurado na Stripe');
    } else {
      console.log(`✅ Encontrados ${webhooks.data.length} webhook(s):`);
      webhooks.data.forEach((webhook, index) => {
        console.log(`  ${index + 1}. URL: ${webhook.url}`);
        console.log(`     Status: ${webhook.status}`);
        console.log(`     Events: ${webhook.enabled_events.join(', ')}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Erro listando webhooks:', error.message);
  }
  
  try {
    // Teste 3: Verificar últimos eventos
    console.log('\n3️⃣ Verificando últimos 5 eventos da Stripe...');
    const events = await stripe.events.list({ limit: 5 });
    
    if (events.data.length === 0) {
      console.log('⚠️ Nenhum evento recente encontrado');
    } else {
      console.log(`✅ Últimos ${events.data.length} eventos:`);
      events.data.forEach((event, index) => {
        console.log(`  ${index + 1}. ${event.type} (${new Date(event.created * 1000).toLocaleString()})`);
        console.log(`     ID: ${event.id}`);
        if (event.type.includes('subscription')) {
          console.log(`     Object ID: ${event.data.object.id || 'N/A'}`);
          console.log(`     Customer: ${event.data.object.customer || 'N/A'}`);
        }
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Erro listando eventos:', error.message);
  }
  
  try {
    // Teste 4: Verificar customers recentes
    console.log('\n4️⃣ Verificando customers recentes...');
    const customers = await stripe.customers.list({ limit: 3 });
    
    if (customers.data.length === 0) {
      console.log('⚠️ Nenhum customer encontrado');
    } else {
      console.log(`✅ Últimos ${customers.data.length} customers:`);
      customers.data.forEach((customer, index) => {
        console.log(`  ${index + 1}. ${customer.email || 'No email'} (${customer.id})`);
        console.log(`     Created: ${new Date(customer.created * 1000).toLocaleString()}`);
        console.log(`     Metadata: ${JSON.stringify(customer.metadata)}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Erro listando customers:', error.message);
  }
}

// Executar verificação
checkStripeConfig().then(() => {
  console.log('\n🏁 Verificação da Stripe finalizada');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 Erro inesperado:', error);
  process.exit(1);
});