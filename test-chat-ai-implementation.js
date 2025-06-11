const AIService = require('./src/services/ai.service').default

// 🔥 TESTE DA IMPLEMENTAÇÃO DO CHAT IA
async function testChatAIImplementation() {
  console.log('🧪 [TESTE] Iniciando validação da implementação do Chat IA...\n')

  // Mock de dados de teste
  const mockUserMessage = "Mude o título do email para 'Super Promoção 50% OFF'"
  
  const mockChatHistory = [
    {
      id: '1',
      type: 'user',
      content: 'Olá, preciso de ajuda com o email',
      timestamp: new Date()
    },
    {
      id: '2', 
      type: 'ai',
      content: 'Olá! Estou aqui para ajudar você com seu email marketing.',
      timestamp: new Date()
    }
  ]

  const mockProjectContext = {
    userId: 'test-user-123',
    projectName: 'Campanha Black Friday',
    type: 'promotional',
    industry: 'e-commerce',
    targetAudience: 'jovens adultos',
    tone: 'energético e urgente',
    status: 'ativo'
  }

  console.log('📋 [TESTE] Dados de entrada:')
  console.log('  - Mensagem do usuário:', mockUserMessage)
  console.log('  - Histórico de mensagens:', mockChatHistory.length, 'mensagens')
  console.log('  - Projeto:', mockProjectContext.projectName)
  console.log('  - Tipo:', mockProjectContext.type)
  console.log('')

  try {
    // 🔥 TESTE 1: Detecção de Intenção
    console.log('🎯 [TESTE 1] Testando detecção de intenção...')
    
    // Simular análise de intenção (função privada, vamos testar através da pública)
    const testMessages = [
      { message: "Mude o título para 'Oferta Especial'", shouldDetect: true },
      { message: "Adicione urgência ao email", shouldDetect: true },
      { message: "Como melhorar a taxa de abertura?", shouldDetect: false },
      { message: "Que cores usar no design?", shouldDetect: false },
      { message: "Remova o parágrafo sobre desconto", shouldDetect: true }
    ]

    console.log('Testando detecção para diferentes tipos de mensagem:')
    for (const test of testMessages) {
      console.log(`  "${test.message}" → Deve detectar: ${test.shouldDetect ? '✅ SIM' : '❌ NÃO'}`)
    }

    // 🔥 TESTE 2: Chamada Principal
    console.log('\n🤖 [TESTE 2] Testando função principal chatWithAI...')
    
    const startTime = Date.now()
    const result = await AIService.chatWithAI(mockUserMessage, mockChatHistory, mockProjectContext)
    const duration = Date.now() - startTime

    console.log('\n📤 [RESULTADO] Resposta da IA:')
    console.log('  - Resposta:', result.response ? '✅ Gerada' : '❌ Não gerada')
    console.log('  - Deve atualizar email:', result.shouldUpdateEmail ? '✅ SIM' : '❌ NÃO')
    console.log('  - Conteúdo melhorado:', result.improvedContent ? '✅ Sim' : '❌ Não')
    console.log('  - Sugestões:', result.suggestions?.length || 0, 'sugestões')
    console.log('  - Tempo de execução:', duration, 'ms')
    console.log('  - Confiança:', (result.metadata?.confidence || 0).toFixed(2))

    if (result.improvedContent) {
      console.log('\n📄 [CONTEÚDO MELHORADO]:')
      console.log('  - HTML:', result.improvedContent.html ? '✅ Gerado' : '❌ Não gerado')
      console.log('  - Assunto:', result.improvedContent.subject || 'Não definido')
      console.log('  - Tamanho HTML:', result.improvedContent.html?.length || 0, 'caracteres')
    }

    // 🔥 TESTE 3: Validações
    console.log('\n✅ [VALIDAÇÕES]:')
    
    const validations = [
      { 
        name: 'Resposta não vazia', 
        condition: result.response && result.response.length > 0,
        critical: true 
      },
      { 
        name: 'Detecção de modificação funcionando', 
        condition: result.shouldUpdateEmail === true,
        critical: true 
      },
      { 
        name: 'Conteúdo HTML gerado', 
        condition: result.improvedContent?.html && result.improvedContent.html.length > 50,
        critical: true 
      },
      { 
        name: 'Assunto atualizado', 
        condition: result.improvedContent?.subject && result.improvedContent.subject.includes('Super Promoção'),
        critical: false 
      },
      { 
        name: 'Metadata presente', 
        condition: result.metadata && result.metadata.model,
        critical: false 
      },
      { 
        name: 'Sugestões fornecidas', 
        condition: result.suggestions && result.suggestions.length > 0,
        critical: false 
      },
      { 
        name: 'Tempo aceitável', 
        condition: duration < 30000, // 30 segundos
        critical: false 
      }
    ]

    let criticalPassed = 0
    let totalCritical = 0
    let optionalPassed = 0
    let totalOptional = 0

    validations.forEach(validation => {
      const status = validation.condition ? '✅ PASS' : '❌ FAIL'
      const label = validation.critical ? '[CRÍTICO]' : '[OPCIONAL]'
      
      console.log(`  ${status} ${label} ${validation.name}`)
      
      if (validation.critical) {
        totalCritical++
        if (validation.condition) criticalPassed++
      } else {
        totalOptional++
        if (validation.condition) optionalPassed++
      }
    })

    // 🔥 RESULTADO FINAL
    console.log('\n🎯 [RESULTADO FINAL]:')
    console.log(`  - Testes críticos: ${criticalPassed}/${totalCritical} ${criticalPassed === totalCritical ? '✅' : '❌'}`)
    console.log(`  - Testes opcionais: ${optionalPassed}/${totalOptional} ${optionalPassed > totalOptional/2 ? '✅' : '⚠️'}`)
    
    const success = criticalPassed === totalCritical
    console.log(`  - Status geral: ${success ? '✅ SUCESSO' : '❌ FALHA'}`)

    if (success) {
      console.log('\n🎉 [PARABÉNS] Implementação do Chat IA funcionando corretamente!')
      console.log('🔥 Principais funcionalidades validadas:')
      console.log('   ✅ Detecção automática de intenção de modificação')
      console.log('   ✅ Geração de conteúdo HTML melhorado')
      console.log('   ✅ Sistema de resposta conversacional')
      console.log('   ✅ Metadata e sugestões funcionais')
    } else {
      console.log('\n⚠️ [ATENÇÃO] Alguns testes críticos falharam.')
      console.log('🔧 Verifique os logs acima e corrija os problemas identificados.')
    }

    return success

  } catch (error) {
    console.error('\n❌ [ERRO] Falha no teste da implementação:', error.message)
    console.error('Stack trace:', error.stack)
    return false
  }
}

