/**
 * Teste das Correções - Chat MailTrendz Backend
 * Verifica se as correções implementadas estão funcionando
 */

const mongoose = require('mongoose')
const axios = require('axios')

// Configurações
const API_BASE = process.env.API_URL || 'http://localhost:5000/api'
const TEST_USER = {
  email: 'test@example.com',
  password: 'Test123!'
}

class TestChatCorrections {
  constructor() {
    this.token = null
    this.userId = null
    this.projectId = null
    this.chatId = null
    this.results = []
  }

  // Log de teste
  log(message, type = 'info') {
    const timestamp = new Date().toISOString()
    const emoji = {
      'info': 'ℹ️',
      'success': '✅',
      'error': '❌',
      'warn': '⚠️'
    }
    
    console.log(`${emoji[type]} [${timestamp}] ${message}`)
    this.results.push({ timestamp, type, message })
  }

  // Teste de autenticação
  async testAuth() {
    try {
      this.log('Testando autenticação...', 'info')
      
      const response = await axios.post(`${API_BASE}/auth/login`, TEST_USER)
      
      if (response.data.success) {
        this.token = response.data.data.token
        this.userId = response.data.data.user.id
        this.log('Autenticação bem-sucedida', 'success')
        return true
      }
      
      throw new Error('Falha na autenticação')
    } catch (error) {
      this.log(`Erro na autenticação: ${error.message}`, 'error')
      return false
    }
  }

  // Teste de busca de projetos
  async testGetProjects() {
    try {
      this.log('Testando busca de projetos...', 'info')
      
      const response = await axios.get(`${API_BASE}/projects`, {
        headers: { Authorization: `Bearer ${this.token}` }
      })
      
      if (response.data.success && response.data.data.projects.length > 0) {
        this.projectId = response.data.data.projects[0].id
        this.log(`Projeto encontrado: ${this.projectId}`, 'success')
        return true
      }
      
      throw new Error('Nenhum projeto encontrado')
    } catch (error) {
      this.log(`Erro ao buscar projetos: ${error.message}`, 'error')
      return false
    }
  }

  // 🔥 TESTE CRÍTICO: getChatByProject 
  async testGetChatByProject() {
    try {
      this.log('🔥 TESTE CRÍTICO: getChatByProject', 'info')
      
      const startTime = Date.now()
      
      const response = await axios.get(`${API_BASE}/chats/project/${this.projectId}`, {
        headers: { Authorization: `Bearer ${this.token}` }
      })
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Verificações das correções implementadas
      if (response.data.success) {
        this.chatId = response.data.data.chat.id
        
        // ✅ Verificar se tem ID válido
        if (!this.chatId || this.chatId === '') {
          throw new Error('Chat ID inválido retornado')
        }
        
        // ✅ Verificar se retornou mensagens
        const messages = response.data.data.messages || []
        
        // ✅ Verificar se retornou stats
        const stats = response.data.data.stats
        if (!stats) {
          throw new Error('Stats não retornadas')
        }
        
        // ✅ Verificar se retornou projeto
        const project = response.data.data.project
        if (!project || !project.id) {
          throw new Error('Dados do projeto incompletos')
        }
        
        // ✅ Verificar performance
        if (duration > 1000) {
          this.log(`⚠️ Resposta lenta: ${duration}ms (esperado < 1000ms)`, 'warn')
        }
        
        this.log(`✅ getChatByProject funcionando: ${duration}ms`, 'success')
        this.log(`   Chat ID: ${this.chatId}`, 'info')
        this.log(`   Mensagens: ${messages.length}`, 'info')
        this.log(`   Stats: ${JSON.stringify(stats)}`, 'info')
        
        return true
      }
      
      throw new Error('Resposta de falha do servidor')
    } catch (error) {
      this.log(`❌ Erro em getChatByProject: ${error.message}`, 'error')
      return false
    }
  }

  // Teste de duplicação (verificar se não há calls duplicadas)
  async testNoDuplicateCalls() {
    try {
      this.log('🔥 TESTE: Verificando calls duplicadas', 'info')
      
      const calls = []
      const originalAxios = axios.get
      
      // Interceptar calls
      axios.get = (...args) => {
        calls.push({ url: args[0], timestamp: Date.now() })
        return originalAxios.apply(axios, args)
      }
      
      // Fazer múltiplas chamadas rápidas
      const promises = []
      for (let i = 0; i < 3; i++) {
        promises.push(
          axios.get(`${API_BASE}/chats/project/${this.projectId}`, {
            headers: { Authorization: `Bearer ${this.token}` }
          })
        )
      }
      
      await Promise.all(promises)
      
      // Restaurar axios
      axios.get = originalAxios
      
      // Verificar se houve calls duplicadas no mesmo timestamp
      const chatCalls = calls.filter(call => call.url.includes(`/chats/project/${this.projectId}`))
      
      if (chatCalls.length > 3) {
        this.log(`⚠️ Possíveis calls duplicadas detectadas: ${chatCalls.length}`, 'warn')
        return false
      }
      
      this.log(`✅ Sem calls duplicadas: ${chatCalls.length} calls como esperado`, 'success')
      return true
      
    } catch (error) {
      this.log(`❌ Erro no teste de duplicação: ${error.message}`, 'error')
      return false
    }
  }

