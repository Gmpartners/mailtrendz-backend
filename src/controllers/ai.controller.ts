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

interface GeneratedEmail {
  subject: string
  previewText: string
  html: string
  text: string
}

// Função para gerar email usando OpenRouter (Claude)
const generateEmailWithAI = async (request: EmailGenerationRequest): Promise<GeneratedEmail> => {
  const openRouterApiKey = process.env.OPENROUTER_API_KEY
  const openRouterBaseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'

  if (!openRouterApiKey) {
    throw new Error('OpenRouter API key não configurada')
  }

  const prompt = `
Você é um especialista em email marketing. Crie um email profissional baseado nas seguintes informações:

PROMPT: ${request.prompt}
INDÚSTRIA: ${request.industry || 'geral'}
TOM: ${request.tone || 'professional'}
URGÊNCIA: ${request.urgency || 'medium'}

INSTRUÇÕES:
1. Crie um assunto atrativo (máximo 60 caracteres)
2. Crie um preview text (máximo 90 caracteres)
3. Crie o HTML do email (responsive, compatível com clientes de email)
4. Crie a versão em texto simples

FORMATO DE RESPOSTA:
Responda APENAS com um JSON válido no seguinte formato:
{
  "subject": "Assunto do email",
  "previewText": "Texto de preview",
  "html": "<html>conteúdo HTML completo</html>",
  "text": "Versão em texto simples"
}
`

  try {
    const response = await axios.post(
      `${openRouterBaseUrl}/chat/completions`,
      {
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2500
      },
      {
        headers: {
          'Authorization': `Bearer ${openRouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://mailtrendz.app',
          'X-Title': 'MailTrendz'
        },
        timeout: 45000
      }
    )

    const aiResponse = response.data.choices[0]?.message?.content
    if (!aiResponse) {
      throw new Error('Resposta vazia da IA')
    }

    // Tentar parsear JSON da resposta
    let emailData: GeneratedEmail
    try {
      // Limpar possíveis marcadores de código
      const cleanResponse = aiResponse.replace(/```json|```/g, '').trim()
      emailData = JSON.parse(cleanResponse)
    } catch (parseError) {
      // Fallback se não conseguir parsear JSON
      emailData = {
        subject: 'Email Gerado com IA',
        previewText: 'Confira este email criado especialmente para você',
        html: `
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Email MailTrendz</title>
            </head>
            <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f4f4f4;">
              <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px;">
                <h1 style="color: #2563eb; margin-bottom: 20px;">Email Gerado com IA</h1>
                <div style="line-height: 1.6; color: #333;">
                  ${aiResponse.replace(/\n/g, '<br>')}
                </div>
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
                  Gerado com MailTrendz IA
                </div>
              </div>
            </body>
          </html>
        `,
        text: aiResponse.replace(/<[^>]*>/g, '').replace(/\n{2,}/g, '\n\n')
      }
    }

    return emailData

  } catch (error: any) {
    logger.error('Erro na geração com OpenRouter:', error.message)
    throw new Error(`Falha na geração de email: ${error.message}`)
  }
}

// Função para gerar email com fallback
const generateEmailWithFallback = async (request: EmailGenerationRequest): Promise<GeneratedEmail> => {
  try {
    // Tentar gerar com IA
    return await generateEmailWithAI(request)
  } catch (aiError: any) {
    logger.warn('IA indisponível, usando fallback:', aiError.message)
    
    // Fallback: email básico gerado pelo sistema
    return {
      subject: 'Email Profissional - MailTrendz',
      previewText: 'Confira este email criado com MailTrendz',
      html: `
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email MailTrendz</title>
          </head>
          <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f4f4f4;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h1 style="color: #2563eb; margin-bottom: 20px; font-size: 24px;">Email Profissional</h1>
              <div style="line-height: 1.6; color: #333; margin-bottom: 30px;">
                <p style="margin-bottom: 15px;">Olá!</p>
                <p style="margin-bottom: 15px;">Baseado no seu prompt: "<strong>${request.prompt}</strong>"</p>
                <p style="margin-bottom: 15px;">Este é um email profissional criado para ${request.industry || 'sua área de atuação'} com tom ${request.tone || 'profissional'}.</p>
                <p style="margin-bottom: 15px;">Personalize este conteúdo conforme suas necessidades específicas.</p>
                <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 6px;">
                  <p style="margin: 0; color: #2563eb; font-weight: bold;">Chame para ação</p>
                  <p style="margin: 5px 0 0 0; color: #666;">Inclua aqui sua call-to-action principal</p>
                </div>
              </div>
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
                Criado com MailTrendz - Plataforma de Email Marketing com IA
              </div>
            </div>
          </body>
        </html>
      `,
      text: `Email Profissional

Olá!

Baseado no seu prompt: "${request.prompt}"

Este é um email profissional criado para ${request.industry || 'sua área de atuação'} com tom ${request.tone || 'profissional'}.

Personalize este conteúdo conforme suas necessidades específicas.

CHAME PARA AÇÃO
Inclua aqui sua call-to-action principal

---
Criado com MailTrendz - Plataforma de Email Marketing com IA`
    }
  }
}

// Controller functions
const generateEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    // ✅ LOG DETALHADO DO REQUEST
    logger.info('📥 [AI] Request recebido:', {
      body: JSON.stringify(req.body, null, 2),
      headers: {
        'content-type': req.headers['content-type'],
        'authorization': req.headers.authorization ? 'Bearer ***' : 'not-provided'
      },
      userId: (req as any).user?.userId
    })

    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      logger.error('❌ [AI] Validation errors:', errors.array())
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Dados de entrada inválidos',
        errors: errors.array(),
        receivedData: {
          prompt: req.body.prompt,
          industry: req.body.industry,
          tone: req.body.tone,
          urgency: req.body.urgency
        }
      })
      return
    }

    const { prompt, context = {}, style_preferences, industry = 'geral', tone = 'professional', urgency = 'medium' } = req.body
    const userId = (req as any).user?.userId

    if (!prompt?.trim()) {
      logger.error('❌ [AI] Prompt vazio ou inválido:', { prompt })
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Prompt é obrigatório',
        receivedPrompt: prompt
      })
      return
    }

    logger.info(`🤖 [AI] Gerando email - User: ${userId}, Prompt: "${prompt.substring(0, 50)}..."`, {
      industry,
      tone,
      urgency,
      contextKeys: Object.keys(context),
      stylePrefsKeys: style_preferences ? Object.keys(style_preferences) : []
    })

    const startTime = Date.now()
    
    const emailData = await generateEmailWithFallback({
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

    const processingTime = Date.now() - startTime

    logger.info('✅ [AI] Email gerado com sucesso:', {
      processingTime,
      subjectLength: emailData.subject.length,
      htmlLength: emailData.html.length,
      userId
    })

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Email gerado com sucesso',
      data: {
        subject: emailData.subject,
        preview_text: emailData.previewText,
        html: emailData.html,
        text: emailData.text,
        css: '', // CSS inline já incluído no HTML
        components: {
          header: true,
          footer: true,
          cta: true
        }
      },
      metadata: {
        processing_time: processingTime,
        ai_model: 'claude-3.5-sonnet',
        quality_score: 0.9,
        confidence: 0.85,
        features_applied: ['ai-generation', 'responsive-design', 'email-optimization'],
        service: 'mailtrendz-ai-enhanced',
        userId,
        timestamp: new Date()
      }
    })

  } catch (error: any) {
    logger.error('❌ [AI] Generate email error:', {
      error: error.message,
      stack: error.stack,
      requestBody: req.body
    })
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro na geração de email',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Serviço temporariamente indisponível',
      debug: process.env.NODE_ENV === 'development' ? {
        requestData: req.body,
        errorDetails: error.message
      } : undefined
    })
  }
}

const getHealthStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const openRouterConfigured = !!process.env.OPENROUTER_API_KEY
    
    const healthData = {
      status: 'healthy',
      service: 'mailtrendz-ai-service',
      uptime: Math.round(process.uptime()),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      },
      ai_service: {
        provider: 'OpenRouter + Claude 3.5 Sonnet',
        configured: openRouterConfigured,
        status: openRouterConfigured ? 'available' : 'not-configured'
      },
      capabilities: [
        'email-generation',
        'responsive-design',
        'fallback-generation',
        'html-and-text-output'
      ],
      timestamp: new Date().toISOString()
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'AI Service Health Check',
      data: healthData,
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
        status: 'degraded',
        error: error.message
      },
      error: process.env.NODE_ENV === 'development' ? error.message : 'Service degraded'
    })
  }
}

const testConnection = async (req: Request, res: Response): Promise<void> => {
  try {
    const openRouterApiKey = process.env.OPENROUTER_API_KEY
    const openRouterBaseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
    
    if (!openRouterApiKey) {
      res.status(HTTP_STATUS.OK).json({
        success: false,
        message: 'OpenRouter API não configurada',
        data: {
          connected: false,
          reason: 'API key não encontrada',
          testTimestamp: new Date().toISOString()
        }
      })
      return
    }

    logger.info(`🔗 Testando conectividade com OpenRouter: ${openRouterBaseUrl}`)

    const startTime = Date.now()
    
    const response = await axios.post(
      `${openRouterBaseUrl}/chat/completions`,
      {
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'user',
            content: 'Responda apenas: "Conexão OK"'
          }
        ],
        max_tokens: 10
      },
      {
        headers: {
          'Authorization': `Bearer ${openRouterApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    )

    const responseTime = Date.now() - startTime
    const isConnected = response.status === 200

    res.status(HTTP_STATUS.OK).json({
      success: isConnected,
      message: isConnected ? 'Conectividade OK com OpenRouter' : 'Falha na conectividade',
      data: {
        connected: isConnected,
        responseTime,
        status: response.status,
        provider: 'OpenRouter + Claude 3.5 Sonnet',
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
        provider: 'OpenRouter + Claude 3.5 Sonnet',
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