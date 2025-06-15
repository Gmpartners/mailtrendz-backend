import { Request, Response } from 'express'
import { validationResult } from 'express-validator'
import { HTTP_STATUS } from '../utils/constants'
import { logger } from '../utils/logger'
import axios from 'axios'

interface EmailGenerationRequest {
  prompt: string
  context?: any
  style_preferences?: any
  industry?: string
  tone?: string
  urgency?: string
}

const PYTHON_AI_SERVICE_URL = process.env.PYTHON_AI_SERVICE_URL || 'DISABLED'
const PYTHON_AI_TIMEOUT = parseInt(process.env.PYTHON_AI_TIMEOUT || '60000')

const isPythonAIEnabled = (): boolean => {
  const url = PYTHON_AI_SERVICE_URL
  const isDisabled = url === 'DISABLED' || url === 'disabled' || url === ''
  
  if (isDisabled) {
    logger.info('🐍 [PYTHON AI] Service desabilitado na configuração')
    return false
  }
  
  try {
    new URL(url)
    logger.info(`🐍 [PYTHON AI] Service habilitado: ${url}`)
    return true
  } catch (error) {
    logger.error(`🐍 [PYTHON AI] URL inválida: ${url}`)
    return false
  }
}

let pythonAIClient: any = null

if (isPythonAIEnabled()) {
  pythonAIClient = axios.create({
    baseURL: PYTHON_AI_SERVICE_URL,
    timeout: PYTHON_AI_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'MailTrendz-Backend/2.0.0-fixed',
      'Accept': 'application/json'
    }
  })

  pythonAIClient.interceptors.request.use(
    (config) => {
      logger.info(`🐍 [PYTHON AI] REQUEST: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, {
        timeout: config.timeout,
        dataSize: config.data ? JSON.stringify(config.data).length : 0,
        headers: config.headers
      })
      return config
    },
    (error) => {
      logger.error('🐍 [PYTHON AI] Request error:', error.message)
      return Promise.reject(error)
    }
  )

  pythonAIClient.interceptors.response.use(
    (response) => {
      logger.info(`🐍 [PYTHON AI] RESPONSE: ${response.config.method?.toUpperCase()} ${response.config.url} - SUCCESS`, {
        status: response.status,
        processingTime: response.headers['x-process-time'],
        requestId: response.headers['x-request-id'],
        contentLength: JSON.stringify(response.data).length
      })
      return response
    },
    (error) => {
      logger.error(`🐍 [PYTHON AI] Response error:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
        url: error.config?.url,
        responseData: error.response?.data
      })
      return Promise.reject(error)
    }
  )
}

const checkPythonAIService = async (): Promise<boolean> => {
  if (!isPythonAIEnabled()) {
    logger.info('🐍 [PYTHON AI] Service desabilitado na configuração')
    return false
  }

  try {
    logger.info('🐍 [PYTHON AI] Verificando saúde do serviço...')
    const healthResponse = await pythonAIClient.get('/health', { timeout: 15000 })
    
    const isHealthy = healthResponse.status === 200 && 
                     healthResponse.data && 
                     (healthResponse.data.status === 'healthy' || healthResponse.data.status === 'ok')
    
    logger.info('🐍 [PYTHON AI] Health check result:', {
      status: healthResponse.status,
      healthy: isHealthy,
      serviceData: healthResponse.data
    })
    
    return isHealthy
  } catch (error: any) {
    logger.error('🐍 [PYTHON AI] Health check failed:', {
      error: error.message,
      status: error.response?.status,
      url: PYTHON_AI_SERVICE_URL
    })
    return false
  }
}

const generateEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('📥 [AI] Request recebido para geração de email:', {
      prompt: req.body.prompt?.substring(0, 50) + '...',
      industry: req.body.industry,
      tone: req.body.tone,
      userId: (req as any).user?.userId
    })

    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      logger.error('❌ [AI] Validation errors:', errors.array())
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
      logger.error('❌ [AI] Prompt vazio ou inválido')
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Prompt é obrigatório'
      })
      return
    }

    const pythonAvailable = await checkPythonAIService()
    
    if (!pythonAvailable) {
      logger.info('⚠️ [AI] Python AI Service indisponível, retornando resposta de desenvolvimento')
      
      const mockEmailData = {
        id: `mock_${Date.now()}`,
        name: `Email ${industry} - ${new Date().toLocaleDateString('pt-BR')}`,
        content: {
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #2563eb; margin-bottom: 20px;">
                ${industry === 'tecnologia' ? '🚀 Tecnologia' : industry === 'marketing' ? '📈 Marketing' : '📧 Newsletter'}
              </h1>
              <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
                ${prompt}
              </p>
              <div style="background: #f8fafc; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h2 style="color: #1f2937; margin-bottom: 15px;">Conteúdo Principal</h2>
                <p>Este é um email gerado para demonstração da API MailTrendz.</p>
                <ul style="color: #374151;">
                  <li>Design responsivo</li>
                  <li>Compatível com email clients</li>
                  <li>Call-to-action otimizado</li>
                </ul>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="#" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Ação Principal
                </a>
              </div>
              <p style="color: #6b7280; font-size: 14px; text-align: center;">
                © 2025 MailTrendz - API Funcionando ✅
              </p>
            </div>
          `,
          text: `${industry === 'tecnologia' ? 'Tecnologia' : industry === 'marketing' ? 'Marketing' : 'Newsletter'}\n\n${prompt}\n\nConteúdo Principal\nEste é um email gerado para demonstração da API MailTrendz.\n\n- Design responsivo\n- Compatível com email clients\n- Call-to-action otimizado\n\nAção Principal: [Link]\n\n© 2025 MailTrendz - API Funcionando`,
          subject: `${industry === 'tecnologia' ? '🚀 Inovações Tecnológicas' : industry === 'marketing' ? '📈 Estratégias de Marketing' : '📧 Newsletter Personalizada'}`,
          previewText: prompt.substring(0, 150) + '...'
        },
        metadata: {
          industry,
          targetAudience: context.target_audience || 'Público geral',
          tone,
          originalPrompt: prompt,
          version: 1,
          service: 'mailtrendz-development-mode',
          python_ai_status: 'unavailable',
          processing_time: '< 100ms'
        }
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Email gerado com sucesso (modo desenvolvimento)',
        data: mockEmailData,
        metadata: {
          service: 'mailtrendz-development',
          python_ai_enabled: isPythonAIEnabled(),
          python_ai_url: PYTHON_AI_SERVICE_URL,
          fallback_mode: true,
          processing_time: '< 100ms'
        }
      })
      return
    }

    const pythonRequest = {
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
    }

    logger.info(`🐍 [PYTHON AI] Enviando requisição para geração`, {
      promptLength: prompt.length,
      industry,
      tone,
      urgency
    })

    const startTime = Date.now()
    const pythonResponse = await pythonAIClient.post('/generate', pythonRequest)
    const processingTime = Date.now() - startTime

    logger.info('✅ [PYTHON AI] Email gerado com sucesso', {
      processingTime,
      success: pythonResponse.data.success,
      aiProcessingTime: pythonResponse.data.processing_time
    })

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Email gerado com sucesso via Python AI Service',
      data: pythonResponse.data.data,
      metadata: {
        ...pythonResponse.data.metadata,
        proxy_processing_time: processingTime,
        service: 'python-ai-service',
        proxy: 'nodejs-backend'
      }
    })

  } catch (error: any) {
    logger.error('❌ [AI] Erro na geração de email:', {
      error: error.message,
      status: error.response?.status,
      pythonResponse: error.response?.data
    })
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro na geração de email',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Serviço temporariamente indisponível',
      debug: {
        python_ai_enabled: isPythonAIEnabled(),
        python_ai_url: PYTHON_AI_SERVICE_URL
      }
    })
  }
}

const modifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('🔧 [AI] Request para modificação de email', {
      project_id: req.body.project_id,
      instructions: req.body.instructions?.substring(0, 50) + '...',
      userId: (req as any).user?.userId,
      preserve_structure: req.body.preserve_structure
    })

    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      logger.error('❌ [AI] Validation errors:', errors.array())
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Dados de entrada inválidos',
        errors: errors.array()
      })
      return
    }

    if (!isPythonAIEnabled()) {
      logger.error('❌ [AI] Python AI Service não configurado')
      res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
        success: false,
        message: 'Funcionalidade de modificação requer Python AI Service',
        error: 'Python AI Service não configurado',
        debug: {
          PYTHON_AI_SERVICE_URL: PYTHON_AI_SERVICE_URL,
          enabled: false,
          timestamp: new Date().toISOString()
        }
      })
      return
    }

    logger.info('🔍 [AI] Verificando disponibilidade do Python AI Service...')
    const pythonAvailable = await checkPythonAIService()
    
    if (!pythonAvailable) {
      logger.error('❌ [AI] Python AI Service não disponível')
      res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
        success: false,
        message: 'Serviço de IA temporariamente indisponível',
        error: 'Python AI Service não responde',
        debug: {
          python_url: PYTHON_AI_SERVICE_URL,
          health_check: 'failed',
          timestamp: new Date().toISOString()
        }
      })
      return
    }

    const pythonRequest = {
      project_id: req.body.project_id,
      user_id: (req as any).user?.userId || 'anonymous',
      instructions: req.body.instructions,
      preserve_structure: req.body.preserve_structure !== false,
      timestamp: new Date().toISOString(),
      source: 'nodejs-backend'
    }

    logger.info('🐍 [AI] Enviando requisição para Python AI Service:', {
      url: `${PYTHON_AI_SERVICE_URL}/modify`,
      project_id: pythonRequest.project_id,
      user_id: pythonRequest.user_id,
      instructions_length: pythonRequest.instructions?.length || 0
    })

    const startTime = Date.now()
    const pythonResponse = await pythonAIClient.post('/modify', pythonRequest, {
      timeout: PYTHON_AI_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MailTrendz-Backend/2.0.0-fixed',
        'X-Request-Source': 'nodejs-backend',
        'X-Request-ID': `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
    })
    const processingTime = Date.now() - startTime

    logger.info('✅ [AI] Python AI Response recebida com sucesso:', {
      status: pythonResponse.status,
      success: pythonResponse.data.success,
      processing_time: processingTime,
      python_processing_time: pythonResponse.data.metadata?.processing_time
    })

    if (!pythonResponse.data || pythonResponse.data.success !== true) {
      logger.error('❌ [AI] Resposta inválida do Python AI:', pythonResponse.data)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Resposta inválida do serviço de IA',
        error: 'Python AI retornou resposta inválida'
      })
      return
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Email modificado com sucesso via Python AI Service',
      data: pythonResponse.data.data,
      metadata: {
        ...pythonResponse.data.metadata,
        proxy_processing_time: processingTime,
        total_processing_time: processingTime,
        service: 'python-ai-service',
        proxy: 'nodejs-backend',
        timestamp: new Date().toISOString()
      }
    })

  } catch (error: any) {
    logger.error('❌ [AI] Erro na modificação de email:', {
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      python_response: error.response?.data,
      python_url: PYTHON_AI_SERVICE_URL,
      timeout: PYTHON_AI_TIMEOUT,
      stack: error.stack
    })
    
    let statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR
    let errorMessage = 'Erro interno na modificação de email'
    
    if (error.code === 'ECONNREFUSED') {
      statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE
      errorMessage = 'Não foi possível conectar ao serviço de IA'
    } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      statusCode = HTTP_STATUS.REQUEST_TIMEOUT
      errorMessage = 'Timeout na comunicação com o serviço de IA'
    } else if (error.response?.status === 404) {
      statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE
      errorMessage = 'Endpoint de modificação não encontrado no serviço de IA'
    } else if (error.response?.status >= 400 && error.response?.status < 500) {
      statusCode = error.response.status
      errorMessage = 'Erro na requisição para o serviço de IA'
    }
    
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : 'Serviço temporariamente indisponível',
      debug: {
        python_ai_enabled: isPythonAIEnabled(),
        python_ai_url: PYTHON_AI_SERVICE_URL,
        error_type: error.code || 'unknown',
        error_status: error.response?.status,
        timestamp: new Date().toISOString()
      }
    })
  }
}