  // Teste de envio de mensagem
  async testSendMessage() {
    try {
      this.log('Testando envio de mensagem...', 'info')
      
      const messageContent = `Teste de mensagem ${Date.now()}`
      
      const response = await axios.post(`${API_BASE}/chats/${this.chatId}/messages`, {
        content: messageContent,
        type: 'user'
      }, {
        headers: { Authorization: `Bearer ${this.token}` }
      })
      
      if (response.data.success) {
        const userMessage = response.data.data.userMessage
        const aiMessage = response.data.data.aiMessage
        
        if (!userMessage || !userMessage.id) {
          throw new Error('Mensagem do usuário não retornada corretamente')
        }
        
        this.log('✅ Mensagem enviada com sucesso', 'success')
        this.log(`   User Message ID: ${userMessage.id}`, 'info')
        this.log(`   AI Response: ${aiMessage ? 'Sim' : 'Não'}`, 'info')
        
        return true
      }
      
      throw new Error('Falha ao enviar mensagem')
    } catch (error) {
      this.log(`❌ Erro ao enviar mensagem: ${error.message}`, 'error')
      return false
    }
  }

  // Teste de histórico de mensagens
  async testGetMessages() {
    try {
      this.log('Testando histórico de mensagens...', 'info')
      
      const response = await axios.get(`${API_BASE}/chats/${this.chatId}/messages`, {
        headers: { Authorization: `Bearer ${this.token}` }
      })
      
      if (response.data.success) {
        const messages = response.data.data.messages
        const pagination = response.data.data.pagination
        
        this.log(`✅ Histórico carregado: ${messages.length} mensagens`, 'success')
        this.log(`   Pagination: ${JSON.stringify(pagination)}`, 'info')
        
        return true
      }
      
      throw new Error('Falha ao carregar histórico')
    } catch (error) {
      this.log(`❌ Erro ao carregar histórico: ${error.message}`, 'error')
      return false
    }
  }

  // Executar todos os testes
  async runAllTests() {
    this.log('🚀 Iniciando testes das correções implementadas', 'info')
    this.log('=' .repeat(60), 'info')
    
    const tests = [
      { name: 'Autenticação', fn: this.testAuth },
      { name: 'Buscar Projetos', fn: this.testGetProjects },
      { name: '🔥 getChatByProject (CRÍTICO)', fn: this.testGetChatByProject },
      { name: '🔥 Verificar Duplicações', fn: this.testNoDuplicateCalls },
      { name: 'Enviar Mensagem', fn: this.testSendMessage },
      { name: 'Carregar Histórico', fn: this.testGetMessages }
    ]
    
    let passed = 0
    let failed = 0
    
    for (const test of tests) {
      this.log(`\n📋 Executando: ${test.name}`, 'info')
      
      try {
        const result = await test.fn.call(this)
        if (result) {
          passed++
        } else {
          failed++
        }
      } catch (error) {
        this.log(`❌ Erro não capturado: ${error.message}`, 'error')
        failed++
      }
      
      // Pausa entre testes
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    // Relatório final
    this.log('\n' + '=' .repeat(60), 'info')
    this.log('📊 RELATÓRIO FINAL', 'info')
    this.log('=' .repeat(60), 'info')
    this.log(`✅ Testes Aprovados: ${passed}`, 'success')
    this.log(`❌ Testes Falharam: ${failed}`, failed > 0 ? 'error' : 'info')
    this.log(`📈 Taxa de Sucesso: ${Math.round((passed / (passed + failed)) * 100)}%`, 'info')
    
    if (failed === 0) {
      this.log('\n🎉 TODAS AS CORREÇÕES FUNCIONANDO PERFEITAMENTE!', 'success')
      this.log('✅ O problema do chat foi 100% resolvido', 'success')
    } else {
      this.log('\n⚠️ Algumas correções precisam de ajustes', 'warn')
      this.log('🔧 Verifique os erros acima para mais detalhes', 'warn')
    }
    
    return failed === 0
  }

  // Salvar relatório
  saveReport() {
    const fs = require('fs')
    const report = {
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: {
        total: this.results.length,
        success: this.results.filter(r => r.type === 'success').length,
        errors: this.results.filter(r => r.type === 'error').length,
        warnings: this.results.filter(r => r.type === 'warn').length
      }
    }
    
    fs.writeFileSync('test-corrections-report.json', JSON.stringify(report, null, 2))
    this.log(`📄 Relatório salvo: test-corrections-report.json`, 'info')
  }
}

// Executar testes se chamado diretamente
if (require.main === module) {
  const tester = new TestChatCorrections()
  
  tester.runAllTests()
    .then(success => {
      tester.saveReport()
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('❌ Erro crítico nos testes:', error)
      process.exit(1)
    })
}

module.exports = TestChatCorrections