import { Response } from 'express'
import { AuthRequest } from '../types/auth.types'
import AIService from '../services/ai.service'
import { HTTP_STATUS, PROJECT_TYPES } from '../utils/constants'
import { asyncHandler } from '../middleware/error.middleware'

class AIController {
  // Health check do serviço de IA
  healthCheck = asyncHandler(async (req: AuthRequest, res: Response) => {
    const aiHealth = await AIService.healthCheck()
    
    const health = {
      status: 'ok',
      timestamp: new Date(),
      service: 'ai',
      version: process.env.npm_package_version || '1.0.0',
      aiService: aiHealth
    }

    res.json({
      success: true,
      data: health
    })
  })

  // Testar geração de email (endpoint de debug)
  testEmailGeneration = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { prompt, type = 'campaign', industry = 'geral' } = req.body
    const userId = req.user!.id

    if (!prompt) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Prompt é obrigatório'
      })
    }

    // Garantir que type seja válido - usar o valor ao invés da chave
    const validProjectTypes = Object.values(PROJECT_TYPES)
    const validType = validProjectTypes.includes(type) ? type : PROJECT_TYPES.CAMPAIGN

    const context = {
      userId,
      type: validType,
      industry,
      projectName: 'Teste'
    }

    const emailContent = await AIService.generateEmail(prompt, context)

    res.json({
      success: true,
      message: 'Email gerado com sucesso!',
      data: { emailContent }
    })
  })

  // Testar melhoria de email (endpoint de debug)
  testEmailImprovement = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { currentEmail, feedback } = req.body
    const userId = req.user!.id

    if (!currentEmail || !feedback) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Email atual e feedback são obrigatórios'
      })
    }

    const context = {
      userId,
      type: PROJECT_TYPES.CAMPAIGN,
      industry: 'geral',
      projectName: 'Teste'
    }

    const improvedEmail = await AIService.improveEmail(currentEmail, feedback, context)

    res.json({
      success: true,
      message: 'Email melhorado com sucesso!',
      data: { improvedEmail }
    })
  })

  // Testar chat com IA (endpoint de debug)
  testAIChat = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { message, chatHistory = [] } = req.body
    const userId = req.user!.id

    if (!message) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Mensagem é obrigatória'
      })
    }

    const projectContext = {
      userId,
      type: PROJECT_TYPES.CAMPAIGN,
      industry: 'geral',
      projectName: 'Teste'
    }

    const response = await AIService.chatWithAI(message, chatHistory, projectContext)

    res.json({
      success: true,
      message: 'Resposta gerada com sucesso!',
      data: response
    })
  })

  // Buscar modelos disponíveis (informativo)
  getAvailableModels = asyncHandler(async (req: AuthRequest, res: Response) => {
    const models = [
      {
        id: 'anthropic/claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet',
        description: 'Modelo principal para geração de emails',
        type: 'primary'
      },
      {
        id: 'openai/gpt-4-turbo',
        name: 'GPT-4 Turbo',
        description: 'Modelo de fallback alternativo',
        type: 'fallback'
      },
      {
        id: 'anthropic/claude-3-haiku',
        name: 'Claude 3 Haiku',
        description: 'Modelo rápido para tarefas simples',
        type: 'fallback'
      },
      {
        id: 'openai/gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: 'Modelo econômico de fallback',
        type: 'fallback'
      }
    ]

    res.json({
      success: true,
      data: { models }
    })
  })

  // Buscar configurações da IA
  getAIConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
    const config = {
      defaultModel: process.env.OPENROUTER_API_KEY ? 'anthropic/claude-3.5-sonnet' : 'mock',
      temperature: 0.7,
      maxTokens: 4000,
      timeout: 30000,
      retryAttempts: 3,
      features: {
        emailGeneration: true,
        emailImprovement: true,
        aiChat: true,
        contextAware: true,
        multiModel: true
      }
    }

    res.json({
      success: true,
      data: { config }
    })
  })

  // Estatísticas de uso da IA (admin)
  getAIUsageStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    // Esta implementação seria mais robusta com um banco de dados de métricas
    const stats = {
      totalRequests: 0,
      emailsGenerated: 0,
      emailsImproved: 0,
      chatMessages: 0,
      averageResponseTime: 0,
      successRate: 100,
      topModels: [
        { model: 'anthropic/claude-3.5-sonnet', usage: 80 },
        { model: 'openai/gpt-4-turbo', usage: 15 },
        { model: 'anthropic/claude-3-haiku', usage: 5 }
      ],
      lastUpdated: new Date()
    }

    res.json({
      success: true,
      data: { stats }
    })
  })

  // Validar configuração da IA
  validateAIConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
    const validations = {
      openRouterApiKey: !!process.env.OPENROUTER_API_KEY,
      openRouterBaseUrl: !!process.env.OPENROUTER_BASE_URL,
      defaultModel: 'anthropic/claude-3.5-sonnet',
      connectionTest: false
    }

    // Testar conexão se API key estiver configurada
    if (validations.openRouterApiKey) {
      try {
        const healthCheck = await AIService.healthCheck()
        validations.connectionTest = healthCheck.status === 'available'
      } catch (error) {
        validations.connectionTest = false
      }
    }

    const isConfigValid = validations.openRouterApiKey && 
                         validations.openRouterBaseUrl && 
                         validations.connectionTest

    res.json({
      success: true,
      data: {
        isValid: isConfigValid,
        validations,
        recommendations: !isConfigValid ? [
          !validations.openRouterApiKey && 'Configure OPENROUTER_API_KEY',
          !validations.openRouterBaseUrl && 'Configure OPENROUTER_BASE_URL',
          !validations.connectionTest && 'Verifique conectividade com OpenRouter'
        ].filter(Boolean) : []
      }
    })
  })
}

export default new AIController()
