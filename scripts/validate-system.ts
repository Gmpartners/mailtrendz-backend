import { connect, disconnect } from 'mongoose'
import { Conversation } from '../models/Conversation.model'
import { Project } from '../models/Project.model'
import { User } from '../models/User.model'
import { logger } from '../utils/logger'

interface ValidationResult {
  component: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  details?: any
}

class SystemValidator {
  private results: ValidationResult[] = []

  async validateSystem(): Promise<ValidationResult[]> {
    logger.info('🔍 Iniciando validação completa do sistema...')
    
    this.results = []

    await this.validateDatabase()
    await this.validateModels()
    await this.validateIndexes()
    await this.validateDataIntegrity()
    await this.validatePythonAIService()
    await this.validateEnvironmentVariables()

    return this.results
  }

  private async validateDatabase(): Promise<void> {
    try {
      await connect(process.env.MONGODB_URL!)
      
      this.addResult({
        component: 'Database Connection',
        status: 'pass',
        message: 'Conexão MongoDB estabelecida com sucesso'
      })

      // Verificar collections
      const collections = await this.getCollections()
      const expectedCollections = ['users', 'projects', 'conversations', 'refresh_tokens']
      
      for (const expected of expectedCollections) {
        if (collections.includes(expected)) {
          this.addResult({
            component: `Collection ${expected}`,
            status: 'pass',
            message: `Collection ${expected} existe`
          })
        } else {
          this.addResult({
            component: `Collection ${expected}`,
            status: 'warning',
            message: `Collection ${expected} não encontrada`
          })
        }
      }

    } catch (error: any) {
      this.addResult({
        component: 'Database Connection',
        status: 'fail',
        message: `Falha na conexão: ${error.message}`
      })
    }
  }

  private async validateModels(): Promise<void> {
    try {
      // Testar User model
      const userCount = await User.countDocuments()
      this.addResult({
        component: 'User Model',
        status: 'pass',
        message: `User model funcional (${userCount} usuários)`
      })

      // Testar Project model
      const projectCount = await Project.countDocuments()
      this.addResult({
        component: 'Project Model',
        status: 'pass',
        message: `Project model funcional (${projectCount} projetos)`
      })

      // Testar Conversation model
      const conversationCount = await Conversation.countDocuments()
      this.addResult({
        component: 'Conversation Model',
        status: 'pass',
        message: `Conversation model funcional (${conversationCount} conversas)`
      })

    } catch (error: any) {
      this.addResult({
        component: 'Models',
        status: 'fail',
        message: `Erro nos models: ${error.message}`
      })
    }
  }

  private async validateIndexes(): Promise<void> {
    try {
      // Verificar indexes do Conversation
      const conversationIndexes = await Conversation.collection.getIndexes()
      const expectedConversationIndexes = [
        'userId_1_conversation.lastActivity_-1',
        'projectId_1'
      ]

      for (const expectedIndex of expectedConversationIndexes) {
        if (conversationIndexes[expectedIndex]) {
          this.addResult({
            component: `Index ${expectedIndex}`,
            status: 'pass',
            message: `Index ${expectedIndex} existe`
          })
        } else {
          this.addResult({
            component: `Index ${expectedIndex}`,
            status: 'warning',
            message: `Index ${expectedIndex} não encontrado`
          })
        }
      }

      // Verificar indexes do Project
      const projectIndexes = await Project.collection.getIndexes()
      
      this.addResult({
        component: 'Database Indexes',
        status: 'pass',
        message: 'Verificação de indexes concluída',
        details: {
          conversationIndexes: Object.keys(conversationIndexes),
          projectIndexes: Object.keys(projectIndexes)
        }
      })

    } catch (error: any) {
      this.addResult({
        component: 'Database Indexes',
        status: 'fail',
        message: `Erro na verificação de indexes: ${error.message}`
      })
    }
  }

  private async validateDataIntegrity(): Promise<void> {
    try {
      // Verificar integridade Project -> Conversation
      const projectsWithoutConversation = await Project.aggregate([
        {
          $lookup: {
            from: 'conversations',
            localField: '_id',
            foreignField: 'projectId',
            as: 'conversation'
          }
        },
        {
          $match: {
            conversation: { $size: 0 }
          }
        },
        {
          $count: 'count'
        }
      ])

      const orphanedProjects = projectsWithoutConversation[0]?.count || 0

      if (orphanedProjects === 0) {
        this.addResult({
          component: 'Data Integrity - Projects',
          status: 'pass',
          message: 'Todos os projetos têm conversas associadas'
        })
      } else {
        this.addResult({
          component: 'Data Integrity - Projects',
          status: 'warning',
          message: `${orphanedProjects} projetos sem conversas associadas`
        })
      }

      // Verificar conversas órfãs
      const orphanedConversations = await Conversation.aggregate([
        {
          $lookup: {
            from: 'projects',
            localField: 'projectId',
            foreignField: '_id',
            as: 'project'
          }
        },
        {
          $match: {
            project: { $size: 0 }
          }
        },
        {
          $count: 'count'
        }
      ])

      const orphanedConvCount = orphanedConversations[0]?.count || 0

      if (orphanedConvCount === 0) {
        this.addResult({
          component: 'Data Integrity - Conversations',
          status: 'pass',
          message: 'Todas as conversas têm projetos válidos'
        })
      } else {
        this.addResult({
          component: 'Data Integrity - Conversations',
          status: 'warning',
          message: `${orphanedConvCount} conversas órfãs encontradas`
        })
      }

    } catch (error: any) {
      this.addResult({
        component: 'Data Integrity',
        status: 'fail',
        message: `Erro na verificação de integridade: ${error.message}`
      })
    }
  }

