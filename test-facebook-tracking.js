// Teste completo do sistema de Facebook Tracking - MailTrendz
// Execute: node test-facebook-tracking.js

const axios = require('axios');

const API_BASE = 'http://localhost:8001/api/v1';

async function testFacebookTracking() {
  console.log('🧪 Testando Sistema de Facebook Tracking...\n');

  // 1. Health Check
  console.log('1️⃣ Testando Health Check...');
  try {
    const response = await axios.get(`${API_BASE}/tracking/health`);
    console.log('✅ Health Check:', response.data);
  } catch (error) {
    console.log('❌ Health Check falhou:', error.response?.data || error.message);
  }

  console.log('\n');

  // 2. Teste de Evento Genérico - ViewContent sem value (deve funcionar)
  console.log('2️⃣ Testando Evento Genérico (ViewContent sem value)...');
  try {
    const response = await axios.post(`${API_BASE}/tracking/event`, {
      eventName: 'ViewContent',
      eventData: {
        userEmail: 'test@mailtrendz.com',
        contentType: 'page',
        contentName: 'test_page',
        sourceUrl: 'http://localhost:5173/test'
        // Note: No value field - ViewContent doesn't require value
      }
    });
    console.log('✅ Evento genérico:', response.data);
  } catch (error) {
    console.log('❌ Evento genérico falhou:', error.response?.data || error.message);
  }

  console.log('\n');

  // 2b. Teste de ViewContent com value = 0 (deve funcionar)
  console.log('2️⃣b Testando ViewContent com value = 0...');
  try {
    const response = await axios.post(`${API_BASE}/tracking/event`, {
      eventName: 'ViewContent',
      eventData: {
        userEmail: 'test@mailtrendz.com',
        contentType: 'page',
        contentName: 'test_page_with_value_zero',
        sourceUrl: 'http://localhost:5173/test',
        value: 0 // This should now work with the fix
      }
    });
    console.log('✅ ViewContent com value=0:', response.data);
  } catch (error) {
    console.log('❌ ViewContent com value=0 falhou:', error.response?.data || error.message);
  }

  console.log('\n');

  // 3. Teste de Registro
  console.log('3️⃣ Testando Track Registration...');
  try {
    const response = await axios.post(`${API_BASE}/tracking/registration`, {
      eventId: 'test_registration_' + Date.now(),
      method: 'email'
    });
    console.log('✅ Track Registration:', response.data);
  } catch (error) {
    console.log('❌ Track Registration falhou:', error.response?.data || error.message);
  }

  console.log('\n');

  // 4. Teste de Compra
  console.log('4️⃣ Testando Track Purchase...');
  try {
    const response = await axios.post(`${API_BASE}/tracking/purchase`, {
      eventId: 'test_purchase_' + Date.now(),
      orderId: 'order_test_' + Date.now(),
      value: 97.00,
      currency: 'BRL',
      productName: 'Pro Plan Monthly'
    });
    console.log('✅ Track Purchase:', response.data);
  } catch (error) {
    console.log('❌ Track Purchase falhou:', error.response?.data || error.message);
  }

  console.log('\n');

  // 5. Teste de Email Created
  console.log('5️⃣ Testando Track Email Created...');
  try {
    const response = await axios.post(`${API_BASE}/tracking/email-created`, {
      eventId: 'test_email_' + Date.now(),
      projectId: 'project_test_' + Date.now(),
      templateType: 'newsletter',
      aiGenerated: true
    });
    console.log('✅ Track Email Created:', response.data);
  } catch (error) {
    console.log('❌ Track Email Created falhou:', error.response?.data || error.message);
  }

  console.log('\n');

  // 6. Teste de Lead
  console.log('6️⃣ Testando Track Lead...');
  try {
    const response = await axios.post(`${API_BASE}/tracking/lead`, {
      eventId: 'test_lead_' + Date.now(),
      userEmail: 'lead@mailtrendz.com',
      leadType: 'contact_form'
    });
    console.log('✅ Track Lead:', response.data);
  } catch (error) {
    console.log('❌ Track Lead falhou:', error.response?.data || error.message);
  }

  console.log('\n');

  // 7. Teste de Trial Start
  console.log('7️⃣ Testando Track Trial Start...');
  try {
    const response = await axios.post(`${API_BASE}/tracking/trial-start`, {
      eventId: 'test_trial_' + Date.now(),
      trialType: 'free_trial'
    });
    console.log('✅ Track Trial Start:', response.data);
  } catch (error) {
    console.log('❌ Track Trial Start falhou:', error.response?.data || error.message);
  }

  console.log('\n');

  // 8. Teste de Subscription
  console.log('8️⃣ Testando Track Subscription...');
  try {
    const response = await axios.post(`${API_BASE}/tracking/subscription`, {
      eventId: 'test_subscription_' + Date.now(),
      subscriptionId: 'sub_test_' + Date.now(),
      planName: 'Pro Plan',
      value: 97.00,
      currency: 'BRL'
    });
    console.log('✅ Track Subscription:', response.data);
  } catch (error) {
    console.log('❌ Track Subscription falhou:', error.response?.data || error.message);
  }

  console.log('\n📊 Teste concluído!');
  console.log('\n🔍 Para verificar se os eventos chegaram ao Facebook:');
  console.log('1. Acesse: https://business.facebook.com/events_manager');
  console.log('2. Selecione seu Pixel: 24267804926180417');
  console.log('3. Vá em "Test Events"');
  console.log('4. Verifique se os eventos aparecem em tempo real');
}

// Executar teste
testFacebookTracking().catch(console.error);