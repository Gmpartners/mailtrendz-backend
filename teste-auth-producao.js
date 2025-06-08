const axios = require('axios');

const PROD_API_URL = 'https://mailtrendz-backend.onrender.com/api/v1';

async function testWithAuth() {
  console.log('🔐 TESTE COM AUTENTICAÇÃO - REGISTRAR E FAZER LOGIN');
  console.log('='.repeat(60));
  
  try {
    // 1. Registrar usuário de teste
    console.log('📝 1. Registrando usuário de teste...');
    const registerData = {
      email: `teste_${Date.now()}@mailtrendz.com`,
      password: 'Teste123!@#',
      confirmPassword: 'Teste123!@#',
      name: 'Usuário Teste'
    };
    
    let registerResponse;
    try {
      registerResponse = await axios.post(`${PROD_API_URL}/auth/register`, registerData, {
        timeout: 30000
      });
      console.log(`✅ Registro: Status ${registerResponse.status}`);
      console.log(`📄 Dados:`, JSON.stringify(registerResponse.data, null, 2));
    } catch (regError) {
      if (regError.response?.status === 409) {
        console.log('⚠️ Usuário já existe, tentando login...');
      } else {
        console.log('❌ Erro no registro:', regError.response?.data || regError.message);
        throw regError;
      }
    }
    
    // 2. Fazer login
    console.log('🔑 2. Fazendo login...');
    const loginResponse = await axios.post(`${PROD_API_URL}/auth/login`, {
      email: registerData.email,
      password: registerData.password
    }, {
      timeout: 30000
    });
    
    console.log(`✅ Login: Status ${loginResponse.status}`);
    
    const { accessToken } = loginResponse.data.data;
    console.log(`🎫 Token obtido: ${accessToken.substring(0, 50)}...`);
    
    // 3. Testar rota /auth/me
    console.log('👤 3. Testando /auth/me...');
    const meResponse = await axios.get(`${PROD_API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      timeout: 30000
    });
    
    console.log(`✅ Auth/me: Status ${meResponse.status}`);
    console.log(`👤 Usuário:`, JSON.stringify(meResponse.data, null, 2));
    
    // 4. Testar rota projects health com auth
    console.log('🏥 4. Testando projects/health com token...');
    const projectsHealthResponse = await axios.get(`${PROD_API_URL}/projects/health`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      timeout: 30000
    });
    
    console.log(`✅ Projects Health: Status ${projectsHealthResponse.status}`);
    console.log(`📄 Dados:`, JSON.stringify(projectsHealthResponse.data, null, 2));
    
    // 5. Testar rota projects list com auth (O PROBLEMA!)
    console.log('📋 5. Testando projects list com token (AQUI PODE DAR ERRO 500)...');
    try {
      const projectsResponse = await axios.get(`${PROD_API_URL}/projects?page=1&limit=12`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000,
        validateStatus: (status) => status < 600
      });
      
      console.log(`📊 Projects List: Status ${projectsResponse.status}`);
      
      if (projectsResponse.status === 200) {
        console.log(`✅ SUCESSO! Projetos carregados:`);
        console.log(`📄 Dados:`, JSON.stringify(projectsResponse.data, null, 2));
      } else {
        console.log(`❌ ERRO ${projectsResponse.status}:`);
        console.log(`📄 Erro:`, JSON.stringify(projectsResponse.data, null, 2));
      }
      
    } catch (projectsError) {
      console.log(`❌ ERRO ao buscar projetos:`);
      if (projectsError.response) {
        console.log(`   Status: ${projectsError.response.status}`);
        console.log(`   Data:`, JSON.stringify(projectsError.response.data, null, 2));
        console.log(`   Headers importantes:`, {
          'content-type': projectsError.response.headers['content-type'],
          'server': projectsError.response.headers['server']
        });
      } else {
        console.log(`   Message: ${projectsError.message}`);
        console.log(`   Code: ${projectsError.code}`);
      }
    }
    
    // 6. TESTE EXTRA: Verificar outros endpoints
    console.log('🔍 6. Testando outros endpoints...');
    
    try {
      const statsResponse = await axios.get(`${PROD_API_URL}/projects/stats`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        timeout: 30000,
        validateStatus: (status) => status < 600
      });
      console.log(`📊 Projects Stats: Status ${statsResponse.status}`);
      if (statsResponse.data) {
        console.log(`📄 Stats:`, JSON.stringify(statsResponse.data, null, 2));
      }
    } catch (error) {
      console.log(`❌ Stats Error: ${error.response?.status || error.message}`);
    }
    
  } catch (error) {
    console.log(`❌ ERRO GERAL:`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.log(`   Message: ${error.message}`);
    }
  }
}

testWithAuth().catch(console.error);