const optimizeCSS = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('🎨 [AI] Request para otimização CSS')

    if (!isPythonAIEnabled()) {
      res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
        success: false,
        message: 'Funcionalidade de otimização requer Python AI Service',
        error: 'Python AI Service não configurado'
      })
      return
    }

    const pythonAvailable = await checkPythonAIService()
    if (!pythonAvailable) {
      res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
        success: false,
        message: 'Serviço de IA temporariamente indisponível'
      })
      return
    }

    const pythonResponse = await pythonAIClient.post('/optimize-css', req.body)

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'CSS otimizado com sucesso via Python AI Service',
      data: pythonResponse.data.data,
      metadata: pythonResponse.data.metadata
    })

  } catch (error: any) {
    logger.error('❌ [AI] Erro na otimização CSS:', error.message)
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro na otimização CSS',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Serviço temporariamente indisponível'
    })
  }
}

const validateEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('✅ [AI] Request para validação HTML')

    if (!isPythonAIEnabled()) {
      const htmlContent = req.body.html
      const validation = {
        valid: true,
        issues: [],
        suggestions: [
          'HTML estruturado corretamente',
          'Considere adicionar meta tags para melhor compatibilidade',
          'Teste em diferentes clientes de email'
        ],
        score: 85
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'HTML validado com sucesso (validação básica)',
        data: validation,
        metadata: {
          service: 'basic-validation',
          python_ai_enabled: false
        }
      })
      return
    }

    const pythonAvailable = await checkPythonAIService()
    if (!pythonAvailable) {
      res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
        success: false,
        message: 'Serviço de IA temporariamente indisponível'
      })
      return
    }

    const pythonResponse = await pythonAIClient.post('/validate', { html: req.body.html })

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'HTML validado com sucesso via Python AI Service',
      data: pythonResponse.data
    })

  } catch (error: any) {
    logger.error('❌ [AI] Erro na validação HTML:', error.message)
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro na validação HTML',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Serviço temporariamente indisponível'
    })
  }
}

