import { Request, Response } from 'express'
import { validationResult } from 'express-validator'
import { HTTP_STATUS } from '../utils/constants'
import { logger } from '../utils/logger'

interface PythonAIResponse {
  success: boolean
  data?: any
  processing_time?: number
  metadata?: any
}

class AIController {
  private pythonServiceUrl: string

  constructor() {
    this.pythonServiceUrl = process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:5000'
  }

  async generateEmail(req: Request, res: Response): Promise<void> {
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

      const { prompt, context = {}, style_preferences, industry = 'geral', tone = 'professional', urgency = 'medium' } = req.body
      const userId = (req as any).user?.userId

      if (!prompt?.trim()) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Prompt é obrigatório'
        })
        return
      }

      logger.info(`🤖 Geração de email via Python AI - User: ${userId}`)

      const response = await fetch(`${this.pythonServiceUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          context: {
            ...context,
            userId,
            timestamp: new Date().toISOString()
          },
          style_preferences,
          industry,
          tone,
          urgency
        })
      })

      if (!response.ok) {
        throw new Error(`Python AI Service error: ${response.status}`)
      }

      const data = await response.json() as PythonAIResponse

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Email gerado com sucesso',
        data: {
          subject: data.data?.subject || 'Email Gerado',
          previewText: data.data?.preview_text || 'Preview',
          html: data.data?.html || '<p>HTML content</p>',
          text: data.data?.text || 'Text content'
        },
        metadata: {
          processingTime: data.processing_time || 0,
          service: 'python-ai-service',
          userId,
          timestamp: new Date()
        }
      })

    } catch (error: any) {
      logger.error('Generate email error:', error.message)
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Erro na geração de email'
      })
    }
  }

  async getHealthStatus(req: Request, res: Response): Promise<void> {
    try {
      logger.info('🔍 Verificando status do Python AI Service')

      const healthResponse = await fetch(`${this.pythonServiceUrl}/health`, {
        method: 'GET'
      })

      const healthData = healthResponse.ok ? await healthResponse.json() as PythonAIResponse : null

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Status do serviço de IA',
        data: {
          status: healthResponse.ok ? 'healthy' : 'unhealthy',
          pythonService: {
            url: this.pythonServiceUrl,
            responsive: healthResponse.ok,
            responseTime: healthData?.processing_time || healthData?.metadata?.processing_time || null
          },
          healthData,
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
      logger.error('Health check error:', error.message)
      
      res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
        success: false,
        message: 'Python AI Service indisponível',
        data: {
          status: 'unhealthy',
          pythonService: {
            url: this.pythonServiceUrl,
            responsive: false,
            error: error.message
          }
        }
      })
    }
  }

  async testConnection(req: Request, res: Response): Promise<void> {
    try {
      logger.info('🔗 Testando conectividade com Python AI Service')

      const startTime = Date.now()
      
      const response = await fetch(`${this.pythonServiceUrl}/`, {
        method: 'GET'
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
      logger.error('Connection test error:', error.message)
      
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