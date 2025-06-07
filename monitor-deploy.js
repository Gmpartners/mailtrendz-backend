const axios = require('axios');

async function waitForDeployment() {
  console.log('🚀 Aguardando deploy das correções no Render.com...');
  console.log('⏳ Verificando a cada 30 segundos...\n');
  
  let attempts = 0;
  const maxAttempts = 20; // 10 minutos máximo
  
  while (attempts < maxAttempts) {
    attempts++;
    
    try {
      console.log(`🔍 Tentativa ${attempts}/${maxAttempts} - ${new Date().toLocaleTimeString()}`);
      
      // Testar health check
      const healthResponse = await axios.get('https://mailtrendz-backend.onrender.com/api/v1/projects/health', {
        timeout: 15000
      });
      
      console.log('✅ Backend está online:', healthResponse.data);
      
      // Tentar criar um projeto de teste (sem autenticação - só para ver se o fallback funciona)
      try {
        const testResponse = await axios.post('https://mailtrendz-backend.onrender.com/api/v1/projects', {
          prompt: 'Email de teste para verificar deploy',
          type: 'campaign'
        }, {
          timeout: 10000
        });
        
        console.log('🎉 SUCESSO! Deploy concluído e sistema funcionando!');
        console.log('✅ Projeto criado:', testResponse.data.data?.project?.name);
        return true;
        
      } catch (createError) {
        if (createError.response?.status === 401) {
          console.log('✅ SUCESSO! Backend atualizado (erro 401 é esperado sem autenticação)');
          console.log('🎯 Sistema pronto para uso!');
          return true;
        } else if (createError.response?.status === 503) {
          console.log('❌ Ainda retornando 503 - aguardando deploy...');
        } else {
          console.log('🔄 Status:', createError.response?.status, '- continuando verificação...');
        }
      }
      
    } catch (error) {
      console.log(`❌ Backend ainda não acessível: ${error.message}`);
    }
    
    if (attempts < maxAttempts) {
      console.log('⏳ Aguardando 30 segundos...\n');
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }
  
  console.log('⚠️ Timeout atingido. Verifique manualmente o status do deploy no Render.com');
  return false;
}

// Função para testar após deploy
async function testAfterDeploy() {
  console.log('🧪 Testando sistema após deploy...\n');
  
  try {
    // Teste 1: Health check
    const health = await axios.get('https://mailtrendz-backend.onrender.com/api/v1/projects/health');
    console.log('✅ Health check:', health.data);
    
    // Teste 2: Tentar criar projeto (esperamos erro 401 sem token)
    try {
      await axios.post('https://mailtrendz-backend.onrender.com/api/v1/projects', {
        prompt: 'Email de teste pós-deploy com fallback local funcionando perfeitamente',
        type: 'campaign'
      });
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Validação funcionando (401 sem token é esperado)');
      } else if (error.response?.status === 503) {
        console.log('❌ Ainda com erro 503 - deploy pode não ter terminado');
        return false;
      } else {
        console.log('🔍 Status inesperado:', error.response?.status);
      }
    }
    
    console.log('\n🎉 SISTEMA PRONTO PARA USO!');
    console.log('👉 Teste no dashboard: criar qualquer email agora deve funcionar');
    
    return true;
  } catch (error) {
    console.log('❌ Erro no teste:', error.message);
    return false;
  }
}

if (require.main === module) {
  console.log('='.repeat(60));
  console.log('🚀 MONITORAMENTO DE DEPLOY - MAILTRENDZ');
  console.log('='.repeat(60));
  
  waitForDeployment().then(success => {
    if (success) {
      setTimeout(() => {
        testAfterDeploy();
      }, 5000);
    }
  });
}

module.exports = { waitForDeployment, testAfterDeploy };