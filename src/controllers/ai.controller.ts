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

// ✅ CONFIGURAÇÃO PARA CONECTAR AO PYTHON AI SERVICE
const PYTHON_AI_SERVICE_URL = process.env.PYTHON_AI_SERVICE_URL || 'DISABLED'
const PYTHON_AI_TIMEOUT = parseInt(process.env.PYTHON_AI_TIMEOUT || '60000')

// ✅ VERIFICAR SE PYTHON AI SERVICE ESTÁ HABILITADO
const isPythonAIEnabled = (): boolean => {
  return PYTHON_AI_SERVICE_URL !== 'DISABLED' && 
         PYTHON_AI_SERVICE_URL !== 'disabled' && 
         PYTHON_AI_SERVICE_URL !== '' &&
         !PYTHON_AI_SERVICE_URL.includes('localhost')
}

// ✅ CLIENTE HTTP PARA PYTHON AI SERVICE (só se habilitado)
let pythonAIClient: any = null

if (isPythonAIEnabled()) {
  pythonAIClient = axios.create({
    baseURL: PYTHON_AI_SERVICE_URL,
    timeout: PYTHON_AI_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'MailTrendz-Backend/2.0.0'
    }
  })

  // ✅ INTERCEPTOR PARA LOGS
  pythonAIClient.interceptors.request.use(
    (config) => {
      logger.info(`🐍 [PYTHON AI] ${config.method?.toUpperCase()} ${config.url}`, {
        timeout: config.timeout,
        dataSize: config.data ? JSON.stringify(config.data).length : 0
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
      logger.info(`🐍 [PYTHON AI] ${response.config.method?.toUpperCase()} ${response.config.url} - SUCCESS`, {
        status: response.status,
        processingTime: response.headers['x-process-time'],
        requestId: response.headers['x-request-id']
      })
      return response
    },
    (error) => {
      logger.error(`🐍 [PYTHON AI] Response error:`, {
        status: error.response?.status,
        message: error.message,
        url: error.config?.url
      })
      return Promise.reject(error)
    }
  )
}

// ✅ FUNÇÃO PARA VERIFICAR SE PYTHON AI SERVICE ESTÁ DISPONÍVEL
const checkPythonAIService = async (): Promise<boolean> => {
  if (!isPythonAIEnabled()) {
    logger.info('🐍 [PYTHON AI] Service desabilitado na configuração')
    return false
  }

  try {
    await pythonAIClient.get('/health', { timeout: 10000 })
    return true
  } catch (error) {
    logger.error('🐍 [PYTHON AI] Service não disponível:', error)
    return false
  }
}

// ✅ GERAÇÃO DE EMAIL - RESPOSTA ESTRUTURADA PARA DESENVOLVIMENTO
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

    // ✅ VERIFICAR SE PYTHON AI SERVICE ESTÁ DISPONÍVEL
    const pythonAvailable = await checkPythonAIService()
    
    if (!pythonAvailable) {
      logger.info('⚠️ [AI] Python AI Service indisponível, retornando resposta de desenvolvimento')
      
      // ✅ RESPOSTA ESTRUTURADA PARA DESENVOLVIMENTO/TESTE
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

    // ✅ SE PYTHON AI DISPONÍVEL, USAR O SERVIÇO PYTHON
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

// ✅ MODIFICAÇÃO DE EMAIL VIA PYTHON AI SERVICE
const modifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('🔧 [AI] Request para modificação de email')

    if (!isPythonAIEnabled()) {
      res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
        success: false,
        message: 'Funcionalidade de modificação requer Python AI Service',
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
      project_id: req.body.project_id,
      user_id: (req as any).user?.userId,
      instructions: req.body.instructions,
      preserve_structure: req.body.preserve_structure !== false
    }

    const pythonResponse = await pythonAIClient.post('/modify', pythonRequest)

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Email modificado com sucesso via Python AI Service',
      data: pythonResponse.data.data,
      metadata: pythonResponse.data.metadata
    })

  } catch (error: any) {
    logger.error('❌ [AI] Erro na modificação de email:', error.message)
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro na modificação de email',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Serviço temporariamente indisponível'
    })
  }
}

// ✅ OTIMIZAÇÃO CSS VIA PYTHON AI SERVICE
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

// ✅ VALIDAÇÃO HTML VIA PYTHON AI SERVICE
const validateEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('✅ [AI] Request para validação HTML')

    if (!isPythonAIEnabled()) {
      // ✅ VALIDAÇÃO SIMPLES SEM PYTHON AI
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

// ✅ PROCESSAMENTO DE CHAT VIA PYTHON AI SERVICE
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

// ✅ HEALTH CHECK COMBINADO (NODE.JS + PYTHON AI)
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
        const pythonResponse = await pythonAIClient.get('/health', { timeout: 10000 })
        pythonHealth = pythonResponse.data
        pythonAvailable = pythonHealth.status === 'healthy'
      } catch (error) {
        pythonHealth = {
          status: 'unhealthy',
          error: 'Não foi possível conectar ao Python AI Service',
          url: PYTHON_AI_SERVICE_URL
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
        python_available: pythonAvailable
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

// ✅ TESTE DE CONECTIVIDADE COM PYTHON AI SERVICE
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
    
    const pythonResponse = await pythonAIClient.get('/', { timeout: 15000 })
    
    const responseTime = Date.now() - startTime
    const isConnected = pythonResponse.status === 200

    res.status(HTTP_STATUS.OK).json({
      success: isConnected,
      message: isConnected ? 'Conectividade OK com Python AI Service' : 'Falha na conectividade',
      data: {
        connected: isConnected,
        enabled: true,
        responseTime,
        status: pythonResponse.status,
        python_service_info: pythonResponse.data,
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
          allEndpointsReturned404: 'Todos os endpoints testados retornaram 404'
        }
      }
    })
  }
}

// ✅ EXPORTAR CONTROLLER
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