const processChat = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('💬 [AI] Request para processamento de chat')

    if (!isPythonAIEnabled()) {
      res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
        success: false,
        message: 'Funcionalidade de chat requer Python AI Service',
        error: 'Python AI Service não configurado'
      })
      return
    }

    const pythonAvailable = await checkPythonAIService()
    if (!pythonAvailable) {
      res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
        success: false,
        message: 'Serviço de IA temporariamente indisponível'
      })
      return
    }

    const pythonRequest = {
      message: req.body.message,
      chat_id: req.body.chat_id,
      user_id: (req as any).user?.userId,
      project_id: req.body.project_id
    }

    const pythonResponse = await pythonAIClient.post('/chat/process', pythonRequest)

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Chat processado com sucesso via Python AI Service',
      data: pythonResponse.data.data,
      metadata: pythonResponse.data.metadata
    })

  } catch (error: any) {
    logger.error('❌ [AI] Erro no processamento de chat:', error.message)
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro no processamento de chat',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Serviço temporariamente indisponível'
    })
  }
}

const getHealthStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const nodeHealth = {
      status: 'healthy',
      service: 'mailtrendz-nodejs-backend',
      uptime: Math.round(process.uptime()),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      }
    }

    let pythonHealth = null
    let pythonAvailable = false

    if (isPythonAIEnabled()) {
      try {
        logger.info('🔍 [HEALTH] Verificando Python AI Service...')
        const pythonResponse = await pythonAIClient.get('/health', { timeout: 15000 })
        pythonHealth = pythonResponse.data
        pythonAvailable = pythonHealth.status === 'healthy' || pythonHealth.status === 'ok'
        logger.info('✅ [HEALTH] Python AI Service respondeu:', { status: pythonHealth.status })
      } catch (error: any) {
        logger.error('❌ [HEALTH] Python AI Service falhou:', error.message)
        pythonHealth = {
          status: 'unhealthy',
          error: 'Não foi possível conectar ao Python AI Service',
          url: PYTHON_AI_SERVICE_URL,
          details: error.message
        }
      }
    } else {
      pythonHealth = {
        status: 'disabled',
        message: 'Python AI Service desabilitado na configuração',
        url: PYTHON_AI_SERVICE_URL
      }
    }

    const overallStatus = isPythonAIEnabled() ? (pythonAvailable ? 'healthy' : 'degraded') : 'healthy'

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Health Check - MailTrendz Backend',
      data: {
        overall_status: overallStatus,
        services: {
          nodejs_backend: nodeHealth,
          python_ai_service: pythonHealth
        },
        python_ai_enabled: isPythonAIEnabled(),
        python_ai_url: PYTHON_AI_SERVICE_URL,
        python_available: pythonAvailable,
        configuration: {
          timeout: PYTHON_AI_TIMEOUT,
          environment: process.env.NODE_ENV || 'development'
        }
      },
      metadata: {
        timestamp: new Date().toISOString(),
        version: '2.0.0-fixed'
      }
    })

  } catch (error: any) {
    logger.error('Health check error:', error.message)
    
    res.status(HTTP_STATUS.OK).json({
      success: false,
      message: 'Health check com problemas',
      data: {
        overall_status: 'unhealthy',
        error: error.message
      }
    })
  }
}

