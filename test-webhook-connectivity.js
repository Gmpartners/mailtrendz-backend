const axios = require('axios');

async function testWebhookEndpoint() {
  console.log('🔍 Testando conectividade do webhook endpoint...');
  
  try {
    // Teste 1: Verificar se endpoint existe
    console.log('\n1️⃣ Testando se endpoint /webhooks/stripe existe...');
    const response = await axios.post('http://localhost:8000/api/v1/webhooks/stripe', {}, {
      timeout: 5000,
      validateStatus: () => true // Aceitar qualquer status code
    });
    
    console.log('✅ Endpoint acessível');
    console.log('Status Code:', response.status);
    console.log('Response:', response.data);
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Backend não está rodando na porta 8000');
    } else if (error.code === 'ENOTFOUND') {
      console.error('❌ Não conseguiu resolver localhost:8000');
    } else {
      console.error('❌ Erro na conectividade:', error.message);
    }
  }
  
  // Teste 2: Verificar health endpoint
  try {
    console.log('\n2️⃣ Testando health endpoint...');
    const healthResponse = await axios.get('http://localhost:8000/api/v1/health', {
      timeout: 5000
    });
    console.log('✅ Health endpoint OK:', healthResponse.status);
    console.log('Health data:', healthResponse.data);
  } catch (error) {
    console.error('❌ Health endpoint falhou:', error.message);
  }
  
  // Teste 3: Verificar todas as rotas disponíveis
  try {
    console.log('\n3️⃣ Testando rota inexistente para ver estrutura de erro...');
    const testResponse = await axios.get('http://localhost:8000/api/v1/test-non-existent', {
      timeout: 5000,
      validateStatus: () => true
    });
    console.log('Status Code:', testResponse.status);
    console.log('Error structure:', testResponse.data);
  } catch (error) {
    console.log('Expected error:', error.message);
  }
}

// Executar teste
testWebhookEndpoint().then(() => {
  console.log('\n🏁 Teste de conectividade finalizado');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 Erro inesperado:', error);
  process.exit(1);
});