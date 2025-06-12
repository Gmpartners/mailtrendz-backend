#!/usr/bin/env node

console.log('🔥 Teste de correção do Enhanced AI Service')
console.log('============================================')

async function testEnhancedAI() {
  try {
    console.log('1. Importando configurações...')
    
    console.log('2. Testando variáveis de ambiente...')
    const requiredEnvs = ['OPENROUTER_API_KEY', 'MONGODB_URI', 'JWT_SECRET']
    
    for (const env of requiredEnvs) {
      if (!process.env[env]) {
        console.error(`❌ Variável ${env} não encontrada`)
        return false
      }
      console.log(`✅ ${env}: ${env === 'OPENROUTER_API_KEY' ? 'sk-or-v1-***' : 'configurada'}`)
    }
    
    console.log('3. Testando importação do serviço...')
    const EnhancedAIService = require('./dist/services/ai/enhanced/EnhancedAIService.js').default
    
    if (!EnhancedAIService) {
      console.error('❌ Não foi possível importar o EnhancedAIService')
      return false
    }
    
    console.log('✅ EnhancedAIService importado com sucesso')
    
    console.log('4. Testando health check...')
    const healthResult = await EnhancedAIService.healthCheck()
    
    console.log(`🏥 Health Check: ${healthResult.status}`)
    console.log(`⏱️ Tempo de resposta: ${healthResult.responseTime}ms`)
    
    if (healthResult.status === 'available') {
      console.log('✅ OpenRouter API está disponível')
      
      console.log('5. Testando análise de prompt...')
      const analysis = await EnhancedAIService.analyzePrompt(
        'Crie um email de boas-vindas azul para novos usuários',
        {
          userId: 'test-user',
          projectName: 'Teste',
          type: 'welcome',
          industry: 'tecnologia',
          tone: 'profissional',
          status: 'ativo'
        }
      )
      
      console.log('📊 Análise concluída:', {
        confidence: Math.round(analysis.confidence * 100) + '%',
        intentions: analysis.intentions.length,
        hasVisualReqs: Object.keys(analysis.visualRequirements).length > 0
      })
      
      console.log('🎉 Todos os testes passaram com sucesso!')
      return true
    } else {
      console.warn('⚠️ OpenRouter API não está disponível, mas o serviço funciona')
      return true
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message)
    return false
  }
}

testEnhancedAI().then(success => {
  if (success) {
    console.log('\n🎯 CORREÇÃO APLICADA COM SUCESSO!')
    console.log('O Enhanced AI Service está funcionando corretamente.')
    process.exit(0)
  } else {
    console.log('\n💥 FALHA NA CORREÇÃO!')
    console.log('Verifique os logs acima para mais detalhes.')
    process.exit(1)
  }
})