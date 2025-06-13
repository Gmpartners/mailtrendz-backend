import { Request, Response } from 'express'
import { validationResult } from 'express-validator'
import PythonAIClient from '../services/ai/PythonAIClient'
import { HTTP_STATUS } from '../utils/constants'
import { logger } from '../utils/logger'

/**
 * ✅ AI CONTROLLER ATUALIZADO - USA PYTHON AI SERVICE
 * Todas as operações de IA agora passam pelo microserviço Python
 */
class AIController {

  // ✅ GERAÇÃO DE EMAIL - ENDPOINT PRINCIPAL
  async generateEmail(req: Request, res: Response): Promise<void> {
    try {
      // Validar entrada
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Dados de entrada inválidos',
          errors: errors.array()
        })
        return
      }

      const { prompt, context = {} } = req.body
      const userId = (req as any).user?.userId

      if (!prompt?.trim()) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Prompt é obrigatório'
        })
        return
      }

      logger.info(`🤖 [AI CONTROLLER] Geração de email via Python AI - User: ${userId}`)

      // Verificar saúde do Python AI Service
      const healthCheck = await PythonAIClient.healthCheck()
      
      if (healthCheck.status !== 'available') {
        logger.warn('⚠️ [AI CONTROLLER] Python AI Service indisponível')
        res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
          success: false,
          message: 'Serviço de IA temporariamente indisponível',
          fallbackActive: true,
          retryAfter: 30
        })
        return
      }

      // Preparar contexto completo
      const fullContext = {
        ...context,
        userId,
        timestamp: new Date().toISOString(),
        source: 'ai-controller'
      }

      // Chamar Python AI Service
      const startTime = Date.now()
      const emailContent = await PythonAIClient.generateEmail(prompt, fullContext)
      const processingTime = Date.now() - startTime

      logger.info(`✅ [AI CONTROLLER] Email gerado com sucesso - ${processingTime}ms`)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Email gerado com sucesso',
        data: {
          subject: emailContent.subject,
          previewText: emailContent.previewText,
          html: emailContent.html,
          text: emailContent.text
        },
        metadata: {
          processingTime,
          service: 'python-ai-service',
          userId,
          timestamp: new Date(),
          promptLength: prompt.length,
          responseSize: emailContent.html?.length || 0
        }
      })

    } catch (error: any) {
      logger.error('❌ [AI CONTROLLER] Erro na geração de email:', error.message)
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Erro na geração de email',
        fallbackAvailable: true
      })
    }
  }

  // ✅ MELHORIA DE EMAIL - ENDPOINT PRINCIPAL
  async improveEmail(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Dados de entrada inválidos',
          errors: errors.array()
        })
        return
      }

      const { currentContent, feedback, context = {} } = req.body
      const userId = (req as any).user?.userId

      if (!currentContent || !feedback?.trim()) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Conteúdo atual e feedback são obrigatórios'
        })
        return
      }

      logger.info(`🔧 [AI CONTROLLER] Melhoria de email via Python AI - User: ${userId}`)

      // Verificar saúde do Python AI Service
      const healthCheck = await PythonAIClient.healthCheck()
      
      if (healthCheck.status !== 'available') {
        res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
          success: false,
          message: 'Serviço de IA temporariamente indisponível',
          originalContent: currentContent
        })
        return
      }

      const fullContext = {
        ...context,
        userId,
        improvementRequest: true,
        timestamp: new Date().toISOString()
      }

      const startTime = Date.now()
      const improvedContent = await PythonAIClient.improveEmail(currentContent, feedback, fullContext)
      const processingTime = Date.now() - startTime

      logger.info(`✅ [AI CONTROLLER] Email melhorado com sucesso - ${processingTime}ms`)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Email melhorado com sucesso',
        data: {
          subject: improvedContent.subject,
          previewText: improvedContent.previewText,
          html: improvedContent.html,
          text: improvedContent.text,
          improvements: {
            feedback,
            applied: true
          }
        },
        metadata: {
          processingTime,
          service: 'python-ai-service',
          userId,
          timestamp: new Date(),
          feedbackLength: feedback.length
        }
      })

    } catch (error: any) {
      logger.error('❌ [AI CONTROLLER] Erro na melhoria de email:', error.message)
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro na melhoria do email',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno',
        originalContent: req.body.currentContent
      })
    }
  }

  // ✅ CHAT COM IA - ENDPOINT PRINCIPAL
  async chatWithAI(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Dados de entrada inválidos',
          errors: errors.array()
        })
        return
      }

      const { message, chatHistory = [], projectContext = {} } = req.body
      const userId = (req as any).user?.userId

      if (!message?.trim()) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Mensagem é obrigatória'
        })
        return
      }

      logger.info(`💬 [AI CONTROLLER] Chat com IA via Python AI - User: ${userId}`)

      const fullContext = {
        ...projectContext,
        userId,
        chatRequest: true,
        timestamp: new Date().toISOString()
      }

      const startTime = Date.now()
      const chatResponse = await PythonAIClient.smartChat(message, chatHistory, fullContext)
      const processingTime = Date.now() - startTime

      logger.info(`✅ [AI CONTROLLER] Chat processado com sucesso - ${processingTime}ms`)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Chat processado com sucesso',
        data: {
          response: chatResponse.response,
          shouldUpdateEmail: chatResponse.shouldUpdateEmail,
          suggestions: chatResponse.suggestions
        },
        metadata: {
          processingTime,
          service: 'python-ai-service',
          model: chatResponse.metadata?.model,
          confidence: chatResponse.metadata?.confidence,
          userId,
          timestamp: new Date()
        }
      })

    } catch (error: any) {
      logger.error('❌ [AI CONTROLLER] Erro no chat:', error.message)
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro no processamento do chat',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno',
        fallbackResponse: 'Desculpe, houve um problema temporário. Tente novamente.'
      })
    }
  }

  // ✅ STATUS DO SERVIÇO PYTHON AI
  async getAIServiceStatus(req: Request, res: Response): Promise<void> {
    try {
      logger.info('🔍 [AI CONTROLLER] Verificando status do Python AI Service')

      const healthCheck = await PythonAIClient.healthCheck()
      const serviceInfo = PythonAIClient.getServiceInfo()
      const isHealthy = PythonAIClient.isServiceHealthy()
      const lastCheck = PythonAIClient.getLastHealthCheck()

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Status do serviço de IA',
        data: {
          status: healthCheck.status,
          isHealthy,
          lastHealthCheck: lastCheck,
          responseTime: healthCheck.responseTime,
          serviceInfo: {
            baseURL: serviceInfo.baseURL,
            timeout: serviceInfo.timeout,
            retries: serviceInfo.retries
          },
          capabilities: [
            'email-generation',
            'email-improvement', 
            'smart-chat',
            'css-optimization',
            'html-validation',
            'mongodb-integration'
          ]
        },
        metadata: {
          timestamp: new Date(),
          checkedBy: (req as any).user?.userId
        }
      })

    } catch (error: any) {
      logger.error('❌ [AI CONTROLLER] Erro ao verificar status:', error.message)
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao verificar status do serviço',
        error: error.message
      })
    }
  }

  // ✅ VALIDAÇÃO DE EMAIL HTML
  async validateEmailHTML(req: Request, res: Response): Promise<void> {
    try {
      const { html } = req.body

      if (!html?.trim()) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'HTML é obrigatório'
        })
        return
      }

      logger.info('🔍 [AI CONTROLLER] Validando HTML via Python AI Service')

      // Chamar endpoint de validação do Python AI Service
      const response = await fetch(`${PythonAIClient.getServiceInfo().baseURL}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ html })
      })

      if (!response.ok) {
        throw new Error(`Python AI Service validation failed: ${response.status}`)
      }

      const validationResult = await response.json()

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'HTML validado com sucesso',
        data: validationResult,
        metadata: {
          timestamp: new Date(),
          service: 'python-ai-service',
          htmlSize: html.length
        }
      })

    } catch (error: any) {
      logger.error('❌ [AI CONTROLLER] Erro na validação:', error.message)
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro na validação do HTML',
        error: error.message
      })
    }
  }

  // ✅ OTIMIZAÇÃO DE CSS
  async optimizeCSS(req: Request, res: Response): Promise<void> {
    try {
      const { html, targetClients = ['gmail', 'outlook'], enableDarkMode = true } = req.body

      if (!html?.trim()) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'HTML é obrigatório'
        })
        return
      }

      logger.info('🎨 [AI CONTROLLER] Otimizando CSS via Python AI Service')

      const response = await fetch(`${PythonAIClient.getServiceInfo().baseURL}/optimize-css`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          html,
          target_clients: targetClients,
          enable_dark_mode: enableDarkMode,
          mobile_first: true
        })
      })

      if (!response.ok) {
        throw new Error(`Python AI Service CSS optimization failed: ${response.status}`)
      }

      const optimizationResult = await response.json()

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'CSS otimizado com sucesso',
        data: optimizationResult.data,
        metadata: {
          ...optimizationResult.metadata,
          timestamp: new Date(),
          service: 'python-ai-service'
        }
      })

    } catch (error: any) {
      logger.error('❌ [AI CONTROLLER] Erro na otimização CSS:', error.message)
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro na otimização do CSS',
        error: error.message
      })
    }
  }

  // ✅ MÉTRICAS DO SERVIÇO PYTHON AI
  async getAIMetrics(req: Request, res: Response): Promise<void> {
    try {
      logger.info('📊 [AI CONTROLLER] Obtendo métricas do Python AI Service')

      const response = await fetch(`${PythonAIClient.getServiceInfo().baseURL}/metrics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Python AI Service metrics failed: ${response.status}`)
      }

      const metrics = await response.json()

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Métricas obtidas com sucesso',
        data: metrics,
        metadata: {
          timestamp: new Date(),
          service: 'python-ai-service',
          requestedBy: (req as any).user?.userId
        }
      })

    } catch (error: any) {
      logger.error('❌ [AI CONTROLLER] Erro ao obter métricas:', error.message)
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao obter métricas',
        error: error.message
      })
    }
  }

  // ✅ TESTE DE CONECTIVIDADE
  async testConnection(req: Request, res: Response): Promise<void> {
    try {
      logger.info('🔗 [AI CONTROLLER] Testando conectividade com Python AI Service')

      const startTime = Date.now()
      
      // Teste básico de conectividade
      const response = await fetch(`${PythonAIClient.getServiceInfo().baseURL}/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const responseTime = Date.now() - startTime
      const isConnected = response.ok

      let serviceData = null
      if (isConnected) {
        serviceData = await response.json()
      }

      res.status(HTTP_STATUS.OK).json({
        success: isConnected,
        message: isConnected ? 'Conectividade OK' : 'Falha na conectividade',
        data: {
          connected: isConnected,
          responseTime,
          status: response.status,
          serviceInfo: serviceData,
          testTimestamp: new Date()
        }
      })

    } catch (error: any) {
      logger.error('❌ [AI CONTROLLER] Erro no teste de conectividade:', error.message)
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro no teste de conectividade',
        error: error.message,
        data: {
          connected: false,
          testTimestamp: new Date()
        }
      })
    }
  }
}

export default new AIController()
