const axios = require('axios');

async function testBackendHealth() {
  console.log('🏥 Testando saúde do backend...');
  
  try {
    const response = await axios.get('https://mailtrendz-backend.onrender.com/api/v1/projects/health', {
      timeout: 10000
    });
    
    console.log('✅ Backend funcionando:');
    console.log('  - Status:', response.status);
    console.log('  - Resposta:', response.data);
    
    return true;
  } catch (error) {
    console.error('❌ Backend não está funcionando:');
    console.error('  - Erro:', error.message);
    if (error.response) {
      console.error('  - Status:', error.response.status);
      console.error('  - Data:', error.response.data);
    }
    
    return false;
  }
}

async function testProjectCreation() {
  console.log('📧 Testando criação de projeto...');
  
  // Primeiro fazer login para obter token
  try {
    const loginResponse = await axios.post('https://mailtrendz-backend.onrender.com/api/v1/auth/login', {
      email: 'test@example.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.data.accessToken;
    console.log('✅ Login realizado com sucesso');
    
    // Agora tentar criar projeto
    const projectResponse = await axios.post('https://mailtrendz-backend.onrender.com/api/v1/projects', {
      prompt: 'Criar um email de teste para verificar se o sistema está funcionando corretamente com fallback local',
      type: 'campaign'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Projeto criado com sucesso:');
    console.log('  - Status:', projectResponse.status);
    console.log('  - Projeto ID:', projectResponse.data.data.project.id);
    console.log('  - Nome:', projectResponse.data.data.project.name);
    
    return true;
  } catch (error) {
    console.error('❌ Erro na criação do projeto:');
    console.error('  - Erro:', error.message);
    if (error.response) {
      console.error('  - Status:', error.response.status);
      console.error('  - Data:', JSON.stringify(error.response.data, null, 2));
    }
    
    return false;
  }
}

async function runAllTests() {
  console.log('='.repeat(60));
  console.log('🧪 TESTE COMPLETO DO MAILTRENDZ');
  console.log('='.repeat(60));
  
  const healthOk = await testBackendHealth();
  console.log('');
  
  if (healthOk) {
    await testProjectCreation();
  }
  
  console.log('');
  console.log('='.repeat(60));
  console.log('✅ Testes finalizados');
  console.log('='.repeat(60));
}

if (require.main === module) {
  runAllTests();
}

module.exports = { testBackendHealth, testProjectCreation };