  private async validatePythonAIService(): Promise<void> {
    try {
      const pythonServiceUrl = process.env.PYTHON_AI_SERVICE_URL

      if (!pythonServiceUrl) {
        this.addResult({
          component: 'Python AI Service',
          status: 'warning',
          message: 'PYTHON_AI_SERVICE_URL não configurado'
        })
        return
      }

      // Testar conectividade
      const response = await fetch(`${pythonServiceUrl}/health`, {
        method: 'GET',
        timeout: 10000
      })

      if (response.ok) {
        const healthData = await response.json()
        
        this.addResult({
          component: 'Python AI Service',
          status: 'pass',
          message: 'Python AI Service respondendo',
          details: healthData
        })

        // Testar endpoints específicos
        await this.testPythonAIEndpoints(pythonServiceUrl)

      } else {
        this.addResult({
          component: 'Python AI Service',
          status: 'fail',
          message: `Python AI Service retornou status ${response.status}`
        })
      }

    } catch (error: any) {
      this.addResult({
        component: 'Python AI Service',
        status: 'fail',
        message: `Erro na conexão: ${error.message}`
      })
    }
  }

  private async testPythonAIEndpoints(baseUrl: string): Promise<void> {
    const endpoints = [
      { path: '/', name: 'Root' },
      { path: '/health', name: 'Health' },
      { path: '/metrics', name: 'Metrics' }
    ]

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${baseUrl}${endpoint.path}`, {
          method: 'GET',
          timeout: 5000
        })

        this.addResult({
          component: `Python AI Endpoint ${endpoint.name}`,
          status: response.ok ? 'pass' : 'warning',
          message: `${endpoint.path}: ${response.status}`
        })

      } catch (error: any) {
        this.addResult({
          component: `Python AI Endpoint ${endpoint.name}`,
          status: 'fail',
          message: `${endpoint.path}: ${error.message}`
        })
      }
    }
  }

  private async validateEnvironmentVariables(): Promise<void> {
    const requiredEnvVars = [
      'MONGODB_URL',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'OPENROUTER_API_KEY'
    ]

    const optionalEnvVars = [
      'PYTHON_AI_SERVICE_URL',
      'FRONTEND_URL',
      'NODE_ENV',
      'PORT'
    ]

    // Verificar variáveis obrigatórias
    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        this.addResult({
          component: `Environment Variable ${envVar}`,
          status: 'pass',
          message: `${envVar} configurado`
        })
      } else {
        this.addResult({
          component: `Environment Variable ${envVar}`,
          status: 'fail',
          message: `${envVar} não configurado (obrigatório)`
        })
      }
    }

    // Verificar variáveis opcionais
    for (const envVar of optionalEnvVars) {
      if (process.env[envVar]) {
        this.addResult({
          component: `Environment Variable ${envVar}`,
          status: 'pass',
          message: `${envVar} configurado`
        })
      } else {
        this.addResult({
          component: `Environment Variable ${envVar}`,
          status: 'warning',
          message: `${envVar} não configurado (opcional)`
        })
      }
    }
  }

  private async getCollections(): Promise<string[]> {
    try {
      const db = (await import('mongoose')).connection.db
      const collections = await db.listCollections().toArray()
      return collections.map(c => c.name)
    } catch (error) {
      return []
    }
  }

  private addResult(result: ValidationResult): void {
    this.results.push(result)
    
    const icon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌'
    console.log(`${icon} ${result.component}: ${result.message}`)
  }

  public generateReport(): void {
    const passed = this.results.filter(r => r.status === 'pass').length
    const warnings = this.results.filter(r => r.status === 'warning').length
    const failed = this.results.filter(r => r.status === 'fail').length
    const total = this.results.length

    console.log('\n📊 RELATÓRIO DE VALIDAÇÃO:')
    console.log(`   ✅ Passou: ${passed}/${total}`)
    console.log(`   ⚠️ Avisos: ${warnings}/${total}`)
    console.log(`   ❌ Falhou: ${failed}/${total}`)
    console.log('')

    if (failed > 0) {
      console.log('❌ PROBLEMAS CRÍTICOS:')
      this.results
        .filter(r => r.status === 'fail')
        .forEach(r => console.log(`   • ${r.component}: ${r.message}`))
      console.log('')
    }

    if (warnings > 0) {
      console.log('⚠️ AVISOS:')
      this.results
        .filter(r => r.status === 'warning')
        .forEach(r => console.log(`   • ${r.component}: ${r.message}`))
      console.log('')
    }

    const healthPercentage = Math.round((passed / total) * 100)
    console.log(`🎯 SAÚDE DO SISTEMA: ${healthPercentage}%`)

    if (healthPercentage >= 90) {
      console.log('🎉 Sistema em excelente estado!')
    } else if (healthPercentage >= 70) {
      console.log('👍 Sistema em bom estado')
    } else if (healthPercentage >= 50) {
      console.log('⚠️ Sistema com problemas')
    } else {
      console.log('🚨 Sistema com problemas críticos')
    }
  }
}

// Script executável
if (require.main === module) {
  async function runValidation() {
    try {
      const validator = new SystemValidator()
      
      console.log('🔍 Validando sistema MailTrendz reestruturado...\n')
      
      await validator.validateSystem()
      validator.generateReport()
      
      await disconnect()
    } catch (error) {
      console.error('❌ Erro na validação:', error)
      process.exit(1)
    }
  }
  
  runValidation()
}

export { SystemValidator }