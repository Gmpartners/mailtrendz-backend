const { default: AIService } = require('./src/services/ai.service.ts')

async function testAI() {
  try {
    console.log('🧪 Testando integração IA real...')
    
    const result = await AIService.chatWithAI(
      'Melhore o assunto do email para ser mais urgente',
      [],
      {
        userId: 'test',
        projectName: 'Teste Newsletter',
        type: 'newsletter',
        industry: 'tecnologia',
        tone: 'profissional'
      }
    )
    
    console.log('✅ IA REAL funcionando:')
    console.log('Resposta:', result.response)
    console.log('Deve atualizar email:', result.shouldUpdateEmail)
    console.log('Sugestões:', result.suggestions)
    console.log('Modelo usado:', result.metadata?.model)
    
    if (result.shouldUpdateEmail) {
      console.log('🎯 SUCESSO: IA detectou comando de alteração!')
    } else {
      console.log('⚠️ ATENÇÃO: IA não detectou comando de alteração')
    }
    
  } catch (error) {
    console.error('❌ Erro na IA:', error.message)
    console.error('Stack:', error.stack)
  }
}

testAI()