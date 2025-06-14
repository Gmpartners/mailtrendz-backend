const axios = require('axios');

// Teste local do backend
async function testBackend() {
  console.log('🔍 Testando backend MailTrendz...\n');
  
  // URLs para teste
  const LOCAL_BASE = 'http://localhost:8000';
  const RAILWAY_BASE = 'https://mailtrendz-backend-production.up.railway.app';
  
  // Função para testar uma URL
  async function testUrl(baseUrl, description) {
    console.log(`📡 Testando ${description}: ${baseUrl}`);
    
    try {
      // Teste 1: Health check raiz
      console.log('  ✅ GET / (health check raiz)');
      const rootResponse = await axios.get(`${baseUrl}/`, { timeout: 10000 });
      console.log(`     Status: ${rootResponse.status}`);
      console.log(`     Message: ${rootResponse.data.message}`);
      
      // Teste 2: Health check API
      console.log('  ✅ GET /health');
      const healthResponse = await axios.get(`${baseUrl}/health`, { timeout: 10000 });
      console.log(`     Status: ${healthResponse.status}`);
      console.log(`     Service Status: ${healthResponse.data.data.status}`);
      
      // Teste 3: API endpoints disponíveis
      console.log('  ✅ GET /api/v1');
      const apiResponse = await axios.get(`${baseUrl}/api/v1`, { timeout: 10000 });
      console.log(`     Status: ${apiResponse.status}`);
      console.log(`     Endpoints: ${Object.keys(apiResponse.data.endpoints).join(', ')}`);
      
      // Teste 4: Auth health check
      console.log('  ✅ GET /api/v1/auth/health');
      const authHealthResponse = await axios.get(`${baseUrl}/api/v1/auth/health`, { timeout: 10000 });
      console.log(`     Status: ${authHealthResponse.status}`);
      console.log(`     Auth Service: ${authHealthResponse.data.data.service}`);
      
      // Teste 5: Tentar login (deve retornar erro de validação, não 404)
      console.log('  ✅ POST /api/v1/auth/login (teste de endpoint)');
      try {
        await axios.post(`${baseUrl}/api/v1/auth/login`, {
          email: 'test@test.com',
          password: 'test123'
        }, { timeout: 10000 });
      } catch (error) {
        if (error.response && error.response.status !== 404) {
          console.log(`     Endpoint existe - Status: ${error.response.status}`);
        } else if (error.response && error.response.status === 404) {
          console.log(`     ❌ ERRO 404 - Endpoint não encontrado!`);
          return false;
        }
      }
      
      console.log(`  ✅ ${description} funcionando corretamente!\n`);
      return true;
      
    } catch (error) {
      console.log(`  ❌ Erro em ${description}:`);
      if (error.code === 'ECONNREFUSED') {
        console.log(`     Conexão recusada - servidor não está rodando`);
      } else if (error.code === 'ETIMEDOUT') {
        console.log(`     Timeout - servidor não responde`);
      } else if (error.response) {
        console.log(`     Status: ${error.response.status}`);
        console.log(`     Erro: ${error.response.data?.message || error.message}`);
      } else {
        console.log(`     Erro: ${error.message}`);
      }
      console.log('');
      return false;
    }
  }
  
  // Testar primeiro localmente, depois Railway
  console.log('🧪 FASE 1: Teste Local\n');
  const localWorking = await testUrl(LOCAL_BASE, 'Backend Local');
  
  console.log('🌐 FASE 2: Teste Railway\n');
  const railwayWorking = await testUrl(RAILWAY_BASE, 'Backend Railway');
  
  // Resumo
  console.log('📊 RESUMO DOS TESTES:');
  console.log(`   Local (${LOCAL_BASE}): ${localWorking ? '✅ OK' : '❌ FALHA'}`);
  console.log(`   Railway (${RAILWAY_BASE}): ${railwayWorking ? '✅ OK' : '❌ FALHA'}`);
  
  if (!localWorking && !railwayWorking) {
    console.log('\n🚨 PROBLEMA CRÍTICO: Nenhum servidor está funcionando!');
    console.log('   1. Verifique se o build foi feito: npm run build');
    console.log('   2. Teste local: npm run start');
    console.log('   3. Verifique logs do Railway');
  } else if (localWorking && !railwayWorking) {
    console.log('\n⚠️  PROBLEMA NO RAILWAY: Local OK, Railway com problema');
    console.log('   1. Verifique deploy no Railway');
    console.log('   2. Confira variáveis de ambiente');
    console.log('   3. Veja logs do Railway');
  } else if (!localWorking && railwayWorking) {
    console.log('\n⚠️  PROBLEMA LOCAL: Railway OK, local com problema');
    console.log('   1. Rode: npm run build && npm run start');
    console.log('   2. Verifique a porta 8000');
  } else {
    console.log('\n🎉 TUDO OK: Ambos servidores funcionando!');
  }
}

// Executar teste
testBackend().catch(console.error);