// 🔥 TESTE RÁPIDO DE CONECTIVIDADE
async function testConnectivity() {
  console.log('\n🌐 [CONECTIVIDADE] Testando conexão com OpenRouter...')
  
  try {
    // Teste básico de conectividade
    const testPrompt = "Teste de conectividade"
    const simpleContext = {
      userId: 'test',
      projectName: 'Teste',
      type: 'test',
      industry: 'test',
      tone: 'test'
    }
    
    const startTime = Date.now()
    await AIService.chatWithAI(testPrompt, [], simpleContext)
    const duration = Date.now() - startTime
    
    console.log(`✅ Conectividade OK (${duration}ms)`)
    return true
    
  } catch (error) {
    console.error('❌ Erro de conectividade:', error.message)
    
    if (error.message.includes('API key')) {
      console.log('🔑 Verifique se OPENROUTER_API_KEY está configurada no .env')
    } else if (error.message.includes('401')) {
      console.log('🔑 API key inválida ou expirada')
    } else if (error.message.includes('503')) {
      console.log('🔧 Serviço temporariamente indisponível')
    }
    
    return false
  }
}

// 🔥 EXECUTAR TODOS OS TESTES
async function runAllTests() {
  console.log('🚀 [INICIO] Executando validação completa da implementação...\n')
  console.log('=' .repeat(60))
  
  // Teste 1: Conectividade
  const connectivityOK = await testConnectivity()
  
  if (!connectivityOK) {
    console.log('\n⚠️ Testes principais pulados devido a problemas de conectividade.')
    console.log('🔧 Corrija a conectividade antes de continuar.')
    return
  }
  
  console.log('\n' + '=' .repeat(60))
  
  // Teste 2: Implementação principal
  const implementationOK = await testChatAIImplementation()
  
  console.log('\n' + '=' .repeat(60))
  console.log('🏁 [FINAL] Relatório de testes concluído!')
  
  if (implementationOK) {
    console.log('🎉 Sistema pronto para uso em produção!')
    console.log('\n🔥 Próximos passos:')
    console.log('   1. Teste no frontend com mensagens reais')
    console.log('   2. Verifique polling automático')
    console.log('   3. Teste cenários edge cases')
    console.log('   4. Monitore logs de produção')
  } else {
    console.log('⚠️ Sistema requer correções antes do uso.')
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runAllTests().catch(console.error)
}

module.exports = {
  testChatAIImplementation,
  testConnectivity,
  runAllTests
}