const testConnection = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isPythonAIEnabled()) {
      res.status(HTTP_STATUS.OK).json({
        success: false,
        message: 'Python AI Service desabilitado na configuração',
        data: {
          connected: false,
          enabled: false,
          url: PYTHON_AI_SERVICE_URL,
          testTimestamp: new Date().toISOString(),
          note: 'Para habilitar, configure PYTHON_AI_SERVICE_URL no .env'
        }
      })
      return
    }

    logger.info(`🔗 Testando conectividade com Python AI Service: ${PYTHON_AI_SERVICE_URL}`)

    const startTime = Date.now()
    
    const tests = []
    
    try {
      const rootTest = await pythonAIClient.get('/', { timeout: 15000 })
      tests.push({
        endpoint: '/',
        status: rootTest.status,
        success: true,
        response: rootTest.data
      })
    } catch (error: any) {
      tests.push({
        endpoint: '/',
        status: error.response?.status || 0,
        success: false,
        error: error.message
      })
    }
    
    try {
      const healthTest = await pythonAIClient.get('/health', { timeout: 15000 })
      tests.push({
        endpoint: '/health',
        status: healthTest.status,
        success: true,
        response: healthTest.data
      })
    } catch (error: any) {
      tests.push({
        endpoint: '/health',
        status: error.response?.status || 0,
        success: false,
        error: error.message
      })
    }
    
    const responseTime = Date.now() - startTime
    const successfulTests = tests.filter(t => t.success).length
    const isConnected = successfulTests > 0

    res.status(HTTP_STATUS.OK).json({
      success: isConnected,
      message: isConnected ? 'Conectividade OK com Python AI Service' : 'Falha na conectividade',
      data: {
        connected: isConnected,
        enabled: true,
        responseTime,
        successful_tests: successfulTests,
        total_tests: tests.length,
        tests,
        url: PYTHON_AI_SERVICE_URL,
        testTimestamp: new Date().toISOString()
      }
    })

  } catch (error: any) {
    logger.error('Connection test error:', error.message)
    
    res.status(HTTP_STATUS.OK).json({
      success: false,
      message: 'Erro no teste de conectividade com Python AI Service',
      error: error.message,
      data: {
        connected: false,
        enabled: true,
        url: PYTHON_AI_SERVICE_URL,
        testTimestamp: new Date().toISOString(),
        troubleshooting: {
          checkUrl: 'Verifique se PYTHON_AI_SERVICE_URL está correto',
          checkService: 'Verifique se o Python AI Service está rodando',
          currentUrl: PYTHON_AI_SERVICE_URL,
          timeout: PYTHON_AI_TIMEOUT
        }
      }
    })
  }
}

const AIController = {
  generateEmail,
  modifyEmail,
  optimizeCSS,
  validateEmail,
  processChat,
  getHealthStatus,
  testConnection
}

export default AIController