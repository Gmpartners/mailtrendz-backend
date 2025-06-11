const axios = require('axios');
require('dotenv').config();

async function testAPI() {
  console.log('🧪 Testando API MailTrendz...');
  
  const API_BASE = 'http://localhost:8000/api/v1';
  
  try {
    // Test 1: Health check
    console.log('\n1. 🏥 Testando health check...');
    const healthResponse = await axios.get(`${API_BASE}/projects/health`, {
      timeout: 5000
    });
    console.log('   ✅ Health check:', healthResponse.status, healthResponse.data);
    
    // Test 2: Auth with test user
    console.log('\n2. 🔐 Testando login...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'test@mailtrendz.com',
      password: 'test123' // Vou precisar criar um usuário com essa senha
    }, { timeout: 5000 });
    
    const token = loginResponse.data.data.tokens.accessToken;
    console.log('   ✅ Login realizado, token obtido');
    
    // Test 3: Get projects
    console.log('\n3. 📋 Testando busca de projetos...');
    const projectsResponse = await axios.get(`${API_BASE}/projects`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 5000
    });
    console.log('   ✅ Projetos encontrados:', projectsResponse.data.data.projects.length);
    
    // Test 4: Get specific project chat
    console.log('\n4. 💬 Testando busca de chat por projeto...');
    const chatResponse = await axios.get(`${API_BASE}/chats/project/68476981e433b220d31b08ca`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 5000
    });
    console.log('   ✅ Chat encontrado:', !!chatResponse.data.data.chat);
    console.log('   📄 Chat ID:', chatResponse.data.data.chat.id);
    
    console.log('\n🎉 Todos os testes passaram! API funcionando corretamente.');
    
  } catch (error) {
    console.error('\n❌ Erro no teste:', error.response?.status, error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 O servidor não está rodando. Execute: npm run dev');
    }
  }
}

testAPI();