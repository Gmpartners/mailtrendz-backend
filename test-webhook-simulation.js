const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

// Simular um evento de subscription real da Stripe
function createTestEvent() {
  return {
    id: 'evt_test_' + Date.now(),
    object: 'event',
    api_version: '2022-11-15',
    created: Math.floor(Date.now() / 1000),
    type: 'customer.subscription.created',
    livemode: false,
    request: {
      id: null,
      idempotency_key: null
    },
    data: {
      object: {
        id: 'sub_test_' + Date.now(),
        object: 'subscription',
        status: 'active',
        customer: 'cus_test_customer',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 2592000, // +30 dias
        items: {
          object: 'list',
          data: [{
            id: 'si_test',
            price: {
              id: 'price_1RvjVWLIDpwN7e9Fr4Mnt9LI', // Unlimited Monthly do seu backend
              object: 'price',
              unit_amount: 3600
            }
          }]
        },
        metadata: {
          user_id: '9d8b1331-c611-4914-a8d3-449083d84b59' // Seu user ID
        }
      }
    }
  };
}

async function testWebhookSimulation() {
  console.log('🧪 Simulando webhook da Stripe...');
  
  const testEvent = createTestEvent();
  const payload = JSON.stringify(testEvent);
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  console.log('Event Type:', testEvent.type);
  console.log('Subscription ID:', testEvent.data.object.id);
  console.log('Price ID:', testEvent.data.object.items.data[0].price.id);
  console.log('User ID:', testEvent.data.object.metadata.user_id);
  
  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET não encontrado no .env');
    return;
  }
  
  try {
    // Gerar assinatura válida da Stripe
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(timestamp + '.' + payload, 'utf8')
      .digest('hex');
    
    const stripeSignature = `t=${timestamp},v1=${signature}`;
    
    console.log('\n📡 Enviando webhook simulado...');
    console.log('URL:', 'http://localhost:8000/api/v1/webhooks/stripe');
    console.log('Signature:', stripeSignature.substring(0, 30) + '...');
    
    const response = await axios.post('http://localhost:8000/api/v1/webhooks/stripe', payload, {
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': stripeSignature,
        'User-Agent': 'Stripe/1.0 (+https://stripe.com/docs/webhooks)'
      },
      timeout: 10000
    });
    
    console.log('✅ Webhook processado com sucesso!');
    console.log('Status:', response.status);
    console.log('Response:', response.data);
    
  } catch (error) {
    console.error('❌ Webhook falhou:');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      console.error('Request error:', error.message);
    } else {
      console.error('Setup error:', error.message);
    }
  }
}

async function testInvalidSignature() {
  console.log('\n🔒 Testando assinatura inválida...');
  
  const testEvent = createTestEvent();
  const payload = JSON.stringify(testEvent);
  
  try {
    const response = await axios.post('http://localhost:8000/api/v1/webhooks/stripe', payload, {
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': 't=123456,v1=invalid_signature'
      },
      timeout: 5000,
      validateStatus: () => true
    });
    
    console.log('Status:', response.status);
    console.log('Response:', response.data);
    
    if (response.status === 400 || response.status === 401) {
      console.log('✅ Validação de assinatura funcionando corretamente');
    } else {
      console.log('⚠️ Validação de assinatura pode ter problemas');
    }
    
  } catch (error) {
    console.error('❌ Erro testando assinatura inválida:', error.message);
  }
}

// Executar testes
async function runTests() {
  await testWebhookSimulation();
  await testInvalidSignature();
  
  console.log('\n🏁 Testes de webhook finalizados');
  process.exit(0);
}

runTests().catch(error => {
  console.error('\n💥 Erro inesperado:', error);
  process.exit(1);
});