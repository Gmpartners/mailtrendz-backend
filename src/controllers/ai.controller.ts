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
      logger.info('🔍 Health check AI Service - Endpoint público')

      // Timeout para evitar travamentos
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout')), 10000)
      })

      // Verificação básica do serviço Node.js
      const nodeStatus = {
        status: 'healthy',
        uptime: Math.round(process.uptime()),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        },
        timestamp: new Date().toISOString()
      }

      // Tentativa de verificar Python AI Service (opcional)
      let pythonStatus = {
        url: this.pythonServiceUrl,
        responsive: false,
        status: 'unknown',
        error: null as string | null
      }

      try {
        const healthCheckPromise = fetch(`${this.pythonServiceUrl}/health`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(8000)
        })

        const response = await Promise.race([healthCheckPromise, timeoutPromise]) as Response

        if (response.ok) {
          const healthData = await response.json()
          pythonStatus = {
            ...pythonStatus,
            responsive: true,
            status: 'healthy',
            responseTime: healthData?.processing_time || null
          }
        } else {
          pythonStatus.status = `http-${response.status}`
        }
      } catch (pythonError: any) {
        pythonStatus.error = pythonError.message
        pythonStatus.status = 'unreachable'
        // Log mas não falha o health check
        logger.warn('Python AI Service unreachable during health check:', pythonError.message)
      }

      // Health check sempre retorna 200, mesmo se Python Service estiver down
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'AI Service Health Check',
        data: {
          service: 'mailtrendz-ai-service',
          node: nodeStatus,
          pythonAI: pythonStatus,
          capabilities: [
            'email-generation',
            'email-improvement', 
            'smart-chat',
            'css-optimization',
            'html-validation',
            'mongodb-integration'
          ],
          environment: process.env.NODE_ENV || 'development',
          version: '2.0.0-enhanced'
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
          public: true // Indica que é endpoint público
        }
      })

    } catch (error: any) {
      logger.error('Health check error:', error.message)
      
      // Mesmo em caso de erro, retorna 200 com status de erro
      res.status(HTTP_STATUS.OK).json({
        success: false,
        message: 'Health check com problemas',
        data: {
          service: 'mailtrendz-ai-service',
          node: {
            status: 'degraded',
            error: error.message
          },
          pythonAI: {
            status: 'unknown',
            error: 'Health check failed'
          }
        },
        error: process.env.NODE_ENV === 'development' ? error.message : 'Service degraded'
      })
    }
  }

  async testConnection(req: Request, res: Response): Promise<void> {
    try {
      logger.info('🔗 Testando conectividade com Python AI Service - Endpoint público')

      const startTime = Date.now()
      
      const response = await fetch(`${this.pythonServiceUrl}/`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000)
      })

      const responseTime = Date.now() - startTime
      const isConnected = response.ok

      let serviceData = null
      if (isConnected) {
        try {
          serviceData = await response.json()
        } catch {
          serviceData = { message: 'Response not JSON' }
        }
      }

      res.status(HTTP_STATUS.OK).json({
        success: isConnected,
        message: isConnected ? 'Conectividade OK' : 'Falha na conectividade',
        data: {
          connected: isConnected,
          responseTime,
          status: response.status,
          serviceInfo: serviceData,
          pythonServiceUrl: this.pythonServiceUrl,
          testTimestamp: new Date().toISOString()
        },
        metadata: {
          public: true,
          requestId: req.headers['x-request-id'] || 'unknown'
        }
      })

    } catch (error: any) {
      logger.error('Connection test error:', error.message)
      
      res.status(HTTP_STATUS.OK).json({
        success: false,
        message: 'Erro no teste de conectividade',
        error: error.message,
        data: {
          connected: false,
          pythonServiceUrl: this.pythonServiceUrl,
          testTimestamp: new Date().toISOString()
        }
      })
    }
  }
}

export default new AIController()