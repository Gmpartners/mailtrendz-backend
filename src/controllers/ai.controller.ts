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

interface PythonServiceStatus {
  url: string
  responsive: boolean
  status: string
  error: string | null
  responseTime?: number
}

// Função helper para obter URL do Python AI Service
const getPythonServiceUrl = (): string => {
  return process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:5000'
}

// Converter para funções normais em vez de métodos de classe
const generateEmail = async (req: Request, res: Response): Promise<void> => {
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

    const pythonServiceUrl = getPythonServiceUrl()
    logger.info(`🤖 Geração de email via Python AI - User: ${userId}, URL: ${pythonServiceUrl}`)

    const response = await fetch(`${pythonServiceUrl}/generate`, {
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

const getHealthStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const pythonServiceUrl = getPythonServiceUrl()
    
    logger.info(`🔍 Health check AI Service - Endpoint público, URL: ${pythonServiceUrl}`)

    // Verificação básica do serviço Node.js
    const nodeStatus = {
      status: 'healthy',
      uptime: Math.round(process.uptime()),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      },
      timestamp: new Date().toISOString(),
      pythonServiceUrl: pythonServiceUrl
    }

    // Tentativa de verificar Python AI Service (opcional)
    let pythonStatus: PythonServiceStatus = {
      url: pythonServiceUrl,
      responsive: false,
      status: 'unknown',
      error: null
    }

    try {
      logger.info(`🐍 Tentando conectar com Python AI Service: ${pythonServiceUrl}/health`)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)

      const fetchResponse = await fetch(`${pythonServiceUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (fetchResponse.ok) {
        const healthData = await fetchResponse.json() as PythonAIResponse
        pythonStatus = {
          ...pythonStatus,
          responsive: true,
          status: 'healthy',
          responseTime: healthData?.processing_time || null
        }
        logger.info('✅ Python AI Service respondeu com sucesso')
      } else {
        pythonStatus.status = `http-${fetchResponse.status}`
        logger.warn(`⚠️ Python AI Service retornou status: ${fetchResponse.status}`)
      }
    } catch (pythonError: any) {
      pythonStatus.error = pythonError.message
      pythonStatus.status = 'unreachable'
      logger.warn(`❌ Python AI Service unreachable: ${pythonError.message}`)
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
        public: true
      }
    })

  } catch (error: any) {
    logger.error('Health check error:', error.message)
    
    res.status(HTTP_STATUS.OK).json({
      success: false,
      message: 'Health check com problemas',
      data: {
        service: 'mailtrendz-ai-service',
        node: {
          status: 'degraded',
          error: error.message,
          pythonServiceUrl: getPythonServiceUrl()
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

const testConnection = async (req: Request, res: Response): Promise<void> => {
  try {
    const pythonServiceUrl = getPythonServiceUrl()
    
    logger.info(`🔗 Testando conectividade com Python AI Service: ${pythonServiceUrl}`)

    const startTime = Date.now()
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const fetchResponse = await fetch(`${pythonServiceUrl}/`, {
      method: 'GET',
      signal: controller.signal
    })

    clearTimeout(timeoutId)
    const responseTime = Date.now() - startTime
    const isConnected = fetchResponse.ok

    let serviceData = null
    if (isConnected) {
      try {
        serviceData = await fetchResponse.json()
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
        status: fetchResponse.status,
        serviceInfo: serviceData,
        pythonServiceUrl: pythonServiceUrl,
        testTimestamp: new Date().toISOString()
      },
      metadata: {
        public: true,
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    })

  } catch (error: any) {
    const pythonServiceUrl = getPythonServiceUrl()
    logger.error('Connection test error:', error.message)
    
    res.status(HTTP_STATUS.OK).json({
      success: false,
      message: 'Erro no teste de conectividade',
      error: error.message,
      data: {
        connected: false,
        pythonServiceUrl: pythonServiceUrl,
        testTimestamp: new Date().toISOString()
      }
    })
  }
}

// Exportar as funções diretamente
const AIController = {
  generateEmail,
  getHealthStatus,
  testConnection
}

export default AIController